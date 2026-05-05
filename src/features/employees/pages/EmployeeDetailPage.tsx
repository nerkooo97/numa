import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { db } from "@/data";
import { useAsync, bumpData } from "@/data/store";
import type { DocKind, EmployeeDocument } from "@/data/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusChip } from "@shared/components/StatusChip";
import { FileField, FileLink } from "@shared/components/FileField";
import { docStatus, fmtDate, daysUntil } from "@shared/lib/format";
import { toast } from "sonner";

const docKindLabels: Record<DocKind, string> = {
  ljekarski: "Ljekarski pregled",
  zastita_na_radu: "Zaštita na radu",
  radna_dozvola: "Radna dozvola",
  boravisna_dozvola: "Boravišna dozvola",
  pasos: "Pasoš",
  ugovor: "Ugovor",
  ostalo: "Ostalo",
};

function DocForm({ employeeId, initial, onClose }: { employeeId: string; initial?: EmployeeDocument; onClose: () => void }) {
  const [v, setV] = useState<Partial<EmployeeDocument>>(initial || { kind: "ljekarski", name: "", employeeId });
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!v.name) { toast.error("Naziv je obavezan."); return; }
    if (initial) await db.employeeDocuments.update(initial.id, v as any);
    else await db.employeeDocuments.create({ ...v, employeeId } as any);
    bumpData();
    onClose();
  };
  return (
    <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div className="space-y-1.5 col-span-2">
        <Label>Tip dokumenta</Label>
        <Select value={v.kind} onValueChange={(x: DocKind) => setV({ ...v, kind: x, name: v.name || docKindLabels[x] })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {Object.entries(docKindLabels).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5 col-span-2"><Label>Naziv *</Label><Input value={v.name || ""} onChange={e => setV({ ...v, name: e.target.value })} required /></div>
      <div className="space-y-1.5"><Label>Datum izdavanja</Label><Input type="date" value={v.issuedAt || ""} onChange={e => setV({ ...v, issuedAt: e.target.value })} /></div>
      <div className="space-y-1.5"><Label>Datum isteka</Label><Input type="date" value={v.expiresAt || ""} onChange={e => setV({ ...v, expiresAt: e.target.value })} /></div>
      <div className="space-y-1.5 col-span-2"><Label>Fajl</Label><FileField value={v.fileId} folder={`employees/${employeeId}/documents/${v.kind || "ostalo"}`} onChange={(id) => setV({ ...v, fileId: id })} /></div>
      <DialogFooter className="col-span-2">
        <Button type="button" variant="outline" onClick={onClose}>Odustani</Button>
        <Button type="submit">Sačuvaj</Button>
      </DialogFooter>
    </form>
  );
}

export default function EmployeeDetail() {
  const { id = "" } = useParams();
  const nav = useNavigate();
  const { data: emp } = useAsync(() => db.employees.get(id), [id]);
  const { data: allDocs = [] } = useAsync(() => db.employeeDocuments.list(), [id]);
  const docs = useMemo(() => allDocs.filter(d => d.employeeId === id), [allDocs, id]);
  const [open, setOpen] = useState(false);

  if (!emp) return <div className="text-muted-foreground">Učitavanje...</div>;

  const remove = async (d: EmployeeDocument) => {
    if (!confirm(`Obrisati dokument "${d.name}"?`)) return;
    await db.employeeDocuments.remove(d.id);
    bumpData();
  };

  const renderTable = (rows: EmployeeDocument[]) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Naziv</TableHead>
          <TableHead>Tip</TableHead>
          <TableHead>Izdavanje</TableHead>
          <TableHead>Istek</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Fajl</TableHead>
          <TableHead></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.length === 0 ? (
          <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-6">Nema dokumenata.</TableCell></TableRow>
        ) : rows.map(d => {
          const s = docStatus(d.expiresAt);
          const days = daysUntil(d.expiresAt);
          return (
            <TableRow key={d.id}>
              <TableCell className="font-medium">{d.name}</TableCell>
              <TableCell>{docKindLabels[d.kind]}</TableCell>
              <TableCell>{fmtDate(d.issuedAt)}</TableCell>
              <TableCell>{fmtDate(d.expiresAt)}</TableCell>
              <TableCell>
                {s === "valid" && <StatusChip tone="success">važeći</StatusChip>}
                {s === "expiring" && <StatusChip tone="warning">ističe za {days}d</StatusChip>}
                {s === "expired" && <StatusChip tone="danger">istekao</StatusChip>}
                {s === "none" && <StatusChip tone="muted">bez roka</StatusChip>}
              </TableCell>
              <TableCell><FileLink fileId={d.fileId} /></TableCell>
              <TableCell className="text-right">
                <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => remove(d)}><Trash2 className="h-4 w-4" /></Button>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );

  const standardDocs = docs.filter(d => !["radna_dozvola", "boravisna_dozvola"].includes(d.kind));
  const permitDocs = docs.filter(d => ["radna_dozvola", "boravisna_dozvola"].includes(d.kind));

  return (
    <div className="space-y-5">
      <Button variant="ghost" size="sm" onClick={() => nav(-1)}><ArrowLeft className="h-4 w-4 mr-1" /> Nazad</Button>

      <Card>
        <CardHeader><CardTitle>{emp.firstName} {emp.lastName}</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div><div className="text-xs text-muted-foreground">Tip</div><div>{emp.type === "strani" ? "Strani" : "Domaći"}</div></div>
          <div><div className="text-xs text-muted-foreground">Identifikator</div><div className="font-mono">{emp.identifier || "—"}</div></div>
          <div><div className="text-xs text-muted-foreground">Državljanstvo</div><div>{emp.citizenship}</div></div>
          <div><div className="text-xs text-muted-foreground">Rođen/a</div><div>{fmtDate(emp.birthDate)}</div></div>
          <div><div className="text-xs text-muted-foreground">Kontakt</div><div>{emp.contact || "—"}</div></div>
          <div><div className="text-xs text-muted-foreground">Satnica</div><div>{emp.hourlyRate?.toFixed(2)} KM/h</div></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Dokumenti</CardTitle>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> Dokument</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Novi dokument</DialogTitle></DialogHeader>
              <DocForm employeeId={id} onClose={() => setOpen(false)} />
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>{renderTable(standardDocs)}</CardContent>
      </Card>

      {emp.type === "strani" && (
        <Card>
          <CardHeader><CardTitle className="text-base">Dozvole (radna i boravišna)</CardTitle></CardHeader>
          <CardContent>{renderTable(permitDocs)}</CardContent>
        </Card>
      )}
    </div>
  );
}
