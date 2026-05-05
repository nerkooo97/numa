import { useMemo, useState } from "react";
import { Plus, Receipt, Trash2 } from "lucide-react";
import { db } from "@/data";
import { useAsync, bumpData } from "@/data/store";
import type { CashPayment } from "@/data/types";
import { PageHeader, StatCard } from "@shared/components/ui-bits";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { StatusChip } from "@shared/components/StatusChip";
import { fmtDate, fmtKM } from "@shared/lib/format";
import { Banknote, Wallet, AlertTriangle } from "lucide-react";
import { PaymentForm } from "./components/PaymentForm";
import { JustifyForm } from "./components/JustifyForm";
import { recipientLabels } from "./lib/labels";
import { usePagination } from "@shared/hooks/usePagination";
import { PaginationBar } from "@shared/components/PaginationBar";

export default function CashPage() {
  const { data: payments = [] } = useAsync(() => db.cashPayments.list());
  const { data: justifications = [] } = useAsync(() => db.cashJustifications.list());
  const { data: projects = [] } = useAsync(() => db.projects.list());
  const [open, setOpen] = useState(false);
  const [justify, setJustify] = useState<CashPayment | null>(null);

  const justByPay = useMemo(() => {
    const m = new Map<string, number>();
    for (const j of justifications) m.set(j.cashPaymentId, (m.get(j.cashPaymentId) || 0) + j.amount);
    return m;
  }, [justifications]);

  const totalIssued = payments.reduce((s, p) => s + p.amount, 0);
  const totalJust = Array.from(justByPay.values()).reduce((s, v) => s + v, 0);
  const totalDebt = payments.reduce((s, p) => s + Math.max(0, p.amount - (justByPay.get(p.id) || 0)), 0);

  const perPerson = useMemo(() => {
    const map = new Map<string, { name: string; issued: number; justified: number; debt: number }>();
    for (const p of payments) {
      const key = p.recipientId || p.recipientName;
      const cur = map.get(key) || { name: p.recipientName, issued: 0, justified: 0, debt: 0 };
      const j = justByPay.get(p.id) || 0;
      cur.issued += p.amount;
      cur.justified += Math.min(j, p.amount);
      cur.debt += Math.max(0, p.amount - j);
      map.set(key, cur);
    }
    return Array.from(map.values()).sort((a, b) => b.debt - a.debt);
  }, [payments, justByPay]);

  const sorted = useMemo(() => [...payments].sort((a, b) => b.date.localeCompare(a.date)), [payments]);
  const paymentsPg = usePagination(sorted, 25);
  const perPersonPg = usePagination(perPerson, 25);

  return (
    <div className="space-y-5">
      <PageHeader title="Keš isplate" description="Isplate radnicima, poslovođama, vlasnicima i knjigovodstvu uz opravdanje računima."
        actions={<Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" /> Nova isplata</Button></DialogTrigger>
          <DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>Nova keš isplata</DialogTitle></DialogHeader><PaymentForm onClose={() => setOpen(false)} /></DialogContent>
        </Dialog>}
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard icon={Banknote} label="Ukupno izdato" value={fmtKM(totalIssued)} tone="primary" />
        <StatCard icon={Wallet} label="Opravdano" value={fmtKM(totalJust)} tone="success" />
        <StatCard icon={AlertTriangle} label="Dugovanje (neopravdano)" value={fmtKM(totalDebt)} tone={totalDebt > 0 ? "warning" : "success"} />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Po osobi</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Osoba</TableHead><TableHead className="text-right">Primljeno</TableHead><TableHead className="text-right">Opravdano</TableHead><TableHead className="text-right">Dugovanje</TableHead></TableRow></TableHeader>
            <TableBody>
              {perPerson.length === 0 ? <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">Nema isplata.</TableCell></TableRow>
                : perPersonPg.pageItems.map(p => (
                  <TableRow key={p.name}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell className="text-right">{fmtKM(p.issued)}</TableCell>
                    <TableCell className="text-right">{fmtKM(p.justified)}</TableCell>
                    <TableCell className={`text-right font-medium ${p.debt > 0 ? "text-warning-foreground" : ""}`}>{fmtKM(p.debt)}</TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
          <PaginationBar {...perPersonPg} total={perPerson.length} itemLabel="osoba" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Sve isplate</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow><TableHead>Datum</TableHead><TableHead>Primalac</TableHead><TableHead>Tip</TableHead><TableHead>Svrha</TableHead><TableHead>Projekat</TableHead><TableHead>Način</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Iznos</TableHead><TableHead></TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {sorted.length === 0 ? (
                <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">Nema isplata.</TableCell></TableRow>
              ) : paymentsPg.pageItems.map(p => {
                const j = justByPay.get(p.id) || 0;
                const debt = Math.max(0, p.amount - j);
                const pr = projects.find(x => x.id === p.projectId);
                return (
                  <TableRow key={p.id}>
                    <TableCell>{fmtDate(p.date)}</TableCell>
                    <TableCell className="font-medium">{p.recipientName}</TableCell>
                    <TableCell>{recipientLabels[p.recipientType]}</TableCell>
                    <TableCell className="max-w-[220px] truncate">{p.purpose}</TableCell>
                    <TableCell>{pr?.name || "—"}</TableCell>
                    <TableCell>{p.method === "kes" ? "Keš" : "Račun"}</TableCell>
                    <TableCell>
                      {debt === 0 ? <StatusChip tone="success">opravdano</StatusChip>
                        : j > 0 ? <StatusChip tone="warning">dug {fmtKM(debt)}</StatusChip>
                          : <StatusChip tone="danger">nije opravdano</StatusChip>}
                    </TableCell>
                    <TableCell className="text-right font-medium">{fmtKM(p.amount)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {debt > 0 && <Button size="sm" variant="outline" onClick={() => setJustify(p)}><Receipt className="h-4 w-4 mr-1" /> Opravdaj</Button>}
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={async () => {
                          if (!confirm("Obrisati isplatu?")) return;
                          await db.cashPayments.remove(p.id); bumpData();
                        }}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <PaginationBar {...paymentsPg} total={sorted.length} itemLabel="isplata" />
        </CardContent>
      </Card>

      <Dialog open={!!justify} onOpenChange={(o) => { if (!o) setJustify(null); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Opravdanje isplate</DialogTitle></DialogHeader>
          {justify && <JustifyForm payment={justify} onClose={() => setJustify(null)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
