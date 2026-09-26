import React, { useMemo } from 'react';
import { 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle2, 
  ArrowUpRight, 
  ArrowRight,
  Package, 
  Truck, 
  ClipboardList, 
  Trash2, 
  DollarSign, 
  Receipt, 
  FileSearch,
  ShoppingCart,
  Layers,
  Sparkles,
  ChevronRight,
  Activity,
  ShieldCheck,
  Building2,
  Calendar
} from 'lucide-react';
import { useStock } from '../context/StockContext';
import { formatCurrency, formatQuantity } from '../utils/calculations';
import { CategoryType, IngredientVarianceReport } from '../types';

interface OverviewDashboardProps {
  onSelectTab: (tab: string) => void;
  onOpenInvestigation: (ingredientId: string) => void;
  onOpenFastCount: () => void;
  onOpenWasteLog: () => void;
  onOpenNewDelivery: () => void;
}

const CATEGORY_NAMES: Record<CategoryType, string> = {
  meat: 'Viandes & Grillades',
  dairy: 'Produits Laitiers',
  alcohol: 'Vins & Bar',
  beverage: 'Boissons & Jus',
  produce: 'Fruits & Légumes',
  'dry goods': 'Épicerie Sèche',
  bakery: 'Boulangerie',
  seafood: 'Poissons & Mer',
  other: 'Divers',
};

