
// debug_forecast.js
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase Env Vars in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function debug() {
  console.log("--- DEBUG FORECAST DATA (CommonJS) ---");

  // 1. Fetch ALL Payment Methods to find a user
  const { data: pms, error: pmErr } = await supabase.from('payment_methods').select('user_id, name, type, balance').limit(5);

  if (pmErr) {
    console.error("Error fetching payment_methods:", pmErr);
    return;
  }

  if (!pms || pms.length === 0) {
    console.log("No payment methods found in DB.");
    return;
  }

  // Pick a user (Assuming the user running the app is one of these)
  // We can't know which user "senanakamura" is logging in as without auth.
  // But we can show what IS in the DB.
  const userId = pms[0].user_id;
  console.log(`Using inferred User ID: ${userId}`);

  // 2. Details for this user
  const userPms = await supabase.from('payment_methods').select('*').eq('user_id', userId);
  console.log(`\nUser Payment Methods (${userPms.data?.length}):`);
  userPms.data?.forEach(pm => {
    console.log(` - ${pm.name} (${pm.type}): Balance ${pm.balance}`);
  });

  // 3. Transactions
  const { count } = await supabase.from('transactions').select('*', { count: 'exact', head: true }).eq('user_id', userId);
  console.log(`\nUser Transactions Types:`);
  const { data: txTypes } = await supabase.from('transactions').select('type').eq('user_id', userId).limit(20);
  // counts by type
  const typeCounts = {};
  txTypes?.forEach(t => typeCounts[t.type] = (typeCounts[t.type] || 0) + 1);
  console.log(JSON.stringify(typeCounts));

  // 4. Loans
  const { data: loans } = await supabase.from('loans').select('*').eq('user_id', userId);
  console.log(`\nUser Loans (${loans?.length}):`);
  loans?.forEach(l => {
    console.log(` - ${l.name}: Rule=${l.repayment_rule}, Monthly=${l.monthly_amount}`);
  });

  // 5. Forecast Logic Simulation
  console.log("\n--- Simulation ---");
  const assetAccounts = userPms.data?.filter(a => ['bank', 'wallet', 'qr'].includes(a.type)) || [];
  let startBal = 0;
  assetAccounts.forEach(a => startBal += (Number(a.balance) || 0));
  console.log(`Start Balance (Sum of Accounts): ${startBal}`);

  // If startBal is 0, query transactions?
  if (startBal === 0) {
    console.log("WARN: Start Balance is 0. Graph will start at 0.");
    console.log("Check if 'payment_methods' have 'balance' set in DB.");
  }
}

debug();
