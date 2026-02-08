"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Star, X } from "lucide-react"; // Added Icons
import TransactionQuickForm from "../components/Input/TransactionQuickForm";
import ReceiptScanner from "../components/ReceiptScanner";
import { saveTransaction } from "../lib/transaction/saveTransaction";
import { supabase } from "../../lib/supabaseClient";
import { useCategories } from "../hooks/useCategories";
import { usePaymentMethods } from "../hooks/usePaymentMethods";
import { getTemplates, updateTemplateUsage, Template } from "../lib/templates"; // Added

export default function InputPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const copyId = searchParams.get("copy");

  const [mode, setMode] = useState<"manual" | "camera">("manual");
  const [ocrResult, setOcrResult] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [message, setMessage] = useState("");

  // Copy / Template Feature State
  const [copyData, setCopyData] = useState<any>(null);
  const [loadingCopy, setLoadingCopy] = useState(false);

  // Template State
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);

  // Fetch Copy Data
  useEffect(() => {
    if (!copyId) return;
    // ... (existing copy logic)
    const fetchCopyData = async () => {
      setLoadingCopy(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
          .from("transactions")
          .select("*")
          .eq("id", copyId)
          .eq("user_id", user.id)
          .single();

        if (error) throw error;
        if (data) {
          setCopyData({
            amount: String(data.amount),
            type: data.type,
            categoryId: data.category_id,
            paymentMethodId: data.payment_method_id,
            memo: data.memo,
            date: new Date().toISOString().slice(0, 10)
          });
          setMessage("取引をコピーしました");
          setTimeout(() => setMessage(""), 3000);
        }
      } catch (e) {
        console.error("Copy failed", e);
        setMessage("コピー元の取得に失敗しました");
        router.replace("/input");
      } finally {
        setLoadingCopy(false);
      }
    };
    fetchCopyData();
  }, [copyId, router]);

  // Fetch Templates on Modal Open
  useEffect(() => {
    if (isTemplateModalOpen) {
      getTemplates(10).then(setTemplates).catch(console.error);
    }
  }, [isTemplateModalOpen]);

  const { categories } = useCategories();
  const { paymentMethods } = usePaymentMethods();

  const handleSuccess = async () => {
    setMessage("記録しました！");

    // Update Template Usage if applicable
    if (selectedTemplateId) {
      await updateTemplateUsage(selectedTemplateId);
      setSelectedTemplateId(null);
    }

    // Clear copy data/param if successful
    if (copyId) {
      router.replace("/input");
      setCopyData(null);
    }
    // Clear template data
    if (selectedTemplateId) { // Also clear copyData if it was from template
      setCopyData(null);
    }

    setTimeout(() => setMessage(""), 3000);
  };

  const handleTemplateSelect = (template: Template) => {
    setCopyData({
      amount: template.amount ? String(template.amount) : "",
      type: template.type,
      categoryId: template.category_id || "",
      paymentMethodId: template.payment_method_id || "",
      memo: template.memo || "",
      date: new Date().toISOString().slice(0, 10)
    });
    setSelectedTemplateId(template.id);
    setIsTemplateModalOpen(false);
    setMessage(`テンプレート「${template.name}」を読み込みました`);
    setTimeout(() => setMessage(""), 2000);
  };

  const handleScanComplete = (data: any) => {
    setOcrResult(data);
    setMode("manual");
  };

  const saveOcrResult = async () => {
    // ... (existing OCR save logic, omitted for brevity as it's unchanged logic but need to keep it if replacing full file, checking replacement range)
    // Since I am replacing the whole file content effectively (from line 3 to 264 logic), I need to include the saveOcrResult logic.
    // To be safe and concise, I will use the ReplaceFileContent for the specific parts or whole file.
    // Given the structural changes (imports, state, new methods), whole file replacement or large chunk is safer.
    // I will reproduce `saveOcrResult` below.
    if (!ocrResult) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Login required");

      let categoryId = "";
      if (ocrResult.category) {
        const match = categories.find(c => c.name === ocrResult.category);
        if (match) categoryId = match.id;
      }
      if (!categoryId && categories.length > 0) categoryId = categories[0].id;

      let paymentMethodId = "";
      if (typeof window !== "undefined") {
        const lastUsedId = localStorage.getItem("lastUsedPaymentMethodId");
        if (lastUsedId && paymentMethods.find(p => p.id === lastUsedId)) paymentMethodId = lastUsedId;
      }
      if (!paymentMethodId && paymentMethods.length > 0) {
        const pref = paymentMethods.find(p => p.type === 'cash') || paymentMethods[0];
        paymentMethodId = pref.id;
      }

      if (!categoryId || !paymentMethodId) throw new Error("カテゴリまたは支払い方法が特定できません。");

      await saveTransaction({
        user_id: user.id,
        amount: Number(ocrResult.amount),
        type: "expense",
        category_id: categoryId,
        payment_method_id: paymentMethodId,
        date: ocrResult.date || new Date().toISOString().slice(0, 10),
        memo: ocrResult.storeName,
      });

      if (typeof window !== "undefined") localStorage.setItem("lastUsedPaymentMethodId", paymentMethodId);

      setOcrResult(null);
      handleSuccess();
    } catch (e: any) {
      alert("保存に失敗: " + e.message);
    }
  };

  return (
    <div className="page-container padding-bottom-nav">

      {/* Header with Template Button */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">
          {copyId ? "入力 (コピー)" : selectedTemplateId ? "入力 (テンプレート)" : "入力"}
        </h1>

        {/* Template Button */}
        {!copyId && (
          <button
            onClick={() => setIsTemplateModalOpen(true)}
            className="p-2 text-[#d69e2e] bg-[#fff8e1] rounded-full hover:bg-[#ffecb3] transition-colors"
            aria-label="テンプレート読み込み"
          >
            <Star size={24} fill="currentColor" />
          </button>
        )}
      </div>

      {loadingCopy && <p className="text-center">読み込み中...</p>}

      {/* Mode Switcher */}
      {!ocrResult && !isEditing && !copyId && !selectedTemplateId && (
        <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
          <button
            onClick={() => setMode("manual")}
            className={mode === "manual" ? "btn-primary" : "btn-secondary"}
            style={{ flex: 1 }}
          >
            手入力
          </button>
          <button
            onClick={() => setMode("camera")}
            className={mode === "camera" ? "btn-primary" : "btn-secondary"}
            style={{ flex: 1 }}
          >
            レシート読取
          </button>
        </div>
      )}

      {/* OCR Result (Keep existing) */}
      {ocrResult && !isEditing && (
        <div className="app-card" style={{ borderLeft: "4px solid #3b2a1a" }}>
          <h3>レシート読取結果</h3>
          {/* ... details ... */}
          <div style={{ margin: "16px 0", fontSize: 14 }}>
            <div className="list-row" style={{ fontSize: 18, fontWeight: 700 }}>
              <span>金額</span><span>¥{Number(ocrResult.amount).toLocaleString()}</span>
            </div>
            <div className="list-row"><span>日付</span><span>{ocrResult.date}</span></div>
            <div className="list-row"><span>店名</span><span>{ocrResult.storeName}</span></div>
            <div className="list-row"><span>カテゴリ</span><span>{ocrResult.category || "(自動判定)"}</span></div>
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <button onClick={saveOcrResult} className="btn-primary" style={{ flex: 1 }}>このまま保存</button>
            <button onClick={() => setIsEditing(true)} className="btn-secondary" style={{ flex: 1 }}>修正する</button>
          </div>
        </div>
      )}

      {/* Manual Form */}
      {!loadingCopy && ((mode === "manual" && !ocrResult) || isEditing) && (
        <TransactionQuickForm
          key={copyId || selectedTemplateId || (isEditing ? 'edit' : 'default')} // Key includes templateId
          onSuccess={() => {
            handleSuccess();
            setOcrResult(null);
            setIsEditing(false);
          }}
          initialValues={
            copyData ? copyData :
              (isEditing && ocrResult ? {
                amount: ocrResult.amount,
                date: ocrResult.date,
                category: ocrResult.category,
                memo: ocrResult.storeName
              } : undefined)
          }
        />
      )}

      {/* Camera */}
      {mode === "camera" && !copyId && (
        <div style={{ marginTop: 20 }}>
          <ReceiptScanner onScanComplete={handleScanComplete} onClose={() => setMode("manual")} />
        </div>
      )}

      {/* Template Modal (Bottom Sheet style) */}
      {isTemplateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50" onClick={() => setIsTemplateModalOpen(false)}>
          <div className="bg-white w-full max-w-md sm:rounded-xl rounded-t-xl p-4 max-h-[80vh] overflow-y-auto animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-bold text-lg">テンプレートを選択</h2>
              <button onClick={() => setIsTemplateModalOpen(false)} className="p-1"><X size={24} /></button>
            </div>

            {templates.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>テンプレートがありません</p>
                <Link href="/settings/templates/new" className="text-[#8c7b6c] underline mt-2 block">
                  新規作成する
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {templates.map(t => (
                  <button
                    key={t.id}
                    onClick={() => handleTemplateSelect(t)}
                    className="w-full text-left p-4 rounded-lg border border-gray-100 bg-gray-50 hover:bg-[#fff8e1] hover:border-[#d69e2e] transition-all flex items-center justify-between"
                  >
                    <div>
                      <div className="font-bold">{t.name}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {t.type === 'income' ? '収入' : '支出'}
                        {t.amount ? ` • ¥${t.amount.toLocaleString()}` : ''}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            <div className="mt-4 pt-4 border-t border-gray-100 text-center">
              <Link href="/settings/templates" className="text-sm text-gray-500 flex items-center justify-center gap-1">
                設定画面で管理
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {message && (
        <div style={{
          position: "fixed", bottom: 80, left: "50%", transform: "translateX(-50%)",
          background: "#333", color: "#fff", padding: "12px 24px", borderRadius: 30,
          boxShadow: "0 4px 12px rgba(0,0,0,0.2)", pointerEvents: "none", zIndex: 999
        }}>
          {message}
        </div>
      )}
    </div>
  );
}

