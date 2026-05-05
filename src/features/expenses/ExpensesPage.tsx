import { useMemo, useState } from "react";
import { Plus, Trash2, Check, X } from "lucide-react";
import { db } from "@/data";
import { useAsync, bumpData } from "@/data/store";
import type { Expense, ExpenseCategory } from "@/data/types";
import { PageHeader } from "@shared/components/ui-bits";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { StatusChip } from "@shared/components/StatusChip";
import { FileField, FileLink } from "@shared/components/FileField";
import { fmtDate, fmtKM } from "@shared/lib/format";
import { useAuth } from "@features/auth/AuthContext";
import { logAction } from "@/data/audit";
import { toast } from "sonner";
import { usePagination } from "@shared/hooks/usePagination";
import { PaginationBar } from "@shared/components/PaginationBar";

const categoryLabels: Record<ExpenseCategory, string> = {
  radnici: "Radnici", hrana: "Hrana", prevoz: "Prevoz", smjestaj: "Smještaj",
  materijal: "Materijal", sitni_materijal: "Sitni materijal", neplanirani: "Neplanirani", ostalo: "Ostalo",
};

function ExpenseForm({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
  const { data: projects = [] } = useAsync(() => db.projects.list());
  const { data: phases = [] } = useAsync(() => db.phases.list());
  const { data: employees = [] } = useAsync(() => db.employees.list());
  const today = new Date().toISOString().slice(0, 10);
  const [v, setV] = useState<Partial<Expense>>({ date: today, category: "materijal", amount: 0, description: "" });
  const projectPhases = phases.filter(p => p.projectId === v.projectId);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!v.amount || !v.description) { toast.error("Iznos i opis su obavezni."); return; }
    const created = await db.expenses.create({ ...v, createdBy: user!.id, approved: v.category !== "neplanirani" } as any);
    await logAction(user, "create", "expense", created.id);
    bumpData(); onClose();
  };

  return (
    <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div className="space-y-1.5"><Label>Datum *</Label><Input type="date" value={v.date} onChange={e => setV({ ...v, date: e.target.value })} required /></div>
      <div className="space-y-1.5"><Label>Iznos (KM) *</Label><Input type="number" step="0.01" value={v.amount ?? 0} onChange={e => setV({ ...v, amount: parseFloat(e.target.value) || 0 })} required /></div>
      <div className="space-y-1.5">
        <Label>Kategorija *</Label>
        <Select value={v.category} onValueChange={(x: ExpenseCategory) => setV({ ...v, category: x })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{Object.entries(categoryLabels).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>Projekat</Label>
        <Select value={v.projectId} onValueChange={(x) => setV({ ...v, projectId: x, phaseId: undefined })}>
          <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
          <SelectContent>{projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>Faza</Label>
        <Select value={v.phaseId} onValueChange={(x) => setV({ ...v, phaseId: x })} disabled={!v.projectId}>
          <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
          <SelectContent>{projectPhases.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>Radnik (opcionalno)</Label>
        <Select value={v.employeeId} onValueChange={(x) => setV({ ...v, employeeId: x })}>
          <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
          <SelectContent>{employees.map(e => <SelectItem key={e.id} value={e.id}>{e.firstName} {e.lastName}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5 col-span-2"><Label>Opis *</Label><Input value={v.description || ""} onChange={e => setV({ ...v, description: e.target.value })} required /></div>
      {v.category === "neplanirani" && (
        <div className="space-y-1.5 col-span-2"><Label>Razlog (neplanirani)</Label><Textarea value={v.unplannedReason || ""} onChange={e => setV({ ...v, unplannedReason: e.target.value })} /></div>
      )}
      <div className="space-y-1.5 col-span-2"><Label>Račun</Label><FileField value={v.receiptFileId} folder={v.projectId ? `projects/${v.projectId}/expenses` : `expenses/receipts`} onChange={(id) => setV({ ...v, receiptFileId: id })} /></div>
      <DialogFooter className="col-span-2">
        <Button type="button" variant="outline" onClick={onClose}>Odustani</Button>
        <Button type="submit">Sačuvaj</Button>
      </DialogFooter>
    </form>
  );
}

export default function Expenses() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const { data: expenses = [] } = useAsync(() => db.expenses.list());
  const { data: projects = [] } = useAsync(() => db.projects.list());
  const { data: phases = [] } = useAsync(() => db.phases.list());
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<ExpenseCategory | "all">("all");

  const sorted = useMemo(() => [...expenses].sort((a, b) => b.date.localeCompare(a.date)).filter(e => filter === "all" || e.category === filter), [expenses, filter]);
  const total = sorted.reduce((s, e) => s + e.amount, 0);
  const pendingUnplanned = expenses.filter(e => e.category === "neplanirani" && !e.approved).length;
  const { page, pageSize, pageCount, pageItems, setPage, setPageSize } = usePagination(sorted, 25);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Troškovi"
        description={`${sorted.length} stavki · ${fmtKM(total)} ukupno${pendingUnplanned ? ` · ${pendingUnplanned} neplaniranih čeka odobrenje` : ""}.`}
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" /> Novi trošak</Button></DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader><DialogTitle>Novi trošak</DialogTitle></DialogHeader>
              <ExpenseForm onClose={() => setOpen(false)} />
            </DialogContent>
          </Dialog>
        }
      />
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant={filter === "all" ? "default" : "outline"} onClick={() => setFilter("all")}>Sve</Button>
        {Object.entries(categoryLabels).map(([k, l]) => (
          <Button key={k} size="sm" variant={filter === k ? "default" : "outline"} onClick={() => setFilter(k as ExpenseCategory)}>{l}</Button>
        ))}
      </div>
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Datum</TableHead><TableHead>Kategorija</TableHead><TableHead>Opis</TableHead>
              <TableHead>Projekat</TableHead><TableHead>Faza</TableHead><TableHead>Račun</TableHead>
              <TableHead>Status</TableHead><TableHead className="text-right">Iznos</TableHead><TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.length === 0 ? (
              <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">Nema troškova.</TableCell></TableRow>
            ) : pageItems.map(x => {
              const pr = projects.find(p => p.id === x.projectId);
              const ph = phases.find(p => p.id === x.phaseId);
              const isUnplanned = x.category === "neplanirani";
              return (
                <TableRow key={x.id}>
                  <TableCell>{fmtDate(x.date)}</TableCell>
                  <TableCell>{categoryLabels[x.category]}</TableCell>
                  <TableCell className="max-w-[260px] truncate">{x.description}</TableCell>
                  <TableCell>{pr?.name || "—"}</TableCell>
                  <TableCell>{ph?.name || "—"}</TableCell>
                  <TableCell><FileLink fileId={x.receiptFileId} /></TableCell>
                  <TableCell>
                    {isUnplanned
                      ? <StatusChip tone={x.approved ? "success" : "warning"}>{x.approved ? "odobreno" : "čeka"}</StatusChip>
                      : <StatusChip tone="success">ok</StatusChip>}
                  </TableCell>
                  <TableCell className="text-right font-medium">{fmtKM(x.amount)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {isUnplanned && !x.approved && isAdmin && (
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-success" onClick={async () => { await db.expenses.update(x.id, { approved: true } as any); bumpData(); }}><Check className="h-4 w-4" /></Button>
                      )}
                      {isUnplanned && x.approved && isAdmin && (
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={async () => { await db.expenses.update(x.id, { approved: false } as any); bumpData(); }}><X className="h-4 w-4" /></Button>
                      )}
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={async () => { if (confirm("Obrisati?")) { await db.expenses.remove(x.id); bumpData(); } }}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        <PaginationBar page={page} pageCount={pageCount} pageSize={pageSize} total={sorted.length} setPage={setPage} setPageSize={setPageSize} itemLabel="stavki" />
      </Card>
    </div>
  );
}
