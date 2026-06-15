import { supabase, PROPOSAL_BUCKET } from "./supabase";
import type {
  KeywordStat,
  Meeting,
  Member,
  Paper,
  Proposal,
  ProposalVersion,
  Topic,
} from "./types";

// 오늘 날짜(YYYY-MM-DD, 로컬)
export function today(): string {
  const d = new Date();
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
}

// 키워드 입력 문자열 → 정규화된 배열 ("a, b ,c" → ["a","b","c"])
export function parseKeywords(raw: string): string[] {
  return Array.from(
    new Set(
      raw
        .split(/[,\n]/)
        .map((s) => s.trim())
        .filter(Boolean)
    )
  );
}

// ── members ──────────────────────────────────────────────────
export async function fetchMembers(): Promise<Member[]> {
  const { data, error } = await supabase
    .from("members")
    .select("*")
    .order("sort", { ascending: true })
    .order("name", { ascending: true });
  if (error) throw error;
  return data as Member[];
}

// ── topics (주제) ────────────────────────────────────────────
export async function fetchTopics(): Promise<Topic[]> {
  const { data, error } = await supabase
    .from("topics")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Topic[];
}

export interface TopicInput {
  title: string;
  body: string;
  keywords: string[];
  author_id: string | null;
}

export async function createTopic(input: TopicInput): Promise<Topic> {
  const { data, error } = await supabase
    .from("topics")
    .insert(input)
    .select("*")
    .single();
  if (error) throw error;
  return data as Topic;
}

