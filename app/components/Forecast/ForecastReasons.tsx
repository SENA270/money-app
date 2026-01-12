
import { useState } from "react";
import { ForecastInsight } from "../../hooks/useForecastInsight";

export default function ForecastReasons({ evidence }: { evidence: ForecastInsight["evidence"] }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="app-card" style={{ marginBottom: "16px" }}>
        <button 
            onClick={() => setIsOpen(!isOpen)}
            style={{ width: "100%", textAlign: "left", background: "none", border: "none", display: "flex", justifyContent: "space-between", alignItems: "center" }}
        >
            <h3 style={{ margin: 0, fontSize: "15px" }}>予測の根拠 (今後6ヶ月)</h3>
            <span style={{ fontSize: "12px", color: "#888" }}>{isOpen ? "閉じる" : "詳細"}</span>
        </button>

        <div style={{ marginTop: "12px" }}>
             {/* Always show 3 lines if possible, or collapse details? 
                Requirement: "3 lines Summary (Tap for detail)".
                So we show the 3 lines always, maybe the "breakdown" inside tap?
                Let's show the totals clearly.
             */}
             <div className="list-row">
                 <span>給料・収入</span>
                 <span>{evidence.income.count}回 / +¥{evidence.income.total.toLocaleString()}</span>
             </div>
             <div className="list-row text-red">
                 <span>固定費・ローン</span>
                 <span>{evidence.fixed.count}回 / -¥{evidence.fixed.total.toLocaleString()}</span>
             </div>
             <div className="list-row text-red">
                 <span>カード引き落とし</span>
                 <span>{evidence.card.count}回 / -¥{evidence.card.total.toLocaleString()}</span>
             </div>
        </div>
        
        {isOpen && (
            <div className="animate-fade-in" style={{ marginTop: "16px", paddingTop: "16px", borderTop: "1px solid #eee", fontSize: "13px", color: "#666" }}>
                <p>
                    <strong>計算ロジックについて:</strong><br/>
                    設定された「給料」と「固定費」、および「カードの支払い設定」に基づいて、
                    自動的に未来の入出金を積み上げて計算しています。<br/>
                    日々の変動費（食費など）は含まれていません。
                </p>
            </div>
        )}
    </div>
  );
}
