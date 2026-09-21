import React, { useState, useMemo, Suspense, lazy } from 'react';
import { 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle2, 
  ArrowUpRight, 
  ArrowDownRight, 
  Download, 
  Printer, 
  Search, 
  Calendar, 
  ShieldAlert, 
  FileSearch, 
  Sliders, 
  Sparkles,
  ChevronRight,
  FileSpreadsheet
} from 'lucide-react';
import { useStock } from '../context/StockContext';
import { formatCurrency, formatQuantity } from '../utils/calculations';
import { CategoryType } from '../types';

const LossInvestigationModal = lazy(() =>
  import('./LossInvestigationModal').then(m => ({ default: m.LossInvestigationModal }))
);

const CATEGORY_LABELS: Record<CategoryType, string> = {
  meat: 'Viandes & Grillades',
  dairy: 'Produits Laitiers & Fromages',
  alcohol: 'Vins, Spiritueux & Bar',
  beverage: 'Boissons & Jus Frais',
  produce: 'Légumes & Fruits du Marché',
  'dry goods': 'Épicerie & Féculents',
  bakery: 'Boulangerie & Pâtisserie',
  seafood: 'Poissons Frais & Fruits de Mer',
  other: 'Autres Ingrédients',
};

const CATEGORY_BADGES: Record<CategoryType, string> = {
  meat: 'bg-alert/10 text-alert border-alert/25',
  dairy: 'bg-amber-50 text-amber-800 border-amber-200',
  alcohol: 'bg-navy/10 text-navy border-navy/20',
  beverage: 'bg-sky-50 text-sky-800 border-sky-200',
  produce: 'bg-success/10 text-success border-success/25',
  'dry goods': 'bg-sand/50 text-slate-800 border-sand',
  bakery: 'bg-terracotta/10 text-terracotta border-terracotta/25',
  seafood: 'bg-teal-50 text-teal-800 border-teal-200',
  other: 'bg-slate-100 text-slate-700 border-slate-200',
};

