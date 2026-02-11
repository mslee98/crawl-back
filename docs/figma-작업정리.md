# Figma용 — 지금까지 작업 정리

아래 내용을 Figma 프레임/텍스트로 옮기면 됩니다. (테이블은 텍스트 블록으로 복사하거나, 표 도구로 재구성)

---

## 1. 작업 요약

**완료**
- TypeORM + MySQL 세팅, 엔티티 4개 (users, refresh_tokens, subscription_plans, subscription_keys)
- JWT 기반 인증 (Passport 미사용): 로그인·리프레시·로그아웃
- Auth API: signup, login, refresh, logout, GET /auth/me
- JwtAuthGuard, @CurrentUser() 데코레이터

**기술 스택**
- NestJS 11, TypeScript, Express
- TypeORM, MySQL (mysql2)
- @nestjs/jwt, bcrypt
- class-validator, class-transformer

---

## 2. 엔티티 — 테이블 형식

### users

| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| id | uuid | PK | 사용자 식별자 |
| email | varchar(255) | NOT NULL, UNIQUE | 로그인 이메일 |
| password_hash | varchar(255) | NOT NULL | bcrypt 해시 |
| nickname | varchar(100) | NULL | 표시 이름 |
| created_at | datetime | NOT NULL | 가입 시각 |
| updated_at | datetime | NOT NULL | 수정 시각 |

---

### refresh_tokens

| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| id | uuid | PK | 토큰 레코드 식별자 |
| user_id | char(36) | NOT NULL, FK→users | 소유 사용자 |
| token | varchar(255) | NOT NULL, UNIQUE | Refresh Token 값 |
| expires_at | datetime | NOT NULL | 만료 시각 |
| created_at | datetime | NOT NULL | 발급 시각 |
| revoked_at | datetime | NULL | 로그아웃 시 무효화 시각 |

---

### subscription_plans

| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| id | uuid | PK | 상품 식별자 |
| name | varchar(100) | NOT NULL | 상품명 (월간/연간 등) |
| duration_days | int | NOT NULL | 유효 일수 |
| price | decimal(10,2) | 기본 0 | 가격 |
| created_at | datetime | NOT NULL | 생성 시각 |

---

### subscription_keys

| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| id | uuid | PK | 키 레코드 식별자 |
| user_id | char(36) | NOT NULL, FK→users | 소유 사용자 |
| key | varchar(255) | NOT NULL, UNIQUE | 발급된 사용 키 |
| plan_id | char(36) | NULL, FK→plans | 구독 상품 (선택) |
| valid_from | datetime | NOT NULL | 유효 시작 |
| valid_until | datetime | NOT NULL | 유효 종료 |
| status | enum | active/expired/revoked | 상태 |
| created_at | datetime | NOT NULL | 발급 시각 |

---

## 3. API 엔드포인트 정리

**인증 (Auth)**
- POST /auth/signup — email, password(8자+), nickname(선택)
- POST /auth/login — email, password → accessToken, refreshToken, expiresIn, user
- POST /auth/refresh — refreshToken → accessToken, expiresIn
- POST /auth/logout — refreshToken → 무효화
- GET /auth/me — Bearer accessToken → 현재 사용자

**크롤 (기존)**
- GET /crawl/status — 서비스 상태
- POST /crawl/start — url, selector(선택)

**인증 필요 시**  
Header: `Authorization: Bearer <accessToken>`  
가드: `@UseGuards(JwtAuthGuard)`, `@CurrentUser()` 로 payload 사용

---

## 4. ER 관계 (한 줄 요약)

- users 1 ──< refresh_tokens  
- users 1 ──< subscription_keys >── 1 subscription_plans (선택)
