import React, { useState, useMemo } from 'react';
import { 
  Package, 
  Plus, 
  Search, 
  AlertTriangle, 
  Coins, 
  Edit2, 
  Trash2, 
  MapPin, 
  CheckCircle2,
  X,
  Barcode as BarcodeIcon,
  Printer,
  Camera,
  Tag
} from 'lucide-react';
import { useStock } from '../context/StockContext';
import { formatCurrency, formatQuantity } from '../utils/calculations';
import { CategoryType, Ingredient, UnitType } from '../types';
import { PrintableLabelsModal } from './PrintableLabelsModal';
import { BarcodeScannerModal } from './BarcodeScannerModal';

const CATEGORY_OPTIONS: Array<{ value: CategoryType; label: string }> = [
  { value: 'meat', label: 'Viandes & Grillades' },
  { value: 'dairy', label: 'Produits Laitiers & Fromages' },
  { value: 'alcohol', label: 'Vins, Spiritueux & Bar' },
  { value: 'beverage', label: 'Boissons Softs & Cafés' },
  { value: 'produce', label: 'Fruits & Légumes du Marché' },
  { value: 'dry goods', label: 'Épicerie Sèche & Épices' },
  { value: 'bakery', label: 'Boulangerie & Pâtisserie' },
  { value: 'seafood', label: 'Poissons & Fruits de Mer (Port de Monastir)' },
  { value: 'other', label: 'Autres Ingrédients' },
];

const UNIT_OPTIONS: UnitType[] = ['kg', 'g', 'L', 'mL', 'unit/piece'];

