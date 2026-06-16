// ── 도메인 타입 ──────────────────────────────────────────────

export interface Member {
  id: string;
  name: string;
  role: string;
  sort: number;
  created_at: string;
}

/** 주제 아이디어 — 마크다운 본문 + 키워드 배열 */
export interface Topic {
  id: string;
  title: string;
  body: string; // 마크다운
  keywords: string[];
  author_id: string | null;
  created_at: string;
  updated_at: string;
}

/** 회의록 — 마크다운 본문 */
export interface Meeting {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  body: string; // 마크다운
  author_id: string | null;
  created_at: string;
}

/** 논문 — 링크 + 키워드 (PDF 본문은 읽지 않음, 링크만) */
export interface Paper {
  id: string;
  title: string;
  url: string;
  kind: string; // 'pdf' | 'html' | 'arxiv' | ...
  authors: string;
  note: string;
  keywords: string[];
  added_by: string | null;
  created_at: string;
}

/** 제안서(사업) — 버전들의 묶음 */
export interface Proposal {
  id: string;
  name: string; // 사업명/제안서명
  agency: string; // 공모 기관 (GPU 제공처)
  description: string;
  created_at: string;
}

/** 제안서 버전 — 파일 + 메타(누가/언제/무엇을 수정) */
export interface ProposalVersion {
  id: string;
  proposal_id: string;
  version_label: string; // 예: v1, v2.1
  file_path: string | null; // Storage 경로 (없으면 링크만)
  file_name: string | null;
  file_url: string | null; // 외부 링크로 관리할 경우
  author_id: string | null; // (레거시) 멤버 선택 방식 데이터
  author_name: string | null; // 자유 입력 작성자명 (없으면 익명)
  changelog: string; // 이전 버전 대비 변경 요약
  created_at: string;
}

// 키워드 허브용 집계 결과
export interface KeywordStat {
  name: string;
  topicCount: number;
  paperCount: number;
}
