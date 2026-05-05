import { useMemo } from "react";
import { differenceInCalendarDays } from "date-fns";
import { db } from "@/data";
import { useAsync } from "@/data/store";
import { docStatus, daysUntil } from "@shared/lib/format";

export function useDashboardData() {
  const { data: employees = [] } = useAsync(() => db.employees.list());
  const { data: projects = [] } = useAsync(() => db.projects.list());
  const { data: phases = [] } = useAsync(() => db.phases.list());
  const { data: hours = [] } = useAsync(() => db.hours.list());
  const { data: expenses = [] } = useAsync(() => db.expenses.list());
  const { data: docs = [] } = useAsync(() => db.employeeDocuments.list());
  const { data: cashbox = [] } = useAsync(() => db.cashbox.list());
  const { data: cashPayments = [] } = useAsync(() => db.cashPayments.list());
  const { data: justifications = [] } = useAsync(() => db.cashJustifications.list());

  const cashBalance = useMemo(() => cashbox.reduce((s, e) => s + (e.type === "ulaz" ? e.amount : -e.amount), 0), [cashbox]);

  const debtByPayment = useMemo(() => {
    const justByPay = new Map<string, number>();
    for (const j of justifications) justByPay.set(j.cashPaymentId, (justByPay.get(j.cashPaymentId) || 0) + j.amount);
    return cashPayments.map(p => ({ p, debt: Math.max(0, p.amount - (justByPay.get(p.id) || 0)), age: daysUntil(p.date) ? -daysUntil(p.date)! : 0 }));
  }, [cashPayments, justifications]);

  const debtTotal = debtByPayment.reduce((s, x) => s + x.debt, 0);
  const oldDebt = debtByPayment.filter(x => x.debt > 0 && x.age > 30);

  const expiring = useMemo(() => docs.filter(d => {
    const s = docStatus(d.expiresAt);
    return s === "expiring" || s === "expired";
  }).sort((a, b) => (daysUntil(a.expiresAt) ?? 0) - (daysUntil(b.expiresAt) ?? 0)), [docs]);

  const expiredCount = expiring.filter(d => docStatus(d.expiresAt) === "expired").length;

  const latePhases = useMemo(() => phases.filter(ph => {
    if (!ph.startDate || !ph.plannedDays || ph.status === "zavrsena") return false;
    const end = ph.endDate ? new Date(ph.endDate) : new Date();
    const real = differenceInCalendarDays(end, new Date(ph.startDate));
    return real > ph.plannedDays;
  }), [phases]);

  const projectStats = useMemo(() => projects.map(p => {
    const labor = hours.filter(h => h.projectId === p.id).reduce((s, h) => s + h.hours * h.hourlyRate, 0);
    const exp = expenses.filter(e => e.projectId === p.id).reduce((s, e) => s + e.amount, 0);
    const total = labor + exp;
    const profit = (p.contractValue || 0) - total;
    return { p, total, profit };
  }), [projects, hours, expenses]);

  const projectsInRed = projectStats.filter(x => x.p.contractValue && x.profit < 0);
  const activeProjects = projects.filter(p => p.active);

  return {
    employees, projects, phases, expiring, latePhases,
    projectsInRed, activeProjects, cashBalance, debtTotal, expiredCount, oldDebt,
  };
}
