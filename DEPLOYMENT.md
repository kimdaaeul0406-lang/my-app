# LUMEN 배포 체크리스트

배포 전 아래 항목을 확인하세요.

---

## 1. 환경 변수 (필수)

배포 플랫폼(Vercel 등)에서 다음 환경 변수를 설정하세요. **`.env.local`은 절대 커밋하지 마세요.**

| 변수명 | 용도 | 필수 |
|--------|------|------|
| `GEMINI_API_KEY` | 사주/타로/별자리/talk API (Gemma 모델) | ✅ |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL | ✅ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key (클라이언트) | ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service_role key (서버 전용, **절대 클라이언트에 노출 금지**) | ✅ |
| `RESEND_API_KEY` | 이메일 발송 (Resend) | 선택 (없으면 이메일 미발송) |
| `RESEND_FROM_EMAIL` | 발신 이메일 주소 (없으면 Resend 기본값 사용) | 선택 |

- env 누락 시: AI API는 500/에러 메시지, Supabase API는 503 또는 명확한 에러 메시지로 응답하도록 처리되어 있습니다.

---

## 2. 빌드

- **로컬 빌드**: Google Fonts 로딩 때문에 **인터넷 연결**이 필요합니다.  
  `npm run build` 실패 시 네트워크/방화벽을 확인하세요.
- **Vercel 등**: 배포 시 빌드 환경에는 네트워크가 있으므로 Fonts는 정상 로드됩니다.
- dev에서 Turbopack 오류가 났다면 `npm run dev`는 `--webpack` 옵션으로 실행 중입니다 (package.json 참고).

---

## 3. Supabase DB

- `supabase/schema.sql`을 Supabase 대시보드에서 실행해 두었는지 확인하세요.
- 필요한 테이블: `subscribers`, `user_sessions`, `readings`
- PostgreSQL 11 이상이면 `EXECUTE FUNCTION` 트리거 문법 사용 가능합니다.

---

## 4. 사이트 URL

- `app/layout.tsx`, `app/sitemap.ts`, `app/robots.ts`, 각 페이지 `layout.tsx`에 **`siteUrl`** 이 하드코딩되어 있습니다.
- 배포 도메인이 `https://my-app-jade-eight-85.vercel.app` 이 아니면 해당 URL을 배포 도메인으로 **전역 검색 후 수정**하세요.

---

## 5. 코드 점검 요약 (이미 반영된 사항)

- **API**: GEMINI_API_KEY / Supabase env 누락 시 크래시 대신 500·503 또는 안전한 응답 반환
- **별자리**: 사주/타로와 동일 모델 `gemma-3-27b-it` 사용
- **클라이언트**: `window`/`localStorage` 사용처는 모두 `"use client"` 또는 `typeof window` 체크로 처리
- **.gitignore**: `.env*` 포함되어 있어 env 파일 커밋 방지

---

## 6. 배포 후 확인

1. `/`, `/saju`, `/tarot`, `/zodiac`, `/talk`, `/plan` 접속 및 기본 동작 확인
2. 사주/타로/별자리에서 한 번씩 결과 요청 → API 정상 응답 확인
3. 이메일 저장/구독(선택) → Resend 연동 확인
4. `https://<배포도메인>/sitemap.xml`, `https://<배포도메인>/robots.txt` 접근 확인
