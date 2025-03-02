import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello World!';
  }
  mergeBestValues(features: any[]) {
    if (features.length === 0) {
      throw new Error('No features detected in the video.');
    }

    const mergedResult: any = {
      numberPlate: 'Unknown',
      model: 'Unknown',
      color: 'Unknown',
      direction: 'Unknown',
    };

    for (const feature of features) {
      if (
        feature.number_plate &&
        feature.number_plate !== 'None' &&
        mergedResult.numberPlate === 'Unknown'
      ) {
        mergedResult.numberPlate = feature.number_plate; // Extract the plate number
      }

      if (
        feature.color &&
        feature.color !== 'Unknown' &&
        mergedResult.color === 'Unknown'
      ) {
        mergedResult.color = feature.color;
      }

      if (feature.car_label && mergedResult.model === 'Unknown') {
        mergedResult.model = feature.car_label;
      }

      if (feature.direction && mergedResult.direction === 'Unknown') {
        mergedResult.direction = feature.direction;
      }
    }

    return mergedResult;
  }
}
