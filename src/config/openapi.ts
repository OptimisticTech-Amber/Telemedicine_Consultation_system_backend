export const openApiSpec = {
  openapi: "3.0.3",

  info: {
    title: "Amrutam Telemedicine API",
    version: "1.0.0",
    description:
      "Production-oriented REST API for users, doctors, consultations, prescriptions, payments and audit logs.",
  },

  servers: [
    {
      url: "http://localhost:4000",
      description: "Local development server",
    },
  ],

  tags: [
    {
      name: "Health",
      description: "API health checks",
    },
    {
      name: "Authentication",
      description: "User authentication and sessions",
    },
    {
      name: "Users",
      description: "Authenticated user operations",
    },
    {
      name: "Doctors",
      description: "Doctor and availability management",
    },
    {
      name: "Consultations",
      description: "Booking and consultation lifecycle",
    },
    {
      name: "Payments",
      description: "Razorpay payment operations",
    },
    {
      name: "Audit Logs",
      description: "Administrative audit logs",
    },
  ],

  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
    },

    schemas: {
      Error: {
        type: "object",

        properties: {
          success: {
            type: "boolean",
            example: false,
          },

          error: {
            type: "object",

            properties: {
              code: {
                type: "string",
                example: "VALIDATION_ERROR",
              },

              message: {
                type: "string",
                example: "Invalid request data",
              },
            },
          },
        },
      },

      RegisterRequest: {
        type: "object",

        required: [
          "email",
          "password",
          "phone",
          "dateOfBirth",
          "firstName",
          "lastName",
        ],

        properties: {
          email: {
            type: "string",
            format: "email",
            example: "patient@example.com",
          },

          password: {
            type: "string",
            format: "password",
            minLength: 8,
            example: "StrongPassword123!",
          },

          phone: {
            type: "string",
            example: "9876543210",
          },

          dateOfBirth: {
            type: "string",
            format: "date-time",
            example: "2000-01-01T00:00:00.000Z",
          },

          firstName: {
            type: "string",
            example: "Rahul",
          },

          lastName: {
            type: "string",
            example: "Sharma",
          },
        },
      },

      LoginRequest: {
        type: "object",

        required: [
          "email",
          "password",
        ],

        properties: {
          email: {
            type: "string",
            format: "email",
            example: "patient@example.com",
          },

          password: {
            type: "string",
            format: "password",
            example: "StrongPassword123!",
          },
        },
      },

      CreatePaymentRequest: {
        type: "object",

        required: [
          "consultationId",
        ],

        properties: {
          consultationId: {
            type: "string",
            format: "uuid",
          },
        },
      },

      VerifyPaymentRequest: {
        type: "object",

        required: [
          "razorpay_order_id",
          "razorpay_payment_id",
          "razorpay_signature",
        ],

        properties: {
          razorpay_order_id: {
            type: "string",
            example: "order_R1xxxxxxxx",
          },

          razorpay_payment_id: {
            type: "string",
            example: "pay_R1xxxxxxxx",
          },

          razorpay_signature: {
            type: "string",
            example: "a1b2c3d4...",
          },
        },
      },

      Payment: {
        type: "object",

        properties: {
          id: {
            type: "string",
            format: "uuid",
          },

          consultationId: {
            type: "string",
            format: "uuid",
          },

          amount: {
            type: "string",
            example: "500.00",
          },

          currency: {
            type: "string",
            example: "INR",
          },

          status: {
            type: "string",
            enum: [
              "PENDING",
              "SUCCESS",
              "FAILED",
              "REFUNDED",
            ],
          },

          provider: {
            type: "string",
            example: "RAZORPAY",
          },

          providerOrderId: {
            type: "string",
            example: "order_R1xxxxxxxx",
          },

          providerPaymentId: {
            type: "string",
            nullable: true,
            example: "pay_R1xxxxxxxx",
          },

          paidAt: {
            type: "string",
            format: "date-time",
            nullable: true,
          },
        },
      },
    },
  },

  paths: {
    "/health": {
      get: {
        tags: ["Health"],

        summary: "Check API health",

        responses: {
          "200": {
            description: "API is healthy",

            content: {
              "application/json": {
                example: {
                  success: true,
                  message:
                    "Amrutam API is healthy",
                },
              },
            },
          },
        },
      },
    },

    "/api/v1/auth/register": {
      post: {
        tags: ["Authentication"],

        summary: "Register a patient",

        requestBody: {
          required: true,

          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/RegisterRequest",
              },
            },
          },
        },

        responses: {
          "201": {
            description:
              "Patient registered successfully",
          },

          "400": {
            description:
              "Validation error",

            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/Error",
                },
              },
            },
          },

          "409": {
            description:
              "Email already exists",
          },
        },
      },
    },

    "/api/v1/auth/login": {
      post: {
        tags: ["Authentication"],

        summary: "Login user",

        requestBody: {
          required: true,

          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/LoginRequest",
              },
            },
          },
        },

        responses: {
          "200": {
            description:
              "Login successful",
          },

          "400": {
            description:
              "Invalid request",
          },

          "401": {
            description:
              "Invalid credentials",
          },

          "429": {
            description:
              "Authentication rate limit exceeded",
          },
        },
      },
    },

    "/api/v1/auth/refresh": {
      post: {
        tags: ["Authentication"],

        summary:
          "Refresh the access token",

        responses: {
          "200": {
            description:
              "Access token refreshed",
          },

          "401": {
            description:
              "Invalid, expired or revoked refresh token",
          },

          "429": {
            description:
              "Rate limit exceeded",
          },
        },
      },
    },

    "/api/v1/auth/logout": {
      post: {
        tags: ["Authentication"],

        summary: "Logout current session",

        security: [
          {
            bearerAuth: [],
          },
        ],

        responses: {
          "200": {
            description:
              "Logout successful",
          },

          "401": {
            description:
              "Authentication required",
          },
        },
      },
    },

    "/api/v1/users/me": {
      get: {
        tags: ["Users"],

        summary:
          "Get authenticated user profile",

        security: [
          {
            bearerAuth: [],
          },
        ],

        responses: {
          "200": {
            description:
              "Current user returned",
          },

          "401": {
            description:
              "Authentication required",
          },
        },
      },
    },

    "/api/v1/payments": {
      post: {
        tags: ["Payments"],

        summary:
          "Create a Razorpay payment order",

        description:
          "Creates a local payment record and a Razorpay order. The amount is calculated from the consultation's doctor fee on the server.",

        security: [
          {
            bearerAuth: [],
          },
        ],

        parameters: [
          {
            name: "Idempotency-Key",
            in: "header",

            required: true,

            schema: {
              type: "string",
              minLength: 8,
              maxLength: 100,
            },

            example:
              "payment-2026-000001",
          },
        ],

        requestBody: {
          required: true,

          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/CreatePaymentRequest",
              },
            },
          },
        },

        responses: {
          "201": {
            description:
              "Payment created",
          },

          "200": {
            description:
              "Existing idempotent payment returned",
          },

          "400": {
            description:
              "Invalid request or missing Idempotency-Key",
          },

          "403": {
            description:
              "User does not own the consultation",
          },

          "409": {
            description:
              "Consultation cannot be paid for",
          },

          "429": {
            description:
              "Payment rate limit exceeded",
          },
        },
      },
    },

    "/api/v1/payments/verify": {
      post: {
        tags: ["Payments"],

        summary:
          "Verify Razorpay Checkout signature",

        security: [
          {
            bearerAuth: [],
          },
        ],

        requestBody: {
          required: true,

          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/VerifyPaymentRequest",
              },
            },
          },
        },

        responses: {
          "200": {
            description:
              "Payment signature verified",
          },

          "400": {
            description:
              "Invalid request or signature",
          },

          "403": {
            description:
              "User does not own the payment",
          },

          "404": {
            description:
              "Payment not found",
          },
        },
      },
    },

    "/api/v1/payments/webhook": {
      post: {
        tags: ["Payments"],

        summary:
          "Receive Razorpay webhook",

        description:
          "Webhook requests are authenticated using the Razorpay webhook signature. JWT authentication is not used for this endpoint.",

        parameters: [
          {
            name: "X-Razorpay-Signature",
            in: "header",

            required: true,

            schema: {
              type: "string",
            },
          },
        ],

        requestBody: {
          required: true,

          content: {
            "application/json": {
              schema: {
                type: "object",
              },
            },
          },
        },

        responses: {
          "200": {
            description:
              "Webhook processed",
          },

          "400": {
            description:
              "Invalid webhook signature or payload",
          },

          "500": {
            description:
              "Raw webhook body unavailable",
          },
        },
      },
    },

    "/api/v1/audit-logs": {
      get: {
        tags: ["Audit Logs"],

        summary:
          "Get audit logs",

        security: [
          {
            bearerAuth: [],
          },
        ],

        parameters: [
          {
            name: "page",
            in: "query",

            schema: {
              type: "integer",
              minimum: 1,
              default: 1,
            },
          },

          {
            name: "limit",
            in: "query",

            schema: {
              type: "integer",
              minimum: 1,
              maximum: 100,
              default: 20,
            },
          },

          {
            name: "action",
            in: "query",

            schema: {
              type: "string",
            },
          },

          {
            name: "resource",
            in: "query",

            schema: {
              type: "string",
            },
          },
        ],

        responses: {
          "200": {
            description:
              "Paginated audit logs",
          },

          "401": {
            description:
              "Authentication required",
          },

          "403": {
            description:
              "Admin access required",
          },
        },
      },
    },
  },
} as const;