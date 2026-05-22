# 취소사유분석기 PRD — AI 입력용 핸드오프 팩

> 본문: `prd-취소사유분석기-20260519.md`
> 사용처: trd-writer 입력, Claude Code 시스템 프롬프트, 외주 RFP 상세 첨부
> 성격: 정밀 데이터 카탈로그. 처음부터 끝까지 읽는 용도가 아니다. 필요한 섹션을 부분 참조한다.
> **버전**: v1.1 (FRD 작성 후 실데이터 검토 반영 — 2026-05-19)
> **v1.0 → v1.1 변경 요약**: ①합격자 제외 로직 변경(빈 행→체크박스 미선택 행) ②필수 컬럼 2→3개(최종결과 추가) ③분류 실행 버튼 활성 조건 수정 ④DB sessions 테이블 컬럼 추가 ⑤column_mappings mapping_config 키 변경 ⑥GPT 분류 프롬프트 수정 ⑦컬럼 감지 프롬프트 수정

---

## 1. 잠긴 결정 (Locked Decisions)

- **플랫폼**: Next.js 14 App Router
- **AI 엔진**: OpenAI GPT-5.5 — 모델명: gpt-5.5-2026-04-23 (response_format: json_object 강제)
- **저장소**: Supabase (PostgreSQL) 무료 플랜
- **파일 파싱**: SheetJS (xlsx)
- **차트**: Recharts
- **호스팅**: Vercel 무료 플랜
- **자격증명 저장**: Vercel 환경 변수 (OPENAI_API_KEY, SUPABASE_URL, SUPABASE_ANON_KEY)
- **인증 방식**: 없음 (v1 채매니저 단독 사용. 토큰 링크는 v2)
- **GPT-5.5 호출 방식**: 3건씩 묶음, 클라이언트 순차 요청
- **분석 대상 선택**: 최종결과 컬럼의 고유 값 체크박스로 채매니저가 직접 선택. 미선택 행 전체 자동 제외 (구 "빈 행 제외" 로직 대체) ⬅ v1.1 수정
- **프롬프트 관리**: 코드 하드코딩
- **결과 보관**: Supabase 무제한 영구 저장
- **필수 기능**: F-001 ~ F-036 중 필수 분류 기능 (총 28개)
- **선택 기능**: F-006, F-025, F-034 (총 3개)
- **후순위 기능**: F-009, F-016, F-037, F-038, F-039, F-040 (총 6개, 토큰 링크 관련 F-037~F-039 포함)

---

## 2. 기능 카탈로그 (전체 ID)

### 2.1 업로드 화면 (S-001: /upload)

| ID | 기능명 | 분류 | 화면 | 왜 필요 | Empty | Loading | Error |
|---|---|---|---|---|---|---|---|
| F-001 | 엑셀 파일 업로드 (드래그앤드롭+클릭) | 필수 | S-001 | 도구 시작점 | "파일을 여기 끌어다 놓거나 클릭하세요" | 파일 파싱 스피너 | "xlsx/xls 파일만 지원합니다" |
| F-002 | 파일명 + 총 행 수 표시 | 필수 | S-001 | 올바른 파일인지 육안 확인 | 업로드 전 미표시 | — | — |
| F-003 | 기수명 텍스트 입력 필드 | 필수 | S-001 | 대시보드 상단 기수 식별 | 공란 허용 ("기수명 미입력"으로 표시) | — | — |
| F-004 | 컬럼 드롭다운 수동 지정 | 필수 | S-001 | 프리셋 없거나 컬럼 변경 시 | 드롭다운 공란 | — | "컬럼을 지정하지 않으면 분류를 실행할 수 없습니다" |
| F-005 | 매핑 프리셋 저장 + 불러오기 | 필수 | S-001 | 반복 매핑 제거. "15분 결과" 직결 | 프리셋 없음 안내 | — | 저장 실패 시 재시도 안내 |
| F-006 | GPT-5.5 컬럼 자동 감지 버튼 | 선택 | S-001 | 컬럼명 모호할 때 AI 추정 | — | "컬럼 감지 중..." | "자동 감지 실패. 직접 지정해 주세요" |
| F-007 | 지원 파일 형식 안내 | 필수 | S-001 | 잘못된 파일 업로드 사전 차단 | 항상 표시 | — | — |
| F-008 | 분석 대상 행 선택 + 제외 건수 표시 | 필수 | S-001 | 합격자·진행중 행을 취소 건과 분리. 최종결과 값 체크박스로 선택된 행만 분류 대상. 인터뷰·특이사항 둘 다 빈 행은 GPT 전송 제외 후 needs_review=true 자동 처리 ⬅ v1.1 수정 | — | — | — |
| F-009 | 200행 초과 안내 | 후순위 | S-001 | Vercel 메모리 한도 대응 | — | — | "최대 200행 지원. N행 초과됨" |
| F-010 | 분류 실행 버튼 | 필수 | S-001 | 다음 단계 트리거 | 필수 3개 컬럼 미매핑 또는 체크박스 미선택 시 비활성 ⬅ v1.1 수정 | — | — |

