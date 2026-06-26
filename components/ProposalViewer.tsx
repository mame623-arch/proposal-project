"use client";

import { useEffect, useRef, useState } from "react";

export interface ViewerFile {
  url: string;
  name: string;
}

type Kind = "html" | "pdf" | "hwp" | "hwpx" | "other";

function detectKind(name: string): Kind {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "html" || ext === "htm") return "html";
  if (ext === "pdf") return "pdf";
  if (ext === "hwpx") return "hwpx";
  if (ext === "hwp") return "hwp";
  return "other";
}

/** ArrayBuffer → binary string (hwp.js의 type:'binary' 입력 형식). */
function toBinaryString(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  const chunk = 0x8000;
  let out = "";
  for (let i = 0; i < bytes.length; i += chunk) {
    out += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return out;
}

/** 업로드된 제안서 파일(HTML/PDF/HWP)을 페이지 안에서 바로 보여주는 모달 뷰어. */
export default function ProposalViewer({
  file,
  onClose,
}: {
  file: ViewerFile | null;
  onClose: () => void;
}) {
  const kind = file ? detectKind(file.name) : "other";

  // ESC 닫기
  useEffect(() => {
    if (!file) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [file, onClose]);

  if (!file) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="mx-auto flex h-full w-full max-w-[1100px] flex-col px-3 py-4 sm:px-6 sm:py-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 rounded-t-xl border border-line bg-bg px-4 py-3">
          <div className="min-w-0">
            <p className="truncate text-[0.9rem] font-semibold text-ink">
              {file.name}
            </p>
            <p className="text-[0.72rem] uppercase tracking-wide text-faint">
              {kind === "other" ? "미리보기 미지원" : kind} 미리보기
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <a
              href={file.url}
              target="_blank"
              rel="noreferrer noopener"
              className="rounded-lg border border-line bg-bg px-3 py-1.5 text-[0.8rem] font-medium text-muted transition hover:border-accent hover:text-accent"
            >
              ⬇ 다운로드
            </a>
            <button
              onClick={onClose}
              className="rounded-lg bg-accent px-3 py-1.5 text-[0.8rem] font-semibold text-white transition hover:brightness-105"
            >
              닫기 ✕
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto rounded-b-xl border border-t-0 border-line bg-surface">
          <ViewerBody file={file} kind={kind} />
        </div>
      </div>
    </div>
  );
}

function ViewerBody({ file, kind }: { file: ViewerFile; kind: Kind }) {
  if (kind === "html") {
    return <HtmlViewer file={file} />;
  }
  if (kind === "pdf") {
    return (
      <iframe
        src={file.url}
        title={file.name}
        className="h-full min-h-[70vh] w-full bg-white"
      />
    );
  }
  if (kind === "hwp") {
    return <HwpViewer file={file} />;
  }
  if (kind === "hwpx") {
    return <HwpxViewer file={file} />;
  }
  return (
    <div className="flex h-full min-h-[40vh] flex-col items-center justify-center gap-3 p-8 text-center">
      <p className="text-[0.9rem] text-body">
        이 형식은 브라우저 미리보기를 지원하지 않습니다.
        <br />
        다운로드해서 확인해 주세요. (지원: HTML · PDF · HWP · HWPX)
      </p>
      <a
        href={file.url}
        target="_blank"
        rel="noreferrer noopener"
        className="rounded-lg bg-accent px-4 py-2 text-[0.85rem] font-semibold text-white"
      >
        ⬇ {file.name} 다운로드
      </a>
    </div>
  );
}

function HtmlViewer({ file }: { file: ViewerFile }) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading"
  );

  useEffect(() => {
    let cancelled = false;
    let url: string | null = null;
    (async () => {
      try {
        const res = await fetch(file.url);
        if (!res.ok) throw new Error(`fetch ${res.status}`);
        const buf = await res.arrayBuffer();
        // Supabase Storage는 .html을 text/plain + nosniff + CSP sandbox로 서빙한다.
        // → iframe src로 직접 열면 (1) HTML이 소스 텍스트로 노출되고
        //   (2) charset 미지정으로 UTF-8 한글이 깨진다.
        // 바이트를 받아 우리 앱 출처의 blob(text/html;charset=utf-8)로 렌더하면
        // Supabase 헤더 영향 없이 정상 표시된다.
        let text: string;
        try {
          text = new TextDecoder("utf-8", { fatal: true }).decode(buf);
        } catch {
          // 구버전 HWP 변환본(CP949/EUC-KR) 대비 폴백
          text = new TextDecoder("euc-kr").decode(buf);
        }
        if (cancelled) return;
        url = URL.createObjectURL(
          new Blob([text], { type: "text/html; charset=utf-8" })
        );
        setBlobUrl(url);
        setStatus("ready");
      } catch (e) {
        console.error("HTML 렌더 실패:", e);
        if (!cancelled) setStatus("error");
      }
    })();
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [file.url]);

  if (status === "loading") {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-[0.9rem] text-muted">
        HTML 문서를 불러오는 중…
      </div>
    );
  }
  if (status === "error" || !blobUrl) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 p-8 text-center">
        <p className="text-[0.9rem] text-body">
          이 HTML 파일을 불러오지 못했습니다. 다운로드해서 열어 주세요.
        </p>
        <a
          href={file.url}
          target="_blank"
          rel="noreferrer noopener"
          className="rounded-lg bg-accent px-4 py-2 text-[0.85rem] font-semibold text-white"
        >
          ⬇ {file.name} 다운로드
        </a>
      </div>
    );
  }
  return (
    <iframe
      src={blobUrl}
      title={file.name}
      className="h-full min-h-[70vh] w-full bg-white"
      sandbox="allow-same-origin allow-popups"
    />
  );
}

