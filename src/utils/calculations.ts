import { 
  Ingredient, 
  MenuItem, 
  RecipeIngredient, 
  Delivery, 
  StockCount, 
  Sale, 
  IngredientVarianceReport, 
  CategoryVarianceSummary, 
  CategoryType,
  Staff,
  AccessLog,
  PosVoid,
  LossCorrelationReport,
  WasteLog
} from '../types';

export interface DateFilterPeriod {
  startDate?: string;
  endDate?: string;
  label: string;
}

export function calculateTheoreticalUsage(
  ingredientId: string,
  sales: Sale[],
  recipes: RecipeIngredient[]
): number {
  let theoreticalUsage = 0;

  // Find all recipe links for this ingredient
  const recipeLinks = recipes.filter(r => r.ingredient_id === ingredientId);

  for (const link of recipeLinks) {
    // Find all sales for this menu item
    const relevantSales = sales.filter(s => s.menu_item_id === link.menu_item_id);
    const totalSold = relevantSales.reduce((acc, s) => acc + s.quantity_sold, 0);
    theoreticalUsage += totalSold * link.quantity_per_unit;
  }

  return Number(theoreticalUsage.toFixed(3));
}

export function calculateActualUsage(
  openingStock: number,
  deliveries: number,
  closingStock: number
): number {
  const actual = openingStock + deliveries - closingStock;
  return Number(actual.toFixed(3));
}

export function calculateKnownWaste(
  ingredientId: string,
  wasteLogs: WasteLog[],
  periodStart?: string,
  periodEnd?: string
): number {
  if (!Array.isArray(wasteLogs)) return 0;

  const relevantLogs = wasteLogs.filter(w =>
    w &&
    w.ingredient_id === ingredientId &&
    (!periodStart || !w.date || w.date >= periodStart) &&
    (!periodEnd || !w.date || w.date <= periodEnd)
  );

  const total = relevantLogs.reduce(
    (sum, w) => sum + (Number(w.quantity) || 0) * (Number(w.unit_cost_at_time) || 0),
    0
  );

  return Number(total.toFixed(2));
}

