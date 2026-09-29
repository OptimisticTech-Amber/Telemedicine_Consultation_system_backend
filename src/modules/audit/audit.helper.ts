
import type { Request } from "express";
import type { Prisma } from "@prisma/client";

import { createAuditLog } from "./audit.service.js";
import type { AuditAction } from "./audit.type.js";



interface AuditRequestInput {
  req: Request;

  userId?: string;

  action: AuditAction | string;

  resource: string;

  resourceId?: string;

  metadata?: Record<string, unknown>;
}

export const auditRequest = async ({
  req,
  userId,
  action,
  resource,
  resourceId,
  metadata,
}: AuditRequestInput) => {
  return createAuditLog({
    userId,

    action,

    resource,

    resourceId,

    method: req.method,

    endpoint: req.originalUrl,

    ipAddress: req.ip,

    userAgent:
      req.get("user-agent") ?? undefined,

    metadata: metadata as Prisma.InputJsonValue | undefined,
  });
};

