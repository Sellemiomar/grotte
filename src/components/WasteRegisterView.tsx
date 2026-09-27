import React, { useState, useMemo } from 'react';
import { 
  Trash2, 
  Plus, 
  Search, 
  Filter, 
  Download, 
  Calendar, 
  Sun, 
  Moon, 
  AlertTriangle, 
  FileText, 
  User, 
  Building2, 
  Package,
  Layers,
  Sparkles,
  TrendingDown,
  CheckCircle2,
  XCircle,
  HelpCircle
} from 'lucide-react';
import { useStock } from '../context/StockContext';
import { WasteLog, WasteReason, CategoryType } from '../types';
import { formatCurrency, formatQuantity } from '../utils/calculations';

interface WasteRegisterViewProps {
  onOpenNewWaste: () => void;
}

const REASON_METADATA: Record<WasteReason, { label: string; icon: string; bgClass: string; textClass: string }> = {
  spoilage: { label: 'Avarié / Périmé', icon: '🍂', bgClass: 'bg-amber-500/10 border-amber-500/30', textClass: 'text-amber-800' },
  spillage: { label: 'Coulage / Renversé', icon: '💧', bgClass: 'bg-blue-500/10 border-blue-500/30', textClass: 'text-blue-800' },
  breakage: { label: 'Casse / Écrasement', icon: '💥', bgClass: 'bg-rose-500/10 border-rose-500/30', textClass: 'text-rose-800' },
  staff_meal: { label: 'Repas du personnel', icon: '🍽️', bgClass: 'bg-purple-500/10 border-purple-500/30', textClass: 'text-purple-800' },
  comp: { label: 'Offert client / Test', icon: '🍸', bgClass: 'bg-emerald-500/10 border-emerald-500/30', textClass: 'text-emerald-800' },
  other: { label: 'Autre coulage justifié', icon: '📝', bgClass: 'bg-slate-500/10 border-slate-500/30', textClass: 'text-slate-800' },
};

