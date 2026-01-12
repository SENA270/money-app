"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "../../../lib/supabaseClient";
import { BackupData, RestoreResult } from "../../lib/backup/types";
import { restoreTransactions } from "../../lib/backup/restoreTransactions";
import { mergeSettings } from "../../lib/backup/mergeSettings";

export default function DataExportPage() {
  // Export State
  const [exportMonth, setExportMonth] = useState<string>(
    new Date().toISOString().slice(0, 7)
  );
  const [exportLoading, setExportLoading] = useState(false);
  const [backupLoading, setBackupLoading] = useState(false);
  const [message, setMessage] = useState("");

  // Restore State
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<BackupData | null>(null);
  const [restoreMode, setRestoreMode] = useState<"merge" | "overwrite">("merge");
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [restoreResult, setRestoreResult] = useState<RestoreResult | null>(null);

  // --- 1. CSV Transaction Export ---
  const handleExportCSV = async () => {
    try {
      setExportLoading(true);
      setMessage("");

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert("ログインしていません");
        return;
      }

      const [year, month] = exportMonth.split("-").map(Number);
      const start = new Date(year, month - 1, 1).toISOString();
      const end = new Date(year, month, 1).toISOString();

      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", user.id)
        .gte("date", start)
        .lt("date", end)
        .order("date", { ascending: true });

      if (error) throw error;
      if (!data || data.length === 0) {
        alert("指定された月のデータがありません。");
        return;
      }

      // Generate CSV
      const header = ["date", "type", "amount", "category", "account", "memo", "created_at"];
      const rows = data.map(t => [
        t.date,
        t.type,
        t.amount,
        `"${(t.category || "").replace(/"/g, '""')}"`,
        `"${(t.payment_method || "").replace(/"/g, '""')}"`,
        `"${(t.memo || "").replace(/"/g, '""')}"`,
        t.created_at
      ]);
      const csvContent = [header.join(","), ...rows.map(r => r.join(","))].join("\n");
      const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
      const blob = new Blob([bom, csvContent], { type: "text/csv" });

      downloadFile(blob, `money_app_${exportMonth}_transactions.csv`);
      setMessage(`${data.length}件の取引を出力しました。`);
    } catch (e) {
      console.error(e);
      alert("エクスポートに失敗しました。");
    } finally {
      setExportLoading(false);
    }
  };

  // --- 2. Full JSON Backup (Export) ---
  const createBackupData = async (): Promise<BackupData | null> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      alert("ログインが必要です");
      return null;
    }

    // Fetch All Transactions
    const { data: txs, error } = await supabase
      .from("transactions")
      .select("*")
      .eq("user_id", user.id);

    if (error) throw error;

    // Gather LocalStorage Settings
    const settingsData: any = {};
    const keys = ["settings", "incomeSettings", "accounts", "categories", "loans", "subscriptions", "savingGoals"];
    keys.forEach(k => {
      const val = localStorage.getItem(k);
      if (val) {
        try { settingsData[k] = JSON.parse(val); } catch { }
      }
    });

    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      userId: user.id,
      settings: settingsData,
      transactions: txs || []
    };
  };

  const handleFullBackup = async () => {
    try {
      setBackupLoading(true);
      const backup = await createBackupData();
      if (!backup) return;

      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
      downloadFile(blob, `money_app_full_backup_${new Date().toISOString().slice(0, 10)}.json`);
      setMessage(`完全バックアップを保存しました (取引: ${backup.transactions.length}件)`);
    } catch (e) {
      console.error(e);
      alert("バックアップ作成に失敗しました");
    } finally {
      setBackupLoading(false);
    }
  };

  // --- 3. Restore Flow ---

  // Step A: Select File & Preview
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setRestoreFile(file);
    setRestoreResult(null);

    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const text = ev.target?.result as string;
        const json = JSON.parse(text) as BackupData;

        // Validation
        if (!json.version || !json.userId) {
          throw new Error("フォーマットが無効です（バージョンまたはユーザーID不足）");
        }

        // User ID Check
        const { data: { user } } = await supabase.auth.getUser();
        if (user && user.id !== json.userId) {
          throw new Error("バックアップデータのユーザーIDが一致しません。復元を中止します。");
        }

        setPreviewData(json);
      } catch (err: any) {
        alert(err.message || "ファイルの読み込みに失敗しました");
        setRestoreFile(null);
        setPreviewData(null);
      }
    };
    reader.readAsText(file);
  };

  // Step B: Execute Restore
  const handleExecuteRestore = async () => {
    if (!previewData || !restoreFile) return;

    try {
      setRestoreLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("ログインが必要です");

      // Safety: Auto-Backup if Overwrite
      if (restoreMode === "overwrite") {
        const safetyBackup = await createBackupData();
        if (safetyBackup) {
          const blob = new Blob([JSON.stringify(safetyBackup)], { type: "application/json" });
          // Auto download "Pre-Restore" backup
          downloadFile(blob, `money_app_safety_backup_before_restore.json`);
          // Also save to LocalStorage safety slot
          localStorage.setItem("backup_safety_last", JSON.stringify(safetyBackup));
        }
      }

      // 1. Restore Transactions
      const txResult = await restoreTransactions(previewData.transactions, user.id, restoreMode);

      // 2. Restore Settings
      const stResult = mergeSettings(previewData.settings, restoreMode);

      setRestoreResult({
        success: true,
        transactions: {
          added: 0, // Upsert doesn't distinguish nicely in batch, but logic aims for upsert
          updated: txResult.updated || 0,
          skipped: 0,
          failed: txResult.failed || 0
        },
        settings: stResult,
        errors: []
      });

      // Reload triggers
      setTimeout(() => {
        if (confirm("復元が完了しました。最新状態を反映するためにリロードしますか？")) {
          window.location.reload();
        }
      }, 1000);

    } catch (e: any) {
      console.error(e);
      setRestoreResult({
        success: false,
        transactions: { added: 0, updated: 0, skipped: 0, failed: 0 },
        settings: { restoredKeys: [] },
        errors: [e.message]
      });
    } finally {
      setRestoreLoading(false);
    }
  };

  const downloadFile = (blob: Blob, name: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="page-container">
      <h1>データ管理（バックアップ）</h1>

      {/* 2. Full Backup */}
      <div className="app-card" style={{ borderLeft: "4px solid #2f7d32" }}>
        <h2>【推奨】完全バックアップ</h2>
        <p>取引データも設定もすべて含めて保存します。</p>
        <div style={{ marginTop: 12 }}>
          <button onClick={handleFullBackup} disabled={backupLoading} className="btn-primary">
            {backupLoading ? "作成中..." : "完全バックアップを保存 (JSON)"}
          </button>
        </div>
      </div>

      {/* 3. Restore Area */}
      <div className="app-card" style={{ marginTop: 24, borderLeft: "4px solid #c44536" }}>
        <h2>データの復元 (リストア)</h2>
        <p style={{ fontSize: 13, color: "#666" }}>
          JSONファイルを読み込みます。ユーザーIDが一致する場合のみ実行可能です。
        </p>

        {!previewData ? (
          <div style={{ marginTop: 16 }}>
            <input
              type="file"
              accept=".json"
              onChange={handleFileSelect}
            />
          </div>
        ) : (
          <div style={{ marginTop: 16, background: "#f9f9f9", padding: 12, borderRadius: 8 }}>
            <h3 style={{ fontSize: 16, marginBottom: 8 }}>復元プレビュー</h3>
            <ul style={{ fontSize: 14, paddingLeft: 20 }}>
              <li>バージョン: v{previewData.version}</li>
              <li>作成日時: {new Date(previewData.exportedAt).toLocaleString()}</li>
              <li>取引データ: <strong>{previewData.transactions.length}件</strong></li>
              <li>設定項目: {Object.keys(previewData.settings).length}種</li>
            </ul>

            <div style={{ marginTop: 16 }}>
              <p style={{ fontWeight: 600, marginBottom: 8 }}>復元モード:</p>
              <label style={{ display: "block", marginBottom: 8 }}>
                <input
                  type="radio"
                  name="mode"
                  value="merge"
                  checked={restoreMode === "merge"}
                  onChange={() => setRestoreMode("merge")}
                />
                <span style={{ fontWeight: 600 }}>マージ（推奨）</span>
                <div style={{ fontSize: 12, color: "#555", marginLeft: 24 }}>
                  現在のデータを残し、不足しているデータや新しいデータを追加・更新します。<br />
                  設定は現在のものを優先します。
                </div>
              </label>
              <label style={{ display: "block" }}>
                <input
                  type="radio"
                  name="mode"
                  value="overwrite"
                  checked={restoreMode === "overwrite"}
                  onChange={() => setRestoreMode("overwrite")}
                />
                <span style={{ fontWeight: 600, color: "#c44536" }}>完全上書き（危険）</span>
                <div style={{ fontSize: 12, color: "#555", marginLeft: 24 }}>
                  現在の取引・設定を全て削除し、バックアップの内容で置き換えます。<br />
                  ※実行前に現在のデータの自動バックアップが保存されます。
                </div>
              </label>
            </div>

            <div style={{ marginTop: 24, display: "flex", gap: 12 }}>
              <button
                onClick={handleExecuteRestore}
                disabled={restoreLoading}
                className="btn-primary"
                style={{ background: restoreMode === "overwrite" ? "#c44536" : undefined }}
              >
                {restoreLoading ? "復元中..." : (restoreMode === "overwrite" ? "上書き実行" : "復元を実行")}
              </button>
              <button
                onClick={() => { setPreviewData(null); setRestoreFile(null); }}
                className="btn-secondary"
              >
                キャンセル
              </button>
            </div>
          </div>
        )}

        {restoreResult && (
          <div style={{ marginTop: 16, padding: 12, border: restoreResult.success ? "1px solid #2f7d32" : "1px solid #c44536", borderRadius: 8, background: "#fff" }}>
            <h4 style={{ margin: "0 0 8px 0" }}>結果レポート</h4>
            {restoreResult.success ? (
              <div style={{ fontSize: 13 }}>
                <p>✅ 復元完了</p>
                <p>取引データ: 処理 {restoreResult.transactions.updated} 件 (失敗 {restoreResult.transactions.failed})</p>
                <p>設定: {restoreResult.settings.restoredKeys.join(", ")}</p>
              </div>
            ) : (
              <div style={{ color: "#c44536" }}>
                エラー: {restoreResult.errors.join(", ")}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 1. CSV Transaction Export (Legacy but useful) */}
      <div className="app-card" style={{ marginTop: 24 }}>
        <h2>取引CSV出力 (Excel用)</h2>
        <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
          <input
            type="month"
            value={exportMonth}
            onChange={(e) => setExportMonth(e.target.value)}
            className="form-input"
            style={{ width: "auto" }}
          />
          <button onClick={handleExportCSV} disabled={exportLoading} className="btn-secondary">
            CSVダウンロード
          </button>
        </div>
      </div>

      <div style={{ marginTop: 32 }}>
        <Link href="/settings">◀ 設定トップに戻る</Link>
      </div>

      {message && <div style={{ position: "fixed", bottom: 20, right: 20, background: "#333", color: "#fff", padding: "12px 24px", borderRadius: 4 }}>{message}</div>}
    </div>
  );
}
