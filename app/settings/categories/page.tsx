// app/settings/categories/page.tsx
"use client";

import { useEffect, useState } from "react";

type CategoryType = "expense" | "income";

type Category = {
  id: string;
  name: string;
  type: CategoryType;
};

type CategoryBudgetsByMonth = {
  [month: string]: {
    [categoryId: string]: number;
  };
};

const CATEGORIES_KEY = "categories";
const CATEGORY_BUDGETS_KEY = "categoryBudgetsByMonth";

// YYYY-MM 形式の現在の月
function getCurrentMonthStr(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

// "2025-12" に n ヶ月加算した YYYY-MM を返す
function addMonthsToMonthStr(base: string, offset: number): string {
  const [yStr, mStr] = base.split("-");
  let year = Number(yStr);
  let monthZero = Number(mStr) - 1 + offset; // 0 始まり

  year += Math.floor(monthZero / 12);
  monthZero = ((monthZero % 12) + 12) % 12;

  return `${year}-${String(monthZero + 1).padStart(2, "0")}`;
}

// デフォルトカテゴリ
function createDefaultCategories(): Category[] {
  return [
    { id: "cat-food", name: "食費", type: "expense" },
    { id: "cat-communication", name: "交際費", type: "expense" },
    { id: "cat-hobby", name: "趣味・娯楽", type: "expense" },
    { id: "cat-transport", name: "交通費", type: "expense" },
    { id: "cat-daily", name: "日用品", type: "expense" },
    { id: "cat-other", name: "その他", type: "expense" },
    { id: "cat-salary", name: "給与", type: "income" },
  ];
}

export default function CategoryAndBudgetSettingsPage() {
  // ★ ログインしていなければ /login に飛ばす（今までと同じスタイル）
  useEffect(() => {
    if (typeof window === "undefined") return;
    const user = window.localStorage.getItem("authUser"); // ここは使ってるキー名に合わせて
    if (!user) {
      window.location.href = "/login"; // ログインページのパスに合わせて
    }
  }, []);

  // カテゴリ
  const [expenseCategories, setExpenseCategories] = useState<Category[]>([]);
  const [incomeCategories, setIncomeCategories] = useState<Category[]>([]);

  // 予算
  const [targetMonth, setTargetMonth] = useState<string>(getCurrentMonthStr());
  const [monthsToCopy, setMonthsToCopy] = useState<string>("1");
  const [budgetsByMonth, setBudgetsByMonth] = useState<CategoryBudgetsByMonth>(
    {}
  );

  // ロード
  useEffect(() => {
    if (typeof window === "undefined") return;

    // カテゴリ
    try {
      const raw = localStorage.getItem(CATEGORIES_KEY);
      let loaded: Category[];

      if (!raw) {
        loaded = createDefaultCategories();
      } else {
        loaded = JSON.parse(raw) as Category[];
        if (!Array.isArray(loaded) || loaded.length === 0) {
          loaded = createDefaultCategories();
        }
      }

      setExpenseCategories(loaded.filter((c) => c.type === "expense"));
      setIncomeCategories(loaded.filter((c) => c.type === "income"));
    } catch (e) {
      console.error("categories 読み込み失敗", e);
      const def = createDefaultCategories();
      setExpenseCategories(def.filter((c) => c.type === "expense"));
      setIncomeCategories(def.filter((c) => c.type === "income"));
    }

    // 予算
    try {
      const rawBudgets = localStorage.getItem(CATEGORY_BUDGETS_KEY);
      if (!rawBudgets) return;

      const parsed = JSON.parse(rawBudgets) as CategoryBudgetsByMonth;
      if (parsed && typeof parsed === "object") {
        setBudgetsByMonth(parsed);
      }
    } catch (e) {
      console.error("categoryBudgetsByMonth 読み込み失敗", e);
    }
  }, []);

  // ある月＋カテゴリの予算を取得
  const getBudget = (month: string, categoryId: string): number => {
    return budgetsByMonth[month]?.[categoryId] ?? 0;
  };

  // 入力変更時
  const handleBudgetChange = (categoryId: string, value: string) => {
    const num = Number(value);
    const amount = Number.isNaN(num) ? 0 : Math.max(0, num);

    setBudgetsByMonth((prev) => {
      const monthBudget = { ...(prev[targetMonth] || {}) };
      monthBudget[categoryId] = amount;
      return {
        ...prev,
        [targetMonth]: monthBudget,
      };
    });
  };

  // 支出カテゴリ合計
  const totalBudgetForTargetMonth = (() => {
    const monthBudget = budgetsByMonth[targetMonth] || {};
    return expenseCategories.reduce((sum, cat) => {
      const v = monthBudget[cat.id] ?? 0;
      return sum + (Number.isFinite(v) ? v : 0);
    }, 0);
  })();

  // カテゴリ追加
  const addCategory = (type: CategoryType) => {
    const newCategory: Category = {
      id: `cat-${type}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      name: "",
      type,
    };

    if (type === "expense") {
      setExpenseCategories((prev) => [...prev, newCategory]);
    } else {
      setIncomeCategories((prev) => [...prev, newCategory]);
    }
  };

  // カテゴリ名変更
  const updateCategoryName = (
    type: CategoryType,
    id: string,
    name: string
  ) => {
    const updater = (list: Category[]) =>
      list.map((c) => (c.id === id ? { ...c, name } : c));

    if (type === "expense") {
      setExpenseCategories((prev) => updater(prev));
    } else {
      setIncomeCategories((prev) => updater(prev));
    }
  };

  // カテゴリ削除
  const deleteCategory = (type: CategoryType, id: string) => {
    if (
      !window.confirm("このカテゴリを削除しますか？\n関連する予算設定も消えます。")
    ) {
      return;
    }

    if (type === "expense") {
      setExpenseCategories((prev) => prev.filter((c) => c.id !== id));
    } else {
      setIncomeCategories((prev) => prev.filter((c) => c.id !== id));
    }

    // 予算からも削除
    setBudgetsByMonth((prev) => {
      const next: CategoryBudgetsByMonth = {};
      for (const [month, monthBudget] of Object.entries(prev)) {
        const filtered: { [categoryId: string]: number } = {};
        for (const [catId, amount] of Object.entries(monthBudget)) {
          if (catId === id) continue;
          filtered[catId] = amount;
        }
        next[month] = filtered;
      }
      return next;
    });
  };

  // 保存
  const handleSaveAll = () => {
    if (typeof window === "undefined") return;

    // 空行は削除
    const cleanedExpense = expenseCategories
      .map((c) => ({ ...c, name: c.name.trim() }))
      .filter((c) => c.name !== "");

    const cleanedIncome = incomeCategories
      .map((c) => ({ ...c, name: c.name.trim() }))
      .filter((c) => c.name !== "");

    const allCategories: Category[] = [...cleanedExpense, ...cleanedIncome];

    if (allCategories.length === 0) {
      alert("カテゴリが1つもありません。少なくとも1つは登録してください。");
      return;
    }

    // 予算：存在しないカテゴリの分を削除
    const validIds = new Set(allCategories.map((c) => c.id));
    const cleanedBudgets: CategoryBudgetsByMonth = {};

    for (const [month, monthBudget] of Object.entries(budgetsByMonth)) {
      const filtered: { [categoryId: string]: number } = {};
      for (const [catId, amount] of Object.entries(monthBudget)) {
        if (!validIds.has(catId)) continue;
        if (!Number.isFinite(amount) || amount <= 0) continue;
        filtered[catId] = amount;
      }
      if (Object.keys(filtered).length > 0) {
        cleanedBudgets[month] = filtered;
      }
    }

    // 「同じ内容を適用する月数」のコピー処理
    const copyNum = Math.max(1, Number(monthsToCopy) || 1);
    const baseBudget = cleanedBudgets[targetMonth] || {};

    for (let i = 1; i < copyNum; i++) {
      const m = addMonthsToMonthStr(targetMonth, i);
      cleanedBudgets[m] = { ...baseBudget };
    }

    // 保存
    try {
      localStorage.setItem(CATEGORIES_KEY, JSON.stringify(allCategories));
      localStorage.setItem(
        CATEGORY_BUDGETS_KEY,
        JSON.stringify(cleanedBudgets)
      );
      setExpenseCategories(cleanedExpense);
      setIncomeCategories(cleanedIncome);
      setBudgetsByMonth(cleanedBudgets);
      alert("カテゴリと予算を保存しました。");
    } catch (e) {
      console.error("保存に失敗しました", e);
      alert("保存中にエラーが発生しました。");
    }
  };

  return (
    <div className="page-container">
      <h1>カテゴリと月別予算の設定</h1>
      <p style={{ fontSize: 14, marginBottom: 16, lineHeight: 1.6 }}>
        普段使う「支出カテゴリ」「収入カテゴリ」と、
        <br />
        月ごとの「カテゴリ別予算」をまとめて設定するページです。
      </p>

      {/* 月別予算エリア */}
      <section className="app-card" style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 18, marginBottom: 12 }}>カテゴリ別予算</h2>

        <div
          style={{
            display: "flex",
            gap: 16,
            alignItems: "flex-end",
            flexWrap: "wrap",
            marginBottom: 12,
            fontSize: 14,
          }}
        >
          <div>
            <label style={{ display: "block", marginBottom: 4 }}>
              対象の月
            </label>
            <input
              type="month"
              value={targetMonth}
              onChange={(e) => setTargetMonth(e.target.value)}
              style={{
                padding: "4px 8px",
                borderRadius: 4,
                border: "1px solid #ccb89b",
              }}
            />
          </div>

          <div>
            <label style={{ display: "block", marginBottom: 4 }}>
              同じ内容を適用する月数
            </label>
            <input
              type="number"
              min={1}
              value={monthsToCopy}
              onChange={(e) => setMonthsToCopy(e.target.value)}
              style={{
                width: 80,
                padding: "4px 8px",
                borderRadius: 4,
                border: "1px solid #ccb89b",
                textAlign: "right",
              }}
            />{" "}
            ヶ月分
          </div>

          <div style={{ marginLeft: "auto", fontSize: 13, color: "#6b5b4a" }}>
            合計予算：{" "}
            <strong>¥{totalBudgetForTargetMonth.toLocaleString()}</strong>
          </div>
        </div>

        {expenseCategories.length === 0 ? (
          <p style={{ fontSize: 13, color: "#b3261e" }}>
            支出カテゴリがありません。「支出カテゴリ」の欄から追加してください。
          </p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: 13,
              }}
            >
              <thead>
                <tr>
                  <th
                    style={{
                      textAlign: "left",
                      padding: "4px 6px",
                      borderBottom: "1px solid #e0c9a7",
                    }}
                  >
                    カテゴリ
                  </th>
                  <th
                    style={{
                      textAlign: "right",
                      padding: "4px 6px",
                      borderBottom: "1px solid #e0c9a7",
                    }}
                  >
                    予算（円）
                  </th>
                </tr>
              </thead>
              <tbody>
                {expenseCategories.map((cat) => (
                  <tr key={cat.id}>
                    <td style={{ padding: "4px 6px" }}>{cat.name}</td>
                    <td style={{ padding: "4px 6px", textAlign: "right" }}>
                      <input
                        type="number"
                        value={getBudget(targetMonth, cat.id) || ""}
                        onChange={(e) =>
                          handleBudgetChange(cat.id, e.target.value)
                        }
                        style={{
                          width: 120,
                          padding: "4px 6px",
                          borderRadius: 4,
                          border: "1px solid #ccb89b",
                          textAlign: "right",
                        }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* カテゴリ設定エリア */}
      <section className="app-card" style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 18, marginBottom: 12 }}>支出カテゴリ</h2>
        <p style={{ fontSize: 13, marginBottom: 8, color: "#6b5b4a" }}>
          家賃・食費・日用品など、「お金が出ていく」項目のカテゴリです。
        </p>

        {expenseCategories.map((cat) => (
          <div
            key={cat.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 6,
            }}
          >
            <input
              type="text"
              value={cat.name}
              onChange={(e) =>
                updateCategoryName("expense", cat.id, e.target.value)
              }
              placeholder="カテゴリ名"
              style={{
                flex: 1,
                padding: "4px 8px",
                borderRadius: 4,
                border: "1px solid #ccb89b",
              }}
            />
            <button
              type="button"
              onClick={() => deleteCategory("expense", cat.id)}
              style={{
                padding: "2px 10px",
                fontSize: 12,
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

        <button
          type="button"
          onClick={() => addCategory("expense")}
          style={{
            marginTop: 8,
            padding: "4px 10px",
            fontSize: 13,
            borderRadius: 999,
            border: "1px solid #b58b5a",
            backgroundColor: "#fffaf0",
            color: "#5d4330",
            cursor: "pointer",
          }}
        >
          ＋ 支出カテゴリを追加
        </button>
      </section>

      <section className="app-card">
        <h2 style={{ fontSize: 18, marginBottom: 12 }}>収入カテゴリ</h2>
        <p style={{ fontSize: 13, marginBottom: 8, color: "#6b5b4a" }}>
          給与、副業、ボーナスなど、「お金が入ってくる」項目のカテゴリです。
          <br />
          （今のところ収入カテゴリには予算額は設定しません）
        </p>

        {incomeCategories.map((cat) => (
          <div
            key={cat.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 6,
            }}
          >
            <input
              type="text"
              value={cat.name}
              onChange={(e) =>
                updateCategoryName("income", cat.id, e.target.value)
              }
              placeholder="カテゴリ名"
              style={{
                flex: 1,
                padding: "4px 8px",
                borderRadius: 4,
                border: "1px solid #ccb89b",
              }}
            />
            <button
              type="button"
              onClick={() => deleteCategory("income", cat.id)}
              style={{
                padding: "2px 10px",
                fontSize: 12,
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

        <button
          type="button"
          onClick={() => addCategory("income")}
          style={{
            marginTop: 8,
            padding: "4px 10px",
            fontSize: 13,
            borderRadius: 999,
            border: "1px solid #b58b5a",
            backgroundColor: "#fffaf0",
            color: "#5d4330",
            cursor: "pointer",
          }}
        >
          ＋ 収入カテゴリを追加
        </button>
      </section>

      <div style={{ marginTop: 16, textAlign: "right" }}>
        <button
          type="button"
          onClick={handleSaveAll}
          style={{
            padding: "8px 18px",
            borderRadius: 6,
            border: "none",
            backgroundColor: "#b58b5a",
            color: "#fff",
            fontSize: 14,
            cursor: "pointer",
          }}
        >
          カテゴリと予算を保存する
        </button>
      </div>

      <div style={{ marginTop: 12, fontSize: 13 }}>
        ← <a href="/settings">設定トップに戻る</a>
      </div>
    </div>
  );
}