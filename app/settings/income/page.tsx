// app/settings/income/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type AccountType = "bank" | "wallet" | "qr" | "card";

type Account = {
  id: string;
  type: AccountType;
  name: string;
  closingDay?: number;
  paymentDay?: number;
};

type IncomeSettings = {
  monthlyIncome: number;
  payday: number; // 1-31
  startDate?: string; // YYYY-MM-DD
  depositAccountId?: string; // 給料の振込先口座
  lastAppliedDate?: string; // 給料を自動反映済みの最終日（Balances側で使用）
};

export default function IncomeSettingsPage() {
  const [monthlyIncome, setMonthlyIncome] = useState<string>("");
  const [payday, setPayday] = useState<string>("25");
  const [startDate, setStartDate] = useState<string>("");

  const [bankAccounts, setBankAccounts] = useState<Account[]>([]);
  const [depositAccountId, setDepositAccountId] = useState<string>("");

  // 初期読み込み
  useEffect(() => {
    if (typeof window === "undefined") return;

    // 口座一覧（銀行のみ）を読み込み
    try {
      const accountsRaw = localStorage.getItem("accounts");
      if (accountsRaw) {
        const accounts: Account[] = JSON.parse(accountsRaw);
        const banks = accounts.filter((a) => a.type === "bank");
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setBankAccounts(banks);
        // 銀行口座が1つだけならデフォルト選択
        if (banks.length === 1) {
          setDepositAccountId(banks[0].id);
        }
      }
    } catch (e) {
      console.error("accounts の読み込みに失敗しました", e);
    }

    // 収入設定を読み込み
    try {
      const raw = localStorage.getItem("incomeSettings");
      if (!raw) return;

      const parsed = JSON.parse(raw) as IncomeSettings;
      if (parsed.monthlyIncome) {
        setMonthlyIncome(String(parsed.monthlyIncome));
      }
      if (parsed.payday) {
        setPayday(String(parsed.payday));
      }
      if (parsed.startDate) {
        setStartDate(parsed.startDate);
      }
      if (parsed.depositAccountId) {
        setDepositAccountId(parsed.depositAccountId);
      }
    } catch (e) {
      console.error("incomeSettings の読み込みに失敗しました", e);
    }
  }, []);

  const handleSave = () => {
    if (typeof window === "undefined") return;

    const income = Number(monthlyIncome || 0);
    const paydayNum = Number(payday || 0);

    if (!income || income <= 0) {
      alert("月の固定収入（手取り）を入力してください。");
      return;
    }
    if (!paydayNum || paydayNum < 1 || paydayNum > 31) {
      alert("給料日は 1〜31 の間で入力してください。");
      return;
    }
    if (!depositAccountId) {
      alert("給料の振込先となる銀行口座を選択してください。");
      return;
    }

    const settings: IncomeSettings = {
      monthlyIncome: income,
      payday: paydayNum,
      startDate: startDate || undefined,
      depositAccountId,
      // 条件を変えたら、自動反映はゼロからやり直す想定でリセットしておく
      lastAppliedDate: undefined,
    };

    try {
      localStorage.setItem("incomeSettings", JSON.stringify(settings));
      alert("収入設定を保存しました。");
    } catch (e) {
      console.error("incomeSettings の保存に失敗しました", e);
      alert("保存に失敗しました…（コンソールを確認してみてください）");
    }
  };

  return (
    <div className="page-container">
      <h1>収入の設定</h1>
      <p style={{ marginBottom: 16 }}>
        毎月の給料額・給料日・振込先口座を登録します。
        <br />
        登録した内容は資産ページやシミュレーションに自動反映されます。
      </p>

      <div className="app-card" style={{ maxWidth: 480 }}>
        <div className="form-group">
          <label className="form-label">
            月の固定収入（円）
          </label>
          <input
            type="number"
            value={monthlyIncome}
            onChange={(e) => setMonthlyIncome(e.target.value)}
            className="form-input"
            placeholder="例：250000"
          />
        </div>

        <div className="form-group">
          <label className="form-label">
            給料日（1〜31）
          </label>
          <input
            type="number"
            min={1}
            max={31}
            value={payday}
            onChange={(e) => setPayday(e.target.value)}
            className="form-input"
          />
        </div>

        <div className="form-group">
          <label className="form-label">
            給料の開始日（最初にこの額が振り込まれる日）
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="form-input"
          />
          <p style={{ fontSize: 12, color: "#666", marginTop: 4 }}>
            例）2025-12-25 を指定すると、その日以降の給料日からシミュレーションと資産に反映されます。
          </p>
        </div>

        <div className="form-group">
          <label className="form-label">
            給料の振込先口座
          </label>
          {bankAccounts.length === 0 ? (
            <p style={{ fontSize: 13, color: "#a33" }}>
              銀行口座がまだ登録されていません。
              <br />
              「設定 &gt; 残高設定（現金・口座・QR・カードなど）」で銀行口座を追加してください。
            </p>
          ) : (
            <select
              value={depositAccountId}
              onChange={(e) => setDepositAccountId(e.target.value)}
              className="form-select"
            >
              <option value="">口座を選択してください</option>
              {bankAccounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          )}
        </div>

        <div style={{ marginTop: 24 }}>
          <button
            type="button"
            onClick={handleSave}
            className="btn-primary"
            style={{ width: "100%" }}
          >
            保存する
          </button>
        </div>
      </div>

      <div style={{ marginTop: 16, fontSize: 14 }}>
        <Link href="/">◀ ホームに戻る</Link>
      </div>
    </div>
  );
}
