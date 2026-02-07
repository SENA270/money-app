"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { getLoanDetails } from "@/app/lib/loans";
import { saveTransaction } from "@/app/lib/transaction/saveTransaction";
import { ArrowLeft, CheckCircle, Plus, History, TrendingUp, Calendar, X } from "lucide-react";

export default function LoanDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [loan, setLoan] = useState<any>(null); // Type check later
  const [loading, setLoading] = useState(true);
  const [showRepayForm, setShowRepayForm] = useState(false);

  // Repayment Form State
  const [repayAmount, setRepayAmount] = useState("");
  const [repayDate, setRepayDate] = useState(new Date().toISOString().slice(0, 10));
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (id) fetchDetails();
  }, [id]);

  async function fetchDetails() {
    try {
      const data = await getLoanDetails(id);
      const progress = data.principal > 0 ? (data.total_repaid / data.principal) * 100 : 0;
      setLoan({ ...data, progress });

    } catch (error) {
      console.error("Error fetching loan details:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleRepayment(e: React.FormEvent) {
    e.preventDefault();
    if (!repayAmount) return;
    setSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not found");

      // saveTransaction handles default Category/Payment for 'repayment' type if missing
      await saveTransaction({
        user_id: user.id,
        amount: parseFloat(repayAmount),
        type: "repayment",
        loan_id: id,
        date: repayDate,
        memo: "手動返済記録"
      });

      // Refresh
      setRepayAmount("");
      setShowRepayForm(false);
      fetchDetails();

    } catch (error) {
      console.error("Repayment failed:", error);
      alert("返済の記録に失敗しました。");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return (
    <div className="page-container flex justify-center items-center py-20">
      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#b58b5a]"></div>
    </div>
  );

  if (!loan) return <div className="p-6 text-[#5d4330] text-center">Loan not found</div>;

  return (
    <div className="page-container padding-bottom-nav">

      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
          <Link href="/debt" className="btn-secondary" style={{ padding: "8px", borderRadius: "50%", width: 36, height: 36, minHeight: 0 }}>
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 style={{ fontSize: 20, fontWeight: "bold", color: "#3b2a1a", margin: 0 }} className="truncate pr-4">
            {loan.name}
          </h1>
        </div>
      </div>

      <main className="max-w-md mx-auto space-y-6">
        {/* Status Card */}
        <div className="app-card border border-[#e6dcd2] shadow-lg relative overflow-hidden">
          <div className="flex justify-between items-start mb-6 relative z-10">
            <div>
              <p className="text-[#8c7b6c] text-sm font-medium">現在の借入残高</p>
              <h2 className="text-4xl font-bold text-[#5d4330] mt-1 tracking-tight">
                ¥{loan.remaining_balance.toLocaleString()}
              </h2>
            </div>
            {/* Progress Circle or Icon */}
            <div className={`h-12 w-12 rounded-full flex items-center justify-center ${loan.progress >= 100 ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-[#b58b5a]'}`}>
              <TrendingUp className="w-6 h-6" />
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mb-2 flex justify-between text-xs text-[#8c7b6c] relative z-10">
            <span>返済済: ¥{loan.total_repaid.toLocaleString()}</span>
            <span>借入総額: ¥{Number(loan.principal).toLocaleString()}</span>
          </div>
          <div className="relative h-3 w-full bg-[#eee8dc] rounded-full overflow-hidden z-10">
            <div
              className={`absolute top-0 left-0 h-full rounded-full transition-all duration-1000 ${loan.progress >= 100 ? 'bg-[#2f855a]' : 'bg-gradient-to-r from-[#b58b5a] to-[#9a7245]'}`}
              style={{ width: `${loan.progress}%` }}
            />
          </div>
          <p className={`text-right text-xs mt-2 font-mono relative z-10 ${loan.progress >= 100 ? 'text-[#2f855a]' : 'text-[#b58b5a]'}`}>
            {loan.progress.toFixed(1)}% 返済完了
          </p>

          {/* Background decoration */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[#fff7ed] to-transparent rounded-bl-full opacity-50 z-0 pointer-events-none" />
        </div>

        {/* Action: Add Repayment */}
        <div>
          {!showRepayForm ? (
            <button
              onClick={() => setShowRepayForm(true)}
              className="btn-primary w-full flex items-center justify-center gap-2 shadow-lg active:scale-[0.98]"
            >
              <Plus className="w-5 h-5 mr-1" />
              返済を記録する
            </button>
          ) : (
            <div className="app-card border border-[#b58b5a] animate-in slide-in-from-top-2 fade-in bg-[#fffaf5]">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-[#5d4330]">返済を記録</h3>
                <button onClick={() => setShowRepayForm(false)} className="p-1 hover:bg-[#eee8dc] rounded-full">
                  <X className="w-5 h-5 text-[#8c7b6c]" />
                </button>
              </div>
              <form onSubmit={handleRepayment} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="form-group mb-0">
                    <label className="text-xs text-[#8c7b6c] block mb-1.5 font-semibold">日付</label>
                    <input
                      type="date"
                      required
                      value={repayDate}
                      onChange={(e) => setRepayDate(e.target.value)}
                      className="form-input py-2 text-sm"
                    />
                  </div>
                  <div className="form-group mb-0">
                    <label className="text-xs text-[#8c7b6c] block mb-1.5 font-semibold">返済額</label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-[#8c7b6c] text-xs">¥</span>
                      <input
                        type="number"
                        required
                        min="1"
                        value={repayAmount}
                        onChange={(e) => setRepayAmount(e.target.value)}
                        placeholder="0"
                        className="form-input pl-6 py-2 text-sm"
                      />
                    </div>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary w-full py-3 text-sm"
                >
                  {submitting ? <div className="animate-spin h-4 w-4 border-2 border-white rounded-full border-t-transparent mx-auto" /> : '記録する'}
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Transaction History */}
        <section>
          <h3 className="text-lg font-bold text-[#5d4330] mb-4 flex items-center gap-2 border-b border-[#eee8dc] pb-2">
            <History className="w-5 h-5 text-[#b58b5a]" />
            返済履歴
          </h3>

          {loan.transactions && loan.transactions.length > 0 ? (
            <div className="space-y-3">
              {loan.transactions.map((tx: any) => (
                <div key={tx.id} className="flex items-center justify-between p-4 bg-white border border-[#eee8dc] rounded-2xl shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-[#f0fdf4] flex items-center justify-center border border-[#dcfce7]">
                      <CheckCircle className="w-5 h-5 text-[#16a34a]" />
                    </div>
                    <div>
                      <p className="text-[#3b2a1a] font-medium text-sm">返済</p>
                      <p className="text-xs text-[#8c7b6c]">{new Date(tx.date).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <span className="text-[#15803d] font-mono font-bold">
                    -¥{tx.amount.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10 text-[#8c7b6c] bg-[#fffaf5] rounded-2xl border border-[#e6dcd2] border-dashed">
              <p>返済履歴はありません</p>
              <p className="text-xs mt-1">返済を記録するとここに表示されます</p>
            </div>
          )}
        </section>

        {/* Info / Rules */}
        <section className="opacity-80 hover:opacity-100 transition-opacity pb-10">
          <h3 className="text-sm font-bold text-[#8c7b6c] uppercase tracking-wider mb-3 pl-1">
            契約内容・設定
          </h3>
          <div className="app-card space-y-3 text-sm text-[#5d4330]">
            <div className="flex justify-between border-b border-[#eee8dc] pb-2">
              <span className="text-[#8c7b6c]">返済ルール</span>
              <span className="font-medium">
                {loan.repayment_rule === 'monthly' ? '月払い' :
                  loan.repayment_rule === 'semiannual' ? '半年払い併用' : 'カスタム'}
              </span>
            </div>
            {loan.monthly_amount && (
              <div className="flex justify-between border-b border-[#eee8dc] pb-2">
                <span className="text-[#8c7b6c]">月額</span>
                <span className="font-medium">¥{loan.monthly_amount.toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-[#8c7b6c]">次回支払予定日 (目安)</span>
              <span className="font-medium">
                {loan.payment_day ? `毎月 ${loan.payment_day}日` : '未設定'}
                {loan.next_payment_date && <span className="text-xs text-[#8c7b6c] ml-2">({new Date(loan.next_payment_date).toLocaleDateString()})</span>}
              </span>
            </div>
            {loan.estimated_completion_date && (
              <div className="flex justify-between">
                <span className="text-[#8c7b6c]">完済予定日</span>
                <span className="text-[#b58b5a] font-medium">
                  {new Date(loan.estimated_completion_date).toLocaleDateString()}
                </span>
              </div>
            )}
            {loan.remaining_payments && (
              <div className="flex justify-between">
                <span className="text-[#8c7b6c]">残り支払回数 (目安)</span>
                <span className="font-medium">
                  あと {loan.remaining_payments} 回
                </span>
              </div>
            )}
            {loan.repayment_rule === 'semiannual' && loan.bonus_months && (
              <div className="flex justify-between border-t border-[#eee8dc] pt-2 mt-2">
                <span className="text-[#8c7b6c]">ボーナス月</span>
                <span className="text-[#b58b5a] font-medium">
                  {loan.bonus_months.join('月, ')}月
                  <span className="text-xs text-[#8c7b6c] ml-2">(+¥{loan.bonus_amount?.toLocaleString()})</span>
                </span>
              </div>
            )}
          </div>
        </section>

      </main>
    </div>
  );
}
