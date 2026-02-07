"use client";

import { useTimeline } from "../hooks/useTimeline";
import Link from "next/link";

export default function TimelinePage() {
  const { timeline, loading, currentBalance } = useTimeline(6); // 6 months forecast

  if (loading) {
    return (
      <div className="page-container" style={{ textAlign: "center", marginTop: 40 }}>
        Loading timeline...
      </div>
    );
  }

  // Find lowest balance in future
  const minBalance = timeline.reduce((min, e) => (e.balance !== undefined && e.balance < min ? e.balance : min), currentBalance);
  const isDanger = minBalance < 0;

  return (
    <div className="page-container padding-bottom-nav">

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1>タイムライン</h1>
        <p style={{ color: "#666", fontSize: 13 }}>
          現在の残高から、将来の支払いや収入を含めた資金繰りを予測します。
        </p>
      </div>

      {/* Summary Card */}
      <div className="app-card" style={{ background: isDanger ? "#fff5f5" : "#f0fdf4", borderColor: isDanger ? "#feb2b2" : "#bbf7d0", marginBottom: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div>
            <p style={{ fontSize: 12, color: "#666" }}>現在の資産残高</p>
            <p style={{ fontSize: 24, fontWeight: 700 }}>¥{currentBalance.toLocaleString()}</p>
          </div>
          <div style={{ textAlign: "right" }}>
            <p style={{ fontSize: 12, color: "#666" }}>最低予測残高</p>
            <p style={{ fontSize: 18, fontWeight: 700, color: isDanger ? "#c53030" : "#2f855a" }}>
              ¥{minBalance.toLocaleString()}
            </p>
          </div>
        </div>
        {isDanger && (
          <p style={{ fontSize: 12, color: "#c53030", marginTop: 8, fontWeight: 600 }}>
            ⚠️ 将来、資金ショートする可能性があります。
          </p>
        )}
      </div>

      {/* Timeline List */}
      <div className="timeline-container">
        {timeline.length === 0 ? (
          <p>予定されているイベントはありません。</p>
        ) : (
          timeline.map((event, index) => {
            const isFuture = event.status === 'forecast';
            const isCardPayment = event.type === 'card_payment';
            const isIncome = event.type === 'income' || (event.type === 'transaction' && event.amount > 0);
            const dateObj = new Date(event.date);
            const dateStr = `${dateObj.getMonth() + 1}/${dateObj.getDate()}`;
            const dayOfWeek = ["日", "月", "火", "水", "木", "金", "土"][dateObj.getDay()];

            return (
              <div key={event.id} style={{
                display: "flex",
                gap: 12,
                padding: "12px 0",
                borderBottom: "1px solid #eee",
                opacity: isFuture ? 0.8 : 1
              }}>
                {/* Date */}
                <div style={{ width: 50, textAlign: "center" }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{dateStr}</div>
                  <div style={{ fontSize: 11, color: "#999" }}>({dayOfWeek})</div>
                </div>

                {/* Content */}
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontWeight: 600, fontSize: 14 }}>
                      {event.label}
                      {isCardPayment && <span style={{ fontSize: 10, background: "#eee", padding: "2px 6px", borderRadius: 4, marginLeft: 6 }}>カード引落</span>}
                      {isFuture && <span style={{ fontSize: 10, border: "1px solid #ccc", padding: "1px 4px", borderRadius: 4, marginLeft: 6, color: "#888" }}>予定</span>}
                    </span>
                    <span style={{ fontWeight: 700, fontSize: 15, color: isIncome ? "#2f855a" : "#c53030" }}>
                      {event.amount > 0 ? "+" : ""}{event.amount.toLocaleString()}
                    </span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 11, color: "#888" }}>
                      {/* Extra info if needed */}
                    </span>
                    <span style={{ fontSize: 12, color: "#666", background: "#f9f9f9", padding: "2px 8px", borderRadius: 12 }}>
                      残 {event.balance?.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div style={{ marginTop: 32, textAlign: "center" }}>
        <Link href="/input" className="btn-primary" style={{ display: "inline-block", textDecoration: "none", padding: "12px 24px" }}>
          + 新しい取引を入力
        </Link>
      </div>

    </div>
  );
}
