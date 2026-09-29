import { randomUUID } from "node:crypto";

import { UserRole } from "@prisma/client";
import { prisma } from "../src/config/db.js";
import { generateAccessToken } from "../src/common/utils/jwt";

export const createBookingTestData = async () => {
  const patientId = randomUUID();
  const doctorUserId = randomUUID();
  const doctorId = randomUUID();
  const slotId = randomUUID();

  const patient = await prisma.user.create({
    data: {
      id: patientId,
      email: `patient-${patientId}@example.com`,
      passwordHash: "unused-test-password",
      role: UserRole.PATIENT,
      status: "ACTIVE",
    },
  });

  await prisma.user.create({
    data: {
      id: doctorUserId,
      email: `doctor-${doctorUserId}@example.com`,
      passwordHash: "unused-test-password",
      role: UserRole.DOCTOR,
      status: "ACTIVE",
    },
  });

  const doctor = await prisma.doctor.create({
    data: {
      id: doctorId,
      userId: doctorUserId,
      specialization: "Cardiology",
      licenseNumber: `LIC-${doctorId}`,
      consultationFee: 500,
      isVerified: true,
    },
  });

  const startTime = new Date(Date.now() + 24 * 60 * 60 * 1000);

  const endTime = new Date(startTime.getTime() + 30 * 60 * 1000);

  const slot = await prisma.availabilitySlot.create({
    data: {
      id: slotId,
      doctorId: doctor.id,
      startTime,
      endTime,
      isBooked: false,
    },
  });

  const accessToken = generateAccessToken({
    userId: patient.id,
    role: UserRole.PATIENT,
  });

  return {
    patient,
    doctor,
    slot,
    accessToken,
  };
};
