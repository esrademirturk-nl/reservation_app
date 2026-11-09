import { hash, verify } from '@node-rs/argon2';

/** Argon2id with the library defaults (memory-hard; recommended by OWASP). */
export const hashPassword = (password: string) => hash(password);
export const verifyPassword = (hashed: string, password: string) =>
  verify(hashed, password);

/** Used when the email does not exist, so a failed login takes the same time either way. */
export const DUMMY_HASH =
  '$argon2id$v=19$m=19456,t=2,p=1$c29tZXNhbHRzb21lc2FsdA$5wz5Ckq4hBfDqpcdqwI5qjbB2l6Bn4RQd0d5nyT2GW8';
