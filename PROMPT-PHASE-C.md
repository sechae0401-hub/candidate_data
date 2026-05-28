# Phase C 프롬프트 — Claude Code 회고용

> **사용법:** `[EPIC 번호]` 자리에 Epic 번호(예: `1`, `2`, `3`, `4`)만 입력 후 전체 복사 → Claude Code에 붙여넣기

---

## 프롬프트 (복사 시작)

```
CLAUDE.md를 읽고,
_bmad-output/implementation-artifacts/sprint-status.yaml에서
Epic [EPIC 번호]의 전체 story 상태를 확인해.

Epic [EPIC 번호]의 모든 story가 `done` 상태인 것을 전제로,
아래 순서로 회고를 수행해.

---

## 작업 순서

### Step 1: 회고 실행

`bmad-retrospective` 스킬로 Epic [EPIC 번호] 전체 회고를 진행한다.

회고 항목:
- 구현 중 발생한 실수 또는 반복된 패턴
- validate 실패 원인 및 해결 방법
- REJECTED → 수정 과정에서 발견된 규칙 위반 유형
- 다음 Epic에서 미리 주의할 사항

### Step 2: feedback-rules.md 업데이트

회고에서 도출된 패턴 중 **반복될 가능성이 높은 것**을 `docs/agents/feedback-rules.md`의 Active Rules에 추가한다.

추가 기준:
- 이번 Epic에서 2회 이상 반복된 실수
- 규칙 문서에 명시되지 않았지만 중요한 패턴
- 다음 Epic의 개발자(Codex)가 미리 알아야 할 제약

규칙 형식:
```
## Rule N: [규칙 제목]
- 발생: Epic [EPIC 번호], Story [story번호]
- 패턴: [어떤 실수/패턴이 반복됐는지]
- 예방: [다음에 어떻게 해야 하는지]
```

Active Rules가 10개를 초과하면 가장 오래된 것을 Archived Rules로 이동한다.

### Step 3: 회고 결과 저장

회고 결과를 `feedback/incidents/epic-[EPIC 번호]-retrospective.md` 파일에 저장한다.

파일에 포함할 내용:
- Epic 요약 (story 목록, 완료 날짜)
- 주요 이슈 목록
- 추가된 feedback 규칙
- 다음 Epic을 위한 권고사항

### Step 4: sprint-status.yaml 업데이트

```yaml
epic-[EPIC 번호]-retrospective: done
```

### Step 5: 브랜치 정리 (선택)

Epic [EPIC 번호]에서 사용된 feature 브랜치 목록을 출력한다.
병합이 완료된 브랜치는 삭제해도 안전한지 확인 후 사용자에게 제안한다.

---

## 완료 보고 형식

회고 완료 후 아래 형식으로 보고한다:

**Epic [EPIC 번호] 회고 완료**
- 처리한 story 수: N개
- 신규 feedback 규칙: N개 추가
- 이슈 패턴: [주요 패턴 요약]
- 다음 Epic 권고사항: [핵심 1-2가지]
```

## 프롬프트 (복사 끝)
