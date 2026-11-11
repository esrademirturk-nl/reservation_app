import {
  BadRequestException,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator';
import { ImportQueue } from './import-queue';
import { ImportsService } from './imports.service';

@Controller('imports')
export class ImportsController {
  constructor(
    private readonly imports: ImportsService,
    private readonly queue: ImportQueue,
  ) {}

  /**
   * POST /imports (multipart, field "file") — PDF, photo, .eml or text.
   * Answers 202 right away; poll GET /imports/:id until status is "parsed" or "failed".
   */
  @Post()
  @HttpCode(202)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @CurrentUser() me: AuthUser,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file)
      throw new BadRequestException({
        code: 'FILE_REQUIRED',
        message: 'Attach a file in the "file" field',
      });
    const doc = await this.imports.addDocument({
      userId: me.id,
      data: file.buffer,
      declaredType: file.mimetype,
      fileName: file.originalname,
      kind: 'upload',
    });
    await this.queue.enqueue(doc.id);
    return this.imports.status(doc.id, me.id);
  }

  /** GET /imports — the latest 20 imports with what was found */
  @Get()
  list(@CurrentUser() me: AuthUser) {
    return this.imports.list(me.id);
  }

  @Get(':id')
  get(@CurrentUser() me: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.imports.status(id, me.id);
  }
}
