// app/settings/accounts/page.tsx
"use client";

import { useEffect, useState } from "react";

type AccountType = "bank" | "wallet" | "qr" | "card";

type Account = {
  id: string;
  type: AccountType;
  name: string;
  // カード専用
  closingDay?: number;  // 締め日
  paymentDay?: number;  // 支払日（翌月）
};

function createEmptyAccount(type: AccountType): Account {
  return {
    id: `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type,
    name: "",
  };
}

export default function AccountSettingsPage() {
  const [bankAccounts, setBankAccounts] = useState<Account[]>([]);
  const [walletAccounts, setWalletAccounts] = useState<Account[]>([]);
  const [qrAccounts, setQrAccounts] = useState<Account[]>([]);
  const [cardAccounts, setCardAccounts] = useState<Account[]>([]);

  // 初期読み込み
  useEffect(() => {
    if (typeof window === "undefined") return;

    const raw = localStorage.getItem("accounts");
    if (!raw) {
      // 何もなければ1行だけ空行を出しておく
      setBankAccounts([createEmptyAccount("bank")]);
      setWalletAccounts([createEmptyAccount("wallet")]);
      setQrAccounts([createEmptyAccount("qr")]);
      setCardAccounts([createEmptyAccount("card")]);
      return;
    }

    try {
      const parsed = JSON.parse(raw) as Account[];

      const banks = parsed.filter((a) => a.type === "bank");
      const wallets = parsed.filter((a) => a.type === "wallet");
      const qrs = parsed.filter((a) => a.type === "qr");
      const cards = parsed.filter((a) => a.type === "card");

      setBankAccounts(
        (banks.length ? banks : [createEmptyAccount("bank")]).sort((a, b) =>
          a.name.localeCompare(b.name, "ja")
        )
      );
      setWalletAccounts(
        (wallets.length ? wallets : [createEmptyAccount("wallet")]).sort(
          (a, b) => a.name.localeCompare(b.name, "ja")
        )
      );
      setQrAccounts(
        (qrs.length ? qrs : [createEmptyAccount("qr")]).sort((a, b) =>
          a.name.localeCompare(b.name, "ja")
        )
      );
      setCardAccounts(
        (cards.length ? cards : [createEmptyAccount("card")]).sort((a, b) =>
          a.name.localeCompare(b.name, "ja")
        )
      );
    } catch (e) {
      console.error("accounts の読み込みに失敗しました", e);
      setBankAccounts([createEmptyAccount("bank")]);
      setWalletAccounts([createEmptyAccount("wallet")]);
      setQrAccounts([createEmptyAccount("qr")]);
      setCardAccounts([createEmptyAccount("card")]);
    }
  }, []);

  // 共通：名称変更（銀行・財布・QR・カード）
  const handleNameChange =
    (type: AccountType, id: string) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      const update = (list: Account[]): Account[] =>
        list.map((a) => (a.id === id ? { ...a, name: value } : a));

      if (type === "bank") setBankAccounts((prev) => update(prev));
      if (type === "wallet") setWalletAccounts((prev) => update(prev));
      if (type === "qr") setQrAccounts((prev) => update(prev));
      if (type === "card") setCardAccounts((prev) => update(prev));
    };

  // カード専用：締め日・支払日
  const handleCardNumberChange =
    (id: string, field: "closingDay" | "paymentDay") =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      const num = raw === "" ? undefined : Number(raw);

      setCardAccounts((prev) =>
        prev.map((a) =>
          a.id === id ? { ...a, [field]: num && !Number.isNaN(num) ? num : undefined } : a
        )
      );
    };

  const handleAddRow = (type: AccountType) => {
    if (type === "bank")
      setBankAccounts((prev) => [...prev, createEmptyAccount("bank")]);
    if (type === "wallet")
      setWalletAccounts((prev) => [...prev, createEmptyAccount("wallet")]);
    if (type === "qr")
      setQrAccounts((prev) => [...prev, createEmptyAccount("qr")]);
    if (type === "card")
      setCardAccounts((prev) => [...prev, createEmptyAccount("card")]);
  };

  const handleRemoveRow = (type: AccountType, id: string) => {
    const remove = (list: Account[]): Account[] =>
      list.filter((a) => a.id !== id);

    if (type === "bank")
      setBankAccounts((prev) =>
        remove(prev).length === 0 ? [createEmptyAccount("bank")] : remove(prev)
      );
    if (type === "wallet")
      setWalletAccounts((prev) =>
        remove(prev).length === 0 ? [createEmptyAccount("wallet")] : remove(prev)
      );
    if (type === "qr")
      setQrAccounts((prev) =>
        remove(prev).length === 0 ? [createEmptyAccount("qr")] : remove(prev)
      );
    if (type === "card")
      setCardAccounts((prev) =>
        remove(prev).length === 0 ? [createEmptyAccount("card")] : remove(prev)
      );
  };

  const handleSave = () => {
    if (typeof window === "undefined") return;

    const clean = (list: Account[]) =>
      list.filter((a) => a.name.trim() !== "");

    const merged: Account[] = [
      ...clean(bankAccounts).map((a) => ({ ...a, type: "bank" as const })),
      ...clean(walletAccounts).map((a) => ({ ...a, type: "wallet" as const })),
      ...clean(qrAccounts).map((a) => ({ ...a, type: "qr" as const })),
      ...clean(cardAccounts).map((a) => ({ ...a, type: "card" as const })),
    ];

    try {
      localStorage.setItem("accounts", JSON.stringify(merged));
      alert("口座・財布・QR・カードの設定を保存しました！");
    } catch (e) {
      console.error("accounts の保存に失敗しました", e);
      alert("保存に失敗しました…（コンソールを確認してみてください）");
    }
  };

  const renderSimpleTable = (type: AccountType, rows: Account[], title: string) => (
    <div className="app-card" style={{ marginBottom: 16 }}>
      <h2>{title}</h2>
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          fontSize: "14px",
        }}
      >
        <thead>
          <tr>
            <th style={{ textAlign: "left", padding: "4px 6px" }}>名称</th>
            <th style={{ textAlign: "center", padding: "4px 6px" }}>操作</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((a) => (
            <tr key={a.id}>
              <td style={{ padding: "4px 6px" }}>
                <input
                  type="text"
                  value={a.name}
                  onChange={handleNameChange(type, a.id)}
                  style={{
                    width: "100%",
                    padding: "4px 6px",
                    borderRadius: 4,
                    border: "1px solid #ccb89b",
                  }}
                />
              </td>
              <td style={{ padding: "4px 6px", textAlign: "center" }}>
                <button
                  type="button"
                  onClick={() => handleRemoveRow(type, a.id)}
                  style={{
                    fontSize: "12px",
                    padding: "2px 8px",
                    borderRadius: 999,
                    border: "1px solid #c44536",
                    backgroundColor: "#fff5f3",
                    color: "#c44536",
                    cursor: "pointer",
                  }}
                >
                  削除
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <button
        type="button"
        onClick={() => handleAddRow(type)}
        style={{
          marginTop: 8,
          fontSize: "13px",
          padding: "4px 10px",
          borderRadius: 999,
          border: "1px solid #b58b5a",
          backgroundColor: "#fef6e9",
          cursor: "pointer",
        }}
      >
        行を追加する
      </button>
    </div>
  );

  const renderCardTable = () => (
    <div className="app-card" style={{ marginBottom: 16 }}>
      <h2>【カード】</h2>
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          fontSize: "14px",
        }}
      >
        <thead>
          <tr>
            <th style={{ textAlign: "left", padding: "4px 6px" }}>名称</th>
            <th style={{ textAlign: "right", padding: "4px 6px" }}>締め日</th>
            <th style={{ textAlign: "right", padding: "4px 6px" }}>
              支払日（翌月）
            </th>
            <th style={{ textAlign: "center", padding: "4px 6px" }}>操作</th>
          </tr>
        </thead>
        <tbody>
          {cardAccounts.map((a) => (
            <tr key={a.id}>
              <td style={{ padding: "4px 6px" }}>
                <input
                  type="text"
                  value={a.name}
                  onChange={handleNameChange("card", a.id)}
                  style={{
                    width: "100%",
                    padding: "4px 6px",
                    borderRadius: 4,
                    border: "1px solid #ccb89b",
                  }}
                />
              </td>
              <td style={{ padding: "4px 6px", textAlign: "right" }}>
                <input
                  type="number"
                  min={1}
                  max={31}
                  value={a.closingDay ?? ""}
                  onChange={handleCardNumberChange(a.id, "closingDay")}
                  style={{
                    width: "100%",
                    padding: "4px 6px",
                    borderRadius: 4,
                    border: "1px solid #ccb89b",
                    textAlign: "right",
                  }}
                />
              </td>
              <td style={{ padding: "4px 6px", textAlign: "right" }}>
                <input
                  type="number"
                  min={1}
                  max={31}
                  value={a.paymentDay ?? ""}
                  onChange={handleCardNumberChange(a.id, "paymentDay")}
                  style={{
                    width: "100%",
                    padding: "4px 6px",
                    borderRadius: 4,
                    border: "1px solid #ccb89b",
                    textAlign: "right",
                  }}
                />
              </td>
              <td style={{ padding: "4px 6px", textAlign: "center" }}>
                <button
                  type="button"
                  onClick={() => handleRemoveRow("card", a.id)}
                  style={{
                    fontSize: "12px",
                    padding: "2px 8px",
                    borderRadius: 999,
                    border: "1px solid #c44536",
                    backgroundColor: "#fff5f3",
                    color: "#c44536",
                    cursor: "pointer",
                  }}
                >
                  削除
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <button
        type="button"
        onClick={() => handleAddRow("card")}
        style={{
          marginTop: 8,
          fontSize: "13px",
          padding: "4px 10px",
          borderRadius: 999,
          border: "1px solid #b58b5a",
          backgroundColor: "#fef6e9",
          cursor: "pointer",
        }}
      >
        行を追加する
      </button>
    </div>
  );

  return (
    <div className="page-container">
      <h1>残高設定（現金・口座・QR・カードなど）</h1>
      <p style={{ marginBottom: 16 }}>
        普段使う銀行口座・財布・QR決済・クレジットカードの種類を登録します。
        <br />
        ここで登録した名称が、入力画面の「支払い方法」などで選べるようになります。
        <br />
        残高そのものは、入力した明細（収入・支出）から自動で計算されます。
      </p>

      {renderSimpleTable("bank", bankAccounts, "【銀行口座】")}
      {renderSimpleTable("wallet", walletAccounts, "【財布】")}
      {renderSimpleTable("qr", qrAccounts, "【QR】")}
      {renderCardTable()}

      <button
        type="button"
        onClick={handleSave}
        style={{
          marginTop: 16,
          padding: "8px 16px",
          borderRadius: 6,
          border: "none",
          backgroundColor: "#b58b5a",
          color: "#fff",
          cursor: "pointer",
        }}
      >
        すべて保存する
      </button>

      <div style={{ marginTop: 16, fontSize: 14 }}>
        <a href="/">◀ ホームに戻る</a>
      </div>
    </div>
  );
}