import { supabase } from "../../lib/supabaseClient";
import { calculateLoanSchedule } from "./loanCalculator";

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
  total_repaid: number;
  remaining_balance: number;
  progress: number; // 0-100
  next_payment_date: string | null;
  estimated_completion_date: string | null;
  remaining_payments: number | null;
};

export async function getLoans(userId: string): Promise<LoanWithStatus[]> {
  try {
    const { data: loans, error: loansError } = await supabase
      .from('loans')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (loansError) throw loansError;
    if (!loans || loans.length === 0) return [];

    const loanIds = loans.map(l => l.id);

    const { data: repayments, error: repayError } = await supabase
      .from('transactions')
      .select('loan_id, amount, date')
      .in('loan_id', loanIds); // Assuming all transactions linked to loan are repayments

    if (repayError) throw repayError;

    const loansWithBalance = loans.map(loan => {
      const loanRepayments = repayments?.filter(r => r.loan_id === loan.id && r.amount > 0) || [];
      const totalRepaid = loanRepayments.reduce((sum, r) => sum + Number(r.amount), 0);
      const principal = Number(loan.principal);
      const remaining = principal - totalRepaid;
      const progress = principal > 0 ? (totalRepaid / principal) * 100 : 0;

      // Calculate Schedule
      const schedule = calculateLoanSchedule(loan, remaining);

      return {
        ...loan,
        total_repaid: totalRepaid,
        remaining_balance: remaining,
        progress: Math.min(progress, 100),
        next_payment_date: schedule.nextDate,
        estimated_completion_date: schedule.completionDate,
        remaining_payments: schedule.remainingCount
      };
    });

    return loansWithBalance;

  } catch (error) {
    console.error("Error fetching loans:", error);
    return [];
  }
}

export async function getLoanDetails(loanId: string) {
  const { data: loan, error: loanError } = await supabase
    .from('loans')
    .select('*')
    .eq('id', loanId)
    .single();

  if (loanError) throw loanError;

  const { data: transactions, error: txError } = await supabase
    .from('transactions')
    .select('*')
    .eq('loan_id', loanId)
    .order('date', { ascending: false });

  if (txError) throw txError;

  const totalRepaid = transactions?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;
  const principal = Number(loan.principal);
  const remaining = principal - totalRepaid;

  // Calculate Schedule for Details too
  const schedule = calculateLoanSchedule(loan, remaining);

  return {
    ...loan,
    total_repaid: totalRepaid,
    remaining_balance: remaining,
    transactions: transactions || [],
    next_payment_date: schedule.nextDate,
    estimated_completion_date: schedule.completionDate,
    remaining_payments: schedule.remainingCount
  };
}
