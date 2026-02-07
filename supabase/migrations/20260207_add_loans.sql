-- Create Loans table
CREATE TABLE IF NOT EXISTS public.loans (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    name TEXT NOT NULL,
    principal NUMERIC NOT NULL, -- Initial Principal (借入総額)
    interest_rate NUMERIC DEFAULT 0,
    start_date DATE NOT NULL,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed')),
    
    -- Repayment Rules
    repayment_rule TEXT DEFAULT 'monthly' CHECK (repayment_rule IN ('monthly', 'semiannual', 'custom')),
    payment_day INTEGER, -- Monthly payment day (1-31)
    monthly_amount NUMERIC, -- Fixed monthly payment amount
    
    -- Bonus settings (for semiannual)
    bonus_months INTEGER[], -- e.g. {6, 12}
    bonus_amount NUMERIC, -- Amount added in bonus months

    created_at TIMESTAMPTZ DEFAULT now()
);

-- Add loan_id to transactions
ALTER TABLE public.transactions
ADD COLUMN IF NOT EXISTS loan_id UUID REFERENCES public.loans(id);

-- Create Index for performance (Important for getLoanDetails)
CREATE INDEX IF NOT EXISTS idx_transactions_loan_id ON public.transactions(loan_id);

-- Enable RLS
ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;

-- Policies for Loans
CREATE POLICY "Users can view their own loans" ON public.loans
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own loans" ON public.loans
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own loans" ON public.loans
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own loans" ON public.loans
    FOR DELETE USING (auth.uid() = user_id);
-- Check if 'repayment' type exists in check constraint, if any.
-- Assuming no check constraint on 'type' in transactions based on previous info,
-- but good to document that 'repayment' will be used.
