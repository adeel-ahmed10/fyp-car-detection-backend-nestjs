import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { DatabaseClient } from 'src/clients/databaseClient';

@Injectable()
export class CameraService {
  dbClient: PrismaClient;
  constructor() {
    this.dbClient = DatabaseClient.dbClient;
  }

  async getCameras() {
    return this.dbClient.camera.findMany({
      where: {
        deletedAt: null,
      },
    });
  }
}
