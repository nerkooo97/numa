// Aggregator: re-export svih feature-specifičnih tipova.
// Postojeći kod koji import-uje "@/data/types" nastavlja raditi.
// Novi feature kod treba da koristi "@features/<feature>/types" direktno.

export type { ID, Role, User } from "@features/auth/types";
export type { Employee, EmployeeType, DocKind, EmployeeDocument } from "@features/employees/types";
export type { VisaKind, VisaAttachment } from "@features/visas/types";
export type {
  Project, ProjectDocument, Phase, PhaseAssignment, PhaseChecklistItem,
  ProjectInvoice, ProjectPhoto,
} from "@features/projects/types";
export type { HourEntry } from "@features/hours/types";
export type { EquipmentCategory, EquipmentItem, EquipmentAssignment } from "@features/equipment/types";
export type { ExpenseCategory, Expense } from "@features/expenses/types";
export type { CashRecipientType, CashMethod, CashStatus, CashPayment, CashJustification } from "@features/cash/types";
export type { CashboxEntry } from "@features/cashbox/types";
export type { AuditLog } from "@features/audit/types";
export type { Notification } from "@features/notifications/types";
