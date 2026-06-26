# GPU 제안서 허브

GPU 공모(슈퍼컴퓨팅센터 등)에 **“우리가 왜 GPU가 필요한지”** 제안서를 써서 GPU 자원을 받아오기 위한 작업 공간.
주제 아이디어를 모으고, 근거 논문을 키워드로 연결하고, 회의록과 제안서 버전을 관리하며, `autoproposal` 스킬로 제안서 초안을 자동 생성한다.

UI/스택은 **Paper-AIDetox**와 동일 — Next.js 14 (App Router) + Supabase + Tailwind.

## 페이지

| 경로 | 페이지 | 설명 |
|---|---|---|
| `/` | 홈 | 요약 카드 + 키워드 클라우드 + 최근 주제/회의록 |
| `/topics` | 주제 | 제안서 주제 아이디어를 **마크다운**으로 기록. 키워드로 논문과 연결 |
| `/meetings` | 회의록 | 회의 내용을 **마크다운**으로 작성 → 보기 좋게 렌더 |
| `/papers` | 논문 | 근거 논문 **링크 + 키워드**(PDF 본문은 읽지 않음). 키워드 필터 |
| `/keywords` | 키워드 | 전체 키워드 통계 |
| `/keywords/[name]` | 키워드 허브 | 그 키워드의 **주제 + 논문을 한 화면**에 모아 봄 (양방향 연결의 핵심) |
| `/proposals` | 제안서 버전 | 공모별 제안서 + 버전마다 파일·작성자·날짜·변경요약 관리 |
| `/autoproposal` | 스킬 *(로컬 전용)* | autoproposal 스킬 문서 렌더 + 단계별 프롬프트 복사/실행. **클라우드 배포본에선 숨김** |

### 키워드 연결 설계
키워드(문자열)가 **주제 ↔ 논문**을 잇는 연결고리다.
- 주제/논문 어디서든 키워드 칩을 누르면 → `/keywords/[name]` 허브로 이동
- 허브에서 그 키워드의 **주제 아이디어 + 논문**을 한 화면에 모아 보여줌 (양방향)
- 저장은 `topics.keywords` / `papers.keywords` (Postgres `text[]`), GIN 인덱스로 `@>` 검색

## 셋업

### 1. 의존성
```bash
npm install
```

### 2. Supabase (새 프로젝트)
1. supabase.com 에서 새 프로젝트 생성
2. **SQL Editor** 에 `supabase/schema.sql` 붙여넣고 실행 (테이블 + Storage 버킷 `proposal-files` 생성)
3. (선택) `supabase/seed.sql` 실행 → 예시 데이터
4. **Project Settings > API** 에서 URL/anon key 복사

### 3. 환경변수
`.env.example` 를 `.env.local` 로 복사 후 채운다.
```bash
cp .env.example .env.local
```
```
NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>

# autoproposal 실행 연동 (선택)
AUTOPROPOSAL_RUN_ENDPOINT=
AUTOPROPOSAL_RUN_TOKEN=
# autoproposal 폴더 위치 (기본: ../autoproposal)
# AUTOPROPOSAL_DIR=/home/damilab/haneul/autoproposal
```

### 4. 실행
```bash
npm run dev      # http://localhost:3000
npm run build    # 프로덕션 빌드
```

> Supabase 키가 없어도 화면은 뜬다(상단에 "미설정" 안내). 키를 넣으면 데이터가 연결된다.

## autoproposal 스킬 연동

`/autoproposal` 페이지는 형제 폴더 `../autoproposal` 의 규격 문서(README, CLAUDE.md, 공고문분석/스타일/SKILL/작성.md)를 **서버에서 읽어** 그대로 렌더한다(`AUTOPROPOSAL_DIR` 로 경로 변경 가능).

단계별 프롬프트는 **복사**해서 Claude Code에 붙여넣어 쓸 수 있고,
`AUTOPROPOSAL_RUN_ENDPOINT`(pixt-runner 베이스 URL)를 설정하면 **실행** 버튼이 동작한다 —
웹 → `/api/autoproposal/run` → pixt-runner `/run` 으로 `{ step, prompt, project }` 를 POST하면
pixt 서버가 `autoproposal` 폴더에서 `claude -p` 를 헤드리스로 실행하고 **jobId** 를 즉시 돌려준다.
작업이 길어서, 웹은 `/api/autoproposal/status` 로 3초마다 폴링해 결과를 보여준다.

> pixt 서버에서 도는 실행 서버는 **`pixt-runner/`** 폴더에 포함돼 있다(의존성 0, `node server.mjs`).
> 셋업·연결 방법은 [`pixt-runner/README.md`](pixt-runner/README.md) 참고.
> 라우트 구현: `app/api/autoproposal/run/route.ts`, `app/api/autoproposal/status/route.ts`.

### 로컬 전용 — 클라우드에선 숨김
autoproposal 실행은 **같은 서버에서 도는 pixt-runner**(`localhost:8787`)와 스킬 폴더에 의존하므로,
Vercel 같은 클라우드에서는 동작할 수 없다. 그래서 페이지/메뉴를 **플래그로 게이트**한다.
- 로컬: `.env.local` 에 `NEXT_PUBLIC_ENABLE_AUTOPROPOSAL=1` → 페이지·메뉴 노출, 전체 동작.
- 클라우드(Vercel): 이 변수를 두지 않음 → 메뉴 숨김, `/autoproposal` 직접 접속 시 "로컬 전용" 안내만 표시.
- 나중에 클라우드에서도 쓰려면 pixt-runner 를 Cloudflare 터널 등으로 공개하고 그 URL 을
  `AUTOPROPOSAL_RUN_ENDPOINT` 로 지정하면 된다.

## 구조
```
app/
  page.tsx                  홈
  topics/ meetings/ papers/ 주제·회의록·논문
  keywords/ keywords/[name] 키워드 + 허브
  proposals/                제안서 버전
  autoproposal/             스킬 페이지
  api/autoproposal/docs     스킬 문서 read
  api/autoproposal/run      실행 트리거 (pixt 연동)
components/                 AppShell, Sidebar, ui, Markdown, KeywordChip
lib/                        supabase, db, types, avatar, useMembers, currentUser
supabase/                   schema.sql, seed.sql
```
