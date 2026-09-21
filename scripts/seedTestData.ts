/**
 * ==============================================================================
 * ⚠️ WARNING: TEST DATA ONLY — NEVER RUN ON PRODUCTION / REAL RECORDS
 * ==============================================================================
 * This script inserts simulated, fake test data for development and testing
 * of La Grotte (Monastir) inventory, sales, BOM variance, and purchase orders.
 *
 * DO NOT RUN THIS SCRIPT against a database already holding real restaurant
 * operational records, as it will inject mock suppliers, ingredients, historical
 * sales, and inventory logs!
 *
 * Designed for explicit, manual one-time execution by developers:
 *   npm run seed:test-data
 *
 * Authentication:
 *   Operates under the authenticated 'owner' role (or service_role if available)
 *   to respect strict RLS security boundaries without requiring anon bypass.
 *   Provide credentials via environment variables if needed:
 *     OWNER_EMAIL=owner@lagrotte.tn (or your registered owner email)
 *     OWNER_PASSWORD=YourPassword123!
 *   or:
 *     OWNER_AUTH_TOKEN=<jwt_token>
 * ==============================================================================
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load environment variables from .env with override to ensure correct project key
dotenv.config({ override: true });

// Helpers for dates
const formatDate = (d: Date): string => {
  return d.toISOString().split('T')[0];
};

const subDays = (d: Date, days: number): Date => {
  const result = new Date(d);
  result.setDate(result.getDate() - days);
  return result;
};

// Fixed deterministic UUIDs so test data can be idempotently inserted or cleaned up
const SUP_UUID = {
  meat: '11111111-2222-4000-8000-000000000001',
  dairy: '11111111-2222-4000-8000-000000000002',
  produce: '11111111-2222-4000-8000-000000000003',
  beverage: '11111111-2222-4000-8000-000000000004',
};

const ING_UUID = {
  // Meat
  merguez: '22222222-3333-4000-8000-000000000001',
  entrecote: '22222222-3333-4000-8000-000000000002',
  poulet: '22222222-3333-4000-8000-000000000003',
  loupDeMer: '22222222-3333-4000-8000-000000000004', // LOW STOCK
  // Dairy
  mozzarella: '22222222-3333-4000-8000-000000000005',
  parmesan: '22222222-3333-4000-8000-000000000006', // LOW STOCK
  cremeFraiche: '22222222-3333-4000-8000-000000000007',
  gorgonzola: '22222222-3333-4000-8000-000000000008',
  // Produce
  coulisTomate: '22222222-3333-4000-8000-000000000009',
  roquette: '22222222-3333-4000-8000-000000000010',
  pommesDeTerre: '22222222-3333-4000-8000-000000000011',
  champignons: '22222222-3333-4000-8000-000000000012', // LOW STOCK
  // Beverage
  siropSucre: '22222222-3333-4000-8000-000000000013',
  eauMinerale: '22222222-3333-4000-8000-000000000014',
  sodaCola: '22222222-3333-4000-8000-000000000015',
  // Alcohol
  vinRouge: '22222222-3333-4000-8000-000000000016',
  vodka: '22222222-3333-4000-8000-000000000017',
  biereBlonde: '22222222-3333-4000-8000-000000000018',
};

const MENU_UUID = {
  pizzaRoyale: '33333333-4444-4000-8000-000000000001',
  pizza4Fromages: '33333333-4444-4000-8000-000000000002',
  entrecoteGrillee: '33333333-4444-4000-8000-000000000003',
  paveLoupDeMer: '33333333-4444-4000-8000-000000000004',
  grilladesMixtes: '33333333-4444-4000-8000-000000000005',
  cocktailSignature: '33333333-4444-4000-8000-000000000006',
};

// 1. DATA DEFINITIONS
const TEST_SUPPLIERS = [
  {
    id: SUP_UUID.meat,
    name: 'Boucherie Centrale Provençale',
    contact: 'Laurent Rossi - 04 91 22 33 44 (laurent@boucherie-centrale.com)',
    notes: 'Fournisseur principal viandes rouges & volailles. Livraisons mardi et vendredi matin.',
  },
  {
    id: SUP_UUID.dairy,
    name: 'Fromagerie des Alpilles & Crèmerie',
    contact: 'Claire Delorme - 04 90 55 66 77 (commandes@alpilles-fromages.fr)',
    notes: 'Mozzarella Fior di Latte, Parmesan AOP 24 mois, Gorgonzola et crèmes fraîches.',
  },
  {
    id: SUP_UUID.produce,
    name: 'Primeurs & Maraîchers du Soleil',
    contact: 'Karim Mansouri - 06 12 34 56 78 (livraisons@primeursdusoleil.tn)',
    notes: 'Légumes frais de saison, herbes, roquette et pommes de terre. Livraisons quotidiennes.',
  },
  {
    id: SUP_UUID.beverage,
    name: 'Distributeur Boissons & Vins du Midi',
    contact: 'Marc Vasseur - 04 91 88 99 00 (contact@boissonsdumidi.com)',
    notes: 'Fûts de bière blonde 30L, vins en cubis & bouteilles AOP, spiritueux et sodas.',
  },
];

// 18 ingredients across all 5 requested categories with 3 low-stock items
const TEST_INGREDIENTS = [
  // MEAT
  {
    id: ING_UUID.merguez,
    name: 'Merguez de Taureau',
    unit: 'kg',
    category: 'meat',
    cost_per_unit: 12.500,
    current_stock: 9.000,
    min_alert_threshold: 6.000,
    location: 'Chambre Froide Viandes',
  },
  {
    id: ING_UUID.entrecote,
    name: 'Entrecôte Charolaise',
    unit: 'kg',
    category: 'meat',
    cost_per_unit: 26.000,
    current_stock: 7.500,
    min_alert_threshold: 5.000,
    location: 'Chambre Froide Viandes',
  },
  {
    id: ING_UUID.poulet,
    name: 'Blanc de Poulet Fermier',
    unit: 'kg',
    category: 'meat',
    cost_per_unit: 9.800,
    current_stock: 14.000,
    min_alert_threshold: 8.000,
    location: 'Chambre Froide Viandes',
  },
  {
    id: ING_UUID.loupDeMer,
    name: 'Filet de Loup de Mer',
    unit: 'kg',
    category: 'meat',
    cost_per_unit: 32.000,
    current_stock: 2.200, // ⚠️ DELIBERATELY LOW (< min 5.000)
    min_alert_threshold: 5.000,
    location: 'Chambre Froide Poissons',
  },
  // DAIRY
  {
    id: ING_UUID.mozzarella,
    name: 'Mozzarella Fior di Latte',
    unit: 'kg',
    category: 'dairy',
    cost_per_unit: 9.500,
    current_stock: 12.000,
    min_alert_threshold: 7.000,
    location: 'Chambre Froide Pizzeria',
  },
  {
    id: ING_UUID.parmesan,
    name: 'Parmesan Reggiano AOP 24M',
    unit: 'kg',
    category: 'dairy',
    cost_per_unit: 22.000,
    current_stock: 1.800, // ⚠️ DELIBERATELY LOW (< min 4.000)
    min_alert_threshold: 4.000,
    location: 'Chambre Froide Pizzeria',
  },
  {
    id: ING_UUID.cremeFraiche,
    name: 'Crème Fraîche Épaisse 35%',
    unit: 'L',
    category: 'dairy',
    cost_per_unit: 4.200,
    current_stock: 8.000,
    min_alert_threshold: 5.000,
    location: 'Chambre Froide Produits Laitiers',
  },
  {
    id: ING_UUID.gorgonzola,
    name: 'Gorgonzola Cremoso DOP',
    unit: 'kg',
    category: 'dairy',
    cost_per_unit: 14.500,
    current_stock: 4.500,
    min_alert_threshold: 3.000,
    location: 'Chambre Froide Pizzeria',
  },
  // PRODUCE
  {
    id: ING_UUID.coulisTomate,
    name: 'Coulis Tomate San Marzano',
    unit: 'kg',
    category: 'produce',
    cost_per_unit: 3.400,
    current_stock: 25.000,
    min_alert_threshold: 10.000,
    location: 'Réserve Sèche Pizzeria',
  },
  {
    id: ING_UUID.roquette,
    name: 'Roquette Sauvage Fraîche',
    unit: 'kg',
    category: 'produce',
    cost_per_unit: 6.500,
    current_stock: 3.800,
    min_alert_threshold: 2.000,
    location: 'Chambre Froide Légumes',
  },
  {
    id: ING_UUID.pommesDeTerre,
    name: 'Pommes de Terre Agata',
    unit: 'kg',
    category: 'produce',
    cost_per_unit: 1.200,
    current_stock: 45.000,
    min_alert_threshold: 15.000,
    location: 'Réserve Légumes Sèche',
  },
  {
    id: ING_UUID.champignons,
    name: 'Champignons de Paris Frais',
    unit: 'kg',
    category: 'produce',
    cost_per_unit: 5.800,
    current_stock: 1.100, // ⚠️ DELIBERATELY LOW (< min 3.500)
    min_alert_threshold: 3.500,
    location: 'Chambre Froide Légumes',
  },
  // BEVERAGE
  {
    id: ING_UUID.siropSucre,
    name: 'Sirop de Canne Artisanal',
    unit: 'L',
    category: 'beverage',
    cost_per_unit: 4.500,
    current_stock: 6.000,
    min_alert_threshold: 3.000,
    location: 'Bar Principal',
  },
  {
    id: ING_UUID.eauMinerale,
    name: 'Eau Minérale Naturelle 1L',
    unit: 'unit/piece',
    category: 'beverage',
    cost_per_unit: 0.850,
    current_stock: 96.000,
    min_alert_threshold: 36.000,
    location: 'Cave à Boissons',
  },
  {
    id: ING_UUID.sodaCola,
    name: 'Soda Artisanal Citron/Cola 33cl',
    unit: 'unit/piece',
    category: 'beverage',
    cost_per_unit: 1.100,
    current_stock: 72.000,
    min_alert_threshold: 24.000,
    location: 'Cave à Boissons',
  },
  // ALCOHOL
  {
    id: ING_UUID.vinRouge,
    name: 'Vin Rouge Côtes du Rhône AOP',
    unit: 'L',
    category: 'alcohol',
    cost_per_unit: 7.200,
    current_stock: 18.000,
    min_alert_threshold: 8.000,
    location: 'Cave du Bar',
  },
  {
    id: ING_UUID.vodka,
    name: 'Vodka Distillerie Premium 70cl',
    unit: 'L',
    category: 'alcohol',
    cost_per_unit: 19.500,
    current_stock: 5.200,
    min_alert_threshold: 3.000,
    location: 'Arrière-Bar Sécurisé',
  },
  {
    id: ING_UUID.biereBlonde,
    name: 'Fût de Bière Blonde 30L',
    unit: 'L',
    category: 'alcohol',
    cost_per_unit: 3.800,
    current_stock: 45.000,
    min_alert_threshold: 20.000,
    location: 'Cave Tirage Bière',
  },
];

// MENU ITEMS
const TEST_MENU_ITEMS = [
  {
    id: MENU_UUID.pizzaRoyale,
    name: 'Pizza La Grotte Royale',
    pos_reference: 'PIZ-ROY-01',
    category: 'Pizzas',
    selling_price: 24.500,
  },
  {
    id: MENU_UUID.pizza4Fromages,
    name: 'Pizza 4 Fromages Affinés',
    pos_reference: 'PIZ-4FR-02',
    category: 'Pizzas',
    selling_price: 22.000,
  },
  {
    id: MENU_UUID.entrecoteGrillee,
    name: "Entrecôte Grillée Maître d'Hôtel",
    pos_reference: 'PLT-ENT-03',
    category: 'Grillades',
    selling_price: 36.000,
  },
  {
    id: MENU_UUID.paveLoupDeMer,
    name: 'Pavé de Loup de Mer Rôti',
    pos_reference: 'PLT-POI-04',
    category: 'Poissons',
    selling_price: 38.000,
  },
  {
    id: MENU_UUID.grilladesMixtes,
    name: 'Assiette de Grillades Mixtes',
    pos_reference: 'PLT-GRI-05',
    category: 'Grillades',
    selling_price: 28.500,
  },
  {
    id: MENU_UUID.cocktailSignature,
    name: 'Cocktail Signature La Grotte',
    pos_reference: 'BAR-CKT-06',
    category: 'Cocktails & Bar',
    selling_price: 16.000,
  },
];

// RECIPES (BOM mapping)
const TEST_RECIPES = [
  // Pizza Royale: coulis (0.100 kg), mozzarella (0.200 kg), champignons (0.080 kg), merguez (0.120 kg)
  { menu_item_id: MENU_UUID.pizzaRoyale, ingredient_id: ING_UUID.coulisTomate, quantity_per_unit: 0.1000 },
  { menu_item_id: MENU_UUID.pizzaRoyale, ingredient_id: ING_UUID.mozzarella, quantity_per_unit: 0.2000 },
  { menu_item_id: MENU_UUID.pizzaRoyale, ingredient_id: ING_UUID.champignons, quantity_per_unit: 0.0800 },
  { menu_item_id: MENU_UUID.pizzaRoyale, ingredient_id: ING_UUID.merguez, quantity_per_unit: 0.1200 },

  // Pizza 4 Fromages: coulis (0.080 kg), mozzarella (0.150 kg), gorgonzola (0.070 kg), parmesan (0.050 kg)
  { menu_item_id: MENU_UUID.pizza4Fromages, ingredient_id: ING_UUID.coulisTomate, quantity_per_unit: 0.0800 },
  { menu_item_id: MENU_UUID.pizza4Fromages, ingredient_id: ING_UUID.mozzarella, quantity_per_unit: 0.1500 },
  { menu_item_id: MENU_UUID.pizza4Fromages, ingredient_id: ING_UUID.gorgonzola, quantity_per_unit: 0.0700 },
  { menu_item_id: MENU_UUID.pizza4Fromages, ingredient_id: ING_UUID.parmesan, quantity_per_unit: 0.0500 },

  // Entrecote: entrecote (0.300 kg), pommes de terre (0.250 kg)
  { menu_item_id: MENU_UUID.entrecoteGrillee, ingredient_id: ING_UUID.entrecote, quantity_per_unit: 0.3000 },
  { menu_item_id: MENU_UUID.entrecoteGrillee, ingredient_id: ING_UUID.pommesDeTerre, quantity_per_unit: 0.2500 },

  // Loup de Mer: loup (0.220 kg), roquette (0.050 kg), pommes de terre (0.200 kg)
  { menu_item_id: MENU_UUID.paveLoupDeMer, ingredient_id: ING_UUID.loupDeMer, quantity_per_unit: 0.2200 },
  { menu_item_id: MENU_UUID.paveLoupDeMer, ingredient_id: ING_UUID.roquette, quantity_per_unit: 0.0500 },
  { menu_item_id: MENU_UUID.paveLoupDeMer, ingredient_id: ING_UUID.pommesDeTerre, quantity_per_unit: 0.2000 },

  // Grillades Mixtes: merguez (0.180 kg), poulet (0.200 kg), pommes de terre (0.250 kg)
  { menu_item_id: MENU_UUID.grilladesMixtes, ingredient_id: ING_UUID.merguez, quantity_per_unit: 0.1800 },
  { menu_item_id: MENU_UUID.grilladesMixtes, ingredient_id: ING_UUID.poulet, quantity_per_unit: 0.2000 },
  { menu_item_id: MENU_UUID.grilladesMixtes, ingredient_id: ING_UUID.pommesDeTerre, quantity_per_unit: 0.2500 },

  // Cocktail: vodka (0.060 L), sirop (0.020 L), soda (1.0000 piece)
  { menu_item_id: MENU_UUID.cocktailSignature, ingredient_id: ING_UUID.vodka, quantity_per_unit: 0.0600 },
  { menu_item_id: MENU_UUID.cocktailSignature, ingredient_id: ING_UUID.siropSucre, quantity_per_unit: 0.0200 },
  { menu_item_id: MENU_UUID.cocktailSignature, ingredient_id: ING_UUID.sodaCola, quantity_per_unit: 1.0000 },
];

// Helper to generate 60 days of historical data
function generateHistoricalData(today: Date = new Date()) {
  const deliveries: Array<{
    ingredient_id: string;
    supplier_id: string;
    quantity: number;
    unit_cost: number;
    date: string;
    received_by: string;
    notes: string;
  }> = [];

  const stockCounts: Array<{
    ingredient_id: string;
    counted_quantity: number;
    date: string;
    shift: 'morning' | 'evening';
    counted_by: string;
    notes: string;
  }> = [];

  const sales: Array<{
    menu_item_id: string;
    quantity_sold: number;
    date: string;
    source: string;
  }> = [];

  const wasteLogs: Array<{
    ingredient_id: string;
    quantity: number;
    unit_cost_at_time: number;
    reason: 'spoilage' | 'spillage' | 'breakage' | 'staff_meal' | 'comp' | 'other';
    logged_by: string;
    date: string;
    shift: 'morning' | 'evening';
    notes: string;
  }> = [];

  // Map ingredient category to supplier
  const supplierByCategory: Record<string, string> = {
    meat: SUP_UUID.meat,
    dairy: SUP_UUID.dairy,
    produce: SUP_UUID.produce,
    beverage: SUP_UUID.beverage,
    alcohol: SUP_UUID.beverage,
  };

  // 1. Deliveries: Every 4 to 7 days over 60 days for each major ingredient
  const deliveryCadenceDays = [57, 50, 43, 36, 29, 22, 15, 8, 2];
  for (const dayOffset of deliveryCadenceDays) {
    const dStr = formatDate(subDays(today, dayOffset));
    for (const ing of TEST_INGREDIENTS) {
      const supId = supplierByCategory[ing.category] || SUP_UUID.produce;
      // Realistic delivered quantity
      let baseQty = ing.min_alert_threshold * (1.5 + ((dayOffset % 3) * 0.3));
      baseQty = Math.round(baseQty * 10) / 10;
      deliveries.push({
        ingredient_id: ing.id,
        supplier_id: supId,
        quantity: baseQty,
        unit_cost: ing.cost_per_unit,
        date: dStr,
        received_by: 'Karim Ben Salem',
        notes: `Livraison périodique BL-${dayOffset}-LG (${ing.name})`,
      });
    }
  }

  // 2. Stock Counts: Weekly inventories across the past 60 days
  const inventoryDayOffsets = [58, 51, 44, 37, 30, 23, 16, 9, 1];
  for (const dayOffset of inventoryDayOffsets) {
    const dStr = formatDate(subDays(today, dayOffset));
    for (const ing of TEST_INGREDIENTS) {
      // Historical counted quantity with subtle natural variance
      const varianceFactor = 0.95 + ((dayOffset % 7) * 0.02);
      let count = (dayOffset === 1) ? ing.current_stock : Math.round((ing.current_stock * varianceFactor) * 10) / 10;
      stockCounts.push({
        ingredient_id: ing.id,
        counted_quantity: Math.max(0.5, count),
        date: dStr,
        shift: dayOffset % 2 === 0 ? 'morning' : 'evening',
        counted_by: 'Karim Ben Salem',
        notes: `Inventaire régulier J-${dayOffset} - ${ing.location}`,
      });
    }
  }

  // 3. Sales: 60 days of sales across all 6 menu items with realistic day-of-week volume
  // (Friday, Saturday, Sunday higher than Mon/Tue)
  for (let d = 59; d >= 0; d--) {
    const currentDate = subDays(today, d);
    const dayOfWeek = currentDate.getDay(); // 0 is Sunday, 6 is Saturday, 5 is Friday
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 5 || dayOfWeek === 6;
    const multiplier = isWeekend ? 1.7 : 1.0;
    const dStr = formatDate(currentDate);

    // Pizza Royale: 12-28 / day
    const qtyRoyale = Math.round((12 + (d % 7) * 2) * multiplier);
    sales.push({ menu_item_id: MENU_UUID.pizzaRoyale, quantity_sold: qtyRoyale, date: dStr, source: 'Caisse Monastir' });

    // Pizza 4 Fromages: 8-20 / day
    const qty4Fr = Math.round((8 + (d % 5) * 2) * multiplier);
    sales.push({ menu_item_id: MENU_UUID.pizza4Fromages, quantity_sold: qty4Fr, date: dStr, source: 'Caisse Monastir' });

    // Entrecôte: 6-18 / day
    const qtyEnt = Math.round((6 + (d % 4) * 2) * multiplier);
    sales.push({ menu_item_id: MENU_UUID.entrecoteGrillee, quantity_sold: qtyEnt, date: dStr, source: 'Caisse Monastir' });

    // Loup de Mer: 4-14 / day
    const qtyLoup = Math.round((4 + (d % 3) * 2) * multiplier);
    sales.push({ menu_item_id: MENU_UUID.paveLoupDeMer, quantity_sold: qtyLoup, date: dStr, source: 'Caisse Monastir' });

    // Grillades Mixtes: 8-22 / day
    const qtyGrill = Math.round((8 + (d % 6) * 2) * multiplier);
    sales.push({ menu_item_id: MENU_UUID.grilladesMixtes, quantity_sold: qtyGrill, date: dStr, source: 'Caisse Monastir' });

    // Cocktail: 10-35 / day
    const qtyCocktail = Math.round((10 + (d % 8) * 3) * (isWeekend ? 2.2 : 1.0));
    sales.push({ menu_item_id: MENU_UUID.cocktailSignature, quantity_sold: qtyCocktail, date: dStr, source: 'Caisse Monastir' });
  }

  // 4. Waste Logs: Realistic recorded incidents across various dates and reasons
  const sampleWasteIncidents = [
    {
      ingId: ING_UUID.roquette,
      qty: 1.200,
      cost: 6.500,
      reason: 'spoilage' as const,
      dayOffset: 45,
      shift: 'morning' as const,
      notes: 'Humidité excessive bac réfrigéré légumerie',
    },
    {
      ingId: ING_UUID.vodka,
      qty: 0.700,
      cost: 19.500,
      reason: 'breakage' as const,
      dayOffset: 38,
      shift: 'evening' as const,
      notes: 'Bouteille glissée du rack bar pendant le rush',
    },
    {
      ingId: ING_UUID.cremeFraiche,
      qty: 1.000,
      cost: 4.200,
      reason: 'spillage' as const,
      dayOffset: 31,
      shift: 'morning' as const,
      notes: 'Renversement plan de travail préparation sauces',
    },
    {
      ingId: ING_UUID.poulet,
      qty: 1.500,
      cost: 9.800,
      reason: 'staff_meal' as const,
      dayOffset: 24,
      shift: 'morning' as const,
      notes: "Repas d'équipe service du midi (6 couverts)",
    },
    {
      ingId: ING_UUID.loupDeMer,
      qty: 0.440,
      cost: 32.000,
      reason: 'comp' as const,
      dayOffset: 17,
      shift: 'evening' as const,
      notes: 'Plat offert table 12 suite attente excessive',
    },
    {
      ingId: ING_UUID.mozzarella,
      qty: 0.800,
      cost: 9.500,
      reason: 'spoilage' as const,
      dayOffset: 10,
      shift: 'morning' as const,
      notes: 'Poche percée constatée lors du contrôle DLC',
    },
    {
      ingId: ING_UUID.champignons,
      qty: 0.600,
      cost: 5.800,
      reason: 'spoilage' as const,
      dayOffset: 3,
      shift: 'evening' as const,
      notes: 'Oxydation prématurée lot maraîcher',
    },
  ];

  for (const w of sampleWasteIncidents) {
    wasteLogs.push({
      ingredient_id: w.ingId,
      quantity: w.qty,
      unit_cost_at_time: w.cost,
      reason: w.reason,
      logged_by: 'Chef Marc',
      date: formatDate(subDays(today, w.dayOffset)),
      shift: w.shift,
      notes: w.notes,
    });
  }

  return { deliveries, stockCounts, sales, wasteLogs };
}

// 2. SQL SCRIPT GENERATOR FOR DIRECT SUPABASE SQL EDITOR EXECUTION
function generateSeedSqlFile(outputPath: string, today: Date = new Date()): void {
  const { deliveries, stockCounts, sales, wasteLogs } = generateHistoricalData(today);

  let sql = `-- ==============================================================================
-- ⚠️ LA GROTTE (MONASTIR) — 60-DAY REALISTIC TEST DATA SEED SCRIPT
-- WARNING: TEST DATA ONLY! DO NOT RUN AGAINST REAL RESTAURANT OPERATIONAL RECORDS!
-- Purpose: Populates 18 ingredients across all 5 categories (with 3 low-stock items),
--          4 suppliers, 6 menu items + BOM, ~60 days of deliveries & stock counts,
--          ~60 days of realistic sales, and detailed waste logs.
-- Run in: Supabase SQL Editor (https://supabase.com/dashboard/project/atcpmlaijqxvehuwacpc/sql/new)
-- ==============================================================================

BEGIN;

-- Ensure waste_logs table exists if migration has not been applied yet
CREATE TABLE IF NOT EXISTS public.waste_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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

-- 1. CLEANUP PREVIOUS TEST SEED ROWS (Safe Idempotency via deterministic IDs)
DELETE FROM public.waste_logs WHERE notes LIKE '%Inventaire%' OR notes LIKE '%Oxydation%' OR notes LIKE '%Humidité%' OR notes LIKE '%Bouteille%' OR notes LIKE '%Repas%';
DELETE FROM public.sales WHERE source = 'Caisse Monastir';
DELETE FROM public.recipe_ingredients WHERE menu_item_id IN ('${Object.values(MENU_UUID).join("', '")}');
DELETE FROM public.menu_items WHERE id IN ('${Object.values(MENU_UUID).join("', '")}');
DELETE FROM public.deliveries WHERE notes LIKE '%BL-%-LG%';
DELETE FROM public.stock_counts WHERE notes LIKE '%Inventaire régulier%';
DELETE FROM public.ingredients WHERE id IN ('${Object.values(ING_UUID).join("', '")}');
DELETE FROM public.suppliers WHERE id IN ('${Object.values(SUP_UUID).join("', '")}');

-- 2. SUPPLIERS
INSERT INTO public.suppliers (id, name, contact, notes) VALUES
${TEST_SUPPLIERS.map(s => `  ('${s.id}', '${s.name.replace(/'/g, "''")}', '${s.contact.replace(/'/g, "''")}', '${s.notes.replace(/'/g, "''")}')`).join(',\n')}
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, contact = EXCLUDED.contact, notes = EXCLUDED.notes;

-- 3. INGREDIENTS (18 items across all 5 categories, 3 low stock)
INSERT INTO public.ingredients (id, name, unit, category, cost_per_unit, current_stock, min_alert_threshold, location) VALUES
${TEST_INGREDIENTS.map(i => `  ('${i.id}', '${i.name.replace(/'/g, "''")}', '${i.unit}', '${i.category}', ${i.cost_per_unit}, ${i.current_stock}, ${i.min_alert_threshold}, '${i.location.replace(/'/g, "''")}')`).join(',\n')}
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name, unit = EXCLUDED.unit, category = EXCLUDED.category,
  cost_per_unit = EXCLUDED.cost_per_unit, current_stock = EXCLUDED.current_stock,
  min_alert_threshold = EXCLUDED.min_alert_threshold, location = EXCLUDED.location;

-- 4. MENU ITEMS
INSERT INTO public.menu_items (id, name, pos_reference, category, selling_price) VALUES
${TEST_MENU_ITEMS.map(m => `  ('${m.id}', '${m.name.replace(/'/g, "''")}', '${m.pos_reference}', '${m.category.replace(/'/g, "''")}', ${m.selling_price})`).join(',\n')}
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, pos_reference = EXCLUDED.pos_reference, category = EXCLUDED.category, selling_price = EXCLUDED.selling_price;

-- 5. RECIPE INGREDIENTS (BOM)
INSERT INTO public.recipe_ingredients (menu_item_id, ingredient_id, quantity_per_unit) VALUES
${TEST_RECIPES.map(r => `  ('${r.menu_item_id}', '${r.ingredient_id}', ${r.quantity_per_unit})`).join(',\n')}
ON CONFLICT (menu_item_id, ingredient_id) DO UPDATE SET quantity_per_unit = EXCLUDED.quantity_per_unit;

-- 6. DELIVERIES (~60 DAYS)
INSERT INTO public.deliveries (ingredient_id, supplier_id, quantity, unit_cost, date, received_by, notes) VALUES
${deliveries.map(d => `  ('${d.ingredient_id}', '${d.supplier_id}', ${d.quantity}, ${d.unit_cost}, '${d.date}', '${d.received_by.replace(/'/g, "''")}', '${d.notes.replace(/'/g, "''")}')`).join(',\n')};

-- 7. STOCK COUNTS (~60 DAYS)
INSERT INTO public.stock_counts (ingredient_id, counted_quantity, date, shift, counted_by, notes) VALUES
${stockCounts.map(sc => `  ('${sc.ingredient_id}', ${sc.counted_quantity}, '${sc.date}', '${sc.shift}', '${sc.counted_by.replace(/'/g, "''")}', '${sc.notes.replace(/'/g, "''")}')`).join(',\n')};

-- 8. SALES (~60 DAYS)
INSERT INTO public.sales (menu_item_id, quantity_sold, date, source) VALUES
${sales.map(s => `  ('${s.menu_item_id}', ${s.quantity_sold}, '${s.date}', '${s.source.replace(/'/g, "''")}')`).join(',\n')};

-- 9. WASTE LOGS
INSERT INTO public.waste_logs (ingredient_id, quantity, unit_cost_at_time, reason, logged_by, date, shift, notes) VALUES
${wasteLogs.map(w => `  ('${w.ingredient_id}', ${w.quantity}, ${w.unit_cost_at_time}, '${w.reason}', '${w.logged_by.replace(/'/g, "''")}', '${w.date}', '${w.shift}', '${w.notes.replace(/'/g, "''")}')`).join(',\n')};

COMMIT;

-- VERIFICATION SUMMARY
SELECT 
  (SELECT count(*) FROM public.suppliers WHERE id IN ('${Object.values(SUP_UUID).join("', '")}')) as suppliers_count,
  (SELECT count(*) FROM public.ingredients WHERE id IN ('${Object.values(ING_UUID).join("', '")}')) as ingredients_count,
  (SELECT count(*) FROM public.menu_items WHERE id IN ('${Object.values(MENU_UUID).join("', '")}')) as menu_items_count,
  (SELECT count(*) FROM public.recipe_ingredients WHERE menu_item_id IN ('${Object.values(MENU_UUID).join("', '")}')) as recipe_links_count,
  (SELECT count(*) FROM public.deliveries WHERE notes LIKE '%BL-%-LG%') as deliveries_count,
  (SELECT count(*) FROM public.stock_counts WHERE notes LIKE '%Inventaire régulier%') as stock_counts_count,
  (SELECT count(*) FROM public.sales WHERE source = 'Caisse Monastir') as sales_records_count,
  (SELECT count(*) FROM public.waste_logs WHERE logged_by = 'Chef Marc') as waste_logs_count,
  (SELECT count(*) FROM public.ingredients WHERE current_stock < min_alert_threshold) as low_stock_alerts_count;
`;

  fs.writeFileSync(outputPath, sql, 'utf-8');
  console.log(`\n📄 Generated Supabase SQL script at: ${outputPath}`);
}

// 3. MAIN RUNNER WITH OWNER AUTHENTICATION
async function main() {
  console.log('================================================================');
  console.log('🚀 LA GROTTE — TEST DATA SEEDING RUNNER');
  console.log('⚠️  WARNING: TEST DATA ONLY — DO NOT USE ON PRODUCTION DATABASE');
  console.log('================================================================\n');

  let rawUrl = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '').trim();
  if (rawUrl && !rawUrl.startsWith('http://') && !rawUrl.startsWith('https://')) {
    rawUrl = rawUrl.includes('.supabase.co') ? `https://${rawUrl}` : `https://${rawUrl}.supabase.co`;
  }
  const rawKey = (process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '').trim();

  // Always generate the SQL file first so developer has 1-click fallback
  const sqlFilePath = path.join(process.cwd(), 'supabase', 'test_seed_60days.sql');
  generateSeedSqlFile(sqlFilePath);

  if (!rawUrl || !rawKey) {
    console.error('❌ Supabase URL or Key not found in .env. Please configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
    process.exit(1);
  }

  const client: SupabaseClient = createClient(rawUrl, rawKey);

  // Authenticate as owner
  console.log('🔑 Authenticating as Owner...');
  const ownerEmail = process.env.OWNER_EMAIL || 'owner@lagrotte.tn';
  const ownerPassword = process.env.OWNER_PASSWORD || process.env.SEED_PASSWORD;
  const ownerAuthToken = process.env.OWNER_AUTH_TOKEN || process.env.SUPABASE_ACCESS_TOKEN;

  let authenticated = false;

  if (ownerAuthToken) {
    const { error: sessionError } = await client.auth.setSession({
      access_token: ownerAuthToken,
      refresh_token: '',
    });
    if (!sessionError) {
      console.log('✅ Authenticated via provided OWNER_AUTH_TOKEN');
      authenticated = true;
    } else {
      console.warn(`⚠️ Token auth failed: ${sessionError.message}`);
    }
  }

  if (!authenticated && ownerPassword) {
    const { data: signInData, error: signInError } = await client.auth.signInWithPassword({
      email: ownerEmail,
      password: ownerPassword,
    });
    if (signInData?.user && !signInError) {
      console.log(`✅ Successfully signed in as owner (${signInData.user.email})`);
      authenticated = true;
    } else {
      console.warn(`⚠️ Password sign in failed for ${ownerEmail}: ${signInError?.message}`);
    }
  }

  // If running in development without a pre-set owner session, check if we can insert directly or guide the user
  console.log('\n📊 Preparing dataset...');
  const today = new Date();
  const { deliveries, stockCounts, sales, wasteLogs } = generateHistoricalData(today);

  console.log(`- 4 Suppliers`);
  console.log(`- 18 Ingredients across 5 categories:`);
  console.log(`  • Meat: 4 items (1 low stock: Filet de Loup de Mer)`);
  console.log(`  • Dairy: 4 items (1 low stock: Parmesan Reggiano AOP)`);
  console.log(`  • Produce: 4 items (1 low stock: Champignons de Paris)`);
  console.log(`  • Beverage: 3 items`);
  console.log(`  • Alcohol: 3 items`);
  console.log(`- 6 Menu Items & Recipes (BOM)`);
  console.log(`- ${deliveries.length} Deliveries spanning past 60 days`);
  console.log(`- ${stockCounts.length} Stock Counts spanning past 60 days`);
  console.log(`- ${sales.length} Sales records across 60 days`);
  console.log(`- ${wasteLogs.length} Waste Logs spanning different reasons and dates`);

  // Attempt live insertion
  console.log('\n📡 Attempting insertion via Supabase Client...');
  try {
    // 1. Suppliers
    const { error: supErr } = await client.from('suppliers').upsert(TEST_SUPPLIERS);
    if (supErr) throw supErr;
    console.log('  ✓ 4 Suppliers upserted');

    // 2. Ingredients
    const { error: ingErr } = await client.from('ingredients').upsert(TEST_INGREDIENTS);
    if (ingErr) throw ingErr;
    console.log('  ✓ 18 Ingredients upserted (3 low-stock alert triggers set)');

    // 3. Menu Items
    const { error: menuErr } = await client.from('menu_items').upsert(TEST_MENU_ITEMS);
    if (menuErr) throw menuErr;
    console.log('  ✓ 6 Menu Items upserted');

    // 4. Recipes
    const { error: recErr } = await client.from('recipe_ingredients').upsert(TEST_RECIPES, {
      onConflict: 'menu_item_id,ingredient_id'
    });
    if (recErr) throw recErr;
    console.log(`  ✓ ${TEST_RECIPES.length} Recipe ingredients (BOM) mapped`);

    // 5. Deliveries (in batches of 50)
    for (let i = 0; i < deliveries.length; i += 50) {
      const batch = deliveries.slice(i, i + 50);
      const { error: delErr } = await client.from('deliveries').insert(batch);
      if (delErr) throw delErr;
    }
    console.log(`  ✓ ${deliveries.length} Historical deliveries inserted`);

    // 6. Stock Counts (in batches of 50)
    for (let i = 0; i < stockCounts.length; i += 50) {
      const batch = stockCounts.slice(i, i + 50);
      const { error: scErr } = await client.from('stock_counts').insert(batch);
      if (scErr) throw scErr;
    }
    console.log(`  ✓ ${stockCounts.length} Historical stock counts inserted`);

    // 7. Sales (in batches of 100)
    for (let i = 0; i < sales.length; i += 100) {
      const batch = sales.slice(i, i + 100);
      const { error: saleErr } = await client.from('sales').insert(batch);
      if (saleErr) throw saleErr;
    }
    console.log(`  ✓ ${sales.length} Daily sales records inserted`);

    // 8. Waste Logs
    const { error: wasteErr } = await client.from('waste_logs').insert(wasteLogs);
    if (wasteErr) {
      if (wasteErr.message?.includes('does not exist') || wasteErr.code === 'PGRST205' || wasteErr.message?.includes('schema cache')) {
        console.log(`  ℹ️  Table 'public.waste_logs' is pending migration in Supabase (run 20260913_waste_logs.sql to create it)`);
      } else {
        console.warn(`  ⚠️  Waste logs notice: ${wasteErr.message}`);
      }
    } else {
      console.log(`  ✓ ${wasteLogs.length} Waste logs inserted`);
    }

    console.log('\n================================================================');
    console.log('🎉 SUCCESS: Test dataset seeded directly into Supabase!');
    console.log('================================================================');
  } catch (err: any) {
    console.log('\nℹ️  Client Insertion Notice:');
    console.log(`   ${err.message || err}`);
    console.log('\n💡 Tip: Since RLS requires authenticated owner permissions:');
    console.log('   1. You can run the generated SQL script directly in the Supabase Dashboard:');
    console.log(`      File: supabase/test_seed_60days.sql`);
    console.log('      URL:  https://supabase.com/dashboard/project/atcpmlaijqxvehuwacpc/sql/new');
    console.log('   2. Or pass your owner login credentials:');
    console.log('      OWNER_EMAIL="owner@lagrotte.tn" OWNER_PASSWORD="YourPassword" npm run seed:test-data');
    console.log('   3. Or pass an active session token:');
    console.log('      OWNER_AUTH_TOKEN="<token>" npm run seed:test-data');
  }
}

main().catch(err => {
  console.error('Fatal error during seed execution:', err);
  process.exit(1);
});
