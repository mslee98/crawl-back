# 인증 REST API 설계 — 로그인 / 로그아웃 및 토큰 전략

## 1. 토큰 전략 개요

### 1.1 선택: Access Token + Refresh Token

| 구분 | Access Token | Refresh Token |
|------|--------------|---------------|
| **형식** | JWT (서명만, DB 미저장) | 불투명 토큰 또는 JWT (DB 저장) |
| **만료** | 짧음 (예: 15분 ~ 1시간) | 김 (예: 7일 ~ 30일) |
| **저장 위치** | 클라이언트 메모리/메모리 스토리지 권장 | 클라이언트 저장소 (HttpOnly Cookie 권장) |
| **용도** | API 요청 시 `Authorization: Bearer <access>` | Access 만료 시 새 Access 발급 |
| **폐기** | 만료로 자동 폐기 | 로그아웃/탈퇴 시 DB에서 삭제 또는 블랙리스트 |

- **로그아웃**: Refresh Token을 DB에서 삭제(또는 무효화)하여 해당 세션만 종료.
- **보안**: Access는 짧게 두어 유출 시 피해를 줄이고, Refresh는 DB로 관리해 로그아웃·탈퇴 시 즉시 무효화 가능.

---

## 2. REST API 명세

### 2.1 로그인

| 항목 | 내용 |
|------|------|
| **메서드/경로** | `POST /auth/login` |
| **설명** | 이메일(또는 아이디) + 비밀번호로 로그인, Access + Refresh 발급 |

**요청 (JSON)**

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `email` | string | O | 로그인 이메일 |
| `password` | string | O | 비밀번호 (평문 전송, 서버에서 해시 비교) |

**요청 예시**

```json
{
  "email": "user@example.com",
  "password": "your-secure-password"
}
```

**응답 (200)**

| 필드 | 타입 | 설명 |
|------|------|------|
| `accessToken` | string | JWT Access Token |
| `refreshToken` | string | Refresh Token (DB 저장용 값) |
| `expiresIn` | number | Access 만료까지 초 단위 (예: 900) |
| `user` | object | 로그인 사용자 요약 (id, email, nickname 등) |

**응답 예시**

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "expiresIn": 900,
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "nickname": "nick"
  }
}
```

**에러**

- `401 Unauthorized`: 이메일 없음 / 비밀번호 불일치
- `400 Bad Request`: body 검증 실패 (이메일 형식, 필수 필드 등)

---

### 2.2 Access Token 갱신 (Refresh)

| 항목 | 내용 |
|------|------|
| **메서드/경로** | `POST /auth/refresh` |
| **설명** | Refresh Token으로 새 Access Token 발급 |

**요청**

- **Body (JSON)**  
  | 필드 | 타입 | 필수 | 설명 |
  |------|------|------|------|
  | `refreshToken` | string | O | 로그인 시 받은 Refresh Token |

- 또는 **Cookie**: Refresh Token을 HttpOnly Cookie로 보낼 경우 body 생략 가능 (구현 시 선택).

**요청 예시 (body 사용)**

```json
{
  "refreshToken": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
}
```

**응답 (200)**

- 로그인 응답과 동일하게 `accessToken`, `expiresIn` (필요 시 `user` 재포함 가능).

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 900
}
```

**에러**

- `401 Unauthorized`: Refresh Token 없음/만료/DB에 없음(이미 로그아웃됨).

---

### 2.3 로그아웃

| 항목 | 내용 |
|------|------|
| **메서드/경로** | `POST /auth/logout` |
| **설명** | 해당 Refresh Token을 DB에서 삭제(무효화)하여 로그아웃 처리 |

**요청**

- **Body (JSON)**  
  | 필드 | 타입 | 필수 | 설명 |
  |------|------|------|------|
  | `refreshToken` | string | O | 무효화할 Refresh Token |

- 또는 **Cookie**: Refresh Token을 HttpOnly로 보낼 경우 body 생략 가능.

**요청 예시**

```json
{
  "refreshToken": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
}
```

**응답 (200)**

- body는 비워두거나 성공 메시지만 반환.

```json
{
  "message": "로그아웃되었습니다."
}
```

**에러**

- `401 Unauthorized`: Refresh Token 없음/이미 무효화됨 — 클라이언트는 로컬에서 토큰 삭제만 하면 됨.

---

### 2.4 인증이 필요한 API 사용 방법

- **Header**  
  `Authorization: Bearer <accessToken>`
- Access 만료 시: `POST /auth/refresh`로 새 Access 발급 후 재요청.
- Refresh까지 만료/무효면: 로그인 화면으로 이동.

---

## 3. 토큰 전략 요약

1. **Access Token (JWT)**  
   - 페이로드: `sub`(userId), `email`, `iat`, `exp` 등.  
   - 서버는 서명 검증만 하며 DB 조회 없이 인증 가능.

2. **Refresh Token**  
   - 서버에서 랜덤 생성 후 DB `refresh_tokens` 테이블에 저장.  
   - 로그아웃/탈퇴 시 해당 행 삭제 또는 `revoked_at` 설정으로 무효화.

3. **보안 권장**  
   - HTTPS 필수.  
   - Refresh Token은 가능하면 HttpOnly Cookie로 전달해 XSS 노출 감소.  
   - 비밀번호는 bcrypt 등으로 해시 저장 및 비교.

이 문서를 기준으로 구현 시 Auth 모듈, Guard, DB 스키마를 맞추면 됩니다.
