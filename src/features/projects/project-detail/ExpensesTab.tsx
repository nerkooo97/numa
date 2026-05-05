import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { db } from "@/data";
import { useAsync, bumpData } from "@/data/store";
import type { Expense, ExpenseCategory } from "@/data/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { FileField, FileLink } from "@shared/components/FileField";
import { fmtDate, fmtKM } from "@shared/lib/format";
import { useAuth } from "@features/auth/AuthContext";
import { logAction } from "@/data/audit";
import { toast } from "sonner";

const labels: Record<ExpenseCategory, string> = {
  radnici: "Radnici", hrana: "Hrana", prevoz: "Prevoz", smjestaj: "Smještaj",
  materijal: "Materijal", sitni_materijal: "Sitni materijal", neplanirani: "Neplanirani", ostalo: "Ostalo",
};

export function ExpensesTab({ projectId }: { projectId: string }) {
  const { data: all = [] } = useAsync(() => db.expenses.list());
  const { data: allPhases = [] } = useAsync(() => db.phases.list());
  const phases = useMemo(() => allPhases.filter(p => p.projectId === projectId), [allPhases, projectId]);
  const expenses = useMemo(() => all.filter(e => e.projectId === projectId).sort((a, b) => b.date.localeCompare(a.date)), [all, projectId]);
  const [open, setOpen] = useState(false);
  const total = expenses.reduce((s, e) => s + e.amount, 0);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
        <div>
          <CardTitle className="text-base">Troškovi projekta</CardTitle>
          <p className="text-xs text-muted-foreground mt-0.5">{expenses.length} stavki · {fmtKM(total)} ukupno</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> Novi trošak</Button></DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>Novi trošak — projekat zaključan</DialogTitle></DialogHeader>
            <Form projectId={projectId} phases={phases} onClose={() => setOpen(false)} />
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader><TableRow><TableHead>Datum</TableHead><TableHead>Kategorija</TableHead><TableHead>Opis</TableHead><TableHead>Faza</TableHead><TableHead>Račun</TableHead><TableHead className="text-right">Iznos</TableHead><TableHead></TableHead></TableRow></TableHeader>
          <TableBody>
            {expenses.length === 0 ? <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-6">Nema troškova.</TableCell></TableRow>
              : expenses.map(x => {
                const ph = phases.find(p => p.id === x.phaseId);
                return (
                  <TableRow key={x.id}>
                    <TableCell>{fmtDate(x.date)}</TableCell>
                    <TableCell>{labels[x.category]}</TableCell>
                    <TableCell className="max-w-[260px] truncate">{x.description}</TableCell>
                    <TableCell>{ph?.name || "—"}</TableCell>
                    <TableCell><FileLink fileId={x.receiptFileId} /></TableCell>
                    <TableCell className="text-right font-medium tnum">{fmtKM(x.amount)}</TableCell>
                    <TableCell className="text-right">
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={async () => { if (confirm("Obrisati?")) { await db.expenses.remove(x.id); bumpData(); } }}><Trash2 className="h-4 w-4" /></Button>
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

function Form({ projectId, phases, onClose }: { projectId: string; phases: any[]; onClose: () => void }) {
  const { user } = useAuth();
  const today = new Date().toISOString().slice(0, 10);
  const [v, setV] = useState<Partial<Expense>>({ date: today, category: "materijal", amount: 0, description: "", projectId });
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!v.amount || !v.description) { toast.error("Iznos i opis obavezni."); return; }
    const created = await db.expenses.create({ ...v, projectId, createdBy: user!.id, approved: v.category !== "neplanirani" } as any);
    await logAction(user, "create", "expense", created.id);
    toast.success("Trošak zapisan.");
    bumpData(); onClose();
  };
  return (
    <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div className="space-y-1.5"><Label>Datum *</Label><Input type="date" value={v.date} onChange={e => setV({ ...v, date: e.target.value })} required /></div>
      <div className="space-y-1.5"><Label>Iznos (KM) *</Label><Input type="number" step="0.01" value={v.amount ?? 0} onChange={e => setV({ ...v, amount: parseFloat(e.target.value) || 0 })} required /></div>
      <div className="space-y-1.5">
        <Label>Kategorija *</Label>
        <Select value={v.category} onValueChange={(x: ExpenseCategory) => setV({ ...v, category: x })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{Object.entries(labels).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>Faza</Label>
        <Select value={v.phaseId} onValueChange={(x) => setV({ ...v, phaseId: x })}>
          <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
          <SelectContent>{phases.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5 col-span-2"><Label>Opis *</Label><Input value={v.description || ""} onChange={e => setV({ ...v, description: e.target.value })} required /></div>
      {v.category === "neplanirani" && (
        <div className="space-y-1.5 col-span-2"><Label>Razlog</Label><Textarea value={v.unplannedReason || ""} onChange={e => setV({ ...v, unplannedReason: e.target.value })} /></div>
      )}
      <div className="space-y-1.5 col-span-2"><Label>Račun</Label><FileField value={v.receiptFileId} folder={`projects/${projectId}/expenses`} onChange={(id) => setV({ ...v, receiptFileId: id })} /></div>
      <DialogFooter className="col-span-2">
        <Button type="button" variant="outline" onClick={onClose}>Odustani</Button>
        <Button type="submit">Sačuvaj</Button>
      </DialogFooter>
    </form>
  );
}
