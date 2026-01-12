
export type AppSettings = {
  [key: string]: any;
  // We expect keys like 'settings', 'incomeSettings', 'accounts', etc.
};

export type TransactionRecord = {
  id: string;
  user_id: string;
  date: string;
  amount: number;
  type: string;
  category: string;
  payment: string; // payment method name or id
  memo?: string;
  created_at?: string;
  [key: string]: any;
};

export type BackupData = {
  version: number;
  exportedAt: string;
  userId: string;
  settings: AppSettings;
  transactions: TransactionRecord[];
};

export type RestoreResult = {
  success: boolean;
  transactions: {
    added: number;
    updated: number;
    skipped: number;
    failed: number;
  };
  settings: {
    restoredKeys: string[];
  };
  errors: string[];
};
