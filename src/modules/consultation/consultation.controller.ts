import type { Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "../../common/middleware/auth.js";
import { AppError } from "../../common/errors/AppError.js";
import { bookConsultation } from "./consultation.service.js";
import { bookConsultationSchema } from "./consultation.validation.js";

export const bookConsultationController = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.user) {
      return next(AppError("Authentication required", 401, "UNAUTHORIZED"));
    }

    const idempotencyKey = req.get("Idempotency-Key");

    if (!idempotencyKey) {
      return next(
        AppError(
          "Idempotency-Key header is required",
          400,
          "IDEMPOTENCY_KEY_REQUIRED",
        ),
      );
    }

    if (idempotencyKey.length > 100) {
      return next(
        AppError("Idempotency-Key is too long", 400, "INVALID_IDEMPOTENCY_KEY"),
      );
    }

    const parsed = bookConsultationSchema.safeParse(req.body);

    if (!parsed.success) {
      return next(AppError("Invalid request data", 400, "VALIDATION_ERROR"));
    }

    if (req.user.role !== "PATIENT") {
      return next(
        AppError("Only patients can book consultations", 403, "FORBIDDEN"),
      );
    }

    const result = await bookConsultation({
      patientId: req.user.userId,
      availabilitySlotId: parsed.data.availabilitySlotId,
      reason: parsed.data.reason,
      idempotencyKey,
    });

    return res.status(result.status).json(result.body);
  } catch (error) {
    next(error);
  }
};
