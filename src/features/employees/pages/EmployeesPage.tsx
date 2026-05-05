import { useMemo, useState } from "react";
import { Plus, Search, Eye, Pencil, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { db } from "@/data";
import { useAsync, bumpData } from "@/data/store";
import type { Employee, EmployeeType } from "@/data/types";
import { PageHeader } from "@shared/components/ui-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusChip } from "@shared/components/StatusChip";
import { docStatus } from "@shared/lib/format";
import { toast } from "sonner";
import { useAuth } from "@features/auth/AuthContext";
import { logAction } from "@/data/audit";
import { usePagination } from "@shared/hooks/usePagination";
import { PaginationBar } from "@shared/components/PaginationBar";

function EmployeeForm({ initial, onClose }: { initial?: Employee; onClose: () => void }) {
  const { user } = useAuth();
  const [v, setV] = useState<Partial<Employee>>(initial || {
    firstName: "", lastName: "", identifier: "", citizenship: "BiH",
    type: "domaci", hourlyRate: 10, active: true,
  });
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!v.firstName || !v.lastName) { toast.error("Ime i prezime su obavezni."); return; }
    if (initial) {
      await db.employees.update(initial.id, v as any);
      await logAction(user, "update", "employee", initial.id);
      toast.success("Radnik ažuriran.");
    } else {
      const created = await db.employees.create(v as any);
      await logAction(user, "create", "employee", created.id);
      toast.success("Radnik dodan.");
    }
    bumpData();
    onClose();
  };
  return (
    <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <div className="space-y-1.5"><Label>Ime *</Label><Input value={v.firstName || ""} onChange={e => setV({ ...v, firstName: e.target.value })} required /></div>
      <div className="space-y-1.5"><Label>Prezime *</Label><Input value={v.lastName || ""} onChange={e => setV({ ...v, lastName: e.target.value })} required /></div>
      <div className="space-y-1.5"><Label>JMBG / broj pasoša</Label><Input value={v.identifier || ""} onChange={e => setV({ ...v, identifier: e.target.value })} /></div>
      <div className="space-y-1.5"><Label>Državljanstvo</Label><Input value={v.citizenship || ""} onChange={e => setV({ ...v, citizenship: e.target.value })} /></div>
      <div className="space-y-1.5"><Label>Datum rođenja</Label><Input type="date" value={v.birthDate || ""} onChange={e => setV({ ...v, birthDate: e.target.value })} /></div>
      <div className="space-y-1.5"><Label>Kontakt</Label><Input value={v.contact || ""} onChange={e => setV({ ...v, contact: e.target.value })} /></div>
      <div className="space-y-1.5">
        <Label>Tip</Label>
        <Select value={v.type} onValueChange={(x: EmployeeType) => setV({ ...v, type: x })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="domaci">Domaći</SelectItem>
            <SelectItem value="strani">Strani</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5"><Label>Satnica (KM/h)</Label><Input type="number" step="0.01" value={v.hourlyRate ?? 0} onChange={e => setV({ ...v, hourlyRate: parseFloat(e.target.value) || 0 })} /></div>
      <DialogFooter className="col-span-2 mt-2">
        <Button type="button" variant="outline" onClick={onClose}>Odustani</Button>
        <Button type="submit">{initial ? "Sačuvaj" : "Dodaj radnika"}</Button>
      </DialogFooter>
    </form>
  );
}

export default function Employees() {
  const { user } = useAuth();
  const { data: employees = [] } = useAsync(() => db.employees.list());
  const { data: docs = [] } = useAsync(() => db.employeeDocuments.list());
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<"all" | "domaci" | "strani">("all");
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<Employee | undefined>();

  const filtered = useMemo(() => employees.filter(e => {
    if (tab !== "all" && e.type !== tab) return false;
    if (q && !`${e.firstName} ${e.lastName} ${e.identifier}`.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  }), [employees, q, tab]);
  const pg = usePagination(filtered, 25);

  const docStateFor = (empId: string) => {
    const empDocs = docs.filter(d => d.employeeId === empId);
    if (empDocs.some(d => docStatus(d.expiresAt) === "expired")) return "danger" as const;
    if (empDocs.some(d => docStatus(d.expiresAt) === "expiring")) return "warning" as const;
    if (empDocs.length === 0) return "muted" as const;
    return "success" as const;
  };

  const remove = async (e: Employee) => {
    if (!confirm(`Obrisati radnika ${e.firstName} ${e.lastName}?`)) return;
    await db.employees.remove(e.id);
    await logAction(user, "delete", "employee", e.id);
    bumpData();
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Zaposleni"
        description="Lista svih radnika sa pregledom dokumenata."
        actions={
          <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEdit(undefined); }}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" /> Novi radnik</Button></DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader><DialogTitle>{edit ? "Uredi radnika" : "Novi radnik"}</DialogTitle></DialogHeader>
              <EmployeeForm initial={edit} onClose={() => { setOpen(false); setEdit(undefined); }} />
            </DialogContent>
          </Dialog>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <Tabs value={tab} onValueChange={(x: any) => setTab(x)}>
          <TabsList>
            <TabsTrigger value="all">Svi ({employees.length})</TabsTrigger>
            <TabsTrigger value="domaci">Domaći ({employees.filter(e => e.type === "domaci").length})</TabsTrigger>
            <TabsTrigger value="strani">Strani ({employees.filter(e => e.type === "strani").length})</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative ml-auto w-full sm:w-72">
          <Search className="h-4 w-4 absolute left-2.5 top-2.5 text-muted-foreground" />
          <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Pretraga..." className="pl-8" />
        </div>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ime i prezime</TableHead>
              <TableHead>Identifikator</TableHead>
              <TableHead>Tip</TableHead>
              <TableHead>Državljanstvo</TableHead>
              <TableHead>Satnica</TableHead>
              <TableHead>Dokumenti</TableHead>
              <TableHead className="w-[140px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Nema zaposlenih.</TableCell></TableRow>
            ) : pg.pageItems.map(e => {
              const tone = docStateFor(e.id);
              const label = tone === "danger" ? "istekao dok." : tone === "warning" ? "uskoro istek" : tone === "muted" ? "bez dok." : "važeći";
              return (
                <TableRow key={e.id}>
                  <TableCell className="font-medium">{e.firstName} {e.lastName}</TableCell>
                  <TableCell className="font-mono text-xs">{e.identifier || "—"}</TableCell>
                  <TableCell><StatusChip tone={e.type === "strani" ? "info" : "muted"}>{e.type === "strani" ? "Strani" : "Domaći"}</StatusChip></TableCell>
                  <TableCell>{e.citizenship}</TableCell>
                  <TableCell>{e.hourlyRate?.toFixed(2)} KM/h</TableCell>
                  <TableCell><StatusChip tone={tone}>{label}</StatusChip></TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button asChild size="icon" variant="ghost" className="h-8 w-8"><Link to={`/zaposleni/${e.id}`}><Eye className="h-4 w-4" /></Link></Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { setEdit(e); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => remove(e)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        <PaginationBar {...pg} total={filtered.length} itemLabel="zaposlenih" />
      </Card>
    </div>
  );
}
