import { useMemo } from "react";
import { db } from "@/data";
import { useAsync } from "@/data/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fmtKM, fmtNum, fmtDate } from "@shared/lib/format";
import { StatusChip } from "@shared/components/StatusChip";
import { Link } from "react-router-dom";

export function TeamTab({ projectId }: { projectId: string }) {
  const { data: hours = [] } = useAsync(() => db.hours.list());
  const { data: employees = [] } = useAsync(() => db.employees.list());
  const { data: phases = [] } = useAsync(() => db.phases.list());

  const projectHours = hours.filter(h => h.projectId === projectId);
  const today = new Date().toISOString().slice(0, 10);

  const stats = useMemo(() => {
    const map = new Map<string, { hours: number; cost: number; days: Set<string>; phaseIds: Set<string>; lastDate: string }>();
    for (const h of projectHours) {
      const cur = map.get(h.employeeId) || { hours: 0, cost: 0, days: new Set(), phaseIds: new Set(), lastDate: "" };
      cur.hours += h.hours;
      cur.cost += h.hours * h.hourlyRate;
      cur.days.add(h.date);
      if (h.phaseId) cur.phaseIds.add(h.phaseId);
      if (h.date > cur.lastDate) cur.lastDate = h.date;
      map.set(h.employeeId, cur);
    }
    return [...map.entries()].map(([empId, s]) => ({
      emp: employees.find(e => e.id === empId),
      ...s, days: s.days.size, phaseCount: s.phaseIds.size,
      avgPerDay: s.days.size > 0 ? s.hours / s.days.size : 0,
      isToday: s.lastDate === today,
    })).sort((a, b) => b.cost - a.cost);
  }, [projectHours, employees, today]);

  const todayWorkers = stats.filter(s => s.isToday);

  return (
    <div className="space-y-4">
      {todayWorkers.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Ko radi danas ({todayWorkers.length})</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {todayWorkers.map(s => {
                const todayHours = projectHours.filter(h => h.employeeId === s.emp?.id && h.date === today);
                const ph = phases.find(p => p.id === todayHours[0]?.phaseId);
                return (
                  <div key={s.emp?.id} className="flex items-center gap-2 border rounded-[6px] px-3 py-2 bg-card text-sm">
                    <div className="h-7 w-7 rounded-full bg-primary/10 text-primary grid place-items-center text-xs font-medium">
                      {s.emp?.firstName?.[0]}{s.emp?.lastName?.[0]}
                    </div>
                    <div>
                      <div className="font-medium">{s.emp?.firstName} {s.emp?.lastName}</div>
                      <div className="text-xs text-muted-foreground">{fmtNum(todayHours.reduce((a, h) => a + h.hours, 0))}h · {ph?.name || "—"}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">Tim na projektu ({stats.length})</CardTitle></CardHeader>
        <CardContent>
          {stats.length === 0 ? <p className="text-center text-muted-foreground py-6">Niko nije evidentirao sate na ovom projektu.</p> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Radnik</TableHead>
                  <TableHead>Tip</TableHead>
                  <TableHead className="text-right">Sati</TableHead>
                  <TableHead className="text-right">Dana</TableHead>
                  <TableHead className="text-right">Ø h/dan</TableHead>
                  <TableHead className="text-right">Faza</TableHead>
                  <TableHead className="text-right">Trošak</TableHead>
                  <TableHead>Posljednji</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.map(s => (
                  <TableRow key={s.emp?.id}>
                    <TableCell>
                      {s.emp ? <Link to={`/zaposleni/${s.emp.id}`} className="font-medium hover:underline">{s.emp.firstName} {s.emp.lastName}</Link> : "—"}
                    </TableCell>
                    <TableCell><StatusChip tone={s.emp?.type === "strani" ? "warning" : "muted"}>{s.emp?.type === "strani" ? "strani" : "domaći"}</StatusChip></TableCell>
                    <TableCell className="text-right tnum">{fmtNum(s.hours)}</TableCell>
                    <TableCell className="text-right tnum">{s.days}</TableCell>
                    <TableCell className="text-right tnum">{fmtNum(s.avgPerDay)}</TableCell>
                    <TableCell className="text-right tnum">{s.phaseCount}</TableCell>
                    <TableCell className="text-right font-medium tnum">{fmtKM(s.cost)}</TableCell>
                    <TableCell>{fmtDate(s.lastDate)} {s.isToday && <StatusChip tone="success">danas</StatusChip>}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
