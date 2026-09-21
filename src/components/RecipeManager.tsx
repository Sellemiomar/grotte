import React, { useState } from 'react';
import { 
  UtensilsCrossed, 
  Plus, 
  Trash2, 
  ChevronDown, 
  ChevronUp, 
  AlertCircle,
  X,
  Loader2,
  Database
} from 'lucide-react';
import { useStock } from '../context/StockContext';
import { MenuItem } from '../types';
import { formatCurrency, formatQuantity } from '../utils/calculations';
import { getErrorMessage } from '../utils/errors';

export const RecipeManager: React.FC = () => {
  const { 
    menuItems, 
    ingredients, 
    recipes, 
    addMenuItem, 
    deleteMenuItem, 
    addRecipeIngredient, 
    deleteRecipeIngredient,
    currentUser,
    isSupabaseConnected
  } = useStock();

  const canManage = !currentUser || currentUser.role === 'owner' || currentUser.role === 'stock_manager';

  const [expandedMenuItemId, setExpandedMenuItemId] = useState<string | null>(menuItems[0]?.id || null);
  const [showAddMenuModal, setShowAddMenuModal] = useState(false);
  const [addIngMenuItemId, setAddIngMenuItemId] = useState<string | null>(null);

  // New Menu Item Form
  const [newMenuName, setNewMenuName] = useState('');
  const [newPosRef, setNewPosRef] = useState('');
  const [newCategory, setNewCategory] = useState('Plats');
  const [newPrice, setNewPrice] = useState<number>(18);
  const [isSubmittingMenu, setIsSubmittingMenu] = useState(false);
  const [menuError, setMenuError] = useState<string | null>(null);

  // Deletion Modal State
  const [itemToDelete, setItemToDelete] = useState<MenuItem | null>(null);
  const [isDeletingMenu, setIsDeletingMenu] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // New Recipe Ingredient Form
  const [selectedIngredientId, setSelectedIngredientId] = useState<string>(ingredients[0]?.id || '');
  const [quantityPerUnit, setQuantityPerUnit] = useState<number>(0.1);
  const [isSubmittingRecipe, setIsSubmittingRecipe] = useState(false);

  const handleConfirmDeleteMenu = async () => {
    if (!itemToDelete) return;
    setIsDeletingMenu(true);
    setDeleteError(null);
    try {
      await deleteMenuItem(itemToDelete.id);
      if (expandedMenuItemId === itemToDelete.id) {
        setExpandedMenuItemId(null);
      }
      setItemToDelete(null);
    } catch (err: unknown) {
      setDeleteError(getErrorMessage(err, 'Erreur lors de la suppression du plat.'));
    } finally {
      setIsDeletingMenu(false);
    }
  };

  const handleCreateMenuItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setMenuError(null);

    const trimmedName = newMenuName.trim();
    const trimmedPosRef = newPosRef.trim();

    if (!trimmedName || !trimmedPosRef) {
      setMenuError('Veuillez renseigner le nom du plat et sa référence POS.');
      return;
    }

    // Check for duplicate POS reference
    const duplicate = menuItems.find(
      m => m.pos_reference.trim().toUpperCase() === trimmedPosRef.toUpperCase()
    );
    if (duplicate) {
      setMenuError(`La référence POS "${trimmedPosRef}" est déjà utilisée par le plat "${duplicate.name}".`);
      return;
    }

    setIsSubmittingMenu(true);
    try {
      await addMenuItem({
        name: trimmedName,
        pos_reference: trimmedPosRef,
        category: newCategory,
        selling_price: newPrice,
      });

      setNewMenuName('');
      setNewPosRef('');
      setMenuError(null);
      setShowAddMenuModal(false);
    } catch (err: unknown) {
      setMenuError(getErrorMessage(err, "Impossible d'enregistrer le plat dans la base de données."));
    } finally {
      setIsSubmittingMenu(false);
    }
  };

  const handleAddRecipeItem = async (menuItemId: string) => {
    if (!selectedIngredientId || quantityPerUnit <= 0) return;

    setIsSubmittingRecipe(true);
    try {
      await addRecipeIngredient({
        menu_item_id: menuItemId,
        ingredient_id: selectedIngredientId,
        quantity_per_unit: quantityPerUnit,
      });
      setAddIngMenuItemId(null);
    } catch (err: unknown) {
      console.error('Error adding recipe ingredient:', err);
    } finally {
      setIsSubmittingRecipe(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-sand p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-navy text-terracotta shadow-xs">
            <UtensilsCrossed className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-navy uppercase tracking-wide">
              Fiches Techniques & Recettes (BOM - Déstockage Théorique)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Configuration des grammages par portion pour calculer la consommation théorique à chaque ticket caisse POS.
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowAddMenuModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-navy hover:bg-navy-mid text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-xs transition-colors"
        >
          <Plus className="w-4 h-4 text-terracotta" />
          Nouveau Plat au Menu
        </button>
      </div>

      {/* Menu items list */}
      <div className="space-y-3">
        {menuItems.map(item => {
          const isExpanded = expandedMenuItemId === item.id;
          const itemRecipes = recipes.filter(r => r.menu_item_id === item.id);

          // Calculate total food cost for this dish
          const foodCost = itemRecipes.reduce((sum, r) => {
            const ing = ingredients.find(i => i.id === r.ingredient_id);
            return sum + (ing ? ing.cost_per_unit * r.quantity_per_unit : 0);
          }, 0);

          const sellingPrice = item.selling_price || 0;
          const foodCostRatio = sellingPrice > 0 ? (foodCost / sellingPrice) * 100 : 0;

          return (
            <div
              key={item.id}
              className="bg-white rounded-2xl border border-sand shadow-xs overflow-hidden transition-all"
            >
              {/* Header row */}
              <div
                onClick={() => setExpandedMenuItemId(isExpanded ? null : item.id)}
                className="p-4 flex items-center justify-between gap-3 cursor-pointer hover:bg-cream/60 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-navy text-terracotta flex items-center justify-center font-bold text-xs">
                    {item.name.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-navy">
                        {item.name}
                      </h4>
                      <span className="text-[10px] font-mono font-bold bg-cream text-navy border border-sand px-2 py-0.5 rounded-md">
                        Réf POS: {item.pos_reference}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      Rayon: {item.category || 'Menu'} • {itemRecipes.length} ingrédient{itemRecipes.length > 1 ? 's' : ''} dans la fiche
                    </div>
                  </div>
                </div>

                {/* Economics summary */}
                <div className="flex items-center gap-4 sm:gap-6">
                  <div className="text-right">
                    <span className="text-[10px] text-slate-500 block font-bold uppercase tracking-wider">Prix Vente</span>
                    <span className="text-sm font-bold text-navy font-mono tabular-nums">
                      {formatCurrency(sellingPrice)}
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-slate-500 block font-bold uppercase tracking-wider">Coût Matière</span>
                    <span className="text-sm font-bold text-navy font-mono tabular-nums">
                      {formatCurrency(foodCost)}
                    </span>
                  </div>

                  <div className="text-right hidden sm:block">
                    <span className="text-[10px] text-slate-500 block font-bold uppercase tracking-wider">Ratio Food Cost</span>
                    <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full font-mono tabular-nums ${
                      (foodCostRatio || 0) <= 28 ? 'bg-success/10 text-success border border-success/25' : 'bg-amber-50 text-amber-800 border border-amber-200'
                    }`}>
                      {(foodCostRatio || 0).toFixed(1)}%
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    {canManage && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteError(null);
                          setItemToDelete(item);
                        }}
                        className="p-1.5 text-slate-400 hover:text-alert hover:bg-rose-50 rounded-lg transition-colors"
                        title="Supprimer définitivement ce plat"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                    <div className="text-slate-400 p-1">
                      {isExpanded ? <ChevronUp className="w-5 h-5 text-navy" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                    </div>
                  </div>
                </div>
              </div>

              {/* Expanded BOM Table */}
              {isExpanded && (
                <div className="px-4 pb-4 pt-1 bg-cream/50 border-t border-sand">
                  <div className="flex items-center justify-between mb-3 pt-2">
                    <span className="text-xs font-bold text-navy uppercase tracking-wider">
                      Composition de la Fiche Technique (Grammage par portion servie)
                    </span>
                    <button
                      onClick={() => setAddIngMenuItemId(item.id)}
                      className="flex items-center gap-1.5 text-xs font-bold text-navy hover:text-terracotta uppercase tracking-wider transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5 text-terracotta" />
                      Ajouter un ingrédient
                    </button>
                  </div>

                  {/* Table of ingredients for this dish */}
                  {itemRecipes.length > 0 ? (
                    <div className="bg-white rounded-xl border border-sand overflow-hidden text-xs shadow-2xs">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="bg-cream border-b border-sand text-slate-600 font-bold text-[10px] uppercase tracking-wider">
                            <th className="py-2.5 px-3">Ingrédient</th>
                            <th className="py-2.5 px-3">Rayon</th>
                            <th className="py-2.5 px-3 text-right">Dosage / Portion</th>
                            <th className="py-2.5 px-3 text-right">Prix Unitaire</th>
                            <th className="py-2.5 px-3 text-right">Coût Matière</th>
                            <th className="py-2.5 px-3 text-center">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-sand/60">
                          {itemRecipes.map(recipe => {
                            const ing = ingredients.find(i => i.id === recipe.ingredient_id);
                            const lineCost = (ing?.cost_per_unit || 0) * recipe.quantity_per_unit;

                            return (
                              <tr key={recipe.id} className="hover:bg-cream/60">
                                <td className="py-2.5 px-3 font-bold text-navy">
                                  {ing?.name || 'Inconnu'}
                                </td>
                                <td className="py-2.5 px-3 text-slate-500 text-[11px]">
                                  {ing?.category}
                                </td>
                                <td className="py-2.5 px-3 text-right font-mono font-medium text-navy tabular-nums">
                                  {formatQuantity(recipe.quantity_per_unit, ing?.unit || '')}
                                </td>
                                <td className="py-2.5 px-3 text-right font-mono text-slate-500 tabular-nums">
                                  {formatCurrency(ing?.cost_per_unit || 0)} / {ing?.unit}
                                </td>
                                <td className="py-2.5 px-3 text-right font-mono font-bold text-navy tabular-nums">
                                  {formatCurrency(lineCost)}
                                </td>
                                <td className="py-2.5 px-3 text-center">
                                  <button
                                    onClick={() => deleteRecipeIngredient(recipe.id)}
                                    className="text-slate-400 hover:text-alert p-1 rounded transition-colors"
                                    title="Retirer de la fiche"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                        <tfoot>
                          <tr className="bg-cream font-bold text-navy border-t border-sand">
                            <td colSpan={4} className="py-2.5 px-3 text-right uppercase tracking-wider text-[11px] text-slate-600">Coût Matière Théorique Total :</td>
                            <td className="py-2.5 px-3 text-right font-mono text-navy tabular-nums">{formatCurrency(foodCost)}</td>
                            <td></td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  ) : (
                    <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
                      Aucun ingrédient n'est encore associé à ce plat. Cliquez sur « Ajouter un ingrédient » pour configurer le déstockage théorique.
                    </div>
                  )}

                  {/* Add ingredient inline drawer */}
                  {addIngMenuItemId === item.id && (
                    <div className="mt-3 p-3.5 bg-white rounded-xl border border-sand shadow-xs flex flex-wrap items-end gap-3 text-xs">
                      <div className="flex-1 min-w-[180px]">
                        <label className="block text-slate-600 font-bold uppercase tracking-wider text-[10px] mb-1">
                          Sélectionner l'ingrédient
                        </label>
                        <select
                          value={selectedIngredientId}
                          onChange={e => setSelectedIngredientId(e.target.value)}
                          className="w-full bg-cream border border-sand rounded-xl px-2.5 py-2 text-xs text-navy focus:outline-none"
                        >
                          {ingredients.map(ing => (
                            <option key={ing.id} value={ing.id}>
                              {ing.name} ({ing.unit})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="w-32">
                        <label className="block text-slate-600 font-bold uppercase tracking-wider text-[10px] mb-1">
                          Quantité / plat
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0.001"
                          value={quantityPerUnit}
                          onChange={e => setQuantityPerUnit(parseFloat(e.target.value) || 0)}
                          className="w-full bg-cream border border-sand rounded-xl px-2.5 py-2 text-xs font-mono text-navy tabular-nums focus:outline-none"
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleAddRecipeItem(item.id)}
                          className="px-4 py-2 bg-navy text-white rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-navy-mid transition-colors"
                        >
                          Ajouter
                        </button>
                        <button
                          onClick={() => setAddIngMenuItemId(null)}
                          className="px-4 py-2 bg-cream text-slate-600 border border-sand rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-linen transition-colors"
                        >
                          Annuler
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Item Actions */}
                  <div className="mt-3 flex justify-end gap-2 text-xs">
                    {canManage ? (
                      <button
                        onClick={() => {
                          setDeleteError(null);
                          setItemToDelete(item);
                        }}
                        className="text-slate-400 hover:text-alert hover:bg-rose-50 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-sand/60 hover:border-alert/30 transition-colors text-xs font-semibold"
                        title="Supprimer définitivement ce plat"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Supprimer ce plat
                      </button>
                    ) : (
                      <span className="text-[11px] text-slate-400 italic">
                        Suppression réservée au Propriétaire et Responsable Stock
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Modal Add Menu Item */}
      {showAddMenuModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl border border-sand">
            <div className="p-4 bg-navy text-white flex items-center justify-between">
              <div>
                <span className="font-bold text-xs uppercase tracking-wider text-terracotta block">
                  Fiche Technique
                </span>
                <h3 className="text-sm font-bold text-white">
                  Créer un nouvel article de vente au Menu
                </h3>
              </div>
              <button
                onClick={() => setShowAddMenuModal(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateMenuItem} className="p-5 space-y-3 text-xs">
              {menuError && (
                <div className="p-3 bg-terracotta/10 border border-terracotta/30 rounded-xl flex items-start gap-2 text-terracotta text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{menuError}</span>
                </div>
              )}

              {isSupabaseConnected && (
                <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-emerald-800 text-[11px]">
                  <Database className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Enregistrement direct sur la base PostgreSQL Supabase</span>
                </div>
              )}

              <div>
                <label className="block text-slate-600 font-bold uppercase tracking-wider text-[10px] mb-1">
                  Nom du plat / boisson *
                </label>
                <input
                  type="text"
                  value={newMenuName}
                  onChange={e => {
                    setNewMenuName(e.target.value);
                    if (menuError) setMenuError(null);
                  }}
                  placeholder="Ex: Daurade Grillée au Feu de Bois"
                  className="w-full bg-cream border border-sand rounded-xl px-3 py-2 text-xs text-navy focus:outline-none focus:ring-1 focus:ring-navy"
                  required
                  disabled={isSubmittingMenu}
                />
              </div>

              <div>
                <label className="block text-slate-600 font-bold uppercase tracking-wider text-[10px] mb-1">
                  Référence POS / Code Caisse *
                </label>
                <input
                  type="text"
                  value={newPosRef}
                  onChange={e => {
                    setNewPosRef(e.target.value);
                    if (menuError) setMenuError(null);
                  }}
                  placeholder="Ex: POS-DAUR-GRILL"
                  className="w-full bg-cream border border-sand rounded-xl px-3 py-2 text-xs text-navy font-mono tabular-nums focus:outline-none focus:ring-1 focus:ring-navy"
                  required
                  disabled={isSubmittingMenu}
                />
                <p className="text-[10px] text-slate-500 mt-0.5">
                  Doit être unique et correspondre exactement au libellé ou code article dans l'export caisse.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-bold uppercase tracking-wider text-[10px] mb-1">
                    Rayon / Catégorie
                  </label>
                  <select
                    value={newCategory}
                    onChange={e => setNewCategory(e.target.value)}
                    className="w-full bg-cream border border-sand rounded-xl px-3 py-2 text-xs text-navy focus:outline-none"
                    disabled={isSubmittingMenu}
                  >
                    <option value="Poissons & Mer">Poissons & Mer</option>
                    <option value="Grillades & Viandes">Grillades & Viandes</option>
                    <option value="Plats Tunisiens">Plats Tunisiens</option>
                    <option value="Pizzas">Pizzas</option>
                    <option value="Entrées & Salades">Entrées & Salades</option>
                    <option value="Desserts">Desserts</option>
                    <option value="Vins & Bar">Vins & Bar</option>
                    <option value="Boissons Softs">Boissons Softs</option>
                    <option value="Cafés & Thés">Cafés & Thés</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 font-bold uppercase tracking-wider text-[10px] mb-1">
                    Prix de vente TTC (DT)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={newPrice}
                    onChange={e => setNewPrice(parseFloat(e.target.value) || 0)}
                    className="w-full bg-cream border border-sand rounded-xl px-3 py-2 text-xs text-navy font-mono tabular-nums focus:outline-none"
                    disabled={isSubmittingMenu}
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-sand">
                <button
                  type="button"
                  onClick={() => setShowAddMenuModal(false)}
                  disabled={isSubmittingMenu}
                  className="px-4 py-2 bg-cream text-slate-700 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-linen transition-colors disabled:opacity-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingMenu}
                  className="px-4 py-2 bg-navy text-white rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-navy-mid shadow-xs transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  {isSubmittingMenu && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{isSubmittingMenu ? 'Enregistrement...' : 'Créer le plat'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Confirm Delete Menu Item */}
      {itemToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl border border-sand">
            <div className="p-4 bg-alert text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-white" />
                <h3 className="text-sm font-bold text-white">
                  Confirmer la suppression du plat
                </h3>
              </div>
              <button
                onClick={() => {
                  if (!isDeletingMenu) {
                    setItemToDelete(null);
                    setDeleteError(null);
                  }
                }}
                disabled={isDeletingMenu}
                className="p-1 text-white/80 hover:text-white rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              {deleteError && (
                <div className="p-3 bg-terracotta/10 border border-terracotta/30 rounded-xl flex items-start gap-2 text-terracotta text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{deleteError}</span>
                </div>
              )}

              <p className="text-slate-700 leading-relaxed">
                Êtes-vous sûr de vouloir supprimer définitivement le plat{' '}
                <strong className="text-navy font-bold">« {itemToDelete.name} »</strong>{' '}
                (Référence POS : <code className="bg-cream px-1.5 py-0.5 rounded text-navy font-mono font-bold">{itemToDelete.pos_reference}</code>) ?
              </p>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <p className="text-[11px] leading-normal">
                  Cette action supprimera également sa fiche technique associée dans la base PostgreSQL Supabase et ne peut pas être annulée.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-sand">
                <button
                  type="button"
                  onClick={() => {
                    setItemToDelete(null);
                    setDeleteError(null);
                  }}
                  disabled={isDeletingMenu}
                  className="px-4 py-2 bg-cream text-slate-700 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-linen transition-colors disabled:opacity-50"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteMenu}
                  disabled={isDeletingMenu}
                  className="px-4 py-2 bg-alert text-white rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-red-700 shadow-xs transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  {isDeletingMenu && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{isDeletingMenu ? 'Suppression...' : 'Supprimer définitivement'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecipeManager;
