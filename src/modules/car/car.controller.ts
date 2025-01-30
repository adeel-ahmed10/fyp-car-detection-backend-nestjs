import { Controller } from '@nestjs/common';
import { CarService } from './car.service';

@Controller()
export class CarController {
  constructor(private carService: CarService) {}
}
