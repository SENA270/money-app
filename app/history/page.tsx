// app/history/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type TransactionType = "expense" | "income";

// createdAt を追加（無いデータもある想定なので ? にしておく）
type Transaction = {
  id: string;
  date: string; // "2025-11-21" or "2025-11-21T10:30"
  amount: number;
  type: TransactionType;
  category: string;
  payment: string;
  memo: string;
  createdAt?: string; // 追加
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

export default function HistoryPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>("");

  // 一度だけ localStorage から全件読み込み
  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = localStorage.getItem("transactions");
    if (!raw) return;

    try {
      const list = JSON.parse(raw) as Transaction[];

      // 一旦「全件を新しい順」にソートしておく（念のため）
      const sorted = [...list].sort((a, b) => {
        const ta = new Date(a.date).getTime();
        const tb = new Date(b.date).getTime();
        if (tb !== ta) return tb - ta;

        // 日付が同じなら createdAt の新しい順
        const ca = a.createdAt ? new Date(a.createdAt).getTime() : ta;
        const cb = b.createdAt ? new Date(b.createdAt).getTime() : tb;
        return cb - ca;
      });

      setTransactions(sorted);

      // デフォルト選択を「一番新しい月」にしておく
      if (sorted.length > 0) {
        const newestMonth = toYearMonth(sorted[0].date);
        setSelectedMonth(newestMonth);
      }
    } catch (e) {
      console.error("取引データの読み込みに失敗しました", e);
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

    // 日付の新しい順 → 同じ日なら createdAt の新しい順
    return [...base].sort((a, b) => {
      const ta = new Date(a.date).getTime();
      const tb = new Date(b.date).getTime();
      if (tb !== ta) return tb - ta;

      const ca = a.createdAt ? new Date(a.createdAt).getTime() : ta;
      const cb = b.createdAt ? new Date(b.createdAt).getTime() : tb;
      return cb - ca;
    });
  }, [transactions, selectedMonth]);

  // 削除処理（1件）
  const handleDelete = (id: string) => {
    if (typeof window === "undefined") return;
    const ok = window.confirm("この明細を削除しますか？");
    if (!ok) return;

    setTransactions((prev) => {
      const updated = prev.filter((t) => t.id !== id);
      try {
        localStorage.setItem("transactions", JSON.stringify(updated));
      } catch (e) {
        console.error("取引データの保存に失敗しました", e);
      }
      return updated;
    });
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

      {/* 月選択ボタン */}
      {months.length > 0 && (
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
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "13px",
              }}
            >
              <thead>
                <tr>
                  <th style={{ textAlign: "left", padding: "4px 6px" }}>日付</th>
                  <th style={{ textAlign: "left", padding: "4px 6px" }}>種類</th>
                  <th style={{ textAlign: "left", padding: "4px 6px" }}>カテゴリ</th>
                  <th style={{ textAlign: "right", padding: "4px 6px" }}>金額</th>
                  <th style={{ textAlign: "left", padding: "4px 6px" }}>支払い方法</th>
                  <th style={{ textAlign: "left", padding: "4px 6px" }}>メモ</th>
                  <th style={{ textAlign: "center", padding: "4px 6px" }}>操作</th>
                </tr>
              </thead>
              <tbody>
                {visibleTransactions.map((t) => (
                  <tr key={t.id}>
                    <td style={{ padding: "4px 6px" }}>{formatDate(t.date)}</td>
                    <td style={{ padding: "4px 6px" }}>
                      {t.type === "income" ? "収入" : "支出"}
                    </td>
                    <td style={{ padding: "4px 6px" }}>{t.category}</td>
                    <td
                      style={{
                        padding: "4px 6px",
                        textAlign: "right",
                        color: t.type === "expense" ? "#c44536" : "#2f7d32",
                      }}
                    >
                      {t.type === "expense" ? "-" : "+"}
                      ¥{t.amount.toLocaleString()}
                    </td>
                    <td style={{ padding: "4px 6px" }}>{t.payment}</td>
                    <td style={{ padding: "4px 6px" }}>{t.memo}</td>
                    <td
                      style={{
                        padding: "4px 6px",
                        textAlign: "center",
                      }}
                    >
                      <div
                        style={{
                          display: "inline-flex",
                          gap: 8,
                        }}
                      >
                        <Link
                          href={`/input?id=${t.id}`}
                          style={{
                            fontSize: "12px",
                            padding: "2px 10px",
                            borderRadius: "999px",
                            border: "1px solid #8a6b3f",
                            backgroundColor: "#fff8e8",
                            color: "#8a6b3f",
                            textDecoration: "none",
                          }}
                        >
                          編集
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleDelete(t.id)}
                          style={{
                            fontSize: "12px",
                            padding: "2px 8px",
                            borderRadius: "999px",
                            border: "1px solid #c44536",
                            backgroundColor: "#fff5f3",
                            color: "#c44536",
                            cursor: "pointer",
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