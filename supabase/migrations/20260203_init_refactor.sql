-- 1. Create Payment Methods Table
CREATE TABLE IF NOT EXISTS public.payment_methods (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('cash', 'bank', 'card')),
    closing_day INTEGER, -- Only for cards
    payment_day INTEGER, -- Only for cards
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Create Categories Table
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    name TEXT NOT NULL,
    is_archived BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Add Foreign Keys to Transactions (allowing NULL during migration)
-- NOTE: We are NOT dropping the old 'category' and 'payment' text columns yet to ensure safety.
ALTER TABLE public.transactions
ADD COLUMN IF NOT EXISTS payment_method_id UUID REFERENCES public.payment_methods(id),
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.categories(id);

-- 4. Enable RLS (Row Level Security)
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- 5. Create Policies
-- Payment Methods
CREATE POLICY "Users can view their own payment methods" ON public.payment_methods
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own payment methods" ON public.payment_methods
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own payment methods" ON public.payment_methods
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own payment methods" ON public.payment_methods
    FOR DELETE USING (auth.uid() = user_id);

-- Categories
CREATE POLICY "Users can view their own categories" ON public.categories
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own categories" ON public.categories
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own categories" ON public.categories
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own categories" ON public.categories
    FOR DELETE USING (auth.uid() = user_id);


-- 6. MIGRATION DATA SCRIPT (Only runs if data exists)
-- This part is tricky because we can't easily iterate over distinct values in pure SQL without PL/pgSQL
-- However, we can do bulk inserts based on distinct values in transactions.

DO $$ 
DECLARE
    r RECORD;
    new_cat_id UUID;
    new_pm_id UUID;
BEGIN
    -- Migrate Categories
    FOR r IN (SELECT DISTINCT category, user_id FROM public.transactions WHERE category IS NOT NULL AND category_id IS NULL) LOOP
        -- Insert or Get Category
        INSERT INTO public.categories (user_id, name)
        VALUES (r.user_id, r.category)
        ON CONFLICT DO NOTHING -- Only if we had a unique constraint, but we don't on name+user_id yet. 
        RETURNING id INTO new_cat_id;

        -- If not inserted (duplicate logic absent), find it.
        IF new_cat_id IS NULL THEN
            -- Currently simple script implies we just insert. To be safe let's assume empty table.
             NULL; 
        END IF;
        
        -- Update transactions
        UPDATE public.transactions 
        SET category_id = (SELECT id FROM public.categories WHERE name = r.category AND user_id = r.user_id LIMIT 1)
        WHERE category = r.category AND user_id = r.user_id;
    END LOOP;

    -- Migrate Payment Methods
    FOR r IN (SELECT DISTINCT payment, user_id FROM public.transactions WHERE payment IS NOT NULL AND payment_method_id IS NULL) LOOP
        -- Guess Type: simple heuristic
        -- If name contains 'Card' or 'Visa' or 'Master' -> card, else bank/cash? 
        -- For MVP safety, let's default to 'bank' or 'cash' unless obvious? 
        -- Actually, safer to just label 'manual' or 'unknown' if we had that type.
        -- Let's just create them as 'bank' (safe, immediate deduction) and let user edit later.
        
        INSERT INTO public.payment_methods (user_id, name, type)
        VALUES (r.user_id, r.payment, 'bank')
        RETURNING id INTO new_pm_id;

        UPDATE public.transactions
        SET payment_method_id = (SELECT id FROM public.payment_methods WHERE name = r.payment AND user_id = r.user_id LIMIT 1)
        WHERE payment = r.payment AND user_id = r.user_id;
    END LOOP;

END $$;
