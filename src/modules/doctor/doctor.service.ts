import { prisma } from "../../config/db.js";
import { AppError } from "../../common/errors/AppError.js";

interface CreateDoctorInput {
  userId: string;
  specialization: string;
  licenseNumber: string;
  bio?: string;
  consultationFee: number;
}

export const createDoctor = async (input: CreateDoctorInput) => {
  const user = await prisma.user.findUnique({
    where: {
      id: input.userId,
    },
  });

  if (!user) {
    throw AppError("User not found", 404, "USER_NOT_FOUND");
  }

  if (user.role !== "PATIENT") {
    throw AppError(
      "User cannot be converted to a doctor",
      409,
      "INVALID_USER_ROLE",
    );
  }

  const existingDoctor = await prisma.doctor.findFirst({
    where: {
      OR: [{ userId: input.userId }, { licenseNumber: input.licenseNumber }],
    },
  });

  if (existingDoctor) {
    throw AppError(
      "Doctor profile already exists",
      409,
      "DOCTOR_ALREADY_EXISTS",
    );
  }

  const doctor = await prisma.$transaction(async (tx) => {
    const updatedUser = await tx.user.update({
      where: {
        id: input.userId,
      },
      data: {
        role: "DOCTOR",
      },
    });

    const createdDoctor = await tx.doctor.create({
      data: {
        userId: updatedUser.id,
        specialization: input.specialization,
        licenseNumber: input.licenseNumber,
        bio: input.bio,
        consultationFee: input.consultationFee,
      },
      include: {
        user: {
          include: {
            profile: true,
          },
        },
      },
    });

    return createdDoctor;
  });

  return doctor;
};

interface CreateAvailabilityInput {
  doctorId: string;
  startTime: string;
  endTime: string;
}

export const createAvailability = async (input: CreateAvailabilityInput) => {
  const startTime = new Date(input.startTime);
  const endTime = new Date(input.endTime);

  if (startTime >= endTime) {
    throw AppError(
      "End time must be after start time",
      400,
      "INVALID_TIME_RANGE",
    );
  }

  if (startTime <= new Date()) {
    throw AppError(
      "Availability must be in the future",
      400,
      "INVALID_AVAILABILITY_TIME",
    );
  }

  const doctor = await prisma.doctor.findUnique({
    where: {
      id: input.doctorId,
    },
  });

  if (!doctor) {
    throw AppError("Doctor not found", 404, "DOCTOR_NOT_FOUND");
  }

  if (!doctor.isVerified) {
    throw AppError("Doctor is not verified", 403, "DOCTOR_NOT_VERIFIED");
  }

  const conflictingSlot = await prisma.availabilitySlot.findFirst({
    where: {
      doctorId: input.doctorId,
      startTime: {
        lt: endTime,
      },
      endTime: {
        gt: startTime,
      },
    },
  });

  if (conflictingSlot) {
    throw AppError(
      "This time overlaps with an existing availability slot",
      409,
      "AVAILABILITY_CONFLICT",
    );
  }

  return prisma.availabilitySlot.create({
    data: {
      doctorId: input.doctorId,
      startTime,
      endTime,
    },
  });
};
