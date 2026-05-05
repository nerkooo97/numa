import type { ID } from "@features/auth/types";

export type ExpenseCategory =
  | "radnici"
  | "hrana"
  | "prevoz"
  | "smjestaj"
  | "materijal"
  | "sitni_materijal"
  | "neplanirani"
  | "ostalo";

export interface Expense {
  id: ID;
  date: string;
  category: ExpenseCategory;
  amount: number;
  description: string;
  projectId?: ID;
  phaseId?: ID;
  employeeId?: ID;
  unplannedReason?: string;
  approved?: boolean;
  receiptFileId?: ID;
  createdAt: string;
  createdBy: ID;
}
