"use client";

import { useEffect, useMemo, useState } from "react";
import type { Member } from "./types";
import { fetchMembers } from "./db";
import { isSupabaseConfigured } from "./supabase";

/** 멤버 목록 + id→멤버 조회 맵을 제공하는 클라이언트 훅. */
export function useMembers() {
  const [members, setMembers] = useState<Member[]>([]);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    fetchMembers()
      .then(setMembers)
      .catch((e) => console.error("멤버 로드 실패", e));
  }, []);

  const byId = useMemo(
    () => new Map(members.map((m) => [m.id, m])),
    [members]
  );

  return { members, byId };
}
