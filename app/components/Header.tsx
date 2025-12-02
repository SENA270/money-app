// app/components/Header.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/", label: "ホーム" },
  { href: "/input", label: "入力" },
  { href: "/history", label: "明細一覧" },
  { href: "/balances", label: "資産" },
  { href: "/analysis", label: "分析" },
  { href: "/forecast", label: "今後" },
  { href: "/settings", label: "設定" },
];

export default function Header() {
  const pathname = usePathname();

  // ★ ログイン画面ではヘッダーを出さない
  if (pathname === "/login") {
    return null;
  }

  return (
    <header
      data-role="app-header" // receipt 側から消すための目印はそのまま
      style={{
        padding: "10px 20px",
        backgroundColor: "#e8e2d0",
        borderBottom: "1px solid #c9c3b3",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        fontSize: "13px",
      }}
    >
      <div style={{ fontWeight: 600, color: "#5d4330" }}>
        家計アプリ <span style={{ fontSize: "11px" }}>– local money note –</span>
      </div>

      <nav style={{ display: "flex", gap: "8px" }}>
        {tabs.map((tab) => {
          const active = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              style={{
                padding: "4px 10px",
                borderRadius: "999px",
                textDecoration: "none",
                fontSize: "13px",
                backgroundColor: active ? "#b55c3b" : "transparent",
                color: active ? "#ffffff" : "#5d4330",
                border: active ? "none" : "1px solid transparent",
              }}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}