// import { z } from "zod";

// export const createPaymentSchema = z.object({
//   consultationId: z.string().uuid(),
// });

// export const confirmPaymentSchema = z.object({
//   paymentId: z.string().uuid(),
//   provider: z.string().min(1).max(50),
//   providerRef: z.string().min(1).max(200),
//   success: z.boolean(),
// });

import { z } from "zod";

export const createPaymentSchema = z.object({
  consultationId: z.string().uuid(),
});

export const verifyPaymentSchema = z.object({ razorpay_order_id: z.string().min(1), razorpay_payment_id: z.string().min(1), razorpay_signature: z.string().min(1), });