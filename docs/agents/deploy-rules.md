# deploy-rules.md
# 취소사유분석기 배포 규칙

## 배포 환경

| 환경 | 플랫폼 | URL | 트리거 |
|---|---|---|---|
| 개발 | Vercel Preview | PR별 자동 생성 | PR 오픈 |
| 프로덕션 | Vercel | 고정 URL | main 브랜치 merge |

## 환경 변수 관리

- `.env.local` — 로컬 개발용 (절대 커밋 금지)
- Vercel Dashboard — 프로덕션 환경 변수 (Vercel UI에서 관리)

### 항상 필수 (없으면 런타임에 throw)

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### AI provider 선택 (`AI_PROVIDER`)

- `AI_PROVIDER` — `openai`(기본값) 또는 `gemini`. 미설정 시 `openai`로 동작
- **프로덕션 기본은 `openai`**

provider가 `openai`일 때 (기본):

- `OPENAI_API_KEY` — 필수
- `OPENAI_MODEL` — **필수** (기본값 없음, 누락 시 `readOpenAiEnv()`가 throw → classify/insight/analyze-columns API 500)

provider가 `gemini`일 때:

- `GEMINI_API_KEY` — 필수
- `GEMINI_MODEL` — 선택 (기본값 `gemini-2.0-flash`)

> ⚠️ `OPENAI_MODEL`은 코드(`src/shared/env/read-server-env.ts`)에서 필수로 요구한다. Vercel에 `OPENAI_API_KEY`만 넣고 `OPENAI_MODEL`을 빠뜨리면 분류 API가 전부 실패하므로 반드시 함께 설정한다.

## 배포 전 체크리스트

1. `npm run build` 로컬에서 성공 확인
2. `npx tsc --noEmit` 타입 에러 없음 확인
3. `.env.local`이 `.gitignore`에 포함되어 있는지 확인
4. Vercel에 필수 환경 변수 설정 여부 확인 (특히 `OPENAI_MODEL` 누락 주의 — 위 "환경 변수 관리" 참고)
5. Supabase 스키마 마이그레이션 완료 여부 확인
6. Vercel 플랜이 `vercel.json`의 `maxDuration`(현재 30초)을 지원하는지 확인 — Hobby 플랜은 함수 실행시간 한도가 더 짧아 30초 설정이 동작하지 않을 수 있다 (Pro 권장)

## 브랜치 전략

```
main         ← 프로덕션 (Vercel 자동 배포)
develop      ← 개발 통합 (Phase B 완료 후 merge)
feature/*    ← 기능 개발 (story 단위)
```

## 정적 파일

- 엑셀 양식 파일: `public/templates/cancellation-template.xlsx`
- Next.js `public/` 폴더를 통해 `/templates/cancellation-template.xlsx`로 제공

## 포트 하드코딩 금지

- 포트 번호를 코드에 직접 쓰지 않음
- 외부 URL은 환경 변수로 관리
- `next.config.ts`에서 포트 설정 시 환경 변수 사용
