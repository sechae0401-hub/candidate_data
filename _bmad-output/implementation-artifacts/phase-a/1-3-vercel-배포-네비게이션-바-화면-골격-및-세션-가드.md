# Story 1.3: Vercel 배포, 네비게이션 바, 화면 골격 및 세션 가드

Status: review

## Story

채매니저로서,
도구 URL에 접속하면 네비게이션 바와 함께 업로드 화면이 표시되고, 잘못된 URL로 직접 접근해도 올바른 화면으로 안내받고 싶다,
그래야 도구를 혼선 없이 사용할 수 있다.

## Acceptance Criteria

1. **[배포 준비]** GitHub main 브랜치에 코드를 push하면 Vercel 자동 배포가 가능하고 `.vercel.app` URL로 접속 가능한 구성이다. (NFR8)
2. **[네비게이션 바]** 어떤 페이지든 로드 시 도구명 `취소사유분석기`와 현재 단계 표시가 있는 네비게이션 바가 보인다. (UX-DR14)
3. **[분류 중 세션 가드]** `/analyzing`에 `localStorage.session_id` 없이 직접 접근하면 `/upload`로 즉시 이동하고 `"먼저 파일을 업로드해 주세요"` 토스트가 표시된다. (FR35)
4. **[결과 화면 세션 가드]** `/result`에 `localStorage.session_id` 없이 직접 접근하면 `/upload`로 즉시 이동하고 같은 토스트가 표시된다. (FR35)
5. **[Cron ping]** `vercel.json`에 `/api/ping` Cron Job이 1일 1회로 설정되어 있고, `GET /api/ping`은 200과 함께 Supabase 경량 조회를 수행한다. (NFR12)

## Tasks / Subtasks

- [x] Task 1: 공통 네비게이션과 화면 골격 구성 (AC: 2)
  - [x] 1.1 현재 경로 기준 단계 표시 모델 정의
  - [x] 1.2 `취소사유분석기` 제목과 단계 인디케이터가 있는 공통 헤더 추가
  - [x] 1.3 `/upload`, `/analyzing`, `/result` 화면 골격을 실제 사용자 흐름 기준으로 정리

- [x] Task 2: 루트 진입과 세션 가드 구현 (AC: 3, 4)
  - [x] 2.1 루트(`/`) 접속 시 `/upload`로 진입 흐름 정리
  - [x] 2.2 세션 가드 순수 로직과 클라이언트 컴포넌트 분리
  - [x] 2.3 `/analyzing`, `/result`에서 `session_id` 없을 때 토스트 후 `/upload` 이동

- [x] Task 3: 배포 보조 라우트와 설정 추가 (AC: 1, 5)
  - [x] 3.1 `GET /api/ping` 구현
  - [x] 3.2 `GET /api/health` 구현 (`{ status: "ok", version: "1.0.0" }`)
  - [x] 3.3 `vercel.json`에 Cron 설정 추가

- [x] Task 4: 테스트 먼저 작성하고 회귀 방지 (AC: 2, 3, 4, 5)
  - [x] 4.1 단계 라우팅/표시 매핑 테스트 추가
  - [x] 4.2 세션 가드 순수 로직 테스트 추가
  - [x] 4.3 Vercel Cron 설정 테스트 추가
  - [x] 4.4 ping 라우트 핵심 동작 테스트 또는 주입 가능한 서비스 테스트 추가

- [x] Task 5: 최종 검증 (AC: 1, 2, 3, 4, 5)
  - [x] 5.1 `npm test` 통과
  - [x] 5.2 `npx tsc --noEmit` 통과
  - [x] 5.3 `npm run build` 통과
  - [x] 5.4 `./scripts/validate-quick.ps1` 통과

## Dev Notes

### 이전 Story에서 이어받는 맥락

- Story 1.1로 기본 UI 토큰과 공통 컴포넌트, `/upload`, `/analyzing`, `/result` placeholder 페이지가 이미 존재한다.
- Story 1.2로 `src/shared/supabase/server.ts`, `src/lib/api-handler.ts`, `src/lib/gpt-client.ts`, `supabase/migrations`가 준비됐다.
- PowerShell 검증 스크립트는 이미 호환성 수정이 반영되어 있다.

### 이번 Story의 핵심 제약

