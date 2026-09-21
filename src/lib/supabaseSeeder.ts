import { supabase } from './supabase';
import { getErrorMessage } from '../utils/errors';
import { 
  INITIAL_STAFF, 
  INITIAL_SUPPLIERS, 
  INITIAL_INGREDIENTS, 
  INITIAL_MENU_ITEMS, 
  INITIAL_RECIPE_INGREDIENTS, 
  INITIAL_DELIVERIES, 
  INITIAL_STOCK_COUNTS, 
  INITIAL_SALES, 
  INITIAL_ACCESS_LOGS, 
  INITIAL_POS_VOIDS 
} from '../data/seedData';

// Generates consistent deterministic UUIDs for seed relationships
const toDeterministicUUID = (prefix: string, id: string): string => {
  const hash = Array.from(prefix + id).reduce((acc, char) => (acc * 31 + char.charCodeAt(0)) >>> 0, 0);
  const hex = hash.toString(16).padStart(8, '0');
  return `00000000-0000-4000-8000-${hex.padStart(12, '0')}`;
};

export async function seedSupabaseIfEmpty(): Promise<{ success: boolean; message: string }> {
  if (!supabase) {
    return { success: false, message: 'Supabase client is not configured.' };
  }

  const client = supabase as any;

  try {
    // Check if ingredients table is already populated
    const { count, error: countErr } = await client
      .from('ingredients')
      .select('*', { count: 'exact', head: true });

    if (countErr) {
      console.warn('Could not query Supabase ingredients:', countErr.message);
      return { success: false, message: countErr.message };
    }

    if (count && count > 0) {
      return { success: true, message: 'Database already contains data, skipping seed.' };
    }

    // 1. Seed Staff
    const staffPayload = INITIAL_STAFF.map(s => ({
      id: toDeterministicUUID('stf', s.id),
      name: s.name,
      role: s.role,
      role_title: s.roleTitle || null,
      email: s.email || null,
      active: s.active,
    }));
    await client.from('staff').upsert(staffPayload);

    // 2. Seed Suppliers
    const suppliersPayload = INITIAL_SUPPLIERS.map(sup => ({
      id: toDeterministicUUID('sup', sup.id),
      name: sup.name,
      contact: sup.contact || null,
      notes: sup.notes || null,
    }));
    await client.from('suppliers').upsert(suppliersPayload);

    // 3. Seed Ingredients
    const ingredientsPayload = INITIAL_INGREDIENTS.map(ing => ({
      id: toDeterministicUUID('ing', ing.id),
      name: ing.name,
      unit: ing.unit,
      category: ing.category,
      cost_per_unit: ing.cost_per_unit,
      current_stock: ing.current_stock,
      min_alert_threshold: ing.min_alert_threshold || null,
      location: ing.location || null,
    }));
    await client.from('ingredients').upsert(ingredientsPayload);

    // 4. Seed Menu Items
    const menuItemsPayload = INITIAL_MENU_ITEMS.map(m => ({
      id: toDeterministicUUID('menu', m.id),
      name: m.name,
      pos_reference: m.pos_reference,
      category: m.category || null,
      selling_price: m.selling_price || 0,
    }));
    await client.from('menu_items').upsert(menuItemsPayload);

    // 5. Seed Recipe Ingredients
    const recipePayload = INITIAL_RECIPE_INGREDIENTS.map(r => ({
      id: toDeterministicUUID('rec', r.id),
      menu_item_id: toDeterministicUUID('menu', r.menu_item_id),
      ingredient_id: toDeterministicUUID('ing', r.ingredient_id),
      quantity_per_unit: r.quantity_per_unit,
    }));
    await client.from('recipe_ingredients').upsert(recipePayload);

    // 6. Seed Deliveries
    const deliveriesPayload = INITIAL_DELIVERIES.map(d => ({
      id: toDeterministicUUID('del', d.id),
      ingredient_id: toDeterministicUUID('ing', d.ingredient_id),
      supplier_id: toDeterministicUUID('sup', d.supplier_id),
      quantity: d.quantity,
      unit_cost: d.unit_cost,
      date: d.date,
      received_by: d.received_by,
      notes: d.notes || null,
    }));
    await client.from('deliveries').upsert(deliveriesPayload);

    // 7. Seed Stock Counts
    const countsPayload = INITIAL_STOCK_COUNTS.map(c => ({
      id: toDeterministicUUID('cnt', c.id),
      ingredient_id: toDeterministicUUID('ing', c.ingredient_id),
      counted_quantity: c.counted_quantity,
      date: c.date,
      shift: c.shift,
      counted_by: c.counted_by,
      photo_url: c.photo_url || null,
      notes: c.notes || null,
    }));
    await client.from('stock_counts').upsert(countsPayload);

    // 8. Seed Sales
    const salesPayload = INITIAL_SALES.map(s => ({
      id: toDeterministicUUID('sal', s.id),
      menu_item_id: toDeterministicUUID('menu', s.menu_item_id),
      quantity_sold: s.quantity_sold,
      date: s.date,
      source: s.source,
    }));
    await client.from('sales').upsert(salesPayload);

    // 9. Seed Access Logs
    const accessLogsPayload = INITIAL_ACCESS_LOGS.map(a => ({
      id: toDeterministicUUID('acc', a.id),
      staff_id: toDeterministicUUID('stf', a.staff_id),
      staff_name: a.staff_name || null,
      location: a.location,
      timestamp_in: a.timestamp_in,
      timestamp_out: a.timestamp_out || null,
      action: a.action || 'entry',
      notes: a.notes || null,
    }));
    await client.from('access_logs').upsert(accessLogsPayload);

    // 10. Seed Pos Voids
    const posVoidsPayload = INITIAL_POS_VOIDS.map(pv => ({
      id: toDeterministicUUID('pvd', pv.id),
      menu_item_id: toDeterministicUUID('menu', pv.menu_item_id),
      staff_id: toDeterministicUUID('stf', pv.staff_id),
      staff_name: pv.staff_name || null,
      item_name: pv.item_name || null,
      type: pv.type,
      amount: pv.amount,
      date: pv.date,
      reason: pv.reason || null,
    }));
    await client.from('pos_voids').upsert(posVoidsPayload);

    return { success: true, message: 'Initial La Grotte records successfully seeded into Supabase.' };
  } catch (err: unknown) {
    console.error('Error during Supabase seed:', err);
    return { success: false, message: getErrorMessage(err, 'Seeding failed.') };
  }
}
