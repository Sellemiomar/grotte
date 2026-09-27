import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import {
  Ingredient,
  Supplier,
  Delivery,
  StockCount,
  MenuItem,
  RecipeIngredient,
  Sale,
  Staff,
  StaffRole,
  AccessLog,
  PosVoid,
  LossCorrelationReport,
  IngredientVarianceReport,
  CategoryVarianceSummary,
  WasteLog,
  PurchaseOrder,
  PurchaseOrderItem,
} from '../types';
import {
  INITIAL_INGREDIENTS,
  INITIAL_SUPPLIERS,
  INITIAL_DELIVERIES,
  INITIAL_STOCK_COUNTS,
  INITIAL_MENU_ITEMS,
  INITIAL_RECIPE_INGREDIENTS,
  INITIAL_SALES,
  INITIAL_STAFF,
  INITIAL_ACCESS_LOGS,
  INITIAL_POS_VOIDS,
  INITIAL_WASTE_LOGS,
} from '../data/seedData';
import { 
  generateVarianceReport, 
  summarizeByCategory, 
  correlateLossForIngredient 
} from '../utils/calculations';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Database } from '../lib/database.types';
import { seedSupabaseIfEmpty } from '../lib/supabaseSeeder';
import { getErrorMessage } from '../utils/errors';

export interface ToastInfo {
  type: 'success' | 'error' | 'info';
  text: string;
}

interface StockContextType {
  ingredients: Ingredient[];
  suppliers: Supplier[];
  deliveries: Delivery[];
  stockCounts: StockCount[];
  menuItems: MenuItem[];
  recipes: RecipeIngredient[];
  sales: Sale[];
  staff: Staff[];
  accessLogs: AccessLog[];
  posVoids: PosVoid[];
  purchaseOrders: PurchaseOrder[];
  orderItems: PurchaseOrderItem[];
  setPurchaseOrders: React.Dispatch<React.SetStateAction<PurchaseOrder[]>>;
  setOrderItems: React.Dispatch<React.SetStateAction<PurchaseOrderItem[]>>;
  fetchPurchaseOrders: () => Promise<void>;

  selectedPeriod: { startDate: string; endDate: string; label: string };
  setSelectedPeriod: (period: { startDate: string; endDate: string; label: string }) => void;

  // Thresholds for same-day alerting
  alertThresholdPercent: number;
  setAlertThresholdPercent: (val: number) => void;
  alertThresholdCost: number;
  setAlertThresholdCost: (val: number) => void;

  // Backend state & Toast
  isLoading: boolean;
  isSyncing: boolean;
  error: string | null;
  isError: boolean;
  isSupabaseConnected: boolean;
  toastMessage: ToastInfo | null;
  clearToast: () => void;
  showToast: (text: string, type?: 'success' | 'error' | 'info') => void;

  // Actions
  addIngredient: (data: Omit<Ingredient, 'id'>) => Promise<void>;
  updateIngredient: (id: string, updates: Partial<Ingredient>) => Promise<void>;
  deleteIngredient: (id: string) => Promise<void>;
  assignBarcodeToIngredient: (ingredientId: string, barcode: string) => Promise<void>;
  findIngredientByBarcode: (code: string) => Ingredient | undefined;

  addSupplier: (data: Omit<Supplier, 'id'>) => Promise<void>;

  addDelivery: (data: Omit<Delivery, 'id'>) => Promise<void>;
  deleteDelivery: (id: string) => Promise<void>;

  recordStockCount: (data: Omit<StockCount, 'id'>) => Promise<void>;
  recordBatchStockCounts: (counts: Array<{ 
    ingredient_id: string; 
    counted_quantity: number; 
    counted_by: string; 
    date: string;
    shift?: 'morning' | 'evening';
    photo_url?: string;
  }>) => Promise<void>;

  addMenuItem: (data: Omit<MenuItem, 'id'>) => Promise<void>;
  updateMenuItem: (id: string, updates: Partial<MenuItem>) => Promise<void>;
  deleteMenuItem: (id: string) => Promise<void>;

  addRecipeIngredient: (data: Omit<RecipeIngredient, 'id'>) => Promise<void>;
  deleteRecipeIngredient: (id: string) => Promise<void>;

  addSale: (data: Omit<Sale, 'id'>) => Promise<void>;
  importSales: (newSales: Array<Omit<Sale, 'id'>>) => Promise<void>;
  deleteSale: (id: string) => Promise<void>;

  addStaff: (data: Omit<Staff, 'id'>) => Promise<void>;
  updateStaff: (id: string, updates: Partial<Staff>) => Promise<void>;
  deleteStaff: (id: string) => Promise<void>;
  signUpStaff: (data: { email: string; password?: string; name: string; role: StaffRole; roleTitle?: string }) => Promise<boolean>;

  // Auth / Role switcher
  isAuthChecking: boolean;
  currentUser: Staff | null;
  setCurrentUser: (staff: Staff | null) => void;
  login: (email: string, password?: string) => Promise<boolean> | boolean;
  logout: () => void | Promise<void>;
  switchStaffRole: (role: StaffRole) => void;

  addAccessLog: (data: Omit<AccessLog, 'id'>) => Promise<void>;
  updateAccessLog: (id: string, updates: Partial<AccessLog>) => Promise<void>;
  checkOutAccessLog: (id: string, notes?: string) => Promise<void>;
  deleteAccessLog: (id: string) => Promise<void>;

  addPosVoid: (data: Omit<PosVoid, 'id'>) => Promise<void>;
  deletePosVoid: (id: string) => Promise<void>;

  // Waste logs (Pertes & Déclarations de coulages connus)
  wasteLogs: WasteLog[];
  addWasteLog: (data: Omit<WasteLog, 'id'>) => Promise<WasteLog>;
  deleteWasteLog: (id: string) => Promise<void>;
  isWasteTableAvailable: boolean;
  syncWasteLogsToSupabase: () => Promise<boolean>;
  isSupabaseAuthActive: boolean;

  // Real-time stock level update & variance metrics recalculation triggers
  updateStockOnWaste: (ingredientId: string, quantityLost: number) => Promise<Ingredient | null>;
  recalculateVarianceMetrics: () => void;
  lastVarianceRecalculatedAt: string;

  getLossCorrelation: (ingredientId: string) => LossCorrelationReport;

  resetToDemoData: () => void;
  exportDataJSON: () => string;
  importDataJSON: (jsonStr: string) => boolean;

  // Computed
  varianceReports: IngredientVarianceReport[];
  categorySummaries: CategoryVarianceSummary[];
  flaggedAlertItems: IngredientVarianceReport[];
  totalVarianceCost: number;
  totalLossCost: number;
  totalKnownWasteCost: number;
  totalUnexplainedVarianceCost: number;
  totalTheoreticalCost: number;
  totalActualCost: number;
  lowStockItemsCount: number;
}

const StockContext = createContext<StockContextType | undefined>(undefined);

const STORAGE_KEYS = {
  INGREDIENTS: 'lagrotte_ingredients_v2',
  SUPPLIERS: 'lagrotte_suppliers_v2',
  DELIVERIES: 'lagrotte_deliveries_v2',
  STOCK_COUNTS: 'lagrotte_stock_counts_v2',
  MENU_ITEMS: 'lagrotte_menu_items_v2',
  RECIPES: 'lagrotte_recipes_v2',
  SALES: 'lagrotte_sales_v2',
  STAFF: 'lagrotte_staff_v2',
  ACCESS_LOGS: 'lagrotte_access_logs_v2',
  POS_VOIDS: 'lagrotte_pos_voids_v2',
  WASTE_LOGS: 'lagrotte_waste_logs_v2',
  PURCHASE_ORDERS: 'lagrotte_purchase_orders_v1',
  PURCHASE_ORDER_ITEMS: 'lagrotte_purchase_order_items_v1',
};

// UUID helper conforming to RFC4122
const generateUUID = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
};

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const saved = localStorage.getItem(key);
    if (saved) return JSON.parse(saved);
  } catch (e) {
    console.error(`Error loading key ${key}:`, e);
  }
  return fallback;
}

