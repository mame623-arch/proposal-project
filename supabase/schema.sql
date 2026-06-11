-- ============================================================
--  GPU 제안서 허브 — Supabase 스키마 (구조만)
--  Supabase 대시보드 > SQL Editor 에 붙여넣고 실행하세요.
--  언제 다시 실행해도 안전합니다(데이터 유지). 초기 데이터는 seed.sql 참고.
-- ============================================================

create extension if not exists "pgcrypto";

-- 멤버 ---------------------------------------------------------
create table if not exists members (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  role       text default '',
  sort       int  default 0,
  created_at timestamptz default now()
);
create unique index if not exists members_name_key on members(name);

-- 주제 아이디어 — 마크다운 본문 + 키워드 배열 ------------------
create table if not exists topics (
  id         uuid primary key default gen_random_uuid(),
  title      text not null default '',
  body       text default '',            -- 마크다운
  keywords   text[] not null default '{}',
  author_id  uuid references members(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
-- 키워드 배열 검색(contains @>)을 위한 GIN 인덱스
create index if not exists idx_topics_keywords on topics using gin (keywords);
create index if not exists idx_topics_updated  on topics (updated_at desc);

-- 회의록 — 마크다운 본문 --------------------------------------
create table if not exists meetings (
  id         uuid primary key default gen_random_uuid(),
  title      text not null default '',
  date       date not null default current_date,
  body       text default '',            -- 마크다운
  author_id  uuid references members(id) on delete set null,
  created_at timestamptz default now()
);
create index if not exists idx_meetings_date on meetings (date desc);

-- 논문 — 링크 + 키워드 (PDF 본문은 읽지 않음) ------------------
create table if not exists papers (
  id         uuid primary key default gen_random_uuid(),
  title      text not null default '',
  url        text default '',
  kind       text default 'pdf',          -- 'pdf' | 'html' | 'arxiv' | ...
  authors    text default '',
  note       text default '',
  keywords   text[] not null default '{}',
  added_by   uuid references members(id) on delete set null,
  created_at timestamptz default now()
);
create index if not exists idx_papers_keywords on papers using gin (keywords);
create index if not exists idx_papers_created  on papers (created_at desc);

-- 제안서(사업) — 버전들의 묶음 --------------------------------
create table if not exists proposals (
  id          uuid primary key default gen_random_uuid(),
  name        text not null default '',   -- 제안서/사업명
  agency      text default '',            -- 공모 기관 (GPU 제공처)
  description text default '',
  created_at  timestamptz default now()
);

-- 제안서 버전 — 파일(Storage) + 메타(누가/언제/무엇을 수정) ----
create table if not exists proposal_versions (
  id            uuid primary key default gen_random_uuid(),
  proposal_id   uuid references proposals(id) on delete cascade,
  version_label text not null default 'v1',
  file_path     text,                     -- Storage 경로
  file_name     text,
  file_url      text,                     -- 외부 링크로 관리할 경우
  author_id     uuid references members(id) on delete set null,
  changelog     text default '',          -- 이전 버전 대비 변경 요약
  created_at    timestamptz default now()
);
create index if not exists idx_versions_proposal on proposal_versions (proposal_id, created_at desc);

-- ------------------------------------------------------------
-- RLS: 데모 단계 — anon 키로 읽기/쓰기 모두 허용
-- ------------------------------------------------------------
alter table members           enable row level security;
alter table topics            enable row level security;
alter table meetings          enable row level security;
alter table papers            enable row level security;
alter table proposals         enable row level security;
alter table proposal_versions enable row level security;

do $$
declare t text;
begin
  foreach t in array array['members','topics','meetings','papers','proposals','proposal_versions']
  loop
    execute format('drop policy if exists "public_all" on %I;', t);
    execute format('create policy "public_all" on %I for all using (true) with check (true);', t);
  end loop;
end $$;

-- ------------------------------------------------------------
-- Storage: 제안서 파일 버킷 (공개 읽기 + anon 업로드)
--   대시보드 Storage에서 'proposal-files' 버킷을 Public으로 만들어도 됨.
--   아래는 SQL로 동일하게 처리.
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('proposal-files', 'proposal-files', true)
on conflict (id) do update set public = true;

drop policy if exists "proposal_files_read"   on storage.objects;
drop policy if exists "proposal_files_write"  on storage.objects;
drop policy if exists "proposal_files_delete" on storage.objects;

create policy "proposal_files_read" on storage.objects
  for select using (bucket_id = 'proposal-files');
create policy "proposal_files_write" on storage.objects
  for insert with check (bucket_id = 'proposal-files');
create policy "proposal_files_delete" on storage.objects
  for delete using (bucket_id = 'proposal-files');
