import React, { useState, useMemo } from 'react';
import { 
  FileSpreadsheet, 
  TrendingDown, 
  Download, 
  Printer, 
  Layers, 
  PieChart, 
  BarChart3, 
  Calendar,
  CheckCircle2,
  DollarSign,
  Package,
  Trash2,
  ChevronRight
} from 'lucide-react';
import { useStock } from '../context/StockContext';
import { formatCurrency, formatQuantity } from '../utils/calculations';
import { CategoryType } from '../types';

const CATEGORY_NAMES: Record<CategoryType, string> = {
  meat: 'Viandes & Grillades',
  dairy: 'Produits Laitiers & Fromages',
  alcohol: 'Vins, Spiritueux & Bar',
  beverage: 'Boissons & Jus Frais',
  produce: 'Légumes & Fruits du Marché',
  'dry goods': 'Épicerie Sèche & Féculents',
  bakery: 'Boulangerie & Pâtisserie',
  seafood: 'Poissons Frais & Fruits de Mer',
  other: 'Autres Ingrédients',
};

export const ReportsView: React.FC = () => {
  const {
    ingredients,
    varianceReports,
    categorySummaries,
    totalLossCost,
    totalTheoreticalCost,
    totalActualCost,
    wasteLogs,
    deliveries,
    selectedPeriod,
  } = useStock();

  const [activeReportTab, setActiveReportTab] = useState<'loss' | 'valuation' | 'consumption' | 'waste'>('loss');

  // 1. Total Stock Valuation by Category
  const valuationByCategory = useMemo(() => {
    const map: Record<string, { totalValue: number; count: number }> = {};
    ingredients.forEach(ing => {
      const cat = ing.category || 'other';
      if (!map[cat]) map[cat] = { totalValue: 0, count: 0 };
      map[cat].totalValue += ing.current_stock * ing.cost_per_unit;
      map[cat].count += 1;
    });
    return Object.entries(map).map(([cat, data]) => ({
      category: cat as CategoryType,
      name: CATEGORY_NAMES[cat as CategoryType] || cat,
      ...data,
    })).sort((a, b) => b.totalValue - a.totalValue);
  }, [ingredients]);

  const totalStockValuation = useMemo(() => {
    return ingredients.reduce((sum, ing) => sum + (ing.current_stock * ing.cost_per_unit), 0);
  }, [ingredients]);

  // 2. Waste by Reason
  const wasteByReason = useMemo(() => {
    const map: Record<string, { cost: number; count: number }> = {};
    wasteLogs.forEach(w => {
      const reason = w.reason || 'other';
      if (!map[reason]) map[reason] = { cost: 0, count: 0 };
      map[reason].cost += w.quantity * w.unit_cost_at_time;
      map[reason].count += 1;
    });
    return map;
  }, [wasteLogs]);

  // Export CSV Handler
  const handleExportCSV = () => {
    const headers = [
      'Ingrédient',
      'Catégorie',
      'Unité',
      'Coût Unitaire (DT)',
      'Stock Actuel',
      'Valeur Stock (DT)',
      'Conso Théorique',
      'Conso Réelle',
      'Écart Quantité',
      'Perte Estimée (DT)',
    ];

    const rows = varianceReports.map(r => [
      `"${r.ingredient?.name || ''}"`,
      r.ingredient?.category || '',
      r.ingredient?.unit || '',
      (r.ingredient?.cost_per_unit || 0).toFixed(2),
      (r.ingredient?.current_stock || 0).toFixed(2),
      ((r.ingredient?.current_stock || 0) * (r.ingredient?.cost_per_unit || 0)).toFixed(2),
      (r.theoretical_usage || 0).toFixed(2),
      (r.actual_usage || 0).toFixed(2),
      (r.variance_quantity || 0).toFixed(2),
      (r.variance_cost || 0).toFixed(2),
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `la-grotte-rapport-matiere-${selectedPeriod.startDate}-${selectedPeriod.endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 sm:space-y-8 pb-12">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-sand p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <FileSpreadsheet className="w-4 h-4 text-terracotta" />
            <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
              Rapports & États de Gestion Financière
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-navy tracking-tight">
            Rapports & Analyses d'Exploitation
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Bilan des coûts matières, valorisation comptable des stocks et décomposition du coulage.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="px-3.5 py-2 bg-cream hover:bg-linen text-navy border border-sand rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-2xs"
          >
            <Printer className="w-4 h-4 text-slate-600" />
            <span>Imprimer</span>
          </button>
          <button
            onClick={handleExportCSV}
            className="px-4 py-2 bg-navy hover:bg-navy-mid text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <Download className="w-4 h-4 text-terracotta" />
            <span>Exporter CSV</span>
          </button>
        </div>
      </div>

      {/* Segmented Sub-Navigation */}
      <div className="flex items-center gap-1 p-1 bg-white rounded-2xl border border-sand shadow-2xs overflow-x-auto">
        {[
          { id: 'loss' as const, label: 'Bilan Coulage & Pertes' },
          { id: 'valuation' as const, label: 'Valorisation des Stocks' },
          { id: 'consumption' as const, label: 'Ratios Consommation Théorique vs Réelle' },
          { id: 'waste' as const, label: 'Registre des Freintes & Casses' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveReportTab(tab.id)}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap ${
              activeReportTab === tab.id
                ? 'bg-navy text-white shadow-xs'
                : 'text-slate-600 hover:text-navy hover:bg-cream/60'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* REPORT CONTENT 1: BILAN COULAGE & PERTES */}
      {activeReportTab === 'loss' && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl border border-sand p-5 shadow-2xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                Conso Théorique Totale
              </span>
              <p className="text-2xl font-bold font-mono tabular-nums text-navy">
                {formatCurrency(totalTheoreticalCost)}
              </p>
              <p className="text-xs text-slate-500 mt-1">Calculée selon les fiches techniques</p>
            </div>

            <div className="bg-white rounded-2xl border border-sand p-5 shadow-2xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                Conso Réelle Totale
              </span>
              <p className="text-2xl font-bold font-mono tabular-nums text-navy">
                {formatCurrency(totalActualCost)}
              </p>
              <p className="text-xs text-slate-500 mt-1">Constatée lors des inventaires</p>
            </div>

            <div className="bg-rose-50/70 border border-rose-200 rounded-2xl p-5 shadow-2xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-rose-800 block mb-1">
                Perte Nette / Coulage
              </span>
              <p className="text-2xl font-bold font-mono tabular-nums text-alert">
                +{formatCurrency(totalLossCost)}
              </p>
              <p className="text-xs text-rose-700 mt-1">
                {totalTheoreticalCost > 0 ? ((totalLossCost / totalTheoreticalCost) * 100).toFixed(1) : 0}% de surconsommation
              </p>
            </div>
          </div>

          {/* Breakdown Table by Category */}
          <div className="bg-white rounded-2xl border border-sand p-5 shadow-xs">
            <h3 className="text-sm font-bold text-navy uppercase tracking-wider mb-4">
              Pertes & Écarts Matières par Rayon
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-sand text-[11px] uppercase tracking-wider font-bold text-slate-500">
                    <th className="py-2.5 px-3">Rayon</th>
                    <th className="py-2.5 px-3 text-right">Articles</th>
                    <th className="py-2.5 px-3 text-right">Coût Théorique</th>
                    <th className="py-2.5 px-3 text-right">Coût Réel</th>
                    <th className="py-2.5 px-3 text-right">Écart (DT)</th>
                    <th className="py-2.5 px-3 text-right">Impact Coulage</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-sand/40">
                  {categorySummaries.map(cat => (
                    <tr key={cat.category} className="hover:bg-cream/40 transition-colors">
                      <td className="py-3 px-3 font-bold text-navy">
                        {CATEGORY_NAMES[cat.category] || cat.category}
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-600">
                        {cat.items_count}
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-600">
                        {formatCurrency(cat.total_theoretical_cost)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums font-semibold text-navy">
                        {formatCurrency(cat.total_actual_cost)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums">
                        <span className={`font-bold ${cat.total_variance_cost > 0 ? 'text-alert' : 'text-slate-600'}`}>
                          {cat.total_variance_cost > 0 ? `+${formatCurrency(cat.total_variance_cost)}` : formatCurrency(cat.total_variance_cost)}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                          cat.total_variance_cost > 50 ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {cat.total_theoretical_cost > 0 
                            ? `${((cat.total_variance_cost / cat.total_theoretical_cost) * 100).toFixed(1)}%` 
                            : '0%'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* REPORT CONTENT 2: VALORISATION DES STOCKS */}
      {activeReportTab === 'valuation' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-sand p-5 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Valorisation Comptable Totale
              </span>
              <p className="text-2xl sm:text-3xl font-bold font-mono tabular-nums text-navy mt-1">
                {formatCurrency(totalStockValuation)}
              </p>
            </div>
            <div className="text-right text-xs text-slate-500">
              <p className="font-bold text-navy">{ingredients.length} articles en stock</p>
              <p>Méthode : Dernier Prix d'Achat (PAMP)</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {valuationByCategory.map(cat => (
              <div key={cat.category} className="bg-white rounded-2xl border border-sand p-4 shadow-2xs flex flex-col justify-between">
                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">
                    {cat.name}
                  </span>
                  <p className="text-xl font-bold font-mono tabular-nums text-navy mt-1">
                    {formatCurrency(cat.totalValue)}
                  </p>
                </div>
                <div className="mt-3 pt-2 border-t border-sand flex items-center justify-between text-xs text-slate-500">
                  <span>{cat.count} références</span>
                  <span className="font-mono tabular-nums font-semibold">
                    {totalStockValuation > 0 ? ((cat.totalValue / totalStockValuation) * 100).toFixed(1) : 0}% du stock
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* REPORT CONTENT 3: RATIOS CONSOMMATION */}
      {activeReportTab === 'consumption' && (
        <div className="bg-white rounded-2xl border border-sand p-5 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-navy uppercase tracking-wider">
            Écarts Détaillés par Ingrédient
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-sand text-[11px] uppercase tracking-wider font-bold text-slate-500">
                  <th className="py-2.5 px-3">Ingrédient</th>
                  <th className="py-2.5 px-3 text-right">Stock Départ</th>
                  <th className="py-2.5 px-3 text-right">Réceptions</th>
                  <th className="py-2.5 px-3 text-right">Stock Final</th>
                  <th className="py-2.5 px-3 text-right">Conso Réelle</th>
                  <th className="py-2.5 px-3 text-right">Conso Théorique</th>
                  <th className="py-2.5 px-3 text-right">Écart Quantité</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sand/40">
                {varianceReports.map(r => (
                  <tr key={r.ingredient.id} className="hover:bg-cream/40 transition-colors">
                    <td className="py-3 px-3 font-bold text-navy">
                      {r.ingredient.name}
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-600">
                      {formatQuantity(r.opening_stock, r.ingredient.unit)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-600">
                      +{formatQuantity(r.deliveries_in_period, r.ingredient.unit)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-600">
                      {formatQuantity(r.closing_stock, r.ingredient.unit)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums font-semibold text-navy">
                      {formatQuantity(r.actual_usage, r.ingredient.unit)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-600">
                      {formatQuantity(r.theoretical_usage, r.ingredient.unit)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums">
                      <span className={`font-bold ${r.variance_quantity > 0 ? 'text-alert' : 'text-slate-600'}`}>
                        {r.variance_quantity > 0 ? `+${r.variance_quantity}` : r.variance_quantity} {r.ingredient.unit}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* REPORT CONTENT 4: REGISTRE DES FREINTES & CASSES */}
      {activeReportTab === 'waste' && (
        <div className="bg-white rounded-2xl border border-sand p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-navy uppercase tracking-wider">
                Registre Historique des Pertes Déclarées
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Historique des coulages justifiés, avaries et casses déclarées par l'équipe.
              </p>
            </div>
            <span className="font-mono font-bold text-sm text-navy">
              Total : {formatCurrency(wasteLogs.reduce((sum, w) => sum + (w.quantity * w.unit_cost_at_time), 0))}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-sand text-[11px] uppercase tracking-wider font-bold text-slate-500">
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Ingrédient</th>
                  <th className="py-2.5 px-3">Motif Déclaré</th>
                  <th className="py-2.5 px-3">Déclaré Par</th>
                  <th className="py-2.5 px-3 text-right">Quantité</th>
                  <th className="py-2.5 px-3 text-right">Coût Perte</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sand/40">
                {wasteLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      Aucune perte déclarée sur cette période.
                    </td>
                  </tr>
                ) : (
                  wasteLogs.map(w => {
                    const ing = ingredients.find(i => i.id === w.ingredient_id);
                    return (
                      <tr key={w.id} className="hover:bg-cream/40 transition-colors">
                        <td className="py-3 px-3 font-mono text-slate-500">{w.date}</td>
                        <td className="py-3 px-3 font-bold text-navy">{ing?.name || 'Ingrédient'}</td>
                        <td className="py-3 px-3 text-slate-700 capitalize">{w.reason}</td>
                        <td className="py-3 px-3 text-slate-600">{w.logged_by}</td>
                        <td className="py-3 px-3 text-right font-mono tabular-nums font-semibold">
                          {formatQuantity(w.quantity, ing?.unit || 'kg')}
                        </td>
                        <td className="py-3 px-3 text-right font-mono tabular-nums font-bold text-amber-900">
                          {formatCurrency(w.quantity * w.unit_cost_at_time)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
