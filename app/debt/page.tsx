// app/debt/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { getLoans, LoanWithStatus } from "@/app/lib/loans";
import { Plus, ChevronRight, TrendingDown, Calendar, AlertCircle, Wallet, ArrowRight } from "lucide-react";
import TransactionQuickForm from "../components/Input/TransactionQuickForm";

export default function DebtPage() {
  const router = useRouter();
  const [loans, setLoans] = useState<LoanWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalDebt, setTotalDebt] = useState(0);

  // Modal State for Step 2 (Prepared but hidden or basic implementation)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedLoanId, setSelectedLoanId] = useState<string | null>(null);

  useEffect(() => {
    fetchLoans();
  }, []);

  async function fetchLoans() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/auth");
        return;
      }

      const data = await getLoans(user.id);
      setLoans(data);

      const total = data.reduce((sum, loan) => sum + loan.remaining_balance, 0);
      setTotalDebt(total);
    } catch (error) {
      console.error("Failed to fetch loans", error);
    } finally {
      setLoading(false);
    }
  }

  // Format Helper: Counts -> Years/Months
  const formatRemainingTime = (counts: number | null) => {
    if (!counts) return "不明";
    if (counts < 12) return `あと約${counts}ヶ月`;
    const years = Math.floor(counts / 12);
    const months = counts % 12;
    return `あと約${years}年${months > 0 ? `${months}ヶ月` : ''}`;
  };

  const handleOpenRepayment = (e: React.MouseEvent, loanId: string) => {
    e.preventDefault(); // Prevent Link navigation
    setSelectedLoanId(loanId);
    setIsModalOpen(true);
  };

  const handleRepaymentSuccess = () => {
    setIsModalOpen(false);
    setSelectedLoanId(null);
    setLoading(true);
    fetchLoans(); // Refresh data immediately
  };

  if (loading) {
    return (
      <div className="page-container flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#b58b5a]"></div>
      </div>
    );
  }

  return (
    <div className="page-container padding-bottom-nav" style={{ paddingBottom: 100 }}>

      {/* Header Area */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h1 style={{ fontSize: 22, fontWeight: "bold", color: "#3b2a1a", margin: 0 }}>
            借金・ローン管理
          </h1>
          <Link href="/debt/new" className="btn-secondary" style={{ padding: "8px 12px", display: "flex", gap: 4 }}>
            <Plus className="w-4 h-4" /> 追加
          </Link>
        </div>
      </div>

      {/* 1. Summary Card (Big Impact) */}
      <section className="app-card" style={{
        background: "linear-gradient(135deg, #fffaf5 0%, #fff0e0 100%)",
        border: "1px solid #e6dcd2",
        padding: "24px",
        marginBottom: "24px"
      }}>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[#8c7b6c] text-xs font-semibold uppercase tracking-wider mb-2">借入残高合計</p>
            <h2 className="text-3xl font-bold text-[#5d4330] tracking-tight font-mono">
              ¥{totalDebt.toLocaleString()}
            </h2>
          </div>
          <div className="p-3 bg-red-100 rounded-full">
            <TrendingDown className="w-6 h-6 text-red-500" />
          </div>
        </div>

        {/* Active Loan Count Badge */}
        <div className="mt-4 inline-flex items-center gap-2 text-xs text-red-700 bg-red-50 px-3 py-1.5 rounded-full border border-red-100 font-medium">
          <AlertCircle className="w-3.5 h-3.5" />
          <span>返済中: {loans.filter(l => l.status === 'active').length} 件</span>
        </div>
      </section>

      {/* 2. Loan List */}
      <section className="space-y-4">
        <h3 className="text-sm font-semibold text-[#8c7b6c] uppercase tracking-wider pl-1 mb-3">登録済みローン</h3>

        {loans.length === 0 ? (
          <div className="text-center py-12 bg-[#fffaf5] rounded-3xl border border-[#e6dcd2] border-dashed">
            <p className="text-[#8c7b6c] mb-4">登録されたローンはありません</p>
            <Link
              href="/debt/new"
              className="btn-primary inline-flex w-auto px-6"
            >
              <Plus className="w-4 h-4 mr-2" />
              ローンを追加する
            </Link>
          </div>
        ) : (
          <div className="grid gap-4">
            {loans.map((loan) => (
              <div
                key={loan.id}
                className="app-card transition-all hover:shadow-md relative"
                style={{ padding: 0, overflow: "hidden", marginBottom: 0 }}
              >
                <Link href={`/debt/${loan.id}`} className="block p-5 pb-4">

                  {/* Card Header: Name & Balance */}
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1 pr-4">
                      <h4 className="font-bold text-lg text-[#3b2a1a] leading-tight mb-1">
                        {loan.name}
                      </h4>
                      <div className="text-xs text-[#8c7b6c] flex items-center gap-1">
                        {formatRemainingTime(loan.remaining_payments)}
                        {loan.estimated_completion_date && (
                          <span className="text-[10px] bg-[#f0f0f0] px-1.5 py-0.5 rounded text-[#666]">
                            {new Date(loan.estimated_completion_date).getFullYear()}年頃 完済
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-[#8c7b6c] mb-0.5 font-bold">残高</p>
                      <p className="font-mono text-xl font-bold text-[#3b2a1a] tracking-tight">¥{loan.remaining_balance.toLocaleString()}</p>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-4">
                    <div className="flex justify-between text-[10px] text-[#8c7b6c] mb-1">
                      <span>進捗状況</span>
                      <span>{loan.progress.toFixed(0)}% 完了</span>
                    </div>
                    <div className="relative h-2.5 w-full bg-[#f0ebde] rounded-full overflow-hidden">
                      <div
                        className={`absolute top-0 left-0 h-full rounded-full transition-all duration-1000 ease-out ${loan.progress >= 100 ? 'bg-[#2f855a]' : 'bg-gradient-to-r from-[#b58b5a] to-[#9a7245]'}`}
                        style={{ width: `${loan.progress}%` }}
                      />
                    </div>
                  </div>

                  {/* Next Payment Info (Mini) */}
                  <div className="flex items-center gap-3 text-xs bg-[#f9f5ef] p-2 rounded-lg border border-[#f0ebde]">
                    <div className="flex items-center gap-1.5 text-[#5d4330] font-medium">
                      <Calendar className="w-3.5 h-3.5 text-[#b58b5a]" />
                      <span>次回: {loan.next_payment_date ? new Date(loan.next_payment_date).toLocaleDateString() : '未定'}</span>
                    </div>
                    <div className="text-[#8c7b6c]">|</div>
                    <div className="text-[#5d4330]">
                      {loan.repayment_rule === 'monthly' ? `月々 ¥${loan.monthly_amount?.toLocaleString()}` : 'ボーナス併用など'}
                    </div>
                  </div>
                </Link>

                {/* Action Buttons (Footer) */}
                <div className="border-t border-[#f0ebde] p-3 flex gap-3 bg-[#fffaf5]">
                  <Link
                    href={`/debt/${loan.id}`}
                    className="flex-1 btn-secondary text-xs flex justify-center items-center py-2.5 h-auto text-[#666] border-[#e0d6c8] bg-white hover:bg-[#fafafa]"
                  >
                    詳細を見る
                  </Link>
                  <button
                    onClick={(e) => handleOpenRepayment(e, loan.id)}
                    className="flex-1 btn-primary text-xs flex justify-center items-center py-2.5 h-auto shadow-sm"
                    style={{ minHeight: "36px" }} // Override default large button
                  >
                    <Wallet className="w-3.5 h-3.5 mr-1.5" />
                    返済を記録
                  </button>
                </div>

              </div>
            ))}
          </div>
        )}
      </section>

      {/* Step 2: Repayment Modal */}
      {isModalOpen && selectedLoanId && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.5)", zIndex: 3000,
          display: "flex", alignItems: "center", justifyContent: "center", padding: 16
        }}>
          <div className="animate-fade-in-up" style={{
            background: "#fff",
            padding: 24,
            borderRadius: 20,
            width: "100%",
            maxWidth: 400,
            maxHeight: "85vh",
            overflowY: "auto",
            boxShadow: "0 10px 40px rgba(0,0,0,0.2)"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20, alignItems: "center" }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: "bold", color: "#3b2a1a" }}>返済を記録</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{ border: "none", background: "#f5f5f5", width: 32, height: 32, borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#666" }}
              >
                ×
              </button>
            </div>

            <TransactionQuickForm
              onSuccess={handleRepaymentSuccess}
              initialValues={{
                type: "repayment",
                loanId: selectedLoanId,
                date: new Date().toISOString().slice(0, 10), // Default to today
              }}
            />
          </div>
        </div>
      )}

    </div>
  );
}
