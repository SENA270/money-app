"use client";

import { useState } from "react";
import Link from "next/link";
import { useLoans, Loan } from "../../hooks/useLoans";
import EditLoanModal from "../../components/Settings/EditLoanModal";
import { Plus, Edit2, Calendar, CreditCard } from "lucide-react";

export default function LoanSettingsPage() {
  const { loans, loading, updateLoan } = useLoans();
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleEdit = (loan: Loan) => {
    setSelectedLoan(loan);
    setIsModalOpen(true);
  };

  const handleSave = async (id: string, updates: Partial<Loan>) => {
    await updateLoan(id, updates);
    setIsModalOpen(false);
  };

  const formatCurrency = (val: number) => `¥${val.toLocaleString()}`;

  if (loading) {
    return (
      <div className="page-container flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#b58b5a]"></div>
      </div>
    );
  }

  return (
    <div className="page-container pb-24">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-[#3b2a1a]">返済設定 (ローン管理)</h1>
        <Link href="/debt/new" className="btn-secondary text-sm flex items-center px-3 py-2 gap-1 rounded-full">
          <Plus className="w-4 h-4" />
          新規追加
        </Link>
      </div>

      <p className="text-sm text-gray-600 mb-6 bg-gray-50 p-4 rounded-xl border border-gray-100">
        登録済みのローンや分割払いの条件を変更できます。<br />
        <span className="text-xs text-gray-500 mt-1 block">
          ※ 変更は次回の返済予定から適用されます。過去の履歴は維持されます。
        </span>
      </p>

      <div className="space-y-4">
        {loans.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
            <p className="text-gray-500 mb-4">登録されたローンはありません</p>
            <Link href="/debt/new" className="text-[#b58b5a] font-bold underline">
              ローンを登録する
            </Link>
          </div>
        ) : (
          loans.map((loan) => (
            <div key={loan.id} className="bg-white rounded-2xl shadow-lg border-0 ring-1 ring-black/5 overflow-hidden transition-transform hover:scale-[1.01]">
              <div className="p-5">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-bold text-lg text-[#3b2a1a] mb-1">{loan.name}</h3>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span className="bg-[#f5efe6] text-[#8c7b6c] px-2 py-0.5 rounded font-medium">
                        {loan.repayment_rule === 'monthly' ? '毎月払い' : loan.repayment_rule === 'semiannual' ? 'ボーナス併用' : 'カスタム'}
                      </span>
                      {loan.interest_rate > 0 && <span>年利 {loan.interest_rate}%</span>}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-400 mb-0.5">現在残高</p>
                    <p className="text-lg font-bold text-[#3b2a1a] font-mono tracking-tight">
                      {formatCurrency((loan as any).remaining_amount || 0)}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-5">
                  <div className="bg-[#fcf9f4] p-3 rounded-xl">
                    <p className="text-xs text-[#8c7b6c] mb-1 flex items-center gap-1">
                      <CreditCard className="w-3 h-3" /> 月々の返済
                    </p>
                    <p className="font-bold text-[#5d4330]">
                      {formatCurrency(loan.monthly_amount || 0)}
                    </p>
                  </div>
                  <div className="bg-[#fcf9f4] p-3 rounded-xl">
                    <p className="text-xs text-[#8c7b6c] mb-1 flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> 次回支払日
                    </p>
                    <p className="font-bold text-[#5d4330]">
                      {loan.payment_day ? `毎月 ${loan.payment_day}日` : '未設定'}
                    </p>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-100 flex justify-end">
                  <button
                    onClick={() => handleEdit(loan)}
                    className="flex items-center justify-center gap-2 w-full text-sm font-bold text-[#b58b5a] bg-[#fffaf5] hover:bg-[#ffe4c4] py-3 rounded-xl transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                    条件を変更する
                  </button>
                </div>
              </div>
              {/* Progress Bar */}
              <div className="h-1.5 bg-[#f0ebde] w-full">
                <div
                  className="h-full bg-gradient-to-r from-[#b58b5a] to-[#d4a373]"
                  style={{ width: `${loan.principal > 0 ? ((loan as any).paid_amount / loan.principal) * 100 : 0}%` }}
                />
              </div>
            </div>
          ))
        )}
      </div>

      <div className="mt-8 text-center">
        <Link href="/settings" className="text-gray-400 text-sm hover:text-gray-600 underline">
          設定トップへ戻る
        </Link>
      </div>

      <EditLoanModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        loan={selectedLoan}
      />
    </div>
  );
}
