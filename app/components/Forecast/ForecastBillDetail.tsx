"use client";

import { Transaction } from "../../hooks/useForecast";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  cardName: string;
  totalAmount: number;
  transactions: Transaction[];
  billDate: string;
};

export default function ForecastBillDetail({ isOpen, onClose, cardName, totalAmount, transactions, billDate }: Props) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" style={{ display: "flex", alignItems: "center", justifyContent: "center", position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(0,0,0,0.5)", zIndex: 1000 }}>
      <div className="app-card" style={{ width: "90%", maxWidth: "450px", margin: 0, maxHeight: "80vh", display: "flex", flexDirection: "column" }}>

        <div style={{ paddingBottom: 12, borderBottom: "1px solid #eee", marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 12, color: "#666" }}>{billDate} 引落予定</div>
            <div style={{ fontSize: 16, fontWeight: "bold" }}>{cardName}</div>
          </div>
          <div style={{ fontSize: 20, fontWeight: "bold", color: "#c44536" }}>
            -¥{totalAmount.toLocaleString()}
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
          {transactions.length === 0 ? (
            <p style={{ fontSize: 12, color: "#999" }}>明細情報がありません</p>
          ) : (
            <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
              <thead style={{ position: "sticky", top: 0, background: "#fff" }}>
                <tr style={{ color: "#888", fontSize: 11, borderBottom: "1px solid #eee" }}>
                  <th style={{ textAlign: "left", padding: 4 }}>日付</th>
                  <th style={{ textAlign: "left", padding: 4 }}>内容</th>
                  <th style={{ textAlign: "right", padding: 4 }}>金額</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((t, i) => (
                  <tr key={t.id || i} style={{ borderBottom: "1px solid #f9f9f9" }}>
                    <td style={{ padding: "8px 4px", fontSize: 11, color: "#666" }}>{t.date.slice(5)}</td>
                    <td style={{ padding: "8px 4px" }}>
                      <div style={{ fontWeight: 500 }}>{t.memo || t.category}</div>
                      <div style={{ fontSize: 10, color: "#888" }}>{t.category}</div>
                    </td>
                    <td style={{ padding: "8px 4px", textAlign: "right", color: "#c44536" }}>
                      ¥{t.amount.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div style={{ marginTop: 16, textAlign: "right", borderTop: "1px solid #eee", paddingTop: 12 }}>
          <button onClick={onClose} className="btn-secondary" style={{ padding: "8px 16px" }}>閉じる</button>
        </div>
      </div>
    </div>
  );
}
