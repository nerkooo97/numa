import { useMemo, useState } from "react";
import { Plus, Trash2, Receipt } from "lucide-react";
import { db } from "@/data";
import { useAsync, bumpData } from "@/data/store";
import type { CashJustification, CashPayment, CashRecipientType } from "@/data/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { StatusChip } from "@shared/components/StatusChip";
import { FileField } from "@shared/components/FileField";
import { fmtDate, fmtKM } from "@shared/lib/format";
import { useAuth } from "@features/auth/AuthContext";
import { logAction } from "@/data/audit";
import { toast } from "sonner";

const recLabels: Record<CashRecipientType, string> = {
  radnik: "Radnik", poslovodja: "Poslovođa", vlasnik: "Vlasnik", knjigovodstvo: "Knjigovodstvo",
};

export function CashTab({ projectId }: { projectId: string }) {
  const { data: payments = [] } = useAsync(() => db.cashPayments.list());
  const { data: justifications = [] } = useAsync(() => db.cashJustifications.list());
  const list = useMemo(() => payments.filter(p => p.projectId === projectId).sort((a, b) => b.date.localeCompare(a.date)), [payments, projectId]);
  const justByPay = useMemo(() => {
    const m = new Map<string, number>();
    for (const j of justifications) m.set(j.cashPaymentId, (m.get(j.cashPaymentId) || 0) + j.amount);
    return m;
  }, [justifications]);
  const totalIssued = list.reduce((s, p) => s + p.amount, 0);
  const totalDebt = list.reduce((s, p) => s + Math.max(0, p.amount - (justByPay.get(p.id) || 0)), 0);

  const [open, setOpen] = useState(false);
  const [justify, setJustify] = useState<CashPayment | null>(null);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
        <div>
          <CardTitle className="text-base">Keš isplate na projektu</CardTitle>
          <p className="text-xs text-muted-foreground mt-0.5">{fmtKM(totalIssued)} izdato · <span className={totalDebt > 0 ? "text-warning-foreground" : ""}>{fmtKM(totalDebt)} neopravdano</span></p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> Isplata</Button></DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>Nova keš isplata — projekat zaključan</DialogTitle></DialogHeader>
            <Form projectId={projectId} onClose={() => setOpen(false)} />
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader><TableRow><TableHead>Datum</TableHead><TableHead>Primalac</TableHead><TableHead>Tip</TableHead><TableHead>Svrha</TableHead><TableHead>Način</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Iznos</TableHead><TableHead></TableHead></TableRow></TableHeader>
          <TableBody>
            {list.length === 0 ? <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-6">Nema isplata.</TableCell></TableRow>
              : list.map(p => {
                const j = justByPay.get(p.id) || 0;
                const debt = Math.max(0, p.amount - j);
                return (
                  <TableRow key={p.id}>
                    <TableCell>{fmtDate(p.date)}</TableCell>
                    <TableCell className="font-medium">{p.recipientName}</TableCell>
                    <TableCell>{recLabels[p.recipientType]}</TableCell>
                    <TableCell className="max-w-[220px] truncate">{p.purpose}</TableCell>
                    <TableCell>{p.method === "kes" ? "Keš" : "Račun"}</TableCell>
                    <TableCell>
                      {debt === 0 ? <StatusChip tone="success">opravdano</StatusChip>
                        : j > 0 ? <StatusChip tone="warning">dug {fmtKM(debt)}</StatusChip>
                          : <StatusChip tone="danger">nije opravdano</StatusChip>}
                    </TableCell>
                    <TableCell className="text-right font-medium tnum">{fmtKM(p.amount)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {debt > 0 && <Button size="sm" variant="outline" onClick={() => setJustify(p)}><Receipt className="h-4 w-4 mr-1" /> Opravdaj</Button>}
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={async () => { if (confirm("Obrisati?")) { await db.cashPayments.remove(p.id); bumpData(); } }}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
          </TableBody>
        </Table>

        <Dialog open={!!justify} onOpenChange={(o) => { if (!o) setJustify(null); }}>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>Opravdanje isplate</DialogTitle></DialogHeader>
            {justify && <JustifyForm payment={justify} projectId={projectId} onClose={() => setJustify(null)} />}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

function Form({ projectId, onClose }: { projectId: string; onClose: () => void }) {
  const { user } = useAuth();
  const { data: employees = [] } = useAsync(() => db.employees.list());
  const { data: users = [] } = useAsync(() => db.users.list());
  const today = new Date().toISOString().slice(0, 10);
  const [v, setV] = useState<Partial<CashPayment>>({ date: today, recipientType: "radnik", method: "kes", amount: 0, purpose: "", projectId });

  const recipients = useMemo(() => {
    if (v.recipientType === "radnik") return employees.map(e => ({ id: e.id, name: `${e.firstName} ${e.lastName}` }));
    if (v.recipientType === "poslovodja") return users.filter(u => u.role === "poslovodja").map(u => ({ id: u.id, name: u.name }));
    if (v.recipientType === "vlasnik") return users.filter(u => u.role === "admin").map(u => ({ id: u.id, name: u.name }));
    return [];
  }, [v.recipientType, employees, users]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!v.amount || !v.purpose || !v.recipientName) { toast.error("Iznos, primalac i svrha obavezni."); return; }
    const created = await db.cashPayments.create({ ...v, projectId, status: "izdato", createdBy: user!.id } as any);
    await db.cashbox.create({
      date: v.date!, type: "izlaz", amount: v.amount!, description: `Isplata: ${v.recipientName} — ${v.purpose}`,
      refType: "cash_payment", refId: created.id, createdBy: user!.id,
    } as any);
    await logAction(user, "create", "cash_payment", created.id, `${v.recipientName}: ${v.amount} KM`);
    toast.success("Isplata zapisana.");
    bumpData(); onClose();
  };

  return (
    <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div className="space-y-1.5"><Label>Datum *</Label><Input type="date" value={v.date} onChange={e => setV({ ...v, date: e.target.value })} required /></div>
      <div className="space-y-1.5"><Label>Iznos (KM) *</Label><Input type="number" step="0.01" value={v.amount ?? 0} onChange={e => setV({ ...v, amount: parseFloat(e.target.value) || 0 })} required /></div>
      <div className="space-y-1.5">
        <Label>Tip primaoca *</Label>
        <Select value={v.recipientType} onValueChange={(x: CashRecipientType) => setV({ ...v, recipientType: x, recipientId: undefined, recipientName: "" })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{Object.entries(recLabels).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>Primalac *</Label>
        {v.recipientType === "knjigovodstvo" ? (
          <Input value={v.recipientName || ""} onChange={e => setV({ ...v, recipientName: e.target.value })} placeholder="Naziv" required />
        ) : (
          <Select value={v.recipientId} onValueChange={(x) => {
            const r = recipients.find(r => r.id === x);
            setV({ ...v, recipientId: x, recipientName: r?.name || "" });
          }}>
            <SelectTrigger><SelectValue placeholder="Odaberi" /></SelectTrigger>
            <SelectContent>{recipients.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}</SelectContent>
          </Select>
        )}
      </div>
      <div className="space-y-1.5 col-span-2">
        <Label>Način</Label>
        <Select value={v.method} onValueChange={(x: any) => setV({ ...v, method: x })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="kes">Keš</SelectItem><SelectItem value="racun">Račun</SelectItem></SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5 col-span-2"><Label>Svrha *</Label><Input value={v.purpose || ""} onChange={e => setV({ ...v, purpose: e.target.value })} required /></div>
      <div className="space-y-1.5 col-span-2"><Label>Opis</Label><Textarea value={v.description || ""} onChange={e => setV({ ...v, description: e.target.value })} /></div>
      <DialogFooter className="col-span-2">
        <Button type="button" variant="outline" onClick={onClose}>Odustani</Button>
        <Button type="submit">Isplati</Button>
      </DialogFooter>
    </form>
  );
}

function JustifyForm({ payment, projectId, onClose }: { payment: CashPayment; projectId: string; onClose: () => void }) {
  const { user } = useAuth();
  const [v, setV] = useState<Partial<CashJustification>>({ amount: payment.amount, description: "", projectId });
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!v.amount) return;
    await db.cashJustifications.create({ ...v, cashPaymentId: payment.id, createdBy: user!.id } as any);
    const all = await db.cashJustifications.list();
    const sum = all.filter(j => j.cashPaymentId === payment.id).reduce((s, j) => s + j.amount, 0) + (v.amount || 0);
    const status = sum >= payment.amount ? "opravdano" : sum > 0 ? "djelimicno_opravdano" : "izdato";
    await db.cashPayments.update(payment.id, { status } as any);
    bumpData(); onClose();
  };
  return (
    <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div className="space-y-1.5 col-span-2"><Label>Iznos (KM) *</Label><Input type="number" step="0.01" value={v.amount ?? 0} onChange={e => setV({ ...v, amount: parseFloat(e.target.value) || 0 })} required /></div>
      <div className="space-y-1.5 col-span-2"><Label>Opis *</Label><Textarea value={v.description || ""} onChange={e => setV({ ...v, description: e.target.value })} required /></div>
      <div className="space-y-1.5 col-span-2"><Label>Račun</Label><FileField value={v.receiptFileId} folder={`projects/${projectId}/cash`} onChange={(id) => setV({ ...v, receiptFileId: id })} /></div>
      <DialogFooter className="col-span-2">
        <Button type="button" variant="outline" onClick={onClose}>Odustani</Button>
        <Button type="submit">Opravdaj</Button>
      </DialogFooter>
    </form>
  );
}
