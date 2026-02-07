"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePaymentMethods } from "../../hooks/usePaymentMethods";
import { PaymentMethod, PaymentMethodType } from "../../types";

const CARD_PRESETS = [
  { label: "末締め / 翌月27日払い (楽天など)", close: 99, pay: 27 },
  { label: "15日締め / 翌月10日払い (JCBなど)", close: 15, pay: 10 },
  { label: "末締め / 翌月10日払い", close: 99, pay: 10 },
];

export default function AccountSettingsPage() {
  const { paymentMethods, loading, addPaymentMethod, updatePaymentMethod, deletePaymentMethod, refresh } = usePaymentMethods();

  // Balance Update (Debounced or Blur? For MVP, onBlur is safer, or simplified local state)
  // For simplicity, we trigger update immediately but usually that spams DB.
  // Better: local state for input, update on blur?
  // MVP: Let's simpler: Just update on Blur. To do that, we need local state or uncontrolled input.
  // Simplest for now: Use a small component or just simple prompt? 
  // No, the UI has inputs list.

  const handleUpdateBalance = async (id: string, val: string) => {
    // Allow empty string for visual, but don't save NaN
    if (val === "") return;
    const num = Number(val);
    if (isNaN(num)) return;

    try {
      await updatePaymentMethod(id, { balance: num });
    } catch (e) {
      console.error("Failed to update balance");
    }
  };

  // Editing State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<PaymentMethod>>({});
  const [isSaving, setIsSaving] = useState(false);

  // Grouping
  const assets = paymentMethods.filter(a => a.type !== "card");
  const liabilities = paymentMethods.filter(a => a.type === "card");

  const handleAddAccount = (type: PaymentMethodType) => {
    const newAcc: Partial<PaymentMethod> = {
      type,
      name: "",
      closing_day: type === "card" ? 99 : undefined,
      payment_day: type === "card" ? 27 : undefined
    };
    setEditingId("new");
    setEditForm(newAcc);
  };

  const startEdit = (acc: PaymentMethod) => {
    setEditingId(acc.id);
    setEditForm({ ...acc });
  };

  const saveEdit = async () => {
    if (!editForm.name || !editForm.name.trim()) {
      alert("名称を入力してください");
      return;
    }

    // Card Guard
    if (editForm.type === "card") {
      if (!editForm.closing_day || !editForm.payment_day) {
        alert("カードの場合、締め日と支払日は必須です。\nプリセットから選ぶか、手動で入力してください。");
        return;
      }
    }

    try {
      setIsSaving(true);
      if (editingId === "new") {
        await addPaymentMethod(editForm as any);
      } else if (editingId) {
        await updatePaymentMethod(editingId, editForm);
      }
      setEditingId(null);
      setEditForm({});
      refresh(); // Reload to be safe
    } catch (e) {
      alert("保存に失敗しました");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("削除してよろしいですか？\n※この支払い方法に紐づく過去の取引がある場合、集計に影響が出る可能性があります。")) return;
    try {
      await deletePaymentMethod(id);
    } catch (e) {
      alert("削除に失敗しました");
    }
  };

  const applyPreset = (presetIndex: number) => {
    const p = CARD_PRESETS[presetIndex];
    setEditForm(prev => ({ ...prev, closing_day: p.close, payment_day: p.pay }));
  };

  if (loading) return <div className="p-4">Loading...</div>;

  return (
    <div className="page-container" style={{ paddingBottom: 80 }}>
      <h1>支払い方法（カード・口座）設定</h1>
      <p style={{ fontSize: 13, color: "#666", marginBottom: 20 }}>
        現金、銀行口座、クレジットカードの設定を行います。<br />
        特にカードは「締め日・支払日」を設定することで、資金繰り予測に反映されます。
      </p>

      {/* Assets Section */}
      <div className="app-card" style={{ marginBottom: "24px" }}>
        <h2 style={{ display: "flex", justifyContent: "space-between" }}>
          <span>💰 支払い元 (銀行/財布/Pay)</span>
        </h2>

        <div className="list-container">
          {assets.map(acc => (
            <div key={acc.id} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px 0", borderBottom: "1px solid #eee" }}>
              <div style={{ fontSize: 24, width: 40, textAlign: "center" }}>
                {acc.type === "bank" ? "🏦" : acc.type === "cash" ? "👛" : "📱"}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600 }}>{acc.name}</div>
                <div style={{ fontSize: 11, color: "#888" }}>{acc.type.toUpperCase()}</div>
              </div>
              <button onClick={() => startEdit(acc)} style={{ fontSize: 12, padding: "4px 8px", background: "#f0f0f0", borderRadius: "4px", border: "none" }}>設定</button>
            </div>
          ))}
          {assets.length === 0 && <p style={{ fontSize: 12, color: "#999", padding: 10 }}>登録なし</p>}
        </div>

        <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
          <button onClick={() => handleAddAccount("bank")} className="btn-secondary" style={{ fontSize: 12 }}>+ 銀行追加</button>
          <button onClick={() => handleAddAccount("cash")} className="btn-secondary" style={{ fontSize: 12 }}>+ 現金/財布追加</button>
        </div>
      </div>

      {/* Liabilities Section */}
      <div className="app-card">
        <h2 style={{ display: "flex", justifyContent: "space-between", color: "#c44536" }}>
          <span>💳 クレジットカード</span>
        </h2>
        <p style={{ fontSize: 13, color: "#666", marginBottom: 12 }}>
          カード払いを選択した際、ここで設定した締め日・支払日に基づいて引き落とし予定が作成されます。
        </p>

        <div className="list-container">
          {liabilities.map(acc => (
            <div key={acc.id} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px 0", borderBottom: "1px solid #eee" }}>
              <div style={{ fontSize: 24, width: 40, textAlign: "center" }}>💳</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600 }}>{acc.name}</div>
                <div style={{ fontSize: 11, color: "#c44536" }}>
                  {/* Card date settings status */}
                  {(acc.closing_day === undefined || acc.payment_day === undefined || acc.closing_day === null) ? (
                    <span style={{ fontWeight: "bold", background: "#ffeeba", padding: "2px 4px", borderRadius: 4 }}>⚠️ 日付未設定</span>
                  ) : (
                    <span>{acc.closing_day === 99 ? "末" : acc.closing_day}日締 / {acc.payment_day}日払</span>
                  )}
                </div>
              </div>
              <button onClick={() => startEdit(acc)} style={{ fontSize: 12, padding: "4px 8px", background: "#f0f0f0", borderRadius: "4px", border: "none" }}>設定</button>
            </div>
          ))}
          {liabilities.length === 0 && <p style={{ fontSize: 12, color: "#999", padding: 10 }}>登録なし</p>}
        </div>

        <div style={{ marginTop: 16 }}>
          <button onClick={() => handleAddAccount("card")} className="btn-secondary" style={{ fontSize: 12 }}>+ カード追加</button>
        </div>
      </div>

      <div style={{ marginTop: 24, textAlign: "center" }}>
        <Link href="/settings" style={{ textDecoration: "underline", color: "#666" }}>設定トップへ戻る</Link>
      </div>

      {/* Edit Modal / Sheet */}
      {(editingId || editForm.id) && (
        <div className="modal-overlay" style={{ display: "flex", alignItems: "center", justifyContent: "center", position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(0,0,0,0.5)", zIndex: 1000 }}>
          <div className="app-card" style={{ width: "90%", maxWidth: "400px", margin: 0 }}>
            <h3>{editingId === "new" ? "新規追加" : "設定の編集"}</h3>

            <div className="form-group">
              <label>名称</label>
              <input type="text" className="form-input" value={editForm.name || ""} onChange={e => setEditForm({ ...editForm, name: e.target.value })} placeholder="例: メインバンク / 楽天カード" />
            </div>

            {editForm.type === "card" && (
              <div style={{ background: "#fff5f5", padding: "12px", borderRadius: "8px", margin: "12px 0" }}>
                <label style={{ fontWeight: "bold", display: "block", marginBottom: 8, color: "#c44536" }}>締め日・支払日 (必須)</label>

                <div style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: 12 }}>プリセットから選択</label>
                  <select className="form-select" onChange={e => applyPreset(Number(e.target.value))}>
                    <option value="">-- 選択してください --</option>
                    {CARD_PRESETS.map((p, idx) => (
                      <option key={idx} value={idx}>{p.label}</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: "flex", gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 12 }}>締め日</label>
                    <input type="number" className="form-input" value={editForm.closing_day || ""} onChange={e => setEditForm({ ...editForm, closing_day: Number(e.target.value) })} placeholder="99=末" />
                  </div>
                  <div>
                    <label style={{ fontSize: 12 }}>支払日</label>
                    <input type="number" className="form-input" value={editForm.payment_day || ""} onChange={e => setEditForm({ ...editForm, payment_day: Number(e.target.value) })} />
                  </div>
                </div>
                <p style={{ fontSize: 11, color: "#666", marginTop: 4 }}>※ 末日は 99 と入力してください</p>
              </div>
            )}

            <div style={{ display: "flex", gap: "12px", marginTop: "24px" }}>
              {editingId !== "new" && (
                <button onClick={() => handleDelete(editingId!)} style={{ color: "red", border: "none", background: "none", marginRight: "auto" }}>削除</button>
              )}
              <button onClick={() => { setEditingId(null); setEditForm({}); }} className="btn-secondary">キャンセル</button>
              <button onClick={saveEdit} disabled={isSaving} className="btn-primary">{isSaving ? "保存中..." : "保存"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
