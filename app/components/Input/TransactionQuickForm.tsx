"use client";

import { useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import { saveTransaction } from "../../lib/transaction/saveTransaction";
import { getTemplates, Template, updateTemplateUsage } from "../../lib/templates";
import { getRecentTransactions } from "../../lib/transaction/getRecentTransactions";
import { supabase } from "../../../lib/supabaseClient";
import { useCategories } from "../../hooks/useCategories";
import { usePaymentMethods } from "../../hooks/usePaymentMethods";
import { getLoans, LoanWithStatus } from "../../lib/loans";
import { ArrowRightLeft, Star, Clock, ChevronRight } from "lucide-react";
import { Transaction } from "../../types";

type QuickFormProps = {
  onSuccess: () => void;
  initialValues?: {
    id?: string;
    amount?: string;
    date?: string;
    category?: string;
    categoryId?: string;
    paymentMethodId?: string;
    type?: "expense" | "income" | "repayment";
    memo?: string;
    loanId?: string;
  };
};

const LOAN_REPAYMENT_OPTION_VALUE = "__LOAN_REPAYMENT__";
const ADD_NEW_VALUE = "__ADD_NEW__";

export default function TransactionQuickForm({ onSuccess, initialValues }: QuickFormProps) {
  const searchParams = useSearchParams();
  const modeParam = searchParams.get("mode");

  // Initial type logic: default to expense unless income is specified. Repayment is now hidden under expense.
  // If initialValues.type is repayment, we start in expense mode but with isRepaymentMode=true (handled below)
  const initialType = (initialValues?.type === "income" || modeParam === "income") ? "income" : "expense";

  const { categories, addCategory, loading: catLoading } = useCategories();
  const { paymentMethods, addPaymentMethod, loading: payLoading } = usePaymentMethods();

  const [amount, setAmount] = useState(initialValues?.amount || "");
  const [type, setType] = useState<"expense" | "income">(initialType);
  const [categoryId, setCategoryId] = useState(initialValues?.categoryId || "");
  const [paymentMethodId, setPaymentMethodId] = useState(initialValues?.paymentMethodId || "");

  // Quick Actions State
  const [quickTemplates, setQuickTemplates] = useState<Template[]>([]);
  const [quickHistory, setQuickHistory] = useState<Transaction[]>([]);
  const [recentLoading, setRecentLoading] = useState(true);

  // Repayment Mode State
  const [isRepaymentMode, setIsRepaymentMode] = useState(initialValues?.type === "repayment");
  const [loanId, setLoanId] = useState(initialValues?.loanId || "");
  const [loans, setLoans] = useState<LoanWithStatus[]>([]);

  const [loading, setLoading] = useState(false);
  const [date, setDate] = useState(initialValues?.date || new Date().toISOString().slice(0, 10));
  const [memo, setMemo] = useState(initialValues?.memo || "");

  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [isAddingAccount, setIsAddingAccount] = useState(false);
  const [newAccountName, setNewAccountName] = useState("");
  const [newAccountType, setNewAccountType] = useState<"bank" | "cash" | "card">("cash");
  const [newAccountBalance, setNewAccountBalance] = useState("");

  const visibleCategories = categories.filter(c => !c.is_archived);

  // Helper to get names safely
  const getCatName = (id: string) => categories.find(c => c.id === id)?.name || "Unknown";

  // Fetch Quick Actions
  useEffect(() => {
    async function loadQuickActions() {
      try {
        const [tpls, hists] = await Promise.all([
          getTemplates(5),
          getRecentTransactions(10) // fetch more to filter
        ]);
        setQuickTemplates(tpls || []);

        // Filter history: exclude repayments, dedup? For now just take top 5 valid expenses/incomes
        const validHistory = (hists || [])
          .filter(h => h.type !== 'repayment')
          .slice(0, 5);
        setQuickHistory(validHistory);
      } catch (e) {
        console.error("Failed to load quick actions", e);
      } finally {
        setRecentLoading(false);
      }
    }
    loadQuickActions();
  }, []); // Run once on mount

  const handleApplyQuickAction = (item: Template | Transaction, isTemplate: boolean) => {
    // 1. Set values
    setAmount(String(item.amount));

    // Type handling
    if (item.type === 'expense' || item.type === 'income') {
      setType(item.type);
      setIsRepaymentMode(false);
    } else if (item.type === 'repayment') {
      // Should trigger repayment mode logic, but simplified for now (templates/history generally pure expense/income)
      setIsRepaymentMode(true);
      setType("expense"); // Repayment is under expense tab in UI
    }

    if (item.category_id) setCategoryId(item.category_id);
    if (item.payment_method_id) setPaymentMethodId(item.payment_method_id);
    if (item.memo) setMemo(item.memo);

    // If template, we might want to track usage? (Only on save)
    // If template, update date? (Usually retain current date)
    // If History Copy, retain current date (don't overwrite with past date)
  };


  // Initialize Defaults
  useEffect(() => {
    const shouldRetain = localStorage.getItem("money-app-config-retain-values") !== 'false';

    // 1. Load Category
    if (!isRepaymentMode && !categoryId && visibleCategories.length > 0 && type === 'expense') {
      if (initialValues?.categoryId) {
        setCategoryId(initialValues.categoryId);
      } else if (shouldRetain) {
        // Try localStorage first
        const lastCatId = localStorage.getItem("money-app-last-category-id");
        if (lastCatId && visibleCategories.find(c => c.id === lastCatId)) {
          setCategoryId(lastCatId);
        } else {
          setCategoryId(visibleCategories[0].id);
        }
      } else {
        setCategoryId(visibleCategories[0].id);
      }
    }

    // 2. Load Payment Method
    if (!paymentMethodId && paymentMethods.length > 0) {
      if (initialValues?.paymentMethodId) {
        setPaymentMethodId(initialValues.paymentMethodId);
      } else if (shouldRetain) {
        // Try localStorage first
        const lastPayId = localStorage.getItem("money-app-last-payment-method-id");
        if (lastPayId && paymentMethods.find(p => p.id === lastPayId)) {
          setPaymentMethodId(lastPayId);
        } else {
          // Fallback to legacy key or default
          const legacyId = localStorage.getItem("lastUsedPaymentMethodId"); // Backward compatibility
          if (legacyId && paymentMethods.find(p => p.id === legacyId)) {
            setPaymentMethodId(legacyId);
          } else {
            const pref = paymentMethods.find(p => p.type === 'cash') || paymentMethods[0];
            setPaymentMethodId(pref.id);
          }
        }
      } else {
        const pref = paymentMethods.find(p => p.type === 'cash') || paymentMethods[0];
        setPaymentMethodId(pref.id);
      }
    }
  }, [categories, paymentMethods, initialValues, categoryId, paymentMethodId, visibleCategories, type, isRepaymentMode]);

  // Fetch Loans
  useEffect(() => {
    async function loadLoans() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const data = await getLoans(user.id);
        const activeLoans = data.filter(l => l.status === 'active');
        setLoans(activeLoans);
        // Auto select first loan if in repayment mode
        if (activeLoans.length > 0 && !loanId) {
          setLoanId(activeLoans[0].id);
        }
      }
    }
    loadLoans();
  }, [isRepaymentMode]);

  // Handle Category Change
  const handleCategoryChange = (val: string) => {
    if (val === LOAN_REPAYMENT_OPTION_VALUE) {
      setIsRepaymentMode(true);
      setCategoryId(""); // Clear category ID as we use special mode
      // Ensure loan selected
      if (loans.length > 0 && !loanId) setLoanId(loans[0].id);
    } else if (val === ADD_NEW_VALUE) {
      setIsAddingCategory(true);
    } else {
      setIsRepaymentMode(false);
      setCategoryId(val);
    }
  };

  const handleSave = async () => {
    if (!amount) return;
    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount < 0) {
      alert("金額を正しく入力してください");
      return;
    }

    const finalType = isRepaymentMode ? 'repayment' : type;

    // Validation
    if (finalType === 'repayment') {
      if (!loanId) {
        alert("返済するローンを選択してください");
        return;
      }
    } else {
      if (!categoryId) {
        alert("カテゴリを選択してください");
        return;
      }
    }

    if (!paymentMethodId) {
      alert("支払い方法を選択してください");
      return;
    }

    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Login required");

      await saveTransaction({
        id: initialValues?.id,
        user_id: user.id,
        amount: numAmount,
        type: finalType,
        category_id: finalType === 'repayment' ? undefined : categoryId,
        payment_method_id: paymentMethodId,
        loan_id: finalType === 'repayment' ? loanId : undefined,
        date: date,
        memo: memo || (finalType === 'repayment' ? "返済" : ""),
      });

      // Save to localStorage for next time (if enabled)
      const shouldRetain = localStorage.getItem("money-app-config-retain-values") !== 'false';
      if (shouldRetain) {
        localStorage.setItem("money-app-last-payment-method-id", paymentMethodId);
        if (finalType === 'expense' && categoryId) {
          localStorage.setItem("money-app-last-category-id", categoryId);
        }
      }

      setAmount("");
      setMemo("");

      // Post-Save Behavior
      const behavior = localStorage.getItem("money-app-post-save-behavior");
      if (behavior === 'history') {
        window.location.href = '/history';
      } else {
        onSuccess();
        // If continue, re-focusing is handled by rendering (autoFocus is on input)
        // But since we don't unmount, we might need to forcefully focus? 
        // Actually autoFocus only works on mount. 
        // We might need a ref to focus.
        // For now relying on user tapping again or if onSuccess closes modal (but here it seems it's inline?)
        // If it is inline, we should focus.
        (document.querySelector('input[type="number"]') as HTMLElement)?.focus(); // Simple hack
      }

    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCategorySubmit = async () => {
    if (!newCategoryName.trim()) return;
    try {
      await addCategory(newCategoryName);
      setIsAddingCategory(false);
      setNewCategoryName("");
    } catch (e) {
      alert("追加に失敗しました");
    }
  };

  const handleAddAccountSubmit = async () => {
    if (!newAccountName.trim()) return;
    try {
      await addPaymentMethod({
        name: newAccountName,
        type: newAccountType,
        balance: newAccountBalance ? Number(newAccountBalance) : 0
      });
      setIsAddingAccount(false);
      setNewAccountName("");
      setNewAccountBalance("");
    } catch (e) {
      alert("追加に失敗しました");
    }
  };

  if (catLoading || payLoading) return <div>Loading...</div>;

  return (
    <div className="app-card" style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "16px" }}>

      {/* Header: Type Switcher & Amount */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <div style={{ display: "flex", background: "#f0f0f0", borderRadius: "8px", padding: "2px", width: "120px" }}>
          <button
            onClick={() => { setType("expense"); setIsRepaymentMode(false); }}
            style={{ flex: 1, padding: "6px", borderRadius: "6px", background: type === "expense" ? "#fff" : "transparent", fontWeight: type === "expense" ? 700 : 400, border: "none", fontSize: "12px", boxShadow: type === "expense" ? "0 1px 2px rgba(0,0,0,0.1)" : "none" }}
          >
            支出
          </button>
          <button
            onClick={() => { setType("income"); setIsRepaymentMode(false); }}
            style={{ flex: 1, padding: "6px", borderRadius: "6px", background: type === "income" ? "#fff" : "transparent", fontWeight: type === "income" ? 700 : 400, border: "none", fontSize: "12px", boxShadow: type === "income" ? "0 1px 2px rgba(0,0,0,0.1)" : "none" }}
          >
            収入
          </button>
        </div>

        <div style={{ flex: 1, position: "relative" }}>
          <input
            type="number"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            placeholder="0"
            style={{
              width: "100%", fontSize: "32px", fontWeight: 700, padding: "0 24px 0 0", border: "none", borderBottom: "2px solid #3b2a1a",
              textAlign: "right", outline: "none", background: "transparent", color: "#3b2a1a"
            }}
            inputMode="decimal"
            autoFocus
          />
          <span style={{ position: "absolute", right: 0, bottom: 8, fontSize: "12px", color: "#888" }}>円</span>
        </div>
      </div>

      {/* Row: Category/Loan & Payment */}
      <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>

        {/* Category Selector */}
        <div style={{ flex: 1 }}>
          <label style={{ display: "block", fontSize: "11px", color: "#666", marginBottom: "4px" }}>
            カテゴリ
          </label>

          {!isAddingCategory ? (
            <select
              value={isRepaymentMode ? LOAN_REPAYMENT_OPTION_VALUE : categoryId}
              onChange={e => handleCategoryChange(e.target.value)}
              className="form-select"
              disabled={type === 'income'}
              style={{ width: "100%", padding: "8px", fontSize: "14px", background: "#fff", border: "1px solid #ddd", borderRadius: "6px" }}
            >
              {visibleCategories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
              {/* Special Option for Debt Repayment (Only in Expense) */}
              {type === 'expense' && (
                <option value={LOAN_REPAYMENT_OPTION_VALUE} style={{ fontWeight: "bold", color: "#b58b5a" }}>
                  💳 ローン返済
                </option>
              )}
              <option value={ADD_NEW_VALUE} style={{ color: "#007bff" }}>+ カテゴリ追加...</option>
            </select>
          ) : (
            <div className="animate-fade-in" style={{ padding: "8px", background: "#fff", border: "1px solid #ddd", borderRadius: "6px" }}>
              <input
                type="text"
                value={newCategoryName}
                onChange={e => setNewCategoryName(e.target.value)}
                placeholder="カテゴリ名"
                style={{ width: "100%", border: "none", borderBottom: "1px solid #eee", fontSize: "13px", padding: "4px", marginBottom: "8px" }}
                autoFocus
              />
              <div style={{ display: "flex", gap: "4px" }}>
                <button onClick={handleAddCategorySubmit} className="btn-primary" style={{ flex: 1, padding: "4px", fontSize: "11px", minHeight: "24px" }}>追加</button>
                <button onClick={() => setIsAddingCategory(false)} style={{ flex: 1, padding: "4px", fontSize: "11px", background: "#eee", border: "none", borderRadius: "4px" }}>戻る</button>
              </div>
            </div>
          )}

          {/* Loan Selector (Appears when Repayment Mode is active) */}
          {isRepaymentMode && type === 'expense' && (
            <div style={{ marginTop: 8 }}>
              <label style={{ display: "block", fontSize: "11px", color: "#b58b5a", marginBottom: "4px", fontWeight: "bold" }}>
                返済先ローン
              </label>
              <select
                value={loanId}
                onChange={e => setLoanId(e.target.value)}
                className="form-select"
                style={{ width: "100%", padding: "8px", fontSize: "14px", background: "#fff7ed", border: "1px solid #fdba74", borderRadius: "6px", color: "#9a3412" }}
              >
                {loans.map(l => (
                  <option key={l.id} value={l.id}>{l.name} (残: ¥{l.remaining_balance.toLocaleString()})</option>
                ))}
                {loans.length === 0 && <option value="">ローンなし</option>}
              </select>
            </div>
          )}
        </div>

        {/* Payment Method */}
        <div style={{ flex: 1 }}>
          <label style={{ display: "block", fontSize: "11px", color: "#666", marginBottom: "4px" }}>支払い方法</label>
          {!isAddingAccount ? (
            <select
              value={paymentMethodId}
              onChange={e => {
                if (e.target.value === ADD_NEW_VALUE) {
                  setIsAddingAccount(true);
                } else {
                  setPaymentMethodId(e.target.value);
                }
              }}
              className="form-select"
              style={{ width: "100%", padding: "8px", fontSize: "14px", background: "#fff", border: "1px solid #ddd", borderRadius: "6px" }}
            >
              {paymentMethods.map(a => (
                <option key={a.id} value={a.id} disabled={a.type === 'card' && (!a.closing_day || !a.payment_day)}>
                  {a.name}
                </option>
              ))}
              {paymentMethods.length === 0 && <option>なし</option>}
              <option value={ADD_NEW_VALUE} style={{ color: "#007bff" }}>+ 追加...</option>
            </select>
          ) : (
            <div className="animate-fade-in" style={{ padding: "8px", background: "#fff", border: "1px solid #ddd", borderRadius: "6px", position: "absolute", zIndex: 10, width: "200px", right: 16 }}>
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
                onChange={(e) => setNewAccountType(e.target.value as any)}
                style={{ width: "100%", marginBottom: "4px", fontSize: "11px", padding: "2px" }}
              >
                <option value="cash">財布 (現金)</option>
                <option value="bank">銀行口座</option>
                <option value="card">クレジットカード</option>
              </select>
              <input
                type="number"
                value={newAccountBalance}
                onChange={e => setNewAccountBalance(e.target.value)}
                placeholder="初期残高 (円)"
                style={{ width: "100%", border: "none", borderBottom: "1px solid #eee", fontSize: "13px", padding: "4px", marginBottom: "8px" }}
              />

              <div style={{ display: "flex", gap: "4px" }}>
                <button onClick={handleAddAccountSubmit} className="btn-primary" style={{ flex: 1, padding: "4px", fontSize: "11px", minHeight: "24px" }}>追加</button>
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
            placeholder={isRepaymentMode ? '例: 今月分' : 'ランチなど'}
            style={{ padding: "6px", fontSize: "13px" }}
          />
        </div>
      </div>

      <div style={{ marginTop: "16px" }}>
        <button
          onClick={handleSave}
          disabled={loading || !amount}
          className="btn-primary"
          style={{ width: "100%", padding: "12px", fontSize: "16px", fontWeight: 700, marginTop: "8px" }}
        >
          {loading ? "保存中..." : isRepaymentMode ? '返済を記録' : '記録する'}
        </button>
      </div>
    </div>
  );
}
