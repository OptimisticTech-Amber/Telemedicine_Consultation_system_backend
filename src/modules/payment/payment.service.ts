// import { prisma } from "../../config/db.js";
// import { AppError } from "../../common/errors/AppError.js";

// export const createPayment = async (
//   consultationId: string,
//   patientId: string
// ) => {
//   const consultation =
//     await prisma.consultation.findUnique({
//       where: {
//         id: consultationId,
//       },
//       include: {
//         doctor: true,
//         payment: true,
//       },
//     });

//   if (!consultation) {
//     throw AppError(
//       "Consultation not found",
//       404,
//       "CONSULTATION_NOT_FOUND"
//     );
//   }

//   if (consultation.patientId !== patientId) {
//     throw AppError(
//       "You do not have access to this consultation",
//       403,
//       "FORBIDDEN"
//     );
//   }

//   if (consultation.status !== "SCHEDULED") {
//     throw AppError(
//       "Payment cannot be created for this consultation",
//       409,
//       "INVALID_CONSULTATION_STATE"
//     );
//   }

//   if (consultation.payment) {
//     return consultation.payment;
//   }

//   return prisma.payment.create({
//     data: {
//       consultationId: consultation.id,
//       amount: consultation.doctor.consultationFee,
//       currency: "INR",
//       status: "PENDING",
//     },
//   });
// };

// interface PaymentConfirmationInput {
//   paymentId: string;
//   provider: string;
//   providerRef: string;
//   success: boolean;
// }

// export const confirmPayment = async (
//   input: PaymentConfirmationInput
// ) => {
//   return prisma.$transaction(async (tx) => {
//     const payment = await tx.payment.findUnique({
//       where: {
//         id: input.paymentId,
//       },
//     });

//     if (!payment) {
//       throw AppError(
//         "Payment not found",
//         404,
//         "PAYMENT_NOT_FOUND"
//       );
//     }

//     // Idempotent webhook handling
//     if (payment.status === "SUCCESS") {
//       return payment;
//     }

//     if (payment.status === "REFUNDED") {
//       throw AppError(
//         "Payment has already been refunded",
//         409,
//         "PAYMENT_ALREADY_REFUNDED"
//       );
//     }

//     if (input.success) {
//       return tx.payment.update({
//         where: {
//           id: payment.id,
//         },
//         data: {
//           status: "SUCCESS",
//           provider: input.provider,
//           providerRef: input.providerRef,
//           paidAt: new Date(),
//         },
//       });
//     }

//     return tx.payment.update({
//       where: {
//         id: payment.id,
//       },
//       data: {
//         status: "FAILED",
//         provider: input.provider,
//         providerRef: input.providerRef,
//       },
//     });
//   });
// };

import { prisma } from "../../config/db.js";
import { AppError } from "../../common/errors/AppError.js";
import { razorpay } from "./razoy.service.js";

interface CreatePaymentInput {
  consultationId: string;
  patientId: string;
  idempotencyKey: string;
}

const rupeesToPaise = (amount: number) => {
  return Math.round(amount * 100);
};

export const createPayment = async (input: CreatePaymentInput) => {
  const existingKey = await prisma.paymentIdempotencyKey.findUnique({
    where: {
      userId_key: {
        userId: input.patientId,
        key: input.idempotencyKey,
      },
    },
  });

  if (existingKey?.responseBody) {
    return {
      status: existingKey.responseStatus ?? 200,
      body: existingKey.responseBody,
    };
  }

  const consultation = await prisma.consultation.findUnique({
    where: {
      id: input.consultationId,
    },
    include: {
      doctor: true,
      payment: true,
    },
  });

  if (!consultation) {
    throw AppError("Consultation not found", 404, "CONSULTATION_NOT_FOUND");
  }

  if (consultation.patientId !== input.patientId) {
    throw AppError(
      "You do not have access to this consultation",
      403,
      "FORBIDDEN",
    );
  }

  if (consultation.status !== "SCHEDULED") {
    throw AppError(
      "Consultation cannot be paid for",
      409,
      "INVALID_CONSULTATION_STATE",
    );
  }

  if (consultation.payment) {
    const existingPayment = consultation.payment;

    const responseBody = {
      success: true,
      data: {
        payment: {
          id: existingPayment.id,
          amount: existingPayment.amount,
          currency: existingPayment.currency,
          status: existingPayment.status,
          razorpayOrderId: existingPayment.providerOrderId,
          razorpayKeyId: process.env.RAZORPAY_KEY_ID,
        },
      },
    };

    return {
      status: 200,
      body: responseBody,
    };
  }

  const amount = Number(consultation.doctor.consultationFee);

  if (!Number.isFinite(amount) || amount <= 0) {
    throw AppError("Invalid consultation fee", 500, "INVALID_PAYMENT_AMOUNT");
  }

  const amountInPaise = rupeesToPaise(amount);

  /*
   * Create the Razorpay order first.
   *
   * The receipt is our internal consultation
   * identifier rather than something supplied
   * by the client.
   */
  const razorpayOrder = await razorpay.orders.create({
    amount: amountInPaise,
    currency: "INR",
    receipt: `consultation_${consultation.id}`,
    notes: {
      consultationId: consultation.id,
      patientId: consultation.patientId,
    },
  });

  try {
    const result = await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          consultationId: consultation.id,

          amount,

          currency: "INR",

          status: "PENDING",

          provider: "RAZORPAY",

          providerOrderId: razorpayOrder.id,

          idempotencyKey: input.idempotencyKey,
        },
      });

      const responseBody = {
        success: true,

        data: {
          payment: {
            id: payment.id,

            amount: payment.amount,

            currency: payment.currency,

            status: payment.status,

            razorpayOrderId: payment.providerOrderId,

            razorpayKeyId: process.env.RAZORPAY_KEY_ID,
          },
        },
      };

      await tx.paymentIdempotencyKey.create({
        data: {
          key: input.idempotencyKey,

          userId: input.patientId,

          paymentId: payment.id,

          responseStatus: 201,

          responseBody,

          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });

      return {
        status: 201,
        body: responseBody,
      };
    });

    return result;
  } catch (error) {
    /*
     * If DB creation failed after Razorpay order
     * creation, the order exists at Razorpay but
     * has no local payment.
     *
     * A production system should reconcile such
     * orphaned orders asynchronously.
     */

    throw error;
  }
};

