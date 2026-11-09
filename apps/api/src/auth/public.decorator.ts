import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC = 'isPublic';
/** Marks a route that does not need an access token (register, login, health …). */
export const Public = () => SetMetadata(IS_PUBLIC, true);
