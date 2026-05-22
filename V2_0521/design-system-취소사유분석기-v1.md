# 취소사유분석기 디자인 시스템 v1.0

> 작성일: 2026-05-21
> 사용 대상: Google Stitch / Claude Design / Antigravity (React + Tailwind)
> 참고 출처: Mintlify 디자인 시스템 (재해석 적용)

---

## 1. 전체 디자인 콘셉트

**키워드**: 조용한 전문성 · 데이터 밀도 · 빠른 피드백

이 도구는 팀 내부에서 반복 사용하는 **업무용 분석 도구**다. 화려한 마케팅 사이트가 아니라, 빠르게 파일을 올리고 결과를 확인하고 팀에 공유하는 흐름이 핵심이다. 따라서 디자인의 목표는 "눈에 띄는 것"이 아니라 "방해 없이 작업이 끝나는 것"이다.

**톤**: 차분한 흰 배경 위에, 상태 변화(로딩·완료·경고)를 색상으로만 명확하게 알린다. 장식은 최소화하고, 여백과 타이포그래피로 위계를 만든다.

---

## 2. 참고 디자인에서 가져올 스타일 방향

Mintlify 디자인 시스템에서 다음 요소를 우리 도구에 맞게 재해석한다.

| 참고 요소 | 원본 사용 맥락 | 우리 도구 적용 방향 |
|---|---|---|
| 흰 배경 + 헤어라인 테두리 카드 | 개발 문서 페이지 | 업로드 영역·결과 테이블 카드 |
| 14–16px 고밀도 본문 + 1.5 줄간격 | 긴 문서 읽기용 | 결과 테이블, 사이드 패널 원문 |
| 초록 포인트 색상 (1~2곳만) | 활성 버튼, 체크 아이콘 | 완료 상태 배지, 기본 실행 버튼 |
| 상태 배지 시스템 (REQUIRED, type 태그) | API 문서 | 검토필요 / 완료 / 정보부족 배지 |
| 진행 테이블 + 행별 색상 구분 | Feature comparison table | 분류 결과 테이블 |
| 심플한 pill 버튼 | 마케팅 CTA | 분류 실행, 복사 등 주요 액션 버튼 |
| 3단 레이아웃 (사이드바 / 본문 / 패널) | 문서 페이지 | 결과 화면 (요약 / 테이블 / 원문 패널) |

---

## 3. 그대로 따라 하면 안 되는 요소

| 요소 | 이유 |
|---|---|
| 하늘색·민트 그라디언트 히어로 배경 | 마케팅 사이트 전용. 업무 도구에서는 과장되어 보임 |
| Mintlify 로켓·구름 일러스트레이션 | 브랜드 고유 자산. 사용 금지 |
| 72px 디스플레이 헤드라인 | 업무 도구에 불필요한 스케일 |
| 오렌지 추천사 카드 | 감성적 마케팅 요소. 우리 도구와 맥락 불일치 |
| 6열 로고 월 | 고객사 신뢰 요소. 내부 도구에 해당 없음 |
| Geist Mono 코드 폰트 조합 | 코드 블록이 없는 우리 도구에 불필요 |

---

## 4. 색상 시스템

> 색상은 상태 표현에만 사용한다. 장식 목적의 색상은 피한다.

### 4.1 기본 팔레트

| 역할 | 색상 이름 | 추천 값 | 사용처 |
|---|---|---|---|
| 배경 | Canvas White | `#FFFFFF` | 전체 페이지 배경 |
| 보조 배경 | Surface | `#F7F7F8` | 카드 배경, 테이블 헤더, 입력 필드 |
| 테두리 | Hairline | `#E5E7EB` | 카드·테이블·입력 테두리 |
| 보조 테두리 | Hairline Soft | `#F0F0F2` | 테이블 행 구분선 |
| 주요 텍스트 | Ink | `#111827` | 제목, 강조 텍스트 |
| 본문 텍스트 | Charcoal | `#374151` | 일반 본문 |
| 보조 텍스트 | Slate | `#6B7280` | 설명문, 레이블 |
| 흐린 텍스트 | Muted | `#9CA3AF` | 비활성 항목, 플레이스홀더 |

### 4.2 상태 색상

