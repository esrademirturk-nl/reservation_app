import { Module } from '@nestjs/common';
import { LakeJobs } from './lake-jobs';
import { LakeService } from './lake.service';

@Module({
  providers: [LakeService, LakeJobs],
  exports: [LakeService],
})
export class LakeModule {}
