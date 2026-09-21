import React, { useState } from 'react';
import { 
  Receipt, 
  AlertOctagon, 
  User, 
  Plus, 
  Filter, 
  Trash2, 
  CheckCircle2, 
  ShieldAlert,
  Percent,
  Gift
} from 'lucide-react';
import { useStock } from '../context/StockContext';
import { PosVoid } from '../types';
import { formatCurrency } from '../utils/calculations';

export const PosVoidsManager: React.FC = () => {
  const { posVoids, staff, menuItems, addPosVoid, deletePosVoid } = useStock();

  const [selectedStaff, setSelectedStaff] = useState<string>(staff[0]?.name || 'Alex');
  const [selectedItem, setSelectedItem] = useState<string>(menuItems[0]?.name || 'Daurade Royale Grillée');
  const [voidType, setVoidType] = useState<'void' | 'discount' | 'comp'>('void');
  const [amount, setAmount] = useState<number>(34.00);
  const [timestamp, setTimestamp] = useState<string>(() => {
    const now = new Date();
    return now.toISOString().slice(0, 16);
  });
  const [reason, setReason] = useState<string>('Erreur commande table 7');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStaff, setFilterStaff] = useState<string>('all');
  const [showAddForm, setShowAddForm] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<boolean>(false);

  const handleMenuItemChange = (itemName: string) => {
    setSelectedItem(itemName);
    const item = menuItems.find(m => m.name === itemName);
    if (item) {
      setAmount(item.selling_price ?? 0);
    }
  };

  const getVoidTimestamp = (v: PosVoid): string => {
    if (v.timestamp) return v.timestamp;
    if (v.date) return v.date.replace('T', ' ');
    return '';
  };

  const getVoidStaffName = (v: PosVoid): string => {
    if (v.staff_name) return v.staff_name;
    const stf = staff.find(s => s && (s.id === v.staff_id || (s.name && s.name.toLowerCase() === v.staff_id?.toLowerCase())));
    return stf ? stf.name : v.staff_id || 'Personnel';
  };

  const getVoidItemName = (v: PosVoid): string => {
    if (v.item_name) return v.item_name;
    const item = menuItems.find(m => m && m.id === v.menu_item_id);
    return item ? item.name : 'Article';
  };

  const handleCreateVoid = (e: React.FormEvent) => {
    e.preventDefault();
    const staffMember = staff.find(s => s && s.name === selectedStaff);
    const menuItem = menuItems.find(m => m && (m.name === selectedItem || m.id === selectedItem));

    addPosVoid({
      menu_item_id: menuItem?.id || 'menu-1',
      staff_id: staffMember?.id || 'stf-1',
      staff_name: selectedStaff,
      item_name: selectedItem,
      type: voidType,
      amount,
      date: timestamp.includes('T') ? timestamp : timestamp.replace(' ', 'T'),
      timestamp: timestamp.replace('T', ' '),
      reason: reason.trim() !== '' ? reason.trim() : 'Non précisé',
    });

    setSuccessMsg(true);
    setTimeout(() => {
      setSuccessMsg(false);
      setShowAddForm(false);
    }, 1200);
  };

  const filteredVoids = [...posVoids].filter(v => {
    const staffName = getVoidStaffName(v);
    if (filterType !== 'all' && v.type !== filterType) return false;
    if (filterStaff !== 'all' && staffName !== filterStaff) return false;
    return true;
  }).sort((a, b) => {
    const timeA = getVoidTimestamp(a);
    const timeB = getVoidTimestamp(b);
    return (timeB || '').localeCompare(timeA || '');
  });

  // Compute metrics
  const totalVoidAmount = posVoids.filter(v => v.type === 'void').reduce((sum, v) => sum + v.amount, 0);
  const totalCompAmount = posVoids.filter(v => v.type === 'comp').reduce((sum, v) => sum + v.amount, 0);
  const totalDiscountAmount = posVoids.filter(v => v.type === 'discount').reduce((sum, v) => sum + v.amount, 0);
  const grandTotal = totalVoidAmount + totalCompAmount + totalDiscountAmount;

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header & Overview */}
      <div className="bg-white rounded-2xl border border-sand p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-navy text-terracotta shadow-xs">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-navy uppercase tracking-wide">
                  Surveillance des Annulations, Comps & Remises POS
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-alert/10 text-alert border border-alert/25 uppercase tracking-wider">
                  Vecteur Majeur de Coulage
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Audit croisé des articles annulés après impression cuisine ou offerts en salle pour prévenir les détournements.
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowAddForm(prev => !prev)}
            className="px-4 py-2.5 bg-navy hover:bg-navy-mid text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-colors shadow-xs"
          >
            <Plus className="w-4 h-4 text-terracotta" />
            {showAddForm ? 'Fermer le formulaire' : 'Enregistrer une annulation'}
          </button>
        </div>

        {/* Financial KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-sand">
          <div className="p-3.5 bg-cream rounded-xl border border-sand">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              Total Dévaluations POS
            </span>
            <span className="text-lg font-bold font-mono text-navy tabular-nums mt-0.5 block">
              {formatCurrency(grandTotal)}
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              {posVoids.length} opérations enregistrées
            </span>
          </div>

          <div className="p-3.5 bg-alert/5 rounded-xl border border-alert/20">
            <span className="text-[10px] font-bold text-alert uppercase tracking-wider block flex items-center gap-1">
              <AlertOctagon className="w-3.5 h-3.5 text-alert" />
              Annulations Sèches (Voids)
            </span>
            <span className="text-lg font-bold font-mono text-alert tabular-nums mt-0.5 block">
              {formatCurrency(totalVoidAmount)}
            </span>
            <span className="text-[10px] text-alert/80 block mt-0.5">
              Plats envoyés puis annulés
            </span>
          </div>

          <div className="p-3.5 bg-terracotta/10 rounded-xl border border-terracotta/30">
            <span className="text-[10px] font-bold text-terracotta uppercase tracking-wider block flex items-center gap-1">
              <Gift className="w-3.5 h-3.5 text-terracotta" />
              Offerts & Comps Table
            </span>
            <span className="text-lg font-bold font-mono text-terracotta tabular-nums mt-0.5 block">
              {formatCurrency(totalCompAmount)}
            </span>
            <span className="text-[10px] text-terracotta/80 block mt-0.5">
              Relations publiques & dégustations
            </span>
          </div>

          <div className="p-3.5 bg-cream rounded-xl border border-sand">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block flex items-center gap-1">
              <Percent className="w-3.5 h-3.5 text-slate-500" />
              Remises Exceptionnelles
            </span>
            <span className="text-lg font-bold font-mono text-navy tabular-nums mt-0.5 block">
              {formatCurrency(totalDiscountAmount)}
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              Rabais post-commande
            </span>
          </div>
        </div>
      </div>

      {/* Register Void / Discount Form */}
      {showAddForm && (
        <div className="bg-white rounded-2xl border border-sand p-5 shadow-sm">
          <div className="flex items-center gap-2 pb-3 mb-4 border-b border-sand">
            <ShieldAlert className="w-4 h-4 text-terracotta" />
            <h3 className="text-xs font-bold text-navy uppercase tracking-wider">
              Enregistrer une opération de caisse exceptionnelle (Annulation / Offert)
            </h3>
          </div>

          <form onSubmit={handleCreateVoid} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-slate-600 font-bold uppercase tracking-wider text-[10px] mb-1">
                  Serveur / Barman responsable *
                </label>
                <select
                  value={selectedStaff}
                  onChange={e => setSelectedStaff(e.target.value)}
                  className="w-full bg-cream border border-sand rounded-xl px-3 py-2 text-xs text-navy font-semibold focus:outline-none focus:ring-1 focus:ring-navy"
                  required
                >
                  {staff.map(s => (
                    <option key={s.id} value={s.name}>
                      {s.name} ({s.role})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-600 font-bold uppercase tracking-wider text-[10px] mb-1">
                  Article concerné *
                </label>
                <select
                  value={selectedItem}
                  onChange={e => handleMenuItemChange(e.target.value)}
                  className="w-full bg-cream border border-sand rounded-xl px-3 py-2 text-xs text-navy focus:outline-none focus:ring-1 focus:ring-navy"
                  required
                >
                  {menuItems.map(m => (
                    <option key={m.id} value={m.name}>
                      {m.name} ({formatCurrency(m.selling_price)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-600 font-bold uppercase tracking-wider text-[10px] mb-1">
                  Nature de l'opération *
                </label>
                <select
                  value={voidType}
                  onChange={e => setVoidType(e.target.value as any)}
                  className="w-full bg-cream border border-sand rounded-xl px-3 py-2 text-xs text-navy font-semibold focus:outline-none focus:ring-1 focus:ring-navy"
                >
                  <option value="void">Annulation sèche (Void)</option>
                  <option value="comp">Offert / Commercial (Comp)</option>
                  <option value="discount">Remise exceptionnelle (Discount)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-600 font-bold uppercase tracking-wider text-[10px] mb-1">
                  Montant (DT TTC) *
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  value={amount}
                  onChange={e => setAmount(parseFloat(e.target.value) || 0)}
                  className="w-full bg-cream border border-sand rounded-xl px-3 py-2 text-xs text-navy font-mono tabular-nums focus:outline-none focus:ring-1 focus:ring-navy"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-600 font-bold uppercase tracking-wider text-[10px] mb-1">
                  Date et Heure du ticket *
                </label>
                <input
                  type="datetime-local"
                  value={timestamp}
                  onChange={e => setTimestamp(e.target.value)}
                  className="w-full bg-cream border border-sand rounded-xl px-3 py-2 text-xs text-navy focus:outline-none focus:ring-1 focus:ring-navy"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-600 font-bold uppercase tracking-wider text-[10px] mb-1">
                  Justification / Motif *
                </label>
                <input
                  type="text"
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  placeholder="Ex: Erreur saisie, cuisson renvoyée, geste VIP..."
                  className="w-full bg-cream border border-sand rounded-xl px-3 py-2 text-xs text-navy focus:outline-none focus:ring-1 focus:ring-navy"
                  required
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-sand">
              {successMsg ? (
                <div className="flex items-center gap-1.5 text-success text-xs font-bold">
                  <CheckCircle2 className="w-4 h-4 text-success" />
                  Opération enregistrée !
                </div>
              ) : (
                <div className="text-xs text-slate-500">
                  Cette ligne sera intégrée au moteur d'analyse de pertes et corrélée aux ingrédients BOM.
                </div>
              )}

              <button
                type="submit"
                className="px-5 py-2.5 bg-navy hover:bg-navy-mid text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-xs transition-colors"
              >
                Enregistrer au journal
              </button>
            </div>
          </form>
        </div>
      )}

      {/* POS Voids Audit Table */}
      <div className="bg-white rounded-2xl border border-sand shadow-xs overflow-hidden">
        <div className="p-4 border-b border-sand flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-cream">
          <div>
            <h3 className="text-xs font-bold text-navy uppercase tracking-wider">
              Journal des Voids, Comps & Remises ({filteredVoids.length} opérations)
            </h3>
            <p className="text-[11px] text-slate-500">
              Croisement direct avec les composants de la fiche technique pour détecter les fuites.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <div className="flex items-center gap-1.5 bg-white border border-sand px-3 py-1.5 rounded-xl">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={filterType}
                onChange={e => setFilterType(e.target.value)}
                className="bg-transparent border-none text-xs font-semibold text-navy focus:outline-none"
              >
                <option value="all">Toutes natures</option>
                <option value="void">Annulation (Void)</option>
                <option value="comp">Offert (Comp)</option>
                <option value="discount">Remise (Discount)</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5 bg-white border border-sand px-3 py-1.5 rounded-xl">
              <User className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={filterStaff}
                onChange={e => setFilterStaff(e.target.value)}
                className="bg-transparent border-none text-xs font-semibold text-navy focus:outline-none"
              >
                <option value="all">Tous collaborateurs</option>
                {staff.map(s => (
                  <option key={s.id} value={s.name}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-cream border-b border-sand text-slate-600 font-bold text-[11px] uppercase tracking-wider">
                <th className="py-3 px-4">Date & Heure</th>
                <th className="py-3 px-3">Article Menu</th>
                <th className="py-3 px-3">Serveur / Barman</th>
                <th className="py-3 px-3 text-center">Type</th>
                <th className="py-3 px-3 text-right">Montant</th>
                <th className="py-3 px-3">Justification / Motif</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sand/60">
              {filteredVoids.map(item => {
                const staffName = getVoidStaffName(item);
                const itemName = getVoidItemName(item);
                const timeStr = getVoidTimestamp(item);
                const staffMember = staff.find(s => s && (s.name === staffName || s.id === item.staff_id));
                const isHighValue = item.amount >= 20;

                return (
                  <tr key={item.id} className="hover:bg-cream/60 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-navy tabular-nums whitespace-nowrap">
                      {timeStr || 'Non daté'}
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-bold text-navy">{itemName}</div>
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-navy text-terracotta flex items-center justify-center font-bold text-[10px]">
                          {staffName.charAt(0)}
                        </span>
                        <div>
                          <div className="font-bold text-navy">{staffName}</div>
                          <div className="text-[10px] text-slate-500">{staffMember?.role || 'Équipe'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        item.type === 'void' 
                          ? 'bg-alert/10 text-alert border border-alert/25' 
                          : item.type === 'comp'
                          ? 'bg-terracotta/10 text-terracotta border border-terracotta/25'
                          : 'bg-cream text-slate-700 border border-sand'
                      }`}>
                        {item.type === 'void' ? 'Annulation' : item.type === 'comp' ? 'Offert' : 'Remise'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-navy tabular-nums whitespace-nowrap">
                      <span className={isHighValue ? 'text-alert' : ''}>
                        {formatCurrency(item.amount)}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-600 text-[11px]">
                      {item.reason}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => {
                          if (confirm('Supprimer cette entrée ?')) {
                            deletePosVoid(item.id);
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
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PosVoidsManager;
