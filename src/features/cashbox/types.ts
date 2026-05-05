import type { ID } from "@features/auth/types";

export interface CashboxEntry {
  id: ID;
  date: string;
  type: "ulaz" | "izlaz";
  amount: number;
  description: string;
  refType?: "cash_payment" | "manual";
  refId?: ID;
  createdAt: string;
  createdBy: ID;
}
