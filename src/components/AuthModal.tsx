import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Lock, 
  Mail, 
  Key, 
  LogOut, 
  X, 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle,
  Database,
  CloudCheck,
  UserCheck
} from 'lucide-react';
import { useStock } from '../context/StockContext';
import { StaffRole } from '../types';
import { getErrorMessage } from '../utils/errors';

interface AuthModalProps {
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ onClose }) => {
  const { staff, currentUser, login, logout, switchStaffRole, signUpStaff, isSupabaseConnected } = useStock();

  const [activeTab, setActiveTab] = useState<'login' | 'quick' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // New staff registration state
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<StaffRole>('cook');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRoleTitle, setNewRoleTitle] = useState('Chef de Cuisine');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsSubmitting(true);
    try {
      const success = await login(email.trim(), password.trim());
      if (success) {
        setSuccessMsg('Authentification validée ! Session active.');
        setTimeout(() => {
          onClose();
        }, 700);
      } else {
        setErrorMsg('Identifiants incorrects ou compte inactif. Veuillez vérifier votre email et mot de passe.');
      }
    } catch (err: unknown) {
      setErrorMsg(getErrorMessage(err, 'Erreur de connexion.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!newName.trim() || !newEmail.trim()) {
      setErrorMsg("Veuillez renseigner le nom complet et l'adresse email.");
      return;
    }

    if (!newPassword || newPassword.trim().length < 8) {
      setErrorMsg('Sécurité : Le mot de passe doit comporter au moins 8 caractères.');
      return;
    }

    setIsSubmitting(true);
    try {
      const success = await signUpStaff({
        name: newName.trim(),
        role: newRole,
        roleTitle: newRoleTitle.trim(),
        email: newEmail.trim(),
        password: newPassword.trim(),
      });

      if (success) {
        setSuccessMsg(`Compte collaborateur créé pour ${newName} !`);
        setTimeout(() => {
          onClose();
        }, 900);
      } else {
        setErrorMsg("Impossible de créer le compte. Vérifiez que vous disposez du rôle Propriétaire.");
      }
    } catch (err: unknown) {
      setErrorMsg(getErrorMessage(err, 'Erreur lors de la création du compte.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickSwitch = (role: StaffRole) => {
    switchStaffRole(role);
    setSuccessMsg(`Session basculée sur le profil : ${role.toUpperCase()}`);
    setTimeout(() => {
      onClose();
    }, 400);
  };

  const handleLogout = async () => {
    await logout();
    setSuccessMsg('Session déconnectée avec succès.');
    setTimeout(() => {
      onClose();
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        className="fixed inset-0 bg-black/60 backdrop-blur-xs"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        className="relative bg-cream rounded-2xl max-w-lg w-full shadow-2xl border border-sand overflow-hidden text-navy my-8 z-10"
      >
        {/* Header with Grotte Marine styling */}
        <div className="bg-navy p-5 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-white/10 border border-white/15 text-terracotta">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold tracking-tight">
                  Authentification & Contrôle RBAC
                </h2>
                {isSupabaseConnected ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                    <CloudCheck className="w-3 h-3" /> Supabase Auth
                  </span>
                ) : (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                    <Database className="w-3 h-3" /> Mode Local
                  </span>
                )}
              </div>
              <p className="text-xs text-sand/80 mt-0.5">
                Session en cours : <strong className="text-white">{currentUser?.name || 'Visiteur'}</strong> ({currentUser?.role || 'aucun'})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-sand bg-linen text-xs font-bold uppercase tracking-wider">
          <button
            onClick={() => { setActiveTab('login'); setErrorMsg(null); }}
            className={`flex-1 py-3 px-4 text-center border-b-2 transition-colors ${
              activeTab === 'login'
                ? 'border-terracotta text-terracotta bg-white'
                : 'border-transparent text-slate-600 hover:text-navy'
            }`}
          >
            Connexion
          </button>
          <button
            onClick={() => { setActiveTab('quick'); setErrorMsg(null); }}
            className={`flex-1 py-3 px-4 text-center border-b-2 transition-colors ${
              activeTab === 'quick'
                ? 'border-terracotta text-terracotta bg-white'
                : 'border-transparent text-slate-600 hover:text-navy'
            }`}
          >
            Bascule de Rôle
          </button>
          <button
            onClick={() => { setActiveTab('register'); setErrorMsg(null); }}
            className={`flex-1 py-3 px-4 text-center border-b-2 transition-colors ${
              activeTab === 'register'
                ? 'border-terracotta text-terracotta bg-white'
                : 'border-transparent text-slate-600 hover:text-navy'
            }`}
          >
            Nouveau Profil
          </button>
        </div>

        <div className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 bg-alert/10 border border-alert/30 rounded-xl text-alert text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-success/10 border border-success/30 rounded-xl text-success text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* TAB 1: Email / Password Login */}
          {activeTab === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-slate-600 font-bold uppercase tracking-wider text-[10px] mb-1">
                  Adresse Email Professionnelle *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="ex: omar@lagrotte.tn ou karim@lagrotte.tn"
                    className="w-full pl-9 pr-3 py-2.5 text-xs bg-white border border-sand rounded-xl focus:ring-1 focus:ring-navy focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-bold uppercase tracking-wider text-[10px] mb-1">
                  Mot de Passe Sécurisé *
                </label>
                <div className="relative">
                  <Key className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2.5 text-xs bg-white border border-sand rounded-xl focus:ring-1 focus:ring-navy focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between gap-3">
                {currentUser && (
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="px-4 py-2.5 border border-sand bg-white text-slate-600 hover:text-alert hover:border-alert/40 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Déconnexion
                  </button>
                )}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 bg-navy hover:bg-navy-mid text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-colors shadow-sm disabled:opacity-50"
                >
                  {isSubmitting ? 'Vérification...' : 'Se Connecter'}
                </button>
              </div>

              {/* Verified Staff Accounts List */}
              <div className="mt-4 pt-4 border-t border-sand">
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center justify-between">
                  <span>Collaborateurs enregistrés :</span>
                  <span className="text-[10px] text-slate-400">Cliquez pour pré-remplir l'email</span>
                </p>
                <div className="space-y-1.5 text-xs">
                  {staff.slice(0, 4).map(s => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => {
                        setEmail(s.email || '');
                      }}
                      className="w-full text-left p-2.5 rounded-xl bg-white hover:bg-linen border border-sand flex items-center justify-between transition-colors"
                    >
                      <div>
                        <span className="font-bold text-navy">{s.name}</span>
                        <span className="text-slate-500 text-[10px] ml-1.5 font-mono">({s.email})</span>
                      </div>
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-md bg-cream border border-sand text-slate-700">
                        {s.role}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </form>
          )}

          {/* TAB 2: Quick Role Switcher */}
          {activeTab === 'quick' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-600">
                Basculez rapidement de casquette pour tester l'isolation stricte des accès RBAC :
              </p>

              <div className="space-y-2">
                {[
                  {
                    role: 'owner' as const,
                    emoji: '👑',
                    title: 'Propriétaire (Owner)',
                    desc: 'Accès intégral : Audit variance & coulage, modification catalogue & coûts unitaires, gestion de l\'équipe.',
                  },
                  {
                    role: 'stock_manager' as const,
                    emoji: '📦',
                    title: 'Responsable Stock (Stock Manager)',
                    desc: 'Accès complet gestion matière : Inventaires physiques, bons de livraison et fiches techniques recettes.',
                  },
                  {
                    role: 'cook' as const,
                    emoji: '👨‍🍳',
                    title: 'Cuisine (Cook)',
                    desc: 'Accès restreint : Saisie d\'inventaire physique & fiches techniques. Modification des coûts bloquée.',
                  },
                  {
                    role: 'server' as const,
                    emoji: '🍷',
                    title: 'Salle / Service (Server)',
                    desc: 'Accès restreint : Saisie des inventaires bar & consultation des voids POS. Modification du stock bloquée.',
                  },
                ].map(item => {
                  const isCurrent = currentUser?.role === item.role;
                  return (
                    <button
                      key={item.role}
                      onClick={() => handleQuickSwitch(item.role)}
                      className={`w-full text-left p-3.5 rounded-xl border transition-all flex items-start gap-3 ${
                        isCurrent 
                          ? 'border-terracotta bg-terracotta/10 ring-1 ring-terracotta' 
                          : 'border-sand bg-white hover:bg-linen'
                      }`}
                    >
                      <span className="text-2xl shrink-0 mt-0.5">{item.emoji}</span>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-navy">{item.title}</span>
                          {isCurrent && (
                            <span className="text-[10px] font-bold uppercase tracking-wider text-terracotta flex items-center gap-1">
                              <UserCheck className="w-3.5 h-3.5" /> Actif
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">{item.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: New Staff Registration */}
          {activeTab === 'register' && (
            <form onSubmit={handleRegister} className="space-y-3">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs">
                <strong>Règle de sécurité :</strong> Seul le compte Propriétaire peut créer de nouveaux accès. Le mot de passe doit comporter un minimum de 8 caractères.
              </div>

              <div>
                <label className="block text-slate-600 font-bold uppercase tracking-wider text-[10px] mb-1">
                  Nom & Prénom *
                </label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="Ex: Yassine Ben Salem"
                  className="w-full px-3 py-2 text-xs bg-white border border-sand rounded-xl focus:ring-1 focus:ring-navy focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-bold uppercase tracking-wider text-[10px] mb-1">
                    Rôle Système *
                  </label>
                  <select
                    value={newRole}
                    onChange={e => {
                      const r = e.target.value as StaffRole;
                      setNewRole(r);
                      if (r === 'cook') setNewRoleTitle('Chef de Cuisine');
                      else if (r === 'server') setNewRoleTitle('Chef de Rang');
                      else if (r === 'stock_manager') setNewRoleTitle('Économe Stock');
                      else setNewRoleTitle('Directeur Associé');
                    }}
                    className="w-full px-3 py-2 text-xs bg-white border border-sand rounded-xl focus:ring-1 focus:ring-navy focus:outline-none"
                  >
                    <option value="cook">Cuisine (Cook)</option>
                    <option value="server">Salle (Server)</option>
                    <option value="stock_manager">Responsable Stock</option>
                    <option value="owner">Propriétaire (Owner)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 font-bold uppercase tracking-wider text-[10px] mb-1">
                    Intitulé de Poste
                  </label>
                  <input
                    type="text"
                    value={newRoleTitle}
                    onChange={e => setNewRoleTitle(e.target.value)}
                    placeholder="Ex: Économe Matin"
                    className="w-full px-3 py-2 text-xs bg-white border border-sand rounded-xl focus:ring-1 focus:ring-navy focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-bold uppercase tracking-wider text-[10px] mb-1">
                  Email Professionnel *
                </label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                  placeholder="nom@lagrotte.tn"
                  className="w-full px-3 py-2 text-xs bg-white border border-sand rounded-xl focus:ring-1 focus:ring-navy focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-bold uppercase tracking-wider text-[10px] mb-1">
                  Mot de Passe Initial (min. 8 caractères) *
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Minimum 8 caractères"
                  className="w-full px-3 py-2 text-xs bg-white border border-sand rounded-xl focus:ring-1 focus:ring-navy focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 bg-terracotta hover:bg-terracotta-hover text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-colors shadow-sm mt-2 disabled:opacity-50"
              >
                {isSubmitting ? 'Création...' : 'Créer le Compte Collaborateur'}
              </button>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default AuthModal;
