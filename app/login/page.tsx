// app/login/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Staging: Auto-login if auth is disabled
  const isStaging = process.env.NEXT_PUBLIC_DISABLE_AUTH === 'true';

  useEffect(() => {
    if (isStaging) {
      const autoLogin = async () => {
        setLoading(true);
        try {
          // Use hardcoded test credentials for staging
          const { error } = await supabase.auth.signInWithPassword({
            email: "testdayo555@gmail.com",
            password: "testdayo555!!"
          });
          if (error) throw error;
          router.push("/");
        } catch (e: any) {
          console.error("Auto-login failed:", e);
          setError("自動ログインに失敗しました: " + e.message);
        } finally {
          setLoading(false);
        }
      };
      autoLogin();
    }
  }, [isStaging, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (!email || !password) {
        throw new Error("メールアドレスとパスワードを入力してください。");
      }

      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      }

      // ログイン成功したらホームに戻す
      router.push("/");
    } catch (e: any) {
      console.error(e);
      setError(e.message ?? "ログインに失敗しました。");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      <h1>ログイン / 新規登録</h1>
      {isStaging && (
        <div style={{ background: '#fff3cd', color: '#856404', padding: '10px', marginBottom: '20px', borderRadius: '4px', textAlign: 'center' }}>
          ⚠️ Staging Mode: Auto-logging in...
        </div>
      )}

      <div
        className="app-card"
        style={{
          maxWidth: 360,
          paddingTop: 20,
        }}
      >
        {/* 上部タブ切り替え */}
        <div
          style={{
            display: "flex",
            marginBottom: 16,
            borderRadius: 999,
            backgroundColor: "#f3ebdd",
            padding: 2,
          }}
        >
          <button
            type="button"
            onClick={() => setMode("login")}
            style={{
              flex: 1,
              padding: "6px 0",
              borderRadius: 999,
              border: "none",
              fontSize: 13,
              cursor: "pointer",
              backgroundColor: mode === "login" ? "#b58b5a" : "transparent",
              color: mode === "login" ? "#fff" : "#6b4b2d",
              transition: "background-color 0.2s",
            }}
          >
            ログイン
          </button>
          <button
            type="button"
            onClick={() => setMode("signup")}
            style={{
              flex: 1,
              padding: "6px 0",
              borderRadius: 999,
              border: "none",
              fontSize: 13,
              cursor: "pointer",
              backgroundColor: mode === "signup" ? "#b58b5a" : "transparent",
              color: mode === "signup" ? "#fff" : "#6b4b2d",
              transition: "background-color 0.2s",
            }}
          >
            新規登録
          </button>
        </div>

        {/* フォーム本体 */}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 12 }}>
            <label
              style={{
                display: "block",
                marginBottom: 4,
                fontSize: 14,
              }}
            >
              メールアドレス
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                width: "100%",
                padding: "6px 8px",
                borderRadius: 4,
                border: "1px solid #ccb89b",
              }}
            />
          </div>

          <div style={{ marginBottom: 12 }}>
            <label
              style={{
                display: "block",
                marginBottom: 4,
                fontSize: 14,
              }}
            >
              パスワード
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: "100%",
                padding: "6px 8px",
                borderRadius: 4,
                border: "1px solid #ccb89b",
              }}
            />
          </div>

          {error && (
            <p
              style={{
                color: "#b3261e",
                fontSize: 13,
                marginBottom: 8,
              }}
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "8px 16px",
              borderRadius: 6,
              border: "none",
              backgroundColor: "#b58b5a",
              color: "#fff",
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading
              ? "処理中..."
              : mode === "login"
                ? "ログイン"
                : "登録してログイン"}
          </button>
        </form>
      </div>
    </div>
  );
}