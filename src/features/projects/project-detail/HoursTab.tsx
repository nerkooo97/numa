import { useMemo, useState } from "react";
import { Plus, Trash2, Copy } from "lucide-react";
import { db } from "@/data";
import { useAsync, bumpData } from "@/data/store";
import type { HourEntry } from "@/data/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { fmtDate, fmtKM, fmtNum } from "@shared/lib/format";
import { useAuth } from "@features/auth/AuthContext";
import { logAction } from "@/data/audit";
import { toast } from "sonner";

const today = () => new Date().toISOString().slice(0, 10);
const yesterday = () => { const d = new Date(); d.setDate(d.getDate() - 1); return d.toISOString().slice(0, 10); };

export function HoursTab({ projectId }: { projectId: string }) {
  const { user } = useAuth();
  const { data: allHours = [] } = useAsync(() => db.hours.list());
  const { data: employees = [] } = useAsync(() => db.employees.list());
  const { data: allPhases = [] } = useAsync(() => db.phases.list());
  const phases = useMemo(() => allPhases.filter(p => p.projectId === projectId), [allPhases, projectId]);
  const hours = useMemo(() => allHours.filter(h => h.projectId === projectId).sort((a, b) => b.date.localeCompare(a.date)), [allHours, projectId]);
  const [open, setOpen] = useState(false);

  const totalHours = hours.reduce((s, h) => s + h.hours, 0);
  const totalLabor = hours.reduce((s, h) => s + h.hours * h.hourlyRate, 0);

  const remove = async (id: string) => { if (confirm("Obrisati zapis?")) { await db.hours.remove(id); bumpData(); } };
  const copyToToday = async (h: HourEntry) => {
    await db.hours.create({ ...h, date: today(), id: undefined, createdBy: user!.id } as any);
    toast.success("Kopirano na danas.");
    bumpData();
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
        <div>
          <CardTitle className="text-base">Sati na projektu</CardTitle>
          <p className="text-xs text-muted-foreground mt-0.5">{fmtNum(totalHours)} sati · {fmtKM(totalLabor)} trošak rada</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> Unos sati</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Novi unos sati — projekat zaključan</DialogTitle></DialogHeader>
            <Form projectId={projectId} phases={phases} employees={employees} onClose={() => setOpen(false)} />
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Datum</TableHead><TableHead>Radnik</TableHead><TableHead>Faza</TableHead>
              <TableHead className="text-right">Sati</TableHead><TableHead className="text-right">Satnica</TableHead>
              <TableHead className="text-right">Trošak</TableHead><TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {hours.length === 0 ? <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-6">Nema unosa sati za ovaj projekat.</TableCell></TableRow>
              : hours.map(h => {
                const emp = employees.find(e => e.id === h.employeeId);
                const ph = phases.find(p => p.id === h.phaseId);
                return (
                  <TableRow key={h.id}>
                    <TableCell>{fmtDate(h.date)}</TableCell>
                    <TableCell>{emp ? `${emp.firstName} ${emp.lastName}` : "—"}</TableCell>
                    <TableCell>{ph?.name || "—"}</TableCell>
                    <TableCell className="text-right tnum">{fmtNum(h.hours)}</TableCell>
                    <TableCell className="text-right tnum">{fmtKM(h.hourlyRate)}</TableCell>
                    <TableCell className="text-right tnum font-medium">{fmtKM(h.hours * h.hourlyRate)}</TableCell>
                    <TableCell className="text-right">
                      <Button size="icon" variant="ghost" className="h-8 w-8" title="Kopiraj na danas" onClick={() => copyToToday(h)}><Copy className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => remove(h.id)}><Trash2 className="h-4 w-4" /></Button>
                    </TableCell>
                  </TableRow>
                );
              })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function Form({ projectId, phases, employees, onClose }: { projectId: string; phases: any[]; employees: any[]; onClose: () => void }) {
  const { user } = useAuth();
  const [v, setV] = useState<Partial<HourEntry>>({ date: today(), hours: 8, projectId });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!v.employeeId || !v.hours) { toast.error("Popunite radnika i sate."); return; }
    const emp = employees.find(e => e.id === v.employeeId);
    const created = await db.hours.create({ ...v, projectId, hourlyRate: emp?.hourlyRate || 0, createdBy: user!.id } as any);
    await logAction(user, "create", "hours", created.id);
    toast.success("Sati zapisani.");
    bumpData(); onClose();
  };
  return (
    <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div className="space-y-1.5 col-span-2">
        <Label>Datum *</Label>
        <div className="flex gap-1.5">
          <Button type="button" size="sm" variant={v.date === today() ? "default" : "outline"} onClick={() => setV({ ...v, date: today() })}>Danas</Button>
          <Button type="button" size="sm" variant={v.date === yesterday() ? "default" : "outline"} onClick={() => setV({ ...v, date: yesterday() })}>Juče</Button>
          <Input type="date" value={v.date || ""} onChange={e => setV({ ...v, date: e.target.value })} className="h-9 w-auto" />
        </div>
      </div>
      <div className="space-y-1.5"><Label>Sati *</Label><Input type="number" step="0.25" value={v.hours ?? 0} onChange={e => setV({ ...v, hours: parseFloat(e.target.value) || 0 })} required /></div>
      <div className="space-y-1.5">
        <Label>Radnik *</Label>
        <Select value={v.employeeId} onValueChange={(x) => setV({ ...v, employeeId: x })}>
          <SelectTrigger><SelectValue placeholder="Odaberi" /></SelectTrigger>
          <SelectContent>{employees.filter((e: any) => e.active).map((e: any) => <SelectItem key={e.id} value={e.id}>{e.firstName} {e.lastName} ({e.hourlyRate} KM/h)</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5 col-span-2">
        <Label>Faza</Label>
        <Select value={v.phaseId} onValueChange={(x) => setV({ ...v, phaseId: x })}>
          <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
          <SelectContent>{phases.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5 col-span-2"><Label>Napomena</Label><Input value={v.notes || ""} onChange={e => setV({ ...v, notes: e.target.value })} /></div>
      <DialogFooter className="col-span-2">
        <Button type="button" variant="outline" onClick={onClose}>Odustani</Button>
        <Button type="submit">Sačuvaj</Button>
      </DialogFooter>
    </form>
  );
}
