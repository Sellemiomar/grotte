export type UnitType = 'kg' | 'g' | 'L' | 'mL' | 'unit/piece' | 'piece';

export type CategoryType = 
  | 'meat' 
  | 'dairy' 
  | 'beverage' 
  | 'produce' 
  | 'alcohol' 
  | 'other'
  | 'dry goods' 
  | 'seafood' 
  | 'bakery';

export type StaffRole = 'owner' | 'stock_manager' | 'cook' | 'server';

export interface Staff {
  id: string;
  user_id?: string; // Foreign key referencing Supabase auth.users(id)
  name: string;
  role: StaffRole;
  roleTitle?: string; // friendly display title e.g. "Chef de Cuisine"
  email?: string;
  active: boolean;
}

export interface Ingredient {
  id: string;
  name: string;
  unit: UnitType;
  category: CategoryType;
  cost_per_unit: number; // latest known cost in DT (Dinar Tunisien)
  current_stock: number; // running quantity
  min_alert_threshold?: number;
  location?: string; // e.g. "Chambre Froide Viandes", "Cave Bar", "Réserve Sèche"
  barcode?: string; // Barcode or QR code value (e.g. EAN-13, SKU, or custom identifier)
}

export interface Supplier {
  id: string;
  name: string;
  contact?: string;
  notes?: string;
}

export interface Delivery {
  id: string;
  ingredient_id: string;
  supplier_id: string;
  quantity: number;
  unit_cost: number;
  date: string; // YYYY-MM-DD
  received_by: string; // FK → staff (who signed for the delivery to prevent short shipment skimming)
  notes?: string;
}

export interface StockCount {
  id: string;
  ingredient_id: string;
  counted_quantity: number;
  date: string; // YYYY-MM-DD or ISO
  shift: 'morning' | 'evening'; // shift-level counts narrow down when a loss happened
  counted_by: string; // FK → staff (ties every number to a person)
  photo_url?: string; // optional phone photo of the shelf/fridge, timestamped
  notes?: string;
}

export type WasteReason = 'spoilage' | 'spillage' | 'breakage' | 'staff_meal' | 'comp' | 'other';

export interface WasteLog {
  id: string;
  ingredient_id: string;
  quantity: number;
  unit_cost_at_time: number;
  reason: WasteReason;
  logged_by: string; // FK or name of staff member
  date: string; // YYYY-MM-DD
  shift: 'morning' | 'evening';
  notes?: string;
  created_at?: string;
}

export type PurchaseOrderStatus = 'draft' | 'sent' | 'received';

export interface PurchaseOrder {
  id: string;
  supplier_id: string;
  status: PurchaseOrderStatus;
  created_by: string;
  created_at: string;
  sent_at?: string | null;
  received_at?: string | null;
  notes?: string | null;
}

export interface PurchaseOrderItem {
  id: string;
  purchase_order_id: string;
  ingredient_id: string;
  suggested_quantity: number;
  unit_cost: number;
  notes?: string | null;
}

export interface MenuItem {
  id: string;
  name: string;
  pos_reference: string;
  category?: string;
  selling_price?: number;
}

export interface RecipeIngredient {
  id: string;
  menu_item_id: string;
  ingredient_id: string;
  quantity_per_unit: number; // in the ingredient's unit
}

export interface Sale {
  id: string;
  menu_item_id: string;
  quantity_sold: number;
  date: string; // YYYY-MM-DD
  source: string; // e.g. "POS export 2026-09-07"
}

export interface AccessLog {
  id: string;
  staff_id: string;
  staff_name?: string;
  location: string; // "Chambre Froide Viandes", "Cave du Bar", "Chambre Froide Pizzeria", etc.
  timestamp_in: string; // ISO string
  timestamp_out?: string; // ISO string
  timestamp?: string; // formatted timestamp e.g. "YYYY-MM-DD HH:mm:ss"
  action?: 'entry' | 'exit';
  notes?: string;
}

export type PosVoidType = 'void' | 'discount' | 'comp';

export interface PosVoid {
  id: string;
  menu_item_id: string;
  staff_id: string;
  staff_name?: string;
  item_name?: string;
  type: PosVoidType;
  amount: number;
  date: string; // ISO string
  timestamp?: string; // formatted timestamp e.g. "YYYY-MM-DD HH:mm:ss"
  reason?: string;
}

export interface IngredientVarianceReport {
  ingredient: Ingredient;
  opening_stock: number;
  deliveries_in_period: number;
  closing_stock: number;
  actual_usage: number;
  theoretical_usage: number;
  variance_quantity: number; // actual_usage - theoretical_usage
  variance_cost: number; // variance_quantity * cost_per_unit
  known_waste_cost: number; // sum of logged waste costs during the period
  unexplained_variance_cost: number; // variance_cost - known_waste_cost (actionable metric)
  variance_percentage: number; // (variance_quantity / theoretical_usage) * 100
  status: 'normal' | 'moderate_loss' | 'critical_loss' | 'under_usage';
}

export interface CategoryVarianceSummary {
  category: CategoryType;
  total_theoretical_cost: number;
  total_actual_cost: number;
  total_variance_cost: number;
  total_known_waste_cost?: number;
  total_unexplained_variance_cost?: number;
  items_count: number;
  high_loss_items: number;
}

export interface LossCorrelationReport {
  ingredientId: string;
  ingredientName: string;
  category: CategoryType;
  varianceCost: number;
  varianceQuantity: number;
  unit: UnitType;
  location: string;
  severity: 'critical' | 'moderate' | 'low';
  theoretical_usage: number;
  actual_usage: number;
  missing_quantity: number;
  variance_percentage: number;
  financial_loss: number;
  suspected_vectors: string[];
  suspected_loss_vectors: string[];
  shifts_analysis: Array<{
    date: string;
    shift: 'morning' | 'evening';
    staff: string;
    quantity: number;
    delta: number;
  }>;
  correlated_pos_voids: PosVoid[];
  correlated_access_logs: AccessLog[];
  suspiciousShifts: Array<{
    date: string;
    shift: 'morning' | 'evening';
    counted_by: string;
    quantity: number;
  }>;
  staffWithAccess: Array<{
    staff: Staff;
    entriesCount: number;
    lastEntry: string;
  }>;
  relatedVoids: Array<{
    voidItem: PosVoid;
    menuItemName: string;
    staffName: string;
  }>;
  totalVoidLoss: number;
  correlationSummary: string;
  suspectedLeakVectors: string[];
}

