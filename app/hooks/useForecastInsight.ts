
import { ForecastEvent } from "./useForecast";

// Define locally as it's not exported from useForecast
type DailyBalance = {
  dateStr: string;
  balance: number;
};

export type RiskLevel = "safe" | "caution" | "danger";

export type ForecastInsight = {
  summary: string;
  riskLevel: RiskLevel;
  evidence: {
    income: { count: number; total: number };
    fixed: { count: number; total: number };
    card: { count: number; total: number };
  };
  recommendedAction: {
    label: string;
    link: string;
  };
  dangerDate?: string; // Date of first danger
};

export function useForecastInsight(dailyBalances: DailyBalance[], events: ForecastEvent[]): ForecastInsight {
  // 1. Analyze Balances for Risk
  const threshold = 10000; // Caution if below 10k
  let riskLevel: RiskLevel = "safe";
  let dangerDate: string | undefined;
  let minBalance = Infinity;

  // dailyBalances has { dateStr, balance }
  for (const d of dailyBalances) {
    if (d.balance < 0) {
      riskLevel = "danger";
      dangerDate = d.dateStr;
      break; // Stop at first danger
    }
    if (d.balance < minBalance) minBalance = d.balance;
  }

  if (riskLevel !== "danger" && minBalance < threshold) {
    riskLevel = "caution";
  }

  // 2. Summary Text
  let summary = "";
  if (riskLevel === "danger") {
    const month = dangerDate ? new Date(dangerDate).getMonth() + 1 : "?";
    summary = `このままだと ${month}月 に残高不足の可能性があります`;
  } else if (riskLevel === "caution") {
    summary = "黒字見込みですが、余裕が少ない時期があります";
  } else {
    summary = "今後6ヶ月は安定して黒字の見込みです";
  }

  // 3. Evidence (Totals)
  const evidence = {
    income: { count: 0, total: 0 },
    fixed: { count: 0, total: 0 },
    card: { count: 0, total: 0 },
  };

  events.forEach(e => {
    const amount = Math.abs(e.amount);
    if (e.type === "income") {
      evidence.income.count++;
      evidence.income.total += amount;
    } else if (e.type === "payment" || e.type === "sub" || e.type === "loan") {
      // Group 'payment' (manual?), 'sub' (subscription), 'loan' as Fixed/Recurring
      evidence.fixed.count++;
      evidence.fixed.total += amount;
    } else if (e.type === "card_debit") {
      evidence.card.count++;
      evidence.card.total += amount;
    }
  });

  // 4. Recommended Action
  let action = { label: "入力を続ける", link: "/input" };

  if (riskLevel === "danger" || riskLevel === "caution") {
    if (evidence.card.total > evidence.income.total * 0.5) {
      action = { label: "カード利用を確認", link: "/balances" };
    } else if (evidence.fixed.total > evidence.income.total * 0.4) {
      action = { label: "固定費を見直す", link: "/settings" };
    } else {
      action = { label: "今月の支出を確認", link: "/history" };
    }
  } else {
    // Safe
    action = { label: "最新の収支を入力", link: "/input" };
  }

  return {
    summary,
    riskLevel,
    evidence,
    recommendedAction: action,
    dangerDate
  };
}
