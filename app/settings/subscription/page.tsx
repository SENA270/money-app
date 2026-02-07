// app/settings/subscription/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type AccountType = "bank" | "wallet" | "qr" | "card";

type Account = {
  id: string;
  name: string;
  type: AccountType;
};

type Subscription = {
  id: string;
  name: string;
  amount: number;
  frequency: "monthly" | "yearly";
  nextPaymentDate: string; // YYYY-MM-DD
  paymentSourceType: "account" | "card";
  paymentSourceId: string;
};

type AppSettings = {
  subscriptions?: Subscription[];
};

function createEmptySubscription(): Subscription {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return {
    id: `sub-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: "",
    amount: 0,
    frequency: "monthly",
    nextPaymentDate: `${y}-${m}-${day}`,
    paymentSourceType: "account",
    paymentSourceId: "",
  };
}

export default function SubscriptionSettingsPage() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);

  // 初期読み込み
  useEffect(() => {
    if (typeof window === "undefined") return;

    // 1) 口座・カード
    const accountsRaw = localStorage.getItem("accounts");
    if (accountsRaw) {
      try {
        const parsed = JSON.parse(accountsRaw) as Account[];
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setAccounts(parsed);
      } catch (e) {
        console.error("accounts read error", e);
      }
    }

    // 2) サブスク設定
    const settingsRaw = localStorage.getItem("settings");
    if (settingsRaw) {
      try {
        const parsed = JSON.parse(settingsRaw) as AppSettings;
        const list = parsed.subscriptions ?? [];
        // Migration check: if data has billingDay but no nextPaymentDate
        const migrated = list.map((s: Record<string, unknown>) => {
          if (s.nextPaymentDate) return s as unknown as Subscription;
          // Migrate legacy
          const d = new Date();
          const day = Number(s.billingDay || s.paymentDay || 1);
          const m = d.getDate() > day ? d.getMonth() + 2 : d.getMonth() + 1; // next month if passed
          const y = d.getFullYear();
          const nd = new Date(y, m - 1, day);
          const yyyy = nd.getFullYear();
          const mm = String(nd.getMonth() + 1).padStart(2, "0");
          const dd = String(nd.getDate()).padStart(2, "0");

          return {
            ...s,
            frequency: s.frequency || "monthly",
            nextPaymentDate: `${yyyy}-${mm}-${dd}`
          } as Subscription;
        });

        if (migrated.length > 0) {
          setSubscriptions(migrated);
        } else {
          setSubscriptions([createEmptySubscription()]);
        }
      } catch (e) {
        console.error("subscriptions read error", e);
        setSubscriptions([createEmptySubscription()]);
      }
    } else {
      setSubscriptions([createEmptySubscription()]);
    }
  }, []);

  const accountOptions = accounts.filter(
    (a) => a.type === "bank" || a.type === "wallet" || a.type === "qr"
  );
  const cardOptions = accounts.filter((a) => a.type === "card");

  const handleChange =
    (id: string, field: keyof Subscription) =>
      (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        let value: string | number = e.target.value;

        if (field === "amount") {
          value = Number(value || 0);
        }

        setSubscriptions((prev) =>
          prev.map((s) => {
            if (s.id !== id) return s;
            const updated: Subscription = { ...s, [field]: value };
            if (field === "paymentSourceType") updated.paymentSourceId = "";
            return updated;
          })
        );
      };

  const handleAddRow = () => setSubscriptions((prev) => [...prev, createEmptySubscription()]);

  const handleRemoveRow = (id: string) => {
    setSubscriptions((prev) => {
      const after = prev.filter((s) => s.id !== id);
      return after.length === 0 ? [createEmptySubscription()] : after;
    });
  };

  const handleSave = () => {
    const cleaned = subscriptions.filter(s => s.name.trim() !== "" || s.amount !== 0);
    try {
      const settingsRaw = localStorage.getItem("settings");
      const settings: AppSettings = settingsRaw ? JSON.parse(settingsRaw) : {};
      const newSettings: AppSettings = { ...settings, subscriptions: cleaned };
      localStorage.setItem("settings", JSON.stringify(newSettings));
      alert("サブスク設定を保存しました！");
    } catch {
      alert("保存に失敗しました");
    }
  };

  return (
    <div className="page-container">
      <h1>サブスク・固定費設定</h1>
      <p style={{ marginBottom: 16, fontSize: 14 }}>
        毎月または毎年の固定費を登録します。
        <br />
        次回支払日を設定すると、資金繰り予測に反映されます。
      </p>

      <div className="app-card">
        {subscriptions.length === 0 ? (
          <p>まだ登録されていません。</p>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="table-wrapper desktop-table-view">
              <table className="table-basic" style={{ minWidth: "900px" }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: "left", padding: "4px 6px" }}>名称</th>
                    <th style={{ textAlign: "right", padding: "4px 6px" }}>金額(円)</th>
                    <th style={{ textAlign: "center", padding: "4px 6px", width: "100px" }}>頻度</th>
                    <th style={{ textAlign: "center", padding: "4px 6px", width: "140px" }}>次回支払日</th>
                    <th style={{ textAlign: "center", padding: "4px 6px" }}>支払元</th>
                    <th style={{ textAlign: "center", padding: "4px 6px", width: "60px" }}>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {subscriptions.map((s) => {
                    const isAccount = s.paymentSourceType === "account";
                    const options = isAccount ? accountOptions : cardOptions;

                    return (
                      <tr key={s.id}>
                        <td style={{ padding: "4px 6px" }}>
                          <input
                            type="text"
                            value={s.name}
                            onChange={handleChange(s.id, "name")}
                            className="form-input"
                            placeholder="Netflix / 年会費など"
                          />
                        </td>
                        <td style={{ padding: "4px 6px", textAlign: "right" }}>
                          <input
                            type="number"
                            value={s.amount === 0 ? "" : s.amount}
                            onChange={handleChange(s.id, "amount")}
                            className="form-input"
                            style={{ textAlign: "right" }}
                          />
                        </td>
                        <td style={{ padding: "4px 6px" }}>
                          <select
                            value={s.frequency}
                            onChange={handleChange(s.id, "frequency")}
                            className="form-select"
                          >
                            <option value="monthly">毎月</option>
                            <option value="yearly">毎年</option>
                          </select>
                        </td>
                        <td style={{ padding: "4px 6px" }}>
                          <input
                            type="date"
                            value={s.nextPaymentDate}
                            onChange={handleChange(s.id, "nextPaymentDate")}
                            className="form-input"
                          />
                        </td>
                        <td style={{ padding: "4px 6px" }}>
                          <div style={{ display: "flex", gap: 4 }}>
                            <select
                              value={s.paymentSourceType}
                              onChange={handleChange(s.id, "paymentSourceType")}
                              className="form-select"
                              style={{ width: "80px" }}
                            >
                              <option value="account">口座</option>
                              <option value="card">カード</option>
                            </select>
                            <select
                              value={s.paymentSourceId}
                              onChange={handleChange(s.id, "paymentSourceId")}
                              className="form-select"
                              style={{ flex: 1 }}
                            >
                              <option value="">選択</option>
                              {options.map(a => (
                                <option key={a.id} value={a.id}>{a.name}</option>
                              ))}
                            </select>
                          </div>
                        </td>
                        <td style={{ padding: "4px 6px", textAlign: "center" }}>
                          <button
                            type="button"
                            onClick={() => handleRemoveRow(s.id)}
                            className="btn-secondary"
                            style={{
                              padding: "4px 8px",
                              fontSize: "12px",
                              backgroundColor: "#fff5f3",
                              color: "#c44536",
                              borderColor: "#c44536",
                            }}
                          >
                            削除
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
              {subscriptions.map((s) => {
                const isAccount = s.paymentSourceType === "account";
                const options = isAccount ? accountOptions : cardOptions;

                return (
                  <div key={s.id} className="list-card-item">
                    <div className="list-card-row">
                      <span className="list-card-label" style={{ width: "60px" }}>名称</span>
                      <input
                        type="text"
                        value={s.name}
                        onChange={handleChange(s.id, "name")}
                        className="form-input"
                        placeholder="名称"
                        style={{ flex: 1, padding: "8px" }}
                      />
                    </div>
                    <div className="list-card-row" style={{ marginTop: 8 }}>
                      <span className="list-card-label" style={{ width: "60px" }}>金額</span>
                      <input
                        type="number"
                        value={s.amount === 0 ? "" : s.amount}
                        onChange={handleChange(s.id, "amount")}
                        className="form-input"
                        style={{ flex: 1, padding: "8px", textAlign: "right" }}
                      />
                    </div>

                    <div className="grid-container" style={{ gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8 }}>
                      <div>
                        <span className="list-card-label">頻度</span>
                        <select
                          value={s.frequency}
                          onChange={handleChange(s.id, "frequency")}
                          className="form-select"
                          style={{ marginTop: 4 }}
                        >
                          <option value="monthly">毎月</option>
                          <option value="yearly">毎年</option>
                        </select>
                      </div>
                      <div>
                        <span className="list-card-label">次回支払日</span>
                        <input
                          type="date"
                          value={s.nextPaymentDate}
                          onChange={handleChange(s.id, "nextPaymentDate")}
                          className="form-input"
                          style={{ marginTop: 4, padding: "8px" }}
                        />
                      </div>
                    </div>

                    <div style={{ marginTop: 12 }}>
                      <span className="list-card-label">支払元</span>
                      <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                        <select
                          value={s.paymentSourceType}
                          onChange={handleChange(s.id, "paymentSourceType")}
                          className="form-select"
                          style={{ width: "90px" }}
                        >
                          <option value="account">口座</option>
                          <option value="card">カード</option>
                        </select>
                        <select
                          value={s.paymentSourceId}
                          onChange={handleChange(s.id, "paymentSourceId")}
                          className="form-select"
                          style={{ flex: 1 }}
                        >
                          <option value="">選択</option>
                          {options.map(a => (
                            <option key={a.id} value={a.id}>{a.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div style={{ marginTop: 16, textAlign: "right" }}>
                      <button
                        type="button"
                        onClick={() => handleRemoveRow(s.id)}
                        className="btn-secondary"
                        style={{
                          padding: "6px 16px",
                          backgroundColor: "#fff5f3",
                          color: "#c44536",
                          borderColor: "#c44536",
                        }}
                      >
                        削除
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        <div style={{ marginTop: 24, paddingBottom: 16, display: "flex", gap: 16 }}>
          <button onClick={handleAddRow} className="btn-secondary">＋ 追加</button>
          <button onClick={handleSave} className="btn-primary" style={{ flex: 1 }}>設定を保存</button>
        </div>
      </div>
      <div style={{ marginTop: 16, fontSize: 14 }}>
        <Link href="/settings">← 設定トップへ戻る</Link>
      </div>
    </div>
  );
}
