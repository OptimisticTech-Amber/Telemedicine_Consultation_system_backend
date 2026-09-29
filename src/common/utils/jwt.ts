import jwt from "jsonwebtoken";
import type { UserRole } from "@prisma/client";
import type { SignOptions } from "jsonwebtoken";

export interface AccessTokenPayload {
  userId: string;
  role: UserRole;
}

export const generateAccessToken = (payload: AccessTokenPayload): string => {
  return jwt.sign(payload, process.env.JWT_ACCESS_SECRET!, {
    expiresIn: process.env.JWT_ACCESS_EXPIRES_IN as SignOptions["expiresIn"],
  });
};

export const verifyAccessToken = (token: string): AccessTokenPayload => {
  return jwt.verify(
    token,
    process.env.JWT_ACCESS_SECRET!,
  ) as AccessTokenPayload;
};
