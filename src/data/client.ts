// Apstraktni data layer. Trenutna implementacija: localClient (localStorage + IndexedDB).
// Kasnije: appwriteClient sa identičnim API-jem.

export interface Repo<T extends { id: string }> {
  list(): Promise<T[]>;
  get(id: string): Promise<T | undefined>;
  create(data: Omit<T, "id" | "createdAt"> & { id?: string; createdAt?: string }): Promise<T>;
  update(id: string, patch: Partial<T>): Promise<T>;
  remove(id: string): Promise<void>;
}

export interface FileStore {
  /**
   * Upload file. Optional `folder` is a path-like prefix used to organize files
   * (e.g. "projects/<id>/documents"). It is stored as part of the filename in Appwrite
   * since Storage doesn't have native folders, but it gives clean visual grouping
   * in the bucket and in any UI that shows the file name.
   */
  upload(file: File, folder?: string): Promise<string>;
  getUrl(fileId: string): Promise<string | null>;
  remove(fileId: string): Promise<void>;
  getMeta(fileId: string): Promise<{ name: string; type: string; size: number } | null>;
}

import type {
  User, Employee, EmployeeDocument, Project, ProjectDocument, Phase, PhaseAssignment,
  HourEntry, EquipmentAssignment, EquipmentItem, EquipmentCategory, Expense, CashPayment, CashJustification, CashboxEntry,
  AuditLog, Notification, VisaAttachment, PhaseChecklistItem, ProjectInvoice, ProjectPhoto,
} from "./types";

export interface DataClient {
  users: Repo<User>;
  employees: Repo<Employee>;
  employeeDocuments: Repo<EmployeeDocument>;
  projects: Repo<Project>;
  projectDocuments: Repo<ProjectDocument>;
  phases: Repo<Phase>;
  phaseAssignments: Repo<PhaseAssignment>;
  hours: Repo<HourEntry>;
  equipment: Repo<EquipmentAssignment>;
  equipmentItems: Repo<EquipmentItem>;
  equipmentCategories: Repo<EquipmentCategory>;
  expenses: Repo<Expense>;
  cashPayments: Repo<CashPayment>;
  cashJustifications: Repo<CashJustification>;
  cashbox: Repo<CashboxEntry>;
  audit: Repo<AuditLog>;
  notifications: Repo<Notification>;
  visaAttachments: Repo<VisaAttachment>;
  phaseChecklist: Repo<PhaseChecklistItem>;
  invoices: Repo<ProjectInvoice>;
  photos: Repo<ProjectPhoto>;
  files: FileStore;
}
