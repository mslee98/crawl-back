# 인증 API 명세 (로그인 · 회원가입)

- **회원가입·로그인 요청 방법**은 아래 "요청 방법" 섹션 참고.
- DB `users` 테이블: **uuid**가 PK, **id / email / nickname**은 필수 + 유일(UNIQUE).

---

## 요청 방법 (회원가입 · 로그인)

서버 기본 주소: `http://localhost:3000` (환경에 따라 변경)

### 회원가입

**메서드/URL:** `POST http://localhost:3000/auth/signup`  
**Header:** `Content-Type: application/json`  
**Body (JSON):**

```json
{
  "id": "lms980321",
  "email": "lms980321@kakao.com",
  "password": "alstjd12",
  "nickname": "민성"
}
```

**curl 예시:**

```bash
curl -X POST http://localhost:3000/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"id":"lms980321","email":"lms980321@kakao.com","password":"alstjd12","nickname":"민성"}'
```

---

### 로그인

**메서드/URL:** `POST http://localhost:3000/auth/login`  
**Header:** `Content-Type: application/json`  
**Body (JSON):**

```json
{
  "id": "lms980321",
  "password": "alstjd12"
}
```

**curl 예시:**

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"id":"lms980321","password":"alstjd12"}'
```

**성공 시 응답 예시:**

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "expiresIn": 900,
  "user": {
    "uuid": "7980dc76-89ff-44af-a070-f431ee675d7c",
    "id": "lms980321",
    "email": "lms980321@kakao.com",
    "nickname": "민성"
  }
}
```

---

## DB 스키마 (users)

| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| **uuid** | char(36) | **PK** | 서버 내부 식별자 (UUID). 다른 테이블 FK는 이걸 참조. |
| **id** | varchar(100) | NOT NULL, UNIQUE | 로그인 ID (예: lms980321). 로그인 시 사용. |
| **email** | varchar(255) | NOT NULL, UNIQUE | 이메일. |
| **password_hash** | varchar(255) | NOT NULL | bcrypt 해시. |
| **nickname** | varchar(100) | NOT NULL, UNIQUE | 닉네임. |
| created_at | datetime | NOT NULL | 가입 시각. |
| updated_at | datetime | NOT NULL | 수정 시각. |

- **PK는 uuid 하나.** id, email, nickname은 각각 **필수 + 유일**이라 중복 불가.

---

## 토큰 동작 방식

로그인 시 **두 종류의 토큰**이 발급됩니다.

### 1. 로그인 시 발급되는 것

| 토큰 | 형식 | 만료 | 저장 위치 | 용도 |
|------|------|------|-----------|------|
| **Access Token** | JWT | 짧음 (기본 15분) | 클라이언트(메모리/스토리지) | API 요청 시 "나 이 사용자야"라고 증명 |
| **Refresh Token** | 랜덤 문자열(UUID) | 김 (기본 7일) | 클라이언트 + **서버 DB** | Access 만료 시 새 Access 받을 때 사용 |

- 로그인 성공 시 서버가 **Access Token**과 **Refresh Token**을 만들어서 응답 body에 담아 줍니다.
- **Refresh Token**은 DB `refresh_tokens` 테이블에도 저장됩니다 (user_id, token, expires_at 등).

### 2. Access Token (JWT)

- **내용(payload):** `sub`(사용자 uuid), `email` 등. 서버 비밀키로 서명됨.
- **사용:** 인증이 필요한 API를 호출할 때 **Header**에 넣습니다.  
  `Authorization: Bearer <accessToken>`
- **검증:** 서버는 서명만 확인하고, DB 조회 없이 "이 토큰은 유효한 사용자다"라고 판단합니다.
- **만료:** 설정된 시간(예: 15분)이 지나면 더 이상 쓸 수 없습니다. 그때는 Refresh Token으로 새 Access를 받습니다.

### 3. Refresh Token

- **형식:** UUID 같은 랜덤 문자열. JWT가 아님.
- **저장:** 서버 DB `refresh_tokens`에 저장 (어떤 사용자(uuid)의 토큰인지, 만료 시각 등).
- **사용:** Access Token이 만료됐을 때  
  `POST /auth/refresh` + body `{ "refreshToken": "받았던 값" }`  
  → 서버가 DB에서 해당 토큰을 찾고, 유효하면 **새 Access Token**만 발급해서 돌려줍니다.
