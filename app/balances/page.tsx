// app/balances/page.tsx
"use client";

import { useEffect, useState } from "react";
import ProtectedPage from "../components/ProtectedPage";

type TransactionType = "expense" | "income";

type Transaction = {
  id: string;
  date: string; // "YYYY-MM-DD"
  amount: number;
  type: TransactionType;
  category: string;
  payment: string; // 支払い方法（口座名 / 財布名 / QR名 / カード名 など）
  memo: string;
};

type AccountType = "bank" | "wallet" | "qr" | "card" | string;

type Account = {
  id: string;
  type: AccountType;
  name: string;
  // memo など他のフィールドがあっても無視されるようにゆるく定義
  [key: string]: any;
};

type IncomeSettings = {
  monthlyIncome: number;
  payday: number; // 1-31
  startDate?: string; // "YYYY-MM-DD"
  depositAccountId?: string | null; // どの口座に振り込まれるか（accounts.id）
};

// サブスク設定用（settings.subscriptions に保存されている想定）
type Subscription = {
  id: string;
  name: string;
  amount: number;
  billingDay: number; // 1-31
  // 口座 or カード。古いデータでは undefined かもしれないので optional
  paymentSourceType?: "account" | "card";
  paymentSourceId?: string | null; // accounts.id
};

type AppSettings = {
  subscriptions?: Subscription[];
  // 他にも loan / saving などあってもそのまま
  [key: string]: any;
};

// 日付を "YYYY-MM-DD" 形式にするユーティリティ
function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// その月の末日（28〜31）を取る
function getLastDayOfMonth(year: number, monthIndex0: number): number {
  // monthIndex0: 0-11
  return new Date(year, monthIndex0 + 1, 0).getDate();
}

/**
 * 収入設定に基づいて「今日までに発生しているはずの給与」を
 * transactions に自動追加する。
 */
function applyScheduledIncome(today: Date) {
  if (typeof window === "undefined") return;

  const incomeRaw = localStorage.getItem("incomeSettings");
  if (!incomeRaw) return;

  let incomeSettings: IncomeSettings;
  try {
    incomeSettings = JSON.parse(incomeRaw) as IncomeSettings;
  } catch {
    return;
  }

  const monthlyIncome = Number(incomeSettings.monthlyIncome) || 0;
  const payday = incomeSettings.payday;
  if (!monthlyIncome || !payday) return;

  // 口座一覧を取得して、depositAccountId → 口座名 に変換
  const accountsRaw = localStorage.getItem("accounts");
  let accounts: Account[] = [];
  if (accountsRaw) {
    try {
      accounts = JSON.parse(accountsRaw) as Account[];
    } catch {
      // 口座が読めなくても給与自体は登録しておく
    }
  }

  const depositAccount: Account | undefined =
    incomeSettings.depositAccountId
      ? accounts.find((a) => a.id === incomeSettings.depositAccountId) ?? undefined
      : undefined;

  const depositPaymentName = depositAccount?.name || "給与振込口座";

  // 既存の transactions を取得
  const txRaw = localStorage.getItem("transactions");
  let transactions: Transaction[] = txRaw ? JSON.parse(txRaw) : [];

  // 最後に自動反映した日付
  const lastAppliedRaw = localStorage.getItem("autoIncomeLastApplied");
  let fromDate: Date;

  if (lastAppliedRaw) {
    // 前回の翌日からスタート
    const d = new Date(lastAppliedRaw);
    if (!isNaN(d.getTime())) {
      fromDate = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
    } else {
      fromDate = today;
    }
  } else {
    // 初回は startDate から
    if (incomeSettings.startDate) {
      const s = new Date(incomeSettings.startDate);
      if (!isNaN(s.getTime())) {
        fromDate = new Date(s.getFullYear(), s.getMonth(), s.getDate());
      } else {
        fromDate = today;
      }
    } else {
      fromDate = today;
    }
  }

  // 今日より未来なら何もしない
  if (fromDate > today) {
    localStorage.setItem("autoIncomeLastApplied", formatDate(today));
    return;
  }

  // fromDate 〜 today まで日付を進めながら給与日をチェック
  const work = new Date(
    fromDate.getFullYear(),
    fromDate.getMonth(),
    fromDate.getDate()
  );
  const todayStr = formatDate(today);

  while (work <= today) {
    if (work.getDate() === payday) {
      const dateStr = formatDate(work);

      // 既に同日の自動給与があればスキップ
      const exists = transactions.some(
        (t) =>
          t.type === "income" &&
          t.date === dateStr &&
          t.category === "給与" &&
          t.memo?.includes("自動登録：給与")
      );

      if (!exists) {
        const newTx: Transaction = {
          id: `auto-income-${dateStr}-${Date.now()}`,
          date: dateStr,
          amount: monthlyIncome,
          type: "income",
          category: "給与",
          payment: depositPaymentName,
          memo: "自動登録：給与",
        };
        transactions.push(newTx);
      }
    }

    // 1日進める
    work.setDate(work.getDate() + 1);
  }

  // 反映
  localStorage.setItem("transactions", JSON.stringify(transactions));
  localStorage.setItem("autoIncomeLastApplied", todayStr);
}

