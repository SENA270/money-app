
import { RiskLevel } from "../../hooks/useForecastInsight";

export default function ForecastSummary({ summary, riskLevel }: { summary: string; riskLevel: RiskLevel }) {
  const colors = {
      safe: "#2f7d32",
      caution: "#f6c453",
      danger: "#c44536"
  };
  
  const bgColors = {
      safe: "#e8f5e9",
      caution: "#fff8e1",
      danger: "#ffebee"
  };

  return (
    <div style={{ 
        padding: "24px 16px", 
        textAlign: "center", 
        background: bgColors[riskLevel], 
        borderRadius: "12px",
        marginBottom: "16px"
    }}>
        <div style={{ fontWeight: 700, fontSize: "18px", color: colors[riskLevel], marginBottom: "4px" }}>
            {riskLevel === "danger" ? "⚠️ 要注意" : riskLevel === "caution" ? "⚡️ 注意" : "✅ 順調"}
        </div>
        <div style={{ fontSize: "16px", fontWeight: 600, lineHeight: 1.5 }}>
            {summary}
        </div>
    </div>
  );
}
