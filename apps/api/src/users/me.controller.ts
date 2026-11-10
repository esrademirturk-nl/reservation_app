import { Body, Controller, Get, Patch } from '@nestjs/common';
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator';
import { UpdateMeDto } from './dto';
import { toProfile, UsersService } from './users.service';

@Controller('me')
export class MeController {
  constructor(private readonly users: UsersService) {}

  /** GET /me — profile, language, budget and forwarding address */
  @Get()
  async get(@CurrentUser() me: AuthUser) {
    return toProfile(
      await this.users.findById(me.id),
      this.users.forwardDomain,
    );
  }

  @Patch()
  async update(@CurrentUser() me: AuthUser, @Body() dto: UpdateMeDto) {
    return toProfile(
      await this.users.update(me.id, dto),
      this.users.forwardDomain,
    );
  }

  /** GET /me/forward-address — the personal address to forward booking emails to */
  @Get('forward-address')
  async forwardAddress(@CurrentUser() me: AuthUser) {
    const u = await this.users.findById(me.id);
    return { forwardAddress: `${u.forwardAlias}@${this.users.forwardDomain}` };
  }
}
