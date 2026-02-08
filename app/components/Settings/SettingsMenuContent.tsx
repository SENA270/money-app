"use client";

import React from "react";
import {
  Landmark,
  Calendar,
  Database,
  Tag,
  PiggyBank,
  CreditCard,
  Settings2,
  FileText,
  Keyboard
} from "lucide-react";
import SettingsCard from "./SettingsCard";
import SettingsListItem from "./SettingsListItem";

type SettingsMenuContentProps = {
  onLinkClick?: () => void;
};

export default function SettingsMenuContent({ onLinkClick }: SettingsMenuContentProps) {
  return (
    <div className="pb-8">
      {/* Group 1: Money Management (Money) */}
      <section className="mb-8">
        <h2 className="text-sm font-bold text-[#bcaaa4] mb-3 px-1 flex items-center gap-2">
          <Landmark size={14} />
          資産・家計設定
        </h2>
        <div className="flex flex-col gap-4">
          <SettingsCard
            href="/settings/accounts"
            icon={<Landmark size={24} />}
            color="text-emerald-700 bg-emerald-50"
            title="口座・カード管理"
            description="銀行・財布・クレジット設定"
            onClick={onLinkClick}
          />
          <SettingsCard
            href="/settings/fixed"
            icon={<Calendar size={24} />}
            color="text-orange-700 bg-orange-50"
            title="毎月のお金（固定費）"
            description="家賃・給料・サブスク"
            onClick={onLinkClick}
          />
          <SettingsCard
            href="/settings/loan"
            icon={<CreditCard size={24} />}
            color="text-red-700 bg-red-50"
            title="借金・ローン"
            description="返済条件・残高管理"
            onClick={onLinkClick}
          />
          <SettingsCard
            href="/settings/saving"
            icon={<PiggyBank size={24} />}
            color="text-pink-700 bg-pink-50"
            title="貯金目標"
            description="目標金額・期限設定"
            onClick={onLinkClick}
          />
        </div>
      </section>

      {/* Group 2: App Preferences (Preferences) */}
      <section className="mb-8">
        <h2 className="text-sm font-bold text-[#bcaaa4] mb-3 px-1 flex items-center gap-2">
          <Settings2 size={14} />
          アプリ設定
        </h2>
        <div className="bg-white rounded-2xl shadow-sm border border-[#e6dcd2] overflow-hidden">
          <SettingsListItem
            href="/settings/categories"
            icon={<Tag size={18} className="text-[#5d4330]" />}
            title="カテゴリ設定"
            onClick={onLinkClick}
          />
          <SettingsListItem
            href="/settings/input"
            icon={<Keyboard size={18} className="text-[#5d4330]" />}
            title="入力設定"
            onClick={onLinkClick}
          />
          <SettingsListItem
            href="/settings/templates"
            icon={<FileText size={18} className="text-[#5d4330]" />}
            title="テンプレート管理"
            isLast
            onClick={onLinkClick}
          />
        </div>
      </section>

      {/* Group 3: Data Management (Data) */}
      <section className="mb-8">
        <h2 className="text-sm font-bold text-[#bcaaa4] mb-3 px-1 flex items-center gap-2">
          <Database size={14} />
          データ管理
        </h2>
        <div className="flex flex-col gap-4">
          <SettingsCard
            href="/settings/export"
            icon={<Database size={24} />}
            color="text-blue-700 bg-blue-50"
            title="バックアップ・出力"
            description="CSVエクスポート"
            onClick={onLinkClick}
          />
        </div>
      </section>
    </div>
  );
}
