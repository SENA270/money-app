"use client";

import React from "react";
import { AlertTriangle, CheckCircle } from "lucide-react";

type Props = {
  daysUntilDanger: number | null;
  dangerDate: Date | null;
};

export default function ForecastHealthWidget({ daysUntilDanger, dangerDate }: Props) {
  if (daysUntilDanger !== null && dangerDate) {
    return (
      <div className="animate-fade-in" style={{
        marginTop: 12,
        padding: "10px 14px",
        background: "#fff5f5",
        borderRadius: 8,
        border: "1px solid #feb2b2",
        color: "#c53030",
        fontSize: 13,
        display: "flex",
        alignItems: "center",
        gap: 8,
        fontWeight: 500
      }}>
        <AlertTriangle size={18} />
        <span>
          {daysUntilDanger}日後 ({dangerDate.getMonth() + 1}/{dangerDate.getDate()}) に資金ショートの可能性があります
        </span>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{
      marginTop: 12,
      padding: "10px 14px",
      background: "#f0fff4",
      borderRadius: 8,
      border: "1px solid #9ae6b4",
      color: "#2f855a",
      fontSize: 13,
      display: "flex",
      alignItems: "center",
      gap: 8,
      fontWeight: 500
    }}>
      <CheckCircle size={18} />
      <span>当面の資金繰りは安全です</span>
    </div>
  );
}
