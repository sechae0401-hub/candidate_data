# performance-rules.md
# 취소사유분석기 성능 규칙

## GPT 분류 성능

- 분류 단위: 3건씩 배치 처리 (FRD 기준)
- GPT 실패 시 1.5초 대기 후 1회 재시도
- 분류 완료까지 `/analyzing` 페이지에서 실시간 진행 상태 표시
- 전체 분류 예상 시간: 기수당 60명 기준 약 20초 이내 목표

## 엑셀 파싱

- SheetJS를 브라우저에서 실행 (서버 업로드 없음)
- 파일을 ArrayBuffer로 읽어 메모리에서 처리
- 대용량 엑셀(1,000행 이상) 파싱 시 Web Worker 고려

## DB 쿼리 (Supabase)

- N+1 쿼리 금지: 관련 데이터는 `.select()` 조인으로 한 번에 조회
- 결과 조회 시 `session_id`로 필터링 필수 (전체 테이블 스캔 방지)
- 페이지네이션: 결과가 100건을 넘을 경우 `.range()` 사용

## 프론트엔드 번들

- 루트당 gzip 250KB 이하 목표
- SheetJS는 동적 import로 필요 시점에만 로드
- shadcn/ui 컴포넌트는 필요한 것만 import (전체 라이브러리 import 금지)

```typescript
// 올바른 예: 동적 import
const XLSX = await import('xlsx')

// 금지: 전체 import
import * as XLSX from 'xlsx'
```

## 이벤트 리스너

- React 컴포넌트에서 addEventListener 사용 시 useEffect cleanup 필수
- 분류 진행 상태 폴링 시 컴포넌트 unmount 시 clearInterval 필수

## Vercel 서버리스 제약

- Route Handler 실행 시간: 30초 이하 (Vercel 기본 한도)
- 긴 분류 작업은 백그라운드 처리 + 상태 폴링 패턴 사용
- Edge Runtime 사용 금지 (Supabase SSR 호환 문제)
