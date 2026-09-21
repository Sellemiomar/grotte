-- ==============================================================================
-- LA GROTTE (MONASTIR) — CLEANUP SCRIPT FOR TEST DATA
-- Purpose: Safely delete all test data created by test_seed_data.sql.
-- Run in: Supabase SQL Editor (https://supabase.com/dashboard/project/atcpmlaijqxvehuwacpc/sql/new)
-- ==============================================================================

DELETE FROM public.pos_voids WHERE id = '99999999-9999-4999-8999-111111111111';
DELETE FROM public.purchase_orders WHERE notes LIKE '%test%' OR notes LIKE '%Test%';
DELETE FROM public.sales WHERE id IN ('66666666-6666-4666-8666-111111111111', '66666666-6666-4666-8666-222222222222');
DELETE FROM public.recipe_ingredients WHERE menu_item_id IN ('44444444-4444-4444-8444-111111111111', '44444444-4444-4444-8444-222222222222');
DELETE FROM public.menu_items WHERE id IN ('44444444-4444-4444-8444-111111111111', '44444444-4444-4444-8444-222222222222') OR pos_reference IN ('PIZ-01', 'GRI-02');
DELETE FROM public.stock_counts WHERE id IN ('88888888-8888-4888-8888-111111111111', '88888888-8888-4888-8888-222222222222');
DELETE FROM public.deliveries WHERE id IN ('77777777-7777-4777-8777-111111111111', '77777777-7777-4777-8777-222222222222');
DELETE FROM public.ingredients WHERE id IN ('33333333-3333-4333-8333-111111111111', '33333333-3333-4333-8333-222222222222', '33333333-3333-4333-8333-333333333333', '33333333-3333-4333-8333-444444444444');
DELETE FROM public.suppliers WHERE id IN ('22222222-2222-4222-8222-111111111111', '22222222-2222-4222-8222-222222222222');
