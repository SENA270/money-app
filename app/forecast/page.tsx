// app/forecast/page.tsx
"use client";

import { useEffect, useState } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

// ---------- 型定義 ----------

type LoanFrequency = "monthly" | "half-year" | "yearly";

type Loan = {
  id: string;
  name: string;
  amountPerPayment: number;
  startDate: string; // "YYYY-MM-DD"
  paymentDay: number; // 1-31
  frequency: LoanFrequency;
  numberOfPayments: number;
  memo?: string;
};

type AccountType = "bank" | "wallet" | "qr" | "card";

type Account = {
  id: string;
  name: string;
  type: AccountType;
  balance?: number;
  memo?: string;
  // クレカ用設定
  paymentKey?: string; // transactions.payment と紐付けるキー
  closingDay?: number; // 締め日
  paymentDay?: number; // 支払日（翌月／翌々月）
};

type Subscription = {
  id: string;
  name: string;
  amount: number;
  paymentDay: number;
  startDate?: string;
  memo?: string;
};

type Settings = {
  loans?: Loan[];
  accounts?: Account[]; // 旧フォーマット互換
  subscriptions?: Subscription[];
};

type TransactionType = "expense" | "income";

type Transaction = {
  id: string;
  date: string; // "2025-11-21" など
  amount: number;
  type: TransactionType;
  category: string;
  payment: string; // "cardSezon" など
  memo: string;
};

type IncomeSettings = {
  monthlyIncome: number;
  payday: number;
  startDate?: string;
};

type SimEvent = {
  date: Date;
  label: string;
  amount: number; // +収入 / -支出
};

type SimRow = {
  dateStr: string;
  label: string;
  amount: number;
  balanceAfter: number;
};

// 請求一覧用
type BillItem = {
  id: string;
  date: string; // "2025-12-04"
  label: string; // カード名 or ローン名 or サブスク名
  amount: number;
};

type PaidBillsMap = {
  [billId: string]: boolean;
};

// ---------- Utility functions ----------

// n ヶ月後（末日ずれ対策あり）
function addMonths(base: Date, months: number): Date {
  const d = new Date(base.getTime());
  const day = d.getDate();
  d.setMonth(d.getMonth() + months);
  if (d.getDate() < day) {
    // 30日→31日のない月などは月末に丸める
    d.setDate(0);
  }
  return d;
}

// 存在しない日（2/31 など）は月末に丸める
function safeDate(year: number, monthZeroBased: number, day: number): Date {
  const d = new Date(year, monthZeroBased, day);
  if (d.getMonth() !== monthZeroBased) {
    return new Date(year, monthZeroBased + 1, 0);
  }
  return d;
}

function formatDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(d.getDate()).padStart(2, "0")}`;
}

function toYmd(d: Date): string {
  return formatDate(d);
}

function inRange(d: Date, from: Date, to: Date): boolean {
  return d.getTime() >= from.getTime() && d.getTime() <= to.getTime();
}

// --------------------------------------------------
// 中身コンポーネント
// --------------------------------------------------
function ForecastContent() {
  // シミュレーション
  const [rows, setRows] = useState<SimRow[]>([]);
  const [startBalance, setStartBalance] = useState(0);
  const [periodText, setPeriodText] = useState("");

  // 今月〜来月の請求一覧
  const [bills, setBills] = useState<BillItem[]>([]);
  const [paidBills, setPaidBills] = useState<PaidBillsMap>({});

  // ─────────────────────
  // 1) 入金状況の読み込み
  // ─────────────────────
  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = localStorage.getItem("paidBills");
    if (!raw) return;
    try {
      setPaidBills(JSON.parse(raw) as PaidBillsMap);
    } catch (e) {
      console.error("paidBills の読み込みに失敗しました", e);
    }
  }, []);

  // ─────────────────────
  // 2) 6ヶ月資金繰りシミュレーション
  // ─────────────────────
  useEffect(() => {
    if (typeof window === "undefined") return;

    // シミュレーション期間（今日〜6ヶ月後）
    const today = new Date();
    const start = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );
    const end = addMonths(start, 6);
    setPeriodText(`${formatDate(start)} ～ ${formatDate(end)}`);

    // 保存データ読み込み
    const settingsRaw = localStorage.getItem("settings");
    const settings: Settings = settingsRaw ? JSON.parse(settingsRaw) : {};
    const loans: Loan[] = settings.loans ?? [];

    // accounts は新フォーマット優先
    const accountsRaw = localStorage.getItem("accounts");
    const accounts: Account[] = accountsRaw
      ? JSON.parse(accountsRaw)
      : settings.accounts ?? [];

    const txRaw = localStorage.getItem("transactions");
    const transactions: Transaction[] = txRaw ? JSON.parse(txRaw) : [];

    const incomeRaw = localStorage.getItem("incomeSettings");
    const incomeSettings: IncomeSettings | null = incomeRaw
      ? JSON.parse(incomeRaw)
      : null;

    // 口座情報の整理
    const cashAccounts = accounts.filter(
      (a) => a.type === "bank" || a.type === "wallet" || a.type === "qr"
    );

    const cardAccounts = accounts.filter(
      (a) => a.type === "card" && a.paymentDay && a.closingDay
    );

    // スタート残高計算（/balances と同じ考え方）
    const todayStr = formatDate(start);
    const balanceMap = new Map<string, number>();
    cashAccounts.forEach((a) => balanceMap.set(a.id, 0));

    for (const t of transactions) {
      if (t.date > todayStr) continue; // 今日より未来は無視

      const acc = cashAccounts.find((a) => a.name === t.payment);
      if (!acc) continue;

      const prev = balanceMap.get(acc.id) ?? 0;
      if (t.type === "income") {
        balanceMap.set(acc.id, prev + Math.abs(t.amount));
      } else {
        balanceMap.set(acc.id, prev - Math.abs(t.amount));
      }
    }

    let balanceNow = 0;
    balanceMap.forEach((v) => (balanceNow += v));
    setStartBalance(balanceNow);

    const events: SimEvent[] = [];

    // 1) ローン返済
    for (const loan of loans) {
      const amount = Number(loan.amountPerPayment);
      if (!amount) continue;

      const startDateObj = new Date(loan.startDate);
      if (Number.isNaN(startDateObj.getTime())) continue;

      let current = safeDate(
        startDateObj.getFullYear(),
        startDateObj.getMonth(),
        loan.paymentDay
      );

      let count = 0;
      while (count < loan.numberOfPayments) {
        if (current > end) break;

        if (current >= start) {
          events.push({
            date: new Date(current),
            label: `返済：${loan.name}`,
            amount: -Math.abs(amount),
          });
        }

        if (loan.frequency === "monthly") current = addMonths(current, 1);
        else if (loan.frequency === "half-year") current = addMonths(current, 6);
        else current = addMonths(current, 12);

        count++;
      }
    }

    // 2) クレカ請求
    type BillKey = string;
    const cardBills = new Map<
      BillKey,
      { date: Date; amount: number; label: string }
    >();

    // 支払い方法文字列 → カードアカウント のマップ
    const paymentToCard = new Map<string, Account>();

    for (const card of cardAccounts) {
      const nameKey = card.name?.trim();
      const payKey = card.paymentKey?.trim();

      if (nameKey) paymentToCard.set(nameKey, card);
      if (payKey) paymentToCard.set(payKey, card);
    }

    for (const t of transactions) {
      if (t.type !== "expense") continue;

      const paymentKey = t.payment?.trim();
      if (!paymentKey) continue;

      const card = paymentToCard.get(paymentKey);
      if (!card) continue; // クレカ以外の支払い

      const closing = card.closingDay ?? 25;
      const payday = card.paymentDay ?? 1;

      const d = new Date(t.date);
      if (Number.isNaN(d.getTime())) continue;

      let billYear = d.getFullYear();
      let billMonth = d.getMonth(); // 0-11

      // 締め日まで → 翌月払い、それ以降 → 翌々月払い
      if (d.getDate() <= closing) billMonth += 1;
      else billMonth += 2;

      if (billMonth >= 12) {
        billYear += Math.floor(billMonth / 12);
        billMonth = billMonth % 12;
      }

      const billDate = safeDate(billYear, billMonth, payday);

      // シミュレーション対象期間外は無視
      if (billDate < start || billDate > end) continue;

      const key: BillKey = `${card.id}-${billYear}-${billMonth}`;
      const existing = cardBills.get(key);

      if (existing) {
        existing.amount += t.amount;
      } else {
        cardBills.set(key, {
          date: billDate,
          label: `クレカ請求：${card.name}`,
          amount: t.amount,
        });
      }
    }

    for (const bill of cardBills.values()) {
      events.push({
        date: bill.date,
        label: bill.label,
        amount: -Math.abs(bill.amount),
      });
    }

    // 3) 給与（定期収入）
    if (incomeSettings && incomeSettings.monthlyIncome > 0) {
      const incomeAmount = incomeSettings.monthlyIncome;
      const payday = incomeSettings.payday ?? 25;

      let firstDate: Date;
      if (incomeSettings.startDate) {
        const s = new Date(incomeSettings.startDate);
        if (!Number.isNaN(s.getTime())) {
          firstDate = safeDate(s.getFullYear(), s.getMonth(), payday);
        } else {
          firstDate = safeDate(start.getFullYear(), start.getMonth(), payday);
        }
      } else {
        firstDate = safeDate(start.getFullYear(), start.getMonth(), payday);
      }

      while (firstDate < start) {
        firstDate = addMonths(firstDate, 1);
      }

      let cur = firstDate;
      while (cur <= end) {
        events.push({
          date: new Date(cur),
          label: "給与",
          amount: Math.abs(incomeAmount),
        });
        cur = addMonths(cur, 1);
      }
    }

    // 4) イベントを日付順ソートして残高計算
    events.sort((a, b) => a.date.getTime() - b.date.getTime());

    let bal = balanceNow;
    const simRows: SimRow[] = events.map((e) => {
      bal += e.amount;
      return {
        dateStr: formatDate(e.date),
        label: e.label,
        amount: e.amount,
        balanceAfter: bal,
      };
    });

    setRows(simRows);
  }, []);

  // ─────────────────────
  // 3) 今月〜来月の請求一覧
  // ─────────────────────
  useEffect(() => {
    if (typeof window === "undefined") return;

    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), 1); // 今月1日
    const end = new Date(today.getFullYear(), today.getMonth() + 2, 0); // 来月末

    const billItems: BillItem[] = [];

    try {
      const txRaw = localStorage.getItem("transactions");
      const accRaw = localStorage.getItem("accounts");
      const rawSettings = localStorage.getItem("settings");

      const txs: Transaction[] = txRaw ? JSON.parse(txRaw) : [];
      const accounts: Account[] = accRaw ? JSON.parse(accRaw) : [];
      const settings: Settings = rawSettings ? JSON.parse(rawSettings) : {};

      const cardAccounts = accounts.filter((a) => a.type === "card");

      // 1. クレカ請求
      cardAccounts.forEach((card) => {
        if (card.closingDay == null || card.paymentDay == null) {
          return;
        }

        const matchKey = card.paymentKey || card.name;
        const perBillingMonth: { [key: string]: number } = {};

        txs.forEach((t) => {
          if (t.type !== "expense") return;
          if (t.payment !== matchKey) return;
          if (!t.date) return;

          const useDate = new Date(t.date);

          const year = useDate.getFullYear();
          const day = useDate.getDate();
          const closing = card.closingDay ?? 0;
          const payDay = card.paymentDay ?? 1;

          // 基本は「利用月の翌月」、締め日より後なら「翌々月」
          let billingMonthIndex = useDate.getMonth() + 1; // 翌月
          if (day > closing) {
            billingMonthIndex += 1; // 翌々月
          }

          const billingBase = new Date(year, billingMonthIndex, payDay);
          const billingDateStr = toYmd(billingBase);

          if (!perBillingMonth[billingDateStr]) {
            perBillingMonth[billingDateStr] = 0;
          }
          perBillingMonth[billingDateStr] += t.amount;
        });

        Object.entries(perBillingMonth).forEach(([dateStr, amount]) => {
          const d = new Date(dateStr);
          if (!inRange(d, start, end)) return;
          if (amount === 0) return;

          billItems.push({
            id: `card:${card.id}:${dateStr}`,
            date: dateStr,
            label: card.name,
            amount,
          });
        });
      });

      // 2. 返済（loans）
      const loansFromSettings: Loan[] = settings.loans ?? [];

      const rawLoans = localStorage.getItem("loans");
      const loansExtra: Loan[] = rawLoans ? JSON.parse(rawLoans) : [];

      const loans: Loan[] = [
        ...loansFromSettings,
        ...loansExtra.filter(
          (extra) => !loansFromSettings.some((l) => l.id === extra.id)
        ),
      ];

      loans.forEach((loan) => {
        if (!loan.startDate || !loan.amountPerPayment) return;

        let payDate = new Date(loan.startDate);
        let count = 0;

        let stepMonths = 1;
        if (loan.frequency === "half-year") stepMonths = 6;
        else if (loan.frequency === "yearly") stepMonths = 12;

        while (count < loan.numberOfPayments && payDate <= end) {
          if (inRange(payDate, start, end)) {
            const dateStr = toYmd(payDate);
            billItems.push({
              id: `loan:${loan.id}:${dateStr}`,
              date: dateStr,
              label: loan.name,
              amount: loan.amountPerPayment,
            });
          }

          payDate = new Date(
            payDate.getFullYear(),
            payDate.getMonth() + stepMonths,
            loan.paymentDay
          );
          count++;
        }
      });

      // 3. サブスク
      const subs: Subscription[] = settings.subscriptions ?? [];

      subs.forEach((sub) => {
        if (!sub.amount || !sub.paymentDay) return;

        const firstBase = sub.startDate ? new Date(sub.startDate) : start;

        let payDate = new Date(
          firstBase.getFullYear(),
          firstBase.getMonth(),
          sub.paymentDay
        );

        while (payDate < start) {
          payDate = new Date(
            payDate.getFullYear(),
            payDate.getMonth() + 1,
            sub.paymentDay
          );
        }

        while (payDate <= end) {
          const dateStr = toYmd(payDate);
          billItems.push({
            id: `sub:${sub.id}:${dateStr}`,
            date: dateStr,
            label: sub.name,
            amount: sub.amount,
          });

          payDate = new Date(
            payDate.getFullYear(),
            payDate.getMonth() + 1,
            sub.paymentDay
          );
        }
      });
    } catch (e) {
      console.error("請求一覧の計算に失敗しました", e);
    }

    billItems.sort((a, b) => {
      const da = new Date(a.date).getTime();
      const db = new Date(b.date).getTime();
      return da - db;
    });

    setBills(billItems);
  }, []);

  // 入金状況トグル
  const togglePaid = (billId: string) => {
    setPaidBills((prev) => {
      const next: PaidBillsMap = {
        ...prev,
        [billId]: !prev[billId],
      };
      if (typeof window !== "undefined") {
        localStorage.setItem("paidBills", JSON.stringify(next));
      }
      return next;
    });
  };

  // グラフ用データ作成
  const chartData = {
    labels: rows.map((r) => r.dateStr.slice(5)), // "MM-DD" style
    datasets: [
      {
        label: "残高推移",
        data: rows.map((r) => r.balanceAfter),
        borderColor: "#b58b5a",
        backgroundColor: "rgba(181, 139, 90, 0.2)",
        tension: 0.2,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
    },
    scales: {
      y: {
        beginAtZero: false,
      },
    },
  };

  return (
    <div className="page-container">
      <h1>資金繰りシミュレーション（6ヶ月）</h1>
      <p style={{ marginBottom: 16 }}>
        今日時点の残高と「返済」「クレカ請求」「給与」をもとに
        これから6ヶ月の資金推移をシミュレートします。
      </p>
      <p style={{ fontSize: "14px", marginBottom: 24 }}>
        期間：{periodText} ／ スタート残高：
        <strong>¥{startBalance.toLocaleString()}</strong>
      </p>

      {/* グラフ (スマホでは少し高さを確保) */}
      <div className="app-card" style={{ height: "300px", marginBottom: 24 }}>
        <h2>残高推移グラフ</h2>
        <div style={{ position: "relative", width: "100%", height: "100%", maxHeight: "240px" }}>
          {rows.length > 0 ? (
            <Line data={chartData} options={chartOptions} />
          ) : (
            <p>データがありません</p>
          )}
        </div>
      </div>

      {/* 6ヶ月シミュレーション結果 */}
      <div className="app-card" style={{ marginBottom: 24 }}>
        <h2>シミュレーション結果</h2>

        {rows.length === 0 ? (
          <p>データがありません。</p>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="table-wrapper desktop-table-view">
              <table className="table-basic" style={{ minWidth: "500px" }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: "left" }}>日付</th>
                    <th style={{ textAlign: "left" }}>内容</th>
                    <th style={{ textAlign: "right" }}>金額</th>
                    <th style={{ textAlign: "right" }}>残高</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => {
                    const neg = r.balanceAfter < 0;
                    return (
                      <tr
                        key={i}
                        style={{
                          backgroundColor: neg ? "#fbe3e3" : "inherit",
                        }}
                      >
                        <td>{r.dateStr}</td>
                        <td>{r.label}</td>
                        <td style={{ textAlign: "right" }}>
                          {r.amount < 0 ? "-" : "+"}
                          ¥{Math.abs(r.amount).toLocaleString()}
                        </td>
                        <td
                          style={{
                            textAlign: "right",
                            fontWeight: neg ? "bold" : "normal",
                            color: neg ? "#b3261e" : "inherit",
                          }}
                        >
                          ¥{r.balanceAfter.toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="mobile-card-view">
              {rows.map((r, i) => {
                const neg = r.balanceAfter < 0;
                return (
                  <div
                    key={i}
                    className="list-card-item"
                    style={{
                      backgroundColor: neg ? "#fff5f5" : "#fff",
                      borderColor: neg ? "#ffcdd2" : "#eee8dc"
                    }}
                  >
                    <div className="list-card-row">
                      <span className="list-card-label">{r.dateStr}</span>
                      <span
                        className="list-card-value"
                        style={{ fontSize: "14px", color: neg ? "#b3261e" : "#5d4330" }}
                      >
                        {r.label}
                      </span>
                    </div>
                    <div className="list-card-row">
                      <span className="list-card-label">金額</span>
                      <span className="list-card-value">
                        {r.amount < 0 ? "-" : "+"}
                        ¥{Math.abs(r.amount).toLocaleString()}
                      </span>
                    </div>
                    <div className="list-card-row" style={{ marginTop: "4px", paddingTop: "4px", borderTop: "1px dashed #eee" }}>
                      <span className="list-card-label">残高</span>
                      <span
                        className="list-card-value"
                        style={{ fontWeight: "bold", color: neg ? "#b3261e" : "#3b2a1a" }}
                      >
                        ¥{r.balanceAfter.toLocaleString()}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* 今月〜来月の請求一覧 */}
      <div className="app-card">
        <h2>今月〜来月の請求予定一覧</h2>
        <p style={{ marginBottom: 12, fontSize: 13, color: "#5b4b3a" }}>
          カード利用分と「返済」「サブスク」から計算した
          <strong>今月と来月の引き落とし予定</strong>をまとめて表示しています。
        </p>

        {bills.length === 0 ? (
          <p>対象期間の請求データがありません。</p>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="table-wrapper desktop-table-view">
              <table className="table-basic" style={{ minWidth: "500px" }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: "left" }}>引き落とし日</th>
                    <th style={{ textAlign: "left" }}>項目</th>
                    <th style={{ textAlign: "right" }}>金額</th>
                    <th style={{ textAlign: "center" }}>入金状況</th>
                  </tr>
                </thead>
                <tbody>
                  {bills.map((bill) => {
                    const isPaid = paidBills[bill.id] ?? false;
                    return (
                      <tr key={bill.id}>
                        <td>{bill.date}</td>
                        <td>{bill.label}</td>
                        <td style={{ textAlign: "right" }}>
                          ¥{bill.amount.toLocaleString()}
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <button
                            type="button"
                            onClick={() => togglePaid(bill.id)}
                            className={`btn-secondary`}
                            style={{
                              fontSize: "12px",
                              padding: "4px 10px",
                              minHeight: "auto",
                              backgroundColor: isPaid ? "#edf7ec" : "#fff5f3",
                              color: isPaid ? "#2f7d32" : "#c44536",
                              borderColor: isPaid ? "#4f8f3a" : "#c44536"
                            }}
                          >
                            {isPaid ? "入金済み" : "未入金"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="mobile-card-view">
              {bills.map((bill) => {
                const isPaid = paidBills[bill.id] ?? false;
                return (
                  <div key={bill.id} className="list-card-item">
                    <div className="list-card-row">
                      <span className="list-card-label">{bill.date}</span>
                      <button
                        type="button"
                        onClick={() => togglePaid(bill.id)}
                        className={`btn-secondary`}
                        style={{
                          fontSize: "11px",
                          padding: "2px 8px",
                          minHeight: "24px",
                          backgroundColor: isPaid ? "#edf7ec" : "#fff5f3",
                          color: isPaid ? "#2f7d32" : "#c44536",
                          borderColor: isPaid ? "#4f8f3a" : "#c44536"
                        }}
                      >
                        {isPaid ? "入金済み" : "未入金"}
                      </button>
                    </div>
                    <div className="list-card-row">
                      <span className="list-card-value" style={{ fontSize: "15px" }}>
                        {bill.label}
                      </span>
                    </div>
                    <div className="list-card-row">
                      <span className="list-card-label">金額</span>
                      <span className="list-card-value">¥{bill.amount.toLocaleString()}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      <div style={{ marginTop: "24px" }}>
        <a href="/">← ホームに戻る</a>
      </div>
    </div>
  );
}

export default function ForecastPage() {
  return <ForecastContent />;
}
