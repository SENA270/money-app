import { Transaction, PaymentMethod, TimelineEvent } from "../types";

/**
 * Helper to add months to a date safely
 */
function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

/**
 * Format date to YYYY-MM-DD
 */
function formatDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Core Logic: Generate Credit Card Payment Events from Raw Transactions
 * 
 * Rules:
 * - Group transactions by Card and by Closing Cycle.
 * - Calculate Payment Date based on Closing Day and Payment Day.
 * - Create a 'Virtual' Transaction for the aggregate amount on the Payment Date.
 */
export function generateCardPaymentEvents(
  transactions: Transaction[],
  paymentMethods: PaymentMethod[]
): TimelineEvent[] {
  const events: TimelineEvent[] = [];
  const cardMethods = paymentMethods.filter(pm => pm.type === 'card' && pm.closing_day && pm.payment_day);
  const cardMap = new Map(cardMethods.map(c => [c.id, c]));

  // Key: "CardID_PaymentDate" -> { total, transactions[] }
  const bills = new Map<string, { date: Date; amount: number; cardId: string; txs: Transaction[] }>();

  transactions.forEach(tx => {
    // Only care about expenses on cards
    if (tx.type !== 'expense') return;
    if (!tx.payment_method_id) return;

    const card = cardMap.get(tx.payment_method_id);
    if (!card) return; // Not a card or unknown

    const txDate = new Date(tx.date);
    const day = txDate.getDate();

    // Determine Payment Date
    // If tx day <= closing day, paid next month.
    // If tx day > closing day, paid month after next.
    // Example: Close 15th, Pay 10th.
    // Tx 1/14 -> Closes 1/15 -> Paid 2/10.
    // Tx 1/16 -> Closes 2/15 -> Paid 3/10.

    let monthsToAdd = 1;
    if (day > card.closing_day!) {
      monthsToAdd = 2;
    }

    // Careful with year boundaries
    const payDate = new Date(txDate.getFullYear(), txDate.getMonth() + monthsToAdd, card.payment_day!);

    const key = `${card.id}_${formatDate(payDate)}`;

    const current = bills.get(key);
    if (current) {
      current.amount += tx.amount;
      current.txs.push(tx);
    } else {
      bills.set(key, {
        date: payDate,
        amount: tx.amount,
        cardId: card.id,
        txs: [tx]
      });
    }
  });

  // Convert bills to Events
  bills.forEach((bill, key) => {
    const cardName = cardMap.get(bill.cardId)?.name || 'Unknown Card';
    events.push({
      id: `virtual_card_pay_${key}`,
      date: formatDate(bill.date),
      amount: -bill.amount, // Payment is an outflow
      label: `${cardName} 引落`,
      type: 'card_payment',
      status: 'forecast', // Always forecast until maybe confirmed? Actually timeline usually treats future as forecast.
      cardPaymentMethodId: bill.cardId,
      relatedTransactions: bill.txs
    });
  });

  return events;
}

/**
 * Core Logic: Build Full Timeline
 * 
 * Merges:
 * 1. Cash/Bank Transactions (Immediate effect)
 * 2. Virtual Card Payment Events (Derived)
 * 3. Future Recurring Events (Loans/Subs - passed in as 'forecastEvents' if any)
 * 
 * Returns sorted list with running balance.
 */
export function buildTimeline(
  transactions: Transaction[],
  paymentMethods: PaymentMethod[],
  initialBalance: number,
  forecastEvents: TimelineEvent[] = [] // Loans, Salary, Subs
): { timeline: TimelineEvent[], finalBalance: number } {

  const allEvents: TimelineEvent[] = [];

  // 1. Process Real Transactions
  transactions.forEach(tx => {
    // If it's a Card expense, it does NOT affect balance NOW. So we don't add it as a balance-changing event.
    // We only add Cash/Bank expenses/incomes.

    const pm = paymentMethods.find(p => p.id === tx.payment_method_id);
    const isCard = pm?.type === 'card';

    // NOTE: Income is usually Bank/Cash. If someone receives income to Card? (Refund?). Assume Bank for now.
    // Balance Effecting Transactions:
    if (!isCard || tx.type === 'income') {
      allEvents.push({
        id: tx.id,
        date: tx.date,
        amount: tx.type === 'expense' ? -tx.amount : tx.amount,
        label: tx.memo || (tx.category_id ? '支出' : '入出金'), // simplified label logic
        type: 'transaction',
        status: 'confirmed',
        transactionId: tx.id
      });
    }
  });

  // 2. Add Virtual Card Payments
  const cardEvents = generateCardPaymentEvents(transactions, paymentMethods);
  allEvents.push(...cardEvents);

  // 3. Add Forecast (Loans, Subs)
  allEvents.push(...forecastEvents);

  // 4. Sort
  allEvents.sort((a, b) => {
    const d1 = new Date(a.date).getTime();
    const d2 = new Date(b.date).getTime();
    return d1 - d2;
  });

  // 5. Calculate Running Balance (Optional, or can be done in UI component? Better here for safety)
  // Actually, the UI usually needs the balance AT each row.
  // We won't mutate the event, but we can return the final balance?
  // Let's rely on the consumer (hook) to map running balance if needed.
  // Wait, the Requirement says "Screen 2: Timeline... Status, Resulting Balance".
  // So we should attach balance. But TimelineEvent type doesn't have it yet.
  // We'll stick to returning events for now.

  return { timeline: allEvents, finalBalance: allEvents.reduce((sum, e) => sum + e.amount, initialBalance) };
}
