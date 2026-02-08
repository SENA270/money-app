"use client";

import React, { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { X, Sparkles, ChevronDown, ChevronUp } from "lucide-react";
import { APP_VERSION, CHANGELOG } from "../constants/version";

export default function UpdateNotification() {
  const [isOpen, setIsOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    // ホーム画面("/")以外では表示判定を行わない
    if (pathname !== "/") return;

    const lastCheckedVersion = localStorage.getItem("app_last_checked_version");
    if (lastCheckedVersion !== APP_VERSION) {
      setIsOpen(true);
    }
  }, [pathname]);

  const handleClose = () => {
    localStorage.setItem("app_last_checked_version", APP_VERSION);
    setIsOpen(false);
  };

  if (!isOpen) return null;

  const currentUpdate = CHANGELOG[0];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#fffaf5] w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden animate-slide-up border border-[#e6dcd2]">
        {/* Header with gradient */}
        <div className="bg-gradient-to-r from-[#b58b5a] to-[#d4a373] p-5 text-white relative">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-xl">
              <Sparkles size={24} />
            </div>
            <div>
              <h3 className="font-bold text-lg leading-tight">アップデートのお知らせ</h3>
              <p className="text-white/80 text-[10px] m-0">Version {APP_VERSION}</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 p-1 rounded-full hover:bg-white/20 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="mb-4">
            <h4 className="text-[#3b2a1a] font-bold text-sm mb-2">{currentUpdate.title}</h4>
            <ul className="space-y-2 m-0 p-0 list-none">
              {currentUpdate.items.slice(0, 3).map((item, idx) => (
                <li key={idx} className="flex gap-2 text-xs text-[#5d4330] leading-relaxed">
                  <span className="text-[#b58b5a] mt-1">•</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* More items (optional toggle) */}
          {currentUpdate.items.length > 3 && (
            <div className="mb-4">
              {showAll && (
                <ul className="space-y-2 m-0 p-0 list-none mb-3 animate-fade-in">
                  {currentUpdate.items.slice(3).map((item, idx) => (
                    <li key={idx} className="flex gap-2 text-xs text-[#5d4330] leading-relaxed">
                      <span className="text-[#b58b5a] mt-1">•</span>
                      {item}
                    </li>
                  ))}
                </ul>
              )}
              <button
                onClick={() => setShowAll(!showAll)}
                className="flex items-center gap-1 text-[11px] font-bold text-[#b58b5a] hover:opacity-80 mx-auto"
              >
                {showAll ? (
                  <>折りたたむ <ChevronUp size={12} /></>
                ) : (
                  <>もっと見る ({currentUpdate.items.length - 3}件) <ChevronDown size={12} /></>
                )}
              </button>
            </div>
          )}

          <button
            onClick={handleClose}
            className="w-full bg-[#3b2a1a] text-white font-bold py-3.5 rounded-2xl shadow-md active:scale-95 transition-transform mt-2"
          >
            確認しました
          </button>
        </div>
      </div>
    </div>
  );
}
