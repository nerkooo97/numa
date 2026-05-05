import type { ID } from "@features/auth/types";

export interface AuditLog {
  id: ID;
  at: string;
  userId: ID;
  userName: string;
  action: string;
  entity: string;
  entityId?: ID;
  details?: string;
}
