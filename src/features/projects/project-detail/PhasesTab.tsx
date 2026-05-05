import { useMemo, useState } from "react";
import { DndContext, closestCenter, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Plus, Trash2, Pencil } from "lucide-react";
import { db } from "@/data";
import { useAsync, bumpData } from "@/data/store";
import type { Phase } from "@/data/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { StatusChip } from "@shared/components/StatusChip";
import { fmtKM } from "@shared/lib/format";
import { toast } from "sonner";
import { PhaseSlideOver, phaseStats } from "./PhaseSlideOver";

const phasePresets = ["Ploča", "Stubovi", "Grede", "Nosivi zidovi", "Stepenice", "Ostalo"];

function NewPhaseForm({ projectId, onClose, nextOrder }: { projectId: string; onClose: () => void; nextOrder: number }) {
  const [v, setV] = useState<Partial<Phase>>({ name: "", squareMeters: 0, status: "planirana", projectId, order: nextOrder });
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!v.name) { toast.error("Naziv obavezan."); return; }
    await db.phases.create({ ...v, projectId } as any);
    toast.success("Faza dodana.");
    bumpData(); onClose();
  };
  return (
    <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div className="space-y-1.5 col-span-2">
        <Label>Naziv *</Label>
        <Input value={v.name || ""} onChange={e => setV({ ...v, name: e.target.value })} list="phase-presets-new" required />
        <datalist id="phase-presets-new">{phasePresets.map(p => <option key={p} value={p} />)}</datalist>
      </div>
      <div className="space-y-1.5"><Label>m²</Label><Input type="number" step="0.01" value={v.squareMeters ?? 0} onChange={e => setV({ ...v, squareMeters: parseFloat(e.target.value) || 0 })} /></div>
      <div className="space-y-1.5"><Label>Budžet (KM)</Label><Input type="number" step="0.01" value={v.budget ?? 0} onChange={e => setV({ ...v, budget: parseFloat(e.target.value) || 0 })} /></div>
      <div className="space-y-1.5"><Label>Plan dana</Label><Input type="number" value={v.plannedDays ?? ""} onChange={e => setV({ ...v, plannedDays: parseInt(e.target.value) || undefined })} /></div>
      <div className="space-y-1.5"><Label>Status</Label>
        <Select value={v.status} onValueChange={(x: any) => setV({ ...v, status: x })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="planirana">Planirana</SelectItem>
            <SelectItem value="u_toku">U toku</SelectItem>
            <SelectItem value="zavrsena">Završena</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5"><Label>Početak</Label><Input type="date" value={v.startDate || ""} onChange={e => setV({ ...v, startDate: e.target.value })} /></div>
      <div className="space-y-1.5"><Label>Završetak</Label><Input type="date" value={v.endDate || ""} onChange={e => setV({ ...v, endDate: e.target.value })} /></div>
      <div className="space-y-1.5 col-span-2"><Label>Opis</Label><Textarea value={v.description || ""} onChange={e => setV({ ...v, description: e.target.value })} /></div>
      <DialogFooter className="col-span-2">
        <Button type="button" variant="outline" onClick={onClose}>Odustani</Button>
        <Button type="submit">Dodaj</Button>
      </DialogFooter>
    </form>
  );
}

