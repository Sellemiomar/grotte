import React, { useState } from 'react';
import { 
  Users, 
  Plus, 
  ShieldCheck, 
  Trash2, 
  CheckCircle2, 
  Lock,
  Mail,
  User,
  AlertCircle
} from 'lucide-react';
import { useStock } from '../context/StockContext';
import { StaffRole } from '../types';
import { getErrorMessage } from '../utils/errors';

export const StaffManager: React.FC = () => {
  const { 
    staff, 
    currentUser, 
    setCurrentUser, 
    accessLogs, 
    posVoids, 
    stockCounts, 
    deliveries, 
    addStaff, 
    signUpStaff, 
    updateStaff, 
    deleteStaff,
    isSupabaseConnected 
  } = useStock();

  const [name, setName] = useState('');
  const [role, setRole] = useState<StaffRole>('cook');
  const [roleTitle, setRoleTitle] = useState('Chef de Cuisine');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [active, setActive] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState(false);

  const isOwner = currentUser?.role === 'owner';

  const roleOptions: { value: StaffRole; label: string; defaultTitle: string; badge: string }[] = [
    { value: 'owner', label: 'Propriétaire (Owner)', defaultTitle: 'Propriétaire / Direction', badge: 'bg-navy/10 text-navy border-navy/20' },
    { value: 'stock_manager', label: 'Responsable Stock (Stock Manager)', defaultTitle: 'Économe & Gestionnaire Stock', badge: 'bg-terracotta/10 text-terracotta border-terracotta/30' },
    { value: 'cook', label: 'Cuisine (Cook)', defaultTitle: 'Chef de Cuisine', badge: 'bg-success/10 text-success border-success/30' },
    { value: 'server', label: 'Salle / Service (Server)', defaultTitle: 'Chef de Rang / Serveur', badge: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  ];

  const handleRoleChange = (newRole: StaffRole) => {
    setRole(newRole);
    const opt = roleOptions.find(o => o.value === newRole);
    if (opt) setRoleTitle(opt.defaultTitle);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!name.trim()) {
      setFormError('Le nom du collaborateur est obligatoire.');
      return;
    }

    if (email.trim() && password.trim() && password.trim().length < 8) {
      setFormError('Le mot de passe doit comporter au moins 8 caractères pour des raisons de sécurité.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (email.trim() && password.trim()) {
        const ok = await signUpStaff({
          name: name.trim(),
          role,
          roleTitle: roleTitle.trim() || undefined,
          email: email.trim(),
          password: password.trim(),
        });
        if (!ok) {
          setFormError('Impossible de créer le compte. Vérifiez que vous disposez des droits Propriétaire.');
          setIsSubmitting(false);
          return;
        }
      } else {
        await addStaff({
          name: name.trim(),
          role,
          roleTitle: roleTitle.trim() || undefined,
          email: email.trim() || undefined,
          active,
        });
      }

      setName('');
      setEmail('');
      setPassword('');
      setSuccessMsg(true);
      setTimeout(() => {
        setSuccessMsg(false);
        setShowAddForm(false);
      }, 1200);
    } catch (err: unknown) {
      setFormError(getErrorMessage(err, 'Erreur lors de la création du collaborateur.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="bg-white rounded-xl border border-sand p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-navy text-terracotta shadow-xs">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-navy uppercase tracking-wide">
                  Équipe & Responsabilités Opérationnelles
                </h2>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-cream text-navy border border-sand">
                  CHAÎNE DE CONFIANCE
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Attribution des signatures BL, comptages inventaire par shift, badgeages réserve et annulations POS.
              </p>
            </div>
          </div>

          {isOwner && (
            <button
              onClick={() => setShowAddForm(prev => !prev)}
              className="px-4 py-2 bg-navy hover:bg-navy-mid text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-colors shadow-xs"
            >
              <Plus className="w-4 h-4 text-terracotta" />
              {showAddForm ? 'Fermer' : 'Nouveau collaborateur'}
            </button>
          )}
        </div>
      </div>

      {!isOwner && (
        <div className="p-4 bg-amber-50/80 border border-amber-200/80 rounded-xl flex items-center gap-3 text-xs text-amber-900">
          <AlertCircle className="w-4 h-4 text-terracotta shrink-0" />
          <span>
            Mode consultation : Seul le <strong>Propriétaire (Owner)</strong> peut créer, modifier les rôles ou révoquer les accès de l'équipe.
          </span>
        </div>
      )}

      {/* Add Staff Form */}
      {showAddForm && isOwner && (
        <div className="bg-white rounded-xl border border-sand p-5 shadow-md">
          <h3 className="text-xs font-bold text-navy uppercase tracking-wider mb-4 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-terracotta" />
            Nouveau collaborateur & Habilitations d'Accès
          </h3>

          {formError && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <form onSubmit={handleAdd} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-slate-600 font-bold uppercase tracking-wider text-[10px] mb-1">
                  Nom & Prénom *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Ex: Yassine B."
                  className="w-full bg-cream border border-sand rounded-lg px-3 py-2 text-xs text-navy focus:outline-none focus:ring-1 focus:ring-navy"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-600 font-bold uppercase tracking-wider text-[10px] mb-1">
                  Rôle Système (Permissions) *
                </label>
                <select
                  value={role}
                  onChange={e => handleRoleChange(e.target.value as StaffRole)}
                  className="w-full bg-cream border border-sand rounded-lg px-3 py-2 text-xs text-navy focus:outline-none focus:ring-1 focus:ring-navy"
                >
                  {roleOptions.map(r => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-600 font-bold uppercase tracking-wider text-[10px] mb-1">
                  Titre / Poste Opérationnel
                </label>
                <input
                  type="text"
                  value={roleTitle}
                  onChange={e => setRoleTitle(e.target.value)}
                  placeholder="Ex: Chef de Cuisine"
                  className="w-full bg-cream border border-sand rounded-lg px-3 py-2 text-xs text-navy focus:outline-none focus:ring-1 focus:ring-navy"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-bold uppercase tracking-wider text-[10px] mb-1">
                  Email de connexion
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="collaborateur@lagrotte.tn"
                  className="w-full bg-cream border border-sand rounded-lg px-3 py-2 text-xs text-navy focus:outline-none focus:ring-1 focus:ring-navy"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div>
                <label className="block text-slate-600 font-bold uppercase tracking-wider text-[10px] mb-1">
                  Mot de passe de session (min. 8 caractères)
                </label>
                <input
                  type="password"
                  minLength={8}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-cream border border-sand rounded-lg px-3 py-2 text-xs text-navy focus:outline-none focus:ring-1 focus:ring-navy"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Requis si un email est spécifié pour créer un compte d'accès sécurisé.
                </p>
              </div>

              <div>
                <label className="block text-slate-600 font-bold uppercase tracking-wider text-[10px] mb-1">
                  Statut Opérationnel
                </label>
                <div className="flex items-center gap-4 mt-2">
                  <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="radio"
                      name="active"
                      checked={active}
                      onChange={() => setActive(true)}
                      className="accent-navy"
                    />
                    Actif en service
                  </label>
                  <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="radio"
                      name="active"
                      checked={!active}
                      onChange={() => setActive(false)}
                      className="accent-navy"
                    />
                    Inactif / Congé
                  </label>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-sand">
              {successMsg && (
                <div className="flex items-center gap-1.5 text-success text-xs font-bold">
                  <CheckCircle2 className="w-4 h-4 text-success" />
                  Collaborateur ajouté avec succès !
                </div>
              )}
              <div className="ml-auto">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-navy hover:bg-navy-mid text-white rounded-lg text-xs font-bold uppercase tracking-wider shadow-xs transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Staff Grid */}
      {staff.length === 0 ? (
        <div className="bg-white rounded-2xl border border-sand p-12 text-center max-w-md mx-auto space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-cream text-slate-400 mx-auto flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-sm text-navy">Aucun membre d'équipe enregistré</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Créez les premiers profils pour attribuer les responsabilités de réception, d'inventaire et de caisse.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {staff.map(member => {
            const memberAccessLogs = accessLogs.filter(a => a.staff_name === member.name || a.staff_id === member.id);
            const memberPosVoids = posVoids.filter(v => v.staff_name === member.name || v.staff_id === member.id);
            const memberStockCounts = stockCounts.filter(c => (c.counted_by || '').includes(member.name));
            const memberDeliveries = deliveries.filter(d => (d.received_by || '').includes(member.name));

            const isCurrent = currentUser?.id === member.id;
            const roleBadgeStyle = roleOptions.find(o => o.value === member.role)?.badge || 'bg-slate-100 text-slate-700 border-slate-200';
            const roleName = roleOptions.find(o => o.value === member.role)?.label || member.role;

            return (
              <div key={member.id} className={`bg-white rounded-xl border p-4 shadow-xs space-y-3 transition-all ${
                isCurrent ? 'ring-2 ring-navy border-navy' : 'border-sand'
              }`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-navy text-white flex items-center justify-center font-bold text-sm">
                      {member.name.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h4 className="font-bold text-sm text-navy">{member.name}</h4>
                        {isCurrent && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
                            VOUS
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-slate-500 block">{member.roleTitle || roleName}</span>
                      {member.email && (
                        <span className="text-[11px] text-slate-400 font-mono block">{member.email}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${roleBadgeStyle}`}>
                      {roleName}
                    </span>
                    <span className={`text-[10px] font-medium ${member.active ? 'text-success' : 'text-slate-400'}`}>
                      {member.active ? '● Actif' : '○ Inactif'}
                    </span>
                  </div>
                </div>

                {/* Responsibilities count badges */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-sand text-xs">
                  <div className="p-2 bg-cream rounded-lg">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">
                      Accès Réserve
                    </span>
                    <span className="font-mono font-bold text-navy">
                      {memberAccessLogs.length} passages
                    </span>
                  </div>

                  <div className="p-2 bg-cream rounded-lg">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">
                      Annulations POS
                    </span>
                    <span className="font-mono font-bold text-navy">
                      {memberPosVoids.length} opérations
                    </span>
                  </div>

                  <div className="p-2 bg-cream rounded-lg">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">
                      Comptages Inventaire
                    </span>
                    <span className="font-mono font-bold text-navy">
                      {memberStockCounts.length} fiches
                    </span>
                  </div>

                  <div className="p-2 bg-cream rounded-lg">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">
                      BL Fournisseurs
                    </span>
                    <span className="font-mono font-bold text-navy">
                      {memberDeliveries.length} réceptions
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-sand text-xs">
                  <div className="flex items-center gap-2">
                    {!isCurrent ? (
                      <button
                        onClick={() => setCurrentUser(member)}
                        className="px-2.5 py-1 bg-navy hover:bg-navy-mid text-white rounded-lg text-[11px] font-bold transition-colors"
                      >
                        Basculer sur ce profil
                      </button>
                    ) : (
                      <span className="text-[11px] text-success font-bold">
                        Session active
                      </span>
                    )}
                    {isOwner && (
                      <button
                        onClick={() => updateStaff(member.id, { active: !member.active })}
                        className="text-slate-500 hover:text-navy font-medium text-[11px]"
                      >
                        {member.active ? 'Mettre en pause' : 'Réactiver'}
                      </button>
                    )}
                  </div>

                  {isOwner && !isCurrent && (
                    <button
                      onClick={() => {
                        if (confirm(`Révoquer et supprimer l'accès de ${member.name} ?`)) {
                          deleteStaff(member.id);
                        }
                      }}
                      className="text-slate-400 hover:text-alert transition-colors p-1"
                      title="Supprimer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default StaffManager;
