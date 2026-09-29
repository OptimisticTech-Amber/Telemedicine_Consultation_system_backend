process.env.NODE_ENV = "test";

process.env.PORT = "4000";

process.env.DATABASE_URL =
  "postgresql://postgres:postgres@localhost:5432/telemedicine_test?schema=public";

process.env.JWT_ACCESS_SECRET = "telemedicine@987654321";

process.env.JWT_ACCESS_EXPIRES_IN = "15m";

process.env.BCRYPT_SALT_ROUNDS = "12";

process.env.REFRESH_TOKEN_EXPIRES_DAYS = "7";

process.env.CORS_ORIGINS = "http://localhost:3000";

process.env.RAZORPAY_KEY_ID = "rzp_test_dummy";

process.env.RAZORPAY_KEY_SECRET = "test-razorpay-secret";

process.env.RAZORPAY_WEBHOOK_SECRET = "test-webhook-secret";
