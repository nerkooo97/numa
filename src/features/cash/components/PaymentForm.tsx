import { useMemo, useState } from "react";
import { db } from "@/data";
import { useAsync, bumpData } from "@/data/store";
import type { CashPayment, CashRecipientType } from "@/data/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DialogFooter } from "@/components/ui/dialog";
import { useAuth } from "@features/auth/AuthContext";
import { logAction } from "@/data/audit";
import { toast } from "sonner";
import { recipientLabels } from "../lib/labels";

export function PaymentForm({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
  const { data: employees = [] } = useAsync(() => db.employees.list());
  const { data: users = [] } = useAsync(() => db.users.list());
  const { data: projects = [] } = useAsync(() => db.projects.list());
  const today = new Date().toISOString().slice(0, 10);
  const [v, setV] = useState<Partial<CashPayment>>({ date: today, recipientType: "radnik", method: "kes", amount: 0, purpose: "" });

  const recipients = useMemo(() => {
    if (v.recipientType === "radnik") return employees.map(e => ({ id: e.id, name: `${e.firstName} ${e.lastName}` }));
    if (v.recipientType === "poslovodja") return users.filter(u => u.role === "poslovodja").map(u => ({ id: u.id, name: u.name }));
    if (v.recipientType === "vlasnik") return users.filter(u => u.role === "admin").map(u => ({ id: u.id, name: u.name }));
    return [];
  }, [v.recipientType, employees, users]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!v.amount || !v.purpose || !v.recipientName) { toast.error("Iznos, primalac i svrha su obavezni."); return; }
    const created = await db.cashPayments.create({ ...v, status: "izdato", createdBy: user!.id } as any);
    await db.cashbox.create({
      date: v.date!, type: "izlaz", amount: v.amount!, description: `Isplata: ${v.recipientName} — ${v.purpose}`,
      refType: "cash_payment", refId: created.id, createdBy: user!.id,
    } as any);
    await logAction(user, "create", "cash_payment", created.id, `${v.recipientName}: ${v.amount} KM`);
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
          <SelectContent>{Object.entries(recipientLabels).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent>
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
      <div className="space-y-1.5">
        <Label>Način</Label>
        <Select value={v.method} onValueChange={(x: any) => setV({ ...v, method: x })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="kes">Keš</SelectItem><SelectItem value="racun">Račun</SelectItem></SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>Projekat</Label>
        <Select value={v.projectId} onValueChange={(x) => setV({ ...v, projectId: x })}>
          <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
          <SelectContent>{projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
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
