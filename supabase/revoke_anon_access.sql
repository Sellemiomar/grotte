-- ==============================================================================
-- LA GROTTE — REVOKE ANON ACCESS SCRIPT
-- Purpose: Remove all anon role access policies added across
--          20260913_enable_anon_access.sql and 20260913_purchase_orders.sql.
--          Restores strict authenticated RLS across all tables.
-- Run in: Supabase SQL Editor (https://supabase.com/dashboard/project/atcpmlaijqxvehuwacpc/sql/new)
-- ==============================================================================

-- 1. DROP ALL ANON POLICIES FROM 20260913_enable_anon_access.sql

-- ingredients
DROP POLICY IF EXISTS "Allow anon read ingredients" ON public.ingredients;
DROP POLICY IF EXISTS "Allow anon write ingredients" ON public.ingredients;

-- menu_items
DROP POLICY IF EXISTS "Allow anon read menu_items" ON public.menu_items;
DROP POLICY IF EXISTS "Allow anon write menu_items" ON public.menu_items;

-- recipe_ingredients
DROP POLICY IF EXISTS "Allow anon read recipe_ingredients" ON public.recipe_ingredients;
DROP POLICY IF EXISTS "Allow anon write recipe_ingredients" ON public.recipe_ingredients;

-- suppliers
DROP POLICY IF EXISTS "Allow anon read suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Allow anon write suppliers" ON public.suppliers;

-- deliveries
DROP POLICY IF EXISTS "Allow anon read deliveries" ON public.deliveries;
DROP POLICY IF EXISTS "Allow anon write deliveries" ON public.deliveries;

-- stock_counts
DROP POLICY IF EXISTS "Allow anon read stock_counts" ON public.stock_counts;
DROP POLICY IF EXISTS "Allow anon write stock_counts" ON public.stock_counts;

-- staff
DROP POLICY IF EXISTS "Allow anon read staff" ON public.staff;
DROP POLICY IF EXISTS "Allow anon write staff" ON public.staff;

-- sales
DROP POLICY IF EXISTS "Allow anon read sales" ON public.sales;
DROP POLICY IF EXISTS "Allow anon write sales" ON public.sales;

-- pos_voids
DROP POLICY IF EXISTS "Allow anon read pos_voids" ON public.pos_voids;
DROP POLICY IF EXISTS "Allow anon write pos_voids" ON public.pos_voids;

-- 2. DROP ALL ANON POLICIES FROM 20260913_purchase_orders.sql

-- purchase_orders
DROP POLICY IF EXISTS "Allow anon read purchase_orders" ON public.purchase_orders;
DROP POLICY IF EXISTS "Allow anon write purchase_orders" ON public.purchase_orders;

-- purchase_order_items
DROP POLICY IF EXISTS "Allow anon read purchase_order_items" ON public.purchase_order_items;
DROP POLICY IF EXISTS "Allow anon write purchase_order_items" ON public.purchase_order_items;

-- 3. REVOKE ANY FUNCTION EXECUTE PRIVILEGES FROM ANON
REVOKE EXECUTE ON FUNCTION public.delete_menu_item_cascade(UUID) FROM anon;

-- 4. SWEEP ANY OTHER POLICIES ASSIGNED TO 'anon' IN PUBLIC SCHEMA
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN
        SELECT schemaname, tablename, policyname
        FROM pg_policies
        WHERE schemaname = 'public'
          AND ('anon' = ANY(roles) OR roles::text LIKE '%anon%')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', pol.policyname, pol.schemaname, pol.tablename);
        RAISE NOTICE 'Dropped anon policy % on %.%', pol.policyname, pol.schemaname, pol.tablename;
    END LOOP;
END $$;

-- 5. VERIFICATION QUERY
-- Expected result: 0 rows
SELECT tablename, policyname, roles, cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND roles::text LIKE '%anon%';
