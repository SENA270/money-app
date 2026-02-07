"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, ClipboardList, BarChart, CreditCard, Settings, Plus } from "lucide-react";

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [showInputMenu, setShowInputMenu] = useState(false);

  // 認証前や特定のページでは表示しない場合のロジックが必要ならここに追加
  // 例: if (pathname === "/login") return null;
  // AppShell側で制御するほうがスマートかも

  const navItems = [
    { href: "/", label: "ホーム", icon: <Home size={24} /> },
    { href: "/history", label: "明細", icon: <ClipboardList size={24} /> },
    { href: "/debt", label: "ローン", icon: <CreditCard size={24} /> },
    { isCenter: true },
    { href: "/analysis", label: "分析", icon: <BarChart size={24} /> },
    { href: "/settings", label: "設定", icon: <Settings size={24} /> },
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
                  <Plus size={32} />
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

