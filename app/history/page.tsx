// app/history/page.tsx
"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";
import { Transaction } from "../types";
import { useCategories } from "../hooks/useCategories";
import { usePaymentMethods } from "../hooks/usePaymentMethods";
import TransactionQuickForm from "../components/Input/TransactionQuickForm";
import { ChevronLeft, ChevronRight, Search, Edit2, Trash2 } from "lucide-react";

export default function HistoryPage() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  // Helpers for names
  const { categories } = useCategories();
  const { paymentMethods } = usePaymentMethods();

  const getCategoryName = (id: string) => categories.find(c => c.id === id)?.name || "未分類";
  const getPaymentName = (id: string) => paymentMethods.find(p => p.id === id)?.name || "不明";

  // Fetch Logic
  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Adjust date range for timezone safety (fetch a bit wider and filter in memory if strictly needed, or trust ISO)
      // Display month is `year`-`month`.
      const start = new Date(year, month - 1, 1).toISOString();
      const end = new Date(year, month, 1).toISOString();

      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", user.id)
        .gte("date", start)
        .lt("date", end)
        .order("date", { ascending: false });

      if (error) throw error;
      setTransactions(data || []);
    } catch (e) {
      console.error(e);
      alert("読み込みエラー");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [year, month]);

  // Handlers
  const handlePrevMonth = () => {
    if (month === 1) { setYear(y => y - 1); setMonth(12); }
    else setMonth(m => m - 1);
  };
  const handleNextMonth = () => {
    if (month === 12) { setYear(y => y + 1); setMonth(1); }
    else setMonth(m => m + 1);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("この取引を削除しますか？")) return;
    try {
      const { error } = await supabase.from("transactions").delete().eq("id", id);
      if (error) throw error;
      setTransactions(prev => prev.filter(t => t.id !== id));
    } catch (e) {
      alert("削除に失敗しました: " + (e as Error).message);
    }
  };

  const handleEditSuccess = () => {
    setEditingTransaction(null);
    fetchTransactions(); // Refresh list
  };

  // Filter
  const filtered = transactions.filter(t =>
    (t.memo || "").includes(searchQuery) ||
    getCategoryName(t.category_id || "").includes(searchQuery) ||
    String(t.amount).includes(searchQuery)
  );

  // Group by Date
  const grouped: { [date: string]: Transaction[] } = {};
  filtered.forEach(t => {
    const d = t.date; // already YYYY-MM-DD string from specific code usually, or ISO
    // If ISO, extract YYYY-MM-DD
    const dateKey = d.substring(0, 10);
    if (!grouped[dateKey]) grouped[dateKey] = [];
    grouped[dateKey].push(t);
  });

  // Sort dates desc
  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  return (
    <div className="page-container" style={{ paddingBottom: 40 }}>

      {/* Header & Controls */}
      <div className="app-card" style={{ padding: "16px", marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <button onClick={handlePrevMonth} className="btn-secondary" style={{ width: 44, height: 44, padding: 0 }}>
            <ChevronLeft size={24} />
          </button>
          <h1 style={{ fontSize: 20, margin: 0, color: "#3b2a1a" }}>{year}年{month}月</h1>
          <button onClick={handleNextMonth} className="btn-secondary" style={{ width: 44, height: 44, padding: 0 }}>
            <ChevronRight size={24} />
          </button>
        </div>

        <div style={{ position: "relative" }}>
          <Search size={20} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#9ca3af" }} />
          <input
            type="text"
            placeholder="検索 (メモ・カテゴリ・金額)"
            className="form-input"
            style={{ paddingLeft: 40 }}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* List */}
      {loading ? (
        <p style={{ textAlign: "center", color: "#888", marginTop: 40 }}>読み込み中...</p>
      ) : filtered.length === 0 ? (
        <p style={{ textAlign: "center", color: "#888", marginTop: 40 }}>取引履歴はありません</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {sortedDates.map(date => (
            <div key={date} className="app-card" style={{ padding: 0, overflow: "hidden" }}>
              {/* Date Header */}
              <div style={{
                background: "#fdf8ee",
                padding: "8px 16px",
                borderBottom: "1px solid #eee8dc",
                fontWeight: "bold",
                color: "#5d4330",
                fontSize: 14
              }}>
                {new Date(date).toLocaleDateString("ja-JP", { month: "long", day: "numeric", weekday: "short" })}
              </div>

              {/* Transactions in this date */}
              <div>
                {grouped[date].map((tx, idx) => (
                  <div key={tx.id} style={{
                    padding: "12px 16px",
                    borderBottom: idx === grouped[date].length - 1 ? "none" : "1px solid #f0f0f0",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center"
                  }}>
                    <div style={{ flex: 1, marginRight: 12 }}>
                      {/* Top Row: Category & Memo */}
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <span style={{
                          fontSize: 11,
                          background: "#eee",
                          color: "#666",
                          padding: "2px 6px",
                          borderRadius: 4,
                          whiteSpace: "nowrap"
                        }}>
                          {getCategoryName(tx.category_id || "")}
                        </span>
                        <span style={{ fontWeight: 600, fontSize: 14, color: "#333", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {tx.memo || "（メモなし）"}
                        </span>
                      </div>
                      {/* Bottom Row: Payment Method */}
                      <div style={{ fontSize: 11, color: "#999" }}>
                        {getPaymentName(tx.payment_method_id || "")}
                      </div>
                    </div>

                    <div style={{ textAlign: "right", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                      <div style={{
                        fontWeight: 700, fontSize: 16,
                        color: tx.type === 'income' ? "#2f855a" : "#c53030"
                      }}>
                        {tx.type === 'income' ? "+" : "¥"}{Number(tx.amount).toLocaleString()}
                      </div>

                      {/* Actions */}
                      <div style={{ display: "flex", gap: 12, marginTop: 4 }}>
                        <button
                          onClick={() => setEditingTransaction(tx)}
                          style={{
                            background: "none", border: "none", cursor: "pointer",
                            color: "#8c7b6c", padding: 4
                          }}
                          aria-label="編集"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(tx.id)}
                          style={{
                            background: "none", border: "none", cursor: "pointer",
                            color: "#c53030", padding: 4
                          }}
                          aria-label="削除"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Modal (Keeping simple fixed overly) */}
      {editingTransaction && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.5)", zIndex: 3000,
          display: "flex", alignItems: "center", justifyContent: "center", padding: 16
        }}>
          <div style={{ background: "#fff", padding: 20, borderRadius: 16, width: "100%", maxWidth: 400, maxHeight: "80vh", overflowY: "auto", boxShadow: "0 10px 25px rgba(0,0,0,0.2)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16, alignItems: "center" }}>
              <h3 style={{ margin: 0, fontSize: 18 }}>取引の編集</h3>
              <button onClick={() => setEditingTransaction(null)} style={{ border: "none", background: "#f5f5f5", width: 32, height: 32, borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>×</button>
            </div>
            <TransactionQuickForm
              onSuccess={handleEditSuccess}
              initialValues={{
                id: editingTransaction.id,
                amount: String(editingTransaction.amount),
                date: editingTransaction.date,
                categoryId: editingTransaction.category_id,
                paymentMethodId: editingTransaction.payment_method_id,
                type: editingTransaction.type,
                memo: editingTransaction.memo
              }}
            />
          </div>
        </div>
      )}

    </div>
  );
}
