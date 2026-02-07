// app/settings/page.tsx
"use client";

import Link from "next/link";
import { Landmark, Calendar, Database, Tag, PiggyBank, ChevronRight } from "lucide-react";

export default function SettingsTopPage() {
  return (
    <div className="page-container" style={{ paddingBottom: 40 }}>
      <h1>設定</h1>
      <p style={{ marginBottom: 24, fontSize: 13, color: "#666" }}>
        アプリの基本設定を管理します。
      </p>

      {/* Main Settings - The "Big 3" */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 40 }}>

        {/* 1. Accounts & Balances */}
        <Link href="/settings/accounts" style={{ textDecoration: "none" }}>
          <div className="app-card" style={{ display: "flex", alignItems: "center", gap: 16, margin: 0, padding: "20px" }}>
            <div style={{
              background: "#e8f5e9", color: "#2f7d32",
              width: 48, height: 48, borderRadius: 24,
              display: "flex", alignItems: "center", justifyContent: "center"
            }}>
              <Landmark size={24} />
            </div>
            <div style={{ flex: 1 }}>
              <h2 style={{ fontSize: 16, marginBottom: 4, marginTop: 0, color: "#333" }}>口座・カード管理</h2>
              <p style={{ fontSize: 12, color: "#666", margin: 0 }}>銀行・財布・クレジット設定</p>
            </div>
            <ChevronRight size={20} color="#ccc" />
          </div>
        </Link>

        {/* 2. Fixed Money */}
        <Link href="/settings/fixed" style={{ textDecoration: "none" }}>
          <div className="app-card" style={{ display: "flex", alignItems: "center", gap: 16, margin: 0, padding: "20px" }}>
            <div style={{
              background: "#fff3e0", color: "#e65100",
              width: 48, height: 48, borderRadius: 24,
              display: "flex", alignItems: "center", justifyContent: "center"
            }}>
              <Calendar size={24} />
            </div>
            <div style={{ flex: 1 }}>
              <h2 style={{ fontSize: 16, marginBottom: 4, marginTop: 0, color: "#333" }}>毎月のお金（固定費・収入）</h2>
              <p style={{ fontSize: 12, color: "#666", margin: 0 }}>家賃・給料・サブスク・ローン</p>
            </div>
            <ChevronRight size={20} color="#ccc" />
          </div>
        </Link>

        {/* 3. Data Management (Import/Export) */}
        <Link href="/settings/export" style={{ textDecoration: "none" }}>
          <div className="app-card" style={{ display: "flex", alignItems: "center", gap: 16, margin: 0, padding: "20px" }}>
            <div style={{
              background: "#e3f2fd", color: "#1565c0",
              width: 48, height: 48, borderRadius: 24,
              display: "flex", alignItems: "center", justifyContent: "center"
            }}>
              <Database size={24} />
            </div>
            <div style={{ flex: 1 }}>
              <h2 style={{ fontSize: 16, marginBottom: 4, marginTop: 0, color: "#333" }}>データ管理</h2>
              <p style={{ fontSize: 12, color: "#666", margin: 0 }}>バックアップ・CSV出力</p>
            </div>
            <ChevronRight size={20} color="#ccc" />
          </div>
        </Link>

      </div>

      {/* Advanced / Other Settings */}
      <div>
        <h3 style={{ fontSize: 14, color: "#888", marginBottom: 12, paddingLeft: 4 }}>その他の設定</h3>
        <div className="app-card" style={{ padding: 0, overflow: "hidden" }}>

          <Link href="/settings/categories" style={{ textDecoration: "none", display: "block" }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "16px", borderBottom: "1px solid #eee8dc"
            }}>
              <Tag size={18} color="#5d4330" />
              <div style={{ flex: 1, color: "#3b2a1a", fontSize: 15 }}>カテゴリ設定</div>
              <ChevronRight size={18} color="#ccc" />
            </div>
          </Link>

          <Link href="/settings/saving" style={{ textDecoration: "none", display: "block" }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "16px"
            }}>
              <PiggyBank size={18} color="#5d4330" />
              <div style={{ flex: 1, color: "#3b2a1a", fontSize: 15 }}>貯金目標</div>
              <ChevronRight size={18} color="#ccc" />
            </div>
          </Link>

        </div>
      </div>
    </div>
  );
}