### 2.2 분류 실행 중 화면 (S-002: /analyzing)

| ID | 기능명 | 분류 | 화면 | 왜 필요 | Empty | Loading | Error |
|---|---|---|---|---|---|---|---|
| F-011 | 진행 카운터 ("N건 중 M건 완료") | 필수 | S-002 | 실행 중 확인. 이탈 방지 | — | 카운터 0/N에서 시작 | — |
| F-012 | 인사이트 요약 생성 단계 표시 | 필수 | S-002 | 분류 후 추가 호출 있음을 안내 | — | "인사이트 요약 생성 중..." | 실패 시 건너뛰고 결과 화면 이동 |
| F-013 | 화면 이탈 경고 팝업 | 필수 | S-002 | 이탈 시 분류 중단 방지 | — | — | — |
| F-014 | 부분 실패 처리 | 필수 | S-002 | API 간헐 오류 대응 | — | — | 실패 행 "검토 필요" 자동 태깅 후 계속 처리 |
| F-015 | 전체 실패 재시도 버튼 | 필수 | S-002 | API 키·네트워크 오류 대응 | — | — | "분류 실패. 재시도하시겠습니까?" |
| F-016 | 예상 소요 시간 표시 | 후순위 | S-002 | 안심 효과. 진행 바로 대체 가능 | — | — | — |

### 2.3 분류 결과 화면 (S-003: /result)

| ID | 기능명 | 분류 | 화면 | 왜 필요 | Empty | Loading | Error |
|---|---|---|---|---|---|---|---|
| F-017 | 상단 요약 바 ("전체 N건 \| 검토 필요 M건") | 필수 | S-003 | 작업 범위 즉시 파악 | 검토 필요 0건 → "검토 필요 없음" | — | — |
| F-018 | 전체 분류 결과 테이블 | 필수 | S-003 | 결과 확인 핵심 화면 | — | — | — |
| F-019 | 검토 필요 행 노란색 하이라이트 | 필수 | S-003 | 확인 대상 즉시 식별 | — | — | — |
| F-020 | 검토 필요 행 인라인 수정 (4개 항목) | 필수 | S-003 | 도구 안에서 수정 완결 | — | — | 저장 실패 시 재시도 |
| F-021 | 검토 완료 자동 처리 (초록색 전환) | 필수 | S-003 | 잔여 검토 건수 추적 | — | — | — |
| F-022 | 수정 중 이탈 경고 팝업 | 필수 | S-003 | 미저장 수정 손실 방지 | — | — | — |
| F-023 | 노션 형식 출력 버튼 (완료 후 활성) | 필수 | S-003 | 팀 공유 산출물 생성 | 검토 미완료 → 버튼 비활성 | — | — |
| F-024 | 노션 형식 클립보드 복사 | 필수 | S-003 | 노션 붙여넣기 연결 | — | — | 복사 실패 → 텍스트 박스 폴백 |
| F-025 | 검토 필요 행만 필터 버튼 | 선택 | S-003 | 다수 검토 필요 시 편의성 | — | — | — |
| F-026 | 신규 카테고리 섹션 (하단) | 필수 | S-003 | AI 생성 카테고리 확인 | 신규 카테고리 0건 → 섹션 미표시 | — | — |
| F-027 | 대시보드 이동 버튼 | 필수 | S-003 | 대시보드 확인 + 공유 연결 | — | — | — |

### 2.4 대시보드 화면 (S-004: /dashboard)

