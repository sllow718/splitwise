-- Supabase SQL Schema for SplitEase
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- PROFILES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Policies for profiles
CREATE POLICY "Users can view all profiles" ON profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- GROUPS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;

-- Policies for groups (users can see groups they're members of)
CREATE POLICY "Users can view groups they belong to" ON groups
  FOR SELECT USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = groups.id
      AND group_members.profile_id = auth.uid()
    )
  );

CREATE POLICY "Users can create groups" ON groups
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Group creators can update groups" ON groups
  FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Group creators can delete groups" ON groups
  FOR DELETE USING (auth.uid() = created_by);

-- ============================================
-- GROUP MEMBERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS group_members (
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (group_id, profile_id)
);

-- Enable Row Level Security
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;

-- Policies for group_members
CREATE POLICY "Users can view members of their groups" ON group_members
  FOR SELECT USING (
    profile_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM group_members gm
      WHERE gm.group_id = group_members.group_id
      AND gm.profile_id = auth.uid()
    )
  );

CREATE POLICY "Users can add themselves to groups" ON group_members
  FOR INSERT WITH CHECK (
    auth.uid() = profile_id
    OR EXISTS (
      SELECT 1 FROM groups
      WHERE groups.id = group_id
      AND groups.created_by = auth.uid()
    )
  );

CREATE POLICY "Group creators can remove members" ON group_members
  FOR DELETE USING (
    profile_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM groups
      WHERE groups.id = group_id
      AND groups.created_by = auth.uid()
    )
  );

-- ============================================
-- EXPENSES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  payer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  amount NUMERIC(10,2) NOT NULL CHECK (amount > 0),
  currency TEXT DEFAULT 'USD',
  category TEXT DEFAULT 'other' CHECK (category IN ('food', 'transport', 'rent', 'utilities', 'entertainment', 'other')),
  attachment_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- Policies for expenses
CREATE POLICY "Users can view expenses in their groups" ON expenses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = expenses.group_id
      AND group_members.profile_id = auth.uid()
    )
  );

CREATE POLICY "Group members can create expenses" ON expenses
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = group_id
      AND group_members.profile_id = auth.uid()
    )
  );

CREATE POLICY "Expense creators and payers can update" ON expenses
  FOR UPDATE USING (
    payer_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM groups
      WHERE groups.id = group_id
      AND groups.created_by = auth.uid()
    )
  );

CREATE POLICY "Expense creators and payers can delete" ON expenses
  FOR DELETE USING (
    payer_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM groups
      WHERE groups.id = group_id
      AND groups.created_by = auth.uid()
    )
  );

-- ============================================
-- EXPENSE SPLITS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS expense_splits (
  expense_id UUID NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL CHECK (amount >= 0),
  status TEXT DEFAULT 'unpaid' CHECK (status IN ('unpaid', 'paid')),
  PRIMARY KEY (expense_id, user_id)
);

-- Enable Row Level Security
ALTER TABLE expense_splits ENABLE ROW LEVEL SECURITY;

-- Policies for expense_splits
CREATE POLICY "Users can view splits in their groups" ON expense_splits
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM expenses e
      JOIN group_members gm ON gm.group_id = e.group_id
      WHERE e.id = expense_splits.expense_id
      AND gm.profile_id = auth.uid()
    )
  );

CREATE POLICY "Group members can create splits" ON expense_splits
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM expenses e
      JOIN group_members gm ON gm.group_id = e.group_id
      WHERE e.id = expense_id
      AND gm.profile_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own split status" ON expense_splits
  FOR UPDATE USING (user_id = auth.uid());

-- ============================================
-- STORAGE BUCKET FOR ATTACHMENTS
-- ============================================
-- Note: Run this in a separate query or use the Supabase Dashboard
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('expense-attachments', 'expense-attachments', true)
-- ON CONFLICT DO NOTHING;

-- Storage policy for expense attachments
-- CREATE POLICY "Authenticated users can upload attachments"
-- ON storage.objects FOR INSERT
-- TO authenticated
-- WITH CHECK (bucket_id = 'expense-attachments');

-- CREATE POLICY "Anyone can view attachments"
-- ON storage.objects FOR SELECT
-- TO public
-- USING (bucket_id = 'expense-attachments');

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_group_members_profile_id ON group_members(profile_id);
CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_expenses_group_id ON expenses(group_id);
CREATE INDEX IF NOT EXISTS idx_expenses_payer_id ON expenses(payer_id);
CREATE INDEX IF NOT EXISTS idx_expense_splits_expense_id ON expense_splits(expense_id);
CREATE INDEX IF NOT EXISTS idx_expense_splits_user_id ON expense_splits(user_id);
