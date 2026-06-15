"use client";

import { useMembers } from "@/lib/useMembers";
import { inputCls } from "@/components/ui";

/** 작성자(멤버) 선택 드롭다운. value=null이면 "작성자 미지정". */
export function AuthorSelect({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (id: string | null) => void;
}) {
  const { members } = useMembers();
  return (
    <select
      className={inputCls}
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value || null)}
    >
      <option value="">작성자 미지정</option>
      {members.map((m) => (
        <option key={m.id} value={m.id}>
          {m.name}
          {m.role ? ` · ${m.role}` : ""}
        </option>
      ))}
    </select>
  );
}
