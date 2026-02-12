import {
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class SignupDto {
  /** 로그인 ID (예: lms980321). 유일값, 영문/숫자/언더스코어만 허용 */
  @IsString()
  @MinLength(2, { message: 'ID는 2자 이상이어야 합니다.' })
  @MaxLength(100)
  @Matches(/^[a-zA-Z0-9_]+$/, {
    message: 'ID는 영문, 숫자, 언더스코어(_)만 사용할 수 있습니다.',
  })
  id: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8, { message: '비밀번호는 8자 이상이어야 합니다.' })
  password: string;

  @IsString()
  @MinLength(1, { message: '닉네임을 입력해 주세요.' })
  @MaxLength(100)
  nickname: string;

  /** 프론트에서 보낼 수 있는 필드. nickname과 동일하게 사용 (nickname 우선) */
  @IsOptional()
  @IsString()
  @MaxLength(100)
  username?: string;

  /** 약관 동의 여부 (프론트 검증용, 백엔드에서는 허용만 함) */
  @IsOptional()
  @IsBoolean()
  termsAgreed?: boolean;
}
