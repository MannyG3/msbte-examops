import { prisma } from "./prisma";

interface LogActionParams {
  instituteId: string;
  userId?: string;
  action: string;
  entity: string;
  entityId?: string;
  beforeData?: any;
  afterData?: any;
}

export async function logAuditAction({
  instituteId,
  userId,
  action,
  entity,
  entityId,
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
        beforeData: beforeData ? JSON.stringify(beforeData) : null,
        afterData: afterData ? JSON.stringify(afterData) : null,
      },
    });
  } catch (error) {
    console.error("Failed to write audit log:", error);
  }
}
