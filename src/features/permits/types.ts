import type { ID } from "@features/auth/types";

export type PermitCaseStatus = "u_pripremi" | "spremno" | "predano" | "odobreno" | "odbijeno";
export type PermitItemStatus = "nedostaje" | "dostavljeno" | "pregledano" | "odbijeno";
export type PermitDocumentStatus = "aktivan" | "istekao" | "zamijenjen" | "arhiviran";

export interface PermitCategory {
  id: ID;
  name: string;
  slug: string;
  description?: string;
  active: boolean;
  createdAt: string;
}

export interface PermitDocumentType {
  id: ID;
  name: string;
  slug: string;
  description?: string;
  active: boolean;
  createdAt: string;
}

export interface PermitChecklistTemplate {
  id: ID;
  categoryId: ID;
  name: string;
  description?: string;
  active: boolean;
  createdAt: string;
}

export interface PermitChecklistTemplateItem {
  id: ID;
  templateId: ID;
  documentTypeId: ID;
  label: string;
  description?: string;
  required: boolean;
  sortOrder: number;
  createdAt: string;
}

export interface PermitCase {
  id: ID;
  employeeId: ID;
  categoryId: ID;
  templateId: ID;
  status: PermitCaseStatus;
  notes?: string;
  createdAt: string;
}

export interface PermitCaseItem {
  id: ID;
  caseId: ID;
  templateItemId?: ID;
  documentTypeId: ID;
  label: string;
  description?: string;
  required: boolean;
  status: PermitItemStatus;
  notes?: string;
  reviewedAt?: string;
  sortOrder: number;
  createdAt: string;
}

export interface PermitDocument {
  id: ID;
  documentTypeId: ID;
  name: string;
  description?: string;
  fileId: ID;
  issuedAt?: string;
  expiresAt?: string;
  status: PermitDocumentStatus;
  sourceKind: "employee" | "shared" | "generated";
  createdAt: string;
  updatedAt?: string;
  replacesDocumentId?: ID;
}

export interface PermitDocumentEmployee {
  id: ID;
  documentId: ID;
  employeeId: ID;
  role?: "owner" | "covered";
  createdAt: string;
}

export interface PermitCaseItemDocument {
  id: ID;
  caseItemId: ID;
  documentId: ID;
  createdAt: string;
}
