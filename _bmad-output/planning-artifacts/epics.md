---
stepsCompleted: ["step-01", "step-02", "step-03", "step-04"]
inputDocuments:
  - "docs/PRD-취소사유분析기-v2.md"
  - "docs/FRD-취소사유분析기-v2.md"
  - "docs/TRD-취소사유분析기-v2.md"
  - "docs/design-system-취소사유분析기-v1.md"
---

# 취소사유분析기 - Epic Breakdown

## Overview

이 문서는 취소사유분析기(교육과정 취소자 AI 자동 분류 사내 웹 도구)의 에픽과 스토리 전체 목록을 제공한다. PRD, FRD, TRD(아키텍처), 디자인 시스템 요구사항을 분해하여 구현 가능한 스토리로 정리한다.

## Requirements Inventory

### Functional Requirements

FR1: 업로드 화면 상단에 분析用 엑셀 양식 파일(`/public/template/취소사유분析기_양식.xlsx`) 다운로드 버튼을 항상 표시한다.
FR2: 드래그 앤 드롭 또는 클릭으로 xlsx, xls 파일을 업로드할 수 있다. 업로드 성공 시 파일명과 총 행 수를 표시한다.
FR3: xlsx/xls 외 형식 파일 업로드 시 "xlsx 또는 xls 파일만 업로드할 수 있습니다" 에러 메시지를 표시한다.
FR4: 파일 업로드 직후 필수 컬럼(인터뷰내容, 특이사항, 최종결과) 존재 여부를 자동으로 검증한다.
FR5: 필수 컬럼 없을 시 에러 메시지 표시 + 분류 실행 버튼 비활성화 + 양식 다운로드 버튼을 안내한다.
FR6: 컬럼명이 유사하게 변경된 경우(예: "인터뷰내容" → "면담내容") 감지하여 안내 메시지를 표시한다.
FR7: 양식 검증 통과 후 GPT-5.5가 파일 전체 컬럼을 자동으로 분析한다 ("AI가 파일을 분析하고 있습니다..." 로딩 표시).
FR8: GPT-5.5 컬럼 분析 결과를 표로 보여주는 확인 화면을 표시한다 (AI가 각 컬럼을 어떻게 이해했는지 표시).
FR9: 확인 화면에서 "이 내容으로 진행" / "다시 분析" 버튼을 제공한다. 사용자가 승인하기 전까지는 분류 실행 버튼이 활성화되지 않는다.
FR10: AI 분析 승인 후 최종결과 컬럼에서 감지된 값 목록을 체크박스로 표시한다.
FR11: 체크박스 선택에 따라 분류 대상 건수를 실시간으로 표시한다 ("분류 대상 N건").
FR12: 결과 화면 상단에 표시될 기수명 입력란(선택 사항)을 제공한다.
FR13: 취소 대상 1건 이상 선택 시에만 "분류 실행" 버튼을 활성화한다.
FR14: 분류 실행 중 화면에서 진행 카운터 ("N건 완료 / M건 전체")를 실시간으로 표시한다.
FR15: 분류 실행 중 프로그레스 바를 표시한다.
FR16: 현재 처리 단계("취소 사유 분류 중" → "인사이트 요약 생성 중")를 화면에 표시한다.
FR17: 분류 중 페이지 이탈 시도 시 경고 팝업을 표시한다 ("분류가 진행 중입니다. 지금 이탈하면 분류가 중断됩니다.").
FR18: 특정 배치(3건 묶음) 분류 실패 시 해당 건을 검토 필요로 태깅하고 "N건 검토 필요로 처리됨, 계속 진행 중" 안내를 표시한다.
FR19: 전체 분류 실패 시 재시도 버튼을 표시한다.
FR20: 선택된 취소 대상 행을 3건씩 묶어 GPT-5.5에 전달하고, 각 행에서 6개 항목(1차 원因, 2차 행동, 세부 태그, 타 과정명, 판단 근거, 검토 필요 여부)을 추출한다.
FR21: 기존 카테고리로 설명되지 않는 사유에 대해 GPT-5.5가 신규 카테고리를 자동으로 생성한다.
FR22: 인터뷰 내容·특이사항이 모두 비어있는 행은 자동으로 "정보 부족 — 검토 필요"로 태깅한다.
FR23: GPT API 오류 발생 행은 1.5초 후 1회 재시도하고, 그래도 실패하면 "검토 필요"로 태깅하고 나머지 행의 분류를 계속 진행한다.
FR24: 모든 분류가 완료된 후 GPT-5.5가 전체 결과를 분析하여 인사이트 요약 단락을 생성한다.
FR25: 결과 화면 상단에 요약 바 ("전체 N건 | 검토 필요 M건 | 완료 K건")를 표시한다.
FR26: 분류 결과 테이블에 행별로 1차 원因·2차 행동·세부 태그·타 과정명·판단 근거·검토 필요 여부를 표시한다.
FR27: 검토 필요 행은 노란색 배경, 완료 행은 초록색 배경으로 시각적으로 구분한다.
FR28: 행 클릭 시 오른쪽에 원문(인터뷰 내容·특이사항 전문) 사이드 패널을 표시한다.
FR29: 1차 원因·2차 행동·세부 태그·검토 필요 여부 셀을 클릭하면 인라인으로 수정할 수 있다.
FR30: 인라인 수정 내容은 저장 버튼 없이 자동으로 Supabase에 저장된다.
FR31: 검토 필요를 완료로 변경 시 행 배경이 초록색으로 전환된다.
FR32: 모든 검토 필요 행이 완료 처리됐을 때 "노션 형식 복사" 버튼이 활성화된다.
FR33: "노션 형식 복사" 클릭 시 분류 결과 마크다운 테이블 + 인사이트 요약을 클립보드에 복사하고 "복사되었습니다" 토스트를 표시한다.
FR34: AI가 이번 분류에서 새로 생성한 카테고리 목록을 결과 화면 하단에 표시한다.
FR35: 세션 없이 결과(/result) 또는 분류 중(/analyzing) URL에 직접 접근 시 업로드 화면으로 리다이렉트한다.
FR36: 분류 결과(세션, 행별 분류 결과, 신규 카테고리)를 Supabase PostgreSQL에 영구 저장한다.
FR37: "새 분류 시작" 버튼을 클릭하면 업로드 화면(/upload)으로 이동한다.
FR38: 업로드 화면의 초기 Empty State에서 "①양식 다운로드 → ②데이터 입력 → ③파일 업로드" 3단계 시작 안내를 표시한다.
FR39: 분류 실행 중 화면에서 "분류 취소" 버튼을 제공한다. 취소 시 세션을 취소 상태로 업데이트하고 업로드 화면으로 이동한다.
FR40: 모든 분류 완료 후 결과 화면으로 전환하기 전에 "N건 분류 완료!" 완료 피드백을 1초간 표시한다.
FR41: 분류 완료 후 GPT-5.5가 전체 결과를 분析하여 운영팀을 위한 구체적인 개선 제안을 1~3개 생성한다 (예: "내일배움카드 이슈(41%)가 가장 높습니다. 신청 시점 카드 발급 안내를 강화하세요.").
FR42: 분류 완료 후 Supabase에 이전 기수 완료 세션이 1개 이상 존재하면, 주요 1차 원인 TOP3의 이번 기수 비율과 이전 기수 평균 비율을 비교하여 표시한다. 이전 세션이 없으면 "첫 기수입니다. 다음 기수부터 이전 기수와 비교됩니다." 안내를 표시한다.

