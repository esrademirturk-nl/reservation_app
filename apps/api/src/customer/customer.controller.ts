import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Put,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator';
import { ConsentsService, CONSENT_TEXT_VERSION } from './consents.service';
import { TrackEventsDto, UpdateConsentsDto, UpdatePreferencesDto } from './dto';
import { EventsService } from './events.service';
import { PreferencesService } from './preferences.service';
import { CLIENT_EVENTS, TRACKING_PLAN, type EventName } from './tracking-plan';

@Controller()
export class CustomerController {
  constructor(
    private readonly consents: ConsentsService,
    private readonly preferences: PreferencesService,
    private readonly events: EventsService,
  ) {}

  /** GET /me/consents — the four choices, and which privacy text version they refer to */
  @Get('me/consents')
  async getConsents(@CurrentUser() me: AuthUser) {
    return {
      textVersion: CONSENT_TEXT_VERSION,
      consents: await this.consents.current(me.id),
    };
  }

  /** PUT /me/consents — { consents: { personalisation: true, marketing: false }, source: "settings" } */
  @Put('me/consents')
  async setConsents(
    @CurrentUser() me: AuthUser,
    @Body() dto: UpdateConsentsDto,
  ) {
    return {
      textVersion: CONSENT_TEXT_VERSION,
      consents: await this.consents.set(
        me.id,
        { ...dto.consents },
        dto.source ?? 'settings',
      ),
    };
  }

  @Get('me/preferences')
  getPreferences(@CurrentUser() me: AuthUser) {
    return this.preferences.get(me.id);
  }

  /** PUT /me/preferences — partial update; the first call counts as finishing onboarding */
  @Put('me/preferences')
  setPreferences(
    @CurrentUser() me: AuthUser,
    @Body() dto: UpdatePreferencesDto,
  ) {
    return this.preferences.update(me.id, dto);
  }

  /**
   * POST /events — usage events from the apps (batched, max 50).
   * Dropped silently (accepted: 0) when the user has not allowed product analytics.
   */
  @Post('events')
  @HttpCode(202)
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  async track(@CurrentUser() me: AuthUser, @Body() dto: TrackEventsDto) {
    const now = Date.now();
    const problems: string[] = [];
    for (const [i, e] of dto.events.entries()) {
      const at = Date.parse(e.occurredAt);
      if (!CLIENT_EVENTS.includes(e.name as EventName))
        problems.push(`events[${i}]: unknown event "${e.name}"`);
      else if (
        !TRACKING_PLAN[e.name as EventName].schema.safeParse(e.properties ?? {})
          .success
      )
        problems.push(`events[${i}]: invalid properties for ${e.name}`);
      if (at > now + 5 * 60_000 || at < now - 7 * 86_400_000)
        problems.push(
          `events[${i}]: occurredAt must be within the last 7 days`,
        );
    }
    if (problems.length)
      throw new BadRequestException({
        code: 'INVALID_EVENTS',
        message: 'Some events are not valid',
        details: problems,
      });

    let accepted = 0;
    for (const e of dto.events) {
      const ok = await this.events.track(
        undefined,
        me.id,
        e.name as EventName,
        (e.properties ?? {}) as never,
        {
          app: dto.app,
          appVersion: dto.appVersion,
          locale: dto.locale,
          sessionId: dto.sessionId,
        },
        new Date(e.occurredAt),
      );
      if (!ok) break; // no consent: drop the whole batch
      accepted++;
    }
    return { accepted, dropped: dto.events.length - accepted };
  }
}
