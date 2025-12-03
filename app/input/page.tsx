// app/input/page.tsx
"use client";

import React, { useEffect, useState } from "react";

type TransactionType = "expense" | "income";

type Transaction = {
  id: string;
  date: string; // "YYYY-MM-DD"
  amount: number;
  type: TransactionType;
  category: string;
  payment: string; // 支払い方法
  memo: string;
  createdAt?: string;
};

type AccountType = "bank" | "wallet" | "qr" | "card" | string;

type Account = {
  id: string;
  type: AccountType;
  name: string;
  [key: string]: any;
};

type CategoryType = "expense" | "income";

type Category = {
  id: string;
  name: string;
  type: CategoryType;
};

// レシートから渡される内容
type PendingReceiptPayload = {
  date?: string;
  type?: TransactionType;
  amount?: number;
  category?: string;
  paymentName?: string;
  paymentHint?: "card" | "cash" | "unknown";
  memo?: string;
};

function InputInnerPage() {
  // フォームの状態
  const [date, setDate] = useState<string>(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  });
  const [type, setType] = useState<TransactionType>("expense");
  const [amount, setAmount] = useState<string>("");
  const [category, setCategory] = useState<string>("");
  const [payment, setPayment] = useState<string>("");
  const [memo, setMemo] = useState<string>("");

  // オプション
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [paymentOptions, setPaymentOptions] = useState<string[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<string[]>([]);
  const [incomeCategories, setIncomeCategories] = useState<string[]>([]);

  // レシートモーダル開閉
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  // ① 支払い方法候補 & accounts
  useEffect(() => {
    if (typeof window === "undefined") return;

    const accountsRaw = localStorage.getItem("accounts");
    if (!accountsRaw) return;

    try {
      const parsed: Account[] = JSON.parse(accountsRaw);
      setAccounts(parsed);

      const names = parsed.map((a) => a.name).filter(Boolean);
      setPaymentOptions(names);

      if (names.length > 0) {
        setPayment((prev) => prev || names[0]);
      }
    } catch (e) {
      console.error("accounts の読み込みに失敗しました", e);
    }
  }, []);

  // ② カテゴリ候補
  useEffect(() => {
    if (typeof window === "undefined") return;

    const raw = localStorage.getItem("categories");
    if (!raw) {
      setExpenseCategories([]);
      setIncomeCategories([]);
      return;
    }

    try {
      const parsed = JSON.parse(raw) as Category[];

      const expNames = parsed
        .filter((c) => c.type === "expense")
        .map((c) => c.name)
        .filter((n) => n.trim() !== "");

      const incNames = parsed
        .filter((c) => c.type === "income")
        .map((c) => c.name)
        .filter((n) => n.trim() !== "");

      setExpenseCategories(expNames);
      setIncomeCategories(incNames);
    } catch (e) {
      console.error("categories の読み込みに失敗しました", e);
      setExpenseCategories([]);
      setIncomeCategories([]);
    }
  }, []);

  // ③ 種別が変わったときのカテゴリ初期値
  useEffect(() => {
    if (type === "expense") {
      if (expenseCategories.length > 0) {
        setCategory((prev) =>
          prev && expenseCategories.includes(prev)
            ? prev
            : expenseCategories[0]
        );
      } else {
        setCategory("");
      }
    } else {
      if (incomeCategories.length > 0) {
        setCategory((prev) =>
          prev && incomeCategories.includes(prev)
            ? prev
            : incomeCategories[0]
        );
      } else {
        setCategory("");
      }
    }
  }, [type, expenseCategories, incomeCategories]);

  // ④ レシートからの反映：localStorage を読む共通処理
  const applyPendingReceipt = (payload: PendingReceiptPayload | null) => {
    if (!payload) return;

    if (payload.date) setDate(payload.date);
    if (payload.type === "expense" || payload.type === "income") {
      setType(payload.type);
    }

    if (typeof payload.amount === "number") {
      setAmount(String(payload.amount));
    }

    if (payload.memo) {
      setMemo(payload.memo);
    }

    // カテゴリは、存在する名前だけセット
    if (payload.category) {
      const isIncome = (payload.type ?? type) === "income";
      const candidates = isIncome ? incomeCategories : expenseCategories;

      if (candidates.includes(payload.category)) {
        setCategory(payload.category);
      }
    }

    // 支払い方法
    // 1) 名前がそのまま一致していればそれを使う
    if (payload.paymentName && paymentOptions.includes(payload.paymentName)) {
      setPayment(payload.paymentName);
      return;
    }

    // 2) ヒントが "card" なら、カード口座を優先して選ぶ
    if (payload.paymentHint === "card") {
      const cardAccount =
        accounts.find((a) => a.type === "card") ??
        accounts.find((a) => /カード|クレジット/i.test(a.name));
      if (cardAccount) {
        setPayment(cardAccount.name);
        return;
      }
    }

    // 3) ヒントが "cash" なら、wallet → bank の順で選ぶ
    if (payload.paymentHint === "cash") {
      const wallet =
        accounts.find((a) => a.type === "wallet") ??
        accounts.find((a) => /財布|ウォレット/i.test(a.name));
      const bank = accounts.find((a) => a.type === "bank");
      const target = wallet ?? bank;
      if (target) {
        setPayment(target.name);
        return;
      }
    }

    // 4) それ以外は今の payment を維持（特に何もしない）
  };

  // 初回表示時：もし pendingReceiptInput が残っていたら反映
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const raw = window.localStorage.getItem("pendingReceiptInput");
      if (!raw) return;
      const payload = JSON.parse(raw) as PendingReceiptPayload | null;
      applyPendingReceipt(payload);
      window.localStorage.removeItem("pendingReceiptInput");
    } catch (e) {
      console.error("pendingReceiptInput の読み込みに失敗", e);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // モーダル内 iframe からの postMessage を受け取って反映
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handler = (event: MessageEvent) => {
      if (!event.data || event.data.type !== "receiptApplied") {
        return;
      }
      try {
        const raw = window.localStorage.getItem("pendingReceiptInput");
        const payload = raw
          ? (JSON.parse(raw) as PendingReceiptPayload | null)
          : null;
        applyPendingReceipt(payload);
        window.localStorage.removeItem("pendingReceiptInput");
      } catch (e) {
        console.error("pendingReceiptInput の反映に失敗", e);
      } finally {
        setShowReceiptModal(false);
      }
    };

    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 保存処理
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount) {
      alert("金額を入力してください。");
      return;
    }
    if (!category) {
      alert("カテゴリを選択してください。");
      return;
    }
    if (!payment) {
      alert("支払い方法を選択してください。");
      return;
    }

    if (typeof window === "undefined") return;

    const txRaw = localStorage.getItem("transactions");
    const list: Transaction[] = txRaw ? JSON.parse(txRaw) : [];

    const nowIso = new Date().toISOString();

    const newTx: Transaction = {
      id: `tx-${Date.now()}`,
      date,
      amount: Number(amount),
      type,
      category,
      payment,
      memo,
      createdAt: nowIso,
    };

    list.push(newTx);
    localStorage.setItem("transactions", JSON.stringify(list));
    alert("保存しました。");

    setAmount("");
    setMemo("");
  };

  const currentCategoryOptions =
    type === "expense" ? expenseCategories : incomeCategories;
  const hasCategory = currentCategoryOptions.length > 0;

  return (
    <div className="page-container">
      <h1>入力</h1>
      <p style={{ marginBottom: 12, fontSize: 14 }}>
        日々の支出・収入を登録するページです。
        <br />
        カード払いは、カード設定で登録した「内訳キー」で管理されます。
      </p>

      {/* レシートから読み取るボタン */}
      <div style={{ marginBottom: 12 }}>
        <button
          type="button"
          onClick={() => setShowReceiptModal(true)}
          style={{
            padding: "6px 12px",
            borderRadius: 999,
            border: "1px solid #b58b5a",
            backgroundColor: "#fff7ea",
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          📷 レシートから読み取る
        </button>
      </div>

      <form
        onSubmit={handleSubmit}
        className="app-card"
        style={{ maxWidth: 480 }}
      >
        {/* 日付 */}
        <div style={{ marginBottom: 12 }}>
          <label
            style={{
              fontSize: 14,
              display: "block",
              marginBottom: 4,
            }}
          >
            日付
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            style={{
              width: "100%",
              padding: "6px 8px",
              borderRadius: 4,
              border: "1px solid #ccb89b",
            }}
          />
        </div>

        {/* 種別 */}
        <div style={{ marginBottom: 12 }}>
          <label
            style={{
              fontSize: 14,
              display: "block",
              marginBottom: 4,
            }}
          >
            種別
          </label>
          <div style={{ display: "flex", gap: 16, fontSize: 14 }}>
            <label>
              <input
                type="radio"
                value="expense"
                checked={type === "expense"}
                onChange={() => setType("expense")}
              />{" "}
              支出
            </label>
            <label>
              <input
                type="radio"
                value="income"
                checked={type === "income"}
                onChange={() => setType("income")}
              />{" "}
              収入
            </label>
          </div>
        </div>

        {/* 金額 */}
        <div style={{ marginBottom: 12 }}>
          <label
            style={{
              fontSize: 14,
              display: "block",
              marginBottom: 4,
            }}
          >
            金額（円）
          </label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            style={{
              width: "100%",
              padding: "6px 8px",
              borderRadius: 4,
              border: "1px solid #ccb89b",
              textAlign: "right",
            }}
          />
        </div>

        {/* カテゴリ */}
        <div style={{ marginBottom: 12 }}>
          <label
            style={{
              fontSize: 14,
              display: "block",
              marginBottom: 4,
            }}
          >
            カテゴリ
          </label>
          {hasCategory ? (
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              style={{
                width: "100%",
                padding: "6px 8px",
                borderRadius: 4,
                border: "1px solid #ccb89b",
              }}
            >
              {currentCategoryOptions.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          ) : (
            <p
              style={{
                fontSize: 13,
                color: "#b3261e",
              }}
            >
              カテゴリが未設定です。「設定 &gt; カテゴリ」から登録してください。
            </p>
          )}
        </div>

        {/* 支払い方法 */}
        <div style={{ marginBottom: 12 }}>
          <label
            style={{
              fontSize: 14,
              display: "block",
              marginBottom: 4,
            }}
          >
            支払い方法
          </label>
          {paymentOptions.length > 0 ? (
            <select
              value={payment}
              onChange={(e) => setPayment(e.target.value)}
              style={{
                width: "100%",
                padding: "6px 8px",
                borderRadius: 4,
                border: "1px solid #ccb89b",
              }}
            >
              {paymentOptions.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          ) : (
            <p
              style={{
                fontSize: 13,
                color: "#b3261e",
              }}
            >
              口座や財布が未登録です。「設定 &gt; 残高設定」から登録してください。
            </p>
          )}
        </div>

        {/* メモ */}
        <div style={{ marginBottom: 16 }}>
          <label
            style={{
              fontSize: 14,
              display: "block",
              marginBottom: 4,
            }}
          >
            メモ（任意）
          </label>
          <input
            type="text"
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="例：コンビニ、サブスクなど"
            style={{
              width: "100%",
              padding: "6px 8px",
              borderRadius: 4,
              border: "1px solid #ccb89b",
            }}
          />
        </div>

        <button
          type="submit"
          style={{
            width: "100%",
            padding: "8px 16px",
            borderRadius: 6,
            border: "none",
            backgroundColor: "#b58b5a",
            color: "#fff",
            cursor: "pointer",
          }}
        >
          保存する
        </button>
      </form>

      <div style={{ marginTop: 16, fontSize: 14 }}>
        <a href="/">◀ ホームに戻る</a>
      </div>

      {/* レシート読み取りモーダル */}
      {showReceiptModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.35)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              width: "min(520px, 100% - 32px)",
              backgroundColor: "#fdf7ec",
              borderRadius: 12,
              boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
              border: "1px solid #dec9a3",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              style={{
                padding: "8px 12px",
                borderBottom: "1px solid rgba(0,0,0,0.05)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                fontSize: 13,
              }}
            >
              <span>レシート読み取り</span>
              <button
                type="button"
                onClick={() => setShowReceiptModal(false)}
                style={{
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  fontSize: 18,
                  lineHeight: 1,
                }}
              >
                ×
              </button>
            </div>

            <div
              style={{
                padding: "8px 10px 10px",
                flex: 1,
              }}
            >
              <iframe
                src="/receipt"
                title="レシート読み取り"
                style={{
                  width: "100%",
                  height: "360px",
                  border: "none",
                  borderRadius: 8,
                  backgroundColor: "transparent",
                }}
              />
              <p
                style={{
                  marginTop: 6,
                  fontSize: 11,
                  color: "#7a6a55",
                }}
              >
                ※ レシートを読み取ると、日付・金額・カテゴリ・メモ・支払い方法が
                この入力フォームに自動で反映されます。
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ▼ ログインガード付きで公開
export default function ProtectedInputPage() {
  return <InputInnerPage />;
}
