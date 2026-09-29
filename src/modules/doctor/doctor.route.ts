import { Router } from "express";
import { authenticate } from "../../common/middleware/auth.js";
import { authorize } from "../../common/middleware/authorize.js";
import { UserRole } from "@prisma/client";
import {
  createDoctorController,
  createAvailabilityController,
} from "./doctor.controller.js";

const router = Router();

router.post(
  "/",
  authenticate,
  authorize(UserRole.ADMIN),
  createDoctorController,
);

router.post(
  "/availability",
  authenticate,
  authorize(UserRole.DOCTOR),
  createAvailabilityController,
);
export default router;
