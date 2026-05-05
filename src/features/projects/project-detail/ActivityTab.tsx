import { useMemo } from "react";
import { db } from "@/data";
import { useAsync } from "@/data/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fmtDateTime, fmtKM, fmtNum } from "@shared/lib/format";
import { Banknote, Clock, FileText, Image as ImageIcon, Layers, Receipt } from "lucide-react";

type Item = { at: string; icon: any; text: React.ReactNode; tone?: string };

export function ActivityTab({ projectId }: { projectId: string }) {
  const { data: hours = [] } = useAsync(() => db.hours.list());
  const { data: expenses = [] } = useAsync(() => db.expenses.list());
  const { data: phases = [] } = useAsync(() => db.phases.list());
  const { data: docs = [] } = useAsync(() => db.projectDocuments.list());
  const { data: photos = [] } = useAsync(() => db.photos.list());
  const { data: invoices = [] } = useAsync(() => db.invoices.list());
  const { data: employees = [] } = useAsync(() => db.employees.list());

  const items: Item[] = useMemo(() => {
    const out: Item[] = [];
    for (const h of hours.filter(h => h.projectId === projectId)) {
      const e = employees.find(x => x.id === h.employeeId);
      const ph = phases.find(p => p.id === h.phaseId);
      out.push({ at: h.createdAt, icon: Clock, text: <><b>{e ? `${e.firstName} ${e.lastName}` : "?"}</b> upisao {fmtNum(h.hours)}h{ph ? <> na <i>{ph.name}</i></> : null} ({fmtKM(h.hours * h.hourlyRate)})</> });
    }
    for (const x of expenses.filter(e => e.projectId === projectId)) {
      out.push({ at: x.createdAt, icon: Receipt, text: <>Trošak <b>{x.category}</b>: {x.description} ({fmtKM(x.amount)})</> });
    }
    for (const ph of phases.filter(p => p.projectId === projectId)) {
      out.push({ at: ph.createdAt, icon: Layers, text: <>Nova faza: <b>{ph.name}</b></> });
    }
    for (const d of docs.filter(d => d.projectId === projectId)) {
      out.push({ at: d.createdAt, icon: FileText, text: <>{d.parentDocumentId ? <>Verzija v{d.version} dokumenta</> : "Dokument"}: <b>{d.name}</b></> });
    }
    for (const p of photos.filter(p => p.projectId === projectId)) {
      out.push({ at: p.createdAt, icon: ImageIcon, text: <>Foto: {p.caption || "bez napomene"}</> });
    }
    for (const i of invoices.filter(i => i.projectId === projectId)) {
      out.push({ at: i.createdAt, icon: Banknote, text: <>Situacija <b>{i.number}</b> ({fmtKM(i.amount)})</> });
    }
    return out.sort((a, b) => b.at.localeCompare(a.at)).slice(0, 100);
  }, [hours, expenses, phases, docs, photos, invoices, employees, projectId]);

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Aktivnost ({items.length})</CardTitle></CardHeader>
      <CardContent>
        {items.length === 0 ? <p className="text-center text-muted-foreground py-6">Nema aktivnosti.</p> : (
          <ol className="relative border-l border-border ml-3 space-y-3">
            {items.map((it, i) => {
              const Icon = it.icon;
              return (
                <li key={i} className="ml-6 relative">
                  <div className="absolute -left-[34px] top-0 h-6 w-6 rounded-full bg-card border grid place-items-center">
                    <Icon className="h-3 w-3 text-muted-foreground" />
                  </div>
                  <div className="text-sm">{it.text}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{fmtDateTime(it.at)}</div>
                </li>
              );
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
