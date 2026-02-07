"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, ClipboardList, BarChart, Plus, Menu } from "lucide-react";
import MenuSheet from "./MenuSheet";

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [showInputMenu, setShowInputMenu] = useState(false);
  const [showMenuSheet, setShowMenuSheet] = useState(false);

  // 1: Home
  // 2: Analysis
  // 3: Input (FAB)
  // 4: History
  // 5: Menu

  const navItems = [
    { href: "/", label: "ホーム", icon: <Home size={24} /> },
    { href: "/analysis", label: "分析", icon: <BarChart size={24} /> },
    { isCenter: true },
    { href: "/history", label: "履歴", icon: <ClipboardList size={24} /> },
    { isMenu: true, label: "メニュー", icon: <Menu size={24} /> },
  ];

  const handleCenterClick = () => {
    setShowInputMenu(true);
  };

  const handleInputSelect = (mode: "expense" | "income" | "scan") => {
    setShowInputMenu(false);
    if (mode === "scan") {
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

          if (item.isMenu) {
            const isMenuActive = showMenuSheet; // Or matching /settings, /debt paths?
            // Actually, if we are on /debt or /settings, maybe highlight Menu?
            // Let's keep it simple: highlight if sheet is open OR path starts with /settings or /debt
            const isActive = isMenuActive || pathname.startsWith("/settings") || pathname.startsWith("/debt");

            return (
              <button
                key="menu"
                className={`bottom-nav-item ${isActive ? "active" : ""}`}
                onClick={() => setShowMenuSheet(true)}
              >
                <div className="icon-container">{item.icon}</div>
                <span className="label">{item.label}</span>
              </button>
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

      {/* Input Selection Modal */}
      {showInputMenu && (
        <div className="modal-overlay" onClick={() => setShowInputMenu(false)} style={{ zIndex: 4000 }}>
          <div className="bottom-sheet" onClick={e => e.stopPropagation()}>
            <div className="sheet-handle"></div>
            <h3 style={{ textAlign: 'center', marginBottom: 20, color: '#5d4330' }}>入力を選択</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
              <button className="sheet-icon-btn" onClick={() => handleInputSelect("expense")}>
                <div style={{ background: '#ffe4e1', padding: 16, borderRadius: '50%', fontSize: 24, marginBottom: 8 }}>💸</div>
                <span>支出</span>
              </button>
              <button className="sheet-icon-btn" onClick={() => handleInputSelect("income")}>
                <div style={{ background: '#e0f7fa', padding: 16, borderRadius: '50%', fontSize: 24, marginBottom: 8 }}>💰</div>
                <span>収入</span>
              </button>
              <button className="sheet-icon-btn" onClick={() => handleInputSelect("scan")}>
                <div style={{ background: '#e8f5e9', padding: 16, borderRadius: '50%', fontSize: 24, marginBottom: 8 }}>📷</div>
                <span>レシート</span>
              </button>
            </div>
            <button className="sheet-btn cancel" onClick={() => setShowInputMenu(false)}>
              キャンセル
            </button>
          </div>
        </div>
      )}

      {/* Menu Sheet */}
      <MenuSheet isOpen={showMenuSheet} onClose={() => setShowMenuSheet(false)} />

      <style jsx>{`
        .sheet-icon-btn {
           display: flex;
           flex-direction: column;
           align-items: center;
           background: none;
           border: none;
           color: #555;
           font-size: 12px;
        }
      `}</style>
    </>
  );
}

