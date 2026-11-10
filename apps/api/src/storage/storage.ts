import { Global, Injectable, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve, sep } from 'node:path';
import type { Env } from '../config/env';

/**
 * File storage for uploads and raw emails. Files are addressed by a relative key
 * ("users/<id>/uploads/<uuid>.pdf"). This version writes to local disk; an Azure Blob
 * version only needs to implement the same three methods.
 */
export abstract class Storage {
  abstract put(key: string, data: Buffer): Promise<void>;
  abstract get(key: string): Promise<Buffer>;
  abstract delete(key: string): Promise<void>;
}

@Injectable()
export class LocalDiskStorage extends Storage {
  private readonly root: string;
  constructor(config: ConfigService<Env, true>) {
    super();
    this.root = resolve(config.get('STORAGE_DIR', { infer: true }));
  }

  /** Keys can never point outside the storage folder. */
  private path(key: string) {
    const p = resolve(join(this.root, key));
    if (!p.startsWith(this.root + sep))
      throw new Error(`Invalid storage key: ${key}`);
    return p;
  }

  async put(key: string, data: Buffer) {
    const p = this.path(key);
    await mkdir(dirname(p), { recursive: true });
    await writeFile(p, data);
  }
  get(key: string) {
    return readFile(this.path(key));
  }
  async delete(key: string) {
    await rm(this.path(key), { force: true });
  }
}

@Global()
@Module({
  providers: [{ provide: Storage, useClass: LocalDiskStorage }],
  exports: [Storage],
})
export class StorageModule {}
