-- Add balance column to payment_methods for tracking Initial/Current Asset Balance
ALTER TABLE public.payment_methods 
ADD COLUMN IF NOT EXISTS balance NUMERIC DEFAULT 0;

-- Optional: Add type to categories if we want rigid distinction?
-- For now, relying on Archive is enough.
