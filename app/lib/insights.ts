
import { ForecastEvent } from "../hooks/useForecast";

export type InsightType = "setup" | "upcoming_payment" | "overspend" | "neutral";

export type HomeInsight = {
    type: InsightType;
    message: string;
    actionLabel?: string;
    actionLink?: string; // Path to redirect
    priority: number; // 1 = Highest
};

// Determine the single best insight
export function determineInsight(
    isSetupComplete: boolean,
    upcomingPayments: ForecastEvent[],
    budgetStatus: { spentRatio: number; remaining: number } // Placeholder for budget logic
): HomeInsight {
    // Priority 1: Setup Incomplete
    if (!isSetupComplete) {
        return {
            type: "setup",
            message: "まずは手取り・給料日・口座を設定しましょう",
            actionLabel: "設定する",
            priority: 1
        };
    }

    // Priority 2: Upcoming Payment (High Urgency)
    // Find payment within 3 days
    const today = new Date();
    const urgentPayment = upcomingPayments.find(p => {
        const diffTime = Math.abs(p.date.getTime() - today.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
        return diffDays <= 3 && p.amount < 0;
    });

    if (urgentPayment) {
        const diff = Math.ceil((urgentPayment.date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        const daysLabel = diff <= 0 ? "今日" : `${diff}日後`;
        return {
            type: "upcoming_payment",
            message: `${daysLabel}に ${urgentPayment.label} (${Math.abs(urgentPayment.amount).toLocaleString()}円) の引き落としがあります`,
            actionLabel: "残高を確認",
            actionLink: "/balances",
            priority: 2
        };
    }

    // Priority 3: Overspend (Pacing)
    // Logic: If spentRatio > 80%? Or smart pacing?
    // User requested: "Don't use warnings, use suggestions".
    // Keep simple for now: If remaining is low?
    
    // Priority 4: Neutral / Guide
    // If no data, suggest "Log expense".
    return {
        type: "neutral",
        message: "今週の出費は順調ですか？こまめな記録が安心につながります。",
        actionLabel: "支出を入力",
        actionLink: "/input",
        priority: 4
    };
}
