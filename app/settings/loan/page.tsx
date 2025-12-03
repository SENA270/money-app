// app/settings/loan/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ProtectedPage from "../../components/ProtectedPage";

type Frequency = "monthly" | "half-year" | "yearly";

type LoanItem = {
  id: string;
  name: string;             // 名称（奨学金Aなど）
  amountPerPayment: number; // 1回あたり返済額
  startDate: string;        // 開始日（YYYY-MM-DD）
  paymentDay: number;       // 毎月の何日か（1〜31）
  frequency: Frequency;     // 毎月 / 半年ごと / 年1回
  numberOfPayments: number; // 何回払いか（最大999）
  memo: string;
};

type AppSettings = {
  loans?: LoanItem[];
  [key: string]: any; // 他の設定も壊さないため
};

function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export default function LoanSettingsPage() {
  const [items, setItems] = useState<LoanItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // 初期読み込み
  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = localStorage.getItem("settings");
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw) as AppSettings;
      const stored = parsed.loans || [];

      const normalized: LoanItem[] = stored.map((item: any) => ({
        id: item.id || createId(),
        name: item.name ?? "",
        amountPerPayment: Number(item.amountPerPayment ?? 0),
        startDate: item.startDate ?? "",
        paymentDay: Number(item.paymentDay ?? 1),
        frequency: (item.frequency as Frequency) ?? "monthly",
        numberOfPayments: Number(item.numberOfPayments ?? 0),
        memo: item.memo ?? "",
      }));

      setItems(normalized);
    } catch (e) {
      console.error("返済設定の読み込みに失敗しました", e);
    }
  }, []);

  // 入力変更
  const handleChange = (
    id: string,
    field: keyof LoanItem,
    value: string
  ) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;

        // 数値系
        if (
          field === "amountPerPayment" ||
          field === "paymentDay" ||
          field === "numberOfPayments"
        ) {
          let num = Number(value);

          if (field === "paymentDay") {
            // 支払日は 1〜31 にクランプ
            num = isNaN(num) ? 1 : num;
            num = Math.max(1, Math.min(31, num));
            return { ...item, paymentDay: num };
          }

          if (field === "numberOfPayments") {
            // 回数は 1〜999 にクランプ
            num = isNaN(num) ? 0 : num;
            num = Math.max(1, Math.min(999, num));
            return { ...item, numberOfPayments: num };
          }

          // amountPerPayment
          num = isNaN(num) ? 0 : num;
          return { ...item, amountPerPayment: num };
        }

        // frequency
        if (field === "frequency") {
          return { ...item, frequency: value as Frequency };
        }

        // その他（name, startDate, memo）
        return { ...item, [field]: value };
      })
    );
  };

  const handleAdd = () => {
    setItems((prev) => [
      ...prev,
      {
        id: createId(),
        name: "",
        amountPerPayment: 0,
        startDate: "",
        paymentDay: 1,
        frequency: "monthly",
        numberOfPayments: 1,
        memo: "",
      },
    ]);
  };

  const handleDelete = (id: string) => {
    if (!confirm("この返済情報を削除しますか？")) return;
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleSave = () => {
    if (typeof window === "undefined") return;
    setIsSaving(true);

    try {
      const raw = localStorage.getItem("settings");
      let base: AppSettings = {};
      if (raw) {
        base = JSON.parse(raw);
      }
      base.loans = items;
      localStorage.setItem("settings", JSON.stringify(base));
      alert("返済設定を保存しました");
    } catch (e) {
      console.error("返済設定の保存に失敗しました", e);
      alert("保存に失敗しました");
    } finally {
      setIsSaving(false);
    }
  };

  const totalAll = items.reduce(
    (sum, item) => sum + item.amountPerPayment * item.numberOfPayments,
    0
  );

  return (
    <ProtectedPage>
      <div className="page-container">
      <h1>返済設定（奨学金・分割など）</h1>
      <p style={{ marginBottom: 16 }}>
        奨学金や分割払いについて、
        「いつから」「どれくらいの頻度で」「何回払うか」を登録します。
        総額は 1回あたり返済額 × 回数 から自動計算されます。
      </p>

      <div className="app-card">
        {/* ヘッダー行 */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "2fr 1fr 1fr 0.7fr 0.9fr 0.7fr 1.2fr 0.6fr",
            gap: 8,
            fontSize: 13,
            marginBottom: 8,
            fontWeight: 600,
          }}
        >
          <span>名称</span>
          <span>1回あたり返済額</span>
          <span>開始日</span>
          <span>支払日</span>
          <span>頻度</span>
          <span>回数</span>
          <span>総額（自動）</span>
          <span>操作</span>
        </div>

        {items.length === 0 && (
          <p style={{ fontSize: 14, marginTop: 8 }}>
            まだ返済設定が登録されていません。「行を追加」から入力してください。
          </p>
        )}

        {/* 各行 */}
        {items.map((item) => {
          const total = item.amountPerPayment * item.numberOfPayments;

          return (
            <div
              key={item.id}
              style={{
                display: "grid",
                gridTemplateColumns:
                  "2fr 1fr 1fr 0.7fr 0.9fr 0.7fr 1.2fr 0.6fr",
                gap: 8,
                marginBottom: 8,
                alignItems: "center",
              }}
            >
              {/* 名称 */}
              <input
                type="text"
                value={item.name}
                onChange={(e) =>
                  handleChange(item.id, "name", e.target.value)
                }
                style={{ width: "100%" }}
                placeholder="奨学金A、iPhone分割 など"
              />

              {/* 1回あたり返済額 */}
              <input
                type="number"
                value={item.amountPerPayment || ""}
                onChange={(e) =>
                  handleChange(item.id, "amountPerPayment", e.target.value)
                }
                style={{ width: "100%", textAlign: "right" }}
              />

              {/* 開始日 */}
              <input
                type="date"
                value={item.startDate}
                onChange={(e) =>
                  handleChange(item.id, "startDate", e.target.value)
                }
                style={{ width: "100%" }}
              />

              {/* 支払日（毎月何日） */}
              <input
                type="number"
                min={1}
                max={31}
                value={item.paymentDay || ""}
                onChange={(e) =>
                  handleChange(item.id, "paymentDay", e.target.value)
                }
                style={{ width: "100%", textAlign: "right" }}
              />

              {/* 頻度 */}
              <select
                value={item.frequency}
                onChange={(e) =>
                  handleChange(item.id, "frequency", e.target.value)
                }
                style={{ width: "100%", fontSize: 13 }}
              >
                <option value="monthly">毎月</option>
                <option value="half-year">半年ごと</option>
                <option value="yearly">年1回</option>
              </select>

              {/* 回数 */}
              <input
                type="number"
                min={1}
                max={999}
                value={item.numberOfPayments || ""}
                onChange={(e) =>
                  handleChange(item.id, "numberOfPayments", e.target.value)
                }
                style={{ width: "100%", textAlign: "right" }}
              />

              {/* 総額（自動表示） */}
              <div style={{ textAlign: "right", fontSize: 13 }}>
                ¥{total.toLocaleString()}
              </div>

              {/* 操作 */}
              <button
                type="button"
                onClick={() => handleDelete(item.id)}
                style={{ fontSize: 12 }}
              >
                削除
              </button>
            </div>
          );
        })}

        {/* 合計表示・ボタン */}
        <div
          style={{
            marginTop: 12,
            display: "flex",
            flexDirection: "column",
            gap: 8,
            fontSize: 14,
          }}
        >
          <div>
            登録されている返済の総額合計：
            <strong>¥{totalAll.toLocaleString()}</strong>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" onClick={handleAdd}>
              ＋ 行を追加
            </button>
            <button type="button" onClick={handleSave} disabled={isSaving}>
              {isSaving ? "保存中..." : "保存する"}
            </button>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 16, fontSize: 14 }}>
        <Link href="/settings">← 設定トップへ戻る</Link>
      </div>
      </div>
    </ProtectedPage>
  );
}