export function generateVarianceReport(
  ingredients: Ingredient[],
  menuItems: MenuItem[],
  recipes: RecipeIngredient[],
  deliveries: Delivery[],
  stockCounts: StockCount[],
  sales: Sale[],
  startDate: string = '2026-09-01',
  endDate: string = '2026-09-07',
  wasteLogs: WasteLog[] = []
): IngredientVarianceReport[] {
  if (!Array.isArray(ingredients)) return [];
  const safeDeliveries = Array.isArray(deliveries) ? deliveries : [];
  const safeStockCounts = Array.isArray(stockCounts) ? stockCounts : [];
  const safeSales = Array.isArray(sales) ? sales : [];
  const safeRecipes = Array.isArray(recipes) ? recipes : [];
  const safeWasteLogs = Array.isArray(wasteLogs) ? wasteLogs : [];

  return ingredients
    .filter((ing): ing is Ingredient => Boolean(ing && ing.id))
    .map(ingredient => {
      // 1. Deliveries during period
      const relevantDeliveries = safeDeliveries.filter(d => 
        d && d.ingredient_id === ingredient.id &&
        (!startDate || (d.date && d.date >= startDate)) &&
        (!endDate || (d.date && d.date <= endDate))
      );
      const deliveriesInPeriod = relevantDeliveries.reduce((sum, d) => sum + (d?.quantity || 0), 0);

      // 2. Counts:
      // Opening count: the count on or just before startDate (or earliest count)
      const countsForIngredient = safeStockCounts
        .filter(c => c && c.ingredient_id === ingredient.id)
        .sort((a, b) => (a?.date || '').localeCompare(b?.date || ''));

      let openingCount = countsForIngredient.find(c => c.date && c.date <= startDate);
      if (!openingCount && countsForIngredient.length > 0) {
        openingCount = countsForIngredient[0];
      }
      const openingStock = openingCount ? (openingCount.counted_quantity || 0) : 0;

      // Closing count: latest count on or before endDate, or fallback to current_stock
      const closingCounts = countsForIngredient.filter(c => !endDate || (c.date && c.date <= endDate));
      const closingCount = closingCounts.length > 0 ? closingCounts[closingCounts.length - 1] : null;
      const closingStock = closingCount ? (closingCount.counted_quantity || 0) : (ingredient.current_stock || 0);

      // 3. Actual usage: Opening + Deliveries - Closing
      const actualUsage = calculateActualUsage(openingStock, deliveriesInPeriod, closingStock);

      // 4. Sales in period
      const relevantSales = safeSales.filter(s => 
        (!startDate || (s.date && s.date >= startDate)) && 
        (!endDate || (s.date && s.date <= endDate))
      );

      // 5. Theoretical usage
      const theoreticalUsage = calculateTheoreticalUsage(ingredient.id, relevantSales, safeRecipes);

      // 6. Variance
      const varianceQuantity = Number((actualUsage - theoreticalUsage).toFixed(3));
      const varianceCost = Number((varianceQuantity * (ingredient.cost_per_unit || 0)).toFixed(2));
      
      let variancePercentage = 0;
      if (theoreticalUsage > 0) {
        variancePercentage = Number(((varianceQuantity / theoreticalUsage) * 100).toFixed(1));
      } else if (varianceQuantity > 0) {
        variancePercentage = 100;
      }

      // 7. Known waste & unexplained variance
      const knownWasteCost = calculateKnownWaste(ingredient.id, safeWasteLogs, startDate, endDate);
      const unexplainedVarianceCost = Number((varianceCost - knownWasteCost).toFixed(2));

      // Status classification driven by unexplained_variance_cost
      let status: 'normal' | 'moderate_loss' | 'critical_loss' | 'under_usage' = 'normal';

      if (unexplainedVarianceCost > 25) {
        status = 'critical_loss';
      } else if (unexplainedVarianceCost > 8) {
        status = 'moderate_loss';
      } else if (variancePercentage < -2 && unexplainedVarianceCost <= 0) {
        status = 'under_usage';
      }

      return {
        ingredient,
        opening_stock: Number(openingStock.toFixed(2)),
        deliveries_in_period: Number(deliveriesInPeriod.toFixed(2)),
        closing_stock: Number(closingStock.toFixed(2)),
        actual_usage: Number(actualUsage.toFixed(2)),
        theoretical_usage: Number(theoreticalUsage.toFixed(2)),
        variance_quantity: varianceQuantity,
        variance_cost: varianceCost,
        known_waste_cost: knownWasteCost,
        unexplained_variance_cost: unexplainedVarianceCost,
        variance_percentage: variancePercentage,
        status,
      };
    });
}

export function summarizeByCategory(
  reports: IngredientVarianceReport[]
): CategoryVarianceSummary[] {
  const categoryMap: Partial<Record<CategoryType, CategoryVarianceSummary>> = {};
  if (!Array.isArray(reports)) return [];

  for (const rep of reports) {
    if (!rep || !rep.ingredient) continue;
    const cat = rep.ingredient.category || 'other';
    if (!categoryMap[cat]) {
      categoryMap[cat] = {
        category: cat,
        total_theoretical_cost: 0,
        total_actual_cost: 0,
        total_variance_cost: 0,
        items_count: 0,
        high_loss_items: 0,
      };
    }

    const summary = categoryMap[cat]!;
    summary.items_count += 1;
    const costPerUnit = rep.ingredient.cost_per_unit || 0;
    summary.total_theoretical_cost += (rep.theoretical_usage || 0) * costPerUnit;
    summary.total_actual_cost += (rep.actual_usage || 0) * costPerUnit;
    summary.total_variance_cost += rep.variance_cost || 0;
    summary.total_known_waste_cost = (summary.total_known_waste_cost || 0) + (rep.known_waste_cost || 0);
    summary.total_unexplained_variance_cost = (summary.total_unexplained_variance_cost || 0) + (rep.unexplained_variance_cost || 0);
    if (rep.status === 'critical_loss' || rep.status === 'moderate_loss') {
      summary.high_loss_items += 1;
    }
  }

  return Object.values(categoryMap).map(s => ({
    ...s,
    total_theoretical_cost: Number(s.total_theoretical_cost.toFixed(2)),
    total_actual_cost: Number(s.total_actual_cost.toFixed(2)),
    total_variance_cost: Number(s.total_variance_cost.toFixed(2)),
    total_known_waste_cost: Number((s.total_known_waste_cost || 0).toFixed(2)),
    total_unexplained_variance_cost: Number((s.total_unexplained_variance_cost || 0).toFixed(2)),
  })).sort((a, b) => (b.total_unexplained_variance_cost ?? b.total_variance_cost) - (a.total_unexplained_variance_cost ?? a.total_variance_cost));
}