export const StockProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isSupabase = isSupabaseConfigured();

  const [isLoading, setIsLoading] = useState<boolean>(isSupabase);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<ToastInfo | null>(null);

  const [ingredients, setIngredients] = useState<Ingredient[]>(() =>
    loadFromStorage(STORAGE_KEYS.INGREDIENTS, INITIAL_INGREDIENTS)
  );
  const [suppliers, setSuppliers] = useState<Supplier[]>(() =>
    loadFromStorage(STORAGE_KEYS.SUPPLIERS, INITIAL_SUPPLIERS)
  );
  const [deliveries, setDeliveries] = useState<Delivery[]>(() =>
    loadFromStorage(STORAGE_KEYS.DELIVERIES, INITIAL_DELIVERIES)
  );
  const [stockCounts, setStockCounts] = useState<StockCount[]>(() =>
    loadFromStorage(STORAGE_KEYS.STOCK_COUNTS, INITIAL_STOCK_COUNTS)
  );
  const [menuItems, setMenuItems] = useState<MenuItem[]>(() =>
    loadFromStorage(STORAGE_KEYS.MENU_ITEMS, INITIAL_MENU_ITEMS)
  );
  const [recipes, setRecipes] = useState<RecipeIngredient[]>(() =>
    loadFromStorage(STORAGE_KEYS.RECIPES, INITIAL_RECIPE_INGREDIENTS)
  );
  const [sales, setSales] = useState<Sale[]>(() =>
    loadFromStorage(STORAGE_KEYS.SALES, INITIAL_SALES)
  );
  const [staff, setStaff] = useState<Staff[]>(() =>
    loadFromStorage(STORAGE_KEYS.STAFF, INITIAL_STAFF)
  );

  const [currentUser, setCurrentUser] = useState<Staff | null>(() => {
    const saved = loadFromStorage<Staff | null>('lagrotte_current_user_v2', null);
    if (saved && saved.id) return saved;
    return null;
  });
  const [isAuthChecking, setIsAuthChecking] = useState<boolean>(true);

  const [accessLogs, setAccessLogs] = useState<AccessLog[]>(() =>
    loadFromStorage(STORAGE_KEYS.ACCESS_LOGS, INITIAL_ACCESS_LOGS)
  );
  const [posVoids, setPosVoids] = useState<PosVoid[]>(() =>
    loadFromStorage(STORAGE_KEYS.POS_VOIDS, INITIAL_POS_VOIDS)
  );
  const [wasteLogs, setWasteLogs] = useState<WasteLog[]>(() =>
    loadFromStorage(STORAGE_KEYS.WASTE_LOGS, INITIAL_WASTE_LOGS)
  );
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>(() =>
    loadFromStorage(STORAGE_KEYS.PURCHASE_ORDERS, [])
  );
  const [orderItems, setOrderItems] = useState<PurchaseOrderItem[]>(() =>
    loadFromStorage(STORAGE_KEYS.PURCHASE_ORDER_ITEMS, [])
  );
  const [isWasteTableAvailable, setIsWasteTableAvailable] = useState<boolean>(true);
  const [isSupabaseAuthActive, setIsSupabaseAuthActive] = useState<boolean>(false);

  // Real-time variance recalculation state & trigger
  const [varianceVersion, setVarianceVersion] = useState<number>(0);
  const [lastVarianceRecalculatedAt, setLastVarianceRecalculatedAt] = useState<string>(() => new Date().toISOString());

  const recalculateVarianceMetrics = useCallback(() => {
    setVarianceVersion(v => v + 1);
    setLastVarianceRecalculatedAt(new Date().toISOString());
  }, []);

  const [alertThresholdPercent, setAlertThresholdPercent] = useState<number>(5);
  const [alertThresholdCost, setAlertThresholdCost] = useState<number>(15);

  const [selectedPeriod, setSelectedPeriod] = useState({
    startDate: '2026-09-01',
    endDate: '2026-09-07',
    label: 'Semaine en cours (1 au 7 Sept 2026)',
  });

  const showToast = useCallback((text: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToastMessage({ text, type });
  }, []);

  const clearToast = useCallback(() => {
    setToastMessage(null);
  }, []);

  // Fetch all tables from Supabase on mount
  const fetchAllFromSupabase = useCallback(async () => {
    if (!supabase) return;

    try {
      setIsLoading(true);
      setError(null);

      // Verify and seed if empty
      await seedSupabaseIfEmpty();

      const [
        staffRes,
        ingRes,
        supRes,
        delRes,
        cntRes,
        menuRes,
        recRes,
        saleRes,
        accRes,
        pvdRes,
        wasteRes,
      ] = await Promise.all([
        supabase.from('staff').select('*'),
        supabase.from('ingredients').select('*'),
        supabase.from('suppliers').select('*'),
        supabase.from('deliveries').select('*').order('date', { ascending: false }),
        supabase.from('stock_counts').select('*').order('date', { ascending: false }),
        supabase.from('menu_items').select('*'),
        supabase.from('recipe_ingredients').select('*'),
        supabase.from('sales').select('*'),
        supabase.from('access_logs').select('*').order('timestamp_in', { ascending: false }),
        supabase.from('pos_voids').select('*').order('date', { ascending: false }),
        supabase.from('waste_logs').select('*').order('date', { ascending: false }),
      ]);

      // Handle critical errors gracefully without crashing the UI
      if (ingRes?.error) {
        console.warn('Supabase ingredients fetch warning:', ingRes.error.message);
      }

      if (ingRes && !ingRes.error && Array.isArray(ingRes.data) && ingRes.data.length > 0) {
        setIngredients(ingRes.data.map(i => ({
          id: i.id,
          name: i.name,
          unit: i.unit as any,
          category: i.category as any,
          cost_per_unit: Number(i.cost_per_unit),
          current_stock: Number(i.current_stock),
          min_alert_threshold: i.min_alert_threshold ? Number(i.min_alert_threshold) : undefined,
          location: i.location || undefined,
          barcode: (i as any).barcode || undefined,
        })));
      }

      if (supRes && !supRes.error && Array.isArray(supRes.data) && supRes.data.length > 0) {
        setSuppliers(supRes.data.map(s => ({
          id: s.id,
          name: s.name,
          contact: s.contact || undefined,
          notes: s.notes || undefined,
        })));
      }

      if (delRes && !delRes.error && Array.isArray(delRes.data) && delRes.data.length > 0) {
        setDeliveries(delRes.data.map(d => ({
          id: d.id,
          ingredient_id: d.ingredient_id,
          supplier_id: d.supplier_id,
          quantity: Number(d.quantity),
          unit_cost: Number(d.unit_cost),
          date: d.date,
          received_by: d.received_by,
          notes: d.notes || undefined,
        })));
      }

      if (cntRes && !cntRes.error && Array.isArray(cntRes.data) && cntRes.data.length > 0) {
        setStockCounts(cntRes.data.map(c => ({
          id: c.id,
          ingredient_id: c.ingredient_id,
          counted_quantity: Number(c.counted_quantity),
          date: c.date,
          shift: c.shift as any,
          counted_by: c.counted_by,
          photo_url: c.photo_url || undefined,
          notes: c.notes || undefined,
        })));
      }

      if (menuRes && !menuRes.error && Array.isArray(menuRes.data) && menuRes.data.length > 0) {
        setMenuItems(menuRes.data.map(m => ({
          id: m.id,
          name: m.name,
          pos_reference: m.pos_reference,
          category: m.category || undefined,
          selling_price: Number(m.selling_price),
        })));
      }

      if (recRes && !recRes.error && Array.isArray(recRes.data) && recRes.data.length > 0) {
        setRecipes(recRes.data.map(r => ({
          id: r.id,
          menu_item_id: r.menu_item_id,
          ingredient_id: r.ingredient_id,
          quantity_per_unit: Number(r.quantity_per_unit),
        })));
      }

      if (saleRes && !saleRes.error && Array.isArray(saleRes.data) && saleRes.data.length > 0) {
        setSales(saleRes.data.map(s => ({
          id: s.id,
          menu_item_id: s.menu_item_id,
          quantity_sold: Number(s.quantity_sold),
          date: s.date,
          source: s.source,
        })));
      }

      if (staffRes && !staffRes.error && Array.isArray(staffRes.data) && staffRes.data.length > 0) {
        const mappedStaff: Staff[] = staffRes.data.map(st => ({
          id: st.id,
          name: st.name,
          role: st.role as StaffRole,
          roleTitle: st.role_title || undefined,
          email: st.email || undefined,
          active: st.active,
        }));
        setStaff(mappedStaff);
        setCurrentUser(prev => prev ? (mappedStaff.find(s => s.id === prev.id) || mappedStaff[0]) : mappedStaff[0]);
      }

      if (accRes && !accRes.error && Array.isArray(accRes.data) && accRes.data.length > 0) {
        setAccessLogs(accRes.data.map(a => ({
          id: a.id,
          staff_id: a.staff_id,
          staff_name: a.staff_name || undefined,
          location: a.location,
          timestamp_in: a.timestamp_in,
          timestamp_out: a.timestamp_out || undefined,
          action: (a.action as any) || 'entry',
          notes: a.notes || undefined,
        })));
      }

      if (pvdRes && !pvdRes.error && Array.isArray(pvdRes.data) && pvdRes.data.length > 0) {
        setPosVoids(pvdRes.data.map(pv => ({
          id: pv.id,
          menu_item_id: pv.menu_item_id,
          staff_id: pv.staff_id,
          staff_name: pv.staff_name || undefined,
          item_name: pv.item_name || undefined,
          type: pv.type as any,
          amount: Number(pv.amount),
          date: pv.date,
          reason: pv.reason || undefined,
        })));
      }

      if (wasteRes && !wasteRes.error && Array.isArray(wasteRes.data)) {
        setIsWasteTableAvailable(true);
        if (wasteRes.data.length > 0) {
          setWasteLogs(wasteRes.data.map(w => ({
            id: w.id,
            ingredient_id: w.ingredient_id,
            quantity: Number(w.quantity),
            unit_cost_at_time: Number(w.unit_cost_at_time),
            reason: w.reason as any,
            logged_by: w.logged_by,
            date: w.date,
            shift: w.shift as any,
            notes: w.notes || undefined,
            created_at: w.created_at,
          })));
        }
      } else if (wasteRes?.error) {
        console.warn('Optional waste_logs table query note:', wasteRes.error.message);
        const isTableMissing =
          wasteRes.error.code === 'PGRST205' ||
          wasteRes.error.message?.includes('schema cache') ||
          wasteRes.error.message?.includes('relation "waste_logs" does not exist') ||
          wasteRes.error.message?.includes('relation "public.waste_logs" does not exist');

        if (isTableMissing) {
          setIsWasteTableAvailable(false);
        } else {
          // If error is 42501 (RLS restriction) or other, table exists in PostgreSQL
          setIsWasteTableAvailable(true);
        }
      }

      // 12 & 13. PURCHASE ORDERS & ITEMS
      try {
        const [poRes, poiRes] = await Promise.all([
          supabase.from('purchase_orders').select('*').order('created_at', { ascending: false }),
          supabase.from('purchase_order_items').select('*')
        ]);
        if (poRes?.data && Array.isArray(poRes.data) && poRes.data.length > 0) {
          setPurchaseOrders(poRes.data as PurchaseOrder[]);
        }
        if (poiRes?.data && Array.isArray(poiRes.data) && poiRes.data.length > 0) {
          setOrderItems(poiRes.data.map((it: any) => ({
            id: it.id,
            purchase_order_id: it.purchase_order_id,
            ingredient_id: it.ingredient_id,
            suggested_quantity: Number(it.suggested_quantity),
            unit_cost: Number(it.unit_cost),
            notes: it.notes || undefined,
          })));
        }
      } catch (poErr) {
        // Silently skip if table is awaiting migration script
      }

      setError(null);
      const isRemoteEmpty = (ingRes?.data?.length ?? 0) === 0 && (menuRes?.data?.length ?? 0) === 0;
      if (isRemoteEmpty) {
        showToast('Base Supabase connectée (vide — données de démonstration préservées)', 'info');
      } else {
        showToast('Synchronisé avec le backend Supabase (PostgreSQL)', 'success');
      }
    } catch (err: unknown) {
      console.error('Supabase fetch failed:', err);
      setError(getErrorMessage(err, 'Erreur de connexion Supabase'));
      showToast(`Erreur réseau Supabase: ${getErrorMessage(err)}`, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  const fetchPurchaseOrders = useCallback(async () => {
    if (!supabase) return;
    try {
      const [poRes, poiRes] = await Promise.all([
        supabase.from('purchase_orders').select('*').order('created_at', { ascending: false }),
        supabase.from('purchase_order_items').select('*')
      ]);

      if (poRes?.data && Array.isArray(poRes.data) && poRes.data.length > 0) {
        setPurchaseOrders(poRes.data as PurchaseOrder[]);
      }
      if (poiRes?.data && Array.isArray(poiRes.data) && poiRes.data.length > 0) {
        setOrderItems(poiRes.data.map((it: any) => ({
          id: it.id,
          purchase_order_id: it.purchase_order_id,
          ingredient_id: it.ingredient_id,
          suggested_quantity: Number(it.suggested_quantity),
          unit_cost: Number(it.unit_cost),
          notes: it.notes || undefined,
        })));
      }
    } catch (err) {
      console.warn('Purchase orders fetch skipped / schema note:', err);
    }
  }, []);

  // Initial load & Scoped Realtime Subscriptions for all 13 tables
  useEffect(() => {
    if (!isSupabase) return;

    fetchAllFromSupabase();

    if (!supabase) return;

    // Granular channel for incremental table updates without triggering global reloads
    const realtimeChannel = supabase
      .channel('lagrotte-scoped-realtime')
      // 1. INGREDIENTS (INSERT, UPDATE, DELETE)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'ingredients' },
        (payload) => {
          if (payload.eventType === 'INSERT' && payload.new) {
            const raw = payload.new as Database['public']['Tables']['ingredients']['Row'];
            setIngredients(prev => {
              if (prev.some(i => i.id === raw.id)) return prev;
              const mapped: Ingredient = {
                id: raw.id,
                name: raw.name,
                unit: raw.unit as any,
                category: raw.category as any,
                cost_per_unit: Number(raw.cost_per_unit),
                current_stock: Number(raw.current_stock),
                min_alert_threshold: raw.min_alert_threshold ? Number(raw.min_alert_threshold) : undefined,
                location: raw.location || undefined,
                barcode: (raw as any).barcode || undefined,
              };
              return [mapped, ...prev];
            });
          } else if (payload.eventType === 'UPDATE' && payload.new) {
            const raw = payload.new as Database['public']['Tables']['ingredients']['Row'];
            setIngredients(prev =>
              prev.map(item =>
                item.id === raw.id
                  ? {
                      ...item,
                      name: raw.name,
                      unit: raw.unit as any,
                      category: raw.category as any,
                      cost_per_unit: Number(raw.cost_per_unit),
                      current_stock: Number(raw.current_stock),
                      min_alert_threshold: raw.min_alert_threshold ? Number(raw.min_alert_threshold) : undefined,
                      location: raw.location || undefined,
                      barcode: (raw as any).barcode !== undefined ? (raw as any).barcode : item.barcode,
                    }
                  : item
              )
            );
          } else if (payload.eventType === 'DELETE' && payload.old) {
            const oldId = (payload.old as { id: string }).id;
            setIngredients(prev => prev.filter(item => item.id !== oldId));
          }
        }
      )
      // 2. DELIVERIES (INSERT, UPDATE, DELETE)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'deliveries' },
        (payload) => {
          if (payload.eventType === 'INSERT' && payload.new) {
            const raw = payload.new as Database['public']['Tables']['deliveries']['Row'];
            setDeliveries(prev => {
              if (prev.some(d => d.id === raw.id)) return prev;
              const mapped: Delivery = {
                id: raw.id,
                ingredient_id: raw.ingredient_id,
                supplier_id: raw.supplier_id,
                quantity: Number(raw.quantity),
                unit_cost: Number(raw.unit_cost),
                date: raw.date,
                received_by: raw.received_by,
                notes: raw.notes || undefined,
              };
              return [mapped, ...prev];
            });
          } else if (payload.eventType === 'UPDATE' && payload.new) {
            const raw = payload.new as Database['public']['Tables']['deliveries']['Row'];
            setDeliveries(prev =>
              prev.map(d =>
                d.id === raw.id
                  ? {
                      ...d,
                      ingredient_id: raw.ingredient_id,
                      supplier_id: raw.supplier_id,
                      quantity: Number(raw.quantity),
                      unit_cost: Number(raw.unit_cost),
                      date: raw.date,
                      received_by: raw.received_by,
                      notes: raw.notes || undefined,
                    }
                  : d
              )
            );
          } else if (payload.eventType === 'DELETE' && payload.old) {
            const oldId = (payload.old as { id: string }).id;
            setDeliveries(prev => prev.filter(d => d.id !== oldId));
          }
        }
      )
      // 3. STOCK COUNTS (INSERT, UPDATE, DELETE)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'stock_counts' },
        (payload) => {
          if (payload.eventType === 'INSERT' && payload.new) {
            const raw = payload.new as Database['public']['Tables']['stock_counts']['Row'];
            setStockCounts(prev => {
              if (prev.some(c => c.id === raw.id)) return prev;
              const mapped: StockCount = {
                id: raw.id,
                ingredient_id: raw.ingredient_id,
                counted_quantity: Number(raw.counted_quantity),
                date: raw.date,
                shift: raw.shift as any,
                counted_by: raw.counted_by,
                photo_url: raw.photo_url || undefined,
                notes: raw.notes || undefined,
              };
              return [mapped, ...prev];
            });
          } else if (payload.eventType === 'UPDATE' && payload.new) {
            const raw = payload.new as Database['public']['Tables']['stock_counts']['Row'];
            setStockCounts(prev =>
              prev.map(c =>
                c.id === raw.id
                  ? {
                      ...c,
                      ingredient_id: raw.ingredient_id,
                      counted_quantity: Number(raw.counted_quantity),
                      date: raw.date,
                      shift: raw.shift as any,
                      counted_by: raw.counted_by,
                      photo_url: raw.photo_url || undefined,
                      notes: raw.notes || undefined,
                    }
                  : c
              )
            );
          } else if (payload.eventType === 'DELETE' && payload.old) {
            const oldId = (payload.old as { id: string }).id;
            setStockCounts(prev => prev.filter(c => c.id !== oldId));
          }
        }
      )
      // 4. WASTE LOGS (INSERT, UPDATE, DELETE)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'waste_logs' },
        (payload) => {
          if (payload.eventType === 'INSERT' && payload.new) {
            const raw = payload.new as any;
            setWasteLogs(prev => {
              if (prev.some(w => w.id === raw.id)) return prev;
              const mapped: WasteLog = {
                id: raw.id,
                ingredient_id: raw.ingredient_id,
                quantity: Number(raw.quantity),
                unit_cost_at_time: Number(raw.unit_cost_at_time),
                reason: raw.reason,
                logged_by: raw.logged_by,
                date: raw.date,
                shift: raw.shift,
                notes: raw.notes || undefined,
                created_at: raw.created_at,
              };
              return [mapped, ...prev];
            });
          } else if (payload.eventType === 'UPDATE' && payload.new) {
            const raw = payload.new as any;
            setWasteLogs(prev =>
              prev.map(w =>
                w.id === raw.id
                  ? {
                      ...w,
                      ingredient_id: raw.ingredient_id,
                      quantity: Number(raw.quantity),
                      unit_cost_at_time: Number(raw.unit_cost_at_time),
                      reason: raw.reason,
                      logged_by: raw.logged_by,
                      date: raw.date,
                      shift: raw.shift,
                      notes: raw.notes || undefined,
                      created_at: raw.created_at,
                    }
                  : w
              )
            );
          } else if (payload.eventType === 'DELETE' && payload.old) {
            const oldId = (payload.old as { id: string }).id;
            setWasteLogs(prev => prev.filter(w => w.id !== oldId));
          }
        }
      )
      // 5. SUPPLIERS (INSERT, UPDATE, DELETE)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'suppliers' },
        (payload) => {
          if (payload.eventType === 'INSERT' && payload.new) {
            const raw = payload.new as Database['public']['Tables']['suppliers']['Row'];
            setSuppliers(prev => {
              if (prev.some(s => s.id === raw.id)) return prev;
              return [{ id: raw.id, name: raw.name, contact: raw.contact || undefined, notes: raw.notes || undefined }, ...prev];
            });
          } else if (payload.eventType === 'UPDATE' && payload.new) {
            const raw = payload.new as Database['public']['Tables']['suppliers']['Row'];
            setSuppliers(prev =>
              prev.map(s => (s.id === raw.id ? { ...s, name: raw.name, contact: raw.contact || undefined, notes: raw.notes || undefined } : s))
            );
          } else if (payload.eventType === 'DELETE' && payload.old) {
            const oldId = (payload.old as { id: string }).id;
            setSuppliers(prev => prev.filter(s => s.id !== oldId));
          }
        }
      )
      // 6. SALES (INSERT, UPDATE, DELETE)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sales' },
        (payload) => {
          if (payload.eventType === 'INSERT' && payload.new) {
            const raw = payload.new as Database['public']['Tables']['sales']['Row'];
            setSales(prev => {
              if (prev.some(s => s.id === raw.id)) return prev;
              return [{ id: raw.id, menu_item_id: raw.menu_item_id, quantity_sold: Number(raw.quantity_sold), date: raw.date, source: raw.source }, ...prev];
            });
          } else if (payload.eventType === 'UPDATE' && payload.new) {
            const raw = payload.new as Database['public']['Tables']['sales']['Row'];
            setSales(prev =>
              prev.map(s =>
                s.id === raw.id
                  ? {
                      ...s,
                      menu_item_id: raw.menu_item_id,
                      quantity_sold: Number(raw.quantity_sold),
                      date: raw.date,
                      source: raw.source,
                    }
                  : s
              )
            );
          } else if (payload.eventType === 'DELETE' && payload.old) {
            const oldId = (payload.old as { id: string }).id;
            setSales(prev => prev.filter(s => s.id !== oldId));
          }
        }
      )
      // 7. ACCESS LOGS (INSERT, UPDATE, DELETE)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'access_logs' },
        (payload) => {
          if (payload.eventType === 'INSERT' && payload.new) {
            const raw = payload.new as Database['public']['Tables']['access_logs']['Row'];
            setAccessLogs(prev => {
              if (prev.some(a => a.id === raw.id)) return prev;
              const mapped: AccessLog = {
                id: raw.id,
                staff_id: raw.staff_id,
                staff_name: raw.staff_name || undefined,
                location: raw.location,
                timestamp_in: raw.timestamp_in,
                timestamp_out: raw.timestamp_out || undefined,
                action: (raw.action as any) || 'entry',
                notes: raw.notes || undefined,
              };
              return [mapped, ...prev];
            });
          } else if (payload.eventType === 'UPDATE' && payload.new) {
            const raw = payload.new as Database['public']['Tables']['access_logs']['Row'];
            setAccessLogs(prev =>
              prev.map(a =>
                a.id === raw.id
                  ? {
                      ...a,
                      staff_id: raw.staff_id,
                      staff_name: raw.staff_name || undefined,
                      location: raw.location,
                      timestamp_in: raw.timestamp_in,
                      timestamp_out: raw.timestamp_out || undefined,
                      action: (raw.action as any) || 'entry',
                      notes: raw.notes || undefined,
                    }
                  : a
              )
            );
          } else if (payload.eventType === 'DELETE' && payload.old) {
            const oldId = (payload.old as { id: string }).id;
            setAccessLogs(prev => prev.filter(a => a.id !== oldId));
          }
        }
      )
      // 8. POS VOIDS (INSERT, UPDATE, DELETE)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'pos_voids' },
        (payload) => {
          if (payload.eventType === 'INSERT' && payload.new) {
            const raw = payload.new as Database['public']['Tables']['pos_voids']['Row'];
            setPosVoids(prev => {
              if (prev.some(p => p.id === raw.id)) return prev;
              const mapped: PosVoid = {
                id: raw.id,
                menu_item_id: raw.menu_item_id,
                staff_id: raw.staff_id,
                staff_name: raw.staff_name || undefined,
                item_name: raw.item_name || undefined,
                type: raw.type as any,
                amount: Number(raw.amount),
                date: raw.date,
                reason: raw.reason || undefined,
              };
              return [mapped, ...prev];
            });
          } else if (payload.eventType === 'UPDATE' && payload.new) {
            const raw = payload.new as Database['public']['Tables']['pos_voids']['Row'];
            setPosVoids(prev =>
              prev.map(p =>
                p.id === raw.id
                  ? {
                      ...p,
                      menu_item_id: raw.menu_item_id,
                      staff_id: raw.staff_id,
                      staff_name: raw.staff_name || undefined,
                      item_name: raw.item_name || undefined,
                      type: raw.type as any,
                      amount: Number(raw.amount),
                      date: raw.date,
                      reason: raw.reason || undefined,
                    }
                  : p
              )
            );
          } else if (payload.eventType === 'DELETE' && payload.old) {
            const oldId = (payload.old as { id: string }).id;
            setPosVoids(prev => prev.filter(p => p.id !== oldId));
          }
        }
      )
      // 9. MENU ITEMS (INSERT, UPDATE, DELETE)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'menu_items' },
        (payload) => {
          if (payload.eventType === 'INSERT' && payload.new) {
            const raw = payload.new as Database['public']['Tables']['menu_items']['Row'];
            setMenuItems(prev => {
              if (prev.some(m => m.id === raw.id)) return prev;
              const mapped: MenuItem = {
                id: raw.id,
                name: raw.name,
                pos_reference: raw.pos_reference || raw.name,
                category: raw.category || undefined,
                selling_price: raw.selling_price ? Number(raw.selling_price) : undefined,
              };
              return [mapped, ...prev];
            });
          } else if (payload.eventType === 'UPDATE' && payload.new) {
            const raw = payload.new as Database['public']['Tables']['menu_items']['Row'];
            setMenuItems(prev =>
              prev.map(m =>
                m.id === raw.id
                  ? {
                      ...m,
                      name: raw.name,
                      pos_reference: raw.pos_reference || raw.name,
                      category: raw.category || undefined,
                      selling_price: raw.selling_price ? Number(raw.selling_price) : undefined,
                    }
                  : m
              )
            );
          } else if (payload.eventType === 'DELETE' && payload.old) {
            const oldId = (payload.old as { id: string }).id;
            setMenuItems(prev => prev.filter(m => m.id !== oldId));
          }
        }
      )
      // 10. RECIPE INGREDIENTS (INSERT, UPDATE, DELETE)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'recipe_ingredients' },
        (payload) => {
          if (payload.eventType === 'INSERT' && payload.new) {
            const raw = payload.new as Database['public']['Tables']['recipe_ingredients']['Row'];
            setRecipes(prev => {
              if (prev.some(r => r.id === raw.id)) return prev;
              const mapped: RecipeIngredient = {
                id: raw.id,
                menu_item_id: raw.menu_item_id,
                ingredient_id: raw.ingredient_id,
                quantity_per_unit: Number(raw.quantity_per_unit),
              };
              return [mapped, ...prev];
            });
          } else if (payload.eventType === 'UPDATE' && payload.new) {
            const raw = payload.new as Database['public']['Tables']['recipe_ingredients']['Row'];
            setRecipes(prev =>
              prev.map(r =>
                r.id === raw.id
                  ? {
                      ...r,
                      menu_item_id: raw.menu_item_id,
                      ingredient_id: raw.ingredient_id,
                      quantity_per_unit: Number(raw.quantity_per_unit),
                    }
                  : r
              )
            );
          } else if (payload.eventType === 'DELETE' && payload.old) {
            const oldId = (payload.old as { id: string }).id;
            setRecipes(prev => prev.filter(r => r.id !== oldId));
          }
        }
      )
      // 11. STAFF (INSERT, UPDATE, DELETE)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'staff' },
        (payload) => {
          if (payload.eventType === 'INSERT' && payload.new) {
            const raw = payload.new as Database['public']['Tables']['staff']['Row'];
            setStaff(prev => {
              if (prev.some(s => s.id === raw.id)) return prev;
              const newMember: Staff = {
                id: raw.id,
                user_id: raw.user_id || undefined,
                name: raw.name,
                role: raw.role as StaffRole,
                roleTitle: raw.role_title || undefined,
                email: raw.email || undefined,
                active: raw.active,
              };
              return [newMember, ...prev];
            });
          } else if (payload.eventType === 'UPDATE' && payload.new) {
            const raw = payload.new as Database['public']['Tables']['staff']['Row'];
            setStaff(prev =>
              prev.map(s =>
                s.id === raw.id
                  ? {
                      ...s,
                      user_id: raw.user_id || undefined,
                      name: raw.name,
                      role: raw.role as StaffRole,
                      roleTitle: raw.role_title || undefined,
                      email: raw.email || undefined,
                      active: raw.active,
                    }
                  : s
              )
            );
            setCurrentUser(curr => {
              if (curr && curr.id === raw.id) {
                return {
                  ...curr,
                  user_id: raw.user_id || undefined,
                  name: raw.name,
                  role: raw.role as StaffRole,
                  roleTitle: raw.role_title || undefined,
                  email: raw.email || undefined,
                  active: raw.active,
                };
              }
              return curr;
            });
          } else if (payload.eventType === 'DELETE' && payload.old) {
            const oldId = (payload.old as { id: string }).id;
            setStaff(prev => prev.filter(s => s.id !== oldId));
          }
        }
      )
      // 12. PURCHASE ORDERS (INSERT, UPDATE, DELETE)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'purchase_orders' },
        (payload) => {
          if (payload.eventType === 'INSERT' && payload.new) {
            const newOrder = payload.new as PurchaseOrder;
            setPurchaseOrders(prev => {
              if (prev.some(o => o.id === newOrder.id)) return prev;
              return [newOrder, ...prev];
            });
          } else if (payload.eventType === 'UPDATE' && payload.new) {
            const updated = payload.new as PurchaseOrder;
            setPurchaseOrders(prev =>
              prev.map(o => (o.id === updated.id ? { ...o, ...updated } : o))
            );
          } else if (payload.eventType === 'DELETE' && payload.old) {
            const oldId = (payload.old as { id: string }).id;
            setPurchaseOrders(prev => prev.filter(o => o.id !== oldId));
          }
        }
      )
      // 13. PURCHASE ORDER ITEMS (INSERT, UPDATE, DELETE)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'purchase_order_items' },
        (payload) => {
          if (payload.eventType === 'INSERT' && payload.new) {
            const raw = payload.new as any;
            const newItem: PurchaseOrderItem = {
              id: raw.id,
              purchase_order_id: raw.purchase_order_id,
              ingredient_id: raw.ingredient_id,
              suggested_quantity: Number(raw.suggested_quantity),
              unit_cost: Number(raw.unit_cost),
              notes: raw.notes || undefined,
            };
            setOrderItems(prev => {
              if (prev.some(it => it.id === newItem.id)) return prev;
              return [newItem, ...prev];
            });
          } else if (payload.eventType === 'UPDATE' && payload.new) {
            const raw = payload.new as any;
            setOrderItems(prev =>
              prev.map(it =>
                it.id === raw.id
                  ? {
                      ...it,
                      purchase_order_id: raw.purchase_order_id,
                      ingredient_id: raw.ingredient_id,
                      suggested_quantity: Number(raw.suggested_quantity),
                      unit_cost: Number(raw.unit_cost),
                      notes: raw.notes || undefined,
                    }
                  : it
              )
            );
          } else if (payload.eventType === 'DELETE' && payload.old) {
            const oldId = (payload.old as { id: string }).id;
            setOrderItems(prev => prev.filter(it => it.id !== oldId));
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          // Scoped channel connected cleanly
        }
      });

    return () => {
      if (supabase) {
        supabase.removeChannel(realtimeChannel);
      }
    };
  }, [isSupabase, fetchAllFromSupabase]);

  // Sync to local storage as fallback / offline cache
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.INGREDIENTS, JSON.stringify(ingredients));
      localStorage.setItem(STORAGE_KEYS.SUPPLIERS, JSON.stringify(suppliers));
      localStorage.setItem(STORAGE_KEYS.DELIVERIES, JSON.stringify(deliveries));
      localStorage.setItem(STORAGE_KEYS.STOCK_COUNTS, JSON.stringify(stockCounts));
      localStorage.setItem(STORAGE_KEYS.MENU_ITEMS, JSON.stringify(menuItems));
      localStorage.setItem(STORAGE_KEYS.RECIPES, JSON.stringify(recipes));
      localStorage.setItem(STORAGE_KEYS.SALES, JSON.stringify(sales));
      localStorage.setItem(STORAGE_KEYS.STAFF, JSON.stringify(staff));
      localStorage.setItem(STORAGE_KEYS.ACCESS_LOGS, JSON.stringify(accessLogs));
      localStorage.setItem(STORAGE_KEYS.POS_VOIDS, JSON.stringify(posVoids));
      localStorage.setItem(STORAGE_KEYS.WASTE_LOGS, JSON.stringify(wasteLogs));
      localStorage.setItem(STORAGE_KEYS.PURCHASE_ORDERS, JSON.stringify(purchaseOrders));
      localStorage.setItem(STORAGE_KEYS.PURCHASE_ORDER_ITEMS, JSON.stringify(orderItems));
      if (currentUser) {
        localStorage.setItem('lagrotte_current_user_v2', JSON.stringify(currentUser));
      } else {
        localStorage.removeItem('lagrotte_current_user_v2');
      }
    } catch (e) {
      console.error('Local cache error:', e);
    }
  }, [
    ingredients,
    suppliers,
    deliveries,
    stockCounts,
    menuItems,
    recipes,
    sales,
    staff,
    currentUser,
    accessLogs,
    posVoids,
    wasteLogs,
    purchaseOrders,
    orderItems,
  ]);

  // Auto-dismiss toast
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => {
        setToastMessage(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // Listen to Supabase Auth state changes & restore session
  useEffect(() => {
    let isMounted = true;

    const checkSession = async () => {
      try {
        if (isSupabase && supabase) {
          const { data: { session }, error: sessionErr } = await supabase.auth.getSession();
          if (sessionErr) {
            console.warn('Supabase getSession error:', sessionErr);
          }
          if (isMounted) {
            setIsSupabaseAuthActive(Boolean(session?.user));
            if (session?.user) {
              const currentStaff = loadFromStorage<Staff[]>(STORAGE_KEYS.STAFF, INITIAL_STAFF);
              const found = currentStaff.find(
                s => s.user_id === session.user.id || s.email?.toLowerCase() === session.user.email?.toLowerCase()
              );
              if (found) {
                setCurrentUser(found);
              } else {
                const fallbackRole = (session.user.user_metadata?.role as StaffRole) || 'owner';
                const newStaffUser: Staff = {
                  id: session.user.id,
                  user_id: session.user.id,
                  name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'Utilisateur',
                  role: fallbackRole,
                  roleTitle: session.user.user_metadata?.role_title || (fallbackRole === 'owner' ? 'Propriétaire' : 'Collaborateur'),
                  email: session.user.email,
                  active: true,
                };
                setCurrentUser(newStaffUser);
              }
            } else {
              // No Supabase session
              const savedUser = loadFromStorage<Staff | null>('lagrotte_current_user_v2', null);
              if (!session) {
                setCurrentUser(null);
                localStorage.removeItem('lagrotte_current_user_v2');
              } else if (savedUser) {
                setCurrentUser(savedUser);
              }
            }
          }
        } else {
          // Local storage check
          const savedUser = loadFromStorage<Staff | null>('lagrotte_current_user_v2', null);
          if (isMounted) {
            setCurrentUser(savedUser && savedUser.id ? savedUser : null);
          }
        }
      } catch (err) {
        console.warn('Auth session check error:', err);
        if (isMounted) setCurrentUser(null);
      } finally {
        if (isMounted) {
          setIsAuthChecking(false);
        }
      }
    };

    checkSession();

    if (isSupabase && supabase) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setIsSupabaseAuthActive(Boolean(session?.user));
        if (session?.user) {
          setStaff(prevStaff => {
            const found = prevStaff.find(
              s => s.user_id === session.user.id || s.email?.toLowerCase() === session.user.email?.toLowerCase()
            );
            if (found) {
              setCurrentUser(found);
            }
            return prevStaff;
          });
        } else if (_event === 'SIGNED_OUT') {
          setCurrentUser(null);
          localStorage.removeItem('lagrotte_current_user_v2');
        }
      });

      return () => {
        isMounted = false;
        subscription.unsubscribe();
      };
    } else {
      return () => {
        isMounted = false;
      };
    }
  }, [isSupabase]);

  // RBAC Permission Checkers
  const canManageStock = (role?: StaffRole) => role === 'owner' || role === 'stock_manager';
  const isOwner = (role?: StaffRole) => role === 'owner';

  // Action methods with Supabase mutations and RBAC enforcement
  const addIngredient = async (data: Omit<Ingredient, 'id'>) => {
    if (currentUser && !canManageStock(currentUser.role)) {
      showToast("Accès refusé : Seuls le Propriétaire et le Responsable Stock peuvent ajouter des ingrédients.", "error");
      throw new Error("Action non autorisée.");
    }

    const id = generateUUID();
    const newIngredient: Ingredient = { ...data, id };
    setIngredients(prev => [newIngredient, ...prev]);

    if (isSupabase && supabase) {
      setIsSyncing(true);
      try {
        const { error: insErr } = await supabase.from('ingredients').insert({
          id,
          name: data.name,
          unit: data.unit,
          category: data.category,
          cost_per_unit: data.cost_per_unit,
          current_stock: data.current_stock,
          min_alert_threshold: data.min_alert_threshold ?? null,
          location: data.location ?? null,
        });
        if (insErr) throw insErr;
        showToast(`Ingrédient "${data.name}" enregistré sur Supabase`, 'success');
      } catch (err: unknown) {
        console.error('Supabase addIngredient error:', err);
        showToast(`Erreur Supabase: ${getErrorMessage(err)}`, 'error');
      } finally {
        setIsSyncing(false);
      }
    }
  };

  const updateIngredient = async (id: string, updates: Partial<Ingredient>) => {
    if (currentUser && !canManageStock(currentUser.role)) {
      showToast("Accès refusé : Seuls le Propriétaire et le Responsable Stock peuvent modifier les ingrédients ou leurs coûts.", "error");
      throw new Error("Action non autorisée.");
    }

    setIngredients(prev =>
      prev.map(ing => (ing.id === id ? { ...ing, ...updates } : ing))
    );

    if (isSupabase && supabase) {
      setIsSyncing(true);
      try {
        const dbUpdates: Database['public']['Tables']['ingredients']['Update'] = {};
        if (updates.name !== undefined) dbUpdates.name = updates.name;
        if (updates.unit !== undefined) dbUpdates.unit = updates.unit;
        if (updates.category !== undefined) dbUpdates.category = updates.category;
        if (updates.cost_per_unit !== undefined) dbUpdates.cost_per_unit = updates.cost_per_unit;
        if (updates.current_stock !== undefined) dbUpdates.current_stock = updates.current_stock;
        if (updates.min_alert_threshold !== undefined) dbUpdates.min_alert_threshold = updates.min_alert_threshold;
        if (updates.location !== undefined) dbUpdates.location = updates.location;

        const { error: updErr } = await supabase
          .from('ingredients')
          .update(dbUpdates)
          .eq('id', id);
        if (updErr) throw updErr;
      } catch (err: unknown) {
        console.error('Supabase updateIngredient error:', err);
        showToast(`Erreur Supabase: ${getErrorMessage(err)}`, 'error');
      } finally {
        setIsSyncing(false);
      }
    }
  };

  const deleteIngredient = async (id: string) => {
    if (currentUser && !canManageStock(currentUser.role)) {
      showToast("Accès refusé : Seuls le Propriétaire et le Responsable Stock peuvent supprimer des ingrédients.", "error");
      throw new Error("Action non autorisée.");
    }

    setIngredients(prev => prev.filter(ing => ing.id !== id));

    if (isSupabase && supabase) {
      setIsSyncing(true);
      try {
        const { error: delErr } = await supabase.from('ingredients').delete().eq('id', id);
        if (delErr) throw delErr;
        showToast('Ingrédient supprimé', 'info');
      } catch (err: unknown) {
        console.error('Supabase deleteIngredient error:', err);
        showToast(`Erreur Supabase: ${getErrorMessage(err)}`, 'error');
      } finally {
        setIsSyncing(false);
      }
    }
  };

  const assignBarcodeToIngredient = async (ingredientId: string, barcode: string) => {
    const trimmed = barcode.trim();
    if (!trimmed) return;

    setIngredients(prev =>
      prev.map(ing => (ing.id === ingredientId ? { ...ing, barcode: trimmed } : ing))
    );
    showToast(`Code-barres associé avec succès !`, 'success');

    if (isSupabase && supabase) {
      try {
        // Attempt to persist barcode if column exists in Supabase
        await (supabase.from('ingredients') as any)
          .update({ barcode: trimmed })
          .eq('id', ingredientId);
      } catch (e) {
        console.warn('Barcode saved locally (column not present in Supabase table):', e);
      }
    }
  };

  const findIngredientByBarcode = useCallback((rawCode: string): Ingredient | undefined => {
    if (!rawCode) return undefined;
    const clean = rawCode.trim();
    if (!clean) return undefined;

    // 1. Direct barcode match (exact or case-insensitive)
    const matchBarcode = ingredients.find(
      i => i.barcode && i.barcode.trim().toLowerCase() === clean.toLowerCase()
    );
    if (matchBarcode) return matchBarcode;

    // 2. Direct ID match
    const matchId = ingredients.find(
      i => i.id.toLowerCase() === clean.toLowerCase()
    );
    if (matchId) return matchId;

    // 3. Match prefixed QR codes like "LG:ing-1" or "lagrotte://ingredient/ing-1" or "ing-1"
    const prefixMatch = clean.match(/(?:LG:|ingredient\/|^)(ing-[a-zA-Z0-9_-]+)/i);
    if (prefixMatch && prefixMatch[1]) {
      const candidateId = prefixMatch[1].toLowerCase();
      const byPrefix = ingredients.find(i => i.id.toLowerCase() === candidateId);
      if (byPrefix) return byPrefix;
    }

    // 4. Try parsing JSON payload if QR code contains structured data
    if (clean.startsWith('{') && clean.endsWith('}')) {
      try {
        const parsed = JSON.parse(clean);
        if (parsed.barcode) {
          const byJsonBarcode = ingredients.find(
            i => i.barcode && i.barcode.toLowerCase() === String(parsed.barcode).toLowerCase()
          );
          if (byJsonBarcode) return byJsonBarcode;
        }
        if (parsed.id) {
          const byJsonId = ingredients.find(
            i => i.id.toLowerCase() === String(parsed.id).toLowerCase()
          );
          if (byJsonId) return byJsonId;
        }
      } catch {
        // ignore JSON parse error
      }
    }

    // 5. Match by exact or normalized ingredient name
    const matchName = ingredients.find(
      i => i.name.toLowerCase() === clean.toLowerCase()
    );
    if (matchName) return matchName;

    return undefined;
  }, [ingredients]);

  const addSupplier = async (data: Omit<Supplier, 'id'>) => {
    if (currentUser && !canManageStock(currentUser.role)) {
      showToast("Accès refusé : Seuls le Propriétaire et le Responsable Stock peuvent gérer les fournisseurs.", "error");
      throw new Error("Action non autorisée.");
    }

    const id = generateUUID();
    const newSupplier: Supplier = { ...data, id };
    setSuppliers(prev => [...prev, newSupplier]);

    if (isSupabase && supabase) {
      setIsSyncing(true);
      try {
        const { error: supErr } = await supabase.from('suppliers').insert({
          id,
          name: data.name,
          contact: data.contact ?? null,
          notes: data.notes ?? null,
        });
        if (supErr) throw supErr;
        showToast(`Fournisseur "${data.name}" enregistré sur Supabase`, 'success');
      } catch (err: unknown) {
        setSuppliers(prev => prev.filter(s => s.id !== id));
        console.error('Supabase addSupplier error:', err);
        showToast(`Erreur Supabase: ${getErrorMessage(err)}`, 'error');
        throw err;
      } finally {
        setIsSyncing(false);
      }
    }
  };

  const addDelivery = async (data: Omit<Delivery, 'id'>) => {
    const id = generateUUID();
    const newDelivery: Delivery = { ...data, id };
    setDeliveries(prev => [newDelivery, ...prev]);

    // Optimistically update stock & cost
    setIngredients(prev =>
      prev.map(ing => {
        if (ing.id === data.ingredient_id) {
          return {
            ...ing,
            current_stock: Number((ing.current_stock + data.quantity).toFixed(3)),
            cost_per_unit: data.unit_cost > 0 ? data.unit_cost : ing.cost_per_unit,
          };
        }
        return ing;
      })
    );

    if (isSupabase && supabase) {
      setIsSyncing(true);
      try {
        const { error: delErr } = await supabase.from('deliveries').insert({
          id,
          ingredient_id: data.ingredient_id,
          supplier_id: data.supplier_id,
          quantity: data.quantity,
          unit_cost: data.unit_cost,
          date: data.date,
          received_by: data.received_by,
          notes: data.notes ?? null,
        });
        if (delErr) throw delErr;

        // Also update ingredient current_stock in database
        const targetIng = ingredients.find(i => i.id === data.ingredient_id);
        if (targetIng) {
          const newQty = Number((targetIng.current_stock + data.quantity).toFixed(3));
          await supabase
            .from('ingredients')
            .update({ 
              current_stock: newQty, 
              cost_per_unit: data.unit_cost > 0 ? data.unit_cost : targetIng.cost_per_unit 
            })
            .eq('id', data.ingredient_id);
        }
        showToast('Livraison enregistrée avec succès sur la base Supabase', 'success');
      } catch (err: unknown) {
        console.error('Supabase addDelivery error:', err);
        showToast(`Erreur Supabase: ${getErrorMessage(err)}`, 'error');
      } finally {
        setIsSyncing(false);
      }
    }
  };

  const deleteDelivery = async (id: string) => {
    if (currentUser && !canManageStock(currentUser.role)) {
      showToast("Accès refusé : Seuls le Propriétaire et le Responsable Stock peuvent annuler des réceptions.", "error");
      throw new Error("Action non autorisée.");
    }

    setDeliveries(prev => prev.filter(d => d.id !== id));
    if (isSupabase && supabase) {
      try {
        await supabase.from('deliveries').delete().eq('id', id);
      } catch (err: unknown) {
        showToast(`Erreur Supabase: ${getErrorMessage(err)}`, 'error');
      }
    }
  };

  const recordStockCount = async (data: Omit<StockCount, 'id'>) => {
    const id = generateUUID();
    const newCount: StockCount = {
      ...data,
      id,
      shift: data.shift || 'evening',
    };
    setStockCounts(prev => [newCount, ...prev]);

    setIngredients(prev =>
      prev.map(ing =>
        ing.id === data.ingredient_id
          ? { ...ing, current_stock: data.counted_quantity }
          : ing
      )
    );

    if (isSupabase && supabase) {
      setIsSyncing(true);
      try {
        const { error: cntErr } = await supabase.from('stock_counts').insert({
          id,
          ingredient_id: data.ingredient_id,
          counted_quantity: data.counted_quantity,
          date: data.date,
          shift: data.shift || 'evening',
          counted_by: data.counted_by,
          photo_url: data.photo_url ?? null,
          notes: data.notes ?? null,
        });
        if (cntErr) throw cntErr;

        await supabase
          .from('ingredients')
          .update({ current_stock: data.counted_quantity })
          .eq('id', data.ingredient_id);

        showToast('Comptage inventaire synchronisé avec Supabase', 'success');
      } catch (err: unknown) {
        console.error('Supabase recordStockCount error:', err);
        showToast(`Erreur Supabase: ${getErrorMessage(err)}`, 'error');
      } finally {
        setIsSyncing(false);
      }
    }
  };

  const recordBatchStockCounts = async (
    counts: Array<{ 
      ingredient_id: string; 
      counted_quantity: number; 
      counted_by: string; 
      date: string;
      shift?: 'morning' | 'evening';
      photo_url?: string;
    }>
  ) => {
    const newCounts: StockCount[] = counts.map(c => ({
      id: generateUUID(),
      ingredient_id: c.ingredient_id,
      counted_quantity: c.counted_quantity,
      date: c.date,
      counted_by: c.counted_by,
      shift: c.shift || 'evening',
      photo_url: c.photo_url,
    }));

    setStockCounts(prev => [...newCounts, ...prev]);

    const countMap = new Map(counts.map(c => [c.ingredient_id, c.counted_quantity]));
    setIngredients(prev =>
      prev.map(ing => {
        if (countMap.has(ing.id)) {
          return { ...ing, current_stock: countMap.get(ing.id)! };
        }
        return ing;
      })
    );

    if (isSupabase && supabase) {
      setIsSyncing(true);
      try {
        const dbPayload = newCounts.map(nc => ({
          id: nc.id,
          ingredient_id: nc.ingredient_id,
          counted_quantity: nc.counted_quantity,
          date: nc.date,
          shift: nc.shift,
          counted_by: nc.counted_by,
          photo_url: nc.photo_url ?? null,
        }));

        const { error: bErr } = await supabase.from('stock_counts').insert(dbPayload);
        if (bErr) throw bErr;

        // Update all ingredients
        await Promise.all(
          counts.map(c =>
            supabase!
              .from('ingredients')
              .update({ current_stock: c.counted_quantity })
              .eq('id', c.ingredient_id)
          )
        );

        showToast(`${counts.length} fiches d'inventaire synchronisées avec Supabase`, 'success');
      } catch (err: unknown) {
        console.error('Supabase recordBatchStockCounts error:', err);
        showToast(`Erreur Supabase: ${getErrorMessage(err)}`, 'error');
      } finally {
        setIsSyncing(false);
      }
    }
  };

  const updateStockOnWaste = async (ingredientId: string, quantityLost: number): Promise<Ingredient | null> => {
    let updatedTarget: Ingredient | null = null;
    setIngredients(prev =>
      prev.map(ing => {
        if (ing.id === ingredientId) {
          const newStock = Math.max(0, Number((ing.current_stock - quantityLost).toFixed(3)));
          updatedTarget = { ...ing, current_stock: newStock };
          return updatedTarget;
        }
        return ing;
      })
    );

    if (isSupabase && supabase) {
      try {
        const current = ingredients.find(i => i.id === ingredientId);
        const newStock = current ? Math.max(0, Number((current.current_stock - quantityLost).toFixed(3))) : 0;
        await supabase
          .from('ingredients')
          .update({ current_stock: newStock })
          .eq('id', ingredientId);
      } catch (err) {
        console.warn('Supabase updateStockOnWaste error:', err);
      }
    }

    recalculateVarianceMetrics();
    return updatedTarget;
  };

  const addWasteLog = async (data: Omit<WasteLog, 'id'>): Promise<WasteLog> => {
    const id = generateUUID();
    const newLog: WasteLog = {
      ...data,
      id,
      shift: data.shift || 'evening',
      date: data.date || new Date().toISOString().split('T')[0],
      created_at: new Date().toISOString(),
    };
    setWasteLogs(prev => [newLog, ...prev]);

    // Automatically update corresponding ingredient current_stock in state
    setIngredients(prev =>
      prev.map(ing => {
        if (ing.id === data.ingredient_id) {
          const newStock = Math.max(0, Number((ing.current_stock - data.quantity).toFixed(3)));
          return {
            ...ing,
            current_stock: newStock,
          };
        }
        return ing;
      })
    );

    // Trigger immediate variance recalculation
    recalculateVarianceMetrics();

    if (isSupabase && supabase) {
      setIsSyncing(true);
      try {
        const { error: wasteErr } = await supabase.from('waste_logs').insert({
          id,
          ingredient_id: data.ingredient_id,
          quantity: data.quantity,
          unit_cost_at_time: data.unit_cost_at_time,
          reason: data.reason,
          logged_by: data.logged_by,
          date: data.date || new Date().toISOString().split('T')[0],
          shift: data.shift || 'evening',
          notes: data.notes ?? null,
        });

        // Also update ingredient current_stock in Supabase table
        const targetIng = ingredients.find(i => i.id === data.ingredient_id);
        if (targetIng) {
          const newQty = Math.max(0, Number((targetIng.current_stock - data.quantity).toFixed(3)));
          await supabase
            .from('ingredients')
            .update({ current_stock: newQty })
            .eq('id', data.ingredient_id);
        }

        if (wasteErr) {
          console.warn('Supabase waste_logs insert notice:', wasteErr.message);
          const isTableMissing =
            wasteErr.code === 'PGRST205' ||
            wasteErr.message.includes('schema cache') ||
            wasteErr.message.includes('relation "waste_logs" does not exist') ||
            wasteErr.message.includes('relation "public.waste_logs" does not exist');

          const isRlsViolation =
            wasteErr.code === '42501' ||
            wasteErr.message.includes('row-level security policy') ||
            wasteErr.message.includes('permission denied');

          if (isTableMissing) {
            setIsWasteTableAvailable(false);
            showToast(
              'Perte enregistrée localement (table Supabase "waste_logs" en attente de migration)',
              'info'
            );
          } else if (isRlsViolation) {
            setIsWasteTableAvailable(true);
            showToast(
              'Perte enregistrée localement (sécurité RLS : connectez-vous avec votre compte Supabase pour la synchronisation cloud)',
              'info'
            );
          } else {
            showToast(`Perte enregistrée localement (${wasteErr.message})`, 'info');
          }
        } else {
          setIsWasteTableAvailable(true);
          showToast('Déclaration de perte synchronisée avec Supabase & stock mis à jour', 'success');
        }
      } catch (err: unknown) {
        console.error('Supabase addWasteLog error:', err);
        showToast(`Déclaration enregistrée localement (${getErrorMessage(err)})`, 'info');
      } finally {
        setIsSyncing(false);
      }
    } else {
      showToast('Déclaration de perte enregistrée : stock et écarts recalculés en temps réel', 'success');
    }

    return newLog;
  };

  const deleteWasteLog = async (id: string) => {
    if (currentUser && !canManageStock(currentUser.role)) {
      showToast("Accès refusé : Seuls le Propriétaire et le Responsable Stock peuvent supprimer une déclaration de perte.", "error");
      throw new Error("Action non autorisée.");
    }

    setWasteLogs(prev => prev.filter(w => w.id !== id));
    recalculateVarianceMetrics();

    if (isSupabase && supabase) {
      try {
        const { error } = await supabase.from('waste_logs').delete().eq('id', id);
        if (error) throw error;
        showToast('Déclaration de perte supprimée', 'info');
      } catch (err) {
        console.error('Supabase deleteWasteLog error:', err);
        showToast(`Suppression enregistrée en local (${getErrorMessage(err)})`, 'info');
      }
    } else {
      showToast('Déclaration de perte supprimée', 'info');
    }
  };

  const syncWasteLogsToSupabase = async (): Promise<boolean> => {
    if (!isSupabase || !supabase || wasteLogs.length === 0) return false;
    setIsSyncing(true);
    try {
      const payload = wasteLogs.map(w => ({
        id: w.id,
        ingredient_id: w.ingredient_id,
        quantity: w.quantity,
        unit_cost_at_time: w.unit_cost_at_time,
        reason: w.reason,
        logged_by: w.logged_by,
        date: w.date,
        shift: w.shift,
        notes: w.notes ?? null,
      }));
      const { error } = await supabase.from('waste_logs').upsert(payload, { onConflict: 'id' });
      if (error) {
        const isTableMissing =
          error.code === 'PGRST205' ||
          error.message.includes('schema cache') ||
          error.message.includes('relation "waste_logs" does not exist') ||
          error.message.includes('relation "public.waste_logs" does not exist');

        const isRlsViolation =
          error.code === '42501' ||
          error.message.includes('row-level security policy') ||
          error.message.includes('permission denied');

        if (isTableMissing) {
          setIsWasteTableAvailable(false);
          showToast('Table "waste_logs" non trouvée sur Supabase. Exécutez le script SQL.', 'info');
          return false;
        } else if (isRlsViolation) {
          setIsWasteTableAvailable(true);
          showToast('Synchronisation bloquée par la politique RLS : connectez-vous avec votre compte Supabase.', 'info');
          return false;
        }
        throw error;
      }
      setIsWasteTableAvailable(true);
      showToast(`${wasteLogs.length} pertes synchronisées avec succès sur Supabase`, 'success');
      return true;
    } catch (err: unknown) {
      console.error('syncWasteLogsToSupabase error:', err);
      showToast(`Échec de synchronisation: ${getErrorMessage(err)}`, 'error');
      return false;
    } finally {
      setIsSyncing(false);
    }
  };

  const addMenuItem = async (data: Omit<MenuItem, 'id'>) => {
    if (currentUser && !canManageStock(currentUser.role)) {
      showToast("Accès refusé : Seuls le Propriétaire et le Responsable Stock peuvent ajouter des plats.", "error");
      throw new Error("Action non autorisée.");
    }

    const id = generateUUID();
    const newItem: MenuItem = { ...data, id };
    setMenuItems(prev => [...prev, newItem]);

    if (isSupabase && supabase) {
      setIsSyncing(true);
      try {
        const { error: insErr } = await supabase.from('menu_items').insert({
          id,
          name: data.name,
          pos_reference: data.pos_reference,
          category: data.category ?? null,
          selling_price: data.selling_price ?? 0,
        });
        if (insErr) throw insErr;
        showToast(`Plat "${data.name}" enregistré sur Supabase`, 'success');
      } catch (err: unknown) {
        setMenuItems(prev => prev.filter(item => item.id !== id));
        console.error('Supabase addMenuItem error:', err);
        showToast(`Erreur Supabase: ${getErrorMessage(err)}`, 'error');
        throw err;
      } finally {
        setIsSyncing(false);
      }
    }
  };

  const updateMenuItem = async (id: string, updates: Partial<MenuItem>) => {
    if (currentUser && !canManageStock(currentUser.role)) {
      showToast("Accès refusé : Seuls le Propriétaire et le Responsable Stock peuvent modifier des plats.", "error");
      throw new Error("Action non autorisée.");
    }

    const previous = menuItems;
    setMenuItems(prev =>
      prev.map(item => (item.id === id ? { ...item, ...updates } : item))
    );

    if (isSupabase && supabase) {
      setIsSyncing(true);
      try {
        const { error: updErr } = await supabase.from('menu_items').update(updates).eq('id', id);
        if (updErr) throw updErr;
      } catch (err: unknown) {
        setMenuItems(previous);
        console.error('Supabase updateMenuItem error:', err);
        showToast(`Erreur Supabase: ${getErrorMessage(err)}`, 'error');
        throw err;
      } finally {
        setIsSyncing(false);
      }
    }
  };

  const deleteMenuItem = async (id: string) => {
    if (currentUser && !canManageStock(currentUser.role)) {
      showToast("Accès refusé : Seuls le Propriétaire et le Responsable Stock peuvent supprimer des plats.", "error");
      throw new Error("Action non autorisée.");
    }

    const prevMenu = menuItems;
    const prevRec = recipes;
    const prevSal = sales;
    const prevPv = posVoids;

    setMenuItems(prev => prev.filter(item => item.id !== id));
    setRecipes(prev => prev.filter(r => r.menu_item_id !== id));
    setSales(prev => prev.filter(s => s.menu_item_id !== id));
    setPosVoids(prev => prev.filter(pv => pv.menu_item_id !== id));

    if (isSupabase && supabase) {
      setIsSyncing(true);
      try {
        const { error: rpcErr } = await supabase.rpc('delete_menu_item_cascade', { item_id: id });
        if (rpcErr) {
          // If the migration function has not yet been executed in Supabase SQL editor (PGRST202)
          if ((rpcErr as any)?.code === 'PGRST202' || rpcErr.message?.includes('delete_menu_item_cascade')) {
            console.warn('[Supabase] RPC delete_menu_item_cascade not yet in schema cache, using fallback deletion.');
            await supabase.from('recipe_ingredients').delete().eq('menu_item_id', id);
            await supabase.from('sales').delete().eq('menu_item_id', id);
            await supabase.from('pos_voids').delete().eq('menu_item_id', id);
            const { error: delErr } = await supabase.from('menu_items').delete().eq('id', id);
            if (delErr) throw delErr;
            showToast('Plat supprimé (exécutez la migration SQL dans Supabase pour l\'atomicité)', 'info');
            return;
          }
          throw rpcErr;
        }
        showToast('Plat supprimé de la base Supabase (cascade atomique)', 'info');
      } catch (err: unknown) {
        setMenuItems(prevMenu);
        setRecipes(prevRec);
        setSales(prevSal);
        setPosVoids(prevPv);
        console.error('Supabase deleteMenuItem error:', err);
        showToast(`Erreur Supabase: ${getErrorMessage(err)}`, 'error');
        throw err;
      } finally {
        setIsSyncing(false);
      }
    } else {
      showToast('Plat supprimé du menu', 'info');
    }
  };

  const addRecipeIngredient = async (data: Omit<RecipeIngredient, 'id'>) => {
    if (currentUser && !canManageStock(currentUser.role)) {
      showToast("Accès refusé : Seuls le Propriétaire et le Responsable Stock peuvent modifier les fiches techniques.", "error");
      throw new Error("Action non autorisée.");
    }

    const existing = recipes.find(
      r => r.menu_item_id === data.menu_item_id && r.ingredient_id === data.ingredient_id
    );
    if (existing) {
      await updateRecipeIngredient(existing.id, data.quantity_per_unit);
      return;
    }

    const id = generateUUID();
    const newRecipe: RecipeIngredient = { ...data, id };
    setRecipes(prev => [...prev, newRecipe]);

    if (isSupabase && supabase) {
      setIsSyncing(true);
      try {
        const { error: insErr } = await supabase.from('recipe_ingredients').insert({
          id,
          menu_item_id: data.menu_item_id,
          ingredient_id: data.ingredient_id,
          quantity_per_unit: data.quantity_per_unit,
        });
        if (insErr) throw insErr;
      } catch (err: unknown) {
        setRecipes(prev => prev.filter(r => r.id !== id));
        console.error('Supabase addRecipeIngredient error:', err);
        showToast(`Erreur Supabase: ${getErrorMessage(err)}`, 'error');
        throw err;
      } finally {
        setIsSyncing(false);
      }
    }
  };

  const updateRecipeIngredient = async (id: string, quantity_per_unit: number) => {
    if (currentUser && !canManageStock(currentUser.role)) {
      showToast("Accès refusé : Seuls le Propriétaire et le Responsable Stock peuvent modifier les fiches techniques.", "error");
      throw new Error("Action non autorisée.");
    }

    const previous = recipes;
    setRecipes(prev =>
      prev.map(r => (r.id === id ? { ...r, quantity_per_unit } : r))
    );

    if (isSupabase && supabase) {
      setIsSyncing(true);
      try {
        const { error: updErr } = await supabase.from('recipe_ingredients').update({ quantity_per_unit }).eq('id', id);
        if (updErr) throw updErr;
      } catch (err: unknown) {
        setRecipes(previous);
        console.error('Supabase updateRecipeIngredient error:', err);
        showToast(`Erreur Supabase: ${getErrorMessage(err)}`, 'error');
        throw err;
      } finally {
        setIsSyncing(false);
      }
    }
  };

  const deleteRecipeIngredient = async (id: string) => {
    if (currentUser && !canManageStock(currentUser.role)) {
      showToast("Accès refusé : Seuls le Propriétaire et le Responsable Stock peuvent modifier les fiches techniques.", "error");
      throw new Error("Action non autorisée.");
    }

    const previous = recipes;
    setRecipes(prev => prev.filter(r => r.id !== id));
    if (isSupabase && supabase) {
      setIsSyncing(true);
      try {
        const { error: delErr } = await supabase.from('recipe_ingredients').delete().eq('id', id);
        if (delErr) throw delErr;
      } catch (err: unknown) {
        setRecipes(previous);
        console.error('Supabase deleteRecipeIngredient error:', err);
        showToast(`Erreur Supabase: ${getErrorMessage(err)}`, 'error');
        throw err;
      } finally {
        setIsSyncing(false);
      }
    }
  };

  const addSale = async (data: Omit<Sale, 'id'>) => {
    const id = generateUUID();
    const newSale: Sale = { ...data, id };
    setSales(prev => [newSale, ...prev]);

    if (isSupabase && supabase) {
      setIsSyncing(true);
      try {
        const { error: sErr } = await supabase.from('sales').insert({
          id,
          menu_item_id: data.menu_item_id,
          quantity_sold: data.quantity_sold,
          date: data.date,
          source: data.source,
        });
        if (sErr) throw sErr;
      } catch (err: unknown) {
        setSales(prev => prev.filter(s => s.id !== id));
        console.error('Supabase addSale error:', err);
        showToast(`Erreur Supabase: ${getErrorMessage(err)}`, 'error');
        throw err;
      } finally {
        setIsSyncing(false);
      }
    }
  };

  const importSales = async (newSales: Array<Omit<Sale, 'id'>>) => {
    const createdSales: Sale[] = newSales.map(s => ({
      ...s,
      id: generateUUID(),
    }));
    setSales(prev => [...createdSales, ...prev]);

    if (isSupabase && supabase) {
      setIsSyncing(true);
      try {
        const { error: sErr } = await supabase.from('sales').insert(createdSales);
        if (sErr) throw sErr;
        showToast(`${newSales.length} lignes de vente importées sur Supabase`, 'success');
      } catch (err: unknown) {
        showToast(`Erreur import Supabase: ${getErrorMessage(err)}`, 'error');
      } finally {
        setIsSyncing(false);
      }
    }
  };

  const deleteSale = async (id: string) => {
    if (currentUser && !canManageStock(currentUser.role)) {
      showToast("Accès refusé : Seuls le Propriétaire et le Responsable Stock peuvent supprimer des ventes.", "error");
      throw new Error("Action non autorisée.");
    }

    const previous = sales;
    setSales(prev => prev.filter(s => s.id !== id));
    if (isSupabase && supabase) {
      setIsSyncing(true);
      try {
        const { error: delErr } = await supabase.from('sales').delete().eq('id', id);
        if (delErr) throw delErr;
      } catch (err: unknown) {
        setSales(previous);
        console.error('Supabase deleteSale error:', err);
        showToast(`Erreur Supabase: ${getErrorMessage(err)}`, 'error');
        throw err;
      } finally {
        setIsSyncing(false);
      }
    }
  };

  const addStaff = async (data: Omit<Staff, 'id'>) => {
    if (currentUser && !isOwner(currentUser.role)) {
      showToast("Accès refusé : Seul le Propriétaire peut modifier ou créer des membres d'équipe.", "error");
      throw new Error("Action non autorisée.");
    }

    const id = generateUUID();
    const newMember: Staff = { ...data, id };
    setStaff(prev => [...prev, newMember]);

    if (isSupabase && supabase) {
      setIsSyncing(true);
      try {
        const { error: insErr } = await supabase.from('staff').insert({
          id,
          name: data.name,
          role: data.role,
          role_title: data.roleTitle ?? null,
          email: data.email ?? null,
          active: data.active,
        });
        if (insErr) throw insErr;
        showToast(`Collaborateur "${data.name}" enregistré sur Supabase`, 'success');
      } catch (err: unknown) {
        setStaff(prev => prev.filter(s => s.id !== id));
        console.error('Supabase addStaff error:', err);
        showToast(`Erreur Supabase: ${getErrorMessage(err)}`, 'error');
        throw err;
      } finally {
        setIsSyncing(false);
      }
    }
  };

  const signUpStaff = async (data: {
    email: string;
    password?: string;
    name: string;
    role: StaffRole;
    roleTitle?: string;
  }): Promise<boolean> => {
    if (currentUser && !isOwner(currentUser.role)) {
      showToast("Accès refusé : Seul le Propriétaire peut créer un accès collaborateur.", "error");
      return false;
    }

    const cleanEmail = data.email.trim().toLowerCase();
    const strongPassword = data.password?.trim();

    if (strongPassword && strongPassword.length < 8) {
      showToast("Sécurité : Le mot de passe doit comporter au moins 8 caractères.", "error");
      return false;
    }

    if (isSupabase && supabase && strongPassword) {
      setIsSyncing(true);
      try {
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: cleanEmail,
          password: strongPassword,
          options: {
            data: {
              name: data.name.trim(),
              role: data.role,
              role_title: data.roleTitle?.trim(),
            },
          },
        });

        if (authError) {
          showToast(`Erreur Supabase Auth: ${authError.message}`, 'error');
          return false;
        }

        const id = generateUUID();
        const newMember: Staff = {
          id,
          user_id: authData.user?.id,
          name: data.name.trim(),
          role: data.role,
          roleTitle: data.roleTitle?.trim(),
          email: cleanEmail,
          active: true,
        };

        setStaff(prev => [...prev, newMember]);

        await supabase.from('staff').insert({
          id,
          user_id: authData.user?.id ?? null,
          name: data.name.trim(),
          role: data.role,
          role_title: data.roleTitle?.trim() ?? null,
          email: cleanEmail,
          active: true,
        });

        showToast(`Compte Supabase Auth créé pour ${data.name}`, 'success');
        return true;
      } catch (err: unknown) {
        showToast(`Erreur création: ${getErrorMessage(err)}`, 'error');
        return false;
      } finally {
        setIsSyncing(false);
      }
    }

    // Fallback mode without supabase
    await addStaff({
      name: data.name.trim(),
      role: data.role,
      roleTitle: data.roleTitle?.trim(),
      email: cleanEmail,
      active: true,
    });
    return true;
  };

  const updateStaff = async (id: string, updates: Partial<Staff>) => {
    if (currentUser && !isOwner(currentUser.role)) {
      showToast("Accès refusé : Seul le Propriétaire peut modifier les membres d'équipe.", "error");
      throw new Error("Action non autorisée.");
    }

    setStaff(prev =>
      prev.map(s => (s.id === id ? { ...s, ...updates } : s))
    );
    if (currentUser?.id === id) {
      setCurrentUser(prev => prev ? { ...prev, ...updates } : null);
    }

    if (isSupabase && supabase) {
      try {
        const dbUpdates: Database['public']['Tables']['staff']['Update'] = {};
        if (updates.name !== undefined) dbUpdates.name = updates.name;
        if (updates.role !== undefined) dbUpdates.role = updates.role;
        if (updates.roleTitle !== undefined) dbUpdates.role_title = updates.roleTitle;
        if (updates.email !== undefined) dbUpdates.email = updates.email;
        if (updates.active !== undefined) dbUpdates.active = updates.active;

        await supabase.from('staff').update(dbUpdates).eq('id', id);
      } catch (err: unknown) {
        showToast(`Erreur Supabase: ${getErrorMessage(err)}`, 'error');
      }
    }
  };

  const deleteStaff = async (id: string) => {
    if (currentUser && !isOwner(currentUser.role)) {
      showToast("Accès refusé : Seul le Propriétaire peut révoquer des membres d'équipe.", "error");
      throw new Error("Action non autorisée.");
    }

    setStaff(prev => prev.filter(s => s.id !== id));
    if (isSupabase && supabase) {
      try {
        await supabase.from('staff').delete().eq('id', id);
      } catch (err: unknown) {
        showToast(`Erreur Supabase: ${getErrorMessage(err)}`, 'error');
      }
    }
  };

  const login = async (email: string, password?: string): Promise<boolean> => {
    const cleanEmail = email.trim().toLowerCase();

    // If Supabase is connected and password provided, authenticate with Supabase Auth
    if (isSupabase && supabase && password) {
      setIsSyncing(true);
      try {
        const { data, error: authError } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: password.trim(),
        });

        if (authError) {
          console.warn('Supabase auth sign in error:', authError.message);
          showToast(`Erreur d'authentification Supabase : ${authError.message}`, 'error');
          return false;
        }

        if (data.user) {
          let found = staff.find(
            s => s.user_id === data.user.id || s.email?.toLowerCase() === cleanEmail
          );

          if (found) {
            if (!found.user_id) {
              await supabase.from('staff').update({ user_id: data.user.id }).eq('id', found.id);
              found = { ...found, user_id: data.user.id };
            }
            setCurrentUser(found);
            showToast(`Authentifié avec succès : ${found.name} (${found.roleTitle || found.role})`, 'success');
            return true;
          }
        }
      } catch (err: unknown) {
        console.error('Supabase signInWithPassword exception:', err);
      } finally {
        setIsSyncing(false);
      }
    }

    // Demo / fallback local resolution
    const found = staff.find(
      s => s.email?.toLowerCase() === cleanEmail && s.active
    );
    if (found) {
      setCurrentUser(found);
      showToast(`Connecté en tant que ${found.name} (${found.roleTitle || found.role})`, 'success');
      return true;
    }
    showToast('Identifiants incorrects ou compte inactif.', 'error');
    return false;
  };

  const logout = async () => {
    if (isSupabase && supabase) {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.error('Supabase signOut error:', err);
      }
    }
    localStorage.removeItem('lagrotte_current_user_v2');
    setCurrentUser(null);
    showToast('Session déconnectée', 'info');
  };

  const switchStaffRole = (role: StaffRole) => {
    const matchingStaff = staff.find(s => s.role === role && s.active);
    if (matchingStaff) {
      setCurrentUser(matchingStaff);
      showToast(`Rôle activé: ${matchingStaff.name} (${role})`, 'info');
    } else {
      const dummyStaff: Staff = {
        id: generateUUID(),
        name: `Test ${role}`,
        role: role,
        roleTitle: `Mode Simulation ${role}`,
        active: true,
      };
      setCurrentUser(dummyStaff);
      showToast(`Mode simulation: ${role}`, 'info');
    }
  };

  const addAccessLog = async (data: Omit<AccessLog, 'id'>) => {
    const id = generateUUID();
    const newLog: AccessLog = { ...data, id };
    setAccessLogs(prev => [newLog, ...prev]);

    if (isSupabase && supabase) {
      try {
        await supabase.from('access_logs').insert({
          id,
          staff_id: data.staff_id,
          staff_name: data.staff_name ?? null,
          location: data.location,
          timestamp_in: data.timestamp_in,
          timestamp_out: data.timestamp_out ?? null,
          action: data.action ?? 'entry',
          notes: data.notes ?? null,
        });
      } catch (err: unknown) {
        showToast(`Erreur Supabase: ${getErrorMessage(err)}`, 'error');
      }
    }
  };

  const updateAccessLog = async (id: string, updates: Partial<AccessLog>) => {
    setAccessLogs(prev =>
      prev.map(a => (a.id === id ? { ...a, ...updates } : a))
    );

    if (isSupabase && supabase) {
      try {
        const dbUpdates: Database['public']['Tables']['access_logs']['Update'] = {};
        if (updates.staff_id !== undefined) dbUpdates.staff_id = updates.staff_id;
        if (updates.staff_name !== undefined) dbUpdates.staff_name = updates.staff_name ?? null;
        if (updates.location !== undefined) dbUpdates.location = updates.location;
        if (updates.timestamp_in !== undefined) dbUpdates.timestamp_in = updates.timestamp_in;
        if (updates.timestamp_out !== undefined) dbUpdates.timestamp_out = updates.timestamp_out ?? null;
        if (updates.action !== undefined) dbUpdates.action = updates.action;
        if (updates.notes !== undefined) dbUpdates.notes = updates.notes ?? null;

        await supabase.from('access_logs').update(dbUpdates).eq('id', id);
      } catch (err: unknown) {
        showToast(`Erreur Supabase: ${getErrorMessage(err)}`, 'error');
      }
    }
  };

  const checkOutAccessLog = async (id: string, notes?: string) => {
    const nowIso = new Date().toISOString();
    setAccessLogs(prev =>
      prev.map(a =>
        a.id === id
          ? {
              ...a,
              timestamp_out: nowIso,
              notes: notes ? (a.notes ? `${a.notes} | ${notes}` : notes) : a.notes,
            }
          : a
      )
    );

    if (isSupabase && supabase) {
      try {
        const updatePayload: Database['public']['Tables']['access_logs']['Update'] = {
          timestamp_out: nowIso,
        };
        if (notes) {
          const current = accessLogs.find(a => a.id === id);
          updatePayload.notes = current?.notes ? `${current.notes} | ${notes}` : notes;
        }
        await supabase.from('access_logs').update(updatePayload).eq('id', id);
        showToast('Sortie de zone enregistrée', 'success');
      } catch (err: unknown) {
        showToast(`Erreur Supabase: ${getErrorMessage(err)}`, 'error');
      }
    } else {
      showToast('Sortie enregistrée en local', 'info');
    }
  };

  const deleteAccessLog = async (id: string) => {
    setAccessLogs(prev => prev.filter(a => a.id !== id));
    if (isSupabase && supabase) {
      try {
        await supabase.from('access_logs').delete().eq('id', id);
      } catch (err: unknown) {
        showToast(`Erreur Supabase: ${getErrorMessage(err)}`, 'error');
      }
    }
  };

  const addPosVoid = async (data: Omit<PosVoid, 'id'>) => {
    const id = generateUUID();
    const newVoid: PosVoid = { ...data, id };
    setPosVoids(prev => [newVoid, ...prev]);

    if (isSupabase && supabase) {
      try {
        await supabase.from('pos_voids').insert({
          id,
          menu_item_id: data.menu_item_id,
          staff_id: data.staff_id,
          staff_name: data.staff_name ?? null,
          item_name: data.item_name ?? null,
          type: data.type,
          amount: data.amount,
          date: data.date,
          reason: data.reason ?? null,
        });
      } catch (err: unknown) {
        showToast(`Erreur Supabase: ${getErrorMessage(err)}`, 'error');
      }
    }
  };

  const deletePosVoid = async (id: string) => {
    setPosVoids(prev => prev.filter(p => p.id !== id));
    if (isSupabase && supabase) {
      try {
        await supabase.from('pos_voids').delete().eq('id', id);
      } catch (err: unknown) {
        showToast(`Erreur Supabase: ${getErrorMessage(err)}`, 'error');
      }
    }
  };

  const getLossCorrelation = (ingredientId: string): LossCorrelationReport => {
    return correlateLossForIngredient(
      ingredientId,
      varianceReports,
      stockCounts,
      accessLogs,
      posVoids,
      staff,
      menuItems,
      recipes
    );
  };

  const resetToDemoData = () => {
    setIngredients(INITIAL_INGREDIENTS);
    setSuppliers(INITIAL_SUPPLIERS);
    setDeliveries(INITIAL_DELIVERIES);
    setStockCounts(INITIAL_STOCK_COUNTS);
    setMenuItems(INITIAL_MENU_ITEMS);
    setRecipes(INITIAL_RECIPE_INGREDIENTS);
    setSales(INITIAL_SALES);
    setStaff(INITIAL_STAFF);
    setAccessLogs(INITIAL_ACCESS_LOGS);
    setPosVoids(INITIAL_POS_VOIDS);
    setCurrentUser(INITIAL_STAFF.find(s => s.role === 'owner') || INITIAL_STAFF[0]);
    showToast('Données de démonstration La Grotte réinitialisées', 'info');
  };

  const exportDataJSON = (): string => {
    const payload = {
      version: '2.0.0',
      exportedAt: new Date().toISOString(),
      ingredients,
      suppliers,
      deliveries,
      stockCounts,
      menuItems,
      recipes,
      sales,
      staff,
      accessLogs,
      posVoids,
    };
    return JSON.stringify(payload, null, 2);
  };

  const importDataJSON = (jsonStr: string): boolean => {
    try {
      const data = JSON.parse(jsonStr);
      if (data.ingredients) setIngredients(data.ingredients);
      if (data.suppliers) setSuppliers(data.suppliers);
      if (data.deliveries) setDeliveries(data.deliveries);
      if (data.stockCounts) setStockCounts(data.stockCounts);
      if (data.menuItems) setMenuItems(data.menuItems);
      if (data.recipes) setRecipes(data.recipes);
      if (data.sales) setSales(data.sales);
      if (data.staff) setStaff(data.staff);
      if (data.accessLogs) setAccessLogs(data.accessLogs);
      if (data.posVoids) setPosVoids(data.posVoids);
      showToast('Importation JSON réussie', 'success');
      return true;
    } catch (e) {
      console.error('Import failed', e);
      showToast('Fichier JSON invalide', 'error');
      return false;
    }
  };

  // Computations
  const varianceReports = useMemo(() => {
    const rawReports = generateVarianceReport(
      ingredients,
      menuItems,
      recipes,
      deliveries,
      stockCounts,
      sales,
      selectedPeriod.startDate,
      selectedPeriod.endDate,
      wasteLogs
    );

    return rawReports.map(report => ({
      ...report,
      is_flagged:
        Math.abs(report.variance_percentage) >= alertThresholdPercent ||
        Math.abs(report.unexplained_variance_cost) >= alertThresholdCost,
    }));
  }, [
    ingredients,
    menuItems,
    recipes,
    deliveries,
    stockCounts,
    sales,
    wasteLogs,
    selectedPeriod.startDate,
    selectedPeriod.endDate,
    alertThresholdPercent,
    alertThresholdCost,
    varianceVersion,
  ]);

  const categorySummaries = useMemo(() => {
    return summarizeByCategory(varianceReports);
  }, [varianceReports]);

  const flaggedAlertItems = useMemo(() => {
    return varianceReports.filter(v => v.is_flagged);
  }, [varianceReports]);

  const {
    totalVarianceCost,
    totalLossCost,
    totalKnownWasteCost,
    totalUnexplainedVarianceCost,
    totalTheoreticalCost,
    totalActualCost,
  } = useMemo(() => {
    let varCost = 0;
    let lossCost = 0;
    let theoCost = 0;
    let actCost = 0;
    let knownWaste = 0;
    let unexplVar = 0;

    for (const report of varianceReports) {
      if (!report || !report.ingredient) continue;
      varCost += report.variance_cost || 0;
      if (report.variance_cost > 0) {
        lossCost += report.variance_cost;
      }
      knownWaste += report.known_waste_cost || 0;
      unexplVar += report.unexplained_variance_cost || 0;
      const theoUsage = report.theoretical_usage ?? 0;
      const actUsage = report.actual_usage ?? 0;
      const costPerUnit = report.ingredient.cost_per_unit ?? 0;
      theoCost += theoUsage * costPerUnit;
      actCost += actUsage * costPerUnit;
    }

    return {
      totalVarianceCost: Number(varCost.toFixed(3)),
      totalLossCost: Number(lossCost.toFixed(3)),
      totalKnownWasteCost: Number(knownWaste.toFixed(3)),
      totalUnexplainedVarianceCost: Number(unexplVar.toFixed(3)),
      totalTheoreticalCost: Number(theoCost.toFixed(3)),
      totalActualCost: Number(actCost.toFixed(3)),
    };
  }, [varianceReports]);

  const lowStockItemsCount = useMemo(() => {
    return ingredients.filter(
      ing => ing.min_alert_threshold !== undefined && ing.current_stock <= ing.min_alert_threshold
    ).length;
  }, [ingredients]);

  return (
    <StockContext.Provider
      value={{
        ingredients,
        suppliers,
        deliveries,
        stockCounts,
        menuItems,
        recipes,
        sales,
        staff,
        accessLogs,
        posVoids,
        wasteLogs,
        selectedPeriod,
        setSelectedPeriod,
        alertThresholdPercent,
        setAlertThresholdPercent,
        alertThresholdCost,
        setAlertThresholdCost,
        isLoading,
        isSyncing,
        error,
        isError: Boolean(error),
        isSupabaseConnected: isSupabase,
        toastMessage,
        clearToast,
        showToast,
        addIngredient,
        updateIngredient,
        deleteIngredient,
        assignBarcodeToIngredient,
        findIngredientByBarcode,
        addSupplier,
        addDelivery,
        deleteDelivery,
        recordStockCount,
        recordBatchStockCounts,
        addWasteLog,
        deleteWasteLog,
        updateStockOnWaste,
        recalculateVarianceMetrics,
        lastVarianceRecalculatedAt,
        isWasteTableAvailable,
        syncWasteLogsToSupabase,
        isSupabaseAuthActive,
        addMenuItem,
        updateMenuItem,
        deleteMenuItem,
        addRecipeIngredient,
        deleteRecipeIngredient,
        addSale,
        importSales,
        deleteSale,
        addStaff,
        updateStaff,
        deleteStaff,
        signUpStaff,
        isAuthChecking,
        currentUser,
        setCurrentUser,
        login,
        logout,
        switchStaffRole,
        addAccessLog,
        updateAccessLog,
        checkOutAccessLog,
        deleteAccessLog,
        addPosVoid,
        deletePosVoid,
        purchaseOrders,
        orderItems,
        setPurchaseOrders,
        setOrderItems,
        fetchPurchaseOrders,
        getLossCorrelation,
        resetToDemoData,
        exportDataJSON,
        importDataJSON,
        varianceReports,
        categorySummaries,
        flaggedAlertItems,
        totalVarianceCost,
        totalLossCost,
        totalKnownWasteCost,
        totalUnexplainedVarianceCost,
        totalTheoreticalCost,
        totalActualCost,
        lowStockItemsCount,
      }}
    >
      {children}
    </StockContext.Provider>
  );
};

export const useStock = () => {
  const context = useContext(StockContext);
  if (!context) {
    throw new Error('useStock must be used within a StockProvider');
  }
  return context;
};
