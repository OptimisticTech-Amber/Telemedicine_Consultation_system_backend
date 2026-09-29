import request from "supertest";

import { app } from "../src/server.js";

import { prisma } from "../src/config/db.js";
import { describe, it, afterEach, afterAll, expect } from "@jest/globals";
import { createBookingTestData } from "./consultation.helper.js";

describe("Consultation booking", () => {
  afterEach(async () => {
    await prisma.idempotencyKey.deleteMany();

    await prisma.consultation.deleteMany();

    await prisma.availabilitySlot.deleteMany();

    await prisma.doctor.deleteMany();

    await prisma.user.deleteMany({
      where: {
        email: {
          contains: "@example.com",
        },
      },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe("POST /api/v1/consultations", () => {
    it("should book an available slot", async () => {
      const { slot, accessToken } = await createBookingTestData();

      const response = await request(app)
        .post("/api/v1/consultations")
        .set("Authorization", `Bearer ${accessToken}`)
        .set("Idempotency-Key", "booking-test-001")
        .send({
          availabilitySlotId: slot.id,
          reason: "Regular consultation",
        });

      expect(response.status).toBe(201);

      expect(response.body.success).toBe(true);

      expect(response.body.data.consultation).toBeDefined();

      const savedSlot = await prisma.availabilitySlot.findUnique({
        where: {
          id: slot.id,
        },
      });

      expect(savedSlot?.isBooked).toBe(true);
    });

    it("should require an Idempotency-Key", async () => {
      const { slot, accessToken } = await createBookingTestData();

      const response = await request(app)
        .post("/api/v1/consultations")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
          availabilitySlotId: slot.id,
        });

      expect(response.status).toBe(400);

      expect(response.body.error.code).toBe("IDEMPOTENCY_KEY_REQUIRED");
    });

    it("should return the same result for the same idempotency key", async () => {
      const { slot, accessToken } = await createBookingTestData();

      const firstResponse = await request(app)
        .post("/api/v1/consultations")
        .set("Authorization", `Bearer ${accessToken}`)
        .set("Idempotency-Key", "booking-idempotent-001")
        .send({
          availabilitySlotId: slot.id,
          reason: "Follow-up",
        });

      expect(firstResponse.status).toBe(201);

      const firstConsultationId = firstResponse.body.data.consultation.id;

      const secondResponse = await request(app)
        .post("/api/v1/consultations")
        .set("Authorization", `Bearer ${accessToken}`)
        .set("Idempotency-Key", "booking-idempotent-001")
        .send({
          availabilitySlotId: slot.id,
          reason: "Follow-up",
        });

      expect(secondResponse.status).toBe(200);

      expect(secondResponse.body.data.consultation.id).toBe(
        firstConsultationId,
      );

      const consultationCount = await prisma.consultation.count({
        where: {
          AvailabilitySlotId: slot.id,
        },
      });

      expect(consultationCount).toBe(1);
    });

    it("should not allow two patients to book the same slot", async () => {
      const { slot, accessToken: firstToken } = await createBookingTestData();

      const secondPatient = await prisma.user.create({
        data: {
          email: `second-patient-${Date.now()}@example.com`,
          passwordHash: "unused-test-password",
          role: "PATIENT",
          status: "ACTIVE",
        },
      });

      const secondToken = await import("../src/common/utils/jwt.js").then(
        ({ generateAccessToken }) =>
          generateAccessToken({
            userId: secondPatient.id,
            role: "PATIENT",
          }),
      );

      const [firstResponse, secondResponse] = await Promise.all([
        request(app)
          .post("/api/v1/consultations")
          .set("Authorization", `Bearer ${firstToken}`)
          .set("Idempotency-Key", "concurrent-booking-001")
          .send({
            availabilitySlotId: slot.id,
          }),

        request(app)
          .post("/api/v1/consultations")
          .set("Authorization", `Bearer ${secondToken}`)
          .set("Idempotency-Key", "concurrent-booking-002")
          .send({
            availabilitySlotId: slot.id,
          }),
      ]);

      const statuses = [firstResponse.status, secondResponse.status].sort();

      expect(statuses).toEqual([201, 409]);

      const consultations = await prisma.consultation.findMany({
        where: {
          AvailabilitySlotId: slot.id,
        },
      });

      expect(consultations.length).toBe(1);

      const slotAfter = await prisma.availabilitySlot.findUnique({
        where: {
          id: slot.id,
        },
      });

      expect(slotAfter?.isBooked).toBe(true);
    });

    it("should reject an already booked slot", async () => {
      const { slot, accessToken } = await createBookingTestData();

      await request(app)
        .post("/api/v1/consultations")
        .set("Authorization", `Bearer ${accessToken}`)
        .set("Idempotency-Key", "already-booked-001")
        .send({
          availabilitySlotId: slot.id,
        })
        .expect(201);

      const secondResponse = await request(app)
        .post("/api/v1/consultations")
        .set("Authorization", `Bearer ${accessToken}`)
        .set("Idempotency-Key", "already-booked-002")
        .send({
          availabilitySlotId: slot.id,
        });

      expect(secondResponse.status).toBe(409);

      expect(secondResponse.body.success).toBe(false);
    });
  });
});
