"use client";

import { useEffect, useState } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Line } from "react-chartjs-2";
import { useForecast, ForecastEvent } from "../hooks/useForecast";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

import ForecastBillDetail from "../components/Forecast/ForecastBillDetail";
import ForecastBalanceDetail from "../components/Forecast/ForecastBalanceDetail";

export default function ForecastPage() {
  const { events, balanceHistory, startBalance, assetBreakdown, loading } = useForecast(6);
  const [paidBills, setPaidBills] = useState<{ [key: string]: boolean }>({});
  const [selectedBill, setSelectedBill] = useState<ForecastEvent | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const raw = localStorage.getItem("paidBills");
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (raw) setPaidBills(JSON.parse(raw));
    }
  }, []);

  const togglePaid = (id: string) => {
    setPaidBills(prev => {
      const next = { ...prev, [id]: !prev[id] };
      localStorage.setItem("paidBills", JSON.stringify(next));
      return next;
    });
  };

  const chartData = {
    labels: balanceHistory.map((r) => r.dateStr.slice(5)),
    datasets: [
      {
        label: "残高推移",
        data: balanceHistory.map((r) => r.balance),
        borderColor: "#b58b5a",
        backgroundColor: "rgba(181, 139, 90, 0.2)",
        tension: 0.2,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
    },
    scales: {
      y: { beginAtZero: false },
    },
  };

  // 支払予定一覧（今月・来月）
  const today = new Date();
  const next2Months = new Date(today.getFullYear(), today.getMonth() + 2, 0);
  const upComingBills = events.filter(e => e.amount < 0 && e.date <= next2Months && e.date >= today);

  const handleEventClick = (ev: ForecastEvent) => {
    if (ev.type === "card_debit" && ev.sourceTransactions) {
      setSelectedBill(ev);
    }
  };

  return (
    <div className="page-container" style={{ paddingBottom: 100 }}>
      <h1>資金繰り予測</h1>
      <p style={{ marginBottom: 16 }}>
        将来の残高推移と直近の支払予定を確認できます。
      </p>

      {loading && <p>計算中...</p>}

      {!loading && (
        <>
          <div className="app-card" style={{ marginBottom: 24 }}>
            <h2>残高推移 (6ヶ月)</h2>
            <div style={{ display: "flex", alignItems: "center", marginBottom: 8 }}>
              <p style={{ fontSize: 12, color: "#999", margin: 0 }}>現在の資産: ¥{startBalance.toLocaleString()}</p>
              <ForecastBalanceDetail totalBalance={startBalance} breakdown={assetBreakdown} />
            </div>

            <div style={{ position: "relative", width: "100%", maxWidth: "100%", height: "220px", overflow: "hidden" }}>
              <Line data={chartData} options={chartOptions} />
            </div>
          </div>

          <div className="app-card">
            <h2>直近の支払い予定</h2>
            {upComingBills.length === 0 ? (
              <p>予定されている支払いはありません。</p>
            ) : (
              <div className="desktop-table-view">
                <table className="table-basic">
                  <thead>
                    <tr>
                      <th>日付</th>
                      <th>内容</th>
                      <th style={{ textAlign: "right" }}>金額</th>
                      <th>状況</th>
                    </tr>
                  </thead>
                  <tbody>
                    {upComingBills.map(ev => {
                      const isPaid = paidBills[ev.id];
                      const isCard = ev.type === "card_debit";
                      return (
                        <tr key={ev.id}>
                          <td>{ev.dateStr}</td>
                          <td>
                            {isCard ? (
                              <span
                                onClick={() => handleEventClick(ev)}
                                style={{ color: "#007bff", cursor: "pointer", textDecoration: "underline", textDecorationStyle: "dotted" }}
                              >
                                {ev.label} ℹ️
                              </span>
                            ) : (
                              ev.label
                            )}
                          </td>
                          <td style={{ textAlign: "right" }}>¥{Math.abs(ev.amount).toLocaleString()}</td>
                          <td style={{ textAlign: "center" }}>
                            <button
                              onClick={() => togglePaid(ev.id)}
                              style={{
                                padding: "4px 8px",
                                borderRadius: 4,
                                border: "none",
                                fontSize: 12,
                                background: isPaid ? "#edf7ec" : "#fff5f3",
                                color: isPaid ? "#2f7d32" : "#c44536",
                                cursor: "pointer"
                              }}
                            >
                              {isPaid ? "済" : "未"}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            {/* Mobile View */}
            <div className="mobile-card-view">
              {upComingBills.map(ev => {
                const isPaid = paidBills[ev.id];
                const isCard = ev.type === "card_debit";
                return (
                  <div key={ev.id} className="list-card-item">
                    <div className="list-card-row">
                      <span className="list-card-label">{ev.dateStr}</span>
                      <span className="list-card-value">
                        {isCard ? (
                          <span onClick={() => handleEventClick(ev)} style={{ color: "#007bff", textDecoration: "underline" }}>
                            {ev.label} ℹ️
                          </span>
                        ) : ev.label}
                      </span>
                    </div>
                    <div className="list-card-row">
                      <span className="list-card-label">金額</span>
                      <span className="list-card-value">¥{Math.abs(ev.amount).toLocaleString()}</span>
                    </div>
                    <div className="list-card-row" style={{ marginTop: 8, justifyContent: "flex-end" }}>
                      <button
                        onClick={() => togglePaid(ev.id)}
                        style={{
                          padding: "6px 12px",
                          borderRadius: 4,
                          border: "1px solid",
                          fontSize: 12,
                          background: isPaid ? "#edf7ec" : "#fff",
                          color: isPaid ? "#2f7d32" : "#c44536",
                          borderColor: isPaid ? "#2f7d32" : "#c44536",
                          cursor: "pointer"
                        }}
                      >
                        {isPaid ? "支払い済みにする" : "未払いです"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {selectedBill && (
        <ForecastBillDetail
          isOpen={!!selectedBill}
          onClose={() => setSelectedBill(null)}
          cardName={selectedBill.label}
          totalAmount={Math.abs(selectedBill.amount)}
          transactions={selectedBill.sourceTransactions || []}
          billDate={selectedBill.dateStr}
        />
      )}
    </div>
  );
}
