import { IsString, MinLength } from 'class-validator';

export class LogoutDto {
  @IsString()
  @MinLength(1, { message: 'refreshToken은 필수입니다.' })
  refreshToken: string;
}
