import { useMemo, useState } from "react";
import { db } from "@/data";
import { useAsync, bumpData } from "@/data/store";
import type { ProjectInvoice } from "@/data/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2 } from "lucide-react";
import { fmtDate, fmtKM } from "@shared/lib/format";
import { StatusChip } from "@shared/components/StatusChip";
import { FileField, FileLink } from "@shared/components/FileField";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

export function InvoicesTab({ projectId, contractValue }: { projectId: string; contractValue: number }) {
  const { data: all = [] } = useAsync(() => db.invoices.list());
  const invoices = useMemo(() => all.filter(i => i.projectId === projectId).sort((a, b) => b.date.localeCompare(a.date)), [all, projectId]);
  const [open, setOpen] = useState(false);

  const totals = useMemo(() => {
    const issued = invoices.reduce((s, i) => s + i.amount, 0);
    const paid = invoices.reduce((s, i) => s + (i.paidAmount || 0), 0);
    return { issued, paid, due: issued - paid };
  }, [invoices]);

  const remove = async (id: string) => { if (confirm("Obrisati situaciju?")) { await db.invoices.remove(id); bumpData(); } };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Naplata / Privremene situacije</CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> Situacija</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nova situacija / faktura</DialogTitle></DialogHeader>
            <Form projectId={projectId} onClose={() => setOpen(false)} />
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <Box label="Ugovorena vrijednost" value={fmtKM(contractValue)} />
          <Box label="Izdato" value={fmtKM(totals.issued)} />
          <Box label="Naplaćeno" value={fmtKM(totals.paid)} tone="success" />
          <Box label="Dug" value={fmtKM(totals.due)} tone={totals.due > 0 ? "warning" : "muted"} />
        </div>
        {contractValue > 0 && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground"><span>Naplaćeno od ugovora</span><span>{((totals.paid / contractValue) * 100).toFixed(1)}%</span></div>
            <Progress value={Math.min(100, (totals.paid / contractValue) * 100)} />
          </div>
        )}

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Broj</TableHead><TableHead>Datum</TableHead><TableHead>Rok</TableHead>
              <TableHead className="text-right">Iznos</TableHead><TableHead className="text-right">Naplaćeno</TableHead>
              <TableHead>Status</TableHead><TableHead>Fajl</TableHead><TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices.length === 0 ? <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-6">Nema situacija.</TableCell></TableRow>
              : invoices.map(i => {
                const overdue = i.dueDate && new Date(i.dueDate) < new Date() && (i.paidAmount || 0) < i.amount;
                const status = (i.paidAmount || 0) >= i.amount ? "placena" : overdue ? "kasni" : (i.paidAmount || 0) > 0 ? "djelimicno_placena" : "izdata";
                return (
                  <TableRow key={i.id}>
                    <TableCell className="font-medium">{i.number}</TableCell>
                    <TableCell>{fmtDate(i.date)}</TableCell>
                    <TableCell>{fmtDate(i.dueDate)}</TableCell>
                    <TableCell className="text-right tnum">{fmtKM(i.amount)}</TableCell>
                    <TableCell className="text-right tnum">{fmtKM(i.paidAmount || 0)}</TableCell>
                    <TableCell>
                      <StatusChip tone={status === "placena" ? "success" : status === "kasni" ? "danger" : status === "djelimicno_placena" ? "warning" : "info"}>
                        {status === "placena" ? "plaćena" : status === "kasni" ? "kasni" : status === "djelimicno_placena" ? "djelimično" : "izdata"}
                      </StatusChip>
                    </TableCell>
                    <TableCell><FileLink fileId={i.fileId} /></TableCell>
                    <TableCell className="text-right">
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => remove(i.id)}><Trash2 className="h-4 w-4" /></Button>
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

function Box({ label, value, tone = "muted" }: { label: string; value: string; tone?: "muted" | "success" | "warning" }) {
  const cls = tone === "success" ? "text-success" : tone === "warning" ? "text-warning" : "";
  return <div className="p-3 rounded-[6px] border bg-card"><div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div><div className={`text-lg font-light tnum mt-1 ${cls}`}>{value}</div></div>;
}

function Form({ projectId, onClose }: { projectId: string; onClose: () => void }) {
  const [v, setV] = useState<Partial<ProjectInvoice>>({ projectId, number: "", date: new Date().toISOString().slice(0, 10), amount: 0, status: "izdata" });
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!v.number || !v.amount) { toast.error("Broj i iznos obavezni."); return; }
    await db.invoices.create(v as any);
    toast.success("Situacija dodana.");
    bumpData(); onClose();
  };
  return (
    <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div className="space-y-1.5"><Label>Broj *</Label><Input value={v.number || ""} onChange={e => setV({ ...v, number: e.target.value })} required /></div>
      <div className="space-y-1.5"><Label>Datum *</Label><Input type="date" value={v.date || ""} onChange={e => setV({ ...v, date: e.target.value })} required /></div>
      <div className="space-y-1.5"><Label>Rok plaćanja</Label><Input type="date" value={v.dueDate || ""} onChange={e => setV({ ...v, dueDate: e.target.value })} /></div>
      <div className="space-y-1.5"><Label>Iznos (KM) *</Label><Input type="number" step="0.01" value={v.amount ?? 0} onChange={e => setV({ ...v, amount: parseFloat(e.target.value) || 0 })} required /></div>
      <div className="space-y-1.5"><Label>Naplaćeno (KM)</Label><Input type="number" step="0.01" value={v.paidAmount ?? 0} onChange={e => setV({ ...v, paidAmount: parseFloat(e.target.value) || 0 })} /></div>
      <div className="space-y-1.5 col-span-2"><Label>Opis</Label><Input value={v.description || ""} onChange={e => setV({ ...v, description: e.target.value })} /></div>
      <div className="space-y-1.5 col-span-2"><Label>Fajl (PDF)</Label><FileField value={v.fileId} folder={`projects/${projectId}/invoices`} onChange={(id) => setV({ ...v, fileId: id })} /></div>
      <DialogFooter className="col-span-2">
        <Button type="button" variant="outline" onClick={onClose}>Odustani</Button>
        <Button type="submit">Sačuvaj</Button>
      </DialogFooter>
    </form>
  );
}
