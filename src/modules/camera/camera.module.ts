import { Module } from '@nestjs/common';
import { CameraController } from './camera.controller';
import { CameraService } from './camera.service';

@Module({
  controllers: [CameraController],
  exports: [CameraService],
  imports: [],
  providers: [CameraService],
})
export class CameraModule {}
