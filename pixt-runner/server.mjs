#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────
// pixt-runner — autoproposal 실행 서버 (의존성 0, Node 내장 모듈만)
//
// 웹앱의 "실행" 버튼 → Next.js /api/autoproposal/run → (이 서버) → claude -p
//
// 엔드포인트
//   GET  /health                  상태 확인
//   POST /run    {step,prompt,project}   작업 시작 → 202 {jobId} (즉시 반환)
//   GET  /status/:jobId           작업 상태/결과 조회
//
// 환경변수 (.env 또는 export)
//   PORT             기본 8787
//   RUNNER_TOKEN     설정 시 Authorization: Bearer <token> 필수
//   AUTOPROPOSAL_DIR claude 가 돌 작업 폴더 (필수, 예: /home/.../haneul/autoproposal)
//   CLAUDE_BIN       claude 실행 파일 경로 (기본 'claude')
//   MODEL            기본 'claude-opus-4-8'
//   ALLOWED_TOOLS    기본 'Read,Edit,Write,Bash'
//   PERMISSION_MODE  기본 'acceptEdits'  (격리환경이면 'bypassPermissions')
//   JOB_TIMEOUT_MS   기본 1800000 (30분)
//   JOBS_DIR         작업 기록 저장 폴더 (기본 ./jobs)
//
// 실행:  AUTOPROPOSAL_DIR=/path/to/autoproposal node server.mjs
// ─────────────────────────────────────────────────────────────

import http from "node:http";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

const PORT = Number(process.env.PORT ?? 8787);
// 기본은 localhost 전용(외부 네트워크에 노출 안 함). 다른 머신에서 부르려면 HOST=0.0.0.0
const HOST = process.env.HOST ?? "127.0.0.1";
const TOKEN = process.env.RUNNER_TOKEN ?? "";
const WORKDIR = process.env.AUTOPROPOSAL_DIR ?? "";
const CLAUDE_BIN = process.env.CLAUDE_BIN ?? "claude";
const MODEL = process.env.MODEL ?? "claude-opus-4-8";
const ALLOWED_TOOLS = process.env.ALLOWED_TOOLS ?? "Read,Edit,Write,Bash";
const PERMISSION_MODE = process.env.PERMISSION_MODE ?? "acceptEdits";
const JOB_TIMEOUT_MS = Number(process.env.JOB_TIMEOUT_MS ?? 30 * 60 * 1000);
const JOBS_DIR = process.env.JOBS_DIR ?? path.join(process.cwd(), "jobs");

if (!WORKDIR) {
  console.error(
    "✗ AUTOPROPOSAL_DIR 가 비어 있습니다. claude 가 돌 작업 폴더를 지정하세요."
  );
  process.exit(1);
}

/** @type {Map<string, any>} */
const jobs = new Map();

async function persist(job) {
  try {
    await fs.mkdir(JOBS_DIR, { recursive: true });
    await fs.writeFile(
      path.join(JOBS_DIR, `${job.id}.json`),
      JSON.stringify(job, null, 2)
    );
  } catch (e) {
    console.error("job 저장 실패:", e.message);
  }
}

