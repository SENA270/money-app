"use client";

import React, { useMemo } from "react";
import { ArrowUp, ArrowDown, TrendingUp, TrendingDown, Minus } from "lucide-react";

type Transaction = {
  id: string;
  amount: number;
  type: string;
  date: string;
  category: string;
  memo: string;
};

type InsightCardProps = {
  currentExpense: number;
  lastMonthExpense: number;
  transactions: Transaction[];
  categoryTotals: { [key: string]: number };
  lastMonthCategoryTotals: { [key: string]: number };
  totalBudget?: number; // NEW
  totalBudgetedExpense?: number; // NEW
};

export default function InsightCard(props: InsightCardProps) {
  const {
    currentExpense,
    lastMonthExpense,
    transactions,
    categoryTotals,
    lastMonthCategoryTotals,
    totalBudget = 0,
    totalBudgetedExpense = 0,
  } = props;

  // 1. Calculate Difference
  const diff = currentExpense - lastMonthExpense;
  const isUp = diff > 0;
  const absDiff = Math.abs(diff);

  // 2. Identify Driver (Category with biggest increase/decrease)
  const driver = useMemo(() => {
    let maxChange = 0;
    let driverCat = "";

    // Check all current categories
    Object.keys(categoryTotals).forEach(cat => {
      const cur = categoryTotals[cat] || 0;
      const last = lastMonthCategoryTotals[cat] || 0;
      const change = cur - last;

      // If overall is UP, look for biggest POSITIVE change
      // If overall is DOWN, look for biggest NEGATIVE change (contribution to decrease)
      if (isUp && change > maxChange) {
        maxChange = change;
        driverCat = cat;
      } else if (!isUp && change < maxChange) {
        maxChange = change;
        driverCat = cat; // change is negative, keep it
      }
    });

    return { name: driverCat, amount: maxChange };
  }, [categoryTotals, lastMonthCategoryTotals, isUp]);

  // 3. Top 3 Expenses (High Impact List)
  const top3 = useMemo(() => {
    return transactions
      .filter(t => t.type === 'expense')
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 3);
  }, [transactions]);

  // 4. Generate Summary Text
  // "Expenses up ¥20k, primarily driven by [Category] (+¥15k)"
  // 4. Generate Summary Text
  // "Expenses up ¥20k, primarily driven by [Category] (+¥15k)"
  const summaryText = useMemo(() => {
    if (absDiff < 1000) return "先月とほぼ同じ水準です。";

    const direction = isUp ? "増加" : "減少";

    // driver is { name: string, amount: number }
    const driverName = driver.name;
    const driverAmount = driver.amount;

    // If driver amount is 0, just generic message
    if (!driverName || Math.abs(driverAmount) === 0) {
      return `先月より${absDiff.toLocaleString()}円${direction}しています。`;
    }

    const driverDirection = driverAmount > 0 ? "増えた" : "減った";
    const driverImpact = Math.abs(driverAmount).toLocaleString();

    return `先月より${absDiff.toLocaleString()}円${direction}しています。主に「${driverName}」が${driverImpact}円${driverDirection}ことが要因です。`;
  }, [absDiff, isUp, driver]);

  return (
    <div className="app-card" style={{
      background: "linear-gradient(135deg, #fffaf0 0%, #fff 100%)",
      border: "1px solid #e6dcc8",
      padding: "16px",
      marginBottom: "16px"
    }}>
      {/* Header: Trend & Summary */}
      <div style={{ display: "flex", gap: "12px", marginBottom: "16px" }}>
        <div style={{
          width: "48px", height: "48px", borderRadius: "12px",
          background: isUp ? "#ffebeb" : "#e8f5e9",
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0
        }}>
          {isUp ? <TrendingUp size={24} color="#e53935" /> : <TrendingDown size={24} color="#43a047" />}
        </div>
        <div>
          <div style={{ fontSize: "13px", color: "#8c7b6c", fontWeight: "bold" }}>
            {isUp ? "支出が増えています" : "支出が減りました"}
          </div>
          <div style={{ fontSize: "14px", color: "#5d4330", lineHeight: "1.4", marginTop: "4px" }}>
            {summaryText}
          </div>
        </div>
      </div>

      {/* Budget Status (NEW) */}
      {totalBudget > 0 && (
        <div style={{ marginBottom: "16px", padding: "12px", background: "#fcfcfc", borderRadius: "8px", border: "1px solid #eee" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "4px" }}>
            <span style={{ fontSize: "11px", color: "#999", fontWeight: "600", textTransform: "uppercase" }}>
              Budget (設定済みのみ)
            </span>
            <span style={{ fontSize: "12px", fontWeight: "bold", color: totalBudgetedExpense > totalBudget ? "#e53935" : "#43a047" }}>
              {totalBudgetedExpense > totalBudget ? "Over" : "Safe"}
            </span>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <span style={{ fontSize: "14px", color: "#333" }}>
              残り: <span style={{ fontWeight: "bold" }}>¥{(totalBudget - totalBudgetedExpense).toLocaleString()}</span>
            </span>
            <span style={{ fontSize: "11px", color: "#666" }}>
              {Math.round((totalBudgetedExpense / totalBudget) * 100)}% 消化
            </span>
          </div>

          {/* Progress Bar */}
          <div style={{ width: "100%", height: "6px", background: "#eee", borderRadius: "3px", marginTop: "8px", overflow: "hidden" }}>
            <div style={{
              height: "100%",
              borderRadius: "3px",
              width: `${Math.min((totalBudgetedExpense / totalBudget) * 100, 100)}%`,
              background: totalBudgetedExpense > totalBudget ? "#e53935" : totalBudgetedExpense > totalBudget * 0.8 ? "#fdd835" : "#43a047"
            }} />
          </div>
        </div>
      )}

      {/* High Impact List (Top 3) */}
      <div style={{ background: "rgba(255,255,255,0.6)", borderRadius: "8px", padding: "12px" }}>
        <div style={{ fontSize: "11px", color: "#999", marginBottom: "8px", fontWeight: "600", textTransform: "uppercase" }}>
          Top 3 Major Expenses
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {top3.map((t, idx) => (
            <div key={t.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", overflow: "hidden" }}>
                <span style={{
                  fontSize: "10px", fontWeight: "bold", color: "#fff",
                  background: idx === 0 ? "#dab074" : idx === 1 ? "#a8a8a8" : "#c48b68",
                  width: "16px", height: "16px", borderRadius: "4px", display: "flex", alignItems: "center", justifyContent: "center"
                }}>
                  {idx + 1}
                </span>
                <span style={{ fontSize: "13px", color: "#333", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {t.memo || t.category}
                </span>
              </div>
              <span style={{ fontSize: "13px", fontWeight: "bold", color: "#333" }}>
                ¥{t.amount.toLocaleString()}
              </span>
            </div>
          ))}
          {top3.length === 0 && <div style={{ fontSize: "12px", color: "#ccc" }}>データがありません</div>}
        </div>
      </div>

    </div>
  );
}
