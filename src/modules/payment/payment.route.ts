// /

// import { Router } from "express";

// import { authenticate } from "../../common/middleware/auth.js";

// import { createPaymentController, razorpayWebhookController, verifyPaymentController } from "./payment.controller.js";

// const router = Router();

// router.post(
//   "/",
//   authenticate,
//   createPaymentController
// );

// router.post(
//   "/verify",
//   authenticate,
//   verifyPaymentController
// );

// router.post(
//   "/webhook",
//   razorpayWebhookController
// );
// export default router;


import { Router } from "express";

import {
  authenticate,
} from "../../common/middleware/auth.js";

import {
  paymentRateLimiter,
} from "../../common/middleware/rateLimit.js";

import {
  createPaymentController,
  verifyPaymentController,
  razorpayWebhookController,
} from "./payment.controller.js";

const router = Router();

router.post(
  "/",
  authenticate,
  paymentRateLimiter,
  createPaymentController,
);

router.post(
  "/verify",
  authenticate,
  paymentRateLimiter,
  verifyPaymentController,
);

router.post(
  "/webhook",
  razorpayWebhookController,
);

export default router;