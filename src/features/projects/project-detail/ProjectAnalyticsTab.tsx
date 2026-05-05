import { useMemo } from "react";
import { db } from "@/data";
import { useAsync } from "@/data/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fmtKM } from "@shared/lib/format";
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell, Legend, LineChart, Line } from "recharts";

const COLORS = ["hsl(var(--primary))", "hsl(var(--success))", "hsl(var(--warning))", "hsl(var(--destructive))", "#a78bfa", "#60a5fa", "#34d399", "#f472b6"];

export function ProjectAnalyticsTab({ projectId }: { projectId: string }) {
  const { data: phases = [] } = useAsync(() => db.phases.list());
  const { data: hours = [] } = useAsync(() => db.hours.list());
  const { data: expenses = [] } = useAsync(() => db.expenses.list());

  const ph = phases.filter(p => p.projectId === projectId);
  const ph_hours = hours.filter(h => h.projectId === projectId);
  const ph_exp = expenses.filter(e => e.projectId === projectId);

  const phaseChart = useMemo(() => ph.map(p => {
    const labor = ph_hours.filter(h => h.phaseId === p.id).reduce((s, h) => s + h.hours * h.hourlyRate, 0);
    const exp = ph_exp.filter(e => e.phaseId === p.id).reduce((s, e) => s + e.amount, 0);
    const total = labor + exp;
    return { name: p.name.slice(0, 12), KMpoM2: p.squareMeters > 0 ? total / p.squareMeters : 0, trošak: total };
  }), [ph, ph_hours, ph_exp]);

  const categoryChart = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of ph_exp) m.set(e.category, (m.get(e.category) || 0) + e.amount);
    const labor = ph_hours.reduce((s, h) => s + h.hours * h.hourlyRate, 0);
    if (labor > 0) m.set("rad (sati)", labor);
    return [...m.entries()].map(([name, value]) => ({ name, value }));
  }, [ph_exp, ph_hours]);

  const cumulative = useMemo(() => {
    const events: { date: string; amount: number }[] = [];
    for (const h of ph_hours) events.push({ date: h.date, amount: h.hours * h.hourlyRate });
    for (const e of ph_exp) events.push({ date: e.date, amount: e.amount });
    events.sort((a, b) => a.date.localeCompare(b.date));
    let acc = 0;
    const map = new Map<string, number>();
    for (const e of events) { acc += e.amount; map.set(e.date, acc); }
    return [...map.entries()].map(([date, kumulativ]) => ({ date, kumulativ }));
  }, [ph_hours, ph_exp]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card>
        <CardHeader><CardTitle className="text-base">Cijena / m² po fazi</CardTitle></CardHeader>
        <CardContent className="h-72">
          {phaseChart.length === 0 ? <p className="text-muted-foreground text-sm">Nema podataka.</p> : (
            <ResponsiveContainer><BarChart data={phaseChart}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" fontSize={11} stroke="hsl(var(--muted-foreground))" />
              <YAxis fontSize={11} stroke="hsl(var(--muted-foreground))" />
              <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} formatter={(v: any) => fmtKM(v)} />
              <Bar dataKey="KMpoM2" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart></ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Trošak po kategoriji</CardTitle></CardHeader>
        <CardContent className="h-72">
          {categoryChart.length === 0 ? <p className="text-muted-foreground text-sm">Nema troškova.</p> : (
            <ResponsiveContainer><PieChart>
              <Pie data={categoryChart} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={(e: any) => `${e.name} ${((e.percent || 0) * 100).toFixed(0)}%`}>
                {categoryChart.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(v: any) => fmtKM(v)} />
            </PieChart></ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader><CardTitle className="text-base">Kumulativni trošak kroz vrijeme</CardTitle></CardHeader>
        <CardContent className="h-72">
          {cumulative.length === 0 ? <p className="text-muted-foreground text-sm">Nema podataka.</p> : (
            <ResponsiveContainer><LineChart data={cumulative}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" fontSize={11} stroke="hsl(var(--muted-foreground))" />
              <YAxis fontSize={11} stroke="hsl(var(--muted-foreground))" />
              <Tooltip formatter={(v: any) => fmtKM(v)} />
              <Line type="monotone" dataKey="kumulativ" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
            </LineChart></ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
