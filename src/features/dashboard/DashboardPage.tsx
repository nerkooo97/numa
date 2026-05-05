import { Users, FolderKanban, Wallet, Banknote } from "lucide-react";
import { StatCard, PageHeader } from "@shared/components/ui-bits";
import { fmtKM } from "@shared/lib/format";
import { useDashboardData } from "./hooks/useDashboardData";
import { AlertList, type Alert } from "./components/AlertList";
import { ExpiringDocsCard } from "./components/ExpiringDocsCard";
import { LatePhasesCard } from "./components/LatePhasesCard";
import { ProjectsInRedCard, ActiveProjectsCard } from "./components/ProjectsCards";

export default function DashboardPage() {
  const {
    employees, projects, expiring, latePhases,
    projectsInRed, activeProjects, cashBalance, debtTotal, expiredCount, oldDebt,
  } = useDashboardData();

  const alerts: Alert[] = [];
  if (expiredCount > 0) alerts.push({ tone: "danger", title: `${expiredCount} dokumenata istekло`, link: "/zaposleni" });
  if (oldDebt.length > 0) alerts.push({ tone: "danger", title: `${oldDebt.length} keš isplata neopravdano > 30 dana`, link: "/kes" });
  if (latePhases.length > 0) alerts.push({ tone: "warning", title: `${latePhases.length} faza kasni`, link: "/projekti" });
  if (projectsInRed.length > 0) alerts.push({ tone: "danger", title: `${projectsInRed.length} projekata u minusu`, link: "/analitika" });
  if (cashBalance < 0) alerts.push({ tone: "danger", title: `Kasa u minusu: ${fmtKM(cashBalance)}`, link: "/kasa" });

  return (
    <div className="space-y-5">
      <PageHeader title="Pregled poslovanja" description="Trenutno stanje firme — radnici, projekti, dokumenti i finansije." />

      <AlertList alerts={alerts} />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Aktivni radnici" value={employees.filter(e => e.active).length} hint={`${employees.length} ukupno`} tone="primary" />
        <StatCard icon={FolderKanban} label="Aktivni projekti" value={activeProjects.length} hint={`${projects.length} ukupno`} tone="primary" />
        <StatCard icon={Wallet} label="Stanje kase" value={fmtKM(cashBalance)} tone={cashBalance < 0 ? "danger" : "success"} />
        <StatCard icon={Banknote} label="Neopravdani keš" value={fmtKM(debtTotal)} tone={debtTotal > 0 ? "warning" : "success"} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ExpiringDocsCard expiring={expiring} employees={employees} />
        <LatePhasesCard latePhases={latePhases} projects={projects} />
        <ProjectsInRedCard projectsInRed={projectsInRed} />
        <ActiveProjectsCard activeProjects={activeProjects} />
      </div>
    </div>
  );
}