| 상태 | 색상 이름 | 추천 값 | 사용처 |
|---|---|---|---|
| 기본 실행 (Primary) | Ink Black | `#111827` | 분류 실행 버튼 배경 |
| 완료·성공 | Teal Green | `#10B981` | 완료 배지, 완료 행 배경 틴트, 포커스 테두리 |
| 완료 배경 틴트 | Green Soft | `#F0FDF4` | 완료 처리된 행 배경색 |
| 검토 필요 | Amber | `#F59E0B` | 검토 필요 배지 |
| 검토 배경 틴트 | Amber Soft | `#FFFBEB` | 검토 필요 행 배경색 |
| 오류·에러 | Red | `#EF4444` | 에러 메시지, 필수 항목 누락 안내 |
| 오류 배경 틴트 | Red Soft | `#FEF2F2` | 에러 인라인 메시지 배경 |
| 비활성 버튼 | Hairline + Muted | `#E5E7EB` 배경 + `#9CA3AF` 텍스트 | 분류 실행 버튼 비활성 상태 |

### 4.3 색상 사용 원칙

- Teal Green은 "완료" 단 하나의 의미만 가진다. 다른 곳에 사용하지 않는다.
- Amber는 "사람이 확인해야 하는 상태"에만 사용한다.
- 배경에 그라디언트를 사용하지 않는다.
- 색상을 3종류 이상 한 화면에 동시에 강조용으로 사용하지 않는다.

---

## 5. 타이포그래피 방향

### 5.1 폰트 선택

| 용도 | 추천 폰트 | 대안 |
|---|---|---|
| 전체 UI 텍스트 | **Pretendard** (한글+영어 동시 지원) | Noto Sans KR |
| 숫자·코드 표시 (추정) | **Pretendard** 동일 사용 | 별도 모노스페이스 불필요 |

> Pretendard는 한글 가독성이 높고, Tailwind와 쉽게 연동된다. 별도 코드 폰트 조합은 이 도구에서 불필요하다.

### 5.2 크기 체계

| 역할 | 크기 | 굵기 | 줄간격 | 사용처 |
|---|---|---|---|---|
| 페이지 제목 | 24px | 600 | 1.3 | 각 화면 상단 제목 ("취소 사유 분류 결과") |
| 섹션 제목 | 18px | 600 | 1.4 | 카드 제목, 단계 제목 |
| 보조 제목 | 16px | 500 | 1.4 | 소제목, 테이블 컬럼 헤더 |
| 기본 본문 | 15px | 400 | 1.6 | 설명 텍스트, 인사이트 요약 |
| 테이블 셀 | 14px | 400 | 1.5 | 분류 결과 테이블 데이터 |
| 보조 설명 | 13px | 400 | 1.5 | 안내 메시지, 플레이스홀더 |
| 배지·레이블 | 12px | 500 | 1.3 | 상태 배지, 단계 번호 |
| 버튼 | 14px | 500 | 1.3 | 모든 버튼 레이블 |

### 5.3 타이포그래피 원칙

- 제목에 음수 자간(letter-spacing)을 주지 않는다. 한글은 음수 자간이 어색하게 보인다.
- 본문의 줄간격은 1.5 이상을 유지한다. 업무 도구에서 줄간격이 좁으면 피로도가 증가한다.
- 굵기로 위계를 만들고, 색상은 보조 수단으로 사용한다.
- 이탤릭체는 사용하지 않는다.

---

## 6. 섹션 레이아웃 원칙

### 6.1 전체 구조

이 도구는 단일 페이지 흐름(S-001 → S-002 → S-003)이다. 각 화면은 좌우 여백이 있는 중앙 정렬 컨테이너 안에서 단계별로 표시된다.

```
┌──────────────────────────────────────────┐
│  상단 네비게이션 바 (도구명 + 단계 표시)      │
├──────────────────────────────────────────┤
│  [최대 너비 800px, 좌우 auto margin]        │
│                                          │
│  [ 메인 콘텐츠 영역 ]                       │
│                                          │
└──────────────────────────────────────────┘
```

- 최대 너비: 업로드·분류 중 화면은 `max-w-2xl` (672px), 결과 화면은 `max-w-5xl` (1024px)
- 좌우 패딩: `px-6` (24px)
- 결과 화면은 테이블 + 사이드 패널을 나란히 표시하므로 더 넓은 컨테이너 사용

### 6.2 S-001 업로드 화면 레이아웃

단계가 순서대로 아래로 쌓이는 세로 흐름. 이전 단계가 완료돼야 다음 단계 카드가 활성화된다.

```
[단계 1] 양식 다운로드 카드
[단계 2] 파일 업로드 카드  ← 단계 1 완료 후 활성
[단계 3/4] AI 분석 + 확인  ← 단계 2 완료 후 자동 실행
[단계 5] 취소 대상 선택    ← 확인 후 활성
[          분류 실행 버튼         ]
```

