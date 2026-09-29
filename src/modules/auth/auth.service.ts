import { prisma } from "../../config/db.js";
import { AppError } from "../../common/errors/AppError.js";
import { hashPassword, comparePassword } from "../../common/utils/password.js";
import { generateAccessToken } from "../../common/utils/jwt.js";
import {
  createSession,
  getSessionByRefreshToken,
  revokeSession,
  rotateSession,
} from "./session.service.js";

interface RegisterInput {
  email: string;
  password: string;
  firstName: string;
  lastName?: string;
  phone?: string;
  dateOfBirth?: string;
}

interface LoginInput {
  email: string;
  password: string;
}

export const register = async (input: RegisterInput) => {
  const existingUser = await prisma.user.findUnique({
    where: {
      email: input.email,
    },
  });

  if (existingUser) {
    throw AppError("Email is already registered", 409, "EMAIL_ALREADY_EXISTS");
  }

  const passwordHash = await hashPassword(input.password);

  const user = await prisma.user.create({
    data: {
      email: input.email,
      passwordHash,

      profile: {
        create: {
          firstName: input.firstName,
          dateOfBirth: input.dateOfBirth ?? "",
          lastName: input.lastName ?? "",
          phone: input.phone ?? "",
        },
      },
    },
    include: {
      profile: true,
    },
  });
  const { sessionId, refreshToken } = await createSession(user.id);
  const accessToken = generateAccessToken({
    userId: user.id,
    role: user.role,
  });

  return {
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      profile: user.profile,
    },
    accessToken,
    refreshToken,
    sessionId,
  };
};

export const login = async (
  input: LoginInput,
  metadata?: {
    userAgent?: string;
    ipAddress?: string;
  },
) => {
  const user = await prisma.user.findUnique({
    where: {
      email: input.email,
    },
    include: {
      profile: true,
    },
  });

  // Don't reveal whether the email exists
  if (!user) {
    throw AppError("Invalid email or password", 401, "INVALID_CREDENTIALS");
  }

  const validPassword = await comparePassword(
    input.password,
    user.passwordHash,
  );

  if (!validPassword) {
    throw AppError("Invalid email or password", 401, "INVALID_CREDENTIALS");
  }

  if (user.status !== "ACTIVE") {
    throw AppError("Your account is not active", 403, "ACCOUNT_NOT_ACTIVE");
  }

  const accessToken = generateAccessToken({
    userId: user.id,
    role: user.role,
  });

  const { refreshToken } = await createSession(user.id, {
    userAgent: metadata?.userAgent,
    ipAddress: metadata?.ipAddress,
  });

  return {
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      profile: user.profile,
    },
    accessToken,
    refreshToken,
  };
};

export const refresh = async (
  refreshToken: string,
  metadata?: {
    userAgent?: string;
    ipAddress?: string;
  },
) => {
  const session = await getSessionByRefreshToken(refreshToken);

  const accessToken = generateAccessToken({
    userId: session.user.id,
    role: session.user.role,
  });

  const rotatedSession = await rotateSession(
    session.id,
    session.user.id,
    metadata,
  );
// only for testing purposes, I am exposing the rotated session's refresh token and access token along with the user details. In a real-world production ready application, we should not expose the refresh and access tokens in the response.
  return {
    user: {
      id: session.user.id,
      email: session.user.email,
      role: session.user.role,
      profile: session.user.profile,
    },
    accessToken,
    refreshToken: rotatedSession.refreshToken,
  };
};


export const logout = async (refreshToken: string) => {
  await revokeSession(refreshToken);
};