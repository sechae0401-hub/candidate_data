# architecture-rules.md
# 취소사유분석기 아키텍처 경계 규칙

## 레이어 구조 (Next.js 14 App Router 기준)

```
UI Layer         → app/**/page.tsx, app/**/layout.tsx, components/
Service Layer    → app/api/**/route.ts (Route Handlers)
Shared Layer     → src/shared/ (types, utils, db client)
Config Layer     → .env*, next.config.ts, tailwind.config.ts
```

## 모듈 경계

취소사유분석기는 3개 기능 모듈 + 1개 공통 모듈로 구성됩니다:

| 모듈 | 경로 | 역할 |
|---|---|---|
| upload | `src/upload/` | 엑셀 업로드 · 컬럼 분석 · 취소 대상 선택 |
| classify | `src/classify/` | GPT 분류 루프 · 진행 상태 관리 |
| result | `src/result/` | 분류 결과 조회 · 인라인 수정 · 노션 출력 |
| shared | `src/shared/` | DB 클라이언트 · 공통 타입 · 유틸리티 |

## 허용 의존성

- UI → Service (Route Handler 호출만 허용, 직접 DB 접근 금지)
- Service → Shared (DB client 사용)
- upload, classify, result → shared (공통 모듈만 참조 허용)
- **upload ↔ classify ↔ result 간 직접 import 금지** (Supabase 경유)

## 금지 패턴

1. 브라우저 코드에서 `SUPABASE_SERVICE_ROLE_KEY` 또는 `OPENAI_API_KEY` 참조
2. `page.tsx`에서 직접 DB 쿼리 실행 (Route Handler 경유 필수)
3. 모듈 간 직접 함수 import (`upload`에서 `classify` 함수 직접 호출 금지)
4. `any` 타입 남용 (GPT 응답은 반드시 Zod로 검증)
5. 클라이언트 컴포넌트에서 환경변수 `NEXT_PUBLIC_` 없이 직접 참조

## API 경로 규칙

- `/api/upload/analyze-columns` — 전체 컬럼 분석 (POST)
- `/api/classify/start` — 분류 시작 (POST)
- `/api/classify/status` — 진행 상태 조회 (GET)
- `/api/result/[sessionId]` — 결과 조회 (GET)
- `/api/result/[sessionId]/update` — 인라인 수정 (PATCH)
- 정적 파일: `/templates/cancellation-template.xlsx`

## Health Check

서비스 배포 시 `/api/health` 엔드포인트 필수:
```json
{ "status": "ok", "version": "1.0.0" }
```
