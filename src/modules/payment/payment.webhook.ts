import crypto from "node:crypto";


export const verifyRazorpayWebhookSignature =
  (
    rawBody: Buffer,
    signature: string
  ): boolean => {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!webhookSecret) {
      throw new Error("RAZORPAY_WEBHOOK_SECRET is not configured");
    }

    const expectedSignature =
      crypto
        .createHmac(
          "sha256",
          webhookSecret
        )
        .update(rawBody)
        .digest("hex");

    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature),
      Buffer.from(signature)
    );
  };