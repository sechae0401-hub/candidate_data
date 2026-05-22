# Claude Code가 코드 리뷰 시 참고하는 기준 문서입니다.
# bmad-code-review 스킬과 함께 사용됩니다.

## 리뷰 범위

- 현재 브랜치의 main 대비 diff만 리뷰
- story 범위를 벗어난 변경이 있으면 지적
- 기존 코드의 문제는 리뷰하지 않음 (pre-existing 이슈 무시)

## 필수 확인 항목

### 1. 아키텍처 경계

- `docs/agents/architecture-rules.md`에 정의된 레이어 경계 준수 여부
- 모듈 간 직접 코드 호출 없는지 (upload ↔ classify ↔ result 모듈 간 경계)
- API 키·Supabase 키가 서버 전용 Route Handler에만 있는지
- `shared/` 모듈만 cross-module 의존성 허용 여부 확인

### 2. 기능 정확성

- story의 acceptance criteria를 충족하는지
- 엣지 케이스 처리 (빈 엑셀, 잘못된 컬럼, GPT 응답 파싱 실패)
- 에러 처리 (try-catch, fallback, 사용자 피드백)
- GPT 실패 시 1.5초 대기 후 1회 재시도 로직 존재 여부

### 3. 테스트

- 변경된 동작에 대한 테스트 존재 여부
- 테스트가 실제 동작을 검증하는지
- GPT 호출이 포함된 로직에 mock 테스트 존재 여부

### 4. 보안 (`docs/agents/security-rules.md` 기준)

- 하드코딩된 시크릿 없음 (OpenAI API 키, Supabase 키)
- `OPENAI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`는 서버 전용 파일에만 사용
- 사용자 입력 검증 (Zod)
- SQL injection 방지 (Supabase 클라이언트 파라미터 바인딩)
- CORS가 `origin: '*'`가 아닌지

### 5. 성능 (`docs/agents/performance-rules.md` 기준)

- SheetJS 파싱이 브라우저에서 처리되는지 (서버 업로드 없음)
- GPT 분류 루프에서 불필요한 재호출 없는지
- Supabase 쿼리에 적절한 조건 필터 존재
- 이벤트 리스너 cleanup 존재

### 6. 코드 품질

- TypeScript strict mode 위반 없음 (`any` 타입 최소화)
- Zod 스키마로 GPT 응답 검증
- console.log 대신 구조화된 로깅 또는 제거
- shadcn/ui 컴포넌트 일관성

## 판정 기준

### APPROVED 조건 (모두 충족 시)

- `validate.sh` (또는 `validate.ps1`) 통과
- 아키텍처 경계 위반 없음
- 변경 동작에 테스트 존재
- 보안 이슈 없음
- story acceptance criteria 충족

### REJECTED 조건 (하나라도 해당 시)

- typecheck 또는 lint 실패
- 아키텍처 경계 위반
- API 키 하드코딩
- acceptance criteria 미충족
- 테스트 없이 핵심 로직 변경

## 리뷰 출력 형식

```
APPROVED
Summary: [변경 요약 1줄]
```

```
REJECTED
Issues:
1. [CRITICAL] 파일:라인 - 설명
2. [IMPORTANT] 파일:라인 - 설명
3. [NIT] 파일:라인 - 설명
Suggestion: [수정 방향]
```
