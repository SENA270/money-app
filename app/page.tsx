// app/page.tsx
"use client";

import { useEffect, useState } from "react";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Doughnut } from "react-chartjs-2";

ChartJS.register(ArcElement, Tooltip, Legend);

type TransactionType = "expense" | "income";

type Transaction = {
  id: string;
  date: string;
  amount: number;
  type: TransactionType;
  category: string;
  payment: string;
  memo: string;
};

type CategoryBudgetItem = {
  category: string;
  amount: number;
};

type AppSettings = {
  categoryBudgetsByMonth?: {
    [monthKey: string]: CategoryBudgetItem[];
  };
};

type Totals = {
  [key: string]: number;
};

// "2025-11" みたいなキー
function getMonthKey(year: number, month: number): string {
  const m = String(month).padStart(2, "0");
  return `${year}-${m}`;
}

// 今月表示のときだけ残り日数
function getRemainingDaysForMonth(
  viewYear: number,
  viewMonth: number
): number | null {
  const today = new Date();
  const y = today.getFullYear();
  const m = today.getMonth() + 1;

  if (y !== viewYear || m !== viewMonth) return null;

  const lastDay = new Date(y, m, 0).getDate();
  const currentDay = today.getDate();
  return lastDay - currentDay;
}

export default function Home() {
  const today = new Date();
  const [viewYear, setViewYear] = useState<number>(today.getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(today.getMonth() + 1);

  const [monthlyExpense, setMonthlyExpense] = useState(0);
  const [monthlyBudgetTotal, setMonthlyBudgetTotal] = useState(0);

  const [categorySpent, setCategorySpent] = useState<Totals>({});
  const [categoryBudget, setCategoryBudget] = useState<Totals>({});

  const displayMonthLabel = `${viewYear}年${viewMonth}月`;

  // ▼ 月送り
  const handlePrevMonth = () => {
    setViewMonth((prev) => {
      if (prev === 1) {
        setViewYear((y) => y - 1);
        return 12;
      }
      return prev - 1;
    });
  };

  const handleNextMonth = () => {
    setViewMonth((prev) => {
      if (prev === 12) {
        setViewYear((y) => y + 1);
        return 1;
      }
      return prev + 1;
    });
  };

  // ① 表示中の月の支出集計
  useEffect(() => {
    if (typeof window === "undefined") return;

    const raw = localStorage.getItem("transactions");
    if (!raw) return;

    try {
      const txs: Transaction[] = JSON.parse(raw);

      let totalExpense = 0;
      const perCategory: Totals = {};

      txs.forEach((t) => {
        if (!t.date || t.type !== "expense") return;
        const d = new Date(t.date);
        const y = d.getFullYear();
        const m = d.getMonth() + 1;

        if (y !== viewYear || m !== viewMonth) return;

        totalExpense += t.amount;
        const key = t.category || "その他";
        if (!perCategory[key]) perCategory[key] = 0;
        perCategory[key] += t.amount;
      });

      setMonthlyExpense(totalExpense);
      setCategorySpent(perCategory);
    } catch (e) {
      console.error("取引データの読み込みに失敗しました", e);
    }
  }, [viewYear, viewMonth]);

  // ② 表示中の月のカテゴリ別予算
  useEffect(() => {
    if (typeof window === "undefined") return;

    const raw = localStorage.getItem("settings");
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw) as AppSettings;
      const byMonth = parsed.categoryBudgetsByMonth || {};
      const monthKey = getMonthKey(viewYear, viewMonth);
      const items = byMonth[monthKey] || [];

      const budgetMap: Totals = {};
      let total = 0;

      items.forEach((item) => {
        if (!item.category) return;
        const amt = Number(item.amount) || 0;
        budgetMap[item.category] = amt;
        total += amt;
      });

      setCategoryBudget(budgetMap);
      setMonthlyBudgetTotal(total);
    } catch (e) {
      console.error("カテゴリ別予算の読み込みに失敗しました", e);
    }
  }, [viewYear, viewMonth]);

  // ▼ 全体の残り・オーバー
  const rawRemainingTotal = monthlyBudgetTotal - monthlyExpense; // マイナスもそのまま
  const isOverAll = rawRemainingTotal < 0;
  const hasBudget = monthlyBudgetTotal > 0;

  const remainingForChart = Math.max(rawRemainingTotal, 0);
  const overForChart = Math.max(-rawRemainingTotal, 0);

  // 円グラフデータ
  const doughnutData = hasBudget
    ? rawRemainingTotal >= 0
      ? {
          labels: ["残り予算", "使った金額"],
          datasets: [
            {
              data: [remainingForChart, monthlyExpense],
              backgroundColor: ["#f2b591", "#e8ddc7"],
              borderColor: "#f9f4ea",
              borderWidth: 2,
            },
          ],
        }
      : {
          labels: ["残り予算", "使った金額（予算内）", "予算オーバー分"],
          datasets: [
            {
              data: [0, monthlyBudgetTotal, overForChart],
              backgroundColor: ["#f2b591", "#e8ddc7", "#c44536"],
              borderColor: "#f9f4ea",
              borderWidth: 2,
            },
          ],
        }
    : {
        labels: ["データなし"],
        datasets: [
          {
            data: [1],
            backgroundColor: ["#e0d6c4"],
          },
        ],
      };

  const doughnutOptions: any = {
    plugins: {
      legend: {
        position: "bottom" as const,
        labels: { color: "#3b2a1a" },
      },
    },
  };

  // ▼ カテゴリ別行データ
  const categoryRows = Object.keys(categoryBudget).map((name) => {
    const budget = categoryBudget[name] || 0;
    const spent = categorySpent[name] || 0;
    const remaining = budget - spent;

    const ratio =
      budget > 0 && remaining > 0
        ? Math.max(0, Math.min(1, remaining / budget))
        : 0;

    return {
      name,
      budget,
      spent,
      remaining,
      ratio,
    };
  });

  // 残りが少ない順
  categoryRows.sort((a, b) => a.remaining - b.remaining);

  // 全体オーバー時、「他カテゴリの残り」でどこまでカバーできるか
  const totalRemainingPositive = categoryRows
    .filter((r) => r.remaining > 0)
    .reduce((sum, r) => sum + r.remaining, 0);

  const totalDeficit = Math.max(-rawRemainingTotal, 0); // 全体のオーバー額
  const stillShort = Math.max(totalDeficit - totalRemainingPositive, 0); // 調整しても足りない分

  const remainingDays = getRemainingDaysForMonth(viewYear, viewMonth);
  const perDayBudget =
    remainingDays !== null && remainingDays > 0
      ? Math.floor(rawRemainingTotal / remainingDays)
      : null;

  return (
    <div className="page-container">
      <h1>ホーム</h1>
      <p style={{ marginBottom: "12px" }}>
        月ごとの予算と実績をざっくり確認できるページです。
      </p>

      {/* 月送り */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 16,
          fontSize: 14,
        }}
      >
        <button
          type="button"
          onClick={handlePrevMonth}
          style={{
            padding: "4px 10px",
            borderRadius: 999,
            border: "1px solid #c1a97e",
            background: "#fef9ed",
            cursor: "pointer",
          }}
        >
          ← 前の月
        </button>
        <span>表示中: {displayMonthLabel}</span>
        <button
          type="button"
          onClick={handleNextMonth}
          style={{
            padding: "4px 10px",
            borderRadius: 999,
            border: "1px solid #c1a97e",
            background: "#fef9ed",
            cursor: "pointer",
          }}
        >
          次の月 →
        </button>
      </div>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "16px",
          alignItems: "flex-start",
        }}
      >
        {/* 左：サマリー */}
        <div
          className="app-card"
          style={{ flex: "2 1 320px", minWidth: "280px" }}
        >
          <h2>{displayMonthLabel}のサマリー</h2>

          {hasBudget ? (
            <>
              {/* 今月の残りを少し強調 */}
              <div
                style={{
                  marginTop: 4,
                  marginBottom: 8,
                  fontSize: 14,
                }}
              >
                今月使える残り：
                <strong
                  style={{
                    fontSize: 18,
                    color: isOverAll ? "#c44536" : "#3b2a1a",
                    marginLeft: 4,
                  }}
                >
                  ¥{Math.abs(rawRemainingTotal).toLocaleString()}
                </strong>
              </div>

              <div
                style={{
                  position: "relative",
                  maxWidth: "360px",
                  margin: "0 auto",
                }}
              >
                <Doughnut data={doughnutData} options={doughnutOptions} />

                {/* 真ん中の表示 */}
                <div
                  style={{
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                    textAlign: "center",
                    pointerEvents: "none",
                    color: "#3b2a1a",
                  }}
                >
                  <div style={{ fontSize: "13px", marginBottom: 2 }}>
                    {isOverAll ? "オーバー" : "残り"}
                  </div>
                  <div style={{ fontSize: "18px", fontWeight: 700 }}>
                    ¥{Math.abs(rawRemainingTotal).toLocaleString()}
                  </div>
                  <div style={{ fontSize: "11px", marginTop: 2 }}>
                    / 予算 ¥{monthlyBudgetTotal.toLocaleString()}
                  </div>
                </div>
              </div>

              <div style={{ marginTop: "12px", fontSize: "14px" }}>
                <p>
                  予算：
                  <strong>¥{monthlyBudgetTotal.toLocaleString()}</strong>
                </p>
                <p>
                  使った金額：
                  <strong>¥{monthlyExpense.toLocaleString()}</strong>
                </p>
                {remainingDays !== null ? (
                  <>
                    <p>
                      残り日数：<strong>{remainingDays}</strong>日
                    </p>
                    <p>
                      1日あたり使える金額：
                      <strong>
                        ¥{(perDayBudget ?? 0).toLocaleString()}
                      </strong>
                    </p>
                  </>
                ) : (
                  <p style={{ color: "#555", marginTop: 4 }}>
                    ※ 今月以外を表示中のため、残り日数と1日あたりの目安は表示していません。
                  </p>
                )}
              </div>
            </>
          ) : (
            <p style={{ marginTop: "8px" }}>
              この月の予算がまだ設定されていません。
              <br />
              「設定 &gt; カテゴリ別予算」から予算を登録してください。
            </p>
          )}
        </div>

        {/* 右：カテゴリ別 */}
        <div
          className="app-card"
          style={{ flex: "1 1 260px", minWidth: "260px" }}
        >
          <h2>カテゴリ別 残り予算</h2>

          {!hasBudget ? (
            <p>カテゴリ別の予算がまだ登録されていません。</p>
          ) : categoryRows.length === 0 ? (
            <p>この月のカテゴリ別予算は設定されていますが、明細がありません。</p>
          ) : (
            <>
              {/* 全体状況の説明 */}
              {isOverAll ? (
                <div
                  style={{
                    fontSize: "13px",
                    marginBottom: 8,
                    color: "#c44536",
                    lineHeight: 1.5,
                  }}
                >
                  全体で
                  <strong>
                    ¥{totalDeficit.toLocaleString()}
                  </strong>
                  オーバーしています。
                  <br />
                  他カテゴリの残り合計は
                  <strong>
                    ¥{totalRemainingPositive.toLocaleString()}
                  </strong>
                  です。
                  {stillShort > 0 ? (
                    <>
                      <br />
                      すべて調整しても
                      <strong>
                        ¥{stillShort.toLocaleString()}
                      </strong>
                      足りない見込みです。
                    </>
                  ) : (
                    <>
                      <br />
                      他カテゴリを調整すれば、まだ挽回できる余地があります。
                    </>
                  )}
                </div>
              ) : (
                <div
                  style={{
                    fontSize: "13px",
                    marginBottom: 8,
                    color: "#555",
                  }}
                >
                  全体としてはまだ予算内です。
                </div>
              )}

              <div
                style={{ display: "flex", flexDirection: "column", gap: 12 }}
              >
                {categoryRows.map((row) => {
                  const isRowOver = row.remaining < 0;
                  const fillWidth = isRowOver
                    ? "100%"
                    : `${row.ratio * 100}%`;

                  const barColor = isRowOver
                    ? "#c44536"
                    : isOverAll && row.remaining > 0
                    ? "#e09f3e"
                    : "#4f8f3a";

                  // メッセージ：オーバー時だけ表示
                  let message = "";
                  if (isRowOver) {
                    message = "予算オーバーです。他のカテゴリで調整しましょう。";
                  }

                  return (
                    <div key={row.name}>
                      {/* 1行目：カテゴリ名 + 金額 */}
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          fontSize: "13px",
                          marginBottom: 4,
                        }}
                      >
                        <span>{row.name}</span>
                        <span
                          style={{
                            color: isRowOver ? "#c44536" : "#3b2a1a",
                          }}
                        >
                          {isRowOver ? (
                            <>
                              予算オーバー：
                              ¥{Math.abs(row.remaining).toLocaleString()} / 予算：
                              ¥{row.budget.toLocaleString()}
                            </>
                          ) : (
                            <>
                              残り：
                              ¥{row.remaining.toLocaleString()} / 予算：
                              ¥{row.budget.toLocaleString()}
                            </>
                          )}
                        </span>
                      </div>

                      {/* 2行目：オーバー時だけ注意文 */}
                      {message && (
                        <div
                          style={{
                            fontSize: "12px",
                            marginBottom: 4,
                            color: "#c44536",
                          }}
                        >
                          {message}
                        </div>
                      )}

                      {/* 棒グラフ */}
                      <div
                        style={{
                          width: "100%",
                          height: "8px",
                          borderRadius: "999px",
                          backgroundColor: "#e6ddcf",
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            width: fillWidth,
                            height: "100%",
                            borderRadius: "999px",
                            backgroundColor: barColor,
                            transition: "width 0.3s",
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
      {/* フッターのリンク（明細・シミュレーション） は削除 */}
    </div>
  );
}