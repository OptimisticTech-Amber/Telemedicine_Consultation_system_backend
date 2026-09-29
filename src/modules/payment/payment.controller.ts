import type { Request, Response, NextFunction } from "express";

import type { AuthenticatedRequest } from "../../common/middleware/auth.js";

import { AppError } from "../../common/errors/AppError.js";

import {
  createPayment,
  processPaymentWebhook,
  verifyPayment,
} from "./payment.service.js";

import {
  createPaymentSchema,
  verifyPaymentSchema,
} from "./payment.validation.js";

import { verifyRazorpayWebhookSignature } from "./payment.webhook.js";
import { AuditAction } from "../audit/audit.type.js";
import { auditRequest } from "../audit/audit.helper.js";

// CREATE PAYMENT

export const createPaymentController = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.user) {
      return next(AppError("Authentication required", 401, "UNAUTHORIZED"));
    }

    const idempotencyKey = req.get("Idempotency-Key");

    if (!idempotencyKey) {
      return next(
        AppError(
          "Idempotency-Key header is required",
          400,
          "IDEMPOTENCY_KEY_REQUIRED",
        ),
      );
    }

    if (idempotencyKey.length < 8 || idempotencyKey.length > 100) {
      return next(
        AppError("Invalid Idempotency-Key", 400, "INVALID_IDEMPOTENCY_KEY"),
      );
    }

    const parsed = createPaymentSchema.safeParse(req.body);

    if (!parsed.success) {
      return next(AppError("Invalid request data", 400, "VALIDATION_ERROR"));
    }

    const result = await createPayment({
      consultationId: parsed.data.consultationId,

      patientId: req.user.userId,

      idempotencyKey,
    });

    /*
      Only create the audit entry when a new
      payment has been created.
     
      service should  return:
      created: true / false
     */
    if (result.status === 201) {
      await auditRequest({
        req,
        userId: req.user.userId,
        action: AuditAction.PAYMENT_CREATED,
        resource: "Payment",
        resourceId: (
          result.body as unknown as {
            data?: { payment?: { id?: string } };
          }
        ).data?.payment?.id,
        metadata: {
          consultationId: parsed.data.consultationId,
          provider: "RAZORPAY",
        },
      });
    }

    return res.status(result.status).json(result.body);
  } catch (error) {
    next(error);
  }
};

// VERIFY RAZORPAY PAYMENT

export const verifyPaymentController = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.user) {
      return next(AppError("Authentication required", 401, "UNAUTHORIZED"));
    }

    const parsed = verifyPaymentSchema.safeParse(req.body);

    if (!parsed.success) {
      return next(
        AppError("Invalid payment verification data", 400, "VALIDATION_ERROR"),
      );
    }

    const result = await verifyPayment({
      orderId: parsed.data.razorpay_order_id,

      paymentId: parsed.data.razorpay_payment_id,

      signature: parsed.data.razorpay_signature,

      patientId: req.user.userId,
    });

    await auditRequest({
      req,
      userId: req.user.userId,
      action: AuditAction.PAYMENT_VERIFICATION_SUCCESS,
      resource: "Payment",
      resourceId: result.data.payment.id,
      metadata: {
        provider: "RAZORPAY",
        razorpayPaymentId: parsed.data.razorpay_payment_id,
        razorpayOrderId: parsed.data.razorpay_order_id,
      },
    });

    return res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// RAZORPAY WEBHOOK

export const razorpayWebhookController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const signature = req.get("X-Razorpay-Signature");

    if (!signature) {
      return next(
        AppError(
          "Missing Razorpay signature",
          400,
          "MISSING_WEBHOOK_SIGNATURE",
        ),
      );
    }

    const rawBody = (req as Request & { rawBody?: Buffer }).rawBody;

    if (!rawBody) {
      return next(
        AppError("Webhook raw body unavailable", 500, "RAW_BODY_UNAVAILABLE"),
      );
    }

    const valid = verifyRazorpayWebhookSignature(rawBody, signature);

    if (!valid) {
      return next(
        AppError(
          "Invalid Razorpay webhook signature",
          400,
          "INVALID_WEBHOOK_SIGNATURE",
        ),
      );
    }

    const event = req.body;

    /*
      The service handles:
     
      - duplicate webhook detection
      - payment row locking
      - payment state update
      - payment event persistence
      - audit logging
     */
    const result = await processPaymentWebhook(event);

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
