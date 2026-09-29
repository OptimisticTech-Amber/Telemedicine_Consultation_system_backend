import { prisma } from "../../config/db.js";
import type { AuditAction } from "./audit.type.js";
import type { AuditAction as PrismaAuditAction, Prisma } from "@prisma/client";

interface CreateAuditLogInput {
  userId?: string;
  action: AuditAction | string;
  resource: string;
  resourceId?: string;

  method?: string;
  endpoint?: string;

  ipAddress?: string;
  userAgent?: string;

  metadata?: Prisma.InputJsonValue;
}

export const createAuditLog = async (input: CreateAuditLogInput) => {
  const metadata = {
    ...(input.metadata && typeof input.metadata === "object"
      ? input.metadata
      : {}),
    ...(input.method ? { method: input.method } : {}),
    ...(input.endpoint ? { endpoint: input.endpoint } : {}),
  };

  return prisma.auditLog.create({
    data: {
      userId: input.userId,
      action: input.action as PrismaAuditAction,
      resource: input.resource,
      resourceId: input.resourceId,

      ipAddress: input.ipAddress,
      userAgent: input.userAgent,

      metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
    },
  });
};
