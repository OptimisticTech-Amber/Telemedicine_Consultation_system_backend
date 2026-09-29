import { Router } from "express";
import * as authController from "./auth.controller.js";
import { authRateLimiter } from "../../common/middleware/rateLimit.js";

const router = Router();

router.post("/register", authRateLimiter,authController.register);

router.post("/login", authRateLimiter, authController.login);

router.post("/refresh", authRateLimiter, authController.refresh);
router.post("/logout", authController.logout);
export default router;
