// app/summary/page.tsx
"use client";

import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import Link from "next/link";
import {
  useMoneySummary,
  formatPaymentLabel,
} from "../hooks/useMoneySummary";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export default function SummaryPage() {
  const {
    categoryTotals,
    cardSpendThisMonth,
    cardBillThisMonth,
    cardBillNextMonth,
    totalIncome,
    totalExpense,
    totalDiff,
    prevIncome,
    prevExpense,
    prevDiff,
  } = useMoneySummary();

  const labels = ["先月請求", "今月利用", "来月請求予定"];

  const cardKeys = Array.from(
    new Set([
      ...Object.keys(cardSpendThisMonth),
      ...Object.keys(cardBillThisMonth),
      ...Object.keys(cardBillNextMonth),
    ])
  );

  const hasCardData = cardKeys.length > 0;

  const chartData: any = {
    labels,
    datasets: cardKeys.map((key, index) => ({
      label: formatPaymentLabel(key),
      data: [
        cardBillThisMonth[key] || 0,
        cardSpendThisMonth[key] || 0,
        cardBillNextMonth[key] || 0,
      ],
      backgroundColor: `rgba(${80 + index * 60}, 140, 180, 0.6)`,
      borderColor: `rgba(${80 + index * 60}, 140, 180, 1)`,
      borderWidth: 1,
    })),
  };

  const chartOptions: any = {
    responsive: true,
    plugins: {
      legend: {
        position: "top" as const,
        labels: { color: "#3b2a1a" },
      },
      title: {
        display: true,
        text: "カード別 月別金額",
        color: "#3b2a1a",
      },
    },
    scales: {
      x: {
        ticks: { color: "#3b2a1a" },
        grid: { color: "#e4d6bf" },
      },
      y: {
        ticks: { color: "#3b2a1a" },
        grid: { color: "#e4d6bf" },
      },
    },
  };

  return (
    <div>
      <h1>サマリー詳細</h1>
      <p>全期間のサマリー・カテゴリ別・カード別の状況を見るページ。</p>

      {/* 全期間 */}
      <div className="app-card">
        <h2>全期間のサマリー</h2>
        <p>収入：¥{totalIncome}</p>
        <p>支出：¥{totalExpense}</p>
        <p>差額：¥{totalDiff}</p>
      </div>

      {/* 先月 */}
      <div className="app-card">
        <h2>先月のサマリー</h2>
        <p>収入：¥{prevIncome}</p>
        <p>支出：¥{prevExpense}</p>
        <p>差額：¥{prevDiff}</p>
      </div>

      {/* カテゴリ別（今月の支出） */}
      <div className="app-card">
        <h2>カテゴリ別（今月の支出）</h2>
        {Object.keys(categoryTotals).length === 0 ? (
          <p>まだデータがありません。</p>
        ) : (
          <ul>
            {Object.entries(categoryTotals).map(([name, value]) => (
              <li key={name}>
                {name}：¥{value}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* カード別（今月の利用額） */}
      <div className="app-card">
        <h2>カード別（今月の利用額）</h2>
        {Object.keys(cardSpendThisMonth).length === 0 ? (
          <p>まだカード払いのデータがありません。</p>
        ) : (
          <ul>
            {Object.entries(cardSpendThisMonth).map(([key, value]) => (
              <li key={key}>
                {formatPaymentLabel(key)}：¥{value}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* カード別（今月の請求額） */}
      <div className="app-card">
        <h2>カード別（今月の請求額 ※先月利用分）</h2>
        {Object.keys(cardBillThisMonth).length === 0 ? (
          <p>先月利用分からの請求はありません。</p>
        ) : (
          <ul>
            {Object.entries(cardBillThisMonth).map(([key, value]) => (
              <li key={key}>
                {formatPaymentLabel(key)}：¥{value}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* カード別（来月請求予定額） */}
      <div className="app-card">
        <h2>カード別（来月の請求予定額 ※今月利用分）</h2>
        {Object.keys(cardBillNextMonth).length === 0 ? (
          <p>今月のカード利用はありません。</p>
        ) : (
          <ul>
            {Object.entries(cardBillNextMonth).map(([key, value]) => (
              <li key={key}>
                {formatPaymentLabel(key)}：¥{value}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* カード別 月別グラフ */}
      <div
        className="app-card"
        style={{ maxWidth: "640px", backgroundColor: "#fbf7eb" }}
      >
        <h2>カード別 月別グラフ</h2>
        {hasCardData ? (
          <Bar data={chartData} options={chartOptions} />
        ) : (
          <p>カードのデータがまだないので、グラフは表示できません。</p>
        )}
      </div>

      <div style={{ marginTop: "24px", fontSize: "14px" }}>
        <Link href="/">▶ ホームに戻る</Link>
        {" / "}
        <Link href="/history">▶ 今月の明細一覧を見る</Link>
      </div>
    </div>
  );
}
