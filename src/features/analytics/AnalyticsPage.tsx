import { useMemo } from "react";
import { db } from "@/data";
import { useAsync } from "@/data/store";
import { PageHeader, StatCard } from "@shared/components/ui-bits";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fmtKM } from "@shared/lib/format";
import { Banknote, FolderKanban, Layers, TrendingUp } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { StatusChip } from "@shared/components/StatusChip";
import { differenceInCalendarDays } from "date-fns";

export default function Analytics() {
  const { data: projects = [] } = useAsync(() => db.projects.list());
  const { data: phases = [] } = useAsync(() => db.phases.list());
  const { data: hours = [] } = useAsync(() => db.hours.list());
  const { data: expenses = [] } = useAsync(() => db.expenses.list());

  const projectStats = useMemo(() => projects.map(p => {
    const ph = phases.filter(x => x.projectId === p.id);
    const labor = hours.filter(h => h.projectId === p.id).reduce((s, h) => s + h.hours * h.hourlyRate, 0);
    const exp = expenses.filter(e => e.projectId === p.id).reduce((s, e) => s + e.amount, 0);
    const total = labor + exp;
    const profit = (p.contractValue || 0) - total;
    const perM2 = p.squareMeters > 0 ? total / p.squareMeters : 0;
    return { p, ph: ph.length, labor, exp, total, profit, perM2 };
  }), [projects, phases, hours, expenses]);

  const phaseStats = useMemo(() => phases.map(ph => {
    const labor = hours.filter(h => h.phaseId === ph.id).reduce((s, h) => s + h.hours * h.hourlyRate, 0);
    const exp = expenses.filter(e => e.phaseId === ph.id).reduce((s, e) => s + e.amount, 0);
    const total = labor + exp;
    const perM2 = ph.squareMeters > 0 ? total / ph.squareMeters : 0;
    let realDays: number | null = null;
    if (ph.startDate) {
      const end = ph.endDate ? new Date(ph.endDate) : new Date();
      realDays = Math.max(0, differenceInCalendarDays(end, new Date(ph.startDate)));
    }
    const overdue = ph.plannedDays && realDays !== null && realDays > ph.plannedDays;
    const project = projects.find(p => p.id === ph.projectId);
    return { ph, project, total, perM2, realDays, overdue };
  }), [phases, hours, expenses, projects]);

  const totalRevenue = projects.reduce((s, p) => s + (p.contractValue || 0), 0);
  const totalCost = projectStats.reduce((s, x) => s + x.total, 0);
  const totalProfit = totalRevenue - totalCost;
  const totalM2 = projects.reduce((s, p) => s + (p.squareMeters || 0), 0);
  const avgPerM2 = totalM2 > 0 ? totalCost / totalM2 : 0;

  const chartData = projectStats.map(x => ({ name: x.p.name.slice(0, 14), trošak: x.total, prihod: x.p.contractValue || 0 }));

  return (
    <div className="space-y-5">
      <PageHeader title="Analitika" description="Realna cijena po m², profit po projektu, kašnjenja faza." />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={FolderKanban} label="Projekti" value={projects.length} tone="primary" />
        <StatCard icon={Banknote} label="Ukupni trošak" value={fmtKM(totalCost)} tone="warning" />
        <StatCard icon={TrendingUp} label="Profit" value={fmtKM(totalProfit)} tone={totalProfit < 0 ? "danger" : "success"} />
        <StatCard icon={Layers} label="Prosj. cijena / m²" value={fmtKM(avgPerM2)} tone="primary" />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Projekti — trošak vs prihod</CardTitle></CardHeader>
        <CardContent className="h-[300px]">
          {chartData.length === 0 ? <p className="text-muted-foreground text-sm">Nema podataka.</p> : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                <Bar dataKey="trošak" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="prihod" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Po projektu</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow><TableHead>Projekat</TableHead><TableHead>m²</TableHead><TableHead>Faza</TableHead>
                <TableHead className="text-right">Trošak</TableHead><TableHead className="text-right">Prihod</TableHead>
                <TableHead className="text-right">Profit</TableHead><TableHead className="text-right">Cijena / m²</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {projectStats.length === 0 ? <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-6">Nema podataka.</TableCell></TableRow>
                : projectStats.map(x => (
                  <TableRow key={x.p.id}>
                    <TableCell className="font-medium">{x.p.name}</TableCell>
                    <TableCell>{x.p.squareMeters}</TableCell>
                    <TableCell>{x.ph}</TableCell>
                    <TableCell className="text-right">{fmtKM(x.total)}</TableCell>
                    <TableCell className="text-right">{fmtKM(x.p.contractValue || 0)}</TableCell>
                    <TableCell className={`text-right font-medium ${x.profit < 0 ? "text-destructive" : "text-success"}`}>{fmtKM(x.profit)}</TableCell>
                    <TableCell className="text-right font-medium">{fmtKM(x.perM2)}</TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Faze — efikasnost i kašnjenja</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow><TableHead>Projekat</TableHead><TableHead>Faza</TableHead><TableHead>m²</TableHead>
                <TableHead className="text-right">Trošak</TableHead><TableHead className="text-right">Cijena / m²</TableHead>
                <TableHead>Plan / stvarno</TableHead><TableHead>Status</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {phaseStats.length === 0 ? <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-6">Nema faza.</TableCell></TableRow>
                : phaseStats.map(x => (
                  <TableRow key={x.ph.id}>
                    <TableCell>{x.project?.name || "—"}</TableCell>
                    <TableCell className="font-medium">{x.ph.name}</TableCell>
                    <TableCell>{x.ph.squareMeters}</TableCell>
                    <TableCell className="text-right">{fmtKM(x.total)}</TableCell>
                    <TableCell className="text-right">{fmtKM(x.perM2)}</TableCell>
                    <TableCell>{x.ph.plannedDays ?? "—"} / {x.realDays ?? "—"} dana</TableCell>
                    <TableCell>{x.overdue ? <StatusChip tone="danger">kasni</StatusChip> : <StatusChip tone="success">u planu</StatusChip>}</TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
