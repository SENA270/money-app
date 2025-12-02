// app/hooks/useMoneySummary.ts
"use client";

import { useEffect, useState } from "react";

export type TransactionType = "expense" | "income";

export type Transaction = {
  id: string;
  date: string;
  amount: number;
  type: TransactionType;
  category: string;
  payment: string;
  memo: string;
};

export type Totals = {
  [key: string]: number;
};

function getRemainingDays(): number {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const lastDay = new Date(year, month + 1, 0).getDate();
  const currentDay = today.getDate();
  return lastDay - currentDay;
}

export function formatPaymentLabel(key: string) {
  if (key === "cardA") return "クレカA";
  if (key === "cardB") return "クレカB";
  if (key === "cash") return "現金";
  return key;
}

export function useMoneySummary() {
  const [income, setIncome] = useState(0);
  const [expense, setExpense] = useState(0);
  const [monthlyTransactions, setMonthlyTransactions] = useState<Transaction[]>(
    []
  );

  const [categoryTotals, setCategoryTotals] = useState<Totals>({});

  const [cardSpendThisMonth, setCardSpendThisMonth] = useState<Totals>({});
  const [cardBillThisMonth, setCardBillThisMonth] = useState<Totals>({});
  const [cardBillNextMonth, setCardBillNextMonth] = useState<Totals>({});

  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpense, setTotalExpense] = useState(0);

  const [prevIncome, setPrevIncome] = useState(0);
  const [prevExpense, setPrevExpense] = useState(0);

  const [monthlyBudget, setMonthlyBudget] = useState(50000);

  const recalcFromTransactions = (transactions: Transaction[]) => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;

    let incomeMonth = 0;
    let expenseMonth = 0;

    let incomeAll = 0;
    let expenseAll = 0;

    let incomePrev = 0;
    let expensePrev = 0;

    const monthTx: Transaction[] = [];
    const catTotals: Totals = {};

    const cardSpend: Totals = {};
    const cardBillThis: Totals = {};
    const cardBillNext: Totals = {};

    transactions.forEach((t) => {
      if (!t.date) return;
      const d = new Date(t.date);

      // 全期間
      if (t.type === "income") {
        incomeAll += t.amount;
      } else if (t.type === "expense") {
        expenseAll += t.amount;
      }

      const isCurrentMonth =
        d.getFullYear() === currentYear && d.getMonth() === currentMonth;
      const isPrevMonth =
        d.getFullYear() === prevYear && d.getMonth() === prevMonth;

      // 今月
      if (isCurrentMonth) {
        if (t.type === "income") incomeMonth += t.amount;
        if (t.type === "expense") expenseMonth += t.amount;

        monthTx.push(t);

        const key = t.category || "その他";
        if (!catTotals[key]) catTotals[key] = 0;
        if (t.type === "expense") catTotals[key] += t.amount;
      }

      // 先月
      if (isPrevMonth) {
        if (t.type === "income") incomePrev += t.amount;
        if (t.type === "expense") expensePrev += t.amount;
      }

      // カード系
      if (t.type === "expense" && t.payment && t.payment !== "cash") {
        const payKey = t.payment || "その他";

        if (isCurrentMonth) {
          if (!cardSpend[payKey]) cardSpend[payKey] = 0;
          if (!cardBillNext[payKey]) cardBillNext[payKey] = 0;
          cardSpend[payKey] += t.amount;
          cardBillNext[payKey] += t.amount;
        }

        if (isPrevMonth) {
          if (!cardBillThis[payKey]) cardBillThis[payKey] = 0;
          cardBillThis[payKey] += t.amount;
        }
      }
    });

    setIncome(incomeMonth);
    setExpense(expenseMonth);
    setMonthlyTransactions(monthTx);
    setCategoryTotals(catTotals);

    setCardSpendThisMonth(cardSpend);
    setCardBillThisMonth(cardBillThis);
    setCardBillNextMonth(cardBillNext);

    setTotalIncome(incomeAll);
    setTotalExpense(expenseAll);

    setPrevIncome(incomePrev);
    setPrevExpense(expensePrev);
  };

  useEffect(() => {
    const stored = localStorage.getItem("transactions");
    if (!stored) return;
    const transactions: Transaction[] = JSON.parse(stored);
    recalcFromTransactions(transactions);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem("settings");
    if (!stored) return;

    try {
      const parsed = JSON.parse(stored) as { monthlyBudget?: number };
      if (parsed.monthlyBudget != null) {
        setMonthlyBudget(parsed.monthlyBudget);
      }
    } catch (e) {
      console.error("設定の読み込みに失敗しました", e);
    }
  }, []);

  const diff = income - expense;
  const totalDiff = totalIncome - totalExpense;
  const prevDiff = prevIncome - prevExpense;

  const monthlyExpense = expense;
  const remainingDays = getRemainingDays();

  const progress =
    monthlyBudget <= 0
      ? 0
      : Math.min(100, Math.round((monthlyExpense / monthlyBudget) * 100));

  const remainingBudget = monthlyBudget - monthlyExpense;

  return {
    // 元の値
    income,
    expense,
    monthlyTransactions,
    categoryTotals,
    cardSpendThisMonth,
    cardBillThisMonth,
    cardBillNextMonth,
    totalIncome,
    totalExpense,
    prevIncome,
    prevExpense,
    monthlyBudget,
    // 派生値
    diff,
    totalDiff,
    prevDiff,
    monthlyExpense,
    remainingDays,
    progress,
    remainingBudget,
  };
}