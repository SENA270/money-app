
import { supabase } from "../../../lib/supabaseClient";
import { Transaction } from "../../types";

export async function getRecentTransactions(limit: number = 10): Promise<Transaction[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("User not found");

  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .eq("user_id", user.id)
    .order("date", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data as Transaction[];
}
