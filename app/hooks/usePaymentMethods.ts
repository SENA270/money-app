import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";
import { PaymentMethod } from "../types";

export function usePaymentMethods() {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPaymentMethods = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("payment_methods")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setPaymentMethods(data as PaymentMethod[]);
    } catch (err: any) {
      console.error("Error fetching payment methods:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const addPaymentMethod = async (pm: Omit<PaymentMethod, "id" | "user_id" | "created_at">) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("payment_methods")
        .insert([{ ...pm, user_id: user.id }])
        .select()
        .single();

      if (error) throw error;
      setPaymentMethods((prev) => [...prev, data as PaymentMethod]);
      return data as PaymentMethod;
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const updatePaymentMethod = async (id: string, updates: Partial<PaymentMethod>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("payment_methods")
        .update(updates)
        .eq("id", id)
        .eq("user_id", user.id) // Security
        .select()
        .single();

      if (error) throw error;
      setPaymentMethods(prev => prev.map(p => p.id === id ? (data as PaymentMethod) : p));
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const deletePaymentMethod = async (id: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { error } = await supabase
        .from("payment_methods")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) throw error;
      setPaymentMethods(prev => prev.filter(p => p.id !== id));
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  useEffect(() => {
    fetchPaymentMethods();
  }, []);

  return {
    paymentMethods,
    loading,
    error,
    refresh: fetchPaymentMethods,
    addPaymentMethod,
    updatePaymentMethod,
    deletePaymentMethod
  };
}
