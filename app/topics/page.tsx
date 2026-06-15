"use client";

import { useEffect, useState } from "react";
import type { Topic } from "@/lib/types";
import {
  createTopic,
  deleteTopic,
  fetchTopics,
  parseKeywords,
  updateTopic,
} from "@/lib/db";
import { isSupabaseConfigured } from "@/lib/supabase";
import { useMembers } from "@/lib/useMembers";
import { useCurrentMemberId } from "@/lib/currentUser";
import Markdown from "@/components/Markdown";
import { AuthorSelect } from "@/components/AuthorSelect";
import { KeywordChip } from "@/components/KeywordChip";
import {
  EmptyState,
  Field,
  GhostBtn,
  MemberAvatarName,
  PrimaryBtn,
  formatDateTime,
  inputCls,
} from "@/components/ui";

const PLACEHOLDER = `## 한 줄 요약
이 주제가 왜 GPU를 필요로 하는지 한 문장으로.

## 왜 GPU가 필요한가
- 근거 1
- 근거 2

## 제안서에 쓸 논리
1. 문제 →
2. 격차 →
3. 해법 →`;

interface Draft {
  id?: string;
  title: string;
  body: string;
  keywords: string;
  author_id: string | null;
}

const EMPTY: Draft = { title: "", body: "", keywords: "", author_id: null };

export default function TopicsPage() {
  const { byId } = useMembers();
  const [currentId] = useCurrentMemberId();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [tab, setTab] = useState<"write" | "preview">("write");
  const [saving, setSaving] = useState(false);

  const load = () =>
    fetchTopics()
      .then(setTopics)
      .catch((e) => console.error(e))
      .finally(() => setLoading(false));

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    load();
  }, []);

  async function save() {
    if (!draft || !draft.title.trim()) return;
    setSaving(true);
    try {
      const base = {
        title: draft.title.trim(),
        body: draft.body,
        keywords: parseKeywords(draft.keywords),
        author_id: draft.author_id,
      };
      if (draft.id) {
        await updateTopic(draft.id, base);
      } else {
        await createTopic(base);
      }
      setDraft(null);
      setTab("write");
      await load();
    } catch (e) {
      console.error(e);
      alert("저장 실패: " + (e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("이 주제를 삭제할까요?")) return;
    await deleteTopic(id);
    await load();
  }

  return (
    <div className="mx-auto max-w-[1100px] px-5 py-7 md:px-10">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1>주제</h1>
          <p className="mt-1 text-muted">
            생각나는 제안서 주제를 마크다운으로 기록합니다. 키워드를 달면 같은
            키워드의 다른 주제·논문이 한 화면에 모입니다.
          </p>
        </div>
        {!draft && (
          <PrimaryBtn onClick={() => setDraft({ ...EMPTY, author_id: currentId })}>
            + 새 주제
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
                placeholder="예: 안전성 검증에 대규모 시뮬레이션이 필요한 이유"
                onChange={(e) =>
                  setDraft({ ...draft, title: e.target.value })
                }
              />
            </Field>

            <div className="grid gap-3 sm:grid-cols-[1fr_220px]">
              <Field
                label="키워드"
                hint="쉼표로 구분 · 논문 페이지의 키워드와 자동 연결됩니다"
              >
                <input
                  className={inputCls}
                  value={draft.keywords}
                  placeholder="safety, multi-agent, LLM-inference"
                  onChange={(e) =>
                    setDraft({ ...draft, keywords: e.target.value })
                  }
                />
              </Field>
              <Field label="작성자">
                <AuthorSelect
                  value={draft.author_id}
                  onChange={(id) => setDraft({ ...draft, author_id: id })}
                />
              </Field>
            </div>

            <div>
              <div className="mb-1 flex items-center gap-1">
                <button
                  onClick={() => setTab("write")}
                  className={`rounded-md px-2.5 py-1 text-[0.76rem] font-semibold ${
                    tab === "write"
                      ? "bg-accentsoft text-accent"
                      : "text-muted hover:text-body"
                  }`}
                >
                  작성
                </button>
                <button
                  onClick={() => setTab("preview")}
                  className={`rounded-md px-2.5 py-1 text-[0.76rem] font-semibold ${
                    tab === "preview"
                      ? "bg-accentsoft text-accent"
                      : "text-muted hover:text-body"
                  }`}
                >
                  미리보기
                </button>
                <span className="ml-1 text-[0.7rem] text-faint">
                  마크다운 지원 (표, 체크박스, 코드블록 등)
                </span>
              </div>
              {tab === "write" ? (
                <textarea
                  className={`${inputCls} min-h-[260px] font-mono text-[0.82rem] leading-relaxed`}
                  value={draft.body}
                  placeholder={PLACEHOLDER}
                  onChange={(e) =>
                    setDraft({ ...draft, body: e.target.value })
                  }
                />
              ) : (
                <div className="min-h-[260px] rounded-lg border border-line bg-surface p-4">
                  {draft.body.trim() ? (
                    <Markdown>{draft.body}</Markdown>
                  ) : (
                    <span className="text-[0.85rem] text-faint">
                      미리볼 내용이 없습니다.
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 pt-1">
              <PrimaryBtn onClick={save} disabled={saving || !draft.title.trim()}>
                {saving ? "저장 중…" : draft.id ? "수정 저장" : "주제 저장"}
              </PrimaryBtn>
              <GhostBtn
                onClick={() => {
                  setDraft(null);
                  setTab("write");
                }}
              >
                취소
              </GhostBtn>
            </div>
          </div>
        </div>
      )}

      {/* 목록 */}
      <div className="mt-6 space-y-4">
        {loading ? (
          <p className="text-muted">불러오는 중…</p>
        ) : topics.length === 0 ? (
          <EmptyState>
            아직 주제가 없습니다. <b>+ 새 주제</b>로 첫 아이디어를 기록하세요.
          </EmptyState>
        ) : (
          topics.map((t) => (
            <article
              key={t.id}
              className="rounded-xl border border-line bg-bg p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <h2 className="leading-snug">{t.title}</h2>
                <div className="flex shrink-0 gap-1">
                  <GhostBtn
                    onClick={() =>
                      setDraft({
                        id: t.id,
                        title: t.title,
                        body: t.body,
                        keywords: (t.keywords ?? []).join(", "),
                        author_id: t.author_id,
                      })
                    }
                  >
                    수정
                  </GhostBtn>
                  <GhostBtn onClick={() => remove(t.id)}>삭제</GhostBtn>
                </div>
              </div>

              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.78rem] text-muted">
                <MemberAvatarName member={byId.get(t.author_id ?? "")} />
                <span>{formatDateTime(t.updated_at)}</span>
              </div>

              {t.keywords?.length > 0 && (
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {t.keywords.map((k) => (
                    <KeywordChip key={k} name={k} />
                  ))}
                </div>
              )}

              {t.body.trim() && (
                <div className="mt-3 border-t border-line pt-3">
                  <Markdown>{t.body}</Markdown>
                </div>
              )}
            </article>
          ))
        )}
      </div>
    </div>
  );
}
