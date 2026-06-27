-- Fix app_stats admin policy that causes recursion
DROP POLICY IF EXISTS "admin_write_stats" ON app_stats;

-- Use a simpler approach - allow all authenticated users to read, no writes for now
CREATE POLICY "anyone_read_stats" ON app_stats FOR SELECT USING (TRUE);