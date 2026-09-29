import { prisma } from "../../config/db.js";
import { generateRefreshToken, hashToken } from "../../common/utils/crypto.js";
import { AppError } from "../../common/errors/AppError.js";

// interface CreateSessionInput {
//   userId: string;
//   userAgent?: string;
//   ipAddress?: string;
// }

// export const createSession = async ({
//   userId,
//   userAgent,
//   ipAddress,
// }: CreateSessionInput) => {
//   const refreshToken = generateRefreshToken();
//   const refreshTokenHash = hashToken(refreshToken);

//   // refresh token expires in 7 days

//   const expiresAt = new Date(
//     Date.now() + 7 * 24 * 60 * 60 * 1000
//   );

//   const session = await prisma.session.create({
//     data: {
//       userId,
//       refreshTokenHash,
//       expiresAt,
//       userAgent,
//       ipAddress,
//     },
//   });

//   return {
//     sessionId: session.id,
//     refreshToken,
//   };
// };

// export const findSessionByRefreshToken = async (
//   refreshToken: string
// ) => {
//   const refreshTokenHash = hashToken(refreshToken);

//   const session = await prisma.session.findFirst({
//     where: {
//       refreshTokenHash,
//     },
//     include: {
//       user: {
//         include: {
//           profile: true,
//         },
//       },
//     },
//   });

//   if (!session) {
//     throw AppError(
//       "Invalid refresh token",
//       401,
//       "INVALID_REFRESH_TOKEN"
//     );
//   }

//   if (session.revokedAt) {
//     throw AppError(
//       "Refresh token has been revoked",
//       401,
//       "REFRESH_TOKEN_REVOKED"
//     );
//   }

//   if (session.expiresAt <= new Date()) {
//     throw AppError(
//       "Refresh token has expired",
//       401,
//       "REFRESH_TOKEN_EXPIRED"
//     );
//   }

//   return session;
// };

// export const rotateSession = async (
//   sessionId: string,
//   userId: string,
//   metadata?: {
//     userAgent?: string;
//     ipAddress?: string;
//   }
// ) => {
//   const newRefreshToken = generateRefreshToken();
//   const newRefreshTokenHash = hashToken(newRefreshToken);

//   const expiresAt = new Date(
//     Date.now() +
//       7 *
//         24 *
//         60 *
//         60 *
//         1000
//   );

//   const result = await prisma.$transaction(async (tx) => {
//     await tx.session.update({
//       where: {
//         id: sessionId,
//       },
//       data: {
//         revokedAt: new Date(),
//       },
//     });

//     const newSession = await tx.session.create({
//       data: {
//         userId,
//         refreshTokenHash: newRefreshTokenHash,
//         expiresAt,
//         userAgent: metadata?.userAgent,
//         ipAddress: metadata?.ipAddress,
//       },
//     });

//     return newSession;
//   });

//   return {
//     sessionId: result.id,
//     refreshToken: newRefreshToken,
//   };
// };

interface SessionMetadata {
  userAgent?: string;
  ipAddress?: string;
}

const getSessionExpiry = () => {
  return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
};

export const createSession = async (
  userId: string,
  metadata?: SessionMetadata,
) => {
  const refreshToken = generateRefreshToken();
  const refreshTokenHash = hashToken(refreshToken);

  const session = await prisma.session.create({
    data: {
      userId,
      refreshTokenHash,
      expiresAt: getSessionExpiry(),
      userAgent: metadata?.userAgent,
      ipAddress: metadata?.ipAddress,
    },
  });

  return {
    sessionId: session.id,
    refreshToken,
  };
};

export const getSessionByRefreshToken = async (refreshToken: string) => {
  const refreshTokenHash = hashToken(refreshToken);

  const session = await prisma.session.findFirst({
    where: {
      refreshTokenHash,
    },
    include: {
      user: {
        include: {
          profile: true,
        },
      },
    },
  });

  if (!session) {
    throw AppError("Invalid refresh token", 401, "INVALID_REFRESH_TOKEN");
  }

  if (session.revokedAt) {
    throw AppError(
      "Refresh token has been revoked",
      401,
      "REFRESH_TOKEN_REVOKED",
    );
  }

  if (session.expiresAt <= new Date()) {
    throw AppError("Refresh token has expired", 401, "REFRESH_TOKEN_EXPIRED");
  }

  if (session.user.status !== "ACTIVE") {
    throw AppError("User account is not active", 403, "ACCOUNT_NOT_ACTIVE");
  }

  return session;
};

export const rotateSession = async (
  sessionId: string,
  userId: string,
  metadata?: SessionMetadata,
) => {
  const newRefreshToken = generateRefreshToken();
  const newRefreshTokenHash = hashToken(newRefreshToken);

  const newSession = await prisma.$transaction(async (tx) => {
    await tx.session.update({
      where: {
        id: sessionId,
      },
      data: {
        revokedAt: new Date(),
        lastUsedAt: new Date(),
      },
    });

    return tx.session.create({
      data: {
        userId,
        refreshTokenHash: newRefreshTokenHash,
        expiresAt: getSessionExpiry(),
        userAgent: metadata?.userAgent,
        ipAddress: metadata?.ipAddress,
      },
    });
  });

  return {
    sessionId: newSession.id,
    refreshToken: newRefreshToken,
  };
};

export const revokeSession = async (refreshToken: string) => {
  const refreshTokenHash = hashToken(refreshToken);

  await prisma.session.updateMany({
    where: {
      refreshTokenHash,
      revokedAt: null,
    },
    data: {
      revokedAt: new Date(),
    },
  });
};
