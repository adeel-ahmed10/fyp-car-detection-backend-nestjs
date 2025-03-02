import {
  Body,
  Controller,
  Get,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { AppService } from './app.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import { AddDetectedCarRouteArgs, UploadVideoDto } from './modules/route/models/input.model';
import { RouteService } from './modules/route/route.service';

const execAsync = promisify(exec);

@Controller()
export class AppController {
  constructor(private readonly appService: AppService, private routeService: RouteService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('video', {
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, callback) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          callback(null, `${uniqueSuffix}-${file.originalname}`);
        },
      }),
    }),
  )
  async uploadVideo(@UploadedFile() file: Express.Multer.File, @Body() camera: UploadVideoDto) {
    const videoPath = path.resolve(file.path);

    // console.log('Absolute video path:', videoPath);
    // process.chdir('D:\\FYP data\\data - Copy');

    // Run the detection.py script
    try {
      const { stdout, stderr } = await execAsync(
        `python detection.py "${videoPath}"`
      );
      // console.log('Detection output:', stdout);
      const jsonStart = stdout.indexOf('===JSON_START===');
      const jsonEnd = stdout.indexOf('===JSON_END===');

      if (jsonStart === -1 || jsonEnd === -1) {
        throw new Error('Failed to extract JSON from Python script output');
      }

      const jsonString = stdout.slice(jsonStart + '===JSON_START==='.length, jsonEnd).trim();
      const features = JSON.parse(jsonString);
      const mergedResult = this.appService.mergeBestValues(features);

      const payload: AddDetectedCarRouteArgs = {
        numberPlate: mergedResult.numberPlate,
        model: mergedResult.model,
        color: mergedResult.color,
        direction: mergedResult.direction,
        cameraId: +camera?.cameraId,
      };
      console.log("Payload is ", payload);
      await this.routeService.addDetectedCarRoute(payload);
        // console.log('Car Feature is === ', features);
      } catch (error) {
        console.error('Error running detection script:', error);
        throw new Error('Failed to process video');
      }
  }
}
