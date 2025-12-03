// app/settings/balance/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type BalanceItem = {
  id: string;
  name: string; // 口座名・カード名・財布など
  kind: string; // 種別（現金 / 口座 / カード など）
  amount: number; // 現在の残高
  memo: string;
};

type AppSettings = {
  balances?: BalanceItem[];
};

function createId() {
  return Math.random().toString(36).slice(2);
}

function BalanceSettingsInnerPage() {
  const [items, setItems] = useState<BalanceItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = localStorage.getItem("settings");
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw) as AppSettings;
      setItems(parsed.balances || []);
    } catch (e) {
      console.error("残高設定の読み込みに失敗しました", e);
    }
  }, []);

  const handleChange = (
    id: string,
    field: keyof BalanceItem,
    value: string
  ) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              [field]: field === "amount" ? Number(value) || 0 : value,
            }
          : item
      )
    );
  };

  const handleAdd = () => {
    setItems((prev) => [
      ...prev,
      {
        id: createId(),
        name: "",
        kind: "",
        amount: 0,
        memo: "",
      },
    ]);
  };

  const handleDelete = (id: string) => {
    if (!window.confirm("この残高情報を削除しますか？")) return;
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleSave = () => {
    if (typeof window === "undefined") return;
    setIsSaving(true);

    try {
      const raw = localStorage.getItem("settings");
      const base = raw ? JSON.parse(raw) : {};
      const newSettings = {
        ...base,
        balances: items,
      };
      localStorage.setItem("settings", JSON.stringify(newSettings));
      alert("残高設定を保存しました");
    } catch (e) {
      console.error("残高設定の保存に失敗しました", e);
      alert("保存に失敗しました");
    } finally {
      setIsSaving(false);
    }
  };

  const total = items.reduce((sum, i) => sum + (i.amount || 0), 0);

  return (
    <div className="page-container">
      <h1>残高設定（現金・口座・カードなど）</h1>
      <p style={{ marginBottom: 16 }}>
        現金や口座、カードの残高などを登録します。
        <br />
        将来的に「資産の合計」「負債の合計」を見える化するための土台になります。
      </p>

      <div className="app-card">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.4fr 0.9fr 1fr 1.2fr 0.6fr",
            gap: 8,
            fontSize: 13,
            marginBottom: 8,
            fontWeight: 600,
          }}
        >
          <span>名称</span>
          <span>種別</span>
          <span>残高（円）</span>
          <span>メモ</span>
          <span>操作</span>
        </div>

        {items.length === 0 && (
          <p style={{ fontSize: 14, marginTop: 8 }}>
            まだ残高が登録されていません。「行を追加」から入力してください。
          </p>
        )}

        {items.map((item) => (
          <div
            key={item.id}
            style={{
              display: "grid",
              gridTemplateColumns: "1.4fr 0.9fr 1fr 1.2fr 0.6fr",
              gap: 8,
              marginBottom: 8,
              alignItems: "center",
            }}
          >
            <input
              type="text"
              value={item.name}
              onChange={(e) => handleChange(item.id, "name", e.target.value)}
              style={{
                width: "100%",
                padding: "4px 6px",
                borderRadius: 4,
                border: "1px solid #ccb89b",
              }}
            />
            <input
              type="text"
              value={item.kind}
              onChange={(e) => handleChange(item.id, "kind", e.target.value)}
              placeholder="現金 / 口座 / カード など"
              style={{
                width: "100%",
                padding: "4px 6px",
                borderRadius: 4,
                border: "1px solid #ccb89b",
              }}
            />
            <input
              type="number"
              value={item.amount || ""}
              onChange={(e) =>
                handleChange(item.id, "amount", e.target.value)
              }
              style={{
                width: "100%",
                padding: "4px 6px",
                borderRadius: 4,
                border: "1px solid #ccb89b",
                textAlign: "right",
              }}
            />
            <input
              type="text"
              value={item.memo}
              onChange={(e) => handleChange(item.id, "memo", e.target.value)}
              style={{
                width: "100%",
                padding: "4px 6px",
                borderRadius: 4,
                border: "1px solid #ccb89b",
              }}
            />
            <button
              type="button"
              onClick={() => handleDelete(item.id)}
              style={{
                fontSize: 12,
                padding: "2px 8px",
                borderRadius: 999,
                border: "1px solid #c44536",
                backgroundColor: "#fff5f3",
                color: "#c44536",
                cursor: "pointer",
              }}
            >
              削除
            </button>
          </div>
        ))}

        <div style={{ marginTop: 12, fontSize: 14 }}>
          <p>
            登録した残高の合計：<strong>¥{total.toLocaleString()}</strong>
          </p>
        </div>

        <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
          <button
            type="button"
            onClick={handleAdd}
            style={{
              padding: "6px 12px",
              borderRadius: 999,
              border: "1px solid #b58b5a",
              backgroundColor: "#fef6e9",
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            ＋ 行を追加
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            style={{
              padding: "6px 16px",
              borderRadius: 6,
              border: "none",
              backgroundColor: "#b58b5a",
              color: "#fff",
              cursor: isSaving ? "not-allowed" : "pointer",
              fontSize: 13,
            }}
          >
            {isSaving ? "保存中..." : "保存する"}
          </button>
        </div>
      </div>

      <div style={{ marginTop: 16, fontSize: 14 }}>
        <Link href="/settings">← 設定トップへ戻る</Link>
      </div>
    </div>
  );
}

export default function BalanceSettingsPage() {
  return <BalanceSettingsInnerPage />;
}
