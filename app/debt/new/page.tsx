"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { ArrowLeft, Save, Calendar, HelpCircle } from "lucide-react";

export default function NewLoanPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    principal: "",
    start_date: new Date().toISOString().slice(0, 10),
    interest_rate: "0",
    repayment_rule: "monthly" as "monthly" | "semiannual" | "custom",
    payment_day: "27", // Default to common
    monthly_amount: "",
    bonus_month_1: "6",
    bonus_month_2: "12",
    bonus_amount: ""
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Prepare payload
      const bonus_months = formData.repayment_rule === 'semiannual'
        ? [parseInt(formData.bonus_month_1), parseInt(formData.bonus_month_2)]
        : null;

      const payload = {
        user_id: user.id,
        name: formData.name,
        principal: parseFloat(formData.principal),
        start_date: formData.start_date,
        interest_rate: parseFloat(formData.interest_rate),
        repayment_rule: formData.repayment_rule,
        payment_day: formData.payment_day ? parseInt(formData.payment_day) : null,
        monthly_amount: formData.monthly_amount ? parseFloat(formData.monthly_amount) : null,
        bonus_months: bonus_months,
        bonus_amount: formData.bonus_amount ? parseFloat(formData.bonus_amount) : null,
        status: 'active'
      };

      const { error } = await supabase.from('loans').insert(payload);
      if (error) throw error;

      router.push('/debt');
    } catch (error) {
      console.error("Error creating loan:", error);
      alert("Failed to create loan. Please check your inputs.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container padding-bottom-nav">
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
          <Link href="/debt" className="btn-secondary" style={{ padding: "8px", borderRadius: "50%", width: 36, height: 36, minHeight: 0 }}>
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 style={{ fontSize: 20, fontWeight: "bold", color: "#3b2a1a", margin: 0 }}>
            ローンを追加
          </h1>
        </div>
      </div>

      <main className="max-w-md mx-auto">
        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Basic Info */}
          <section className="app-card">
            <h3 className="text-sm font-semibold text-[#8c7b6c] uppercase tracking-wider mb-4 border-b border-[#eee8dc] pb-2">基本情報</h3>

            <div className="space-y-4">
              <div className="form-group">
                <label className="form-label">ローン名称</label>
                <input
                  type="text"
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="例: 住宅ローン, 奨学金"
                  className="form-input"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="form-label">借入金額 (Total)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-3.5 text-[#8c7b6c]">¥</span>
                    <input
                      type="number"
                      name="principal"
                      required
                      min="1"
                      value={formData.principal}
                      onChange={handleChange}
                      placeholder="1000000"
                      className="form-input pl-8"
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">開始日</label>
                  <div className="relative">
                    <input
                      type="date"
                      name="start_date"
                      required
                      value={formData.start_date}
                      onChange={handleChange}
                      className="form-input"
                    />
                    <Calendar className="absolute right-3 top-3.5 w-5 h-5 text-[#8c7b6c] pointer-events-none" />
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Repayment Settings */}
          <section className="app-card">
            <h3 className="text-sm font-semibold text-[#8c7b6c] uppercase tracking-wider mb-4 border-b border-[#eee8dc] pb-2">返済ルール</h3>

            <div className="space-y-4">
              <div className="form-group">
                <label className="form-label">返済タイプ</label>
                <select
                  name="repayment_rule"
                  value={formData.repayment_rule}
                  onChange={handleChange}
                  className="form-select"
                >
                  <option value="monthly">月払い (定額)</option>
                  <option value="semiannual">月払い + ボーナス払い (半年払い)</option>
                  <option value="custom">不定期・カスタム</option>
                </select>
              </div>

              {formData.repayment_rule !== 'custom' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="form-group">
                      <label className="form-label">毎月の支払日</label>
                      <select
                        name="payment_day"
                        value={formData.payment_day}
                        onChange={handleChange}
                        className="form-select"
                      >
                        {[...Array(31)].map((_, i) => (
                          <option key={i + 1} value={i + 1}>{i + 1}日</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">月々の支払額</label>
                      <div className="relative">
                        <span className="absolute left-3 top-3.5 text-[#8c7b6c]">¥</span>
                        <input
                          type="number"
                          name="monthly_amount"
                          min="0"
                          value={formData.monthly_amount}
                          onChange={handleChange}
                          placeholder="0"
                          className="form-input pl-8"
                        />
                      </div>
                    </div>
                  </div>

                  {formData.repayment_rule === 'semiannual' && (
                    <div className="p-4 bg-[#f0f9ff] rounded-xl border border-[#bae6fd] space-y-4 mt-2">
                      <h4 className="text-[#0369a1] text-sm font-bold flex items-center gap-2">
                        ボーナス払い設定
                        <HelpCircle className="w-4 h-4 opacity-50" />
                      </h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs text-[#0284c7] mb-1.5 font-semibold">支払月 (1)</label>
                          <select
                            name="bonus_month_1"
                            value={formData.bonus_month_1}
                            onChange={handleChange}
                            className="w-full bg-white border border-[#bae6fd] rounded-lg px-3 py-2 text-sm text-[#0c4a6e] focus:outline-none focus:border-[#0284c7]"
                          >
                            {[...Array(12)].map((_, i) => (
                              <option key={i + 1} value={i + 1}>{i + 1}月</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-[#0284c7] mb-1.5 font-semibold">支払月 (2)</label>
                          <select
                            name="bonus_month_2"
                            value={formData.bonus_month_2}
                            onChange={handleChange}
                            className="w-full bg-white border border-[#bae6fd] rounded-lg px-3 py-2 text-sm text-[#0c4a6e] focus:outline-none focus:border-[#0284c7]"
                          >
                            {[...Array(12)].map((_, i) => (
                              <option key={i + 1} value={i + 1}>{i + 1}月</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs text-[#0284c7] mb-1.5 font-semibold">加算額 (ボーナス時)</label>
                        <div className="relative">
                          <span className="absolute left-3 top-2.5 text-[#0284c7] text-xs">¥</span>
                          <input
                            type="number"
                            name="bonus_amount"
                            placeholder="例: 50000"
                            value={formData.bonus_amount}
                            onChange={handleChange}
                            className="w-full bg-white border border-[#bae6fd] rounded-lg pl-6 pr-3 py-2 text-sm text-[#0c4a6e] focus:outline-none focus:border-[#0284c7]"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </section>

          {/* Interest (Optional) */}
          <section className="app-card opacity-80 hover:opacity-100 transition-opacity">
            <div className="form-group mb-0">
              <label className="form-label">年利 (%) <span className="text-xs text-[#8c7b6c] font-normal">(任意・メモ用)</span></label>
              <input
                type="number"
                name="interest_rate"
                step="0.01"
                min="0"
                value={formData.interest_rate}
                onChange={handleChange}
                className="form-input"
              />
            </div>
          </section>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full shadow-lg"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
            ) : (
              <>
                <Save className="w-5 h-5 mr-2" />
                ローンを保存
              </>
            )}
          </button>
        </form>
      </main>
    </div>
  );
}
