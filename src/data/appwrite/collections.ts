// Mapiranje logičkih repo-imena na Appwrite collection ID-eve.
// Po defaultu se koriste isti string ID-evi kao "table" imena u localClient,
// tako da je migracija 1:1. Po potrebi se mogu overrideati env varijablom.

export const COLLECTIONS = {
  users: "users",
  employees: "employees",
  employeeDocuments: "employee_documents",
  projects: "projects",
  projectDocuments: "project_documents",
  phases: "phases",
  phaseAssignments: "phase_assignments",
  hours: "hours",
  equipment: "equipment",
  equipmentItems: "equipment_items",
  equipmentCategories: "equipment_categories",
  expenses: "expenses",
  cashPayments: "cash_payments",
  cashJustifications: "cash_justifications",
  cashbox: "cashbox",
  audit: "audit",
  notifications: "notifications",
  visaAttachments: "visa_attachments",
  phaseChecklist: "phase_checklist",
  invoices: "invoices",
  photos: "photos",
} as const;

export type CollectionKey = keyof typeof COLLECTIONS;
