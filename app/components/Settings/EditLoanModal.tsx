import { useState, useEffect } from "react";
import { Loan } from "../../hooks/useLoans";
import { X, Save, HelpCircle } from "lucide-react";

interface EditLoanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (id: string, updates: Partial<Loan>) => Promise<void>;
  loan: Loan | null;
}

export default function EditLoanModal({ isOpen, onClose, onSave, loan }: EditLoanModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Partial<Loan>>({});

  useEffect(() => {
    if (loan) {
      setFormData({
        name: loan.name,
        principal: loan.principal, // Make sure to use correct field name from Loan type
        interest_rate: loan.interest_rate,
        monthly_amount: loan.monthly_amount,
        payment_day: loan.payment_day,
        repayment_rule: loan.repayment_rule,
        bonus_months: loan.bonus_months,
        bonus_amount: loan.bonus_amount,
      });
    }
  }, [loan]);

  if (!isOpen || !loan) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loan.id) return;

    setLoading(true);
    try {
      // Prepare payload with number conversions
      const updates: Partial<Loan> = {
        name: formData.name,
        principal: formData.principal ? Number(formData.principal) : 0,
        monthly_amount: formData.monthly_amount ? Number(formData.monthly_amount) : 0,
        interest_rate: formData.interest_rate ? Number(formData.interest_rate) : 0,
        payment_day: formData.payment_day ? Number(formData.payment_day) : null,
        repayment_rule: formData.repayment_rule,
        bonus_amount: formData.bonus_amount ? Number(formData.bonus_amount) : 0,
        // Handler for bonus_months array could be complicated if UI supports specific month selection
        // For now, assume it's kept as is or basic edit if needed
        bonus_months: formData.bonus_months,
      };

      await onSave(loan.id, updates);
      onClose();
    } catch (error) {
      console.error("Failed to update loan", error);
      alert("更新に失敗しました。");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto animate-fade-in-up">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h3 className="text-lg font-bold text-gray-800">ローン条件の変更</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full text-gray-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          <div className="bg-yellow-50 text-yellow-800 text-xs p-3 rounded-lg border border-yellow-200">
            <strong>注意:</strong> ここでの変更は、今後の返済計画（残高計算・完済予測）にのみ反映されます。
            過去の返済履歴は変更されません。
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ローン名称</label>
              <input
                type="text"
                name="name"
                value={formData.name || ""}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#b58b5a] focus:border-transparent outline-none"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">借入元本 (修正)</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-gray-500 text-sm">¥</span>
                  <input
                    type="number"
                    name="principal"
                    value={formData.principal || ""}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded-lg pl-7 py-2 focus:ring-2 focus:ring-[#b58b5a] outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">年利 (%)</label>
                <input
                  type="number"
                  name="interest_rate"
                  step="0.01"
                  value={formData.interest_rate || ""}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#b58b5a] outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">月々の返済額</label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-gray-500 text-sm">¥</span>
                <input
                  type="number"
                  name="monthly_amount"
                  value={formData.monthly_amount || ""}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg pl-7 py-2 focus:ring-2 focus:ring-[#b58b5a] outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">毎月の支払日</label>
                <select
                  name="payment_day"
                  value={formData.payment_day || 27}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-2 py-2 focus:ring-2 focus:ring-[#b58b5a] outline-none"
                >
                  {[...Array(31)].map((_, i) => (
                    <option key={i + 1} value={i + 1}>{i + 1}日</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">返済タイプ</label>
                <select
                  name="repayment_rule"
                  value={formData.repayment_rule || "monthly"}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-2 py-2 focus:ring-2 focus:ring-[#b58b5a] outline-none"
                >
                  <option value="monthly">月払いのみ</option>
                  <option value="semiannual">ボーナス併用</option>
                  <option value="custom">不定期</option>
                </select>
              </div>
            </div>

            {formData.repayment_rule === 'semiannual' && (
              <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                <label className="block text-sm font-medium text-blue-800 mb-1">ボーナス加算額</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-blue-500 text-sm">¥</span>
                  <input
                    type="number"
                    name="bonus_amount"
                    value={formData.bonus_amount || ""}
                    onChange={handleChange}
                    className="w-full border border-blue-200 rounded-lg pl-7 py-2 text-blue-900 focus:ring-2 focus:ring-blue-400 outline-none"
                  />
                </div>
              </div>
            )}

          </div>

          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 text-gray-600 font-medium hover:bg-gray-100 rounded-xl transition-colors"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 bg-[#3b2a1a] text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all disabled:opacity-70 flex items-center justify-center gap-2"
            >
              {loading ? "保存中..." : (
                <>
                  <Save className="w-4 h-4" />
                  保存する
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
