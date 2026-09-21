import React, { useState } from 'react';
import { 
  ClipboardList, 
  Check, 
  User, 
  Calendar, 
  Plus, 
  Minus, 
  History, 
  Search,
  CheckCircle2,
  X,
  Sun,
  Moon,
  Camera,
  Image as ImageIcon,
  Layers,
  Barcode as BarcodeIcon,
  Tag,
  Printer,
  Sparkles
} from 'lucide-react';
import { useStock } from '../context/StockContext';
import { formatCurrency, formatQuantity } from '../utils/calculations';
import { BarcodeScannerModal } from './BarcodeScannerModal';
import { PrintableLabelsModal } from './PrintableLabelsModal';

interface StockCountSheetProps {
  onClose?: () => void;
  isModal?: boolean;
}

interface RawCountItem {
  id: string;
  name: string;
  unit: string;
  system: number;
  counted: number;
  diffQty: number;
  diffCost: number;
}

export const StockCountSheet: React.FC<StockCountSheetProps> = ({ onClose, isModal = false }) => {
  const { ingredients, stockCounts, staff, currentUser, recordBatchStockCounts } = useStock();

  const [countedBy, setCountedBy] = useState(currentUser?.name || staff[0]?.name || 'Omar Sellemi');
  const [shift, setShift] = useState<'morning' | 'evening'>(() => {
    const hr = new Date().getHours();
    return hr < 15 ? 'morning' : 'evening';
  });
  const [countDate, setCountDate] = useState(new Date().toISOString().slice(0, 10));
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'sheet' | 'history'>('sheet');
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [photoProof, setPhotoProof] = useState<string>('');
  const [postCountSummary, setPostCountSummary] = useState<RawCountItem[] | null>(null);
  const [isBarcodeScannerOpen, setIsBarcodeScannerOpen] = useState(false);
  const [isLabelsModalOpen, setIsLabelsModalOpen] = useState(false);
  const [lastScannedId, setLastScannedId] = useState<string | null>(null);

  // Draft counts map: ingredientId -> count number
  const [draftCounts, setDraftCounts] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    ingredients.forEach(ing => {
      initial[ing.id] = ing.current_stock;
    });
    return initial;
  });

  // Extract unique locations
  const locations = Array.from(new Set(ingredients.map(i => i.location || 'Réserve Principale')));

  // Filtered ingredients for counting
  const filteredIngredients = ingredients.filter(ing => {
    if (selectedLocation !== 'all' && (ing.location || 'Réserve Principale') !== selectedLocation) {
      return false;
    }
    if (search.trim() !== '') {
      const term = search.toLowerCase();
      return ing.name.toLowerCase().includes(term) || ing.category.toLowerCase().includes(term);
    }
    return true;
  });

  const handleAdjust = (ingredientId: string, delta: number) => {
    setDraftCounts(prev => {
      const current = prev[ingredientId] ?? 0;
      const step = Math.max(0, Number((current + delta).toFixed(2)));
      return { ...prev, [ingredientId]: step };
    });
  };

  const handleDirectInput = (ingredientId: string, valStr: string) => {
    const val = parseFloat(valStr);
    setDraftCounts(prev => ({
      ...prev,
      [ingredientId]: isNaN(val) ? 0 : val,
    }));
  };

  const handleSimulatePhoto = () => {
    const dummyProof = `https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?w=400&auto=format&fit=crop&q=80`;
    setPhotoProof(dummyProof);
  };

  const handleSubmitAll = () => {
    const rawItems: RawCountItem[] = filteredIngredients.map(ing => {
      const system = ing.current_stock ?? 0;
      const counted = draftCounts[ing.id] ?? system;
      const diffQty = Number((counted - system).toFixed(2));
      const diffCost = Number((diffQty * ing.cost_per_unit).toFixed(2));
      return {
        id: ing.id,
        name: ing.name,
        unit: ing.unit,
        system,
        counted,
        diffQty,
        diffCost,
      };
    });

    const batch = filteredIngredients.map(ing => ({
      ingredient_id: ing.id,
      counted_quantity: draftCounts[ing.id] ?? ing.current_stock,
      counted_by: countedBy,
      date: countDate,
      shift: shift,
      photo_url: photoProof || undefined,
    }));

    recordBatchStockCounts(batch);
    setPostCountSummary(rawItems);
    setSavedSuccess(true);
  };

  // Recent counts grouped by date
  const sortedCounts = [...stockCounts].sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  return (
    <div className={`space-y-6 ${isModal ? 'p-2 max-h-[85vh] overflow-y-auto' : 'pb-12'}`}>
      {/* Top Header Card */}
      <div className="bg-white rounded-2xl border border-sand p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-navy text-terracotta shadow-xs">
              <ClipboardList className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-navy uppercase tracking-wide">
                  Feuille de Comptage Inventaire Terrain
                </h2>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-success/10 text-success border border-success/30">
                  TACTILE OPTIMISÉ
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Touches larges 44px+ pour saisie rapide sur smartphone en chambre froide et réserves.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            <div className="inline-flex rounded-xl border border-sand bg-cream p-0.5 text-xs">
              <button
                onClick={() => setActiveTab('sheet')}
                className={`px-3 py-1.5 rounded-lg font-bold uppercase tracking-wider text-xs transition-colors ${
                  activeTab === 'sheet' ? 'bg-navy text-white shadow-xs' : 'text-slate-600 hover:text-navy'
                }`}
              >
                Comptage en cours
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`px-3 py-1.5 rounded-lg font-bold uppercase tracking-wider text-xs transition-colors ${
                  activeTab === 'history' ? 'bg-navy text-white shadow-xs' : 'text-slate-600 hover:text-navy'
                }`}
              >
                Historique ({stockCounts.length})
              </button>
            </div>

            {onClose && (
              <button
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-navy hover:bg-cream rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Counter Staff, Shift & Date Settings */}
        {activeTab === 'sheet' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4 pt-4 border-t border-sand text-xs">
            <div>
              <label className="block text-slate-600 font-bold uppercase tracking-wider text-[10px] mb-1 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-400" />
                Responsable du comptage
              </label>
              <select
                value={countedBy}
                onChange={e => setCountedBy(e.target.value)}
                className="w-full bg-cream border border-sand rounded-xl px-2.5 py-2 text-xs text-navy font-semibold focus:outline-none focus:ring-1 focus:ring-navy"
              >
                {staff.map(stf => (
                  <option key={stf.id} value={stf.name}>
                    {stf.name} ({stf.role})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-600 font-bold uppercase tracking-wider text-[10px] mb-1 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                Shift / Service
              </label>
              <div className="grid grid-cols-2 gap-1 p-0.5 bg-cream rounded-xl border border-sand">
                <button
                  type="button"
                  onClick={() => setShift('morning')}
                  className={`flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    shift === 'morning'
                      ? 'bg-terracotta text-white shadow-xs'
                      : 'text-slate-600 hover:text-navy'
                  }`}
                >
                  <Sun className="w-3.5 h-3.5" />
                  Matin
                </button>
                <button
                  type="button"
                  onClick={() => setShift('evening')}
                  className={`flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    shift === 'evening'
                      ? 'bg-navy text-white shadow-xs'
                      : 'text-slate-600 hover:text-navy'
                  }`}
                >
                  <Moon className="w-3.5 h-3.5" />
                  Soir
                </button>
              </div>
            </div>

            <div>
              <label className="block text-slate-600 font-bold uppercase tracking-wider text-[10px] mb-1 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                Date du relevé
              </label>
              <input
                type="date"
                value={countDate}
                onChange={e => setCountDate(e.target.value)}
                className="w-full bg-cream border border-sand rounded-xl px-2.5 py-2 text-xs text-navy focus:outline-none focus:ring-1 focus:ring-navy"
              />
            </div>

            <div>
              <label className="block text-slate-600 font-bold uppercase tracking-wider text-[10px] mb-1">
                Zone / Rayon à inventorier
              </label>
              <select
                value={selectedLocation}
                onChange={e => setSelectedLocation(e.target.value)}
                className="w-full bg-cream border border-sand rounded-xl px-2.5 py-2 text-xs text-navy focus:outline-none focus:ring-1 focus:ring-navy"
              >
                <option value="all">Toutes les zones ({ingredients.length} articles)</option>
                {locations.map(loc => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Photo Proof Bar */}
        {activeTab === 'sheet' && (
          <div className="mt-3 pt-3 border-t border-sand flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-slate-500 text-[11px] font-medium">Preuve visuelle (audit de clôture) :</span>
              {photoProof ? (
                <div className="flex items-center gap-2 bg-success/10 text-success border border-success/30 px-2.5 py-1 rounded-lg text-[11px] font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Photo bacs / étagères attachée</span>
                  <button 
                    onClick={() => setPhotoProof('')}
                    className="text-slate-400 hover:text-rose-600 ml-1"
                  >
                    ×
                  </button>
                </div>
              ) : (
                <span className="text-slate-400 italic text-[11px]">Aucune photo jointe</span>
              )}
            </div>

            <button
              type="button"
              onClick={handleSimulatePhoto}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cream hover:bg-linen text-navy border border-sand text-xs font-semibold transition-colors shadow-2xs"
            >
              <Camera className="w-3.5 h-3.5 text-terracotta" />
              {photoProof ? 'Remplacer la photo' : 'Prendre une photo (Smartphone)'}
            </button>
          </div>
        )}
      </div>

      {savedSuccess && (
        <div className="space-y-4">
          <div className="p-4 bg-success/10 border border-success/30 rounded-2xl text-success flex items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-success shrink-0" />
              <div>
                <p className="font-bold text-sm">Inventaire physique validé avec succès !</p>
                <p className="text-xs text-success">
                  Enregistré par <strong>{countedBy}</strong> ({shift === 'morning' ? 'Service Matin' : 'Service Soir'}) au {countDate}. Stocks réels actualisés.
                </p>
              </div>
            </div>
            {onClose && (
              <button
                onClick={onClose}
                className="px-4 py-2 bg-navy hover:bg-navy-mid text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-colors shadow-xs"
              >
                Fermer
              </button>
            )}
          </div>

          {postCountSummary && (
            <div className="bg-white rounded-2xl border border-sand shadow-xs overflow-hidden">
              <div className="p-4 bg-cream border-b border-sand flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-navy uppercase tracking-wider">
                    Rapport des Écarts Bruts (Comptage Terrain vs Stock Théorique Système)
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Constat brut immédiat avant confrontation avec les fiches recettes.
                  </p>
                </div>
                <span className="text-xs font-mono font-bold text-navy bg-white border border-sand px-2.5 py-1 rounded-lg">
                  {postCountSummary.length} articles vérifiés
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-cream border-b border-sand text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                      <th className="py-2.5 px-4">Ingrédient</th>
                      <th className="py-2.5 px-3 text-right">Stock Système</th>
                      <th className="py-2.5 px-3 text-right">Quantité Comptée</th>
                      <th className="py-2.5 px-3 text-right font-bold">Écart Brut (Qté)</th>
                      <th className="py-2.5 px-4 text-right font-bold">Valeur de l'Écart (DT)</th>
                      <th className="py-2.5 px-3 text-center">Constat</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-sand/60">
                    {postCountSummary.map(item => {
                      const isZero = item.diffQty === 0;
                      const isNegative = item.diffQty < 0;
                      return (
                        <tr key={item.id} className="hover:bg-cream/50">
                          <td className="py-2.5 px-4 font-semibold text-navy">
                            {item.name}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-600 tabular-nums">
                            {formatQuantity(item.system, item.unit)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-navy tabular-nums">
                            {formatQuantity(item.counted, item.unit)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold tabular-nums">
                            <span className={isZero ? 'text-slate-400' : isNegative ? 'text-alert' : 'text-navy'}>
                              {item.diffQty > 0 ? `+${item.diffQty}` : item.diffQty} {item.unit}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono font-bold tabular-nums">
                            <span className={isZero ? 'text-slate-400' : isNegative ? 'text-alert' : 'text-navy'}>
                              {item.diffCost > 0 ? `+${formatCurrency(item.diffCost)}` : formatCurrency(item.diffCost)}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {isZero ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-success/10 text-success border border-success/25">
                                Conforme
                              </span>
                            ) : isNegative ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-alert/10 text-alert border border-alert/25">
                                Déficit (Manquant)
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                Excédent (Surplus)
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="p-3 bg-cream border-t border-sand flex items-center justify-between text-xs">
                <span className="text-slate-600">
                  Total écart brut valorisé : <strong className="font-mono font-bold text-navy tabular-nums">{formatCurrency(postCountSummary.reduce((acc, i) => acc + i.diffCost, 0))}</strong>
                </span>
                <button
                  onClick={() => {
                    setSavedSuccess(false);
                    setPostCountSummary(null);
                    if (onClose) onClose();
                  }}
                  className="px-4 py-2 bg-navy hover:bg-navy-mid text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-colors shadow-xs"
                >
                  Continuer
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main Count Cards */}
      {activeTab === 'sheet' && (
        <div className="space-y-3">
          {/* Action Bar: Barcode Scanner Trigger, Search, and Labels */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            {/* Quick Search */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Filtrer un produit par nom, catégorie ou référence..."
                className="w-full pl-9 pr-3 py-2.5 text-xs bg-white border border-sand rounded-xl shadow-2xs focus:outline-none focus:ring-1 focus:ring-navy"
              />
            </div>

            {/* Barcode Camera Scanner Button */}
            <button
              type="button"
              onClick={() => setIsBarcodeScannerOpen(true)}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-terracotta hover:bg-terracotta/90 text-white rounded-xl text-xs font-bold transition-all shadow-xs active:scale-95 shrink-0"
            >
              <BarcodeIcon className="w-4 h-4" />
              <span>Scanner Code-Barres / QR (Caméra)</span>
            </button>

            {/* Print Crate & Shelf QR Labels */}
            <button
              type="button"
              onClick={() => setIsLabelsModalOpen(true)}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-white hover:bg-linen text-navy border border-sand rounded-xl text-xs font-semibold transition-colors shadow-2xs shrink-0"
              title="Générer des étiquettes QR codes adhésives pour les cagettes et bacs de chambre froide"
            >
              <Printer className="w-4 h-4 text-terracotta" />
              <span>Étiquettes Bacs</span>
            </button>
          </div>

          {/* Cards Grid */}
          {filteredIngredients.length === 0 ? (
            <div className="bg-white rounded-2xl border border-sand p-12 text-center max-w-md mx-auto space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-cream text-slate-400 mx-auto flex items-center justify-center">
                <Layers className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-sm text-navy">Aucun ingrédient correspondant</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Vérifiez le filtre de zone ou modifiez votre terme de recherche.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredIngredients.map(ing => {
                const currentStock = ing.current_stock ?? 0;
                const currentCount = draftCounts[ing.id] ?? currentStock;
                const diff = Number((currentCount - currentStock).toFixed(2));

                const isJustScanned = lastScannedId === ing.id;

                return (
                  <div
                    key={ing.id}
                    id={`stock-card-${ing.id}`}
                    className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                      isJustScanned 
                        ? 'bg-amber-50/40 border-terracotta ring-2 ring-terracotta/30 shadow-md' 
                        : 'bg-white border-sand shadow-xs hover:border-slate-400'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-navy">
                            {ing.name}
                          </h4>
                          {isJustScanned && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-terracotta text-white animate-pulse">
                              Scanné
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1">
                          <span className="text-[10px] bg-cream text-slate-700 px-2 py-0.5 rounded-md font-medium border border-sand">
                            {ing.location || 'Réserve'}
                          </span>
                          <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-mono border border-slate-200 flex items-center gap-1">
                            <BarcodeIcon className="w-2.5 h-2.5 text-slate-400" />
                            {ing.barcode || ing.id}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono tabular-nums ml-0.5">
                            Stock actuel : <strong className="text-navy">{formatQuantity(ing.current_stock, ing.unit)}</strong>
                          </span>
                        </div>
                      </div>

                      {/* Diff Indicator */}
                      {diff !== 0 && (
                        <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full font-mono tabular-nums ${
                          diff > 0 ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-alert/10 text-alert border border-alert/25'
                        }`}>
                          {diff > 0 ? `+${diff}` : diff} {ing.unit}
                        </span>
                      )}
                    </div>

                    {/* Touch-Friendly Quantity Control Steppers (min 44px) */}
                    <div className="mt-4 pt-3 border-t border-sand flex items-center justify-between gap-2">
                      {/* Decrement buttons (44x44px minimum for mobile ergonomics) */}
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleAdjust(ing.id, -5)}
                          className="w-11 h-11 rounded-xl bg-cream hover:bg-linen text-navy border border-sand text-xs font-bold transition-colors active:scale-95 flex items-center justify-center shadow-2xs"
                          title="-5"
                        >
                          -5
                        </button>
                        <button
                          onClick={() => handleAdjust(ing.id, -1)}
                          className="w-11 h-11 rounded-xl bg-cream hover:bg-linen text-navy border border-sand flex items-center justify-center transition-colors font-bold active:scale-95 shadow-2xs"
                          title="-1"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Direct Value Input */}
                      <div className="flex items-center justify-center gap-1.5 flex-1">
                        <input
                          type="number"
                          step={ing.unit === 'unit/piece' ? '1' : '0.1'}
                          value={currentCount}
                          onChange={e => handleDirectInput(ing.id, e.target.value)}
                          className="w-24 text-center font-bold font-mono tabular-nums text-base bg-cream border border-sand rounded-xl py-2 text-navy focus:bg-white focus:ring-2 focus:ring-navy focus:outline-none"
                        />
                        <span className="text-xs font-semibold text-slate-500 w-8">
                          {ing.unit}
                        </span>
                      </div>

                      {/* Increment buttons (44x44px minimum for mobile ergonomics) */}
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleAdjust(ing.id, 1)}
                          className="w-11 h-11 rounded-xl bg-cream hover:bg-linen text-navy border border-sand flex items-center justify-center transition-colors font-bold active:scale-95 shadow-2xs"
                          title="+1"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleAdjust(ing.id, 5)}
                          className="w-11 h-11 rounded-xl bg-cream hover:bg-linen text-navy border border-sand text-xs font-bold transition-colors active:scale-95 flex items-center justify-center shadow-2xs"
                          title="+5"
                        >
                          +5
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Sticky Bottom Validation Bar */}
          <div className="sticky bottom-4 z-20 bg-navy text-white p-4 rounded-2xl shadow-xl flex flex-col sm:flex-row items-center justify-between gap-3 border border-white/10">
            <div>
              <p className="text-xs text-sand">
                Relevé par <strong className="text-white">{countedBy}</strong> ({shift === 'morning' ? 'Matin / Préparation' : 'Soir / Clôture'}) au <strong className="text-white">{countDate}</strong>
              </p>
              <p className="text-[11px] text-sand/70">
                {filteredIngredients.length} articles vérifiés. {photoProof ? '✓ Preuve photo attachée. ' : ''}Actualisation immédiate des variances.
              </p>
            </div>

            <button
              onClick={handleSubmitAll}
              className="w-full sm:w-auto px-6 py-3 bg-terracotta hover:bg-terracotta-hover text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-colors shadow-md flex items-center justify-center gap-2 shrink-0 active:scale-98"
            >
              <Check className="w-4 h-4" />
              Valider l'inventaire physique
            </button>
          </div>
        </div>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-2xl border border-sand p-5 shadow-xs">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
            <History className="w-4 h-4 text-terracotta" />
            Historique des comptages physiques enregistrés (par Shift)
          </h3>
          <div className="divide-y divide-sand/60 max-h-[60vh] overflow-y-auto">
            {sortedCounts.map(count => {
              const ing = ingredients.find(i => i.id === count.ingredient_id);
              const isMorning = count.shift === 'morning';
              return (
                <div key={count.id} className="py-3 flex items-center justify-between text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-navy">
                        {ing?.name || 'Article inconnu'}
                      </span>
                      {count.shift && (
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          isMorning 
                            ? 'bg-amber-100 text-amber-900 border border-amber-200' 
                            : 'bg-navy text-white'
                        }`}>
                          {isMorning ? <Sun className="w-2.5 h-2.5" /> : <Moon className="w-2.5 h-2.5" />}
                          {isMorning ? 'Matin' : 'Soir'}
                        </span>
                      )}
                      {count.photo_url && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-success/10 text-success font-medium border border-success/30">
                          <ImageIcon className="w-2.5 h-2.5" />
                          Photo
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500 flex items-center gap-2">
                      <span>Par <strong className="text-navy">{count.counted_by}</strong></span>
                      <span>•</span>
                      <span>{count.date}</span>
                      {count.notes && <span className="text-slate-400 italic">({count.notes})</span>}
                    </div>
                  </div>
                  <div className="font-mono font-bold text-navy bg-cream px-3 py-1.5 rounded-xl border border-sand tabular-nums">
                    {formatQuantity(count.counted_quantity, ing?.unit || '')}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Camera Barcode & QR Scanner Modal */}
      <BarcodeScannerModal
        isOpen={isBarcodeScannerOpen}
        onClose={() => setIsBarcodeScannerOpen(false)}
        draftCounts={draftCounts}
        onUpdateDraftCount={(ingredientId, newCount) => {
          handleDirectInput(ingredientId, String(newCount));
          setLastScannedId(ingredientId);
          setTimeout(() => {
            const el = document.getElementById(`stock-card-${ingredientId}`);
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }, 100);
        }}
        title="Scanner d'Inventaire en Chambre Froide"
        subtitle="Pointez l'objectif vers le code du bac, carton ou cageot pour saisie directe"
      />

      {/* Printable Crate & Shelf Labels Modal */}
      <PrintableLabelsModal
        isOpen={isLabelsModalOpen}
        onClose={() => setIsLabelsModalOpen(false)}
        defaultLocation={selectedLocation}
      />
    </div>
  );
};

export default StockCountSheet;
