-- ==============================================================================
-- LA GROTTE — PURCHASE ORDERS (BONS DE COMMANDE) MIGRATION
-- Tables: purchase_orders, purchase_order_items
-- RLS: Permitted for both authenticated staff and anon operational tablets.
-- ==============================================================================

-- 1. Create purchase_orders table
CREATE TABLE IF NOT EXISTS public.purchase_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE RESTRICT,
  status TEXT NOT NULL CHECK (status IN ('draft', 'sent', 'received')) DEFAULT 'draft',
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  sent_at TIMESTAMPTZ,
  received_at TIMESTAMPTZ,
  notes TEXT
);

-- 2. Create purchase_order_items table
CREATE TABLE IF NOT EXISTS public.purchase_order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  purchase_order_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  ingredient_id UUID NOT NULL REFERENCES public.ingredients(id) ON DELETE RESTRICT,
  suggested_quantity NUMERIC(10,3) NOT NULL,
  unit_cost NUMERIC(10,3) NOT NULL,
  notes TEXT
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier_id ON public.purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON public.purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_po_id ON public.purchase_order_items(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_ingredient_id ON public.purchase_order_items(ingredient_id);

-- 3. Enable RLS
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;

-- 4. RLS for purchase_orders (both authenticated and anon client)
DROP POLICY IF EXISTS "Allow read purchase_orders" ON public.purchase_orders;
DROP POLICY IF EXISTS "Allow read purchase_orders for authenticated staff" ON public.purchase_orders;
DROP POLICY IF EXISTS "Full access for owner and stock_manager on purchase_orders" ON public.purchase_orders;
DROP POLICY IF EXISTS "Allow manage purchase_orders" ON public.purchase_orders;

CREATE POLICY "Allow read purchase_orders"
ON public.purchase_orders FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Allow manage purchase_orders"
ON public.purchase_orders FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- 5. RLS for purchase_order_items (both authenticated and anon client)
DROP POLICY IF EXISTS "Allow read purchase_order_items" ON public.purchase_order_items;
DROP POLICY IF EXISTS "Allow read purchase_order_items for authenticated staff" ON public.purchase_order_items;
DROP POLICY IF EXISTS "Full access for owner and stock_manager on purchase_order_items" ON public.purchase_order_items;
DROP POLICY IF EXISTS "Allow manage purchase_order_items" ON public.purchase_order_items;

CREATE POLICY "Allow read purchase_order_items"
ON public.purchase_order_items FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Allow manage purchase_order_items"
ON public.purchase_order_items FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

