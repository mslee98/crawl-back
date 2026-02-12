import { IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsString()
  @MinLength(1, { message: 'ID를 입력해 주세요.' })
  id: string;

  @IsString()
  @MinLength(1, { message: '비밀번호를 입력해 주세요.' })
  password: string;
}
