import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsLatitude,
  IsLongitude,
  IsOptional,
  Matches,
} from 'class-validator';
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator';
import { SuggestionFeedbackDto } from '../customer/dto';
import { FeedbackService } from './feedback.service';
import { PlacesService } from './places.service';
import { SuggestionsService } from './suggestions.service';

export class NearQuery {
  @IsOptional() @Type(() => Number) @IsLatitude() lat?: number;
  @IsOptional() @Type(() => Number) @IsLongitude() lon?: number;
  @IsOptional() @IsIn(['sight', 'museum', 'food', 'coffee', 'walk']) category?:
    'sight' | 'museum' | 'food' | 'coffee' | 'walk';
}
export class LangQuery {
  @IsOptional() @IsIn(['en', 'tr', 'nl']) lang?: 'en' | 'tr' | 'nl';
}
export class SuggestQuery {
  @IsOptional() @Matches(/^\d{4}-\d{2}-\d{2}$/) today?: string;
}

@Controller()
export class GuideController {
  constructor(
    private readonly places: PlacesService,
    private readonly suggestions: SuggestionsService,
    private readonly feedback: FeedbackService,
  ) {}

  /** GET /cities/:cityId/places?lat=41.89&lon=12.49&category=food — "Near me" */
  @Get('cities/:cityId/places')
  near(@Param('cityId', ParseIntPipe) cityId: number, @Query() q: NearQuery) {
    return this.places.list(cityId, q);
  }

  /** GET /places/:id?lang=tr — place detail and audio guide (falls back to English) */
  @Get('places/:id')
  place(
    @CurrentUser() me: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Query() q: LangQuery,
  ) {
    return this.places.detail(id, q.lang ?? 'en');
  }

  /** GET /trips/:id/suggestions — fix your trip, fill your free time, don't miss */
  @Get('trips/:id/suggestions')
  suggest(
    @CurrentUser() me: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Query() q: SuggestQuery,
  ) {
    return this.suggestions.forTrip(id, me.id, q.today);
  }

  /** POST /trips/:id/suggestions/feedback — shown / accepted / dismissed / "not for me" */
  @Post('trips/:id/suggestions/feedback')
  @HttpCode(201)
  giveFeedback(
    @CurrentUser() me: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SuggestionFeedbackDto,
  ) {
    return this.feedback.record(id, me.id, dto);
  }
}
