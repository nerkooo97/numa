import type { ID } from "@features/auth/types";

export interface Project {
  id: ID;
  name: string;
  location: string;
  squareMeters: number;
  startDate?: string;
  plannedEndDate?: string;
  description?: string;
  contractValue?: number;
  active: boolean;
  archived?: boolean;
  createdAt: string;
}

export interface ProjectDocument {
  id: ID;
  projectId: ID;
  phaseId?: ID;
  kind: "ugovor" | "tehnicka" | "racun" | "dozvola" | "primopredaja" | "ostalo";
  name: string;
  fileId?: ID;
  tags?: string[];
  expiresAt?: string;
  parentDocumentId?: ID;
  version?: number;
  uploadedBy?: ID;
  createdAt: string;
}

export interface Phase {
  id: ID;
  projectId: ID;
  name: string;
  squareMeters: number;
  description?: string;
  startDate?: string;
  endDate?: string;
  plannedDays?: number;
  budget?: number;
  order?: number;
  progressPct?: number;
  status: "planirana" | "u_toku" | "zavrsena";
  createdAt: string;
}

export interface PhaseAssignment {
  id: ID;
  phaseId: ID;
  employeeId: ID;
  createdAt: string;
}

export interface PhaseChecklistItem {
  id: ID;
  phaseId: ID;
  label: string;
  done: boolean;
  order?: number;
  createdAt: string;
}

export interface ProjectInvoice {
  id: ID;
  projectId: ID;
  number: string;
  date: string;
  dueDate?: string;
  amount: number;
  paidAmount?: number;
  status: "izdata" | "djelimicno_placena" | "placena" | "kasni";
  description?: string;
  fileId?: ID;
  createdAt: string;
}

export interface ProjectPhoto {
  id: ID;
  projectId: ID;
  phaseId?: ID;
  fileId: ID;
  caption?: string;
  takenAt: string;
  uploadedBy?: ID;
  createdAt: string;
}
