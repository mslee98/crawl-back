# crsel-back

NestJS 기반 크롤링 서비스 백엔드입니다.

## 기술 스택

- **NestJS 11** + **TypeScript** (strict)
- **Express** (Nest 기본 플랫폼)
- **TypeORM** + **MySQL** — DB 접근
- **class-validator** / **class-transformer** — DTO 검증
- **ValidationPipe** — 전역 요청 검증 (whitelist, forbidNonWhitelisted)

## 프로젝트 구조

```
crsel-back/
├── src/
│   ├── main.ts                 # 앱 부트스트랩, ValidationPipe, 포트 설정
│   ├── app.module.ts           # 루트 모듈 (CrawlModule import)
│   ├── app.controller.ts       # 기본 라우트 (예: GET /)
│   ├── app.service.ts
│   └── crawl/                  # 크롤링 기능 모듈
│       ├── crawl.module.ts     # CrawlModule 정의
│       ├── crawl.controller.ts # /crawl 라우트 (status, start)
│       ├── crawl.service.ts    # 크롤링 비즈니스 로직 (스켈레톤)
│       └── dto/
│           └── start-crawl.dto.ts  # POST /crawl/start 요청 DTO
├── test/                       # e2e 테스트
├── nest-cli.json
├── tsconfig.json
├── package.json
└── README.md
```

### 디렉터리/파일 설명

| 경로 | 설명 |
|------|------|
| `src/main.ts` | Nest 앱 생성, 전역 `ValidationPipe` 등록, `PORT`(기본 3000) 리스닝 |
| `src/app.module.ts` | `CrawlModule`을 import하여 크롤 API 사용 가능 |
| `src/crawl/crawl.module.ts` | `CrawlController`, `CrawlService` 등록, `CrawlService` export |
| `src/crawl/crawl.controller.ts` | `GET /crawl/status`, `POST /crawl/start` 엔드포인트 제공 |
| `src/crawl/crawl.service.ts` | `crawl(url, selector?)`, `getStatus()` — 현재는 스켈레톤(실제 크롤링 미구현) |
| `src/crawl/dto/start-crawl.dto.ts` | `url`(필수), `selector`(선택) 검증 |

---

## API 명세

### 1. 크롤 서비스 상태

- **메서드/경로:** `GET /crawl/status`
- **응답 예시:**

```json
{
  "status": "ok",
  "service": "crsel-crawl"
}
```

### 2. 크롤 시작

- **메서드/경로:** `POST /crawl/start`
- **요청 body (JSON):**

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `url` | string | O | 크롤할 URL (유효한 URL 형식) |
| `selector` | string | X | (추후 사용) 선택자 등 |

**요청 예시:**

```json
{
  "url": "https://example.com",
  "selector": "article"
}
```

- **응답 (성공 시):**

```json
{
  "url": "https://example.com",
  "success": true,
  "data": {
    "requestedUrl": "https://example.com",
    "requestedSelector": "article",
    "message": "크롤링 로직을 여기에 구현하세요."
  },
  "crawledAt": "2025-02-11T12:00:00.000Z"
}
```

- **응답 (실패 시):** `success: false`, `error` 필드에 에러 메시지 포함.

### 3. 인증 (JWT)

- **상세 명세 (요청/응답 필드, 예시)**: **[docs/auth-api.md](docs/auth-api.md)** 참고.

| 메서드 | 경로 | 설명 |
|--------|------|------|
| POST | `/auth/signup` | 회원가입: **id**(로그인 ID), email, password 8자+, **nickname** 필수 |
| POST | `/auth/login` | 로그인: **id**(로그인 ID) + password → accessToken, refreshToken, expiresIn, user |
| POST | `/auth/refresh` | body: `{ refreshToken }` → 새 accessToken, expiresIn |
| POST | `/auth/logout` | body: `{ refreshToken }` → 해당 refresh 토큰 무효화 |
| GET | `/auth/me` | `Authorization: Bearer <accessToken>` 필요 → 현재 사용자 정보 |

인증 필요한 API에는 `Authorization: Bearer <accessToken>` 헤더를 붙이면 됩니다.

---

## 설정

- **포트:** 환경 변수 `PORT` 미설정 시 `3000` 사용.
- **ValidationPipe:** `whitelist: true`, `forbidNonWhitelisted: true` — DTO에 정의되지 않은 필드는 제거/거부.

### DB (MySQL + TypeORM)

- `.env.example`을 참고해 `.env`를 만들고 MySQL 접속 정보를 넣는다.
- `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_DATABASE` 사용. 미설정 시 기본값: `localhost`, `3306`, `root`, `''`, `crsel`.
- `NODE_ENV !== 'production'`이면 `synchronize: true`로 엔티티 기준 테이블 자동 생성. 프로덕션에서는 `synchronize: false` 권장 후 마이그레이션 사용.
- 엔티티: `src/entities/` — `User`, `RefreshToken`, `SubscriptionPlan`, `SubscriptionKey`.
- **JWT:** `JWT_SECRET`(필수), `JWT_ACCESS_EXPIRES`(초 단위, 기본 900). `.env.example` 참고.

---

## 설치 및 실행

```bash
# 의존성 설치
npm install

# 개발 (일반 실행)
npm run start

# 개발 (watch 모드, 권장)
npm run start:dev

# 프로덕션 빌드 후 실행
npm run build
npm run start:prod
```

## 스크립트

| 스크립트 | 설명 |
|----------|------|
| `npm run start` | 앱 실행 |
| `npm run start:dev` | watch 모드로 실행 |
| `npm run start:debug` | 디버그 모드 + watch |
| `npm run start:prod` | `dist/main` 프로덕션 실행 |
| `npm run build` | TypeScript 빌드 |
| `npm run format` | Prettier 포맷 |
| `npm run lint` | ESLint 실행 |
| `npm run test` | 단위 테스트 |
| `npm run test:e2e` | e2e 테스트 |
| `npm run test:cov` | 커버리지 포함 테스트 |

---

## 현재 구현 상태

- **완료:** NestJS 프로젝트 구성, Crawl 모듈, `/crawl/status`, `/crawl/start` API, DTO 검증.
- **미구현:** `CrawlService.crawl()` 내 실제 크롤링 로직 (axios + cheerio 또는 puppeteer 등 추가 예정).

---

## 설계 문서 (API / DB)

- **[인증 API 명세 (로그인·회원가입)](docs/auth-api.md)** — 요청/응답 필드, 예시, 에러 정리
- **[인증 REST API 설계](docs/auth-api-design.md)** — 로그인/로그아웃, Access·Refresh 토큰 전략
- **[DB 스키마 러프 설계](docs/db-schema-rough.md)** — `users`, `refresh_tokens` 테이블
- **[스키마 SQL](docs/schema-auth.sql)** — PostgreSQL 인증 테이블 생성 스크립트

## 참고 링크

- [NestJS 공식 문서](https://docs.nestjs.com)
- [NestJS 배포 가이드](https://docs.nestjs.com/deployment)
