import { useEffect, useMemo, useState } from "react";
import { db } from "@/data";
import { bumpData, useAsync } from "@/data/store";
import type { Employee, PermitCase, PermitCaseItem, PermitCaseStatus, PermitCategory, PermitChecklistTemplate, PermitDocument, PermitItemStatus } from "@/data/types";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { FileField, FileLink } from "@shared/components/FileField";
import { StatusChip } from "@shared/components/StatusChip";
import { EmptyState } from "@shared/components/ui-bits";
import { fmtDate } from "@shared/lib/format";
import { uploadPaths } from "@shared/lib/uploadPaths";
import {
  caseStatusLabels,
  caseStatusTones,
  canMarkCaseReady,
  getPermitDocumentWarnings,
  itemStatusLabels,
  itemStatusTones,
  permitDocumentStatusLabels,
  permitDocumentStatusTones,
} from "../lib/permitMeta";
import { CheckCircle2, CircleDashed, FileCheck2 } from "lucide-react";
import { toast } from "sonner";

export function PermitCaseDetailView({
  permitCase,
  employees,
  categories,
  templates,
  items,
}: {
  permitCase: PermitCase;
  employees: Employee[];
  categories: PermitCategory[];
  templates: PermitChecklistTemplate[];
  items: PermitCaseItem[];
}) {
  const employee = employees.find((entry) => entry.id === permitCase.employeeId);
  const category = categories.find((entry) => entry.id === permitCase.categoryId);
  const template = templates.find((entry) => entry.id === permitCase.templateId);

  const { data: documents = [] } = useAsync(() => db.permitDocuments.list());
  const { data: docEmployees = [] } = useAsync(() => db.permitDocumentEmployees.list());
  const { data: itemDocuments = [] } = useAsync(() => db.permitCaseItemDocuments.list());

  const documentForItem = (itemId: string) => {
    const link = itemDocuments.find((entry) => entry.caseItemId === itemId);
    return link ? documents.find((entry) => entry.id === link.documentId) : undefined;
  };

  const requiredDone = items.filter((item) => item.required).every((item) => !!documentForItem(item.id));
  const completion = items.length === 0 ? 0 : items.filter((item) => !item.required || !!documentForItem(item.id)).length;
  const progress = items.length === 0 ? 0 : (completion / items.length) * 100;
  const requiredTotal = items.filter((item) => item.required).length;
  const requiredUploaded = items.filter((item) => item.required && documentForItem(item.id)).length;

  const updateCaseStatus = async (nextStatus: PermitCaseStatus) => {
    if (nextStatus === "spremno") {
      const reason = canMarkCaseReady(requiredDone);
      if (reason) {
        toast.error(reason);
        return;
      }
    }
    await db.permitCases.update(permitCase.id, { status: nextStatus });
    bumpData();
  };

  const updateCaseNotes = async (notes: string) => {
    await db.permitCases.update(permitCase.id, { notes });
    bumpData();
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <MetaBox label="Radnik" value={employee ? `${employee.firstName} ${employee.lastName}` : "—"} />
        <MetaBox label="Kategorija" value={category?.name || "—"} />
        <MetaBox label="Checklista" value={template?.name || "—"} />
        <MetaBox label="Kompletiranost" value={`${completion}/${items.length}`} />
        <div className="border rounded-[6px] px-3 py-2">
          <div className="text-xs text-muted-foreground">Status</div>
          <div className="mt-1"><StatusChip tone={caseStatusTones[permitCase.status]}>{caseStatusLabels[permitCase.status]}</StatusChip></div>
        </div>
      </div>

      <div className="border rounded-[6px] p-4 space-y-2">
        <div className="flex items-center justify-between gap-3 text-sm">
          <div className="font-medium">Napredak predmeta</div>
          <div className="text-muted-foreground">{requiredUploaded}/{requiredTotal} obaveznih priloga</div>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      <div className="grid gap-3 lg:grid-cols-[240px_minmax(0,1fr)]">
        <div className="space-y-1.5">
          <Label>Status predmeta</Label>
          <Select value={permitCase.status} onValueChange={(value: PermitCaseStatus) => void updateCaseStatus(value)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(caseStatusLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
            </SelectContent>
          </Select>
          {!requiredDone && <p className="text-xs text-muted-foreground">`spremno` je dostupno tek nakon svih obaveznih priloga.</p>}
        </div>
        <CaseNotesField value={permitCase.notes || ""} onSave={updateCaseNotes} />
      </div>

      {items.length === 0 ? (
        <EmptyState title="Predmet nema stavki" description="Dodijeljena checklista nije imala definisane stavke." />
      ) : (
        <Accordion type="multiple" className="space-y-3">
          {items.map((item) => (
            <PermitCaseItemRow
              key={item.id}
              item={item}
              employeeId={permitCase.employeeId}
              linkedDocument={documentForItem(item.id)}
              availableDocuments={documents.filter((document) =>
                document.documentTypeId === item.documentTypeId &&
                docEmployees.some((entry) => entry.documentId === document.id && entry.employeeId === permitCase.employeeId),
              )}
            />
          ))}
        </Accordion>
      )}
    </div>
  );
}

function PermitCaseItemRow({
  item,
  employeeId,
  linkedDocument,
  availableDocuments,
}: {
  item: PermitCaseItem;
  employeeId: string;
  linkedDocument?: Pick<PermitDocument, "id" | "name" | "fileId" | "expiresAt" | "status" | "replacesDocumentId">;
  availableDocuments: Array<Pick<PermitDocument, "id" | "name" | "fileId" | "expiresAt" | "status" | "replacesDocumentId">>;
}) {
  const [notes, setNotes] = useState(item.notes || "");
  const [documentId, setDocumentId] = useState(linkedDocument?.id || "");

  useEffect(() => {
    setNotes(item.notes || "");
    setDocumentId(linkedDocument?.id || "");
  }, [item.notes, linkedDocument?.id]);

  // Auto-link unlinked checklist items if an available document is found for the employee
  useEffect(() => {
    if (availableDocuments.length > 0 && !linkedDocument) {
      const bestDoc = availableDocuments[0];
      const autoLink = async () => {
        const existing = (await db.permitCaseItemDocuments.list()).find((entry) => entry.caseItemId === item.id);
        if (!existing) {
          await db.permitCaseItemDocuments.create({
            caseItemId: item.id,
            documentId: bestDoc.id,
          } as any);
          await db.permitCaseItems.update(item.id, { status: "dostavljeno" });
          bumpData();
        }
      };
      void autoLink();
    }
  }, [availableDocuments, linkedDocument, item.id]);

  const setLinkedDocument = async (nextDocumentId: string) => {
    const existing = (await db.permitCaseItemDocuments.list()).find((entry) => entry.caseItemId === item.id);
    if (existing) await db.permitCaseItemDocuments.remove(existing.id);
    if (nextDocumentId) {
      await db.permitCaseItemDocuments.create({ caseItemId: item.id, documentId: nextDocumentId } as any);
      await db.permitCaseItems.update(item.id, { status: "dostavljeno" });
    } else {
      await db.permitCaseItems.update(item.id, { status: "nedostaje", reviewedAt: undefined });
    }
    bumpData();
  };

  const handleQuickUpload = async (newFileId: string) => {
    try {
      const createdDoc = await db.permitDocuments.create({
        documentTypeId: item.documentTypeId,
        name: item.label,
        description: `Učitano direktno iz predmeta preko checkliste`,
        fileId: newFileId,
        issuedAt: "",
        expiresAt: "",
        status: "aktivan",
        sourceKind: "employee",
        updatedAt: new Date().toISOString(),
      } as any);

      await db.permitDocumentEmployees.create({
        documentId: createdDoc.id,
        employeeId: employeeId,
        role: "owner",
      } as any);

      await db.permitCaseItemDocuments.create({
        caseItemId: item.id,
        documentId: createdDoc.id,
      } as any);

      await db.permitCaseItems.update(item.id, {
        status: "dostavljeno",
      });

      toast.success("Dokument je uspješno učitan, kreiran za radnika i povezan sa stavkom.");
      bumpData();
    } catch (err) {
      toast.error("Greška pri kreiranju dokumenta.");
    }
  };

  const setStatus = async (status: PermitItemStatus) => {
    if ((status === "pregledano" || status === "odbijeno") && !linkedDocument) {
      toast.error("Stavka mora imati povezan dokument prije pregleda ili odbijanja.");
      return;
    }
    await db.permitCaseItems.update(item.id, {
      status,
      reviewedAt: status === "pregledano" ? new Date().toISOString() : item.reviewedAt,
    });
    bumpData();
  };

  const saveNotes = async () => {
    await db.permitCaseItems.update(item.id, { notes: notes.trim() });
    bumpData();
    toast.success("Napomena je sačuvana.");
  };

  const linkedDocumentState = linkedDocument ? getPermitDocumentWarnings(linkedDocument) : null;

  return (
    <AccordionItem value={item.id} className="border rounded-[6px] px-4">
      <AccordionTrigger className="py-3 hover:no-underline">
        <div className="flex min-w-0 flex-1 items-center gap-3 pr-3 text-left">
          <div className="shrink-0">
            {linkedDocument ? (
              <FileCheck2 className="h-4 w-4 text-primary" />
            ) : item.required ? (
              <CircleDashed className="h-4 w-4 text-warning" />
            ) : (
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="font-medium">{item.label}</div>
              <StatusChip tone={itemStatusTones[item.status]}>{itemStatusLabels[item.status]}</StatusChip>
              {item.required && <StatusChip tone="warning">obavezno</StatusChip>}
            </div>
            <div className="mt-1 text-sm text-muted-foreground truncate">
              {linkedDocument ? `Povezan dokument: ${linkedDocument.name}` : "Dokument nije povezan"}{item.reviewedAt ? ` · pregledano ${fmtDate(item.reviewedAt)}` : ""}
            </div>
            {linkedDocumentState && linkedDocumentState.warnings.some((warning) => warning.includes("istekao") || warning.includes("ističe")) && (
              <div className="mt-1 flex flex-wrap gap-1">
                {linkedDocumentState.warnings
                  .filter((warning) => warning.includes("istekao") || warning.includes("ističe"))
                  .map((warning) => (
                    <StatusChip key={warning} tone={warning.includes("istekao") ? "danger" : "warning"}>
                      {warning}
                    </StatusChip>
                  ))}
              </div>
            )}
          </div>
        </div>
      </AccordionTrigger>
      <AccordionContent className="pt-1 pb-4">
        <div className="space-y-4">
          <div className="text-sm text-muted-foreground">{item.description || "Bez dodatnog opisa."}</div>
          <div className="grid gap-3 xl:grid-cols-[260px_minmax(0,1fr)]">
            <div className="space-y-2">
              <div className="space-y-1.5">
                <Label>Status stavke</Label>
                <Select value={item.status} onValueChange={(value: PermitItemStatus) => void setStatus(value)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(itemStatusLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Dokument radnika</Label>
                <Select value={documentId || "none"} onValueChange={(value) => { setDocumentId(value === "none" ? "" : value); void setLinkedDocument(value === "none" ? "" : value); }}>
                  <SelectTrigger><SelectValue placeholder="Odaberi dokument" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Bez dokumenta</SelectItem>
                    {availableDocuments.map((document) => <SelectItem key={document.id} value={document.id}>{document.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                {linkedDocument && (
                  <div className="text-xs text-muted-foreground space-y-2">
                    <FileLink fileId={linkedDocument.fileId} />
                    <div className="flex flex-wrap gap-1">
                      <StatusChip tone={permitDocumentStatusTones[linkedDocumentState!.effectiveStatus]}>
                        {permitDocumentStatusLabels[linkedDocumentState!.effectiveStatus]}
                      </StatusChip>
                      {linkedDocument.expiresAt ? (
                        <StatusChip tone={linkedDocumentState!.effectiveStatus === "istekao" ? "danger" : "muted"}>
                          Istek: {fmtDate(linkedDocument.expiresAt)}
                        </StatusChip>
                      ) : (
                        <StatusChip tone="muted">Bez roka trajanja</StatusChip>
                      )}
                    </div>
                    {linkedDocumentState!.warnings.length > 0 && (
                      <div className="space-y-1">
                        {linkedDocumentState!.warnings.map((warning) => (
                          <div key={warning} className={warning.includes("istekao") ? "text-destructive" : ""}>
                            {warning}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                {!linkedDocument && availableDocuments.length === 0 && (
                  <div className="text-xs text-muted-foreground">Za ovog radnika nema dostupnih dokumenata ovog tipa unesenih ranije.</div>
                )}
                {!linkedDocument && (
                  <div className="mt-3 border border-dashed rounded-[6px] p-3 space-y-2 bg-muted/40">
                    <div className="text-xs font-medium text-foreground">
                      Brzo dodavanje i povezivanje dokumenta:
                    </div>
                    <FileField
                      value={undefined}
                      folder={uploadPaths.permitDocument([employeeId], item.label.toLowerCase().replace(/\s+/g, "_"))}
                      onChange={(newFileId) => {
                        if (newFileId) {
                          void handleQuickUpload(newFileId);
                        }
                      }}
                    />
                    <div className="text-[11px] text-muted-foreground leading-tight">
                      Učitavanjem fajla ovde, dokument se automatski kreira za radnika i povezuje sa ovom stavkom checkliste.
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Napomena uz stavku</Label>
              <div className="flex flex-col gap-2">
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} className="min-h-[110px]" />
                <div>
                  <Button type="button" variant="outline" onClick={saveNotes}>Sačuvaj napomenu</Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}

function CaseNotesField({ value, onSave }: { value: string; onSave: (notes: string) => Promise<void> }) {
  const [notes, setNotes] = useState(value);
  useEffect(() => setNotes(value), [value]);
  return (
    <div className="space-y-1.5">
      <Label>Napomena predmeta</Label>
      <div className="flex flex-col gap-2 md:flex-row">
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="min-h-[88px]" />
        <Button type="button" variant="outline" onClick={() => void onSave(notes)} className="md:self-start">Sačuvaj</Button>
      </div>
    </div>
  );
}

function MetaBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="border rounded-[6px] px-3 py-2">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-medium mt-1">{value}</div>
    </div>
  );
}
