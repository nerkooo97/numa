import { useMemo, useState } from "react";
import { Plus, Trash2, ArrowDownCircle, ArrowUpCircle, Wallet } from "lucide-react";
import { db } from "@/data";
import { useAsync, bumpData } from "@/data/store";
import { PageHeader, StatCard } from "@shared/components/ui-bits";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { StatusChip } from "@shared/components/StatusChip";
import { fmtDate, fmtKM } from "@shared/lib/format";
import { useAuth } from "@features/auth/AuthContext";
import { usePagination } from "@shared/hooks/usePagination";
import { PaginationBar } from "@shared/components/PaginationBar";

export default function Cashbox() {
  const { user } = useAuth();
  const { data: entries = [] } = useAsync(() => db.cashbox.list());
  const [open, setOpen] = useState(false);
  const today = new Date().toISOString().slice(0, 10);
  const [v, setV] = useState<{ date: string; type: "ulaz" | "izlaz"; amount: number; description: string }>({ date: today, type: "ulaz", amount: 0, description: "" });

  const sorted = useMemo(() => [...entries].sort((a, b) => b.date.localeCompare(a.date)), [entries]);
  const inSum = entries.filter(e => e.type === "ulaz").reduce((s, e) => s + e.amount, 0);
  const outSum = entries.filter(e => e.type === "izlaz").reduce((s, e) => s + e.amount, 0);
  const balance = inSum - outSum;
  const pg = usePagination(sorted, 25);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!v.amount || !v.description) return;
    await db.cashbox.create({ ...v, refType: "manual", createdBy: user!.id } as any);
    bumpData(); setOpen(false); setV({ date: today, type: "ulaz", amount: 0, description: "" });
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Kasa" description="Stanje gotovine, ulazi i izlazi."
        actions={<Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" /> Transakcija</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nova transakcija</DialogTitle></DialogHeader>
            <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Datum</Label><Input type="date" value={v.date} onChange={e => setV({ ...v, date: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Iznos (KM)</Label><Input type="number" step="0.01" value={v.amount} onChange={e => setV({ ...v, amount: parseFloat(e.target.value) || 0 })} required /></div>
              <div className="space-y-1.5 col-span-2">
                <Label>Tip</Label>
                <Select value={v.type} onValueChange={(x: any) => setV({ ...v, type: x })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="ulaz">Ulaz</SelectItem><SelectItem value="izlaz">Izlaz</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 col-span-2"><Label>Opis</Label><Input value={v.description} onChange={e => setV({ ...v, description: e.target.value })} required /></div>
              <DialogFooter className="col-span-2"><Button type="button" variant="outline" onClick={() => setOpen(false)}>Odustani</Button><Button type="submit">Sačuvaj</Button></DialogFooter>
            </form>
          </DialogContent>
        </Dialog>}
      />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard icon={Wallet} label="Stanje kase" value={fmtKM(balance)} tone={balance < 0 ? "danger" : "success"} />
        <StatCard icon={ArrowDownCircle} label="Ulazi" value={fmtKM(inSum)} tone="success" />
        <StatCard icon={ArrowUpCircle} label="Izlazi" value={fmtKM(outSum)} tone="warning" />
      </div>
      <Card>
        <Table>
          <TableHeader><TableRow><TableHead>Datum</TableHead><TableHead>Tip</TableHead><TableHead>Opis</TableHead><TableHead>Izvor</TableHead><TableHead className="text-right">Iznos</TableHead><TableHead></TableHead></TableRow></TableHeader>
          <TableBody>
            {sorted.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nema transakcija.</TableCell></TableRow>
              : pg.pageItems.map(e => (
                <TableRow key={e.id}>
                  <TableCell>{fmtDate(e.date)}</TableCell>
                  <TableCell><StatusChip tone={e.type === "ulaz" ? "success" : "warning"}>{e.type}</StatusChip></TableCell>
                  <TableCell>{e.description}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{e.refType === "cash_payment" ? "isplata" : "ručno"}</TableCell>
                  <TableCell className={`text-right font-medium ${e.type === "izlaz" ? "text-destructive" : "text-success"}`}>
                    {e.type === "izlaz" ? "−" : "+"}{fmtKM(e.amount)}
                  </TableCell>
                  <TableCell className="text-right">
                    {e.refType === "manual" && (
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={async () => { if (confirm("Obrisati?")) { await db.cashbox.remove(e.id); bumpData(); } }}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
        <PaginationBar {...pg} total={sorted.length} itemLabel="transakcija" />
      </Card>
    </div>
  );
}
