# Epic 3 회고 — AI 분류 실행 및 결과 저장

**회고 날짜**: 2026-05-28
**이전 회고**: [epic-2-retrospective.md](./epic-2-retrospective.md)

---

## Epic 요약

| 항목 | 내용 |
|---|---|
| 완료 Story | 4/4 (100%) |
| 완료 날짜 | 2026-05-27 |
| validate.ps1 최종 결과 | PASSED (typecheck + lint + build) |
| Phase B 리뷰 판정 | APPROVED (수정 후) |
| CRITICAL 수정 | 2개 |
| IMPORTANT 수정 | 4개 |
| NIT 수정 | 1개 |

### Story 목록

| Story | 제목 | 상태 |
|---|---|---|
| 3.1 | 분류 실행 중 화면 및 진행 표시 | ✅ done |
| 3.2 | GPT-5.5 분류 엔진 | ✅ done |
| 3.3 | 인사이트 요약, 추천 액션, 기수 비교 생성 및 결과 저장 | ✅ done |
| 3.4 | 분류 취소 및 완료 피드백 | ✅ done |

---

## Epic 2 Action Item 이행 현황

| # | Epic 2 Rule | 이행 여부 | 비고 |
|---|---|---|---|
| Rule 1 | GPT 재시도 두 레이어 구분 | ✅ | `/api/classify`에서 `runWithGptRetry` 직접 호출 없음. 행 레이어 1.5초 1회 재시도 별도 구현 |
| Rule 5 | Route Handler Zod 검증 필수 | ✅ | `/api/classify`, `/api/insight`, `/api/sessions/[id]` 모두 safeParse 적용 |
| Rule 6 | `import 'server-only'` 가드 | ❌ | `session-start.ts`에서 **또 다시** 제거됨 (Epic 2와 동일 파일, 동일 이슈 반복) |

---

## 잘된 것 (Strengths)

1. **GPT 재시도 레이어 완벽 준수** — feedback Rule 1을 처음으로 완전히 적용. `/api/classify`에서 `runWithGptRetry` 직접 호출 없이, 행 레이어 재시도(1.5초 후 1회)와 인프라 레이어 재시도(`lib/gpt-retry.ts`)를 명확히 분리.

2. **테스트 커버리지 균등** — 모든 신규 모듈(`analyzing-progress.ts`, `classification-engine.ts`, `insight-summary.ts`, `completion-feedback.ts`)에 대응하는 테스트 파일이 존재. validate-quick 전 통과.

3. **Zod 스키마 일관 적용** — GPT 응답 파싱(Responses API `.output_text`), Route Handler 요청 검증, 배치 크기 제한 모두 Zod로 처리. 런타임 타입 안전성 확보.

4. **빈 행 처리·fallback 로직** — 인터뷰내용·특이사항이 모두 비어 있는 행을 GPT 비용 없이 자동 태깅(정보 부족). GPT 완전 실패 시 배치 3건 `needs_review` fallback 저장 후 다음 배치 계속 진행.

5. **Vercel 타임아웃 설정** — `vercel.json`에 `/api/classify` 9초 maxDuration을 AC 요건대로 설정. deploy-rules.md의 서버리스 제약 준수.

---

## 이슈 목록

### Issue 1 (CRITICAL): `import 'server-only'` 반복 제거 — F1
- **발생**: Phase B 리뷰 시 발견 (Story 3.1)
- **내용**: `src/upload/session-start.ts`의 `import 'server-only'`가 Epic 3 구현 중 또 다시 제거됨. Epic 2에서 Rule 6으로 등록된 동일 파일·동일 이슈가 2번 연속 CRITICAL 판정.
- **영향**: `SUPABASE_SERVICE_ROLE_KEY` 의존 코드가 클라이언트 번들에 포함될 수 있음. TypeScript 빌드로 차단되지 않아 런타임까지 잠재 취약점 유지.
- **해결**: 파일 첫 줄 `import 'server-only';` 복원.
- **신규 규칙**: Rule 6 강화 (Codex가 불필요 import로 인식해 삭제하는 패턴 명시)

### Issue 2 (CRITICAL): `classify → upload` 직접 cross-module import — F2
- **발생**: Phase B 리뷰 시 발견 (Story 3.1)
- **내용**: `analyze-workspace.tsx`(classify 모듈)가 `@/upload/classification-draft`에서 `ClassificationDraft`, `CLASSIFICATION_DRAFT_STORAGE_KEY`를 직접 import. `architecture-rules.md` 금지 패턴.
- **영향**: 모듈 간 결합도 증가. 향후 upload 모듈 변경 시 classify 모듈도 영향 받음.
- **해결**: `src/shared/types/classification-draft.ts` 신설 후 공유 타입/상수 이동. 두 모듈 모두 shared에서 import.
- **신규 규칙**: Rule 10 (모듈 간 공유 타입·상수는 `src/shared/types/`로 먼저 이동)

