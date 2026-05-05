import { useMemo, useState } from "react";
import { FileDown, Globe2, ListChecks } from "lucide-react";
import { db } from "@/data";
import { useAsync, bumpData } from "@/data/store";
import { PageHeader } from "@shared/components/ui-bits";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { genWorkPermitBundle, genResidenceBundle } from "@shared/lib/pdfTemplates";
import { VISA_CHECKLISTS } from "@shared/lib/visaChecklist";
import type { Employee, VisaAttachment, VisaKind } from "@/data/types";
import { FileField } from "@shared/components/FileField";
import { StatusChip } from "@shared/components/StatusChip";
import { toast } from "sonner";

function ChecklistPanel({ employee, kind }: { employee: Employee; kind: VisaKind }) {
  const { data: attachments = [] } = useAsync(() => db.visaAttachments.list());
  const items = VISA_CHECKLISTS[kind];
  const mine = useMemo(
    () => attachments.filter(a => a.employeeId === employee.id && a.visaKind === kind),
    [attachments, employee.id, kind],
  );
  const bySlug = (slug: string) => mine.find(a => a.slug === slug);

  const setFile = async (slug: string, label: string, fileId?: string) => {
    const existing = bySlug(slug);
    if (existing) {
      if (fileId) await db.visaAttachments.update(existing.id, { fileId });
      else await db.visaAttachments.remove(existing.id);
    } else if (fileId) {
      await db.visaAttachments.create({ employeeId: employee.id, visaKind: kind, slug, label, fileId } as any);
    }
    bumpData();
  };

  const done = mine.filter(a => a.fileId).length;
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Priloženo: {done} / {items.length}</span>
        <StatusChip tone={done === items.length ? "success" : done > 0 ? "warning" : "muted"}>
          {done === items.length ? "kompletno" : done > 0 ? "djelimično" : "nema"}
        </StatusChip>
      </div>
      <div className="space-y-2">
        {items.map(item => {
          const att = bySlug(item.slug);
          return (
            <div key={item.slug} className="flex items-center justify-between gap-3 border rounded-md px-3 py-2">
              <div className="text-sm font-medium min-w-[180px]">{item.label}</div>
              <FileField
                value={att?.fileId}
                folder={`employees/${employee.id}/visas/${kind}/${item.slug}`}
                onChange={(id) => setFile(item.slug, item.label, id)}
                label="Upload"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ChecklistDialog({ employee }: { employee: Employee }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost"><ListChecks className="h-4 w-4 mr-1" /> Prilozi</Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{employee.firstName} {employee.lastName} — prilozi</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="rad">
          <TabsList>
            <TabsTrigger value="rad">Radna dozvola</TabsTrigger>
            <TabsTrigger value="boravak">Boravak</TabsTrigger>
          </TabsList>
          <TabsContent value="rad" className="pt-3"><ChecklistPanel employee={employee} kind="rad" /></TabsContent>
          <TabsContent value="boravak" className="pt-3"><ChecklistPanel employee={employee} kind="boravak" /></TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

export default function Visas() {
  const { data: employees = [] } = useAsync(() => db.employees.list());
  const { data: attachments = [] } = useAsync(() => db.visaAttachments.list());
  const foreign = useMemo(() => employees.filter(e => e.type === "strani"), [employees]);
  const [q, setQ] = useState("");
  const filtered = foreign.filter(e => !q || `${e.firstName} ${e.lastName} ${e.identifier}`.toLowerCase().includes(q.toLowerCase()));

  const counts = (empId: string, kind: VisaKind) => {
    const total = VISA_CHECKLISTS[kind].length;
    const done = attachments.filter(a => a.employeeId === empId && a.visaKind === kind && a.fileId).length;
    return `${done}/${total}`;
  };

  const gen = async (kind: "rad" | "boravak", id: string) => {
    const emp = await db.employees.get(id);
    if (!emp) return;
    try {
      if (kind === "rad") await genWorkPermitBundle(emp);
      else await genResidenceBundle(emp);
      toast.success("PDF generisan.");
    } catch (e: any) { toast.error(e.message || "Greška."); }
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Viziranje stranih radnika" description="Checklist priloga i automatsko generisanje dokumentacije za radnu i boravišnu dozvolu." />
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Globe2 className="h-4 w-4" /> Strani radnici</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input placeholder="Pretraga..." value={q} onChange={e => setQ(e.target.value)} className="max-w-sm" />
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ime i prezime</TableHead>
                <TableHead>Pasoš</TableHead>
                <TableHead>Državljanstvo</TableHead>
                <TableHead>Radna (prilozi)</TableHead>
                <TableHead>Boravak (prilozi)</TableHead>
                <TableHead className="text-right">Akcije</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nema stranih radnika. Dodajte ih u modulu Zaposleni.</TableCell></TableRow>
              ) : filtered.map(e => (
                <TableRow key={e.id}>
                  <TableCell className="font-medium">{e.firstName} {e.lastName}</TableCell>
                  <TableCell className="font-mono text-xs">{e.identifier || "—"}</TableCell>
                  <TableCell>{e.citizenship}</TableCell>
                  <TableCell className="tnum">{counts(e.id, "rad")}</TableCell>
                  <TableCell className="tnum">{counts(e.id, "boravak")}</TableCell>
                  <TableCell className="text-right space-x-1">
                    <ChecklistDialog employee={e} />
                    <Button size="sm" variant="outline" onClick={() => gen("rad", e.id)}><FileDown className="h-4 w-4 mr-1" /> Radna</Button>
                    <Button size="sm" variant="outline" onClick={() => gen("boravak", e.id)}><FileDown className="h-4 w-4 mr-1" /> Boravak</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