export const WasteRegisterView: React.FC<WasteRegisterViewProps> = ({ onOpenNewWaste }) => {
  const { 
    wasteLogs, 
    ingredients, 
    staff, 
    currentUser, 
    deleteWasteLog, 
    showToast 
  } = useStock();

  const [searchTerm, setSearchTerm] = useState('');
  const [reasonFilter, setReasonFilter] = useState<string>('all');
  const [shiftFilter, setShiftFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [dateRangeFilter, setDateRangeFilter] = useState<string>('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const canManage = currentUser?.role === 'owner' || currentUser?.role === 'stock_manager';

  // Ingredient lookup map
  const ingredientMap = useMemo(() => {
    const map = new Map<string, typeof ingredients[0]>();
    ingredients.forEach(i => map.set(i.id, i));
    return map;
  }, [ingredients]);

  // Filtered operational waste events
  const filteredLogs = useMemo(() => {
    return wasteLogs.filter(log => {
      const ing = ingredientMap.get(log.ingredient_id);
      const ingName = ing?.name?.toLowerCase() || '';
      const ingCategory = ing?.category || '';
      const loggedBy = log.logged_by?.toLowerCase() || '';
      const notes = log.notes?.toLowerCase() || '';
      const search = searchTerm.toLowerCase();

      // Text search
      if (search && !ingName.includes(search) && !loggedBy.includes(search) && !notes.includes(search)) {
        return false;
      }

      // Reason filter
      if (reasonFilter !== 'all' && log.reason !== reasonFilter) {
        return false;
      }

      // Shift filter
      if (shiftFilter !== 'all' && log.shift !== shiftFilter) {
        return false;
      }

      // Category filter
      if (categoryFilter !== 'all' && ingCategory !== categoryFilter) {
        return false;
      }

      // Date range filter
      if (dateRangeFilter === 'today') {
        const today = new Date().toISOString().slice(0, 10);
        if (log.date !== today) return false;
      } else if (dateRangeFilter === 'week') {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        if (new Date(log.date) < sevenDaysAgo) return false;
      } else if (dateRangeFilter === 'month') {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        if (new Date(log.date) < thirtyDaysAgo) return false;
      }

      return true;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [wasteLogs, ingredientMap, searchTerm, reasonFilter, shiftFilter, categoryFilter, dateRangeFilter]);

  // Aggregate stats for operational awareness
  const stats = useMemo(() => {
    let totalVal = 0;
    let totalCount = filteredLogs.length;
    let morningCount = 0;
    let eveningCount = 0;

    const reasonTotals: Record<string, number> = {};

    filteredLogs.forEach(log => {
      const val = log.quantity * log.unit_cost_at_time;
      totalVal += val;
      if (log.shift === 'morning') morningCount++;
      if (log.shift === 'evening') eveningCount++;

      reasonTotals[log.reason] = (reasonTotals[log.reason] || 0) + val;
    });

    let topReason: string = 'Aucun';
    let topReasonVal = 0;
    Object.entries(reasonTotals).forEach(([r, v]) => {
      if (v > topReasonVal) {
        topReasonVal = v;
        topReason = REASON_METADATA[r as WasteReason]?.label || r;
      }
    });

    return {
      totalValue: totalVal,
      totalCount,
      morningCount,
      eveningCount,
      topReason,
    };
  }, [filteredLogs]);

  const handleDelete = async (id: string, ingredientName?: string) => {
    if (!deleteWasteLog) return;
    if (confirm(`Confirmez-vous la suppression de cette déclaration de perte (${ingredientName || 'produit'}) ? Le stock et la variance seront automatiquement réajustés.`)) {
      setDeletingId(id);
      try {
        await deleteWasteLog(id);
      } finally {
        setDeletingId(null);
      }
    }
  };

  const handleExportCSV = () => {
    if (filteredLogs.length === 0) {
      showToast('Aucune donnée à exporter avec les filtres actuels', 'info');
      return;
    }

    const headers = [
      'Date',
      'Shift',
      'Produit',
      'Catégorie',
      'Emplacement',
      'Quantité',
      'Unité',
      'Coût Unitaire (DT)',
      'Valeur Perte (DT)',
      'Motif',
      'Déclaré Par',
      'Notes'
    ];

    const rows = filteredLogs.map(log => {
      const ing = ingredientMap.get(log.ingredient_id);
      const val = log.quantity * log.unit_cost_at_time;
      const reasonObj = REASON_METADATA[log.reason];
      return [
        `"${log.date}"`,
        `"${log.shift === 'morning' ? 'Matin' : 'Soir'}"`,
        `"${(ing?.name || 'Inconnu').replace(/"/g, '""')}"`,
        `"${ing?.category || ''}"`,
        `"${(ing?.location || '').replace(/"/g, '""')}"`,
        log.quantity,
        `"${ing?.unit || ''}"`,
        log.unit_cost_at_time.toFixed(3),
        val.toFixed(3),
        `"${reasonObj?.label || log.reason}"`,
        `"${(log.logged_by || '').replace(/"/g, '""')}"`,
        `"${(log.notes || '').replace(/"/g, '""')}"`
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `la-grotte-registre-pertes-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Export CSV du Registre des Pertes téléchargé', 'success');
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Action */}
      <div className="bg-white rounded-2xl border border-sand p-6 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-terracotta/10 text-terracotta border border-terracotta/20">
              <Trash2 className="w-5 h-5" />
            </span>
            <div>
              <h1 className="text-xl font-bold text-navy uppercase tracking-wider">
                Registre des Pertes & Freintes
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Journal opérationnel horodaté des coulages justifiés, avaries, casses et consommations autorisées.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2.5 bg-white hover:bg-linen border border-sand rounded-xl text-xs font-bold text-navy flex items-center gap-1.5 transition-colors shadow-2xs"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Exporter CSV</span>
          </button>
          <button
            onClick={onOpenNewWaste}
            className="px-4 py-2.5 bg-terracotta hover:bg-terracotta-hover text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-sm flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Déclarer une perte</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-sand p-4 shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
            Valeur Totale Déclarée
          </span>
          <div className="text-2xl font-bold text-terracotta mt-1">
            {formatCurrency(stats.totalValue)}
          </div>
          <span className="text-[11px] text-slate-500 mt-0.5 block">
            Sur {stats.totalCount} déclaration(s) affichée(s)
          </span>
        </div>

        <div className="bg-white rounded-2xl border border-sand p-4 shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
            Incidents Déclarés
          </span>
          <div className="text-2xl font-bold text-navy mt-1">
            {stats.totalCount}
          </div>
          <span className="text-[11px] text-slate-500 mt-0.5 block">
            Événements enregistrés
          </span>
        </div>

        <div className="bg-white rounded-2xl border border-sand p-4 shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
            Répartition par Shift
          </span>
          <div className="flex items-center gap-4 mt-2">
            <div className="flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-50 px-2 py-1 rounded-lg border border-amber-200">
              <Sun className="w-3.5 h-3.5 text-amber-500" />
              <span>Matin: {stats.morningCount}</span>
            </div>
            <div className="flex items-center gap-1 text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-1 rounded-lg border border-indigo-200">
              <Moon className="w-3.5 h-3.5 text-indigo-500" />
              <span>Soir: {stats.eveningCount}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-sand p-4 shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
            Motif Principal de Coulage
          </span>
          <div className="text-base font-bold text-navy mt-1 truncate">
            {stats.topReason}
          </div>
          <span className="text-[11px] text-slate-500 mt-0.5 block">
            Plus fort impact financier
          </span>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-2xl border border-sand p-4 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search input */}
          <div className="relative lg:col-span-2">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Rechercher produit, agent, note..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-cream/50 border border-sand rounded-xl focus:ring-1 focus:ring-navy focus:outline-none"
            />
          </div>

          {/* Reason Filter */}
          <div>
            <select
              value={reasonFilter}
              onChange={e => setReasonFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-cream/50 border border-sand rounded-xl focus:ring-1 focus:ring-navy focus:outline-none text-navy font-medium"
            >
              <option value="all">Tous les motifs</option>
              <option value="spoilage">🍂 Avarié / Périmé</option>
              <option value="spillage">💧 Coulage / Renversé</option>
              <option value="breakage">💥 Casse / Écrasement</option>
              <option value="staff_meal">🍽️ Repas personnel</option>
              <option value="comp">🍸 Offert client / Test</option>
              <option value="other">📝 Autre coulage justifié</option>
            </select>
          </div>

          {/* Shift Filter */}
          <div>
            <select
              value={shiftFilter}
              onChange={e => setShiftFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-cream/50 border border-sand rounded-xl focus:ring-1 focus:ring-navy focus:outline-none text-navy font-medium"
            >
              <option value="all">Tous les shifts</option>
              <option value="morning">Matin (Service Midi)</option>
              <option value="evening">Soir (Service Soir)</option>
            </select>
          </div>

          {/* Date Range Filter */}
          <div>
            <select
              value={dateRangeFilter}
              onChange={e => setDateRangeFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-cream/50 border border-sand rounded-xl focus:ring-1 focus:ring-navy focus:outline-none text-navy font-medium"
            >
              <option value="all">Toutes les dates</option>
              <option value="today">Aujourd'hui</option>
              <option value="week">7 derniers jours</option>
              <option value="month">30 derniers jours</option>
            </select>
          </div>
        </div>
      </div>

      {/* Operational Events Table */}
      <div className="bg-white rounded-2xl border border-sand shadow-xs overflow-hidden">
        <div className="p-4 border-b border-sand bg-linen/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-bold text-xs uppercase tracking-wider text-navy">
              Journal des Événements ({filteredLogs.length})
            </span>
          </div>
          <span className="text-[11px] text-slate-500 font-medium">
            Trié par date décroissante
          </span>
        </div>

        {filteredLogs.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-cream border border-sand text-slate-400 flex items-center justify-center mx-auto">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-navy text-sm">Aucune perte enregistrée</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                {searchTerm || reasonFilter !== 'all' || shiftFilter !== 'all'
                  ? 'Aucun enregistrement ne correspond aux critères de filtre sélectionnés.'
                  : 'Toutes les pertes déclarées apparaîtront ici pour le contrôle matière.'}
              </p>
            </div>
            <button
              onClick={onOpenNewWaste}
              className="px-4 py-2 bg-navy text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-colors shadow-2xs"
            >
              + Déclarer une perte maintenant
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-sand bg-cream/40 text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                  <th className="py-3 px-4">Date & Shift</th>
                  <th className="py-3 px-4">Produit / Ingrédient</th>
                  <th className="py-3 px-4">Zone / Emplacement</th>
                  <th className="py-3 px-4 text-right">Quantité</th>
                  <th className="py-3 px-4 text-right">Coût Unit.</th>
                  <th className="py-3 px-4 text-right">Valeur Perte</th>
                  <th className="py-3 px-4">Motif Déclaré</th>
                  <th className="py-3 px-4">Déclaré Par</th>
                  <th className="py-3 px-4">Notes / Contexte</th>
                  {canManage && <th className="py-3 px-4 text-center">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-sand/60">
                {filteredLogs.map(log => {
                  const ing = ingredientMap.get(log.ingredient_id);
                  const reasonMeta = REASON_METADATA[log.reason] || REASON_METADATA.other;
                  const val = log.quantity * log.unit_cost_at_time;

                  return (
                    <tr key={log.id} className="hover:bg-cream/30 transition-colors">
                      {/* Date & Shift */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-bold text-navy">{log.date}</div>
                        <div className="flex items-center gap-1 mt-0.5">
                          {log.shift === 'morning' ? (
                            <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 inline-flex items-center gap-1">
                              <Sun className="w-3 h-3 text-amber-500" /> Matin
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200 inline-flex items-center gap-1">
                              <Moon className="w-3 h-3 text-indigo-500" /> Soir
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Product */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-navy">{ing?.name || 'Ingrédient supprimé'}</div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {ing?.category && (
                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-linen border border-sand text-slate-600">
                              {ing.category}
                            </span>
                          )}
                          {ing?.barcode && (
                            <span className="text-[10px] font-mono text-slate-400">
                              #{ing.barcode}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Zone */}
                      <td className="py-3.5 px-4 text-slate-600 text-[11px] whitespace-nowrap">
                        {ing?.location || 'Zone principale'}
                      </td>

                      {/* Quantity */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap font-bold text-navy">
                        {formatQuantity(log.quantity)} <span className="font-normal text-slate-500 text-[10px]">{ing?.unit || ''}</span>
                      </td>

                      {/* Unit Cost */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap text-slate-600 font-mono text-[11px]">
                        {formatCurrency(log.unit_cost_at_time)}
                      </td>

                      {/* Loss Value */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap font-bold text-terracotta text-sm">
                        {formatCurrency(val)}
                      </td>

                      {/* Reason */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg border text-[11px] font-bold ${reasonMeta.bgClass} ${reasonMeta.textClass}`}>
                          <span>{reasonMeta.icon}</span>
                          <span>{reasonMeta.label}</span>
                        </span>
                      </td>

                      {/* Logged by */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-medium text-navy text-[11px] flex items-center gap-1">
                          <User className="w-3 h-3 text-slate-400" />
                          <span>{log.logged_by}</span>
                        </div>
                      </td>

                      {/* Notes */}
                      <td className="py-3.5 px-4 text-slate-600 max-w-xs truncate text-[11px]">
                        {log.notes || <span className="text-slate-300 italic">Aucune note</span>}
                      </td>

                      {/* Actions */}
                      {canManage && (
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <button
                            onClick={() => handleDelete(log.id, ing?.name)}
                            disabled={deletingId === log.id}
                            title="Supprimer cette déclaration et réajuster le stock"
                            className="p-1.5 text-slate-400 hover:text-alert hover:bg-alert/10 rounded-lg transition-colors disabled:opacity-40"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
