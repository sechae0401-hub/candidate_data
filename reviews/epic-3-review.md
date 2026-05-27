# Epic 3 코드 리뷰

**날짜:** 2026-05-27
**브랜치:** feature/s3-3-4-cancel-completion-feedback vs master
**리뷰어:** Claude Code (Phase B)
**변경 통계:** 25개 파일, +1903줄 / -22줄

---

## 리뷰 대상 Story

- Story 3.1: 분류 실행 중 화면 및 진행 표시
- Story 3.2: GPT-5.5 분류 엔진
- Story 3.3: 인사이트 요약, 추천 액션, 기수 비교 생성 및 결과 저장
- Story 3.4: 분류 취소 및 완료 피드백

---

## ✅ APPROVED 항목

- `src/classify/analyzing-progress.ts` — 배치 범위, 진행률, 스테이지 레이블, 부분 실패 안내 순수 유틸리티 구현
- `src/classify/completion-feedback.ts` — 완료 메시지(1초 표시, 150ms fade) 타이밍 상수 구현 (AC3/AC4 충족)
- `src/classify/classification-engine.ts` — Zod 검증, 빈 행 자동 태깅("정보 부족"), 1.5초 후 1회 row-layer 재시도, fallback 처리 (FR22, FR23, feedback Rule 1 준수)
- `src/classify/insight-summary.ts` — TOP3 원인 비율, 기수 비교, 첫 기수 안내, GPT 프롬프트/파서 구현 (FR24, FR41, FR42)
- `src/app/api/classify/route.ts` — Zod safeParse 적용, `runWithGptRetry` 직접 호출 없음 (feedback Rule 1 준수)
- `src/app/api/insight/route.ts` — InsightRequestSchema safeParse, 이전 기수 조회/비교, 세션 완료 업데이트
- `src/app/api/sessions/[id]/route.ts` — PATCH 취소 API, Zod로 `z.enum(["cancelled"])` 제한
- `vercel.json` — `/api/classify` maxDuration 9초 설정 (AC6 충족)
- `tests/analyzing-progress.test.ts` — 배치 범위, 진행률, 스테이지 레이블 테스트
- `tests/classification-engine.test.ts` — Zod 스키마, 빈 행 처리, 재시도 mock, insert payload 테스트
- `tests/insight-summary.test.ts` — TOP3 비율, 기수 비교, 파서, 저장 직렬화 테스트
- `tests/completion-feedback.test.ts` — 타이밍 상수 테스트

---

## ❌ REJECTED 항목 (수정 필요)

### CRITICAL

**F1** `src/upload/session-start.ts` — `import 'server-only'` 제거
- **위반:** `feedback-rules.md` Rule 6, `security-rules.md`
- **내용:** Epic 2에서도 동일 문제로 REJECTED 이력 있음. `import 'server-only'` 가드가 없으면 TypeScript 빌드에서 차단되지 않아 `SUPABASE_SERVICE_ROLE_KEY`가 클라이언트 번들에 포함될 위험.
- **수정:** 파일 첫 줄에 `import 'server-only';` 복원

**F2** `src/classify/analyzing-workspace.tsx` — `classify → upload` 직접 cross-module import
- **위반:** `architecture-rules.md` "upload ↔ classify ↔ result 간 직접 import 금지"
- **내용:** `"use client"` 컴포넌트(`classify` 모듈)가 `@/upload/classification-draft`에서 `ClassificationDraft`, `CLASSIFICATION_DRAFT_STORAGE_KEY`를 직접 import. `shared/`를 통해서만 허용.
- **수정:** `ClassificationDraftRow`, `ClassificationDraft` 타입과 `CLASSIFICATION_DRAFT_STORAGE_KEY` 상수를 `src/shared/types/classification-draft.ts`로 이동; `analyzing-workspace.tsx`는 `@/shared/types/classification-draft`에서 import; `upload/classification-draft.ts`도 shared에서 타입 import

### IMPORTANT

