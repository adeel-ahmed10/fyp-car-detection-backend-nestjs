import {
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

const execAsync = promisify(exec);

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

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
  async uploadVideo(@UploadedFile() file: Express.Multer.File) {
    const videoPath = file.path;

    // Run the detection.py script
    try {
      const { stdout, stderr } = await execAsync(
        `python3 detection.py ${videoPath}`,
      );
      console.log('Detection output:', stdout);

      // Parse the output (assuming stdout contains JSON)
      // const features = JSON.parse(stdout);

      // Save features to the database (you already have this implemented)
      // await this.saveToDatabase(features);

      return { message: 'Video processed successfully' };
    } catch (error) {
      console.error('Error running detection script:', error);
      throw new Error('Failed to process video');
    }
  }
}
