export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      transactions: {
        Row: {
          id: string
          user_id: string
          date: string
          amount: number
          type: 'income' | 'expense'
          category_id: string | null
          payment_method_id: string | null
          memo: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string
          date: string
          amount: number
          type: 'income' | 'expense'
          category_id?: string | null
          payment_method_id?: string | null
          memo?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          date?: string
          amount?: number
          type?: 'income' | 'expense'
          category_id?: string | null
          payment_method_id?: string | null
          memo?: string | null
          created_at?: string
        }
      }
      categories: {
        Row: {
          id: string
          user_id: string
          name: string
          type: 'income' | 'expense'
          is_archived?: boolean // Added
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string
          name: string
          type: 'income' | 'expense'
          is_archived?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          type?: 'income' | 'expense'
          is_archived?: boolean
          created_at?: string
        }
      }
      payment_methods: {
        Row: {
          id: string
          user_id: string
          name: string
          type: 'cash' | 'card' | 'bank'
          balance?: number
          closing_day?: number | null
          payment_day?: number | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string
          name: string
          type: 'cash' | 'card' | 'bank'
          balance?: number
          closing_day?: number | null
          payment_day?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          type?: 'cash' | 'card' | 'bank'
          balance?: number
          closing_day?: number | null
          payment_day?: number | null
          created_at?: string
        }
      }
      transaction_templates: {
        Row: {
          id: string
          user_id: string
          name: string
          amount: number
          type: 'income' | 'expense'
          category_id: string | null
          payment_method_id: string | null
          memo: string | null
          created_at: string
          last_used_at: string | null
        }
        Insert: {
          id?: string
          user_id?: string
          name: string
          amount: number
          type: 'income' | 'expense'
          category_id?: string | null
          payment_method_id?: string | null
          memo?: string | null
          created_at?: string
          last_used_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          amount?: number
          type?: 'income' | 'expense'
          category_id?: string | null
          payment_method_id?: string | null
          memo?: string | null
          created_at?: string
          last_used_at?: string | null
        }
      }
      loans: {
        Row: {
          id: string
          user_id: string
          name: string
          amount: number
          monthly_payment: number
          interest_rate: number
          start_date: string
          status: 'active' | 'completed'
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string
          name: string
          amount: number
          monthly_payment: number
          interest_rate: number
          start_date: string
          status: 'active' | 'completed'
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          amount?: number
          monthly_payment?: number
          interest_rate?: number
          start_date?: string
          status?: 'active' | 'completed'
          created_at?: string
        }
      }
      category_budgets: {
        Row: {
          id: string
          user_id: string
          category: string
          amount: number
          year: number
          month: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string
          category: string
          amount: number
          year: number
          month: number
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          category?: string
          amount?: number
          year?: number
          month?: number
          created_at?: string
        }
      }
    }
  }
}

export type PaymentMethodType = 'cash' | 'card' | 'bank';

export type Transaction = Omit<Database['public']['Tables']['transactions']['Row'], 'type'> & {
  type: 'income' | 'expense' | 'repayment';
  loan_id?: string | null;
};

export type Category = Database['public']['Tables']['categories']['Row'];
export type PaymentMethod = Database['public']['Tables']['payment_methods']['Row'];
export type TransactionTemplate = Database['public']['Tables']['transaction_templates']['Row'];
export type CategoryBudget = Database['public']['Tables']['category_budgets']['Row'];

// Loan Type
export type Loan = {
  id: string;
  user_id: string;
  name: string;
  amount: number;
  total_amount: number; // Added alias for amount/target
  remaining_balance: number;
  monthly_payment: number;
  interest_rate: number;
  start_date: string;
  status: 'active' | 'completed';
  created_at: string;
};

// Timeline Event - Consolidated
export type TimelineEvent = {
  id?: string;
  label: string;
  date: string;
  description?: string;
  amount: number;
  type: 'income' | 'expense' | 'balance' | 'transaction' | 'card_payment';
  balance?: number;
  status?: 'forecast' | 'confirmed';
  cardPaymentMethodId?: string; // Added
  transactionId?: string; // Added
  relatedTransactions?: Transaction[]; // Added
};

// Analysis Result
export type AnalysisResult = {
  period?: string; // Added
  income: number;
  expense: number;
  balance: number;
  total?: number; // Added
  categories: {
    categoryId: string;
    categoryName: string;
    name?: string; // kept for compatibility if needed
    amount: number;
    percentage?: number; // Made optional
    color?: string;
  }[];
  daily?: { date: string; income: number; expense: number }[];
};