import request from "supertest";
import assert from "node:assert/strict";
import { describe, it } from "@jest/globals";
import { app } from "../src/server.js";

describe("Health endpoint", () => {
  it("should return API health status", async () => {
    const response = await request(app)
      .get("/health")
      .expect("Content-Type", /json/)
      .expect(200);

    assert.deepStrictEqual(response.body, {
      status: "ok",
      service: "Telemedicine-backend",
    });
  });
});
