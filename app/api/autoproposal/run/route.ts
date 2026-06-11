import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * autoproposal 실행 트리거.
 * 사이트의 "실행" 버튼 → 이 라우트 → pixt 서버의 Claude Code 엔드포인트로 전달.
 *
 * 필요한 환경변수(.env.local):
 *   AUTOPROPOSAL_RUN_ENDPOINT  pixt-runner 의 베이스 URL (예: http://pixt:8787)
 *   AUTOPROPOSAL_RUN_TOKEN     (선택) pixt-runner 의 RUNNER_TOKEN 과 동일 값
 *
 * 베이스 URL 에 /run 을 붙여 POST 한다. pixt-runner 는 202 {jobId} 를 즉시 반환하고,
 * 진행 상태는 /api/autoproposal/status 로 폴링한다.
 * 엔드포인트가 비어 있으면 501과 함께 "미설정" 안내를 돌려준다.
 */
export async function POST(req: Request) {
  const endpoint = process.env.AUTOPROPOSAL_RUN_ENDPOINT;
  const token = process.env.AUTOPROPOSAL_RUN_TOKEN;

  let body: { step?: string; prompt?: string; project?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "잘못된 요청" }, { status: 400 });
  }

  if (!endpoint) {
    return NextResponse.json(
      {
        ok: false,
        configured: false,
        error:
          "pixt 서버 연동이 아직 설정되지 않았습니다. .env.local 의 AUTOPROPOSAL_RUN_ENDPOINT 를 설정하세요. 그 전까지는 아래 프롬프트를 복사해 Claude Code에 직접 붙여넣어 사용하세요.",
      },
      { status: 501 }
    );
  }

  const url = endpoint.replace(/\/+$/, "") + "/run";
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        step: body.step ?? null,
        prompt: body.prompt ?? "",
        project: body.project ?? null,
      }),
    });
    const text = await res.text();
    let data: unknown = text;
    try {
      data = JSON.parse(text);
    } catch {
      /* keep as text */
    }
    return NextResponse.json(
      { ok: res.ok, configured: true, status: res.status, data },
      { status: res.ok ? 200 : 502 }
    );
  } catch (e) {
    return NextResponse.json(
      { ok: false, configured: true, error: (e as Error).message },
      { status: 502 }
    );
  }
}
