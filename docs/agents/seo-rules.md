# seo-rules.md
# 취소사유분석기 SEO 규칙

## 현재 상태 (v1)

취소사유분석기 v1은 **사내 전용 도구**입니다:
- 외부 검색 엔진 노출 불필요
- 공개 SEO 최적화 대상 아님

## robots.txt 설정

검색 엔진 크롤링 차단:

```txt
# public/robots.txt
User-agent: *
Disallow: /
```

## Next.js Metadata 기본 설정

```typescript
// app/layout.tsx
export const metadata: Metadata = {
  title: '취소사유분석기',
  description: '사내 전용 - 기수별 취소 사유 자동 분류 도구',
  robots: { index: false, follow: false },
}
```

## 공개 전환 시 SEO 규칙 (참고용)

만약 외부에 공개될 경우:
- 모든 페이지에 title/description/canonical 메타태그 필수
- OG 이미지 (1200×630px) 필수
- JSON-LD 스키마 추가 (WebApplication, Organization)
- 한국어 콘텐츠이므로 `lang="ko"` 설정 필수
