-- ============================================================
--  초기 데이터(시드) — 예시 멤버 + 주제/회의록/논문/제안서
--  ⚠️ 기존 데이터를 모두 지우고 다시 채웁니다. 최초 1회만 실행하세요.
--  schema.sql 을 먼저 실행한 뒤 이 파일을 실행합니다.
-- ============================================================

truncate table proposal_versions, proposals, papers, meetings, topics, members
  restart identity cascade;

-- 멤버 ---------------------------------------------------------
insert into members (name, role, sort) values
  ('이하늘', '연구', 1),
  ('정다미', '연구', 2),
  ('김민석', '연구', 3);

-- 주제 아이디어 -----------------------------------------------
insert into topics (title, body, keywords, author_id)
select
  'Multi-Agent 안전성 검증에 대규모 시뮬레이션이 필요한 이유',
  $md$## 한 줄 요약
가정환경 멀티에이전트의 **안전성**을 통계적으로 검증하려면 수천 개의 시나리오를 동시에 굴려야 하고, 이것이 GPU 수요의 핵심 근거가 된다.

## 왜 GPU가 필요한가
- 시나리오 1건당 LLM 추론 수십~수백 콜 → **배치 추론**으로 GPU 점유
- 안전성은 **희귀 사건(rare event)** 이라 통계적 유의성 확보에 대량 롤아웃 필요
- 강화학습/자기대국식 자가개선 루프는 GPU 없이는 비현실적

## 제안서에 쓸 논리
1. 문제: 안전성 평가가 소규모 수동 테스트에 의존 → 일반화 실패
2. 격차: 대규모 자동 검증 파이프라인 부재
3. 해법: GPU 클러스터 기반 대규모 시뮬레이션 + 자동 채점
$md$,
  array['safety','multi-agent','simulation','LLM-inference'],
  (select id from members where name='이하늘');

insert into topics (title, body, keywords, author_id)
select
  'AI 디톡스: 검출 회피(detox) 데이터셋 대량 생성',
  $md$## 아이디어
AI 생성 텍스트의 흔적을 줄이는 **detox** 변환을 학습하려면, 대량의 (원문 ↔ 변환문) 쌍과 검출기 라벨이 필요하다. GPU로 대규모 생성·라벨링을 돌린다.

> 핵심: 데이터 생성 비용이 곧 GPU 시간.

- 키워드를 클릭하면 같은 키워드의 다른 주제·논문이 한 화면에 모인다.
$md$,
  array['detox','dataset','LLM-inference'],
  (select id from members where name='정다미');

-- 회의록 ------------------------------------------------------
insert into meetings (title, date, body, author_id)
select
  'GPU 제안서 킥오프',
  current_date,
  $md$## 안건
1. 어떤 기관 공모에 낼지
2. 우리가 GPU가 필요한 **진짜 이유** 정리
3. 역할 분담

## 결정사항
- 주제 후보는 **주제 페이지**에 마크다운으로 계속 적는다.
- 근거 논문은 **논문 페이지**에 링크 + 키워드로 모은다.
- 제안서 초안은 **autoproposal** 스킬로 1차 생성 후 사람 검수.

## 다음 할 일
- [ ] 공모 공고 3건 조사
- [ ] 키워드별 논문 5편씩 확보
$md$,
  (select id from members where name='이하늘');

-- 논문 --------------------------------------------------------
insert into papers (title, url, kind, authors, note, keywords, added_by)
select
  'Attention Is All You Need',
  'https://arxiv.org/pdf/1706.03762',
  'arxiv',
  'Ashish Vaswani 외',
  '대규모 추론 비용의 출발점(Transformer).',
  array['LLM-inference'],
  (select id from members where name='김민석');

insert into papers (title, url, kind, authors, note, keywords, added_by)
select
  'Constitutional AI: Harmlessness from AI Feedback',
  'https://arxiv.org/pdf/2212.08073',
  'arxiv',
  'Yuntao Bai 외',
  '안전성/디톡스 근거 논문.',
  array['safety','detox'],
  (select id from members where name='정다미');

-- 제안서 + 버전 -----------------------------------------------
with p as (
  insert into proposals (name, agency, description)
  values ('가정환경 멀티에이전트 안전성 검증 GPU 제안',
          'OO 슈퍼컴퓨팅센터',
          '대규모 시뮬레이션 기반 안전성 검증을 위한 GPU 자원 신청')
  returning id
)
insert into proposal_versions (proposal_id, version_label, file_url, author_id, changelog)
select p.id, 'v1', null,
       (select id from members where name='이하늘'),
       '최초 초안 — 문제정의/격차/해법 골격 작성'
from p;
