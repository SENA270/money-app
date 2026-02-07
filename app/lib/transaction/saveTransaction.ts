import { supabase } from "../../../lib/supabaseClient";

export type TransactionInput = {
  id?: string; // Optional for update
  amount: number;
  type: "expense" | "income" | "repayment";
  category_id?: string; // Made optional for repayment auto-fill
  payment_method_id?: string; // Made optional for repayment auto-fill
  loan_id?: string; // Optional Link
  date: string;
  memo?: string;
  user_id: string;
};

export async function saveTransaction(input: TransactionInput) {
  // Validation
  if (!input.amount || isNaN(input.amount)) throw new Error("金額が無効です");
  if (!input.user_id) throw new Error("ログインが必要です");

  // Auto-fill logic for Repayment
  let category_id = input.category_id;
  let payment_method_id = input.payment_method_id;

  if (input.type === 'repayment') {
    if (!category_id) {
      // Find or Create 'Repayment' category
      const { data: cat } = await supabase.from('categories').select('id').eq('user_id', input.user_id).eq('name', 'Repayment').single();
      if (cat) {
        category_id = cat.id;
      } else {
        const { data: newCat, error } = await supabase.from('categories').insert({ user_id: input.user_id, name: 'Repayment' }).select('id').single();
        if (error) throw error;
        category_id = newCat.id;
      }
    }
    if (!payment_method_id) {
      // Find 'Cash' method (or create)
      const { data: pm } = await supabase.from('payment_methods').select('id').eq('user_id', input.user_id).eq('name', 'Cash').single();
      if (pm) {
        payment_method_id = pm.id;
      } else {
        // Safe fallback: try to find any method, or create 'Cash'
        const { data: newPm, error } = await supabase.from('payment_methods').insert({
          user_id: input.user_id,
          name: 'Cash',
          type: 'cash'
        }).select('id').single();
        if (error) throw error;
        payment_method_id = newPm.id;
      }
    }
  }

  if (!category_id) throw new Error("カテゴリを選択してください");
  if (!payment_method_id) throw new Error("支払い方法を選択してください");


  const payload: any = {
    user_id: input.user_id,
    date: input.date || new Date().toISOString().slice(0, 10),
    amount: Math.abs(input.amount),
    type: input.type,
    category_id: category_id,
    payment_method_id: payment_method_id,
    loan_id: input.loan_id || null, // Add loan_id
    memo: input.memo || "",
  };

  if (input.id) {
    payload.id = input.id;
  } else {
    payload.created_at = new Date().toISOString();
  }

  // Look up names for legacy columns (backward compatibility)
  const { data: catData } = await supabase.from("categories").select("name").eq("id", category_id).single();
  const { data: methodData } = await supabase.from("payment_methods").select("name").eq("id", payment_method_id).single();

  const finalPayload = {
    ...payload,
    category: catData?.name || "Uncategorized",
    payment: methodData?.name || "Unknown"
  };

  const { error } = await supabase.from("transactions").upsert(finalPayload);
  if (error) throw error;

  return true;
}
