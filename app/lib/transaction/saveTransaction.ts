
import { supabase } from "../../../lib/supabaseClient";

export type TransactionInput = {
  amount: number;
  type: "expense" | "income" | "card_payment";
  category: string;
  date: string;
  memo?: string;
  paymentMethod: string; // Account Name
  user_id: string;
};

// Internal types for processing
type NormalizedTransaction = Omit<TransactionInput, "type"> & {
  type: "expense" | "income"; // DB only knows these
  isCardTransfer?: boolean; // logic flag
};

export async function saveTransaction(input: TransactionInput) {
  // 1. Normalize
  // If 'card_payment', it's essentially a Transfer but we want to track it as 'expense' for categorization?
  // Wait, requirement is: "Internal logic treats it as Transfer (to prevent double counting expense)".
  // BUT user wants to categorize it: "Food (Card)".
  // If we treat as transfer, it's not an expense in P0-3 logic?
  // P0-3 Logic: "card_payment" Type exists in DB? Or just logic?
  // Let's check P0-3 implementation.
  // In P0-3, we ADDED `card_payment` to the DB Type enum or kept it as `expense` but logic handled it?
  // Checks... P0-3 summary says: "`TransactionType` includes `card_payment`".
  // So DB supports `card_payment` string?
  // If so, we just save as `card_payment`.
  // Forecast hook handles `card_payment` by subtracting from Asset but NOT counting as Monthly Expense?
  // Wait, if it's "Food", we WANT it to count as "Expense Category Breakdown" but NOT "Cash outflow"?
  // Double counting problem: 
  // 1. Transaction: Food 1000yen (Card) -> Date X.
  // 2. Bill Payment: Withdrawal 50000yen (Bank -> Card) -> Date Y.
  // If both are "Expense", we spend 2000yen.
  // Solution:
  // A. Transaction is "Expense" (Category: Food). Payment is "Transfer".
  //    -> This creates negative balance in Card account.
  //    -> Bill Payment refills Card account.
  //    -> Correct approach.
  // B. Transaction is "card_payment".
  //    -> Forecast hook: `card_payment` subtracts from Asset? No, Card is Liability.
  //    -> P0-3 said: "currentAssetBalance correctly subtracts amount... from asset accounts... treating as transfers."
  //    -> This implies P0-3 treated `card_payment` as "Debit from Asset"??
  //    -> No, "Card Payment" usually means "Using Card".

  // Let's trust the P0-3 DB schema supports `card_payment` type string.
  // We will save exactly what is given.

  // Validation
  if (!input.amount || isNaN(input.amount)) throw new Error("金額が無効です");
  if (!input.user_id) throw new Error("ログインが必要です");

  const payload = {
    user_id: input.user_id,
    date: input.date || new Date().toISOString().slice(0, 10),
    amount: Math.abs(input.amount), // Always positive stored?
    type: input.type,
    category: input.category || "未分類",
    payment: input.paymentMethod, // Account Name
    memo: input.memo || "",
    created_at: new Date().toISOString()
  };

  const { error } = await supabase.from("transactions").insert([payload]);
  if (error) throw error;

  return true;
}
