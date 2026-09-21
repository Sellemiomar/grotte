-- Migration: 20260909_performance_indexes.sql
-- Optimizing query performance under high volume for La Grotte Monastir (Stage 6)

-- 1. Index on stock_counts: lookup by ingredient and chronological ordering
CREATE INDEX IF NOT EXISTS idx_stock_counts_ingredient_date 
ON public.stock_counts(ingredient_id, date DESC);

-- 2. Index on deliveries: fast range scans for period consumption calculations
CREATE INDEX IF NOT EXISTS idx_deliveries_ingredient_date 
ON public.deliveries(ingredient_id, date DESC);

-- 3. Index on sales: fast menu item sales lookups for theoretical usage (BOM explode)
CREATE INDEX IF NOT EXISTS idx_sales_menu_item_date 
ON public.sales(menu_item_id, date DESC);

-- 4. Index on access_logs: fast badge scan correlation for staff cold-room audits
CREATE INDEX IF NOT EXISTS idx_access_logs_staff_timestamp 
ON public.access_logs(staff_id, timestamp_in DESC);

-- 5. Index on pos_voids: audit lookups by date and high-risk void amounts
CREATE INDEX IF NOT EXISTS idx_pos_voids_timestamp 
ON public.pos_voids(timestamp DESC);

-- 6. Index on recipe_ingredients: fast join on menu items to explode recipes
CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_ingredient 
ON public.recipe_ingredients(ingredient_id);

CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_menu_item 
ON public.recipe_ingredients(menu_item_id);
