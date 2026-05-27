# Epic 1 코드 리뷰 결과

**리뷰 날짜**: 2026-05-27  
**브랜치**: feature/s1-3-deployment-navigation-session-guard → master  
**리뷰 방법**: 3-layer 병렬 리뷰 (Blind Hunter / Edge Case Hunter / Acceptance Auditor)  
**검증 결과**: `validate.ps1` PASSED (typecheck ✅ lint ✅ build ✅)

---

## APPROVED 항목 ✅

### Story 1.1 — 프론트엔드 기반 및 디자인 토큰

- ✅ `tsconfig.json` strict mode (`"strict": true`, `"strictNullChecks": true`)
- ✅ 색상 토큰 완전 정의: ink=#111827, surface=#F7F7F8, hairline=#E5E7EB, status-done=#10B981, status-review=#F59E0B, status-error=#EF4444 + soft 변형 포함
- ✅ Pretendard 폰트: `layout.tsx` import (400/500/600), `globals.css` font-family, tailwind `sans` 등록
- ✅ 타이포그래피 스케일: heading-page 24px/600, heading-section 18px/600, body 15px/400, table 14px/400, badge 12px/500
- ✅ shadcn/ui 컴포넌트 모두 설치: Button, Card, Badge (done/review/error variants), Checkbox, Progress, Toast (review/error variants), Toaster, use-toast
- ✅ `design-tokens.test.ts`: 색상 팔레트, 타이포그래피, 폰트 스택, tailwind config 연결 검증
- ✅ 서버리스 환경 싱글톤 패턴: Next.js App Router 표준, 인스턴스별 독립 모듈 캐시

### Story 1.2 — 백엔드 기반 및 공통 래퍼

- ✅ `server-only` 보호: `shared/supabase/server.ts`, `shared/env/server.ts`, `lib/gpt-client.ts` 모두 `import "server-only"` 선언
- ✅ DB 스키마: `supabase/migrations/20260527143000_initial_schema.sql`에 sessions, classification_results, new_categories 테이블 정의 (UUID PK, timestamptz, 제약조건, 인덱스, updated_at 트리거 포함)
- ✅ API 공통 래퍼: `withApiHandler` → `{ error: string }` 일관된 응답, `ApiError` status code 보존
- ✅ GPT 재시도: p-retry `retries: 3`, factor=2, minTimeout=1s, maxTimeout=4s → 1초/2초/4초 exponential backoff (Story 1.2 AC4 충족)
- ✅ 시크릿 비노출: `.env.example` 값 없음, `OPENAI_API_KEY`/`SUPABASE_SERVICE_ROLE_KEY`는 server-only 모듈에만 존재
- ✅ `api-handler.test.ts`: 4개 케이스 (성공, ApiError 보존, 내부 에러 은닉, 상태코드 커스텀)
- ✅ `gpt-client.test.ts` (실제: gpt-retry 테스트): 4회 시도 성공, 4회 시도 모두 실패 케이스
- ✅ `server-env.test.ts`: 환경변수 읽기, 분리 reader, 누락 변수 에러 케이스
- ✅ `server-only-guard.test.ts`: `server.ts`에 `import "server-only"` 존재 확인

### Story 1.3 — Vercel 배포, 네비게이션, 세션 가드

- ✅ `vercel.json`: cron `/api/ping` 1일 1회 (`"0 0 * * *"`), 포트 하드코딩 없음
- ✅ AppFrame 네비게이션: "취소사유분석기" 헤더 링크, 3단계 진행 배지(업로드/분류 중/결과), 현재 단계 강조
- ✅ `/analyzing` 세션 가드: `SessionGuard`로 감쌈, session_id 없을 시 토스트("먼저 파일을 업로드해 주세요") + `/upload` 이동
- ✅ `/result` 세션 가드: 동일하게 `SessionGuard`로 감쌈
- ✅ `/api/health`: `{ status: "ok", version: "1.0.0" }` 반환 (architecture-rules.md NFR 충족)
- ✅ `/api/ping`: Supabase sessions 1건 경량 조회, `withApiHandler`로 에러 처리
- ✅ `navigation-stages.test.ts`, `session-guard.test.ts`, `ping-service.test.ts`, `vercel-config.test.ts` 모두 존재

---

## REJECTED 항목 ❌

없음. 모든 CRITICAL/IMPORTANT 이슈 없음.

---

## 수정 완료 항목 🔧

**Step 2에서 수정한 내용 없음.** (리뷰 결과 REJECTED 항목 없음)

---

## NIT 항목 (비차단)

1. **[NIT]** `src/lib/gpt-client.ts:24` — `runOpenAiJsonRequest` 호출마다 `readOpenAiEnv()` 재실행. 모델명은 싱글톤 초기화 시 한 번만 읽어도 충분. 성능 영향 미미.

2. **[NIT]** `tests/gpt-client.test.ts:4` — 파일명은 `gpt-client.test.ts`이지만 실제로 `gpt-retry.ts`만 테스트. 명칭 불일치. 기능에는 영향 없음.

3. **[NIT]** `src/app/api/ping/route.ts` — Vercel Cron 공식 권장사항인 `Authorization: Bearer ${CRON_SECRET}` 헤더 검증 없음. 저위험(ping만 실행)이지만 운영 환경에서 무단 호출 방지를 위해 추후 추가 권장.

4. **[NIT]** `src/components/session-guard.tsx:16` — `window.localStorage.getItem()` try-catch 없음. 일부 브라우저 설정(Safari Private Mode ITP 강화)에서 `SecurityError` 가능. 실제 사내 도구 사용 환경에서는 발생 가능성 극히 낮음.

---

## 최종 판정

```
APPROVED
Summary: Epic 1 (Story 1.1~1.3) 전체 구현이 모든 Acceptance Criteria를 충족하며,
         아키텍처 경계·보안 규칙·테스트 커버리지가 기준을 만족함.
         validate.ps1 PASSED (typecheck + lint + build).
         NIT 4건은 비차단 사항으로 다음 스프린트에서 정리 가능.
```

---

## AC 충족 현황

| Story | AC | 상태 | 비고 |
|---|---|---|---|
| 1.1 | AC1 빌드 성공 | ✅ | strict mode, tsc --noEmit 통과 |
| 1.1 | AC2 색상 토큰 | ✅ | 6개 기본 + soft 변형 포함 |
| 1.1 | AC3 Pretendard | ✅ | npm 패키지 방식 |
| 1.1 | AC4 타이포그래피 | ✅ | 8개 스케일 정의 |
| 1.1 | AC5 shadcn/ui | ✅ | 6개 컴포넌트 + 커스텀 variants |
| 1.2 | AC1 server-only | ✅ | 3개 파일에 guard 적용 |
| 1.2 | AC2 DB 스키마 | ✅ | 3개 테이블, 인덱스, 트리거 |
| 1.2 | AC3 API 래퍼 | ✅ | { error: string } + status code |
| 1.2 | AC4 GPT 재시도 | ✅ | 3회 재시도, 1s/2s/4s backoff |
| 1.2 | AC5 시크릿 비노출 | ✅ | server-only + .env.example 값 없음 |
| 1.3 | AC1 배포 준비 | ✅ | vercel.json, 포트 하드코딩 없음 |
| 1.3 | AC2 네비게이션 | ✅ | AppFrame + 단계 배지 |
| 1.3 | AC3 analyzing 가드 | ✅ | SessionGuard + 토스트 + 리다이렉트 |
| 1.3 | AC4 result 가드 | ✅ | 동일 |
| 1.3 | AC5 Cron ping | ✅ | 매일 0시 UTC, Supabase 경량 조회 |
