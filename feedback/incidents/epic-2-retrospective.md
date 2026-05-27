# Epic 2 회고 — 엑셀 업로드 및 AI 컬럼 分析

**회고 날짜**: 2026-05-27  
**참여**: Katie (Project Lead), Amelia (Developer), Alice (Product Owner), Charlie (Senior Dev), Dana (QA Engineer), Elena (Junior Dev)  
**이전 회고**: [epic-1-retrospective.md](./epic-1-retrospective.md)

---

## Epic 요약

| 항목 | 내용 |
|---|---|
| 완료 스토리 | 4/4 (100%) |
| 기간 | 2026-05-22 ~ 2026-05-27 |
| validate.ps1 최종 결과 | PASSED (typecheck + lint + build) |
| Phase B 리뷰 판정 | APPROVED (수정 후) |
| REJECTED → 수정 | IMPORTANT 9개 + NIT 4개 |

### 스토리 목록

| Story | 제목 | 상태 |
|---|---|---|
| 2.1 | 양식 다운로드 및 파일 업로드 UI | ✅ done |
| 2.2 | 양식 자동 검증 | ✅ done |
| 2.3 | GPT-5.5 전체 컬럼 分析 및 확인 화면 | ✅ done |
| 2.4 | 취소 대상 선택 및 분류 실행 트리거 | ✅ done |

---

## Epic 1 Action Item 이행 현황

| # | Epic 1 규칙 | 이행 여부 | 비고 |
|---|---|---|---|
| Rule 1 | GPT 재시도 두 레이어 구분 | ✅ | Epic 2 scope 외 — 분류 로직 없음 |
| Rule 2 | `src/lib/` 서버 헬퍼 레이어 인식 | ✅ | `session-start.ts`를 `src/upload/`에 올바르게 배치 |
| Rule 3 | Responses API `.output_text` 사용 | ✅ | `column-analysis.ts` parseColumnAnalysisResponse 정상 |
| Rule 4 | 테스트 파일명 대상 일치 | ✅ | `tests/workbook-data.test.ts`, `tests/column-analysis.test.ts` 일관 |

---

## 잘된 것 (Strengths)

1. **SheetJS 동적 import 완전 준수** — `await import('xlsx')` 패턴으로 번들 크기 영향 없이 브라우저에서 엑셀 파싱. 서버 업로드 없음.

2. **클라이언트 보안 경계** — `OPENAI_API_KEY` / `SUPABASE_SERVICE_ROLE_KEY` 브라우저 코드 완전 배제. 모든 GPT·DB 호출이 Route Handler 경유.

3. **AbortController 경쟁 조건 처리** — 파일 재업로드 시 진행 중인 GPT 分析 요청을 취소하는 `AbortController` 패턴 적용 (FIX-7). 프로덕션에서 재현하기 어려운 Stale-response 버그 사전 제거.

4. **Zod 스키마 검증** — `ColumnAnalysisPayloadSchema`로 GPT 要청 본문 검증, `UploadRowRecordSchema`에 셀 값 길이 제한(`z.string().max(500)`)으로 토큰 한도 초과 방지.

5. **validateTemplateColumns 실패 시 분류 버튼 비활성화** — AC 기준 조건부 UX가 정확히 구현됨. AI 승인 전 취소 대상 카드 비노출도 정상.

---

## 과제 및 이슈 (Challenges)

### Issue 1: Route Handler HTTP 경계 Zod 검증 누락 (FIX-3, FIX-4)
- **발생**: Phase B 리뷰 시 발견
- **내용**: `analyze-columns/route.ts`는 `as Parameters<typeof analyzeWorkbookColumns>[0]` 타입 단언, `sessions/route.ts`는 `as unknown as never`를 사용하고 Zod `safeParse` 미호출
- **영향**: 잘못된 JSON이나 필드 누락 요청이 내부 함수까지 그대로 전달됨. Epic 3 분류 API에서 반복될 가능성 높음
- **해결**: 두 Route Handler 모두 `RequestBodySchema.safeParse(rawBody)` 추가, 실패 시 400 반환으로 수정

### Issue 2: 서버 전용 모듈 가드 누락 + 클라이언트 직접 import (FIX-2)
- **발생**: Phase B 리뷰 시 발견
- **내용**: `session-start.ts`에 `import 'server-only'` 없음. `"use client"` 컴포넌트 `upload-workspace.tsx`가 서버 전용 `buildSessionInsertPayload`를 직접 import하고, camelCase → snake_case → camelCase 이중 변환 로직 발생
- **영향**: DB 스키마 타입이 클라이언트 번들에 포함될 수 있음. TypeScript 빌드로 차단되지 않아 잠재 취약점
- **해결**: `session-start.ts` 첫 줄에 `import 'server-only'` 추가, 클라이언트는 camelCase body를 Route Handler에 직접 전송하도록 리팩터

