
import { supabase } from "../../lib/supabaseClient";
import { Database } from "@/app/types/supabase"; // Assuming types exist or will be inferred

export type Template = {
  id: string;
  user_id: string;
  name: string;
  amount: number | null;
  type: 'income' | 'expense';
  category_id: string | null;
  payment_method_id: string | null;
  memo: string | null;
  created_at: string;
  last_used_at: string;
  // Joins
  category?: { name: string };
  payment_method?: { name: string };
};

export async function getTemplates(limit?: number) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("User not found");

  let query = supabase
    .from('transaction_templates')
    .select(`
      *,
      category:categories(name),
      payment_method:payment_methods(name)
    `)
    .eq('user_id', user.id)
    .order('last_used_at', { ascending: false });

  if (limit) {
    query = query.limit(limit);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data as Template[];
}

export async function createTemplate(template: Partial<Template>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("User not found");

  const { data, error } = await supabase
    .from('transaction_templates')
    .insert({
      ...template,
      user_id: user.id,
      amount: template.amount || null, // Ensure numeric or null
      last_used_at: new Date().toISOString(), // Init with now
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteTemplate(id: string) {
  const { error } = await supabase
    .from('transaction_templates')
    .delete()
    .eq('id', id);

  if (error) throw error;
  return true;
}

export async function updateTemplateUsage(id: string) {
  const { error } = await supabase
    .from('transaction_templates')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', id);

  if (error) console.error("Failed to update template usage", error);
  // Non-blocking, so just log error
}
