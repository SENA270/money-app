"use client";

import React from "react";
import Link from "next/link";
import {
  X,
  LogOut,
  ChevronRight
} from "lucide-react";
import { supabase } from "../../lib/supabaseClient";
import { useRouter } from "next/navigation";
import SettingsMenuContent from "./Settings/SettingsMenuContent";

type MenuSheetProps = {
  isOpen: boolean;
  onClose: () => void;
};

export default function MenuSheet({ isOpen, onClose }: MenuSheetProps) {
  const router = useRouter();

  if (!isOpen) return null;

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
    onClose();
  };



  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div
        className="bg-[#f4eddc] w-full max-w-md rounded-t-3xl p-6 pb-12 shadow-2xl animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="w-12 h-1.5 bg-[#d7ccc8] rounded-full mx-auto mb-6 opacity-80" />

        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-[#3b2a1a]">メニュー</h3>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-black/5 text-[#8c7b6c]">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[70vh] -mx-6 px-6">
          <SettingsMenuContent onLinkClick={onClose} />
        </div>

        {/* Logout */}
        <div className="mt-8 border-t border-[#d7ccc8] pt-6">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 text-sm font-medium text-[#b55c3b] py-3 rounded-xl hover:bg-[#fff5f5] transition-colors"
          >
            <LogOut size={16} />
            ログアウト
          </button>
        </div>
      </div>
    </div>
  );
}
