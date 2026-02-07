"use client";

import React from "react";
import Link from "next/link";
import { CreditCard, Settings, List, Wallet, FileText, X } from "lucide-react";

type MenuSheetProps = {
  isOpen: boolean;
  onClose: () => void;
};

export default function MenuSheet({ isOpen, onClose }: MenuSheetProps) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 4000 }}>
      {/* Bottom Sheet */}
      <div
        className="bottom-sheet"
        onClick={(e) => e.stopPropagation()}
        style={{ paddingBottom: 40 }}
      >
        <div className="sheet-handle"></div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: 18, color: "#5d4330" }}>メニュー</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#888" }}>
            <X size={24} />
          </button>
        </div>

        {/* 1. Loan Management (High Priority) */}
        <section style={{ marginBottom: 24 }}>
          <p style={{ fontSize: 12, color: "#8c7b6c", fontWeight: "bold", marginBottom: 8 }}>ローン管理（最優先）</p>
          <Link
            href="/debt"
            onClick={onClose}
            className="menu-item-primary"
            style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "16px", background: "#fdf8ee",
              border: "1px solid #e6dcd2", borderRadius: 12,
              textDecoration: "none", color: "#3b2a1a"
            }}
          >
            <div style={{ background: "#b58b5a", padding: 8, borderRadius: 8, color: "white" }}>
              <CreditCard size={24} />
            </div>
            <div>
              <p style={{ fontWeight: "bold", fontSize: 16, margin: 0 }}>借金・ローン管理</p>
              <p style={{ fontSize: 12, color: "#5d4330", margin: 0, opacity: 0.8 }}>残高や返済状況の確認</p>
            </div>
          </Link>
        </section>

        {/* 2. Settings Group */}
        <section style={{ marginBottom: 24 }}>
          <p style={{ fontSize: 12, color: "#8c7b6c", fontWeight: "bold", marginBottom: 8 }}>設定・管理</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Link href="/settings/categories" onClick={onClose} className="menu-btn">
              <List size={20} />
              <span>カテゴリ</span>
            </Link>
            <Link href="/settings/accounts" onClick={onClose} className="menu-btn">
              <Wallet size={20} />
              <span>口座・資産</span>
            </Link>
            <Link href="/settings/fixed" onClick={onClose} className="menu-btn">
              <FileText size={20} />
              <span>固定費</span>
            </Link>
            <Link href="/settings" onClick={onClose} className="menu-btn">
              <Settings size={20} />
              <span>全体設定</span>
            </Link>
          </div>
        </section>

        {/* 3. Data / Other */}
        <section>
          <Link
            href="/settings/export"
            onClick={onClose}
            style={{
              display: "block", textAlign: "center",
              padding: 12, color: "#888", fontSize: 13, textDecoration: "none"
            }}
          >
            データのエクスポート・管理
          </Link>
        </section>

        <style jsx>{`
          .menu-btn {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 8px;
            padding: 16px;
            background: #f9f9f9;
            border-radius: 12px;
            text-decoration: none;
            color: #555;
            font-size: 13px;
            font-weight: 500;
            transition: background 0.2s;
          }
          .menu-btn:active {
            background: #eee;
          }
        `}</style>
      </div>
    </div>
  );
}
