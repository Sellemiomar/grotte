-- ==============================================================================
-- LA GROTTE — REVOKE ANON ACCESS ON PURCHASE_ORDERS (CORRECTED)
-- The previous revoke migration (20260914) targeted the wrong policy names
-- for these two tables ("Allow anon read/write ...") — the actual policies
-- created by 20260913_purchase_orders.sql are named "Allow read purchase_orders"
-- and "Allow manage purchase_orders" and were very likely never dropped.
-- This migration targets the REAL names.
-- ==============================================================================

DROP POLICY IF EXISTS "Allow read purchase_orders" ON public.purchase_orders;
DROP POLICY IF EXISTS "Allow manage purchase_orders" ON public.purchase_orders;
DROP POLICY IF EXISTS "Allow read purchase_order_items" ON public.purchase_order_items;
DROP POLICY IF EXISTS "Allow manage purchase_order_items" ON public.purchase_order_items;

-- Replace with role-scoped policies matching the rest of the app:
-- all authenticated staff can read, only owner/stock_manager can write.
CREATE POLICY "Allow read purchase_orders for authenticated staff"
ON public.purchase_orders FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Full access for owner and stock_manager on purchase_orders"
ON public.purchase_orders FOR ALL
TO authenticated
USING (public.current_user_role() IN ('owner', 'stock_manager'))
WITH CHECK (public.current_user_role() IN ('owner', 'stock_manager'));

CREATE POLICY "Allow read purchase_order_items for authenticated staff"
ON public.purchase_order_items FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Full access for owner and stock_manager on purchase_order_items"
ON public.purchase_order_items FOR ALL
TO authenticated
USING (public.current_user_role() IN ('owner', 'stock_manager'));

-- Verify after running — should return ZERO rows:
-- SELECT tablename, policyname FROM pg_policies WHERE roles::text LIKE '%anon%';