export function formatCurrency(amount?: number | null): string {
  const safe = typeof amount === 'number' && !isNaN(amount) ? amount : 0;
  return `${safe.toFixed(2)} DT`;
}

export function formatQuantity(amount?: number | null, unit: string = ''): string {
  const safe = typeof amount === 'number' && !isNaN(amount) ? amount : 0;
  return `${safe % 1 === 0 ? safe : safe.toFixed(2)} ${unit}`.trim();
}

export function correlateLossForIngredient(
  ingredientIdOrReport: string | IngredientVarianceReport,
  varianceReportsOrRecipes: IngredientVarianceReport[] | RecipeIngredient[],
  stockCountsOrMenuItems?: StockCount[] | MenuItem[],
  accessLogs?: AccessLog[],
  posVoids?: PosVoid[],
  staffList?: Staff[],
  menuItems?: MenuItem[],
  recipes?: RecipeIngredient[]
): LossCorrelationReport {
  let targetIngredientId: string = '';
  let safeReports: IngredientVarianceReport[] = [];
  let safeStockCounts: StockCount[] = [];
  let safeAccessLogs: AccessLog[] = [];
  let safePosVoids: PosVoid[] = [];
  let safeStaffList: Staff[] = [];
  let safeMenuItems: MenuItem[] = [];
  let safeRecipes: RecipeIngredient[] = [];

  // Determine if called with (ingredientId, varianceReports, stockCounts, accessLogs, posVoids, staffList, menuItems, recipes)
  // or with legacy signature (varianceReport, recipes, menuItems, accessLogs, posVoids, staff, ...)
  if (typeof ingredientIdOrReport === 'string') {
    targetIngredientId = ingredientIdOrReport;
    safeReports = Array.isArray(varianceReportsOrRecipes) ? (varianceReportsOrRecipes as IngredientVarianceReport[]) : [];
    safeStockCounts = Array.isArray(stockCountsOrMenuItems) ? (stockCountsOrMenuItems as StockCount[]) : [];
    safeAccessLogs = Array.isArray(accessLogs) ? accessLogs : [];
    safePosVoids = Array.isArray(posVoids) ? posVoids : [];
    safeStaffList = Array.isArray(staffList) ? staffList : [];
    safeMenuItems = Array.isArray(menuItems) ? menuItems : [];
    safeRecipes = Array.isArray(recipes) ? recipes : [];
  } else if (ingredientIdOrReport && typeof ingredientIdOrReport === 'object') {
    // Called with varianceReport as first argument
    const rep = ingredientIdOrReport as IngredientVarianceReport;
    targetIngredientId = rep.ingredient?.id || '';
    safeReports = [rep];
    safeRecipes = Array.isArray(varianceReportsOrRecipes) ? (varianceReportsOrRecipes as RecipeIngredient[]) : [];
    safeMenuItems = Array.isArray(stockCountsOrMenuItems) ? (stockCountsOrMenuItems as MenuItem[]) : [];
    safeAccessLogs = Array.isArray(accessLogs) ? accessLogs : [];
    safePosVoids = Array.isArray(posVoids) ? posVoids : [];
    safeStaffList = Array.isArray(staffList) ? staffList : [];
  }

  const report = safeReports.find(r => r?.ingredient?.id === targetIngredientId);
  const ingredient: Ingredient = report?.ingredient || {
    id: targetIngredientId || 'ing-unknown',
    name: 'Ingrédient',
    unit: 'kg',
    category: 'meat',
    cost_per_unit: 0,
    current_stock: 0,
    location: 'Chambre Froide Viandes',
  } as Ingredient;

  const varianceCost = report ? (report.variance_cost || 0) : 0;
  const varianceQuantity = report ? (report.variance_quantity || 0) : 0;
  const unit = ingredient.unit || 'kg';
  const location = ingredient.location || 'Réserve Principale';

  // 1. Find counts related to this ingredient
  const ingredientCounts = safeStockCounts
    .filter(c => c && c.ingredient_id === targetIngredientId)
    .sort((a, b) => (a?.date || '').localeCompare(b?.date || ''));

  const suspiciousShifts = ingredientCounts.map(c => ({
    date: c.date || '',
    shift: (c.shift || 'evening') as 'morning' | 'evening',
    counted_by: c.counted_by || 'Personnel',
    quantity: c.counted_quantity || 0,
  }));

  // 2. Identify staff with access to this ingredient's storage location
  const locationAccessLogs = safeAccessLogs.filter(log => 
    log && log.location && (
      log.location.toLowerCase().includes(location.toLowerCase()) ||
      location.toLowerCase().includes(log.location.toLowerCase())
    )
  );

  const staffAccessMap = new Map<string, { staff: Staff; count: number; lastTime: string }>();
  for (const log of locationAccessLogs) {
    if (!log) continue;
    const staffId = log.staff_id || '';
    const stf = safeStaffList.find(s => s && (s.id === staffId || (s.name && s.name.toLowerCase() === staffId.toLowerCase())));
    const staffObj: Staff = stf || {
      id: staffId || 'stf-unknown',
      name: log.staff_name || staffId || 'Personnel',
      role: 'cook',
      roleTitle: 'Personnel',
      active: true,
    };
    const current = staffAccessMap.get(staffObj.id) || { staff: staffObj, count: 0, lastTime: log.timestamp_in || '' };
    current.count += 1;
    if ((log.timestamp_in || '') > current.lastTime) {
      current.lastTime = log.timestamp_in || '';
    }
    staffAccessMap.set(staffObj.id, current);
  }

  const staffWithAccess = Array.from(staffAccessMap.values()).map(item => ({
    staff: item.staff,
    entriesCount: item.count,
    lastEntry: item.lastTime,
  })).sort((a, b) => b.entriesCount - a.entriesCount);

  // 3. Find menu items using this ingredient
  const linkedRecipes = safeRecipes.filter(r => r && r.ingredient_id === targetIngredientId);
  const linkedMenuItemIds = new Set(linkedRecipes.map(r => r.menu_item_id).filter(Boolean));

  // 4. Find POS voids / discounts on these dishes
  const matchingVoids = safePosVoids.filter(v => v && linkedMenuItemIds.has(v.menu_item_id));
  const relatedVoids = matchingVoids.map(v => {
    const menuItem = safeMenuItems.find(m => m && m.id === v.menu_item_id);
    const stf = safeStaffList.find(s => s && (s.id === v.staff_id || (s.name && s.name.toLowerCase() === (v.staff_id || '').toLowerCase())));
    return {
      voidItem: v,
      menuItemName: menuItem?.name || 'Plat inconnu',
      staffName: stf?.name || v.staff_name || v.staff_id || 'Personnel',
    };
  });

  const totalVoidLoss = matchingVoids.reduce((sum, v) => sum + (v.amount || 0), 0);

  // 5. Suspected leak vectors analysis
  const suspectedLeakVectors: string[] = [];
  if (matchingVoids.length > 0) {
    suspectedLeakVectors.push(
      `Annulations & offerts POS récurrents (${matchingVoids.length} opérations pour ${formatCurrency(totalVoidLoss)}) sur les plats intégrant cet ingrédient.`
    );
  }
  if (staffWithAccess.length > 0) {
    const afterHourEntries = locationAccessLogs.filter(l => {
      const ts = l.timestamp || l.timestamp_in || '';
      const timePart = ts.includes(' ') ? ts.split(' ')[1] : (ts.includes('T') ? ts.split('T')[1] : '');
      const hour = parseInt(timePart.split(':')[0] || '12', 10);
      return hour >= 23 || hour < 6;
    });
    if (afterHourEntries.length > 0) {
      suspectedLeakVectors.push(
        `Accès nocturnes ou fin de service détectés dans la zone '${location}' (${afterHourEntries.length} passage(s)).`
      );
    }
  }
  if (varianceCost > 20) {
    suspectedLeakVectors.push(
      `Écart supérieur au seuil d'alerte critique (> ${formatCurrency(20)}). Risque de non-pesée en livraison ou de coulage direct.`
    );
  } else if (varianceCost > 5) {
    suspectedLeakVectors.push(
      `Écart modéré pouvant indiquer un surdosage en cuisine ou des portions supérieures à la fiche technique.`
    );
  }

  // 6. Correlation summary
  let correlationSummary = '';
  if (varianceCost > 0) {
    const voidStaffNames = Array.from(new Set(relatedVoids.map(r => r.staffName))).join(', ');
    const accessStaffNames = staffWithAccess.map(s => s.staff.name).slice(0, 3).join(', ');
    
    correlationSummary = `L'analyse croisée du coulage sur '${ingredient.name}' révèle un écart de ${formatQuantity(varianceQuantity, unit)} représentant une perte de ${formatCurrency(varianceCost)}. ` +
      (matchingVoids.length > 0 
        ? `Une corrélation directe est constatée avec ${matchingVoids.length} annulation(s)/offert(s) POS (${voidStaffNames}). `
        : `Aucune anomalie POS directe relevée sur les plats associés. `) +
      (staffWithAccess.length > 0
        ? `Accès physique à la zone '${location}' enregistré pour : ${accessStaffNames}.`
        : `Aucun badgeage spécifique enregistré dans la zone '${location}'.`);
  } else {
    correlationSummary = `Aucun coulage anormal détecté sur '${ingredient.name}'. Consommation conforme aux fiches techniques.`;
  }

  let severity: 'critical' | 'moderate' | 'low' = 'low';
  const varPct = report?.variance_percentage ?? 0;
  if (varianceCost >= 20 || varPct > 8) {
    severity = 'critical';
  } else if (varianceCost >= 5 || varPct > 2) {
    severity = 'moderate';
  }

  // Build shifts analysis
  const shifts_analysis = ingredientCounts.map((c, idx) => {
    const prevCount = idx > 0 ? ingredientCounts[idx - 1].counted_quantity : c.counted_quantity;
    const delta = Number(((c.counted_quantity || 0) - (prevCount || 0)).toFixed(2));
    return {
      date: c.date || '',
      shift: (c.shift || 'evening') as 'morning' | 'evening',
      staff: c.counted_by || 'Personnel',
      quantity: c.counted_quantity || 0,
      delta,
    };
  });

  // Build correlated POS voids
  const correlated_pos_voids: PosVoid[] = matchingVoids.map(v => {
    const menuItem = safeMenuItems.find(m => m && m.id === v.menu_item_id);
    const stf = safeStaffList.find(s => s && (s.id === v.staff_id || (s.name && s.name.toLowerCase() === (v.staff_id || '').toLowerCase())));
    return {
      ...v,
      item_name: v.item_name || menuItem?.name || 'Plat',
      staff_name: v.staff_name || stf?.name || v.staff_id || 'Personnel',
      timestamp: v.timestamp || v.date || '',
    };
  });

  // Build correlated access logs
  const correlated_access_logs: AccessLog[] = locationAccessLogs.map(l => {
    const stf = safeStaffList.find(s => s && (s.id === l.staff_id || (s.name && s.name.toLowerCase() === (l.staff_id || '').toLowerCase())));
    return {
      ...l,
      staff_name: l.staff_name || stf?.name || l.staff_id || 'Personnel',
      timestamp: l.timestamp || l.timestamp_in || '',
    };
  });

  // Suspected vectors array with known keys
  const suspected_vectors: string[] = [];
  if (matchingVoids.length > 0) {
    suspected_vectors.push('pos_void_pattern');
  }
  const afterHourEntries = locationAccessLogs.filter(l => {
    const ts = l.timestamp || l.timestamp_in || '';
    const timePart = ts.includes(' ') ? ts.split(' ')[1] : (ts.includes('T') ? ts.split('T')[1] : '');
    const hour = parseInt(timePart.split(':')[0] || '12', 10);
    return hour >= 23 || hour < 6;
  });
  if (afterHourEntries.length > 0) {
    suspected_vectors.push('unsupervised_access');
  }
  if (varianceCost > 15) {
    suspected_vectors.push('delivery_discrepancy');
  }
  if (varianceCost > 5 || varPct > 3 || suspected_vectors.length === 0) {
    suspected_vectors.push('overportioning_waste');
  }
  const suspected_loss_vectors = [...suspected_vectors];

  return {
    ingredientId: targetIngredientId,
    ingredientName: ingredient.name,
    category: ingredient.category,
    varianceCost,
    varianceQuantity,
    unit,
    location,
    severity,
    theoretical_usage: report?.theoretical_usage ?? 0,
    actual_usage: report?.actual_usage ?? 0,
    missing_quantity: Math.max(0, varianceQuantity),
    variance_percentage: varPct,
    financial_loss: Math.max(0, varianceCost),
    suspected_vectors,
    suspected_loss_vectors,
    shifts_analysis,
    correlated_pos_voids,
    correlated_access_logs,
    suspiciousShifts,
    staffWithAccess,
    relatedVoids,
    totalVoidLoss,
    correlationSummary,
    suspectedLeakVectors,
  };
}

