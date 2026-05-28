# Epic 4 회고 (Retrospective)

**완료 날짜:** 2026-05-28  
**브랜치:** feature/s4-4-4-new-classification-responsive  
**리뷰 판정:** APPROVED (CRITICAL/IMPORTANT 이슈 없음)

---

## Epic 요약

| Story | 이름 | 완료 | 테스트 수 |
|---|---|---|---|
| S4-1 | 분류 결과 테이블 및 요약 바 | ✅ | 67개 |
| S4-2 | 행 클릭 원문 패널 및 인라인 수정 | ✅ | 71개 |
| S4-3 | 노션 형식 복사 및 인사이트·신규 카테고리 표시 | ✅ | 75개 |
| S4-4 | 새 분류 시작 및 반응형 레이아웃 | ✅ | 77개 |

---

## 주요 이슈 목록

### REJECTED 항목
없음.

### NIT 항목 (기능 영향 없음)

1. **Dead code — `getSourcePanelLayoutMode`**  
   - 위치: `src/result/result-actions.ts`  
   - 내용: 반응형 패널 레이아웃을 판정하는 유틸리티 함수를 작성했으나, 실제 구현은 Tailwind CSS breakpoint(`lg:...`)로 처리했다. 함수는 테스트에만 존재하고 컴포넌트에서 호출되지 않아 dead code가 됐다.  
   - 결론: 동작에 영향 없어 defer. 다음 Epic에서 반복 시 규칙화 검토.

2. **JSX 들여쓰기 불일치 — `result-workspace.tsx:358`**  
   - `<div className="overflow-x-auto">`가 부모 div와 동일 레벨로 작성됨. JSX 동작은 정상이나 시각적 일관성 저하.

---

## 적용된 피드백 규칙 효과 검증

Epic 4는 이전 Epic에서 추가된 규칙들이 처음으로 완전히 준수된 Epic이다.

| 규칙 | 준수 여부 | 비고 |
|---|---|---|
| Rule 5: Route Handler Zod 검증 | ✅ | PATCH route에서 safeParse 먼저 수행 |
| Rule 6: server-only 가드 유지 | ✅ | `session-start-payload.ts` 분리로 우아하게 해결 |
| Rule 8: window.confirm 금지 | ✅ | shadcn/ui toast 전용 사용 |
| Rule 9: select("*") 금지 | ✅ | 모든 쿼리에서 명시적 컬럼 선택 |
| Rule 10: 공유 타입 src/shared/ 관리 | ✅ | `CLASSIFICATION_DRAFT_STORAGE_KEY` 올바른 위치 |

---

## 주목할 만한 패턴 (긍정)

### server-only/테스트 충돌 해결 패턴
**문제:** `session-start.ts`에 `import 'server-only'`가 있어 Jest에서 직접 테스트 불가.  
**해결:** 순수 로직만 `session-start-payload.ts`로 추출 → `session-start.ts`는 서버 가드 유지, 테스트는 payload 파일만 import.  
**의의:** Rule 6의 "server-only는 절대 삭제 금지" 원칙을 우회하지 않고 테스트 가능성을 동시에 확보한 모범 패턴.

### Tailwind CSS-first 반응형 구현
**패턴:** 반응형 레이아웃을 JS 로직 없이 `lg:grid-cols-[...]`, `lg:sticky`, `fixed inset-x-0 bottom-0` 등 Tailwind 유틸리티만으로 구현.  
**의의:** 런타임 resize 이벤트 리스너 없이 이벤트 리스너 cleanup 문제를 원천 차단.

---

## 추가된 피드백 규칙

없음.

Epic 4는 CRITICAL/IMPORTANT 이슈 없이 완료됐으며, NIT 2건은 반복 패턴으로 보기 어렵다. 기존 10개 규칙이 충분히 동작한 것으로 판단한다. `getSourcePanelLayoutMode` dead code 패턴이 다음 Epic에서 반복될 경우 "Tailwind CSS로 처리 가능한 레이아웃에 JS 유틸리티를 만들지 마라" 규칙으로 추가를 검토한다.

---

## 다음 Epic을 위한 권고사항

1. **순수 함수 추출 패턴 계속 사용** — 서버 전용 모듈 테스트가 필요하면 `*-payload.ts` 분리 패턴을 표준으로 삼는다. `import 'server-only'`를 삭제하는 대신 순수 로직을 별도 파일로 먼저 분리한다.

2. **유틸리티는 실제 사용 시점에 작성** — Story Task 목록에 유틸리티 함수가 있더라도, Tailwind CSS나 다른 선언적 방법으로 충분히 처리 가능하면 JS 함수를 추가하지 않는다. 유틸리티는 2개 이상의 컴포넌트에서 실제로 필요할 때 작성한다.
