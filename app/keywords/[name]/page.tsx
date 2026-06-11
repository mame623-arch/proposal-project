"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import type { Paper, Topic } from "@/lib/types";
import { fetchByKeyword } from "@/lib/db";
import { isSupabaseConfigured } from "@/lib/supabase";
import { useMembers } from "@/lib/useMembers";
import Markdown from "@/components/Markdown";
import { KeywordChip } from "@/components/KeywordChip";
import {
  EmptyState,
  MemberAvatarName,
  SectionTitle,
  formatDate,
  formatDateTime,
} from "@/components/ui";
import { keywordColors } from "@/lib/avatar";

export default function KeywordHubPage() {
  const params = useParams<{ name: string }>();
  const name = decodeURIComponent(
    Array.isArray(params.name) ? params.name[0] : params.name
  );
  const { byId } = useMembers();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [papers, setPapers] = useState<Paper[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    fetchByKeyword(name)
      .then(({ topics, papers }) => {
        setTopics(topics);
        setPapers(papers);
      })
      .catch((e) => console.error(e))
      .finally(() => setLoading(false));
  }, [name]);

  const c = keywordColors(name);

  return (
    <div className="mx-auto max-w-[1100px] px-5 py-7 md:px-10">
      <Link
        href="/keywords"
        className="text-[0.8rem] text-muted hover:text-accent"
      >
        ← 전체 키워드
      </Link>

      <div className="mt-2 flex flex-wrap items-center gap-3">
        <span
          className="inline-flex items-center rounded-full border px-3 py-1 text-[1.05rem] font-extrabold"
          style={{ background: c.bg, color: c.fg, borderColor: c.border }}
        >
          #{name}
        </span>
        <span className="text-[0.85rem] text-muted">
          주제 {topics.length} · 논문 {papers.length}
        </span>
      </div>
      <p className="mt-2 text-muted">
        이 키워드로 연결된 주제 아이디어와 근거 논문을 한 화면에서 봅니다.
      </p>

      {loading ? (
        <p className="mt-8 text-muted">불러오는 중…</p>
      ) : topics.length === 0 && papers.length === 0 ? (
        <div className="mt-6">
          <EmptyState>
            이 키워드를 가진 주제나 논문이 없습니다.
          </EmptyState>
        </div>
      ) : (
        <>
          {/* 이 키워드의 주제 아이디어 */}
          <SectionTitle
            hint={<Link href="/topics" className="text-accent">주제 페이지 →</Link>}
          >
            이 키워드의 주제 아이디어
          </SectionTitle>
          {topics.length === 0 ? (
            <EmptyState>해당 키워드의 주제가 아직 없습니다.</EmptyState>
          ) : (
            <div className="space-y-4">
              {topics.map((t) => (
                <article
                  key={t.id}
                  className="rounded-xl border border-line bg-bg p-5"
                >
                  <h2 className="leading-snug">{t.title}</h2>
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.78rem] text-muted">
                    <MemberAvatarName member={byId.get(t.author_id ?? "")} />
                    <span>{formatDateTime(t.updated_at)}</span>
                  </div>
                  {t.keywords?.length > 0 && (
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {t.keywords.map((k) => (
                        <KeywordChip key={k} name={k} active={k === name} />
                      ))}
                    </div>
                  )}
                  {t.body.trim() && (
                    <div className="mt-3 border-t border-line pt-3">
                      <Markdown>{t.body}</Markdown>
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}

          {/* 이 키워드의 논문 */}
          <SectionTitle
            hint={<Link href="/papers" className="text-accent">논문 페이지 →</Link>}
          >
            이 키워드의 논문
          </SectionTitle>
          {papers.length === 0 ? (
            <EmptyState>해당 키워드의 논문이 아직 없습니다.</EmptyState>
          ) : (
            <div className="space-y-3">
              {papers.map((p) => (
                <article
                  key={p.id}
                  className="rounded-xl border border-line bg-bg p-4"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-md bg-surface2 px-1.5 py-0.5 text-[0.66rem] font-bold uppercase tracking-wide text-muted">
                      {p.kind || "link"}
                    </span>
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
                  {p.keywords?.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {p.keywords.map((k) => (
                        <KeywordChip key={k} name={k} active={k === name} />
                      ))}
                    </div>
                  )}
                  {p.note.trim() && (
                    <p className="mt-2 whitespace-pre-wrap text-[0.84rem] text-body">
                      {p.note}
                    </p>
                  )}
                  <div className="mt-2 text-[0.74rem] text-faint">
                    {formatDate(p.created_at)}
                  </div>
                </article>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
