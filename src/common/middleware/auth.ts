import type { Request, Response, NextFunction } from "express";
import { UserRole } from "@prisma/client";

import { verifyAccessToken } from "../utils/jwt.js";
import { AppError } from "../errors/AppError.js";

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    role: UserRole;
  };
}

export const authenticate = (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction,
) => {
  const header = req.headers.authorization;

  if (!header?.startsWith("Bearer ")) {
    return next(AppError("Authentication required", 401, "UNAUTHORIZED"));
  }

  const token = header.substring(7);

  try {
    const payload = verifyAccessToken(token);

    req.user = {
      userId: payload.userId,
      role: payload.role,
    };

    next();
  } catch {
    next(AppError("Invalid or expired access token", 401, "INVALID_TOKEN"));
  }
};
