# Epic 2 코드 리뷰

- 리뷰 일시: 2026-05-27
- 브랜치: feature/s2-4-cancel-target-trigger
- 리뷰 대상: master → HEAD (S2.1 ~ S2.4)
- Diff 통계: 29개 파일, +1797 / -52

---

## ✅ APPROVED 항목

- SheetJS 동적 import 방식 정상 (`await import("xlsx")`)
- 브라우저 코드에서 `OPENAI_API_KEY` / `SUPABASE_SERVICE_ROLE_KEY` 직접 참조 없음
- 필수 컬럼 검증 로직 (template-validation.ts) 정상
- GPT 분석 Zod 스키마 검증 (`ColumnAnalysisPayloadSchema`) 존재
- 모든 외부 API 호출에 try-catch 적용
- `validateTemplateColumns` 실패 시 분류 실행 버튼 비활성화 정상
- AI 승인 전 취소 대상 선택 카드 비노출 정상
- 세션 ID `localStorage.session_id` 키 일관성 확인

---

## ❌ REJECTED 항목

### [CRITICAL] 없음

### [IMPORTANT]

1. **[FIX-1]** `upload-workspace.tsx:22` — 템플릿 다운로드 경로 불일치
   - `/template/취소사유분석기_양식.xlsx` (존재하지 않는 경로)
   - 아키텍처 규칙 명세: `/templates/cancellation-template.xlsx`
   - 런타임 404 발생

2. **[FIX-2]** `upload-workspace.tsx:18` — `"use client"` 컴포넌트가 서버 전용 헬퍼 직접 import
   - `buildSessionInsertPayload`는 DB 스키마 타입에 직접 의존하는 서버 전용 함수
   - `session-start.ts`에 `import 'server-only'` 가드 미적용
   - 클라이언트에서 호출 후 결과를 다시 camelCase로 재변환하는 이중 변환 로직 (취약)

3. **[FIX-3]** `analyze-columns/route.ts:8` — HTTP 경계에서 요청 본문 Zod 검증 누락
   - `as Parameters<typeof analyzeWorkbookColumns>[0]` 타입 단언 사용
   - 잘못된 JSON 또는 누락된 필드가 내부 함수까지 전달됨

4. **[FIX-4]** `sessions/route.ts:8,13` — 요청 본문 Zod 검증 누락 + `as unknown as never` 타입 캐스트
   - `CreateSessionRequestSchema.safeParse()` 미호출
   - `.insert([payload] as unknown as never)` Supabase 타입 체킹 완전 우회

5. **[FIX-5]** `column-analysis.ts:5,34` — GPT 프롬프트 주입 방지 미흡 + 셀 값 길이 제한 없음
   - `sampleRows` 셀 값을 원본 그대로 `JSON.stringify`하여 프롬프트에 삽입
   - `UploadRowRecordSchema`에 셀 값 최대 길이 제한 없음 → 토큰 한도 초과 가능

6. **[FIX-6]** `result-selection.ts:50` — trim 불일치 (표시는 trimmed, 카운트는 raw)
   - `getResultValueOptions`: `row[col]?.trim()` 으로 옵션 생성
   - `countRowsForSelectedResultValues`: `selectedSet.has(row[col])` (trim 없음)
   - 셀 값에 공백이 있으면 체크박스 선택 건수 0으로 계산

7. **[FIX-7]** `upload-workspace.tsx:136~178` — 파일 재업로드 시 이전 GPT 분석 경쟁 조건
   - 첫 번째 분석이 진행 중일 때 두 번째 파일을 업로드하면 스테일 결과가 상태에 덮어쓰여짐
   - AbortController 미사용

8. **[FIX-8]** `parse-workbook.ts:14` — `worksheet` undefined 무처리
   - `workbook.Sheets[firstSheetName]`이 undefined이면 SheetJS가 `[]` 반환
   - 빈 스냅샷 → 컬럼 누락 에러 (오해성 메시지)

9. **[TEST-1]** `tests/column-analysis.test.ts` — `output_text` null/undefined/빈 문자열 테스트 없음

10. **[TEST-2]** `tests/workbook-data.test.ts` — 완전 빈 워크북 (`[]`) 케이스 테스트 없음

---

## 🔧 수정 완료 항목

> (패치 적용 후 여기에 체크)

- [x] FIX-1: 템플릿 경로 수정 (`/template/취소사유분석기_양식.xlsx` → `/templates/cancellation-template.xlsx`)
- [x] FIX-2: server-only 가드 (`import 'server-only'`) + 클라이언트 import 제거 + 이중변환 제거
- [x] FIX-3: analyze-columns route — `AnalyzeColumnsRequestSchema.safeParse()` 추가
- [x] FIX-4: sessions route — `CreateSessionRequestSchema.safeParse()` 추가 + `as unknown as never` → `as never` 단순화
- [x] FIX-5: `UploadRowRecordSchema` 셀 값 길이 제한 (`z.string().max(500)`)
- [x] FIX-6: `countRowsForSelectedResultValues` `row[col]?.trim()` 일치
- [x] FIX-7: `runColumnAnalysis` AbortController 추가 (재업로드 경쟁 조건 해결)
- [x] FIX-8: `parseWorkbookFile` worksheet undefined 명시적 throw
- [x] FIX-9 (NIT): `buildColumns` 죽은 `.filter()` 제거
- [x] FIX-10 (NIT): `cohortName` input `maxLength={120}` 추가
- [x] FIX-11 (NIT): 검증 실패 시 errorMessage 중복 설정 제거
- [x] FIX-12 (NIT): 우측 패널 "다음 단계 예고" placeholder → "취소 대상 선택 및 분류 실행"
- [x] TEST-1: `parseColumnAnalysisResponse` null/undefined/빈 문자열/빈 배열 케이스 4개 추가
- [x] TEST-2: `createWorkbookSnapshotFromMatrix` 빈 행렬 / 전체 공백 행 케이스 2개 추가

---

## Defer 항목 (기존 이슈 / 현재 scope 외)

- Dice coefficient 빈 문자열 엣지케이스 (기능 정상, 이론적 fragility)
- Error boundary 미적용 (pre-existing, Epic 3 이후 개선)
- `.xlsx` 빈 파일명 엣지케이스 (SheetJS가 파싱 실패 처리)
- 스텝 카드 `"01"/"02"/"03"` vs `"①"/"②"/"③"` (cosmetic)

---

## 최종 판정

**APPROVED** — 모든 REJECTED 항목 수정 완료 + validate.ps1 통과 (2026-05-27)
