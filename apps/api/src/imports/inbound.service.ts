import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { and, eq, isNotNull, isNull } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import type { Env } from '../config/env';
import { DB, type Database } from '../db/db.module';
import { inboundEmails, users, verifiedSenders } from '../db/schema';
import { Storage } from '../storage/storage';
import { ImportQueue } from './import-queue';
import { ImportsService } from './imports.service';
import { htmlToText } from './text';

/** Provider-neutral email payload (SendGrid, Postmark, Mailgun … are mapped to this by a thin adapter). */
const emailSchema = z.object({
  to: z.string().min(3).max(500),
  from: z.string().min(3).max(500),
  subject: z.string().max(1000).optional(),
  text: z.string().max(2_000_000).optional(),
  html: z.string().max(5_000_000).optional(),
  attachments: z
    .array(
      z.object({
        filename: z.string().max(200),
        contentType: z.string().max(100),
        content: z.string().max(30_000_000),
      }),
    )
    .max(10)
    .default([]),
});

/** "Esra <ESRA@in.waypad.app>, other@x.com" → ["esra@in.waypad.app", "other@x.com"] */
export const addresses = (s: string) =>
  [...s.matchAll(/[^\s<>,;"]+@[^\s<>,;"]+/g)].map((m) => m[0].toLowerCase());

@Injectable()
export class InboundService {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly config: ConfigService<Env, true>,
    private readonly storage: Storage,
    private readonly imports: ImportsService,
    private readonly queue: ImportQueue,
  ) {}

  async receive(raw: unknown) {
    const parsed = emailSchema.safeParse(raw);
    if (!parsed.success)
      throw new BadRequestException({
        code: 'BAD_EMAIL',
        message: 'Unreadable email payload',
        details: parsed.error.issues,
      });
    const mail = parsed.data;

    // which Waypad user is this for? (the alias before @in.waypad.app)
    const domain = `@${this.config.get('FORWARD_DOMAIN', { infer: true })}`;
    const alias = addresses(mail.to)
      .find((a) => a.endsWith(domain))
      ?.slice(0, -domain.length);
    const user = alias
      ? await this.db.query.users.findFirst({
          where: and(eq(users.forwardAlias, alias), isNull(users.deletedAt)),
        })
      : undefined;
    // unknown address: accept and drop, so the webhook does not reveal which aliases exist
    if (!user) return { status: 'ignored' };

    // only the user's own address (or one they verified) may add bookings to their account
    const from = addresses(mail.from)[0] ?? '';
    const allowed =
      from === user.email ||
      !!(await this.db.query.verifiedSenders.findFirst({
        where: and(
          eq(verifiedSenders.userId, user.id),
          eq(verifiedSenders.email, from),
          isNotNull(verifiedSenders.verifiedAt),
        ),
      }));

    const rawBlobPath = `users/${user.id}/emails/${randomUUID()}.json`;
    await this.storage.put(rawBlobPath, Buffer.from(JSON.stringify(mail)));
    const [email] = await this.db
      .insert(inboundEmails)
      .values({
        userId: user.id,
        fromAddress: from.slice(0, 320),
        subject: mail.subject,
        rawBlobPath,
        accepted: allowed,
      })
      .returning();
    if (!allowed) return { status: 'rejected_sender' };

    const hint = `Email from ${mail.from}${mail.subject ? `, subject: ${mail.subject}` : ''}`;
    const docs = [];
    const body = mail.text ?? (mail.html ? htmlToText(mail.html) : '');
    if (body.trim())
      docs.push(
        await this.imports.addDocument({
          userId: user.id,
          data: Buffer.from(body),
          declaredType: 'text/plain',
          fileName: mail.subject,
          kind: 'email_body',
          inboundEmailId: email.id,
        }),
      );
    for (const a of mail.attachments.filter((x) =>
      /pdf|image\//i.test(x.contentType),
    )) {
      try {
        docs.push(
          await this.imports.addDocument({
            userId: user.id,
            data: Buffer.from(a.content, 'base64'),
            declaredType: a.contentType,
            fileName: a.filename,
            kind: 'email_attachment',
            inboundEmailId: email.id,
          }),
        );
      } catch {
        // an attachment that is not really a PDF/image is skipped, the rest of the email still counts
      }
    }
    for (const d of docs) await this.queue.enqueue(d.id, hint);
    return { status: 'accepted', documents: docs.map((d) => d.id) };
  }
}
