-- Fix Infinite Recursion by using a SECURITY DEFINER function
-- Run this in Supabase SQL Editor

-- 1. Create a helper function to check membership without triggering RLS
-- SECURITY DEFINER means this runs with the privileges of the function creator (admin),
-- bypassing the Row Level Security checks on the table it queries.
CREATE OR REPLACE FUNCTION public.is_group_member(_group_id UUID)
RETURNS BOOLEAN 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public -- Best practice for security definers
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM group_members 
    WHERE group_id = _group_id 
    AND profile_id = auth.uid()
  );
END;
$$;

-- 2. Drop existing policies
DROP POLICY IF EXISTS "Users can view groups they belong to" ON groups;
DROP POLICY IF EXISTS "Users can view members of their groups" ON group_members;

-- 3. Recreate policies utilizing the security definer function
-- Now the policy calls the function, which bypasses RLS, avoiding the "check policy -> check table -> check policy" loop.

-- GROUPS POLICY
CREATE POLICY "Users can view groups they belong to" ON groups
  FOR SELECT USING (
    created_by = auth.uid() 
    OR is_group_member(id)
  );

-- GROUP MEMBERS POLICY
CREATE POLICY "Users can view members of their groups" ON group_members
  FOR SELECT USING (
    profile_id = auth.uid() -- You can always see yourself
    OR is_group_member(group_id) -- You can see others if you are in the group
  );
