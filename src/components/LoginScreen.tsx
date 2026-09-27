import React, { useState } from 'react';
import { 
  Lock, 
  Mail, 
  Key, 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle,
  Database,
  CloudCheck,
  UserCheck,
  Building2,
  ChefHat,
  Package,
  Wine,
  Crown,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { useStock } from '../context/StockContext';
import { StaffRole } from '../types';
import { getErrorMessage } from '../utils/errors';

export const LoginScreen: React.FC = () => {
  const { staff, login, isSupabaseConnected, isSupabaseAuthActive } = useStock();

  const [activeTab, setActiveTab] = useState<'credentials' | 'profiles'>('credentials');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsSubmitting(true);
    try {
      const success = await login(email.trim(), password.trim());
      if (success) {
        setSuccessMsg('Authentification réussie ! Chargement de votre espace...');
      } else {
        setErrorMsg('Identifiants incorrects ou compte inactif. Veuillez vérifier votre adresse email et mot de passe.');
      }
    } catch (err: unknown) {
      setErrorMsg(getErrorMessage(err, 'Erreur de connexion.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleProfileSelect = async (staffEmail?: string, staffRole?: StaffRole) => {
    if (!staffEmail) return;
    setEmail(staffEmail);
    setErrorMsg(null);
    setIsSubmitting(true);
    try {
      const success = await login(staffEmail, 'password123');
      if (success) {
        setSuccessMsg(`Connexion réussie : profil ${staffRole?.toUpperCase() || ''}`);
      } else {
        setErrorMsg(`Impossible de connecter ce compte. Veuillez saisir le mot de passe manuellement.`);
        setActiveTab('credentials');
      }
    } catch (err: unknown) {
      setErrorMsg(getErrorMessage(err, 'Erreur de connexion.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-sand/30 font-sans text-navy flex flex-col justify-center items-center p-4 sm:p-6 lg:p-8 relative overflow-hidden">
      {/* Background decorative elements matching La Grotte aesthetic */}
      <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-terracotta/5 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-96 h-96 rounded-full bg-navy/5 blur-3xl pointer-events-none" />

      {/* Main Login Card */}
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-sand/80 overflow-hidden relative z-10">
        {/* Brand Banner Header */}
        <div className="bg-navy p-6 sm:p-8 text-white text-center relative border-b border-slate-800">
          <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-terracotta/15 border border-terracotta/30 flex items-center justify-center text-terracotta shadow-inner">
            <Building2 className="w-7 h-7" />
          </div>
          <span className="text-[11px] font-bold uppercase tracking-widest text-terracotta block">
            Système de Contrôle Matière & Ratios
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-white mt-1">
            La Grotte • Monastir
          </h1>
          <p className="text-xs text-sand/80 mt-1 max-w-xs mx-auto leading-relaxed">
            Espace sécurisé de gestion des stocks, fiches techniques et surveillance des écarts.
          </p>

          <div className="mt-4 flex items-center justify-center gap-2">
            {isSupabaseConnected ? (
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
                <CloudCheck className="w-3.5 h-3.5" /> Serveur Supabase Connecté
              </span>
            ) : (
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5" /> Base Locale Sécurisée
              </span>
            )}
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-sand bg-linen text-xs font-bold uppercase tracking-wider">
          <button
            type="button"
            onClick={() => { setActiveTab('credentials'); setErrorMsg(null); }}
            className={`flex-1 py-3 px-4 text-center border-b-2 transition-colors flex items-center justify-center gap-2 ${
              activeTab === 'credentials'
                ? 'border-terracotta text-terracotta bg-white'
                : 'border-transparent text-slate-600 hover:text-navy'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Identifiants</span>
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('profiles'); setErrorMsg(null); }}
            className={`flex-1 py-3 px-4 text-center border-b-2 transition-colors flex items-center justify-center gap-2 ${
              activeTab === 'profiles'
                ? 'border-terracotta text-terracotta bg-white'
                : 'border-transparent text-slate-600 hover:text-navy'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Postes & Rôles</span>
          </button>
        </div>

        {/* Card Body */}
        <div className="p-6 sm:p-8 space-y-5">
          {errorMsg && (
            <div className="p-3.5 bg-alert/10 border border-alert/30 rounded-xl text-alert text-xs flex items-start gap-2.5 animate-shake">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="font-medium leading-relaxed">{errorMsg}</div>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 bg-success/10 border border-success/30 rounded-xl text-success text-xs flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <div className="font-medium">{successMsg}</div>
            </div>
          )}

          {/* TAB 1: Direct Email & Password */}
          {activeTab === 'credentials' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-slate-700 font-bold uppercase tracking-wider text-[10px] mb-1.5">
                  Adresse Email Professionnelle *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="ex: omar@lagrotte.tn"
                    className="w-full pl-10 pr-3.5 py-3 text-xs bg-white border border-sand rounded-xl focus:ring-2 focus:ring-navy/20 focus:border-navy focus:outline-none transition-all shadow-2xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold uppercase tracking-wider text-[10px] mb-1.5">
                  Mot de Passe *
                </label>
                <div className="relative">
                  <Key className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-3.5 py-3 text-xs bg-white border border-sand rounded-xl focus:ring-2 focus:ring-navy/20 focus:border-navy focus:outline-none transition-all shadow-2xs"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 bg-navy hover:bg-navy-mid text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-md hover:shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                      <span>Authentification en cours...</span>
                    </>
                  ) : (
                    <>
                      <span>Accéder à l'espace restaurant</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>

              {/* Quick pre-fill buttons */}
              <div className="pt-4 border-t border-sand/60">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Comptes du restaurant :
                  </span>
                  <span className="text-[10px] text-slate-400">Cliquez pour tester</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {staff.slice(0, 4).map(s => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => {
                        setEmail(s.email || '');
                        setPassword('password123');
                      }}
                      className="p-2 rounded-xl bg-linen hover:bg-sand/40 border border-sand text-left transition-colors text-xs flex flex-col justify-between"
                    >
                      <span className="font-bold text-navy text-[11px] truncate">{s.name}</span>
                      <span className="text-[10px] text-slate-500 font-mono truncate">{s.roleTitle || s.role}</span>
                    </button>
                  ))}
                </div>
              </div>
            </form>
          )}

          {/* TAB 2: Role Profiles */}
          {activeTab === 'profiles' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-600 leading-relaxed">
                Sélectionnez un profil pour vous connecter avec les autorisations RBAC correspondantes :
              </p>

              <div className="space-y-2.5">
                {[
                  {
                    role: 'owner' as const,
                    icon: Crown,
                    title: 'Propriétaire (Direction)',
                    email: staff.find(s => s.role === 'owner')?.email || 'omar@lagrotte.tn',
                    desc: 'Supervision globale, coûts unitaires, écarts & coulage, gestion équipe.',
                    color: 'text-amber-500 bg-amber-50 border-amber-200'
                  },
                  {
                    role: 'stock_manager' as const,
                    icon: Package,
                    title: 'Responsable Stock (Économe)',
                    email: staff.find(s => s.role === 'stock_manager')?.email || 'karim@lagrotte.tn',
                    desc: 'Bons de livraison, inventaires physiques, fiches techniques et rapports.',
                    color: 'text-blue-500 bg-blue-50 border-blue-200'
                  },
                  {
                    role: 'cook' as const,
                    icon: ChefHat,
                    title: 'Chef de Cuisine',
                    email: staff.find(s => s.role === 'cook')?.email || 'chef@lagrotte.tn',
                    desc: 'Saisie des inventaires cuisine, déclaration des pertes et fiches recettes.',
                    color: 'text-emerald-500 bg-emerald-50 border-emerald-200'
                  },
                  {
                    role: 'server' as const,
                    icon: Wine,
                    title: 'Responsable Bar & Salle',
                    email: staff.find(s => s.role === 'server')?.email || 'bar@lagrotte.tn',
                    desc: 'Inventaires boissons & cave, consultation des anomalies caisse.',
                    color: 'text-purple-500 bg-purple-50 border-purple-200'
                  }
                ].map(item => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.role}
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => handleProfileSelect(item.email, item.role)}
                      className="w-full text-left p-3.5 rounded-2xl border border-sand bg-white hover:bg-linen transition-all shadow-2xs hover:shadow-xs flex items-center gap-3.5 group disabled:opacity-50"
                    >
                      <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${item.color}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-navy group-hover:text-terracotta transition-colors">
                            {item.title}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400">
                            {item.email}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 truncate mt-0.5">
                          {item.desc}
                        </p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-terracotta group-hover:translate-x-0.5 transition-all shrink-0" />
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="bg-linen/60 px-6 py-3 border-t border-sand text-center text-[11px] text-slate-500">
          La Grotte Monastir • Contrôle Strict des Accès • Données Protégées
        </div>
      </div>
    </div>
  );
};
