import { ipKeyGenerator, rateLimit } from "express-rate-limit";

const rateLimitResponse = {
  success: false,
  error: {
    code: "RATE_LIMIT_EXCEEDED",
    message: "Too many requests. Please try again later.",
  },
};

/**
 * General API rate limiter
 *
 * 300 requests per 15 minutes per IP
 */
export const globalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,

  limit: 300,

  standardHeaders: "draft-8",

  legacyHeaders: false,

  message: rateLimitResponse,

  handler: (_req, res) => {
    return res.status(429).json(rateLimitResponse);
  },
});

/**
 * Authentication endpoints
 *
 * Protects login/register/refresh from brute-force abuse.
 *
 * 10 requests per 15 minutes per IP
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,

  limit: 10,

  keyGenerator: (req) => `${ipKeyGenerator(req.ip ?? "unknown")}:${req.path}`,

  standardHeaders: "draft-8",

  legacyHeaders: false,

  message: {
    success: false,
    error: {
      code: "AUTH_RATE_LIMIT_EXCEEDED",
      message: "Too many authentication attempts. Please try again later.",
    },
  },

  handler: (_req, res) => {
    return res.status(429).json({
      success: false,
      error: {
        code: "AUTH_RATE_LIMIT_EXCEEDED",
        message: "Too many authentication attempts. Please try again later.",
      },
    });
  },
});

/**
 * Payment endpoints
 *
 * 30 requests per minute per IP
 */
export const paymentRateLimiter = rateLimit({
  windowMs: 60 * 1000,

  limit: 30,

  standardHeaders: "draft-8",

  legacyHeaders: false,

  message: {
    success: false,
    error: {
      code: "PAYMENT_RATE_LIMIT_EXCEEDED",
      message: "Too many payment requests. Please try again later.",
    },
  },

  handler: (_req, res) => {
    return res.status(429).json({
      success: false,
      error: {
        code: "PAYMENT_RATE_LIMIT_EXCEEDED",
        message: "Too many payment requests. Please try again later.",
      },
    });
  },
});
