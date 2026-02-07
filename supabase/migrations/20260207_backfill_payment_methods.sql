-- Backfill Payment Methods from Transactions to ensure Forecast has accounts
-- This is necessary because some users might have data in transactions but no corresponding payment_methods rows.

DO $$ 
DECLARE
    r RECORD;
    new_id UUID;
    v_user_id UUID;
    v_payment_name TEXT;
BEGIN
    FOR r IN (
        SELECT DISTINCT payment, user_id 
        FROM public.transactions 
        WHERE payment IS NOT NULL 
          AND payment <> ''
          -- Only process if payment_method_id is NULL
          AND payment_method_id IS NULL
    ) LOOP
        v_user_id := r.user_id;
        v_payment_name := r.payment;

        -- 1. check if payment_method already exists by name for this user
        SELECT id INTO new_id 
        FROM public.payment_methods 
        WHERE name = v_payment_name AND user_id = v_user_id;

        -- 2. If not found, create it
        IF new_id IS NULL THEN
            INSERT INTO public.payment_methods (user_id, name, type, balance)
            VALUES (v_user_id, v_payment_name, 'bank', 0) -- Default type 'bank', balance 0
            RETURNING id INTO new_id;
        END IF;

        -- 3. Link transactions to this payment_method
        UPDATE public.transactions
        SET payment_method_id = new_id
        WHERE payment = v_payment_name AND user_id = v_user_id AND payment_method_id IS NULL;
        
    END LOOP;
END $$;
