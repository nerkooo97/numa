import type { ID } from "@features/auth/types";

export type CashRecipientType = "radnik" | "poslovodja" | "vlasnik" | "knjigovodstvo";
export type CashMethod = "kes" | "racun";
export type CashStatus = "izdato" | "djelimicno_opravdano" | "opravdano";

export interface CashPayment {
  id: ID;
  date: string;
  recipientType: CashRecipientType;
  recipientId?: ID;
  recipientName: string;
  amount: number;
  method: CashMethod;
  purpose: string;
  projectId?: ID;
  description?: string;
  status: CashStatus;
  createdAt: string;
  createdBy: ID;
}

export interface CashJustification {
  id: ID;
  cashPaymentId: ID;
  amount: number;
  description: string;
  projectId?: ID;
  receiptFileId?: ID;
  createdAt: string;
  createdBy: ID;
}
