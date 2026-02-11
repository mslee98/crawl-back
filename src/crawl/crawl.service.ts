import { Injectable } from '@nestjs/common';

export interface CrawlResult {
  url: string;
  success: boolean;
  data?: unknown;
  error?: string;
  crawledAt: string;
}

@Injectable()
export class CrawlService {
  async crawl(url: string, selector?: string): Promise<CrawlResult> {
    const crawledAt = new Date().toISOString();

    try {
      // TODO: 실제 크롤링 로직 구현 (axios + cheerio 또는 puppeteer 등)
      // 현재는 요청 정보를 그대로 반환하는 스켈레톤
      const data = {
        requestedUrl: url,
        requestedSelector: selector ?? null,
        message: '크롤링 로직을 여기에 구현하세요.',
      };

      return {
        url,
        success: true,
        data,
        crawledAt,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return {
        url,
        success: false,
        error: message,
        crawledAt,
      };
    }
  }

  getStatus(): { status: string; service: string } {
    return {
      status: 'ok',
      service: 'crsel-crawl',
    };
  }
}
