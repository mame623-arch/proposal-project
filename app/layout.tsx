import type { Metadata } from "next";
import "./globals.css";
import AppShell from "@/components/AppShell";

export const metadata: Metadata = {
  title: "GPU 제안서 허브",
  description:
    "GPU 공모 제안서 작성을 위한 주제·논문·회의록·제안서 버전 관리, 그리고 autoproposal 스킬",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css"
        />
      </head>
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
