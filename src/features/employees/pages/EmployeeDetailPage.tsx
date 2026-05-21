import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Pencil, Plus, Trash2 } from "lucide-react";
import { db } from "@/data";
import { useAsync, bumpData } from "@/data/store";
import type { DocKind, EmployeeDocument, PermitDocument } from "@/data/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusChip } from "@shared/components/StatusChip";
import { FileField, FileLink } from "@shared/components/FileField";
import { docStatus, fmtDate, fmtDateTime, daysUntil } from "@shared/lib/format";
import { uploadPaths } from "@shared/lib/uploadPaths";
import { getPermitDocumentWarnings, permitDocumentStatusLabels, permitDocumentStatusTones } from "@features/permits/lib/permitMeta";
import { toast } from "sonner";

const docKindLabels: Record<DocKind, string> = {
  ljekarski: "Ljekarski pregled",
  zastita_na_radu: "Zaštita na radu",
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
  const { data: permitDocuments = [] } = useAsync(() => db.permitDocuments.list(), [id]);
  const { data: permitDocumentEmployees = [] } = useAsync(() => db.permitDocumentEmployees.list(), [id]);
  const { data: permitDocumentTypes = [] } = useAsync(() => db.permitDocumentTypes.list(), [id]);
  const { data: permitCaseItemDocuments = [] } = useAsync(() => db.permitCaseItemDocuments.list(), [id]);
  const { data: permitCaseItems = [] } = useAsync(() => db.permitCaseItems.list(), [id]);
  const { data: permitCases = [] } = useAsync(() => db.permitCases.list(), [id]);
  const { data: allEmployees = [] } = useAsync(() => db.employees.list(), [id]);
  const docs = useMemo(() => allDocs.filter(d => d.employeeId === id), [allDocs, id]);
  const [open, setOpen] = useState(false);
  const [permitOpen, setPermitOpen] = useState(false);
  const [editingPermitDocument, setEditingPermitDocument] = useState<PermitDocument | null>(null);

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

  const linkedPermitDocuments = permitDocuments.filter((document) =>
    permitDocumentEmployees.some((entry) => entry.documentId === document.id && entry.employeeId === id),
  );

  const removePermitDocument = async (document: PermitDocument) => {
    const documentLinks = permitCaseItemDocuments.filter((entry) => entry.documentId === document.id);
    if (documentLinks.length > 0) {
      toast.error(`Dokument je već povezan na ${documentLinks.length} stavki predmeta i ne može se obrisati dok se te veze ne uklone.`);
      return;
    }
    if (!confirm(`Obrisati dokument za dozvole "${document.name}"?`)) return;
    const employeeLinks = permitDocumentEmployees.filter((entry) => entry.documentId === document.id);
    for (const link of employeeLinks) await db.permitDocumentEmployees.remove(link.id);
    await db.permitDocuments.remove(document.id);
    bumpData();
    toast.success("Dokument za dozvole je obrisan.");
  };

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
          <CardTitle className="text-base">Opšti dokumenti</CardTitle>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> Dokument</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Novi dokument</DialogTitle></DialogHeader>
              <DocForm employeeId={id} onClose={() => setOpen(false)} />
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>{renderTable(docs)}</CardContent>
      </Card>

      {emp.type === "strani" && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Dozvole i prilozi</CardTitle>
            <Dialog open={permitOpen} onOpenChange={setPermitOpen}>
              <DialogTrigger asChild><Button size="sm" onClick={() => setEditingPermitDocument(null)}><Plus className="h-4 w-4 mr-1" /> Dokument za dozvole</Button></DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader><DialogTitle>{editingPermitDocument ? "Uredi dokument za dozvole" : "Novi dokument za dozvole"}</DialogTitle></DialogHeader>
                <PermitDocumentForm
                  employeeId={id}
                  employees={allEmployees.filter((entry) => entry.type === "strani")}
                  documentTypes={permitDocumentTypes}
                  relatedDocuments={linkedPermitDocuments}
                  initial={editingPermitDocument}
                  onClose={() => setPermitOpen(false)}
                />
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            {linkedPermitDocuments.length === 0 ? (
              <div className="text-center text-muted-foreground py-6">Nema povezanih dokumenata za dozvole.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Naziv</TableHead>
                    <TableHead>Tip</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Pokriva radnike</TableHead>
                    <TableHead>Koristi se</TableHead>
                    <TableHead>Važenje</TableHead>
                    <TableHead>Zadnja izmjena</TableHead>
                    <TableHead>Fajl</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {linkedPermitDocuments.map((document) => {
                    const type = permitDocumentTypes.find((entry) => entry.id === document.documentTypeId);
                    const coveredEmployees = permitDocumentEmployees
                      .filter((entry) => entry.documentId === document.id)
                      .map((entry) => allEmployees.find((employee) => employee.id === entry.employeeId))
                      .filter(Boolean);
                    const documentLinks = permitCaseItemDocuments.filter((entry) => entry.documentId === document.id);
                    const caseIds = new Set(
                      documentLinks
                        .map((entry) => permitCaseItems.find((item) => item.id === entry.caseItemId))
                        .filter(Boolean)
                        .map((item: any) => item.caseId),
                    );
                    const replacement = document.replacesDocumentId
                      ? permitDocuments.find((entry) => entry.id === document.replacesDocumentId)
                      : undefined;
                    const { effectiveStatus, warnings } = getPermitDocumentWarnings(document);
                    return (
                      <TableRow key={document.id}>
                        <TableCell className="font-medium">
                          <div className="space-y-1">
                            <div>{document.name}</div>
                            {replacement && (
                              <div className="text-xs text-muted-foreground">
                                Zamjenjuje: {replacement.name}
                              </div>
                            )}
                            {warnings.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {warnings.map((warning) => (
                                  <StatusChip
                                    key={warning}
                                    tone={warning.includes("istekao") ? "danger" : warning.includes("ističe") ? "warning" : "muted"}
                                  >
                                    {warning}
                                  </StatusChip>
                                ))}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{type?.name || "—"}</TableCell>
                        <TableCell>
                          <StatusChip tone={permitDocumentStatusTones[effectiveStatus]}>
                            {permitDocumentStatusLabels[effectiveStatus]}
                          </StatusChip>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {coveredEmployees.map((entry: any) => `${entry.firstName} ${entry.lastName}`).join(", ")}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {documentLinks.length === 0 ? "nije povezano" : `${caseIds.size} predmeta / ${documentLinks.length} stavki`}
                        </TableCell>
                        <TableCell className="text-sm">
                          <div>Izdano: {fmtDate(document.issuedAt)}</div>
                          <div className="text-muted-foreground">
                            {document.expiresAt ? `Ističe: ${fmtDate(document.expiresAt)}` : "Bez roka trajanja"}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          <div>Dodano: {fmtDateTime(document.createdAt)}</div>
                          <div>Ažurirano: {fmtDateTime(document.updatedAt || document.createdAt)}</div>
                        </TableCell>
                        <TableCell><FileLink fileId={document.fileId} /></TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button variant="outline" size="sm" onClick={() => { setEditingPermitDocument(document); setPermitOpen(true); }}><Pencil className="h-3.5 w-3.5 mr-1" /> Uredi</Button>
                          <Button variant="ghost" size="sm" className="text-destructive" onClick={() => void removePermitDocument(document)}><Trash2 className="h-3.5 w-3.5 mr-1" /> Obriši</Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function PermitDocumentForm({
  employeeId,
  employees,
  documentTypes,
  relatedDocuments,
  initial,
  onClose,
}: {
  employeeId: string;
  employees: Array<{ id: string; firstName: string; lastName: string }>;
  documentTypes: Array<{ id: string; name: string; slug: string; description?: string }>;
  relatedDocuments: PermitDocument[];
  initial?: PermitDocument | null;
  onClose: () => void;
}) {
  const { data: permitDocumentEmployees = [] } = useAsync(() => db.permitDocumentEmployees.list(), [initial?.id]);
  const [documentTypeId, setDocumentTypeId] = useState(initial?.documentTypeId || documentTypes[0]?.id || "");
  const [name, setName] = useState(initial?.name || "");
  const [description, setDescription] = useState(initial?.description || "");
  const [issuedAt, setIssuedAt] = useState(initial?.issuedAt || "");
  const [expiresAt, setExpiresAt] = useState(initial?.expiresAt || "");
  const [hasExpiry, setHasExpiry] = useState(Boolean(initial?.expiresAt));
  const [fileId, setFileId] = useState<string | undefined>(initial?.fileId);
  const [status, setStatus] = useState<PermitDocument["status"]>(initial?.status || "aktivan");
  const [replacesDocumentId, setReplacesDocumentId] = useState(initial?.replacesDocumentId || "");
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>(initial ? [] : [employeeId]);

  useEffect(() => {
    setDocumentTypeId(initial?.documentTypeId || documentTypes[0]?.id || "");
    setName(initial?.name || "");
    setDescription(initial?.description || "");
    setIssuedAt(initial?.issuedAt || "");
    setExpiresAt(initial?.expiresAt || "");
    setHasExpiry(Boolean(initial?.expiresAt));
    setFileId(initial?.fileId);
    setStatus(initial?.status || "aktivan");
    setReplacesDocumentId(initial?.replacesDocumentId || "");
  }, [initial?.id]);

  useEffect(() => {
    if (initial) {
      const covered = permitDocumentEmployees
        .filter((entry) => entry.documentId === initial.id)
        .map((entry) => entry.employeeId);
      setSelectedEmployees(covered);
    } else {
      setSelectedEmployees([employeeId]);
    }
  }, [initial?.id, permitDocumentEmployees, employeeId]);

  useEffect(() => {
    if (!hasExpiry) setExpiresAt("");
  }, [hasExpiry]);

  const toggleEmployee = (targetId: string) => {
    setSelectedEmployees((current) => current.includes(targetId) ? current.filter((id) => id !== targetId) : [...current, targetId]);
  };

  const selectedType = documentTypes.find((entry) => entry.id === documentTypeId);
  const replacementOptions = relatedDocuments.filter((document) => document.id !== initial?.id);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!documentTypeId || !fileId || selectedEmployees.length === 0) {
      toast.error("Tip dokumenta, fajl i barem jedan radnik su obavezni.");
      return;
    }
    const payload = {
      documentTypeId,
      name: name.trim() || selectedType?.name || "Dokument",
      description: description.trim(),
      fileId,
      issuedAt,
      expiresAt: hasExpiry ? expiresAt : "",
      status,
      sourceKind: selectedEmployees.length > 1 ? "shared" : "employee",
      replacesDocumentId: replacesDocumentId || undefined,
      updatedAt: new Date().toISOString(),
    };
    let documentId = initial?.id;
    if (initial) {
      await db.permitDocuments.update(initial.id, payload as any);
      const existingLinks = permitDocumentEmployees.filter((entry) => entry.documentId === initial.id);
      for (const link of existingLinks) await db.permitDocumentEmployees.remove(link.id);
      toast.success("Dokument za dozvole je ažuriran.");
    } else {
      const created = await db.permitDocuments.create(payload as any);
      documentId = created.id;
      toast.success("Dokument za dozvole je dodan.");
    }
    if (replacesDocumentId) {
      await db.permitDocuments.update(replacesDocumentId, {
        status: "zamijenjen",
        updatedAt: new Date().toISOString(),
      } as any);
    }
    for (const linkedEmployeeId of selectedEmployees) {
      await db.permitDocumentEmployees.create({
        documentId,
        employeeId: linkedEmployeeId,
        role: linkedEmployeeId === employeeId ? "owner" : "covered",
      } as any);
    }
    bumpData();
    onClose();
  };

  return (
    <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div className="space-y-1.5 col-span-2">
        <Label>Tip dokumenta</Label>
        <Select value={documentTypeId} onValueChange={setDocumentTypeId}>
          <SelectTrigger><SelectValue placeholder="Odaberi tip dokumenta" /></SelectTrigger>
          <SelectContent>
            {documentTypes.map((documentType) => <SelectItem key={documentType.id} value={documentType.id}>{documentType.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5 col-span-2"><Label>Naziv</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder={selectedType?.name || "Naziv dokumenta"} /></div>
      <div className="space-y-1.5 col-span-2"><Label>Opis</Label><Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder={selectedType?.description || "Opcioni opis"} /></div>
      <div className="space-y-1.5"><Label>Datum izdavanja</Label><Input type="date" value={issuedAt} onChange={(e) => setIssuedAt(e.target.value)} /></div>
      <div className="space-y-2">
        <div className="flex items-center justify-between rounded-[6px] border px-3 py-2">
          <div>
            <Label className="text-sm">Ima rok trajanja</Label>
            <div className="text-xs text-muted-foreground">Isključi za dokumente bez isteka.</div>
          </div>
          <Checkbox checked={hasExpiry} onCheckedChange={(checked) => setHasExpiry(Boolean(checked))} />
        </div>
        <Input type="date" value={expiresAt} disabled={!hasExpiry} onChange={(e) => setExpiresAt(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label>Status</Label>
        <Select value={status} onValueChange={(value: PermitDocument["status"]) => setStatus(value)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="aktivan">Aktivan</SelectItem>
            <SelectItem value="zamijenjen">Zamijenjen</SelectItem>
            <SelectItem value="arhiviran">Arhiviran</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>Zamjenjuje raniji dokument</Label>
        <Select value={replacesDocumentId || "none"} onValueChange={(value) => setReplacesDocumentId(value === "none" ? "" : value)}>
          <SelectTrigger><SelectValue placeholder="Opcionalno" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Ne</SelectItem>
            {replacementOptions.map((document) => (
              <SelectItem key={document.id} value={document.id}>{document.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5 col-span-2"><Label>Fajl</Label><FileField value={fileId} folder={uploadPaths.permitDocument(selectedEmployees, selectedType?.slug || "dokument")} onChange={setFileId} /></div>
      <div className="space-y-1.5 col-span-2">
        <Label>Povezani radnici</Label>
        <div className="max-h-48 overflow-y-auto border rounded-[6px] divide-y">
          {employees.map((entry) => (
            <label key={entry.id} className="flex items-center justify-between px-3 py-2 text-sm cursor-pointer">
              <span>{entry.firstName} {entry.lastName}</span>
              <Checkbox checked={selectedEmployees.includes(entry.id)} onCheckedChange={() => toggleEmployee(entry.id)} />
            </label>
          ))}
        </div>
      </div>
      <DialogFooter className="col-span-2">
        <Button type="button" variant="outline" onClick={onClose}>Odustani</Button>
        <Button type="submit">{initial ? "Sačuvaj izmjene" : "Sačuvaj dokument"}</Button>
      </DialogFooter>
    </form>
  );
}
