import { prisma } from "./prisma";

interface LogActionParams {
  instituteId: string;
  userId?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  reason?: string | null;
  beforeData?: unknown;
  afterData?: unknown;
}

export async function logAuditAction({
  instituteId,
  userId,
  action,
  entity,
  entityId,
  reason,
  beforeData,
  afterData,
}: LogActionParams) {
  try {
    return await prisma.auditLog.create({
      data: {
        instituteId,
        userId: userId || null,
        action,
        entity,
        entityId: entityId || null,
        reason: reason || null,
        beforeData: beforeData ? (beforeData as any) : undefined,
        afterData: afterData ? (afterData as any) : undefined,
      },
    });
  } catch (error) {
    console.error("Failed to write audit log:", error);
  }
}
