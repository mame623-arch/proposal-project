"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/** 마크다운을 보기 좋게 렌더 (globals.css의 .md 스타일 적용). */
export default function Markdown({ children }: { children: string }) {
  return (
    <div className="md">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // 외부 링크는 새 탭으로
          a: ({ node, ...props }) => (
            <a target="_blank" rel="noreferrer noopener" {...props} />
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
