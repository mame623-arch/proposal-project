import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(url && anonKey);

// 키 설정 전에도 UI가 렌더되도록 무해한 placeholder로 폴백한다.
// (미설정 시 화면 상단에 "Supabase 미설정" 안내가 뜬다.)
export const supabase = createClient(
  url ?? "https://placeholder.supabase.co",
  anonKey ?? "placeholder-anon-key"
);

// 제안서 파일 업로드용 Storage 버킷 이름
export const PROPOSAL_BUCKET = "proposal-files";
