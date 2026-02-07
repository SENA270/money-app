import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";
import { getLoans, LoanWithStatus } from "../lib/loans";

// --- Types ---

export type Transaction = {
  id: string;
  date: string;
  amount: number;
  type: "expense" | "income" | "card_payment" | "repayment"; // Added repayment
  category_id?: string; // Changed from category string
  payment_method_id?: string; // Changed from payment string
  category?: string; // Legacy/Joined
  payment?: string; // Legacy/Joined
  memo?: string;
};

export type Account = {
  id: string;
  name: string;
  type: "bank" | "wallet" | "qr" | "card";
  paymentKey?: string; // Legacy compat
  closingDay?: number;
  paymentDay?: number;
  balance?: number;
};

export type Subscription = {
  id: string;
  name: string;
  amount: number;
  paymentDay?: number;
  startDate?: string;
  frequency?: "monthly" | "yearly";
  nextPaymentDate?: string;
};

export type ForecastEvent = {
  id: string;
  date: Date;
  dateStr: string;
  label: string;
  amount: number;
  type: "income" | "payment" | "card_debit" | "loan" | "sub";
  sourceTransactions?: Transaction[];
};

export type ForecastResult = {
  events: ForecastEvent[];
  startBalance: number;
  assetBreakdown: { name: string; type: string; amount: number }[];
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
    assetBreakdown: [],
    balanceHistory: [],
    nextPaymentEvent: null,
    upcomingPayments: [],
    loading: true,
  });

  useEffect(() => {
    let isMounted = true;

    const calculate = async () => {
      try {
        setResult((prev) => ({ ...prev, loading: true }));

        const { data: { user } } = await supabase.auth.getUser();
        if (!user || !isMounted) return;

        // 1. Fetch Data in Parallel
        const [txRes, pmRes, loansRes] = await Promise.all([
          supabase
            .from("transactions")
            .select("*, categories(name), payment_methods(name)")
            .eq("user_id", user.id),
          supabase
            .from("payment_methods")
            .select("*")
            .eq("user_id", user.id),
          getLoans(user.id)
        ]);

        if (!isMounted) return;

        // Process Transactions (Map joins)
        const transactions = (txRes.data || []).map((t: any) => ({
          ...t,
          category: t.categories?.name || t.category || "Unknown",
          payment: t.payment_methods?.name || t.payment || "Unknown"
        })) as Transaction[];

        // Process Accounts
        const accounts: Account[] = (pmRes.data || []).map((pm: any) => ({
          id: pm.id,
          name: pm.name,
          type: pm.type,
          closingDay: pm.closing_day,
          paymentDay: pm.payment_day,
          balance: pm.balance || 0
        }));

        // Loans (DB)
        const loans = loansRes;

        // Subscriptions (Local Storage for now)
        const settingsRaw = localStorage.getItem("settings");
        const settings = settingsRaw ? JSON.parse(settingsRaw) : {};
        const subscriptions: Subscription[] = settings.subscriptions || [];

        // Income (Local Storage for now)
        const incomeRaw = localStorage.getItem("incomeSettings");
        const incomeSettings = incomeRaw ? JSON.parse(incomeRaw) : null;

        // 2. Determine Start Balance (Asset Breakdown)
        const assetAccounts = accounts.filter(a => ["bank", "wallet", "qr"].includes(a.type));

        // Track balance per account
        const assetBalances = new Map<string, { type: string; balance: number }>();
        assetAccounts.forEach(a => {
          assetBalances.set(a.name, { type: a.type, balance: Number(a.balance || 0) });
          // Also map by ID for robustness if transactions use IDs
          if (a.id) assetBalances.set(a.id, { type: a.type, balance: Number(a.balance || 0) });
        });

        const today = new Date();
        const todayStr = formatDate(today);

        // Adjust balance based on PAST transactions (since initial balance)
        // Assumption: 'balance' in DB is "Current Balance" or "Initial Balance"? 
        // Usually apps treat DB balance as "Balance at Creation/Sync".
        // If it's "Current Balance", we don't need to replay transactions. 
        // BUT, transactions might be "Pending". 
        // Legacy logic replayed transactions. Let's assume DB Balance is "Initial" and replay ALL transactions? 
        // Or Assume DB Balance is "Current"? 
        // User request: "Forecast empty". Likely DB balance is 0 or null. 
        // Let's assume DB balance is the start point. 
        // If we replay ALL transactions, we might double count if user updates balance.
        // SAFE BET: Replay transactions that occurred AFTER the account `created_at`? 
        // For now, let's keep the existing logic: Replay ALL transactions to reach "Current". 
        // WAIT: If user sets balance today to 100k, and has past transactions...
        // Let's assume: DB Balance is "Starting Balance". Calculation applies ALL transactions to get "Current".

        transactions.forEach(t => {
          if (t.date > todayStr) return; // Future

          // Try matching by ID first, then Name
          let acc = t.payment_method_id ? assetBalances.get(t.payment_method_id) : assetBalances.get(t.payment || "");

          if (acc) {
            if (t.type === "expense" || t.type === "card_payment" || t.type === "repayment") {
              acc.balance -= t.amount;
            } else if (t.type === "income") {
              acc.balance += t.amount;
            }
            // Update map (references object so actually already updated, but clarity)
          }
        });

        // Dedup assetBreakdown (handle ID vs Name updates)
        // Actually, we should just iterate accounts and read from the object
        const assetBreakdown = assetAccounts.map(a => {
          // The map values were mutated.
          // ID lookup
          const val = assetBalances.get(a.id) || assetBalances.get(a.name);
          return {
            name: a.name,
            type: a.type,
            amount: val ? val.balance : 0
          };
        });

        const currentAssetBalance = assetBreakdown.reduce((sum, a) => sum + a.amount, 0);

        // 3. Generate Future Events
        const events: ForecastEvent[] = [];
        const start = new Date();
        const end = addMonths(start, monthsToForecast);

        // A) Loans (Used DB Structure)
        loans.forEach(loan => {
          if (loan.status !== 'active') return;

          // Simple Monthly
          if (loan.repayment_rule === 'monthly' && loan.payment_day && loan.monthly_amount) {
            let date = new Date(); // Start from "Next Payment" logic?
            date.setDate(loan.payment_day);
            if (date < start) date = addMonths(date, 1);

            while (date <= end) {
              events.push({
                id: `loan_${loan.id}_${formatDate(date)}`,
                date: new Date(date),
                dateStr: formatDate(date),
                label: `返済: ${loan.name}`,
                amount: -Number(loan.monthly_amount),
                type: "loan"
              });
              date = addMonths(date, 1);
            }
          }

          // Semiannual (Monthly + Bonus)
          if (loan.repayment_rule === 'semiannual') {
            // 1. Monthly part
            if (loan.payment_day && loan.monthly_amount) {
              let date = new Date();
              date.setDate(loan.payment_day);
              if (date < start) date = addMonths(date, 1);
              while (date <= end) {
                events.push({
                  id: `loan_${loan.id}_m_${formatDate(date)}`,
                  date: new Date(date),
                  dateStr: formatDate(date),
                  label: `返済: ${loan.name}`,
                  amount: -Number(loan.monthly_amount),
                  type: "loan"
                });
                date = addMonths(date, 1);
              }
            }
            // 2. Bonus part
            if (loan.bonus_months && loan.payment_day && loan.bonus_amount) {
              const bonusAmount = Number(loan.bonus_amount);
              loan.bonus_months.forEach(month => {
                // Generate dates for this month
                let year = start.getFullYear();
                // Try this year and next year
                [year, year + 1].forEach(y => {
                  const date = new Date(y, month - 1, loan.payment_day!);
                  if (date >= start && date <= end) {
                    events.push({
                      id: `loan_${loan.id}_b_${formatDate(date)}`,
                      date: new Date(date),
                      dateStr: formatDate(date),
                      label: `ボーナス返済: ${loan.name}`,
                      amount: -bonusAmount,
                      type: "loan"
                    });
                  }
                });
              });
            }
          }
        });

        // B) subscriptions (Keep existing logic)
        subscriptions.forEach(sub => {
          const amount = Number(sub.amount);
          if (!amount) return;

          let date: Date;
          if (sub.nextPaymentDate) {
            date = new Date(sub.nextPaymentDate);
          } else if (sub.paymentDay) {
            date = new Date(start.getFullYear(), start.getMonth(), sub.paymentDay);
            if (date < start) date = addMonths(date, 1);
          } else {
            return;
          }

          while (date <= end) {
            const dStr = formatDate(date);
            if (date >= start) {
              events.push({
                id: `sub_${sub.id}_${dStr}`,
                date: new Date(date),
                dateStr: dStr,
                label: `サブスク: ${sub.name}`,
                amount: -amount,
                type: "sub"
              });
            }
            if (sub.frequency === "yearly") {
              date = addMonths(date, 12);
            } else {
              date = addMonths(date, 1);
            }
          }
        });

        // C) Income (Keep existing)
        if (incomeSettings && incomeSettings.monthlyIncome) {
          const amount = Number(incomeSettings.monthlyIncome);
          const payday = incomeSettings.payday || 25;
          let date = new Date(start.getFullYear(), start.getMonth(), payday);
          if (date < start) date = addMonths(date, 1);

          while (date <= end) {
            events.push({
              id: `income_${formatDate(date)}`,
              date: new Date(date),
              dateStr: formatDate(date),
              label: "給与",
              amount: amount,
              type: "income"
            });
            date = addMonths(date, 1);
          }
        }

        // D) Card Payments from Future Transactions
        const cardAccounts = accounts.filter(a => a.type === "card" && a.closingDay && a.paymentDay);
        const cardBills = new Map<string, { date: Date; amount: number; cardName: string; transactions: Transaction[] }>();

        transactions.forEach(t => {
          if (t.type !== "expense" && t.type !== "card_payment") return; // Repayment doesn't trigger card bill?

          // Find card by ID or Name
          const card = cardAccounts.find(c => c.id === t.payment_method_id || c.name === t.payment);
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
              existing.transactions.push(t);
            } else {
              cardBills.set(key, {
                date: billDate,
                amount: t.amount,
                cardName: card.name,
                transactions: [t]
              });
            }
          }
        });

        cardBills.forEach((bill, key) => {
          events.push({
            id: `card_${key}`,
            date: bill.date,
            dateStr: formatDate(bill.date),
            label: `カード引落: ${bill.cardName}`,
            amount: -bill.amount,
            type: "card_debit",
            sourceTransactions: bill.transactions
          });
        });

        // 4. Sort
        events.sort((a, b) => a.date.getTime() - b.date.getTime());

        // 5. Build History
        let currentBal = currentAssetBalance;
        const history = events.map(e => {
          currentBal += e.amount;
          return {
            dateStr: e.dateStr,
            balance: currentBal
          };
        });

        // 6. Next Events
        const upcomingPayments = events
          .filter(e => e.amount < 0 && e.date >= today)
          .slice(0, 3);

        if (isMounted) {
          setResult({
            events,
            startBalance: currentAssetBalance,
            assetBreakdown,
            balanceHistory: history,
            nextPaymentEvent: upcomingPayments[0] || null,
            upcomingPayments,
            loading: false
          });
        }

      } catch (e) {
        console.error("Forecast error", e);
        if (isMounted) setResult(prev => ({ ...prev, loading: false }));
      }
    };

    calculate();

    return () => {
      isMounted = false;
    };
  }, [monthsToForecast]);

  return result;
}
