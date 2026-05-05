import { useState } from "react";
import { Lock } from "lucide-react";
import { db } from "@/data";
import { useAsync, bumpData } from "@/data/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DialogFooter } from "@/components/ui/dialog";
import { fmtDate } from "@shared/lib/format";
import { useAuth } from "@features/auth/AuthContext";
import { logAction } from "@/data/audit";
import { toast } from "sonner";
import { DateShortcuts } from "./DateShortcuts";
import { HourPresets } from "./HourPresets";
import { today, getLock } from "../lib/dates";

export function BulkForm({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
  const { data: employees = [] } = useAsync(() => db.employees.list());
  const { data: projects = [] } = useAsync(() => db.projects.list());
  const { data: phases = [] } = useAsync(() => db.phases.list());

  const [date, setDate] = useState(today());
  const [hours, setHours] = useState(8);
  const [projectId, setProjectId] = useState<string>("");
  const [phaseId, setPhaseId] = useState<string | undefined>();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [notes, setNotes] = useState("");
  const projectPhases = phases.filter(p => p.projectId === projectId);
  const active = employees.filter(e => e.active);
  const lock = getLock();
  const isLocked = !!(lock && date <= lock);

  const toggle = (id: string) => { const s = new Set(selected); s.has(id) ? s.delete(id) : s.add(id); setSelected(s); };
  const allOn = active.length > 0 && active.every(e => selected.has(e.id));
  const toggleAll = () => setSelected(allOn ? new Set() : new Set(active.map(e => e.id)));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLocked) { toast.error("Period zaključan."); return; }
    if (!projectId || !hours || selected.size === 0) { toast.error("Popunite projekat, sate i odaberite radnike."); return; }
    let count = 0;
    for (const empId of selected) {
      const emp = employees.find(x => x.id === empId);
      const created = await db.hours.create({
        date, hours, employeeId: empId, projectId, phaseId, notes,
        hourlyRate: emp?.hourlyRate || 0,
        approved: user?.role === "admin", approvedBy: user?.role === "admin" ? user.id : undefined,
        createdBy: user!.id,
      } as any);
      await logAction(user, "create", "hours", created.id, "bulk");
      count++;
    }
    toast.success(`Upisano ${count} zapisa.`);
    bumpData(); onClose();
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5 col-span-2"><Label>Datum *</Label><DateShortcuts value={date} onChange={setDate} /></div>
        <div className="space-y-1.5 col-span-2">
          <Label>Sati *</Label>
          <div className="flex gap-2 items-center"><HourPresets value={hours} onChange={setHours} /><Input type="number" step="0.25" value={hours} onChange={e => setHours(parseFloat(e.target.value) || 0)} className="w-24" required /></div>
        </div>
        <div className="space-y-1.5">
          <Label>Projekat *</Label>
          <Select value={projectId} onValueChange={(x) => { setProjectId(x); setPhaseId(undefined); }}>
            <SelectTrigger><SelectValue placeholder="Odaberi" /></SelectTrigger>
            <SelectContent>{projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Faza</Label>
          <Select value={phaseId} onValueChange={setPhaseId} disabled={!projectId}>
            <SelectTrigger><SelectValue placeholder={projectId ? "Odaberi" : "—"} /></SelectTrigger>
            <SelectContent>{projectPhases.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5 col-span-2"><Label>Napomena</Label><Input value={notes} onChange={e => setNotes(e.target.value)} /></div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <Label>Radnici ({selected.size}/{active.length})</Label>
          <Button type="button" size="sm" variant="outline" onClick={toggleAll}>{allOn ? "Poništi sve" : "Označi sve"}</Button>
        </div>
        <div className="border rounded-[6px] max-h-64 overflow-y-auto divide-y">
          {active.length === 0 ? <p className="p-4 text-sm text-muted-foreground">Nema aktivnih radnika.</p> :
            active.map(e => (
              <label key={e.id} className="flex items-center gap-3 px-3 py-2 hover:bg-muted/40 cursor-pointer text-sm">
                <Checkbox checked={selected.has(e.id)} onCheckedChange={() => toggle(e.id)} />
                <span className="flex-1">{e.firstName} {e.lastName}</span>
                <span className="text-xs text-muted-foreground">{e.hourlyRate} KM/h</span>
              </label>
            ))}
        </div>
      </div>

      {isLocked && <div className="text-xs flex items-center gap-1.5 text-destructive"><Lock className="h-3.5 w-3.5" /> Period zaključan do {fmtDate(lock!)}.</div>}

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>Odustani</Button>
        <Button type="submit" disabled={isLocked}>Upiši za {selected.size}</Button>
      </DialogFooter>
    </form>
  );
}
