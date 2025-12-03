// app/components/AppShell.tsx
"use client";

import { usePathname } from "next/navigation";
import Header from "./Header";
import Footer from "./Footer";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // ログインページではヘッダー・フッターを非表示にする
  const hideLayout = pathname === "/login";

  return (
    <body className="app-root">
      {!hideLayout && <Header />}
      <main className="app-main">{children}</main>
      {!hideLayout && <Footer />}
    </body>
  );
}