### 6.3 S-003 결과 화면 레이아웃

```
┌──────────────────────────────────────────┐
│  요약 바: 전체 N건 | 검토 필요 M건 | 완료 K건  │
├────────────────────┬─────────────────────┤
│  분류 결과 테이블    │  원문 사이드 패널     │
│  (행 클릭으로 우측   │  (인터뷰 내용 전문)  │
│  패널 열림)         │                     │
├────────────────────┴─────────────────────┤
│  인사이트 요약 + 신규 카테고리 목록          │
│  [노션 형식 복사 버튼]                      │
└──────────────────────────────────────────┘
```

---

## 7. 버튼 스타일

| 유형 | 배경색 | 텍스트 | 테두리 | 모서리 | 패딩 | 사용처 |
|---|---|---|---|---|---|---|
| Primary (기본) | `#111827` (Ink) | 흰색 | 없음 | `rounded-full` | `10px 20px` | 분류 실행, 이 내용으로 진행 |
| Primary 비활성 | `#E5E7EB` | `#9CA3AF` | 없음 | `rounded-full` | `10px 20px` | 조건 미충족 시 |
| Secondary (보조) | 투명 | `#111827` | `1px #E5E7EB` | `rounded-full` | `10px 20px` | 다시 분석, 취소 |
| Ghost (약한) | 투명 | `#6B7280` | 없음 | `rounded-md` | `8px 12px` | 새 분류 시작, 뒤로 가기 |
| Danger (위험) | 투명 | `#EF4444` | `1px #EF4444` | `rounded-full` | `10px 20px` | 이탈 확인 팝업의 "나가기" |
| Icon (아이콘) | `#F7F7F8` | `#374151` | `1px #E5E7EB` | `rounded-full` | `8px` / 32×32px | 복사, 닫기 |

**원칙**:
- 모든 주요 버튼은 `rounded-full` pill 형태 사용
- 화면당 Primary 버튼은 1개만 표시
- 버튼 레이블은 동사+명사 구조 ("분류 실행", "양식 다운로드", "노션 형식 복사")

---

## 8. 카드 스타일

| 유형 | 배경 | 테두리 | 모서리 | 내부 여백 | 사용처 |
|---|---|---|---|---|---|
| 기본 카드 | `#FFFFFF` | `1px #E5E7EB` | `rounded-xl` (12px) | `p-6` (24px) | 업로드 단계 카드, 확인 카드 |
| 진행 중 카드 | `#FFFFFF` | `2px #10B981` | `rounded-xl` | `p-6` | 현재 진행 단계 강조 |
| 비활성 카드 | `#F7F7F8` | `1px #E5E7EB` | `rounded-xl` | `p-6` | 아직 진행 불가인 단계 |
| 요약 바 | `#F7F7F8` | `1px #E5E7EB` 아래만 | 없음 | `px-6 py-4` | 결과 화면 상단 |
| 인사이트 카드 | `#F7F7F8` | `1px #E5E7EB` | `rounded-lg` (8px) | `p-5` | 인사이트 요약 영역 |
| 사이드 패널 | `#FFFFFF` | 왼쪽 `2px #E5E7EB` | 없음 | `p-6` | 원문 표시 패널 |

**원칙**:
- 카드에 그림자(box-shadow)는 사용하지 않거나 매우 미세하게 사용 (최대 `shadow-sm`)
- 현재 활성 단계 카드만 초록 테두리로 강조
- 카드 안에서의 섹션 구분은 `border-b` 수평선으로 처리

---

## 9. 이미지 또는 비주얼 블록 방향

이 도구는 **이미지를 거의 사용하지 않는다.** 대신 아래 요소로 시각적 위계를 만든다.

| 요소 | 사용 방법 |
|---|---|
| 상태 아이콘 | 체크(✓), 경고(△), 정보(ℹ), 에러(✕) — 16–20px SVG 아이콘 사용 |
| 프로그레스 바 | S-002 화면. 높이 8px, 배경 `#E5E7EB`, 채움 `#10B981`, `rounded-full` |
| 배지 | 텍스트 + 배경색 조합. 그림자 없음. 8px 좌우 패딩 |
| 빈 상태 일러스트 | (추정) 파일 업로드 전 초기 상태에 간단한 SVG 아이콘 + 안내 문구 조합 사용 가능 |
| 드래그 앤 드롭 영역 | 점선 테두리 `border-2 border-dashed #E5E7EB`, 배경 `#F7F7F8`, 중앙 아이콘 + 텍스트 |

