import {
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { and, asc, eq } from 'drizzle-orm';
import { DB, type Database } from '../db/db.module';
import { cities, placeNarrations, places } from '../db/schema';
import { distanceM, walkMinutes } from './geo';
import {
  NARRATION_TRANSLATOR,
  type Language,
  type NarrationTranslator,
} from './translator';

type PlaceRow = typeof places.$inferSelect;
const GUIDE_OFF = {
  code: 'GUIDE_UNAVAILABLE',
  message: 'Near me and the audio guide are not available in this city yet',
};

export const toPlace = (p: PlaceRow, from?: { lat: number; lon: number }) => {
  const m = from ? distanceM(from, p) : null;
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    kind: p.kind,
    category: p.category,
    address: p.address,
    lat: p.lat,
    lon: p.lon,
    photoUrl: p.photoUrl,
    photoCredit: p.photoCredit,
    hours: p.hours,
    hoursNote: p.hoursNote,
    visitMinutes: p.visitMinutes,
    priceLevel: p.priceLevel,
    ...(m !== null ? { distanceM: m, walkMinutes: walkMinutes(m) } : {}),
  };
};

@Injectable()
export class PlacesService {
  private readonly log = new Logger(PlacesService.name);

  constructor(
    @Inject(DB) private readonly db: Database,
    @Optional()
    @Inject(NARRATION_TRANSLATOR)
    private readonly translator?: NarrationTranslator,
  ) {}

  private async guideCity(cityId: number) {
    const city = await this.db.query.cities.findFirst({
      where: eq(cities.id, cityId),
    });
    if (!city?.liveGuideEnabled) throw new NotFoundException(GUIDE_OFF);
    return city;
  }

  /** All places of a city; with a position, nearest first ("Near me"). */
  async list(
    cityId: number,
    opts: { lat?: number; lon?: number; category?: PlaceRow['category'] } = {},
  ) {
    await this.guideCity(cityId);
    const rows = await this.db
      .select()
      .from(places)
      .where(
        and(
          eq(places.cityId, cityId),
          opts.category ? eq(places.category, opts.category) : undefined,
        ),
      )
      .orderBy(asc(places.rank));
    const from =
      opts.lat !== undefined && opts.lon !== undefined
        ? { lat: opts.lat, lon: opts.lon }
        : undefined;
    const list = rows.map((p) => toPlace(p, from));
    return from ? list.sort((a, b) => a.distanceM! - b.distanceM!) : list;
  }

  cityPlaces(cityId: number) {
    return this.db
      .select()
      .from(places)
      .where(eq(places.cityId, cityId))
      .orderBy(asc(places.rank));
  }

  /** Place detail with its audio guide in the requested language (falls back to English) and 3 places nearby. */
  async detail(id: string, language: Language = 'en') {
    const place = await this.db.query.places.findFirst({
      where: eq(places.id, id),
      with: { narrations: true },
    });
    if (!place)
      throw new NotFoundException({
        code: 'PLACE_NOT_FOUND',
        message: 'Place not found',
      });
    await this.guideCity(place.cityId);

    let narration = place.narrations.find((n) => n.language === language);
    const english = place.narrations.find((n) => n.language === 'en');
    if (!narration && english && language !== 'en' && this.translator)
      narration = await this.translateAndCache(place, english, language);
    const used = narration ?? english;

    const neighbours = (await this.cityPlaces(place.cityId))
      .filter((p) => p.id !== place.id)
      .map((p) => toPlace(p, place))
      .sort((a, b) => a.distanceM! - b.distanceM!)
      .slice(0, 3);

    return {
      ...toPlace(place),
      audioGuide: used
        ? {
            language: used.language,
            requestedLanguage: language,
            fallback: used.language !== language,
            source: used.source,
            text: used.text,
            seconds: used.seconds,
          }
        : null,
      availableLanguages: place.narrations.map((n) => n.language),
      nearby: neighbours,
    };
  }

  /** AI translation, stored so it is only made once. Failures fall back to English. */
  private async translateAndCache(
    place: PlaceRow,
    english: typeof placeNarrations.$inferSelect,
    language: Language,
  ) {
    try {
      const text = await this.translator!.translate(
        english.text,
        language,
        place.name,
      );
      const [row] = await this.db
        .insert(placeNarrations)
        .values({
          placeId: place.id,
          language,
          text,
          seconds: english.seconds,
          source: 'ai',
        })
        .onConflictDoNothing()
        .returning();
      return (
        row ??
        (await this.db.query.placeNarrations.findFirst({
          where: and(
            eq(placeNarrations.placeId, place.id),
            eq(placeNarrations.language, language),
          ),
        }))
      );
    } catch (err) {
      this.log.warn(
        `Translation of ${place.slug} to ${language} failed: ${(err as Error).message}`,
      );
      return undefined;
    }
  }
}
