# security-rules.md
# 취소사유분석기 보안 규칙

## API 키 관리 (최우선)

- `OPENAI_API_KEY` — Route Handler 전용, 절대 클라이언트 노출 금지
- `SUPABASE_SERVICE_ROLE_KEY` — Route Handler 전용, 절대 클라이언트 노출 금지
- `NEXT_PUBLIC_SUPABASE_URL` — 클라이언트 노출 허용 (anon key와 함께 사용)
- `.env.local`은 `.gitignore`에 포함 필수, 절대 커밋 금지

```bash
# 확인 명령
grep -r "OPENAI_API_KEY\|SERVICE_ROLE" src/app --include="*.tsx" --include="*.ts"
# 결과가 있으면 즉시 수정
```

## 입력 검증

- 사용자 파일 업로드: 확장자 `.xlsx`, `.xls` 만 허용
- 파일 크기 제한: 10MB 이하
- Route Handler 요청 본문: Zod 스키마로 반드시 검증
- SQL 쿼리: Supabase 클라이언트의 파라미터 바인딩만 사용 (raw SQL 금지)

## 응답 보안

- 내부 에러 메시지를 클라이언트에 그대로 노출 금지
- Supabase 에러는 제네릭 메시지로 래핑: `"데이터 처리 중 오류가 발생했습니다."`
- OpenAI 에러는 제네릭 메시지로 래핑: `"분류 중 오류가 발생했습니다."`

## CORS / 헤더

- Next.js 기본 CORS 설정 사용 (같은 도메인만 허용)
- `Access-Control-Allow-Origin: *` 설정 금지
- Vercel 배포 시 환경별 허용 도메인 명시

## 인증 (v1)

- v1은 인증 없음 (채매니저 단독 사내 사용)
- v2 확장 시 Supabase Auth 사용 예정

## 5단계 자동 검증

1. **pre-commit** — 시크릿 패턴 grep으로 커밋 차단
2. **PostToolUse Hook** — typecheck + lint 자동 실행
3. **PR 리뷰** — `bmad-code-review`로 보안 항목 체크
4. **배포 전** — Vercel 빌드 성공 필수
5. **정기 점검** — 주간 의존성 취약점 확인 (`npm audit`)
