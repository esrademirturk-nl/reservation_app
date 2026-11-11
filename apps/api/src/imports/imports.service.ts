import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { and, desc, eq, inArray, isNull, lt, ne } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { toPgDateTime } from '../common/dates';
import { DB, type Database } from '../db/db.module';
import { inboundEmails, reservations, sourceDocuments } from '../db/schema';
import { Storage } from '../storage/storage';
import { matchTrip } from '../trips/planning';
import { toReservation } from '../trips/serialize';
import { TripsService } from '../trips/trips.service';
import {
  EXTRACTION_PROVIDER,
  type ExtractedBooking,
  type ExtractionProvider,
} from './extraction/types';
import { documentText, sniffMimeType } from './text';

type DocRow = typeof sourceDocuments.$inferSelect;
const EXT: Record<string, string> = {
  'application/pdf': 'pdf',
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'text/plain': 'txt',
  'text/html': 'html',
  'message/rfc822': 'eml',
};

@Injectable()
export class ImportsService {
  private readonly log = new Logger(ImportsService.name);

  constructor(
    @Inject(DB) private readonly db: Database,
    @Inject(EXTRACTION_PROVIDER) private readonly extractor: ExtractionProvider,
    private readonly storage: Storage,
    private readonly trips: TripsService,
  ) {}

  /** Stores a file and creates a document waiting to be read. */
  async addDocument(input: {
    userId: string;
    data: Buffer;
    declaredType: string;
    fileName?: string;
    kind: DocRow['kind'];
    inboundEmailId?: string;
  }) {
    const mimeType = sniffMimeType(
      input.data,
      input.declaredType,
      input.fileName,
    );
    if (!mimeType)
      throw new BadRequestException({
        code: 'UNSUPPORTED_FILE',
        message:
          'Upload a PDF, a photo (PNG, JPG, WebP), an email (.eml) or a text file',
      });
    const blobPath = `users/${input.userId}/documents/${randomUUID()}.${EXT[mimeType]}`;
    await this.storage.put(blobPath, input.data);
    const [doc] = await this.db
      .insert(sourceDocuments)
      .values({
        userId: input.userId,
        kind: input.kind,
        fileName: input.fileName?.slice(0, 200),
        blobPath,
        mimeType,
        inboundEmailId: input.inboundEmailId,
      })
      .returning();
    return doc;
  }

  /**
   * Reads one document and saves what it finds as reservations waiting for review.
   * Runs in the queue worker (or inline without Redis). Safe to retry.
   */
  async process(
    documentId: string,
    opts: { hint?: string; finalAttempt?: boolean } = {},
  ) {
    const { hint, finalAttempt = true } = opts;
    const doc = await this.db.query.sourceDocuments.findFirst({
      where: eq(sourceDocuments.id, documentId),
    });
    if (!doc || doc.status !== 'processing') return;
    try {
      const data = await this.storage.get(doc.blobPath);
      const text = await documentText(data, doc.mimeType);
      const found = await this.extractor.extract({
        text,
        file: { data, mimeType: doc.mimeType },
        hint: hint ?? doc.fileName ?? undefined,
      });
      if (!found.length)
        return await this.finish(
          doc.id,
          'failed',
          "We couldn't find a booking in this file",
        );
      await this.save(doc, found);
      await this.finish(doc.id, 'parsed', null);
    } catch (err) {
      this.log.error(`Import ${documentId} failed`, err as Error);
      // the queue retries a few times (e.g. the AI service was busy); only the last failure is shown
      if (!finalAttempt) throw err;
      await this.finish(
        doc.id,
        'failed',
        'Something went wrong while reading this file',
      );
    }
  }

  private finish(
    id: string,
    status: 'parsed' | 'failed',
    error: string | null,
  ) {
    return this.db
      .update(sourceDocuments)
      .set({
        status,
        error,
        extractor: this.extractor.name,
        processedAt: new Date(),
      })
      .where(eq(sourceDocuments.id, id));
  }

