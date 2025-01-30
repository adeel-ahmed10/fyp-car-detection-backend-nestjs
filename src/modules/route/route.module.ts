import { forwardRef, Module } from '@nestjs/common';
import { RouteService } from './route.service';
import { RouteController } from './route.controller';
import { CarModule } from '../car/car.module';

@Module({
  imports: [forwardRef(() => CarModule)],
  exports: [RouteService],
  controllers: [RouteController],
  providers: [RouteService],
})
export class RouteModule {}
