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
    }
  }
}

export type PaymentMethodType = 'cash' | 'card' | 'bank';

export type Transaction = Database['public']['Tables']['transactions']['Row'] & {
  type: 'income' | 'expense' | 'repayment'; // Extended to suppress TS error
  loan_id?: string | null; // Often used in UI
};

export type Category = Database['public']['Tables']['categories']['Row'];
export type PaymentMethod = Database['public']['Tables']['payment_methods']['Row'];
export type TransactionTemplate = Database['public']['Tables']['transaction_templates']['Row'];

// Loan Type
export type Loan = {
  id: string;
  user_id: string;
  name: string;
  amount: number;
  remaining_balance: number; // Computed often
  monthly_payment: number;
  interest_rate: number;
  start_date: string;
  status: 'active' | 'completed';
  created_at: string;
};

// Timeline Event
export type TimelineEvent = {
  date: string;
  description: string;
  amount: number;
  type: 'income' | 'expense' | 'balance';
  balance?: number;
};

// Analysis Result
export type AnalysisResult = {
  income: number;
  expense: number;
  balance: number;
  categories: { name: string; amount: number; percentage: number; color?: string }[];
  daily?: { date: string; income: number; expense: number }[];
};