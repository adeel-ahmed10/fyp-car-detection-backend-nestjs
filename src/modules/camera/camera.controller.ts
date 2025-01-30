import { Controller, Get, UseGuards } from '@nestjs/common';
import { CameraService } from './camera.service';
import { JwtAuthGuard } from 'src/guards/jwt-auth-guard';

@Controller('camera')
export class CameraController {
  constructor(private cameraService: CameraService) {}

  @Get('/cameras')
  @UseGuards(JwtAuthGuard)
  async getCameras() {
    return this.cameraService.getCameras();
  }
}
