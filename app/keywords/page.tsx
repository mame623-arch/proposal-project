"use client";

import { useEffect, useState } from "react";
import type { KeywordStat } from "@/lib/types";
import { fetchKeywordStats } from "@/lib/db";
import { isSupabaseConfigured } from "@/lib/supabase";
import { KeywordChip } from "@/components/KeywordChip";
import { EmptyState } from "@/components/ui";

export default function KeywordsPage() {
  const [stats, setStats] = useState<KeywordStat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    fetchKeywordStats()
      .then(setStats)
      .catch((e) => console.error(e))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto max-w-[1100px] px-5 py-7 md:px-10">
      <h1>키워드</h1>
      <p className="mt-1 text-muted">
        키워드는 주제 아이디어와 논문을 잇는 연결고리입니다. 키워드를 누르면 그
        키워드를 가진 주제와 논문을 한 화면에 모아 봅니다.
      </p>

      <div className="mt-6">
        {loading ? (
          <p className="text-muted">불러오는 중…</p>
        ) : stats.length === 0 ? (
          <EmptyState>
            아직 키워드가 없습니다. 주제·논문에 키워드를 달면 여기에 모입니다.
          </EmptyState>
        ) : (
          <div className="overflow-hidden rounded-xl border border-line">
            <table className="w-full text-[0.88rem]">
              <thead>
                <tr className="border-b border-line bg-surface text-left text-[0.74rem] uppercase tracking-wide text-faint">
                  <th className="px-4 py-2.5 font-bold">키워드</th>
                  <th className="px-4 py-2.5 text-center font-bold">주제</th>
                  <th className="px-4 py-2.5 text-center font-bold">논문</th>
                  <th className="px-4 py-2.5 text-center font-bold">합계</th>
                </tr>
              </thead>
              <tbody>
                {stats.map((k) => (
                  <tr
                    key={k.name}
                    className="border-b border-line last:border-0 hover:bg-surface"
                  >
                    <td className="px-4 py-2.5">
                      <KeywordChip name={k.name} size="md" />
                    </td>
                    <td className="px-4 py-2.5 text-center text-muted">
                      {k.topicCount}
                    </td>
                    <td className="px-4 py-2.5 text-center text-muted">
                      {k.paperCount}
                    </td>
                    <td className="px-4 py-2.5 text-center font-bold text-ink">
                      {k.topicCount + k.paperCount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
