// e2e tests run against a separate database so they never touch development data
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  'postgresql://postgres:postgres@localhost:5432/waypad_test';
process.env.JWT_SECRET ??= 'test-only-secret-that-is-long-enough-1234567890';
// tests hammer the auth endpoints; rate limits are tested separately
process.env.THROTTLE_DISABLED ??= '1';
