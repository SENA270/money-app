// app/settings/page.tsx
"use client";

import Link from "next/link";

export default function SettingsTopPage() {
  return (
    <div className="page-container">
      <h1>設定</h1>
      <p>収入や予算、貯金、サブスク、返済などの設定をまとめたページです。</p>

      <div className="grid-container">
        <div className="app-card">
          <h2>収入・給料設定</h2>
          <p>毎月の手取り額と給料日を設定します。</p>
          <div style={{ marginTop: 16 }}>
            <Link href="/settings/income" className="btn-secondary">
              設定へ進む
            </Link>
          </div>
        </div>

        {/* ★ カテゴリ設定 */}
        <div className="app-card">
          <h2>カテゴリ設定</h2>
          <p>支出・収入で使うカテゴリを登録します。</p>
          <div style={{ marginTop: 16 }}>
            <Link href="/settings/categories" className="btn-secondary">
              設定へ進む
            </Link>
          </div>
        </div>

        <div className="app-card">
          <h2>貯金目標設定</h2>
          <p>いつまでにいくら貯めたいかを設定します。</p>
          <div style={{ marginTop: 16 }}>
            <Link href="/settings/saving" className="btn-secondary">
              設定へ進む
            </Link>
          </div>
        </div>

        <div className="app-card">
          <h2>サブスク設定</h2>
          <p>毎月発生するサブスク（固定費）を登録します。</p>
          <div style={{ marginTop: 16 }}>
            <Link href="/settings/subscription" className="btn-secondary">
              設定へ進む
            </Link>
          </div>
        </div>

        <div className="app-card">
          <h2>返済設定</h2>
          <p>奨学金や分割払いの残高・毎月の返済額を登録します。</p>
          <div style={{ marginTop: 16 }}>
            <Link href="/settings/loan" className="btn-secondary">
              設定へ進む
            </Link>
          </div>
        </div>

        <div className="app-card">
          <h2>残高設定</h2>
          <p>銀行口座・財布・QR・クレカの名称を登録します。</p>
          <div style={{ marginTop: 16 }}>
            <Link href="/settings/accounts" className="btn-secondary">
              設定へ進む
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
