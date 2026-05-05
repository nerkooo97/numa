import type { ID } from "@features/auth/types";

export type VisaKind = "rad" | "boravak";

export interface VisaAttachment {
  id: ID;
  employeeId: ID;
  visaKind: VisaKind;
  slug: string;
  label: string;
  fileId?: ID;
  notes?: string;
  createdAt: string;
}
