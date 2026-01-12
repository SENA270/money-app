
export function checkOnboardingStatus(): boolean {
    if (typeof window === "undefined") return true; // Server side assume complete to avoid flash

    // 1. Income
    const incRaw = localStorage.getItem("incomeSettings");
    if (!incRaw) return false;
    const inc = JSON.parse(incRaw);
    if (!inc.monthlyIncome || !inc.payday) return false;

    // 2. Accounts
    const accRaw = localStorage.getItem("accounts");
    if (!accRaw) return false;
    const acc = JSON.parse(accRaw);
    if (!Array.isArray(acc) || acc.length === 0) return false;

    return true;
}
