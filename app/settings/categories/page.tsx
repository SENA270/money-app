"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";
import Link from "next/link";
import { useCategories } from "../../hooks/useCategories";
import { Category } from "../../types";

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

      // We link Budget by Category Name for now (legacy compatibility) OR we should use ID?
      // The existing table 'category_budgets' uses 'category' (text).
      // To support renaming properly, we should ideally use IDs, but that requires table migration.
      // For this refactor, we will map ID -> Name -> DB.

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

  if (loading) return <div className="p-4">Loading...</div>;

  return (
    <div className="page-container" style={{ paddingBottom: 100 }}>
      <h1>カテゴリ設定 & 予算</h1>

      {/* 1. Category Management */}
      <section className="app-card">
        <h2>カテゴリ管理</h2>
        <p className="text-sm text-gray mb-4">
          利用するカテゴリを管理します。使わなくなったカテゴリは「アーカイブ」することで、選択肢から隠すことができます（過去のデータは保持されます）。
        </p>

        <div className="list-container">
          {activeCategories.map(cat => (
            <div key={cat.id} className="flex item-center gap-2 py-2 border-b border-light-gray" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #eee' }}>
              {editingId === cat.id ? (
                <div style={{ flex: 1, display: 'flex', gap: 8 }}>
                  <input
                    className="form-input"
                    value={tempName}
                    onChange={e => setTempName(e.target.value)}
                    style={{ flex: 1 }}
                  />
                  <button onClick={() => handleSaveName(cat.id)} className="btn-primary" style={{ padding: '4px 8px', fontSize: 12 }}>確定</button>
                </div>
              ) : (
                <div style={{ flex: 1, fontWeight: 600 }}>{cat.name}</div>
              )}

              <div style={{ display: 'flex', gap: 8 }}>
                {editingId !== cat.id && (
                  <button onClick={() => handleStartEdit(cat)} style={{ fontSize: 12, borderRadius: 4, padding: '4px 8px', background: '#f0f0f0', border: 'none' }}>名称変更</button>
                )}
                <button onClick={() => toggleArchiveCategory(cat.id, false)} style={{ fontSize: 12, borderRadius: 4, padding: '4px 8px', background: '#ffebee', color: '#c62828', border: 'none' }}>アーカイブ</button>
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
          <input
            className="form-input"
            placeholder="新しいカテゴリ名"
            value={newCatName}
            onChange={e => setNewCatName(e.target.value)}
            style={{ flex: 1 }}
          />
          <button onClick={handleAdd} className="btn-secondary" disabled={!newCatName.trim()}>追加</button>
        </div>
      </section>

      {/* 2. Archived */}
      {archivedCategories.length > 0 && (
        <section className="app-card" style={{ background: '#f9f9f9' }}>
          <details>
            <summary style={{ cursor: 'pointer', fontWeight: 600, color: '#666' }}>アーカイブ済み ({archivedCategories.length})</summary>
            <div className="list-container" style={{ marginTop: 12 }}>
              {archivedCategories.map(cat => (
                <div key={cat.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #eee' }}>
                  <span style={{ color: '#999', textDecoration: 'line-through' }}>{cat.name}</span>
                  <button onClick={() => toggleArchiveCategory(cat.id, true)} style={{ fontSize: 12, background: '#e8f5e9', color: '#2e7d32', border: 'none', padding: '2px 8px', borderRadius: 4 }}>戻す</button>
                </div>
              ))}
            </div>
          </details>
        </section>
      )}

      {/* 3. Budget */}
      <section className="app-card">
        <h2>月別予算設定</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <input type="month" value={targetMonth} onChange={e => setTargetMonth(e.target.value)} className="form-input" style={{ width: 'auto' }} />
        </div>

        {budgetLoading ? <p>Loading...</p> : (
          <div className="table-wrapper">
            <table className="table-basic" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left' }}>カテゴリ</th>
                  <th style={{ textAlign: 'right' }}>予算 (円)</th>
                </tr>
              </thead>
              <tbody>
                {activeCategories.map(cat => (
                  <tr key={cat.id}>
                    <td>{cat.name}</td>
                    <td style={{ textAlign: 'right' }}>
                      <input
                        type="number"
                        value={budgets[cat.id] || 0}
                        onChange={e => handleBudgetChange(cat.id, e.target.value)}
                        className="form-input"
                        style={{ textAlign: 'right', width: 100 }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div style={{ marginTop: 16, textAlign: 'right' }}>
          <button onClick={saveBudgets} className="btn-primary">予算を保存</button>
        </div>
      </section>

      <div style={{ marginTop: 24 }}>
        <Link href="/settings">← 設定トップへ戻る</Link>
      </div>
    </div>
  );
}
