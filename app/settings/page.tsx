// app/settings/page.tsx
"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function SettingsTopPage() {
  // ★ ログインチェック（他ページと同じ方式）
  useEffect(() => {
    if (typeof window === "undefined") return;
    const user = window.localStorage.getItem("authUser");
    if (!user) {
      window.location.href = "/login";
    }
  }, []);

  return (
    <div className="page-container">
      <h1>設定</h1>
      <p>収入や予算、貯金、サブスク、返済などの設定をまとめたページです。</p>

      <div className="app-card">
        <h2>収入・給料設定</h2>
        <p>毎月の手取り額と給料日を設定します。</p>
        <Link href="/settings/income">▶ 収入・給料の設定へ</Link>
      </div>

      {/* ★ カテゴリ設定 */}
      <div className="app-card">
        <h2>カテゴリ設定</h2>
        <p>支出・収入で使うカテゴリを登録します。入力画面などで選択できる一覧になります。</p>
        <Link href="/settings/categories">▶ カテゴリの設定へ</Link>
      </div>

      <div className="app-card">
        <h2>貯金目標設定</h2>
        <p>いつまでにいくら貯めたいかを設定します。月あたりの必要額も自動計算します。</p>
        <Link href="/settings/saving">▶ 貯金目標の設定へ</Link>
      </div>

      <div className="app-card">
        <h2>サブスク設定</h2>
        <p>毎月発生するサブスク（固定費）を登録します。</p>
        <Link href="/settings/subscription">▶ サブスクの設定へ</Link>
      </div>

      <div className="app-card">
        <h2>返済設定（奨学金・分割など）</h2>
        <p>奨学金や分割払いの残高・毎月の返済額を登録します。</p>
        <Link href="/settings/loan">▶ 返済の設定へ</Link>
      </div>

      <div className="app-card">
        <h2>残高設定（現金・口座・カードなど）</h2>
        <p>普段使う銀行口座・財布・QR決済・クレジットカードの「名前」を登録します。</p>
        <Link href="/settings/accounts">▶ 残高の設定へ</Link>
      </div>
    </div>
  );
}