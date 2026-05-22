# docker-rules.md
# 취소사유분석기 Docker 규칙

## 현재 상태 (v1)

취소사유분석기 v1은 Vercel 서버리스로 배포되며 **Docker를 사용하지 않습니다**.

- 프론트엔드+API: Vercel 자동 배포
- 데이터베이스: Supabase 관리형 PostgreSQL

## 로컬 개발 환경

```bash
npm run dev   # Next.js 개발 서버 (포트 3000)
```

별도의 Docker Compose 설정이 필요 없습니다.

## 향후 Docker 사용 시 규칙 (참고용)

로컬에서 Supabase를 직접 실행하고 싶은 경우:

```bash
# Supabase CLI 사용 (Docker 없이도 가능)
npx supabase start
npx supabase stop
```

Docker를 사용하게 된다면:
- 컨테이너 명: `cancellation-analyzer-<role>`
- 네트워크: `cancellation-analyzer-net`
- `docker compose down -v` 절대 금지 (DB 데이터 영구 유실)
- compose 파일 최상단에 `name:` 라벨 필수
