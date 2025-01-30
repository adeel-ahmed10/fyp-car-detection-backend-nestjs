import { RouteStatus } from '@prisma/client';

export class AddDetectedCarRouteArgs {
  numberPlate: string;
  model: string;
  color: string;
  direction?: string;
  cameraId: number;
}

export class CreateRouteArgs {
  carId: number;
  cameraId: number;
  routeStatus: RouteStatus;
  previousRouteId?: number;
}

export class GetRoutesByFilterArgs {
  timeStamp?: Date;
  model?: string;
  numberPlate?: string;
  color?: string;
}

export class GetRouteById {
  routeId: number;
}
