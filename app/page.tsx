"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type {
  KeywordStat,
  Meeting,
  Paper,
  Proposal,
  Topic,
} from "@/lib/types";
import {
  fetchKeywordStats,
  fetchMeetings,
  fetchPapers,
  fetchProposals,
  fetchTopics,
} from "@/lib/db";
import { isSupabaseConfigured } from "@/lib/supabase";
import { KeywordChip } from "@/components/KeywordChip";
import { EmptyState, SectionTitle, formatDate } from "@/components/ui";

function StatCard({
  href,
  label,
  count,
  emoji,
}: {
  href: string;
  label: string;
  count: number | null;
  emoji: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-xl border border-line bg-bg p-4 transition hover:border-accent hover:shadow-sm"
    >
      <div className="text-[1.4rem]">{emoji}</div>
      <div className="mt-1 text-[1.5rem] font-extrabold leading-none text-ink">
        {count ?? "–"}
      </div>
      <div className="mt-1 text-[0.82rem] text-muted">{label}</div>
    </Link>
  );
}

export default function HomePage() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [papers, setPapers] = useState<Paper[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [keywords, setKeywords] = useState<KeywordStat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const [t, m, p, pr, kw] = await Promise.all([
          fetchTopics(),
          fetchMeetings(),
          fetchPapers(),
          fetchProposals(),
          fetchKeywordStats(),
        ]);
        setTopics(t);
        setMeetings(m);
        setPapers(p);
        setProposals(pr);
        setKeywords(kw);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="mx-auto max-w-[1100px] px-5 py-7 md:px-10">
      <h1>홈</h1>
      <p className="mt-1 text-muted">
        GPU 공모에 낼 제안서를 준비합니다 — 주제를 모으고, 근거 논문을 키워드로
        연결하고, 제안서 버전을 관리합니다.
      </p>

      {loading ? (
        <p className="mt-8 text-muted">불러오는 중…</p>
      ) : (
        <>
          {/* 요약 카드 */}
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard href="/topics" label="주제" count={topics.length} emoji="💡" />
            <StatCard
              href="/papers"
              label="논문"
              count={papers.length}
              emoji="📄"
            />
            <StatCard
              href="/meetings"
              label="회의록"
              count={meetings.length}
              emoji="📝"
            />
            <StatCard
              href="/proposals"
              label="제안서"
              count={proposals.length}
              emoji="🗂️"
            />
          </div>

          {/* 키워드 클라우드 */}
          <SectionTitle hint={<Link href="/keywords" className="text-accent">전체 키워드 →</Link>}>
            키워드
          </SectionTitle>
          {keywords.length === 0 ? (
            <EmptyState>
              주제·논문에 키워드를 달면 여기에서 한눈에 연결됩니다.
            </EmptyState>
          ) : (
            <div className="flex flex-wrap gap-2">
              {keywords.slice(0, 24).map((k) => (
                <KeywordChip
                  key={k.name}
                  name={k.name}
                  count={k.topicCount + k.paperCount}
                  size="md"
                />
              ))}
            </div>
          )}

          {/* 최근 주제 */}
          <SectionTitle hint={<Link href="/topics" className="text-accent">더보기 →</Link>}>
            최근 주제
          </SectionTitle>
          {topics.length === 0 ? (
            <EmptyState>아직 주제가 없습니다.</EmptyState>
          ) : (
            <div className="space-y-2">
              {topics.slice(0, 4).map((t) => (
                <Link
                  key={t.id}
                  href="/topics"
                  className="flex items-center justify-between gap-3 rounded-lg border border-line bg-bg px-4 py-3 transition hover:border-accent"
                >
                  <span className="truncate font-medium text-ink">
                    {t.title}
                  </span>
                  <span className="flex shrink-0 gap-1">
                    {(t.keywords ?? []).slice(0, 3).map((k) => (
                      <span
                        key={k}
                        className="rounded-full bg-surface2 px-2 py-0.5 text-[0.68rem] text-muted"
                      >
                        #{k}
                      </span>
                    ))}
                  </span>
                </Link>
              ))}
            </div>
          )}

          {/* 최근 회의록 */}
          <SectionTitle hint={<Link href="/meetings" className="text-accent">더보기 →</Link>}>
            최근 회의록
          </SectionTitle>
          {meetings.length === 0 ? (
            <EmptyState>아직 회의록이 없습니다.</EmptyState>
          ) : (
            <div className="space-y-2">
              {meetings.slice(0, 3).map((m) => (
                <Link
                  key={m.id}
                  href="/meetings"
                  className="flex items-center justify-between gap-3 rounded-lg border border-line bg-bg px-4 py-3 transition hover:border-accent"
                >
                  <span className="truncate font-medium text-ink">
                    {m.title}
                  </span>
                  <span className="shrink-0 text-[0.78rem] text-muted">
                    {formatDate(m.date)}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