export const VarianceDashboard: React.FC = () => {
  const {
    varianceReports,
    categorySummaries,
    totalLossCost,
    totalVarianceCost,
    totalTheoreticalCost,
    totalActualCost,
    selectedPeriod,
    setSelectedPeriod,
    ingredients,
    sales,
    flaggedAlertItems,
    alertThresholdPercent,
    alertThresholdCost,
    setAlertThresholdPercent,
    setAlertThresholdCost,
  } = useStock();

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'loss_only' | 'high_only'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'cost_desc' | 'pct_desc' | 'name'>('cost_desc');
  const [investigatingId, setInvestigatingId] = useState<string | null>(null);
  const [showThresholdConfig, setShowThresholdConfig] = useState<boolean>(false);

  // Filtered reports
  const filteredReports = useMemo(() => {
    return varianceReports
      .filter(r => {
        if (!r || !r.ingredient) return false;
        if (selectedCategory !== 'all' && r.ingredient.category !== selectedCategory) {
          return false;
        }
        if (statusFilter === 'loss_only' && r.variance_cost <= 0) {
          return false;
        }
        if (statusFilter === 'high_only' && r.status !== 'critical_loss') {
          return false;
        }
        if (searchTerm.trim() !== '') {
          const term = searchTerm.toLowerCase();
          return (
            (r.ingredient.name || '').toLowerCase().includes(term) ||
            (r.ingredient.category || '').toLowerCase().includes(term)
          );
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'cost_desc') return (b.variance_cost || 0) - (a.variance_cost || 0);
        if (sortBy === 'pct_desc') return (b.variance_percentage || 0) - (a.variance_percentage || 0);
        const nameA = a.ingredient?.name || '';
        const nameB = b.ingredient?.name || '';
        return nameA.localeCompare(nameB);
      });
  }, [varianceReports, selectedCategory, statusFilter, searchTerm, sortBy]);

  // High loss culprits (top 3)
  const topCulprits = useMemo(() => {
    return [...varianceReports]
      .filter(r => r && r.ingredient && r.variance_cost > 0)
      .sort((a, b) => (b.variance_cost || 0) - (a.variance_cost || 0))
      .slice(0, 3);
  }, [varianceReports]);

  // Overall loss percentage vs theoretical
  const overallLossPercent = totalTheoreticalCost > 0
    ? Number(((totalLossCost / totalTheoreticalCost) * 100).toFixed(1))
    : 0;

  // Export CSV
  const handleExportCSV = () => {
    const headers = [
      'Ingrédient',
      'Catégorie',
      'Unité',
      'Coût Unitaire (DT)',
      'Stock Départ',
      'Livraisons (+)',
      'Stock Fin (-)',
      'Conso Réelle',
      'Conso Théorique',
      'Écart Quantité',
      'Écart %',
      'Coût Coulage (DT)',
      'Statut',
    ];

    const rows = varianceReports.map(r => [
      `"${r.ingredient?.name || 'Ingrédient'}"`,
      r.ingredient?.category || 'other',
      r.ingredient?.unit || '',
      (r.ingredient?.cost_per_unit ?? 0).toFixed(2),
      r.opening_stock ?? 0,
      r.deliveries_in_period ?? 0,
      r.closing_stock ?? 0,
      r.actual_usage ?? 0,
      r.theoretical_usage ?? 0,
      r.variance_quantity ?? 0,
      (r.variance_percentage ?? 0).toFixed(1) + '%',
      (r.variance_cost ?? 0).toFixed(2),
      r.status,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `la-grotte-rapport-variance-${selectedPeriod.startDate}-${selectedPeriod.endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export Excel (.xls HTML table readable natively by Microsoft Excel, Apple Numbers, Google Sheets)
  const handleExportExcel = () => {
    const tableHeader = `
      <tr style="background-color: #1a2a3a; color: #ffffff; font-weight: bold;">
        <th style="padding: 10px; border: 1px solid #cccccc;">Ingrédient</th>
        <th style="padding: 10px; border: 1px solid #cccccc;">Catégorie</th>
        <th style="padding: 10px; border: 1px solid #cccccc;">Unité</th>
        <th style="padding: 10px; border: 1px solid #cccccc;">Coût Unitaire (DT)</th>
        <th style="padding: 10px; border: 1px solid #cccccc;">Stock Départ</th>
        <th style="padding: 10px; border: 1px solid #cccccc;">Livraisons (+)</th>
        <th style="padding: 10px; border: 1px solid #cccccc;">Stock Fin (-)</th>
        <th style="padding: 10px; border: 1px solid #cccccc;">Conso Réelle</th>
        <th style="padding: 10px; border: 1px solid #cccccc;">Conso Théorique</th>
        <th style="padding: 10px; border: 1px solid #cccccc;">Écart Quantité</th>
        <th style="padding: 10px; border: 1px solid #cccccc;">Écart %</th>
        <th style="padding: 10px; border: 1px solid #cccccc;">Coût Coulage (DT)</th>
        <th style="padding: 10px; border: 1px solid #cccccc;">Statut Audit</th>
      </tr>
    `;

    const tableRows = varianceReports.map(r => {
      const isLoss = (r.variance_cost ?? 0) > 0;
      const statusColor = r.status === 'critical_loss' ? '#dc2626' : r.status === 'moderate_loss' ? '#d97706' : '#16a34a';
      return `
        <tr>
          <td style="padding: 8px; border: 1px solid #e2e8f0; font-weight: bold;">${r.ingredient?.name || 'Ingrédient'}</td>
          <td style="padding: 8px; border: 1px solid #e2e8f0;">${CATEGORY_LABELS[r.ingredient?.category as CategoryType] || r.ingredient?.category || 'Autre'}</td>
          <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: center;">${r.ingredient?.unit || ''}</td>
          <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: right;">${(r.ingredient?.cost_per_unit ?? 0).toFixed(3)}</td>
          <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: right;">${r.opening_stock ?? 0}</td>
          <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: right;">${r.deliveries_in_period ?? 0}</td>
          <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: right;">${r.closing_stock ?? 0}</td>
          <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: right;">${r.actual_usage ?? 0}</td>
          <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: right;">${r.theoretical_usage ?? 0}</td>
          <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: right; color: ${isLoss ? '#dc2626' : '#1e293b'}; font-weight: bold;">${r.variance_quantity ?? 0}</td>
          <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: right;">${(r.variance_percentage ?? 0).toFixed(1)}%</td>
          <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: right; color: ${isLoss ? '#dc2626' : '#16a34a'}; font-weight: bold;">${(r.variance_cost ?? 0).toFixed(3)} DT</td>
          <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: center; color: ${statusColor}; font-weight: bold;">${r.status.toUpperCase()}</td>
        </tr>
      `;
    }).join('');

    const excelHtml = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
        <head>
          <meta http-equiv="content-type" content="application/vnd.ms-excel; charset=UTF-8">
          <style>
            table { border-collapse: collapse; width: 100%; font-family: Arial, sans-serif; font-size: 12px; }
            th { background-color: #1a2a3a; color: #ffffff; }
          </style>
        </head>
        <body>
          <h2>Restaurant La Grotte Monastir — Audit de Variance & Coulage</h2>
          <p><strong>Période :</strong> ${selectedPeriod.startDate} au ${selectedPeriod.endDate} | <strong>Coût Coulage Total :</strong> ${formatCurrency(totalLossCost)}</p>
          <table border="1">${tableHeader}${tableRows}</table>
        </body>
      </html>
    `;

    const blob = new Blob([excelHtml], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `la-grotte-audit-variance-${selectedPeriod.startDate}-${selectedPeriod.endDate}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Period Selection & Header Tools */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-sand shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-navy text-terracotta">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-navy uppercase tracking-wide">
              Audit de Consommation & Détection de Coulage
            </h2>
            <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
              <span>Période d'analyse :</span>
              <span className="font-bold text-navy bg-cream border border-sand px-2 py-0.5 rounded">
                {selectedPeriod.startDate} au {selectedPeriod.endDate}
              </span>
              <span>• {sales.length} ventes POS synchronisées</span>
            </div>
          </div>
        </div>

        {/* Quick Period Presets */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setSelectedPeriod({
              startDate: '2026-09-01',
              endDate: '2026-09-07',
              label: 'Semaine en cours (1 au 7 Sept 2026)',
            })}
            className={`px-3 py-1.5 text-xs rounded-xl font-bold uppercase tracking-wider transition-colors ${
              selectedPeriod.startDate === '2026-09-01'
                ? 'bg-navy text-white shadow-xs'
                : 'bg-white text-slate-700 border border-sand hover:bg-cream'
            }`}
          >
            Semaine 36
          </button>
          <button
            onClick={() => setSelectedPeriod({
              startDate: '2026-09-07',
              endDate: '2026-09-07',
              label: 'Dimanche 7 Sept (Service Clôture)',
            })}
            className={`px-3 py-1.5 text-xs rounded-xl font-bold uppercase tracking-wider transition-colors ${
              selectedPeriod.startDate === '2026-09-07'
                ? 'bg-navy text-white shadow-xs'
                : 'bg-white text-slate-700 border border-sand hover:bg-cream'
            }`}
          >
            Dimanche 7
          </button>

          <div className="flex items-center gap-1.5 ml-1">
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 bg-white border border-sand rounded-xl hover:bg-cream uppercase tracking-wider transition-colors shadow-2xs"
              title="Exporter CSV"
            >
              <Download className="w-3.5 h-3.5 text-terracotta" />
              <span>CSV</span>
            </button>
            <button
              onClick={handleExportExcel}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 bg-white border border-sand rounded-xl hover:bg-cream uppercase tracking-wider transition-colors shadow-2xs"
              title="Exporter au format Excel (.xls)"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Excel</span>
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 bg-white border border-sand rounded-xl hover:bg-cream uppercase tracking-wider transition-colors shadow-2xs"
              title="Imprimer ou enregistrer en PDF"
            >
              <Printer className="w-3.5 h-3.5 text-terracotta" />
              <span>Imprimer / PDF</span>
            </button>
          </div>
        </div>
      </div>

      {/* Same-Day Shrinkage Alert Banner & Threshold Configuration */}
      <div className="bg-white rounded-xl border border-sand shadow-xs overflow-hidden">
        <div className={`p-4 ${flaggedAlertItems.length > 0 ? 'bg-alert/10 border-b border-alert/20' : 'bg-cream border-b border-sand'} flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3`}>
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${flaggedAlertItems.length > 0 ? 'bg-alert text-white' : 'bg-navy text-white'}`}>
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold text-navy uppercase tracking-wider">
                  Surveillance du Coulage & Détection en Temps Réel
                </h3>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  flaggedAlertItems.length > 0
                    ? 'bg-alert text-white animate-pulse'
                    : 'bg-success/15 text-success border border-success/30'
                }`}>
                  {flaggedAlertItems.length > 0 ? `${flaggedAlertItems.length} ARTICLES EN ANOMALIE` : 'SEUILS CONFORMES'}
                </span>
              </div>
              <p className="text-[11px] text-slate-600 mt-0.5">
                Critères de déclenchement : perte &gt; <strong className="text-navy">{alertThresholdPercent}%</strong> ou impact financier &gt; <strong className="text-navy">{formatCurrency(alertThresholdCost)}</strong>.
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowThresholdConfig(prev => !prev)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-sand text-navy text-xs font-bold hover:bg-cream transition-colors shadow-2xs"
          >
            <Sliders className="w-3.5 h-3.5 text-terracotta" />
            {showThresholdConfig ? 'Masquer réglages' : 'Ajuster les seuils'}
          </button>
        </div>

        {/* Threshold Adjustment Sliders (Collapsible) */}
        {showThresholdConfig && (
          <div className="p-4 bg-cream border-b border-sand grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-navy font-bold uppercase tracking-wider text-[10px] mb-1">
                Seuil de tolérance d'écart ({alertThresholdPercent}%)
              </label>
              <input
                type="range"
                min="1"
                max="20"
                step="0.5"
                value={alertThresholdPercent}
                onChange={e => setAlertThresholdPercent(parseFloat(e.target.value) || 5)}
                className="w-full accent-terracotta"
              />
              <span className="text-[11px] text-slate-500">
                Alerte si la consommation réelle dépasse le théorique de plus de {alertThresholdPercent}%.
              </span>
            </div>

            <div>
              <label className="block text-navy font-bold uppercase tracking-wider text-[10px] mb-1">
                Seuil financier critique ({alertThresholdCost} DT)
              </label>
              <input
                type="range"
                min="5"
                max="100"
                step="5"
                value={alertThresholdCost}
                onChange={e => setAlertThresholdCost(parseFloat(e.target.value) || 15)}
                className="w-full accent-terracotta"
              />
              <span className="text-[11px] text-slate-500">
                Alerte si la perte nette sur l'ingrédient dépasse {formatCurrency(alertThresholdCost)}.
              </span>
            </div>
          </div>
        )}

        {/* Flagged Alert Items Grid */}
        {flaggedAlertItems.length > 0 && (
          <div className="p-4 bg-alert/5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {flaggedAlertItems.filter(item => item && item.ingredient).map(item => (
              <div
                key={item.ingredient.id}
                className="bg-white p-3.5 rounded-xl border border-alert/30 shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-navy text-xs truncate">
                      {item.ingredient.name}
                    </span>
                    <span className="text-xs font-mono font-bold text-alert tabular-nums">
                      +{formatCurrency(item.variance_cost)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500">
                    <span>Écart : <strong className="text-alert font-mono tabular-nums">+{item.variance_quantity} {item.ingredient.unit}</strong></span>
                    <span>•</span>
                    <span className="font-mono tabular-nums">+{((item.variance_percentage ?? 0)).toFixed(1)}%</span>
                  </div>
                </div>

                <div className="pt-2.5 mt-2 border-t border-sand flex items-center justify-between">
                  <span className="text-[10px] text-slate-400">
                    Zone : {item.ingredient.location || 'Réserve'}
                  </span>
                  <button
                    onClick={() => setInvestigatingId(item.ingredient.id)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-navy hover:bg-navy-mid text-white text-[11px] font-bold uppercase tracking-wider transition-colors shadow-xs"
                  >
                    <FileSearch className="w-3 h-3 text-terracotta" />
                    Enquêter
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Hero Metric Cards (Monastir Coastal & Ribat Theme) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Loss Amount (Grotte Marine Navy Hero Card) */}
        <div className="bg-navy text-white p-5 rounded-2xl shadow-md border border-white/10 flex flex-col justify-between relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-sand/80">
                Coulage Net Détecté
              </span>
              <div className="w-8 h-8 rounded-xl bg-alert/20 text-alert flex items-center justify-center border border-alert/40">
                <TrendingDown className="w-4 h-4" />
              </div>
            </div>
            <div className="my-3">
              <div className="text-3xl font-extrabold tracking-tight text-white font-mono tabular-nums">
                +{formatCurrency(totalLossCost)}
              </div>
              <p className="text-xs text-sand/70 mt-1">
                Surcoût matière par rapport aux ventes POS
              </p>
            </div>
            <div className="mt-2 h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-alert rounded-full"
                style={{ width: `${Math.min(100, Math.max(10, overallLossPercent * 5))}%` }}
              />
            </div>
            <div className="pt-3 mt-2 border-t border-white/10 flex items-center justify-between text-xs text-sand/80">
              <span>Ratio de perte :</span>
              <span className="font-bold text-rose-300 font-mono tabular-nums">
                {overallLossPercent}% du théorique
              </span>
            </div>
          </div>
          <div className="absolute top-0 right-0 w-32 h-32 bg-alert/10 rounded-full -mr-16 -mt-16 blur-2xl pointer-events-none"></div>
        </div>

        {/* Card 2: Theoretical Food Cost */}
        <div className="bg-white p-5 rounded-2xl border border-sand shadow-xs flex flex-col justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
              Coût Matière Théorique
            </p>
            <h3 className="text-2xl font-bold text-navy font-mono tabular-nums">
              {formatCurrency(totalTheoreticalCost)}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Recettes BOM × tickets caisse POS
            </p>
          </div>
          <div>
            <div className="mt-4 h-1.5 w-full bg-cream rounded-full overflow-hidden">
              <div className="h-full bg-navy rounded-full" style={{ width: '68%' }}></div>
            </div>
            <div className="pt-3 mt-2 border-t border-sand flex items-center justify-between text-xs text-slate-500">
              <span>Catalogue actif :</span>
              <span className="font-bold text-navy">{ingredients.length} articles</span>
            </div>
          </div>
        </div>

        {/* Card 3: Actual Consumed Food Cost */}
        <div className="bg-white p-5 rounded-2xl border border-sand shadow-xs flex flex-col justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
              Coût Matière Réel
            </p>
            <h3 className="text-2xl font-bold text-navy font-mono tabular-nums">
              {formatCurrency(totalActualCost)}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Stock initial + Livraisons - Stock final
            </p>
          </div>
          <div>
            <div className="mt-4 h-1.5 w-full bg-cream rounded-full overflow-hidden">
              <div className="h-full bg-success rounded-full" style={{ width: '74%' }}></div>
            </div>
            <div className="pt-3 mt-2 border-t border-sand flex items-center justify-between text-xs text-slate-500">
              <span>Écart net global :</span>
              <span className={`font-bold font-mono tabular-nums ${totalVarianceCost > 0 ? 'text-alert' : 'text-success'}`}>
                {totalVarianceCost > 0 ? `+${formatCurrency(totalVarianceCost)}` : formatCurrency(totalVarianceCost)}
              </span>
            </div>
          </div>
        </div>

        {/* Card 4: Top Actionable Leaks */}
        <div className="bg-white p-5 rounded-2xl border border-sand shadow-xs border-l-4 border-l-[#C67D3B] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                Postes Prioritaires
              </p>
              <div className="w-2.5 h-2.5 rounded-full bg-terracotta"></div>
            </div>
            <div className="my-2 space-y-1.5">
              {topCulprits.map(c => (
                <div key={c.ingredient.id} className="flex items-center justify-between text-xs">
                  <span className="truncate max-w-[130px] font-semibold text-navy">
                    {c.ingredient.name}
                  </span>
                  <span className="font-bold text-alert font-mono tabular-nums shrink-0">
                    +{formatCurrency(c.variance_cost)}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div className="pt-2 border-t border-sand text-[11px] text-slate-500">
            Pèse pour <span className="font-bold text-navy">{Math.round((topCulprits.reduce((s, c) => s + c.variance_cost, 0) / (totalLossCost || 1)) * 100)}%</span> des pertes totales
          </div>
        </div>
      </div>

      {/* Operational Intelligence Card for La Grotte Monastir */}
      <div className="bg-navy rounded-2xl shadow-lg p-5 text-white relative overflow-hidden border border-white/10">
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-white uppercase text-xs tracking-wider flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-terracotta" />
              Diagnostic Opérationnel — La Grotte Monastir
            </h2>
            <span className="text-[10px] uppercase font-bold text-terracotta bg-white/10 px-2.5 py-0.5 rounded-full border border-white/10">
              Audit Service Cuisine & Bar
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-sand">
            <div className="p-3.5 bg-white/5 rounded-xl border border-white/10">
              <strong className="text-white block mb-1">🐟 Poissons & Daurade Royale (Port de Monastir) :</strong>
              Écart de +1.5 kg constaté. Vérifier le rendement après éviscération et le pesage systématique à réception face au bon de livraison du marin-pêcheur.
            </div>
            <div className="p-3.5 bg-white/5 rounded-xl border border-white/10">
              <strong className="text-white block mb-1">🥩 Grillades (Merguez & Entrecôte) :</strong>
              Sur-portionnage récurrent en grillade (+2.4 kg). Instaurer un calibrage pré-service à la balance pour standardiser chaque portion servie.
            </div>
            <div className="p-3.5 bg-white/5 rounded-xl border border-white/10">
              <strong className="text-white block mb-1">🍷 Bar & Vins de Mornag / Magon :</strong>
              +3.5 L de vin rouge non comptabilisé. Contrôler la jauge des verres de dégustation et l'enregistrement strict des offerts/comptoirs sur la caisse POS.
            </div>
          </div>
        </div>
      </div>

      {/* Category Rollup Cards */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Coulage par Rayon (Analyse Synthétique)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Cliquez sur un rayon pour filtrer instantanément le tableau détaillé ci-dessous
            </p>
          </div>
          {selectedCategory !== 'all' && (
            <button
              onClick={() => setSelectedCategory('all')}
              className="text-xs text-terracotta font-bold hover:underline"
            >
              Afficher tous les rayons
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {categorySummaries.map(cat => {
            const isSelected = selectedCategory === cat.category;
            const lossPct = cat.total_theoretical_cost > 0
              ? Math.round((cat.total_variance_cost / cat.total_theoretical_cost) * 100)
              : 0;

            return (
              <div
                key={cat.category}
                onClick={() => setSelectedCategory(isSelected ? 'all' : cat.category)}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'border-navy ring-2 ring-navy/20 bg-white shadow-sm'
                    : 'bg-white border-sand hover:border-slate-400 shadow-2xs'
                }`}
              >
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-bold text-navy truncate">
                    {CATEGORY_LABELS[cat.category] || cat.category}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono tabular-nums">
                    {cat.items_count} art.
                  </span>
                </div>

                <div className="flex items-baseline justify-between mt-1">
                  <span className={`text-base font-bold font-mono tabular-nums ${cat.total_variance_cost > 0 ? 'text-alert' : 'text-success'}`}>
                    {cat.total_variance_cost > 0 ? `+${formatCurrency(cat.total_variance_cost)}` : formatCurrency(cat.total_variance_cost)}
                  </span>
                  {lossPct > 0 && (
                    <span className="text-[10px] font-bold text-alert bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                      +{lossPct}%
                    </span>
                  )}
                </div>

                <div className="w-full bg-cream h-1.5 rounded-full mt-2.5 overflow-hidden">
                  <div
                    className={`h-full ${cat.total_variance_cost > 20 ? 'bg-alert' : cat.total_variance_cost > 0 ? 'bg-terracotta' : 'bg-success'}`}
                    style={{
                      width: `${Math.min(100, Math.max(8, lossPct * 4))}%`,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Variance Matrix Table */}
      <div className="bg-white rounded-2xl border border-sand shadow-xs overflow-hidden">
        {/* Table Filters Bar */}
        <div className="p-4 border-b border-sand flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-cream">
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Rechercher un ingrédient..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-sand rounded-xl text-navy placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-navy"
              />
            </div>

            <select
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              className="py-1.5 px-2.5 text-xs bg-white border border-sand rounded-xl text-navy focus:outline-none"
            >
              <option value="all">Tous les rayons</option>
              {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Filtrer :</span>
            <div className="inline-flex rounded-xl border border-sand bg-white p-0.5 text-xs shadow-2xs">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors ${statusFilter === 'all' ? 'bg-navy text-white' : 'text-slate-600 hover:text-navy'}`}
              >
                Tous ({varianceReports.length})
              </button>
              <button
                onClick={() => setStatusFilter('loss_only')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors ${statusFilter === 'loss_only' ? 'bg-alert text-white' : 'text-slate-600 hover:text-navy'}`}
              >
                Pertes
              </button>
              <button
                onClick={() => setStatusFilter('high_only')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors ${statusFilter === 'high_only' ? 'bg-terracotta text-white' : 'text-slate-600 hover:text-navy'}`}
              >
                Critiques
              </button>
            </div>

            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
              className="py-1.5 px-2.5 text-xs bg-white border border-sand rounded-xl text-navy focus:outline-none font-medium"
            >
              <option value="cost_desc">Perte (DT décroissant)</option>
              <option value="pct_desc">% d'écart</option>
              <option value="name">Nom alphabétique</option>
            </select>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-cream border-b border-sand text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                <th className="py-3 px-4">Ingrédient & Rayon</th>
                <th className="py-3 px-3 text-right">Stock Initial</th>
                <th className="py-3 px-3 text-right">+ Livraisons</th>
                <th className="py-3 px-3 text-right">- Stock Compté</th>
                <th className="py-3 px-3 text-right font-bold text-navy bg-white/70">= Conso Réelle</th>
                <th className="py-3 px-3 text-right font-bold text-navy bg-sand/30">Conso Théorique</th>
                <th className="py-3 px-3 text-right font-bold">Écart Quantité</th>
                <th className="py-3 px-4 text-right font-bold text-navy">Perte / Gain (DT)</th>
                <th className="py-3 px-4 text-center">Diagnostic</th>
                <th className="py-3 px-4 text-center">Audit & Enquête</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sand/60">
              {filteredReports.map(report => {
                const isLoss = report.variance_cost > 0;
                const isCritical = report.status === 'critical_loss';

                return (
                  <tr 
                    key={report.ingredient.id} 
                    className={`hover:bg-cream/60 transition-colors ${isCritical ? 'bg-alert/5' : ''}`}
                  >
                    {/* Ingrédient */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-navy text-sm">
                        {report.ingredient.name}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${CATEGORY_BADGES[report.ingredient.category] || 'bg-slate-100 text-slate-700'}`}>
                          {CATEGORY_LABELS[report.ingredient.category]}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono tabular-nums">
                          {formatCurrency(report.ingredient.cost_per_unit)} / {report.ingredient.unit}
                        </span>
                      </div>
                    </td>

                    {/* Stock Initial */}
                    <td className="py-3.5 px-3 text-right font-mono text-slate-600 tabular-nums">
                      {formatQuantity(report.opening_stock, report.ingredient.unit)}
                    </td>

                    {/* Livraisons */}
                    <td className="py-3.5 px-3 text-right font-mono text-slate-600 tabular-nums">
                      {report.deliveries_in_period > 0 ? (
                        <span className="text-success font-semibold">
                          +{formatQuantity(report.deliveries_in_period, report.ingredient.unit)}
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>

                    {/* Stock Compté */}
                    <td className="py-3.5 px-3 text-right font-mono text-slate-600 tabular-nums">
                      {formatQuantity(report.closing_stock, report.ingredient.unit)}
                    </td>

                    {/* Conso Réelle */}
                    <td className="py-3.5 px-3 text-right font-mono font-bold text-navy bg-cream/60 tabular-nums">
                      {formatQuantity(report.actual_usage, report.ingredient.unit)}
                    </td>

                    {/* Conso Théorique */}
                    <td className="py-3.5 px-3 text-right font-mono font-bold text-navy bg-sand/20 tabular-nums">
                      {formatQuantity(report.theoretical_usage, report.ingredient.unit)}
                    </td>

                    {/* Écart Quantité */}
                    <td className="py-3.5 px-3 text-right font-mono tabular-nums">
                      <div className={`font-bold inline-flex items-center gap-0.5 ${
                        isLoss ? 'text-alert' : report.variance_quantity < 0 ? 'text-navy' : 'text-success'
                      }`}>
                        {report.variance_quantity > 0 && <ArrowUpRight className="w-3.5 h-3.5 text-alert" />}
                        {report.variance_quantity < 0 && <ArrowDownRight className="w-3.5 h-3.5 text-navy" />}
                        <span>
                          {report.variance_quantity > 0 ? `+${report.variance_quantity}` : report.variance_quantity} {report.ingredient.unit}
                        </span>
                      </div>
                      {report.theoretical_usage > 0 && (
                        <div className="text-[10px] text-slate-400 tabular-nums">
                          {report.variance_percentage > 0 ? `+${report.variance_percentage}%` : `${report.variance_percentage}%`}
                        </div>
                      )}
                    </td>

                    {/* Perte / Gain (DT) */}
                    <td className="py-3.5 px-4 text-right font-mono tabular-nums">
                      <span className={`text-sm font-bold ${
                        isLoss ? 'text-alert' : report.variance_cost < 0 ? 'text-navy' : 'text-success'
                      }`}>
                        {report.variance_cost > 0 ? `+${formatCurrency(report.variance_cost)}` : formatCurrency(report.variance_cost)}
                      </span>
                    </td>

                    {/* Statut & Diagnostic */}
                    <td className="py-3.5 px-4 text-center">
                      {report.status === 'critical_loss' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-alert/10 text-alert border border-alert/25">
                          <AlertTriangle className="w-3 h-3" />
                          Coulage Critique
                        </span>
                      )}
                      {report.status === 'moderate_loss' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-900 border border-amber-200">
                          Surconsommation
                        </span>
                      )}
                      {report.status === 'normal' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-success/10 text-success border border-success/25">
                          <CheckCircle2 className="w-3 h-3" />
                          Conforme
                        </span>
                      )}
                      {report.status === 'under_usage' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-sky-50 text-sky-800 border border-sky-200">
                          Sous-dosage ?
                        </span>
                      )}
                    </td>

                    {/* Enquête & Audit Action */}
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => setInvestigatingId(report.ingredient.id)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white hover:bg-navy hover:text-white text-navy border border-sand text-xs font-bold transition-all shadow-2xs"
                        title="Analyser les accès réserve, signatures BL et annulations POS"
                      >
                        <FileSearch className="w-3.5 h-3.5 text-terracotta" />
                        <span>Enquêter</span>
                      </button>
                    </td>
                  </tr>
                );
              })}

              {filteredReports.length === 0 && (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-400 text-xs">
                    Aucun ingrédient ne correspond aux filtres appliqués.
                  </td>
                </tr>
              )}
            </tbody>

            {/* Total Summary Footer */}
            <tfoot>
              <tr className="bg-cream border-t-2 border-sand font-bold text-navy text-xs">
                <td className="py-3.5 px-4 uppercase tracking-wider">
                  TOTAL PÉRIODE ({filteredReports.length} articles)
                </td>
                <td colSpan={3} className="py-3.5 px-3"></td>
                <td className="py-3.5 px-3 text-right font-mono bg-white/70 tabular-nums">
                  {formatCurrency(totalActualCost)}
                </td>
                <td className="py-3.5 px-3 text-right font-mono bg-sand/30 tabular-nums">
                  {formatCurrency(totalTheoreticalCost)}
                </td>
                <td className="py-3.5 px-3 text-right font-mono text-slate-500 uppercase tracking-wider">
                  Écart Net
                </td>
                <td className="py-3.5 px-4 text-right font-mono text-sm text-alert tabular-nums">
                  +{formatCurrency(totalLossCost)}
                </td>
                <td className="py-3.5 px-4 text-center font-mono text-slate-600 font-semibold tabular-nums">
                  {overallLossPercent}% de perte
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Investigation Modal */}
      {investigatingId && (
        <Suspense
          fallback={
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
              <div className="bg-cream rounded-2xl p-8 max-w-sm w-full shadow-2xl border border-sand flex flex-col items-center text-center">
                <div className="relative flex items-center justify-center mb-4">
                  <div className="w-10 h-10 rounded-full border-2 border-sand border-t-terracotta animate-spin" />
                  <div className="absolute w-2 h-2 rounded-full bg-navy" />
                </div>
                <span className="text-xs font-bold uppercase tracking-widest text-terracotta">
                  La Grotte • IA Audit
                </span>
                <p className="text-xs font-medium text-navy/80 mt-1">
                  Chargement de l'analyse...
                </p>
              </div>
            </div>
          }
        >
          <LossInvestigationModal
            ingredientId={investigatingId}
            onClose={() => setInvestigatingId(null)}
          />
        </Suspense>
      )}
    </div>
  );
};

export default VarianceDashboard;