- **로그아웃:** `POST /auth/logout`에 refreshToken을 보내면, 서버가 DB에서 그 토큰을 무효화(revoked)합니다. 그러면 그 토큰으로는 더 이상 새 Access를 받을 수 없습니다.

### 4. 흐름 요약

```
[로그인]
  클라이언트: id + password 전송
  서버: 비밀번호 확인 → Access Token(JWT) 생성 + Refresh Token(UUID) 생성
        → Refresh Token을 DB에 저장
        → 두 토큰 + user 정보를 응답

[일반 API 호출]
  클라이언트: Authorization: Bearer <accessToken>
  서버: JWT 서명 검증 → payload에서 사용자(uuid 등) 식별 → API 처리

[Access 만료 후]
  클라이언트: POST /auth/refresh + { refreshToken }
  서버: DB에서 refreshToken 조회, 유효하면 새 Access Token 발급

[로그아웃]
  클라이언트: POST /auth/logout + { refreshToken }
  서버: DB에서 해당 refreshToken 무효화 → 그 세션 종료
```

- **Access Token**은 DB에 안 남기고, **Refresh Token**만 DB에 두기 때문에 로그아웃/폐기 처리가 가능합니다.

---

## 1. 회원가입 상세

**`POST /auth/signup`**

### 요청 (JSON body)

| 필드 | 타입 | 필수 | 설명 |
|------|------|:----:|------|
| **id** | string | ✅ | 로그인 ID. 2~100자, 영문·숫자·`_` 만. **유일.** |
| **email** | string | ✅ | 이메일. **유일.** |
| **password** | string | ✅ | 비밀번호. **8자 이상.** |
| **nickname** | string | ✅ | 닉네임. 1~100자. **유일.** |
| username | string | ❌ | nickname과 동일하게 사용 가능 (nickname 우선). |
| termsAgreed | boolean | ❌ | 약관 동의. 백엔드는 허용만. |

### 성공 응답 (200)

```json
{
  "uuid": "7980dc76-89ff-44af-a070-f431ee675d7c",
  "id": "lms980321",
  "email": "lms980321@kakao.com",
  "nickname": "민성"
}
```

### 에러 (4xx)

| 상태 | 의미 |
|------|------|
| 400 | body 검증 실패 (형식, 길이, 필수값 등). |
| 409 | 이미 사용 중인 이메일 / ID / 닉네임. |

---

## 2. 로그인 상세

**`POST /auth/login`**

### 요청 (JSON body)

| 필드 | 타입 | 필수 | 설명 |
|------|------|:----:|------|
| **id** | string | ✅ | **로그인 ID** (회원가입 시 넣은 id). 이메일 아님. |
| **password** | string | ✅ | 비밀번호. |

### 성공 응답 (200)

- 위 "요청 방법 > 로그인"의 응답 예시와 동일 (accessToken, refreshToken, expiresIn, user).

### 에러 (4xx)

| 상태 | 의미 |
|------|------|
| 400 | body 검증 실패 (id/password 비어 있음 등). |
| 401 | ID 또는 비밀번호가 올바르지 않습니다. |

---

## 3. 인증 필요한 API

**Header:**

```
Authorization: Bearer <accessToken>
```

로그인 응답의 `accessToken`을 그대로 넣으면 됨.

---

## 4. 기타

| 메서드 | 경로 | body | 설명 |
|--------|------|------|------|
| POST | /auth/refresh | `{ "refreshToken": "..." }` | 새 accessToken 발급. |
| POST | /auth/logout | `{ "refreshToken": "..." }` | 해당 refresh 토큰 무효화. |
| GET | /auth/me | (Header Bearer) | 현재 로그인 사용자 (uuid, id, email, nickname). |

---

## 5. 한 줄 요약

- **회원가입:** `POST /auth/signup` + JSON `{ id, email, password, nickname }` (모두 필수, id/email/nickname 유일).
- **로그인:** `POST /auth/login` + JSON `{ id, password }` (id는 로그인 ID, 이메일 아님).
- **DB:** PK는 `uuid`. `id`, `email`, `nickname`은 필수 + UNIQUE.
