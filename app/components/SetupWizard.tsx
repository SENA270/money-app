"use client";

import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";

// Logic Types
type WizardStep = "income" | "payday" | "account" | "complete";

export default function SetupWizard({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState<WizardStep>("income");
  const [loading, setLoading] = useState(false);

  // Form States
  const [income, setIncome] = useState("");
  const [payday, setPayday] = useState("25");
  const [accountName, setAccountName] = useState("銀行口座");
  const [initialBalance, setInitialBalance] = useState("");

  // Load existing values on mount to allow resume
  useEffect(() => {
    // 1. Income Settings
    const incRaw = localStorage.getItem("incomeSettings");
    if (incRaw) {
      const p = JSON.parse(incRaw);
      if (p.monthlyIncome) setIncome(p.monthlyIncome);
      if (p.payday) setPayday(String(p.payday));
    }
  }, []);

  // --- Actions ---

  const saveIncome = () => {
    if (!income) return;
    const settings = {
      monthlyIncome: Number(income),
      payday: Number(payday) // Save payday here tentatively or separately? 
      // We can save partial.
    };
    // Merge existing
    const existing = localStorage.getItem("incomeSettings");
    const merged = existing ? { ...JSON.parse(existing), ...settings } : settings;
    localStorage.setItem("incomeSettings", JSON.stringify(merged));

    setStep("payday");
  };

  const savePayday = () => {
    if (!payday) return;
    const existing = localStorage.getItem("incomeSettings");
    const merged = existing ? { ...JSON.parse(existing), payday: Number(payday) } : { payday: Number(payday) };
    localStorage.setItem("incomeSettings", JSON.stringify(merged));

    setStep("account");
  };

  const saveAccount = () => {
    if (!accountName) return;

    // Create Account Object
    const newAccount = {
      id: `bank-${Date.now()}`,
      type: "bank",
      name: accountName,
      balance: initialBalance ? Number(initialBalance) : 0
    };

    // Merge to Accounts list
    const accRaw = localStorage.getItem("accounts");
    const accounts = accRaw ? JSON.parse(accRaw) : [];

    // Simple check to avoid duplicate if user clicks back/forth?
    // For wizard, we just append.
    accounts.push(newAccount);
    localStorage.setItem("accounts", JSON.stringify(accounts));

    finishWizard();
  };

  const finishWizard = () => {
    onComplete();
  };

  const handleSkip = () => {
    // Just close without saving current step (or assuming user wants to skip this step)
    // Requirements says "Skip is possible". 
    // If skip, we assume "Complete" for now to let them see Home.
    onComplete();
  };

  // --- Renders ---

  // Common Layout
  const Wrapper = ({ children, title, progress }: any) => (
    <div style={{
      position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
      background: "rgba(0,0,0,0.5)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center"
    }}>
      <div className="wizard-card" style={{
        background: "#fff", width: "90%", maxWidth: "400px", padding: "24px", borderRadius: "16px",
        boxShadow: "0 4px 24px rgba(0,0,0,0.15)"
      }}>
        <div style={{ marginBottom: 16, fontSize: 12, color: "#888", fontWeight: 600 }}>
          STEP {progress} / 3
        </div>
        <h2 style={{ fontSize: 20, marginBottom: 16 }}>{title}</h2>
        {children}

        <div style={{ marginTop: 24, textAlign: "center" }}>
          <button onClick={handleSkip} style={{ background: "none", border: "none", color: "#888", fontSize: "14px", textDecoration: "underline" }}>
            今はスキップ
          </button>
        </div>
      </div>
    </div>
  );

  if (step === "income") {
    return (
      <Wrapper title="毎月の手取り収入は？" progress="1">
        <p style={{ fontSize: 14, color: "#666", marginBottom: 16 }}>
          予算を決める基準になります。<br />だいたいで大丈夫です。
        </p>
        <div className="input-group">
          <input
            type="number"
            className="form-input"
            value={income}
            onChange={e => setIncome(e.target.value)}
            placeholder="例: 250000"
            autoFocus
          />
          <span className="unit">円</span>
        </div>
        <button
          onClick={saveIncome}
          className="btn-primary"
          disabled={!income}
          style={{ marginTop: 16, width: "100%" }}
        >
          次へ
        </button>
      </Wrapper>
    );
  }

  if (step === "payday") {
    return (
      <Wrapper title="給料日はいつですか？" progress="2">
        <p style={{ fontSize: 14, color: "#666", marginBottom: 16 }}>
          毎月の区切り（リセット日）として使います。
        </p>
        <div className="input-group">
          <input
            type="number"
            className="form-input"
            value={payday}
            onChange={e => setPayday(e.target.value)}
            placeholder="例: 25"
            min={1} max={31}
          />
          <span className="unit">日</span>
        </div>
        <button
          onClick={savePayday}
          className="btn-primary"
          disabled={!payday}
          style={{ marginTop: 16, width: "100%" }}
        >
          次へ
        </button>
      </Wrapper>
    );
  }

  if (step === "account") {
    return (
      <Wrapper title="よく使う口座を1つ登録" progress="3">
        <p style={{ fontSize: 14, color: "#666", marginBottom: 16 }}>
          メインで使っている銀行や、お財布の名前を入れてください。
        </p>
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: "block", fontSize: 13, marginBottom: 4 }}>口座名</label>
          <input
            type="text"
            className="form-input"
            value={accountName}
            onChange={e => setAccountName(e.target.value)}
            placeholder="例: 〇〇銀行、メイン財布"
          />
        </div>
        <div>
          <label style={{ display: "block", fontSize: 13, marginBottom: 4 }}>現在の残高（任意）</label>
          <div className="input-group">
            <input
              type="number"
              className="form-input"
              value={initialBalance}
              onChange={e => setInitialBalance(e.target.value)}
              placeholder="0"
            />
            <span className="unit">円</span>
          </div>
        </div>

        <button
          onClick={saveAccount}
          className="btn-primary"
          disabled={!accountName}
          style={{ marginTop: 24, width: "100%" }}
        >
          完了して始める
        </button>
      </Wrapper>
    );
  }

  return null;
}
