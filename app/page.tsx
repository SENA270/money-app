"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../lib/supabaseClient";
import { useForecast } from "./hooks/useForecast";
import { useBudgetCoach } from "./hooks/useBudgetCoach";

type Totals = {
  [key: string]: number;
};

function getRemainingDaysForMonth(): number {
  const today = new Date();
  const y = today.getFullYear();
  const m = today.getMonth() + 1;
  const lastDay = new Date(y, m, 0).getDate();
  const currentDay = today.getDate();
  return lastDay - currentDay;
}

export default function Home() {
  const today = new Date();
  const viewYear = today.getFullYear();
  const viewMonth = today.getMonth() + 1;
  const displayMonthLabel = `${viewYear}年${viewMonth}月`;

  const [monthlyExpense, setMonthlyExpense] = useState(0);
  const [monthlyBudgetTotal, setMonthlyBudgetTotal] = useState(0);
  const [categorySpent, setCategorySpent] = useState<Totals>({});
  const [categoryBudget, setCategoryBudget] = useState<Totals>({});

  // Forecast Hook for "Next Payment"
  const { nextPaymentEvent, upcomingPayments, startBalance, loading: forecastLoading } = useForecast(3);

  // Load Budget & Expenses
  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Budget (Category Sum fallback for MVP)
      const { data: bData } = await supabase
        .from("category_budgets")
        .select("category, amount")
        .eq("user_id", user.id)
        .eq("year", viewYear)
        .eq("month", viewMonth);

      const budgetMap: Totals = {};
      let totalB = 0;
      (bData || []).forEach((item: any) => {
        const amt = Number(item.amount) || 0;
        budgetMap[item.category] = amt;
        totalB += amt;
      });
      setCategoryBudget(budgetMap);
      setMonthlyBudgetTotal(totalB);

      // 2. Expenses (This Month)
      const start = new Date(viewYear, viewMonth - 1, 1);
      const end = new Date(viewYear, viewMonth, 1);

      const { data: txData } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", user.id)
        .gte("date", start.toISOString())
        .lt("date", end.toISOString())
        .eq("type", "expense"); // Only expenses

      let totalE = 0;
      const spentMap: Totals = {};
      (txData || []).forEach((t: any) => {
        totalE += t.amount;
        const cat = t.category || "その他";
        spentMap[cat] = (spentMap[cat] || 0) + t.amount;
      });
      setMonthlyExpense(totalE);
      setCategorySpent(spentMap);
    };
    load();
  }, [viewYear, viewMonth]);

  // Derived Metrics
  const remaining = monthlyBudgetTotal - monthlyExpense;
  const remainingDays = getRemainingDaysForMonth();
  const dailyLimit = remainingDays > 0 ? Math.floor(Math.max(0, remaining) / remainingDays) : 0;
  const percentUsed = monthlyBudgetTotal > 0 ? (monthlyExpense / monthlyBudgetTotal) * 100 : 0;

  // Identify Risk Categories (>80%)
  const riskCategories = Object.keys(categoryBudget).map(name => {
    const b = categoryBudget[name];
    const s = categorySpent[name] || 0;
    const p = b > 0 ? (s / b) * 100 : 0;
    return { name, p, s, b };
  }).filter(c => c.p >= 80).sort((a, b) => b.p - a.p).slice(0, 3);

  return (
    <div className="page-container" style={{ paddingBottom: 100 }}>
      <header style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, color: "#5d4330" }}>{displayMonthLabel}の状況</h1>
        <p style={{ fontSize: 13, color: "#9e8b78" }}>
          直感的な判断のためのサマリー
        </p>
      </header>

      {/* 1. Main Judgment Card */}
      <div className="app-card" style={{ background: remaining < 0 ? "#fff5f3" : "#fff", border: remaining < 0 ? "1px solid #e57373" : undefined }}>
        <h2 style={{ fontSize: 14, color: "#7a6a55", marginBottom: 8 }}>今月使える残り</h2>

        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
          <span style={{ fontSize: 32, fontWeight: 700, color: remaining < 0 ? "#c44536" : "#2f7d32" }}>
            ¥{remaining.toLocaleString()}
          </span>
          <span style={{ fontSize: 14, color: "#9e8b78" }}>
            / 予算 ¥{monthlyBudgetTotal.toLocaleString()}
          </span>
        </div>

        <div style={{ marginTop: 12 }}>
          <div style={{ height: 8, background: "#f0ece4", borderRadius: 4, overflow: "hidden" }}>
            <div style={{
              height: "100%",
              width: `${Math.min(100, percentUsed)}%`,
              background: remaining < 0 ? "#c44536" : "#b58b5a",
              transition: "width 0.5s"
            }} />
          </div>
          <p style={{ textAlign: "right", fontSize: 12, marginTop: 4, color: "#7a6a55" }}>
            利用額: ¥{monthlyExpense.toLocaleString()} ({Math.round(percentUsed)}%)
          </p>
        </div>
      </div>

      {/* 2. Daily Allowance */}
      <div className="grid-container" style={{ marginTop: 16 }}>
        <div className="app-card" style={{ marginBottom: 0 }}>
          <h2 style={{ fontSize: 13, color: "#7a6a55" }}>残り{remainingDays}日</h2>
          <div style={{ marginTop: 4 }}>
            <span style={{ fontSize: 12, color: "#9e8b78" }}>1日あたり</span>
            <div style={{ fontSize: 20, fontWeight: 600, color: "#5d4330" }}>
              ¥{dailyLimit.toLocaleString()}
            </div>
          </div>
        </div>

        {/* 3. Upcoming Payments (Top 3) */}
        <div className="app-card" style={{ marginBottom: 0, paddingBottom: 8 }}>
          <h2 style={{ fontSize: 13, color: "#7a6a55" }}>直近の支払い</h2>
          {forecastLoading ? (
            <p style={{ fontSize: 12 }}>計算中...</p>
          ) : upcomingPayments && upcomingPayments.length > 0 ? (
            <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 8 }}>
              {upcomingPayments.map((evt) => (
                <div key={evt.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ overflow: "hidden" }}>
                    <div style={{ fontSize: 12, color: "#5d4330", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {evt.label.replace("サブスク: ", "").replace("返済: ", "")}
                    </div>
                    <div style={{ fontSize: 10, color: "#9e8b78" }}>
                      {evt.dateStr.slice(5).replace("-", "/")}
                    </div>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#c44536" }}>
                    ¥{Math.abs(evt.amount).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ fontSize: 12, color: "#9e8b78", marginTop: 4 }}>予定なし</p>
          )}
        </div>
      </div>

      {/* 4. Risk Categories */}
      {riskCategories.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <h3 style={{ fontSize: 14, color: "#c44536", marginBottom: 8, display: "flex", alignItems: "center" }}>
            ⚠️ 使いすぎ注意カテゴリ
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {riskCategories.map(c => (
              <div key={c.name} className="app-card" style={{ padding: "12px 16px", marginBottom: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontWeight: 600, fontSize: 14 }}>{c.name}</span>
                  <span style={{ color: "#c44536", fontWeight: 700, fontSize: 14 }}>{Math.round(c.p)}%</span>
                </div>
                <div style={{ height: 4, background: "#fff5f3", borderRadius: 2 }}>
                  <div style={{ height: "100%", width: `${Math.min(100, c.p)}%`, background: "#c44536" }} />
                </div>
                <div style={{ textAlign: "right", fontSize: 11, marginTop: 4, color: "#7a6a55" }}>
                  残 ¥{(c.b - c.s).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. Forecast Link */}
      <div style={{ marginTop: 24 }}>
        <Link href="/forecast" className="app-card" style={{ display: "block", textDecoration: "none", background: "#fbf7eb", border: "1px solid #e0d6c8" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h3 style={{ fontSize: 14, color: "#5d4330", margin: 0 }}>資金繰り予測を見る</h3>
              <p style={{ fontSize: 11, color: "#9e8b78", margin: "4px 0 0" }}>
                現在資産: ¥{startBalance.toLocaleString()}
              </p>
            </div>
            <span style={{ fontSize: 20, color: "#b58b5a" }}>→</span>
          </div>
        </Link>
      </div>

    </div>
  );
}