| ID | 기능명 | 분류 | 화면 | 왜 필요 | Empty | Loading | Error |
|---|---|---|---|---|---|---|---|
| F-028 | 기수명 + 분석 일시 표시 | 필수 | S-004 | 어느 기수 결과인지 식별 | "기수명 미입력" | — | — |
| F-029 | 전체 뷰 — 기본 통계 (차트+표) | 필수 | S-004 | 핵심 수치 즉시 파악 | — | 차트 로딩 스피너 | — |
| F-030 | 취소 사유 TOP5 (차트+표) | 필수 | S-004 | 전략 수정 근거 | — | — | — |
| F-031 | 후속 행동 분포 (차트+표) | 필수 | S-004 | 이탈 유형 파악 | — | — | — |
| F-032 | 타 과정 언급 현황 | 필수 | S-004 | 경쟁 과정 파악 | 언급 없음 → "타 과정 언급 없음" | — | — |
| F-033 | 검토 필요 데이터 목록 (읽기 전용) | 필수 | S-004 | 채매니저 재확인 | 검토 필요 0건 → 미표시 | — | — |
| F-034 | 주요 인사이트 (GPT-5.5 요약) | 선택 | S-004 | 더 넓은 인사이트 제공 | 생성 실패 → 섹션 미표시 | — | 실패 시 조용히 숨김 |
| F-035 | 유입경로별 뷰 탭 | 필수 | S-004 | 경로별 취소 패턴 비교 | 컬럼 미매핑 → "설정에서 유입경로 컬럼을 추가하세요" + 링크 | — | — |
| F-036 | 진행 단계별 뷰 탭 | 필수 | S-004 | 단계별 이탈 패턴 파악 | 컬럼 미매핑 → 동일 안내 | — | — |
| F-037 | 토큰 공유 링크 생성 버튼 | **후순위(v2)** | S-004 | 팀장 URL 열람 공유 — v2 고도화 | — | — | — |
| F-038 | 생성된 링크 클립보드 복사 | **후순위(v2)** | S-004 | F-037 연계 | — | — | — |
| F-039 | 링크 재생성(삭제+재발급) 버튼 | **후순위(v2)** | S-004 | F-037 연계 | — | — | — |
| F-040 | 분류 취소 버튼 | 후순위 | S-002 | 잘못된 파일 업로드 시 중단 | — | — | — |

---

## 3. 데이터 스키마 (SQL)

### 3.1 테이블 정의

```sql
-- 분류 세션 (기수 단위)
CREATE TABLE sessions (
  id                      uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  cohort_name             text,
  total_rows              int NOT NULL,
  excluded_rows           int NOT NULL DEFAULT 0,
  status                  text NOT NULL DEFAULT 'pending',
  -- status: pending | analyzing | insight_generating | completed | failed
  selected_result_values  text[],         -- v1.1 추가: 체크박스로 선택된 최종결과 값 목록
  insight_summary         text,
  analyzed_at             timestamptz,
  created_at              timestamptz DEFAULT now()
);

-- 행별 분류 결과
CREATE TABLE classification_results (
  id                  uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id          uuid NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  row_index           int NOT NULL,
  interview_content   text,
  special_notes       text,
  primary_cause       text,
  secondary_action    text,
  detail_tags         text[],
  competing_course    text,
  reasoning           text,
  needs_review        boolean NOT NULL DEFAULT false,
  new_category        text,
  review_completed    boolean NOT NULL DEFAULT false,
  created_at          timestamptz DEFAULT now()
);

-- 컬럼 매핑 프리셋
CREATE TABLE column_mappings (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  preset_name     text NOT NULL DEFAULT '기본 프리셋',
  mapping_config  jsonb NOT NULL,
  -- v1.1 수정: {"interview": "인터뷰 내용", "notes": "특이사항", "result": "최종결과", "source": "유입경로 또는 null"}
  -- 변경 이유: status(신청상태) → result(최종결과)로 키 변경. stage(진행단계) 제거 — 최종결과 값 자동 파싱으로 대체
  is_active       boolean NOT NULL DEFAULT true,
  created_at      timestamptz DEFAULT now()
);

-- 대시보드 공유 토큰 (v2 고도화 항목 — v1에서 미사용)
-- CREATE TABLE dashboard_tokens (
--   id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
--   session_id  uuid NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
--   token       text NOT NULL UNIQUE,
--   created_at  timestamptz DEFAULT now()
-- );

-- 신규 카테고리 누적
CREATE TABLE new_categories (
  id               uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id       uuid NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  category_name    text NOT NULL,
  occurrence_count int NOT NULL DEFAULT 1,
  created_at       timestamptz DEFAULT now()
);
```

