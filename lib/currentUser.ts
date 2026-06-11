"use client";

import { useEffect, useState } from "react";

const KEY = "gpuproposal.currentMemberId";

export function getCurrentMemberId(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(KEY);
}

export function setCurrentMemberId(id: string | null) {
  if (typeof window === "undefined") return;
  if (id) window.localStorage.setItem(KEY, id);
  else window.localStorage.removeItem(KEY);
  window.dispatchEvent(new Event("gpuproposal:user-change"));
}

/** 현재 선택된 멤버 id를 반응형으로 제공하는 훅. */
export function useCurrentMemberId(): [string | null, (id: string | null) => void] {
  const [id, setId] = useState<string | null>(null);

  useEffect(() => {
    setId(getCurrentMemberId());
    const sync = () => setId(getCurrentMemberId());
    window.addEventListener("gpuproposal:user-change", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("gpuproposal:user-change", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return [id, setCurrentMemberId];
}
