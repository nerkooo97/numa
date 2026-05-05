import { db } from "./index";

export async function logAction(user: { id: string; name: string } | null, action: string, entity: string, entityId?: string, details?: string) {
  if (!user) return;
  await db.audit.create({
    at: new Date().toISOString(),
    userId: user.id,
    userName: user.name,
    action,
    entity,
    entityId,
    details,
  } as any);
}