### Issue 3: 아키텍처 명세 경로와 구현 경로 불일치 (FIX-1)
- **발생**: Phase B 리뷰 시 발견
- **내용**: `architecture-rules.md` 명세는 `/templates/cancellation-template.xlsx`이나 구현은 `/template/취소사유분析기_양식.xlsx` 사용. Story 2.1 Dev Notes에 두 경로가 동시에 기재되어 혼란 발생
- **영향**: 런타임 404 — 다운로드 버튼이 실제 파일 없는 경로를 가리킴
- **해결**: `TEMPLATE_DOWNLOAD_PATH` 상수를 아키텍처 명세 경로로 수정

### Issue 4: trim 불일치 — 표시와 카운트 로직이 달랐음 (FIX-6)
- **발생**: Phase B 리뷰 시 발견
- **내용**: `getResultValueOptions`는 `row[col]?.trim()`으로 옵션 생성, `countRowsForSelectedResultValues`는 `selectedSet.has(row[col])` (trim 없음)
- **영향**: 셀 값에 앞뒤 공백이 있으면 체크박스 선택해도 분류 대상 건수가 0으로 계산
- **해결**: `countRowsForSelectedResultValues`에도 `.trim()` 적용

### Issue 5: `parseWorkbookFile` worksheet undefined 무처리 (FIX-8)
- **발생**: Phase B 리뷰 시 발견
- **내용**: `workbook.Sheets[firstSheetName]`이 undefined일 때 SheetJS가 빈 배열 반환. 컬럼 누락 에러가 오해성 메시지로 표시됨
- **해결**: 명시적 `throw new Error("업로드한 파일의 시트 데이터를 읽을 수 없습니다")` 추가

### Issue 6: GPT 프롬프트 주입 방지 미흡 (FIX-5)
- **발생**: Phase B 리뷰 시 발견
- **내용**: `sampleRows` 셀 값을 원본 그대로 JSON.stringify하여 프롬프트에 삽입. 셀 값 최대 길이 제한 없음
- **해결**: `UploadRowRecordSchema` 값 필드에 `z.string().max(500)` 추가

---

## 추가된 Feedback 규칙

| # | 규칙 제목 | 관련 이슈 |
|---|---|---|
| Rule 5 | Route Handler는 HTTP 경계에서 반드시 Zod 검증을 수행하라 | FIX-3, FIX-4 |
| Rule 6 | 서버 전용 모듈은 `import 'server-only'`를 선언하고 클라이언트에서 직접 import하지 마라 | FIX-2 |
| Rule 7 | 아키텍처 명세의 경로를 코드에 그대로 사용하라 | FIX-1 |

---

## Epic 3 권고사항

### 반드시 알아야 할 것 (Epic 3 착수 전)

1. **Route Handler Zod 검증 필수** — `/api/classify/start`, `/api/classify/status` 등 모든 POST 엔드포인트 첫 번째 단계로 `Schema.safeParse(rawBody)` 실행 (feedback-rules.md Rule 5).

2. **서버 전용 모듈 가드** — `src/classify/` 아래 새 모듈 생성 시 첫 줄에 `import 'server-only'` 필수. 클라이언트 컴포넌트는 `/api/classify` Route Handler 경유 (feedback-rules.md Rule 6).

3. **GPT 재시도 레이어 구분** — 분류 행 단위 retry(1.5초 대기 후 1회)와 인프라 retry(`lib/gpt-retry.ts`, 3회 backoff)를 혼용 금지. Story 3.2 AC에 레이어 명시 필요 (feedback-rules.md Rule 1).

4. **분류 진행 상태 폴링** — `/analyzing` 페이지에서 `/api/classify/status` 폴링 시 `clearInterval` cleanup 필수 (performance-rules.md).

5. **Vercel 30초 한도** — GPT 분류 루프가 긴 경우 백그라운드 처리 + 상태 폴링 패턴 사용 (deploy-rules.md).

---

## 완료 요약

- **처리 Story 수**: 4개 (S2.1 ~ S2.4)
- **신규 feedback 규칙**: 3개 추가 (Rule 5, 6, 7)
- **Phase B 판정**: APPROVED (IMPORTANT 9개 + NIT 4개 수정 후)
- **validate.ps1**: PASSED
- **다음 Epic**: Epic 3 — AI 분류 실행 및 결과 저장
