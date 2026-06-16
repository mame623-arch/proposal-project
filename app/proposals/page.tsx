"use client";

import { useEffect, useState } from "react";
import type { Member, Proposal, ProposalVersion } from "@/lib/types";
import {
  createProposal,
  createVersion,
  deleteProposal,
  deleteVersion,
  fetchProposals,
  fetchVersions,
  fileUrl,
  updateVersion,
  uploadProposalFile,
} from "@/lib/db";
import Markdown from "@/components/Markdown";
import { isSupabaseConfigured } from "@/lib/supabase";
import { useMembers } from "@/lib/useMembers";
import {
  Avatar,
  EmptyState,
  Field,
  GhostBtn,
  MemberAvatarName,
  PrimaryBtn,
  formatDateTime,
  inputCls,
} from "@/components/ui";

export default function ProposalsPage() {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", agency: "", description: "" });
  const [saving, setSaving] = useState(false);

  const load = () =>
    fetchProposals()
      .then(setProposals)
      .catch((e) => console.error(e))
      .finally(() => setLoading(false));

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    load();
  }, []);

  async function addProposal() {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      await createProposal({
        name: form.name.trim(),
        agency: form.agency.trim(),
        description: form.description.trim(),
      });
      setForm({ name: "", agency: "", description: "" });
      setCreating(false);
      await load();
    } catch (e) {
      alert("저장 실패: " + (e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function removeProposal(id: string) {
    if (!confirm("이 제안서와 모든 버전을 삭제할까요?")) return;
    await deleteProposal(id);
    await load();
  }

  return (
    <div className="mx-auto max-w-[1100px] px-5 py-7 md:px-10">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1>제안서 버전</h1>
          <p className="mt-1 text-muted">
            공모별 제안서를 만들고, 버전마다 파일과 함께 “누가·언제·이전 대비
            무엇을 수정했는지”를 기록합니다.
          </p>
        </div>
        {!creating && (
          <PrimaryBtn onClick={() => setCreating(true)}>+ 새 제안서</PrimaryBtn>
        )}
      </div>

      {creating && (
        <div className="mt-6 rounded-xl border border-line bg-bg p-5">
          <div className="space-y-3">
            <Field label="제안서/사업명">
              <input
                className={inputCls}
                value={form.name}
                placeholder="예: 가정환경 멀티에이전트 안전성 검증 GPU 제안"
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </Field>
            <Field label="공모 기관 (GPU 제공처)">
              <input
                className={inputCls}
                value={form.agency}
                placeholder="예: OO 슈퍼컴퓨팅센터"
                onChange={(e) => setForm({ ...form, agency: e.target.value })}
              />
            </Field>
            <Field label="설명 (선택)">
              <textarea
                className={`${inputCls} min-h-[70px]`}
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
              />
            </Field>
            <div className="flex gap-2">
              <PrimaryBtn onClick={addProposal} disabled={saving || !form.name.trim()}>
                {saving ? "저장 중…" : "제안서 만들기"}
              </PrimaryBtn>
              <GhostBtn onClick={() => setCreating(false)}>취소</GhostBtn>
            </div>
          </div>
        </div>
      )}

      <div className="mt-6 space-y-4">
        {loading ? (
          <p className="text-muted">불러오는 중…</p>
        ) : proposals.length === 0 ? (
          <EmptyState>
            아직 제안서가 없습니다. <b>+ 새 제안서</b>로 공모를 등록하세요.
          </EmptyState>
        ) : (
          proposals.map((p) => (
            <ProposalCard key={p.id} proposal={p} onDelete={removeProposal} />
          ))
        )}
      </div>
    </div>
  );
}

function ProposalCard({
  proposal,
  onDelete,
}: {
  proposal: Proposal;
  onDelete: (id: string) => void;
}) {
  const { byId } = useMembers();
  const [versions, setVersions] = useState<ProposalVersion[]>([]);
  const [open, setOpen] = useState(true);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [v, setV] = useState<{
    label: string;
    url: string;
    changelog: string;
    author_name: string;
  }>({ label: "", url: "", changelog: "", author_name: "" });
  const [file, setFile] = useState<File | null>(null);

  function openAdd() {
    setV({ label: "", url: "", changelog: "", author_name: "" });
    setFile(null);
    setAdding(true);
  }

  const load = () =>
    fetchVersions(proposal.id).then(setVersions).catch((e) => console.error(e));

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proposal.id]);

  function suggestLabel() {
    return `v${versions.length + 1}`;
  }

  async function addVersion() {
    const label = v.label.trim() || suggestLabel();
    setSaving(true);
    try {
      let file_path: string | null = null;
      let file_name: string | null = null;
      if (file) {
        const up = await uploadProposalFile(proposal.id, file);
        file_path = up.path;
        file_name = up.name;
      }
      await createVersion({
        proposal_id: proposal.id,
        version_label: label,
        file_path,
        file_name,
        file_url: v.url.trim() || null,
        author_id: null,
        author_name: v.author_name.trim() || null,
        changelog: v.changelog.trim(),
      });
      setV({ label: "", url: "", changelog: "", author_name: "" });
      setFile(null);
      setAdding(false);
      await load();
    } catch (e) {
      alert("버전 저장 실패: " + (e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function removeVersion(id: string) {
    if (!confirm("이 버전을 삭제할까요?")) return;
    await deleteVersion(id);
    await load();
  }

  return (
    <div className="rounded-xl border border-line bg-bg p-5">
      <div className="flex items-start justify-between gap-3">
        <button
          onClick={() => setOpen(!open)}
          className="min-w-0 text-left"
        >
          <h2 className="leading-snug">{proposal.name}</h2>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.8rem] text-muted">
            {proposal.agency && (
              <span className="rounded-full bg-accentsoft px-2 py-0.5 font-semibold text-accent">
                {proposal.agency}
              </span>
            )}
            <span>버전 {versions.length}개</span>
          </div>
          {proposal.description && (
            <p className="mt-1.5 text-[0.84rem] text-body">
              {proposal.description}
            </p>
          )}
        </button>
        <div className="flex shrink-0 gap-1">
          <GhostBtn onClick={() => (adding ? setAdding(false) : openAdd())}>
            + 버전
          </GhostBtn>
          <GhostBtn onClick={() => onDelete(proposal.id)}>삭제</GhostBtn>
        </div>
      </div>

      {adding && (
        <div className="mt-4 rounded-lg border border-line bg-surface p-4">
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-[120px_1fr_200px]">
              <Field label="버전" hint={`예: ${suggestLabel()}`}>
                <input
                  className={inputCls}
                  value={v.label}
                  placeholder={suggestLabel()}
                  onChange={(e) => setV({ ...v, label: e.target.value })}
                />
              </Field>
              <Field label="외부 링크 (선택)" hint="구글닥스/노션 등">
                <input
                  className={inputCls}
                  value={v.url}
                  placeholder="https://…"
                  onChange={(e) => setV({ ...v, url: e.target.value })}
                />
              </Field>
              <Field label="작성자" hint="비우면 익명">
                <input
                  className={inputCls}
                  value={v.author_name}
                  placeholder="이름 입력 (선택)"
                  onChange={(e) => setV({ ...v, author_name: e.target.value })}
                />
              </Field>
            </div>
            <Field label="제안서 파일 업로드 (선택)" hint="hwp / pdf / html 등">
              <input
                type="file"
                className="block w-full text-[0.82rem] text-muted file:mr-3 file:rounded-md file:border-0 file:bg-accentsoft file:px-3 file:py-1.5 file:text-[0.8rem] file:font-semibold file:text-accent hover:file:brightness-95"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </Field>
            <Field label="변경 요약" hint="마크다운 지원 · 이전 버전 대비 무엇을 바꿨는지">
              <textarea
                className={`${inputCls} min-h-[90px] font-mono text-[0.82rem]`}
                value={v.changelog}
                placeholder={
                  "예:\n- 평가배점에 맞춰 **분량 재배분**\n- 정량 수치 보강\n- 그림2 추가"
                }
                onChange={(e) => setV({ ...v, changelog: e.target.value })}
              />
            </Field>
            <div className="flex gap-2">
              <PrimaryBtn onClick={addVersion} disabled={saving}>
                {saving ? "저장 중…" : "버전 추가"}
              </PrimaryBtn>
              <GhostBtn onClick={() => setAdding(false)}>취소</GhostBtn>
            </div>
          </div>
        </div>
      )}

      {open && versions.length > 0 && (
        <ol className="mt-4 space-y-2 border-t border-line pt-4">
          {versions.map((ver) => (
            <VersionRow
              key={ver.id}
              ver={ver}
              proposalId={proposal.id}
              byId={byId}
              onChanged={load}
              onDelete={removeVersion}
            />
          ))}
        </ol>
      )}
    </div>
  );
}

function VersionRow({
  ver,
  proposalId,
  byId,
  onChanged,
  onDelete,
}: {
  ver: ProposalVersion;
  proposalId: string;
  byId: Map<string, Member>;
  onChanged: () => void;
  onDelete: (id: string) => void;
}) {
  const [showLog, setShowLog] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [e, setE] = useState<{
    label: string;
    url: string;
    changelog: string;
    author_name: string;
  }>({
    label: ver.version_label,
    url: ver.file_url ?? "",
    changelog: ver.changelog ?? "",
    author_name: ver.author_name ?? "",
  });
  const [file, setFile] = useState<File | null>(null);

  function startEdit() {
    setE({
      label: ver.version_label,
      url: ver.file_url ?? "",
      changelog: ver.changelog ?? "",
      author_name: ver.author_name ?? "",
    });
    setFile(null);
    setEditing(true);
  }

  async function saveEdit() {
    setSaving(true);
    try {
      const patch: Record<string, unknown> = {
        version_label: e.label.trim() || ver.version_label,
        file_url: e.url.trim() || null,
        changelog: e.changelog.trim(),
        author_id: null,
        author_name: e.author_name.trim() || null,
      };
      if (file) {
        const up = await uploadProposalFile(proposalId, file);
        patch.file_path = up.path;
        patch.file_name = up.name;
      }
      await updateVersion(ver.id, patch);
      setEditing(false);
      onChanged();
    } catch (err) {
      alert("버전 수정 실패: " + (err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  const isHtml = /\.html?$/i.test(ver.file_name ?? ver.file_path ?? "");

  // Supabase Storage 공개 URL은 CSP(default-src 'none'; sandbox)로 서빙되어
  // HTML을 직접 새 탭에서 열면 인라인 스타일/이미지가 모두 차단된다.
  // 파일을 직접 받아 우리 앱 출처의 blob URL로 띄우면 CSP 없이 정상 렌더링된다.
  async function openHtml() {
    if (!ver.file_path) return;
    const w = window.open("", "_blank"); // 팝업 차단 회피: 클릭 시점에 먼저 연다
    try {
      const res = await fetch(fileUrl(ver.file_path));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = await res.arrayBuffer();
      const url = URL.createObjectURL(
        new Blob([buf], { type: "text/html; charset=utf-8" })
      );
      if (w) w.location.href = url;
      else window.open(url, "_blank");
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (err) {
      if (w) w.close();
      alert("미리보기 실패: " + (err as Error).message);
    }
  }

  return (
    <li className="rounded-lg border border-line bg-bg p-3.5">
      {editing ? (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-[120px_1fr_200px]">
            <Field label="버전">
              <input
                className={inputCls}
                value={e.label}
                onChange={(ev) => setE({ ...e, label: ev.target.value })}
              />
            </Field>
            <Field label="외부 링크 (선택)" hint="구글닥스/노션 등">
              <input
                className={inputCls}
                value={e.url}
                placeholder="https://…"
                onChange={(ev) => setE({ ...e, url: ev.target.value })}
              />
            </Field>
            <Field label="작성자" hint="비우면 익명">
              <input
                className={inputCls}
                value={e.author_name}
                placeholder="이름 입력 (선택)"
                onChange={(ev) => setE({ ...e, author_name: ev.target.value })}
              />
            </Field>
          </div>
          <Field
            label="제안서 파일 교체 (선택)"
            hint={
              ver.file_name
                ? `현재: ${ver.file_name} · 새 파일 선택 시 교체`
                : "hwp / pdf / html 등"
            }
          >
            <input
              type="file"
              className="block w-full text-[0.82rem] text-muted file:mr-3 file:rounded-md file:border-0 file:bg-accentsoft file:px-3 file:py-1.5 file:text-[0.8rem] file:font-semibold file:text-accent hover:file:brightness-95"
              onChange={(ev) => setFile(ev.target.files?.[0] ?? null)}
            />
          </Field>
          <Field label="변경 요약" hint="마크다운 지원">
            <textarea
              className={`${inputCls} min-h-[90px] font-mono text-[0.82rem]`}
              value={e.changelog}
              onChange={(ev) => setE({ ...e, changelog: ev.target.value })}
            />
          </Field>
          <div className="flex gap-2">
            <PrimaryBtn onClick={saveEdit} disabled={saving}>
              {saving ? "저장 중…" : "수정 저장"}
            </PrimaryBtn>
            <GhostBtn onClick={() => setEditing(false)}>취소</GhostBtn>
          </div>
        </div>
      ) : (
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-md bg-ink px-2 py-0.5 text-[0.72rem] font-bold text-white">
                {ver.version_label}
              </span>
              {ver.file_path && (
                <span className="inline-flex items-center gap-2">
                  {isHtml ? (
                    <button
                      onClick={openHtml}
                      className="text-[0.82rem] font-semibold text-accent underline underline-offset-2"
                    >
                      👁 {ver.file_name ?? "파일"}
                    </button>
                  ) : (
                    <a
                      href={fileUrl(ver.file_path)}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="text-[0.82rem] font-semibold text-accent underline underline-offset-2"
                    >
                      👁 {ver.file_name ?? "파일"}
                    </a>
                  )}
                  <a
                    href={fileUrl(ver.file_path, ver.file_name ?? undefined)}
                    download={ver.file_name ?? undefined}
                    className="text-[0.78rem] font-semibold text-muted hover:text-body"
                    title="다운로드"
                  >
                    ⬇ 다운로드
                  </a>
                </span>
              )}
              {ver.file_url && (
                <a
                  href={ver.file_url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="text-[0.82rem] font-semibold text-accent underline underline-offset-2"
                >
                  🔗 링크
                </a>
              )}
            </div>
            {ver.changelog && (
              <div className="mt-1.5">
                <button
                  onClick={() => setShowLog((s) => !s)}
                  className="flex items-center gap-1 text-[0.8rem] font-semibold text-muted hover:text-body"
                >
                  <span
                    className={`inline-block transition-transform ${
                      showLog ? "rotate-90" : ""
                    }`}
                  >
                    ▸
                  </span>
                  변경 요약
                </button>
                {showLog && (
                  <div className="mt-1.5 rounded-md border border-line bg-surface px-3 py-2 text-[0.84rem] text-body">
                    <Markdown>{ver.changelog}</Markdown>
                  </div>
                )}
              </div>
            )}
            <div className="mt-1.5 flex items-center gap-2 text-[0.74rem] text-faint">
              {ver.author_name ? (
                <span className="inline-flex items-center gap-2">
                  <Avatar name={ver.author_name} size={18} />
                  <span className="font-medium text-ink">{ver.author_name}</span>
                </span>
              ) : ver.author_id ? (
                <MemberAvatarName member={byId.get(ver.author_id)} size={18} />
              ) : (
                <span className="text-faint">익명</span>
              )}
              <span>· {formatDateTime(ver.created_at)}</span>
            </div>
          </div>
          <div className="flex shrink-0 gap-1">
            <GhostBtn onClick={startEdit}>수정</GhostBtn>
            <GhostBtn onClick={() => onDelete(ver.id)}>삭제</GhostBtn>
          </div>
        </div>
      )}
    </li>
  );
}
