import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsISO8601,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class ConsentChoicesDto {
  @IsOptional() @IsBoolean() product_analytics?: boolean;
  @IsOptional() @IsBoolean() personalisation?: boolean;
  @IsOptional() @IsBoolean() marketing?: boolean;
  @IsOptional() @IsBoolean() ai_processing?: boolean;
}

export class UpdateConsentsDto {
  @ValidateNested() @Type(() => ConsentChoicesDto) consents!: ConsentChoicesDto;
  @IsOptional() @IsIn(['onboarding', 'settings', 'banner']) source?:
    'onboarding' | 'settings' | 'banner';
}

export const INTERESTS = [
  'food',
  'museums',
  'history',
  'art',
  'architecture',
  'nature',
  'nightlife',
  'shopping',
  'local_life',
  'family',
] as const;

export class UpdatePreferencesDto {
  /** 1 = €, 2 = €€, 3 = €€€ (stored on the user) */
  @IsOptional() @IsInt() @Min(1) @Max(3) budgetLevel?: number;
  @IsOptional() @IsIn(['relaxed', 'balanced', 'packed']) pace?:
    'relaxed' | 'balanced' | 'packed';
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsIn(INTERESTS, { each: true })
  interests?: (typeof INTERESTS)[number][];
  @IsOptional() @IsIn(['solo', 'couple', 'friends', 'family']) travelParty?:
    'solo' | 'couple' | 'friends' | 'family';
  @IsOptional()
  @Matches(/^[A-Z]{3}$/, {
    message: 'homeAirport must be an IATA code like AMS',
  })
  homeAirport?: string;
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @Length(1, 60, { each: true })
  preferredProviders?: string[];
  @IsOptional() @IsIn(['window', 'aisle', 'none']) seat?:
    'window' | 'aisle' | 'none';
}

export class ClientEventDto {
  @IsString() @Length(1, 64) name!: string;
  @IsISO8601() occurredAt!: string;
  @IsOptional() @IsObject() properties?: Record<string, unknown>;
}

export class TrackEventsDto {
  @IsIn(['web', 'ios', 'android']) app!: 'web' | 'ios' | 'android';
  @IsOptional() @IsString() @Length(1, 20) appVersion?: string;
  @IsOptional() @IsIn(['en', 'tr', 'nl']) locale?: string;
  @IsOptional() @IsUUID() sessionId?: string;
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => ClientEventDto)
  events!: ClientEventDto[];
}

export class SuggestionFeedbackDto {
  /** a place id or a gap key such as "gap-stay-2026-11-15" */
  @IsString() @Length(1, 100) itemRef!: string;
  @IsIn(['shown', 'accepted', 'dismissed', 'not_for_me']) action!:
    'shown' | 'accepted' | 'dismissed' | 'not_for_me';
  @IsString() @Length(1, 40) section!: string;
  @IsOptional() @IsInt() @Min(0) @Max(100) rankPosition?: number;
}
