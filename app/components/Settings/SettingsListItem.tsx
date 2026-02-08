"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import React from "react";

type SettingsListItemProps = {
  href: string;
  icon: React.ReactNode;
  title: string;
  isLast?: boolean;
  onClick?: () => void;
};

export default function SettingsListItem({ href, icon, title, isLast, onClick }: SettingsListItemProps) {
  return (
    <Link href={href} className="block no-underline" onClick={onClick}>
      <div className={`
        flex items-center gap-3 p-4 bg-white transition-colors hover:bg-gray-50
        ${!isLast ? 'border-b border-[#f5efe6]' : ''}
      `}>
        <div className="w-8 h-8 flex items-center justify-center bg-[#fff8e1] rounded-lg">
          {icon}
        </div>
        <div className="flex-1 text-[15px] font-medium text-[#3b2a1a]">
          {title}
        </div>
        <ChevronRight size={18} className="text-[#d7ccc8]" />
      </div>
    </Link>
  );
}