function HwpViewer({ file }: { file: ViewerFile }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading"
  );

  useEffect(() => {
    let cancelled = false;
    let viewer: { distory?: () => void } | null = null;
    const host = hostRef.current;

    (async () => {
      try {
        const res = await fetch(file.url);
        if (!res.ok) throw new Error(`fetch ${res.status}`);
        const buf = await res.arrayBuffer();
        if (cancelled || !host) return;
        const binary = toBinaryString(buf);
        const mod = await import("hwp.js");
        if (cancelled || !host) return;
        host.innerHTML = "";
        // hwp.js Viewer가 host에 페이지들을 렌더한다.
        // (타입 선언은 Uint8Array만 받지만 런타임은 type:'binary' 문자열을 지원한다.)
        const Viewer = mod.Viewer as unknown as new (
          container: HTMLElement,
          data: string,
          option?: { type: string }
        ) => { distory?: () => void };
        viewer = new Viewer(host, binary, { type: "binary" });
        if (!cancelled) setStatus("ready");
      } catch (e) {
        console.error("HWP 렌더 실패:", e);
        if (!cancelled) setStatus("error");
      }
    })();

    return () => {
      cancelled = true;
      try {
        viewer?.distory?.();
      } catch {
        /* noop */
      }
      if (host) host.innerHTML = "";
    };
  }, [file.url]);

  return (
    <div className="relative min-h-[70vh] w-full">
      {status === "loading" && (
        <div className="absolute inset-0 flex items-center justify-center text-[0.9rem] text-muted">
          한글 문서를 불러오는 중…
        </div>
      )}
      {status === "error" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-8 text-center">
          <p className="text-[0.9rem] text-body">
            한글(.hwp) 파일은 브라우저에서 직접 미리보기가 어렵습니다.
            <br />
            <strong>HTML 버전</strong>을 보거나, 아래에서 다운로드해 한글
            프로그램으로 열어 주세요.
          </p>
          <a
            href={file.url}
            target="_blank"
            rel="noreferrer noopener"
            className="rounded-lg bg-accent px-4 py-2 text-[0.85rem] font-semibold text-white"
          >
            ⬇ {file.name} 다운로드
          </a>
        </div>
      )}
      <div
        ref={hostRef}
        className="hwp-host mx-auto w-full"
        style={{ visibility: status === "ready" ? "visible" : "hidden" }}
      />
    </div>
  );
}

function HwpxViewer({ file }: { file: ViewerFile }) {
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading"
  );
  const [html, setHtml] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(file.url);
        if (!res.ok) throw new Error(`fetch ${res.status}`);
        const buf = await res.arrayBuffer();
        const { hwpxToHtml } = await import("@/lib/hwpx");
        const rendered = hwpxToHtml(buf);
        if (!cancelled) {
          setHtml(rendered);
          setStatus("ready");
        }
      } catch (e) {
        console.error("HWPX 렌더 실패:", e);
        if (!cancelled) setStatus("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [file.url]);

  if (status === "loading") {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-[0.9rem] text-muted">
        한글(HWPX) 문서를 변환하는 중…
      </div>
    );
  }
  if (status === "error") {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 p-8 text-center">
        <p className="text-[0.9rem] text-body">
          이 HWPX 파일을 변환하지 못했습니다. 다운로드해서 열어 주세요.
        </p>
        <a
          href={file.url}
          target="_blank"
          rel="noreferrer noopener"
          className="rounded-lg bg-accent px-4 py-2 text-[0.85rem] font-semibold text-white"
        >
          ⬇ {file.name} 다운로드
        </a>
      </div>
    );
  }
  return (
    <div className="flex justify-center bg-[#e9edf1] p-4 sm:p-6">
      <article
        className="hwpx-doc w-full max-w-[820px] rounded bg-white p-8 text-[0.92rem] leading-relaxed text-ink shadow-sm sm:p-12"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}
