"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { createTemplate } from "../../../lib/templates";
import { useCategories } from "../../../hooks/useCategories";
import { usePaymentMethods } from "../../../hooks/usePaymentMethods";

export default function NewTemplatePage() {
  const router = useRouter();
  const { categories } = useCategories();
  const { paymentMethods } = usePaymentMethods();

  const [name, setName] = useState("");
  const [type, setType] = useState<"expense" | "income">("expense");
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [paymentMethodId, setPaymentMethodId] = useState("");
  const [memo, setMemo] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Set default payment method/category
  useEffect(() => {
    if (categories.length > 0 && !categoryId) {
      // Logic to pick first expense/income category could be improved
      setCategoryId(categories[0].id);
    }
    if (paymentMethods.length > 0 && !paymentMethodId) {
      // Pick first wallet/cash if possible
      const cash = paymentMethods.find(p => p.type === 'cash');
      setPaymentMethodId(cash ? cash.id : paymentMethods[0].id);
    }
  }, [categories, paymentMethods]);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return alert("テンプレート名を入力してください");

    try {
      setIsSubmitting(true);
      await createTemplate({
        name,
        type,
        amount: amount ? Number(amount) : null,
        category_id: categoryId || null,
        payment_method_id: paymentMethodId || null,
        memo: memo || null,
      });
      router.push("/settings/templates");
    } catch (e: any) {
      console.error(e);
      alert("作成に失敗しました: " + e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="page-container padding-bottom-nav">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link href="/settings/templates" className="text-gray-600">
          <ChevronLeft size={24} />
        </Link>
        <h1 className="text-xl font-bold">テンプレート作成</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 max-w-md mx-auto">

        {/* Name */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-[#e5e7eb]">
          <label className="block text-sm font-medium text-gray-700 mb-1">テンプレート名 (必須)</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例: ランチAセット"
            className="w-full text-lg p-2 border-b border-gray-300 focus:border-[#8c7b6c] outline-none"
            required
          />
        </div>

        {/* Type Switcher */}
        <div className="flex bg-[#e5e7eb] p-1 rounded-lg">
          <button
            type="button"
            onClick={() => setType("expense")}
            className={`flex-1 py-2 rounded-md text-sm font-bold transition-all ${type === "expense" ? "bg-white shadow text-red-500" : "text-gray-500"
              }`}
          >
            支出
          </button>
          <button
            type="button"
            onClick={() => setType("income")}
            className={`flex-1 py-2 rounded-md text-sm font-bold transition-all ${type === "income" ? "bg-white shadow text-green-600" : "text-gray-500"
              }`}
          >
            収入
          </button>
        </div>

        {/* Details Card */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-[#e5e7eb] space-y-4">

          {/* Amount */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">金額 (任意)</label>
            <div className="flex items-center border-b border-gray-200">
              <span className="text-xl mr-2">¥</span>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                className="w-full text-2xl font-bold p-2 outline-none"
              />
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">カテゴリ</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full p-2 bg-gray-50 rounded border border-gray-200"
            >
              <option value="">未選択</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">支払い方法</label>
            <select
              value={paymentMethodId}
              onChange={(e) => setPaymentMethodId(e.target.value)}
              className="w-full p-2 bg-gray-50 rounded border border-gray-200"
            >
              <option value="">未選択</option>
              {paymentMethods.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* Memo */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">メモ</label>
            <input
              type="text"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="メモを入力"
              className="w-full p-2 border-b border-gray-200 focus:border-[#8c7b6c] outline-none"
            />
          </div>

        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-[#8c7b6c] text-white font-bold py-4 rounded-xl shadow-md disabled:opacity-50 hover:bg-[#7a6a5d] transition-colors"
        >
          {isSubmitting ? "保存中..." : "テンプレートを作成"}
        </button>

      </form>
    </div>
  );
}