**원칙**:
- 히어로 이미지, 배경 이미지, 그라디언트 배경 없음
- 사람 사진, 일러스트레이션, 마케팅 비주얼 없음
- 아이콘은 동일한 라이브러리 1개만 사용할 것 (추정: Heroicons 또는 Lucide)

---

## 10. 여백과 밀도

**목표**: 마케팅 사이트의 넉넉한 여백과 개발 문서의 고밀도 사이 중간 지점. "업무 집중 밀도"

### 간격 체계 (Tailwind 기준)

| 토큰 | 값 | 사용처 |
|---|---|---|
| `gap-1` / `space-y-1` | 4px | 배지 내부, 인접 항목 묶음 |
| `gap-2` / `space-y-2` | 8px | 작은 항목 간격 (체크박스 목록) |
| `gap-3` / `space-y-3` | 12px | 인라인 요소 간격 |
| `gap-4` / `space-y-4` | 16px | 기본 항목 간격, 테이블 행 패딩 |
| `gap-6` / `space-y-6` | 24px | 카드 내부 섹션 간격 |
| `gap-8` / `space-y-8` | 32px | 카드 간 간격, 주요 섹션 구분 |
| `gap-12` / `space-y-12` | 48px | 화면 상단 여백 |

### 밀도 원칙

- 테이블 행 높이: 48px (충분한 클릭 영역 확보)
- 테이블 셀 패딩: `px-4 py-3`
- 카드 내부 여백: `p-6`
- 화면 양쪽 여백(모바일): `px-4`, 태블릿 이상: `px-6`

---

## 11. 모바일 반응형 원칙

> 이 도구는 노트북 전용으로 시작하지만, 기본 반응형 구조는 처음부터 갖춰야 한다.

| 화면 | 기준 너비 | 레이아웃 변화 |
|---|---|---|
| 모바일 | < 768px | 단일 컬럼. 사이드 패널은 하단 슬라이드업 시트로 전환 (추정) |
| 태블릿 | 768–1023px | 결과 화면 사이드 패널 숨기고 클릭 시 표시 |
| 노트북 (기본) | ≥ 1024px | 결과 화면 2단 분할 (테이블 + 사이드 패널) |

**터치 영역**: 버튼과 클릭 가능한 행의 최소 높이는 44px 이상 유지

**우선 지원 환경**: 1280px 이상 노트북 화면. 모바일은 3단계 이후 최적화 예정.

---

## 12. 피해야 할 디자인 요소

| 피해야 할 것 | 이유 |
|---|---|
| 그라디언트 배경 | 업무 도구에서 과장된 느낌. 상태에만 집중을 방해함 |
| 큰 히어로 섹션 | 매 사용 시 거쳐야 하는 도구에 불필요 |
| 애니메이션 과다 | 반복 사용 시 피로감. 상태 전환 시 fade만 허용 (150ms) |
| 다수의 강조 색상 공존 | 상태 구분이 모호해짐 |
| 텍스트 굵기 남용 | 모든 게 굵으면 위계가 사라짐 |
| 아이콘 과다 사용 | 의미 없이 모든 항목에 아이콘 부착 금지 |
| 팝업/모달 남용 | 이탈 경고 외에 모달은 최소화. 인라인 메시지 우선 |
| 검은 배경 다크 테마 | 이 도구는 밝은 테마 단일 운영 (1단계 기준) |
| 마케팅 카피 스타일 문구 | "놀라운 AI 분석" 등의 홍보 문구. 기능 중심 레이블만 사용 |

---

## 13. Google Stitch / Claude Design 프롬프트용 요약

아래 텍스트를 Google Stitch 또는 Claude Design에 그대로 붙여넣어 사용할 수 있다.

---

### 한국어 프롬프트

