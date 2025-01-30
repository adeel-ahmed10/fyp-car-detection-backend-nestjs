import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { DatabaseClient } from 'src/clients/databaseClient';
import { DetectCarArgs } from './models/input.model';

@Injectable()
export class CarService {
  dbClient: PrismaClient;
  constructor() {
    this.dbClient = DatabaseClient.dbClient;
  }

  async DetectCar(input: DetectCarArgs) {
    console.log('Input is ', input);
    const car = await this.dbClient.car.findFirst({
      where: {
        deletedAt: null,
        ...input,
      },
    });
    if (!car) {
      const createdCar = await this.dbClient.car.create({
        data: {
          ...input,
        },
      });
      return createdCar?.carId;
    }
    return car?.carId;
  }
}
