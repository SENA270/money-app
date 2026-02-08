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
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string
          name: string
          type: 'cash' | 'card' | 'bank'
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          type?: 'cash' | 'card' | 'bank'
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
    }
  }
}

export type Transaction = Database['public']['Tables']['transactions']['Row']
export type Category = Database['public']['Tables']['categories']['Row']
export type PaymentMethod = Database['public']['Tables']['payment_methods']['Row']
export type TransactionTemplate = Database['public']['Tables']['transaction_templates']['Row']