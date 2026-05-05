import { useMemo, useState } from "react";
import { Trash2, Copy, Download, Lock, Check, X, AlertTriangle, Filter } from "lucide-react";
import { db } from "@/data";
import { bumpData } from "@/data/store";
import type { HourEntry } from "@/data/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusChip } from "@shared/components/StatusChip";
import { fmtDate, fmtKM, fmtNum } from "@shared/lib/format";
import { useAuth } from "@features/auth/AuthContext";
import { toast } from "sonner";
import { AlertCircle } from "lucide-react";
import { startOfWeek, startOfMonth, today } from "../lib/dates";
import { exportHoursCSV } from "../lib/exportCsv";
import { usePagination } from "@shared/hooks/usePagination";
import { PaginationBar } from "@shared/components/PaginationBar";

type Period = "week" | "month" | "all" | "custom";

export function HoursListTab({
  hours, employees, projects, phases, isAdmin, lockState,
}: {
  hours: HourEntry[]; employees: any[]; projects: any[]; phases: any[];
  isAdmin: boolean; lockState: string | null;
}) {
  const { user } = useAuth();
  const [period, setPeriod] = useState<Period>("week");
  const [from, setFrom] = useState(startOfWeek(today()));
  const [to, setTo] = useState(today());
  const [fEmp, setFEmp] = useState<string>("all");
  const [fProj, setFProj] = useState<string>("all");
  const [fPhase, setFPhase] = useState<string>("all");
  const [fApproved, setFApproved] = useState<"all" | "yes" | "no">("all");

  // sync period -> dates
  useMemo(() => {
    if (period === "week") { setFrom(startOfWeek(today())); setTo(today()); }
    else if (period === "month") { setFrom(startOfMonth(today())); setTo(today()); }
    else if (period === "all") { setFrom(""); setTo(""); }
  }, [period]);

  const filtered = useMemo(() => hours.filter(h => {
    if (from && h.date < from) return false;
    if (to && h.date > to) return false;
    if (fEmp !== "all" && h.employeeId !== fEmp) return false;
    if (fProj !== "all" && h.projectId !== fProj) return false;
    if (fPhase !== "all" && h.phaseId !== fPhase) return false;
    if (fApproved === "yes" && !h.approved) return false;
    if (fApproved === "no" && h.approved) return false;
    return true;
  }), [hours, from, to, fEmp, fProj, fPhase, fApproved]);

  const sorted = useMemo(() => [...filtered].sort((a, b) => b.date.localeCompare(a.date)), [filtered]);
  const pendingCount = filtered.filter(h => !h.approved).length;
  const pg = usePagination(sorted, 25);

  const dupKeys = useMemo(() => {
    const map = new Map<string, number>();
    const dups = new Set<string>();
    for (const h of filtered) {
      if (!h.phaseId) continue;
      const k = `${h.employeeId}|${h.date}|${h.phaseId}`;
      const c = (map.get(k) || 0) + 1;
      map.set(k, c);
      if (c > 1) dups.add(k);
    }
    return dups;
  }, [filtered]);

  const overflowDays = useMemo(() => {
    const map = new Map<string, number>();
    for (const h of filtered) {
      const k = `${h.employeeId}|${h.date}`;
      map.set(k, (map.get(k) || 0) + h.hours);
    }
    const over = new Set<string>();
    for (const [k, v] of map) if (v > 24) over.add(k);
    return over;
  }, [filtered]);

  const remove = async (h: HourEntry) => {
    if (lockState && h.date <= lockState && !isAdmin) { toast.error("Period zaključan."); return; }
    if (!confirm("Obrisati zapis?")) return;
    await db.hours.remove(h.id); bumpData();
  };
  const approve = async (h: HourEntry, val: boolean) => {
    await db.hours.update(h.id, { approved: val, approvedBy: val ? user!.id : undefined, approvedAt: val ? new Date().toISOString() : undefined } as any);
    bumpData();
  };
  const approveAll = async () => {
    if (!confirm(`Odobriti svih ${pendingCount} prikazanih zapisa?`)) return;
    for (const h of filtered.filter(h => !h.approved)) {
      await db.hours.update(h.id, { approved: true, approvedBy: user!.id, approvedAt: new Date().toISOString() } as any);
    }
    toast.success("Odobreno."); bumpData();
  };
  const copyOne = async (h: HourEntry) => {
    await db.hours.create({
      date: today(), employeeId: h.employeeId, projectId: h.projectId, phaseId: h.phaseId,
      hours: h.hours, hourlyRate: h.hourlyRate, notes: h.notes,
      approved: isAdmin, approvedBy: isAdmin ? user!.id : undefined,
      createdBy: user!.id,
    } as any);
    toast.success("Zapis kopiran na danas."); bumpData();
  };

  const projectPhases = fProj === "all" ? phases : phases.filter(p => p.projectId === fProj);

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-5">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex items-center gap-1.5"><Filter className="h-4 w-4 text-muted-foreground" /><span className="text-sm font-medium">Filteri</span></div>
            <div className="space-y-1">
              <Label className="text-xs">Period</Label>
              <div className="flex gap-1">
                {(["week", "month", "all", "custom"] as const).map(p => (
                  <Button key={p} size="sm" variant={period === p ? "default" : "outline"} onClick={() => setPeriod(p)}>
                    {p === "week" ? "Sedmica" : p === "month" ? "Mjesec" : p === "all" ? "Sve" : "Custom"}
                  </Button>
                ))}
              </div>
            </div>
            {(period === "custom" || period === "week" || period === "month") && (
              <>
                <div className="space-y-1"><Label className="text-xs">Od</Label><Input type="date" value={from} onChange={e => { setFrom(e.target.value); setPeriod("custom"); }} className="h-9" /></div>
                <div className="space-y-1"><Label className="text-xs">Do</Label><Input type="date" value={to} onChange={e => { setTo(e.target.value); setPeriod("custom"); }} className="h-9" /></div>
              </>
            )}
            <div className="space-y-1">
              <Label className="text-xs">Radnik</Label>
              <Select value={fEmp} onValueChange={setFEmp}>
                <SelectTrigger className="h-9 w-44"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="all">Svi</SelectItem>{employees.map(e => <SelectItem key={e.id} value={e.id}>{e.firstName} {e.lastName}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Projekat</Label>
              <Select value={fProj} onValueChange={(x) => { setFProj(x); setFPhase("all"); }}>
                <SelectTrigger className="h-9 w-44"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="all">Svi</SelectItem>{projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Faza</Label>
              <Select value={fPhase} onValueChange={setFPhase} disabled={fProj === "all"}>
                <SelectTrigger className="h-9 w-40"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="all">Sve</SelectItem>{projectPhases.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Status</Label>
              <Select value={fApproved} onValueChange={(x: any) => setFApproved(x)}>
                <SelectTrigger className="h-9 w-36"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="all">Svi</SelectItem><SelectItem value="yes">Odobreno</SelectItem><SelectItem value="no">Čeka</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="flex-1" />
            <Button variant="outline" size="sm" onClick={() => exportHoursCSV(sorted, employees, projects, phases)}><Download className="h-4 w-4 mr-1" /> Export CSV</Button>
            {isAdmin && pendingCount > 0 && <Button size="sm" onClick={approveAll}><Check className="h-4 w-4 mr-1" /> Odobri sve ({pendingCount})</Button>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Datum</TableHead><TableHead>Radnik</TableHead><TableHead>Projekat</TableHead><TableHead>Faza</TableHead>
              <TableHead className="text-right">Sati</TableHead><TableHead className="text-right">Satnica</TableHead><TableHead className="text-right">Trošak</TableHead>
              <TableHead>Status</TableHead><TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.length === 0 ? (
              <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">Nema zapisa po filteru.</TableCell></TableRow>
            ) : pg.pageItems.map(h => {
              const emp = employees.find(e => e.id === h.employeeId);
              const pr = projects.find(p => p.id === h.projectId);
              const ph = phases.find(p => p.id === h.phaseId);
              const isDup = h.phaseId && dupKeys.has(`${h.employeeId}|${h.date}|${h.phaseId}`);
              const isOver = overflowDays.has(`${h.employeeId}|${h.date}`);
              const isLocked = lockState && h.date <= lockState && !isAdmin;
              return (
                <TableRow key={h.id} className={isOver ? "bg-destructive/5" : isDup ? "bg-warning/5" : ""}>
                  <TableCell>{fmtDate(h.date)}{isLocked && <Lock className="h-3 w-3 inline ml-1 text-muted-foreground" />}</TableCell>
                  <TableCell>{emp ? `${emp.firstName} ${emp.lastName}` : "—"}</TableCell>
                  <TableCell>{pr?.name || "—"}</TableCell>
                  <TableCell>{ph?.name || "—"}</TableCell>
                  <TableCell className="text-right tnum">
                    {fmtNum(h.hours)}
                    {isOver && <AlertTriangle className="h-3 w-3 inline ml-1 text-destructive" />}
                    {isDup && !isOver && <AlertCircle className="h-3 w-3 inline ml-1 text-warning-foreground" />}
                  </TableCell>
                  <TableCell className="text-right tnum">{fmtKM(h.hourlyRate)}</TableCell>
                  <TableCell className="text-right font-medium tnum">{fmtKM(h.hours * h.hourlyRate)}</TableCell>
                  <TableCell>
                    {h.approved ? <StatusChip tone="success">odobreno</StatusChip> : <StatusChip tone="warning">čeka</StatusChip>}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {isAdmin && !h.approved && <Button size="icon" variant="ghost" className="h-8 w-8 text-success" title="Odobri" onClick={() => approve(h, true)}><Check className="h-4 w-4" /></Button>}
                      {isAdmin && h.approved && <Button size="icon" variant="ghost" className="h-8 w-8" title="Povuci odobrenje" onClick={() => approve(h, false)}><X className="h-4 w-4" /></Button>}
                      <Button size="icon" variant="ghost" className="h-8 w-8" title="Kopiraj na danas" onClick={() => copyOne(h)}><Copy className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" disabled={!!isLocked} onClick={() => remove(h)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        <PaginationBar {...pg} total={sorted.length} itemLabel="zapisa" />
      </Card>

      {(dupKeys.size > 0 || overflowDays.size > 0) && (
        <div className="text-xs text-muted-foreground space-y-1">
          {overflowDays.size > 0 && <div className="flex items-center gap-1.5 text-destructive"><AlertTriangle className="h-3.5 w-3.5" /> {overflowDays.size} dan(a) sa preko 24h po radniku.</div>}
          {dupKeys.size > 0 && <div className="flex items-center gap-1.5 text-warning-foreground"><AlertCircle className="h-3.5 w-3.5" /> {dupKeys.size} dupliranih unosa (isti radnik + dan + faza).</div>}
        </div>
      )}
    </div>
  );
}
