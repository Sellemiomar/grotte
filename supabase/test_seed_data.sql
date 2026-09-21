-- ==============================================================================
-- LA GROTTE (MONASTIR) — TEST DATA SEED SCRIPT
-- Purpose: Insert sample data to test live Supabase syncing, calculations,
--          BOM consumption, variance detection, and cascade deletion.
-- Run in: Supabase SQL Editor (https://supabase.com/dashboard/project/atcpmlaijqxvehuwacpc/sql/new)
-- ==============================================================================

-- 1. Clean previous test items if re-running
DELETE FROM public.pos_voids WHERE id = '99999999-9999-4999-8999-111111111111';
DELETE FROM public.sales WHERE id IN ('66666666-6666-4666-8666-111111111111', '66666666-6666-4666-8666-222222222222');
DELETE FROM public.recipe_ingredients WHERE menu_item_id IN ('44444444-4444-4444-8444-111111111111', '44444444-4444-4444-8444-222222222222');
DELETE FROM public.menu_items WHERE id IN ('44444444-4444-4444-8444-111111111111', '44444444-4444-4444-8444-222222222222') OR pos_reference IN ('PIZ-01', 'GRI-02');
DELETE FROM public.stock_counts WHERE id IN ('88888888-8888-4888-8888-111111111111', '88888888-8888-4888-8888-222222222222');
DELETE FROM public.deliveries WHERE id IN ('77777777-7777-4777-8777-111111111111', '77777777-7777-4777-8777-222222222222');
DELETE FROM public.ingredients WHERE id IN ('33333333-3333-4333-8333-111111111111', '33333333-3333-4333-8333-222222222222', '33333333-3333-4333-8333-333333333333', '33333333-3333-4333-8333-444444444444');
DELETE FROM public.suppliers WHERE id IN ('22222222-2222-4222-8222-111111111111', '22222222-2222-4222-8222-222222222222');

-- 2. Staff (using ON CONFLICT on email so existing emails are seamlessly updated)
INSERT INTO public.staff (name, role, role_title, email, active)
VALUES 
  ('Omar Sellemi', 'owner', 'Propriétaire & Gérant', 'owner@lagrotte.tn', true),
  ('Karim Ben Salem', 'stock_manager', 'Responsable Stocks & Économat', 'stock@lagrotte.tn', true)
ON CONFLICT (email) DO UPDATE SET 
  name = EXCLUDED.name, 
  role = EXCLUDED.role, 
  role_title = EXCLUDED.role_title,
  active = true;

-- 3. Suppliers
INSERT INTO public.suppliers (id, name, contact, notes)
VALUES
  ('22222222-2222-4222-8222-111111111111', 'Boucherie Centrale Provençale', 'Laurent - 04 91 22 33 44', 'Livraison Viandes mardi & vendredi'),
  ('22222222-2222-4222-8222-222222222222', 'Fromagerie des Alpilles', 'Claire - 04 90 55 66 77', 'Mozzarella & Fromages frais AOP');

-- 4. Ingredients
INSERT INTO public.ingredients (id, name, unit, category, cost_per_unit, current_stock, min_alert_threshold, location)
VALUES
  ('33333333-3333-4333-8333-111111111111', 'Merguez de Taureau', 'kg', 'meat', 12.000, 8.500, 5.000, 'Chambre Froide Viandes'),
  ('33333333-3333-4333-8333-222222222222', 'Mozzarella Fior di Latte', 'kg', 'dairy', 9.200, 11.200, 6.000, 'Chambre Froide Pizzeria'),
  ('33333333-3333-4333-8333-333333333333', 'Coulis Tomate San Marzano', 'kg', 'produce', 3.500, 20.000, 8.000, 'Épicerie Sèche'),
  ('33333333-3333-4333-8333-444444444444', 'Entrecôte Charolaise', 'kg', 'meat', 24.500, 6.200, 4.000, 'Chambre Froide Viandes');

-- 5. Menu Items
INSERT INTO public.menu_items (id, name, pos_reference, category, selling_price)
VALUES
  ('44444444-4444-4444-8444-111111111111', 'Pizza La Grotte Royale', 'PIZ-01', 'Pizzas', 24.500),
  ('44444444-4444-4444-8444-222222222222', 'Grillade Merguez du Chef', 'GRI-02', 'Grillades', 18.000);

-- 6. Recipe Ingredients (Bill of Materials / BOM)
INSERT INTO public.recipe_ingredients (id, menu_item_id, ingredient_id, quantity_per_unit)
VALUES
  ('55555555-5555-4555-8555-111111111111', '44444444-4444-4444-8444-111111111111', '33333333-3333-4333-8333-222222222222', 0.2000), -- 200g Mozzarella / pizza
  ('55555555-5555-4555-8555-222222222222', '44444444-4444-4444-8444-111111111111', '33333333-3333-4333-8333-111111111111', 0.1500), -- 150g Merguez / pizza
  ('55555555-5555-4555-8555-333333333333', '44444444-4444-4444-8444-111111111111', '33333333-3333-4333-8333-333333333333', 0.1000), -- 100g Coulis / pizza
  ('55555555-5555-4555-8555-444444444444', '44444444-4444-4444-8444-222222222222', '33333333-3333-4333-8333-111111111111', 0.3000); -- 300g Merguez / grillade

-- 7. POS Sales
INSERT INTO public.sales (id, menu_item_id, quantity_sold, date, source)
VALUES
  ('66666666-6666-4666-8666-111111111111', '44444444-4444-4444-8444-111111111111', 18, CURRENT_DATE, 'Caisse Monastir'),
  ('66666666-6666-4666-8666-222222222222', '44444444-4444-4444-8444-222222222222', 12, CURRENT_DATE, 'Caisse Monastir');

-- 8. Deliveries (Stock IN)
INSERT INTO public.deliveries (id, ingredient_id, supplier_id, quantity, unit_cost, date, received_by, notes)
VALUES
  ('77777777-7777-4777-8777-111111111111', '33333333-3333-4333-8333-111111111111', '22222222-2222-4222-8222-111111111111', 10.000, 12.000, CURRENT_DATE - 2, 'Karim Ben Salem', 'BL N°88219 - Conforme'),
  ('77777777-7777-4777-8777-222222222222', '33333333-3333-4333-8333-222222222222', '22222222-2222-4222-8222-222222222222', 15.000, 9.200, CURRENT_DATE - 2, 'Karim Ben Salem', 'BL N°4012 - Frais du jour');

-- 9. Stock Counts
INSERT INTO public.stock_counts (id, ingredient_id, counted_quantity, date, shift, counted_by, notes)
VALUES
  ('88888888-8888-4888-8888-111111111111', '33333333-3333-4333-8333-111111111111', 8.500, CURRENT_DATE, 'morning', 'Karim Ben Salem', 'Inventaire matinal'),
  ('88888888-8888-4888-8888-222222222222', '33333333-3333-4333-8333-222222222222', 11.200, CURRENT_DATE, 'morning', 'Karim Ben Salem', 'Pesée directe');

-- 10. POS Voids
INSERT INTO public.pos_voids (id, menu_item_id, staff_id, staff_name, item_name, type, amount, date, reason)
VALUES
  ('99999999-9999-4999-8999-111111111111', '44444444-4444-4444-8444-111111111111', 'Karim', 'Karim Ben Salem', 'Pizza La Grotte Royale', 'void', 24.500, CURRENT_TIMESTAMP, 'Erreur saisie table 4');
