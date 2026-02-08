"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Trash2, ChevronLeft } from "lucide-react";
import { getTemplates, deleteTemplate, Template } from "../../lib/templates";

export default function TemplatesPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch templates logic
  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const data = await getTemplates(); // Fetch all
      setTemplates(data || []);
    } catch (e) {
      console.error(e);
      alert("テンプレートの取得に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("このテンプレートを削除しますか？")) return;
    try {
      await deleteTemplate(id);
      setTemplates(prev => prev.filter(t => t.id !== id));
    } catch (e) {
      alert("削除に失敗しました");
    }
  };

  return (
    <div className="page-container padding-bottom-nav">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link href="/settings" className="text-gray-600">
          <ChevronLeft size={24} />
        </Link>
        <h1 className="text-xl font-bold">テンプレート管理</h1>
      </div>

      {loading ? (
        <p className="text-center py-8 text-gray-500">読み込み中...</p>
      ) : templates.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p>テンプレートがありません</p>
          <p className="text-sm mt-2">よく使う取引を登録しましょう</p>
        </div>
      ) : (
        <div className="space-y-3">
          {templates.map((template) => (
            <div key={template.id} className="app-card flex items-center justify-between p-4">
              <div>
                <div className="font-bold text-lg">{template.name}</div>
                <div className="text-sm text-gray-500 mt-1 flex gap-2">
                  <span className={`px-2 py-0.5 rounded text-xs ${template.type === 'income' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                    {template.type === 'income' ? '収入' : '支出'}
                  </span>
                  {template.amount ? `¥${template.amount.toLocaleString()}` : '金額なし'}
                  {template.category?.name && ` • ${template.category.name}`}
                </div>
              </div>
              <button
                onClick={() => handleDelete(template.id)}
                className="text-gray-400 hover:text-red-500 p-2"
              >
                <Trash2 size={20} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* FAB to Add New */}
      <Link
        href="/settings/templates/new"
        className="fixed bottom-24 right-6 bg-[#8c7b6c] text-white p-4 rounded-full shadow-lg hover:bg-[#7a6a5d] transition-colors"
        aria-label="新規作成"
      >
        <Plus size={24} />
      </Link>
    </div>
  );
}
