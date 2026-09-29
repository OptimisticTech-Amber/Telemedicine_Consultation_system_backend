import type { Response, NextFunction } from "express";
import { UserRole } from "@prisma/client";
import type {
  AuthenticatedRequest
} from "./auth.js";
import { AppError } from "../errors/AppError.js";


export const authorize = (...allowedRoles: UserRole[]) => {
  return (
    req: AuthenticatedRequest,
    _res: Response,
    next: NextFunction
  ) => {
    if (!req.user) {
      return next(
        AppError(
          "Authentication required",
          401,
          "UNAUTHORIZED"
        )
      );
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        AppError(
          "You do not have permission to perform this action",
          403,
          "FORBIDDEN"
        )
      );
    }

    next();
  };
};