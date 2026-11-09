import { validateEnv } from './env';

describe('validateEnv', () => {
  const base = {
    DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/waypad',
  };

  it('applies defaults', () => {
    expect(validateEnv(base)).toMatchObject({
      NODE_ENV: 'development',
      PORT: 3000,
    });
  });

  it('coerces PORT from a string', () => {
    expect(validateEnv({ ...base, PORT: '8080' }).PORT).toBe(8080);
  });

  it('rejects a missing or non-Postgres DATABASE_URL with a readable message', () => {
    expect(() => validateEnv({})).toThrow(/DATABASE_URL/);
    expect(() => validateEnv({ DATABASE_URL: 'mysql://localhost/db' })).toThrow(
      /DATABASE_URL/,
    );
  });
});
