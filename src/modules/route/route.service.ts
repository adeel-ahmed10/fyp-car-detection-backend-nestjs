import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { CarService } from '../car/car.service';
import { DatabaseClient } from 'src/clients/databaseClient';
import {
  AddDetectedCarRouteArgs,
  CreateRouteArgs,
  GetRouteById,
  GetRoutesByFilterArgs,
} from './models/input.model';

@Injectable()
export class RouteService {
  dbClient: PrismaClient;
  constructor(private carService: CarService) {
    this.dbClient = DatabaseClient.dbClient;
  }

  async createRoute(input: CreateRouteArgs) {
    await this.dbClient.route.create({
      data: {
        ...input,
        timeStamp: new Date(),
      },
    });
  }

  async addDetectedCarRoute(input: AddDetectedCarRouteArgs): Promise<boolean> {
    const carId = await this.carService.DetectCar({
      color: input.color,
      model: input.model,
      numberPlate: input.numberPlate,
    });
    // This will return the car doesn't matter if car exist in sys or not

    const camera = await this.dbClient.camera.findFirst({
      where: {
        cameraId: input.cameraId,
        deletedAt: null,
      },
      select: {
        type: true,
      },
    });
    if (camera?.type === 'START') {
      await this.createRoute({
        cameraId: input.cameraId,
        carId,
        routeStatus: 'PENDING',
      });
    } else if (camera?.type === 'INTERMEDIATE') {
      const previousRoute = await this.dbClient.route.findFirst({
        where: {
          deletedAt: null,
          carId: carId,
          previousRouteId: null,
          routeStatus: {
            in: ['PARTIAL_DONE', 'PENDING'],
          },
        },
        orderBy: {
          timeStamp: 'desc',
        },
        select: {
          routeId: true,
        },
      });
      if (!previousRoute) {
        throw new BadRequestException('New Car Entry Route Not Found');
      }
      if (input?.direction === 'left') {
        await this.createRoute({
          cameraId: input.cameraId,
          carId,
          routeStatus: input?.cameraId === 3 ? 'PARTIAL_DONE' : 'PENDING',
          previousRouteId: previousRoute?.routeId,
        });
      } else if (input?.direction === 'right') {
        await this.createRoute({
          cameraId: input.cameraId,
          carId,
          routeStatus: input?.cameraId === 4 ? 'PARTIAL_DONE' : 'PENDING',
          previousRouteId: previousRoute?.routeId,
        });
      } else {
        await this.createRoute({
          cameraId: input.cameraId,
          carId,
          routeStatus: 'PARTIAL_DONE',
          previousRouteId: previousRoute?.routeId,
        });
      }
    } else {
      const previousRoute = await this.dbClient.route.findFirst({
        where: {
          deletedAt: null,
          carId,
          routeStatus: {
            in: ['PENDING', 'PARTIAL_DONE'],
          },
        },
        orderBy: {
          timeStamp: 'desc',
        },
        select: {
          routeId: true,
        },
      });
      if (!previousRoute) {
        throw new BadRequestException('New Car Entry Route Not Found');
      }
      await this.createRoute({
        cameraId: input.cameraId,
        carId,
        routeStatus: 'DONE',
        previousRouteId: previousRoute?.routeId,
      });
    }

    return true;
  }

  async getRoutesByFilter(input: GetRoutesByFilterArgs) {
    const query: Prisma.RouteFindManyArgs = {
      where: {
        deletedAt: null,
        Camera: {
          type: 'START',
        },
        previousRouteId: null,
      },
      include: {
        Car: true,
      },
    };

    if (input?.color) {
      query.where = {
        ...query.where,
        Car: {
          color: input?.color,
        },
      };
    }

    if (input?.model) {
      query.where = {
        ...query.where,
        Car: {
          model: input.model,
        },
      };
    }

    if (input?.numberPlate) {
      query.where = {
        ...query.where,
        Car: {
          numberPlate: input.numberPlate,
        },
      };
    }

    if (input?.timeStamp) {
      const startOfDay = new Date(input.timeStamp);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(input.timeStamp);
      endOfDay.setHours(23, 59, 59, 999);
      query.where = {
        ...query.where,
        timeStamp: {
          gte: startOfDay,
          lte: endOfDay,
        },
      };
    }
    console.log('Query is ', query);

    return this.dbClient.route.findMany(query);
  }

  async getRouteById(input: GetRouteById) {
    let cumulativeRoute;
    cumulativeRoute = await this.dbClient.route.findFirst({
      where: {
        routeId: input.routeId,
        deletedAt: null,
        previousRouteId: null,
      },
      include: {
        Camera: {
          select: {
            lat: true,
            lng: true,
          },
        },
        Car: true
      },
    });
    if (!cumulativeRoute) {
      throw new BadRequestException('Invalid start route id');
    }
    let completeRoute: any[] = [];
    completeRoute.push(cumulativeRoute);
    while (cumulativeRoute && cumulativeRoute.routeStatus !== 'DONE') {
      let previousRouteId = cumulativeRoute?.routeId;
      cumulativeRoute = await this.dbClient.route.findFirst({
        where: {
          deletedAt: null,
          Camera: {
            type: {
              not: 'START',
            },
          },
          previousRouteId,
        },
        include: {
          Camera: {
            select: {
              lat: true,
              lng: true,
            },
          },
        },
      });
      if (cumulativeRoute) {
        completeRoute.push(cumulativeRoute);
      }
    }
    return completeRoute;
  }
}
