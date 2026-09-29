import type { Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "../../common/middleware/auth.js";
import { createAvailability, createDoctor } from "./doctor.service.js";
import {
  createAvailabilitySchema,
  createDoctorSchema,
} from "./doctor.validation.js";
import { AppError } from "../../common/errors/AppError.js";
import { prisma } from "../../config/db.js";

export const createDoctorController = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const parsed = createDoctorSchema.safeParse(req.body);

    if (!parsed.success) {
      return next(AppError("Invalid request data", 400, "VALIDATION_ERROR"));
    }

    const doctor = await createDoctor(parsed.data);

    res.status(201).json({
      success: true,
      data: {
        doctor,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const createAvailabilityController = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.user) {
      return next(AppError("Authentication required", 401, "UNAUTHORIZED"));
    }

    const parsed = createAvailabilitySchema.safeParse(req.body);

    if (!parsed.success) {
      return next(AppError("Invalid request data", 400, "VALIDATION_ERROR"));
    }

    const doctor = await prisma.doctor.findUnique({
      where: {
        userId: req.user.userId,
      },
    });

    if (!doctor) {
      return next(
        AppError("Doctor profile not found", 404, "DOCTOR_NOT_FOUND"),
      );
    }

    const slot = await createAvailability({
      doctorId: doctor.id,
      startTime: parsed.data.startTime,
      endTime: parsed.data.endTime,
    });

    res.status(201).json({
      success: true,
      data: {
        slot,
      },
    });
  } catch (error) {
    next(error);
  }
};
