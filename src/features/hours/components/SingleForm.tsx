import { useMemo, useState } from "react";
import { Lock, AlertTriangle, AlertCircle } from "lucide-react";
import { db } from "@/data";
import { useAsync, bumpData } from "@/data/store";
import type { HourEntry } from "@/data/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DialogFooter } from "@/components/ui/dialog";
import { fmtDate, fmtNum } from "@shared/lib/format";
import { useAuth } from "@features/auth/AuthContext";
import { logAction } from "@/data/audit";
import { toast } from "sonner";
import { DateShortcuts } from "./DateShortcuts";
import { HourPresets } from "./HourPresets";
import { today, getLock } from "../lib/dates";

export function SingleForm({ onClose, defaults }: { onClose: () => void; defaults?: Partial<HourEntry> }) {
  const { user } = useAuth();
  const { data: employees = [] } = useAsync(() => db.employees.list());
  const { data: projects = [] } = useAsync(() => db.projects.list());
  const { data: phases = [] } = useAsync(() => db.phases.list());
  const { data: existingHours = [] } = useAsync(() => db.hours.list());

  const [v, setV] = useState<Partial<HourEntry>>({ date: today(), hours: 8, ...defaults });
  const projectPhases = phases.filter(p => p.projectId === v.projectId);
  const lock = getLock();

  const dayTotal = useMemo(() => {
    if (!v.employeeId || !v.date) return 0;
    return existingHours.filter(h => h.employeeId === v.employeeId && h.date === v.date).reduce((s, h) => s + h.hours, 0);
  }, [v.employeeId, v.date, existingHours]);
  const wouldExceed = dayTotal + (v.hours || 0) > 24;
  const isDuplicate = !!(v.employeeId && v.date && v.phaseId && existingHours.some(h => h.employeeId === v.employeeId && h.date === v.date && h.phaseId === v.phaseId));
  const isLocked = !!(lock && v.date && v.date <= lock);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!v.employeeId || !v.projectId || !v.hours) { toast.error("Popunite radnika, projekat i sate."); return; }
    if (isLocked) { toast.error(`Period je zaključan do ${fmtDate(lock!)}.`); return; }
    if (wouldExceed) { toast.error(`Radnik bi imao ${dayTotal + v.hours!}h taj dan (max 24h).`); return; }
    if (isDuplicate && !confirm("Već postoji unos za istog radnika/dan/fazu. Snimiti ipak?")) return;
    const emp = employees.find(e => e.id === v.employeeId);
    const created = await db.hours.create({
      ...v, hourlyRate: emp?.hourlyRate || 0,
      approved: user?.role === "admin", approvedBy: user?.role === "admin" ? user.id : undefined, approvedAt: user?.role === "admin" ? new Date().toISOString() : undefined,
      createdBy: user!.id,
    } as any);
    await logAction(user, "create", "hours", created.id);
    toast.success("Sati zapisani.");
    bumpData(); onClose();
  };

  return (
    <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div className="space-y-1.5 col-span-2"><Label>Datum *</Label><DateShortcuts value={v.date} onChange={d => setV({ ...v, date: d })} /></div>
      <div className="space-y-1.5 col-span-2">
        <Label>Sati * (preset ili upiši)</Label>
        <div className="flex gap-2 items-center">
          <HourPresets value={v.hours || 0} onChange={h => setV({ ...v, hours: h })} />
          <Input type="number" step="0.25" value={v.hours ?? 0} onChange={e => setV({ ...v, hours: parseFloat(e.target.value) || 0 })} className="w-24" required />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Radnik *</Label>
        <Select value={v.employeeId} onValueChange={(x) => setV({ ...v, employeeId: x })}>
          <SelectTrigger><SelectValue placeholder="Odaberi radnika" /></SelectTrigger>
          <SelectContent>{employees.filter(e => e.active).map(e => <SelectItem key={e.id} value={e.id}>{e.firstName} {e.lastName} ({e.hourlyRate} KM/h)</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>Projekat *</Label>
        <Select value={v.projectId} onValueChange={(x) => setV({ ...v, projectId: x, phaseId: undefined })}>
          <SelectTrigger><SelectValue placeholder="Odaberi" /></SelectTrigger>
          <SelectContent>{projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5 col-span-2">
        <Label>Faza</Label>
        <Select value={v.phaseId} onValueChange={(x) => setV({ ...v, phaseId: x })} disabled={!v.projectId}>
          <SelectTrigger><SelectValue placeholder={v.projectId ? "Odaberi" : "Odaberi projekat"} /></SelectTrigger>
          <SelectContent>{projectPhases.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5 col-span-2"><Label>Napomena</Label><Input value={v.notes || ""} onChange={e => setV({ ...v, notes: e.target.value })} /></div>

      {(isLocked || wouldExceed || isDuplicate) && (
        <div className="col-span-2 space-y-1.5">
          {isLocked && <div className="text-xs flex items-center gap-1.5 text-destructive"><Lock className="h-3.5 w-3.5" /> Period zaključan do {fmtDate(lock!)}.</div>}
          {wouldExceed && <div className="text-xs flex items-center gap-1.5 text-destructive"><AlertTriangle className="h-3.5 w-3.5" /> Već {fmtNum(dayTotal)}h taj dan — prelazi 24h.</div>}
          {isDuplicate && !wouldExceed && !isLocked && <div className="text-xs flex items-center gap-1.5 text-warning-foreground"><AlertCircle className="h-3.5 w-3.5" /> Već postoji unos za isti dan + fazu.</div>}
        </div>
      )}

      <DialogFooter className="col-span-2">
        <Button type="button" variant="outline" onClick={onClose}>Odustani</Button>
        <Button type="submit" disabled={isLocked || wouldExceed}>Sačuvaj</Button>
      </DialogFooter>
    </form>
  );
}
