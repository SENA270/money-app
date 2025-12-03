// app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";
import { AppShell } from "./components/AppShell";

export const metadata: Metadata = {
  title: "家計アプリ",
  description: "local money note",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <AppShell>{children}</AppShell>
    </html>
  );
}