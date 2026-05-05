import { useMemo, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { db } from "@/data";
import { useAsync } from "@/data/store";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { ProjectHero } from "../project-detail/ProjectHero";
import { PhasesTab } from "../project-detail/PhasesTab";
import { DocumentsTab } from "../project-detail/DocumentsTab";
import { TeamTab } from "../project-detail/TeamTab";
import { InvoicesTab } from "../project-detail/InvoicesTab";
import { PhotosTab } from "../project-detail/PhotosTab";
import { ActivityTab } from "../project-detail/ActivityTab";
import { ProjectAnalyticsTab } from "../project-detail/ProjectAnalyticsTab";
import { HoursTab } from "../project-detail/HoursTab";
import { ExpensesTab } from "../project-detail/ExpensesTab";
import { CashTab } from "../project-detail/CashTab";

export default function ProjectDetail() {
  const { id = "" } = useParams();
  const nav = useNavigate();
  const { data: project } = useAsync(() => db.projects.get(id), [id]);
  const { data: allPhases = [] } = useAsync(() => db.phases.list());
  const { data: allHours = [] } = useAsync(() => db.hours.list());
  const { data: allExpenses = [] } = useAsync(() => db.expenses.list());

  const phases = useMemo(() => [...allPhases.filter(p => p.projectId === id)].sort((a, b) => (a.order ?? 9999) - (b.order ?? 9999)), [allPhases, id]);
  const hours = useMemo(() => allHours.filter(h => h.projectId === id), [allHours, id]);
  const expenses = useMemo(() => allExpenses.filter(e => e.projectId === id), [allExpenses, id]);

  const [finSub, setFinSub] = useState("sati");
  const [docSub, setDocSub] = useState("dokumenti");

  if (!project) return <div className="text-muted-foreground">Učitavanje...</div>;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-2">
        <Button variant="ghost" size="sm" onClick={() => nav(-1)}><ArrowLeft className="h-4 w-4 mr-1" /> Nazad</Button>
        <nav className="text-xs text-muted-foreground truncate min-w-0"><Link to="/projekti" className="hover:underline">Projekti</Link> / <span className="text-foreground">{project.name}</span></nav>
      </div>

      <ProjectHero project={project} phases={phases} hours={hours} expenses={expenses} />

      <Tabs defaultValue="rad">
        <TabsList className="w-full sm:w-auto sm:max-w-3xl">
          <TabsTrigger value="rad">Rad</TabsTrigger>
          <TabsTrigger value="finansije">Finansije</TabsTrigger>
          <TabsTrigger value="dokumenti">Dokumenti</TabsTrigger>
          <TabsTrigger value="tim">Tim</TabsTrigger>
          <TabsTrigger value="analitika">Analitika</TabsTrigger>
        </TabsList>

        {/* RAD: faze + aktivnost */}
        <TabsContent value="rad" className="mt-4">
          <PhasesTab projectId={id} />
        </TabsContent>

        {/* FINANSIJE: sati / troškovi / keš / naplata */}
        <TabsContent value="finansije" className="mt-4 space-y-4">
          <Tabs value={finSub} onValueChange={setFinSub}>
            <TabsList>
              <TabsTrigger value="sati">Sati</TabsTrigger>
              <TabsTrigger value="troskovi">Troškovi</TabsTrigger>
              <TabsTrigger value="kes">Keš isplate</TabsTrigger>
              <TabsTrigger value="naplata">Naplata</TabsTrigger>
            </TabsList>
            <TabsContent value="sati" className="mt-4"><HoursTab projectId={id} /></TabsContent>
            <TabsContent value="troskovi" className="mt-4"><ExpensesTab projectId={id} /></TabsContent>
            <TabsContent value="kes" className="mt-4"><CashTab projectId={id} /></TabsContent>
            <TabsContent value="naplata" className="mt-4"><InvoicesTab projectId={id} contractValue={project.contractValue || 0} /></TabsContent>
          </Tabs>
        </TabsContent>

        {/* DOKUMENTI: dokumenti / galerija */}
        <TabsContent value="dokumenti" className="mt-4 space-y-4">
          <Tabs value={docSub} onValueChange={setDocSub}>
            <TabsList>
              <TabsTrigger value="dokumenti">Dokumenti</TabsTrigger>
              <TabsTrigger value="galerija">Galerija</TabsTrigger>
            </TabsList>
            <TabsContent value="dokumenti" className="mt-4"><DocumentsTab projectId={id} phases={phases} /></TabsContent>
            <TabsContent value="galerija" className="mt-4"><PhotosTab projectId={id} phases={phases} /></TabsContent>
          </Tabs>
        </TabsContent>

        {/* TIM */}
        <TabsContent value="tim" className="mt-4"><TeamTab projectId={id} /></TabsContent>

        {/* ANALITIKA + AKTIVNOST */}
        <TabsContent value="analitika" className="mt-4 space-y-4">
          <ProjectAnalyticsTab projectId={id} />
          <ActivityTab projectId={id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
