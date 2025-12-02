// app/analysis/page.tsx
"use client";

import { useEffect, useState } from "react";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
} from "chart.js";
import { Doughnut, Bar } from "react-chartjs-2";
import ProtectedPage from "../components/ProtectedPage"; // ← 追加

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement
);

type TransactionType = "expense" | "income";

type Transaction = {
  id: string;
  date: string; // YYYY-MM-DD
  amount: number;
  type: TransactionType;
  category: string;
  payment: string; // 支払い方法（口座名 / カードキー など）
  memo: string;
};

type AccountType = "bank" | "wallet" | "qr" | "card";

type Account = {
  id: string;
  type: AccountType;
  name: string;
  balance?: number;
  closingDay?: number;
  paymentDay?: number;
  paymentKey?: string;
};

type CardBillTotals = {
  [cardName: string]: number;
};

// 表示用の年月ラベル
function monthLabel(year: number, month: number): string {
  return `${year}年${month}月`;
}

// カード請求の締め/支払ロジック（bills と同じ考え方）
function calcBillingDate(
  useDate: Date,
  closingDay: number,
  paymentDay: number
): Date {
  const year = useDate.getFullYear();
  const day = useDate.getDate();

  // 基本は「利用月の翌月」が引き落とし月
  // 締め日より後の利用は「翌々月」
  let billingMonthIndex = useDate.getMonth() + 1; // 翌月
  if (day > closingDay) {
    billingMonthIndex += 1; // 翌々月
  }

  return new Date(year, billingMonthIndex, paymentDay);
}

