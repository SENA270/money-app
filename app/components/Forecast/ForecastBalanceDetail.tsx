"use client";

import { useState } from "react";

type AssetBreakdown = {
  name: string;
  type: string;
  amount: number;
};

type Props = {
  totalBalance: number;
  breakdown: AssetBreakdown[];
};

export default function ForecastBalanceDetail({ totalBalance, breakdown }: Props) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{ background: "none", border: "none", cursor: "pointer", marginLeft: 8 }}
        aria-label="資産の内訳を表示"
      >
        <span style={{ fontSize: 16 }}>ℹ️</span>
      </button>

      {isOpen && (
        <>
          <div
            style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", zIndex: 99 }}
            onClick={() => setIsOpen(false)}
          />
          <div className="animate-fade-in" style={{
            position: "absolute",
            top: "100%",
            left: -100,
            width: 280,
            background: "#fff",
            border: "1px solid #ddd",
            borderRadius: 8,
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            padding: 16,
            zIndex: 100
          }}>
            <h4 style={{ fontSize: 13, marginBottom: 8, color: "#666" }}>現在の資産内訳</h4>

            {breakdown.length === 0 && <p style={{ fontSize: 12 }}>登録口座がありません</p>}

            <ul style={{ listStyle: "none", padding: 0, margin: 0, fontSize: 13 }}>
              {breakdown.map((item, idx) => (
                <li key={idx} style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 16 }}>
                      {item.type === "bank" ? "🏦" : item.type === "wallet" ? "👛" : "📱"}
                    </span>
                    <span>{item.name}</span>
                  </div>
                  <span style={{ fontWeight: 600 }}>¥{item.amount.toLocaleString()}</span>
                </li>
              ))}
            </ul>

            <div style={{ marginTop: 12, paddingTop: 8, borderTop: "1px dashed #eee", fontSize: 11, color: "#888", lineHeight: 1.4 }}>
              ※ ここには銀行・財布・Payなどの「資産」のみ表示されます。クレジットカードの引落とし予定額は含まれていません。
            </div>
          </div>
        </>
      )}
    </div>
  );
}
