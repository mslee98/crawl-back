# DB 스키마 러프 설계 (인증 중심)

인증(로그인/로그아웃) 및 향후 크롤 서비스 확장을 위한 최소 테이블 구성입니다.  
ORM(TypeORM, Prisma 등) 도입 시 엔티티/스키마 정의의 기준으로 사용할 수 있습니다.

---

## 1. ER 개요

- **users** — 회원 정보 (이메일, 비밀번호 해시, 프로필)
- **refresh_tokens** — Refresh Token 저장 (로그아웃 시 삭제/무효화)

---

## 2. 테이블 정의

### 2.1 `users`

| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| `id` | UUID | PK, default uuid_generate_v4() | 사용자 고유 식별자 |
| `email` | VARCHAR(255) | NOT NULL, UNIQUE | 로그인 이메일 |
| `password_hash` | VARCHAR(255) | NOT NULL | bcrypt 등 해시된 비밀번호 |
| `nickname` | VARCHAR(100) | NULL | 표시 이름 |
| `created_at` | TIMESTAMPTZ | NOT NULL, default now() | 가입 시각 |
| `updated_at` | TIMESTAMPTZ | NOT NULL, default now() | 수정 시각 |

- 인덱스: `email` (UNIQUE), 필요 시 `created_at`.

---

### 2.2 `refresh_tokens`

| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| `id` | UUID | PK, default uuid_generate_v4() | 토큰 레코드 식별자 |
| `user_id` | UUID | NOT NULL, FK → users(id) ON DELETE CASCADE | 소유 사용자 |
| `token` | VARCHAR(255) 또는 TEXT | NOT NULL, UNIQUE | 발급한 Refresh Token 값 |
| `expires_at` | TIMESTAMPTZ | NOT NULL | 만료 시각 |
| `created_at` | TIMESTAMPTZ | NOT NULL, default now() | 발급 시각 |
| `revoked_at` | TIMESTAMPTZ | NULL | 로그아웃 등으로 무효화한 시각 (NULL이면 유효) |

- 인덱스: `token` (UNIQUE), `user_id`, `expires_at` (만료된 토큰 정리용).
- 로그아웃: 해당 행의 `revoked_at` 설정 또는 행 삭제.

---

## 3. SQL 예시 (PostgreSQL)

```sql
-- 확장 (UUID 생성용)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 사용자
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  nickname VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_users_email ON users (email);

-- Refresh Token
CREATE TABLE refresh_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  token VARCHAR(255) NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX idx_refresh_tokens_token ON refresh_tokens (token);
CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens (user_id);
CREATE INDEX idx_refresh_tokens_expires_at ON refresh_tokens (expires_at);
```

---

## 4. 향후 확장 시 참고

- **크롤 작업/결과**: 별도 `crawl_jobs`, `crawl_results` 등 테이블 추가 시 `user_id` FK로 소유자 연결.
- **역할/권한**: `roles`, `user_roles` 테이블 추가 가능.
- **소셜 로그인**: `users`에 `provider`, `provider_id` 컬럼 또는 별도 `user_identities` 테이블 고려.

이 스키마는 러프 설계이므로, ORM 도입 시 네이밍/타입은 팀 컨벤션에 맞게 조정하면 됩니다.
