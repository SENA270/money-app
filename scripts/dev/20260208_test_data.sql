-- Test Data for Phase E Verification (Budgeting)
-- Execute this in Supabase SQL Editor

DO $$ 
DECLARE
  v_user_id UUID;
  v_current_year INT := 2026;
  v_current_month INT := 2;
BEGIN
  -- Get the current user ID (assuming single user or pick one)
  -- For manual execution, replace with specific UUID if auth.uid() is not available in context,
  -- but usually in SQL Editor 'auth.uid()' might be null if not in RLS context.
  -- Better to fetch a real user.
  -- SELECT id INTO v_user_id FROM auth.users LIMIT 1;
  -- OR replace with your specific UID
  v_user_id := auth.uid(); 
  
  IF v_user_id IS NULL THEN
     -- Fallback for testing without auth context (e.g. direct SQL execution)
     SELECT id INTO v_user_id FROM auth.users LIMIT 1;
  END IF;

  RAISE NOTICE 'Inserting test data for user: %', v_user_id;

  -- 1. Insert Budgets
  -- Case A: "食費" (Food) - Budget 50,000 (Safe)
  INSERT INTO category_budgets (user_id, category, amount, year, month, created_at)
  VALUES (v_user_id, '食費', 50000, v_current_year, v_current_month, NOW());

  -- Case B: "趣味" (Hobbies) - Budget 10,000 (Over)
  INSERT INTO category_budgets (user_id, category, amount, year, month, created_at)
  VALUES (v_user_id, '趣味', 10000, v_current_year, v_current_month, NOW());

  -- Case C: "交通費" (Transport) - No Budget (Implicitly tested by NOT inserting)

  -- 2. Insert Transactions
  -- A: Food - Spent 30,000 (Safe, Rem: 20,000)
  INSERT INTO transactions (user_id, date, amount, type, category, memo, payment_method_id)
  VALUES (v_user_id, '2026-02-10', 30000, 'expense', '食費', 'Test Data: Supermarket', NULL);

  -- B: Hobbies - Spent 15,000 (Over by 5,000)
  INSERT INTO transactions (user_id, date, amount, type, category, memo, payment_method_id)
  VALUES (v_user_id, '2026-02-12', 15000, 'expense', '趣味', 'Test Data: Game', NULL);

  -- C: Transport - Spent 5,000 (No Budget, should not appear in budget list)
  INSERT INTO transactions (user_id, date, amount, type, category, memo, payment_method_id)
  VALUES (v_user_id, '2026-02-15', 5000, 'expense', '交通費', 'Test Data: Train', NULL);

  -- D: Repayment - 20,000 (Should be EXCLUDED from totalSpent)
  INSERT INTO transactions (user_id, date, amount, type, category, memo, payment_method_id)
  VALUES (v_user_id, '2026-02-27', 20000, 'repayment', '返済', 'Test Data: Loan Repayment', NULL);

END $$;
