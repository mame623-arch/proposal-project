"use client";

import Link from "next/link";
import { keywordColors } from "@/lib/avatar";

/**
 * 키워드 칩. 클릭하면 키워드 허브(/keywords/[name])로 이동해
 * 같은 키워드의 주제 아이디어 + 논문을 한 화면에 모아 본다.
 */
export function KeywordChip({
  name,
  count,
  active = false,
  size = "sm",
}: {
  name: string;
  count?: number;
  active?: boolean;
  size?: "sm" | "md";
}) {
  const c = keywordColors(name);
  const pad = size === "md" ? "px-2.5 py-1 text-[0.8rem]" : "px-2 py-0.5 text-[0.72rem]";
  return (
    <Link
      href={`/keywords/${encodeURIComponent(name)}`}
      className={`inline-flex items-center gap-1 rounded-full border font-semibold transition hover:brightness-95 ${pad}`}
      style={{
        background: active ? c.fg : c.bg,
        color: active ? "#fff" : c.fg,
        borderColor: active ? c.fg : c.border,
      }}
      title={`키워드 "${name}" 모아보기`}
    >
      <span>#{name}</span>
      {typeof count === "number" ? (
        <span
          className="rounded-full px-1 text-[0.65rem] font-bold"
          style={{
            background: active ? "rgba(255,255,255,.25)" : "#fff",
            color: active ? "#fff" : c.fg,
          }}
        >
          {count}
        </span>
      ) : null}
    </Link>
  );
}

/** 비링크 표시용(선택 토글 등). */
export function KeywordTag({
  name,
  onClick,
  active = false,
}: {
  name: string;
  onClick?: () => void;
  active?: boolean;
}) {
  const c = keywordColors(name);
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[0.72rem] font-semibold transition hover:brightness-95"
      style={{
        background: active ? c.fg : c.bg,
        color: active ? "#fff" : c.fg,
        borderColor: active ? c.fg : c.border,
      }}
    >
      #{name}
    </button>
  );
}
