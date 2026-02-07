import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";
import { Category } from "../types";

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .eq("user_id", user.id)
        .order("name", { ascending: true });

      if (error) throw error;
      setCategories(data as Category[]);
    } catch (err: any) {
      console.error("Error fetching categories:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const addCategory = async (name: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("categories")
        .insert([{ name, user_id: user.id }])
        .select()
        .single();

      if (error) throw error;
      setCategories((prev) => [...prev, data as Category]);
      return data;
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const updateCategory = async (id: string, updates: Partial<Category>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("categories")
        .update(updates)
        .eq("id", id)
        .eq("user_id", user.id)
        .select()
        .single();

      if (error) throw error;
      setCategories((prev) => prev.map((c) => (c.id === id ? (data as Category) : c)));
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const toggleArchiveCategory = async (id: string, currentStatus: boolean) => {
    return updateCategory(id, { is_archived: !currentStatus });
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  return {
    categories,
    loading,
    error,
    refresh: fetchCategories,
    addCategory,
    updateCategory,
    toggleArchiveCategory
  };
}