  private async save(doc: DocRow, found: ExtractedBooking[]) {
    const trips = await this.trips.writableTrips(doc.userId);
    const source =
      doc.kind !== 'upload' || doc.mimeType === 'message/rfc822'
        ? 'email'
        : doc.mimeType === 'application/pdf'
          ? 'pdf'
          : 'manual';
    for (const b of found) {
      const startAt = toPgDateTime(b.startAt);
      // the same booking forwarded twice is not added twice
      if (b.ref) {
        const dup = await this.db.query.reservations.findFirst({
          where: and(
            eq(reservations.userId, doc.userId),
            eq(reservations.ref, b.ref),
            eq(reservations.type, b.type),
            eq(reservations.startAt, startAt),
            isNull(reservations.deletedAt),
          ),
        });
        if (dup) continue;
      }
      const confidence = Object.fromEntries(
        Object.entries(b.confidence).filter(([, v]) => v !== 'high'),
      );
      await this.db.insert(reservations).values({
        userId: doc.userId,
        tripId: matchTrip(trips, b.startAt)?.id ?? null,
        sourceDocumentId: doc.id,
        type: b.type,
        title: b.title,
        provider: b.provider,
        source,
        startAt,
        endAt: b.endAt ? toPgDateTime(b.endAt) : null,
        location: b.location,
        ref: b.ref || '—',
        priceCents: b.priceCents ?? 0,
        currency: b.currency ?? 'EUR',
        guests: b.guests ?? 1,
        freeCancellationUntil: b.freeCancellationUntil,
        checkInOpens: b.checkInOpens,
        status: 'pending',
        fieldConfidence: Object.keys(confidence).length ? confidence : null,
      });
    }
  }

  async status(id: string, userId: string) {
    const doc = await this.db.query.sourceDocuments.findFirst({
      where: and(
        eq(sourceDocuments.id, id),
        eq(sourceDocuments.userId, userId),
      ),
      with: { reservations: true },
    });
    if (!doc)
      throw new NotFoundException({
        code: 'IMPORT_NOT_FOUND',
        message: 'Import not found',
      });
    return this.view(doc, doc.reservations);
  }

  async list(userId: string) {
    const docs = await this.db.query.sourceDocuments.findMany({
      where: eq(sourceDocuments.userId, userId),
      orderBy: desc(sourceDocuments.createdAt),
      limit: 20,
      with: { reservations: true },
    });
    return docs.map((d) => this.view(d, d.reservations));
  }

  private view(doc: DocRow, rs: (typeof reservations.$inferSelect)[]) {
    return {
      id: doc.id,
      kind: doc.kind,
      fileName: doc.fileName,
      mimeType: doc.mimeType,
      status: doc.status,
      error: doc.error,
      createdAt: doc.createdAt,
      processedAt: doc.processedAt,
      reservations: rs.filter((r) => !r.deletedAt).map(toReservation),
    };
  }

  /** Raw emails are kept 30 days, then deleted (privacy). Uploaded files stay as the user's documents. */
  async purgeExpired(now = new Date()) {
    const expired = await this.db
      .select()
      .from(inboundEmails)
      .where(
        and(lt(inboundEmails.purgeAt, now), ne(inboundEmails.rawBlobPath, '')),
      );
    if (!expired.length) return 0;
    const ids = expired.map((e) => e.id);
    const docs = await this.db
      .select()
      .from(sourceDocuments)
      .where(inArray(sourceDocuments.inboundEmailId, ids));
    for (const key of [
      ...expired.map((e) => e.rawBlobPath),
      ...docs.map((d) => d.blobPath),
    ].filter(Boolean))
      await this.storage.delete(key);
    await this.db
      .update(sourceDocuments)
      .set({ blobPath: '' })
      .where(inArray(sourceDocuments.inboundEmailId, ids));
    await this.db
      .update(inboundEmails)
      .set({ rawBlobPath: '' })
      .where(inArray(inboundEmails.id, ids));
    return expired.length;
  }
}
