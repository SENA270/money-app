"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { supabase } from "../lib/supabaseClient";
import { useTimeline } from "./hooks/useTimeline";
import { useCategories } from "./hooks/useCategories";
import { calculateMonthlyAnalysis } from "./lib/analysisCalculator";
import { Transaction, AnalysisResult } from "./types";
import LoanStatusWidget from "./components/Summary/LoanStatusWidget";
import ForecastHealthWidget from "./components/Summary/ForecastHealthWidget";

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
  // Optimization: Fetch transactions in parallel, don't wait for categories to start fetching
  const [monthTransactions, setMonthTransactions] = useState<Transaction[]>([]);
  const [txLoading, setTxLoading] = useState(true);

  useEffect(() => {
    const fetchMonthTx = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const start = new Date(currentYear, currentMonth - 1, 1).toISOString();
        const end = new Date(currentYear, currentMonth, 1).toISOString();

        const { data } = await supabase
          .from("transactions")
          .select("*")
          .eq("user_id", user.id)
          .gte("date", start)
          .lt("date", end);

        setMonthTransactions((data || []) as Transaction[]);
      } catch (e) {
        console.error(e);
      } finally {
        setTxLoading(false);
      }
    };
    fetchMonthTx();
  }, [currentYear, currentMonth]);

  // Combine Transactions + Categories when both ready
  useEffect(() => {
    if (catLoading || txLoading) {
      setAnalysisLoading(true);
      return;
    }
    const result = calculateMonthlyAnalysis(monthTransactions, categories, currentYear, currentMonth);
    setAnalysis(result);
    setAnalysisLoading(false);
  }, [monthTransactions, categories, catLoading, txLoading, currentYear, currentMonth]);


  // 2. Identify Danger Date
  const { dangerDate, daysUntilDanger } = useMemo(() => {
    // Find first future event where balance < 0
    const dangerEvent = timeline.find(e => e.status === 'forecast' && (e.balance || 0) < 0);
    const dDate = dangerEvent ? new Date(dangerEvent.date) : null;
    const days = dDate ? Math.ceil((dDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) : null;
    return { dangerDate: dDate, daysUntilDanger: days };
  }, [timeline]);

  // 3. Next Payment
  const nextPayment = useMemo(() => {
    return timeline.find(e => e.status === 'forecast' && e.amount < 0);
  }, [timeline]);


  if (timelineLoading || catLoading || analysisLoading) {
    return (
      <div className="page-container padding-bottom-nav">
        <header style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 20, color: "#5d4330" }}>{currentYear}年{currentMonth}月</h1>
        </header>

        {/* Asset Skeleton */}
        <div className="bg-[#2c3e50] rounded-2xl p-5 mb-4 shadow-lg mx-auto w-full max-w-md h-[140px] animate-pulse relative">
          <div className="absolute inset-0 bg-gray-700 opacity-20" />
        </div>

        {/* Loan Widget Skeleton */}
        <div className="app-card h-[80px] animate-pulse bg-gray-200" />

        {/* Summary Skeleton */}
        <div className="grid-container" style={{ marginTop: 16 }}>
          <div className="app-card h-[100px] animate-pulse bg-gray-200" style={{ marginBottom: 0 }} />
          <div className="app-card h-[100px] animate-pulse bg-gray-200" style={{ marginBottom: 0 }} />
        </div>
      </div>
    );
  }

  const totalSpent = analysis?.total || 0;

  return (
    <div className="page-container padding-bottom-nav">

      <header style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 20, color: "#5d4330" }}>{currentYear}年{currentMonth}月</h1>
      </header>

      {/* 1. Asset Balance Card (Compact) */}
      <div className="bg-[#2c3e50] text-white rounded-2xl p-5 mb-4 shadow-lg mx-auto w-full max-w-md relative overflow-hidden">
        <div className="flex justify-between items-end relative z-10">
          <div>
            <p className="text-xs text-gray-300 mb-0.5 tracking-wide">現在の資産残高</p>
            <p className="text-3xl font-bold tracking-tight font-mono">
              ¥{currentBalance.toLocaleString()}
            </p>
          </div>
          <div className="mb-1">
            <ForecastHealthWidget daysUntilDanger={daysUntilDanger} dangerDate={dangerDate} />
          </div>
        </div>

        {/* Decorative Circle */}
        <div className="absolute -right-6 -top-10 w-32 h-32 bg-white/5 rounded-full blur-2xl pointer-events-none" />
      </div>

      {/* 2. Loan Status (New) */}
      <LoanStatusWidget />

      {/* 3. Monthly Summary */}
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
