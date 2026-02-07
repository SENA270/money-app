
// scripts/fix_payment_methods.js
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function fix() {
  console.log("=== FIXING MISSING PAYMENT METHODS ===");

  // 1. Get all transactions with user_id
  // We need to group by user key? RLS might block if we aren't signed in as that user.
  // BUT with service key (if we had it) we could. With Anon key, we can only access if RLS allows public? 
  // RLS is ON for `transactions`. 
  // Failsafe: WE CANNOT FIX DATA FOR ALL USERS WITHOUT SERVICE KEY.

  // HOWEVER, we can try to fix for the user "senanakamura" serves?
  // The previous script failed to find payment_methods. 
  // Did it fail because RLS hid them?
  // "No payment methods found in DB." -> could be RLS returning [] for Anon.

  // CRITICAL CHECK:
  // Does the debug script have a Session? NO.
  // Does the App have a Session? YES.
  // If the App sees 0, it means for the Logged In User, there are 0 payment methods.

  // SO, assuming we are fixing for a specific user who is running this?
  // We can't easily sign in as them in a script.

  // ALTERNATIVE:
  // Generate a SQL migration file that the user can run in Supabase Dashboard SQL Editor.
  // This bypasses RLS issues (mostly) and works for all users.

  console.log("Cannot run data fix via script without Auth. Generating SQL...");
}

// Just outputting the SQL to console? 
const sql = `
-- Backfill Payment Methods from Transactions
DO $$ 
DECLARE
    r RECORD;
    new_id UUID;
BEGIN
    -- For every distinct payment name/user pair in transactions
    FOR r IN (
        SELECT DISTINCT payment, user_id 
        FROM public.transactions 
        WHERE payment IS NOT NULL 
          AND payment <> ''
          AND (payment_method_id IS NULL OR user_id NOT IN (SELECT user_id FROM public.payment_methods))
    ) LOOP
        
        -- Check if it exists in payment_methods
        SELECT id INTO new_id FROM public.payment_methods WHERE name = r.payment AND user_id = r.user_id;

        -- If not, created it
        IF new_id IS NULL THEN
            INSERT INTO public.payment_methods (user_id, name, type, balance)
            VALUES (r.user_id, r.payment, 'bank', 0) -- Default to bank, 0 balance
            RETURNING id INTO new_id;
            RAISE NOTICE 'Created Payment Method: % for User %', r.payment, r.user_id;
        END IF;

        -- Link transactions
        UPDATE public.transactions
        SET payment_method_id = new_id
        WHERE payment = r.payment AND user_id = r.user_id AND payment_method_id IS NULL;
        
    END LOOP;
END $$;
`;

console.log(sql);
