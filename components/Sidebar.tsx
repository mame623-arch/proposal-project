"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Member } from "@/lib/types";
import { useCurrentMemberId } from "@/lib/currentUser";
import { AUTOPROPOSAL_ENABLED } from "@/lib/flags";

const NAV = [
  { href: "/", label: "홈", emoji: "🏠" },
  { href: "/topics", label: "주제", emoji: "💡" },
  { href: "/meetings", label: "회의록", emoji: "📝" },
  { href: "/papers", label: "논문", emoji: "📄" },
  { href: "/keywords", label: "키워드", emoji: "🔗" },
  { href: "/proposals", label: "제안서 버전", emoji: "🗂️" },
  // autoproposal 실행은 로컬 pixt-runner 의존 → 플래그가 켜진 환경에서만 노출
  ...(AUTOPROPOSAL_ENABLED
    ? [{ href: "/autoproposal", label: "autoproposal", emoji: "🤖" }]
    : []),
];

const NOTES = [
  "GPU 공모 → 왜 GPU가 필요한지 제안서로 설득",
  "주제는 키워드로 논문과 연결",
  "초안은 autoproposal로, 검수는 사람이",
];

export default function Sidebar({
  members,
  mobileOpen,
  onNavigate,
}: {
  members: Member[];
  mobileOpen: boolean;
  onNavigate: () => void;
}) {
  const pathname = usePathname();
  const [currentId, setCurrentId] = useCurrentMemberId();

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <aside
      className={`${
        mobileOpen
          ? "fixed inset-y-0 left-0 z-50 flex w-[82%] max-w-[300px]"
          : "hidden"
      } flex-col gap-1 overflow-y-auto border-r border-line bg-surface px-3 pb-6 pt-4 md:sticky md:top-0 md:flex md:h-screen md:w-auto`}
    >
      {/* 브랜드 */}
      <Link
        href="/"
        onClick={onNavigate}
        className="flex items-baseline gap-1.5 px-1.5 pb-0.5 pt-1"
      >
        <span className="text-[1.1rem] font-extrabold text-ink">
          GPU 제안서 허브
        </span>
      </Link>
      <div className="px-1.5 pb-2 text-[0.62rem] font-bold uppercase tracking-[0.06em] text-faint">
        주제 · 논문 · 제안서 버전 관리
      </div>

      {/* 나 선택 */}
      {members.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 px-1.5 pb-2.5">
          <span className="mr-0.5 text-[0.72rem] font-bold text-faint">나</span>
          {members.map((m) => (
            <button
              key={m.id}
              onClick={() => setCurrentId(m.id === currentId ? null : m.id)}
              className={`rounded-full border px-2.5 py-0.5 text-[0.78rem] transition ${
                m.id === currentId
                  ? "border-accent bg-accent text-white"
                  : "border-line bg-bg text-muted hover:border-accent hover:text-accent"
              }`}
            >
              {m.name}
            </button>
          ))}
        </div>
      )}

      {/* 메뉴 */}
      <div className="mb-0.5 mt-2 px-1.5 text-[0.82rem] font-bold text-ink">
        메뉴
      </div>
      <nav className="flex flex-col gap-0.5">
        {NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={`flex items-center gap-2 rounded-[7px] px-2.5 py-1.5 text-[0.84rem] transition ${
              isActive(item.href)
                ? "bg-accentsoft font-semibold text-accent"
                : "text-muted hover:bg-surface2 hover:text-body"
            }`}
          >
            <span>{item.emoji}</span>
            {item.label}
          </Link>
        ))}
      </nav>

      {/* 메모 */}
      <div className="mt-auto rounded-xl border border-line bg-bg p-3">
        <div className="mb-2 text-[0.66rem] font-bold uppercase tracking-wide text-faint">
          이 사이트는
        </div>
        <ul className="space-y-1.5">
          {NOTES.map((d) => (
            <li
              key={d}
              className="flex gap-1.5 text-[0.78rem] leading-snug text-muted"
            >
              <span className="text-accent">·</span>
              <span>{d}</span>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
