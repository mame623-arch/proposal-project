# pixt-runner

웹앱의 **autoproposal "실행" 버튼**이 호출하는, pixt 서버에서 도는 작은 실행 서버.
요청을 받으면 `autoproposal` 폴더에서 **Claude Code를 헤드리스(`claude -p`)로** 실행하고, 길게 걸리는 작업이라 **즉시 jobId를 반환**한 뒤 상태/결과를 폴링으로 돌려준다.

- **의존성 0** — Node 내장 모듈만 사용. `npm install` 불필요.
- Node 18+ 필요.

## 흐름

```
[웹 autoproposal 페이지]
   "실행" 클릭
      │  POST /api/autoproposal/run   (Next.js)
      ▼
[Next.js run 라우트]  ──POST {step,prompt,project}──▶  [pixt-runner]  POST /run
                                                          │ spawn: claude -p ... (cwd=autoproposal)
                                                          ▼ 202 {jobId}
[웹]  ──GET /api/autoproposal/status?jobId=…──▶  [run 라우트]  ──▶  [pixt-runner] GET /status/:jobId
                                                                       running → done {result}
```

## 1. pixt 서버에서 실행

```bash
# pixt 서버에 이 폴더를 올린 뒤
cd pixt-runner
cp .env.example .env          # 값 채우기 (특히 AUTOPROPOSAL_DIR)

# Claude Code CLI 가 설치/로그인돼 있어야 함 (claude --version 으로 확인)
# .env 를 셸에 로드하고 실행:
set -a; . ./.env; set +a
node server.mjs
# → pixt-runner listening on :8787
```

서버를 계속 띄워두려면 `pm2 start server.mjs --name pixt-runner` 또는 systemd/tmux 사용.

동작 확인:
```bash
curl http://localhost:8787/health
```

## 2. 웹앱(.env.local)에서 연결

이 서버의 **베이스 URL**을 가리키게 한다(끝에 `/run` 붙이지 않음 — 라우트가 알아서 붙임).

```
# proposal_project/.env.local
AUTOPROPOSAL_RUN_ENDPOINT=http://<pixt-host>:8787
AUTOPROPOSAL_RUN_TOKEN=<RUNNER_TOKEN 과 동일하게 (설정했다면)>
```

웹앱과 pixt가 다른 머신이면 `<pixt-host>` 는 접근 가능한 호스트/IP. 공개 노출이 부담되면
SSH 터널(`ssh -L 8787:localhost:8787 pixt`)로 묶고 `http://localhost:8787` 을 쓰면 된다.

## 엔드포인트

| 메서드 | 경로 | 설명 |
|---|---|---|
| GET | `/health` | 상태·설정 확인 (인증 불필요) |
| POST | `/run` | `{step,prompt,project}` → `202 {jobId, statusUrl}` |
| GET | `/status/:jobId` | `{job:{status, result, cost_usd, session_id, error, …}}` |

`status` 값: `running` → `done` / `error` / `timeout`.
작업 기록은 메모리 + `jobs/<id>.json` 에 남는다(재시작 후에도 status 조회 가능).

## 실제로 실행되는 명령

```bash
cd $AUTOPROPOSAL_DIR && \
claude -p "<prompt>" \
  --output-format json \
  --model $MODEL \
  --allowedTools $ALLOWED_TOOLS \
  --permission-mode $PERMISSION_MODE
```

## 주의

- `--permission-mode acceptEdits` + `--allowedTools` 로 권한 프롬프트 없이 자동 실행한다.
  완전 격리 환경에서만 `PERMISSION_MODE=bypassPermissions` 를 고려하라.
- `RUNNER_TOKEN` 을 비워두면 누구나 호출할 수 있다. 외부 노출 시 반드시 토큰을 설정하라.
- 같은 작업을 이어서 돌리려면 응답의 `session_id` 로 `claude -p --resume <id>` 를 활용할 수 있다(확장 여지).
