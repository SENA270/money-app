// app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";
import Header from "./components/Header";
import Footer from "./components/Footer";

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
      <body className="app-root">
        <Header />
        <main className="app-main">{children}</main>
        <Footer />
      </body>
    </html>
  );
}