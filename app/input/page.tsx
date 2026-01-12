"use client";

import { useState } from "react";
import Link from "next/link";
import TransactionQuickForm from "../components/Input/TransactionQuickForm";
import ReceiptScanner from "../components/ReceiptScanner";
import { saveTransaction } from "../lib/transaction/saveTransaction";
import { supabase } from "../../lib/supabaseClient";

export default function InputPage() {
  const [mode, setMode] = useState<"manual" | "camera">("manual");
  const [ocrResult, setOcrResult] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [message, setMessage] = useState("");

  const handleSuccess = () => {
    setMessage("記録しました！");
    // Auto-hide toast
    setTimeout(() => setMessage(""), 3000);
  };

  const handleScanComplete = (data: any) => {
    // data: { date, amount, storeName, category }
    setOcrResult(data);
    setMode("manual"); // Switch back to view result
  };

  // OCR Confirmation Handler
  const saveOcrResult = async () => {
    if (!ocrResult) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Login required");

      // Resolve Default Payment Method (Same logic as QuickForm)
      let paymentMethod = "";
      let type: "expense" | "card_payment" = "expense";

      if (typeof window !== "undefined") {
        const accRaw = localStorage.getItem("accounts");
        const lastUsed = localStorage.getItem("lastUsedAccountName");

        if (accRaw) {
          const accounts = JSON.parse(accRaw);

          // Try to find last used
          let account = accounts.find((a: any) => a.name === lastUsed);

          // If not found or card logic needed
          if (!account && accounts.length > 0) {
            // Default to first bank/wallet if available, else first whatever
            account = accounts.find((a: any) => a.type !== "card") || accounts[0];
          }

          if (account) {
            paymentMethod = account.name;
            if (account.type === "card") {
              type = "card_payment";
            }
          }
        }
      }

      // If still no payment method (e.g. fresh install), default to "現金"?
      // Or fail? "現金" is safe fallback for OCR if user hasn't set up?
      // Better to force Edit in that case?
      // Let's default to "現金" as passing implicit string is better than failing.
      if (!paymentMethod) paymentMethod = "現金";

      await saveTransaction({
        user_id: user.id,
        amount: Number(ocrResult.amount),
        type: type,
        category: ocrResult.category || "未分類",
        date: ocrResult.date || new Date().toISOString().slice(0, 10),
        memo: ocrResult.storeName,
        paymentMethod: paymentMethod
      });

      // Update Last Used
      if (typeof window !== "undefined") {
        localStorage.setItem("lastUsedAccountName", paymentMethod);
      }

      setOcrResult(null);
      handleSuccess();
    } catch (e: any) {
      alert("保存に失敗: " + e.message);
    }
  };


  return (
    <div className="page-container padding-bottom-nav">
      {/* Header */}
      <h1 style={{ marginBottom: 16 }}>入力</h1>

      {/* Mode Switcher (Manual / Camera) */}
      {!ocrResult && !isEditing && (
        <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
          <button
            onClick={() => setMode("manual")}
            className={mode === "manual" ? "btn-primary" : "btn-secondary"}
            style={{ flex: 1 }}
          >
            手入力
          </button>
          <button
            onClick={() => setMode("camera")}
            className={mode === "camera" ? "btn-primary" : "btn-secondary"}
            style={{ flex: 1 }}
          >
            レシート読取
          </button>
        </div>
      )}

      {/* 1. OCR Result Confirmation (Simplified) */}
      {ocrResult && !isEditing && (
        <div className="app-card" style={{ borderLeft: "4px solid #3b2a1a" }}>
          <h3>レシート読取結果</h3>
          <div style={{ margin: "16px 0", fontSize: 14 }}>
            <div className="list-row" style={{ fontSize: 18, fontWeight: 700 }}>
              <span>金額</span>
              <span>¥{Number(ocrResult.amount).toLocaleString()}</span>
            </div>
            <div className="list-row">
              <span>日付</span>
              <span>{ocrResult.date}</span>
            </div>
            <div className="list-row">
              <span>店名</span>
              <span>{ocrResult.storeName}</span>
            </div>
            <div className="list-row">
              <span>カテゴリ</span>
              <span>{ocrResult.category}</span>
            </div>
          </div>

          <div style={{ display: "flex", gap: 12 }}>
            <button onClick={saveOcrResult} className="btn-primary" style={{ flex: 1 }}>
              このまま保存
            </button>
            <button
              onClick={() => setIsEditing(true)}
              className="btn-secondary"
              style={{ flex: 1 }}
            >
              修正する
            </button>
          </div>
        </div>
      )}

      {/* 2. Manual Input Form (Normal or Edit Mode) */}
      {((mode === "manual" && !ocrResult) || isEditing) && (
        <TransactionQuickForm
          onSuccess={() => {
            handleSuccess();
            setOcrResult(null);
            setIsEditing(false);
          }}
          initialValues={isEditing && ocrResult ? {
            amount: ocrResult.amount,
            date: ocrResult.date,
            category: ocrResult.category,
            memo: ocrResult.storeName
          } : undefined}
        />
      )}

      {/* 3. Camera Component */}
      {mode === "camera" && (
        <div style={{ marginTop: 20 }}>
          <ReceiptScanner onScanComplete={handleScanComplete} onClose={() => setMode("manual")} />
        </div>
      )}

      {/* Toast */}
      {message && (
        <div style={{
          position: "fixed", bottom: 80, left: "50%", transform: "translateX(-50%)",
          background: "#333", color: "#fff", padding: "12px 24px", borderRadius: 30,
          boxShadow: "0 4px 12px rgba(0,0,0,0.2)", pointerEvents: "none", zIndex: 999
        }}>
          {message}
        </div>
      )}
    </div>
  );
}
