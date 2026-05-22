# testing-rules.md
# 취소사유분석기 테스트 규칙

## 4단계 검증 체계

| 단계 | 스크립트 | 내용 | 목표 시간 |
|---|---|---|---|
| Story | `validate-quick.sh` | typecheck + lint | < 60초 |
| Epic | `validate.sh` | typecheck + lint + build | < 5분 |
| 개발(CI) | GitHub Actions | 전체 검증 + 빌드 | < 10분 |
| 배포 | Vercel 자동 | 프리뷰/프로덕션 빌드 | — |

## 테스트 격리 규칙

- 각 테스트는 독립적으로 실행 가능해야 함
- OpenAI API 호출을 포함하는 로직은 반드시 mock 처리
- Supabase 연동 테스트는 별도 테스트 DB 또는 mock 사용
- 테스트 간 공유 상태(전역 변수, 모듈 캐시) 금지

## 테스트 범위

### 필수 테스트 대상

1. **Zod 스키마 검증** — GPT 응답이 예상 스키마에 맞는지
2. **엑셀 파싱 로직** — SheetJS로 다양한 컬럼 구조 처리
3. **분류 카테고리 매핑** — 취소 사유 → 카테고리 매핑 정확성
4. **에러 fallback** — GPT 실패 시 `검토 필요` 처리

### 단위 테스트 예시

```typescript
// 올바른 예: GPT mock 처리
jest.mock('openai', () => ({
  OpenAI: jest.fn().mockImplementation(() => ({
    chat: { completions: { create: jest.fn().mockResolvedValue(mockResponse) } }
  }))
}))
```

## validate 실패 시 재개

```bash
# bash/WSL
./scripts/validate.sh --from=typecheck

# PowerShell
./scripts/validate.ps1 -From typecheck
```

로그 위치: `state/validate/latest/*.log`
