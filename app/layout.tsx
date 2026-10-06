import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GhatCPT",
  description: "管理知識庫、文件、聊天機器人與具有來源引用的對話。",
  icons: {
    icon: "/ghat-cpt-logo.png",
    shortcut: "/ghat-cpt-logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-Hant">
      <body className="antialiased">{children}</body>
    </html>
  );
}
