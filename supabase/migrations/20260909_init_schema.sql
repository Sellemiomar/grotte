-- ==============================================================================
-- LA GROTTE RESTAURANT (MONASTIR) — SUPABASE DATABASE MIGRATION
-- Schema: Staff, Ingredients, Suppliers, Deliveries, Stock Counts, 
--         MenuItems, RecipeIngredients, Sales, AccessLogs, PosVoids
-- Security: Row Level Security (RLS) with RBAC (owner, stock_manager, cook, server)
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. STAFF TABLE (linked to auth.users if Supabase Auth is enabled)
CREATE TABLE IF NOT EXISTS public.staff (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('owner', 'stock_manager', 'cook', 'server')),
    role_title TEXT,
    email TEXT UNIQUE,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. SUPPLIERS TABLE
CREATE TABLE IF NOT EXISTS public.suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    contact TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. INGREDIENTS TABLE
CREATE TABLE IF NOT EXISTS public.ingredients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    unit TEXT NOT NULL CHECK (unit IN ('kg', 'g', 'L', 'mL', 'unit/piece', 'piece')),
    category TEXT NOT NULL CHECK (category IN ('meat', 'dairy', 'beverage', 'produce', 'alcohol', 'other', 'dry goods', 'seafood', 'bakery')),
    cost_per_unit NUMERIC(10, 3) NOT NULL DEFAULT 0.000, -- Cost in Tunisian Dinar (DT)
    current_stock NUMERIC(10, 3) NOT NULL DEFAULT 0.000,
    min_alert_threshold NUMERIC(10, 3),
    location TEXT DEFAULT 'Réserve Principale',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. DELIVERIES TABLE (Stock In)
CREATE TABLE IF NOT EXISTS public.deliveries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ingredient_id UUID NOT NULL REFERENCES public.ingredients(id) ON DELETE CASCADE,
    supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE RESTRICT,
    quantity NUMERIC(10, 3) NOT NULL CHECK (quantity > 0),
    unit_cost NUMERIC(10, 3) NOT NULL CHECK (unit_cost >= 0),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    received_by TEXT NOT NULL, -- Name or staff ID who signed delivery slip
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. STOCK COUNTS TABLE (Physical Inventory)
CREATE TABLE IF NOT EXISTS public.stock_counts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ingredient_id UUID NOT NULL REFERENCES public.ingredients(id) ON DELETE CASCADE,
    counted_quantity NUMERIC(10, 3) NOT NULL CHECK (counted_quantity >= 0),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    shift TEXT NOT NULL CHECK (shift IN ('morning', 'evening')),
    counted_by TEXT NOT NULL, -- FK or name of responsible staff
    photo_url TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 6. MENU ITEMS TABLE
CREATE TABLE IF NOT EXISTS public.menu_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    pos_reference TEXT NOT NULL UNIQUE,
    category TEXT,
    selling_price NUMERIC(10, 3) NOT NULL DEFAULT 0.000, -- Price in DT
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 7. RECIPE INGREDIENTS TABLE (Bill of Materials / BOM)
CREATE TABLE IF NOT EXISTS public.recipe_ingredients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    menu_item_id UUID NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
    ingredient_id UUID NOT NULL REFERENCES public.ingredients(id) ON DELETE RESTRICT,
    quantity_per_unit NUMERIC(10, 4) NOT NULL CHECK (quantity_per_unit > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE(menu_item_id, ingredient_id)
);

-- 8. SALES TABLE (POS Records)
CREATE TABLE IF NOT EXISTS public.sales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    menu_item_id UUID NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
    quantity_sold INTEGER NOT NULL CHECK (quantity_sold >= 0),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    source TEXT NOT NULL DEFAULT 'POS Export',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 9. ACCESS LOGS TABLE (Electronic Storage Access)
CREATE TABLE IF NOT EXISTS public.access_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    staff_id TEXT NOT NULL,
    staff_name TEXT,
    location TEXT NOT NULL,
    timestamp_in TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    timestamp_out TIMESTAMPTZ,
    action TEXT DEFAULT 'entry',
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 10. POS VOIDS TABLE (Caisse Auditing)
CREATE TABLE IF NOT EXISTS public.pos_voids (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    menu_item_id TEXT NOT NULL,
    staff_id TEXT NOT NULL,
    staff_name TEXT,
    item_name TEXT,
    type TEXT NOT NULL CHECK (type IN ('void', 'discount', 'comp')),
    amount NUMERIC(10, 3) NOT NULL DEFAULT 0.000,
    date TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

-- Enable RLS on all tables
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_counts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipe_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.access_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_voids ENABLE ROW LEVEL SECURITY;

-- Helper function to check user role from auth.jwt()
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.staff WHERE user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 1. READ PERMISSIONS: Authenticated staff can view core operational data
CREATE POLICY "Allow read access for authenticated staff on ingredients"
ON public.ingredients FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow read access for authenticated staff on menu_items"
ON public.menu_items FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow read access for authenticated staff on recipe_ingredients"
ON public.recipe_ingredients FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow read access for authenticated staff on suppliers"
ON public.suppliers FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow read access for authenticated staff on deliveries"
ON public.deliveries FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow read access for authenticated staff on stock_counts"
ON public.stock_counts FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow read access for authenticated staff on staff directory"
ON public.staff FOR SELECT TO authenticated USING (true);

-- 2. WRITE PERMISSIONS: Role-specific controls
-- Owners and Stock Managers can perform full CRUD across all tables
CREATE POLICY "Full access for owner and stock_manager on ingredients"
ON public.ingredients FOR ALL TO authenticated
USING (public.current_user_role() IN ('owner', 'stock_manager'))
WITH CHECK (public.current_user_role() IN ('owner', 'stock_manager'));

CREATE POLICY "Full access for owner and stock_manager on menu_items"
ON public.menu_items FOR ALL TO authenticated
USING (public.current_user_role() IN ('owner', 'stock_manager'))
WITH CHECK (public.current_user_role() IN ('owner', 'stock_manager'));

CREATE POLICY "Full access for owner and stock_manager on recipe_ingredients"
ON public.recipe_ingredients FOR ALL TO authenticated
USING (public.current_user_role() IN ('owner', 'stock_manager'))
WITH CHECK (public.current_user_role() IN ('owner', 'stock_manager'));

CREATE POLICY "Full access for owner and stock_manager on sales"
ON public.sales FOR ALL TO authenticated
USING (public.current_user_role() IN ('owner', 'stock_manager'))
WITH CHECK (public.current_user_role() IN ('owner', 'stock_manager'));

-- Cook and Server permissions: Can submit stock counts and access logs
CREATE POLICY "Allow stock counts insert for all operational staff"
ON public.stock_counts FOR INSERT TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow access log insert for all staff"
ON public.access_logs FOR INSERT TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow deliveries insert for stock receiving staff"
ON public.deliveries FOR INSERT TO authenticated
WITH CHECK (public.current_user_role() IN ('owner', 'stock_manager', 'cook'));

-- Realtime replication activation
ALTER PUBLICATION supabase_realtime ADD TABLE public.ingredients;
ALTER PUBLICATION supabase_realtime ADD TABLE public.stock_counts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.deliveries;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sales;
ALTER PUBLICATION supabase_realtime ADD TABLE public.access_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.pos_voids;
