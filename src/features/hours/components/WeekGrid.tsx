import { useMemo, useState } from "react";
import { Info } from "lucide-react";
import { db } from "@/data";
import { bumpData } from "@/data/store";
import type { HourEntry } from "@/data/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fmtDate, fmtNum } from "@shared/lib/format";
import { useAuth } from "@features/auth/AuthContext";
import { toast } from "sonner";
import { addDays, startOfWeek, today } from "../lib/dates";

const dayLabels = ["Pon", "Uto", "Sri", "Čet", "Pet", "Sub", "Ned"];

export function WeekGrid({ employees, projects, phases, hours, isAdmin, lock }: { employees: any[]; projects: any[]; phases: any[]; hours: HourEntry[]; isAdmin: boolean; lock: string | null }) {
  const { user } = useAuth();
  const [weekStart, setWeekStart] = useState(startOfWeek(today()));
  const [projectId, setProjectId] = useState<string>("");
  const [phaseId, setPhaseId] = useState<string | undefined>();
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);
  const projectPhases = phases.filter(p => p.projectId === projectId);
  const active = employees.filter(e => e.active);

  const lookup = useMemo(() => {
    const m = new Map<string, HourEntry>();
    for (const h of hours) {
      if (projectId && h.projectId !== projectId) continue;
      if (phaseId && h.phaseId !== phaseId) continue;
      m.set(`${h.employeeId}|${h.date}`, h);
    }
    return m;
  }, [hours, projectId, phaseId]);

  const setCell = async (empId: string, date: string, val: number) => {
    if (lock && date <= lock && !isAdmin) { toast.error("Period zaključan."); return; }
    if (!projectId) { toast.error("Prvo odaberi projekat."); return; }
    const existing = lookup.get(`${empId}|${date}`);
    if (existing) {
      if (val === 0) await db.hours.remove(existing.id);
      else await db.hours.update(existing.id, { hours: val } as any);
    } else if (val > 0) {
      const emp = employees.find(e => e.id === empId);
      await db.hours.create({
        date, employeeId: empId, projectId, phaseId, hours: val,
        hourlyRate: emp?.hourlyRate || 0,
        approved: isAdmin, approvedBy: isAdmin ? user!.id : undefined,
        createdBy: user!.id,
      } as any);
    }
    bumpData();
  };

  const totalsRow = days.map(d => active.reduce((s, e) => s + (lookup.get(`${e.id}|${d}`)?.hours || 0), 0));
  const grandTotal = totalsRow.reduce((s, n) => s + n, 0);

  return (
    <Card>
      <CardContent className="pt-5 space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => setWeekStart(addDays(weekStart, -7))}>← Prošla</Button>
          <Button size="sm" variant="outline" onClick={() => setWeekStart(startOfWeek(today()))}>Ova sedmica</Button>
          <Button size="sm" variant="outline" onClick={() => setWeekStart(addDays(weekStart, 7))}>Sljedeća →</Button>
          <span className="text-sm text-muted-foreground ml-2">{fmtDate(weekStart)} — {fmtDate(addDays(weekStart, 6))}</span>
          <div className="flex-1" />
          <Select value={projectId} onValueChange={(x) => { setProjectId(x); setPhaseId(undefined); }}>
            <SelectTrigger className="h-9 w-56"><SelectValue placeholder="Projekat *" /></SelectTrigger>
            <SelectContent>{projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={phaseId} onValueChange={setPhaseId} disabled={!projectId}>
            <SelectTrigger className="h-9 w-44"><SelectValue placeholder="Faza" /></SelectTrigger>
            <SelectContent>{projectPhases.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>

        {!projectId && <p className="text-sm text-muted-foreground">Odaberi projekat da bi unosio sate.</p>}

        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 px-2 font-medium text-muted-foreground sticky left-0 bg-card">Radnik</th>
                {days.map((d, i) => (
                  <th key={d} className={`text-center py-2 px-1 font-medium ${d === today() ? "text-primary" : "text-muted-foreground"}`}>
                    <div className="text-[11px] uppercase">{dayLabels[i]}</div>
                    <div className="text-[11px]">{d.slice(8)}.{d.slice(5, 7)}</div>
                  </th>
                ))}
                <th className="text-right py-2 px-2 font-medium text-muted-foreground">Σ</th>
              </tr>
            </thead>
            <tbody>
              {active.length === 0 ? <tr><td colSpan={9} className="text-center text-muted-foreground py-6">Nema aktivnih radnika.</td></tr>
                : active.map(e => {
                  const total = days.reduce((s, d) => s + (lookup.get(`${e.id}|${d}`)?.hours || 0), 0);
                  return (
                    <tr key={e.id} className="border-b hover:bg-muted/30">
                      <td className="py-1.5 px-2 sticky left-0 bg-card">{e.firstName} {e.lastName}</td>
                      {days.map(d => {
                        const cell = lookup.get(`${e.id}|${d}`);
                        const locked = lock && d <= lock && !isAdmin;
                        return (
                          <td key={d} className="p-0.5">
                            <Input
                              type="number" step="0.25" min="0" max="24"
                              defaultValue={cell?.hours || ""}
                              onBlur={(ev) => {
                                const val = parseFloat(ev.target.value) || 0;
                                if (val !== (cell?.hours || 0)) setCell(e.id, d, val);
                              }}
                              disabled={!projectId || !!locked}
                              className="h-8 w-14 text-center tnum px-1"
                              placeholder="—"
                            />
                          </td>
                        );
                      })}
                      <td className="text-right py-1.5 px-2 font-medium tnum">{fmtNum(total)}</td>
                    </tr>
                  );
                })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 font-medium">
                <td className="py-2 px-2 sticky left-0 bg-card">Ukupno</td>
                {totalsRow.map((t, i) => <td key={i} className="text-center py-2 tnum">{t > 0 ? fmtNum(t) : "—"}</td>)}
                <td className="text-right py-2 px-2 tnum">{fmtNum(grandTotal)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
        <p className="text-xs text-muted-foreground flex items-center gap-1.5"><Info className="h-3.5 w-3.5" /> Klik u ćeliju, upiši broj sati, Tab/Enter za snimanje. 0 briše unos.</p>
      </CardContent>
    </Card>
  );
}
