import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * pixt-runner 의 작업 상태를 프록시한다.
 * GET /api/autoproposal/status?jobId=<id>  →  pixt-runner GET /status/<id>
 */
export async function GET(req: Request) {
  const endpoint = process.env.AUTOPROPOSAL_RUN_ENDPOINT;
  const token = process.env.AUTOPROPOSAL_RUN_TOKEN;
  const jobId = new URL(req.url).searchParams.get("jobId");

  if (!endpoint) {
    return NextResponse.json(
      { ok: false, configured: false, error: "실행 연동 미설정" },
      { status: 501 }
    );
  }
  if (!jobId) {
    return NextResponse.json(
      { ok: false, error: "jobId 가 필요합니다" },
      { status: 400 }
    );
  }

  const url =
    endpoint.replace(/\/+$/, "") + "/status/" + encodeURIComponent(jobId);
  try {
    const res = await fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      cache: "no-store",
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.ok ? 200 : res.status });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: (e as Error).message },
      { status: 502 }
    );
  }
}