**F3** `src/classify/analyzing-workspace.tsx` — Cancel 도중 in-flight 배치 루프 미중단
- **내용:** 사용자가 취소 버튼 클릭 시 `PATCH /api/sessions/[id]`는 호출되지만 `runClassification`의 `for...of` 루프는 계속 실행되어 `cancelled` 상태 세션에 분류 결과가 계속 insert됨.
- **수정:** `isCancelledRef = useRef(false)` 추가, 루프 시작 시 `if (isCancelledRef.current) break`, 취소 확인 직후 `isCancelledRef.current = true` 설정

**F4** `src/classify/analyzing-workspace.tsx` — `window.confirm()` 취소 확인
- **내용:** `window.confirm()`은 스레드 블로킹, 접근성 미흡, shadcn/ui 컴포넌트 시스템과 불일치.
- **수정:** shadcn/ui `AlertDialog` 컴포넌트로 교체

**F5** `src/classify/classification-engine.ts` — GPT 응답 rowIndex 검증 없음
- **내용:** GPT가 입력 행과 다른 `rowIndex` 값을 반환하면 잘못된 행에 분류 결과가 삽입됨. `ClassificationResponseSchema`는 값 범위만 검증하고 입력-출력 rowIndex 일치 여부는 확인하지 않음.
- **수정:** `classifyNonEmptyRowsWithRetry`에서 GPT 응답 rowIndex 집합이 입력 rows의 rowIndex 집합과 일치하는지 검증; 불일치 시 throw하여 fallback 경로 진입

**F6** `src/app/api/result/[sessionId]/route.ts` — `sessions.select("*")` 과다 노출
- **내용:** 세션 전체 컬럼을 클라이언트에 반환. `insight_summary`(대용량 JSON), 내부 메타데이터 포함. 최소 권한 원칙 위반.
- **수정:** 필요한 컬럼만 명시적으로 select

### NIT

**F8** `src/classify/analyzing-workspace.tsx` — 완료 메시지에 `totalRows` 전달 (파라미터명 불일치)
- **내용:** `buildCompletionMessage(totalRows)` 호출. 함수 파라미터명은 `completedRows`. 정상 경로에서는 같은 값이지만 의미적으로 `completedRows` state 변수를 사용하는 것이 더 명확.
- **수정:** `buildCompletionMessage(completedRows)` 로 변경

---

## 🔧 수정 완료 항목

- **F1** `src/upload/session-start.ts` — `import 'server-only'` 복원
- **F2** `src/shared/types/classification-draft.ts` 생성 — `ClassificationDraftRow`, `ClassificationDraft`, `CLASSIFICATION_DRAFT_STORAGE_KEY` 이동; `analyzing-workspace.tsx`가 `@/shared/types/classification-draft`에서 import하도록 수정; `upload/classification-draft.ts`도 shared에서 re-export
- **F3** `analyzing-workspace.tsx` — `isCancelledRef` 추가, 배치 루프 시작 시 `break` 체크, 취소 확인 직후 `isCancelledRef.current = true` 설정
- **F4** `analyzing-workspace.tsx` — `window.confirm` → shadcn `AlertDialog` 교체; `src/components/ui/alert-dialog.tsx` 추가
- **F5** `src/classify/classification-engine.ts` — `validateResultRowIndices` 함수 추가; GPT 응답 rowIndex 집합이 입력과 불일치 시 throw하여 fallback 경로 진입
- **F6** `src/app/api/result/[sessionId]/route.ts` — `select("*")` → 명시적 컬럼 지정 (sessions, classification_results, new_categories 모두)
- **F8** `analyzing-workspace.tsx` — 완료 메시지 `buildCompletionMessage(totalRows)` → `buildCompletionMessage(completedRows)` 수정

**검증 결과:** `./scripts/validate.ps1` → typecheck, lint, build 모두 PASS

---

## 최종 판정: APPROVED

**수정 후 재검증 필요:**
- `./scripts/validate.ps1` 통과
- 아키텍처 경계 위반 없음
- 보안 이슈 없음
