import { useEffect, useMemo, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { db } from "@/data";
import { useAsync, bumpData } from "@/data/store";
import type { Phase, PhaseAssignment, PhaseChecklistItem } from "@/data/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Plus, Trash2, GripVertical } from "lucide-react";
import { fmtDate, fmtKM, fmtNum } from "@shared/lib/format";
import { differenceInCalendarDays } from "date-fns";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";

const phasePresets = ["Ploča", "Stubovi", "Grede", "Nosivi zidovi", "Stepenice", "Ostalo"];

export function PhaseSlideOver({ phase, open, onOpenChange }: { phase: Phase | null; open: boolean; onOpenChange: (o: boolean) => void }) {
  if (!phase) return null;
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader><SheetTitle>{phase.name}</SheetTitle></SheetHeader>
        <PhaseTabs phase={phase} />
      </SheetContent>
    </Sheet>
  );
}

function PhaseTabs({ phase }: { phase: Phase }) {
  const { data: hours = [] } = useAsync(() => db.hours.list());
  const { data: expenses = [] } = useAsync(() => db.expenses.list());
  const { data: employees = [] } = useAsync(() => db.employees.list());
  const { data: assignments = [] } = useAsync(() => db.phaseAssignments.list());
  const { data: checklist = [] } = useAsync(() => db.phaseChecklist.list());

  const phHours = hours.filter(h => h.phaseId === phase.id);
  const phExp = expenses.filter(e => e.phaseId === phase.id);
  const labor = phHours.reduce((s, h) => s + h.hours * h.hourlyRate, 0);
  const expTotal = phExp.reduce((s, e) => s + e.amount, 0);
  const total = labor + expTotal;
  const budget = phase.budget || 0;
  const budgetPct = budget > 0 ? Math.min(100, (total / budget) * 100) : 0;
  const phAssignments = assignments.filter(a => a.phaseId === phase.id);
  const phChecklist = checklist.filter(c => c.phaseId === phase.id);
  const checklistDone = phChecklist.filter(c => c.done).length;

  return (
    <Tabs defaultValue="pregled" className="mt-4">
      <TabsList className="grid grid-cols-5 w-full">
        <TabsTrigger value="pregled">Pregled</TabsTrigger>
        <TabsTrigger value="uredi">Uredi</TabsTrigger>
        <TabsTrigger value="tim">Tim ({phAssignments.length})</TabsTrigger>
        <TabsTrigger value="checklist">QA ({checklistDone}/{phChecklist.length})</TabsTrigger>
        <TabsTrigger value="zapisi">Zapisi</TabsTrigger>
      </TabsList>

      <TabsContent value="pregled" className="space-y-4 mt-4">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <Stat label="Status" value={phase.status === "zavrsena" ? "Završena" : phase.status === "u_toku" ? "U toku" : "Planirana"} />
          <Stat label="Kvadratura" value={`${phase.squareMeters} m²`} />
          <Stat label="Početak" value={fmtDate(phase.startDate)} />
          <Stat label="Završetak" value={fmtDate(phase.endDate)} />
          <Stat label="Plan trajanje" value={phase.plannedDays ? `${phase.plannedDays}d` : "—"} />
          <Stat label="Sati ukupno" value={fmtNum(phHours.reduce((s, h) => s + h.hours, 0))} />
          <Stat label="Trošak rada" value={fmtKM(labor)} />
          <Stat label="Materijal/ostalo" value={fmtKM(expTotal)} />
        </div>

        {budget > 0 && (
          <div className="space-y-1.5 p-3 rounded-[6px] border bg-muted/20">
            <div className="flex justify-between text-sm">
              <span className="font-medium">Budžet faze</span>
              <span className={budgetPct > 100 ? "text-destructive font-medium" : ""}>{fmtKM(total)} / {fmtKM(budget)}</span>
            </div>
            <Progress value={budgetPct} className={budgetPct > 90 ? "[&>div]:bg-destructive" : budgetPct > 75 ? "[&>div]:bg-warning" : ""} />
            <div className="text-xs text-muted-foreground">{budgetPct.toFixed(0)}% iskorišteno</div>
          </div>
        )}

        {phase.squareMeters > 0 && (
          <div className="text-sm p-3 rounded-[6px] border">
            <div className="text-xs text-muted-foreground uppercase tracking-wide">Realna cijena / m²</div>
            <div className="text-xl font-light tnum">{fmtKM(total / phase.squareMeters)}</div>
          </div>
        )}

        {phase.description && <div className="text-sm text-muted-foreground whitespace-pre-wrap">{phase.description}</div>}
      </TabsContent>

      <TabsContent value="uredi" className="mt-4"><PhaseEditForm phase={phase} /></TabsContent>
      <TabsContent value="tim" className="mt-4"><PhaseTeam phase={phase} assignments={phAssignments} employees={employees} /></TabsContent>
      <TabsContent value="checklist" className="mt-4"><PhaseChecklist phase={phase} items={phChecklist} /></TabsContent>

      <TabsContent value="zapisi" className="mt-4 space-y-4">
        <div>
          <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Sati ({phHours.length})</div>
          <Table>
            <TableHeader><TableRow><TableHead>Datum</TableHead><TableHead>Radnik</TableHead><TableHead className="text-right">Sati</TableHead><TableHead className="text-right">Trošak</TableHead></TableRow></TableHeader>
            <TableBody>
              {phHours.length === 0 ? <TableRow><TableCell colSpan={4} className="text-muted-foreground text-center py-3">Nema sati.</TableCell></TableRow>
                : phHours.map(h => {
                  const e = employees.find(x => x.id === h.employeeId);
                  return <TableRow key={h.id}><TableCell>{fmtDate(h.date)}</TableCell><TableCell>{e ? `${e.firstName} ${e.lastName}` : "—"}</TableCell><TableCell className="text-right tnum">{fmtNum(h.hours)}</TableCell><TableCell className="text-right tnum">{fmtKM(h.hours * h.hourlyRate)}</TableCell></TableRow>;
                })}
            </TableBody>
          </Table>
        </div>
        <div>
          <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Troškovi ({phExp.length})</div>
          <Table>
            <TableHeader><TableRow><TableHead>Datum</TableHead><TableHead>Kategorija</TableHead><TableHead>Opis</TableHead><TableHead className="text-right">Iznos</TableHead></TableRow></TableHeader>
            <TableBody>
              {phExp.length === 0 ? <TableRow><TableCell colSpan={4} className="text-muted-foreground text-center py-3">Nema troškova.</TableCell></TableRow>
                : phExp.map(x => <TableRow key={x.id}><TableCell>{fmtDate(x.date)}</TableCell><TableCell>{x.category}</TableCell><TableCell>{x.description}</TableCell><TableCell className="text-right tnum">{fmtKM(x.amount)}</TableCell></TableRow>)}
            </TableBody>
          </Table>
        </div>
      </TabsContent>
    </Tabs>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return <div className="p-2.5 rounded-[6px] border bg-card"><div className="text-[11px] text-muted-foreground uppercase tracking-wide">{label}</div><div className="font-medium mt-0.5 tnum">{value}</div></div>;
}

function PhaseEditForm({ phase }: { phase: Phase }) {
  const [v, setV] = useState<Partial<Phase>>(phase);
  useEffect(() => setV(phase), [phase.id]);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    await db.phases.update(phase.id, v as any);
    toast.success("Faza ažurirana.");
    bumpData();
  };
  return (
    <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div className="space-y-1.5 col-span-2">
        <Label>Naziv *</Label>
        <Input value={v.name || ""} onChange={e => setV({ ...v, name: e.target.value })} list="phase-presets" required />
        <datalist id="phase-presets">{phasePresets.map(p => <option key={p} value={p} />)}</datalist>
      </div>
      <div className="space-y-1.5"><Label>Kvadratura (m²)</Label><Input type="number" step="0.01" value={v.squareMeters ?? 0} onChange={e => setV({ ...v, squareMeters: parseFloat(e.target.value) || 0 })} /></div>
      <div className="space-y-1.5"><Label>Budžet (KM)</Label><Input type="number" step="0.01" value={v.budget ?? 0} onChange={e => setV({ ...v, budget: parseFloat(e.target.value) || 0 })} /></div>
      <div className="space-y-1.5"><Label>Plan trajanje (dana)</Label><Input type="number" value={v.plannedDays ?? ""} onChange={e => setV({ ...v, plannedDays: parseInt(e.target.value) || undefined })} /></div>
      <div className="space-y-1.5"><Label>% završeno</Label><Input type="number" min="0" max="100" value={v.progressPct ?? 0} onChange={e => setV({ ...v, progressPct: parseInt(e.target.value) || 0 })} /></div>
      <div className="space-y-1.5"><Label>Datum početka</Label><Input type="date" value={v.startDate || ""} onChange={e => setV({ ...v, startDate: e.target.value })} /></div>
      <div className="space-y-1.5"><Label>Datum završetka</Label><Input type="date" value={v.endDate || ""} onChange={e => setV({ ...v, endDate: e.target.value })} /></div>
      <div className="space-y-1.5 col-span-2">
        <Label>Status</Label>
        <Select value={v.status} onValueChange={(x: any) => setV({ ...v, status: x })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="planirana">Planirana</SelectItem>
            <SelectItem value="u_toku">U toku</SelectItem>
            <SelectItem value="zavrsena">Završena</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5 col-span-2"><Label>Opis</Label><Textarea value={v.description || ""} onChange={e => setV({ ...v, description: e.target.value })} /></div>
      <div className="col-span-2"><Button type="submit" className="w-full">Sačuvaj izmjene</Button></div>
    </form>
  );
}

function PhaseTeam({ phase, assignments, employees }: { phase: Phase; assignments: PhaseAssignment[]; employees: any[] }) {
  const [pick, setPick] = useState<string>("");
  const assigned = new Set(assignments.map(a => a.employeeId));
  const free = employees.filter(e => e.active && !assigned.has(e.id));

  const add = async () => {
    if (!pick) return;
    await db.phaseAssignments.create({ phaseId: phase.id, employeeId: pick } as any);
    setPick(""); bumpData();
  };
  const remove = async (id: string) => { await db.phaseAssignments.remove(id); bumpData(); };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Select value={pick} onValueChange={setPick}>
          <SelectTrigger><SelectValue placeholder="Odaberi radnika" /></SelectTrigger>
          <SelectContent>{free.map(e => <SelectItem key={e.id} value={e.id}>{e.firstName} {e.lastName}</SelectItem>)}</SelectContent>
        </Select>
        <Button onClick={add} disabled={!pick}><Plus className="h-4 w-4 mr-1" /> Dodaj</Button>
      </div>
      <div className="border rounded-[6px] divide-y">
        {assignments.length === 0 ? <p className="p-3 text-sm text-muted-foreground">Niko nije dodijeljen.</p>
          : assignments.map(a => {
            const e = employees.find(x => x.id === a.employeeId);
            return (
              <div key={a.id} className="px-3 py-2 flex items-center justify-between text-sm">
                <span>{e ? `${e.firstName} ${e.lastName}` : "—"} <span className="text-muted-foreground text-xs">({e?.hourlyRate} KM/h)</span></span>
                <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => remove(a.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
            );
          })}
      </div>
    </div>
  );
}

function PhaseChecklist({ phase, items }: { phase: Phase; items: PhaseChecklistItem[] }) {
  const [text, setText] = useState("");
  const add = async () => {
    if (!text.trim()) return;
    await db.phaseChecklist.create({ phaseId: phase.id, label: text.trim(), done: false, order: items.length } as any);
    setText(""); bumpData();
  };
  const toggle = async (it: PhaseChecklistItem) => { await db.phaseChecklist.update(it.id, { done: !it.done }); bumpData(); };
  const remove = async (id: string) => { await db.phaseChecklist.remove(id); bumpData(); };
  const done = items.filter(i => i.done).length;

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input value={text} onChange={e => setText(e.target.value)} placeholder="Nova stavka kontrole kvaliteta…" onKeyDown={e => e.key === "Enter" && (e.preventDefault(), add())} />
        <Button onClick={add}><Plus className="h-4 w-4" /></Button>
      </div>
      {items.length > 0 && <Progress value={(done / items.length) * 100} />}
      <div className="border rounded-[6px] divide-y">
        {items.length === 0 ? <p className="p-3 text-sm text-muted-foreground">Nema stavki. Dodaj stavke koje moraju biti urađene prije zatvaranja faze.</p>
          : items.map(it => (
            <div key={it.id} className="px-3 py-2 flex items-center gap-3 text-sm">
              <Checkbox checked={it.done} onCheckedChange={() => toggle(it)} />
              <span className={`flex-1 ${it.done ? "line-through text-muted-foreground" : ""}`}>{it.label}</span>
              <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => remove(it.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
            </div>
          ))}
      </div>
    </div>
  );
}

export function phaseStats(ph: Phase, hours: any[], expenses: any[]) {
  const labor = hours.filter(h => h.phaseId === ph.id).reduce((s, h) => s + h.hours * h.hourlyRate, 0);
  const exp = expenses.filter(e => e.phaseId === ph.id).reduce((s, e) => s + e.amount, 0);
  const total = labor + exp;
  const perM2 = ph.squareMeters > 0 ? total / ph.squareMeters : 0;
  let realDays: number | null = null;
  if (ph.startDate) {
    const end = ph.endDate ? new Date(ph.endDate) : new Date();
    realDays = Math.max(0, differenceInCalendarDays(end, new Date(ph.startDate)));
  }
  const overdue = !!(ph.plannedDays && realDays !== null && realDays > ph.plannedDays);
  const budgetPct = ph.budget && ph.budget > 0 ? (total / ph.budget) * 100 : 0;
  return { labor, exp, total, perM2, realDays, overdue, budgetPct };
}
