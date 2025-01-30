import * as jwt from 'jsonwebtoken';
import { UnauthorizedException } from '@nestjs/common';
import { DatabaseClient } from '../clients/databaseClient';

export class AuthHelper {
  public static verifyToken(token: string): jwt.JwtPayload {
    if (!process.env.JWT_KEY) {
      throw Error('JWT_KEY not defined');
    }
    return jwt.verify(token, process.env.JWT_KEY) as jwt.JwtPayload;
  }

  public static async createAccessToken(
    userId: number,
    seatNumber: string,
    expiresIn?: string,
  ): Promise<string> {
    if (!process.env.JWT_KEY) throw Error('JWT_KEY not defined');

    const payload: {
      s: string;
      sub: number;
    } = {
      s: seatNumber,
      sub: userId,
    };

    if (!expiresIn) {
      if (!process.env.JWT_EXPIRES_IN) expiresIn = '86400s';
      else expiresIn = process.env.JWT_EXPIRES_IN;
    }

    const token = await jwt.sign(payload, process.env.JWT_KEY, {
      expiresIn: expiresIn,
    });

    return token;
  }

  static async checkIfUserAuthorized(request: any, token: string) {
    if (!request) throw new UnauthorizedException();

    let payload;
    try {
      payload = this.verifyToken(token);
    } catch (err) {
      throw new UnauthorizedException();
    }
    if (!payload) throw new UnauthorizedException();

    const dbClient = DatabaseClient.dbClient;
    const userId = Number(payload.sub);
    const user = await dbClient.user.findFirst({
      where: { userId },
    });

    if (!user) {
      throw new UnauthorizedException();
    }

    request.user = {
      userId: userId,
      seatNumber: payload['s'],
    };

    return true;
  }
}