function SortableRow({ phase, hours, expenses, assignments, onOpen }: any) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: phase.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  const s = phaseStats(phase, hours, expenses);
  const assignedCount = assignments.filter((a: any) => a.phaseId === phase.id).length;
  const remove = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Obrisati fazu "${phase.name}"?`)) return;
    await db.phases.remove(phase.id); bumpData();
  };
  return (
    <TableRow ref={setNodeRef} style={style} className="cursor-pointer hover:bg-muted/30" onClick={() => onOpen(phase)}>
      <TableCell className="w-8" onClick={e => e.stopPropagation()}>
        <button {...attributes} {...listeners} className="cursor-grab text-muted-foreground hover:text-foreground p-1">
          <GripVertical className="h-4 w-4" />
        </button>
      </TableCell>
      <TableCell className="font-medium">{phase.name}</TableCell>
      <TableCell className="tnum">{phase.squareMeters}</TableCell>
      <TableCell className="tnum">{phase.plannedDays ?? "—"}</TableCell>
      <TableCell className={`tnum ${s.overdue ? "text-destructive font-medium" : ""}`}>{s.realDays ?? "—"}</TableCell>
      <TableCell className="tnum">{fmtKM(s.total)}</TableCell>
      <TableCell className="min-w-[120px]">
        {phase.budget ? (
          <div className="space-y-1">
            <Progress value={Math.min(100, s.budgetPct)} className={s.budgetPct > 100 ? "[&>div]:bg-destructive" : s.budgetPct > 90 ? "[&>div]:bg-warning" : ""} />
            <div className={`text-[10px] tnum ${s.budgetPct > 100 ? "text-destructive" : "text-muted-foreground"}`}>{s.budgetPct.toFixed(0)}% od {fmtKM(phase.budget)}</div>
          </div>
        ) : <span className="text-xs text-muted-foreground">—</span>}
      </TableCell>
      <TableCell className="tnum">{fmtKM(s.perM2)}</TableCell>
      <TableCell className="text-center">{assignedCount}</TableCell>
      <TableCell>
        <StatusChip tone={phase.status === "zavrsena" ? "success" : phase.status === "u_toku" ? "info" : "muted"}>
          {phase.status === "zavrsena" ? "završena" : phase.status === "u_toku" ? "u toku" : "planirana"}
        </StatusChip>
      </TableCell>
      <TableCell className="text-right" onClick={e => e.stopPropagation()}>
        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => onOpen(phase)}><Pencil className="h-4 w-4" /></Button>
        <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={remove}><Trash2 className="h-4 w-4" /></Button>
      </TableCell>
    </TableRow>
  );
}

export function PhasesTab({ projectId }: { projectId: string }) {
  const { data: allPhases = [] } = useAsync(() => db.phases.list());
  const { data: hours = [] } = useAsync(() => db.hours.list());
  const { data: expenses = [] } = useAsync(() => db.expenses.list());
  const { data: assignments = [] } = useAsync(() => db.phaseAssignments.list());

  const phases = useMemo(() => {
    return [...allPhases.filter(p => p.projectId === projectId)].sort((a, b) => (a.order ?? 9999) - (b.order ?? 9999));
  }, [allPhases, projectId]);

  const [openNew, setOpenNew] = useState(false);
  const [active, setActive] = useState<Phase | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const onDragEnd = async (e: DragEndEvent) => {
    const { active: a, over } = e;
    if (!over || a.id === over.id) return;
    const oldIdx = phases.findIndex(p => p.id === a.id);
    const newIdx = phases.findIndex(p => p.id === over.id);
    const reordered = arrayMove(phases, oldIdx, newIdx);
    for (let i = 0; i < reordered.length; i++) {
      if (reordered[i].order !== i) await db.phases.update(reordered[i].id, { order: i });
    }
    bumpData();
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Faze projekta ({phases.length})</CardTitle>
        <Dialog open={openNew} onOpenChange={setOpenNew}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> Faza</Button></DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>Nova faza</DialogTitle></DialogHeader>
            <NewPhaseForm projectId={projectId} nextOrder={phases.length} onClose={() => setOpenNew(false)} />
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <DndContext collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8"></TableHead>
                <TableHead>Faza</TableHead>
                <TableHead>m²</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Stvarno</TableHead>
                <TableHead>Trošak</TableHead>
                <TableHead>Budžet</TableHead>
                <TableHead>KM/m²</TableHead>
                <TableHead className="text-center">Tim</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <SortableContext items={phases.map(p => p.id)} strategy={verticalListSortingStrategy}>
                {phases.length === 0 ? (
                  <TableRow><TableCell colSpan={11} className="text-center text-muted-foreground py-8">Nema faza. Dodaj prvu fazu.</TableCell></TableRow>
                ) : phases.map(p => (
                  <SortableRow key={p.id} phase={p} hours={hours} expenses={expenses} assignments={assignments}
                    onOpen={(ph: Phase) => { setActive(ph); setSheetOpen(true); }} />
                ))}
              </SortableContext>
            </TableBody>
          </Table>
        </DndContext>
      </CardContent>
      <PhaseSlideOver phase={active} open={sheetOpen} onOpenChange={setSheetOpen} />
    </Card>
  );
}
