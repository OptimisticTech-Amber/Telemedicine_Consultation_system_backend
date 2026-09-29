import { z } from "zod";

export const bookConsultationSchema = z.object({
  availabilitySlotId: z.string().uuid(),
  reason: z.string().max(1000).optional(),
});

export const createPrescriptionSchema = z.object({
  diagnosis: z.string().max(1000).optional(),
  notes: z.string().max(2000).optional(),

  items: z
    .array(
      z.object({
        medicineName: z.string().min(1).max(200),
        dosage: z.string().min(1).max(100),
        frequency: z.string().min(1).max(100),
        duration: z.string().min(1).max(100),
        instructions: z.string().max(500).optional(),
      }),
    )
    .min(1)
    .max(20),
});