### 3.2 RLS 정책

```sql
-- sessions: 읽기/쓰기 모두 허용 (사내 도구, 별도 인증 없음)
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_sessions" ON sessions FOR ALL USING (true);

ALTER TABLE classification_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_results" ON classification_results FOR ALL USING (true);

ALTER TABLE column_mappings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_mappings" ON column_mappings FOR ALL USING (true);

-- dashboard_tokens RLS: v2 구현 시 추가
-- ALTER TABLE dashboard_tokens ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "allow_all_tokens" ON dashboard_tokens FOR ALL USING (true);

ALTER TABLE new_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_categories" ON new_categories FOR ALL USING (true);
```

### 3.3 인덱스

```sql
CREATE INDEX idx_classification_results_session_id
  ON classification_results(session_id);

CREATE INDEX idx_classification_results_needs_review
  ON classification_results(session_id, needs_review)
  WHERE needs_review = true;

-- v2에서 dashboard_tokens 테이블 생성 시 추가
-- CREATE INDEX idx_dashboard_tokens_token ON dashboard_tokens(token);

CREATE INDEX idx_new_categories_session_id
  ON new_categories(session_id);
```

---

## 4. AI 호출 프롬프트

### 4.1 취소 사유 분류 프롬프트 (3건 묶음)

```
당신은 교육과정 취소자 분석 전문가입니다.
아래 취소자 데이터를 읽고 각 행을 정확히 분류해주세요.

[분류 기준]
- primary_cause: 취소 또는 이탈의 핵심 원인 (예: 내일배움카드 이슈, 커리큘럼 방향성 불일치, 연락두절, 개인 사정 등)
- secondary_action: 취소 후 예상되는 후속 행동 (예: 타 과정 신청, 타 과정 탐색, 차기 기수 희망, 미응답, 없음)
- detail_tags: 세부 원인 태그 배열 (예: ["카드 발급 지연"], ["커리큘럼 불일치", "희망 과정 불일치"])
- competing_course: 언급된 타 과정명 (없으면 null)
- reasoning: 위와 같이 판단한 근거 (인터뷰/특이사항에서 어떤 표현을 근거로 했는지)
- needs_review: 판단이 불확실하면 true, 확신하면 false
- new_category: primary_cause가 기존 분류 항목으로 설명이 안 되는 경우에만 신규 카테고리명 기재 (그 외 null)

[중요]
- 하나의 취소 사유에 1차 원인과 2차 행동이 동시에 있을 수 있습니다. 분리해서 추출하세요.
- 인터뷰 내용이 있으면 인터뷰 내용과 특이사항 모두 참고해 맥락 전체를 판단하세요.
- 인터뷰 내용이 없거나 비어있으면 특이사항만으로 판단하세요. 특이사항에 취소 이유가 기재된 경우 충분히 분류 가능합니다. ⬅ v1.1 추가
- 반드시 아래 JSON 배열 형식으로만 응답하세요. 설명 텍스트 없이.
- 응답 JSON의 각 필드가 누락된 경우 기본값을 사용하세요: primary_cause="" / secondary_action="" / detail_tags=[] / competing_course=null / reasoning="파싱 오류" / needs_review=true / new_category=null ⬅ v1.1 추가

[입력 데이터]
{{rows}}

[출력 형식]
[
  {
    "row_index": 0,
    "primary_cause": "",
    "secondary_action": "",
    "detail_tags": [],
    "competing_course": null,
    "reasoning": "",
    "needs_review": false,
    "new_category": null
  }
]
```

### 4.2 컬럼 자동 감지 프롬프트

