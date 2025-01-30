import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { SignupArgs, LoginArgs } from './models/input.model';
import { DatabaseClient } from 'src/clients/databaseClient';
import { PrismaClient } from '@prisma/client';
import { AuthHelper } from '@common/auth.helper';

@Injectable()
export class AuthService {
  dbClient: PrismaClient;
  constructor() {
    this.dbClient = DatabaseClient.dbClient;
  }
  async adeel() {
    console.log('adeel');
    return 'adeel';
  }

  async signup(input: SignupArgs) {
    const existingUser = await this.dbClient.user.findFirst({
      where: {
        email: input.email,
        seatNumber: input.seatNumber,
      },
    });
    if (existingUser) {
      throw new BadRequestException('User already exist with this credentials');
    }
    const hashedPassword = await bcrypt.hash(input.password, 10);
    const registeredUser = await this.dbClient.user.create({
      data: {
        email: input.email,
        seatNumber: input.seatNumber,
        password: hashedPassword,
        userName: input.userName,
      },
    });

    const accessToken = AuthHelper.createAccessToken(
      registeredUser.userId,
      registeredUser.seatNumber,
    );

    return accessToken;
  }

  async login(input: LoginArgs) {
    const user = await this.dbClient.user.findUnique({
      where: { seatNumber: input.seatNumber },
    });
    if (!user || !(await bcrypt.compare(input.password, user.password))) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const accessToken = await AuthHelper.createAccessToken(
      user.userId,
      user.seatNumber,
    );
    return accessToken;
  }

  async getUserByToken(userId: number, seatNumber: string) {
    try {
      return await this.dbClient.user.findFirst({
        where: {
          userId,
          seatNumber,
        },
      });
    } catch {
      throw new UnauthorizedException('Invalid token');
    }
  }
}
