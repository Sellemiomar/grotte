-- ==============================================================================
-- LA GROTTE — RLS HARDENING MIGRATION
-- Fixes: ownership checks on stock_counts/access_logs inserts,
--        adds update/delete policies where an audit trail isn't required.
-- Run this AFTER 20260909_init_schema.sql
-- ==============================================================================

-- Helper: resolve the calling user's staff.id (not auth.users.id) for ownership checks
CREATE OR REPLACE FUNCTION public.current_staff_id()
RETURNS UUID AS $$
  SELECT id FROM public.staff WHERE user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ------------------------------------------------------------------------------
-- 1. STOCK_COUNTS — replace the open "WITH CHECK (true)" insert policy
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Allow stock counts insert for all operational staff" ON public.stock_counts;

CREATE POLICY "Staff can only log counts under their own name"
ON public.stock_counts FOR INSERT TO authenticated
WITH CHECK (
  counted_by = public.current_staff_id()::text
  OR counted_by IN (SELECT name FROM public.staff WHERE id = public.current_staff_id())
  OR public.current_user_role() IN ('owner', 'stock_manager')
);

-- No UPDATE/DELETE policy added here on purpose: stock_counts is an append-only
-- audit trail. If a count was wrong, log a correction as a new row rather than
-- editing history — that's a feature for an anti-theft system, not a gap.
-- If you decide corrections are needed, add an UPDATE policy scoped to
-- owner/stock_manager only, and log the original+correction pair, don't overwrite.

-- ------------------------------------------------------------------------------
-- 2. ACCESS_LOGS — same ownership tightening
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Allow access log insert for all staff" ON public.access_logs;

CREATE POLICY "Staff can only log their own access events"
ON public.access_logs FOR INSERT TO authenticated
WITH CHECK (
  staff_id = public.current_staff_id()::text
  OR staff_id IN (SELECT name FROM public.staff WHERE id = public.current_staff_id())
  OR public.current_user_role() IN ('owner', 'stock_manager')
);

-- Allow a staff member to log their own "timestamp_out" when leaving
-- (without this, nobody could ever close out their own access entry)
CREATE POLICY "Staff can update their own open access log to add exit time"
ON public.access_logs FOR UPDATE TO authenticated
USING (
  staff_id = public.current_staff_id()::text
  OR staff_id IN (SELECT name FROM public.staff WHERE id = public.current_staff_id())
  OR public.current_user_role() IN ('owner', 'stock_manager')
)
WITH CHECK (
  staff_id = public.current_staff_id()::text
  OR staff_id IN (SELECT name FROM public.staff WHERE id = public.current_staff_id())
  OR public.current_user_role() IN ('owner', 'stock_manager')
);

-- Read access for operational staff to view access logs in audit views
DROP POLICY IF EXISTS "Allow read access for authenticated staff on access_logs" ON public.access_logs;
CREATE POLICY "Allow read access for authenticated staff on access_logs"
ON public.access_logs FOR SELECT TO authenticated USING (true);

-- Full management access for owner and stock_manager (includes deletion/cleanup)
DROP POLICY IF EXISTS "Full access for owner and stock_manager on access_logs" ON public.access_logs;
CREATE POLICY "Full access for owner and stock_manager on access_logs"
ON public.access_logs FOR ALL TO authenticated
USING (public.current_user_role() IN ('owner', 'stock_manager'))
WITH CHECK (public.current_user_role() IN ('owner', 'stock_manager'));

-- ------------------------------------------------------------------------------
-- 3. SALES and POS_VOIDS — owner/stock_manager management access
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Full access for owner and stock_manager on pos_voids" ON public.pos_voids;
CREATE POLICY "Full access for owner and stock_manager on pos_voids"
ON public.pos_voids FOR ALL TO authenticated
USING (public.current_user_role() IN ('owner', 'stock_manager'))
WITH CHECK (public.current_user_role() IN ('owner', 'stock_manager'));

-- ------------------------------------------------------------------------------
-- 4. Sanity check query — run this after applying to confirm no policy locks
--    out the owner account entirely (a common mistake when tightening RLS)
-- ------------------------------------------------------------------------------
-- SELECT * FROM public.stock_counts LIMIT 1; -- as owner, should still work
-- INSERT INTO public.stock_counts (ingredient_id, counted_quantity, shift, counted_by)
--   VALUES ('<some-ingredient-uuid>', 10, 'morning', '<your-own-staff-id>'); -- should work
