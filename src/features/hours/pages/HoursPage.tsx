import { useEffect, useMemo, useState } from "react";
import { Plus, Copy, Users as UsersIcon, Lock, Grid3x3, Clock, Wallet, AlertCircle } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { db } from "@/data";
import { useAsync, bumpData } from "@/data/store";
import { PageHeader, StatCard } from "@shared/components/ui-bits";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fmtDate, fmtKM, fmtNum } from "@shared/lib/format";
import { useAuth } from "@features/auth/AuthContext";
import { toast } from "sonner";
import { SingleForm } from "../components/SingleForm";
import { BulkForm } from "../components/BulkForm";
import { WeekGrid } from "../components/WeekGrid";
import { HoursListTab } from "../components/HoursListTab";
import { AdminTab } from "../components/AdminTab";
import { getLock, setLock, today, yesterday } from "../lib/dates";

export default function HoursPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const { data: hours = [] } = useAsync(() => db.hours.list());
  const { data: employees = [] } = useAsync(() => db.employees.list());
  const { data: projects = [] } = useAsync(() => db.projects.list());
  const { data: phases = [] } = useAsync(() => db.phases.list());
  const [open, setOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [params, setParams] = useSearchParams();
  const [lockState, setLockState] = useState<string | null>(getLock());

  useEffect(() => { if (params.get("new") === "1") { setOpen(true); params.delete("new"); setParams(params, { replace: true }); } }, [params, setParams]);

  const totalHours = hours.reduce((s, h) => s + h.hours, 0);
  const totalLabor = hours.reduce((s, h) => s + h.hours * h.hourlyRate, 0);
  const pendingCount = hours.filter(h => !h.approved).length;

  const copyYesterday = async () => {
    const y = yesterday(); const t = today();
    const yEntries = hours.filter(h => h.date === y);
    if (yEntries.length === 0) { toast.error("Nema zapisa za juče."); return; }
    if (!confirm(`Kopirati ${yEntries.length} jučerašnjih zapisa na danas?`)) return;
    let count = 0;
    for (const h of yEntries) {
      await db.hours.create({
        date: t, employeeId: h.employeeId, projectId: h.projectId, phaseId: h.phaseId,
        hours: h.hours, hourlyRate: h.hourlyRate, notes: h.notes,
        approved: isAdmin, approvedBy: isAdmin ? user!.id : undefined,
        createdBy: user!.id,
      } as any); count++;
    }
    toast.success(`Kopirano ${count} zapisa.`); bumpData();
  };

  const updateLock = (d: string | null) => { setLock(d); setLockState(d); toast.success(d ? `Period zaključan do ${fmtDate(d)}.` : "Lock uklonjen."); };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Radni sati"
        description={`${hours.length} zapisa · ${fmtNum(totalHours)} sati · ${fmtKM(totalLabor)} trošak rada${pendingCount ? ` · ${pendingCount} čeka odobrenje` : ""}.`}
        actions={
          <>
            <Button variant="outline" onClick={copyYesterday}><Copy className="h-4 w-4 mr-1" /> Kopiraj juče</Button>
            <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
              <DialogTrigger asChild><Button variant="outline"><UsersIcon className="h-4 w-4 mr-1" /> Bulk</Button></DialogTrigger>
              <DialogContent className="max-w-xl">
                <DialogHeader><DialogTitle>Bulk unos sati — više radnika</DialogTitle></DialogHeader>
                <BulkForm onClose={() => setBulkOpen(false)} />
              </DialogContent>
            </Dialog>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" /> Unos sati</Button></DialogTrigger>
              <DialogContent className="max-w-xl">
                <DialogHeader><DialogTitle>Novi unos sati</DialogTitle></DialogHeader>
                <SingleForm onClose={() => setOpen(false)} />
              </DialogContent>
            </Dialog>
          </>
        }
      />

      <Tabs defaultValue="grid">
        <TabsList>
          <TabsTrigger value="grid"><Grid3x3 className="h-4 w-4 mr-1" /> Tjedni grid</TabsTrigger>
          <TabsTrigger value="list">Lista i filteri</TabsTrigger>
          {isAdmin && <TabsTrigger value="admin"><Lock className="h-4 w-4 mr-1" /> Admin</TabsTrigger>}
        </TabsList>

        <TabsContent value="grid" className="mt-4">
          <WeekGrid employees={employees} projects={projects} phases={phases} hours={hours} isAdmin={isAdmin} lock={lockState} />
        </TabsContent>

        <TabsContent value="list" className="mt-4">
          <HoursListTab hours={hours} employees={employees} projects={projects} phases={phases} isAdmin={isAdmin} lockState={lockState} />
        </TabsContent>

        {isAdmin && (
          <TabsContent value="admin" className="mt-4">
            <AdminTab lockState={lockState} setLockState={setLockState} updateLock={updateLock} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
