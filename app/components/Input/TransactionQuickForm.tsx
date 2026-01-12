"use client";

import { useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import Link from "next/link";
import { saveTransaction, TransactionInput } from "../../lib/transaction/saveTransaction";
import { supabase } from "../../../lib/supabaseClient";

type QuickFormProps = {
  onSuccess: () => void;
  initialValues?: {
    amount?: string;
    date?: string;
    category?: string;
    memo?: string;
  };
};

type Category = {
  id: string;
  name: string;
  type: "expense" | "income";
};

type Account = {
  id: string;
  name: string;
  type: "bank" | "wallet" | "qr" | "card";
};

export default function TransactionQuickForm({ onSuccess, initialValues }: QuickFormProps) {
  const searchParams = useSearchParams();
  const modeParam = searchParams.get("mode");
  const initialType = modeParam === "income" ? "income" : "expense"; // Default to expense if not specified

  // UI State
  const [amount, setAmount] = useState(initialValues?.amount || "");
  const [type, setType] = useState<"expense" | "income">(initialType);
  const [category, setCategory] = useState(initialValues?.category || "");
  const [loading, setLoading] = useState(false);

  // Always Visible Details
  const [date, setDate] = useState(initialValues?.date || new Date().toISOString().slice(0, 10));
  const [memo, setMemo] = useState(initialValues?.memo || "");

  // Data
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);

  // Selection
  const [selectedAccount, setSelectedAccount] = useState("");

  // Add Category State
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");

  // Add Account State
  const [isAddingAccount, setIsAddingAccount] = useState(false);
  const [newAccountName, setNewAccountName] = useState("");
  const [newAccountType, setNewAccountType] = useState<"bank" | "wallet" | "qr" | "card">("wallet");

  const ADD_NEW_VALUE = "__ADD_NEW__";

  // Load Data
  useEffect(() => {
    const load = () => {
      // 1. Categories
      const catRaw = localStorage.getItem("categories");
      let loadedCats: Category[] = [];
      if (catRaw) {
        loadedCats = JSON.parse(catRaw);
      } else {
        // Fallback
        loadedCats = [
          { id: "1", name: "食費", type: "expense" },
          { id: "2", name: "日用品", type: "expense" }
        ];
      }
      setCategories(loadedCats);

      if (!category) {
        // Default category if empty
        const defaults = loadedCats.filter(c => c.type === "expense");
        if (defaults.length > 0) setCategory(defaults[0].name);
      }

      // 2. Accounts
      const accRaw = localStorage.getItem("accounts");
      let loadedAccs: Account[] = [];
      if (accRaw) {
        loadedAccs = JSON.parse(accRaw);
      }

      // Sort by Last Used
      const lastUsed = localStorage.getItem("lastUsedAccountName");
      if (lastUsed) {
        loadedAccs.sort((a, b) => {
          if (a.name === lastUsed) return -1;
          if (b.name === lastUsed) return 1;
          return 0;
        });
      }
      setAccounts(loadedAccs);
      if (loadedAccs.length > 0 && !selectedAccount) setSelectedAccount(loadedAccs[0].name);
    };
    load();
  }, [category]); // Keeping dependency simple

  const handleSave = async () => {
    if (!amount) return;

    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Login required");

      // Resolve Type Logic
      let finalType: "expense" | "income" | "card_payment" = type;

      // If Expense and Card selected -> card_payment
      if (type === "expense") {
        const acc = accounts.find(a => a.name === selectedAccount);
        if (acc?.type === "card") {
          finalType = "card_payment";
        }
      }

      const input: TransactionInput = {
        user_id: user.id,
        amount: Number(amount),
        type: finalType,
        category: category,
        date: date,
        memo: memo,
        paymentMethod: selectedAccount
      };

      await saveTransaction(input);

      if (typeof window !== "undefined") {
        localStorage.setItem("lastUsedAccountName", selectedAccount);
      }

      setAmount("");
      setMemo("");
      onSuccess();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCategory = () => {
    if (!newCategoryName.trim()) return;

    const newCat: Category = {
      id: `cat-${Date.now()}`,
      name: newCategoryName,
      type: type
    };

    const updated = [...categories, newCat];
    setCategories(updated);
    localStorage.setItem("categories", JSON.stringify(updated));

    setCategory(newCategoryName);
    setIsAddingCategory(false);
    setNewCategoryName("");
  };

  const handleAddAccount = () => {
    if (!newAccountName.trim()) return;

    const newAcc: Account = {
      id: `${newAccountType}-${Date.now()}`,
      name: newAccountName,
      type: newAccountType
    };

    const updated = [...accounts, newAcc];
    setAccounts(updated);
    localStorage.setItem("accounts", JSON.stringify(updated));

    setSelectedAccount(newAccountName);
    setIsAddingAccount(false);
    setNewAccountName("");
  };

  const visibleCategories = categories.filter(c => c.type === type);

  return (
    <div className="app-card" style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "16px" }}>

      {/* Header: Type Switcher & Amount Compact */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        {/* Type Switcher (Compact Left) */}
        <div style={{ display: "flex", background: "#f0f0f0", borderRadius: "8px", padding: "2px", width: "120px" }}>
          <button
            onClick={() => setType("expense")}
            style={{ flex: 1, padding: "6px", borderRadius: "6px", background: type === "expense" ? "#fff" : "transparent", fontWeight: type === "expense" ? 700 : 400, border: "none", fontSize: "12px" }}
          >
            支出
          </button>
          <button
            onClick={() => setType("income")}
            style={{ flex: 1, padding: "6px", borderRadius: "6px", background: type === "income" ? "#fff" : "transparent", fontWeight: type === "income" ? 700 : 400, border: "none", fontSize: "12px" }}
          >
            収入
          </button>
        </div>

        {/* Amount (Compact Right) */}
        <div style={{ flex: 1, position: "relative" }}>
          <input
            type="number"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            placeholder="0"
            style={{
              width: "100%", fontSize: "32px", fontWeight: 700, padding: "0", border: "none", borderBottom: "2px solid #3b2a1a",
              textAlign: "right", outline: "none", background: "transparent", color: "#3b2a1a"
            }}
            inputMode="decimal"
            autoFocus
          />
          <span style={{ position: "absolute", right: 0, bottom: -18, fontSize: "11px", color: "#888" }}>円</span>
        </div>
      </div>

      {/* Row: Category & Payment (50/50 Split) */}
      <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>

        {/* Category */}
        <div style={{ flex: 1 }}>
          <label style={{ display: "block", fontSize: "11px", color: "#666", marginBottom: "4px" }}>カテゴリ</label>
          {!isAddingCategory ? (
            <select
              value={category}
              onChange={e => {
                if (e.target.value === ADD_NEW_VALUE) {
                  setIsAddingCategory(true);
                } else {
                  setCategory(e.target.value);
                }
              }}
              className="form-select"
              style={{ width: "100%", padding: "8px", fontSize: "14px", background: "#fff", border: "1px solid #ddd", borderRadius: "6px" }}
            >
              {visibleCategories.map(c => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
              <option value={ADD_NEW_VALUE} style={{ color: "#007bff", fontWeight: "bold" }}>+ 追加...</option>
            </select>
          ) : (
            <div className="animate-fade-in" style={{ padding: "4px", background: "#fff", border: "1px solid #ddd", borderRadius: "6px" }}>
              <input
                type="text"
                value={newCategoryName}
                onChange={e => setNewCategoryName(e.target.value)}
                placeholder="名称"
                style={{ width: "100%", border: "none", borderBottom: "1px solid #eee", fontSize: "13px", padding: "4px", marginBottom: "4px" }}
                autoFocus
              />
              <div style={{ display: "flex", gap: "4px" }}>
                <button onClick={handleAddCategory} className="btn-primary" style={{ flex: 1, padding: "4px", fontSize: "11px" }}>OK</button>
                <button onClick={() => setIsAddingCategory(false)} style={{ flex: 1, padding: "4px", fontSize: "11px", background: "#eee", border: "none", borderRadius: "4px" }}>戻る</button>
              </div>
            </div>
          )}
        </div>

        {/* Payment Method */}
        <div style={{ flex: 1 }}>
          <label style={{ display: "block", fontSize: "11px", color: "#666", marginBottom: "4px" }}>支払い方法</label>
          {!isAddingAccount ? (
            <select
              value={selectedAccount}
              onChange={e => {
                if (e.target.value === ADD_NEW_VALUE) {
                  setIsAddingAccount(true);
                } else {
                  setSelectedAccount(e.target.value);
                }
              }}
              className="form-select"
              style={{ width: "100%", padding: "8px", fontSize: "14px", background: "#fff", border: "1px solid #ddd", borderRadius: "6px" }}
            >
              {accounts.map(a => (
                <option key={a.id} value={a.name}>
                  {a.name}
                </option>
              ))}
              {accounts.length === 0 && <option>なし</option>}
              <option value={ADD_NEW_VALUE} style={{ color: "#007bff", fontWeight: "bold" }}>+ 追加...</option>
            </select>
          ) : (
            <div className="animate-fade-in" style={{ padding: "4px", background: "#fff", border: "1px solid #ddd", borderRadius: "6px" }}>
              <input
                type="text"
                value={newAccountName}
                onChange={e => setNewAccountName(e.target.value)}
                placeholder="名称"
                style={{ width: "100%", border: "none", borderBottom: "1px solid #eee", fontSize: "13px", padding: "4px", marginBottom: "4px" }}
                autoFocus
              />
              <select
                value={newAccountType}
                onChange={e => setNewAccountType(e.target.value as any)}
                style={{ width: "100%", marginBottom: "4px", fontSize: "11px", padding: "2px" }}
              >
                <option value="wallet">財布</option>
                <option value="bank">銀行</option>
                <option value="card">カード</option>
                <option value="qr">Pay</option>
              </select>
              <div style={{ display: "flex", gap: "4px" }}>
                <button onClick={handleAddAccount} className="btn-primary" style={{ flex: 1, padding: "4px", fontSize: "11px" }}>OK</button>
                <button onClick={() => setIsAddingAccount(false)} style={{ flex: 1, padding: "4px", fontSize: "11px", background: "#eee", border: "none", borderRadius: "4px" }}>戻る</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Row: Date & Memo */}
      <div style={{ display: "flex", gap: "12px" }}>
        <div style={{ flex: 2 }}>
          <label style={{ display: "block", fontSize: "11px", color: "#888", marginBottom: "4px" }}>日付</label>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="form-input"
            style={{ padding: "6px", fontSize: "13px" }}
          />
        </div>
        <div style={{ flex: 3 }}>
          <label style={{ display: "block", fontSize: "11px", color: "#888", marginBottom: "4px" }}>メモ (任意)</label>
          <input
            type="text"
            value={memo}
            onChange={e => setMemo(e.target.value)}
            className="form-input"
            placeholder="ランチなど"
            style={{ padding: "6px", fontSize: "13px" }}
          />
        </div>
      </div>

      <div style={{ marginTop: "24px" }}>
        <button
          onClick={handleSave}
          disabled={loading || !amount}
          className="btn-primary"
          style={{ width: "100%", padding: "12px", fontSize: "16px", fontWeight: 700, marginTop: "8px" }}
        >
          {loading ? "保存中..." : "記録する"}
        </button>
      </div>
    </div>
  );
}
