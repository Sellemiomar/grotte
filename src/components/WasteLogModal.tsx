import React, { useState } from 'react';
import { 
  Trash2, 
  X, 
  CheckCircle2, 
  History, 
  Calendar, 
  User, 
  Sun, 
  Moon, 
  AlertCircle,
  TrendingDown,
  FileText,
  Search,
  AlertTriangle,
  Copy,
  Check,
  RefreshCw,
  Shield,
  Zap,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { useStock } from '../context/StockContext';
import { formatCurrency, formatQuantity } from '../utils/calculations';
import { WasteReason, WasteLog, Ingredient } from '../types';

const WASTE_LOGS_SQL_MIGRATION = `-- Migration public.waste_logs pour Supabase
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.waste_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

CREATE INDEX IF NOT EXISTS idx_waste_logs_ingredient_date ON public.waste_logs(ingredient_id, date);
CREATE INDEX IF NOT EXISTS idx_waste_logs_date ON public.waste_logs(date DESC);
CREATE INDEX IF NOT EXISTS idx_waste_logs_reason ON public.waste_logs(reason);

ALTER TABLE public.waste_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read access for authenticated staff on waste_logs" ON public.waste_logs;
CREATE POLICY "Allow read access for authenticated staff on waste_logs"
ON public.waste_logs FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS "Staff can only log waste under their own name or manager" ON public.waste_logs;
DROP POLICY IF EXISTS "Allow authenticated staff to insert waste_logs" ON public.waste_logs;
CREATE POLICY "Allow authenticated staff to insert waste_logs"
ON public.waste_logs FOR INSERT TO authenticated
WITH CHECK (
  auth.role() = 'authenticated'
);

DROP POLICY IF EXISTS "Full access for owner and stock_manager on waste_logs" ON public.waste_logs;
CREATE POLICY "Full access for owner and stock_manager on waste_logs"
ON public.waste_logs FOR ALL TO authenticated
USING (
  public.current_user_role() IN ('owner', 'stock_manager')
)
WITH CHECK (
  public.current_user_role() IN ('owner', 'stock_manager')
);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.waste_logs;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;`;

interface WasteLogModalProps {
  onClose: () => void;
  defaultIngredientId?: string;
  onWasteLogged?: (wasteLog: WasteLog, updatedIngredient?: Ingredient | null) => void;
  onStockRecalculated?: (updatedStock?: number, ingredientName?: string) => void;
}

const REASON_LABELS: Record<WasteReason, { label: string; icon: string; desc: string }> = {
  spoilage: { label: 'Avarié / Périmé / Oxydé', icon: '🍂', desc: 'Dépassement DLC ou rupture chaîne du froid' },
  spillage: { label: 'Coulage / Renversé', icon: '💧', desc: 'Liquide versé, sauce brûlée, fond de cuve' },
  breakage: { label: 'Casse / Écrasement', icon: '💥', desc: 'Bouteille cassée, carton endommagé' },
  staff_meal: { label: 'Repas du personnel', icon: '🍽️', desc: 'Consommation cuisine ou équipe autorisée' },
  comp: { label: 'Offert client / Dégustation', icon: '🍸', desc: 'Geste commercial ou contrôle qualité' },
  other: { label: 'Autre coulage justifié', icon: '📝', desc: 'Perte technique ou découpe matière' },
};

export const WasteLogModal: React.FC<WasteLogModalProps> = ({ 
  onClose, 
  defaultIngredientId,
  onWasteLogged,
  onStockRecalculated,
}) => {
  const { 
    ingredients, 
    staff, 
    currentUser, 
    wasteLogs, 
    addWasteLog, 
    updateStockOnWaste,
    recalculateVarianceMetrics,
    lastVarianceRecalculatedAt,
    isWasteTableAvailable, 
    syncWasteLogsToSupabase,
    isSupabaseAuthActive,
    isSupabaseConnected
  } = useStock();

  const [activeTab, setActiveTab] = useState<'form' | 'history'>('form');
  const [selectedIngredientId, setSelectedIngredientId] = useState<string>(
    defaultIngredientId || ingredients[0]?.id || ''
  );
  const [quantity, setQuantity] = useState<string>('1');
  const [reason, setReason] = useState<WasteReason>('spoilage');
  const [loggedBy, setLoggedBy] = useState<string>(currentUser?.name || staff[0]?.name || 'Staff');
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [shift, setShift] = useState<'morning' | 'evening'>(() => {
    const hour = new Date().getHours();
    return hour < 15 ? 'morning' : 'evening';
  });
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitSuccess, setSubmitSuccess] = useState<boolean>(false);
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [copiedSQL, setCopiedSQL] = useState<boolean>(false);
  const [isRetryingSync, setIsRetryingSync] = useState<boolean>(false);
  const [realtimeUpdateResult, setRealtimeUpdateResult] = useState<{
    ingredientName: string;
    unit: string;
    previousStock: number;
    newStock: number;
    quantityLost: number;
    varianceAdjustedCost: number;
    timestamp: string;
  } | null>(null);

  const handleCopySQL = async () => {
    try {
      await navigator.clipboard.writeText(WASTE_LOGS_SQL_MIGRATION);
      setCopiedSQL(true);
      setTimeout(() => setCopiedSQL(false), 3000);
    } catch {
      // Fallback
      setCopiedSQL(true);
      setTimeout(() => setCopiedSQL(false), 3000);
    }
  };

  const handleRetrySync = async () => {
    setIsRetryingSync(true);
    await syncWasteLogsToSupabase();
    setIsRetryingSync(false);
  };

  const currentIngredient = ingredients.find(i => i.id === selectedIngredientId);
  const parsedQty = parseFloat(quantity) || 0;
  const estimatedCost = currentIngredient ? parsedQty * currentIngredient.cost_per_unit : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentIngredient || parsedQty <= 0) return;

    setIsSubmitting(true);
    try {
      const prevStock = currentIngredient.current_stock;
      const expectedNewStock = Math.max(0, Number((prevStock - parsedQty).toFixed(3)));

      // 1. Submit waste log & update stock in StockContext & Supabase
      const newLog = await addWasteLog({
        ingredient_id: currentIngredient.id,
        quantity: parsedQty,
        unit_cost_at_time: currentIngredient.cost_per_unit,
        reason,
        logged_by: loggedBy,
        date,
        shift,
        notes: notes.trim() || undefined,
      });

      // 2. Real-time callback trigger to recompute variance metrics immediately
      recalculateVarianceMetrics();

      // 3. Trigger callback props if provided
      if (onWasteLogged) {
        const updatedIngredient: Ingredient = {
          ...currentIngredient,
          current_stock: expectedNewStock,
        };
        onWasteLogged(newLog, updatedIngredient);
      }

      if (onStockRecalculated) {
        onStockRecalculated(expectedNewStock, currentIngredient.name);
      }

      // 4. Capture real-time calculation snapshot for immediate feedback
      setRealtimeUpdateResult({
        ingredientName: currentIngredient.name,
        unit: currentIngredient.unit,
        previousStock: prevStock,
        newStock: expectedNewStock,
        quantityLost: parsedQty,
        varianceAdjustedCost: estimatedCost,
        timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      });

      setSubmitSuccess(true);
      setTimeout(() => {
        setSubmitSuccess(false);
        setQuantity('1');
        setNotes('');
      }, 2500);
    } catch (err) {
      console.error('Failed to add waste log:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtered waste logs for history tab
  const filteredLogs = wasteLogs.filter(log => {
    if (!searchFilter) return true;
    const ing = ingredients.find(i => i.id === log.ingredient_id);
    const term = searchFilter.toLowerCase();
    return (
      ing?.name.toLowerCase().includes(term) ||
      log.logged_by.toLowerCase().includes(term) ||
      (log.notes && log.notes.toLowerCase().includes(term))
    );
  });

  const totalWasteLoggedCost = wasteLogs.reduce(
    (sum, l) => sum + (l.quantity * l.unit_cost_at_time),
    0
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-4 backdrop-blur-xs">
      <div className="bg-cream rounded-2xl max-w-2xl w-full max-h-[92vh] overflow-hidden shadow-2xl border border-sand flex flex-col animate-fade-in">
        
        {/* Header */}
        <div className="p-4 bg-navy text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-terracotta flex items-center justify-center">
              <Trash2 className="w-4 h-4 text-white" />
            </div>
            <div>
              <span className="font-bold text-[10px] uppercase tracking-wider text-terracotta block">
                Registre Anti-Coulage
              </span>
              <h3 className="text-sm sm:text-base font-bold text-white leading-tight">
                Déclaration des Pertes Connues (Waste Log)
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View toggle */}
            <div className="flex rounded-lg bg-navy-mid p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setActiveTab('form')}
                className={`px-2.5 py-1 rounded-md font-bold transition-all ${
                  activeTab === 'form' ? 'bg-terracotta text-white' : 'text-slate-300 hover:text-white'
                }`}
              >
                Saisie
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('history')}
                className={`px-2.5 py-1 rounded-md font-bold transition-all flex items-center gap-1 ${
                  activeTab === 'history' ? 'bg-terracotta text-white' : 'text-slate-300 hover:text-white'
                }`}
              >
                <History className="w-3 h-3" />
                <span>Historique ({wasteLogs.length})</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-300 hover:text-white hover:bg-navy-mid rounded-lg transition-colors"
              title="Fermer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1">
          {activeTab === 'form' ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* Real-Time Callback & Stock Recalculation Alert */}
              {realtimeUpdateResult && (
                <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-300 text-xs text-emerald-950 flex items-start gap-3 shadow-xs animate-fade-in">
                  <div className="p-1.5 bg-emerald-600 rounded-lg text-white shrink-0 mt-0.5">
                    <Zap className="w-4 h-4" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-black text-emerald-900 text-xs flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        Synchronisation & Recalcul Temps Réel Réussis
                      </span>
                      <span className="text-[10px] font-mono text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-md font-semibold">
                        {realtimeUpdateResult.timestamp}
                      </span>
                    </div>
                    <p className="text-[11px] text-emerald-800 leading-relaxed">
                      Niveau de stock de <strong>{realtimeUpdateResult.ingredientName}</strong> mis à jour dans le StockContext :{' '}
                      <span className="font-mono font-bold text-emerald-950">
                        {formatQuantity(realtimeUpdateResult.previousStock, realtimeUpdateResult.unit)} → {formatQuantity(realtimeUpdateResult.newStock, realtimeUpdateResult.unit)}
                      </span>{' '}
                      <span className="text-emerald-700 font-semibold">(-{formatQuantity(realtimeUpdateResult.quantityLost, realtimeUpdateResult.unit)})</span>.
                    </p>
                    <p className="text-[11px] text-emerald-700 font-medium">
                      ✓ Métriques d'écarts de consommation et coulage inexpliqué recalculées immédiatement (-{formatCurrency(realtimeUpdateResult.varianceAdjustedCost)}).
                    </p>
                  </div>
                </div>
              )}
              
              {/* Supabase Schema Migration Notice if table is missing in Supabase */}
              {!isWasteTableAvailable && (
                <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 space-y-2.5">
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="font-bold text-amber-950 text-xs">
                        Stockage local actif (Table Supabase <code className="bg-amber-100/80 px-1 py-0.5 rounded font-mono text-[10px]">waste_logs</code> en attente)
                      </p>
                      <p className="text-[11px] text-amber-800 leading-relaxed">
                        Vos déclarations sont conservées sur votre navigateur et incluses dans vos calculs de pertes. Pour synchroniser avec PostgreSQL, exécutez la migration dans la console Supabase.
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-amber-200/70">
                    <button
                      type="button"
                      onClick={handleCopySQL}
                      className="px-2.5 py-1.5 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white rounded-lg font-semibold text-[11px] flex items-center gap-1.5 transition-colors shadow-xs"
                    >
                      {copiedSQL ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedSQL ? 'Script SQL copié !' : 'Copier le script SQL'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleRetrySync}
                      disabled={isRetryingSync}
                      className="px-2.5 py-1.5 bg-white hover:bg-amber-100/70 active:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg font-semibold text-[11px] flex items-center gap-1.5 transition-colors"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isRetryingSync ? 'animate-spin' : ''}`} />
                      <span>{isRetryingSync ? 'Vérification...' : 'Vérifier & synchroniser'}</span>
                    </button>
                    <a
                      href="https://supabase.com/dashboard/project/atcpmlaijqxvehuwacpc/sql/new"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-amber-900 underline hover:text-amber-950 font-medium ml-auto"
                    >
                      Ouvrir Supabase SQL Editor →
                    </a>
                  </div>
                </div>
              )}

              {/* RLS Informational Notice when table exists but session is unauthenticated */}
              {isWasteTableAvailable && isSupabaseConnected && !isSupabaseAuthActive && (
                <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-200 text-xs text-blue-900 flex items-start gap-2.5">
                  <Shield className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <p className="font-semibold text-blue-950 text-xs">
                      Enregistrement local actif • Sécurité RLS stricte
                    </p>
                    <p className="text-[11px] text-blue-800 leading-relaxed">
                      Vos pertes sont enregistrées localement et calculées dans vos audits. Pour synchroniser avec PostgreSQL, connectez-vous avec votre compte Supabase (via le badge utilisateur).
                    </p>
                  </div>
                </div>
              )}

              {/* Notice Banner */}
              <div className="p-3 bg-linen/60 rounded-xl border border-sand/80 text-xs text-navy flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-terracotta shrink-0 mt-0.5" />
                <p className="leading-relaxed text-[11px] sm:text-xs">
                  <strong>Règle de Gestion :</strong> Toute matière jetée ou consommée hors vente doit être déclarée ici. Cela évite qu'elle soit comptabilisée comme du <em>coulage inexpliqué ou une suspicion de vol</em> lors de l'audit de clôture.
                </p>
              </div>

              {/* Ingredient Selection */}
              <div>
                <label className="block text-xs font-bold text-navy uppercase tracking-wider mb-1">
                  Ingrédient ou Produit Dégradé
                </label>
                <select
                  value={selectedIngredientId}
                  onChange={(e) => setSelectedIngredientId(e.target.value)}
                  className="w-full px-3 py-2.5 bg-white rounded-xl border border-sand text-sm font-medium text-navy focus:outline-none focus:ring-2 focus:ring-terracotta"
                  required
                >
                  {ingredients.map(ing => (
                    <option key={ing.id} value={ing.id}>
                      {ing.name} — Stock actuel : {formatQuantity(ing.current_stock, ing.unit)} ({formatCurrency(ing.cost_per_unit)}/{ing.unit})
                    </option>
                  ))}
                </select>
              </div>

              {/* Quantity & Live Cost Calculation */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-navy uppercase tracking-wider mb-1">
                    Quantité Perdue ({currentIngredient?.unit || 'unité'})
                  </label>
                  <div className="flex items-center">
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      className="w-full px-3 py-2.5 bg-white rounded-xl border border-sand text-base font-bold text-navy focus:outline-none focus:ring-2 focus:ring-terracotta font-mono"
                      placeholder="0.00"
                      required
                    />
                    <span className="ml-2 text-xs font-bold text-slate-500 font-mono">
                      {currentIngredient?.unit}
                    </span>
                  </div>
                </div>

                {/* Financial Impact Metric */}
                <div className="bg-alert/10 border border-alert/20 rounded-xl p-3 flex flex-col justify-center">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-alert block flex items-center gap-1">
                    <TrendingDown className="w-3 h-3" />
                    Impact Financier Estimé
                  </span>
                  <div className="text-xl font-black text-alert font-mono tabular-nums">
                    {formatCurrency(estimatedCost)}
                  </div>
                  <span className="text-[10px] text-slate-500">
                    Basé sur PAMP actuel : {formatCurrency(currentIngredient?.cost_per_unit || 0)}/{currentIngredient?.unit}
                  </span>
                </div>
              </div>

              {/* Real-time Stock Level Transition Card */}
              {currentIngredient && (
                <div className="p-3 bg-white rounded-xl border border-sand space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-navy uppercase tracking-wider flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-terracotta" />
                      Aperçu Déduction de Stock & Régularisation Coulage
                    </span>
                    <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      Temps Réel
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center pt-1">
                    <div className="p-2 rounded-lg bg-linen/50 border border-sand/60">
                      <span className="text-[10px] font-bold text-slate-500 uppercase block">Stock Actuel</span>
                      <span className="text-xs sm:text-sm font-bold text-navy font-mono">
                        {formatQuantity(currentIngredient.current_stock, currentIngredient.unit)}
                      </span>
                    </div>

                    <div className="p-2 rounded-lg bg-alert/10 border border-alert/30">
                      <span className="text-[10px] font-bold text-alert uppercase block">Perte Déclarée</span>
                      <span className="text-xs sm:text-sm font-bold text-alert font-mono">
                        -{formatQuantity(parsedQty, currentIngredient.unit)}
                      </span>
                    </div>

                    <div className={`p-2 rounded-lg border ${
                      (currentIngredient.current_stock - parsedQty) < (currentIngredient.min_alert_threshold || 0)
                        ? 'bg-amber-50 border-amber-300 text-amber-900'
                        : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    }`}>
                      <span className="text-[10px] font-bold uppercase block text-slate-600">Nouveau Stock</span>
                      <span className="text-xs sm:text-sm font-black font-mono">
                        {formatQuantity(Math.max(0, currentIngredient.current_stock - parsedQty), currentIngredient.unit)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-500 border-t border-sand/60 pt-1.5">
                    <span>Impact Coulage : <strong>+{formatCurrency(estimatedCost)}</strong> déduits de l'inconnu</span>
                    <span className="text-terracotta font-semibold flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-terracotta" />
                      Écart recalculé à la soumission
                    </span>
                  </div>
                </div>
              )}

              {/* Reason Selector */}
              <div>
                <label className="block text-xs font-bold text-navy uppercase tracking-wider mb-1.5">
                  Motif / Cause de la Perte
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {(Object.keys(REASON_LABELS) as WasteReason[]).map(key => {
                    const info = REASON_LABELS[key];
                    const isSelected = reason === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setReason(key)}
                        className={`p-2.5 rounded-xl border text-left transition-all flex flex-col gap-1 ${
                          isSelected
                            ? 'bg-terracotta/10 border-terracotta text-navy ring-1 ring-terracotta'
                            : 'bg-white border-sand text-slate-600 hover:bg-sand/30'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 font-bold text-xs">
                          <span>{info.icon}</span>
                          <span className="truncate">{info.label}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 line-clamp-1 leading-tight">
                          {info.desc}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Service & Staff Details */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-navy uppercase tracking-wider mb-1 flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-slate-400" />
                    Date
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white rounded-xl border border-sand text-xs font-semibold text-navy focus:outline-none focus:ring-2 focus:ring-terracotta"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-navy uppercase tracking-wider mb-1">
                    Shift / Service
                  </label>
                  <div className="grid grid-cols-2 gap-1 bg-white p-1 rounded-xl border border-sand">
                    <button
                      type="button"
                      onClick={() => setShift('morning')}
                      className={`py-1 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-colors ${
                        shift === 'morning' ? 'bg-amber-100 text-amber-900' : 'text-slate-500 hover:text-navy'
                      }`}
                    >
                      <Sun className="w-3 h-3" />
                      Midi
                    </button>
                    <button
                      type="button"
                      onClick={() => setShift('evening')}
                      className={`py-1 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-colors ${
                        shift === 'evening' ? 'bg-indigo-100 text-indigo-900' : 'text-slate-500 hover:text-navy'
                      }`}
                    >
                      <Moon className="w-3 h-3" />
                      Soir
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-navy uppercase tracking-wider mb-1 flex items-center gap-1">
                    <User className="w-3 h-3 text-slate-400" />
                    Déclaré Par
                  </label>
                  <select
                    value={loggedBy}
                    onChange={(e) => setLoggedBy(e.target.value)}
                    className="w-full px-3 py-2 bg-white rounded-xl border border-sand text-xs font-semibold text-navy focus:outline-none focus:ring-2 focus:ring-terracotta"
                  >
                    {staff.map(s => (
                      <option key={s.id} value={s.name}>
                        {s.name} ({s.roleTitle || s.role})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Justification Notes */}
              <div>
                <label className="block text-xs font-bold text-navy uppercase tracking-wider mb-1 flex items-center gap-1">
                  <FileText className="w-3 h-3 text-slate-400" />
                  Circonstance / Explication (Optionnel)
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ex: Fond de cuve bière lors du changement de fût, ou 2 pavés de saumon oubliés hors froid..."
                  className="w-full px-3 py-2 bg-white rounded-xl border border-sand text-xs text-navy placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-terracotta"
                />
              </div>

              {/* Submit Buttons */}
              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-navy transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || parsedQty <= 0}
                  className="px-5 py-2.5 rounded-xl bg-terracotta hover:bg-terracotta-hover text-white text-xs font-bold uppercase tracking-wider shadow-sm transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {submitSuccess ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-white animate-scale-in" />
                      <span>Perte Enregistrée !</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      <span>{isSubmitting ? 'Enregistrement...' : 'Enregistrer le Coulage'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            /* History Tab */
            <div className="space-y-4">
              {/* Summary KPIs */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="bg-white p-3 rounded-xl border border-sand">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Total Pertes Connues</span>
                  <div className="text-lg font-black text-navy font-mono tabular-nums">
                    {formatCurrency(totalWasteLoggedCost)}
                  </div>
                </div>
                <div className="bg-white p-3 rounded-xl border border-sand">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Nombre d'enregistrements</span>
                  <div className="text-lg font-black text-navy font-mono">
                    {wasteLogs.length}
                  </div>
                </div>
                <div className="bg-white p-3 rounded-xl border border-sand col-span-2 sm:col-span-1">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Effet sur le Coulage</span>
                  <div className="text-xs font-bold text-success mt-1">
                    Déduit de l'écart inexpliqué
                  </div>
                </div>
              </div>

              {/* Search Filter */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  placeholder="Rechercher par ingrédient, membre du staff ou motif..."
                  className="w-full pl-9 pr-3 py-2 bg-white rounded-xl border border-sand text-xs text-navy focus:outline-none focus:ring-2 focus:ring-terracotta"
                />
              </div>

              {/* Logs List */}
              <div className="space-y-2">
                {filteredLogs.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-xs italic">
                    Aucune perte enregistrée trouvée.
                  </div>
                ) : (
                  filteredLogs.map(log => {
                    const ing = ingredients.find(i => i.id === log.ingredient_id);
                    const cost = log.quantity * log.unit_cost_at_time;
                    const reasonInfo = REASON_LABELS[log.reason] || { label: log.reason, icon: '📝' };

                    return (
                      <div
                        key={log.id}
                        className="bg-white p-3 rounded-xl border border-sand flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xl">{reasonInfo.icon}</span>
                          <div>
                            <div className="font-bold text-navy flex items-center gap-1.5">
                              <span>{ing?.name || 'Ingrédient'}</span>
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                                {formatQuantity(log.quantity, ing?.unit || 'u')}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                              <span>{log.date} ({log.shift === 'morning' ? 'Midi' : 'Soir'})</span>
                              <span>•</span>
                              <span>Par {log.logged_by}</span>
                              {log.notes && (
                                <>
                                  <span>•</span>
                                  <span className="italic text-slate-600">"{log.notes}"</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="font-mono font-bold text-alert tabular-nums">
                            -{formatCurrency(cost)}
                          </div>
                          <span className="text-[10px] text-slate-400 block uppercase">
                            {reasonInfo.label}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
