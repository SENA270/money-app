
// ==========================================
// Isolated Loan Logic for Verification
// ==========================================

type LoanScheduleInput = {
  status: 'active' | 'completed';
  repayment_rule: 'monthly' | 'semiannual' | 'custom';
  payment_day: number | null;
  monthly_amount: number | null;
  bonus_months: number[] | null;
  bonus_amount: number | null;
};

function calculateLoanSchedule(loan: LoanScheduleInput, remainingBalance: number) {
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

// ==========================================
// Test Cases
// ==========================================

const mockMonthlyLoan: LoanScheduleInput = {
  status: 'active',
  repayment_rule: 'monthly',
  payment_day: 27,
  monthly_amount: 10000,
  bonus_months: null,
  bonus_amount: null
};

const mockSemiannualLoan: LoanScheduleInput = {
  status: 'active',
  repayment_rule: 'semiannual',
  payment_day: 27,
  monthly_amount: 10000,
  bonus_months: [1, 7],
  bonus_amount: 50000
};

const mockBonusOnlyLoan: LoanScheduleInput = {
  status: 'active',
  repayment_rule: 'semiannual',
  payment_day: 31, // End of month
  monthly_amount: 0,
  bonus_months: [1, 7],
  bonus_amount: 100000
};

const mockEndOfMonthLoan: LoanScheduleInput = { // 31st payment
  status: 'active',
  repayment_rule: 'monthly',
  payment_day: 31,
  monthly_amount: 10000,
  bonus_months: null,
  bonus_amount: null
};

function runTests() {
  console.log("=== Loan Logic Verification (JST Fixed) ===\n");
  const today = new Date();
  // Mimic the same toYMD for display
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, '0');
  const d = String(today.getDate()).padStart(2, '0');
  console.log(`Current Date (Local): ${y}-${m}-${d}`);

  // Case 1: Standard Monthly
  const res1 = calculateLoanSchedule(mockMonthlyLoan, 100000);
  console.log(`[Case 1] Monthly (Day 27)`);
  console.log(`  Next Payment: ${res1.nextDate}`);
  console.log(`  Completion Date: ${res1.completionDate}`);
  console.log(`  Remaining: ${res1.remainingCount}`);

  // Case 2: Semiannual
  const res2 = calculateLoanSchedule(mockSemiannualLoan, 200000); // Balance 200k
  console.log(`\n[Case 2] Semiannual (Day 27, Bonus 1/7), Balance 200k`);
  console.log(`  Next Payment: ${res2.nextDate}`);
  console.log(`  Completion Date: ${res2.completionDate}`);
  console.log(`  Remaining Counts: ${res2.remainingCount}`);

  // Case 3: Bonus Only (Day 31)
  const res3 = calculateLoanSchedule(mockBonusOnlyLoan, 300000); // 300k. 3 bonuses.
  console.log(`\n[Case 3] Bonus Only (Day 31, Bonus 1/7), Balance 300k`);
  console.log(`  Next Payment: ${res3.nextDate}`);
  console.log(`  Completion: ${res3.completionDate}`);
  console.log(`  Remaining: ${res3.remainingCount}`);

  // Case 4: End of Month Logic (Feb Check)
  console.log(`\n[Case 4] Monthly (Day 31)`);
  const res4 = calculateLoanSchedule(mockEndOfMonthLoan, 100000);
  console.log(`  Next Payment: ${res4.nextDate}`);
  console.log(`  Completion: ${res4.completionDate}`);
}

runTests();
