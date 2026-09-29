import { Router } from "express";
import { authenticate } from "../../common/middleware/auth.js";
import { bookConsultationController } from "./consultation.controller.js";

const router = Router();

router.post("/", authenticate, bookConsultationController);

export default router;
