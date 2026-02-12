import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { LogoutDto } from './dto/logout.dto';
import { RefreshDto } from './dto/refresh.dto';
import { SignupDto } from './dto/signup.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { TokenPayload } from './auth.types';

/**
 * 인증 API 컨트롤러
 * - 회원가입, 로그인, 토큰 갱신, 로그아웃, 현재 사용자 조회
 */
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * 회원가입
   * - id, email, nickname 중복 시 409
   * - 비밀번호는 bcrypt 해시 후 저장
   */
  @Post('signup')
  async signup(@Body() dto: SignupDto) {
    return this.authService.signup(dto);
  }

  /**
   * 로그인
   * - id(로그인 ID) + password로 검증 후 Access/Refresh 토큰 발급
   * - Refresh 토큰은 DB에 저장 (만료 7일)
   */
  @Post('login')
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  /**
   * Access 토큰 갱신
   * - Refresh 토큰이 유효하면 새 Access 토큰만 발급 (Refresh 토큰은 그대로 사용)
   */
  @Post('refresh')
  async refresh(@Body() dto: RefreshDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  /**
   * 로그아웃
   * - 전달한 Refresh 토큰을 DB에서 무효화(revoked_at 설정)
   * - 해당 Refresh로는 더 이상 /auth/refresh 불가
   */
  @Post('logout')
  async logout(@Body() dto: LogoutDto) {
    await this.authService.logout(dto.refreshToken);
    return { message: '로그아웃되었습니다.' };
  }

  /**
   * 현재 로그인 사용자 정보
   * - Authorization: Bearer <accessToken> 필요
   * - JWT payload의 sub(user uuid)로 사용자 조회
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@CurrentUser() payload: TokenPayload) {
    const user = await this.authService.getProfile(payload.sub);
    if (!user) throw new NotFoundException('사용자를 찾을 수 없습니다.');
    return user;
  }
}
