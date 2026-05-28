# Phase A 프롬프트 — Codex Desktop 구현용

> **사용법:** `[EPIC 번호]` 자리에 Epic 번호(예: `1`, `2`, `3`, `4`)만 입력 후 전체 복사 → Codex Desktop에 붙여넣기

---

## 프롬프트 (복사 시작)

```
AGENTS.md와 docs/agents/feedback-rules.md를 먼저 읽고,
_bmad-output/implementation-artifacts/sprint-status.yaml에서
Epic [EPIC 번호]의 story 목록과 현재 상태를 확인해.

그런 다음 아래 순서로 Epic [EPIC 번호]의 모든 story를 처리해.

---

## 작업 순서

Epic [EPIC 번호]에서 status가 `backlog` 또는 `ready-for-dev`인 story를
순서대로 하나씩 처리한다.

각 story에 대해:

1. `bmad-create-story` 스킬로 story 파일 생성
   - 저장 위치: `_bmad-output/implementation-artifacts/phase-a/`
   - sprint-status.yaml에서 해당 story 상태를 `in-progress`로 업데이트

2. `bmad-dev-story` 스킬로 구현 (TDD: red → green → refactor)
   - 테스트 먼저 작성, 이후 구현
   - 아키텍처 경계 준수 (`docs/agents/architecture-rules.md`)
   - API 키 하드코딩 절대 금지

3. 구현 완료 후 검증 실행 (Windows PowerShell 기준)
   ```
   ./scripts/validate-quick.ps1
   ```
   - 통과: 다음 단계로
   - 실패: 수정 후 재실행 (최대 3회)
   - 3회 실패 시: story 상태를 `review`(skip)로 표시하고 다음 story로 이동

4. 검증 통과 시 commit + push
   - 브랜치: `feature/s[EPIC 번호]-[story번호]-[story-slug]`
   - 커밋 메시지 형식: `feat(scope): 설명`
   - sprint-status.yaml에서 해당 story 상태를 `review`로 업데이트

---

## Epic 전체 완료 후

Epic [EPIC 번호]의 모든 story가 처리되면:

1. 전체 검증 실행
   ```
   ./scripts/validate.ps1
   ```

2. 검증 통과 시 sprint-status.yaml에서 `epic-[EPIC 번호]` 상태를 `in-progress`로 업데이트

3. 완료 보고:
   - 처리한 story 목록
   - 각 story의 최종 상태
   - 실패/skip된 항목과 사유
   - validate.ps1 결과 요약
```

## 프롬프트 (복사 끝)