### Issue 3 (IMPORTANT): Cancel 도중 in-flight 배치 루프 미중단 — F3
- **발생**: Phase B 리뷰 시 발견 (Story 3.4)
- **내용**: 사용자가 취소 버튼 클릭 후 `PATCH /api/sessions/[id]`는 호출되지만 `runClassification` for...of 루프가 계속 실행. cancelled 세션에 분류 결과 계속 insert.
- **해결**: `isCancelledRef = useRef(false)` 추가, 루프 시작 시 ref 체크, 취소 확인 직후 ref.current = true 설정.

### Issue 4 (IMPORTANT): `window.confirm()` 사용 — F4
- **발생**: Phase B 리뷰 시 발견 (Story 3.4)
- **내용**: 취소 확인 팝업에 `window.confirm()` 사용. 스레드 블로킹, 접근성 미흡, shadcn/ui 불일치.
- **해결**: shadcn/ui `AlertDialog`로 교체.
- **신규 규칙**: Rule 8 (브라우저 confirm/alert/prompt 금지)

### Issue 5 (IMPORTANT): GPT 응답 rowIndex 검증 없음 — F5
- **발생**: Phase B 리뷰 시 발견 (Story 3.2)
- **내용**: GPT가 입력 행과 다른 rowIndex를 반환해도 검증 없이 잘못된 행에 결과 삽입.
- **해결**: `validateResultRowIndices` 함수 추가. 입력-출력 rowIndex 집합 불일치 시 throw → fallback 경로 진입.

### Issue 6 (IMPORTANT): `sessions.select("*")` 과다 노출 — F6
- **발생**: Phase B 리뷰 시 발견 (Story 3.4)
- **내용**: `GET /api/result/[sessionId]`가 전체 컬럼 반환. `insight_summary`(대용량 JSON) 포함.
- **해결**: 필요한 컬럼만 명시적 select.
- **신규 규칙**: Rule 9 (Supabase `select("*")` 금지)

---

## 추가된 Feedback 규칙

| # | 규칙 제목 | 관련 이슈 |
|---|---|---|
| Rule 6 (강화) | `import 'server-only'` 절대 삭제 금지 (Codex 반복 패턴 명시) | F1 |
| Rule 8 | 브라우저 confirm/alert/prompt 금지 → shadcn/ui AlertDialog | F4 |
| Rule 9 | Supabase `select("*")` 금지 → 명시적 컬럼 select | F6 |
| Rule 10 | 모듈 간 공유 타입·상수는 `src/shared/types/`로 먼저 이동 | F2 |

---

## Epic 4 권고사항

### 반드시 알아야 할 것 (Epic 4 착수 전)

1. **`import 'server-only'` 절대 삭제 금지** — 특히 `session-start.ts`는 Epic 2, Epic 3 연속으로 같은 문제 발생. 수정 시 첫 줄 확인 필수 (feedback-rules.md Rule 6).

2. **result 모듈 신규 파일에서 cross-module import 주의** — Epic 4는 `result` 모듈이 핵심. `upload/classify` 모듈 타입을 직접 import하지 말고 `src/shared/types/`를 통해서만 참조 (feedback-rules.md Rule 10).

3. **Supabase 쿼리 최소 권한** — 결과 테이블 조회 시 `select("*")` 금지. `classification_results`, `sessions`, `new_categories` 조인 시 필요한 컬럼만 명시 (feedback-rules.md Rule 9).

4. **인라인 수정 PATCH Route Handler** — `POST/PATCH/PUT` 모든 Route Handler에서 Zod safeParse 필수 (feedback-rules.md Rule 5).

5. **노션 복사 기능** — 클립보드 API는 브라우저 전용. `"use client"` 컴포넌트에서 처리하되 서버 전용 모듈 import 없이 구현 (feedback-rules.md Rule 6).

---

## 완료 요약

- **처리 Story 수**: 4개 (S3.1 ~ S3.4)
- **신규 feedback 규칙**: 3개 추가 (Rule 8, 9, 10) + Rule 6 강화
- **Phase B 판정**: APPROVED (CRITICAL 2개 + IMPORTANT 4개 + NIT 1개 수정 후)
- **validate.ps1**: PASSED
- **다음 Epic**: Epic 4 — 분류 결과 검토 및 노션 출력
