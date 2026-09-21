-- ==============================================================================
-- LA GROTTE — WASTE LOGS MIGRATION (Known & Disclosed Waste Tracking)
-- Tracks acknowledged losses (spoilage, breakage, staff meals, comps, etc.)
-- to distinguish honest operational waste from unexplained theft/variance.
-- Run in: Supabase SQL Editor (https://supabase.com/dashboard/project/atcpmlaijqxvehuwacpc/sql/new)
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.waste_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ingredient_id UUID NOT NULL REFERENCES public.ingredients(id) ON DELETE CASCADE,
    quantity NUMERIC(10, 3) NOT NULL CHECK (quantity >= 0),
    unit_cost_at_time NUMERIC(10, 3) NOT NULL,
    reason TEXT NOT NULL CHECK (reason IN ('spoilage', 'spillage', 'breakage', 'staff_meal', 'comp', 'other')),
    logged_by TEXT NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    shift TEXT NOT NULL CHECK (shift IN ('morning', 'evening')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_waste_logs_ingredient_date ON public.waste_logs(ingredient_id, date);
CREATE INDEX IF NOT EXISTS idx_waste_logs_date ON public.waste_logs(date DESC);
CREATE INDEX IF NOT EXISTS idx_waste_logs_reason ON public.waste_logs(reason);

-- Enable Row Level Security (RLS)
ALTER TABLE public.waste_logs ENABLE ROW LEVEL SECURITY;

-- 1. READ PERMISSIONS: Authenticated users can view waste logs for audits & variance reports
DROP POLICY IF EXISTS "Allow read access for authenticated staff on waste_logs" ON public.waste_logs;
CREATE POLICY "Allow read access for authenticated staff on waste_logs"
ON public.waste_logs FOR SELECT TO authenticated
USING (true);

-- 2. INSERT PERMISSIONS:
-- Authenticated users (staff, managers, owners) can record waste
DROP POLICY IF EXISTS "Staff can only log waste under their own name or manager" ON public.waste_logs;
DROP POLICY IF EXISTS "Allow authenticated staff to insert waste_logs" ON public.waste_logs;
CREATE POLICY "Allow authenticated staff to insert waste_logs"
ON public.waste_logs FOR INSERT TO authenticated
WITH CHECK (
  auth.role() = 'authenticated'
);

-- 3. FULL ACCESS FOR OWNER & STOCK_MANAGER (allows corrections or audit cleanup)
DROP POLICY IF EXISTS "Full access for owner and stock_manager on waste_logs" ON public.waste_logs;
CREATE POLICY "Full access for owner and stock_manager on waste_logs"
ON public.waste_logs FOR ALL TO authenticated
USING (
  public.current_user_role() IN ('owner', 'stock_manager')
)
WITH CHECK (
  public.current_user_role() IN ('owner', 'stock_manager')
);

-- 4. Enable Realtime subscriptions safely
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.waste_logs;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

