import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../lib/supabaseClient";

// --- Types ---
// --- Types ---

export type Transaction = {
  id: string;
  date: string;
  amount: number;
  type: "expense" | "income" | "card_payment";
  category: string;
  payment: string;
  memo?: string;
};

export type Account = {
  id: string;
  name: string;
  type: "bank" | "wallet" | "qr" | "card";
  paymentKey?: string;
  closingDay?: number;
  paymentDay?: number;
  balance?: number; // Initial balance for Manual accounts
};

export type Loan = {
  id: string;
  name: string;
  amountPerPayment: number;
  startDate: string;
  paymentDay: number;
  frequency: "monthly" | "half-year" | "yearly";
  numberOfPayments: number;
};

export type Subscription = {
  id: string;
  name: string;
  amount: number;
  paymentDay?: number; // Made optional as legacy fallback
  startDate?: string;
  frequency?: "monthly" | "yearly"; // New
  nextPaymentDate?: string; // New
};

export type ForecastEvent = {
  id: string; // Unique ID for key/tracking
  date: Date;
  dateStr: string;
  label: string;
  amount: number; // + or -
  type: "income" | "payment" | "card_debit" | "loan" | "sub";
};

export type ForecastResult = {
  events: ForecastEvent[];
  startBalance: number;
  balanceHistory: { dateStr: string; balance: number }[];
  nextPaymentEvent: ForecastEvent | null;
  upcomingPayments: ForecastEvent[];
  loading: boolean;
};

// --- Helpers ---
function addMonths(base: Date, months: number): Date {
  const d = new Date(base.getTime());
  const day = d.getDate();
  d.setMonth(d.getMonth() + months);
  if (d.getDate() < day) d.setDate(0);
  return d;
}

function formatDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// --- Hook ---
export function useForecast(monthsToForecast: number = 6) {
  const [result, setResult] = useState<ForecastResult>({
    events: [],
    startBalance: 0,
    balanceHistory: [],
    nextPaymentEvent: null,
    upcomingPayments: [],
    loading: true,
  });

  const calculate = useCallback(async () => {
    try {
      setResult((prev) => ({ ...prev, loading: true }));

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Fetch Data
      const { data: txData } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", user.id);

      const transactions = (txData || []) as Transaction[];

      const accountsRaw = localStorage.getItem("accounts");
      const accounts: Account[] = accountsRaw ? JSON.parse(accountsRaw) : [];

      const settingsRaw = localStorage.getItem("settings");
      const settings = settingsRaw ? JSON.parse(settingsRaw) : {};

      const loans: Loan[] = settings.loans || [];
      if (!settings.loans) {
        const loansRaw = localStorage.getItem("loans");
        if (loansRaw) loans.push(...JSON.parse(loansRaw));
      }

      const subscriptions: Subscription[] = settings.subscriptions || [];
      const incomeRaw = localStorage.getItem("incomeSettings");
      const incomeSettings = incomeRaw ? JSON.parse(incomeRaw) : null;

      // 2. Determine Start Balance (Asset Accounts only)
      let currentAssetBalance = 0;

      const assetAccounts = accounts.filter(a => ["bank", "wallet", "qr"].includes(a.type));
      assetAccounts.forEach(a => {
        currentAssetBalance += Number(a.balance || 0);
      });

      const today = new Date();
      const todayStr = formatDate(today);

      transactions.forEach(t => {
        if (t.date > todayStr) return; // Future transaction in DB? Ignore for "Current Balance"

        const isAssetPayment = assetAccounts.some(a => a.name === t.payment);

        if (isAssetPayment) {
          if (t.type === "expense" || t.type === "card_payment") currentAssetBalance -= t.amount;
          else if (t.type === "income") currentAssetBalance += t.amount;
        }
      });

      // 3. Generate Future Events
      const events: ForecastEvent[] = [];
      const start = new Date();
      const end = addMonths(start, monthsToForecast);

      // A) Recurring: Loans
      loans.forEach(loan => {
        const amount = Number(loan.amountPerPayment);
        if (!amount || !loan.startDate) return;

        let date = new Date(loan.startDate);
        let count = 0;

        while (count < loan.numberOfPayments && date <= end) {
          if (date >= start) {
            const dStr = formatDate(date);
            events.push({
              id: `loan_${loan.id}_${dStr}`, // Unique ID
              date: new Date(date),
              dateStr: dStr,
              label: `返済: ${loan.name}`,
              amount: -amount,
              type: "loan"
            });
          }

          if (loan.frequency === "half-year") date = addMonths(date, 6);
          else if (loan.frequency === "yearly") date = addMonths(date, 12);
          else date = addMonths(date, 1);

          count++;
        }
      });

      // B) Recurring: Subscriptions
      subscriptions.forEach(sub => {
        const amount = Number(sub.amount);
        if (!amount) return;

        // Determine start date
        let date: Date;
        if (sub.nextPaymentDate) {
          date = new Date(sub.nextPaymentDate);
        } else if (sub.paymentDay) {
          // Fallback for legacy data
          date = new Date(start.getFullYear(), start.getMonth(), sub.paymentDay);
          if (date < start) date = addMonths(date, 1);
        } else {
          // No date info? Skip or default to 1st? Skip is safer.
          return;
        }

        while (date <= end) {
          const dStr = formatDate(date);
          // Only add if schedule is >= start (Forecast might look back a bit? No, start is today)
          if (date >= start) {
            events.push({
              id: `sub_${sub.id}_${dStr}`, // Unique ID
              date: new Date(date),
              dateStr: dStr,
              label: `サブスク: ${sub.name}`,
              amount: -amount,
              type: "sub"
            });
          }

          // Advance date based on frequency
          if (sub.frequency === "yearly") {
            date = addMonths(date, 12);
          } else {
            // Default to monthly
            date = addMonths(date, 1);
          }
        }
      });

      // C) Recurring: Salary (Income)
      if (incomeSettings && incomeSettings.monthlyIncome) {
        const amount = Number(incomeSettings.monthlyIncome);
        const payday = incomeSettings.payday || 25;

        let date = new Date(start.getFullYear(), start.getMonth(), payday);
        if (date < start) date = addMonths(date, 1);

        while (date <= end) {
          const dStr = formatDate(date);
          events.push({
            id: `income_salary_${dStr}`, // Unique ID
            date: new Date(date),
            dateStr: dStr,
            label: "給与",
            amount: amount,
            type: "income"
          });
          date = addMonths(date, 1);
        }
      }

      // D) Card Payments (Future debits based on usage)
      const cardAccounts = accounts.filter(a => a.type === "card" && a.closingDay && a.paymentDay);

      const cardBills = new Map<string, { date: Date; amount: number; cardName: string }>();

      transactions.forEach(t => {
        if (t.type !== "expense" && t.type !== "card_payment") return;

        const card = cardAccounts.find(c => (c.paymentKey === t.payment || c.name === t.payment));
        if (!card) return;

        const d = new Date(t.date);
        const day = d.getDate();
        const closing = card.closingDay!;
        const paymentDay = card.paymentDay!;

        let payMonthOffset = 1;
        if (day > closing) payMonthOffset = 2;

        const billDate = new Date(d.getFullYear(), d.getMonth() + payMonthOffset, paymentDay);

        if (billDate >= start && billDate <= end) {
          const dateStr = formatDate(billDate);
          const key = `${card.id}_${dateStr}`;

          const existing = cardBills.get(key);
          if (existing) {
            existing.amount += t.amount;
          } else {
            cardBills.set(key, {
              date: billDate,
              amount: t.amount,
              cardName: card.name
            });
          }
        }
      });

      // Convert cardBills to events
      cardBills.forEach((bill, key) => {
        events.push({
          id: `card_${key}`, // Unique ID
          date: bill.date,
          dateStr: formatDate(bill.date),
          label: `カード引落: ${bill.cardName}`,
          amount: -bill.amount,
          type: "card_debit"
        });
      });

      // 4. Sort and Link
      events.sort((a, b) => a.date.getTime() - b.date.getTime());

      // 5. Build Balance History
      let currentBal = currentAssetBalance;
      const history = events.map(e => {
        currentBal += e.amount;
        return {
          dateStr: e.dateStr,
          balance: currentBal
        };
      });

      // 6. Find Next Payments (Top 3 negative events)
      const upcomingPayments = events
        .filter(e => e.amount < 0 && e.date >= today)
        .slice(0, 3);

      const nextPayment = upcomingPayments[0] || null;

      setResult({
        events,
        startBalance: currentAssetBalance,
        balanceHistory: history,
        nextPaymentEvent: nextPayment,
        upcomingPayments, // Add this
        loading: false
      });

    } catch (e) {
      console.error("Forecast error", e);
      setResult(prev => ({ ...prev, loading: false }));
    }
  }, [monthsToForecast]);

  useEffect(() => {
    calculate();
  }, [calculate]);

  return result;
}
