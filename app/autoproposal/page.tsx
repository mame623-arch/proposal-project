"use client";

import { useEffect, useState } from "react";
import Markdown from "@/components/Markdown";
import {
  Field,
  GhostBtn,
  PrimaryBtn,
  SectionTitle,
  inputCls,
} from "@/components/ui";

interface Doc {
  key: string;
  title: string;
  rel: string;
  content: string | null;
}

interface DocsResponse {
  dir: string;
  runConfigured: boolean;
  docs: Doc[];
}

interface Job {
  id: string;
  status: "running" | "done" | "error" | "timeout";
  step?: string;
  result?: string | null;
  error?: string | null;
  cost_usd?: number | null;
  session_id?: string | null;
}

// README의 Quick Start를 기반으로 한 4단계 마디
const STEPS = [
  {
    id: "analyze",
    title: "1 · 공고 분석",
    prompt: (biz: string) =>
      `announcement/${biz}_공고/ 안의 파일들 읽고 announcement/공고문분석.md 규격대로 ${biz}_공고_분석.md 만들어줘.`,
  },
  {
    id: "transform",
    title: "2 · 양식 변환 (HWP/HWPX인 경우만)",
    prompt: (biz: string) =>
      `proposal/${biz}_양식/${biz}_양식.hwpx 를 transformer/SKILL.md 절차로 HTML 변환해줘.`,
  },
  {
    id: "write",
    title: "3 · 핵심 메시지 입력 → 채움 생성",
    prompt: (biz: string) =>
      `이번 제안의 주제는 ___, 격차는 ___, 가설은 ___, 차별점은 ___ 야.\nproposal/작성.md 9단계로 ${biz}_채움.html + ${biz}_작성.md 만들어줘.`,
  },
  {
    id: "review",
    title: "4 · 자가 평가 후 자료 보강",
    prompt: (biz: string) =>
      `자가 평가에서 A 우선순위 자료 다 모았어. proposal/${biz}_양식/추가자료/ 에 넣어뒀으니 채움.html 갱신하고 자가 평가 재실행해줘.`,
  },
];

