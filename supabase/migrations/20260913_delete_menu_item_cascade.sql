-- ==============================================================================
-- LA GROTTE — TRANSACTIONAL MENU ITEM CASCADE DELETE
-- Fixes: deleteMenuItem in StockContext.tsx currently issues 4 separate
-- sequential DELETE calls with no real atomicity — a failure partway through
-- leaves orphaned/missing child rows in the database even though the UI
-- reverts to looking unchanged. This wraps all 4 deletes in one transaction.
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.delete_menu_item_cascade(item_id UUID)
RETURNS void AS $$
BEGIN
  DELETE FROM public.recipe_ingredients WHERE menu_item_id = item_id;
  DELETE FROM public.sales WHERE menu_item_id = item_id;
  DELETE FROM public.pos_voids WHERE menu_item_id = item_id::text;
  DELETE FROM public.menu_items WHERE id = item_id;
  -- If any statement above raises an exception, Postgres automatically
  -- rolls back the entire function body — this is what makes it atomic,
  -- unlike 4 separate client-side .delete() calls.
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Restrict who can call this — same roles allowed to delete recipes today
REVOKE ALL ON FUNCTION public.delete_menu_item_cascade(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_menu_item_cascade(UUID) TO authenticated;
