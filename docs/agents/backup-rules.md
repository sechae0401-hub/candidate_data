# backup-rules.md
# 취소사유분석기 백업 규칙

## 데이터베이스 백업 (Supabase)

Supabase는 자동 백업을 제공합니다:

- **일간 자동 백업**: Supabase Pro 플랜 이상에서 제공 (7일 보관)
- **수동 백업**: Supabase Dashboard → Settings → Database → Backups

### 수동 백업 명령 (Supabase CLI)

```bash
# DB 덤프 (로컬 개발용)
npx supabase db dump -f backup_$(date +%Y%m%d).sql

# 특정 테이블만 덤프
npx supabase db dump --data-only -f data_backup.sql
```

## 배포 전 백업 체크리스트

1. Supabase Dashboard에서 최신 백업 존재 확인
2. 마이그레이션 포함 배포 시 수동 백업 먼저 실행
3. 롤백 절차 확인 (마이그레이션 down 스크립트)

## 코드 백업 (Git)

- GitHub 원격 저장소가 유일한 소스
- 모든 작업 브랜치를 주기적으로 push
- Phase A 완료 후 반드시 commit + push (세션 종료 전)

## 사용자 데이터 정책 (v1)

- 분류 결과는 Supabase에 저장 (기수별 세션 단위)
- 개인정보 포함 엑셀 파일은 서버에 저장하지 않음 (브라우저에서만 처리)
- session_id로 결과 조회 가능 (URL 공유 없음, 내부 도구)
