import type { PermitCaseStatus, PermitDocument, PermitDocumentStatus, PermitItemStatus } from "@/data/types";
import { docStatus, daysUntil } from "@shared/lib/format";

export const caseStatusLabels: Record<PermitCaseStatus, string> = {
  u_pripremi: "u pripremi",
  spremno: "spremno",
  predano: "predano",
  odobreno: "odobreno",
  odbijeno: "odbijeno",
};

export const caseStatusTones: Record<PermitCaseStatus, "muted" | "warning" | "info" | "success" | "danger"> = {
  u_pripremi: "muted",
  spremno: "warning",
  predano: "info",
  odobreno: "success",
  odbijeno: "danger",
};

export const itemStatusLabels: Record<PermitItemStatus, string> = {
  nedostaje: "nedostaje",
  dostavljeno: "dostavljeno",
  pregledano: "pregledano",
  odbijeno: "odbijeno",
};

export const itemStatusTones: Record<PermitItemStatus, "muted" | "warning" | "info" | "success" | "danger"> = {
  nedostaje: "muted",
  dostavljeno: "info",
  pregledano: "success",
  odbijeno: "danger",
};

export const permitDocumentStatusLabels: Record<PermitDocumentStatus, string> = {
  aktivan: "aktivan",
  istekao: "istekao",
  zamijenjen: "zamijenjen",
  arhiviran: "arhiviran",
};

export const permitDocumentStatusTones: Record<PermitDocumentStatus, "muted" | "warning" | "info" | "success" | "danger"> = {
  aktivan: "success",
  istekao: "danger",
  zamijenjen: "info",
  arhiviran: "muted",
};

export const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

export function canCreateTemplate(categoryCount: number, documentTypeCount: number) {
  if (categoryCount === 0) return "Prvo dodaj barem jednu kategoriju dozvole.";
  if (documentTypeCount === 0) return "Prvo dodaj barem jedan tip dokumenta.";
  return null;
}

export function canCreateCase(params: {
  foreignEmployeeCount: number;
  categoryCount: number;
  templateCount: number;
  activeTemplateWithItemsCount: number;
}) {
  if (params.foreignEmployeeCount === 0) return "Nema stranih radnika u evidenciji.";
  if (params.categoryCount === 0) return "Prvo dodaj kategoriju dozvole.";
  if (params.templateCount === 0) return "Prvo kreiraj checklistu.";
  if (params.activeTemplateWithItemsCount === 0) return "Checklista mora imati barem jednu stavku prije kreiranja predmeta.";
  return null;
}

export function canMarkCaseReady(requiredDone: boolean) {
  return requiredDone ? null : "Predmet može biti spreman tek kad svi obavezni prilozi budu dodani.";
}

export function getEffectivePermitDocumentStatus(document: Pick<PermitDocument, "status" | "expiresAt">): PermitDocumentStatus {
  if (document.status === "zamijenjen" || document.status === "arhiviran") return document.status;
  return docStatus(document.expiresAt) === "expired" ? "istekao" : "aktivan";
}

export function getPermitDocumentWarnings(document: Pick<PermitDocument, "status" | "expiresAt" | "replacesDocumentId">) {
  const effectiveStatus = getEffectivePermitDocumentStatus(document);
  const expiryState = docStatus(document.expiresAt);
  const days = daysUntil(document.expiresAt);
  const warnings: string[] = [];

  if (effectiveStatus === "istekao") warnings.push("Dokument je istekao.");
  else if (expiryState === "expiring" && days !== null) warnings.push(`Dokument ističe za ${days} dana.`);

  if (effectiveStatus === "zamijenjen") warnings.push("Dokument je zamijenjen novijim unosom.");
  if (effectiveStatus === "arhiviran") warnings.push("Dokument je arhiviran i više nije za aktivnu upotrebu.");
  if (!document.expiresAt) warnings.push("Dokument nema rok trajanja.");
  if (document.replacesDocumentId) warnings.push("Ovaj unos zamjenjuje raniji dokument.");

  return { effectiveStatus, expiryState, days, warnings };
}
