import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "临场 · AI 面试准备室",
  description: "文字梳理知识，语音模拟面试。让每一次练习都有明确的下一步。",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">{children}</body>
    </html>
  );
}
