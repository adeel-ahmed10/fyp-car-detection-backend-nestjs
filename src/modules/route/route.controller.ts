import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { RouteService } from './route.service';
import { JwtAuthGuard } from 'src/guards/jwt-auth-guard';
import {
  AddDetectedCarRouteArgs,
  GetRouteById,
  GetRoutesByFilterArgs,
} from './models/input.model';

@Controller('')
export class RouteController {
  constructor(private routeService: RouteService) {}

  @Post('addCarRoute')
  @UseGuards(JwtAuthGuard)
  addDetectedCarRoute(
    @Body() input: AddDetectedCarRouteArgs,
  ): Promise<boolean> {
    return this.routeService.addDetectedCarRoute(input);
  }

  @Get('getRoutes')
  @UseGuards(JwtAuthGuard)
  getRoutesByFilter(@Query() input: GetRoutesByFilterArgs) {
    return this.routeService.getRoutesByFilter(input);
  }

  @Post('getRouteById')
  @UseGuards(JwtAuthGuard)
  getRouteById(@Body() input: GetRouteById) {
    return this.routeService.getRouteById(input);
  }
}
