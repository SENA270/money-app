export type LoanScheduleInput = {
  status: 'active' | 'completed';
  repayment_rule: 'monthly' | 'semiannual' | 'custom';
  payment_day: number | null;
  monthly_amount: number | null;
  bonus_months: number[] | null;
  bonus_amount: number | null;
};

export function calculateLoanSchedule(loan: LoanScheduleInput, remainingBalance: number) {
  // Helper to format as YYYY-MM-DD in Local Time
  const toYMD = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  // 0. Basic Validation
  if (loan.status !== 'active' || remainingBalance <= 0) {
    return { nextDate: null, completionDate: null, remainingCount: 0 };
  }

  if (loan.repayment_rule === 'custom' || !loan.payment_day) {
    return { nextDate: null, completionDate: null, remainingCount: null };
  }

  const today = new Date();
  // Reset time to ensure pure date comparison
  today.setHours(0, 0, 0, 0);

  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth(); // 0-11
  const paymentDay = loan.payment_day;

  // 1. Calculate Next Payment Date
  // Handle month-end logic (e.g. payment_day 31 in Feb)
  const getValidDate = (year: number, month: number, day: number) => {
    // Month is 0-indexed. new Date(2024, 1, 31) -> March 2 (leap) or March 3
    // We want the last day of the month if day exceeds it.
    const date = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
    const validDay = Math.min(day, lastDayOfMonth);
    return new Date(year, month, validDay);
  };

  let nextDateObj = getValidDate(currentYear, currentMonth, paymentDay);

  // If today is past the payment date, move to next month
  if (today > nextDateObj) {
    nextDateObj = getValidDate(currentYear, currentMonth + 1, paymentDay);
  }

  // 2. Simulate Repayment to find Completion Date and Counts
  let tempBalance = remainingBalance;
  let count = 0;

  // Start simulation from the *next* payment date
  let simDate = new Date(nextDateObj);

  // Initial validation
  const monthly = loan.monthly_amount || 0;
  const bonus = loan.bonus_amount || 0;
  const hasBonus = loan.repayment_rule === 'semiannual' && (loan.bonus_months?.length ?? 0) > 0;

  // Infinite loop prevention
  const MAX_MONTHS = 1200; // 100 years

  if (monthly <= 0 && (!hasBonus || bonus <= 0)) {
    return { nextDate: toYMD(nextDateObj), completionDate: null, remainingCount: null };
  }

  while (tempBalance > 0 && count < MAX_MONTHS) {
    count++;

    // Deduct Monthly
    tempBalance -= monthly;

    // Deduct Bonus if applicable
    if (hasBonus && loan.bonus_months) {
      // simDate.getMonth() is 0-11. User input is 1-12.
      const simMonth = simDate.getMonth() + 1;
      if (loan.bonus_months.includes(simMonth)) {
        tempBalance -= bonus;
      }
    }

    // Only advance month if still remaining
    if (tempBalance > 0) {
      // Move to next month's payment day
      const nextMonth = simDate.getMonth() + 1;
      const nextYear = simDate.getFullYear();
      simDate = getValidDate(nextYear, nextMonth, paymentDay);
    }
  }

  const nextDateStr = toYMD(nextDateObj);
  const completionDateStr = tempBalance <= 0 ? toYMD(simDate) : null;

  return {
    nextDate: nextDateStr,
    completionDate: completionDateStr,
    remainingCount: count >= MAX_MONTHS ? null : count
  };
}