export const IngredientsManager: React.FC = () => {
  const { ingredients, addIngredient, updateIngredient, deleteIngredient } = useStock();

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [onlyLowStock, setOnlyLowStock] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingIngredient, setEditingIngredient] = useState<Ingredient | null>(null);
  const [ingredientToDelete, setIngredientToDelete] = useState<Ingredient | null>(null);
  const [isDeletingIngredient, setIsDeletingIngredient] = useState(false);

  // Form fields
  const [name, setName] = useState('');
  const [category, setCategory] = useState<CategoryType>('meat');
  const [unit, setUnit] = useState<UnitType>('kg');
  const [costPerUnit, setCostPerUnit] = useState<number>(10);
  const [currentStock, setCurrentStock] = useState<number>(5);
  const [threshold, setThreshold] = useState<number>(3);
  const [location, setLocation] = useState('Chambre Froide');
  const [barcode, setBarcode] = useState('');
  const [isScanningForBarcode, setIsScanningForBarcode] = useState(false);
  const [isLabelsModalOpen, setIsLabelsModalOpen] = useState(false);

  // Filtered ingredients
  const filtered = useMemo(() => {
    return ingredients.filter(ing => {
      if (categoryFilter !== 'all' && ing.category !== categoryFilter) return false;
      if (onlyLowStock && (ing.min_alert_threshold === undefined || ing.current_stock > ing.min_alert_threshold)) {
        return false;
      }
      if (search.trim() !== '') {
        const term = search.toLowerCase();
        return ing.name.toLowerCase().includes(term) || (ing.location || '').toLowerCase().includes(term);
      }
      return true;
    });
  }, [ingredients, categoryFilter, onlyLowStock, search]);

  // Stock valuation
  const totalStockValuation = useMemo(() => {
    return ingredients.reduce((sum, ing) => sum + (ing.current_stock * ing.cost_per_unit), 0);
  }, [ingredients]);

  const openAddModal = () => {
    setEditingIngredient(null);
    setName('');
    setCategory('meat');
    setUnit('kg');
    setCostPerUnit(10);
    setCurrentStock(5);
    setThreshold(3);
    setLocation('Chambre Froide');
    setBarcode('');
    setShowAddModal(true);
  };

  const openEditModal = (ing: Ingredient) => {
    setEditingIngredient(ing);
    setName(ing.name);
    setCategory(ing.category);
    setUnit(ing.unit);
    setCostPerUnit(ing.cost_per_unit);
    setCurrentStock(ing.current_stock);
    setThreshold(ing.min_alert_threshold ?? 0);
    setLocation(ing.location || 'Chambre Froide');
    setBarcode(ing.barcode || '');
    setShowAddModal(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (editingIngredient) {
      updateIngredient(editingIngredient.id, {
        name: name.trim(),
        category,
        unit,
        cost_per_unit: costPerUnit,
        current_stock: currentStock,
        min_alert_threshold: threshold,
        location,
        barcode: barcode.trim() || undefined,
      });
    } else {
      addIngredient({
        name: name.trim(),
        category,
        unit,
        cost_per_unit: costPerUnit,
        current_stock: currentStock,
        min_alert_threshold: threshold,
        location,
        barcode: barcode.trim() || undefined,
      });
    }

    setShowAddModal(false);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl border border-sand p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-navy text-terracotta shadow-xs">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-navy uppercase tracking-wide">
              Catalogue Matières Premières & Économat
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {ingredients.length} articles référencés • Valorisation du stock en chambre froide et cave
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-cream border border-sand px-4 py-2 rounded-xl text-xs flex items-center gap-2.5">
            <Coins className="w-4 h-4 text-terracotta" />
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">
                Valeur Globale du Stock
              </span>
              <span className="font-bold text-navy font-mono tabular-nums text-sm">
                {formatCurrency(totalStockValuation)}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsLabelsModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-white hover:bg-linen text-navy border border-sand rounded-xl text-xs font-semibold shadow-2xs transition-colors"
            title="Imprimer les planches d'étiquettes QR adhésives pour les cagettes et bacs"
          >
            <Printer className="w-4 h-4 text-terracotta" />
            <span>Étiquettes Bacs & QR</span>
          </button>

          <button
            onClick={openAddModal}
            className="flex items-center gap-2 px-4 py-2.5 bg-navy hover:bg-navy-mid text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4 text-terracotta" />
            Nouvel Ingrédient
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-2xl border border-sand shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher par nom ou emplacement..."
              className="w-full pl-9 pr-3 py-2 bg-white border border-sand rounded-xl text-navy placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-navy"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="py-2 px-3 bg-white border border-sand rounded-xl text-navy font-medium focus:outline-none"
          >
            <option value="all">Tous les rayons</option>
            {CATEGORY_OPTIONS.map(c => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setOnlyLowStock(!onlyLowStock)}
            className={`px-3 py-2 rounded-xl border text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors ${
              onlyLowStock
                ? 'bg-alert/10 text-alert border-alert/30'
                : 'bg-white text-slate-600 border-sand hover:bg-cream'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-alert" />
            Stock sous seuil d'alerte
          </button>
        </div>
      </div>

      {/* Ingredients Table */}
      <div className="bg-white rounded-2xl border border-sand shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-cream border-b border-sand text-slate-600 font-bold text-[11px] uppercase tracking-wider">
                <th className="py-3 px-4">Ingrédient</th>
                <th className="py-3 px-3">Emplacement</th>
                <th className="py-3 px-3 text-right">Coût Unitaire (DT)</th>
                <th className="py-3 px-3 text-right">Stock Réel</th>
                <th className="py-3 px-3 text-right">Seuil Alerte</th>
                <th className="py-3 px-3 text-right">Valeur Stock</th>
                <th className="py-3 px-3 text-center">Disponibilité</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sand/60">
              {filtered.map(ing => {
                const stockVal = ing.current_stock * ing.cost_per_unit;
                const isLow = ing.min_alert_threshold !== undefined && ing.current_stock <= ing.min_alert_threshold;

                return (
                  <tr key={ing.id} className="hover:bg-cream/60 transition-colors">
                    {/* Name */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-navy text-sm">
                        {ing.name}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-slate-500 capitalize">
                          {CATEGORY_OPTIONS.find(c => c.value === ing.category)?.label || ing.category}
                        </span>
                        <span className="text-[9px] font-mono text-slate-500 bg-sand/40 px-1.5 py-0.5 rounded flex items-center gap-1">
                          <BarcodeIcon className="w-2.5 h-2.5 text-slate-400" />
                          {ing.barcode || ing.id}
                        </span>
                      </div>
                    </td>

                    {/* Location */}
                    <td className="py-3.5 px-3 text-slate-600">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-terracotta shrink-0" />
                        <span className="truncate max-w-[150px]">{ing.location || 'Réserve'}</span>
                      </div>
                    </td>

                    {/* Cost per unit */}
                    <td className="py-3.5 px-3 text-right font-mono font-semibold text-navy tabular-nums">
                      {formatCurrency(ing.cost_per_unit)} / {ing.unit}
                    </td>

                    {/* Current Stock */}
                    <td className="py-3.5 px-3 text-right font-mono tabular-nums">
                      <span className={`font-bold text-sm ${isLow ? 'text-alert bg-rose-50 px-2 py-0.5 rounded border border-rose-200' : 'text-navy'}`}>
                        {formatQuantity(ing.current_stock, ing.unit)}
                      </span>
                    </td>

                    {/* Threshold */}
                    <td className="py-3.5 px-3 text-right font-mono text-slate-400 tabular-nums">
                      {ing.min_alert_threshold ? formatQuantity(ing.min_alert_threshold, ing.unit) : '-'}
                    </td>

                    {/* Valuation */}
                    <td className="py-3.5 px-3 text-right font-mono font-bold text-navy tabular-nums">
                      {formatCurrency(stockVal)}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-3 text-center">
                      {isLow ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-alert/10 text-alert border border-alert/25">
                          <AlertTriangle className="w-3 h-3" />
                          À réassortir
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-success/10 text-success border border-success/25">
                          <CheckCircle2 className="w-3 h-3" />
                          Conforme
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => openEditModal(ing)}
                          className="p-1.5 text-slate-400 hover:text-navy hover:bg-cream rounded-lg transition-colors"
                          title="Modifier"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setIngredientToDelete(ing)}
                          className="p-1.5 text-slate-400 hover:text-alert hover:bg-rose-50 rounded-lg transition-colors"
                          title="Supprimer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Ingredient Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl border border-sand">
            <div className="p-4 bg-navy text-white flex items-center justify-between">
              <div>
                <span className="font-bold text-xs uppercase tracking-wider text-terracotta block">
                  Économat & Stocks
                </span>
                <h3 className="text-sm font-bold text-white">
                  {editingIngredient ? 'Modifier l\'ingrédient' : 'Ajouter un ingrédient en stock'}
                </h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 font-bold uppercase tracking-wider text-[10px] mb-1">
                  Nom de l'ingrédient *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Ex: Daurade royale de Monastir"
                  className="w-full bg-cream border border-sand rounded-xl px-3 py-2 text-xs text-navy focus:ring-1 focus:ring-navy focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-bold uppercase tracking-wider text-[10px] mb-1">
                    Catégorie
                  </label>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value as CategoryType)}
                    className="w-full bg-cream border border-sand rounded-xl px-3 py-2 text-xs text-navy focus:outline-none"
                  >
                    {CATEGORY_OPTIONS.map(c => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 font-bold uppercase tracking-wider text-[10px] mb-1">
                    Unité de mesure
                  </label>
                  <select
                    value={unit}
                    onChange={e => setUnit(e.target.value as UnitType)}
                    className="w-full bg-cream border border-sand rounded-xl px-3 py-2 text-xs text-navy focus:outline-none"
                  >
                    {UNIT_OPTIONS.map(u => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-bold uppercase tracking-wider text-[10px] mb-1">
                    Coût unitaire d'achat (DT HT)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={costPerUnit}
                    onChange={e => setCostPerUnit(parseFloat(e.target.value) || 0)}
                    className="w-full bg-cream border border-sand rounded-xl px-3 py-2 text-xs font-mono text-navy tabular-nums"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-bold uppercase tracking-wider text-[10px] mb-1">
                    Stock physique initial ({unit})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={currentStock}
                    onChange={e => setCurrentStock(parseFloat(e.target.value) || 0)}
                    className="w-full bg-cream border border-sand rounded-xl px-3 py-2 text-xs font-mono text-navy tabular-nums"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-bold uppercase tracking-wider text-[10px] mb-1">
                    Seuil d'alerte ({unit})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={threshold}
                    onChange={e => setThreshold(parseFloat(e.target.value) || 0)}
                    className="w-full bg-cream border border-sand rounded-xl px-3 py-2 text-xs font-mono text-navy tabular-nums"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-bold uppercase tracking-wider text-[10px] mb-1">
                    Emplacement / Réserve
                  </label>
                  <input
                    type="text"
                    value={location}
                    onChange={e => setLocation(e.target.value)}
                    placeholder="Chambre Froide Poissons"
                    className="w-full bg-cream border border-sand rounded-xl px-3 py-2 text-xs text-navy"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-bold uppercase tracking-wider text-[10px] mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <BarcodeIcon className="w-3.5 h-3.5 text-slate-400" />
                    Code-Barres / Référence QR (Bacs, Cagettes, EAN-13)
                  </span>
                  <span className="text-[10px] text-slate-400 font-normal lowercase">optionnel</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={barcode}
                    onChange={e => setBarcode(e.target.value)}
                    placeholder="Ex: 619001001001 ou QR-POISSON-01"
                    className="w-full bg-cream border border-sand rounded-xl px-3 py-2 text-xs font-mono text-navy focus:outline-none focus:ring-1 focus:ring-navy"
                  />
                  <button
                    type="button"
                    onClick={() => setIsScanningForBarcode(true)}
                    className="inline-flex items-center gap-1 px-3 py-2 bg-white hover:bg-linen text-navy border border-sand rounded-xl text-xs font-semibold shrink-0 transition-colors shadow-2xs"
                    title="Scanner le code avec la caméra"
                  >
                    <Camera className="w-3.5 h-3.5 text-terracotta" />
                    <span>Scanner</span>
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-sand">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-cream text-slate-700 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-linen transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-navy text-white rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-navy-mid shadow-xs transition-colors"
                >
                  {editingIngredient ? 'Enregistrer les modifications' : 'Ajouter au catalogue'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Confirm Delete Ingredient */}
      {ingredientToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl border border-sand">
            <div className="p-4 bg-alert text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-white" />
                <h3 className="text-sm font-bold text-white">
                  Confirmer la suppression de l'ingrédient
                </h3>
              </div>
              <button
                onClick={() => setIngredientToDelete(null)}
                disabled={isDeletingIngredient}
                className="p-1 text-white/80 hover:text-white rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <p className="text-slate-700 leading-relaxed">
                Êtes-vous sûr de vouloir supprimer définitivement l'ingrédient{' '}
                <strong className="text-navy font-bold">« {ingredientToDelete.name} »</strong> ?
              </p>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <p className="text-[11px] leading-normal">
                  Cela supprimera également ses liaisons dans toutes les fiches techniques associées.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-sand">
                <button
                  type="button"
                  onClick={() => setIngredientToDelete(null)}
                  disabled={isDeletingIngredient}
                  className="px-4 py-2 bg-cream text-slate-700 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-linen transition-colors disabled:opacity-50"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    setIsDeletingIngredient(true);
                    try {
                      await deleteIngredient(ingredientToDelete.id);
                      setIngredientToDelete(null);
                    } finally {
                      setIsDeletingIngredient(false);
                    }
                  }}
                  disabled={isDeletingIngredient}
                  className="px-4 py-2 bg-alert text-white rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-red-700 shadow-xs transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  <span>{isDeletingIngredient ? 'Suppression...' : 'Supprimer définitivement'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Printable Crate & Shelf Labels */}
      <PrintableLabelsModal
        isOpen={isLabelsModalOpen}
        onClose={() => setIsLabelsModalOpen(false)}
      />

      {/* Camera Barcode Scanner for quick barcode assignment */}
      <BarcodeScannerModal
        isOpen={isScanningForBarcode}
        onClose={() => setIsScanningForBarcode(false)}
        onSelectIngredient={(_ing, code) => {
          setBarcode(code);
          setIsScanningForBarcode(false);
        }}
        title="Scanner le code de l'emballage"
        subtitle="Placez le code-barres devant la caméra pour l'affecter à la fiche"
      />
    </div>
  );
};

export default IngredientsManager;
