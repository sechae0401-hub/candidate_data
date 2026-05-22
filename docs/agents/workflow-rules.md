# workflow-rules.md
# 취소사유분석기 워크플로우 규칙

## Phase A: Codex Desktop (구현)

```
시작 → AGENTS.md 읽기 → sprint-status.yaml 확인
     → feedback-rules.md 읽기
     → Epic 선택 → Story 생성 (bmad-create-story)
     → 구현 (bmad-dev-story, TDD)
     → validate-quick 실행
     → 통과: commit + push → 다음 Story
     → 실패: 수정 후 재검증 (최대 3회)
     → Epic 완료: validate 전체 실행
```

### Windows/Codex 특이사항

- PowerShell 진입점 사용: `./scripts/validate-quick.ps1`, `./scripts/validate.ps1`
- `git push`는 `scripts/lib/git-utils.ps1` 래퍼 우선 사용
- raw `node`, `npm` 실행 실패만으로 중단 금지 (validate 결과 기준)

## Phase B: Claude Code (리뷰 + 수정)

```
시작 → CLAUDE.md 읽기 → sprint-status.yaml 확인
     → bmad-code-review 스킬 실행
     → REJECTED 항목 직접 수정 (Edit/Write)
     → validate.sh + smoke.sh 최종 검증
     → APPROVED → develop 브랜치에 merge
     → sprint-status.yaml 업데이트 (review → done)
```

## Phase C: 회고 (Retrospective)

```
Epic 완료 후 → bmad-retrospective 스킬 실행
            → 실수 패턴 → feedback-rules.md 추가
            → 회귀 테스트 보강
            → 완료된 story 브랜치 정리
```

## Sprint Status 파일

`_bmad-output/implementation-artifacts/sprint-status.yaml` 형식:

```yaml
epic: "E1 - 업로드 및 분류 핵심 기능"
stories:
  - id: S1-1
    name: "엑셀 업로드 및 컬럼 분석"
    status: done  # pending | in_progress | review | done
  - id: S1-2
    name: "GPT 분류 실행"
    status: in_progress
```

## 커밋 / 브랜치 규칙

- Story 브랜치: `feature/s1-1-excel-upload`
- 커밋: `feat(upload): 엑셀 업로드 및 컬럼 분석 구현`
- Phase A → Phase B: PR 오픈 → Claude Code 리뷰
- Phase B 완료 → develop merge