### NonFunctional Requirements

NFR1: 50건 기준 분류 완료 시간은 5분 이내여야 한다.
NFR2: GPT API 호출당 서버 타임아웃은 9초로 설정한다.
NFR3: 기수당 OpenAI API 비용은 $0.50 이하여야 한다.
NFR4: 업로드 파일 크기는 최대 10MB로 제한한다.
NFR5: 최대 처리 행 수는 200행으로 제한한다.
NFR6: OpenAI API 키(OPENAI_API_KEY)와 모델명(OPENAI_MODEL)은 서버 전용 환경 변수로만 저장하며 브라우저에 절대 노출하지 않는다.
NFR7: Supabase Service Role Key(SUPABASE_SERVICE_ROLE_KEY)와 URL(SUPABASE_URL)은 서버 전용 환경 변수로만 저장한다.
NFR8: v1 월 인프라 비용은 $0이어야 한다 (Vercel + Supabase 무료 플랜).
NFR9: AI 분류 수정률은 15% 이하를 목표로 한다.
NFR10: 우선 지원 환경은 1280px 이상 노트북 화면이다.
NFR11: TypeScript 엄격 모드(strict: true)를 사용하여 빌드 시 타입 오류를 방지한다.
NFR12: Supabase 무료 플랜 자동 정지(7일 미사용 시)를 방지하기 위해 매일 1회 Vercel Cron Job으로 DB ping을 수행한다.

### Additional Requirements

아키텍처 (TRD) 기반 기술 구현 요구사항:

- **프레임워크**: Next.js 14 App Router, TypeScript (엄격 모드), Tailwind CSS, shadcn/ui, Zod
- **모듈 구조**: upload 모듈(`/app/upload/`), classify 모듈(`/app/analyzing/`), result 모듈(`/app/result/`), shared 모듈(`/shared/`)
- **엑셀 파싱**: SheetJS를 브라우저에서 실행 (파일을 서버에 전송하지 않음)
- **화면 간 상태 전달**: localStorage에 session_id 저장
- **DB 테이블 3개**: sessions, classification_results, new_categories
- **DB 클라이언트**: ORM 없이 @supabase/ssr 직접 사용 (서버 전용)
- **server-only 패키지**: `shared/supabase/server.ts`에 적용하여 브라우저 접근 시 빌드 오류 발생
- **GPT 재시도 로직**: 1.5초 후 1회 재시도, 그래도 실패하면 검토 필요 처리 후 계속 진행
- **공통 API 래퍼**: `lib/api-handler.ts` — 에러 핸들링, Supabase 클라이언트 초기화 공통화 (Epic 1에서 생성)
- **GPT 클라이언트 래퍼**: `lib/gpt-client.ts` — 재시도 로직(p-retry, max 3회, exponential backoff 1s/2s/4s), rate limit 처리 공통화 (Epic 1에서 생성)
- **API 라우트 목록**: `GET /api/ping`, `POST /api/column-analyze`, `POST /api/sessions`, `GET/PATCH /api/sessions/[id]`, `POST /api/classify` (타임아웃 9초, vercel.json `maxDuration` 설정), `POST /api/insight`, `PATCH /api/results/[id]`
- **Vercel 타임아웃**: `/api/classify`에 `vercel.json`의 `maxDuration` 설정 필요 (Pro 플랜 최대 300초). 기본 10초 제한 내 처리 불가 시 배치 크기 조정 고려
- **clipboard API**: `navigator.clipboard.writeText`는 HTTPS 전용. `localhost` 개발 환경에서 실패하므로 `document.execCommand('copy')` fallback 또는 개발 환경 주의사항을 Epic 4 스토리 AC에 명시
- **Cron Job 검증**: `/api/ping` Cron Job은 Epic 3 이후(분류 데이터 존재 시점)에 검증한다
- **정적 엑셀 양식 파일**: `/public/template/취소사유분析기_양식.xlsx`
- **vercel.json**: API 타임아웃 9초 설정, Cron Job 스케줄 설정 포함
- **인증 없음**: v1은 채매니저 단독 사용이므로 로그인 기능 없음
- **Supabase 타입**: `shared/types/database.types.ts` 자동 생성 파일 사용
- **노션 출력**: 브라우저 전용 함수로 처리 (서버 호출 없음, 클립보드 복사)

### UX Design Requirements

디자인 시스템 기반 UI 구현 요구사항:

