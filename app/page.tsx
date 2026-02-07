"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../lib/supabaseClient";
import { useTimeline } from "./hooks/useTimeline";
import { useCategories } from "./hooks/useCategories";
import { calculateMonthlyAnalysis } from "./lib/analysisCalculator";
import { Transaction, AnalysisResult } from "./types";

export default function Home() {
  const { timeline, currentBalance, loading: timelineLoading } = useTimeline(6);
  const { categories, loading: catLoading } = useCategories();

  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(true);

  // Date Basics
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth() + 1;
  const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
  const remainingDays = daysInMonth - today.getDate();

  // 1. Calculate Analysis (Current Month Spending)
  useEffect(() => {
    const loadAnalysis = async () => {
      if (catLoading) return;

      try {
        setAnalysisLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const start = new Date(currentYear, currentMonth - 1, 1).toISOString();
        const end = new Date(currentYear, currentMonth, 1).toISOString();

        const { data: txData } = await supabase
          .from("transactions")
          .select("*")
          .eq("user_id", user.id)
          .gte("date", start)
          .lt("date", end);

        const transactions = (txData || []) as Transaction[];
        const result = calculateMonthlyAnalysis(transactions, categories, currentYear, currentMonth);
        setAnalysis(result);
      } catch (e) {
        console.error(e);
      } finally {
        setAnalysisLoading(false);
      }
    };
    loadAnalysis();
  }, [categories, catLoading, currentYear, currentMonth]);


  // 2. Identify Danger Date
  // Find first future event where balance < 0
  const dangerEvent = timeline.find(e => e.status === 'forecast' && (e.balance || 0) < 0);
  const dangerDate = dangerEvent ? new Date(dangerEvent.date) : null;
  const daysUntilDanger = dangerDate ? Math.ceil((dangerDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) : null;

  // 3. Next Payment
  // Find first future negative event
  const nextPayment = timeline.find(e => e.status === 'forecast' && e.amount < 0);


  if (timelineLoading || catLoading || analysisLoading) {
    return <div className="page-container" style={{ paddingTop: 40, textAlign: "center" }}>Loading Dashboard...</div>;
  }

  const totalSpent = analysis?.total || 0;

  return (
    <div className="page-container padding-bottom-nav">

      <header style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 20, color: "#5d4330" }}>{currentYear}年{currentMonth}月</h1>
      </header>

      {/* 1. Asset Balance Card */}
      <div className="app-card" style={{ background: "#2c3e50", color: "#fff" }}>
        <p style={{ fontSize: 12, opacity: 0.8, marginBottom: 4 }}>現在の資産残高</p>
        <p style={{ fontSize: 32, fontWeight: 700, letterSpacing: 1 }}>
          ¥{currentBalance.toLocaleString()}
        </p>
        {dangerDate ? (
          <div style={{ marginTop: 12, padding: "8px 12px", background: "rgba(231, 76, 60, 0.2)", borderRadius: 6, border: "1px solid #e74c3c", color: "#ffcccc", fontSize: 13 }}>
            ⚠️ {daysUntilDanger}日後 ({dangerDate.getMonth() + 1}/{dangerDate.getDate()}) に資金ショートの可能性があります
          </div>
        ) : (
          <div style={{ marginTop: 12, fontSize: 12, opacity: 0.7 }}>
            ✅ 当面の資金繰りは安全です
          </div>
        )}
      </div>

      {/* 2. Monthly Summary */}
      <div className="grid-container" style={{ marginTop: 16 }}>
        {/* Spent */}
        <div className="app-card" style={{ marginBottom: 0 }}>
          <p style={{ fontSize: 12, color: "#888" }}>今月の支出</p>
          <p style={{ fontSize: 24, fontWeight: 700, color: "#333" }}>¥{totalSpent.toLocaleString()}</p>
          <p style={{ fontSize: 11, color: "#aaa", marginTop: 4 }}>
            残り{remainingDays}日
          </p>
        </div>

        {/* Next Payment */}
        <div className="app-card" style={{ marginBottom: 0 }}>
          <p style={{ fontSize: 12, color: "#888" }}>次の支払い</p>
          {nextPayment ? (
            <>
              <p style={{ fontSize: 18, fontWeight: 700, color: "#c0392b" }}>
                ¥{Math.abs(nextPayment.amount).toLocaleString()}
              </p>
              <p style={{ fontSize: 11, color: "#555", marginTop: 4 }}>
                {new Date(nextPayment.date).getMonth() + 1}/{new Date(nextPayment.date).getDate()} : {nextPayment.label}
              </p>
            </>
          ) : (
            <p style={{ fontSize: 14, color: "#aaa", marginTop: 8 }}>予定なし</p>
          )}
        </div>
      </div>

      {/* 3. Top Categories */}
      <div style={{ marginTop: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h3 style={{ fontSize: 16, color: "#5d4330", margin: 0 }}>カテゴリ別支出 (Top 3)</h3>
          <Link href="/analysis" style={{ fontSize: 12, color: "#888", textDecoration: "none" }}>すべて見る &gt;</Link>
        </div>

        <div className="app-card" style={{ padding: "8px 0" }}>
          {(analysis?.categories || []).slice(0, 3).map((cat, idx) => (
            <div key={cat.categoryId} style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "12px 16px",
              borderBottom: idx < 2 ? "1px solid #f0f0f0" : "none"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{
                  width: 24, height: 24, borderRadius: "50%",
                  background: idx === 0 ? "#f1c40f" : idx === 1 ? "#bdc3c7" : "#e67e22",
                  color: "#fff", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold"
                }}>
                  {idx + 1}
                </div>
                <span style={{ fontSize: 14, fontWeight: 600, color: "#333" }}>{cat.categoryName}</span>
              </div>
              <span style={{ fontSize: 15, fontWeight: 700, color: "#333" }}>
                ¥{cat.amount.toLocaleString()}
              </span>
            </div>
          ))}
          {(analysis?.categories || []).length === 0 && (
            <p style={{ textAlign: "center", fontSize: 12, color: "#aaa", padding: 16 }}>データがありません</p>
          )}
        </div>
      </div>

      {/* 4. Actions */}
      <div style={{ marginTop: 24, display: "flex", gap: 12 }}>
        <Link href="/input" className="btn-primary" style={{ flex: 1, textAlign: "center", textDecoration: "none", padding: 14 }}>
          取引入力
        </Link>
        <Link href="/timeline" className="btn-secondary" style={{ flex: 1, textAlign: "center", textDecoration: "none", padding: 14 }}>
          タイムライン
        </Link>
      </div>

    </div>
  );
}
