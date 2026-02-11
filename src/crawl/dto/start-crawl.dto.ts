import { IsString, IsOptional, IsUrl } from 'class-validator';

export class StartCrawlDto {
  @IsUrl()
  url: string;

  @IsOptional()
  @IsString()
  selector?: string;
}
