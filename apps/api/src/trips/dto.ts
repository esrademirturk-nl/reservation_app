import { Type } from 'class-transformer';
import {
  IsIn,
  IsUUID,
  IsInt,
  IsISO8601,
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsString,
  IsUrl,
  Length,
  Matches,
  Max,
  Min,
} from 'class-validator';

const DATE = /^\d{4}-\d{2}-\d{2}$/;

export class CreateTripDto {
  /** City name, e.g. "Rome" */
  @IsString()
  @Length(1, 80)
  city!: string;

  /** ISO 3166-1 alpha-2, e.g. "IT" */
  @Matches(/^[A-Za-z]{2}$/, {
    message: 'countryCode must be two letters, e.g. IT',
  })
  countryCode!: string;

  /** Only needed the first time a city is used */
  @IsOptional() @IsString() @Length(1, 80) country?: string;
  @IsOptional() @IsLatitude() lat?: number;
  @IsOptional() @IsLongitude() lon?: number;

  @Matches(DATE, { message: 'startDate must look like 2026-11-12' })
  @IsISO8601({ strict: true })
  startDate!: string;

  @Matches(DATE, { message: 'endDate must look like 2026-11-16' })
  @IsISO8601({ strict: true })
  endDate!: string;

  @IsOptional() @IsInt() @Min(1) @Max(20) travelers?: number;
  @IsOptional()
  @IsUrl({ protocols: ['https'], require_protocol: true })
  coverPhotoUrl?: string;
  @IsOptional() @IsString() @Length(1, 200) coverPhotoCredit?: string;
}

export class UpdateTripDto {
  @IsOptional() @Matches(DATE) @IsISO8601({ strict: true }) startDate?: string;
  @IsOptional() @Matches(DATE) @IsISO8601({ strict: true }) endDate?: string;
  @IsOptional() @IsInt() @Min(1) @Max(20) travelers?: number;
  @IsOptional()
  @IsUrl({ protocols: ['https'], require_protocol: true })
  coverPhotoUrl?: string;
  @IsOptional() @IsString() @Length(1, 200) coverPhotoCredit?: string;
}

export class ListTripsQuery {
  @IsOptional() @IsIn(['upcoming', 'past', 'all']) when?:
    'upcoming' | 'past' | 'all';
  /** Override "today" (YYYY-MM-DD) — used by the demo, whose story is set on 30 Oct 2026 */
  @IsOptional() @Matches(DATE) today?: string;
}

export class TodayQuery {
  @IsOptional() @Matches(DATE) today?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(20) limit?: number;
}

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

export class AddPlanItemDto {
  @Matches(DATE) @IsISO8601({ strict: true }) date!: string;
  /** optional when placeId is given (the place's name is used) */
  @IsOptional() @IsString() @Length(1, 200) title?: string;
  @IsOptional() @IsString() @Length(1, 200) subtitle?: string;
  @IsOptional()
  @Matches(TIME, { message: 'startTime must look like 17:30' })
  startTime?: string;
  @IsOptional()
  @Matches(TIME, { message: 'endTime must look like 18:00' })
  endTime?: string;
  @IsOptional() @IsUUID() placeId?: string;
}

export class UpdatePlanItemDto {
  @IsOptional() @IsString() @Length(1, 200) title?: string;
  @IsOptional() @IsString() @Length(1, 200) subtitle?: string;
  @IsOptional() @Matches(TIME) startTime?: string;
  @IsOptional() @Matches(TIME) endTime?: string;
}