```
다음은 엑셀 파일의 컬럼 헤더 목록입니다.
각 헤더가 어떤 역할에 해당하는지 매핑해주세요.

[매핑 대상] ⬅ v1.1 수정: status→result 변경, stage 제거
- interview: 인터뷰 내용이 담긴 컬럼
- notes: 특이사항이 담긴 컬럼
- result: 최종 결과 또는 신청 상태가 담긴 컬럼 (합격/취소 등 처리 결과값)
- source: 유입경로가 담긴 컬럼 (없으면 null)

[컬럼 헤더 목록]
{{headers}}

[출력 형식 — JSON만 응답]
{
  "interview": "컬럼명 또는 null",
  "notes": "컬럼명 또는 null",
  "result": "컬럼명 또는 null",
  "source": "컬럼명 또는 null"
}
```

### 4.3 주요 인사이트 요약 프롬프트

```
당신은 교육과정 모집 전략 분석가입니다.
아래 이번 기수 취소자 분류 결과를 읽고 주요 인사이트를 한 단락(150~250자)으로 요약해주세요.

[요약 포함 항목]
- 가장 두드러진 1차 원인 (비율 포함)
- 이전 기수 대비 눈에 띄는 변화 (데이터가 있으면)
- 다음 기수 모집에서 주의할 점 1~2가지

[제약]
- 수치는 소수점 없이 정수 퍼센트로
- 단정적 표현보다 "~으로 보입니다" "~이 확인됩니다" 형태로
- JSON 없이 순수 텍스트로만 응답

[분류 결과 요약]
{{summary_stats}}
```

---

## 5. 비기능 요구사항 (NFR) — 수치

| 항목 | 요구사항 | 측정 방법 |
|---|---|---|
| 분류 완료 시간 | 50건 기준 5분 이내 | 분류 실행 버튼 클릭 ~ /result 도달까지 실측 |
| API 비용 | 기수당 $0.50 이하 | OpenAI 대시보드 기수별 사용량 확인 |
| Vercel 함수 실행 시간 | 요청당 10초 이내 | 3건 묶음 호출 기준 실측 |
| 파일 크기 제한 | 10MB 이하, 최대 200행 | 업로드 시 클라이언트 사전 검증 |
| 토큰 보안 | v2 구현 시 적용 (32자 이상 무작위 문자열) | — |
| API 키 노출 | 브라우저 미노출 | 모든 GPT-5.5 호출을 서버 사이드에서만 실행 |
| 대시보드 모바일 호환 | v2 구현 시 적용 (360px 이상) | — |
| 업로드·분류 화면 | 노트북(1024px 이상) 전용 설계 | 모바일 최적화 불필요 |

---

## 6. 화면 ID 카탈로그

| 화면 ID | 화면명 | URL | 분류 | 권한 |
|---|---|---|---|---|
| S-001 | 업로드 화면 | /upload | Core | 채매니저 (URL 직접 접근) |
| S-002 | 분류 실행 중 화면 | /analyzing | Core | 채매니저 |
| S-003 | 분류 결과 화면 | /result | Core | 채매니저 |
| S-004 | 대시보드 | /dashboard | Core | 채매니저 전용 (v1)

각 화면의 상태(Empty/Loading/Error/Disabled) 상세는 FRD에서 정의.

---

## 7. 외부 통합 상세

| 서비스 | 용도 | 인증 방식 | 비용 모델 | 한도 | 마이그레이션 난이도 |
|---|---|---|---|---|---|
| OpenAI GPT-5.5 (gpt-5.5-2026-04-23) | 분류 + 컬럼 감지 + 인사이트 요약 | API 키 (환경 변수) | GPT-5.5 API 요금 확인 후 갱신 필요 | 분당 요청 제한 있음 (Tier 1 기준 500 RPM) | 중 (모델명 변경 시 프롬프트 재검증 필요) |
| Supabase | 5개 테이블 영구 저장 | anon key + service role key | 무료 플랜: 500MB, 월 200만 행 | 500MB 저장, 월 50만 API 호출 | 낮음 (PostgreSQL 표준) |
| SheetJS (xlsx) | 엑셀 파일 파싱 | 없음 (npm 패키지) | 무료 (오픈소스) | 없음 | 낮음 |
| Recharts | 대시보드 차트 | 없음 (npm 패키지) | 무료 (오픈소스) | 없음 | 낮음 |
| Vercel | 호스팅 + 서버리스 함수 | GitHub 연동 | 무료 플랜 | 함수 실행 10초, 월 100GB 대역폭 | 낮음 |

---

## 8. FRD에서 결정된 항목 및 잔여 미해결

### 8.1 FRD에서 확정 완료 ✅

