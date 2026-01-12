"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

// Icons (Simple SVGs)
const IconHome = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
);
const IconList = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
);
const IconForecast = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>
);
const IconSettings = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
);
const IconPlus = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
);

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [showInputMenu, setShowInputMenu] = useState(false);

  // 認証前や特定のページでは表示しない場合のロジックが必要ならここに追加
  // 例: if (pathname === "/login") return null;
  // AppShell側で制御するほうがスマートかも

  const navItems = [
    { href: "/", label: "ホーム", icon: <IconHome /> },
    { href: "/history", label: "明細", icon: <IconList /> },
    { isCenter: true },
    { href: "/forecast", label: "予測", icon: <IconForecast /> },
    { href: "/settings", label: "設定", icon: <IconSettings /> },
  ];

  const handleCenterClick = () => {
    // とりあえず入力モーダルの代わりに選択肢を表示、またはInputページへ遷移
    // MVP: 中央ボタンクリックでInput選択モーダル表示
    setShowInputMenu(true);
  };

  const handleInputSelect = (mode: "expense" | "income" | "scan") => {
    setShowInputMenu(false);
    if (mode === "scan") {
      // カメラ機能へ（Inputページにパラメータ渡すか、専用ページか）
      // ここでは /input にパラメータ付きで飛ばす
      router.push("/input?mode=scan");
    } else {
      router.push(`/input?mode=${mode}`);
    }
  };

  return (
    <>
      <nav className="bottom-nav">
        {navItems.map((item, idx) => {
          if (item.isCenter) {
            return (
              <div key="center" className="bottom-nav-item center">
                <button
                  className="fab-btn"
                  onClick={handleCenterClick}
                  aria-label="追加"
                >
                  <IconPlus />
                </button>
              </div>
            );
          }

          const isActive = pathname === item.href;
          return (
            <Link
              key={idx}
              href={item.href!}
              className={`bottom-nav-item ${isActive ? "active" : ""}`}
            >
              <div className="icon-container">{item.icon}</div>
              <span className="label">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Input Selection Modal (Simple Sheet) */}
      {showInputMenu && (
        <div className="modal-overlay" onClick={() => setShowInputMenu(false)}>
          <div className="bottom-sheet" onClick={e => e.stopPropagation()}>
            <div className="sheet-handle"></div>
            <h3 style={{ textAlign: 'center', marginBottom: 20, color: '#5d4330' }}>入力を選択</h3>
            <button className="sheet-btn expense" onClick={() => handleInputSelect("expense")}>
              <span style={{ fontSize: 20, marginRight: 8 }}>💸</span> 支出を入力
            </button>
            <button className="sheet-btn income" onClick={() => handleInputSelect("income")}>
              <span style={{ fontSize: 20, marginRight: 8 }}>💰</span> 収入を入力
            </button>
            <button className="sheet-btn camera" onClick={() => handleInputSelect("scan")}>
              <span style={{ fontSize: 20, marginRight: 8 }}>📷</span> レシート撮影
            </button>
            <button className="sheet-btn cancel" onClick={() => setShowInputMenu(false)}>
              キャンセル
            </button>
          </div>
        </div>
      )}
    </>
  );
}
