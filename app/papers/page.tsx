"use client";

import { useEffect, useMemo, useState } from "react";
import type { Paper } from "@/lib/types";
import {
  createPaper,
  deletePaper,
  fetchPapers,
  parseKeywords,
  updatePaper,
} from "@/lib/db";
import { isSupabaseConfigured } from "@/lib/supabase";
import { useMembers } from "@/lib/useMembers";
import { useCurrentMemberId } from "@/lib/currentUser";
import { AuthorSelect } from "@/components/AuthorSelect";
import { KeywordChip, KeywordTag } from "@/components/KeywordChip";
import {
  EmptyState,
  Field,
  GhostBtn,
  MemberAvatarName,
  PrimaryBtn,
  formatDate,
  inputCls,
} from "@/components/ui";

const KINDS = ["pdf", "html", "arxiv", "doi", "기타"];

interface Draft {
  id?: string;
  title: string;
  url: string;
  kind: string;
  authors: string;
  note: string;
  keywords: string;
  added_by: string | null;
}

const EMPTY: Draft = {
  title: "",
  url: "",
  kind: "pdf",
  authors: "",
  note: "",
  keywords: "",
  added_by: null,
};

function KindBadge({ kind }: { kind: string }) {
  return (
    <span className="rounded-md bg-surface2 px-1.5 py-0.5 text-[0.66rem] font-bold uppercase tracking-wide text-muted">
      {kind || "link"}
    </span>
  );
}

