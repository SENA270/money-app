// app/components/AppShell.tsx
"use client";

import { usePathname } from "next/navigation";
import { AuthGuard } from "./AuthGuard";
import Header from "./Header";
import Footer from "./Footer";
import BottomNav from "./BottomNav";
import SwipeNav from "./SwipeNav";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const isLoginPage = pathname === "/login";

  return (
    <body className="app-root">
      {isLoginPage ? (
        <>
          <Header />
          <main className="app-main">{children}</main>
          <Footer />
        </>
      ) : (
        <AuthGuard>
          <Header />
          <SwipeNav>
            <main className="app-main">{children}</main>
          </SwipeNav>
          <Footer />
          {pathname !== "/receipt" && <BottomNav />}
        </AuthGuard>
      )}
    </body>
  );
}