- **유입경로별 집계 기준**: NULL → "(미입력)" 그룹으로 표시. 미매핑 시 안내 문구 + 링크
- **진행 단계별 집계 기준**: 별도 컬럼 없음. 최종결과 값 하드코딩 파싱 (인터뷰 전/후/기타)
- **노션 마크다운 컬럼 순서**: `1차원인 | 2차행동 | 세부태그 | 타과정명 | 판단근거 | 검토필요`
- **인라인 수정 저장 트리거**: 셀 blur(셀 밖 클릭) 시 자동 저장 + "저장됨 ✓" 토스트
- **대시보드 차트 배정**: TOP5 가로 막대 / 후속행동 도넛 / 유입경로 세로 막대 / 교차비교 묶음 가로 막대

### 8.2 TRD에서 결정할 항목

- **토큰 링크 공유 기능 (v2)**: 채매니저→팀원 URL 공유, 모바일 최적화 → v2 설계 시 별도 PRD 수정

---

## 9. TRD 작성 시 사용할 핵심 변수

| 변수 | 값 |
|---|---|
| 화면 목록 | S-001 ~ S-004 (총 4개) |
| 필수 기능 목록 | F-001~F-005, F-007~F-008, F-010~F-015, F-017~F-024, F-026~F-033, F-035~F-036 |
| 선택 기능 (v1 포함) | F-006 (컬럼 자동 감지), F-034 (인사이트 요약) ⬅ v1.1 수정: F-025 v1.x 이동 |
| 후순위 기능 | F-009, F-016, F-025, F-040 ⬅ v1.1 수정 |
| v2 이후 | F-037(v2), F-038(v2), F-039(v2) |
| Supabase 스키마 SQL | 본 파일 §3 (v1.1 수정본) 그대로 사용 |
| AI 호출 프롬프트 | 본 파일 §4 (v1.1 수정본) 그대로 사용 |
| API 호출 구조 | 3건 묶음, 클라이언트 순차 POST /api/classify |
| NFR 수치 | 본 파일 §5 그대로 사용 |
| 필수 컬럼 매핑 | 인터뷰 내용·특이사항·최종결과 3개 필수 + 유입경로 1개 선택 ⬅ v1.1 수정 |
| 인라인 수정 가능 항목 | primary_cause, secondary_action, detail_tags, needs_review (4개) |
| 노션 출력 트리거 | 모든 needs_review 행의 review_completed = true 시 활성화 |
| 노션 TOP3 요약 방식 | primary_cause 집계 상위 3개 자동 생성. GPT 추가 호출 없음 ⬅ v1.1 추가 |
| 세션 감지 | localStorage session_id + Supabase status 조회 ⬅ v1.1 추가 |
| 진행단계 파싱 | 최종결과 값 하드코딩 규칙 — FRD 핸드오프 §8 S-004 참조 ⬅ v1.1 추가 |

---

## 10. AI 바이브코딩 호환성 체크

- [x] 기능 ID 명확히 부여 (F-001 ~ F-040)
- [x] 각 기능의 Empty/Loading/Error 상태 정의
- [x] 화면 ID 카탈로그 (S-001 ~ S-004)
- [x] 권한 매트릭스 명확 (채매니저 단독 v1. 토큰 열람자는 v2)
- [x] DB 스키마 SQL 포함 (Supabase 직접 실행 가능)
- [x] AI 프롬프트 구조 포함 (Claude Code 직접 입력 가능)
- [x] NFR 수치 포함
- [x] 외부 통합 상세 포함

---

## 11. 다음 스킬 호출

**다음 단계**: trd-writer
**호출 방법**: `"TRD 작성해줘"`
**trd-writer에 제공할 입력 (총 4개 파일)**:
1. 본문 파일 `prd-취소사유분석기-20260519.md` (PRD 본문)
2. 본 핸드오프 파일 `prd-취소사유분석기-20260519-handoff.md` **(v1.1 수정본 사용)**
3. `frd-취소사유분석기-20260519.md` (FRD 본문)
4. `frd-취소사유분석기-20260519-handoff.md` (FRD 핸드오프)

> PRD v1.1(본 파일)과 FRD가 충돌하는 경우 **FRD를 우선** 적용한다. 주요 변경 사항은 본 파일 상단 버전 노트 참조.
