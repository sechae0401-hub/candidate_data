# migration-rules.md
# 취소사유분석기 데이터베이스 마이그레이션 규칙

## 도구

- Supabase Dashboard의 SQL Editor 또는 Supabase CLI 사용
- `supabase/migrations/` 폴더에 마이그레이션 파일 관리

## 마이그레이션 규칙

1. **모든 마이그레이션은 롤백 가능해야 함**
   - `up` 스크립트와 함께 `down` 스크립트 작성
   - 컬럼 삭제 전 반드시 데이터 백업

2. **파괴적 변경은 2단계 전략**
   - 1단계: 새 컬럼 추가 + 데이터 마이그레이션
   - 2단계: 이전 컬럼 제거 (다음 배포에서)

3. **마이그레이션 파일 이름 형식**
   - `YYYYMMDDHHMMSS_description.sql`
   - 예: `20260521120000_create_sessions_table.sql`

## 스키마 (취소사유분석기 v1)

```sql
-- sessions: 분류 세션 관리
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'pending', -- pending | analyzing | done
  total_count INT,
  processed_count INT DEFAULT 0
);

-- classification_results: 분류 결과
CREATE TABLE classification_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id),
  row_index INT,
  original_reason TEXT,
  category TEXT,
  confidence FLOAT,
  needs_review BOOLEAN DEFAULT FALSE,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## 운영 DB 마이그레이션 절차

1. 로컬에서 마이그레이션 테스트
2. Supabase CLI로 프리뷰 환경에 적용 및 검증
3. 프로덕션 배포 전 Supabase Dashboard에서 수동 적용
4. 배포 후 `sessions` 테이블 row 수 확인
