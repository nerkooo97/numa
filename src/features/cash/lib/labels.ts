import type { CashPayment, CashRecipientType } from "@/data/types";

export const recipientLabels: Record<CashRecipientType, string> = {
  radnik: "Radnik", poslovodja: "Poslovođa", vlasnik: "Vlasnik", knjigovodstvo: "Knjigovodstvo",
};

export function statusFor(p: CashPayment, justAmt: number) {
  if (justAmt >= p.amount) return "opravdano";
  if (justAmt > 0) return "djelimicno_opravdano";
  return "izdato";
}
