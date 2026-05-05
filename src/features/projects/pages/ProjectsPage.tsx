import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Eye, Pencil, Trash2 } from "lucide-react";
import { db } from "@/data";
import { useAsync, bumpData } from "@/data/store";
import type { Project } from "@/data/types";
import { PageHeader } from "@shared/components/ui-bits";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { fmtDate, fmtKM } from "@shared/lib/format";
import { StatusChip } from "@shared/components/StatusChip";
import { toast } from "sonner";
import { usePagination } from "@shared/hooks/usePagination";
import { PaginationBar } from "@shared/components/PaginationBar";

function ProjectForm({ initial, onClose }: { initial?: Project; onClose: () => void }) {
  const [v, setV] = useState<Partial<Project>>(initial || { name: "", location: "", squareMeters: 0, active: true });
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!v.name) { toast.error("Naziv je obavezan."); return; }
    if (initial) await db.projects.update(initial.id, v as any);
    else await db.projects.create(v as any);
    bumpData(); onClose();
  };
  return (
    <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <div className="space-y-1.5 col-span-2"><Label>Naziv *</Label><Input value={v.name || ""} onChange={e => setV({ ...v, name: e.target.value })} required /></div>
      <div className="space-y-1.5"><Label>Lokacija</Label><Input value={v.location || ""} onChange={e => setV({ ...v, location: e.target.value })} /></div>
      <div className="space-y-1.5"><Label>Kvadratura (m²)</Label><Input type="number" step="0.01" value={v.squareMeters ?? 0} onChange={e => setV({ ...v, squareMeters: parseFloat(e.target.value) || 0 })} /></div>
      <div className="space-y-1.5"><Label>Datum početka</Label><Input type="date" value={v.startDate || ""} onChange={e => setV({ ...v, startDate: e.target.value })} /></div>
      <div className="space-y-1.5"><Label>Planirani završetak</Label><Input type="date" value={v.plannedEndDate || ""} onChange={e => setV({ ...v, plannedEndDate: e.target.value })} /></div>
      <div className="space-y-1.5 col-span-2"><Label>Vrijednost ugovora (KM)</Label><Input type="number" step="0.01" value={v.contractValue ?? 0} onChange={e => setV({ ...v, contractValue: parseFloat(e.target.value) || 0 })} /></div>
      <div className="space-y-1.5 col-span-2"><Label>Opis</Label><Textarea value={v.description || ""} onChange={e => setV({ ...v, description: e.target.value })} /></div>
      <DialogFooter className="col-span-2">
        <Button type="button" variant="outline" onClick={onClose}>Odustani</Button>
        <Button type="submit">{initial ? "Sačuvaj" : "Dodaj projekat"}</Button>
      </DialogFooter>
    </form>
  );
}

export default function Projects() {
  const { data: projects = [] } = useAsync(() => db.projects.list());
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<Project | undefined>();

  const sorted = useMemo(() => [...projects].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)), [projects]);
  const pg = usePagination(sorted, 25);

  const remove = async (p: Project) => {
    if (!confirm(`Obrisati projekat "${p.name}"?`)) return;
    await db.projects.remove(p.id); bumpData();
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Projekti"
        description="Aktivni i završeni projekti, faze i dokumentacija."
        actions={
          <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEdit(undefined); }}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" /> Novi projekat</Button></DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader><DialogTitle>{edit ? "Uredi projekat" : "Novi projekat"}</DialogTitle></DialogHeader>
              <ProjectForm initial={edit} onClose={() => { setOpen(false); setEdit(undefined); }} />
            </DialogContent>
          </Dialog>
        }
      />
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Naziv</TableHead>
              <TableHead>Lokacija</TableHead>
              <TableHead>m²</TableHead>
              <TableHead>Početak</TableHead>
              <TableHead>Plan. završetak</TableHead>
              <TableHead>Vrijednost</TableHead>
              <TableHead>Status</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Nema projekata.</TableCell></TableRow>
            ) : pg.pageItems.map(p => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.name}</TableCell>
                <TableCell>{p.location || "—"}</TableCell>
                <TableCell>{p.squareMeters}</TableCell>
                <TableCell>{fmtDate(p.startDate)}</TableCell>
                <TableCell>{fmtDate(p.plannedEndDate)}</TableCell>
                <TableCell>{p.contractValue ? fmtKM(p.contractValue) : "—"}</TableCell>
                <TableCell><StatusChip tone={p.active ? "success" : "muted"}>{p.active ? "Aktivan" : "Završen"}</StatusChip></TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button asChild size="icon" variant="ghost" className="h-8 w-8"><Link to={`/projekti/${p.id}`}><Eye className="h-4 w-4" /></Link></Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { setEdit(p); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => remove(p)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <PaginationBar {...pg} total={sorted.length} itemLabel="projekata" />
      </Card>
    </div>
  );
}
