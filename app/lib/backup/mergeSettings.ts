
import { AppSettings } from "./types";

export function mergeSettings(
  backupSettings: AppSettings,
  mode: "merge" | "overwrite"
): { restoredKeys: string[] } {
  const restoredKeys: string[] = [];

  try {
    const knownKeys = ["settings", "incomeSettings", "accounts", "categories", "loans", "subscriptions"];

    // In "Merge" mode: Keep Local (Priority) vs Backup (Gap fill).
    // Requirement: "Recommended (Safe): Priority Local, Backup fills gaps".
    // But "Settings" in localStorage are often JSON blobs. 
    // E.g. "accounts" is `[{id, name...}]`. 
    // Deep merge? Or Key-level? 
    // Requirement says: "Settings are merged by KEY".
    // "Example: If transaction refers to category, ensure it exists."
    // Suggested: "Backup Master also restored to ensure consistency".

    // For simplicity in Phase 1: 
    // Overwrite Mode: Replace all LocalStorage with Backup.
    // Merge Mode: If Local exists, KEEP it. If not, use Backup. 
    // (This is the safest "Gap Fill" approach).

    // However, user said "Backup Priority for Advanced". 
    // Let's implement generic logic.

    Object.keys(backupSettings).forEach(key => {
      // Filter garbage
      // if (!knownKeys.includes(key)) return; 

      const currentVal = localStorage.getItem(key);

      if (mode === "overwrite") {
        localStorage.setItem(key, JSON.stringify(backupSettings[key]));
        restoredKeys.push(key);
      } else {
        // Merge Mode (Safe / Keep Local)
        if (!currentVal) {
          // Gap fill
          localStorage.setItem(key, JSON.stringify(backupSettings[key]));
          restoredKeys.push(key);
        } else {
          // Local exists.
          // Requirement 2: "Reference consistency". 
          // If we restore transactions that use "Account X", but Account X is missing in Local?
          // "Gap fill" on LocalStorage Key level is coarse. 
          // Accounts are inside one key "accounts".
          // So if "accounts" key exists, we ignore backup? Then we miss Account X.
          // We need DEEP MERGE for lists (accounts, categories).

          try {
            const currentObj = JSON.parse(currentVal);
            const backupObj = backupSettings[key];

            if (Array.isArray(currentObj) && Array.isArray(backupObj)) {
              // Array Merge: Combine and Dedupe by ID (if exists) or JSON content
              // Accounts have IDs. Categories might be strings.

              if (key === "accounts" || key === "settings" /* loans in settings */) {
                // Assume objects with IDs.
                // Naive approach: Concat and dedupe?
                // Let's go simpler: "Merge" = "Supplement". 
                // Add items from backup that are NOT in current.
                // (This satisfies "Priority Local, Backup fills gaps").

                const merged = [...currentObj];
                const currentIds = new Set(currentObj.map((i: any) => i.id || JSON.stringify(i)));

                backupObj.forEach((bItem: any) => {
                  const bId = bItem.id || JSON.stringify(bItem);
                  if (!currentIds.has(bId)) {
                    merged.push(bItem);
                    // Mark as updated?
                  }
                });

                localStorage.setItem(key, JSON.stringify(merged));
                restoredKeys.push(`${key} (merged)`);
              } else {
                // Unknown array (e.g. simple strings). 
                // Union.
                const merged = Array.from(new Set([...currentObj, ...backupObj]));
                localStorage.setItem(key, JSON.stringify(merged));
                restoredKeys.push(`${key} (merged)`);
              }
            } else {
              // Object merge (IncomeSettings, etc)
              // Keep Local properties, add missing Backup properties.
              const merged = { ...backupObj, ...currentObj };
              localStorage.setItem(key, JSON.stringify(merged));
              restoredKeys.push(`${key} (merged)`);
            }
          } catch (e) {
            // If parse fails, ignore merge and keep local.
            console.warn(`Failed to merge key ${key}`, e);
          }
        }
      }
    });

  } catch (e) {
    console.error("Merge Settings Error", e);
    throw e;
  }

  return { restoredKeys };
}
