// app/analysis/page.tsx
"use client";

import { useEffect, useState } from "react";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
} from "chart.js";
import { Doughnut, Bar } from "react-chartjs-2";
import { supabase } from "../../lib/supabaseClient";

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title
);

type Transaction = {
  id: string;
  date: string;
  amount: number;
  type: "expense" | "income" | "repayment" | "card_payment";
  category: string;
  payment: string; // Legacy name
  memo: string;
  payment_methods?: {
    name: string;
    type: "cash" | "bank" | "card" | "wallet";
  };
};

// 表示用の年月ラベル
function monthLabel(year: number, month: number): string {
  return `${year}年${month}月`;
}

export default function AnalysisPage() {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth() + 1);
  const [loading, setLoading] = useState(true);

  // Current Month Totals
  const [incomeTotal, setIncomeTotal] = useState(0);
  const [expenseTotal, setExpenseTotal] = useState(0);
  const [repaymentTotal, setRepaymentTotal] = useState(0);

  // Comparison
  const [lastMonthExpense, setLastMonthExpense] = useState(0);

  // Breakdown
  const [repaymentBreakdown, setRepaymentBreakdown] = useState<{ name: string, amount: number }[]>([]);

  // Chart Data
  const [dailyData, setDailyData] = useState<number[]>([]);
  const [dailyLabels, setDailyLabels] = useState<string[]>([]);

  const [categoryLabels, setCategoryLabels] = useState<string[]>([]);
  const [categoryData, setCategoryData] = useState<number[]>([]);

  const [paymentLabels, setPaymentLabels] = useState<string[]>([]);
  const [paymentData, setPaymentData] = useState<number[]>([]);

  const label = monthLabel(viewYear, viewMonth);

  // Month Navigation
  const handlePrevMonth = () => {
    setViewMonth((prev) => {
      if (prev === 1) {
        setViewYear((y) => y - 1);
        return 12;
      }
      return prev - 1;
    });
  };

  const handleNextMonth = () => {
    setViewMonth((prev) => {
      if (prev === 12) {
        setViewYear((y) => y + 1);
        return 1;
      }
      return prev + 1;
    });
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Calculate Date Ranges
        // Current Month
        const currentStart = `${viewYear}-${String(viewMonth).padStart(2, '0')}-01`;
        const currentEndObj = new Date(viewYear, viewMonth, 0); // Last day of viewMonth
        const currentEnd = `${viewYear}-${String(viewMonth).padStart(2, '0')}-${currentEndObj.getDate()}`;

        // Previous Month
        let lastYear = viewYear;
        let lastMonth = viewMonth - 1;
        if (lastMonth === 0) {
          lastMonth = 12;
          lastYear -= 1;
        }
        const lastStart = `${lastYear}-${String(lastMonth).padStart(2, '0')}-01`;

        // Fetch BOTH months
        // range: lastStart to currentEnd
        const { data, error } = await supabase
          .from("transactions")
          .select("*, payment_methods(name, type)")
          .eq("user_id", user.id)
          .gte("date", lastStart)
          .lte("date", currentEnd);

        if (error) throw error;

        const txs = (data || []) as Transaction[];

        // Aggregators
        let curIncome = 0;
        let curExpense = 0;
        let curRepayment = 0;
        let prevExpense = 0;

        const dailyMap = new Array(32).fill(0); // Index 1-31
        const catMap: { [key: string]: number } = {};
        const payMap: { [key: string]: number } = {};
        const repayMap: { [key: string]: number } = {};

        txs.forEach((t) => {
          const d = new Date(t.date);
          const tYear = d.getFullYear();
          const tMonth = d.getMonth() + 1;
          const amt = Number(t.amount);

          const isCurrent = tYear === viewYear && tMonth === viewMonth;
          const isLast = tYear === lastYear && tMonth === lastMonth;

          if (isLast) {
            if (t.type === "expense") {
              prevExpense += amt;
            }
          }

          if (isCurrent) {
            if (t.type === "income") {
              curIncome += amt;
            } else if (t.type === "repayment") {
              curRepayment += amt;
              // Repayment Breakdown
              // Use Memo or Category or generic name
              const name = t.memo || t.category || "返済";
              repayMap[name] = (repayMap[name] || 0) + amt;

            } else if (t.type === "expense") {
              curExpense += amt;

              // 1. Daily Trend
              const day = d.getDate();
              dailyMap[day] += amt;

              // 2. Category Ranking
              const cat = t.category || "未分類";
              catMap[cat] = (catMap[cat] || 0) + amt;

              // 3. Payment Method
              let pType = "現金・その他";
              if (t.payment_methods?.type === "card") pType = "カード";
              else if (t.payment_methods?.type === "bank") pType = "銀行";
              else if (t.payment_methods?.type === "cash") pType = "現金";
              else if (t.payment_methods?.type === "wallet") pType = "電子マネー";

              payMap[pType] = (payMap[pType] || 0) + amt;
            }
          }
        });

        setIncomeTotal(curIncome);
        setExpenseTotal(curExpense);
        setRepaymentTotal(curRepayment);
        setLastMonthExpense(prevExpense);

        // Repayment List
        setRepaymentBreakdown(Object.entries(repayMap).map(([name, amount]) => ({ name, amount })));

        // Daily Data
        const daysInMonth = new Date(viewYear, viewMonth, 0).getDate();
        setDailyLabels(Array.from({ length: daysInMonth }, (_, i) => `${i + 1}`));
        setDailyData(dailyMap.slice(1, daysInMonth + 1));

        // Category Ranking (Top 5)
        const sortedCats = Object.entries(catMap).sort((a, b) => b[1] - a[1]);
        const top5 = sortedCats.slice(0, 5);
        const others = sortedCats.slice(5).reduce((sum, [, val]) => sum + val, 0);

        const finalCatLabels = top5.map(([k]) => k);
        const finalCatData = top5.map(([, v]) => v);
        if (others > 0) {
          finalCatLabels.push("その他");
          finalCatData.push(others);
        }
        setCategoryLabels(finalCatLabels);
        setCategoryData(finalCatData);

        // Payment Method
        setPaymentLabels(Object.keys(payMap));
        setPaymentData(Object.values(payMap));

      } catch (err) {
        console.error("Analysis load error", err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [viewYear, viewMonth]);

  const diff = incomeTotal - (expenseTotal + repaymentTotal);
  const expenseDiff = expenseTotal - lastMonthExpense;
  const expenseDiffPercent = lastMonthExpense > 0 ? Math.round((expenseDiff / lastMonthExpense) * 100) : 0;

  // Chart Options
  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
    },
    scales: {
      y: { beginAtZero: true, grid: { color: "#f0f0f0" } },
      x: { grid: { display: false } }
    },
  };

  const horizontalBarOptions = {
    indexAxis: 'y' as const,
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
    },
    scales: {
      x: { display: false },
      y: { grid: { display: false } }
    }
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom' as const, labels: { boxWidth: 12, padding: 15 } },
    },
    cutout: "60%",
  };

  return (
    <div className="page-container" style={{ paddingBottom: 100, background: "#fafafa" }}>
      <h1 className="page-title">家計分析</h1>

      {/* Month Selector */}
      <div className="card-base" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, padding: "12px 16px" }}>
        <button className="btn-icon" onClick={handlePrevMonth}>←</button>
        <span style={{ fontSize: 16, fontWeight: "bold", color: "#333" }}>{label}</span>
        <button className="btn-icon" onClick={handleNextMonth}>→</button>
      </div>

      {/* Summary Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
        {/* Expense Card (Primary) */}
        <div className="app-card" style={{ padding: 16, background: "#fff" }}>
          <div style={{ fontSize: 12, color: "#666", marginBottom: 4 }}>今月の支出</div>
          <div style={{ fontSize: 20, fontWeight: "bold", color: "#333" }}>¥{expenseTotal.toLocaleString()}</div>
          <div style={{ fontSize: 11, color: expenseDiff > 0 ? "#e53935" : "#43a047", marginTop: 4 }}>
            先月比: {expenseDiff > 0 ? '+' : ''}{expenseDiff.toLocaleString()} ({expenseDiffPercent > 0 ? '+' : ''}{expenseDiffPercent}%)
          </div>
        </div>

        {/* Balance Card */}
        <div className="app-card" style={{ padding: 16, background: "#fff" }}>
          <div style={{ fontSize: 12, color: "#666", marginBottom: 4 }}>収支差額</div>
          <div style={{ fontSize: 20, fontWeight: "bold", color: diff >= 0 ? "#333" : "#e53935" }}>
            ¥{diff.toLocaleString()}
          </div>
          <div style={{ fontSize: 11, color: "#999", marginTop: 4 }}>
            収入: ¥{incomeTotal.toLocaleString()}
          </div>
        </div>
      </div>

      {/* 1. Daily Trend */}
      <div className="app-card" style={{ marginBottom: 20, padding: "16px" }}>
        <h3 style={{ fontSize: 15, fontWeight: "bold", marginBottom: 16, color: "#333" }}>日別推移</h3>
        <div style={{ height: 180 }}>
          <Bar
            data={{
              labels: dailyLabels,
              datasets: [{
                label: "支出",
                data: dailyData,
                backgroundColor: (ctx) => {
                  const val = ctx.raw as number;
                  const avg = expenseTotal / (dailyData.length || 1);
                  return val > avg * 1.5 ? "#e57373" : "#bcaaa4"; // Highlight spikes
                },
                borderRadius: 4,
              }]
            }}
            options={barOptions}
          />
        </div>
      </div>

      {/* 2. Category Ranking */}
      <div className="app-card" style={{ marginBottom: 20, padding: "16px" }}>
        <h3 style={{ fontSize: 15, fontWeight: "bold", marginBottom: 16, color: "#333" }}>カテゴリ別トップ5</h3>
        <div style={{ height: 200 }}>
          {categoryData.length > 0 ? (
            <Bar
              data={{
                labels: categoryLabels,
                datasets: [{
                  label: "支出",
                  data: categoryData,
                  backgroundColor: ["#8d6e63", "#a1887f", "#bcaaa4", "#d7ccc8", "#efebe9", "#eee"],
                  borderRadius: 4,
                  barThickness: 20,
                }]
              }}
              options={horizontalBarOptions}
            />
          ) : (
            <div style={{ textAlign: "center", color: "#999", paddingTop: 60 }}>データなし</div>
          )}
        </div>
      </div>

      <div className="grid-container">
        {/* 3. Payment Method */}
        <div className="app-card" style={{ marginBottom: 0, padding: "16px" }}>
          <h3 style={{ fontSize: 15, fontWeight: "bold", marginBottom: 16, color: "#333" }}>支払い方法</h3>
          <div style={{ height: 180 }}>
            {paymentData.length > 0 ? (
              <Doughnut
                data={{
                  labels: paymentLabels,
                  datasets: [{
                    data: paymentData,
                    backgroundColor: ["#ffb74d", "#4db6ac", "#9575cd", "#90a4ae"],
                    borderWidth: 0,
                  }]
                }}
                options={doughnutOptions}
              />
            ) : (
              <div style={{ textAlign: "center", color: "#999", paddingTop: 60 }}>データなし</div>
            )}
          </div>
        </div>

        {/* 4. Repayment (Separate) */}
        <div className="app-card" style={{ marginBottom: 0, padding: "16px" }}>
          <h3 style={{ fontSize: 15, fontWeight: "bold", marginBottom: 8, color: "#333" }}>ローン返済</h3>
          <div style={{ fontSize: 24, fontWeight: "bold", color: "#5d4330", marginBottom: 12 }}>
            ¥{repaymentTotal.toLocaleString()}
          </div>
          {repaymentBreakdown.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {repaymentBreakdown.map((item, idx) => (
                <div key={idx} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, borderBottom: "1px solid #eee", paddingBottom: 4 }}>
                  <span style={{ color: "#666" }}>{item.name}</span>
                  <span>¥{item.amount.toLocaleString()}</span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: 12, color: "#999" }}>今月の返済はありません</div>
          )}
        </div>
      </div>
    </div>
  );
}
