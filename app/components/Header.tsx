// app/components/Header.tsx
"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";

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
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // パスが変わったらメニューを閉じる
  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

  // メニューが開いているときは背景スクロール停止 & ESCで閉じる
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsMenuOpen(false);
    };

    if (isMenuOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    } else {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMenuOpen]);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      router.replace("/login");
    } catch (e) {
      console.error("ログアウトに失敗しました", e);
    }
  };

  if (pathname === "/login") {
    return null;
  }

  return (
    <>
      <header
        data-role="app-header"
        style={{
          position: "sticky",
          top: 0,
          zIndex: 1001, // Ensure above overlay
          backgroundColor: "#e8e2d0",
          borderBottom: "1px solid #c9c3b3",
        }}
      >
        <div
          style={{
            padding: "10px 20px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            maxWidth: "1024px",
            margin: "0 auto",
            height: "54px", // Fixed height for alignment
          }}
        >
          {/* ロゴ */}
          <div style={{ fontWeight: 600, color: "#5d4330", fontSize: "16px" }}>
            <span className="logo-text-full">
              家計アプリ <span style={{ fontSize: "11px" }}>– local money note –</span>
            </span>
            <span className="logo-text-short">local money note</span>
          </div>

          {/* Desktop Nav */}
          <nav className="header-nav-desktop">
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
                    whiteSpace: "nowrap",
                  }}
                >
                  {tab.label}
                </Link>
              );
            })}
            <button
              type="button"
              onClick={handleLogout}
              className="btn-link"
              style={{ marginLeft: 8, whiteSpace: "nowrap" }}
            >
              ログアウト
            </button>
          </nav>

          {/* Mobile Hamburger Button */}
          <button
            className="mobile-only header-hamburger-btn"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            type="button"
            aria-label="メニューを開く"
          >
            {isMenuOpen ? "✕" : "☰"}
          </button>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {isMenuOpen && (
        <div
          className="header-menu-overlay"
          onClick={() => setIsMenuOpen(false)}
          style={{ top: "54px", height: "calc(100vh - 54px)" }}
        >
          <nav
            className="header-menu-content"
            onClick={(e) => e.stopPropagation()} // Prevent close on menu click
          >
            <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {tabs.map((tab) => {
                const active = pathname === tab.href;
                return (
                  <li key={tab.href} style={{ borderBottom: "1px solid #eee" }}>
                    <Link
                      href={tab.href}
                      style={{
                        display: "block",
                        padding: "16px 20px",
                        textDecoration: "none",
                        fontSize: "16px",
                        color: active ? "#b55c3b" : "#5d4330",
                        fontWeight: active ? 600 : 400,
                        backgroundColor: active ? "#fff5ef" : "transparent",
                      }}
                    >
                      {tab.label}
                    </Link>
                  </li>
                );
              })}
              <li style={{ padding: "16px 20px" }}>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="btn-primary" // Use big button for easier tap
                  style={{
                    backgroundColor: "#fff",
                    color: "#b55c3b",
                    border: "1px solid #b55c3b",
                  }}
                >
                  ログアウト
                </button>
              </li>
            </ul>
          </nav>
        </div>
      )}
    </>
  );
}
