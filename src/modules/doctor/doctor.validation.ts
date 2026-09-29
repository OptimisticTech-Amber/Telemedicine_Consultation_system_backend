import { z } from "zod";

export const createDoctorSchema = z.object({
  userId: z.string().uuid(),
  specialization: z.string().min(2).max(100).trim(),
  licenseNumber: z.string().min(3).max(100).trim(),
  bio: z.string().max(1000).optional(),
  consultationFee: z.number().positive(),
});

export const createAvailabilitySchema = z.object({
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
});
