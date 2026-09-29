import { prisma } from "../../config/db.js";
import { AppError } from "../../common/errors/AppError.js";

interface BookConsultationInput {
  patientId: string;
  availabilitySlotId: string;
  reason?: string;
  idempotencyKey: string;
}

export const bookConsultation = async (input: BookConsultationInput) => {
  return prisma.$transaction(async (tx) => {
    // 1. Check idempotency
    const existingKey = await tx.idempotencyKey.findUnique({
      where: {
        userId_key: {
          userId: input.patientId,
          key: input.idempotencyKey,
        },
      },
    });

    if (existingKey) {
      return {
        status: 200,
        body: existingKey.responseBody,
      };
    }

    // 2. Lock the availability row
    const slots = await tx.$queryRaw<
      Array<{
        id: string;
        doctorId: string;
        startTime: Date;
        endTime: Date;
        isBooked: boolean;
      }>
    >`
      SELECT
        id,
        "doctorId",
        "startTime",
        "endTime",
        "isBooked"
      FROM "AvailabilitySlot"
      WHERE id = ${input.availabilitySlotId}
      FOR UPDATE
    `;

    const slot = slots[0];

    if (!slot) {
      throw AppError("Availability slot not found", 404, "SLOT_NOT_FOUND");
    }

    // 3. Check if already booked
    if (slot.isBooked) {
      throw AppError(
        "This consultation slot is already booked",
        409,
        "SLOT_ALREADY_BOOKED",
      );
    }

    // 4. Make sure slot is still in the future
    if (slot.startTime <= new Date()) {
      throw AppError(
        "This consultation slot is no longer available",
        409,
        "SLOT_EXPIRED",
      );
    }

    // 5. Lock slot by marking it booked
    await tx.availabilitySlot.update({
      where: {
        id: slot.id,
      },
      data: {
        isBooked: true,
      },
    });

    // 6. Create consultation
    const consultation = await tx.consultation.create({
      data: {
        patientId: input.patientId,
        doctorId: slot.doctorId,
        AvailabilitySlotId: slot.id,
        status: "SCHEDULED",
      },
    });

    const responseBody = {
      success: true,
      data: {
        consultation,
      },
    };

    // 7. Save idempotency result
    await tx.idempotencyKey.create({
      data: {
        key: input.idempotencyKey,
        userId: input.patientId,
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
};

export const getConsultationById = async (
  consultationId: string,
  userId: string,
) => {
  const consultation = await prisma.consultation.findUnique({
    where: {
      id: consultationId,
    },
    include: {
      doctor: {
        include: {
          user: {
            include: {
              profile: true,
            },
          },
        },
      },
      patient: {
        include: {
          profile: true,
        },
      },
      slot: true,
      prescription: true,
      payment: true,
    },
  });

  if (!consultation) {
    throw AppError("Consultation not found", 404, "CONSULTATION_NOT_FOUND");
  }

  const isPatient = consultation.patientId === userId;

  const isDoctor = consultation.doctor.userId === userId;

  if (!isPatient && !isDoctor) {
    throw AppError(
      "You do not have access to this consultation",
      403,
      "FORBIDDEN",
    );
  }

  return consultation;
};

export const startConsultation = async (
  consultationId: string,
  doctorUserId: string,
) => {
  const consultation = await prisma.consultation.findUnique({
    where: {
      id: consultationId,
    },
    include: {
      doctor: true,
    },
  });

  if (!consultation) {
    throw AppError("Consultation not found", 404, "CONSULTATION_NOT_FOUND");
  }

  if (consultation.doctor.userId !== doctorUserId) {
    throw AppError(
      "You are not the doctor for this consultation",
      403,
      "FORBIDDEN",
    );
  }

  if (consultation.status !== "SCHEDULED") {
    throw AppError(
      "Consultation cannot be started",
      409,
      "INVALID_CONSULTATION_STATE",
    );
  }

  return prisma.consultation.update({
    where: {
      id: consultationId,
    },
    data: {
      status: "IN_PROGRESS",
    },
  });
};

export const completeConsultation = async (
  consultationId: string,
  doctorUserId: string,
) => {
  const consultation = await prisma.consultation.findUnique({
    where: {
      id: consultationId,
    },
    include: {
      doctor: true,
    },
  });

  if (!consultation) {
    throw AppError("Consultation not found", 404, "CONSULTATION_NOT_FOUND");
  }

  if (consultation.doctor.userId !== doctorUserId) {
    throw AppError(
      "You are not the doctor for this consultation",
      403,
      "FORBIDDEN",
    );
  }

  if (consultation.status !== "IN_PROGRESS") {
    throw AppError(
      "Only an in-progress consultation can be completed",
      409,
      "INVALID_CONSULTATION_STATE",
    );
  }

  return prisma.consultation.update({
    where: {
      id: consultationId,
    },
    data: {
      status: "COMPLETED",
    },
  });
};

export const cancelConsultation = async (
  consultationId: string,
  userId: string,
) => {
  const consultation = await prisma.consultation.findUnique({
    where: {
      id: consultationId,
    },
    include: {
      doctor: true,
    },
  });

  if (!consultation) {
    throw AppError("Consultation not found", 404, "CONSULTATION_NOT_FOUND");
  }

  const isPatient = consultation.patientId === userId;

  const isDoctor = consultation.doctor.userId === userId;

  if (!isPatient && !isDoctor) {
    throw AppError(
      "You do not have access to this consultation",
      403,
      "FORBIDDEN",
    );
  }

  if (consultation.status !== "SCHEDULED") {
    throw AppError(
      "Only scheduled consultations can be cancelled",
      409,
      "INVALID_CONSULTATION_STATE",
    );
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.consultation.update({
      where: {
        id: consultationId,
      },
      data: {
        status: "CANCELLED",
      },
    });

    await tx.availabilitySlot.update({
      where: {
        id: consultation.AvailabilitySlotId,
      },
      data: {
        isBooked: false,
      },
    });

    return updated;
  });
};

interface CreatePrescriptionInput {
  consultationId: string;
  doctorUserId: string;
  diagnosis?: string;
  notes?: string;
  items: {
    medicineName: string;
    dosage: string;
    frequency: string;
    duration: string;
    instructions?: string;
  }[];
}

export const createPrescription = async (input: CreatePrescriptionInput) => {
  const consultation = await prisma.consultation.findUnique({
    where: {
      id: input.consultationId,
    },
    include: {
      doctor: true,
    },
  });

  if (!consultation) {
    throw AppError("Consultation not found", 404, "CONSULTATION_NOT_FOUND");
  }

  if (consultation.doctor.userId !== input.doctorUserId) {
    throw AppError(
      "You are not the doctor for this consultation",
      403,
      "FORBIDDEN",
    );
  }

  if (consultation.status !== "COMPLETED") {
    throw AppError(
      "Prescription can only be created after consultation is completed",
      409,
      "INVALID_CONSULTATION_STATE",
    );
  }

  const existing = await prisma.prescription.findUnique({
    where: {
      consultationId: input.consultationId,
    },
  });

  if (existing) {
    throw AppError(
      "Prescription already exists",
      409,
      "PRESCRIPTION_ALREADY_EXISTS",
    );
  }

  return prisma.prescription.create({
    data: {
      consultationId: input.consultationId,
      diagnosis: input.diagnosis,
      notes: input.notes,

      items: {
        create: input.items,
      },
    },

    include: {
      items: true,
    },
  });
};
