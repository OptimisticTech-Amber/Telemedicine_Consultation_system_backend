import { z } from "zod";

export const registerSchema = z.object({
  email: z
    .string()
    .email()
    .transform((value) => value.toLowerCase().trim()),

  password: z
    .string()
    .min(8)
    .max(72),

  phone: z
    .string()
    .min(10)
    .max(15),

  dateOfBirth: z
    .string()
    .datetime(),

  firstName: z
    .string()
    .min(1)
    .max(100)
    .trim(),

  lastName: z
    .string()
    .min(1)
    .max(100)
    .trim(),
});

export const loginSchema = z.object({
  email: z
    .string()
    .email()
    .transform((value) => value.toLowerCase().trim()),

  password: z
    .string()
    .min(1),
});