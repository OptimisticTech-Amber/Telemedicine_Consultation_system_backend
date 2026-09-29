import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  console.error(error);

  const isValidationError = error instanceof ZodError;
  const statusCode = isValidationError ? 400 : error.statusCode || 500;
  const code = isValidationError
    ? "VALIDATION_ERROR"
    : error.code || "INTERNAL_SERVER_ERROR";

  res.status(statusCode).json({
    success: false,
    error: {
      code,
      message: error.message || "Something went wrong",
    },
  });
};
