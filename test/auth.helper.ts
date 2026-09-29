import { randomUUID } from "node:crypto";

export const createTestUser = () => {
  const id = randomUUID();

  return {
    firstName: "Jest",
    lastName: "User",
    email: `jest-${id}@example.com`,
    password: "TestPassword123!",
    phone: "9876543210",
    dateOfBirth: "2000-01-01T00:00:00.000Z",
  };
};
