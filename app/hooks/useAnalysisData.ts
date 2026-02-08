import { useState, useEffect, useMemo } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useSearchParams } from "next/navigation";

export type Transaction = {
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

export type CategoryBudget = {
  id: string;
  user_id: string;
  category: string;
  amount: number;
  year: number;
  month: number;
  created_at: string;
};

export function useAnalysisData() {
  const searchParams = useSearchParams();
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth() + 1);
  const [loading, setLoading] = useState(true);

  // Raw Data
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<CategoryBudget[]>([]);

  // State for specific data chunks (derived or fetched)
  const [lastMonthExpense, setLastMonthExpense] = useState(0);

  const label = `${viewYear}年${viewMonth}月`;

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

  // Fetch Data
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Calculate Date Ranges
        const currentEndObj = new Date(viewYear, viewMonth, 0);
        const currentEnd = `${viewYear}-${String(viewMonth).padStart(2, '0')}-${currentEndObj.getDate()}`;

        let lastYear = viewYear;
        let lastMonth = viewMonth - 1;
        if (lastMonth === 0) {
          lastMonth = 12;
          lastYear -= 1;
        }
        const lastStart = `${lastYear}-${String(lastMonth).padStart(2, '0')}-01`;

        // Fetch in Parallel
        const [txRes, budgetRes] = await Promise.all([
          supabase
            .from("transactions")
            .select("*, payment_methods(name, type)")
            .eq("user_id", user.id)
            .gte("date", lastStart)
            .lte("date", currentEnd),

          supabase
            .from("category_budgets")
            .select("*")
            .eq("user_id", user.id)
            .eq("year", viewYear)
            .eq("month", viewMonth)
        ]);

        if (txRes.error) throw txRes.error;
        setTransactions((txRes.data || []) as Transaction[]);

        if (budgetRes.error) console.error("Budget fetch error", budgetRes.error);
        setBudgets((budgetRes.data || []) as CategoryBudget[]);

      } catch (err) {
        console.error("Analysis load error", err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [viewYear, viewMonth]);

  // Derived Data (Memoized)
  const derivedData = useMemo(() => {
    let curIncome = 0;
    let curExpense = 0;
    let curRepayment = 0;
    let prevExpense = 0;

    const dailyMap = new Array(32).fill(0);
    const catMap: { [key: string]: number } = {};
    const lastCatMap: { [key: string]: number } = {};
    const payMap: { [key: string]: number } = {};
    const repayMap: { [key: string]: number } = {};

    const curTxs: Transaction[] = [];

    // Date Check Helpers
    let lastYear = viewYear;
    let lastMonth = viewMonth - 1;
    if (lastMonth === 0) {
      lastMonth = 12;
      lastYear -= 1;
    }

    transactions.forEach((t) => {
      const d = new Date(t.date);
      const tYear = d.getFullYear();
      const tMonth = d.getMonth() + 1;
      const amt = Number(t.amount);

      const isCurrent = tYear === viewYear && tMonth === viewMonth;
      const isLast = tYear === lastYear && tMonth === lastMonth;

      if (isLast) {
        if (t.type === "expense") {
          prevExpense += amt;
          const cat = t.category || "未分類";
          lastCatMap[cat] = (lastCatMap[cat] || 0) + amt;
        }
      }

      if (isCurrent) {
        curTxs.push(t);

        if (t.type === "income") {
          curIncome += amt;
        } else if (t.type === "repayment") {
          curRepayment += amt;
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

    // Budget Processing
    const bMap: { [key: string]: number } = {};
    let tBudget = 0;
    let tBudgetedExpense = 0;

    const sortedBudgets = [...budgets].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    sortedBudgets.forEach((b) => {
      if (!bMap[b.category]) {
        bMap[b.category] = b.amount;
        tBudget += b.amount;
        tBudgetedExpense += (catMap[b.category] || 0);
      }
    });

    // Chart Data Generation
    const daysInMonth = new Date(viewYear, viewMonth, 0).getDate();
    const dailyLabels = Array.from({ length: daysInMonth }, (_, i) => `${i + 1}`);
    const dailyData = dailyMap.slice(1, daysInMonth + 1);

    const sortedCats = Object.entries(catMap).sort((a, b) => b[1] - a[1]);
    const top5 = sortedCats.slice(0, 5);
    const others = sortedCats.slice(5).reduce((sum, [, val]) => sum + val, 0);
    const categoryLabels = [...top5.map(([k]) => k), ...(others > 0 ? ["その他"] : [])];
    const categoryData = [...top5.map(([, v]) => v), ...(others > 0 ? [others] : [])];

    return {
      totals: {
        income: curIncome,
        expense: curExpense,
        repayment: curRepayment,
        lastMonthExpense: prevExpense,
        budget: tBudget,
        budgetedExpense: tBudgetedExpense
      },
      maps: {
        category: catMap,
        lastMonthCategory: lastCatMap,
        budget: bMap,
        repayment: repayMap
      },
      charts: {
        daily: { labels: dailyLabels, data: dailyData },
        category: { labels: categoryLabels, data: categoryData },
        payment: { labels: Object.keys(payMap), data: Object.values(payMap) }
      },
      currentTransactions: curTxs
    };
  }, [transactions, budgets, viewYear, viewMonth]);

  return {
    viewYear,
    viewMonth,
    label,
    loading,
    handlePrevMonth,
    handleNextMonth,
    searchParams,
    ...derivedData,
    repaymentBreakdown: Object.entries(derivedData.maps.repayment).map(([name, amount]) => ({ name, amount })),
  };
}

// In app/analysis/page.tsx (or wherever this hook is used), user should import Skeleton and use it.
// Waiting for next step to edit `app/analysis/page.tsx`.
