import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';
import { bookingTypeEnum } from '../db/schema';

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const LOCAL_DATETIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;
const DT_MSG = {
  message: '$property must be a local date and time like 2026-11-12T08:40',
};
type BookingType = (typeof bookingTypeEnum.enumValues)[number];

class ReservationFields {
  @IsOptional() @IsString() @Length(1, 200) title?: string;
  @IsOptional() @IsString() @Length(1, 120) provider?: string;
  @IsOptional() @Matches(LOCAL_DATETIME, DT_MSG) startAt?: string;
  @IsOptional() @Matches(LOCAL_DATETIME, DT_MSG) endAt?: string | null;
  @IsOptional() @IsString() @Length(0, 300) location?: string;
  @IsOptional() @IsString() @Length(1, 64) ref?: string;
  @IsOptional() @IsInt() @Min(0) @Max(100_000_000) priceCents?: number;
  @IsOptional()
  @Matches(/^[A-Z]{3}$/, { message: 'currency must be a code like EUR' })
  currency?: string;
  @IsOptional() @IsBoolean() paid?: boolean;
  @IsOptional()
  @Matches(DATE)
  @IsISO8601({ strict: true })
  freeCancellationUntil?: string | null;
  @IsOptional() @Matches(DATE) @IsISO8601({ strict: true }) checkInOpens?:
    string | null;
  @IsOptional() @IsInt() @Min(1) @Max(50) guests?: number;
  @IsOptional() @IsBoolean() hasPass?: boolean;
}

export class CreateReservationDto extends ReservationFields {
  @IsIn(bookingTypeEnum.enumValues) type!: BookingType;
  @IsString() @Length(1, 200) declare title: string;
  @IsString() @Length(1, 120) declare provider: string;
  @Matches(LOCAL_DATETIME, DT_MSG) declare startAt: string;
  @IsString() @Length(1, 64) declare ref: string;

  /** Leave out to let Waypad pick the trip whose dates contain the booking */
  @IsOptional() @IsUUID() tripId?: string;
}

export class UpdateReservationDto extends ReservationFields {
  @IsOptional() @IsIn(bookingTypeEnum.enumValues) type?: BookingType;

  /** null moves the reservation to Unsorted */
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsUUID()
  tripId?: string | null;
}

export class ListReservationsQuery {
  @IsOptional() @IsUUID() tripId?: string;
  /** "true" → only reservations without a trip */
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  unsorted?: boolean;
  @IsOptional() @IsIn(['pending', 'confirmed', 'cancelled']) status?:
    'pending' | 'confirmed' | 'cancelled';
}
