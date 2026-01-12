
import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../lib/supabaseClient";

// --- Types (Mirrors of settings) ---
type IncomeSettings = {
  monthlyIncome: number;
  payday: number;
};
type Subscription = {
  id: string;
  name: string;
  amount: number;
  frequency: "monthly" | "yearly";
};
type LoanItem = {
  id: string;
  name: string;
  amountPerPayment: number;
  frequency: "monthly" | "half-year" | "yearly";
};
type SavingGoal = {
  id: string;
  name: string; // Added validation from actual settings
  targetAmount: number;
  targetDate: string;
};

// --- Helper: Calc Monthly Savings ---
function calcMonthlySaving(goal: SavingGoal): number {
  if (!goal.targetDate || !goal.targetAmount) return 0;
  const now = new Date();
  const target = new Date(goal.targetDate);
  let months = (target.getFullYear() - now.getFullYear()) * 12 + (target.getMonth() - now.getMonth());
  if (months <= 0) return 0;
  return Math.ceil(goal.targetAmount / months);
}

export type BudgetCoachResult = {
  income: number;
  totalFixedCosts: number;
  totalSavings: number;
  disposableBudget: number; // The "Safe to Spend" amount

  // Breakdown for details
  fixedCostBreakdown: { name: string; amount: number }[];
  savingBreakdown: { name: string; amount: number }[];

  currentMonthSpent: number;
  remainingDisplay: number;
  dailyAllowance: number;

  loading: boolean;
};

export function useBudgetCoach() {
  const [result, setResult] = useState<BudgetCoachResult>({
    income: 0,
    totalFixedCosts: 0,
    totalSavings: 0,
    disposableBudget: 0,
    fixedCostBreakdown: [],
    savingBreakdown: [],
    currentMonthSpent: 0,
    remainingDisplay: 0,
    dailyAllowance: 0,
    loading: true,
  });

  const calculate = useCallback(async () => {
    try {
      if (typeof window === "undefined") return;

      // 1. Load Settings from LocalStorage
      const incomeRaw = localStorage.getItem("incomeSettings");
      const incomeSettings: IncomeSettings = incomeRaw ? JSON.parse(incomeRaw) : { monthlyIncome: 0, payday: 25 };
      const income = Number(incomeSettings.monthlyIncome || 0);

      const settingsRaw = localStorage.getItem("settings");
      const settings = settingsRaw ? JSON.parse(settingsRaw) : {};

      const subs: Subscription[] = settings.subscriptions || [];
      const loans: LoanItem[] = settings.loans || [];
      const savings: SavingGoal[] = settings.savingGoals || [];

      // 2. Calculate Monthly Fixed Costs (Accrual Basis)
      let fixedTotal = 0;
      const fixedBreakdown: { name: string; amount: number }[] = [];

      // Subscriptions
      subs.forEach(s => {
        let monthly = Number(s.amount || 0);
        if (s.frequency === "yearly") {
          monthly = Math.round(monthly / 12);
        }
        if (monthly > 0) {
          fixedTotal += monthly;
          fixedBreakdown.push({ name: s.name, amount: monthly });
        }
      });

      // Loans
      loans.forEach(l => {
        let monthly = Number(l.amountPerPayment || 0);
        if (l.frequency === "yearly") monthly = Math.round(monthly / 12);
        if (l.frequency === "half-year") monthly = Math.round(monthly / 6);

        if (monthly > 0) {
          fixedTotal += monthly;
          fixedBreakdown.push({ name: l.name, amount: monthly });
        }
      });

      // 3. Calculate Monthly Savings
      let savingTotal = 0;
      const savingBreakdown: { name: string; amount: number }[] = [];

      savings.forEach(g => {
        const amt = calcMonthlySaving(g);
        if (amt > 0) {
          savingTotal += amt;
          savingBreakdown.push({ name: `貯金: ${g.name || "未設定"}`, amount: amt });
        }
      });

      // 4. Disposable Budget
      const disposable = Math.max(0, income - fixedTotal - savingTotal);

      // 5. Fetch Actual Spent (This Month)
      const { data: { user } } = await supabase.auth.getUser();
      let currentSpent = 0;

      if (user) {
        const now = new Date();
        const y = now.getFullYear();
        const m = now.getMonth() + 1;
        const start = new Date(y, m - 1, 1).toISOString();
        const end = new Date(y, m, 1).toISOString();

        const { data: tx } = await supabase
          .from("transactions")
          .select("amount")
          .eq("user_id", user.id)
          .eq("type", "expense")
          .gte("date", start)
          .lt("date", end);

        if (tx) {
          currentSpent = tx.reduce((sum, t) => sum + t.amount, 0);
        }
      }

      // 6. Remaining & Daily
      const remaining = disposable - currentSpent;

      const now = new Date();
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      const restDays = Math.max(1, lastDay - now.getDate() + 1); // +1 to include today? Usually yes.
      // Actually standard is lastDay - today. getDate is 1-indexed. 
      // If today is 30th and last day is 30th, remaining is 1 day (today). 30 - 30 = 0. So +1 is minimal.
      // But let's align with Home logic: lastDay - currentDay. 
      // Home said: lastDay - currentDay. If today 30, last 30 -> 0. That implies today is "done"? 
      // Let's check Home's getRemainingDaysForMonth: return lastDay - currentDay. 
      // If today is 1st of 31. 31 - 1 = 30. Plus today = 31 days. 
      // So Home logic excludes today? Or treats today as "already started"?
      // Let's calculate purely: (Disposable - Spent) / DaysRemaining.
      // If I spend today, it adds to Spent. So DaysRemaining should include today.
      const daysIncludingToday = lastDay - now.getDate() + 1;
      const dailyAllowance = Math.floor(Math.max(0, remaining) / daysIncludingToday);

      setResult({
        income,
        totalFixedCosts: fixedTotal,
        totalSavings: savingTotal,
        disposableBudget: disposable,
        fixedCostBreakdown: fixedBreakdown,
        savingBreakdown: savingBreakdown,
        currentMonthSpent: currentSpent,
        remainingDisplay: remaining,
        dailyAllowance,
        loading: false
      });

    } catch (e) {
      console.error("Budget Coach Error", e);
      setResult(prev => ({ ...prev, loading: false }));
    }
  }, []);

  useEffect(() => {
    calculate();
  }, [calculate]);

  return result;
}
