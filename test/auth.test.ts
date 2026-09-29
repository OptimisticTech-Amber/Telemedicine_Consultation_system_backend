import request from "supertest";

import { app } from "../src/server.js";

import { prisma } from "../src/config/db.js";

import { createTestUser } from "./auth.helper.js";
import { describe, it, beforeEach, afterAll, expect } from "@jest/globals";
describe("Authentication", () => {
  beforeEach(async () => {
    await prisma.session.deleteMany({
      where: {
        user: {
          email: {
            startsWith: "jest-",
          },
        },
      },
    });

    await prisma.profile.deleteMany({
      where: {
        user: {
          email: {
            startsWith: "jest-",
          },
        },
      },
    });

    await prisma.user.deleteMany({
      where: {
        email: {
          startsWith: "jest-",
        },
      },
    });
  });

  afterAll(async () => {
    await prisma.session.deleteMany({
      where: {
        user: {
          email: {
            startsWith: "jest-",
          },
        },
      },
    });

    await prisma.profile.deleteMany({
      where: {
        user: {
          email: {
            startsWith: "jest-",
          },
        },
      },
    });

    await prisma.user.deleteMany({
      where: {
        email: {
          startsWith: "jest-",
        },
      },
    });

    await prisma.$disconnect();
  });

  describe("POST /api/v1/auth/register", () => {
    it("should register a patient", async () => {
      const user = createTestUser();

      const response = await request(app)
        .post("/api/v1/auth/register")
        .send(user);

      expect(response.status).toBe(201);

      expect(response.body.success).toBe(true);

      expect(response.body.data).toBeDefined();
    });

    it("should reject invalid email", async () => {
      const user = createTestUser();

      const response = await request(app)
        .post("/api/v1/auth/register")
        .send({
          ...user,
          email: "invalid-email",
        });

      expect(response.status).toBe(400);

      expect(response.body.success).toBe(false);

      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("should reject a short password", async () => {
      const user = createTestUser();

      const response = await request(app)
        .post("/api/v1/auth/register")
        .send({
          ...user,
          password: "123",
        });

      expect(response.status).toBe(400);

      expect(response.body.success).toBe(false);

      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("should reject duplicate email", async () => {
      const user = createTestUser();

      const firstResponse = await request(app)
        .post("/api/v1/auth/register")
        .send(user);

      expect(firstResponse.status).toBe(201);

      const secondResponse = await request(app)
        .post("/api/v1/auth/register")
        .send(user);

      expect(secondResponse.status).toBe(409);
    });
  });

  describe("POST /api/v1/auth/login", () => {
    it("should login with valid credentials", async () => {
      const user = createTestUser();

      await request(app).post("/api/v1/auth/register").send(user).expect(201);

      const response = await request(app).post("/api/v1/auth/login").send({
        email: user.email,
        password: user.password,
      });

      expect(response.status).toBe(200);

      expect(response.body.success).toBe(true);

      expect(response.body.data.accessToken).toBeDefined();

      expect(response.headers["set-cookie"]).toBeDefined();
    });

    it("should reject an incorrect password", async () => {
      const user = createTestUser();

      await request(app).post("/api/v1/auth/register").send(user).expect(201);

      const response = await request(app).post("/api/v1/auth/login").send({
        email: user.email,
        password: "WrongPassword123!",
      });

      expect(response.status).toBe(401);

      expect(response.body.success).toBe(false);
    });

    it("should reject a nonexistent user", async () => {
      const user = createTestUser();

      const response = await request(app).post("/api/v1/auth/login").send({
        email: user.email,
        password: user.password,
      });

      expect(response.status).toBe(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe("Protected routes", () => {
    it("should reject a request without an access token", async () => {
      const response = await request(app).get("/api/v1/users/me");

      expect(response.status).toBe(401);

      expect(response.body.success).toBe(false);

      expect(response.body.error.code).toBe("UNAUTHORIZED");
    });

    it("should reject an invalid access token", async () => {
      const response = await request(app)
        .get("/api/v1/users/me")
        .set("Authorization", "Bearer invalid-token");

      expect(response.status).toBe(401);

      expect(response.body.success).toBe(false);

      expect(response.body.error.code).toBe("INVALID_TOKEN");
    });
  });

  describe("POST /api/v1/auth/refresh", () => {
    it("should refresh an access token using the refresh cookie", async () => {
      const user = createTestUser();

      const agent = request.agent(app);

      const registerResponse = await agent
        .post("/api/v1/auth/register")
        .send(user);

      expect(registerResponse.status).toBe(201);

      const loginResponse = await agent.post("/api/v1/auth/login").send({
        email: user.email,
        password: user.password,
      });

      expect(loginResponse.status).toBe(200);

      const refreshResponse = await agent.post("/api/v1/auth/refresh");

      expect(refreshResponse.status).toBe(200);

      expect(refreshResponse.body.success).toBe(true);

      expect(refreshResponse.body.data.accessToken).toBeDefined();
    });
  });
});