/**
 * Scans ingredients where current_stock <= min_alert_threshold,
 * finds each one's most recent delivery to determine its usual supplier,
 * and groups results into one draft purchase order per supplier.
 */
export function generateSuggestedPurchaseOrders(
  ingredients: Ingredient[],
  deliveries: Delivery[]
): {
  supplier_id: string;
  items: {
    ingredient_id: string;
    suggested_quantity: number;
    unit_cost: number;
  }[];
}[] {
  if (!Array.isArray(ingredients) || !Array.isArray(deliveries)) {
    return [];
  }

  // Filter ingredients where min_alert_threshold is defined/not null, and current_stock <= min_alert_threshold
  const lowStockIngredients = ingredients.filter(
    ing =>
      Boolean(ing && ing.id) &&
      ing.min_alert_threshold !== null &&
      ing.min_alert_threshold !== undefined &&
      typeof ing.current_stock === 'number' &&
      typeof ing.min_alert_threshold === 'number' &&
      ing.current_stock <= ing.min_alert_threshold
  );

  const supplierMap = new Map<
    string,
    { ingredient_id: string; suggested_quantity: number; unit_cost: number }[]
  >();

  for (const ing of lowStockIngredients) {
    // Find all deliveries for this ingredient
    const ingDeliveries = deliveries.filter(d => Boolean(d && d.ingredient_id === ing.id && d.supplier_id));
    if (ingDeliveries.length === 0) {
      // Excluded: cannot determine supplier without delivery history
      continue;
    }

    // Sort deliveries by date descending to find the most recent
    const sortedDeliveries = [...ingDeliveries].sort((a, b) => {
      const dateA = a.date ? new Date(a.date).getTime() : 0;
      const dateB = b.date ? new Date(b.date).getTime() : 0;
      return dateB - dateA;
    });

    const mostRecent = sortedDeliveries[0];
    if (!mostRecent || !mostRecent.supplier_id) {
      continue;
    }

    const supplierId = mostRecent.supplier_id;
    // Default suggested_quantity to (min_alert_threshold * 2) - current_stock, floored at 0
    const rawSuggested = (ing.min_alert_threshold! * 2) - ing.current_stock;
    const suggestedQuantity = Math.max(0, Number(rawSuggested.toFixed(3)));
    const unitCost = typeof mostRecent.unit_cost === 'number' && mostRecent.unit_cost > 0
      ? mostRecent.unit_cost
      : (ing.cost_per_unit || 0);

    if (!supplierMap.has(supplierId)) {
      supplierMap.set(supplierId, []);
    }

    supplierMap.get(supplierId)!.push({
      ingredient_id: ing.id,
      suggested_quantity: suggestedQuantity,
      unit_cost: unitCost,
    });
  }

  return Array.from(supplierMap.entries()).map(([supplier_id, items]) => ({
    supplier_id,
    items,
  }));
}
