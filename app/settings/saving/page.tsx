// app/settings/saving/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ProtectedPage from "../../components/ProtectedPage";

type SavingGoal = {
  id: string;
  name: string;
  targetAmount: number;
  targetDate: string; // "2026-03-31" など
};

type AppSettings = {
  savingGoals?: SavingGoal[];
  [key: string]: any;
};

function calcMonthlyAmount(goal: SavingGoal): number | null {
  if (!goal.targetDate || !goal.targetAmount) return null;

  const now = new Date();
  const target = new Date(goal.targetDate);
  // 「今月」を含めるかどうかは好みだが、とりあえず「今月から」を想定
  let months =
    (target.getFullYear() - now.getFullYear()) * 12 +
    (target.getMonth() - now.getMonth());

  if (months <= 0) return null;

  return Math.ceil(goal.targetAmount / months);
}

export default function SavingSettingsPage() {
  const [goals, setGoals] = useState<SavingGoal[]>([]);
  const [message, setMessage] = useState<string>("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem("settings");
    if (!stored) return;

    try {
      const parsed = JSON.parse(stored) as AppSettings;
      if (parsed.savingGoals && Array.isArray(parsed.savingGoals)) {
        setGoals(parsed.savingGoals);
      }
    } catch (e) {
      console.error("貯金目標の読み込みに失敗しました", e);
    }
  }, []);

  const handleAddGoal = () => {
    setGoals((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        name: "",
        targetAmount: 0,
        targetDate: "",
      },
    ]);
  };

  const handleChange = (
    id: string,
    field: keyof SavingGoal,
    value: string | number
  ) => {
    setGoals((prev) =>
      prev.map((g) =>
        g.id === id ? { ...g, [field]: value } : g
      )
    );
  };

  const handleRemove = (id: string) => {
    setGoals((prev) => prev.filter((g) => g.id !== id));
  };

  const handleSave = () => {
    if (typeof window === "undefined") return;

    const stored = localStorage.getItem("settings");
    let current: AppSettings = {};
    if (stored) {
      try {
        current = JSON.parse(stored) as AppSettings;
      } catch {
        current = {};
      }
    }

    const newSettings: AppSettings = {
      ...current,
      savingGoals: goals,
    };

    localStorage.setItem("settings", JSON.stringify(newSettings));
    setMessage("貯金目標を保存しました。");
    setTimeout(() => setMessage(""), 2000);
  };

  return (
    <ProtectedPage>
      <div className="page-container">
      <h1>貯金目標の設定</h1>
      <p>
        「いつまでに、いくら貯めたいか」を登録します。
        アプリ側で、期限までに必要な「1ヶ月あたりの目安金額」を自動計算できます。
      </p>

      <div className="app-card">
        <h2>貯金目標の一覧</h2>

        {goals.length === 0 && <p>まだ貯金目標が登録されていません。</p>}

        {goals.map((goal) => {
          const monthly = calcMonthlyAmount(goal);
          return (
            <div
              key={goal.id}
              style={{
                borderTop: "1px solid #e0d6c8",
                paddingTop: 8,
                marginTop: 8,
              }}
            >
              <div style={{ marginBottom: 4 }}>
                <label>
                  目標名：
                  <input
                    type="text"
                    value={goal.name}
                    onChange={(e) =>
                      handleChange(goal.id, "name", e.target.value)
                    }
                    style={{
                      marginLeft: 4,
                      padding: "2px 6px",
                      width: "200px",
                    }}
                  />
                </label>
              </div>

              <div style={{ marginBottom: 4 }}>
                <label>
                  目標金額：
                  <input
                    type="number"
                    value={goal.targetAmount}
                    onChange={(e) =>
                      handleChange(
                        goal.id,
                        "targetAmount",
                        Number(e.target.value || 0)
                      )
                    }
                    style={{
                      marginLeft: 4,
                      padding: "2px 6px",
                      width: "160px",
                    }}
                  />
                  <span style={{ marginLeft: 4 }}>円</span>
                </label>
              </div>

              <div style={{ marginBottom: 4 }}>
                <label>
                  期限：
                  <input
                    type="date"
                    value={goal.targetDate}
                    onChange={(e) =>
                      handleChange(goal.id, "targetDate", e.target.value)
                    }
                    style={{ marginLeft: 4, padding: "2px 6px" }}
                  />
                </label>
              </div>

              {monthly != null && (
                <p style={{ fontSize: 12, color: "#555" }}>
                  今から期限までに達成するには、
                  <strong>月あたり 約 ¥{monthly.toLocaleString()}</strong>
                  のペースで貯金が必要です。
                </p>
              )}

              <button
                onClick={() => handleRemove(goal.id)}
                style={{
                  marginTop: 4,
                  padding: "4px 8px",
                  borderRadius: 4,
                  border: "none",
                  backgroundColor: "#b3261e",
                  color: "#fff",
                  cursor: "pointer",
                  fontSize: 12,
                }}
              >
                この目標を削除
              </button>
            </div>
          );
        })}

        <button
          onClick={handleAddGoal}
          style={{
            marginTop: 12,
            padding: "6px 12px",
            borderRadius: 4,
            border: "1px solid #5d4333",
            backgroundColor: "#fbf7eb",
            color: "#5d4333",
            cursor: "pointer",
            fontSize: 14,
          }}
        >
          ＋ 目標を追加
        </button>
      </div>

      <button
        onClick={handleSave}
        style={{
          marginTop: 16,
          padding: "8px 16px",
          borderRadius: 4,
          border: "none",
          backgroundColor: "#5d4333",
          color: "#fff",
          cursor: "pointer",
        }}
      >
        保存する
      </button>

      {message && (
        <p style={{ marginTop: 8, color: "#5d4333", fontSize: 14 }}>
          {message}
        </p>
      )}

      <div style={{ marginTop: 24 }}>
        <Link href="/settings">◀ 設定トップに戻る</Link>
      </div>
      </div>
    </ProtectedPage>
  );
}
