// app/receipt/page.tsx
"use client";

import React, {
  useState,
  FormEvent,
  ChangeEvent,
  useEffect,
} from "react";

type OcrResult = {
  totalAmount: number | null;
  date: string | null;
  rawText: string;
  paymentMethod: string | null; // 例: "クレジットM"
  category: string | null;
};

const initialResult: OcrResult = {
  totalAmount: null,
  date: null,
  rawText: "",
  paymentMethod: null,
  category: null,
};

type PendingReceiptPayload = {
  date?: string;
  type?: "expense" | "income";
  amount?: number;
  category?: string;
  paymentName?: string; // そのまま使える支払い方法名がある場合
  paymentHint?: "card" | "cash" | "unknown"; // ざっくり種別
  memo?: string;
};

// OCR の日本語カテゴリ → 入力画面のカテゴリ名
// いまは「そのまま」渡す。セナがカテゴリを日本語で作ってる前提。
function mapCategoryToInputValue(
  categoryJa: string | null
): string | undefined {
  if (!categoryJa) return undefined;
  return categoryJa;
}

// 親ウィンドウ（/input）に結果を渡す共通処理
function sendToParent(payload: PendingReceiptPayload) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(
      "pendingReceiptInput",
      JSON.stringify(payload)
    );
  } catch (e) {
    console.error("pendingReceiptInput の保存に失敗しました", e);
  }

  // iframe の親に「反映したよ」と知らせる
  if (window.parent && window.parent !== window) {
    window.parent.postMessage({ type: "receiptApplied" }, "*");
  } else {
    // 直接 /receipt を開いた場合のフォールバック
    alert("入力画面を開くと、レシートの内容が反映されています。");
  }
}

function ReceiptInnerPage() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<OcrResult>(initialResult);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // iframe（モーダル内）で開かれたときはヘッダー・フッターを消す
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.self === window.top) return; // iframe でない

    const header = document.querySelector(
      '[data-role="app-header"]'
    ) as HTMLElement | null;
    if (header) header.style.display = "none";

    const footer = document.querySelector(
      "footer"
    ) as HTMLElement | null;
    if (footer) footer.style.display = "none";

    document.body.style.background = "transparent";
  }, []);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0] ?? null;
    setFile(selected);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setResult(initialResult);

    if (!file) {
      setError("ファイルを選択してください。");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    setLoading(true);
    try {
      const res = await fetch("/api/ocr", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();

      if (!res.ok) {
        setError(`読み取りエラー: ${json.error ?? "不明なエラー"}`);
        return;
      }

      const nextResult: OcrResult = {
        totalAmount: json.totalAmount ?? null,
        date: json.date ?? null,
        rawText: json.rawText ?? "",
        paymentMethod: json.paymentMethod ?? null,
        category: json.category ?? null,
      };
      setResult(nextResult);

      // 支払い方法をヒントに変換
      let paymentHint: "card" | "cash" | "unknown" | undefined;
      const pm = nextResult.paymentMethod ?? "";
      if (/クレジット|カード|credit/i.test(pm)) {
        paymentHint = "card";
      } else if (/現金|キャッシュ/i.test(pm)) {
        paymentHint = "cash";
      } else if (pm) {
        paymentHint = "unknown";
      }

      const payload: PendingReceiptPayload = {
        date: nextResult.date ?? undefined,
        type: "expense", // レシートは基本支出扱い
        amount:
          typeof nextResult.totalAmount === "number"
            ? nextResult.totalAmount
            : undefined,
        category: mapCategoryToInputValue(nextResult.category),
        paymentName: undefined, // 口座名とは一致しないので今は使わない
        paymentHint,
        memo: nextResult.rawText || undefined,
      };

      sendToParent(payload);
    } catch (err) {
      console.error(err);
      setError("読み取り中にエラーが発生しました。");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main
      style={{
        maxWidth: 800,
        margin: "0 auto",
        padding: "24px 16px",
      }}
    >
      <h1
        style={{
          fontSize: "20px",
          fontWeight: 700,
          marginBottom: "12px",
        }}
      >
        レシート読み取り
      </h1>

      <p
        style={{
          marginBottom: "16px",
          lineHeight: 1.6,
          fontSize: 14,
        }}
      >
        レシート画像をアップロードしてください。
        <br />
        <span style={{ fontSize: 12, color: "#9e8b78" }}>
          ※ SP版ではカメラが起動します。PC版では画像ファイルを選択してください。
        </span>
      </p>

      <form onSubmit={handleSubmit} style={{ marginBottom: "16px" }}>
        <div style={{ marginBottom: "16px", padding: "20px", border: "2px dashed #d0c2a8", borderRadius: "8px", textAlign: "center", backgroundColor: "#fffcf5" }}>
          {/* Mobile: Camera preferred, Desktop: File Picker */}
          <input
            type="file"
            accept="image/*;capture=camera"
            onChange={handleFileChange}
            style={{ display: "none" }}
            id="receipt-file-input"
          />
          <label htmlFor="receipt-file-input" style={{ display: "block", cursor: "pointer", padding: "10px" }}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>📷</div>
            <div style={{ fontSize: 14, color: "#5d4330", fontWeight: 600 }}>
              {file ? file.name : "写真を撮る / ファイルを選択"}
            </div>
          </label>
        </div>

        <button
          type="submit"
          disabled={loading || !file}
          className="btn-primary" // Use global class
          style={{
            width: "100%",
            borderRadius: 8,
            border: "none",
            backgroundColor: loading || !file ? "#d0c2a8" : "#5d4330",
            color: "#fff",
            cursor: loading || !file ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "読み取り中..." : "読み取って入力画面に反映"}
        </button>
      </form>

      {error && (
        <div
          style={{
            marginBottom: "16px",
            padding: "8px 12px",
            borderRadius: 4,
            backgroundColor: "#ffeaea",
            color: "#aa0000",
            whiteSpace: "pre-wrap",
            fontSize: 13,
          }}
        >
          読み取りエラー: {error}
        </div>
      )}

      {(result.totalAmount !== null ||
        result.date !== null ||
        result.paymentMethod !== null ||
        result.category !== null ||
        result.rawText) && (
          <section
            style={{
              padding: "10px 12px",
              borderRadius: 4,
              border: "1px solid #e0c8b0",
              backgroundColor: "#fffaf4",
              whiteSpace: "pre-wrap",
              fontSize: 13,
            }}
          >
            <h2
              style={{
                fontSize: "15px",
                fontWeight: 600,
                marginBottom: "6px",
              }}
            >
              読み取り結果（参考）
            </h2>
            <p>合計金額: {result.totalAmount ?? "不明"}</p>
            <p>日付: {result.date ?? "不明"}</p>
            <p>支払方法（生データ）: {result.paymentMethod ?? "不明"}</p>
            <p>推定カテゴリ: {result.category ?? "不明"}</p>

            <div style={{ marginTop: "6px" }}>
              <div style={{ fontWeight: 600, marginBottom: 2 }}>生テキスト</div>
              <div
                style={{
                  fontFamily: "monospace",
                  fontSize: 11,
                }}
              >
                {result.rawText || "(テキストなし)"}
              </div>
            </div>
          </section>
        )}
    </main>
  );
}

// ▼ ログインガード付きで公開
export default function ProtectedReceiptPage() {
  return <ReceiptInnerPage />;
}
