import {
  Body,
  Controller,
  Headers,
  HttpCode,
  Post,
  Req,
  ServiceUnavailableException,
  UnauthorizedException,
  type RawBodyRequest,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { Public } from '../auth/public.decorator';
import type { Env } from '../config/env';
import { InboundService } from './inbound.service';

/** "sha256=<hex>" over the raw request body, keyed with INBOUND_SECRET */
export const signInbound = (secret: string, body: Buffer | string) =>
  `sha256=${createHmac('sha256', secret).update(body).digest('hex')}`;

/**
 * Webhook for forwarded booking emails (esra@in.waypad.app → here).
 * The mail provider (or a small adapter in front of it) posts JSON and signs it.
 */
@Public()
@Controller('inbound')
export class InboundController {
  constructor(
    private readonly config: ConfigService<Env, true>,
    private readonly inbound: InboundService,
  ) {}

  @Post('email')
  @HttpCode(202)
  receive(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-waypad-signature') signature: string | undefined,
    @Body() body: unknown,
  ) {
    const secret = this.config.get('INBOUND_SECRET', { infer: true });
    if (!secret)
      throw new ServiceUnavailableException({
        code: 'INBOUND_DISABLED',
        message: 'Email import is not configured',
      });
    const expected = Buffer.from(signInbound(secret, req.rawBody ?? ''));
    const given = Buffer.from(signature ?? '');
    if (given.length !== expected.length || !timingSafeEqual(given, expected))
      throw new UnauthorizedException({
        code: 'BAD_SIGNATURE',
        message: 'Invalid signature',
      });
    return this.inbound.receive(body);
  }
}
