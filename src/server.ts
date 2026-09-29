import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import cookieParser from "cookie-parser";
import { env } from "process";
import { prisma } from "./config/db.js";
import authRoutes from "./modules/auth/auth.route.js";
import doctorRoutes from "./modules/doctor/doctor.route.js";
import consultationRoutes from "./modules/consultation/consultation.route.js";
import { globalRateLimiter } from "./common/middleware/rateLimit.js";
import { authenticate } from "./common/middleware/auth.js";
import type { AuthenticatedRequest } from "./common/middleware/auth.js";
import { errorHandler } from "./common/errors/AppErrorHandler.js";
export const app = express();

app.use(helmet());
app.use(cors());

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.set("trust proxy", 1);
app.use(globalRateLimiter);
app.use(compression());
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/doctor", doctorRoutes);
app.use("/api/v1/consultations", consultationRoutes);
app.get("/api/v1/users/me", authenticate, (req: AuthenticatedRequest, res) => {
  res.status(200).json({
    success: true,
    data: { user: req.user },
  });
});
app.get("/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
    service: "Telemedicine-backend",
  });
});
app.use(errorHandler);

export const server =
  env.NODE_ENV === "test"
    ? undefined
    : app.listen(env.PORT, () => {
        console.log(`Telemedicine backend running on port ${env.PORT}`);
      });

const shutdown = async (signal: string) => {
  console.log(`${signal} received. Shutting down...`);

  server?.close(async () => {
    await prisma.$disconnect();

    console.log("Server shut down successfully.");

    process.exit(0);
  });
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
