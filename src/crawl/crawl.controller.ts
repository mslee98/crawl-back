import { Body, Controller, Get, Post } from '@nestjs/common';
import { CrawlService, CrawlResult } from './crawl.service';
import { StartCrawlDto } from './dto/start-crawl.dto';

@Controller('crawl')
export class CrawlController {
  constructor(private readonly crawlService: CrawlService) {}

  @Get('status')
  getStatus(): { status: string; service: string } {
    return this.crawlService.getStatus();
  }

  @Post('start')
  async startCrawl(@Body() dto: StartCrawlDto): Promise<CrawlResult> {
    return this.crawlService.crawl(dto.url, dto.selector);
  }
}
