import { Transaction, Category, AnalysisResult } from "../types";

/**
 * Filter transactions by month (YYYY-MM)
 */
function getTransactionsForMonth(transactions: Transaction[], year: number, month: number): Transaction[] {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 1);

  // ISO String comparison works if date is YYYY-MM-DD
  const startStr = start.toISOString().split('T')[0];
  const endStr = end.toISOString().split('T')[0];

  return transactions.filter(t => t.date >= startStr && t.date < endStr);
}

/**
 * Core Logic: Calculate Analysis (Category Spending)
 * 
 * Rules:
 * - Only 'expense' transactions.
 * - Based on 'date' (Usage Date), NOT payment date.
 * - Sum by category.
 */
export function calculateMonthlyAnalysis(
  transactions: Transaction[],
  categories: Category[],
  year: number,
  month: number
): AnalysisResult {
  const monthlyTxs = getTransactionsForMonth(transactions, year, month);
  const categoryMap = new Map<string, number>();

  // Initialize with 0 for known categories (optional, but good for consistent UI)
  categories.forEach(c => {
    categoryMap.set(c.id, 0);
  });

  let total = 0;

  monthlyTxs.forEach(tx => {
    if (tx.type !== 'expense') return;

    // Note: We ignore whether it's Card or Cash. Usage date is all that matters.
    // We also rely on category_id. 
    // If category_id is missing, we might use a fallback or legacy string logic?
    // For strict refactor, we assume category_id is present or map it.

    const catId = tx.category_id || 'uncategorized';
    const amount = tx.amount;

    const current = categoryMap.get(catId) || 0;
    categoryMap.set(catId, current + amount);
    total += amount;
  });

  // Convert to result
  const resultCategories = Array.from(categoryMap.entries()).map(([id, amount]) => {
    const cat = categories.find(c => c.id === id);
    return {
      categoryId: id,
      categoryName: cat ? cat.name : '未分類',
      amount: amount
    };
  }).sort((a, b) => b.amount - a.amount); // Sort by highest spend

  return {
    period: `${year}-${String(month).padStart(2, '0')}`,
    income: 0,
    expense: totalExpense,
    balance: -totalExpense,
    categories: resultCategories,
    total: totalExpense,
  };
}
