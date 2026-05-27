# feedback-rules.md
# 과거 실수에서 배운 활성 규칙 (최대 10개 유지)
# 새 규칙 추가 시 오래된 규칙 제거 또는 통합

## Active Rules

### Rule 1: GPT 재시도는 두 레이어를 구분하라
- 발생: Epic 1, Story 1.2 + REVIEW.md 간 명세 충돌
- 패턴: `coding-rules.md`의 "1.5초 대기 후 1회 재시도"는 **분류 행 단위 retry**(FR23, Epic 3)를 가리킨다. `lib/gpt-retry.ts`의 "3회 exponential backoff(1s/2s/4s)"는 **인프라 레이어 retry**다. 이 둘을 혼동하면 Epic 3 분류 엔진에서 GPT 호출이 최대 4×4=16회까지 늘어날 수 있다.
- 예방: Epic 3 Story 3.2 구현 시 `/api/classify`에서 `runWithGptRetry`를 직접 호출하지 말고, 분류 row retry를 별도 로직(1.5초 sleep 후 1회)으로 감싸야 한다.

### Rule 2: `src/lib/`는 공통 유틸 레이어로 인식하라
- 발생: Epic 1, `architecture-rules.md` vs. 실제 구현 간 불일치
- 패턴: 아키텍처 규칙에 UI/Service/Shared/Config 4개 레이어만 정의되어 있지만, 실제로 `src/lib/`(api-handler, gpt-client, gpt-retry, utils)가 다섯 번째 레이어로 굳어졌다. Epic 2부터 새 유틸리티는 `src/shared/utils/`(순수 타입·유틸)가 아니라 `src/lib/`(서버 사이드 헬퍼)에 위치해야 한다.
- 예방: 새 파일 추가 시 — 서버 사이드 헬퍼·API 래퍼 → `src/lib/`, 공통 타입·유틸 → `src/shared/`, 모듈 별 로직 → `src/{upload|classify|result}/`.

### Rule 3: OpenAI Responses API 응답 형식을 사용하라
- 발생: Epic 1, Story 1.2 `lib/gpt-client.ts`
- 패턴: `openai@6`의 `client.responses.create()`는 Chat Completions(`client.chat.completions.create()`)와 응답 구조가 다르다. 응답 텍스트는 `.choices[0].message.content`가 아니라 `.output_text` (또는 `.output[0].content[0].text`)로 접근해야 한다. Epic 2/3에서 GPT 응답을 파싱할 때 잘못된 경로를 쓰면 런타임에 `undefined`를 Zod로 검증하다 에러가 난다.
- 예방: GPT 응답 파싱 전 항상 `runOpenAiJsonRequest` 반환값 타입을 확인하고, Zod 스키마 테스트에서 실제 응답 구조를 mock할 것.

### Rule 4: 테스트 파일명은 실제 테스트 대상과 일치시켜라
- 발생: Epic 1, `tests/gpt-client.test.ts`가 `src/lib/gpt-retry.ts`만 테스트
- 패턴: 파일명 불일치로 인해 다른 개발자가 `gpt-client.ts`에 대한 테스트가 이미 있다고 오해할 수 있다. Epic 2부터 새 테스트 파일명은 반드시 실제 테스트 대상 파일명과 동일하게(예: `gpt-retry.test.ts`) 짓는다.
- 예방: 테스트 파일 생성 시 `tests/<실제-모듈명>.test.ts` 규칙 준수. 여러 모듈을 테스트하면 `tests/<feature>.test.ts`로 명시적 명칭 사용.

### Rule 5: Route Handler는 HTTP 경계에서 반드시 Zod 검증을 수행하라
- 발생: Epic 2, `analyze-columns/route.ts` (타입 단언만 사용), `sessions/route.ts` (`as unknown as never` 캐스트)
- 패턴: Route Handler가 Zod `safeParse` 없이 타입 단언만으로 요청 본문을 내부 함수에 전달했다. 잘못된 JSON이나 필드 누락 요청이 내부 함수까지 도달해 런타임 에러로 이어진다. Epic 3 분류 API에서 같은 실수가 반복될 가능성이 높다.
- 예방: `POST/PATCH/PUT` Route Handler의 첫 번째 단계는 항상 `RequestBodySchema.safeParse(rawBody)` 실행 후 실패 시 `throw new ApiError("...", 400)`. 타입 단언으로 이 단계를 건너뛰지 않는다.

### Rule 6: 서버 전용 모듈은 `import 'server-only'`를 선언하고 클라이언트에서 직접 import하지 마라
- 발생: Epic 2, `session-start.ts`(가드 누락) + `upload-workspace.tsx`(클라이언트에서 서버 함수 직접 호출)
- 패턴: `"use client"` 컴포넌트가 서버 전용 함수를 직접 import해 DB 스키마 타입이 클라이언트 번들에 포함됐다. `import 'server-only'` 가드가 없으면 TypeScript 빌드에서 차단되지 않아 문제가 런타임까지 숨겨진다.
- 예방: DB 스키마·Supabase·OpenAI에 의존하는 파일은 첫 줄에 `import 'server-only'` 추가. 클라이언트 컴포넌트는 데이터를 Route Handler(`/api`) 경유로만 주고받아야 하며, 서버 함수를 직접 import하지 않는다.

### Rule 7: 아키텍처 명세의 경로를 코드에 그대로 사용하라
- 발생: Epic 2, Story 2.1 `upload-workspace.tsx` — `/template/취소사유분析기_양식.xlsx` vs. 명세 `/templates/cancellation-template.xlsx`
- 패턴: Story Dev Notes에 두 경로가 동시에 기재되어 개발자가 잘못된 쪽을 구현했다. `architecture-rules.md`에 명시된 경로와 다른 경로를 사용하면 런타임 404가 발생한다.
- 예방: 정적 파일 경로·API 경로는 `architecture-rules.md`를 유일한 원본으로 취급하고 복붙할 것. Dev Notes에서 임의로 경로를 재표기하지 않는다.

## Archived Rules

<!-- 해결되거나 더 이상 관련 없는 규칙은 여기로 이동 -->

## 규칙 추가 방법

1. 실수/사고 발생 시 `feedback/incidents/` 아래에 파일 생성
2. 패턴이 반복되면 이 파일의 Active Rules에 추가
3. 10개 초과 시 가장 오래된 것부터 Archived로 이동
