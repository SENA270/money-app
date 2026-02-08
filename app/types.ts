export type PaymentMethodType = 'cash' | 'bank' | 'card';

export interface PaymentMethod {
  id: string;
  user_id: string;
  name: string;
  type: PaymentMethodType;
  closing_day?: number | null; // For cards
  payment_day?: number | null; // For cards
  balance?: number; // Initial/Current Asset Balance (for Bank/Cash)
  created_at?: string;
}

export interface Category {
  id: string;
  user_id: string;
  name: string;
  is_archived: boolean;
  created_at?: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  date: string;
  amount: number;
  type: 'income' | 'expense' | 'repayment'; // 'card_payment' is removed from raw data
  memo?: string;

  // Foreign Keys (New)
  payment_method_id?: string;
  category_id?: string;

  // Joins (Optional)
  payment_method?: PaymentMethod;
  category?: Category;

  // Legacy fields (for compatibility during migration if needed, but we should aim to drop)
  payment?: string;
  // category?: string; // name collision with join

  // Loan Relation
  loan_id?: string;
  loan?: Loan;
}

export interface Loan {
  id: string;
  user_id: string;
  name: string;
  total_amount: number;
  interest_rate?: number;
  due_date?: string;
  status: 'active' | 'completed';
  created_at?: string;
  // Computed client-side
  paid_amount?: number;
  remaining_amount?: number;
}

// Derived Event for Timeline (Virtual)
export interface TimelineEvent {
  id: string;
  date: string; // YYYY-MM-DD
  amount: number; // Negative for expense
  label: string;
  type: 'transaction' | 'card_payment' | 'income';
  status: 'confirmed' | 'forecast';

  // If it's a real transaction
  transactionId?: string;

  // If it's a card payment aggregate
  cardPaymentMethodId?: string;
  relatedTransactions?: Transaction[];
  balance?: number; // Running balance after this event
}

export interface AnalysisResult {
  period: string; // YYYY-MM
  categories: {
    categoryId: string;
    categoryName: string;
    amount: number;
  }[];
  total: number;
}
