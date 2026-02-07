import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { Loan, Transaction } from "../types";

export function useLoans() {
  const [loans, setLoans] = useState<Loan[]>([]);
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
      // Optimisation: We could join, but for now simple 2-step
      const { data: repaymentsData, error: repayError } = await supabase
        .from("transactions")
        .select("id, amount, loan_id")
        .eq("user_id", user.id)
        .not("loan_id", "is", null);

      if (repayError) throw repayError;

      // Calculate Statues
      const computedLoans = (loansData || []).map((loan: Loan) => {
        const repayments = (repaymentsData || []).filter(r => r.loan_id === loan.id);
        const paid = repayments.reduce((sum, r) => sum + r.amount, 0);
        return {
          ...loan,
          paid_amount: paid,
          remaining_amount: Math.max(0, loan.total_amount - paid) // Prevent negative for display
        };
      });

      setLoans(computedLoans);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const addLoan = async (name: string, total: number, due_date?: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("loans").insert([{
      user_id: user.id,
      name,
      total_amount: total,
      due_date: due_date || null
    }]);

    if (error) throw error;
    fetchLoans();
  };

  const deleteLoan = async (id: string) => {
    // Logic requirement: Should we delete transactions too? 
    // User said "Editing/Deleting transactions should recalculate balance". 
    // But deleting LOAN usually implies we might want to keep history or Error?
    // For MVP, simple delete.
    const { error } = await supabase.from("loans").delete().eq("id", id);
    if (error) throw error;
    fetchLoans();
  };

  useEffect(() => {
    fetchLoans();
  }, []);

  return { loans, loading, fetchLoans, addLoan, deleteLoan };
}
