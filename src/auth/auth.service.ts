import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { IsNull, Repository } from 'typeorm';
import { RefreshToken } from '../entities/refresh-token.entity';
import { User } from '../entities/user.entity';
import { LoginDto } from './dto/login.dto';
import { SignupDto } from './dto/signup.dto';
import { TokenPayload } from './auth.types';

/** 로그인 성공 시 응답 타입 (Access/Refresh 토큰 + 사용자 정보) */
export interface LoginResult {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: { uuid: string; id: string; email: string; nickname: string };
}

/**
 * 인증 비즈니스 로직
 * - 회원가입(id/email/nickname 중복 체크, 비밀번호 해시)
 * - 로그인(검증 후 JWT + Refresh 토큰 발급)
 * - 토큰 갱신, 로그아웃, 프로필 조회
 */
@Injectable()
export class AuthService {
  /** Access 토큰 유효 시간(초). 기본 900(15분) */
  private readonly accessExpiresInSec: number;

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
    private readonly jwtService: JwtService,
  ) {
    this.accessExpiresInSec = parseInt(
      process.env.JWT_ACCESS_EXPIRES ?? '900',
      10,
    );
  }

  /**
   * 회원가입
   * - id, email, nickname 중복 시 ConflictException(409)
   * - nickname은 nickname ?? username 중 비어 있지 않은 값 사용
   * @returns 가입된 사용자 정보 (uuid, id, email, nickname). 비밀번호 제외
   */
  async signup(dto: SignupDto): Promise<{ uuid: string; id: string; email: string; nickname: string }> {
    const nicknameValue = (dto.nickname ?? dto.username ?? '').trim();
    if (!nicknameValue) throw new BadRequestException('닉네임을 입력해 주세요.');

    const [existingEmail, existingId, existingNickname] = await Promise.all([
      this.userRepository.findOne({ where: { email: dto.email } }),
      this.userRepository.findOne({ where: { id: dto.id } }),
      this.userRepository.findOne({ where: { nickname: nicknameValue } }),
    ]);
    if (existingEmail) throw new ConflictException('이미 사용 중인 이메일입니다.');
    if (existingId) throw new ConflictException('이미 사용 중인 ID입니다.');
    if (existingNickname) throw new ConflictException('이미 사용 중인 닉네임입니다.');

    const nickname = nicknameValue;
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const result = await this.userRepository.insert({
      id: dto.id,
      email: dto.email,
      passwordHash,
      nickname,
    });
    const uuid = result.identifiers[0]?.uuid as string;
    const user = await this.userRepository.findOneOrFail({ where: { uuid } });
    return { uuid: user.uuid, id: user.id, email: user.email, nickname: user.nickname };
  }

  /**
   * 로그인 ID + 비밀번호 검증
   * - id는 users.id(로그인 ID)로 조회, 이메일 아님
   * @returns 검증 성공 시 User 엔티티, 실패 시 null
   */
  async validateUser(id: string, password: string): Promise<User | null> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) return null;
    const ok = await bcrypt.compare(password, user.passwordHash);
    return ok ? user : null;
  }

  /**
   * 로그인 처리
   * - validateUser로 검증 후 Access(JWT) + Refresh(UUID) 토큰 발급
   * - Refresh 토큰은 DB에 저장 (만료 7일)
   * @throws UnauthorizedException ID/비밀번호 불일치
   */
  async login(dto: LoginDto): Promise<LoginResult> {
    const user = await this.validateUser(dto.id, dto.password);
    if (!user) {
      throw new UnauthorizedException('ID 또는 비밀번호가 올바르지 않습니다.');
    }

    const payload: TokenPayload = { sub: user.uuid, email: user.email };
    const accessToken = this.jwtService.sign(payload, {
      expiresIn: this.accessExpiresInSec,
    });
    const refreshToken = randomUUID();
    const refreshExpiresAt = new Date();
    refreshExpiresAt.setDate(refreshExpiresAt.getDate() + 7);

    await this.refreshTokenRepository.insert({
      userId: user.uuid,
      token: refreshToken,
      expiresAt: refreshExpiresAt,
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: this.accessExpiresInSec,
      user: {
        uuid: user.uuid,
        id: user.id,
        email: user.email,
        nickname: user.nickname,
      },
    };
  }

  /**
   * Refresh 토큰으로 새 Access 토큰 발급
   * - DB에서 refreshToken 조회, revoked 아니고 만료 전이면 새 JWT 발급
   * @throws UnauthorizedException 토큰 없음/만료/이미 무효화
   */
  async refresh(refreshToken: string): Promise<{ accessToken: string; expiresIn: number }> {
    const row = await this.refreshTokenRepository.findOne({
      where: { token: refreshToken, revokedAt: IsNull() },
      relations: ['user'],
    });
    if (!row || row.expiresAt < new Date()) {
      throw new UnauthorizedException('유효하지 않거나 만료된 refresh token입니다.');
    }

    const payload: TokenPayload = { sub: row.user.uuid, email: row.user.email };
    const accessToken = this.jwtService.sign(payload, {
      expiresIn: this.accessExpiresInSec,
    });
    return {
      accessToken,
      expiresIn: this.accessExpiresInSec,
    };
  }

  /**
   * 로그아웃 (Refresh 토큰 무효화)
   * - 해당 토큰에 revoked_at 설정. 이미 무효화된 경우는 무시
   */
  async logout(refreshToken: string): Promise<void> {
    const row = await this.refreshTokenRepository.findOne({
      where: { token: refreshToken },
    });
    if (row && !row.revokedAt) {
      row.revokedAt = new Date();
      await this.refreshTokenRepository.save(row);
    }
  }

  /**
   * uuid(사용자 PK)로 프로필 조회
   * - JWT payload의 sub가 user.uuid이므로, /auth/me 등에서 이 메서드 사용
   * @returns uuid, id, email, nickname. 없으면 null
   */
  async getProfile(userUuid: string): Promise<{ uuid: string; id: string; email: string; nickname: string } | null> {
    const user = await this.userRepository.findOne({
      where: { uuid: userUuid },
      select: ['uuid', 'id', 'email', 'nickname'],
    });
    return user ?? null;
  }
}
