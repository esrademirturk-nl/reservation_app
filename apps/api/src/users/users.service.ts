import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { and, eq, isNull, like } from 'drizzle-orm';
import { DB, type Database, type Executor } from '../db/db.module';
import { users } from '../db/schema';
import type { Env } from '../config/env';

export type UserRow = typeof users.$inferSelect;

/** Public view of a user — never includes the password hash. */
export const toProfile = (u: UserRow, forwardDomain: string) => ({
  id: u.id,
  email: u.email,
  fullName: u.fullName,
  language: u.language,
  budgetLevel: u.budgetLevel,
  homeCity: u.homeCity,
  forwardAddress: `${u.forwardAlias}@${forwardDomain}`,
  createdAt: u.createdAt,
});

/** "Esra Demirtürk" → "esra"; only a–z and 0–9, 3–20 characters. */
export const aliasBase = (fullName: string, email: string) => {
  const ascii = (s: string) =>
    s
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/ı/g, 'i')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');
  const first = ascii(fullName.split(/\s+/)[0] ?? '');
  const base = first.length >= 3 ? first : ascii(email.split('@')[0]);
  return (base || 'traveller').slice(0, 20).padEnd(3, '0');
};

@Injectable()
export class UsersService {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly config: ConfigService<Env, true>,
  ) {}

  get forwardDomain() {
    return this.config.get('FORWARD_DOMAIN', { infer: true });
  }

  findByEmail(email: string) {
    return this.db.query.users.findFirst({
      where: and(eq(users.email, email), isNull(users.deletedAt)),
    });
  }

  async findById(id: string) {
    const u = await this.db.query.users.findFirst({
      where: and(eq(users.id, id), isNull(users.deletedAt)),
    });
    if (!u)
      throw new NotFoundException({
        code: 'USER_NOT_FOUND',
        message: 'Account not found',
      });
    return u;
  }

  /** First free alias: esra, esra2, esra3 … */
  async uniqueAlias(base: string) {
    const taken = new Set(
      (
        await this.db
          .select({ a: users.forwardAlias })
          .from(users)
          .where(like(users.forwardAlias, `${base}%`))
      ).map((r) => r.a),
    );
    if (!taken.has(base)) return base;
    for (let i = 2; ; i++) if (!taken.has(`${base}${i}`)) return `${base}${i}`;
  }

  async create(
    input: {
      email: string;
      passwordHash: string;
      fullName: string;
      language?: 'en' | 'tr' | 'nl';
    },
    exec: Executor = this.db,
  ) {
    if (await this.findByEmail(input.email))
      throw new ConflictException({
        code: 'EMAIL_TAKEN',
        message: 'An account with this email already exists — try signing in',
      });
    const forwardAlias = await this.uniqueAlias(
      aliasBase(input.fullName, input.email),
    );
    const [u] = await exec
      .insert(users)
      .values({
        email: input.email,
        passwordHash: input.passwordHash,
        fullName: input.fullName.trim(),
        language: input.language ?? 'en',
        forwardAlias,
      })
      .returning();
    return u;
  }

  async update(
    id: string,
    patch: Partial<
      Pick<UserRow, 'fullName' | 'language' | 'budgetLevel' | 'homeCity'>
    >,
  ) {
    const [u] = await this.db
      .update(users)
      .set(patch)
      .where(eq(users.id, id))
      .returning();
    return u;
  }
}
