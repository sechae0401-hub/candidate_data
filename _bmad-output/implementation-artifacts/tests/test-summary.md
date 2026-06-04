# Test Automation Summary

생성일: 2026-06-01

## 결과

| 항목 | 수 |
|---|---|
| 전체 테스트 | 81개 |
| 통과 | 81개 |
| 실패 | 0개 |

## 수정된 실패 테스트 (3건)

### 1. `tests/analyzing-progress.test.ts` — buildClassificationDraft rejects workbooks over 200 data rows
- **원인**: `rows: []` (빈 배열)로 설정해 실제 필터 결과가 0건이 되어 에러가 발생하지 않음
- **수정**: `Array.from({ length: 201 }, ...)` 으로 201개의 실제 `취소` 행 제공

### 2. `src/upload/column-analysis.ts` — 한자 오타
- **원인**: 소스 코드 에러 메시지에 한자 `析`(U+6790)이 포함되어 테스트의 한글 `석`(U+C11D) 기댓값과 불일치
- **수정**: `"업로드 컬럼 분析 요청"` → `"업로드 컬럼 분석 요청"` (순수 한글로 통일)

### 3. `tests/template-validation.test.ts` — 구버전 에러 메시지
- **원인**: 구현 메시지가 변경됐는데 테스트 기댓값이 이전 형식(`"필수 컬럼 '인터뷰내용'이 없습니다..."`)을 참조
- **수정**: 현재 구현과 일치하는 `"'인터뷰내용' 컬럼이 없습니다. 파일에 '인터뷰내용', '특이사항', '최종결과' 컬럼이 있어야 합니다"` 로 업데이트

## 추가된 단위 테스트 (4건)

`tests/insight-summary.test.ts`에 미검증 함수 커버리지 추가:

- [x] `calculateTopSecondaryActionShares` — null/공백 액션 무시, 비율 계산, 상위 N개 반환
- [x] `calculateTopSecondaryActionShares` — 전체 null일 때 빈 배열 반환
- [x] `calculateCompetingCourseShares` — 응답자 기준 비율 계산 (미응답 제외)
- [x] `calculateCompetingCourseShares` — 응답자 없을 때 빈 배열 반환

## 테스트 파일 목록 (22개)

| 파일 | 대상 모듈 |
|---|---|
| tests/api-handler.test.ts | src/lib/api-handler.ts |
| tests/design-tokens.test.ts | src/shared/utils/design-tokens.ts |
| tests/gpt-client.test.ts | src/lib/gpt-retry.ts |
| tests/navigation-stages.test.ts | src/shared/navigation/stages.ts |
| tests/ping-service.test.ts | src/shared/monitoring/ping.ts |
| tests/server-env.test.ts | src/shared/env/server.ts |
| tests/server-only-guard.test.ts | server-only import 보호 |
| tests/session-guard.test.ts | src/shared/session/session-guard.ts |
| tests/file-acceptance.test.ts | src/upload/file-acceptance.ts |
| tests/result-selection.test.ts | src/upload/result-selection.ts |
| tests/template-validation.test.ts | src/upload/template-validation.ts |
| tests/workbook-data.test.ts | src/upload/workbook-data.ts |
| tests/analyzing-progress.test.ts | src/classify/analyzing-progress.ts + src/upload/classification-draft.ts |
| tests/column-analysis.test.ts | src/upload/column-analysis.ts |
| tests/completion-feedback.test.ts | src/classify/completion-feedback.ts |
| tests/vercel-config.test.ts | Vercel 설정 검증 |
| tests/classification-engine.test.ts | src/classify/classification-engine.ts |
| tests/notion-export.test.ts | src/result/notion-export.ts |
| tests/result-actions.test.ts | src/result/result-actions.ts |
| tests/result-summary.test.ts | src/result/result-summary.ts |
| tests/result-update.test.ts | src/result/result-update.ts |
| tests/session-start.test.ts | src/upload/session-start.ts |
| tests/insight-summary.test.ts | src/classify/insight-summary.ts |

## 다음 단계

- CI (GitHub Actions)에서 `npm test` 포함 여부 확인
- E2E 테스트 필요 시 Playwright 설치 후 별도 suite 구성
  ```
  npm install -D @playwright/test
  npx playwright install
  ```