```
이 UI는 교육 기관 운영 담당자가 사용하는 사내 데이터 분석 도구입니다.
엑셀 파일을 업로드하고, AI가 취소 사유를 분류하고, 결과를 팀 협업 도구에 복사하는 3단계 흐름입니다.

디자인 방향:
- 전체 배경: 흰색 (#FFFFFF), 섹션 구분은 연한 회색 카드 (#F7F7F8)
- 포인트 색상: 초록 (#10B981) — 완료 상태 전용. 장식 목적 사용 금지
- 경고 색상: 황색 (#F59E0B) — 검토 필요 행 전용
- 에러 색상: 빨강 (#EF4444) — 필수 항목 누락, 오류 메시지 전용
- 폰트: Pretendard (한글+영어). 제목 24px/600, 본문 15px/400, 테이블 14px/400
- 버튼: pill 형태 (border-radius: 9999px), 주요 버튼 배경 #111827 흰 텍스트
- 카드: 흰 배경, 1px #E5E7EB 테두리, border-radius 12px, 내부 패딩 24px
- 그림자 없음 또는 shadow-sm만 허용
- 그라디언트 배경 사용 금지
- 애니메이션: 상태 전환 시 fade 150ms만 허용

화면 구성:
1. 업로드 화면: 단계별 카드가 세로로 쌓이는 구조. 최대 너비 672px 중앙 정렬.
2. 분류 실행 중 화면: 진행 바(높이 8px, 초록 채움) + 건수 카운터 중앙 배치.
3. 분류 결과 화면: 상단 요약 바 + 2단 분할(결과 테이블 / 원문 사이드 패널). 최대 너비 1024px.

결과 테이블 행 색상:
- 검토 필요: 배경 #FFFBEB, 왼쪽 4px 황색 선
- 완료: 배경 #F0FDF4, 왼쪽 4px 초록 선
- 기본: 흰 배경, 하단 1px #F0F0F2 구분선
```

---

### 영어 프롬프트 (Stitch 사용 시 권장)

```
Design a clean, professional internal data analysis tool for education operations staff.

Layout: 3-step single-page flow. Upload screen (max-w-2xl centered), Loading screen (centered progress UI), Results screen (max-w-5xl, two-column: table + side panel).

Color system:
- Background: #FFFFFF canvas, #F7F7F8 surface
- Borders: #E5E7EB
- Primary text: #111827, Body: #374151, Muted: #6B7280
- Success/Complete: #10B981 (green) — ONLY for completed state
- Warning/Review: #F59E0B (amber) — ONLY for needs-review state
- Error: #EF4444 — ONLY for error messages
- Completed row background: #F0FDF4, Review row background: #FFFBEB

Typography: Pretendard or system sans-serif. Heading 24px/600, body 15px/400, table cell 14px/400, label 12px/500. Line-height 1.5+. No italic.

Buttons: All pill shape (rounded-full). Primary: #111827 bg + white text. Secondary: transparent + #111827 text + 1px #E5E7EB border. Disabled: #E5E7EB bg + #9CA3AF text.

Cards: white bg, 1px #E5E7EB border, 12px radius, 24px padding. No shadow or shadow-sm only.

No gradients, no hero images, no decorative illustrations, no marketing copy. Functional labels only ("Run Analysis", "Copy to Notion", "Download Template").

Results table rows: 48px height, px-4 py-3 cell padding, left-4px colored border for status (green=complete, amber=review).

Progress bar: 8px height, rounded-full, #E5E7EB bg, #10B981 fill.
```

---

## 부록: Tailwind 클래스 빠른 참조

```
// 기본 카드
className="bg-white border border-gray-200 rounded-xl p-6"

// 활성 단계 카드 (초록 테두리)
className="bg-white border-2 border-emerald-500 rounded-xl p-6"

// 비활성 카드
className="bg-gray-50 border border-gray-200 rounded-xl p-6 opacity-60"

// Primary 버튼
className="bg-gray-900 text-white text-sm font-medium px-5 py-2.5 rounded-full hover:bg-gray-700 transition-colors"

// Primary 비활성 버튼
className="bg-gray-200 text-gray-400 text-sm font-medium px-5 py-2.5 rounded-full cursor-not-allowed"

// Secondary 버튼
className="bg-transparent text-gray-900 text-sm font-medium px-5 py-2.5 rounded-full border border-gray-200 hover:bg-gray-50 transition-colors"

// 검토 필요 배지
className="inline-flex items-center gap-1 text-xs font-medium bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full"

// 완료 배지
className="inline-flex items-center gap-1 text-xs font-medium bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full"

// 에러 배지
className="inline-flex items-center gap-1 text-xs font-medium bg-red-50 text-red-500 px-2 py-0.5 rounded-full"

// 결과 테이블 검토 필요 행
className="border-l-4 border-amber-400 bg-amber-50"

// 결과 테이블 완료 행
className="border-l-4 border-emerald-500 bg-emerald-50"

// 드래그 앤 드롭 영역
className="border-2 border-dashed border-gray-200 rounded-xl bg-gray-50 p-10 text-center"

// 진행 바 (전체)
className="w-full h-2 bg-gray-200 rounded-full overflow-hidden"
// 진행 바 (채움)
className="h-full bg-emerald-500 rounded-full transition-all duration-300"

// 요약 바
className="flex items-center gap-6 px-6 py-4 bg-gray-50 border-b border-gray-200 text-sm"
```
