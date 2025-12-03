"use client";

import { useEffect, useState } from "react";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Doughnut } from "react-chartjs-2";

ChartJS.register(ArcElement, Tooltip, Legend);

type TransactionType = "expense" | "income";

type Transaction = {
  id: string;
  date: string;
  amount: number;
  type: TransactionType;
  category: string;
  payment: string;
  memo: string;
};

type CategoryBudgetItem = {
  category: string;
  amount: number;
};

type AppSettings = {
  categoryBudgetsByMonth?: {
    [monthKey: string]: CategoryBudgetItem[];
  };
};

type Totals = {
  [key: string]: number;
};

function getMonthKey(year: number, month: number): string {
  const m = String(month).padStart(2, "0");
  return `${year}-${m}`;
}

function getRemainingDaysForMonth(
  viewYear: number,
  viewMonth: number
): number | null {
  const today = new Date();
  const y = today.getFullYear();
  const m = today.getMonth() + 1;

  if (y !== viewYear || m !== viewMonth) return null;

  const lastDay = new Date(y, m, 0).getDate();
  const currentDay = today.getDate();
  return lastDay - currentDay;
}

export default function Home() {
  const today = new Date();
  const [viewYear, setViewYear] = useState<number>(today.getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(today.getMonth() + 1);

  const [monthlyExpense, setMonthlyExpense] = useState(0);
  const [monthlyBudgetTotal, setMonthlyBudgetTotal] = useState(0);

  const [categorySpent, setCategorySpent] = useState<Totals>({});
  const [categoryBudget, setCategoryBudget] = useState<Totals>({});

  const displayMonthLabel = `${viewYear}年${viewMonth}月`;

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
    if (typeof window === "undefined") return;

    const raw = localStorage.getItem("transactions");
    if (!raw) return;

    try {
      const txs: Transaction[] = JSON.parse(raw);

      let totalExpense = 0;
      const perCategory: Totals = {};

      txs.forEach((t) => {
        if (!t.date || t.type !== "expense") return;
        const d = new Date(t.date);
        const y = d.getFullYear();
        const m = d.getMonth() + 1;

        if (y !== viewYear || m !== viewMonth) return;

        totalExpense += t.amount;
        const key = t.category || "その他";
        if (!perCategory[key]) perCategory[key] = 0;
        perCategory[key] += t.amount;
      });

      setMonthlyExpense(totalExpense);
      setCategorySpent(perCategory);
    } catch (e) {
      console.error("取引データの読み込みに失敗しました", e);
    }
  }, [viewYear, viewMonth]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const raw = localStorage.getItem("settings");
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw) as AppSettings;
      const byMonth = parsed.categoryBudgetsByMonth || {};
      const monthKey = getMonthKey(viewYear, viewMonth);
      const items = byMonth[monthKey] || [];

      const budgetMap: Totals = {};
      let total = 0;

      items.forEach((item) => {
        if (!item.category) return;
        const amt = Number(item.amount) || 0;
        budgetMap[item.category] = amt;
        total += amt;
      });

      setCategoryBudget(budgetMap);
      setMonthlyBudgetTotal(total);
    } catch (e) {
      console.error("カテゴリ別予算の読み込みに失敗しました", e);
    }
  }, [viewYear, viewMonth]);

  const rawRemainingTotal = monthlyBudgetTotal - monthlyExpense;
  const isOverAll = rawRemainingTotal < 0;
  const hasBudget = monthlyBudgetTotal > 0;
  const remainingForChart = Math.max(rawRemainingTotal, 0);
  const overForChart = Math.max(-rawRemainingTotal, 0);

  const doughnutData = hasBudget
    ? rawRemainingTotal >= 0
      ? {
          labels: ["残り予算", "使った金額"],
          datasets: [
            {
              data: [remainingForChart, monthlyExpense],
              backgroundColor: ["#f2b591", "#e8ddc7"],
              borderColor: "#f9f4ea",
              borderWidth: 2,
            },
          ],
        }
      : {
          labels: ["残り予算", "使った金額（予算内）", "予算オーバー分"],
          datasets: [
            {
              data: [0, monthlyBudgetTotal, overForChart],
              backgroundColor: ["#f2b591", "#e8ddc7", "#c44536"],
              borderColor: "#f9f4ea",
              borderWidth: 2,
            },
          ],
        }
    : {
        labels: ["データなし"],
        datasets: [
          {
            data: [1],
            backgroundColor: ["#e0d6c4"],
          },
        ],
      };

  const doughnutOptions: any = {
    plugins: {
      legend: {
        position: "bottom" as const,
        labels: { color: "#3b2a1a" },
      },
    },
  };

  const categoryRows = Object.keys(categoryBudget).map((name) => {
    const budget = categoryBudget[name] || 0;
    const spent = categorySpent[name] || 0;
    const remaining = budget - spent;

    const ratio =
      budget > 0 && remaining > 0
        ? Math.max(0, Math.min(1, remaining / budget))
        : 0;

    return {
      name,
      budget,
      spent,
      remaining,
      ratio,
    };
  });

  categoryRows.sort((a, b) => a.remaining - b.remaining);

  const totalRemainingPositive = categoryRows
    .filter((r) => r.remaining > 0)
    .reduce((sum, r) => sum + r.remaining, 0);

  const totalDeficit = Math.max(-rawRemainingTotal, 0);
  const stillShort = Math.max(totalDeficit - totalRemainingPositive, 0);

  const remainingDays = getRemainingDaysForMonth(viewYear, viewMonth);
  const perDayBudget =
    remainingDays !== null && remainingDays > 0
      ? Math.floor(rawRemainingTotal / remainingDays)
      : null;

  return (
    {/* ここにセナの元の Home の JSX（まるごと） */}
    <div className="page-container">
      <h1>ホーム</h1>
      {/* 以下、全部あなたの元コード通り */}
    </div>
  );
}
