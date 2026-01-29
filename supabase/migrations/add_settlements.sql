-- Migration: Add settlements table
-- Description: Add settlements table with RLS policies for tracking payments between users

-- ============================================
-- SETTLEMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS settlements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  payer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  payee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL CHECK (amount > 0),
  currency TEXT DEFAULT 'USD',
  notes TEXT,
  settlement_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE settlements ENABLE ROW LEVEL SECURITY;

-- Policies for settlements
CREATE POLICY "Users can view settlements in their groups" ON settlements
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = settlements.group_id
      AND group_members.profile_id = auth.uid()
    )
  );

CREATE POLICY "Group members can create settlements" ON settlements
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = group_id
      AND group_members.profile_id = auth.uid()
    )
  );

CREATE POLICY "Settlement creators can update their settlements" ON settlements
  FOR UPDATE USING (
    payer_id = auth.uid()
    OR payee_id = auth.uid()
  );

CREATE POLICY "Settlement creators can delete their settlements" ON settlements
  FOR DELETE USING (
    payer_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM groups
      WHERE groups.id = group_id
      AND groups.created_by = auth.uid()
    )
  );

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_settlements_group_id ON settlements(group_id);
CREATE INDEX IF NOT EXISTS idx_settlements_payer_id ON settlements(payer_id);
CREATE INDEX IF NOT EXISTS idx_settlements_payee_id ON settlements(payee_id);