/**
 * サブスク設定に基づいて「今日までに発生しているはずのサブスク」を
 * transactions に自動追加する。
 */
function applyScheduledSubscriptions(today: Date) {
  if (typeof window === "undefined") return;

  const settingsRaw = localStorage.getItem("settings");
  if (!settingsRaw) return;

  let settings: AppSettings;
  try {
    settings = JSON.parse(settingsRaw) as AppSettings;
  } catch {
    return;
  }

  const subs = settings.subscriptions ?? [];
  if (subs.length === 0) return;

  // 口座・カード一覧
  const accountsRaw = localStorage.getItem("accounts");
  let accounts: Account[] = [];
  if (accountsRaw) {
    try {
      accounts = JSON.parse(accountsRaw) as Account[];
    } catch {
      // 読めなくても「payment に名前だけ入れる」ので最低限は動く
    }
  }

  // 既存の transactions を取得
  const txRaw = localStorage.getItem("transactions");
  let transactions: Transaction[] = txRaw ? JSON.parse(txRaw) : [];

  const lastAppliedRaw = localStorage.getItem("autoSubLastApplied");
  let fromDate: Date;

  if (lastAppliedRaw) {
    // 前回の翌日からスタート
    const d = new Date(lastAppliedRaw);
    if (!isNaN(d.getTime())) {
      fromDate = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
    } else {
      fromDate = today;
    }
  } else {
    // 初回は「今日」からで OK（過去分をさかのぼって入れない仕様）
    fromDate = today;
  }

  if (fromDate > today) {
    localStorage.setItem("autoSubLastApplied", formatDate(today));
    return;
  }

  const work = new Date(
    fromDate.getFullYear(),
    fromDate.getMonth(),
    fromDate.getDate()
  );
  const todayStr = formatDate(today);

  while (work <= today) {
    const year = work.getFullYear();
    const monthIdx = work.getMonth(); // 0-11
    const currentDay = work.getDate();
    const lastDay = getLastDayOfMonth(year, monthIdx);

    subs.forEach((sub) => {
      if (!sub.amount || !sub.billingDay) return;

      const billDay = Math.min(sub.billingDay, lastDay);
      if (currentDay !== billDay) return;

      const dateStr = formatDate(work);

      // すでに同じ日付＋サブスク名の自動登録があればスキップ
      const exists = transactions.some(
        (t) =>
          t.type === "expense" &&
          t.date === dateStr &&
          t.category === "サブスク" &&
          t.memo?.includes("自動登録：サブスク") &&
          t.memo?.includes(sub.name)
      );
      if (exists) return;

      // 支払い元の名前を決める
      let paymentName = "サブスク引き落とし";
      if (sub.paymentSourceId) {
        const acc = accounts.find((a) => a.id === sub.paymentSourceId);
        if (acc) {
          paymentName = acc.name;
        }
      }

      const newTx: Transaction = {
        id: `auto-sub-${sub.id}-${dateStr}-${Date.now()}`,
        date: dateStr,
        amount: sub.amount,
        type: "expense",
        category: "サブスク",
        payment: paymentName,
        memo: `自動登録：サブスク（${sub.name}）`,
      };
      transactions.push(newTx);
    });

    work.setDate(work.getDate() + 1);
  }

  localStorage.setItem("transactions", JSON.stringify(transactions));
  localStorage.setItem("autoSubLastApplied", todayStr);
}

