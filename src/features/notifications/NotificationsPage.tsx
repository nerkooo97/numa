import { useMemo } from "react";
import { db } from "@/data";
import { useAsync } from "@/data/store";
import { PageHeader } from "@shared/components/ui-bits";
import { Card, CardContent } from "@/components/ui/card";
import { StatusChip } from "@shared/components/StatusChip";
import { docStatus, daysUntil, fmtDate } from "@shared/lib/format";
import { AlertTriangle, Bell, FileWarning } from "lucide-react";
import { Link } from "react-router-dom";
import { usePagination } from "@shared/hooks/usePagination";
import { PaginationBar } from "@shared/components/PaginationBar";

export default function Notifications() {
  const { data: docs = [] } = useAsync(() => db.employeeDocuments.list());
  const { data: employees = [] } = useAsync(() => db.employees.list());
  const { data: expenses = [] } = useAsync(() => db.expenses.list());
  const { data: payments = [] } = useAsync(() => db.cashPayments.list());
  const { data: justifications = [] } = useAsync(() => db.cashJustifications.list());

  const items = useMemo(() => {
    const list: { id: string; level: "warning" | "danger" | "info"; title: string; message: string; link?: string; date: string }[] = [];
    for (const d of docs) {
      const s = docStatus(d.expiresAt);
      if (s === "expiring" || s === "expired") {
        const emp = employees.find(e => e.id === d.employeeId);
        const days = daysUntil(d.expiresAt);
        list.push({
          id: d.id,
          level: s === "expired" ? "danger" : "warning",
          title: s === "expired" ? `Istekao dokument: ${d.name}` : `Uskoro ističe: ${d.name}`,
          message: `${emp ? emp.firstName + " " + emp.lastName : "Radnik"} · ${fmtDate(d.expiresAt)}${s === "expiring" ? ` (za ${days} dana)` : ""}`,
          link: emp ? `/zaposleni/${emp.id}` : undefined,
          date: d.expiresAt || "",
        });
      }
    }
    for (const e of expenses.filter(e => e.category === "neplanirani" && !e.approved)) {
      list.push({ id: e.id, level: "warning", title: "Neplanirani trošak čeka odobrenje", message: `${fmtDate(e.date)} · ${e.description}`, link: "/troskovi", date: e.date });
    }
    const justByPay = new Map<string, number>();
    for (const j of justifications) justByPay.set(j.cashPaymentId, (justByPay.get(j.cashPaymentId) || 0) + j.amount);
    for (const p of payments) {
      const debt = p.amount - (justByPay.get(p.id) || 0);
      if (debt > 0 && daysUntil(p.date)! < -7) {
        list.push({ id: p.id, level: "danger", title: "Neopravdana keš isplata > 7 dana", message: `${p.recipientName} · dug ${debt.toFixed(2)} KM`, link: "/kes", date: p.date });
      }
    }
    return list.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  }, [docs, employees, expenses, payments, justifications]);

  const pg = usePagination(items, 25);

  return (
    <div className="space-y-5">
      <PageHeader title="Notifikacije" description={`${items.length} aktivnih obavještenja.`} />
      <Card>
        <CardContent className="p-0">
          {items.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">Nema notifikacija.</div>
          ) : (
            <ul className="divide-y">
              {pg.pageItems.map(it => {
                const Icon = it.level === "danger" ? AlertTriangle : it.level === "warning" ? FileWarning : Bell;
                return (
                  <li key={it.id} className="p-4 flex items-start gap-3">
                    <div className={`h-9 w-9 rounded-lg grid place-items-center shrink-0 ${it.level === "danger" ? "bg-destructive/15 text-destructive" : "bg-warning/20 text-warning-foreground"}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{it.title}</p>
                        <StatusChip tone={it.level === "danger" ? "danger" : "warning"}>{it.level === "danger" ? "hitno" : "pažnja"}</StatusChip>
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5">{it.message}</p>
                    </div>
                    {it.link && <Link to={it.link} className="text-sm text-primary hover:underline shrink-0">Otvori →</Link>}
                  </li>
                );
              })}
            </ul>
          )}
          <PaginationBar {...pg} total={items.length} itemLabel="obavještenja" />
        </CardContent>
      </Card>
    </div>
  );
}