export default function PapersPage() {
  const { byId } = useMembers();
  const [currentId] = useCurrentMemberId();
  const [papers, setPapers] = useState<Paper[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<string | null>(null);

  const load = () =>
    fetchPapers()
      .then(setPapers)
      .catch((e) => console.error(e))
      .finally(() => setLoading(false));

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    load();
  }, []);

  // 페이지 내 키워드 필터 후보 (등장 빈도순)
  const allKeywords = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of papers)
      for (const k of p.keywords ?? []) m.set(k, (m.get(k) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }, [papers]);

  const shown = useMemo(
    () =>
      filter ? papers.filter((p) => p.keywords?.includes(filter)) : papers,
    [papers, filter]
  );

  async function save() {
    if (!draft || !draft.title.trim()) return;
    setSaving(true);
    try {
      const base = {
        title: draft.title.trim(),
        url: draft.url.trim(),
        kind: draft.kind,
        authors: draft.authors.trim(),
        note: draft.note,
        keywords: parseKeywords(draft.keywords),
        added_by: draft.added_by,
      };
      if (draft.id) {
        await updatePaper(draft.id, base);
      } else {
        await createPaper(base);
      }
      setDraft(null);
      await load();
    } catch (e) {
      console.error(e);
      alert("저장 실패: " + (e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("이 논문을 삭제할까요?")) return;
    await deletePaper(id);
    await load();
  }

  return (
    <div className="mx-auto max-w-[1100px] px-5 py-7 md:px-10">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1>논문</h1>
          <p className="mt-1 text-muted">
            주제를 뒷받침할 논문 링크를 모읍니다. 키워드를 누르면 그 키워드의
            주제 아이디어와 논문을 한 화면에서 봅니다.
          </p>
        </div>
        {!draft && (
          <PrimaryBtn onClick={() => setDraft({ ...EMPTY, added_by: currentId })}>
            + 논문 추가
          </PrimaryBtn>
        )}
      </div>

      {/* 에디터 */}
      {draft && (
        <div className="mt-6 rounded-xl border border-line bg-bg p-5">
          <div className="space-y-3">
            <Field label="제목">
              <input
                className={inputCls}
                value={draft.title}
                placeholder="논문 제목"
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              />
            </Field>
            <div className="grid gap-3 sm:grid-cols-[1fr_140px]">
              <Field label="링크 (URL)" hint="html, pdf, arxiv 등">
                <input
                  className={inputCls}
                  value={draft.url}
                  placeholder="https://arxiv.org/pdf/..."
                  onChange={(e) => setDraft({ ...draft, url: e.target.value })}
                />
              </Field>
              <Field label="형식">
                <select
                  className={inputCls}
                  value={draft.kind}
                  onChange={(e) =>
                    setDraft({ ...draft, kind: e.target.value })
                  }
                >
                  {KINDS.map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <div className="grid gap-3 sm:grid-cols-[1fr_220px]">
              <Field label="저자 (선택)" hint="논문 저자">
                <input
                  className={inputCls}
                  value={draft.authors}
                  placeholder="예: Ashish Vaswani 외"
                  onChange={(e) =>
                    setDraft({ ...draft, authors: e.target.value })
                  }
                />
              </Field>
              <Field label="등록자" hint="이 논문을 추가한 팀원">
                <AuthorSelect
                  value={draft.added_by}
                  onChange={(id) => setDraft({ ...draft, added_by: id })}
                />
              </Field>
            </div>
            <Field
              label="키워드"
              hint="쉼표로 구분 · 주제 페이지의 키워드와 연결됩니다"
            >
              <input
                className={inputCls}
                value={draft.keywords}
                placeholder="safety, LLM-inference"
                onChange={(e) =>
                  setDraft({ ...draft, keywords: e.target.value })
                }
              />
            </Field>
            <Field label="메모 (선택)" hint="어떤 주제에 쓸지">
              <textarea
                className={`${inputCls} min-h-[70px]`}
                value={draft.note}
                placeholder="이 논문을 어디에 인용/근거로 쓸지"
                onChange={(e) => setDraft({ ...draft, note: e.target.value })}
              />
            </Field>
            <div className="flex items-center gap-2 pt-1">
              <PrimaryBtn
                onClick={save}
                disabled={saving || !draft.title.trim()}
              >
                {saving ? "저장 중…" : draft.id ? "수정 저장" : "논문 저장"}
              </PrimaryBtn>
              <GhostBtn onClick={() => setDraft(null)}>취소</GhostBtn>
            </div>
          </div>
        </div>
      )}

      {/* 키워드 필터 */}
      {allKeywords.length > 0 && (
        <div className="mt-6 flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-[0.74rem] font-semibold text-faint">
            필터
          </span>
          <KeywordTag
            name="전체"
            active={filter === null}
            onClick={() => setFilter(null)}
          />
          {allKeywords.map(([k, n]) => (
            <KeywordTag
              key={k}
              name={`${k} (${n})`}
              active={filter === k}
              onClick={() => setFilter(filter === k ? null : k)}
            />
          ))}
        </div>
      )}

      {/* 목록 */}
      <div className="mt-5 space-y-3">
        {loading ? (
          <p className="text-muted">불러오는 중…</p>
        ) : shown.length === 0 ? (
          <EmptyState>
            {filter
              ? `"${filter}" 키워드의 논문이 없습니다.`
              : "아직 논문이 없습니다. + 논문 추가로 등록하세요."}
          </EmptyState>
        ) : (
          shown.map((p) => (
            <article
              key={p.id}
              className="rounded-xl border border-line bg-bg p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <KindBadge kind={p.kind} />
                    {p.url ? (
                      <a
                        href={p.url}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="font-semibold text-ink underline decoration-line underline-offset-2 hover:text-accent hover:decoration-accent"
                      >
                        {p.title}
                      </a>
                    ) : (
                      <span className="font-semibold text-ink">{p.title}</span>
                    )}
                  </div>
                  {p.authors && (
                    <div className="mt-0.5 text-[0.78rem] text-muted">
                      {p.authors}
                    </div>
                  )}
                </div>
                <div className="flex shrink-0 gap-1">
                  <GhostBtn
                    onClick={() =>
                      setDraft({
                        id: p.id,
                        title: p.title,
                        url: p.url,
                        kind: p.kind,
                        authors: p.authors,
                        note: p.note,
                        keywords: (p.keywords ?? []).join(", "),
                        added_by: p.added_by,
                      })
                    }
                  >
                    수정
                  </GhostBtn>
                  <GhostBtn onClick={() => remove(p.id)}>삭제</GhostBtn>
                </div>
              </div>

              {p.keywords?.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {p.keywords.map((k) => (
                    <KeywordChip key={k} name={k} />
                  ))}
                </div>
              )}

              {p.note.trim() && (
                <p className="mt-2 whitespace-pre-wrap text-[0.84rem] text-body">
                  {p.note}
                </p>
              )}

              <div className="mt-2 flex items-center gap-2 text-[0.74rem] text-faint">
                <MemberAvatarName member={byId.get(p.added_by ?? "")} size={20} />
                <span>· {formatDate(p.created_at)}</span>
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  );
}