// =============== ここから中身コンポーネント ===============
function AnalysisContent() {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth() + 1);

  const [incomeTotal, setIncomeTotal] = useState(0);
  const [expenseTotal, setExpenseTotal] = useState(0);

  const [categoryTotals, setCategoryTotals] = useState<{ [key: string]: number }>(
    {}
  );
  const [cardBillsForMonth, setCardBillsForMonth] = useState<CardBillTotals>({});

  const label = monthLabel(viewYear, viewMonth);

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

  // ① 表示中の月の「収入・支出」「カテゴリ別支出」を集計
  useEffect(() => {
    if (typeof window === "undefined") return;

    const raw = localStorage.getItem("transactions");
    if (!raw) {
      setIncomeTotal(0);
      setExpenseTotal(0);
      setCategoryTotals({});
      return;
    }

    try {
      const txs: Transaction[] = JSON.parse(raw);
      let income = 0;
      let expense = 0;
      const catTotals: { [key: string]: number } = {};

      txs.forEach((t) => {
        if (!t.date) return;
        const d = new Date(t.date);
        const y = d.getFullYear();
        const m = d.getMonth() + 1;
        if (y !== viewYear || m !== viewMonth) return;

        if (t.type === "income") {
          income += t.amount;
        } else if (t.type === "expense") {
          expense += t.amount;

          const key = t.category || "その他";
          if (!catTotals[key]) catTotals[key] = 0;
          catTotals[key] += t.amount;
        }
      });

      setIncomeTotal(income);
      setExpenseTotal(expense);
      setCategoryTotals(catTotals);
    } catch (e) {
      console.error("analysis: transactions 読み込み失敗", e);
      setIncomeTotal(0);
      setExpenseTotal(0);
      setCategoryTotals({});
    }
  }, [viewYear, viewMonth]);

  // ② 表示中の月の「カード請求額（引き落とし月ベース）」を集計
  useEffect(() => {
    if (typeof window === "undefined") return;

    const txRaw = localStorage.getItem("transactions");
    const accRaw = localStorage.getItem("accounts");

    if (!txRaw || !accRaw) {
      setCardBillsForMonth({});
      return;
    }

    try {
      const txs: Transaction[] = JSON.parse(txRaw);
      const accounts: Account[] = JSON.parse(accRaw);

      const cardAccounts = accounts.filter((a) => a.type === "card");
      const matchMap = new Map<string, Account>();

      cardAccounts.forEach((card) => {
        const nameKey = card.name?.trim();
        const payKey = card.paymentKey?.trim();
        if (nameKey) matchMap.set(nameKey, card);
        if (payKey) matchMap.set(payKey, card);
      });

      const totals: CardBillTotals = {};

      txs.forEach((t) => {
        if (t.type !== "expense") return;
        if (!t.payment) return;

        const card = matchMap.get(t.payment.trim());
        if (!card) return;
        if (card.closingDay == null || card.paymentDay == null) return;

        if (!t.date) return;
        const useDate = new Date(t.date);
        if (Number.isNaN(useDate.getTime())) return;

        const billDate = calcBillingDate(
          useDate,
          card.closingDay ?? 0,
          card.paymentDay ?? 1
        );
        const y = billDate.getFullYear();
        const m = billDate.getMonth() + 1;

        // 表示中の「請求月」と一致するものだけ
        if (y !== viewYear || m !== viewMonth) return;

        const key = card.name || "不明なカード";
        if (!totals[key]) totals[key] = 0;
        totals[key] += t.amount;
      });

      setCardBillsForMonth(totals);
    } catch (e) {
      console.error("analysis: card bills 集計失敗", e);
      setCardBillsForMonth({});
    }
  }, [viewYear, viewMonth]);

  const diff = incomeTotal - expenseTotal;

  // ▼ カテゴリ別円グラフ
  const categoryNames = Object.keys(categoryTotals);
  const hasCategoryData = categoryNames.length > 0;

  const doughnutData = hasCategoryData
    ? {
        labels: categoryNames,
        datasets: [
          {
            data: categoryNames.map((c) => categoryTotals[c]),
            backgroundColor: [
              "#f2b591",
              "#e8ddc7",
              "#c4a484",
              "#f6c453",
              "#b9d6a3",
              "#f7a072",
              "#c9a0dc",
            ],
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

  // ▼ カード別棒グラフ
  const cardNames = Object.keys(cardBillsForMonth);
  const hasCardData = cardNames.length > 0;

  const barData = {
    labels: cardNames,
    datasets: [
      {
        label: "請求額",
        data: cardNames.map((n) => cardBillsForMonth[n]),
        backgroundColor: "#f2b591",
      },
    ],
  };

  const barOptions: any = {
    responsive: true,
    plugins: {
      legend: {
        position: "top" as const,
      },
    },
    scales: {
      x: {
        ticks: {
          color: "#3b2a1a",
        },
      },
      y: {
        ticks: {
          color: "#3b2a1a",
        },
      },
    },
  };

  return (
    <div className="page-container">
      <h1>分析</h1>
      <p style={{ marginBottom: 16, fontSize: 14 }}>
        カテゴリ別・カード別の支出を確認できるページです。
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
        <span>表示中: {label}</span>
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

      {/* 先頭：その月のサマリー */}
      <div className="app-card" style={{ marginBottom: 16 }}>
        <h2>{label}のサマリー</h2>
        <p>収入：¥{incomeTotal.toLocaleString()}</p>
        <p>支出：¥{expenseTotal.toLocaleString()}</p>
        <p>
          差額：
          <span
            style={{
              color: diff < 0 ? "#c44536" : "#3b2a1a",
              fontWeight: 600,
            }}
          >
            ¥{diff.toLocaleString()}
          </span>
        </p>
      </div>

      {/* カテゴリ別 円グラフ */}
      <div className="app-card" style={{ marginBottom: 16 }}>
        <h2>カテゴリ別（{label}の支出・円グラフ）</h2>
        {hasCategoryData ? (
          <div style={{ maxWidth: 480, margin: "0 auto" }}>
            <Doughnut data={doughnutData} options={doughnutOptions} />
          </div>
        ) : (
          <p style={{ marginTop: 8 }}>この月の支出データがまだありません。</p>
        )}
      </div>

      {/* カード別棒グラフ */}
      <div className="app-card">
        <h2>カード別 請求額（{label}）</h2>
        {hasCardData ? (
          <div style={{ maxWidth: 640, margin: "0 auto" }}>
            <Bar data={barData} options={barOptions} />
          </div>
        ) : (
          <p style={{ marginTop: 8 }}>
            この月に引き落とし予定のカード請求はありません。
          </p>
        )}
      </div>
    </div>
  );
}

// =============== 最終 export ===============
export default function AnalysisPage() {
  return (
    <ProtectedPage>
      <AnalysisContent />
    </ProtectedPage>
  );
}