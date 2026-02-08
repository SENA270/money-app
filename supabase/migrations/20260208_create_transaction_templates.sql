-- Create transaction_templates table with strict validation
CREATE TABLE transaction_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    amount NUMERIC CHECK (amount > 0), -- Positive only
    type TEXT NOT NULL CHECK (type IN ('income', 'expense')), -- Strict check
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL, -- Nullable (fallback needed in UI)
    payment_method_id UUID REFERENCES payment_methods(id) ON DELETE SET NULL, -- Nullable
    memo TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_used_at TIMESTAMPTZ DEFAULT NOW() -- For recent usage sorting
);

-- Indexes for performance
CREATE INDEX idx_transaction_templates_user_last_used ON transaction_templates(user_id, last_used_at DESC);
CREATE INDEX idx_transaction_templates_user_id ON transaction_templates(user_id);

-- Enable RLS
ALTER TABLE transaction_templates ENABLE ROW LEVEL SECURITY;

-- Policy: SELECT (Own data only)
CREATE POLICY "Users can view own templates" ON transaction_templates
    FOR SELECT USING (auth.uid() = user_id);

-- Policy: INSERT (Own data only)
CREATE POLICY "Users can insert own templates" ON transaction_templates
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: UPDATE (Own data only - e.g. for last_used_at)
CREATE POLICY "Users can update own templates" ON transaction_templates
    FOR UPDATE USING (auth.uid() = user_id);

-- Policy: DELETE (Own data only)
CREATE POLICY "Users can delete own templates" ON transaction_templates
    FOR DELETE USING (auth.uid() = user_id);
