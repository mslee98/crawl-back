import {
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

export interface LoginResult {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: { id: string; email: string; nickname: string | null };
}

@Injectable()
export class AuthService {
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

  async signup(dto: SignupDto): Promise<{ id: string; email: string; nickname: string | null }> {
    const existing = await this.userRepository.findOne({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException('이미 사용 중인 이메일입니다.');
    }
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const result = await this.userRepository.insert({
      email: dto.email,
      passwordHash,
      nickname: dto.nickname ?? null,
    });
    const id = result.identifiers[0]?.id as string;
    const user = await this.userRepository.findOneOrFail({ where: { id } });
    return { id: user.id, email: user.email, nickname: user.nickname };
  }

  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) return null;
    const ok = await bcrypt.compare(password, user.passwordHash);
    return ok ? user : null;
  }

  async login(dto: LoginDto): Promise<LoginResult> {
    const user = await this.validateUser(dto.email, dto.password);
    if (!user) {
      throw new UnauthorizedException('이메일 또는 비밀번호가 올바르지 않습니다.');
    }

    const payload: TokenPayload = { sub: user.id, email: user.email };
    const accessToken = this.jwtService.sign(payload, {
      expiresIn: this.accessExpiresInSec,
    });
    const refreshToken = randomUUID();
    const refreshExpiresAt = new Date();
    refreshExpiresAt.setDate(refreshExpiresAt.getDate() + 7);

    await this.refreshTokenRepository.insert({
      userId: user.id,
      token: refreshToken,
      expiresAt: refreshExpiresAt,
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: this.accessExpiresInSec,
      user: {
        id: user.id,
        email: user.email,
        nickname: user.nickname,
      },
    };
  }

  async refresh(refreshToken: string): Promise<{ accessToken: string; expiresIn: number }> {
    const row = await this.refreshTokenRepository.findOne({
      where: { token: refreshToken, revokedAt: IsNull() },
      relations: ['user'],
    });
    if (!row || row.expiresAt < new Date()) {
      throw new UnauthorizedException('유효하지 않거나 만료된 refresh token입니다.');
    }

    const payload: TokenPayload = { sub: row.user.id, email: row.user.email };
    const accessToken = this.jwtService.sign(payload, {
      expiresIn: this.accessExpiresInSec,
    });
    return {
      accessToken,
      expiresIn: this.accessExpiresInSec,
    };
  }

  async logout(refreshToken: string): Promise<void> {
    const row = await this.refreshTokenRepository.findOne({
      where: { token: refreshToken },
    });
    if (row && !row.revokedAt) {
      row.revokedAt = new Date();
      await this.refreshTokenRepository.save(row);
    }
  }

  async getProfile(userId: string): Promise<{ id: string; email: string; nickname: string | null } | null> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'email', 'nickname'],
    });
    return user ?? null;
  }
}
