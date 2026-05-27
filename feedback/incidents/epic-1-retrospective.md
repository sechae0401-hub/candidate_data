# Epic 1 회고 — 프로젝트 기반 구축 및 공통 인프라

**회고 날짜**: 2026-05-27  
**참여**: Katie (Project Lead), Amelia (Developer), Alice (Product Owner), Charlie (Senior Dev), Dana (QA Engineer), Elena (Junior Dev)  
**이전 회고**: 없음 (첫 번째 회고)

---

## Epic 요약

| 항목 | 내용 |
|---|---|
| 완료 스토리 | 3/3 (100%) |
| 기간 | 2026-05-22 ~ 2026-05-27 |
| validate.ps1 최종 결과 | PASSED (typecheck + lint + build) |
| Phase B 리뷰 판정 | APPROVED |
| REJECTED → 수정 | 없음 |

### 스토리 목록

| Story | 제목 | 상태 |
|---|---|---|
| 1.1 | 프론트엔드 기반 및 디자인 토큰 구축 | ✅ done |
| 1.2 | 백엔드 기반 및 공통 래퍼 구축 | ✅ done |
| 1.3 | Vercel 배포, 네비게이션 바, 화면 골격 및 세션 가드 | ✅ done |

---

## 잘된 것 (Strengths)

1. **보안 아키텍처 완성도** — `server-only` import를 3개 파일(`server.ts`, `supabase/server.ts`, `gpt-client.ts`)에 일관 적용. 시크릿이 클라이언트 번들에 포함되지 않음을 빌드 결과물로 검증.

2. **테스트 선행 설계** — 9개 테스트 파일 전부 통과. `PingClient` 인터페이스로 Supabase 의존성을 추상화해 실제 DB 없이도 ping 로직 검증 가능.

3. **PowerShell 5.1 호환성 즉시 대응** — Story 1.1에서 `??` 연산자 문제를 발견 즉시 수정. 이후 Story 1.2, 1.3에서 검증 스크립트 무중단 실행.

4. **GPT 재시도 구조 분리** — `gpt-retry.ts`가 순수 재시도 로직만 담고, `gpt-client.ts`가 주입받는 구조. 후속 Epic에서 재시도 파라미터만 조정하면 됨.

5. **`read-server-env.ts` 파라미터 주입 패턴** — `process.env`를 직접 읽지 않고 `env: EnvSource` 파라미터로 받아, 서버 전용 가드를 유지하면서도 테스트에서 직접 검증 가능.

---

## 과제 및 이슈 (Challenges)

### Issue 1: GPT 재시도 레이어 명세 충돌
- **발생**: Phase B 리뷰 시 발견
- **내용**: `coding-rules.md` "1.5초 대기 후 1회 재시도"와 Story 1.2 AC4 "3회 exponential backoff"가 서로 다른 레이어를 가리킴을 명시하지 않아 혼동 가능
- **영향**: Epic 3 Story 3.2에서 FR23("API 오류 행 1.5초 후 1회 재시도")과 `lib/gpt-retry.ts`(3회)를 혼용하면 과도한 GPT 호출 발생
- **해결**: feedback-rules.md Rule 1로 등록, Epic 3 스토리 AC에 레이어 구분 명시 권고

### Issue 2: `src/lib/` 디렉터리가 아키텍처 문서에 미정의
- **발생**: Story 1.2 구현 중
- **내용**: `architecture-rules.md`는 4개 레이어만 정의하는데 `src/lib/`가 사실상 5번째 레이어로 사용됨
- **영향**: Epic 2 개발자가 새 유틸리티를 `lib/`에 넣어야 할지 `shared/`에 넣어야 할지 판단 어려움
- **해결**: feedback-rules.md Rule 2로 등록 (`src/lib/` = 서버 사이드 헬퍼)

### Issue 3: OpenAI Responses API 응답 형식 비표준
- **발생**: Story 1.2 `lib/gpt-client.ts`에서 `client.responses.create()` 사용
- **내용**: `openai@6`의 Responses API는 Chat Completions와 응답 구조가 다름 (`.output_text` vs `.choices[0].message.content`)
- **영향**: Epic 2/3에서 GPT 응답 파싱 코드 작성 시 잘못된 경로를 쓰면 런타임 undefined
- **해결**: feedback-rules.md Rule 3으로 등록

### Issue 4: 테스트 파일명 불일치
- **발생**: Phase B 리뷰 시 발견 (NIT)
- **내용**: `tests/gpt-client.test.ts`가 `src/lib/gpt-retry.ts`만 테스트
- **영향**: 후속 개발자가 `gpt-client.ts` 테스트가 있다고 오해 가능
- **해결**: feedback-rules.md Rule 4로 등록

### Issue 5: Vercel Cron CRON_SECRET 인증 미구현
- **발생**: Phase B 리뷰 시 발견 (NIT)
- **내용**: `/api/ping`이 Vercel 공식 권장사항인 `Authorization: Bearer ${CRON_SECRET}` 검증 없이 외부 호출 허용
- **영향**: 저위험(ping만 실행)이나 운영 환경에서 인프라 정보 탐지 가능
- **해결**: Epic 2 또는 Epic 3에서 기회 있을 때 보완 권장

---

## 추가된 Feedback 규칙

| # | 규칙 제목 | 관련 Story |
|---|---|---|
| Rule 1 | GPT 재시도는 두 레이어를 구분하라 | S1.2, S1.3 |
| Rule 2 | `src/lib/`는 공통 유틸 레이어로 인식하라 | S1.2 |
| Rule 3 | OpenAI Responses API 응답 형식을 사용하라 | S1.2 |
| Rule 4 | 테스트 파일명은 실제 테스트 대상과 일치시켜라 | S1.2 |

---

## Epic 2 권고사항

### 반드시 알아야 할 것 (Epic 2 착수 전)

1. **SheetJS 동적 import** — `await import('xlsx')` 패턴 강제. `import * as XLSX from 'xlsx'` 금지 (`performance-rules.md`).

2. **GPT 컬럼 분析 응답 파싱** — `runOpenAiJsonRequest` 반환값에서 텍스트는 `.output_text`로 접근. Zod 스키마 mock 테스트에서 이 경로를 반드시 반영할 것 (feedback-rules.md Rule 3).

3. **API 라우트 경로 준수** — `architecture-rules.md`에 명시된 `/api/upload/analyze-columns` (POST) 경로 사용. 임의 경로 생성 금지.

4. **분류 row retry와 인프라 retry 혼용 금지** — Epic 2 단계에서는 해당 없지만 코드 작성 시 `runWithGptRetry`가 인프라 retry임을 명심 (feedback-rules.md Rule 1).

5. **`src/lib/` vs `src/shared/` 경계** — 새 서버 헬퍼는 `src/lib/`, 공통 타입/유틸은 `src/shared/` (feedback-rules.md Rule 2).

---

## 완료 요약

- **처리 Story 수**: 3개 (S1.1, S1.2, S1.3)
- **신규 feedback 규칙**: 4개 추가
- **Phase B 판정**: APPROVED (REJECTED 없음)
- **validate.ps1**: PASSED
- **다음 Epic**: Epic 2 — 엑셀 업로드 및 AI 컬럼 분析
