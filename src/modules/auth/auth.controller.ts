import {
  Controller,
  Post,
  Body,
  Get,
  Headers,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginArgs, SignupArgs } from './models/input.model';
import { JwtAuthGuard } from 'src/guards/jwt-auth-guard';
import { Authorization } from 'src/decorators/authorization.decorator';
import { IAuthUser } from '@common/types';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('signup')
  register(@Body() dto: SignupArgs) {
    return this.authService.signup(dto);
  }

  @Get('adeel')
  adeel() {
    return this.authService.adeel();
  }

  @Post('login')
  login(@Body() dto: LoginArgs) {
    return this.authService.login(dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getProfile(@Authorization() user: IAuthUser) {
    return this.authService.getUserByToken(user.userId, user.seatNumber);
  }
}
