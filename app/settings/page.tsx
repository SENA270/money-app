



// app/settings/page.tsx
"use client";

import SettingsMenuContent from "../components/Settings/SettingsMenuContent";

export default function SettingsTopPage() {
  return (
    <div className="page-container" style={{ paddingBottom: 100 }}>
      <h1 className="text-xl font-bold text-[#3b2a1a] mb-2 px-1">設定</h1>
      <p className="text-sm text-[#8c7b6c] mb-6 px-1">
        アプリの基本設定を管理します。
      </p>

      <SettingsMenuContent />
    </div>
  );
}
