import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
} from 'class-validator';

export class UpdateMeDto {
  @IsOptional()
  @IsString()
  @Length(1, 120)
  fullName?: string;

  @IsOptional()
  @IsIn(['en', 'tr', 'nl'])
  language?: 'en' | 'tr' | 'nl';

  /** 1 = €, 2 = €€, 3 = €€€ */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(3)
  budgetLevel?: number;

  @IsOptional()
  @IsString()
  @Length(1, 80)
  homeCity?: string;
}
