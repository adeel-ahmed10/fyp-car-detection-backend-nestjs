import { Module } from '@nestjs/common';
import { CarController } from './car.controller';
import { CarService } from './car.service';

@Module({
  controllers: [CarController],
  exports: [CarService],
  imports: [],
  providers: [CarService],
})
export class CarModule {}
