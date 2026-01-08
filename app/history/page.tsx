// app/history/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabaseClient";

type TransactionType = "expense" | "income";

type Transaction = {
  id: string;
  user_id: string;
  date: string; // "2025-11-21"
  amount: number;
  type: TransactionType;
  category: string;
  payment: string;
  memo: string;
  created_at?: string | null;
};

// "2025-11-26" -> "2025-11"
function toYearMonth(dateStr: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function formatDate(dateStr: string) {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function HistoryContent() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [loading, setLoading] = useState(true);

  // Supabase から全件読み込み
  useEffect(() => {
    try {
      const fetchTx = async () => {
        setLoading(true);
        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (userError) {
          console.error("getUser error", userError);
          setLoading(false);
          return;
        }
        const user = userData?.user;
        if (!user) {
          setLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from("transactions")
          .select("*")
          .eq("user_id", user.id)
          .order("date", { ascending: false })
          .order("created_at", { ascending: false });

        if (error) {
          console.error("transactions fetch error", error);
          setLoading(false);
          return;
        }

        const list = (data || []) as Transaction[];
        setTransactions(list);

        if (list.length > 0) {
          const newestMonth = toYearMonth(list[0].date);
          setSelectedMonth(newestMonth);
        }
        setLoading(false);
      };

      fetchTx();
    } catch (e) {
      console.error("取引データの読み込みに失敗しました", e);
      setLoading(false);
    }
  }, []);

  // ====== 月一覧（"2025-11" のような文字列） ======
  const months = useMemo(() => {
    const set = new Set<string>();
    transactions.forEach((t) => {
      const ym = toYearMonth(t.date);
      if (ym) set.add(ym);
    });

    return Array.from(set).sort((a, b) => {
      // 新しい月が左に来るように降順
      return a < b ? 1 : -1;
    });
  }, [transactions]);

  // ====== 選択中の月の明細だけを、日付 & 時刻の新しい順に並べる ======
  const visibleTransactions = useMemo(() => {
    // ベース配列を作る
    const base = selectedMonth
      ? transactions.filter((t) => toYearMonth(t.date) === selectedMonth)
      : [...transactions];

    // 日付の新しい順 → 同じ日なら created_at の新しい順
    return [...base].sort((a, b) => {
      const ta = new Date(a.date).getTime();
      const tb = new Date(b.date).getTime();
      if (tb !== ta) return tb - ta;

      const ca = a.created_at ? new Date(a.created_at).getTime() : ta;
      const cb = b.created_at ? new Date(b.created_at).getTime() : tb;
      return cb - ca;
    });
  }, [transactions, selectedMonth]);

  // 削除処理（1件）
  const handleDelete = async (id: string) => {
    const ok = window.confirm("この明細を削除しますか？");
    if (!ok) return;

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      console.error("ユーザー取得に失敗しました", userError);
      return;
    }

    const { error } = await supabase
      .from("transactions")
      .delete()
      .eq("id", id)
      .eq("user_id", userData.user.id);

    if (error) {
      console.error("削除に失敗しました", error);
      alert("削除に失敗しました。時間をおいて再度お試しください。");
      return;
    }

    setTransactions((prev) => prev.filter((t) => t.id !== id));
  };

  const totalIncome = visibleTransactions
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpense = visibleTransactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="page-container">
      <h1>明細一覧（月ごと）</h1>
      <p style={{ marginBottom: 16 }}>
        月ごとに明細を表示します。不要な行はここから削除・編集できます。
      </p>

      {loading && <p>読み込み中...</p>}

      {/* 月選択ボタン */}
      {!loading && months.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <span style={{ marginRight: 8 }}>表示する月：</span>
          {months.map((ym) => {
            const [y, m] = ym.split("-");
            const isActive = ym === selectedMonth;
            return (
              <button
                key={ym}
                type="button"
                onClick={() => setSelectedMonth(ym)}
                style={{
                  marginRight: 8,
                  marginBottom: 8,
                  padding: "4px 10px",
                  borderRadius: 999,
                  border: isActive ? "1px solid #8a6b3f" : "1px solid #ccc",
                  backgroundColor: isActive ? "#fff0d6" : "#fff",
                  cursor: "pointer",
                  fontSize: 12,
                }}
              >
                {y}年{Number(m)}月
              </button>
            );
          })}
        </div>
      )}

      <div className="app-card" style={{ marginBottom: 16 }}>
        <h2>集計（{selectedMonth || "全期間"}）</h2>
        <p>収入合計：¥{totalIncome.toLocaleString()}</p>
        <p>支出合計：¥{totalExpense.toLocaleString()}</p>
        <p>差額：¥{(totalIncome - totalExpense).toLocaleString()}</p>
      </div>

      <div className="app-card">
        <h2>明細一覧</h2>

        {visibleTransactions.length === 0 ? (
          <p>この月の明細はありません。</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table
              className="table-basic"
              style={{
                minWidth: "600px", // Force scroll on mobile
                whiteSpace: "nowrap",
              }}
            >
              <thead>
                <tr>
                  <th style={{ textAlign: "left" }}>日付</th>
                  <th style={{ textAlign: "left" }}>種類</th>
                  <th style={{ textAlign: "left" }}>カテゴリ</th>
                  <th style={{ textAlign: "right" }}>金額</th>
                  <th style={{ textAlign: "left" }}>支払い方法</th>
                  <th style={{ textAlign: "left" }}>メモ</th>
                  <th style={{ textAlign: "center" }}>操作</th>
                </tr>
              </thead>
              <tbody>
                {visibleTransactions.map((t) => (
                  <tr key={t.id}>
                    <td>{formatDate(t.date)}</td>
                    <td>{t.type === "income" ? "収入" : "支出"}</td>
                    <td>{t.category}</td>
                    <td
                      style={{
                        textAlign: "right",
                        color: t.type === "expense" ? "#c44536" : "#2f7d32",
                        fontWeight: 600,
                      }}
                    >
                      {t.type === "expense" ? "-" : "+"}
                      ¥{t.amount.toLocaleString()}
                    </td>
                    <td>{t.payment}</td>
                    <td>{t.memo}</td>
                    <td style={{ textAlign: "center" }}>
                      <div style={{ display: "inline-flex", gap: 8 }}>
                        <Link
                          href={`/input?id=${t.id}`}
                          className="btn-link"
                          style={{
                            textDecoration: "none",
                            padding: "6px 12px", // Larger touch target
                          }}
                        >
                          編集
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleDelete(t.id)}
                          className="btn-link"
                          style={{
                            borderColor: "#c44536",
                            color: "#c44536",
                            backgroundColor: "#fff5f3",
                            padding: "6px 12px", // Larger touch target
                          }}
                        >
                          削除
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div style={{ marginTop: 16, fontSize: 14 }}>
        <Link href="/">← ホームに戻る</Link>
      </div>
    </div>
  );
}

export default function HistoryPage() {
  return <HistoryContent />;
}
