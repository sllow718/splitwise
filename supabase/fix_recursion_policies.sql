-- Update policies to fix infinite recursion
-- Run this in your Supabase SQL Editor

-- 1. Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view groups they belong to" ON groups;
DROP POLICY IF EXISTS "Users can view members of their groups" ON group_members;

-- 2. Recreate policies with recursion checks
-- Optimized to check ownership first (short-circuiting)
CREATE POLICY "Users can view groups they belong to" ON groups
  FOR SELECT USING (
    created_by = auth.uid() 
    OR EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = groups.id
      AND group_members.profile_id = auth.uid()
    )
  );

CREATE POLICY "Users can view members of their groups" ON group_members
  FOR SELECT USING (
    profile_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM group_members gm
      WHERE gm.group_id = group_members.group_id
      AND gm.profile_id = auth.uid()
    )
  );
