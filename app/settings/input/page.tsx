"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, Save } from "lucide-react";
import Link from "next/link";

export default function InputSettingsPage() {
  const [retainValues, setRetainValues] = useState(true);
  const [postSaveBehavior, setPostSaveBehavior] = useState('continue'); // 'continue' | 'history'

  useEffect(() => {
    // Load config
    const retained = localStorage.getItem("money-app-config-retain-values");
    if (retained !== null) {
      setRetainValues(retained === 'true');
    }

    const behavior = localStorage.getItem("money-app-post-save-behavior");
    if (behavior) {
      setPostSaveBehavior(behavior);
    }
  }, []);

  const handleRetainChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVal = e.target.checked;
    setRetainValues(newVal);
    localStorage.setItem("money-app-config-retain-values", String(newVal));
  };

  const handleBehaviorChange = (val: string) => {
    setPostSaveBehavior(val);
    localStorage.setItem("money-app-post-save-behavior", val);
  };

  return (
    <div className="page-container">
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
        <Link href="/settings">
          <ArrowLeft size={24} color="#333" />
        </Link>
        <h1 style={{ margin: 0, fontSize: 20 }}>入力設定</h1>
      </div>

      <div className="app-card" style={{ padding: "20px" }}>
        <h2 style={{ fontSize: 16, marginBottom: 16, borderBottom: "1px solid #eee", paddingBottom: 8 }}>
          入力フォームの挙動
        </h2>

        {/* Retain Values Toggle */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: "bold", color:= "#333" }}>前回値を保持する</div>
            <div style={{ fontSize: 12, color: "#888" }}>カテゴリと支払い方法を記憶します</div>
          </div>
          <label className="switch">
            <input
              type="checkbox"
              checked={retainValues}
              onChange={handleRetainChange}
            />
            <span className="slider round"></span>
          </label>
        </div>

        {/* Post Save Behavior */}
        <div>
          <div style={{ fontSize: 15, fontWeight: "bold", color: "#333", marginBottom: 12 }}>保存後の動作</div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => handleBehaviorChange('continue')}
              className={postSaveBehavior === 'continue' ? 'btn-primary' : 'btn-secondary'}
              style={{ flex: 1, padding: "12px", fontSize: 13 }}
            >
              続けて入力
            </button>
            <button
              onClick={() => handleBehaviorChange('history')}
              className={postSaveBehavior === 'history' ? 'btn-primary' : 'btn-secondary'}
              style={{ flex: 1, padding: "12px", fontSize: 13 }}
            >
              履歴へ移動
            </button>
          </div>
          <p style={{ fontSize: 12, color: "#888", marginTop: 8 }}>
            {postSaveBehavior === 'continue'
              ? "保存後、フォームをリセットして入力を継続します。"
              : "保存後、履歴画面に移動して確認します。"}
          </p>
        </div>

      </div>

      <style jsx>{`
        .switch {
          position: relative;
          display: inline-block;
          width: 48px;
          height: 24px;
        }
        .switch input {
          opacity: 0;
          width: 0;
          height: 0;
        }
        .slider {
          position: absolute;
          cursor: pointer;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: #ccc;
          transition: .4s;
          border-radius: 24px;
        }
        .slider:before {
          position: absolute;
          content: "";
          height: 18px;
          width: 18px;
          left: 3px;
          bottom: 3px;
          background-color: white;
          transition: .4s;
          border-radius: 50%;
        }
        input:checked + .slider {
          background-color: #8c7b6c; /* Standard App Color */
        }
        input:checked + .slider:before {
          transform: translateX(24px);
        }
      `}</style>
    </div>
  );
}
