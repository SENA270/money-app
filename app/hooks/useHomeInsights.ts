
import { useState, useEffect } from "react";
import { determineInsight, HomeInsight } from "../lib/insights";
import { checkOnboardingStatus } from "../lib/onboarding";
import { useForecast } from "./useForecast"; // Re-use forecast for upcoming payments

export function useHomeInsights() {
  const [insight, setInsight] = useState<HomeInsight | null>(null);
  const [isSetupComplete, setIsSetupComplete] = useState(true); // Assume true initially to prevent flash

  // We need upcoming payments. useForecast provides this.
  // Note: useForecast might be heavy? It fetches Supabase. 
  // It's already optimized in P0-2 to be reasonably fast.
  const { upcomingPayments, loading } = useForecast(1); // 1 month forecast is enough? Upcoming is global though.

  useEffect(() => {
     // 1. Check Setup
     const complete = checkOnboardingStatus();
     setIsSetupComplete(complete);

     // 2. Determine Insight
     // Mock budget status for now or pass from BudgetCoach?
     // Ideally passed from page.tsx props to avoid double calculation. 
     // But for encapsulation, we can calculate simply here or accept args.
     // Let's accept args in a "re-calculate" function or just use internal logic?
     // Insight Logic depends on "Upcoming", which we have here.
     // It depends on "Setup", which we have here.
     
     if (!loading) {
         const result = determineInsight(
             complete,
             upcomingPayments,
             { spentRatio: 0, remaining: 100 } // Dummy for now, will refine
         );
         setInsight(result);
     }
  }, [loading, upcomingPayments]);

  return { insight, isSetupComplete };
}