import { verifyRazorpayPaymentSignature } from "./razorpay.signature.js";

interface VerifyPaymentInput {
  orderId: string;
  paymentId: string;
  signature: string;
  patientId: string;
}

export const verifyPayment = async (input: VerifyPaymentInput) => {
  const payment = await prisma.payment.findUnique({
    where: {
      providerOrderId: input.orderId,
    },
    include: {
      consultation: true,
    },
  });

  if (!payment) {
    throw AppError("Payment not found", 404, "PAYMENT_NOT_FOUND");
  }

  if (payment.consultation.patientId !== input.patientId) {
    throw AppError("You do not have access to this payment", 403, "FORBIDDEN");
  }

  const isValid = verifyRazorpayPaymentSignature(
    input.orderId,
    input.paymentId,
    input.signature,
  );

  if (!isValid) {
    throw AppError(
      "Invalid Razorpay payment signature",
      400,
      "INVALID_PAYMENT_SIGNATURE",
    );
  }

  /*
   * The signature proves the response came
   * from the expected Razorpay flow, but we
   * still don't blindly trust the browser
   * to tell us the final payment state.
   */

  const updatedPayment = await prisma.payment.update({
    where: {
      id: payment.id,
    },
    data: {
      providerPaymentId: input.paymentId,

      providerSignature: input.signature,
    },
  });

  return {
    success: true,

    data: {
      payment: updatedPayment,
    },
  };
};



export const processPaymentWebhook =
  async (event: any) => {

    const eventId =
      event?.payload?.payment?.entity?.id ??
      event?.id;

    /*
     * For the exact Razorpay webhook payload,
     * use the event identifier supplied by the
     * webhook configuration/payload.
     *
     * Store it as providerEventId.
     */

    if (!eventId) {
      throw AppError(
        "Invalid Razorpay webhook event",
        400,
        "INVALID_WEBHOOK_EVENT"
      );
    }

    const existingEvent =
      await prisma.paymentEvent.findUnique({
        where: {
          provider_providerEventId: {
            provider: "RAZORPAY",
            providerEventId: eventId,
          },
        },
      });

    if (existingEvent) {

      return {
        processed: false,

        reason:
          "EVENT_ALREADY_PROCESSED",

        paymentId:
          existingEvent.paymentId,
      };
    }

    const paymentEntity =
      event?.payload?.payment?.entity;

    if (!paymentEntity) {
      throw AppError(
        "Invalid payment webhook payload",
        400,
        "INVALID_WEBHOOK_PAYLOAD"
      );
    }

    const razorpayOrderId =
      paymentEntity.order_id;

    if (!razorpayOrderId) {
      throw AppError(
        "Razorpay order ID missing",
        400,
        "ORDER_ID_MISSING"
      );
    }

    return prisma.$transaction(
      async (tx) => {

        /*
         * Lock the local payment.
         */
        const payments =
          await tx.$queryRaw<
            Array<{
              id: string;
              status: string;
              amount: string;
              currency: string;
            }>
          >`
            SELECT
              id,
              status,
              amount::text,
              currency
            FROM "Payment"
            WHERE "providerOrderId" =
              ${razorpayOrderId}
            FOR UPDATE
          `;

        const payment =
          payments[0];

        if (!payment) {
          throw AppError(
            "Payment not found",
            404,
            "PAYMENT_NOT_FOUND"
          );
        }

        /*
         * Record the webhook event.
         *
         * The unique constraint protects us
         * against concurrent duplicate delivery.
         */
        await tx.paymentEvent.create({
          data: {
            provider: "RAZORPAY",

            providerEventId:
              eventId,

            paymentId:
              payment.id,

            eventType:
              event.event,

            payload:
              event,
          },
        });

        let status:
          | "SUCCESS"
          | "FAILED";

        if (
          event.event ===
          "payment.captured"
        ) {
          status = "SUCCESS";

        } else if (
          event.event ===
          "payment.failed"
        ) {
          status = "FAILED";

        } else {

          /*
           * Store the event but don't change
           * payment state for events we don't
           * handle yet.
           */
          return {
            processed: true,

            paymentId:
              payment.id,

            ignored: true,

            event:
              event.event,
          };
        }

        const updatedPayment =
          await tx.payment.update({
            where: {
              id: payment.id,
            },

            data: {
              status,

              provider:
                "RAZORPAY",

              providerPaymentId:
                paymentEntity.id,

              paidAt:
                status === "SUCCESS"
                  ? new Date()
                  : undefined,
            },
          });

        return {
          processed: true,

          payment: updatedPayment,
        };
      }
    );
  };