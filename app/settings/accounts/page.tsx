// app/settings/accounts/page.tsx
"use client";

import { useEffect, useState } from "react";

type AccountType = "bank" | "wallet" | "qr" | "card";

type Account = {
  id: string;
  type: AccountType;
  name: string;
  // カード専用
  closingDay?: number; // 締め日
  paymentDay?: number; // 支払日（翌月）
  paymentKey?: string; // 内訳キー（明細の payment と紐付ける用）
};

function createEmptyAccount(type: AccountType): Account {
  return {
    id: `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type,
    name: "",
  };
}

function AccountSettingsInnerPage() {
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
            a.id === id
              ? { ...a, [field]: num && !Number.isNaN(num) ? num : undefined }
              : a
          )
        );
      };

  // カード専用：内訳キー
  const handleCardPaymentKeyChange =
    (id: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setCardAccounts((prev) =>
        prev.map((a) =>
          a.id === id ? { ...a, paymentKey: value } : a
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

  const renderSimpleTable = (
    type: AccountType,
    rows: Account[],
    title: string
  ) => (
    <div className="app-card" style={{ marginBottom: 16 }}>
      <h2>{title}</h2>
      <div className="table-wrapper">
        <table className="table-basic" style={{ minWidth: "350px" }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left" }}>名称</th>
              <th style={{ textAlign: "center", width: "80px" }}>操作</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((a) => (
              <tr key={a.id}>
                <td>
                  <input
                    type="text"
                    value={a.name}
                    onChange={handleNameChange(type, a.id)}
                    className="form-input"
                    placeholder="名称を入力"
                  />
                </td>
                <td style={{ textAlign: "center" }}>
                  <button
                    type="button"
                    onClick={() => handleRemoveRow(type, a.id)}
                    className="btn-secondary"
                    style={{
                      padding: "4px 10px",
                      fontSize: "12px",
                      minHeight: "auto",
                      backgroundColor: "#fff5f3",
                      color: "#c44536",
                      borderColor: "#c44536",
                    }}
                  >
                    削除
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button
        type="button"
        onClick={() => handleAddRow(type)}
        className="btn-secondary"
        style={{ marginTop: 12, fontSize: "13px", padding: "6px 12px", minHeight: "36px" }}
      >
        ＋ 行を追加する
      </button>
    </div>
  );

  const renderCardTable = () => (
    <div className="app-card" style={{ marginBottom: 16 }}>
      <h2>【カード】</h2>
      <div className="table-wrapper">
        <table className="table-basic" style={{ minWidth: "600px" }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left" }}>名称</th>
              <th style={{ textAlign: "left" }}>内訳キー（任意）</th>
              <th style={{ textAlign: "right", width: "80px" }}>締め日</th>
              <th style={{ textAlign: "right", width: "80px" }}>支払日(翌月)</th>
              <th style={{ textAlign: "center", width: "80px" }}>操作</th>
            </tr>
          </thead>
          <tbody>
            {cardAccounts.map((a) => (
              <tr key={a.id}>
                <td>
                  <input
                    type="text"
                    value={a.name}
                    onChange={handleNameChange("card", a.id)}
                    className="form-input"
                    placeholder="カード名称"
                  />
                </td>
                <td>
                  <input
                    type="text"
                    value={a.paymentKey ?? ""}
                    onChange={handleCardPaymentKeyChange(a.id)}
                    className="form-input"
                    placeholder="例：セゾンカード"
                    style={{ fontSize: "13px" }}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    min={1}
                    max={31}
                    value={a.closingDay ?? ""}
                    onChange={handleCardNumberChange(a.id, "closingDay")}
                    className="form-input"
                    style={{ textAlign: "right" }}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    min={1}
                    max={31}
                    value={a.paymentDay ?? ""}
                    onChange={handleCardNumberChange(a.id, "paymentDay")}
                    className="form-input"
                    style={{ textAlign: "right" }}
                  />
                </td>
                <td style={{ textAlign: "center" }}>
                  <button
                    type="button"
                    onClick={() => handleRemoveRow("card", a.id)}
                    className="btn-secondary"
                    style={{
                      padding: "4px 10px",
                      fontSize: "12px",
                      minHeight: "auto",
                      backgroundColor: "#fff5f3",
                      color: "#c44536",
                      borderColor: "#c44536",
                    }}
                  >
                    削除
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button
        type="button"
        onClick={() => handleAddRow("card")}
        className="btn-secondary"
        style={{ marginTop: 12, fontSize: "13px", padding: "6px 12px", minHeight: "36px" }}
      >
        ＋ 行を追加する
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

      <div style={{ marginTop: 24, paddingBottom: 40 }}>
        <button
          type="button"
          onClick={handleSave}
          className="btn-primary"
          style={{ width: "100%", maxWidth: "300px" }}
        >
          すべて保存する
        </button>
      </div>

      <div style={{ marginTop: 16, fontSize: 14 }}>
        <a href="/settings">◀ 設定一覧に戻る</a>
      </div>
    </div>
  );
}

export default function ProtectedAccountSettingsPage() {
  return <AccountSettingsInnerPage />;
}
