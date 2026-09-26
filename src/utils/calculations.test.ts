import { describe, it, expect } from 'vitest';
import {
  calculateTheoreticalUsage,
  calculateActualUsage,
  calculateKnownWaste,
  generateVarianceReport,
  correlateLossForIngredient,
  generateSuggestedPurchaseOrders,
} from './calculations';
import {
  Ingredient,
  MenuItem,
  RecipeIngredient,
  Delivery,
  StockCount,
  Sale,
  Staff,
  AccessLog,
  PosVoid,
  WasteLog,
} from '../types';

describe('calculations.ts — Test Suite for La Grotte Food Cost & Variance Engine', () => {
  const mockIngredients: Ingredient[] = [
    {
      id: 'ing-thon',
      name: 'Thon Rouge Frais de Mahdia',
      unit: 'kg',
      category: 'seafood',
      cost_per_unit: 42.5,
      current_stock: 12.5,
      location: 'Chambre Froide Poissons',
    },
    {
      id: 'ing-unlinked',
      name: 'Ingrédient Sans Recette',
      unit: 'kg',
      category: 'dry goods',
      cost_per_unit: 10.0,
      current_stock: 5.0,
      location: 'Réserve Épicerie',
    },
  ];

  const mockMenuItems: MenuItem[] = [
    {
      id: 'menu-salade-thon',
      name: 'Salade Royale au Thon Frais',
      category: 'starters',
      selling_price: 28.0,
      pos_reference: 'POS-001',
    },
  ];

  const mockRecipes: RecipeIngredient[] = [
    {
      id: 'rec-1',
      menu_item_id: 'menu-salade-thon',
      ingredient_id: 'ing-thon',
      quantity_per_unit: 0.2, // 200g per portion
    },
  ];

  describe('calculateTheoreticalUsage', () => {
    it('calculates theoretical usage accurately based on sales volume and BOM recipes', () => {
      const sales: Sale[] = [
        {
          id: 'sale-1',
          menu_item_id: 'menu-salade-thon',
          quantity_sold: 25,
          date: '2026-09-02',
          source: 'POS Export',
        },
      ];

      // 25 portions * 0.200 kg = 5.000 kg
      const usage = calculateTheoreticalUsage('ing-thon', sales, mockRecipes);
      expect(usage).toBe(5.0);
    });

    it('edge case: zero sales in period returns 0', () => {
      const sales: Sale[] = [];
      const usage = calculateTheoreticalUsage('ing-thon', sales, mockRecipes);
      expect(usage).toBe(0);
    });

    it('edge case: ingredient with no recipe links at all returns 0', () => {
      const sales: Sale[] = [
        {
          id: 'sale-1',
          menu_item_id: 'menu-salade-thon',
          quantity_sold: 50,
          date: '2026-09-02',
          source: 'POS Export',
        },
      ];
      const usage = calculateTheoreticalUsage('ing-unlinked', sales, mockRecipes);
      expect(usage).toBe(0);
    });
  });

  describe('calculateActualUsage', () => {
    it('computes actual consumption: opening + deliveries - closing', () => {
      // 10kg opening + 20kg deliveries - 12kg closing = 18kg actual usage
      const actual = calculateActualUsage(10, 20, 12);
      expect(actual).toBe(18);
    });

    it('edge case: handles negative variance / under-usage (closing > opening + deliveries)', () => {
      // e.g. Count found 35kg when starting with 10kg and 20kg delivered (inventory surplus / count correction)
      const actual = calculateActualUsage(10, 20, 35);
      expect(actual).toBe(-5);
    });
  });

  describe('generateVarianceReport', () => {
    it('edge case: delivery that falls exactly on period boundary dates (startDate & endDate inclusive)', () => {
      const deliveries: Delivery[] = [
        {
          id: 'del-start',
          ingredient_id: 'ing-thon',
          supplier_id: 'sup-1',
          quantity: 10,
          unit_cost: 42.5,
          date: '2026-09-01', // Exact start boundary
          received_by: 'stf-1',
        },
        {
          id: 'del-end',
          ingredient_id: 'ing-thon',
          supplier_id: 'sup-1',
          quantity: 15,
          unit_cost: 42.5,
          date: '2026-09-07', // Exact end boundary
          received_by: 'stf-1',
        },
        {
          id: 'del-outside',
          ingredient_id: 'ing-thon',
          supplier_id: 'sup-1',
          quantity: 50,
          unit_cost: 42.5,
          date: '2026-09-10', // Outside period
          received_by: 'stf-1',
        },
      ];

      const counts: StockCount[] = [
        {
          id: 'cnt-1',
          ingredient_id: 'ing-thon',
          counted_quantity: 5,
          date: '2026-09-01',
          shift: 'morning',
          counted_by: 'Chef',
        },
        {
          id: 'cnt-2',
          ingredient_id: 'ing-thon',
          counted_quantity: 10,
          date: '2026-09-07',
          shift: 'evening',
          counted_by: 'Chef',
        },
      ];

      const reports = generateVarianceReport(
        [mockIngredients[0]],
        mockMenuItems,
        mockRecipes,
        deliveries,
        counts,
        [],
        '2026-09-01',
        '2026-09-07'
      );

      expect(reports).toHaveLength(1);
      // Both start and end deliveries (10 + 15 = 25) must be included, excluding del-outside
      expect(reports[0].deliveries_in_period).toBe(25);
    });

    it('edge case: stock count that predates the period start date is picked as opening count', () => {
      const counts: StockCount[] = [
        {
          id: 'cnt-pre',
          ingredient_id: 'ing-thon',
          counted_quantity: 14.2,
          date: '2026-08-31', // Before period start 2026-09-01
          shift: 'evening',
          counted_by: 'Manager',
        },
        {
          id: 'cnt-close',
          ingredient_id: 'ing-thon',
          counted_quantity: 8.0,
          date: '2026-09-07',
          shift: 'evening',
          counted_by: 'Manager',
        },
      ];

      const reports = generateVarianceReport(
        [mockIngredients[0]],
        mockMenuItems,
        mockRecipes,
        [],
        counts,
        [],
        '2026-09-01',
        '2026-09-07'
      );

      expect(reports[0].opening_stock).toBe(14.2);
      expect(reports[0].closing_stock).toBe(8.0);
      expect(reports[0].actual_usage).toBe(6.2); // 14.2 - 8.0
    });

    it('edge case: division-by-zero protection when theoretical_usage is 0 with positive usage', () => {
      // Opening = 10, Deliveries = 0, Closing = 5 => Actual usage = 5.
      // Sales = 0 => Theoretical usage = 0.
      const counts: StockCount[] = [
        {
          id: 'c-1',
          ingredient_id: 'ing-unlinked',
          counted_quantity: 10,
          date: '2026-09-01',
          shift: 'morning',
          counted_by: 'Manager',
        },
        {
          id: 'c-2',
          ingredient_id: 'ing-unlinked',
          counted_quantity: 5,
          date: '2026-09-07',
          shift: 'evening',
          counted_by: 'Manager',
        },
      ];

      const reports = generateVarianceReport(
        [mockIngredients[1]],
        mockMenuItems,
        mockRecipes,
        [],
        counts,
        [],
        '2026-09-01',
        '2026-09-07'
      );

      expect(reports[0].theoretical_usage).toBe(0);
      expect(reports[0].actual_usage).toBe(5);
      expect(reports[0].variance_quantity).toBe(5);
      // Division by zero protection: should return 100%, never NaN or Infinity
      expect(Number.isFinite(reports[0].variance_percentage)).toBe(true);
      expect(reports[0].variance_percentage).toBe(100);
      expect(isNaN(reports[0].variance_percentage)).toBe(false);
    });

    it('edge case: negative variance (under-usage) assigns correct status', () => {
      // Opening = 10, Deliveries = 0, Closing = 8 => Actual = 2
      // Sales = 20 portions of 0.2kg => Theoretical = 4
      // Variance = 2 - 4 = -2kg
      const counts: StockCount[] = [
        {
          id: 'c-1',
          ingredient_id: 'ing-thon',
          counted_quantity: 10,
          date: '2026-09-01',
          shift: 'morning',
          counted_by: 'Chef',
        },
        {
          id: 'c-2',
          ingredient_id: 'ing-thon',
          counted_quantity: 8,
          date: '2026-09-07',
          shift: 'evening',
          counted_by: 'Chef',
        },
      ];

      const sales: Sale[] = [
        {
          id: 's-1',
          menu_item_id: 'menu-salade-thon',
          quantity_sold: 20, // 20 * 0.2 = 4kg
          date: '2026-09-03',
          source: 'POS Export',
        },
      ];

      const reports = generateVarianceReport(
        [mockIngredients[0]],
        mockMenuItems,
        mockRecipes,
        [],
        counts,
        sales,
        '2026-09-01',
        '2026-09-07'
      );

      expect(reports[0].variance_quantity).toBe(-2);
      expect(reports[0].status).toBe('under_usage');
    });
  });

  describe('correlateLossForIngredient', () => {
    it('returns a clean "no anomaly" summary when ingredient has zero variance, avoiding false positives', () => {
      const reports = generateVarianceReport(
        [mockIngredients[0]],
        mockMenuItems,
        mockRecipes,
        [],
        [
          {
            id: 'c-1',
            ingredient_id: 'ing-thon',
            counted_quantity: 10,
            date: '2026-09-01',
            shift: 'morning',
            counted_by: 'Chef',
          },
          {
            id: 'c-2',
            ingredient_id: 'ing-thon',
            counted_quantity: 8,
            date: '2026-09-07',
            shift: 'evening',
            counted_by: 'Chef',
          },
        ],
        [
          {
            id: 's-1',
            menu_item_id: 'menu-salade-thon',
            quantity_sold: 10, // 10 * 0.2 = 2kg => exactly matches actual 10 - 8 = 2kg
            date: '2026-09-03',
            source: 'POS Export',
          },
        ],
        '2026-09-01',
        '2026-09-07'
      );

      const staff: Staff[] = [
        { id: 'stf-1', name: 'Karim Mansour', role: 'cook', active: true },
      ];
      const logs: AccessLog[] = [];
      const posVoids: PosVoid[] = [];

      const correlation = correlateLossForIngredient(
        'ing-thon',
        reports,
        [],
        logs,
        posVoids,
        staff,
        mockMenuItems,
        mockRecipes
      );

      expect(correlation.varianceCost).toBe(0);
      expect(correlation.varianceQuantity).toBe(0);
      expect(correlation.severity).toBe('low');
      expect(correlation.financial_loss).toBe(0);
      expect(correlation.correlationSummary).toContain('Aucun coulage anormal détecté');
    });
  });

  describe('calculateKnownWaste', () => {
    it('sums quantity * unit_cost_at_time for the specified ingredient and period', () => {
      const wasteLogs: WasteLog[] = [
        {
          id: 'w-1',
          ingredient_id: 'ing-thon',
          quantity: 2,
          unit_cost_at_time: 42.5,
          reason: 'spoilage',
          logged_by: 'Chef',
          date: '2026-09-03',
          shift: 'morning',
        },
        {
          id: 'w-2',
          ingredient_id: 'ing-thon',
          quantity: 1,
          unit_cost_at_time: 42.5,
          reason: 'spillage',
          logged_by: 'Cook',
          date: '2026-09-05',
          shift: 'evening',
        },
        {
          id: 'w-3',
          ingredient_id: 'ing-other',
          quantity: 5,
          unit_cost_at_time: 10,
          reason: 'breakage',
          logged_by: 'Cook',
          date: '2026-09-04',
          shift: 'evening',
        },
        {
          id: 'w-4',
          ingredient_id: 'ing-thon',
          quantity: 3,
          unit_cost_at_time: 42.5,
          reason: 'staff_meal',
          logged_by: 'Chef',
          date: '2026-09-15', // outside period
          shift: 'evening',
        },
      ];

      // 2 * 42.5 + 1 * 42.5 = 85 + 42.5 = 127.5
      const totalCost = calculateKnownWaste('ing-thon', wasteLogs, '2026-09-01', '2026-09-07');
      expect(totalCost).toBe(127.5);
    });

    it('returns 0 when no waste is logged for the ingredient in period', () => {
      expect(calculateKnownWaste('ing-thon', [], '2026-09-01', '2026-09-07')).toBe(0);
    });
  });

  describe('Known Waste and Unexplained Variance Status Logic', () => {
    // Setup an ingredient with high raw variance:
    // Opening 20, Deliveries 0, Closing 10 => Actual = 10kg
    // Theoretical = 2kg (10 sales * 0.2)
    // Raw Variance Quantity = 8kg, Cost = 8 * 42.5 = 340 DT (> 25 DT, normally critical_loss)
    const counts: StockCount[] = [
      {
        id: 'c-1',
        ingredient_id: 'ing-thon',
        counted_quantity: 20,
        date: '2026-09-01',
        shift: 'morning',
        counted_by: 'Chef',
      },
      {
        id: 'c-2',
        ingredient_id: 'ing-thon',
        counted_quantity: 10,
        date: '2026-09-07',
        shift: 'evening',
        counted_by: 'Chef',
      },
    ];

    const sales: Sale[] = [
      {
        id: 's-1',
        menu_item_id: 'menu-salade-thon',
        quantity_sold: 10, // 10 * 0.2 = 2kg
        date: '2026-09-03',
        source: 'POS Export',
      },
    ];

    it('a variance fully explained by logged waste should not flag as critical even if raw variance is high', () => {
      // 8kg waste logged at 42.5 DT = 340 DT
      const wasteLogs: WasteLog[] = [
        {
          id: 'w-1',
          ingredient_id: 'ing-thon',
          quantity: 8,
          unit_cost_at_time: 42.5,
          reason: 'spoilage',
          logged_by: 'Chef',
          date: '2026-09-04',
          shift: 'morning',
          notes: 'Frigo en panne pendant la nuit',
        },
      ];

      const reports = generateVarianceReport(
        [mockIngredients[0]],
        mockMenuItems,
        mockRecipes,
        [],
        counts,
        sales,
        '2026-09-01',
        '2026-09-07',
        wasteLogs
      );

      expect(reports[0].variance_cost).toBe(340);
      expect(reports[0].known_waste_cost).toBe(340);
      expect(reports[0].unexplained_variance_cost).toBe(0);
      // Even though raw variance cost is 340 DT, unexplained is 0, so status must NOT be critical_loss
      expect(reports[0].status).not.toBe('critical_loss');
      expect(reports[0].status).toBe('normal');
    });

    it('a variance partially explained reflects reduced unexplained loss and adjusted status', () => {
      // 7.7kg logged as waste (327.25 DT), leaving 0.3kg unexplained = 12.75 DT
      // 12.75 DT is between 8 and 25 DT => moderate_loss (downgraded from critical_loss)
      const wasteLogs: WasteLog[] = [
        {
          id: 'w-1',
          ingredient_id: 'ing-thon',
          quantity: 7.7,
          unit_cost_at_time: 42.5,
          reason: 'breakage',
          logged_by: 'Chef',
          date: '2026-09-04',
          shift: 'morning',
        },
      ];

      const reports = generateVarianceReport(
        [mockIngredients[0]],
        mockMenuItems,
        mockRecipes,
        [],
        counts,
        sales,
        '2026-09-01',
        '2026-09-07',
        wasteLogs
      );

      expect(reports[0].variance_cost).toBe(340);
      expect(reports[0].known_waste_cost).toBe(327.25);
      expect(reports[0].unexplained_variance_cost).toBe(12.75);
      expect(reports[0].status).toBe('moderate_loss');
    });

    it('a variance with zero logged waste has unexplained equal to the full variance and flags as critical', () => {
      const reports = generateVarianceReport(
        [mockIngredients[0]],
        mockMenuItems,
        mockRecipes,
        [],
        counts,
        sales,
        '2026-09-01',
        '2026-09-07',
        [] // No waste logs
      );

      expect(reports[0].variance_cost).toBe(340);
      expect(reports[0].known_waste_cost).toBe(0);
      expect(reports[0].unexplained_variance_cost).toBe(340);
      expect(reports[0].status).toBe('critical_loss');
    });
  });

  describe('generateSuggestedPurchaseOrders', () => {
    const testIngredients: Ingredient[] = [
      {
        id: 'ing-meat-1',
        name: 'Merguez de Taureau',
        unit: 'kg',
        category: 'meat',
        cost_per_unit: 12.0,
        current_stock: 4.0, // <= threshold (5.0) -> needs reorder
        min_alert_threshold: 5.0,
      },
      {
        id: 'ing-dairy-1',
        name: 'Mozzarella Fior di Latte',
        unit: 'kg',
        category: 'dairy',
        cost_per_unit: 9.2,
        current_stock: 3.0, // <= threshold (6.0) -> needs reorder
        min_alert_threshold: 6.0,
      },
      {
        id: 'ing-sufficient',
        name: 'Coulis Tomate San Marzano',
        unit: 'kg',
        category: 'produce',
        cost_per_unit: 3.5,
        current_stock: 20.0, // > threshold (8.0) -> OK
        min_alert_threshold: 8.0,
      },
      {
        id: 'ing-no-history',
        name: 'Épices Sahariennes Rares',
        unit: 'kg',
        category: 'dry goods',
        cost_per_unit: 35.0,
        current_stock: 0.5, // <= threshold (2.0), but no deliveries ever logged!
        min_alert_threshold: 2.0,
      },
      {
        id: 'ing-null-threshold',
        name: 'Glaçons Spéciaux',
        unit: 'kg',
        category: 'other',
        cost_per_unit: 1.0,
        current_stock: 0.0,
        min_alert_threshold: undefined, // null/undefined threshold
      },
    ];

    const testDeliveries: Delivery[] = [
      // Older delivery from old supplier
      {
        id: 'del-old',
        ingredient_id: 'ing-meat-1',
        supplier_id: 'sup-ancient',
        quantity: 5.0,
        unit_cost: 11.5,
        date: '2026-08-10',
        received_by: 'Karim',
      },
      // Most recent delivery for ing-meat-1 from sup-boucherie
      {
        id: 'del-recent-meat',
        ingredient_id: 'ing-meat-1',
        supplier_id: 'sup-boucherie',
        quantity: 10.0,
        unit_cost: 12.0,
        date: '2026-09-10',
        received_by: 'Karim',
      },
      // Recent delivery for ing-dairy-1 from sup-fromagerie
      {
        id: 'del-recent-dairy',
        ingredient_id: 'ing-dairy-1',
        supplier_id: 'sup-fromagerie',
        quantity: 15.0,
        unit_cost: 9.5,
        date: '2026-09-11',
        received_by: 'Karim',
      },
      // Delivery for sufficient ingredient
      {
        id: 'del-produce',
        ingredient_id: 'ing-sufficient',
        supplier_id: 'sup-maraicher',
        quantity: 20.0,
        unit_cost: 3.5,
        date: '2026-09-08',
        received_by: 'Karim',
      },
    ];

    it('an ingredient below threshold with a delivery history groups correctly by its last supplier', () => {
      const orders = generateSuggestedPurchaseOrders(testIngredients, testDeliveries);

      // Should have orders for sup-boucherie and sup-fromagerie
      expect(orders).toHaveLength(2);

      const meatOrder = orders.find(o => o.supplier_id === 'sup-boucherie');
      expect(meatOrder).toBeDefined();
      expect(meatOrder?.items).toHaveLength(1);
      expect(meatOrder?.items[0].ingredient_id).toBe('ing-meat-1');
      // suggested_quantity: (5.0 * 2) - 4.0 = 6.0
      expect(meatOrder?.items[0].suggested_quantity).toBe(6.0);
      expect(meatOrder?.items[0].unit_cost).toBe(12.0);

      const dairyOrder = orders.find(o => o.supplier_id === 'sup-fromagerie');
      expect(dairyOrder).toBeDefined();
      expect(dairyOrder?.items).toHaveLength(1);
      expect(dairyOrder?.items[0].ingredient_id).toBe('ing-dairy-1');
      // suggested_quantity: (6.0 * 2) - 3.0 = 9.0
      expect(dairyOrder?.items[0].suggested_quantity).toBe(9.0);
      expect(dairyOrder?.items[0].unit_cost).toBe(9.5);
    });

    it('an ingredient with no delivery history at all is excluded (can\'t assign a supplier) rather than crashing', () => {
      const orders = generateSuggestedPurchaseOrders(
        [
          {
            id: 'ing-orphan',
            name: 'Huile Inconnue',
            unit: 'L',
            category: 'other',
            cost_per_unit: 15.0,
            current_stock: 1.0,
            min_alert_threshold: 10.0,
          },
        ],
        [] // No deliveries at all
      );

      // Must not crash and must exclude orphan ingredient
      expect(orders).toEqual([]);
    });

    it('an ingredient with min_alert_threshold null is skipped entirely', () => {
      const orders = generateSuggestedPurchaseOrders(
        [
          {
            id: 'ing-null-1',
            name: 'Sel Marin',
            unit: 'kg',
            category: 'dry goods',
            cost_per_unit: 0.5,
            current_stock: 0.0,
            min_alert_threshold: undefined, // null/undefined
          },
          {
            id: 'ing-null-2',
            name: 'Poivre Gris',
            unit: 'kg',
            category: 'dry goods',
            cost_per_unit: 20.0,
            current_stock: 0.0,
            min_alert_threshold: null as unknown as undefined,
          },
        ],
        testDeliveries
      );

      // Both must be skipped entirely
      expect(orders).toEqual([]);
    });
  });

  describe('Edge-case Financial Integrity & Formatting', () => {
    it('accurately calculates net unexplained loss when known waste logs exist', () => {
      const ingredient: Ingredient = {
        id: 'ing-loup',
        name: 'Filet de Loup de Mer',
        unit: 'kg',
        category: 'seafood',
        cost_per_unit: 38.0,
        current_stock: 5.0,
      };

      const waste: WasteLog[] = [
        {
          id: 'w-1',
          ingredient_id: 'ing-loup',
          quantity: 0.5,
          unit_cost_at_time: 38.0,
          reason: 'spoilage',
          logged_by: 'Chef Marc',
          date: '2026-09-03',
          shift: 'morning',
        },
      ];

      const knownWasteCost = calculateKnownWaste('ing-loup', waste, '2026-09-01', '2026-09-07');
      expect(knownWasteCost).toBe(19.0); // 0.5kg * 38 DT = 19.0 DT
    });

    it('handles zero theoretical usage with positive actual usage cleanly', () => {
      // Ingredient was consumed (e.g. 2kg) but 0 sales were rung up on POS (100% loss/theft)
      const reports = generateVarianceReport(
        [
          {
            id: 'ing-boukha',
            name: 'Boukha Bokobsa Prestige',
            unit: 'L',
            category: 'alcohol',
            cost_per_unit: 45.0,
            current_stock: 8.0,
          },
        ],
        [],
        [],
        [],
        [
          { id: 'c-1', ingredient_id: 'ing-boukha', counted_quantity: 10.0, date: '2026-09-01', shift: 'morning', counted_by: 'stf-1' },
          { id: 'c-2', ingredient_id: 'ing-boukha', counted_quantity: 8.0, date: '2026-09-07', shift: 'evening', counted_by: 'stf-1' },
        ],
        [], // 0 sales
        '2026-09-01',
        '2026-09-07',
        []
      );

      expect(reports).toHaveLength(1);
      expect(reports[0].actual_usage).toBe(2.0); // 10.0 - 8.0 = 2.0L
      expect(reports[0].theoretical_usage).toBe(0.0);
      expect(reports[0].variance_quantity).toBe(2.0);
      expect(reports[0].variance_cost).toBe(90.0); // 2.0 * 45 DT
      expect(reports[0].variance_percentage).toBe(100);
      expect(reports[0].status).toBe('critical_loss');
    });
  });
});
