"use client";

import { useEffect, useState } from "react";
import type { Proposal, ProposalVersion } from "@/lib/types";
import {
  createProposal,
  createVersion,
  deleteProposal,
  deleteVersion,
  fetchProposals,
  fetchVersions,
  fileUrl,
  uploadProposalFile,
} from "@/lib/db";
import { isSupabaseConfigured } from "@/lib/supabase";
import { useMembers } from "@/lib/useMembers";
import { useCurrentMemberId } from "@/lib/currentUser";
import {
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
  const [currentId] = useCurrentMemberId();
  const [versions, setVersions] = useState<ProposalVersion[]>([]);
  const [open, setOpen] = useState(true);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [v, setV] = useState({ label: "", url: "", changelog: "" });
  const [file, setFile] = useState<File | null>(null);

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
        author_id: currentId,
        changelog: v.changelog.trim(),
      });
      setV({ label: "", url: "", changelog: "" });
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
          <GhostBtn onClick={() => setAdding((a) => !a)}>+ 버전</GhostBtn>
          <GhostBtn onClick={() => onDelete(proposal.id)}>삭제</GhostBtn>
        </div>
      </div>

      {adding && (
        <div className="mt-4 rounded-lg border border-line bg-surface p-4">
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-[140px_1fr]">
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
            </div>
            <Field label="제안서 파일 업로드 (선택)" hint="hwp / pdf / html 등">
              <input
                type="file"
                className="block w-full text-[0.82rem] text-muted file:mr-3 file:rounded-md file:border-0 file:bg-accentsoft file:px-3 file:py-1.5 file:text-[0.8rem] file:font-semibold file:text-accent hover:file:brightness-95"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </Field>
            <Field label="변경 요약" hint="이전 버전 대비 무엇을 바꿨는지">
              <textarea
                className={`${inputCls} min-h-[70px]`}
                value={v.changelog}
                placeholder="예: 평가배점에 맞춰 분량 재배분, 정량 수치 보강, 그림2 추가"
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
            <li
              key={ver.id}
              className="rounded-lg border border-line bg-bg p-3.5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-md bg-ink px-2 py-0.5 text-[0.72rem] font-bold text-white">
                      {ver.version_label}
                    </span>
                    {ver.file_path && (
                      <a
                        href={fileUrl(ver.file_path)}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="text-[0.82rem] font-semibold text-accent underline underline-offset-2"
                      >
                        ⬇ {ver.file_name ?? "파일"}
                      </a>
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
                    <p className="mt-1.5 whitespace-pre-wrap text-[0.84rem] text-body">
                      {ver.changelog}
                    </p>
                  )}
                  <div className="mt-1.5 flex items-center gap-2 text-[0.74rem] text-faint">
                    <MemberAvatarName
                      member={byId.get(ver.author_id ?? "")}
                      size={18}
                    />
                    <span>· {formatDateTime(ver.created_at)}</span>
                  </div>
                </div>
                <GhostBtn onClick={() => removeVersion(ver.id)}>삭제</GhostBtn>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