export const OverviewDashboard: React.FC<OverviewDashboardProps> = ({
  onSelectTab,
  onOpenInvestigation,
  onOpenFastCount,
  onOpenWasteLog,
  onOpenNewDelivery,
}) => {
  const {
    ingredients,
    sales,
    deliveries,
    stockCounts,
    wasteLogs,
    posVoids,
    varianceReports,
    categorySummaries,
    totalLossCost,
    totalTheoreticalCost,
    totalActualCost,
    currentUser,
    selectedPeriod,
  } = useStock();

  // 1. Current stock valuation
  const totalStockValue = useMemo(() => {
    return ingredients.reduce((sum, ing) => sum + (ing.current_stock * ing.cost_per_unit), 0);
  }, [ingredients]);

  // 2. Total Period Sales (estimated from menu items if sales recorded)
  const totalPeriodSalesRevenue = useMemo(() => {
    return sales.reduce((sum, s) => {
      // average ticket item price estimate ~24 DT if not specified
      return sum + (s.quantity_sold * 24.5);
    }, 0);
  }, [sales]);

  // 3. Known recorded waste in period
  const totalRecordedWasteCost = useMemo(() => {
    return wasteLogs.reduce((sum, w) => sum + (w.quantity * w.unit_cost_at_time), 0);
  }, [wasteLogs]);

  // 4. Critical & High Loss Items
  const criticalItems = useMemo(() => {
    return varianceReports
      .filter(r => r && r.status === 'critical_loss' && r.variance_cost > 0)
      .sort((a, b) => b.variance_cost - a.variance_cost);
  }, [varianceReports]);

  // 5. Low stock alerts
  const lowStockItems = useMemo(() => {
    return ingredients.filter(
      ing => ing.min_alert_threshold !== undefined && ing.current_stock <= ing.min_alert_threshold
    );
  }, [ingredients]);

  // 6. Top culprits for loss overview table
  const topLossCulprits = useMemo(() => {
    return [...varianceReports]
      .filter(r => r && r.ingredient && r.variance_cost > 0)
      .sort((a, b) => b.variance_cost - a.variance_cost)
      .slice(0, 6);
  }, [varianceReports]);

  // 7. Recent Operational Activity Feed (merged chronological timeline)
  const recentActivities = useMemo(() => {
    const list: Array<{
      id: string;
      type: 'delivery' | 'count' | 'waste' | 'void';
      title: string;
      subtitle: string;
      amount?: string;
      date: string;
      user: string;
    }> = [];

    // Recent deliveries
    deliveries.slice(0, 3).forEach(d => {
      const ing = ingredients.find(i => i.id === d.ingredient_id);
      list.push({
        id: `del-${d.id}`,
        type: 'delivery',
        title: `Livraison reçue : ${ing?.name || 'Marchandise'}`,
        subtitle: `+${formatQuantity(d.quantity, ing?.unit || 'kg')} · BL Fournisseur`,
        amount: formatCurrency(d.quantity * d.unit_cost),
        date: d.date,
        user: d.received_by || 'Équipe Réception',
      });
    });

    // Recent waste logs
    wasteLogs.slice(0, 3).forEach(w => {
      const ing = ingredients.find(i => i.id === w.ingredient_id);
      list.push({
        id: `wst-${w.id}`,
        type: 'waste',
        title: `Perte déclarée : ${ing?.name || 'Ingrédient'}`,
        subtitle: `${formatQuantity(w.quantity, ing?.unit || 'kg')} · Motif : ${w.reason}`,
        amount: `-${formatCurrency(w.quantity * w.unit_cost_at_time)}`,
        date: w.date,
        user: w.logged_by || 'Chef de Partie',
      });
    });

    // Recent counts
    stockCounts.slice(0, 2).forEach(c => {
      const ing = ingredients.find(i => i.id === c.ingredient_id);
      list.push({
        id: `cnt-${c.id}`,
        type: 'count',
        title: `Inventaire terrain : ${ing?.name || 'Article'}`,
        subtitle: `Comptage physique : ${formatQuantity(c.counted_quantity, ing?.unit || 'kg')} (${c.shift === 'morning' ? 'Matin' : 'Soir'})`,
        date: c.date,
        user: c.counted_by || 'Responsable',
      });
    });

    // Recent pos voids
    posVoids.slice(0, 2).forEach(v => {
      list.push({
        id: `void-${v.id}`,
        type: 'void',
        title: `Annulation Caisse : ${v.item_name || 'Article'}`,
        subtitle: `Motif : ${v.reason || 'Erreur commande'}`,
        amount: `-${formatCurrency(v.amount)}`,
        date: v.date?.slice(0, 10) || new Date().toISOString().slice(0, 10),
        user: v.staff_name || 'Caisse',
      });
    });

    return list.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);
  }, [deliveries, wasteLogs, stockCounts, posVoids, ingredients]);

  const totalAnomaliesCount = criticalItems.length + lowStockItems.length + (posVoids.length > 5 ? 1 : 0);

  return (
    <div className="space-y-6 sm:space-y-8 pb-12">
      {/* 1. HERO HEADER: Executive Statement & Context */}
      <div className="bg-white rounded-2xl border border-sand p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-terracotta" />
              <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
                Poste de Commandement Opérationnel • Période {selectedPeriod.label}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-navy tracking-tight">
              Synthèse Générale des Matières & Contrôle des Pertes
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl">
              Surveillance continue du cycle <strong className="text-navy">Achats → Stocks → Ventes → Inventaires</strong> pour le restaurant La Grotte.
            </p>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <button
              onClick={onOpenFastCount}
              className="px-4 py-2.5 bg-terracotta hover:bg-terracotta-hover text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-colors shadow-xs flex items-center gap-2"
            >
              <ClipboardList className="w-4 h-4" />
              <span>Saisir Relevé Shift</span>
            </button>
            <button
              onClick={onOpenWasteLog}
              className="px-4 py-2.5 bg-cream hover:bg-linen text-navy border border-sand rounded-xl text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4 text-alert" />
              <span>Déclarer Perte</span>
            </button>
            <button
              onClick={onOpenNewDelivery}
              className="px-4 py-2.5 bg-navy hover:bg-navy-mid text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-2"
            >
              <Truck className="w-4 h-4 text-terracotta" />
              <span>Réceptionner BL</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. KEY METRICS STRIP (10-Second Manager Scan) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* KPI 1: Chiffre d'Affaires Période */}
        <div className="bg-white rounded-2xl border border-sand p-4 shadow-2xs hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Ventes Période</span>
            <DollarSign className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-navy">
            {formatCurrency(totalPeriodSalesRevenue)}
          </p>
          <div className="flex items-center gap-1 mt-1 text-[11px] text-slate-500">
            <span>{sales.reduce((sum, s) => sum + s.quantity_sold, 0)} portions servies</span>
          </div>
        </div>

        {/* KPI 2: Valorisation Stock Réel */}
        <div className="bg-white rounded-2xl border border-sand p-4 shadow-2xs hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Stock Immobilisé</span>
            <Package className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-navy">
            {formatCurrency(totalStockValue)}
          </p>
          <div className="flex items-center gap-1 mt-1 text-[11px] text-slate-500">
            <span>{ingredients.length} références actives</span>
          </div>
        </div>

        {/* KPI 3: Pertes & Freintes Déclarées */}
        <div className="bg-white rounded-2xl border border-sand p-4 shadow-2xs hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Pertes Tracées</span>
            <Trash2 className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-amber-900">
            {formatCurrency(totalRecordedWasteCost)}
          </p>
          <div className="flex items-center gap-1 mt-1 text-[11px] text-slate-500">
            <span>{wasteLogs.length} déclarations justifiées</span>
          </div>
        </div>

        {/* KPI 4: Coulage Inexpliqué Estimé */}
        <div className={`rounded-2xl border p-4 shadow-2xs transition-colors ${
          totalLossCost > 0 
            ? 'bg-rose-50/50 border-rose-200 hover:border-rose-300' 
            : 'bg-white border-sand'
        }`}>
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-800">
              Coulage Inexpliqué
            </span>
            <TrendingDown className="w-4 h-4 text-alert" />
          </div>
          <p className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-alert">
            +{formatCurrency(totalLossCost)}
          </p>
          <div className="flex items-center gap-1 mt-1 text-[11px] text-rose-700 font-medium">
            <span>Écart net non justifié</span>
          </div>
        </div>

        {/* KPI 5: Anomalies Actives */}
        <div className={`rounded-2xl border p-4 shadow-2xs transition-colors ${
          totalAnomaliesCount > 0 
            ? 'bg-amber-50/50 border-amber-200' 
            : 'bg-white border-sand'
        }`}>
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-900">
              Points d'Attention
            </span>
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-navy">
            {totalAnomaliesCount}
          </p>
          <div className="flex items-center gap-1 mt-1 text-[11px] text-slate-600">
            <span>{criticalItems.length} écarts critiques · {lowStockItems.length} ruptures</span>
          </div>
        </div>
      </div>

      {/* 3. "À TRAITER EN PRIORITÉ" (Immediate Action Required) */}
      {totalAnomaliesCount > 0 && (
        <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3.5">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
              <h2 className="text-sm font-bold text-amber-950 uppercase tracking-wider">
                À Traiter en Priorité (Actions Immédiates)
              </h2>
            </div>
            <span className="text-xs font-bold text-amber-800 font-mono tabular-nums">
              {totalAnomaliesCount} alertes actives
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {/* Critical Losses */}
            {criticalItems.slice(0, 2).map(item => (
              <div key={item.ingredient.id} className="bg-white rounded-xl p-3.5 border border-amber-200/80 shadow-2xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="font-bold text-rose-700 uppercase tracking-wide">Coulage Critique</span>
                    <span className="font-mono font-bold text-alert">+{formatCurrency(item.variance_cost)}</span>
                  </div>
                  <h3 className="font-bold text-navy text-xs sm:text-sm">{item.ingredient.name}</h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Écart de {formatQuantity(item.variance_quantity, item.ingredient.unit)} ({item.variance_percentage > 0 ? `+${item.variance_percentage}%` : `${item.variance_percentage}%`})
                  </p>
                </div>
                <button
                  onClick={() => onOpenInvestigation(item.ingredient.id)}
                  className="mt-3 w-full py-1.5 px-2.5 bg-rose-50 hover:bg-rose-100 text-rose-800 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5 border border-rose-200"
                >
                  <FileSearch className="w-3.5 h-3.5 text-rose-700" />
                  <span>Lancer Enquête Détection</span>
                </button>
              </div>
            ))}

            {/* Low Stocks */}
            {lowStockItems.slice(0, 2).map(ing => (
              <div key={ing.id} className="bg-white rounded-xl p-3.5 border border-amber-200/80 shadow-2xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="font-bold text-amber-800 uppercase tracking-wide">Stock Minimum Atteint</span>
                    <span className="font-mono font-bold text-amber-900">{ing.current_stock} {ing.unit}</span>
                  </div>
                  <h3 className="font-bold text-navy text-xs sm:text-sm">{ing.name}</h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Seuil alerte : {ing.min_alert_threshold ?? 0} {ing.unit} · {ing.location || 'Réserve'}
                  </p>
                </div>
                <button
                  onClick={() => onSelectTab('purchase_orders')}
                  className="mt-3 w-full py-1.5 px-2.5 bg-amber-100/70 hover:bg-amber-100 text-amber-900 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5 border border-amber-300/60"
                >
                  <ShoppingCart className="w-3.5 h-3.5 text-amber-800" />
                  <span>Créer Bon de Commande</span>
                </button>
              </div>
            ))}

            {/* Shift Count Overdue or Check */}
            <div className="bg-white rounded-xl p-3.5 border border-amber-200/80 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span className="font-bold text-navy uppercase tracking-wide">Contrôle Shift</span>
                  <span className="text-slate-400">Quotidien</span>
                </div>
                <h3 className="font-bold text-navy text-xs sm:text-sm">Relevé de Fin de Service</h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Effectuer le comptage contradictoire des viandes nobles et alcools.
                </p>
              </div>
              <button
                onClick={onOpenFastCount}
                className="mt-3 w-full py-1.5 px-2.5 bg-navy hover:bg-navy-mid text-white rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
              >
                <ClipboardList className="w-3.5 h-3.5 text-terracotta" />
                <span>Ouvrir la Grille</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. MAIN CONTENT GRID: Loss Overview Table & Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: TOP PERTES & COULAGES TABLE */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-sand p-5 sm:p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-sand">
              <div>
                <h2 className="text-base font-bold text-navy uppercase tracking-wider">
                  Bilan des Pertes & Coulages Détectés
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Comparaison consommation théorique vs inventaire réel constaté.
                </p>
              </div>
              <button
                onClick={() => onSelectTab('variance')}
                className="text-xs font-bold text-terracotta hover:underline flex items-center gap-1 self-start sm:self-auto"
              >
                <span>Voir l'audit complet</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-sand/70 text-[11px] uppercase tracking-wider font-bold text-slate-500">
                    <th className="py-2.5 px-3">Ingrédient</th>
                    <th className="py-2.5 px-3 text-right">Théorique</th>
                    <th className="py-2.5 px-3 text-right">Réel</th>
                    <th className="py-2.5 px-3 text-right">Écart</th>
                    <th className="py-2.5 px-3 text-right">Perte Estimée</th>
                    <th className="py-2.5 px-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-sand/40">
                  {topLossCulprits.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        Aucun écart significatif détecté sur cette période. Les consommations sont conformes aux fiches techniques.
                      </td>
                    </tr>
                  ) : (
                    topLossCulprits.map(r => (
                      <tr key={r.ingredient.id} className="hover:bg-cream/40 transition-colors">
                        <td className="py-3 px-3">
                          <p className="font-bold text-navy">{r.ingredient.name}</p>
                          <p className="text-[10px] text-slate-400">
                            {CATEGORY_NAMES[r.ingredient.category] || r.ingredient.category}
                          </p>
                        </td>
                        <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-600">
                          {formatQuantity(r.theoretical_usage, r.ingredient.unit)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono tabular-nums font-semibold text-navy">
                          {formatQuantity(r.actual_usage, r.ingredient.unit)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono tabular-nums">
                          <span className={`font-bold ${r.variance_quantity > 0 ? 'text-alert' : 'text-slate-600'}`}>
                            {r.variance_quantity > 0 ? `+${r.variance_quantity}` : r.variance_quantity} {r.ingredient.unit}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right font-mono tabular-nums">
                          <span className="font-bold text-alert">
                            +{formatCurrency(r.variance_cost)}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <button
                            onClick={() => onOpenInvestigation(r.ingredient.id)}
                            className="px-2.5 py-1 rounded-lg bg-navy/5 hover:bg-navy text-navy hover:text-white font-bold text-[11px] transition-colors border border-navy/10"
                            title="Analyser les corrélations de perte"
                          >
                            Enquêter
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-sand flex items-center justify-between text-xs text-slate-500">
            <span>Règle : Conso Réelle = Stock Départ + Réceptions - Stock Compté</span>
            <span className="font-mono font-bold text-navy">
              Total Coulage : +{formatCurrency(totalLossCost)}
            </span>
          </div>
        </div>

        {/* Right 1 Col: RECENT OPERATIONAL ACTIVITY FEED */}
        <div className="bg-white rounded-2xl border border-sand p-5 sm:p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-sand">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-terracotta" />
                <h2 className="text-base font-bold text-navy uppercase tracking-wider">
                  Journal d'Activité
                </h2>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">Derniers flux</span>
            </div>

            <div className="mt-4 space-y-3.5">
              {recentActivities.map(act => (
                <div key={act.id} className="flex items-start gap-3 text-xs">
                  <div className={`p-2 rounded-xl shrink-0 mt-0.5 ${
                    act.type === 'delivery' ? 'bg-sky-50 text-sky-700' :
                    act.type === 'waste' ? 'bg-amber-50 text-amber-800' :
                    act.type === 'count' ? 'bg-emerald-50 text-emerald-800' :
                    'bg-rose-50 text-rose-800'
                  }`}>
                    {act.type === 'delivery' && <Truck className="w-3.5 h-3.5" />}
                    {act.type === 'waste' && <Trash2 className="w-3.5 h-3.5" />}
                    {act.type === 'count' && <ClipboardList className="w-3.5 h-3.5" />}
                    {act.type === 'void' && <Receipt className="w-3.5 h-3.5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-navy truncate">{act.title}</p>
                    <p className="text-[11px] text-slate-500 truncate">{act.subtitle}</p>
                    <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400">
                      <span>{act.user}</span>
                      <span>·</span>
                      <span>{act.date}</span>
                    </div>
                  </div>
                  {act.amount && (
                    <span className="font-mono tabular-nums font-bold text-[11px] text-navy shrink-0">
                      {act.amount}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 pt-3 border-t border-sand">
            <button
              onClick={() => onSelectTab('reports')}
              className="w-full py-2 bg-cream hover:bg-linen text-navy font-bold text-xs uppercase tracking-wider rounded-xl transition-colors border border-sand text-center"
            >
              Consulter les Rapports Détaillés
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
