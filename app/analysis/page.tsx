"use client";

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
import { useState } from "react";
import InsightCard from "../components/Analysis/InsightCard";
import { useAnalysisData } from "../hooks/useAnalysisData";
import Skeleton from "../components/Skeleton";

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title
);

export default function AnalysisPage() {
  const {
    viewYear,
    viewMonth,
    label,
    loading,
    handlePrevMonth,
    handleNextMonth,
    searchParams,
    totals,
    maps,
    charts,
    currentTransactions,
    repaymentBreakdown
  } = useAnalysisData();

  const { income, expense, repayment, lastMonthExpense, budget, budgetedExpense } = totals;
  const { category: categoryTotals, lastMonthCategory: lastMonthCategoryTotals, budget: budgetMap } = maps;
  const { daily, category, payment } = charts;

  const diff = income - (expense + repayment);
  const expenseDiff = expense - lastMonthExpense;
  const expenseDiffPercent = lastMonthExpense > 0 ? Math.round((expenseDiff / lastMonthExpense) * 100) : 0;

  // Chart Options
  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      y: { beginAtZero: true, grid: { color: "#f0f0f0" } },
      x: { grid: { display: false } }
    },
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom' as const, labels: { boxWidth: 12, padding: 15 } },
    },
    cutout: "60%",
  };

  // Drill-down State
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const handleCategoryClick = (event: unknown, elements: { index: number }[]) => {
    if (elements.length > 0) {
      const index = elements[0].index;
      const catName = category.labels[index];
      setSelectedCategory(catName);
    }
  };

  const categoryTransactions = selectedCategory
    ? currentTransactions
      .filter(t => {
        if (selectedCategory === "その他") {
          const topCats = category.labels.filter(c => c !== "その他");
          return !topCats.includes(t.category || "未分類");
        }
        return (t.category || "未分類") === selectedCategory;
      })
      .filter(t => t.type === 'expense')
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 20)
    : [];

  const horizontalBarOptions = {
    indexAxis: 'y' as const,
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: { x: { display: false }, y: { grid: { display: false } } },
    onClick: handleCategoryClick,
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

      {loading ? (
        <div className="flex flex-col gap-4">
          <Skeleton height={200} />
          <div className="grid grid-cols-2 gap-3">
            <Skeleton height={100} />
            <Skeleton height={100} />
          </div>
          <Skeleton height={300} />
        </div>
      ) : (
        <>
          {/* Insight Card */}
          <InsightCard
            currentExpense={expense}
            lastMonthExpense={lastMonthExpense}
            transactions={currentTransactions}
            categoryTotals={categoryTotals}
            lastMonthCategoryTotals={lastMonthCategoryTotals}
            totalBudget={budget}
            totalBudgetedExpense={budgetedExpense}
          />

          {/* Summary Cards */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
            {/* Expense Card */}
            <div className="app-card" style={{ padding: 16, background: "#fff" }}>
              <div style={{ fontSize: 12, color: "#666", marginBottom: 4 }}>今月の支出</div>
              <div style={{ fontSize: 20, fontWeight: "bold", color: "#333" }}>¥{expense.toLocaleString()}</div>
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
                収入: ¥{income.toLocaleString()}
              </div>
            </div>
          </div>

          {/* 1. Daily Trend */}
          <div className="app-card" style={{ marginBottom: 20, padding: "16px" }}>
            <h3 style={{ fontSize: 15, fontWeight: "bold", marginBottom: 16, color: "#333" }}>日別推移</h3>
            <div style={{ height: 180 }}>
              <Bar
                data={{
                  labels: daily.labels,
                  datasets: [{
                    label: "支出",
                    data: daily.data,
                    backgroundColor: (ctx) => {
                      const val = ctx.raw as number;
                      const avg = expense / (daily.data.length || 1);
                      return val > avg * 1.5 ? "#e57373" : "#bcaaa4";
                    },
                    borderRadius: 4,
                  }]
                }}
                options={barOptions}
              />
            </div>
          </div>

          {/* 2. Category Ranking & Budget Progress */}
          <div className="app-card" style={{ marginBottom: 20, padding: "16px" }}>
            <h3 style={{ fontSize: 15, fontWeight: "bold", marginBottom: 16, color: "#333" }}>カテゴリ別トップ5</h3>
            <div style={{ fontSize: 11, color: "#999", marginBottom: 8, textAlign: "right" }}>※グラフをタップして詳細を表示</div>
            <div style={{ height: 200 }}>
              {category.data.length > 0 ? (
                <Bar
                  data={{
                    labels: category.labels,
                    datasets: [{
                      label: "支出",
                      data: category.data,
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

            {/* Budget Progress List */}
            {Object.keys(budgetMap).length > 0 && (
              <div style={{ marginTop: "24px", paddingTop: "16px", borderTop: "1px solid #eee" }}>
                <h4 style={{ fontSize: "13px", fontWeight: "bold", color: "#666", marginBottom: "12px" }}>予算進捗</h4>
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {Object.entries(budgetMap).map(([catName, budget]) => {
                    const spent = categoryTotals[catName] || 0;
                    const ratio = Math.min((spent / budget) * 100, 100);
                    const isOver = spent > budget;

                    return (
                      <div key={catName}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginBottom: "4px" }}>
                          <span style={{ fontWeight: "500", color: "#333" }}>{catName}</span>
                          <span>
                            <span style={{ fontWeight: "bold", color: isOver ? "#e53935" : "#333" }}>¥{spent.toLocaleString()}</span>
                            <span style={{ color: "#999", fontSize: "11px" }}> / ¥{budget.toLocaleString()}</span>
                          </span>
                        </div>
                        <div style={{ width: "100%", height: "4px", background: "#f0f0f0", borderRadius: "2px", overflow: "hidden" }}>
                          <div style={{
                            height: "100%",
                            width: `${ratio}%`,
                            background: isOver ? "#e53935" : ratio > 80 ? "#fdd835" : "#43a047",
                            borderRadius: "2px"
                          }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="grid-container">
            {/* 3. Payment Method */}
            <div className="app-card" style={{ marginBottom: 0, padding: "16px" }}>
              <h3 style={{ fontSize: 15, fontWeight: "bold", marginBottom: 16, color: "#333" }}>支払い方法</h3>
              <div style={{ height: 180 }}>
                {payment.data.length > 0 ? (
                  <Doughnut
                    data={{
                      labels: payment.labels,
                      datasets: [{
                        data: payment.data,
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

            {/* 4. Repayment */}
            <div className="app-card" style={{ marginBottom: 0, padding: "16px" }}>
              <h3 style={{ fontSize: 15, fontWeight: "bold", marginBottom: 8, color: "#333" }}>ローン返済</h3>
              <div style={{ fontSize: 24, fontWeight: "bold", color: "#5d4330", marginBottom: 12 }}>
                ¥{repayment.toLocaleString()}
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

          {/* Category Detail Modal */}
          {selectedCategory && (
            <div className="modal-overlay" onClick={() => setSelectedCategory(null)} style={{ display: "flex" }}>
              <div className="bottom-sheet" onClick={e => e.stopPropagation()} style={{ maxHeight: "80vh" }}>
                <div className="sheet-handle" />
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                  <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "bold", color: "#333" }}>{selectedCategory} の詳細</h3>
                  <button onClick={() => setSelectedCategory(null)} style={{ border: "none", background: "none", fontSize: "14px", color: "#666" }}>閉じる</button>
                </div>

                <div style={{ overflowY: "auto", flex: 1 }}>
                  {categoryTransactions.length > 0 ? (
                    <table className="table-basic">
                      <thead>
                        <tr>
                          <th style={{ textAlign: "left", padding: "8px" }}>内容</th>
                          <th style={{ textAlign: "right", padding: "8px" }}>金額</th>
                        </tr>
                      </thead>
                      <tbody>
                        {categoryTransactions.map(t => (
                          <tr key={t.id}>
                            <td style={{ padding: "8px", fontSize: "13px" }}>
                              <div style={{ fontWeight: "500", color: "#333", whiteSpace: "normal" }}>{t.memo || t.category}</div>
                              <div style={{ fontSize: "10px", color: "#999" }}>
                                {new Date(t.date).toLocaleDateString()} {t.payment_methods?.name || "現金"}
                              </div>
                            </td>
                            <td style={{ padding: "8px", textAlign: "right", fontWeight: "bold", fontSize: "13px", verticalAlign: "top" }}>
                              ¥{t.amount.toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div style={{ padding: "20px", textAlign: "center", color: "#999" }}>取引がありません</div>
                  )}
                </div>
                <div style={{ fontSize: "10px", color: "#ccc", textAlign: "center", marginTop: "8px" }}>
                  上位20件を表示（金額順）
                </div>
              </div>
            </div>
          )}

          {/* DEBUG MODE - Dev Only */}
          {process.env.NODE_ENV !== 'production' && searchParams.get("debug") === "1" && (
            <div style={{
              position: "fixed", bottom: 0, left: 0, right: 0,
              background: "rgba(0,0,0,0.85)", color: "#0f0",
              fontSize: "10px", fontFamily: "monospace",
              padding: "10px", zIndex: 9999, overflowX: "auto",
              whiteSpace: "pre-wrap"
            }}>
              <div>[DEBUG MODE]</div>
              <div>selectedMonth: {viewYear}-{String(viewMonth).padStart(2, '0')}</div>
              <div>totalBudget: {budget}</div>
              <div>totalSpent: {budgetedExpense}</div>
              <div>remainingBudget: {budget - budgetedExpense}</div>
              <div>overBudgetCategories: {JSON.stringify(
                Object.entries(budgetMap)
                  .map(([cat, bud]) => {
                    const spent = categoryTotals[cat] || 0;
                    return { category: cat, budget: bud, spent, diff: bud - spent };
                  })
                  .filter(item => item.diff < 0),
                null, 2
              )}</div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
