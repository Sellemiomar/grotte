import React, { useState } from 'react';
import { 
  Truck, 
  Plus, 
  Coins, 
  Trash2, 
  CheckCircle2, 
  X, 
  User, 
  ShieldCheck 
} from 'lucide-react';
import { useStock } from '../context/StockContext';
import { formatCurrency, formatQuantity } from '../utils/calculations';

interface DeliveriesManagerProps {
  onClose?: () => void;
  isModal?: boolean;
}

export const DeliveriesManager: React.FC<DeliveriesManagerProps> = ({ onClose, isModal = false }) => {
  const { ingredients, suppliers, deliveries, staff, currentUser, addDelivery, deleteDelivery } = useStock();

  const [selectedIngredient, setSelectedIngredient] = useState<string>(ingredients[0]?.id || '');
  const [selectedSupplier, setSelectedSupplier] = useState<string>(suppliers[0]?.id || '');
  const [quantity, setQuantity] = useState<number>(10);
  const [unitCost, setUnitCost] = useState<number>(ingredients[0]?.cost_per_unit || 5);
  const [receivedBy, setReceivedBy] = useState<string>(currentUser?.name || staff[0]?.name || 'Omar Sellemi');
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState<string>('');
  const [showSuccess, setShowSuccess] = useState<boolean>(false);

  const handleIngredientChange = (ingId: string) => {
    setSelectedIngredient(ingId);
    const ing = ingredients.find(i => i.id === ingId);
    if (ing) {
      setUnitCost(ing.cost_per_unit);
    }
  };

  const handleCreateDelivery = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIngredient || quantity <= 0) return;

    addDelivery({
      ingredient_id: selectedIngredient,
      supplier_id: selectedSupplier,
      quantity,
      unit_cost: unitCost,
      date,
      received_by: receivedBy,
      notes: notes.trim() !== '' ? notes.trim() : undefined,
    });

    setShowSuccess(true);
    setNotes('');
    setTimeout(() => {
      setShowSuccess(false);
      if (onClose) onClose();
    }, 1500);
  };

  const currentIng = ingredients.find(i => i.id === selectedIngredient);
  const totalDeliveriesSpend = deliveries.reduce((acc, d) => acc + (d.quantity * d.unit_cost), 0);

  return (
    <div className={`space-y-6 ${isModal ? 'p-2 max-h-[85vh] overflow-y-auto' : 'pb-12'}`}>
      {/* Header */}
      <div className="bg-white rounded-2xl border border-sand p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-navy text-terracotta shadow-xs">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-navy uppercase tracking-wide">
              Réception des Livraisons Fournisseurs (Stock Entrant)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Incrémente le stock réel et recalcule instantanément le coût moyen d'achat.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-cream border border-sand px-4 py-2 rounded-xl text-xs flex items-center gap-2.5">
            <Coins className="w-4 h-4 text-terracotta" />
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">
                Total Réceptions Période
              </span>
              <span className="font-bold text-navy font-mono tabular-nums text-sm">
                {formatCurrency(totalDeliveriesSpend)} ({deliveries.length} BL)
              </span>
            </div>
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

      {/* Form Card */}
      <div className="bg-white rounded-2xl border border-sand p-5 shadow-xs">
        <h3 className="text-xs font-bold text-navy uppercase tracking-wider mb-4 flex items-center gap-2">
          <Plus className="w-4 h-4 text-terracotta" />
          Enregistrer un bon de livraison (BL) fournisseur
        </h3>

        {showSuccess && (
          <div className="mb-4 p-3 bg-success/10 border border-success/30 rounded-xl text-success text-xs flex items-center gap-2 shadow-2xs">
            <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
            Livraison enregistrée avec succès ! Stock physique et coût unitaire actualisés.
          </div>
        )}

        <form onSubmit={handleCreateDelivery} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
            {/* Ingredient */}
            <div>
              <label className="block text-slate-600 font-bold uppercase tracking-wider text-[10px] mb-1">
                Ingrédient reçu *
              </label>
              <select
                value={selectedIngredient}
                onChange={e => handleIngredientChange(e.target.value)}
                className="w-full bg-cream border border-sand rounded-xl px-3 py-2 text-xs text-navy focus:outline-none focus:ring-1 focus:ring-navy"
                required
              >
                {ingredients.map(ing => (
                  <option key={ing.id} value={ing.id}>
                    {ing.name} ({ing.unit}) — Stock: {ing.current_stock}
                  </option>
                ))}
              </select>
            </div>

            {/* Supplier */}
            <div>
              <label className="block text-slate-600 font-bold uppercase tracking-wider text-[10px] mb-1">
                Fournisseur référencé
              </label>
              <select
                value={selectedSupplier}
                onChange={e => setSelectedSupplier(e.target.value)}
                className="w-full bg-cream border border-sand rounded-xl px-3 py-2 text-xs text-navy focus:outline-none focus:ring-1 focus:ring-navy"
              >
                {suppliers.map(sup => (
                  <option key={sup.id} value={sup.id}>
                    {sup.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Date */}
            <div>
              <label className="block text-slate-600 font-bold uppercase tracking-wider text-[10px] mb-1">
                Date de réception
              </label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full bg-cream border border-sand rounded-xl px-3 py-2 text-xs text-navy focus:outline-none focus:ring-1 focus:ring-navy"
                required
              />
            </div>

            {/* Quantity */}
            <div>
              <label className="block text-slate-600 font-bold uppercase tracking-wider text-[10px] mb-1">
                Quantité reçue ({currentIng?.unit || 'unités'}) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={quantity}
                onChange={e => setQuantity(parseFloat(e.target.value) || 0)}
                className="w-full bg-cream border border-sand rounded-xl px-3 py-2 text-xs text-navy font-mono tabular-nums focus:outline-none focus:ring-1 focus:ring-navy"
                required
              />
            </div>

            {/* Unit cost */}
            <div>
              <label className="block text-slate-600 font-bold uppercase tracking-wider text-[10px] mb-1">
                Prix unitaire HT (DT / {currentIng?.unit || 'u'}) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={unitCost}
                onChange={e => setUnitCost(parseFloat(e.target.value) || 0)}
                className="w-full bg-cream border border-sand rounded-xl px-3 py-2 text-xs text-navy font-mono tabular-nums focus:outline-none focus:ring-1 focus:ring-navy"
                required
              />
            </div>

            {/* Notes / BL */}
            <div>
              <label className="block text-slate-600 font-bold uppercase tracking-wider text-[10px] mb-1">
                N° Bon de Livraison / Bordereau
              </label>
              <input
                type="text"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Ex: BL #2026-8942"
                className="w-full bg-cream border border-sand rounded-xl px-3 py-2 text-xs text-navy focus:outline-none focus:ring-1 focus:ring-navy"
              />
            </div>

            {/* Received By / Signature */}
            <div>
              <label className="block text-slate-600 font-bold uppercase tracking-wider text-[10px] mb-1 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-success" />
                Signataire / Réceptionné par *
              </label>
              <select
                value={receivedBy}
                onChange={e => setReceivedBy(e.target.value)}
                className="w-full bg-cream border border-sand rounded-xl px-3 py-2 text-xs text-navy font-semibold focus:outline-none focus:ring-1 focus:ring-navy"
                required
              >
                {staff.map(stf => (
                  <option key={stf.id} value={stf.name}>
                    {stf.name} ({stf.role})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-sand">
            <div className="text-xs text-slate-600">
              Total de la livraison : <strong className="text-navy font-mono font-bold tabular-nums">{formatCurrency(quantity * unitCost)}</strong>
            </div>

            <button
              type="submit"
              className="px-5 py-2.5 bg-navy hover:bg-navy-mid text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-xs transition-colors"
            >
              Enregistrer l'entrée en stock
            </button>
          </div>
        </form>
      </div>

      {/* Deliveries History List */}
      <div className="bg-white rounded-2xl border border-sand shadow-xs overflow-hidden">
        <div className="p-4 border-b border-sand bg-cream">
          <h3 className="text-xs font-bold text-navy uppercase tracking-wider">
            Historique des réceptions fournisseurs
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-cream border-b border-sand text-slate-600 font-bold text-[11px] uppercase tracking-wider">
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-3">Ingrédient</th>
                <th className="py-3 px-3">Fournisseur</th>
                <th className="py-3 px-3 text-right">Quantité</th>
                <th className="py-3 px-3 text-right">Prix Unitaire</th>
                <th className="py-3 px-3 text-right">Total HT</th>
                <th className="py-3 px-3">Signataire (BL)</th>
                <th className="py-3 px-3">Bordereau</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sand/60">
              {deliveries.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500">
                    <p className="font-bold text-navy text-sm">Aucune livraison enregistrée pour le moment.</p>
                    <p className="text-xs text-slate-400 mt-1">Enregistrez votre première réception pour commencer à suivre les entrées de stock.</p>
                  </td>
                </tr>
              ) : (
                [...deliveries].reverse().map(del => {
                  const ing = ingredients.find(i => i.id === del.ingredient_id);
                  const sup = suppliers.find(s => s.id === del.supplier_id);
                  const total = del.quantity * del.unit_cost;

                  return (
                    <tr key={del.id} className="hover:bg-cream/60 transition-colors">
                      <td className="py-3 px-4 font-mono text-slate-500 tabular-nums">
                        {del.date}
                      </td>
                      <td className="py-3 px-3 font-bold text-navy">
                        {ing?.name || 'Inconnu'}
                      </td>
                      <td className="py-3 px-3 text-slate-600">
                        {sup?.name || 'Fournisseur direct'}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-success tabular-nums">
                        +{formatQuantity(del.quantity, ing?.unit || '')}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-slate-600 tabular-nums">
                        {formatCurrency(del.unit_cost)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-navy tabular-nums">
                        {formatCurrency(total)}
                      </td>
                      <td className="py-3 px-3">
                        <span className="inline-flex items-center gap-1 bg-cream text-slate-700 font-medium px-2 py-0.5 rounded-md text-[11px] border border-sand">
                          <User className="w-3 h-3 text-slate-400" />
                          {del.received_by || 'Non signé'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-500 italic text-[11px]">
                        {del.notes || '-'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => {
                            if (confirm('Supprimer cette réception ?')) {
                              deleteDelivery(del.id);
                            }
                          }}
                          className="p-1.5 text-slate-400 hover:text-alert rounded-lg transition-colors"
                          title="Supprimer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DeliveriesManager;
