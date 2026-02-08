"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";
import Link from "next/link";
import { useCategories } from "../../hooks/useCategories";
import { Category } from "../../types";
import Skeleton from "../../components/Skeleton";
import { ChevronRight, Trash2, Edit2, Archive, ArchiveRestore } from "lucide-react";

type CategoryBudgetsByMonth = {
  [month: string]: {
    [categoryId: string]: number;
  };
};

// YYYY-MM
function getCurrentMonthStr(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export default function CategoryAndBudgetSettingsPage() {
  const { categories, loading, addCategory, updateCategory, toggleArchiveCategory } = useCategories();

  // Budget State
  const [targetMonth, setTargetMonth] = useState<string>(getCurrentMonthStr());
  const [budgets, setBudgets] = useState<{ [categoryId: string]: number }>({});
  const [budgetLoading, setBudgetLoading] = useState(false);

  // Filter Categories
  const activeCategories = categories.filter(c => !c.is_archived);
  const archivedCategories = categories.filter(c => c.is_archived);

  // Edit State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tempName, setTempName] = useState("");
  const [newCatName, setNewCatName] = useState("");

  // Load Budget for selected month
  useEffect(() => {
    const loadBudget = async () => {
      setBudgetLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [yStr, mStr] = targetMonth.split("-");

      const { data } = await supabase
        .from("category_budgets")
        .select("category, amount")
        .eq("user_id", user.id)
        .eq("year", parseInt(yStr))
        .eq("month", parseInt(mStr));

      const map: { [id: string]: number } = {};

      // Map Name back to ID
      data?.forEach((row: any) => {
        const cat = categories.find(c => c.name === row.category);
        if (cat) {
          map[cat.id] = row.amount;
        }
      });

      setBudgets(map);
      setBudgetLoading(false);
    };

    if (categories.length > 0) {
      loadBudget();
    }
  }, [targetMonth, categories]);

  const handleStartEdit = (cat: Category) => {
    setEditingId(cat.id);
    setTempName(cat.name);
  };

  const handleSaveName = async (id: string) => {
    if (!tempName.trim()) return;
    await updateCategory(id, { name: tempName });
    setEditingId(null);
  };

  const handleAdd = async () => {
    if (!newCatName.trim()) return;
    await addCategory(newCatName);
    setNewCatName("");
  };

  const handleBudgetChange = (id: string, val: string) => {
    const num = Number(val);
    setBudgets(prev => ({ ...prev, [id]: num }));
  };

  const saveBudgets = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [yStr, mStr] = targetMonth.split("-");
    const year = parseInt(yStr);
    const month = parseInt(mStr);

    const rows = Object.entries(budgets).map(([id, amount]) => {
      const cat = categories.find(c => c.id === id);
      if (!cat) return null;
      return {
        user_id: user.id,
        year,
        month,
        category: cat.name, // Storing Name as FK (Legacy)
        amount
      };
    }).filter(Boolean);

    // Perform upsert
    const { error } = await supabase
      .from("category_budgets")
      .upsert(rows as any, { onConflict: "user_id,year,month,category" });

    if (error) {
      alert("保存に失敗しました");
    } else {
      alert("保存しました");
    }
  };

  if (loading) {
    return (
      <div className="page-container" style={{ paddingBottom: 100 }}>
        <h1 className="text-xl font-bold text-[#3b2a1a] mb-6">カテゴリ設定 & 予算</h1>
        <div className="flex flex-col gap-4">
          <Skeleton height={200} />
          <Skeleton height={150} />
        </div>
      </div>
    );
  }

  return (
    <div className="page-container" style={{ paddingBottom: 100 }}>
      <h1 className="text-xl font-bold text-[#3b2a1a] mb-6">カテゴリ設定 & 予算</h1>

      {/* 1. Category Management */}
      <section className="app-card">
        <h2 className="text-base font-bold text-[#3b2a1a] mb-2">カテゴリ管理</h2>
        <p className="text-xs text-[#8c7b6c] mb-4">
          利用するカテゴリを管理します。使わなくなったカテゴリは「アーカイブ」することで、選択肢から隠すことができます（過去のデータは保持されます）。
        </p>

        <div className="list-container">
          {activeCategories.map(cat => (
            <div key={cat.id} className="flex items-center justify-between py-3 border-b border-[#f5efe6] last:border-0">
              {editingId === cat.id ? (
                <div className="flex flex-1 gap-2">
                  <input
                    className="form-input flex-1"
                    value={tempName}
                    onChange={e => setTempName(e.target.value)}
                    autoFocus
                  />
                  <button onClick={() => handleSaveName(cat.id)} className="btn-primary text-xs py-1 px-3 h-auto">確定</button>
                </div>
              ) : (
                <div className="flex-1 font-medium text-[#3b2a1a]">{cat.name}</div>
              )}

              <div className="flex gap-2 ml-4">
                {editingId !== cat.id && (
                  <button
                    onClick={() => handleStartEdit(cat)}
                    className="bg-gray-100 text-gray-600 rounded p-2 hover:bg-gray-200 transition-colors"
                    title="名称変更"
                  >
                    <Edit2 size={16} />
                  </button>
                )}
                <button
                  onClick={() => toggleArchiveCategory(cat.id, false)}
                  className="bg-red-50 text-red-600 rounded p-2 hover:bg-red-100 transition-colors"
                  title="アーカイブ"
                >
                  <Archive size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 flex gap-2">
          <input
            className="form-input flex-1"
            placeholder="新しいカテゴリ名"
            value={newCatName}
            onChange={e => setNewCatName(e.target.value)}
          />
          <button onClick={handleAdd} className="btn-secondary whitespace-nowrap" disabled={!newCatName.trim()}>
            追加
          </button>
        </div>
      </section>

      {/* 2. Archived */}
      {archivedCategories.length > 0 && (
        <section className="app-card bg-gray-50 border-dashed border-gray-300">
          <details>
            <summary className="cursor-pointer font-bold text-gray-500 text-sm py-1">
              アーカイブ済み ({archivedCategories.length})
            </summary>
            <div className="mt-4 flex flex-col gap-2">
              {archivedCategories.map(cat => (
                <div key={cat.id} className="flex justify-between items-center py-2 border-b border-gray-200 last:border-0">
                  <span className="text-gray-400 line-through text-sm">{cat.name}</span>
                  <button
                    onClick={() => toggleArchiveCategory(cat.id, true)}
                    className="flex items-center gap-1 text-xs bg-emerald-50 text-emerald-700 px-2 py-1.5 rounded hover:bg-emerald-100"
                  >
                    <ArchiveRestore size={14} />
                    戻す
                  </button>
                </div>
              ))}
            </div>
          </details>
        </section>
      )}

      {/* 3. Budget */}
      <section className="app-card">
        <h2 className="text-base font-bold text-[#3b2a1a] mb-4">月別予算設定</h2>
        <div className="mb-4">
          <input
            type="month"
            value={targetMonth}
            onChange={e => setTargetMonth(e.target.value)}
            className="form-input w-auto inline-block"
          />
        </div>

        {budgetLoading ? (
          <div className="flex flex-col gap-2">
            {[1, 2, 3].map(i => <Skeleton key={i} height={40} />)}
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="table-basic w-full">
              <thead>
                <tr>
                  <th className="text-left py-2 text-sm text-[#8c7b6c]">カテゴリ</th>
                  <th className="text-right py-2 text-sm text-[#8c7b6c]">予算 (円)</th>
                </tr>
              </thead>
              <tbody>
                {activeCategories.map(cat => (
                  <tr key={cat.id} className="border-b border-[#f5efe6] last:border-0">
                    <td className="py-3 text-[#3b2a1a]">{cat.name}</td>
                    <td className="text-right py-2">
                      <input
                        type="number"
                        value={budgets[cat.id] || 0}
                        onChange={e => handleBudgetChange(cat.id, e.target.value)}
                        className="form-input text-right w-32 ml-auto"
                        inputMode="numeric"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-6 text-right">
          <button onClick={saveBudgets} className="btn-primary w-full sm:w-auto">
            予算を保存
          </button>
        </div>
      </section>

      <div className="mt-8">
        <Link href="/settings" className="flex items-center text-[#8c7b6c] text-sm hover:underline">
          <ChevronRight className="rotate-180 mr-1" size={16} />
          設定トップへ戻る
        </Link>
      </div>
    </div>
  );
}
