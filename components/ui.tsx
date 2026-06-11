import type { ReactNode } from "react";
import type { Member } from "@/lib/types";
import { avatarColors, avatarLabel } from "@/lib/avatar";

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-xl border border-line bg-bg p-5 ${className}`}>
      {children}
    </div>
  );
}

export function SectionTitle({
  children,
  hint,
}: {
  children: ReactNode;
  hint?: ReactNode;
}) {
  return (
    <div className="mb-2 mt-7 flex items-baseline justify-between gap-3">
      <h2>{children}</h2>
      {hint ? <span className="text-[0.82rem] text-muted">{hint}</span> : null}
    </div>
  );
}

export function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  const { bg, fg } = avatarColors(name);
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full font-bold"
      style={{
        width: size,
        height: size,
        background: bg,
        color: fg,
        fontSize: size * 0.4,
      }}
    >
      {avatarLabel(name)}
    </span>
  );
}

export function MemberAvatarName({
  member,
  size = 28,
}: {
  member: Member | null | undefined;
  size?: number;
}) {
  if (!member)
    return <span className="text-[0.82rem] text-faint">작성자 미지정</span>;
  return (
    <span className="inline-flex items-center gap-2">
      <Avatar name={member.name} size={size} />
      <span className="font-medium text-ink">{member.name}</span>
    </span>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-line bg-surface px-5 py-10 text-center text-[0.9rem] text-muted">
      {children}
    </div>
  );
}

export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="block">
      <div className="mb-1 flex items-baseline gap-2">
        <span className="text-[0.78rem] font-semibold text-ink">{label}</span>
        {hint ? <span className="text-[0.7rem] text-faint">{hint}</span> : null}
      </div>
      {children}
    </label>
  );
}

export const inputCls =
  "w-full rounded-lg border border-line bg-bg px-3 py-2 text-[0.88rem] text-ink outline-none transition focus:border-accent focus:ring-2 focus:ring-accentsoft";

export function PrimaryBtn({
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`rounded-lg bg-accent px-4 py-2 text-[0.85rem] font-semibold text-white transition hover:brightness-105 disabled:opacity-50 ${
        props.className ?? ""
      }`}
    >
      {children}
    </button>
  );
}

export function GhostBtn({
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`rounded-lg border border-line bg-bg px-3 py-1.5 text-[0.8rem] font-medium text-muted transition hover:border-accent hover:text-accent disabled:opacity-50 ${
        props.className ?? ""
      }`}
    >
      {children}
    </button>
  );
}

export function formatDate(d?: string | null): string {
  if (!d) return "";
  return d.slice(0, 10).replaceAll("-", ".");
}

export function formatDateTime(d?: string | null): string {
  if (!d) return "";
  const dt = new Date(d);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${dt.getFullYear()}.${pad(dt.getMonth() + 1)}.${pad(
    dt.getDate()
  )} ${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
}

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];
export function weekday(d?: string | null): string {
  if (!d) return "";
  return WEEKDAYS[new Date(d + "T00:00:00").getDay()] + "요일";
}