function startJob({ step, prompt, project }) {
  const id = randomUUID();
  const job = {
    id,
    step: step ?? null,
    project: project ?? null,
    status: "running", // running | done | error | timeout
    startedAt: new Date().toISOString(),
    finishedAt: null,
    exitCode: null,
    result: null, // claude 의 최종 응답 텍스트
    cost_usd: null,
    session_id: null,
    error: null,
    stderrTail: "",
  };
  jobs.set(id, job);
  persist(job);

  const args = [
    "-p",
    prompt,
    "--output-format",
    "json",
    "--model",
    MODEL,
    "--allowedTools",
    ALLOWED_TOOLS,
    "--permission-mode",
    PERMISSION_MODE,
  ];

  console.log(`▶ [${id}] step=${step} cwd=${WORKDIR}`);
  const child = spawn(CLAUDE_BIN, args, {
    cwd: WORKDIR,
    env: process.env,
  });

  let stdout = "";
  let stderr = "";
  child.stdout.on("data", (d) => (stdout += d));
  child.stderr.on("data", (d) => (stderr += d));

  const timer = setTimeout(() => {
    job.status = "timeout";
    job.error = `시간 초과 (${JOB_TIMEOUT_MS}ms)`;
    child.kill("SIGKILL");
  }, JOB_TIMEOUT_MS);

  child.on("error", (e) => {
    clearTimeout(timer);
    job.status = "error";
    job.error = `claude 실행 실패: ${e.message} (CLAUDE_BIN=${CLAUDE_BIN})`;
    job.finishedAt = new Date().toISOString();
    persist(job);
    console.error(`✗ [${id}] ${job.error}`);
  });

  child.on("close", (code) => {
    clearTimeout(timer);
    job.exitCode = code;
    job.finishedAt = new Date().toISOString();
    job.stderrTail = stderr.slice(-2000);
    if (job.status === "timeout") {
      persist(job);
      return;
    }
    if (code === 0) {
      try {
        const parsed = JSON.parse(stdout);
        job.result = parsed.result ?? stdout;
        job.cost_usd = parsed.total_cost_usd ?? null;
        job.session_id = parsed.session_id ?? null;
      } catch {
        job.result = stdout; // JSON 파싱 실패 시 원문
      }
      job.status = "done";
      console.log(`✓ [${id}] done (exit 0)`);
    } else {
      job.status = "error";
      job.error = `claude 종료 코드 ${code}`;
      console.error(`✗ [${id}] exit ${code}: ${job.stderrTail}`);
    }
    persist(job);
  });

  return job;
}

function send(res, code, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(code, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
  });
  res.end(body);
}

function authorized(req) {
  if (!TOKEN) return true;
  const h = req.headers["authorization"] ?? "";
  return h === `Bearer ${TOKEN}`;
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (c) => {
      data += c;
      if (data.length > 1_000_000) reject(new Error("본문이 너무 큽니다"));
    });
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (req.method === "GET" && url.pathname === "/health") {
    return send(res, 200, {
      ok: true,
      workdir: WORKDIR,
      model: MODEL,
      tokenRequired: Boolean(TOKEN),
      jobs: jobs.size,
    });
  }

  if (!authorized(req)) {
    return send(res, 401, { ok: false, error: "인증 실패 (Bearer 토큰)" });
  }

  if (req.method === "POST" && url.pathname === "/run") {
    let body;
    try {
      body = JSON.parse((await readBody(req)) || "{}");
    } catch {
      return send(res, 400, { ok: false, error: "잘못된 JSON" });
    }
    if (!body.prompt || !String(body.prompt).trim()) {
      return send(res, 400, { ok: false, error: "prompt 가 비었습니다" });
    }
    const job = startJob(body);
    return send(res, 202, {
      ok: true,
      jobId: job.id,
      status: job.status,
      statusUrl: `/status/${job.id}`,
    });
  }

  if (req.method === "GET" && url.pathname.startsWith("/status/")) {
    const id = url.pathname.slice("/status/".length);
    let job = jobs.get(id);
    if (!job) {
      try {
        job = JSON.parse(
          await fs.readFile(path.join(JOBS_DIR, `${id}.json`), "utf8")
        );
      } catch {
        return send(res, 404, { ok: false, error: "작업을 찾을 수 없습니다" });
      }
    }
    return send(res, 200, { ok: true, job });
  }

  return send(res, 404, { ok: false, error: "not found" });
});

server.listen(PORT, HOST, () => {
  console.log(`pixt-runner listening on ${HOST}:${PORT}`);
  console.log(`  workdir : ${WORKDIR}`);
  console.log(`  model   : ${MODEL}`);
  console.log(`  auth    : ${TOKEN ? "Bearer 토큰 필요" : "없음(공개)"}`);
  console.log(`  bind    : ${HOST === "127.0.0.1" ? "localhost 전용(외부 차단)" : HOST}`);
});
