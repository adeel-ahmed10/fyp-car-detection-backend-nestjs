import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthHelper } from '@common/auth.helper';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = request.headers['authorization']?.split(' ')[1]; // Get token from Bearer header  
    if (!token || token.length < 7) throw new UnauthorizedException();

    return AuthHelper.checkIfUserAuthorized(request, token);
  }
}
