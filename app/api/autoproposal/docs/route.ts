import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

export const dynamic = "force-dynamic";

// autoproposal 스킬 폴더 (기본: 형제 디렉터리, env로 override 가능)
const SKILL_DIR =
  process.env.AUTOPROPOSAL_DIR ??
  path.join(process.cwd(), "..", "autoproposal");

// 사이트에서 보여줄 스킬 문서들 (스킬 = 이 .md들의 집합)
const DOCS: { key: string; title: string; rel: string }[] = [
  { key: "readme", title: "README — 전체 사용법", rel: "README.md" },
  { key: "claude", title: "CLAUDE.md — 미션·디렉터리·워크플로우", rel: "CLAUDE.md" },
  {
    key: "analyze",
    title: "① 공고문 분석 규격",
    rel: "announcement/공고문분석.md",
  },
  { key: "style", title: "② 작성 스타일 규약", rel: "reference/스타일.md" },
  {
    key: "transform",
    title: "③ 포맷 변환 절차 (HWP/HWPX → HTML)",
    rel: "transformer/SKILL.md",
  },
  { key: "write", title: "④ 양식 채움 9단계 작성 규격", rel: "proposal/작성.md" },
];

async function readSafe(rel: string): Promise<string | null> {
  // 경로 탈출 방지: SKILL_DIR 밖은 거부
  const full = path.resolve(SKILL_DIR, rel);
  if (!full.startsWith(path.resolve(SKILL_DIR))) return null;
  try {
    return await fs.readFile(full, "utf8");
  } catch {
    return null;
  }
}

export async function GET() {
  const docs = await Promise.all(
    DOCS.map(async (d) => ({
      key: d.key,
      title: d.title,
      rel: d.rel,
      content: await readSafe(d.rel),
    }))
  );
  const runConfigured = Boolean(process.env.AUTOPROPOSAL_RUN_ENDPOINT);
  return NextResponse.json({ dir: SKILL_DIR, runConfigured, docs });
}
