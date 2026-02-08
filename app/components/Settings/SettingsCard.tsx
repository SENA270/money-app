"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import React from "react";

type SettingsCardProps = {
  href: string;
  icon: React.ReactNode;
  color: string;
  title: string;
  description: string;
  onClick?: () => void;
};

export default function SettingsCard({ href, icon, color, title, description, onClick }: SettingsCardProps) {
  return (
    <Link href={href} className="block no-underline" onClick={onClick}>
      <div className="bg-white rounded-2xl p-4 flex items-center gap-4 shadow-sm border border-[#f0ebde] transition-transform active:scale-[0.98]">
        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${color}`}>
          {icon}
        </div>
        <div className="flex-1">
          <h3 className="text-base font-bold text-[#3b2a1a] m-0 mb-1">{title}</h3>
          <p className="text-xs text-[#8c7b6c] m-0">{description}</p>
        </div>
        <ChevronRight size={20} className="text-[#d7ccc8]" />
      </div>
    </Link>
  );
}
