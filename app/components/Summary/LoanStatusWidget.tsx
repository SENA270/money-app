"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { getLoans } from "@/app/lib/loans";
import { ChevronRight, CreditCard, AlertCircle } from "lucide-react";

export default function LoanStatusWidget() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalBalance: 0,
    monthlyPayment: 0,
    count: 0
  });

  useEffect(() => {
    async function fetch() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const loans = await getLoans(user.id);
      const active = loans.filter(l => l.status === 'active');

      const balance = active.reduce((sum, l) => sum + l.remaining_balance, 0);
      // Estimate monthly payment (sum of monthly_amount)
      const monthly = active.reduce((sum, l) => sum + (Number(l.monthly_amount) || 0), 0);

      setStats({
        totalBalance: balance,
        monthlyPayment: monthly,
        count: active.length
      });
      setLoading(false);
    }
    fetch();
  }, []);

  if (loading) return null; // Or skeleton
  if (stats.count === 0) return null; // Hide if no loans

  return (
    <Link
      href="/debt"
      className="app-card"
      style={{
        marginBottom: 16,
        padding: "16px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        textDecoration: "none",
        background: "linear-gradient(to right, #fffaf5, #fff)",
        border: "1px solid #e6dcd2"
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{
          background: "#ffebee",
          color: "#c62828",
          padding: 10,
          borderRadius: "50%",
          display: "flex", alignItems: "center", justifyContent: "center"
        }}>
          <CreditCard size={20} />
        </div>
        <div>
          <p style={{ fontSize: 11, color: "#8c7b6c", fontWeight: "bold", margin: 0, marginBottom: 2 }}>
            ローン残高 ({stats.count}件)
          </p>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <span style={{ fontSize: 18, fontWeight: 800, color: "#3b2a1a", fontFamily: "monospace" }}>
              ¥{stats.totalBalance.toLocaleString()}
            </span>
            <span style={{ fontSize: 11, color: "#c62828", fontWeight: "500" }}>
              月々 ¥{stats.monthlyPayment.toLocaleString()}
            </span>
          </div>
        </div>
      </div>
      <div>
        <ChevronRight size={20} color="#bcaaa4" />
      </div>
    </Link>
  );
}
