# coding-rules.md
# 취소사유분석기 코딩 규칙

## 파일 구조

- 파일당 단일 export 권장 (최대 300 LOC)
- 컴포넌트: `src/components/ComponentName.tsx`
- 훅: `src/hooks/useHookName.ts`
- 타입: `src/shared/types/`
- 유틸: `src/shared/utils/`

## TypeScript

- strict mode 필수 (`tsconfig.json`의 `"strict": true`)
- `any` 타입 최소화 — GPT 응답은 반드시 Zod 스키마로 검증
- 외부 API 응답 타입은 Zod로 정의하고 `.parse()` 사용

```typescript
// 올바른 예: GPT 응답 Zod 검증
const ClassificationResultSchema = z.object({
  category: z.string(),
  confidence: z.number().min(0).max(1),
});
type ClassificationResult = z.infer<typeof ClassificationResultSchema>;
```

## 환경 변수

- API 키는 `.env.local`에만 저장, 절대 커밋 금지
- 서버 전용: `OPENAI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- 클라이언트 노출 허용: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- 런타임에서 환경변수 부재 시 명시적 에러 throw

## 에러 처리

- 모든 외부 호출(OpenAI, Supabase)에 try-catch 필수
- GPT 실패 시: 1.5초 대기 후 1회 재시도, 그래도 실패 시 `검토 필요` 처리 후 계속
- Route Handler에서 내부 에러를 클라이언트에 그대로 노출 금지

```typescript
// Route Handler 에러 패턴
try {
  const result = await openai.chat.completions.create(...)
  return Response.json({ data: result })
} catch (error) {
  console.error('OpenAI error:', error)
  return Response.json({ error: '분류 중 오류가 발생했습니다.' }, { status: 500 })
}
```

## 로깅

- `console.log` 대신 `console.error` / `console.warn` 사용 (서버 사이드)
- 프로덕션 배포 시 민감 정보(API 키, 개인정보) 로그 금지
- 클라이언트 사이드 `console.*`는 개발 중에만 허용

## 커밋 메시지

형식: `type(scope): 설명`

- `feat(upload): 컬럼 자동 감지 API 추가`
- `fix(classify): GPT 재시도 로직 수정`
- `refactor(shared): Supabase 클라이언트 싱글톤 패턴 적용`
- `test(result): 결과 조회 API 단위 테스트 추가`