// ================== 中身用コンポーネント ==================
function BalancesContent() {
  const [bankRows, setBankRows] = useState<
    { id: string; name: string; balance: number }[]
  >([]);
  const [walletRows, setWalletRows] = useState<
    { id: string; name: string; balance: number }[]
  >([]);
  const [qrRows, setQrRows] = useState<
    { id: string; name: string; balance: number }[]
  >([]);
  const [totalBalance, setTotalBalance] = useState<number>(0);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const today = new Date();

    // ① まず、今日までの給与 & サブスクを transactions に自動反映
    applyScheduledIncome(today);
    applyScheduledSubscriptions(today);

    // ② 口座情報を取得
    const accountsRaw = localStorage.getItem("accounts");
    let accounts: Account[] = [];
    if (accountsRaw) {
      try {
        accounts = JSON.parse(accountsRaw) as Account[];
      } catch (e) {
        console.error("accounts の読み込みに失敗しました", e);
      }
    }

    // ③ transactions を取得（今日までの分だけを見る）
    const txRaw = localStorage.getItem("transactions");
    const transactions: Transaction[] = txRaw ? JSON.parse(txRaw) : [];
    const todayStr = formatDate(today);

    // ④ 口座ごとの残高マップを初期化
    const balanceMap = new Map<string, number>(); // key: account.id

    accounts.forEach((a) => {
      if (a.type === "bank" || a.type === "wallet" || a.type === "qr") {
        balanceMap.set(a.id, 0);
      }
    });

    // ⑤ トランザクションを適用して残高を計算
    for (const t of transactions) {
      if (!t.date) continue;
      if (t.date > todayStr) continue; // 未来分はまだ反映しない

      // payment（名前）から口座を探す
      const acc = accounts.find(
        (a) =>
          (a.type === "bank" || a.type === "wallet" || a.type === "qr") &&
          a.name === t.payment
      );
      if (!acc) continue;

      const prev = balanceMap.get(acc.id) ?? 0;
      if (t.type === "income") {
        balanceMap.set(acc.id, prev + t.amount);
      } else if (t.type === "expense") {
        balanceMap.set(acc.id, prev - t.amount);
      }
    }

    // ⑥ 表示用の配列に整形
    const bankList: { id: string; name: string; balance: number }[] = [];
    const walletList: { id: string; name: string; balance: number }[] = [];
    const qrList: { id: string; name: string; balance: number }[] = [];

    balanceMap.forEach((bal, id) => {
      const acc = accounts.find((a) => a.id === id);
      if (!acc) return;

      const row = {
        id,
        name: acc.name,
        balance: bal,
      };

      if (acc.type === "bank") bankList.push(row);
      if (acc.type === "wallet") walletList.push(row);
      if (acc.type === "qr") qrList.push(row);
    });

    // 名前順で並べておく
    bankList.sort((a, b) => a.name.localeCompare(b.name, "ja"));
    walletList.sort((a, b) => a.name.localeCompare(b.name, "ja"));
    qrList.sort((a, b) => a.name.localeCompare(b.name, "ja"));

    setBankRows(bankList);
    setWalletRows(walletList);
    setQrRows(qrList);

    const total =
      bankList.reduce((s, r) => s + r.balance, 0) +
      walletList.reduce((s, r) => s + r.balance, 0) +
      qrList.reduce((s, r) => s + r.balance, 0);
    setTotalBalance(total);
  }, []);

  return (
    <div className="page-container">
      <h1>口座・残高一覧</h1>
      <p style={{ marginBottom: 16, fontSize: 14 }}>
        銀行口座・財布・QR残高の合計を確認できるページです。
        <br />
        給料日とサブスクの引き落としは、自動で明細に登録され、ここに反映されます。
      </p>

      {/* 合計残高 */}
      <div className="app-card" style={{ marginBottom: 16 }}>
        <h2>合計残高</h2>
        <p style={{ marginTop: 4 }}>
          合計：<strong>¥{totalBalance.toLocaleString()}</strong>
        </p>
      </div>

      {/* 銀行口座 */}
      <div className="app-card" style={{ marginBottom: 16 }}>
        <h2>【銀行口座】</h2>
        {bankRows.length === 0 ? (
          <p>銀行口座が登録されていません。</p>
        ) : (
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: 14,
            }}
          >
            <thead>
              <tr>
                <th style={{ textAlign: "left", padding: "4px 6px" }}>名称</th>
                <th style={{ textAlign: "right", padding: "4px 6px" }}>
                  残高（円）
                </th>
              </tr>
            </thead>
            <tbody>
              {bankRows.map((r) => (
                <tr key={r.id}>
                  <td style={{ padding: "4px 6px" }}>{r.name}</td>
                  <td style={{ padding: "4px 6px", textAlign: "right" }}>
                    ¥{r.balance.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* 財布 */}
      <div className="app-card" style={{ marginBottom: 16 }}>
        <h2>【財布】</h2>
        {walletRows.length === 0 ? (
          <p>財布が登録されていません。</p>
        ) : (
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: 14,
            }}
          >
            <thead>
              <tr>
                <th style={{ textAlign: "left", padding: "4px 6px" }}>名称</th>
                <th style={{ textAlign: "right", padding: "4px 6px" }}>
                  残高（円）
                </th>
              </tr>
            </thead>
            <tbody>
              {walletRows.map((r) => (
                <tr key={r.id}>
                  <td style={{ padding: "4px 6px" }}>{r.name}</td>
                  <td style={{ padding: "4px 6px", textAlign: "right" }}>
                    ¥{r.balance.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* QR */}
      <div className="app-card" style={{ marginBottom: 16 }}>
        <h2>【QR】</h2>
        {qrRows.length === 0 ? (
          <p>QR残高が登録されていません。</p>
        ) : (
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: 14,
            }}
          >
            <thead>
              <tr>
                <th style={{ textAlign: "left", padding: "4px 6px" }}>名称</th>
                <th style={{ textAlign: "right", padding: "4px 6px" }}>
                  残高（円）
                </th>
              </tr>
            </thead>
            <tbody>
              {qrRows.map((r) => (
                <tr key={r.id}>
                  <td style={{ padding: "4px 6px" }}>{r.name}</td>
                  <td style={{ padding: "4px 6px", textAlign: "right" }}>
                    ¥{r.balance.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div style={{ marginTop: 16, fontSize: 14 }}>
        <a href="/">◀ ホームに戻る</a>
      </div>
    </div>
  );
}

// ================== export ==================
export default function BalancesPage() {
  return (
    <ProtectedPage>
      <BalancesContent />
    </ProtectedPage>
  );
}