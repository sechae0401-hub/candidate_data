# Phase B 프롬프트 — Claude Code 리뷰 및 수정용

> **사용법:** `[EPIC 번호]` 자리에 Epic 번호(예: `1`, `2`, `3`, `4`)만 입력 후 전체 복사 → Claude Code에 붙여넣기

---

## 프롬프트 (복사 시작)

```
CLAUDE.md와 REVIEW.md를 읽고,
_bmad-output/implementation-artifacts/sprint-status.yaml에서
Epic [EPIC 번호]의 story 목록과 브랜치 상태를 확인해.

그런 다음 아래 순서로 Epic [EPIC 번호] 전체 코드 리뷰 + 수정을 수행해.

---

## 작업 순서

### Step 1: 코드 리뷰

`bmad-code-review` 스킬로 Epic [EPIC 번호]의 변경 사항 전체를 리뷰한다.

리뷰 기준 (`REVIEW.md` 참고):
- 아키텍처 경계 (`docs/agents/architecture-rules.md`)
- 보안 (`docs/agents/security-rules.md`)
- 테스트 존재 여부 (`docs/agents/testing-rules.md`)
- story acceptance criteria 충족 여부
- TypeScript strict mode 위반, API 키 하드코딩 여부

### Step 2: REJECTED 항목 수정

리뷰 결과 REJECTED 항목이 있을 경우:

1. CRITICAL → IMPORTANT → NIT 순서로 직접 수정 (Edit/Write 도구 사용)
2. 수정 후 PostToolUse Hook이 자동으로 typecheck + lint 실행
3. 수정 완료 후 검증 실행:
   ```
   ./scripts/validate.ps1
   ```

### Step 3: 테스트 보강

누락된 테스트 케이스가 있으면 추가한다:
- 변경된 동작에 대한 단위 테스트
- GPT 호출 로직에 mock 테스트
- 에러 fallback 케이스

### Step 4: 최종 검증

```
./scripts/validate.ps1
```

통과 조건:
- typecheck 에러 없음
- lint 에러 없음
- build 성공

### Step 5: 완료 처리

모든 항목 APPROVED 확인 후:

1. sprint-status.yaml에서 Epic [EPIC 번호]의 각 story 상태를 `done`으로 업데이트
2. sprint-status.yaml에서 `epic-[EPIC 번호]` 상태를 `done`으로 업데이트
3. 수정 사항이 있다면 commit:
   - 커밋 메시지: `fix(epic-[EPIC 번호]): Phase B 리뷰 수정 사항 반영`

---

## 리뷰 결과 출력 형식

리뷰 결과는 `reviews/epic-[EPIC 번호]-review.md` 파일에 저장한다.

형식:
- APPROVED 항목: ✅ 목록
- REJECTED 항목: ❌ 목록 (CRITICAL/IMPORTANT/NIT 구분)
- 수정 완료 항목: 🔧 목록
- 최종 판정: APPROVED / REJECTED
```

## 프롬프트 (복사 끝)