export async function updateTopic(id: string, input: TopicInput): Promise<void> {
  const { error } = await supabase
    .from("topics")
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteTopic(id: string): Promise<void> {
  const { error } = await supabase.from("topics").delete().eq("id", id);
  if (error) throw error;
}

// ── meetings (회의록) ────────────────────────────────────────
export async function fetchMeetings(): Promise<Meeting[]> {
  const { data, error } = await supabase
    .from("meetings")
    .select("*")
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Meeting[];
}

export interface MeetingInput {
  title: string;
  date: string;
  body: string;
  author_id: string | null;
}

export async function createMeeting(input: MeetingInput): Promise<Meeting> {
  const { data, error } = await supabase
    .from("meetings")
    .insert(input)
    .select("*")
    .single();
  if (error) throw error;
  return data as Meeting;
}

export async function updateMeeting(
  id: string,
  input: MeetingInput
): Promise<void> {
  const { error } = await supabase.from("meetings").update(input).eq("id", id);
  if (error) throw error;
}

export async function deleteMeeting(id: string): Promise<void> {
  const { error } = await supabase.from("meetings").delete().eq("id", id);
  if (error) throw error;
}

// ── papers (논문) ────────────────────────────────────────────
export async function fetchPapers(): Promise<Paper[]> {
  const { data, error } = await supabase
    .from("papers")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Paper[];
}

export interface PaperInput {
  title: string;
  url: string;
  kind: string;
  authors: string;
  note: string;
  keywords: string[];
  added_by: string | null;
}

export async function createPaper(input: PaperInput): Promise<Paper> {
  const { data, error } = await supabase
    .from("papers")
    .insert(input)
    .select("*")
    .single();
  if (error) throw error;
  return data as Paper;
}

export async function updatePaper(id: string, input: PaperInput): Promise<void> {
  const { error } = await supabase.from("papers").update(input).eq("id", id);
  if (error) throw error;
}

export async function deletePaper(id: string): Promise<void> {
  const { error } = await supabase.from("papers").delete().eq("id", id);
  if (error) throw error;
}

// ── proposals + versions (제안서 버전 관리) ───────────────────
export async function fetchProposals(): Promise<Proposal[]> {
  const { data, error } = await supabase
    .from("proposals")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Proposal[];
}

export interface ProposalInput {
  name: string;
  agency: string;
  description: string;
}

export async function createProposal(input: ProposalInput): Promise<Proposal> {
  const { data, error } = await supabase
    .from("proposals")
    .insert(input)
    .select("*")
    .single();
  if (error) throw error;
  return data as Proposal;
}

export async function deleteProposal(id: string): Promise<void> {
  const { error } = await supabase.from("proposals").delete().eq("id", id);
  if (error) throw error;
}

export async function fetchVersions(
  proposalId: string
): Promise<ProposalVersion[]> {
  const { data, error } = await supabase
    .from("proposal_versions")
    .select("*")
    .eq("proposal_id", proposalId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as ProposalVersion[];
}

export interface VersionInput {
  proposal_id: string;
  version_label: string;
  file_path: string | null;
  file_name: string | null;
  file_url: string | null;
  author_id: string | null;
  changelog: string;
}

export async function createVersion(
  input: VersionInput
): Promise<ProposalVersion> {
  const { data, error } = await supabase
    .from("proposal_versions")
    .insert(input)
    .select("*")
    .single();
  if (error) throw error;
  return data as ProposalVersion;
}

export async function updateVersion(
  id: string,
  input: Partial<VersionInput>
): Promise<void> {
  const { error } = await supabase
    .from("proposal_versions")
    .update(input)
    .eq("id", id);
  if (error) throw error;
}

export async function deleteVersion(id: string): Promise<void> {
  const { error } = await supabase
    .from("proposal_versions")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

/** 제안서 파일을 Storage에 업로드하고 경로를 반환. */
export async function uploadProposalFile(
  proposalId: string,
  file: File
): Promise<{ path: string; name: string }> {
  // Supabase Storage 키는 ASCII 안전 문자만 허용하므로 한글 등은 "_"로 치환한다.
  // 원본 파일명은 아래 name 필드로 별도 보존되어 화면 표시에 사용된다.
  const safe =
    file.name.replace(/[^\w.\-]/g, "_").replace(/_{2,}/g, "_").replace(/^_+/, "") ||
    "file";
  const path = `${proposalId}/${Date.now()}_${safe}`;
  const { error } = await supabase.storage
    .from(PROPOSAL_BUCKET)
    .upload(path, file, { upsert: false });
  if (error) throw error;
  return { path, name: file.name };
}

/**
 * Storage 경로 → 공개 다운로드 URL.
 * downloadName을 주면 Content-Disposition으로 그 이름(원본 파일명)으로 저장된다.
 */
export function fileUrl(path: string, downloadName?: string): string {
  return supabase.storage
    .from(PROPOSAL_BUCKET)
    .getPublicUrl(path, downloadName ? { download: downloadName } : undefined)
    .data.publicUrl;
}

// ── keywords (집계) ──────────────────────────────────────────
/** 주제+논문 전체에서 키워드 사용 통계를 집계. */
export async function fetchKeywordStats(): Promise<KeywordStat[]> {
  const [topics, papers] = await Promise.all([fetchTopics(), fetchPapers()]);
  const map = new Map<string, KeywordStat>();
  const bump = (name: string, which: "topic" | "paper") => {
    const cur =
      map.get(name) ?? { name, topicCount: 0, paperCount: 0 };
    if (which === "topic") cur.topicCount += 1;
    else cur.paperCount += 1;
    map.set(name, cur);
  };
  for (const t of topics) for (const k of t.keywords ?? []) bump(k, "topic");
  for (const p of papers) for (const k of p.keywords ?? []) bump(k, "paper");
  return [...map.values()].sort(
    (a, b) =>
      b.topicCount + b.paperCount - (a.topicCount + a.paperCount) ||
      a.name.localeCompare(b.name)
  );
}

/** 특정 키워드를 가진 주제 + 논문을 한 번에 가져온다(키워드 허브). */
export async function fetchByKeyword(
  keyword: string
): Promise<{ topics: Topic[]; papers: Paper[] }> {
  const [topics, papers] = await Promise.all([
    supabase.from("topics").select("*").contains("keywords", [keyword]),
    supabase.from("papers").select("*").contains("keywords", [keyword]),
  ]);
  if (topics.error) throw topics.error;
  if (papers.error) throw papers.error;
  return {
    topics: (topics.data ?? []) as Topic[],
    papers: (papers.data ?? []) as Paper[],
  };
}
