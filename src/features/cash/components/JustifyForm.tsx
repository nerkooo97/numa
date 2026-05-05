import { useState } from "react";
import { db } from "@/data";
import { useAsync, bumpData } from "@/data/store";
import type { CashJustification, CashPayment } from "@/data/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DialogFooter } from "@/components/ui/dialog";
import { FileField } from "@shared/components/FileField";
import { useAuth } from "@features/auth/AuthContext";
import { statusFor } from "../lib/labels";

export function JustifyForm({ payment, onClose }: { payment: CashPayment; onClose: () => void }) {
  const { user } = useAuth();
  const { data: projects = [] } = useAsync(() => db.projects.list());
  const today = new Date().toISOString().slice(0, 10);
  const [v, setV] = useState<Partial<CashJustification>>({ amount: payment.amount, description: "", projectId: payment.projectId });
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!v.amount) return;
    await db.cashJustifications.create({ ...v, cashPaymentId: payment.id, createdBy: user!.id } as any);
    const all = await db.cashJustifications.list();
    const sum = all.filter(j => j.cashPaymentId === payment.id).reduce((s, j) => s + j.amount, 0) + (v.amount || 0);
    await db.cashPayments.update(payment.id, { status: statusFor(payment, sum) } as any);
    bumpData(); onClose();
  };
  return (
    <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div className="space-y-1.5"><Label>Datum</Label><Input type="date" defaultValue={today} disabled /></div>
      <div className="space-y-1.5"><Label>Iznos (KM) *</Label><Input type="number" step="0.01" value={v.amount ?? 0} onChange={e => setV({ ...v, amount: parseFloat(e.target.value) || 0 })} required /></div>
      <div className="space-y-1.5 col-span-2">
        <Label>Projekat</Label>
        <Select value={v.projectId} onValueChange={(x) => setV({ ...v, projectId: x })}>
          <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
          <SelectContent>{projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5 col-span-2"><Label>Opis *</Label><Textarea value={v.description || ""} onChange={e => setV({ ...v, description: e.target.value })} required /></div>
      <div className="space-y-1.5 col-span-2"><Label>Račun</Label><FileField value={v.receiptFileId} folder={`cash/justifications/${payment.id}`} onChange={(id) => setV({ ...v, receiptFileId: id })} /></div>
      <DialogFooter className="col-span-2">
        <Button type="button" variant="outline" onClick={onClose}>Odustani</Button>
        <Button type="submit">Opravdaj</Button>
      </DialogFooter>
    </form>
  );
}
