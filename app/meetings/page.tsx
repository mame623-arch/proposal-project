"use client";

import { useEffect, useState } from "react";
import type { Meeting } from "@/lib/types";
import {
  createMeeting,
  deleteMeeting,
  fetchMeetings,
  today,
  updateMeeting,
} from "@/lib/db";
import { isSupabaseConfigured } from "@/lib/supabase";
import { useMembers } from "@/lib/useMembers";
import { useCurrentMemberId } from "@/lib/currentUser";
import Markdown from "@/components/Markdown";
import { AuthorSelect } from "@/components/AuthorSelect";
import {
  EmptyState,
  Field,
  GhostBtn,
  MemberAvatarName,
  PrimaryBtn,
  formatDate,
  inputCls,
  weekday,
} from "@/components/ui";

const PLACEHOLDER = `## 안건
1.
2.

## 결정사항
-

## 다음 할 일
- [ ] `;

interface Draft {
  id?: string;
  title: string;
  date: string;
  body: string;
  author_id: string | null;
}

export default function MeetingsPage() {
  const { byId } = useMembers();
  const [currentId] = useCurrentMemberId();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [tab, setTab] = useState<"write" | "preview">("write");
  const [saving, setSaving] = useState(false);

  const load = () =>
    fetchMeetings()
      .then(setMeetings)
      .catch((e) => console.error(e))
      .finally(() => setLoading(false));

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    load();
  }, []);

  function newDraft() {
    setDraft({ title: "", date: today(), body: "", author_id: currentId });
    setTab("write");
  }

  async function save() {
    if (!draft || !draft.title.trim()) return;
    setSaving(true);
    try {
      const base = {
        title: draft.title.trim(),
        date: draft.date,
        body: draft.body,
        author_id: draft.author_id,
      };
      if (draft.id) {
        await updateMeeting(draft.id, base);
      } else {
        await createMeeting(base);
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
    if (!confirm("이 회의록을 삭제할까요?")) return;
    await deleteMeeting(id);
    await load();
  }

  return (
    <div className="mx-auto max-w-[1100px] px-5 py-7 md:px-10">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1>회의록</h1>
          <p className="mt-1 text-muted">
            회의 내용을 마크다운으로 작성하면 보기 좋게 렌더됩니다.
          </p>
        </div>
        {!draft && <PrimaryBtn onClick={newDraft}>+ 새 회의록</PrimaryBtn>}
      </div>

      {draft && (
        <div className="mt-6 rounded-xl border border-line bg-bg p-5">
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-[1fr_160px_180px]">
              <Field label="제목">
                <input
                  className={inputCls}
                  value={draft.title}
                  placeholder="예: GPU 제안서 킥오프"
                  onChange={(e) =>
                    setDraft({ ...draft, title: e.target.value })
                  }
                />
              </Field>
              <Field label="날짜">
                <input
                  type="date"
                  className={inputCls}
                  value={draft.date}
                  onChange={(e) =>
                    setDraft({ ...draft, date: e.target.value })
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
              <PrimaryBtn
                onClick={save}
                disabled={saving || !draft.title.trim()}
              >
                {saving ? "저장 중…" : draft.id ? "수정 저장" : "회의록 저장"}
              </PrimaryBtn>
              <GhostBtn onClick={() => setDraft(null)}>취소</GhostBtn>
            </div>
          </div>
        </div>
      )}

      <div className="mt-6 space-y-4">
        {loading ? (
          <p className="text-muted">불러오는 중…</p>
        ) : meetings.length === 0 ? (
          <EmptyState>
            아직 회의록이 없습니다. <b>+ 새 회의록</b>으로 작성하세요.
          </EmptyState>
        ) : (
          meetings.map((m) => (
            <article
              key={m.id}
              className="rounded-xl border border-line bg-bg p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="leading-snug">{m.title}</h2>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.78rem] text-muted">
                    <span className="font-semibold text-accent">
                      {formatDate(m.date)} {weekday(m.date)}
                    </span>
                    <MemberAvatarName member={byId.get(m.author_id ?? "")} />
                  </div>
                </div>
                <div className="flex shrink-0 gap-1">
                  <GhostBtn
                    onClick={() =>
                      setDraft({
                        id: m.id,
                        title: m.title,
                        date: m.date.slice(0, 10),
                        body: m.body,
                        author_id: m.author_id,
                      })
                    }
                  >
                    수정
                  </GhostBtn>
                  <GhostBtn onClick={() => remove(m.id)}>삭제</GhostBtn>
                </div>
              </div>

              {m.body.trim() && (
                <div className="mt-3 border-t border-line pt-3">
                  <Markdown>{m.body}</Markdown>
                </div>
              )}
            </article>
          ))
        )}
      </div>
    </div>
  );
}
