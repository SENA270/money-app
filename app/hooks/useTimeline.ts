import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";
import { PaymentMethod, Transaction, TimelineEvent } from "../types";
import { buildTimeline } from "../lib/financeCalculator";

// Legacy types for LocalStorage items
type Loan = {
  id: string;
  name: string;
  amountPerPayment: number;
  startDate: string;
  paymentDay: number;
  frequency: "monthly" | "half-year" | "yearly";
  numberOfPayments: number;
};

type Subscription = {
  id: string;
  name: string;
  amount: number;
  paymentDay?: number;
  startDate?: string;
  frequency?: "monthly" | "yearly";
  nextPaymentDate?: string;
};

// Helper: Add months
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

export function useTimeline(monthsToForecast: number = 6) {
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [currentBalance, setCurrentBalance] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // 1. Fetch Supabase Data
        const [pmRes, txRes] = await Promise.all([
          supabase.from("payment_methods").select("*").eq("user_id", user.id),
          supabase.from("transactions").select("*").eq("user_id", user.id) // Fetch all for history logic
        ]);

        if (pmRes.error) throw pmRes.error;
        if (txRes.error) throw txRes.error;

        const paymentMethods = pmRes.data as PaymentMethod[];
        const transactions = txRes.data as Transaction[];

        // 2. Fetch LocalStorage Data (Loans/Subs/Income)
        // Note: In a full refactor, these should be in DB too.
        let loans: Loan[] = [];
        let subscriptions: Subscription[] = [];
        let incomeSettings: any = null;

        if (typeof window !== "undefined") {
          const settingsRaw = localStorage.getItem("settings");
          const parsedSettings = settingsRaw ? JSON.parse(settingsRaw) : {};
          loans = parsedSettings.loans || [];
          if (loans.length === 0) {
            const lRaw = localStorage.getItem("loans");
            if (lRaw) loans = JSON.parse(lRaw);
          }

          subscriptions = parsedSettings.subscriptions || [];

          const incRaw = localStorage.getItem("incomeSettings");
          incomeSettings = incRaw ? JSON.parse(incRaw) : null;
        }

        // 3. Calculate Initial Balance (Sum of Assets)
        // payment_methods has `balance` for assets. Cards usually 0 or ignored for "Money I Have".
        // Logic: "Balance" is Total Cash + Bank.
        const initialBalance = paymentMethods
          .filter(p => p.type === 'cash' || p.type === 'bank')
          .reduce((sum, p) => sum + (Number(p.balance) || 0), 0);

        // 4. Generate Recurring Logic (Forecast Events)
        const forecastEvents: TimelineEvent[] = [];
        const start = new Date(); // Today
        const end = addMonths(start, monthsToForecast);

        // A) Loans
        loans.forEach(loan => {
          const amount = Number(loan.amountPerPayment);
          if (!amount || !loan.startDate) return;
          let date = new Date(loan.startDate);
          let count = 0;

          while (count < loan.numberOfPayments && date <= end) {
            if (date >= start) {
              forecastEvents.push({
                id: `loan-${loan.id}-${count}`,
                date: formatDate(date),
                amount: -amount,
                label: `返済: ${loan.name}`,
                type: 'transaction', // Treat as future transaction
                status: 'forecast'
              });
            }
            // Advance
            if (loan.frequency === "half-year") date = addMonths(date, 6);
            else if (loan.frequency === "yearly") date = addMonths(date, 12);
            else date = addMonths(date, 1);
            count++;
          }
        });

        // B) Subscriptions
        subscriptions.forEach(sub => {
          const amount = Number(sub.amount);
          if (!amount) return;
          let date: Date;

          if (sub.nextPaymentDate) {
            date = new Date(sub.nextPaymentDate);
          } else if (sub.paymentDay) {
            date = new Date(start.getFullYear(), start.getMonth(), sub.paymentDay);
            if (date < start) date = addMonths(date, 1);
          } else { return; }

          while (date <= end) {
            if (date >= start) {
              forecastEvents.push({
                id: `sub-${sub.id}-${date.getTime()}`,
                date: formatDate(date),
                amount: -amount,
                label: `サブスク: ${sub.name}`,
                type: 'transaction',
                status: 'forecast'
              });
            }
            if (sub.frequency === "yearly") date = addMonths(date, 12);
            else date = addMonths(date, 1);
          }
        });

        // C) Income (Salary)
        if (incomeSettings && incomeSettings.monthlyIncome) {
          const amount = Number(incomeSettings.monthlyIncome);
          const payday = incomeSettings.payday || 25;
          let date = new Date(start.getFullYear(), start.getMonth(), payday);
          if (date < start) date = addMonths(date, 1);

          while (date <= end) {
            forecastEvents.push({
              id: `salary-${date.getTime()}`,
              date: formatDate(date),
              amount: amount,
              label: "給与",
              type: 'income',
              status: 'forecast'
            });
            date = addMonths(date, 1);
          }
        }

        // 5. Build Unified Timeline
        // This calculates credit card bills from `transactions` AND merges `forecastEvents`.
        const { timeline: rawTimeline } = buildTimeline(
          transactions,
          paymentMethods,
          initialBalance,
          forecastEvents
        );

        // 6. Calculate Running Balance
        let runningBalance = initialBalance;
        const timelineWithBalance = rawTimeline.map(event => {
          runningBalance += event.amount;
          return { ...event, balance: runningBalance };
        });

        // 7. Determine Balance as of "Today"
        const todayStr = new Date().toISOString().slice(0, 10);
        let todayVal = initialBalance;
        // Search for the last event on or before today
        for (let i = timelineWithBalance.length - 1; i >= 0; i--) {
          if (timelineWithBalance[i].date <= todayStr) {
            if (timelineWithBalance[i].balance !== undefined) {
              todayVal = timelineWithBalance[i].balance!;
            }
            break;
          }
        }

        if (isMounted) {
          setTimeline(timelineWithBalance);
          setCurrentBalance(todayVal);
          setLoading(false);
        }

      } catch (e) {
        console.error("Timeline error", e);
        if (isMounted) setLoading(false);
      }
    };

    loadData();

    return () => { isMounted = false; };
  }, [monthsToForecast]);

  return { timeline, loading, currentBalance };
}
