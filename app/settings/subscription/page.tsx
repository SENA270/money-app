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
  billingDay: number; // 1-31
  // 今後の自動入力で使う想定
  paymentSourceType: "account" | "card";
  paymentSourceId: string; // Account.id
};

type AppSettings = {
  subscriptions?: Subscription[];
  // 他にも saving / loans など入っているかもしれないので
  // ここでは触らずにマージだけする
};

function createEmptySubscription(): Subscription {
  return {
    id: `sub-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: "",
    amount: 0,
    billingDay: 1,
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

    // 1) 口座・カードの一覧（/settings/accounts で保存したもの）
    const accountsRaw = localStorage.getItem("accounts");
    if (accountsRaw) {
      try {
        const parsed = JSON.parse(accountsRaw) as Account[];
        setAccounts(parsed);
      } catch (e) {
        console.error("accounts の読み込みに失敗しました", e);
      }
    }

    // 2) サブスク設定
    const settingsRaw = localStorage.getItem("settings");
    if (settingsRaw) {
      try {
        const parsed = JSON.parse(settingsRaw) as AppSettings;
        const list = parsed.subscriptions ?? [];
        if (list.length > 0) {
          setSubscriptions(list);
        } else {
          setSubscriptions([createEmptySubscription()]);
        }
      } catch (e) {
        console.error("subscriptions の読み込みに失敗しました", e);
        setSubscriptions([createEmptySubscription()]);
      }
    } else {
      // 何もなければ1行だけ出す
      setSubscriptions([createEmptySubscription()]);
    }
  }, []);

  // 口座系・カード系の選択肢
  const accountOptions = accounts.filter(
    (a) => a.type === "bank" || a.type === "wallet" || a.type === "qr"
  );
  const cardOptions = accounts.filter((a) => a.type === "card");

  const handleChange =
    (id: string, field: keyof Subscription) =>
      (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        let value: any = e.target.value;

        if (field === "amount") {
          value = Number(value || 0);
        }
        if (field === "billingDay") {
          let v = Number(value || 1);
          if (v < 1) v = 1;
          if (v > 31) v = 31;
          value = v;
        }
        if (field === "paymentSourceType") {
          // 種類を切り替えたら、とりあえず paymentSourceId は空にする
          value = value as "account" | "card";
        }

        setSubscriptions((prev) =>
          prev.map((s) => {
            if (s.id !== id) return s;
            const updated: Subscription = { ...s, [field]: value };

            // 種類を切り替えたときは支払い元IDを消す
            if (field === "paymentSourceType") {
              updated.paymentSourceId = "";
            }

            return updated;
          })
        );
      };

  const handleAddRow = () => {
    setSubscriptions((prev) => [...prev, createEmptySubscription()]);
  };

  const handleRemoveRow = (id: string) => {
    setSubscriptions((prev) => {
      const after = prev.filter((s) => s.id !== id);
      return after.length === 0 ? [createEmptySubscription()] : after;
    });
  };

  const handleSave = () => {
    if (typeof window === "undefined") return;

    // 空行を落とす（名前も金額も 0 のもの）
    const cleaned = subscriptions.filter(
      (s) => s.name.trim() !== "" || s.amount !== 0
    );

    try {
      const settingsRaw = localStorage.getItem("settings");
      const settings: AppSettings =
        settingsRaw ? (JSON.parse(settingsRaw) as AppSettings) : {};

      const newSettings: AppSettings = {
        ...settings,
        subscriptions: cleaned,
      };

      localStorage.setItem("settings", JSON.stringify(newSettings));
      alert("サブスク設定を保存しました！");
    } catch (e) {
      console.error("サブスク設定の保存に失敗しました", e);
      alert("保存に失敗しました…（コンソールを確認してみてください）");
    }
  };

  return (
    <div className="page-container">
      <h1>サブスク設定</h1>
      <p style={{ marginBottom: 16, fontSize: 14 }}>
        毎月発生するサブスク（固定費）を登録します。
        <br />
        支払い元には「銀行口座・財布・QR」に加えて「クレジットカード」も選べます。
      </p>

      <div className="app-card">
        {subscriptions.length === 0 ? (
          <p>まだサブスクが登録されていません。</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="table-basic" style={{ minWidth: "800px" }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", padding: "4px 6px" }}>名称</th>
                  <th style={{ textAlign: "right", padding: "4px 6px" }}>
                    月額（円）
                  </th>
                  <th style={{ textAlign: "center", padding: "4px 6px", width: "80px" }}>
                    引き落とし日
                  </th>
                  <th style={{ textAlign: "center", padding: "4px 6px" }}>
                    支払い元の種類
                  </th>
                  <th style={{ textAlign: "center", padding: "4px 6px" }}>
                    支払い元
                  </th>
                  <th style={{ textAlign: "center", padding: "4px 6px", width: "80px" }}>
                    操作
                  </th>
                </tr>
              </thead>
              <tbody>
                {subscriptions.map((s) => {
                  const isAccount = s.paymentSourceType === "account";
                  const options = isAccount ? accountOptions : cardOptions;

                  return (
                    <tr key={s.id}>
                      {/* 名称 */}
                      <td style={{ padding: "4px 6px" }}>
                        <input
                          type="text"
                          value={s.name}
                          onChange={handleChange(s.id, "name")}
                          className="form-input"
                          placeholder="Netflixなど"
                        />
                      </td>

                      {/* 月額 */}
                      <td style={{ padding: "4px 6px", textAlign: "right" }}>
                        <input
                          type="number"
                          value={s.amount === 0 ? "" : s.amount}
                          onChange={handleChange(s.id, "amount")}
                          className="form-input"
                          style={{ textAlign: "right" }}
                        />
                      </td>

                      {/* 引き落とし日 */}
                      <td style={{ padding: "4px 6px" }}>
                        <input
                          type="number"
                          min={1}
                          max={31}
                          value={s.billingDay}
                          onChange={handleChange(s.id, "billingDay")}
                          className="form-input"
                          style={{ textAlign: "right" }}
                        />
                      </td>

                      {/* 支払い元の種類 */}
                      <td style={{ padding: "4px 6px", textAlign: "center" }}>
                        <select
                          value={s.paymentSourceType}
                          onChange={handleChange(s.id, "paymentSourceType")}
                          className="form-select"
                        >
                          <option value="account">口座・財布・QR</option>
                          <option value="card">クレジットカード</option>
                        </select>
                      </td>

                      {/* 支払い元ID（実際の口座 or カード） */}
                      <td style={{ padding: "4px 6px", textAlign: "center" }}>
                        {options.length === 0 ? (
                          <span style={{ fontSize: 12, color: "#b3261e" }}>
                            {isAccount
                              ? "未登録"
                              : "未登録"}
                          </span>
                        ) : (
                          <select
                            value={s.paymentSourceId}
                            onChange={handleChange(s.id, "paymentSourceId")}
                            className="form-select"
                            style={{ minWidth: "160px" }}
                          >
                            <option value="">選択してください</option>
                            {options.map((a) => (
                              <option key={a.id} value={a.id}>
                                {a.type === "card"
                                  ? `【カード】${a.name}`
                                  : `【${a.type === "bank"
                                    ? "銀行"
                                    : a.type === "wallet"
                                      ? "財布"
                                      : "QR"
                                  }】${a.name}`}
                              </option>
                            ))}
                          </select>
                        )}
                      </td>

                      {/* 削除ボタン */}
                      <td style={{ padding: "4px 6px", textAlign: "center" }}>
                        <button
                          type="button"
                          onClick={() => handleRemoveRow(s.id)}
                          className="btn-secondary"
                          style={{
                            padding: "4px 10px",
                            fontSize: "12px",
                            minHeight: "auto",
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
        )}

        <div style={{ marginTop: 24, paddingBottom: 16 }}>
          <div style={{ display: "flex", gap: 16 }}>
            <button
              type="button"
              onClick={handleAddRow}
              className="btn-secondary"
            >
              ＋ 行を追加
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="btn-primary"
              style={{ width: "100%", maxWidth: "200px" }}
            >
              すべて保存する
            </button>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 16, fontSize: 14 }}>
        <Link href="/settings">← 設定トップへ戻る</Link>
      </div>
    </div>
  );
}
