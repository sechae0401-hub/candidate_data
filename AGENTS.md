# 이 파일은 Codex와 Claude Code 모두가 세션 시작 시 읽는 저장소 공식 운영 규칙입니다.
# Codex Desktop은 이 파일을 자동 로드합니다.
# Claude Code는 CLAUDE.md에서 이 파일을 @import합니다.

## 역할 분담

| Phase | 도구 | 역할 | BMAD 스킬 |
|---|---|---|---|
| Phase A | Codex Desktop | story 생성 + 구현 (Epic 단위) | bmad-create-story, bmad-dev-story |
| Phase B | Claude Code | 코드 리뷰 + 수정 + 테스트 보강 (Epic 단위) | bmad-code-review |

## Phase A: Codex Desktop 시작 루틴

1. 이 파일(AGENTS.md)의 규칙 확인
2. `_bmad-output/planning-artifacts/` 아래 문서 읽기 (PRD, TRD, FRD)
3. `_bmad-output/implementation-artifacts/sprint-status.yaml` 확인
4. `docs/agents/feedback-rules.md` **반드시** 읽기 (과거 반복 실수 패턴)
5. 대상 Epic의 story를 순서대로 처리:
   - Windows/Codex에서는 먼저 `./scripts/validate-quick.ps1` 실행 가능 여부 확인
   - `bmad-create-story` 스킬로 story 파일 생성
   - `bmad-dev-story` 스킬로 구현 (TDD: red-green-refactor)
   - 현재 OS/셸에 맞는 검증 진입점 실행
     - bash/WSL: `./scripts/validate-quick.sh`
     - Windows PowerShell: `./scripts/validate-quick.ps1`
   - 통과 시 **commit + push 필수**
   - 실패 시 수정 후 재검증, 3회 실패 시 skip 처리
6. Epic의 모든 story 완료 후 전체 검증 실행
   - bash/WSL: `./scripts/validate.sh`
   - Windows PowerShell: `./scripts/validate.ps1`
7. Codex Desktop 모델 권장: chatgpt-5.4, reasoning: xhigh

## Phase B: Claude Code 시작 루틴

1. `CLAUDE.md`의 지침 확인
2. `_bmad-output/implementation-artifacts/sprint-status.yaml` 확인
3. 완료된 story 브랜치를 `bmad-code-review` 스킬로 리뷰
4. REJECTED 항목 직접 수정 + 테스트 보강
5. `./scripts/validate.sh` + `./scripts/smoke.sh` 최종 검증

## Repo map

| 경로 | 역할 |
|---|---|
| `_bmad-output/planning-artifacts/` | PRD, TRD, FRD, 디자인 시스템 (공식 제품 문서) |
| `_bmad-output/implementation-artifacts/` | sprint-status, story 파일, 구현 산출물 |
| `.agents/skills/` | Codex용 BMAD 스킬 |
| `.claude/skills/` | Claude Code용 BMAD 스킬 |
| `docs/` | 원본 기획 문서 (PRD, FRD, TRD, 디자인 시스템) |
| `docs/agents/` | 에이전트 운영 규칙 |
| `scripts/` | 검증 스크립트 (validate, validate-quick, smoke) |
| `feedback/` | 실수 기록(incidents) + 템플릿 |
| `state/` | 작업 진행 상태 파일 + validate 로그 |
| `reviews/` | 코드 리뷰 결과 저장 |
| `src/` | 소스 코드 (Next.js App Router) |

## 기술 스택 (취소사유분석기)

| 영역 | 기술 |
|---|---|
| 프레임워크 | Next.js 14 App Router |
| 언어 | TypeScript (strict mode) |
| 스타일 | Tailwind CSS |
| UI 컴포넌트 | shadcn/ui |
| 검증 | Zod |
| 엑셀 파싱 | SheetJS (브라우저 전용) |
| 데이터베이스 | Supabase (PostgreSQL) |
| AI | OpenAI GPT-5.5 |
| 배포 | Vercel |

## Validation (완료 기준)

- Story 완료 시: `validate-quick.sh` (또는 `.ps1`) — typecheck + lint (< 60초)
- Epic 완료 시: `validate.sh` (또는 `.ps1`) — typecheck + lint + build
- 실패 시 로그 확인: `state/validate/latest/*.log`
- 기본 출력은 summary 모드, `VALIDATE_OUTPUT_MODE=verbose`로 전체 출력

## Coding rules (핵심만)

- 아키텍처 경계 준수 (`docs/agents/architecture-rules.md` 참고)
- 변경된 동작에 대해 테스트 추가 또는 업데이트
- 의존성 추가 시 정당한 이유 필요
- API 키·시크릿을 코드에 하드코딩 절대 금지

## Change rules

- 변경 범위를 현재 story로 제한
- 커밋 메시지 형식: `type(scope): 설명`
- type: feat, fix, refactor, test, docs, chore
- Phase A에서는 validate-quick 통과 후 **commit + push 필수**

## 참조 파일

- `docs/agents/architecture-rules.md`
- `docs/agents/coding-rules.md`
- `docs/agents/testing-rules.md`
- `docs/agents/security-rules.md`
- `docs/agents/performance-rules.md`
- `docs/agents/deploy-rules.md`
- `docs/agents/workflow-rules.md`
- `docs/agents/feedback-rules.md`
