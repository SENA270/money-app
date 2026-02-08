import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { Database } from "../types";

// Align with DB Schema (Manual override due to stale types)
export type Loan = {
  id: string;
  user_id: string;
  name: string;
  principal: number;
  interest_rate: number;
  start_date: string;
  status: 'active' | 'completed';
  repayment_rule: 'monthly' | 'semiannual' | 'custom';
  payment_day: number | null;
  monthly_amount: number | null;
  bonus_months: number[] | null;
  bonus_amount: number | null;
  created_at: string;
};

export type LoanWithStatus = Loan & {
  paid_amount: number;
  remaining_amount: number; // calculated
};

export function useLoans() {
  const [loans, setLoans] = useState<LoanWithStatus[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLoans = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch Loans
      const { data: loansData, error: loansError } = await supabase
        .from("loans")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (loansError) throw loansError;

      // Fetch Repayment Transactions
      const { data: repaymentsData, error: repayError } = await supabase
        .from("transactions")
        .select("id, amount, loan_id")
        .eq("user_id", user.id)
        .not("loan_id", "is", null);

      if (repayError) throw repayError;

      // Calculate Status
      const computedLoans = (loansData || []).map((loan) => {
        const repayments = (repaymentsData || []).filter(r => r.loan_id === loan.id);
        const paid = repayments.reduce((sum, r) => sum + r.amount, 0);
        // Note: DB schema might use 'principal' or 'amount'. 
        // Based on 20260207_add_loans.sql, it is 'principal'.
        // However, Typescript generation might have mapped it differently if alias was used?
        // Let's assume the Row type is correct. If 'principal' is missing in type, we cast or check.
        // Actually, let's cast to any for safety if types are stale, but standard Supabase types should have it.
        // In app/types.ts viewed earlier, it had 'amount'. But debt/new used 'principal'.
        // I will trust 'principal' exists in the actual DB/returned object.
        const principal = (loan as any).principal || (loan as any).amount || 0;

        return {
          ...loan,
          paid_amount: paid,
          remaining_amount: Math.max(0, principal - paid)
        };
      });

      setLoans(computedLoans);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const updateLoan = async (id: string, updates: Partial<Loan>) => {
    const { error } = await supabase
      .from("loans")
      .update(updates)
      .eq("id", id);

    if (error) throw error;
    await fetchLoans();
  };

  const deleteLoan = async (id: string) => {
    // Note: This might fail if foreign key constraints exist on transactions.
    // Ideally we should delete or unlink transactions.
    // For now, attempting delete. If constraint fails, we might need to handle it.
    const { error } = await supabase.from("loans").delete().eq("id", id);
    if (error) throw error;
    await fetchLoans();
  };

  useEffect(() => {
    fetchLoans();
  }, []);

  return { loans, loading, fetchLoans, updateLoan, deleteLoan };
}
