"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export type FixedMoneyType = "income" | "expense";
export type FixedMoneySubType = "salary" | "rent" | "subscription" | "loan" | "other";

export type FixedMoneyItem = {
  id: string;
  name: string;
  amount: number; // Always positive
  type: FixedMoneyType;
  subType: FixedMoneySubType;

  // Timeline
  day: number; // 1-31

  // Logic for specific types
  paymentSourceId?: string;

  // Loan Specific
  totalInstallments?: number;
  currentInstallment?: number;
  startDate?: string;
};

// Legacy Types for Migration
type LegacyIncomeSettings = {
  monthlyIncome: number;
  payday: number;
  startDate?: string;
  depositAccountId?: string;
};
type LegacySubscription = {
  id: string;
  name: string;
  amount: number;
  nextPaymentDate: string; // YYYY-MM-DD
};
type LegacyLoan = {
  id: string;
  name: string;
  amountPerPayment: number;
  paymentDay: number;
  startDate: string;
  numberOfPayments: number;
};
type LegacySettings = {
  subscriptions?: LegacySubscription[];
  loans?: LegacyLoan[];
  fixed_money?: FixedMoneyItem[];
  [key: string]: any;
};

export default function FixedMoneyPage() {
  const [items, setItems] = useState<FixedMoneyItem[]>([]);
  const [isMigrated, setIsMigrated] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<FixedMoneyItem>>({});

  useEffect(() => {
    if (typeof window === "undefined") return;

    const settingsRaw = localStorage.getItem("settings");
    const incomeRaw = localStorage.getItem("incomeSettings");

    let settings: LegacySettings = settingsRaw ? JSON.parse(settingsRaw) : {};
    let currentItems: FixedMoneyItem[] = settings.fixed_money || [];

    // MIGRATION LOGIC
    // Only run if fixed_money is empty AND we have legacy data
    const hasLegacyIncome = !!incomeRaw;
    const hasLegacySub = !!(settings.subscriptions && settings.subscriptions.length > 0);
    const hasLegacyLoan = !!(settings.loans && settings.loans.length > 0);

    if (currentItems.length === 0 && (hasLegacyIncome || hasLegacySub || hasLegacyLoan)) {
      console.log("Starting Fixed Money Migration...");

      // 1. Income
      if (incomeRaw) {
        const inc: LegacyIncomeSettings = JSON.parse(incomeRaw);
        if (inc.monthlyIncome > 0) {
          currentItems.push({
            id: `fixed-inc-${Date.now()}`,
            name: "給料",
            amount: inc.monthlyIncome,
            type: "income",
            subType: "salary",
            day: inc.payday || 25,
            paymentSourceId: inc.depositAccountId
          });
        }
        // Cleanup
        localStorage.removeItem("incomeSettings");
      }

      // 2. Subscriptions
      if (settings.subscriptions) {
        settings.subscriptions.forEach(sub => {
          // Try to parse day from nextPaymentDate
          let day = 1;
          if (sub.nextPaymentDate) {
            day = new Date(sub.nextPaymentDate).getDate();
          }
          currentItems.push({
            id: `fixed-sub-${sub.id}`,
            name: sub.name,
            amount: sub.amount,
            type: "expense",
            subType: "subscription",
            day: day
          });
        });
        delete settings.subscriptions;
      }

      // 3. Loans
      if (settings.loans) {
        settings.loans.forEach(loan => {
          currentItems.push({
            id: `fixed-loan-${loan.id}`,
            name: loan.name,
            amount: loan.amountPerPayment,
            type: "expense",
            subType: "loan",
            day: loan.paymentDay || 27,
            totalInstallments: loan.numberOfPayments,
            startDate: loan.startDate
          });
        });
        delete settings.loans;
      }

      // Save
      settings.fixed_money = currentItems;
      localStorage.setItem("settings", JSON.stringify(settings));
      setIsMigrated(true);
      setTimeout(() => setIsMigrated(false), 5000);
    }

    setItems(currentItems);
  }, []);

  const saveItems = (newItems: FixedMoneyItem[]) => {
    setItems(newItems);
    const raw = localStorage.getItem("settings");
    const settings = raw ? JSON.parse(raw) : {};
    settings.fixed_money = newItems;
    localStorage.setItem("settings", JSON.stringify(settings));
  };

  const handleAddItem = () => {
    const newItem: FixedMoneyItem = {
      id: `fixed-${Date.now()}`,
      name: "",
      amount: 0,
      type: "expense",
      subType: "subscription",
      day: 25
    };
    setEditingId(newItem.id);
    setEditForm(newItem);
  };

  const startEdit = (item: FixedMoneyItem) => {
    setEditingId(item.id);
    setEditForm({ ...item });
  };

  const saveEdit = () => {
    if (!editForm.name || !editForm.amount || !editForm.day) {
      alert("名称、金額、日付は必須です");
      return;
    }

    let updated = [...items];
    if (editingId && items.some(i => i.id === editingId)) {
      updated = updated.map(i => i.id === editingId ? { ...i, ...editForm } as FixedMoneyItem : i);
    } else {
      updated.push(editForm as FixedMoneyItem);
    }

    // Sort by day
    updated.sort((a, b) => a.day - b.day);

    saveItems(updated);
    setEditingId(null);
    setEditForm({});
  };

  const deleteItem = (id: string) => {
    if (!confirm("削除してよろしいですか？")) return;
    const updated = items.filter(i => i.id !== id);
    saveItems(updated);
  };

  // Calculate Totals
  const totalIncome = items.filter(i => i.type === "income").reduce((sum, i) => sum + i.amount, 0);
  const totalExpense = items.filter(i => i.type === "expense").reduce((sum, i) => sum + i.amount, 0);
  const balance = totalIncome - totalExpense;

  return (
    <div className="page-container" style={{ paddingBottom: 80 }}>
      <h1>毎月のお金（固定費・収入）</h1>

      {isMigrated && (
        <div className="animate-fade-in" style={{ padding: "12px", background: "#d4edda", color: "#155724", borderRadius: "8px", marginBottom: "16px" }}>
          ✓ 旧「収入・サブスク・ローン」設定を統合しました。
        </div>
      )}

      <p style={{ fontSize: 13, color: "#666", marginBottom: 16 }}>
        毎月決まった日に動くお金を管理します。<br />
        給料、家賃、サブスク、ローン返済などを登録してください。
      </p>

      <div className="app-card" style={{ background: "#fbf7eb", border: "1px solid #e4d6bf", marginBottom: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
          <span style={{ fontSize: 12, color: "#666" }}>月の固定収支予測</span>
          <span style={{ fontWeight: "bold", color: balance >= 0 ? "#155724" : "#c44536" }}>
            {balance >= 0 ? "+" : ""}¥{balance.toLocaleString()}
          </span>
        </div>
        <div style={{ display: "flex", gap: 12, fontSize: 14 }}>
          <div style={{ flex: 1, padding: 8, background: "#fff", borderRadius: 4 }}>
            <div style={{ fontSize: 11, color: "#666" }}>収入合計</div>
            <div style={{ color: "#2d70b3", fontWeight: 600 }}>¥{totalIncome.toLocaleString()}</div>
          </div>
          <div style={{ flex: 1, padding: 8, background: "#fff", borderRadius: 4 }}>
            <div style={{ fontSize: 11, color: "#666" }}>支出合計</div>
            <div style={{ color: "#c44536", fontWeight: 600 }}>¥{totalExpense.toLocaleString()}</div>
          </div>
        </div>
      </div>

      <div className="timeline-container">
        {items.length === 0 && <p style={{ textAlign: "center", color: "#999", padding: 20 }}>登録されている項目はありません</p>}

        {items.map(item => (
          <div key={item.id} className="app-card" style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12, padding: "12px 16px", borderLeft: `4px solid ${item.type === "income" ? "#2d70b3" : "#c44536"}` }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: 40 }}>
              <span style={{ fontSize: 10, color: "#888" }}>毎月</span>
              <span style={{ fontSize: 20, fontWeight: 700, color: "#3b2a1a" }}>{item.day}</span>
              <span style={{ fontSize: 10, color: "#888" }}>日</span>
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 11, padding: "2px 6px", borderRadius: 4, background: "#eee", color: "#666" }}>
                  {item.subType === "salary" ? "給料" : item.subType === "rent" ? "家賃" : item.subType === "subscription" ? "サブスク" : item.subType === "loan" ? "ローン" : "その他"}
                </span>
                <span style={{ fontWeight: 600, fontSize: 15 }}>{item.name}</span>
              </div>
            </div>

            <div style={{ textAlign: "right" }}>
              <div style={{ fontWeight: 700, fontSize: 16, color: item.type === "income" ? "#2d70b3" : "#c44536" }}>
                {item.type === "income" ? "+" : "-"}¥{item.amount.toLocaleString()}
              </div>
              <button onClick={() => startEdit(item)} style={{ fontSize: 11, color: "#888", background: "none", border: "none", textDecoration: "underline", marginTop: 4 }}>
                編集
              </button>
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 24, textAlign: "center" }}>
        <button onClick={handleAddItem} className="btn-primary" style={{ width: "100%", padding: 12, fontSize: 16 }}>
          + 新しく追加する
        </button>
      </div>

      <div style={{ marginTop: 24, textAlign: "center" }}>
        <Link href="/settings" style={{ textDecoration: "underline", color: "#666" }}>設定トップへ戻る</Link>
      </div>

      {/* Edit Modal */}
      {(editingId || editForm.id) && (
        <div className="modal-overlay" style={{ display: "flex", alignItems: "center", justifyContent: "center", position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(0,0,0,0.5)", zIndex: 1000 }}>
          <div className="app-card" style={{ width: "90%", maxWidth: "400px", margin: 0 }}>
            <h3>{editingId ? "編集" : "新規追加"}</h3>

            <div className="form-group">
              <label>種類</label>
              <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                <button
                  onClick={() => setEditForm({ ...editForm, type: "income", subType: "salary" })}
                  style={{ flex: 1, padding: 8, borderRadius: 4, border: "1px solid #2d70b3", background: editForm.type === "income" ? "#e6f0fa" : "#fff", color: "#2d70b3" }}
                >
                  収入 (給料など)
                </button>
                <button
                  onClick={() => setEditForm({ ...editForm, type: "expense", subType: "subscription" })}
                  style={{ flex: 1, padding: 8, borderRadius: 4, border: "1px solid #c44536", background: editForm.type === "expense" ? "#fae6e6" : "#fff", color: "#c44536" }}
                >
                  支出 (固定費)
                </button>
              </div>
            </div>

            <div className="form-group">
              <label>タグ</label>
              <select
                className="form-select"
                value={editForm.subType}
                onChange={e => setEditForm({ ...editForm, subType: e.target.value as FixedMoneySubType })}
              >
                {editForm.type === "income" ? (
                  <>
                    <option value="salary">給料</option>
                    <option value="other">臨時収入・その他</option>
                  </>
                ) : (
                  <>
                    <option value="rent">家賃/住宅ローン</option>
                    <option value="subscription">サブスク</option>
                    <option value="loan">ローン返済</option>
                    <option value="other">その他固定費</option>
                  </>
                )}
              </select>
            </div>

            <div className="form-group">
              <label>名称</label>
              <input type="text" className="form-input" value={editForm.name || ""} onChange={e => setEditForm({ ...editForm, name: e.target.value })} placeholder="例: 家賃、Netflix" />
            </div>

            <div style={{ display: "flex", gap: 12 }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label>毎月の日付 (1-31)</label>
                <input type="number" className="form-input" min={1} max={31} value={editForm.day || ""} onChange={e => setEditForm({ ...editForm, day: Number(e.target.value) })} />
              </div>
              <div className="form-group" style={{ flex: 2 }}>
                <label>金額</label>
                <input type="number" className="form-input" value={editForm.amount || ""} onChange={e => setEditForm({ ...editForm, amount: Number(e.target.value) })} />
              </div>
            </div>

            {editForm.subType === "loan" && (
              <div className="form-group" style={{ background: "#f9f9f9", padding: 8, borderRadius: 4 }}>
                <label style={{ fontSize: 12 }}>ローン詳細 (任意)</label>
                <div style={{ display: "flex", gap: 8 }}>
                  <input type="number" placeholder="総回数" className="form-input" value={editForm.totalInstallments || ""} onChange={e => setEditForm({ ...editForm, totalInstallments: Number(e.target.value) })} style={{ fontSize: 12 }} />
                  <input type="date" className="form-input" value={editForm.startDate || ""} onChange={e => setEditForm({ ...editForm, startDate: e.target.value })} style={{ fontSize: 12 }} />
                </div>
              </div>
            )}

            <div style={{ display: "flex", gap: "12px", marginTop: "24px" }}>
              {editingId && (
                <button onClick={() => deleteItem(editingId)} style={{ color: "red", border: "none", background: "none", marginRight: "auto" }}>削除</button>
              )}
              <button onClick={() => { setEditingId(null); setEditForm({}); }} className="btn-secondary">キャンセル</button>
              <button onClick={saveEdit} className="btn-primary">保存</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