- 세션 상태는 `localStorage` 기반이므로 서버 컴포넌트가 아니라 클라이언트 가드에서 처리해야 한다.
- 세션 가드는 `/upload`로 보내되, 빈 화면 깜빡임을 줄이기 위해 로딩 fallback이 필요할 수 있다.
- 토스트는 Story 1.1에서 만든 `useToast`를 재사용한다.
- `/api/ping`은 service-role Supabase 클라이언트를 쓰되, 무거운 쿼리 대신 `sessions` 1건 조회 수준으로 제한한다.
- `vercel.json`은 포트를 하드코딩하지 않고 Cron과 함수 설정만 담는다.

### 구현 후보 파일

- 신규/변경 후보
  - `src/app/layout.tsx`
  - `src/app/page.tsx`
  - `src/app/upload/page.tsx`
  - `src/app/analyzing/page.tsx`
  - `src/app/result/page.tsx`
  - `src/components/app-shell-preview.tsx` 또는 공통 레이아웃 분리
  - `src/components/app-frame.tsx`
  - `src/components/session-guard.tsx`
  - `src/shared/navigation/stages.ts`
  - `src/shared/session/session-guard.ts`
  - `src/shared/monitoring/ping.ts`
  - `src/app/api/ping/route.ts`
  - `src/app/api/health/route.ts`
  - `vercel.json`
  - `tests/*`

### FRD / 디자인 포인트

- 업로드 화면은 항상 시작점이므로 루트에서 `/upload`로 유도
- 상단 네비게이션 바는 단계 흐름을 분명하게 보여줘야 함: 업로드 → 분류 중 → 결과
- 결과/분류 중 화면은 세션 없이 직접 열 수 없고, 업로드로 돌려보내면서 같은 안내 문구를 사용
- 결과 화면은 `max-w-5xl`, 업로드/분류 중 화면은 `max-w-2xl` 흐름 유지

### Git Intelligence

- 최근 커밋: `feat(frontend): bootstrap app foundation and design tokens`
- 최근 커밋: `feat(backend): add server wrappers and schema foundation`
- 이번 Story는 두 결과물을 연결하는 얇은 흐름 계층(UI shell + session guard + deployment config) 역할

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- `npm test`
- `npx tsc --noEmit`
- `npm run build`
- `./scripts/validate-quick.ps1`

### Completion Notes List

- `src/components/app-frame.tsx`와 `src/shared/navigation/stages.ts`로 상단 네비게이션 바와 단계 표시를 공통 레이아웃에 연결했다.
- 루트(`/`)는 `/upload`로 즉시 이동하도록 정리했고, 업로드 화면을 실제 시작점 역할의 골격으로 확장했다.
- `src/components/session-guard.tsx`와 `src/shared/session/session-guard.ts`를 추가해 `/analyzing`, `/result` direct access 시 토스트 후 `/upload`로 되돌리도록 구성했다.
- `GET /api/ping`, `GET /api/health`, `vercel.json` Cron 설정을 추가했다.
- `ping` 라우트가 OpenAI 환경 변수에 불필요하게 결합되지 않도록 server env reader를 `OpenAI`/`Supabase` 용도로 분리했다.
- `npm test`, `npx tsc --noEmit`, `npm run build`, `./scripts/validate-quick.ps1`를 통과했다.

### File List

- _bmad-output/implementation-artifacts/phase-a/1-3-vercel-배포-네비게이션-바-화면-골격-및-세션-가드.md
- src/app/layout.tsx
- src/app/page.tsx
- src/app/upload/page.tsx
- src/app/analyzing/page.tsx
- src/app/result/page.tsx
- src/app/api/ping/route.ts
- src/app/api/health/route.ts
- src/components/app-frame.tsx
- src/components/session-guard.tsx
- src/shared/navigation/stages.ts
- src/shared/session/session-guard.ts
- src/shared/monitoring/ping.ts
- src/shared/env/read-server-env.ts
- src/shared/env/server.ts
- src/shared/supabase/server.ts
- src/lib/gpt-client.ts
- vercel.json
- tests/navigation-stages.test.ts
- tests/ping-service.test.ts
- tests/session-guard.test.ts
- tests/server-env.test.ts
- tests/vercel-config.test.ts
