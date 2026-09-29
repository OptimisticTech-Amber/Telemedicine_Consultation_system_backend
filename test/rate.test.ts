import express from "express";
import request from "supertest";

import { authRateLimiter } from "../src/common/middleware/rateLimit.js";
import { describe, it } from "@jest/globals";
import assert from "node:assert/strict";

const createTestApp = () => {
  const app = express();

  app.use(express.json());

  app.post("/login", authRateLimiter, (_req, res) => {
    return res.status(200).json({
      success: true,
    });
  });

  return app;
};

describe("Authentication rate limiter", () => {
  it("should allow requests below the limit", async () => {
    const app = createTestApp();

    const response = await request(app).post("/login").send({
      email: "test@example.com",
      password: "password123",
    });

    assert.strictEqual(response.status, 200);
  });

  it("should return 429 after the limit is exceeded", async () => {
    const app = createTestApp();

    for (let i = 0; i < 10; i++) {
      await request(app).post("/login").send({
        email: "test@example.com",
        password: "password123",
      });
    }

    const response = await request(app).post("/login").send({
      email: "test@example.com",
      password: "password123",
    });

    assert.strictEqual(response.status, 429);

    assert.deepStrictEqual(response.body, {
      success: false,
      error: {
        code: "AUTH_RATE_LIMIT_EXCEEDED",
        message: "Too many authentication attempts. Please try again later.",
      },
    });
  });
});
