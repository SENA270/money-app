-- Drop check constraint on type if it exists
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'transactions_type_check') THEN 
        ALTER TABLE public.transactions DROP CONSTRAINT transactions_type_check; 
    END IF; 
END $$;

-- Add check constraint with repayment
ALTER TABLE public.transactions 
ADD CONSTRAINT transactions_type_check CHECK (type IN ('expense', 'income', 'repayment'));

-- Ensure RLS allows insert for user
-- The existing policy "Users can insert their own transactions" (assumed) should cover it if it just checks user_id.
-- Let's re-verify policies or add a redundant one if specific policy was filtering by type?
-- Usually policies are just "auth.uid() = user_id". 

-- If there are any other policies restricting type, we might need to know, but standard is just user_id.