UX-DR1: Pretendard 폰트를 전체 UI 텍스트에 적용한다 (한글+영어 통합 지원).
UX-DR2: 색상 팔레트를 구현한다 — Canvas White(#FFFFFF), Surface(#F7F7F8), Hairline(#E5E7EB), Ink(#111827), Charcoal(#374151), Slate(#6B7280), Muted(#9CA3AF).
UX-DR3: 상태 색상 시스템을 구현한다 — Teal Green(#10B981, 완료 전용), Amber(#F59E0B, 검토필요 전용), Red(#EF4444, 에러 전용). 각 색상은 지정된 상태에만 사용한다.
UX-DR4: 타이포그래피 스케일을 구현한다 — 24px/600 페이지 제목, 18px/600 섹션 제목, 16px/500 보조 제목, 15px/400 본문, 14px/400 테이블 셀, 13px/400 보조 설명, 12px/500 배지, 14px/500 버튼.
UX-DR5: 업로드 화면 레이아웃을 구현한다 — max-w-2xl 중앙 정렬, 6단계 카드 세로 스택, 이전 단계 완료 시에만 다음 단계 카드 활성화.
UX-DR6: 결과 화면 레이아웃을 구현한다 — max-w-5xl, 요약 바 + 2단(분류 결과 테이블 / 원문 사이드 패널) + 하단(인사이트+신규 카테고리+복사 버튼).
UX-DR7: Pill 버튼 스타일을 구현한다 — Primary(#111827 배경, 흰 텍스트, rounded-full), Secondary(투명 배경, #111827 텍스트, 1px #E5E7EB 테두리), Ghost(투명 배경, #6B7280 텍스트, rounded-md), Danger(투명 배경, #EF4444 텍스트, 1px #EF4444 테두리). 각 화면당 Primary 버튼은 1개만 표시한다.
UX-DR8: 카드 스타일을 구현한다 — 기본(white bg + 1px #E5E7EB border + rounded-xl + p-6), 활성(2px #10B981 border), 비활성(#F7F7F8 bg + opacity-60), 인사이트(#F7F7F8 bg + rounded-lg).
UX-DR9: 프로그레스 바를 구현한다 — 높이 8px, #E5E7EB 배경, #10B981 채움, rounded-full.
UX-DR10: 상태 배지를 구현한다 — 검토 필요(amber 50 bg + amber 600 text), 완료(emerald 50 bg + emerald 600 text), 에러(red 50 bg + red 500 text), 12px/500, rounded-full.
UX-DR11: 결과 테이블 행 색상을 구현한다 — 검토 필요(#FFFBEB 배경 + 왼쪽 4px amber 선), 완료(#F0FDF4 배경 + 왼쪽 4px emerald 선), 기본(흰 배경 + 하단 1px #F0F0F2 구분선).
UX-DR12: 드래그 앤 드롭 업로드 영역을 구현한다 — 점선 테두리(`border-2 border-dashed border-gray-200`), 회색 배경(#F7F7F8), 중앙 아이콘+텍스트.
UX-DR13: 반응형 브레이크포인트를 구현한다 — 모바일(<768px: 사이드 패널 슬라이드업 시트), 태블릿(768~1023px: 클릭 시 패널 표시), 노트북(≥1024px: 2단 분할). 1단계 우선 대상은 노트북.
UX-DR14: 상단 네비게이션 바를 구현한다 — 도구명 + 현재 단계 표시.
UX-DR15: 상태 전환 애니메이션은 fade 150ms만 허용한다. 그 외 애니메이션은 사용하지 않는다.
UX-DR16: 버튼과 클릭 가능한 행의 최소 터치 영역은 44px 이상, 테이블 행 높이는 48px, 테이블 셀 패딩은 `px-4 py-3`으로 유지한다.

### FR Coverage Map

FR1: Epic 2 — 양식 다운로드 버튼
FR2: Epic 2 — 파일 업로드 (드래그앤드롭/클릭)
FR3: Epic 2 — 파일 형식 검증
FR4: Epic 2 — 필수 컬럼 자동 검증
FR5: Epic 2 — 필수 컬럼 없음 에러 처리
FR6: Epic 2 — 컬럼명 변경 감지 안내
FR7: Epic 2 — GPT-5.5 전체 컬럼 자동 분析
FR8: Epic 2 — AI 컬럼 분析 결과 확인 화면
FR9: Epic 2 — 이 내容으로 진행/다시 분析 버튼
FR10: Epic 2 — 최종결과 값 체크박스
FR11: Epic 2 — 취소 대상 건수 실시간 표시
FR12: Epic 2 — 기수명 입력란
FR13: Epic 2 — 분류 실행 버튼 활성화 조건
FR14: Epic 3 — 진행 카운터
FR15: Epic 3 — 프로그레스 바
FR16: Epic 3 — 단계 표시
FR17: Epic 3 — 이탈 경고 팝업
FR18: Epic 3 — 일부 배치 실패 안내
FR19: Epic 3 — 전체 실패 재시도 버튼
FR20: Epic 3 — GPT-5.5 3건씩 분류 (6개 항목 추출)
FR21: Epic 3 — 신규 카테고리 자동 생성
FR22: Epic 3 — 빈 행 자동 태깅 (정보 부족)
FR23: Epic 3 — API 오류 재시도 및 검토 필요 처리
FR24: Epic 3 — 인사이트 요약 생성
FR25: Epic 4 — 요약 바 (전체/검토 필요/완료 건수)
FR26: Epic 4 — 분류 결과 테이블
FR27: Epic 4 — 행 색상 구분 (노란/초록)
FR28: Epic 4 — 원문 사이드 패널
FR29: Epic 4 — 인라인 수정
FR30: Epic 4 — 자동 저장
FR31: Epic 4 — 검토 필요→완료 전환
FR32: Epic 4 — 노션 복사 버튼 활성화 조건
FR33: Epic 4 — 노션 형식 클립보드 복사
FR34: Epic 4 — 신규 카테고리 목록 표시
FR35: Epic 1 — 세션 없는 직접 URL 접근 리다이렉트
FR36: Epic 3 — Supabase 영구 저장
FR37: Epic 4 — 새 분류 시작 버튼
FR38: Epic 2 — 첫 진입 Empty State 온보딩 안내
FR39: Epic 3 — 분류 취소 버튼 및 취소 흐름
FR40: Epic 3 — 분류 완료 피드백 (N건 완료 표시 후 전환)
FR41: Epic 3 — 운영팀 추천 액션 생성 (GPT 1~3개 개선 제안)
FR42: Epic 3 — 이전 기수 대비 TOP3 비율 비교 (이전 데이터 없으면 첫 기수 안내)

## Epic List

### Epic 1: 프로젝트 기반 구축 및 공통 인프라
도구 URL에 접속하면 상단 네비게이션 바가 있는 3개 화면 골격이 정상 표시되며, 세션 없이 결과/분류 중 URL에 직접 접근 시 업로드 화면으로 자동 이동한다. Vercel 배포와 Supabase DB가 연결된 운영 환경, 공통 API 래퍼와 GPT 클라이언트 래퍼가 준비된다.

**FRs covered:** FR35
**NFRs covered:** NFR6, NFR7, NFR8, NFR11, NFR12
**기술 요구사항 covered:** Next.js 14 프로젝트 셋업, TypeScript 엄격 모드, Tailwind/shadcn/ui, Supabase 3개 테이블 + 마이그레이션, 환경 변수, Vercel 배포, `/api/ping` Cron Job, server-only 패키지, `lib/api-handler.ts`, `lib/gpt-client.ts` (retry 전략 포함)
**UX-DRs covered:** UX-DR1 (Pretendard 폰트), UX-DR2 (색상 팔레트), UX-DR3 (상태 색상), UX-DR4 (타이포그래피), UX-DR14 (네비게이션 바)
**구현 노트:** Epic 1 DoD에 마이그레이션 파일 확정 + 시드 데이터 포함 명시. 3개 스토리로 분리: ①프론트 기반(scaffold+디자인 토큰), ②백엔드 기반(Supabase+server-only+공통 래퍼), ③배포 기반(Vercel+nav bar)

---

### Epic 2: 엑셀 업로드 및 AI 컬럼 분析
채매니저가 분析용 엑셀 양식을 다운로드하고, 데이터를 입력한 파일을 업로드하면 양식이 자동으로 검증되고, GPT-5.5가 컬럼을 분析하여 확인 화면을 보여준다. 사용자가 승인 후 취소 대상을 선택하면 분류 실행 버튼이 활성화된다. 첫 방문자를 위한 온보딩 안내가 포함된다.

**FRs covered:** FR1, FR2, FR3, FR4, FR5, FR6, FR7, FR8, FR9, FR10, FR11, FR12, FR13, FR38
**UX-DRs covered:** UX-DR5 (업로드 레이아웃), UX-DR7 (버튼), UX-DR8 (카드), UX-DR12 (드래그앤드롭)
**구현 노트:** Epic 2 DoD는 `upload → column-analyze → session 생성 → /analyzing redirect`가 E2E로 동작하는 것. AI 컬럼 분析 실패 시 재시도는 `lib/gpt-client.ts`의 공통 래퍼 활용.

---

### Epic 3: AI 분류 실행 및 결과 저장
채매니저가 분류 실행을 누르면 GPT-5.5가 3건씩 취소 사유를 분류하고, 진행 상황과 단계를 실시간으로 확인할 수 있으며, 취소하거나 오류가 발생해도 안전하게 처리된다. 완료된 분류 결과와 인사이트 요약이 Supabase에 저장되고, 완료 피드백 후 결과 화면으로 전환된다.

**FRs covered:** FR14, FR15, FR16, FR17, FR18, FR19, FR20, FR21, FR22, FR23, FR24, FR36, FR39, FR40, FR41, FR42
**NFRs covered:** NFR1 (5분/50건), NFR2 (9초 타임아웃), NFR3 ($0.50 비용), NFR4 (10MB), NFR5 (200행)
**UX-DRs covered:** UX-DR9 (프로그레스 바), UX-DR15 (fade 애니메이션)
**구현 노트:** `/api/classify` 스토리 AC에 retry 정책(p-retry, max 3회, exponential backoff 1s/2s/4s)과 `vercel.json` `maxDuration` 설정 명시. 응답 지연 시 "GPT 서버 응답 대기 중..." 안내 메시지 추가. Cron Job 검증은 이 에픽 완료 후 수행.

---

### Epic 4: 분류 결과 검토 및 노션 출력
채매니저가 분류 결과 전체를 한눈에 확인하고, 검토 필요 항목을 인라인으로 수정하여 완료 처리한 후, 분류 결과 테이블과 인사이트 요약을 노션 마크다운 형식으로 클립보드에 복사하여 팀에 공유할 수 있다. 복사 완료 후 명확한 다음 행동 경로를 안내한다.

**FRs covered:** FR25, FR26, FR27, FR28, FR29, FR30, FR31, FR32, FR33, FR34, FR37
**NFRs covered:** NFR9 (수정률 15% 이하), NFR10 (1280px+ 노트북)
**UX-DRs covered:** UX-DR6 (결과 레이아웃), UX-DR7 (버튼), UX-DR8 (카드), UX-DR10 (상태 배지), UX-DR11 (테이블 행 색상), UX-DR13 (반응형), UX-DR16 (터치 영역)
**구현 노트:** `navigator.clipboard.writeText`는 HTTPS 전용. localhost 개발 환경에서 `document.execCommand('copy')` fallback 또는 조건부 처리 필요. 스토리 AC에 명시.

---

## Epic 1: 프로젝트 기반 구축 및 공통 인프라

도구 URL에 접속하면 상단 네비게이션 바가 있는 3개 화면 골격이 정상 표시되며, 세션 없이 결과/분류 중 URL에 직접 접근 시 업로드 화면으로 자동 이동한다. Vercel 배포와 Supabase DB가 연결된 운영 환경, 공통 API 래퍼와 GPT 클라이언트 래퍼가 준비된다.

### Story 1.1: 프론트엔드 기반 및 디자인 토큰 구축

개발자로서,
Next.js 14 App Router + TypeScript(엄격 모드) + Tailwind CSS + shadcn/ui + Pretendard 폰트와 디자인 토큰이 구성된 프로젝트를 갖고 싶다,
그래야 모든 UI 컴포넌트를 일관된 디자인 시스템 위에서 개발할 수 있다.

**Acceptance Criteria:**

**Given** Next.js 14 App Router 프로젝트가 TypeScript 엄격 모드(`"strict": true`)로 스캐폴딩되어 있다
**When** `npm run build`를 실행한다
**Then** 빌드가 TypeScript 에러 없이 성공한다

**Given** Tailwind CSS에 커스텀 색상 토큰이 설정되어 있다
**When** 컴포넌트에서 `bg-ink`, `bg-surface`, `border-hairline`, 상태 색상 클래스를 사용한다
**Then** 각각 `#111827`, `#F7F7F8`, `#E5E7EB`, 완료(`#10B981`), 검토필요(`#F59E0B`), 에러(`#EF4444`)로 렌더링된다 (UX-DR2, UX-DR3)

**Given** Pretendard 폰트가 설정되어 있다
**When** 어떤 페이지를 렌더링한다
**Then** 모든 텍스트 요소의 font-family가 Pretendard (한글+영문 통합)이다 (UX-DR1)

**Given** 타이포그래피 스케일이 Tailwind 설정에 있다
**When** 컴포넌트에서 타이포그래피 유틸리티 클래스를 사용한다
**Then** 페이지 제목 24px/600, 섹션 제목 18px/600, 본문 15px/400, 테이블 셀 14px/400, 배지 12px/500이 적용된다 (UX-DR4)

**Given** shadcn/ui 기본 컴포넌트(Button, Card, Badge, Checkbox, Progress, Toast)가 설치되어 있다
**When** 각 컴포넌트를 import해 렌더링한다
**Then** 컴파일 에러 없이 화면에 표시된다

---

### Story 1.2: 백엔드 기반 및 공통 래퍼 구축

개발자로서,
Supabase DB 테이블, server-only 클라이언트, 공통 API 핸들러, GPT 클라이언트 래퍼가 갖춰진 환경을 갖고 싶다,
그래야 모든 API 라우트가 코드 중복 없이 안전하게 DB와 GPT에 접근할 수 있다.

**Acceptance Criteria:**

**Given** `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`, `OPENAI_MODEL` 환경 변수가 `.env.local`에 설정되어 있다
**When** `shared/supabase/server.ts`를 브라우저 컴포넌트에서 import한다
**Then** `server-only` 패키지로 인해 빌드가 실패하고 에러가 발생한다 (NFR6, NFR7)

**Given** Supabase 마이그레이션이 적용되어 있다
**When** `sessions`, `classification_results`, `new_categories` 테이블을 조회한다
**Then** 세 테이블이 모두 존재하고 PRD 데이터 구조(UUID PK, timestamptz, 필수 컬럼)와 일치한다

**Given** `lib/api-handler.ts` 공통 래퍼가 구현되어 있다
**When** API 라우트 처리 중 예외가 발생한다
**Then** 응답이 일관된 형식(`{ error: string }`)과 적절한 HTTP 상태 코드로 반환된다

**Given** `lib/gpt-client.ts`에 p-retry 기반 재시도 로직이 구현되어 있다
**When** GPT API 호출이 연속으로 실패한다
**Then** 최대 3회(1초, 2초, 4초 exponential backoff)를 재시도하고, 그래도 실패하면 에러를 throw한다

**Given** `npm run build`를 실행해 클라이언트 번들을 생성한다
**When** 번들 파일 내용을 검사한다
**Then** `OPENAI_API_KEY` 또는 `SUPABASE_SERVICE_ROLE_KEY` 문자열이 클라이언트 번들에 포함되지 않는다 (NFR6, NFR7, NFR11)

---

### Story 1.3: Vercel 배포, 네비게이션 바, 화면 골격 및 세션 가드

채매니저로서,
도구 URL에 접속하면 네비게이션 바와 함께 업로드 화면이 표시되고, 잘못된 URL로 직접 접근해도 올바른 화면으로 안내받고 싶다,
그래야 도구를 혼선 없이 사용할 수 있다.

**Acceptance Criteria:**

**Given** GitHub main 브랜치에 코드를 push한다
**When** Vercel 대시보드를 확인한다
**Then** 자동 배포가 완료되고 `.vercel.app` URL로 도구에 접속 가능하다 (NFR8)

**Given** 어떤 페이지든 로드한다
**When** 화면 상단을 확인한다
**Then** 도구명 "취소사유분析기"와 현재 단계 표시가 있는 네비게이션 바가 표시된다 (UX-DR14)

**Given** `/analyzing` 페이지에 `localStorage`에 `session_id`가 없는 상태로 직접 접근한다
**When** 페이지가 로드된다
**Then** `/upload`로 즉시 리다이렉트되고 "먼저 파일을 업로드해 주세요" 안내 토스트가 표시된다 (FR35)

**Given** `/result` 페이지에 `localStorage`에 `session_id`가 없는 상태로 직접 접근한다
**When** 페이지가 로드된다
**Then** `/upload`로 즉시 리다이렉트되고 같은 안내 토스트가 표시된다 (FR35)

**Given** `vercel.json`에 Cron Job이 설정되어 있다 (매일 1회, path: `/api/ping`)
**When** Cron이 실행된다
**Then** `GET /api/ping`이 200을 반환하고 Supabase에 경량 쿼리를 수행한다 (NFR12)

---

## Epic 2: 엑셀 업로드 및 AI 컬럼 분析

채매니저가 분析용 엑셀 양식을 다운로드하고, 데이터를 입력한 파일을 업로드하면 양식이 자동으로 검증되고, GPT-5.5가 컬럼을 분析하여 확인 화면을 보여준다. 사용자가 승인 후 취소 대상을 선택하면 분류 실행 버튼이 활성화된다. 첫 방문자를 위한 온보딩 안내가 포함된다.

### Story 2.1: 양식 다운로드 및 파일 업로드 UI

채매니저로서,
분析용 엑셀 양식을 다운로드하고 데이터를 채운 파일을 드래그앤드롭 또는 클릭으로 업로드할 수 있고 싶다,
그래야 어떻게 시작해야 하는지 즉시 알고 파일을 빠르게 제출할 수 있다.

**Acceptance Criteria:**

**Given** 채매니저가 `/upload` 화면을 처음 방문한다 (파일 없는 초기 상태)
**When** 화면을 확인한다
**Then** "①양식 다운로드 → ②데이터 입력 → ③파일 업로드" 3단계 온보딩 안내가 Empty State로 표시된다 (FR38, UX-DR5)

**Given** "분析용 엑셀 양식 다운로드" 버튼이 화면 상단에 항상 표시된다 (FR1)
**When** 버튼을 클릭한다
**Then** `/public/template/취소사유분析기_양식.xlsx` 파일이 다운로드된다

**Given** 드래그앤드롭 영역이 표시된다 (UX-DR12)
**When** xlsx 또는 xls 파일을 영역에 드래그하여 드롭한다
**Then** 파일명과 총 행 수가 표시된다 (예: "취소자_3기.xlsx | 총 52행") (FR2)

**Given** 파일 업로드 영역을 클릭한다
**When** 파일 선택 다이얼로그에서 xlsx/xls 파일을 선택한다
**Then** 동일하게 파일명과 총 행 수가 표시된다 (FR2)

**Given** xlsx/xls 외 형식(예: .csv, .pdf)의 파일을 업로드한다
**When** 파일이 선택된다
**Then** "xlsx 또는 xls 파일만 업로드할 수 있습니다" 에러 메시지가 표시되고 파일은 거부된다 (FR3)

---

### Story 2.2: 양식 자동 검증

채매니저로서,
파일을 업로드하면 필수 컬럼이 있는지 자동으로 확인하고, 문제가 있으면 구체적인 안내를 받고 싶다,
그래야 잘못된 파일로 분류를 시작하는 실수를 방지할 수 있다.

**Acceptance Criteria:**

**Given** 필수 컬럼(인터뷰내용, 특이사항, 최종결과)이 모두 있는 파일을 업로드한다
**When** 양식 검증이 파일 업로드 직후 자동으로 실행된다
**Then** "양식 확인 완료. AI 컬럼 분析을 시작합니다" 메시지가 표시되고 자동으로 AI 분析 단계로 진행한다 (FR4)

**Given** 필수 컬럼 중 하나(예: "인터뷰내용")가 없는 파일을 업로드한다
**When** 양식 검증이 실행된다
**Then** "필수 컬럼 '인터뷰내용'이 없습니다. 분析용 양식을 먼저 다운로드해 사용해 주세요" 에러 메시지, 양식 다운로드 버튼이 표시되고, 분류 실행 버튼은 비활성화된다 (FR5)

**Given** 필수 컬럼명이 유사하게 변경된 파일(예: "인터뷰내용" → "면담내용")을 업로드한다
**When** 양식 검증이 실행된다
**Then** "'인터뷰내용' 컬럼이 없습니다. '면담내용' 컬럼이 비슷합니다. 양식을 수정하거나 다시 확인해 주세요" 안내 메시지가 표시되고 분류 실행 버튼은 비활성화된다 (FR6)

---

### Story 2.3: GPT-5.5 전체 컬럼 분析 및 확인 화면

채매니저로서,
GPT가 내 파일의 컬럼을 어떻게 이해했는지 확인하고 승인한 후에만 분류가 시작되도록 하고 싶다,
그래야 AI가 잘못된 컬럼을 기준으로 분류하는 사태를 막을 수 있다.

**Acceptance Criteria:**

**Given** 양식 검증을 통과한 파일이 있다
**When** GPT-5.5 컬럼 분析이 자동 실행된다 (FR7)
**Then** "AI가 파일을 분析하고 있습니다..." 로딩 표시가 나타난다

**Given** GPT-5.5 컬럼 분析이 완료된다
**When** 확인 화면이 표시된다 (FR8)
**Then** 각 컬럼명과 AI의 이해 내용이 표 형식으로 표시된다 (예: "인터뷰내용 → 면담 내용으로 이해했습니다")

**Given** 확인 화면이 표시된다
**When** "이 내용으로 진행" 버튼을 클릭한다
**Then** 다음 단계(취소 대상 선택 카드)가 활성화된다 (FR9)

**Given** 확인 화면이 표시된다
**When** "다시 분析" 버튼을 클릭한다
**Then** GPT 컬럼 분析이 다시 실행되고 확인 화면이 새 결과로 갱신된다 (FR9)

**Given** GPT 컬럼 분析 중 API 오류가 `lib/gpt-client.ts`의 재시도 소진 후에도 지속된다
**When** 오류가 발생한다
**Then** "AI 분析 중 오류가 발생했습니다. 다시 시도해 주세요" 메시지와 재시도 버튼이 표시된다

---

### Story 2.4: 취소 대상 선택 및 분류 실행 트리거

채매니저로서,
최종결과 컬럼의 값 목록에서 취소 관련 항목을 선택하면 분류 대상 건수가 실시간으로 표시되고 분류 실행 버튼이 활성화되길 원한다,
그래야 합격·보류 같은 불필요한 행을 제외하고 정확한 건수만 분류할 수 있다.

**Acceptance Criteria:**

**Given** AI 컬럼 분析 승인 후 최종결과 컬럼의 값 목록이 체크박스로 표시된다 (FR10)
**When** 취소 관련 값(예: "취소", "취소처리", "환불")을 체크한다
**Then** "분류 대상 N건"이 실시간으로 갱신된다 (FR11)

**Given** 기수명 입력란이 표시된다 (FR12)
**When** 기수명을 입력한다
**Then** 입력한 기수명이 결과 화면 상단에 표시된다

**Given** 취소 대상이 1건 이상 선택된다
**When** 선택 상태를 확인한다
**Then** "분류 실행" 버튼(Primary, rounded-full)이 활성화된다 (FR13, UX-DR7)

**Given** 아무 항목도 선택하지 않는다
**When** 선택 상태를 확인한다
**Then** "분류 실행" 버튼이 비활성화되고 "취소 관련 항목을 하나 이상 선택해 주세요" 안내가 표시된다 (FR13)

**Given** "분류 실행" 버튼이 활성화된 상태에서 버튼을 클릭한다
**When** `POST /api/sessions` 요청이 성공하고 `session_id`가 반환된다
**Then** `session_id`가 `localStorage`에 저장되고 `/analyzing` 페이지로 이동한다

---

## Epic 3: AI 분류 실행 및 결과 저장

채매니저가 분류 실행을 누르면 GPT-5.5가 3건씩 취소 사유를 분류하고, 진행 상황과 단계를 실시간으로 확인할 수 있으며, 취소하거나 오류가 발생해도 안전하게 처리된다. 완료된 분류 결과와 인사이트 요약이 Supabase에 저장되고, 완료 피드백 후 결과 화면으로 전환된다.

### Story 3.1: 분류 실행 중 화면 및 진행 표시

채매니저로서,
분류가 진행되는 동안 몇 건이 완료됐는지 실시간으로 확인하고, 실수로 페이지를 벗어나려 할 때 경고를 받고 싶다,
그래야 분류 중 불안감 없이 화면을 지켜볼 수 있다.

**Acceptance Criteria:**

**Given** `/analyzing` 페이지에 유효한 `session_id`로 진입한다
**When** 화면을 확인한다
**Then** 현재 단계("취소 사유 분류 중"), 진행 카운터("0건 완료 / N건 전체"), 프로그레스 바(높이 8px, #E5E7EB 배경, #10B981 채움, rounded-full)가 표시된다 (FR14, FR15, FR16, UX-DR9)

**Given** 분류가 3건씩 처리되며 진행된다
**When** 각 배치가 완료된다
**Then** 진행 카운터와 프로그레스 바가 실시간으로 갱신된다 (FR14, FR15)

**Given** 인사이트 요약 생성 단계에 진입한다
**When** 화면을 확인한다
**Then** 단계 표시가 "인사이트 요약 생성 중"으로 변경된다 (FR16)

**Given** 분류가 진행 중이다
**When** 채매니저가 다른 탭으로 이동하거나 브라우저를 닫으려 한다
**Then** "분류가 진행 중입니다. 지금 이탈하면 분류가 중断됩니다. 계속 진행하시겠습니까?" 경고 팝업이 표시된다 (FR17)

**Given** 특정 배치(3건) 분류가 실패한다
**When** 해당 배치를 처리하는 중이다
**Then** "N건 검토 필요로 처리됨, 계속 진행 중" 안내가 화면에 표시되고 나머지 배치 처리는 계속된다 (FR18)

**Given** 분류 응답이 9초 이상 지연된다
**When** 타임아웃 임박 상태이다
**Then** "GPT 서버 응답 대기 중입니다. 잠시만 기다려 주세요." 안내 메시지가 표시된다

**Given** 전체 분류가 실패한다
**When** 모든 배치 처리에 실패한다
**Then** "분류를 완료하지 못했습니다. 다시 시도해 주세요" 메시지, 재시도 버튼, 업로드 화면으로 돌아가기 버튼이 표시된다 (FR19)

---

### Story 3.2: GPT-5.5 분류 엔진

채매니저로서,
취소 대상 행이 자동으로 3건씩 분류되어 1차 원인·2차 행동·세부 태그 등 6개 항목이 추출되고, 빈 행은 자동 처리되길 원한다,
그래야 40~60건을 5분 안에 일괄 분류할 수 있다.

**Acceptance Criteria:**

**Given** 취소 대상 행이 있고 분류 실행이 시작됐다
**When** `POST /api/classify` 요청이 전송된다
**Then** 3건씩 묶여 처리되며, 각 행에 대해 1차 원인·2차 행동·세부 태그·타 과정명·판단 근거·검토 필요 여부 6개 항목이 JSON 형식으로 반환된다 (FR20)

**Given** GPT-5.5가 기존 카테고리로 설명할 수 없는 취소 사유를 만난다
**When** 분류 결과를 반환한다
**Then** `new_categories` 테이블에 신규 카테고리명과 발생 건수가 저장된다 (FR21)

**Given** 인터뷰내용과 특이사항 컬럼이 모두 비어있는 행이 있다
**When** 해당 행을 처리한다
**Then** 해당 행은 `needs_review: true`, 1차 원인 "정보 부족"으로 자동 태깅되고 다음 행으로 진행한다 (FR22)

**Given** GPT API 호출이 실패한다
**When** `lib/gpt-client.ts`가 최대 3회(1초, 2초, 4초) 재시도 후에도 실패한다
**Then** 해당 배치 3건이 `needs_review: true`로 저장되고 다음 배치 처리가 계속된다 (FR23, NFR2)

**Given** 50건 분류를 실행한다
**When** 전체 분류가 완료된다
**Then** 완료 시간이 5분 이내이다 (NFR1)

**Given** 파일 크기가 10MB를 초과하거나 행 수가 200행을 초과한다
**When** 분류 실행을 시도한다
**Then** "파일 크기(또는 행 수) 제한을 초과했습니다" 안내 메시지가 표시되고 분류가 시작되지 않는다 (NFR4, NFR5)

**Given** `vercel.json`에 `/api/classify`의 `maxDuration`이 설정되어 있다
**When** 빌드 및 배포가 완료된다
**Then** `/api/classify` 함수가 설정된 최대 실행 시간 내에서 동작한다 (NFR2)

---

### Story 3.3: 인사이트 요약, 추천 액션, 기수 비교 생성 및 결과 저장

채매니저로서,
모든 분류가 완료되면 GPT가 전체 결과를 분析해 인사이트 요약·운영 추천 액션·이전 기수 비교를 생성하고, 결과가 DB에 영구 저장되길 원한다,
그래야 나중에 결과를 다시 확인하거나 팀에 데이터 기반으로 공유할 수 있다.

**Acceptance Criteria:**

**Given** 모든 행 분류가 완료된다
**When** `POST /api/insight` 요청이 자동으로 전송된다
**Then** GPT-5.5가 전체 분류 결과를 분析하여 주요 패턴을 한 단락으로 요약한 텍스트를 반환한다 (FR24)

**Given** 분류 결과에 상위 취소 사유 패턴이 있다
**When** `POST /api/insight` 응답을 확인한다
**Then** 운영팀을 위한 구체적인 개선 제안 1~3개가 포함된다 (FR41)
**And** 각 제안은 "원인(비율) + 구체적 액션" 형식이다 (예: "내일배움카드 이슈(41%)가 가장 높습니다. 신청 시점 카드 발급 현황 안내를 강화하세요.")

**Given** Supabase에 이전 기수의 `completed` 세션이 1개 이상 존재한다
**When** `POST /api/insight`를 호출한다
**Then** 이번 기수 1차 원인 TOP3의 비율과 이전 기수들의 평균 비율이 비교되어 반환된다 (FR42)
**And** 결과 화면에 "이번 기수 내일배움카드 이슈 41% → 이전 평균 28% (+13%p)" 형태로 표시된다

**Given** Supabase에 이전 기수 세션이 없다 (첫 번째 기수)
**When** `POST /api/insight`를 호출한다
**Then** 기수 비교 대신 "첫 기수입니다. 다음 기수부터 이전 기수와 비교됩니다." 안내가 반환된다 (FR42)

**Given** 인사이트·추천 액션·기수 비교가 생성됐다
**When** `sessions` 테이블을 조회한다
**Then** 해당 세션의 `insight_summary` 컬럼에 전체 내용(요약 + 추천 액션 + 기수 비교)이 JSON 형식으로 저장되어 있다 (FR36)

**Given** 분류 실행이 완료됐다
**When** Supabase를 조회한다
**Then** 모든 처리된 행의 분류 결과가 `classification_results` 테이블에, 신규 카테고리가 `new_categories` 테이블에 저장되어 있다 (FR36)

**Given** 세션의 모든 처리가 완료됐다
**When** `sessions` 테이블의 해당 세션을 조회한다
**Then** `status` 컬럼이 `completed`로 업데이트되어 있다 (FR36)

**Given** 테스트용 이전 기수 완료 세션 데이터를 Supabase에 시드(seed)한다
**When** `POST /api/insight`를 호출한다
**Then** 기수 비교 결과(TOP3 원인별 이번 기수 % vs 이전 평균 %)가 정상적으로 반환된다 (FR42 검증용)

---

### Story 3.4: 분류 취소 및 완료 피드백

채매니저로서,
분류 도중 잘못 시작했다고 깨달으면 취소할 수 있고, 분류가 완료됐을 때 명확한 완료 신호를 받고 싶다,
그래야 실수를 바로잡을 수 있고 결과 화면으로 자신 있게 넘어갈 수 있다.

**Acceptance Criteria:**

**Given** 분류가 진행 중이다
**When** "분류 취소" 버튼을 클릭한다
**Then** "분류를 취소하시겠습니까? 지금까지의 결과는 저장되지 않습니다." 확인 팝업이 표시된다 (FR39)

**Given** 취소 확인 팝업에서 "취소 확인"을 클릭한다
**When** 취소가 처리된다
**Then** 해당 세션이 `cancelled` 상태로 업데이트되고 `/upload` 화면으로 이동한다 (FR39)

**Given** 모든 분류와 인사이트 요약이 완료된다
**When** 완료 상태가 감지된다
**Then** "N건 분류 완료!" 메시지가 1초간 표시된 후 fade 전환(150ms)으로 `/result` 페이지로 이동한다 (FR40, UX-DR15)

**Given** `/result` 페이지로 이동했다
**When** 화면이 로드된다
**Then** 분류 결과 데이터가 Supabase에서 정상적으로 로드된다 (FR36)

---

## Epic 4: 분류 결과 검토 및 노션 출력

채매니저가 분류 결과 전체를 한눈에 확인하고, 검토 필요 항목을 인라인으로 수정하여 완료 처리한 후, 분류 결과 테이블과 인사이트 요약을 노션 마크다운 형식으로 클립보드에 복사하여 팀에 공유할 수 있다. 복사 완료 후 명확한 다음 행동 경로를 안내한다.

### Story 4.1: 분류 결과 테이블 및 요약 바

채매니저로서,
분류 결과 전체를 검토 필요·완료 상태별로 구분된 테이블로 한눈에 확인하고 싶다,
그래야 어떤 건을 먼저 검토해야 하는지 즉시 파악할 수 있다.

**Acceptance Criteria:**

**Given** `/result` 페이지에 진입한다
**When** 화면 상단을 확인한다
**Then** "전체 N건 | 검토 필요 M건 | 완료 K건" 요약 바가 표시된다 (FR25, UX-DR6)

**Given** 결과 화면이 로드된다
**When** 테이블을 확인한다
**Then** 각 행에 행번호·인터뷰 내용(요약)·1차 원인·2차 행동·세부 태그·타 과정명·판단 근거·검토 필요 여부가 표시된다 (FR26)

**Given** `needs_review: true`인 행이 있다
**When** 테이블을 확인한다
**Then** 해당 행은 #FFFBEB 배경 + 왼쪽 4px amber 선으로 표시되고 "검토 필요" 배지(amber 50 bg + amber 600 text, 12px/500)가 표시된다 (FR27, UX-DR10, UX-DR11)

**Given** `needs_review: false`(완료)인 행이 있다
**When** 테이블을 확인한다
**Then** 해당 행은 #F0FDF4 배경 + 왼쪽 4px emerald 선으로 표시되고 "완료" 배지(emerald 50 bg + emerald 600 text)가 표시된다 (FR27, UX-DR10, UX-DR11)

**Given** 테이블 행의 크기를 측정한다
**When** 각 행을 확인한다
**Then** 행 높이가 48px이고 셀 패딩이 `px-4 py-3`이다 (UX-DR16)

---

### Story 4.2: 행 클릭 원문 패널 및 인라인 수정

채매니저로서,
검토 필요 행을 클릭하면 원문 전체를 볼 수 있고, 분류 항목을 셀에서 직접 수정하면 자동으로 저장되길 원한다,
그래야 원문을 보면서 분류를 교정하고 별도 저장 없이 계속 작업할 수 있다.

**Acceptance Criteria:**

**Given** 결과 테이블에서 행을 클릭한다
**When** 사이드 패널이 열린다
**Then** 해당 행의 인터뷰 내용 전문과 특이사항 전문이 오른쪽 사이드 패널에 표시된다 (FR28, UX-DR6)

**Given** 행의 1차 원인, 2차 행동, 세부 태그 셀을 클릭한다
**When** 셀이 편집 모드로 전환된다
**Then** 텍스트를 직접 수정할 수 있다 (FR29)

**Given** 셀 내용을 수정한다
**When** 포커스가 셀 밖으로 이동한다
**Then** `PATCH /api/results/[id]` 요청이 자동으로 전송되어 Supabase에 저장되며 저장 버튼을 누를 필요가 없다 (FR30)

**Given** 네트워크 오류로 자동 저장이 실패한다
**When** 저장 요청이 실패한다
**Then** "수정 내용을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요" 토스트 메시지가 표시된다 (FR30)

**Given** "검토 필요" 상태인 행에서 검토 필요 여부를 "완료"로 변경한다
**When** 변경이 저장된다
**Then** 행 배경이 #F0FDF4(초록)으로 전환되고 "완료" 배지로 변경되며, 상단 요약 바의 검토 필요/완료 건수가 갱신된다 (FR31, FR25)

---

### Story 4.3: 노션 형식 복사 및 인사이트·신규 카테고리 표시

채매니저로서,
모든 검토 필요 항목을 완료 처리한 후 분류 결과와 인사이트 요약을 노션에 바로 붙여넣을 수 있는 마크다운으로 복사하고 싶다,
그래야 별도 포맷 작업 없이 팀 문서에 공유할 수 있다.

**Acceptance Criteria:**

**Given** 검토 필요 행이 1건 이상 남아있다
**When** 결과 화면을 확인한다
**Then** "노션 형식 복사" 버튼이 비활성화 상태(#E5E7EB 배경 + #9CA3AF 텍스트)로 표시된다 (FR32, UX-DR7)

**Given** 모든 검토 필요 행이 완료 처리됐다
**When** 마지막 행이 완료로 전환된다
**Then** "노션 형식 복사" 버튼이 Primary 활성 스타일(#111827 배경)로 전환된다 (FR32, UX-DR7)

**Given** "노션 형식 복사" 버튼을 HTTPS 환경에서 클릭한다
**When** 클립보드 복사가 실행된다
**Then** 분류 결과 마크다운 테이블(1차 원인·2차 행동·세부 태그·검토 여부 포함)과 인사이트 요약 단락이 클립보드에 복사되고, "복사되었습니다" 토스트 메시지가 표시된다 (FR33)

**Given** `localhost` 개발 환경(HTTP)에서 복사 버튼을 클릭한다
**When** `navigator.clipboard.writeText`가 실패한다
**Then** `document.execCommand('copy')` fallback이 실행되거나 "HTTPS 환경에서만 복사가 지원됩니다" 안내가 표시된다

**Given** 결과 화면 하단을 확인한다
**When** AI가 신규 카테고리를 생성했다
**Then** "이번 분류에서 새로 만들어진 카테고리: OOO (3건), XXX (1건)" 형태로 신규 카테고리 목록이 표시된다 (FR34)

**Given** 결과 화면의 인사이트 영역을 확인한다
**When** 화면이 로드된다
**Then** 인사이트 카드(#F7F7F8 배경, rounded-lg) 안에 아래 세 섹션이 "참고용" 안내 문구와 함께 표시된다 (FR24, FR41, FR42, UX-DR8)
**And** 섹션 1 — 인사이트 요약: 주요 패턴 한 단락
**And** 섹션 2 — 운영 추천 액션: 번호 목록(1~3개), 각각 "원인(비율) + 액션" 형식
**And** 섹션 3 — 이전 기수 비교: TOP3 원인별 이번 기수 % vs 이전 평균 % (이전 데이터 없으면 첫 기수 안내 문구)

---

### Story 4.4: 새 분류 시작 및 반응형 레이아웃

채매니저로서,
다음 기수 데이터를 바로 분류하러 돌아갈 수 있고, 다양한 화면 크기에서도 결과 테이블을 편리하게 볼 수 있길 원한다,
그래야 반복 업무를 끊김 없이 처리할 수 있다.

**Acceptance Criteria:**

**Given** 결과 화면에서 "새 분류 시작" 버튼을 클릭한다
**When** 버튼이 클릭된다
**Then** `localStorage`의 `session_id`가 초기화되고 `/upload` 화면으로 이동한다 (FR37)

**Given** 노션 형식 복사가 완료된다
**When** 복사 성공 토스트가 표시된다
**Then** "새 분류 시작" 버튼이 시각적으로 강조되어 다음 행동을 유도한다 (FR37)

**Given** 노트북 화면(≥1024px)에서 결과 화면을 본다
**When** 행을 클릭해 사이드 패널을 연다
**Then** 분류 결과 테이블과 원문 사이드 패널이 좌우 2단으로 나란히 표시된다 (UX-DR6, UX-DR13, NFR10)

**Given** 태블릿 화면(768~1023px)에서 결과 화면을 본다
**When** 행을 클릭한다
**Then** 사이드 패널이 오버레이 또는 하단 슬라이드로 표시된다 (UX-DR13)

**Given** 결과 화면의 버튼과 클릭 가능한 행의 크기를 측정한다
**When** 인터랙티브 요소를 확인한다
**Then** 모든 요소의 최소 높이가 44px 이상이다 (UX-DR16)