export default function AutoproposalPage() {
  const [data, setData] = useState<DocsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [biz, setBiz] = useState("XYZ");
  const [openDoc, setOpenDoc] = useState<string | null>("readme");
  const [copied, setCopied] = useState<string | null>(null);
  const [running, setRunning] = useState<string | null>(null);
  const [runMsg, setRunMsg] = useState<string | null>(null);
  const [job, setJob] = useState<Job | null>(null);

  useEffect(() => {
    fetch("/api/autoproposal/docs")
      .then((r) => r.json())
      .then(setData)
      .catch((e) => console.error(e))
      .finally(() => setLoading(false));
  }, []);

  // 진행 중인 작업을 3초마다 폴링
  useEffect(() => {
    if (!job || job.status !== "running") return;
    const t = setInterval(async () => {
      try {
        const r = await fetch(
          `/api/autoproposal/status?jobId=${encodeURIComponent(job.id)}`
        );
        const j = await r.json();
        if (j.ok && j.job) setJob({ ...j.job });
      } catch {
        /* 다음 틱에 재시도 */
      }
    }, 3000);
    return () => clearInterval(t);
  }, [job]);

  async function copy(id: string, text: string) {
    await navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied((c) => (c === id ? null : c)), 1500);
  }

  async function run(stepId: string, prompt: string) {
    setRunning(stepId);
    setRunMsg(null);
    setJob(null);
    try {
      const res = await fetch("/api/autoproposal/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step: stepId, prompt, project: biz }),
      });
      const j = await res.json();
      const jobId = j?.data?.jobId as string | undefined;
      if (j.ok && jobId) {
        setRunMsg(`✅ pixt 서버에서 실행을 시작했습니다.`);
        setJob({ id: jobId, status: "running", step: stepId });
      } else if (j.ok) {
        setRunMsg(`✅ pixt 서버에 전달했습니다.`);
      } else {
        setRunMsg(`⚠️ ${j.error ?? "실행 실패"}`);
      }
    } catch (e) {
      setRunMsg(`⚠️ ${(e as Error).message}`);
    } finally {
      setRunning(null);
    }
  }

  return (
    <div className="mx-auto max-w-[1100px] px-5 py-7 md:px-10">
      <h1>autoproposal</h1>
      <p className="mt-1 text-muted">
        공고와 양식을 입력받아 우수제안서 스타일로 제안서를 자동 작성하는
        스킬입니다. 단계별 프롬프트를 복사해 Claude Code에 붙여넣거나, 연동이
        설정되면 <b>실행</b> 버튼으로 pixt 서버의 Claude Code에 바로 전달합니다.
      </p>

      {/* 연동 상태 */}
      <div
        className={`mt-4 rounded-lg border px-4 py-2.5 text-[0.84rem] ${
          data?.runConfigured
            ? "border-[#cfe9da] bg-[#f0f8f3] text-[#2f6b4a]"
            : "border-[#f0e2b8] bg-[#fff8e6] text-[#8a6d2f]"
        }`}
      >
        {loading
          ? "상태 확인 중…"
          : data?.runConfigured
          ? "● pixt 서버 실행 연동이 설정되어 있습니다. 실행 버튼이 동작합니다."
          : "○ 실행 연동 미설정 — 지금은 프롬프트 복사로 사용하세요. (.env.local 의 AUTOPROPOSAL_RUN_ENDPOINT 설정 시 실행 버튼 활성화)"}
      </div>

      {/* 사업 접두사 입력 */}
      <div className="mt-5 max-w-sm">
        <Field label="사업(제안서) 접두사" hint="폴더명 {사업}_공고 / {사업}_양식">
          <input
            className={inputCls}
            value={biz}
            onChange={(e) => setBiz(e.target.value.trim() || "XYZ")}
          />
        </Field>
      </div>

      {/* 단계별 실행 */}
      <SectionTitle hint="한 번에 9단계를 시키지 말고 마디로 끊어 진행">
        단계별 실행
      </SectionTitle>
      <p className="mb-3 rounded-lg border border-[#f0e2b8] bg-[#fff8e6] px-3 py-2 text-[0.8rem] text-[#8a6d2f]">
        ⚠️ 한 번에 하나씩 — 이전 단계가 <b>완료</b>된 뒤 다음을 실행하세요. 동시에
        여러 번 돌리면 같은 파일을 서로 덮어쓰고 사용량도 겹칩니다. (실행 중에는
        버튼이 잠깁니다)
      </p>
      <div className="space-y-3">
        {STEPS.map((s) => {
          const prompt = s.prompt(biz);
          return (
            <div key={s.id} className="rounded-xl border border-line bg-bg p-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-[0.95rem] font-bold text-ink">{s.title}</h3>
                <div className="flex shrink-0 gap-1">
                  <GhostBtn onClick={() => copy(s.id, prompt)}>
                    {copied === s.id ? "복사됨 ✓" : "복사"}
                  </GhostBtn>
                  <PrimaryBtn
                    onClick={() => run(s.id, prompt)}
                    disabled={
                      running !== null ||
                      job?.status === "running" ||
                      !data?.runConfigured
                    }
                    className="px-3 py-1.5 text-[0.8rem]"
                  >
                    {running === s.id
                      ? "전달 중…"
                      : job?.status === "running"
                      ? "실행 중…"
                      : "실행"}
                  </PrimaryBtn>
                </div>
              </div>
              <pre className="mt-2 overflow-x-auto whitespace-pre-wrap rounded-lg bg-surface2 p-3 text-[0.8rem] leading-relaxed text-body">
                {prompt}
              </pre>
            </div>
          );
        })}
        {runMsg && (
          <div className="rounded-lg border border-line bg-surface px-4 py-2.5 text-[0.84rem] text-body">
            {runMsg}
          </div>
        )}

        {job && (
          <div className="rounded-xl border border-line bg-bg p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full px-2 py-0.5 text-[0.72rem] font-bold ${
                  job.status === "running"
                    ? "bg-accentsoft text-accent"
                    : job.status === "done"
                    ? "bg-[#e7f3ec] text-ok"
                    : "bg-[#fdf3f0] text-warn"
                }`}
              >
                {job.status === "running"
                  ? "● 실행 중…"
                  : job.status === "done"
                  ? "✓ 완료"
                  : job.status === "timeout"
                  ? "⏱ 시간 초과"
                  : "✗ 오류"}
              </span>
              <code className="text-[0.72rem] text-faint">job {job.id.slice(0, 8)}</code>
              {typeof job.cost_usd === "number" && (
                <span className="text-[0.72rem] text-faint">
                  ${job.cost_usd.toFixed(4)}
                </span>
              )}
            </div>
            {job.status === "running" && (
              <p className="mt-2 text-[0.82rem] text-muted">
                pixt 서버에서 Claude Code가 작업 중입니다. (3초마다 자동 갱신)
              </p>
            )}
            {job.error && (
              <p className="mt-2 text-[0.84rem] text-warn">{job.error}</p>
            )}
            {job.result && (
              <div className="mt-3 border-t border-line pt-3">
                <Markdown>{job.result}</Markdown>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 스킬 문서 */}
      <SectionTitle hint={data ? data.dir : undefined}>스킬 문서</SectionTitle>
      <p className="mb-3 text-[0.82rem] text-muted">
        autoproposal 폴더의 규격 문서를 그대로 읽어옵니다. 클릭해서 펼쳐 보세요.
      </p>
      <div className="space-y-2">
        {loading ? (
          <p className="text-muted">불러오는 중…</p>
        ) : (
          data?.docs.map((d) => (
            <div key={d.key} className="rounded-xl border border-line bg-bg">
              <button
                onClick={() => setOpenDoc(openDoc === d.key ? null : d.key)}
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
              >
                <span className="font-semibold text-ink">{d.title}</span>
                <span className="flex items-center gap-2">
                  <code className="text-[0.72rem] text-faint">{d.rel}</code>
                  <span className="text-muted">
                    {openDoc === d.key ? "▲" : "▼"}
                  </span>
                </span>
              </button>
              {openDoc === d.key && (
                <div className="border-t border-line px-4 py-4">
                  {d.content ? (
                    <Markdown>{d.content}</Markdown>
                  ) : (
                    <p className="text-[0.84rem] text-warn">
                      파일을 찾을 수 없습니다 ({d.rel}). AUTOPROPOSAL_DIR 환경변수를
                      확인하세요.
                    </p>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
