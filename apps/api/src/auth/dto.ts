import { Transform, Type } from 'class-transformer';
import { ConsentChoicesDto } from '../customer/dto';
import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';

const lower = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

export class RegisterDto {
  @Transform(lower)
  @IsEmail({}, { message: 'Enter a valid email address' })
  @MaxLength(320)
  email!: string;

  @IsString()
  @Length(8, 128, { message: 'Password must be at least 8 characters' })
  @Matches(/\d/, { message: 'Password must contain at least one number' })
  password!: string;

  @IsString()
  @Length(1, 120)
  fullName!: string;

  @IsOptional()
  @IsIn(['en', 'tr', 'nl'])
  language?: 'en' | 'tr' | 'nl';

  /** sign-up choices, e.g. { product_analytics: true, personalisation: true } */
  @IsOptional()
  @ValidateNested()
  @Type(() => ConsentChoicesDto)
  consents?: ConsentChoicesDto;
}

export class LoginDto {
  @Transform(lower)
  @IsEmail()
  email!: string;

  @IsString()
  @MaxLength(128)
  password!: string;
}

export class RefreshDto {
  @IsString()
  @Length(20, 200)
  refreshToken!: string;
}
