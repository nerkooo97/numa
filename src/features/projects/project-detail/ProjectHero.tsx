import { useMemo, useState } from "react";
import type { Project, Phase, HourEntry, Expense } from "@/data/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { StatusChip } from "@shared/components/StatusChip";
import { fmtDate, fmtKM } from "@shared/lib/format";
import { Pencil, Archive, Copy, Printer, CheckCircle2, AlertTriangle, AlertOctagon } from "lucide-react";
import { differenceInCalendarDays } from "date-fns";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { db } from "@/data";
import { bumpData } from "@/data/store";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

export function ProjectHero({ project, phases, hours, expenses }: {
  project: Project; phases: Phase[]; hours: HourEntry[]; expenses: Expense[];
}) {
  const nav = useNavigate();
  const [editOpen, setEditOpen] = useState(false);

  const stats = useMemo(() => {
    const labor = hours.reduce((s, h) => s + h.hours * h.hourlyRate, 0);
    const exp = expenses.reduce((s, e) => s + e.amount, 0);
    const totalCost = labor + exp;
    const profit = (project.contractValue || 0) - totalCost;
    const perM2 = project.squareMeters > 0 ? totalCost / project.squareMeters : 0;

    const completedM2 = phases.filter(p => p.status === "zavrsena").reduce((s, p) => s + (p.squareMeters || 0), 0);
    const m2Pct = project.squareMeters > 0 ? (completedM2 / project.squareMeters) * 100 : 0;

    let timePct = 0; let daysLeft: number | null = null;
    if (project.startDate && project.plannedEndDate) {
      const start = new Date(project.startDate).getTime();
      const end = new Date(project.plannedEndDate).getTime();
      const now = Date.now();
      timePct = Math.min(100, Math.max(0, ((now - start) / (end - start)) * 100));
      daysLeft = Math.ceil((end - now) / 86400000);
    }

    // Burn rate i projekcija
    const allEvents = [
      ...hours.map(h => ({ date: h.date, a: h.hours * h.hourlyRate })),
      ...expenses.map(e => ({ date: e.date, a: e.amount })),
    ];
    let burnPerDay = 0; let projectedTotal = totalCost;
    if (allEvents.length > 0 && project.startDate) {
      const days = Math.max(1, differenceInCalendarDays(new Date(), new Date(project.startDate)));
      burnPerDay = totalCost / days;
      if (project.plannedEndDate) {
        const totalDays = Math.max(1, differenceInCalendarDays(new Date(project.plannedEndDate), new Date(project.startDate)));
        projectedTotal = burnPerDay * totalDays;
      }
    }

    // Health
    const overdue = !!(project.plannedEndDate && new Date(project.plannedEndDate) < new Date() && m2Pct < 100);
    const overBudget = !!(project.contractValue && totalCost > project.contractValue);
    const projectedOver = !!(project.contractValue && projectedTotal > project.contractValue * 1.05);
    const health: "ok" | "warn" | "danger" = overBudget || overdue ? "danger" : projectedOver || timePct > m2Pct + 15 ? "warn" : "ok";

    return { labor, exp, totalCost, profit, perM2, completedM2, m2Pct, timePct, daysLeft, burnPerDay, projectedTotal, health, overdue, overBudget };
  }, [project, phases, hours, expenses]);

  const archive = async () => {
    if (!confirm(project.archived ? "Vratiti projekat iz arhive?" : "Arhivirati projekat?")) return;
    await db.projects.update(project.id, { archived: !project.archived, active: project.archived ? true : false });
    toast.success(project.archived ? "Projekat vraćen." : "Projekat arhiviran.");
    bumpData();
  };

  const duplicate = async () => {
    if (!confirm("Duplicirati projekat sa svim fazama (bez sati i troškova)?")) return;
    const newP = await db.projects.create({
      ...project, name: `${project.name} (kopija)`, active: true, archived: false,
    } as any);
    for (const ph of phases) {
      await db.phases.create({ ...ph, projectId: newP.id, status: "planirana", startDate: undefined, endDate: undefined } as any);
    }
    toast.success("Projekat dupliciran.");
    nav(`/projekti/${newP.id}`);
    bumpData();
  };

  return (
    <Card>
      <CardContent className="p-4 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-start sm:justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl sm:text-2xl font-light tracking-tight">{project.name}</h2>
              <HealthBadge health={stats.health} />
              {project.archived && <StatusChip tone="muted">arhiviran</StatusChip>}
            </div>
            <p className="text-sm text-muted-foreground mt-1">{project.location || "—"} · {project.squareMeters} m²</p>
          </div>
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-1.5">
            <Button size="sm" variant="outline" onClick={() => window.print()}><Printer className="h-4 w-4 mr-1" /> Štampaj</Button>
            <Button size="sm" variant="outline" onClick={duplicate}><Copy className="h-4 w-4 mr-1" /> Dupliciraj</Button>
            <Button size="sm" variant="outline" onClick={archive}><Archive className="h-4 w-4 mr-1" /> {project.archived ? "Vrati" : "Arhiviraj"}</Button>
            <Dialog open={editOpen} onOpenChange={setEditOpen}>
              <DialogTrigger asChild><Button size="sm"><Pencil className="h-4 w-4 mr-1" /> Uredi</Button></DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader><DialogTitle>Uredi projekat</DialogTitle></DialogHeader>
                <EditForm project={project} onClose={() => setEditOpen(false)} />
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-muted-foreground"><span>Završeni m² (po fazama)</span><span>{stats.completedM2.toFixed(0)} / {project.squareMeters} ({stats.m2Pct.toFixed(0)}%)</span></div>
            <Progress value={stats.m2Pct} />
          </div>
          {project.startDate && project.plannedEndDate && (
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-muted-foreground"><span>Proteklo vrijeme</span><span>{stats.timePct.toFixed(0)}%</span></div>
              <Progress value={stats.timePct} className={stats.timePct > stats.m2Pct + 15 ? "[&>div]:bg-warning" : ""} />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function HealthBadge({ health }: { health: "ok" | "warn" | "danger" }) {
  if (health === "ok") return <StatusChip tone="success"><CheckCircle2 className="h-3 w-3 mr-1" /> U planu</StatusChip>;
  if (health === "warn") return <StatusChip tone="warning"><AlertTriangle className="h-3 w-3 mr-1" /> Rizik</StatusChip>;
  return <StatusChip tone="danger"><AlertOctagon className="h-3 w-3 mr-1" /> Kritično</StatusChip>;
}

function Metric({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: "success" | "danger" }) {
  const cls = tone === "danger" ? "text-destructive" : tone === "success" ? "text-success" : "";
  return (
    <div className="p-3 rounded-[6px] border bg-card">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`text-lg font-light tnum mt-1 ${cls}`}>{value}</div>
      {sub && <div className="text-[11px] text-muted-foreground mt-0.5 truncate">{sub}</div>}
    </div>
  );
}

function EditForm({ project, onClose }: { project: Project; onClose: () => void }) {
  const [v, setV] = useState<Partial<Project>>(project);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    await db.projects.update(project.id, v as any);
    toast.success("Projekat ažuriran.");
    bumpData(); onClose();
  };
  return (
    <form onSubmit={submit} className="grid grid-cols-2 gap-3">
      <div className="space-y-1.5 col-span-2"><Label>Naziv *</Label><Input value={v.name || ""} onChange={e => setV({ ...v, name: e.target.value })} required /></div>
      <div className="space-y-1.5"><Label>Lokacija</Label><Input value={v.location || ""} onChange={e => setV({ ...v, location: e.target.value })} /></div>
      <div className="space-y-1.5"><Label>m²</Label><Input type="number" step="0.01" value={v.squareMeters ?? 0} onChange={e => setV({ ...v, squareMeters: parseFloat(e.target.value) || 0 })} /></div>
      <div className="space-y-1.5"><Label>Početak</Label><Input type="date" value={v.startDate || ""} onChange={e => setV({ ...v, startDate: e.target.value })} /></div>
      <div className="space-y-1.5"><Label>Plan. završetak</Label><Input type="date" value={v.plannedEndDate || ""} onChange={e => setV({ ...v, plannedEndDate: e.target.value })} /></div>
      <div className="space-y-1.5 col-span-2"><Label>Vrijednost ugovora (KM)</Label><Input type="number" step="0.01" value={v.contractValue ?? 0} onChange={e => setV({ ...v, contractValue: parseFloat(e.target.value) || 0 })} /></div>
      <div className="space-y-1.5 col-span-2"><Label>Opis</Label><Textarea value={v.description || ""} onChange={e => setV({ ...v, description: e.target.value })} /></div>
      <DialogFooter className="col-span-2">
        <Button type="button" variant="outline" onClick={onClose}>Odustani</Button>
        <Button type="submit">Sačuvaj</Button>
      </DialogFooter>
    </form>
  );
}
