// app/components/Footer.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Footer() {
  const pathname = usePathname();

  // ★ ログイン画面ではフッターを出さない
  if (pathname === "/login") {
    return null;
  }

  return (
    <footer
      style={{
        borderTop: "1px solid #c9c3b3",
        backgroundColor: "#e8e2d0",
        padding: "10px 20px",
        fontSize: "12px",
        textAlign: "center",
        color: "#5d4330",
      }}
      className="footer-desktop"
    >
      <span style={{ marginRight: 8 }}>© local money note</span>

      <Link href="/" style={{ marginRight: 8 }}>
        ホーム
      </Link>
      <Link href="/input" style={{ marginRight: 8 }}>
        入力
      </Link>
      <Link href="/history" style={{ marginRight: 8 }}>
        明細一覧
      </Link>
      <Link href="/analysis" style={{ marginRight: 8 }}>
        分析
      </Link>
      <Link href="/bills" style={{ marginRight: 8 }}>
        請求
      </Link>
      <Link href="/settings">設定</Link>
      <style jsx>{`
        @media (max-width: 768px) {
          .footer-desktop {
            display: none !important;
          }
        }
      `}</style>
    </footer >
  );
}