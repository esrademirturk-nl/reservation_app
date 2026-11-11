import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { and, eq, isNull } from 'drizzle-orm';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { ConsentsService, type Purpose } from '../customer/consents.service';
import { EventsService } from '../customer/events.service';
import { DB, type Database } from '../db/db.module';
import { refreshTokens } from '../db/schema';
import type { Env } from '../config/env';
import { toProfile, UsersService, type UserRow } from '../users/users.service';
import { DUMMY_HASH, hashPassword, verifyPassword } from './password';

const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');
const INVALID = {
  code: 'INVALID_CREDENTIALS',
  message: 'Email or password is incorrect',
};

@Injectable()
export class AuthService {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService<Env, true>,
    private readonly consents: ConsentsService,
    private readonly events: EventsService,
  ) {}

  async register(input: {
    email: string;
    password: string;
    fullName: string;
    language?: 'en' | 'tr' | 'nl';
    /** choices from the sign-up screen; anything left out stays "not granted" */
    consents?: Partial<Record<Purpose, boolean>>;
  }) {
    const passwordHash = await hashPassword(input.password);
    // account, pseudonym, consent choices and the first event are saved together
    const user = await this.db.transaction(async (tx) => {
      const { consents, ...account } = input;
      const u = await this.users.create({ ...account, passwordHash }, tx);
      await this.events.customerKey(u.id, tx);
      if (consents) await this.consents.set(u.id, consents, 'onboarding', tx);
      await this.events.track(tx, u.id, 'account_created', {
        language: u.language,
      });
      return u;
    });
    return this.session(user);
  }

  async login(email: string, password: string) {
    const user = await this.users.findByEmail(email);
    // always run a hash check so response time does not reveal whether the email exists
    const ok = await verifyPassword(
      user?.passwordHash ?? DUMMY_HASH,
      password,
    ).catch(() => false);
    if (!user || !user.passwordHash || !ok)
      throw new UnauthorizedException(INVALID);
    return this.session(user);
  }

  /** Rotates the refresh token. Re-using an old token revokes the whole family. */
  async refresh(token: string) {
    const row = await this.db.query.refreshTokens.findFirst({
      where: eq(refreshTokens.tokenHash, sha256(token)),
    });
    if (!row || row.revokedAt || row.expiresAt < new Date())
      throw new UnauthorizedException({
        code: 'REFRESH_INVALID',
        message: 'Please sign in again',
      });
    if (row.rotatedAt) {
      await this.revokeFamily(row.familyId);
      throw new UnauthorizedException({
        code: 'REFRESH_REUSED',
        message: 'Please sign in again',
      });
    }
    await this.db
      .update(refreshTokens)
      .set({ rotatedAt: new Date() })
      .where(eq(refreshTokens.id, row.id));
    return this.session(await this.users.findById(row.userId), row.familyId);
  }

  async logout(token: string) {
    const row = await this.db.query.refreshTokens.findFirst({
      where: eq(refreshTokens.tokenHash, sha256(token)),
    });
    if (row) await this.revokeFamily(row.familyId);
  }

  private revokeFamily(familyId: string) {
    return this.db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(
        and(
          eq(refreshTokens.familyId, familyId),
          isNull(refreshTokens.revokedAt),
        ),
      );
  }

  private async session(user: UserRow, familyId: string = randomUUID()) {
    const ttl = this.config.get('JWT_ACCESS_TTL', { infer: true });
    const accessToken = await this.jwt.signAsync(
      { sub: user.id, email: user.email, typ: 'access' },
      { expiresIn: ttl },
    );
    const refreshToken = randomBytes(32).toString('base64url');
    const days = this.config.get('REFRESH_TTL_DAYS', { infer: true });
    await this.db.insert(refreshTokens).values({
      userId: user.id,
      familyId,
      tokenHash: sha256(refreshToken),
      expiresAt: new Date(Date.now() + days * 86_400_000),
    });
    return {
      user: toProfile(user, this.users.forwardDomain),
      accessToken,
      refreshToken,
      expiresIn: ttl,
      tokenType: 'Bearer' as const,
    };
  }
}
