-- Fix infinite recursion in profiles RLS policies
-- The admin check was causing recursion by querying profiles within the policy

-- Drop problematic policies
DROP POLICY IF EXISTS "select_own_profile" ON profiles;
DROP POLICY IF EXISTS "public_read_profiles" ON profiles;
DROP POLICY IF EXISTS "insert_own_profile" ON profiles;
DROP POLICY IF EXISTS "update_own_profile" ON profiles;
DROP POLICY IF EXISTS "delete_own_profile" ON profiles;

-- Create simple non-recursive policies
CREATE POLICY "users_read_own_profile" ON profiles FOR SELECT TO authenticated 
  USING (auth.uid() = id);

-- Allow anon to read profiles for leaderboard
CREATE POLICY "anon_read_profiles" ON profiles FOR SELECT TO anon 
  USING (TRUE);

-- Simplify insert policy
CREATE POLICY "users_insert_own_profile" ON profiles FOR INSERT TO authenticated 
  WITH CHECK (auth.uid() = id);

-- Simplify update policy  
CREATE POLICY "users_update_own_profile" ON profiles FOR UPDATE TO authenticated 
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Simplify delete policy
CREATE POLICY "users_delete_own_profile" ON profiles FOR DELETE TO authenticated 
  USING (auth.uid() = id);