import type { Request, Response, NextFunction } from "express";
import {
  registerSchema,
  loginSchema
} from "./auth.validation.js";
import * as authService from "./auth.service.js";
import { refreshTokenCookieOptions } from "../../config/cookie.js";
import { AppError } from "../../common/errors/AppError.js";

export const register = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const input = registerSchema.parse(req.body);

    const result = await authService.register(input);
     res.cookie(
      "refreshToken",
      result.refreshToken,
      refreshTokenCookieOptions
    );
    res.status(201).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const input = loginSchema.parse(req.body);

    const result = await authService.login(input, {
      userAgent: req.get("user-agent"),
      ipAddress: req.ip,
    });

    res.cookie(
      "refreshToken",
      result.refreshToken,
      refreshTokenCookieOptions
    );

    res.status(200).json({
      success: true,
      data: {
        user: result.user,
        accessToken: result.accessToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const refresh = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      throw AppError(
        "Refresh token is required",
        401,
        "REFRESH_TOKEN_REQUIRED"
      );
    }

    const result = await authService.refresh(refreshToken, {
      userAgent: req.get("user-agent"),
      ipAddress: req.ip,
    });

    res.cookie(
      "refreshToken",
      result.refreshToken,
      refreshTokenCookieOptions
    );

    res.status(200).json({
      success: true,
      data: {
        user: result.user,
        accessToken: result.accessToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const logout = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (refreshToken) {
      await authService.logout(refreshToken);
    }

    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/api/v1/auth",
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};