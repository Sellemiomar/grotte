import React, { useState } from 'react';
import { 
  TrendingDown, 
  ClipboardList, 
  Package, 
  Truck, 
  UtensilsCrossed, 
  UploadCloud, 
  HelpCircle, 
  Download, 
  RotateCcw,
  X,
  Key,
  Receipt,
  Users,
  PlusCircle,
  ShieldCheck,
  Building2,
  Trash2,
  ShoppingCart
} from 'lucide-react';
import { useStock } from '../context/StockContext';
import { formatCurrency } from '../utils/calculations';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenFastCount: () => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  onOpenAuthModal?: () => void;
  onOpenWasteLog?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  onOpenFastCount,
  isOpenMobile,
  onCloseMobile,
  onOpenAuthModal,
  onOpenWasteLog,
}) => {
  const {
    totalLossCost,
    varianceReports,
    lowStockItemsCount,
    accessLogs,
    posVoids,
    currentUser,
    switchStaffRole,
    resetToDemoData,
    exportDataJSON,
    isSupabaseConnected,
  } = useStock();

  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showRoleSwitcher, setShowRoleSwitcher] = useState(false);

  const highLossItemsCount = varianceReports.filter(
    r => r.status === 'critical_loss' || r.status === 'moderate_loss'
  ).length;

  const handleExportBackup = () => {
    const jsonStr = exportDataJSON();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `la-grotte-stock-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const navItems = [
    {
      id: 'variance',
      label: 'Control Center (Variance)',
      icon: TrendingDown,
      badge: highLossItemsCount > 0 ? `${highLossItemsCount}` : null,
      badgeColor: 'bg-alert/25 text-rose-200 border border-alert/40',
    },
    {
      id: 'counts',
      label: 'Inventaire Physique',
      icon: ClipboardList,
      badge: null,
      badgeColor: '',
    },
    {
      id: 'ingredients',
      label: 'Catalogue & Stock Réel',
      icon: Package,
      badge: lowStockItemsCount > 0 ? `${lowStockItemsCount}` : null,
      badgeColor: 'bg-terracotta/25 text-sand border border-terracotta/40',
    },
    {
      id: 'deliveries',
      label: 'Livraisons (Stock IN)',
      icon: Truck,
      badge: null,
      badgeColor: '',
    },
    {
      id: 'purchase_orders',
      label: 'Bons de Commande',
      icon: ShoppingCart,
      badge: null,
      badgeColor: '',
    },
    {
      id: 'recipes',
      label: 'Fiches Recettes (BOM)',
      icon: UtensilsCrossed,
      badge: null,
      badgeColor: '',
    },
    {
      id: 'sales',
      label: 'Ventes Caisse (POS)',
      icon: UploadCloud,
      badge: null,
      badgeColor: '',
    },
  ];

  const auditNavItems = [
    {
      id: 'access_logs',
      label: 'Accès Réserves & Badge',
      icon: Key,
      badge: accessLogs.length > 0 ? `${accessLogs.length}` : null,
      badgeColor: 'bg-navy-mid text-sand',
    },
    {
      id: 'pos_voids',
      label: 'Annulations POS & Offerts',
      icon: Receipt,
      badge: posVoids.length > 0 ? `${posVoids.length}` : null,
      badgeColor: 'bg-alert/25 text-rose-200 border border-alert/40',
    },
    {
      id: 'staff',
      label: 'Équipe & Responsabilités',
      icon: Users,
      badge: null,
      badgeColor: '',
    },
  ];

  const userRole = currentUser?.role || 'owner';

  const visibleNavItems = navItems.filter(item => {
    if (userRole === 'cook') {
      return ['counts', 'recipes'].includes(item.id);
    }
    if (userRole === 'server') {
      return ['counts'].includes(item.id);
    }
    return true;
  });

  const visibleAuditNavItems = auditNavItems.filter(item => {
    if (userRole === 'cook') {
      return false;
    }
    if (userRole === 'server') {
      return ['pos_voids'].includes(item.id);
    }
    return true;
  });

  const userInitials = (currentUser?.name || 'Omar Sellemi')
    .split(' ')
    .map(p => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const roleLabelMap: Record<string, string> = {
    owner: 'Propriétaire (Owner)',
    stock_manager: 'Responsable Stock',
    cook: 'Chef / Cuisine',
    server: 'Service / Salle',
  };

  const sidebarContent = (
    <div className="h-full flex flex-col justify-between select-none">
      <div>
        {/* Brand Header with Monastir Coastal & Ribat Identity */}
        <div className="p-5 flex items-center justify-between border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-terracotta rounded-xl flex items-center justify-center font-black text-white text-sm shadow-md tracking-wider">
              LG
            </div>
            <div>
              <span className="text-base font-extrabold tracking-tight text-white uppercase block leading-none">
                LA GROTTE
              </span>
              <span className="text-[10px] text-sand/70 font-semibold tracking-wider mt-1 block">
                Monastir • Contrôle Matière
              </span>
            </div>
          </div>
          {isOpenMobile && (
            <button
              onClick={onCloseMobile}
              aria-label="Fermer le menu mobile"
              className="lg:hidden text-slate-400 hover:text-white p-1 rounded-lg focus-visible:ring-2 focus-visible:ring-ochre focus-visible:outline-none"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Quick Action: Relevé Express (Shift) & Déclarer Perte */}
        <div className="p-3 space-y-1.5">
          <button
            onClick={() => {
              onOpenFastCount();
              if (isOpenMobile) onCloseMobile();
            }}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-terracotta hover:bg-terracotta-hover text-white font-bold text-xs uppercase tracking-wider transition-colors shadow-sm"
          >
            <PlusCircle className="w-4 h-4" />
            Relevé Express (Shift)
          </button>
          {onOpenWasteLog && (
            <button
              onClick={() => {
                onOpenWasteLog();
                if (isOpenMobile) onCloseMobile();
              }}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-white/10 hover:bg-white/15 text-sand font-semibold text-xs transition-colors border border-white/10"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-300" />
              Déclarer Perte (Coulage)
            </button>
          )}
        </div>

        {/* Live Loss / Variance Indicator Pill */}
        <div className="px-3 mb-2">
          <div 
            onClick={() => {
              setActiveTab('variance');
              if (isOpenMobile) onCloseMobile();
            }}
            className="p-3 rounded-xl bg-navy-deep border border-white/10 flex items-center justify-between cursor-pointer hover:border-terracotta/50 transition-colors"
          >
            <div>
              <span className="text-[10px] font-bold text-sand/70 uppercase tracking-wider block">
                Coulage Détecté
              </span>
              <span className="text-sm font-bold text-rose-400 font-mono tabular-nums">
                +{formatCurrency(totalLossCost)}
              </span>
            </div>
            <div className="w-2.5 h-2.5 rounded-full bg-alert animate-pulse"></div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="px-3 space-y-1 mt-2">
          {visibleNavItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                id={`nav-${item.id}`}
                onClick={() => {
                  setActiveTab(item.id);
                  if (isOpenMobile) onCloseMobile();
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-navy-mid text-white font-bold shadow-xs border border-white/15'
                    : 'text-sand/80 hover:text-white hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-terracotta' : 'text-sand/60'}`} />
                  <span className="truncate">{item.label}</span>
                </div>
                {item.badge && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${item.badgeColor}`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}

          {/* Audit & Responsibility Section */}
          {visibleAuditNavItems.length > 0 && (
            <div className="pt-3 pb-1 px-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-sand/50 block">
                Audit & Traçabilité
              </span>
            </div>
          )}

          {visibleAuditNavItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                id={`nav-${item.id}`}
                onClick={() => {
                  setActiveTab(item.id);
                  if (isOpenMobile) onCloseMobile();
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-navy-mid text-white font-bold shadow-xs border border-white/15'
                    : 'text-sand/80 hover:text-white hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-terracotta' : 'text-sand/60'}`} />
                  <span className="truncate">{item.label}</span>
                </div>
                {item.badge && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${item.badgeColor}`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer Profile & Utilities */}
      <div className="p-4 border-t border-white/10 bg-navy-deep relative">
        {/* Live database indicator */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-[11px] mb-3">
          <div className={`w-2 h-2 rounded-full ${isSupabaseConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
          <span className="text-sand/90 font-medium truncate">
            {isSupabaseConnected ? 'Base Supabase PostgreSQL Active' : 'Mode Local (Cache navigateur)'}
          </span>
        </div>

        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-navy-mid flex items-center justify-center text-xs font-bold text-white border border-white/15 shrink-0">
              {userInitials}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-white leading-tight truncate">
                {currentUser?.name || 'Omar Sellemi'}
              </p>
              <p className="text-[11px] text-terracotta font-medium truncate">
                {currentUser?.roleTitle || roleLabelMap[userRole]}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {onOpenAuthModal && (
              <button
                onClick={onOpenAuthModal}
                className="text-[10px] uppercase font-bold tracking-wider px-2 py-1 bg-white/10 hover:bg-white/20 text-white rounded-lg border border-white/10 transition-colors"
                title="Connexion email / Gestion profil"
              >
                Auth
              </button>
            )}
            <button
              onClick={() => setShowRoleSwitcher(prev => !prev)}
              className="text-[10px] uppercase font-bold tracking-wider px-2 py-1 bg-white/10 hover:bg-white/20 text-white rounded-lg border border-white/10 transition-colors"
              title="Tester un autre rôle"
            >
              Rôle
            </button>
          </div>
        </div>

        {/* Quick Role Switcher Dropdown */}
        {showRoleSwitcher && (
          <div className="mb-3 p-2 bg-navy border border-white/15 rounded-xl space-y-1 text-xs text-sand shadow-xl">
            <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-sand/60 border-b border-white/10">
              Simulation de rôle (RBAC)
            </div>
            {[
              { role: 'owner' as const, label: '👑 Propriétaire', sub: 'Accès total' },
              { role: 'stock_manager' as const, label: '📦 Responsable Stock', sub: 'Gestion matière' },
              { role: 'cook' as const, label: '👨‍🍳 Cuisine', sub: 'Inventaire & Recettes' },
              { role: 'server' as const, label: '🍷 Salle / Service', sub: 'Inventaire & Voids' },
            ].map(r => (
              <button
                key={r.role}
                onClick={() => {
                  switchStaffRole(r.role);
                  setShowRoleSwitcher(false);
                }}
                className={`w-full text-left px-2 py-1.5 rounded-lg transition-colors flex items-center justify-between ${
                  userRole === r.role ? 'bg-terracotta text-white font-bold' : 'hover:bg-white/10 text-sand'
                }`}
              >
                <span>{r.label}</span>
                <span className="text-[10px] opacity-75">{r.sub}</span>
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t border-white/10 text-xs text-sand/70">
          <button
            onClick={() => setShowHelpModal(true)}
            className="flex items-center gap-1 hover:text-white transition-colors"
            title="Formule de calcul du coulage"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Aide</span>
          </button>
          <button
            onClick={handleExportBackup}
            className="flex items-center gap-1 hover:text-white transition-colors"
            title="Sauvegarde JSON"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Backup</span>
          </button>
          <button
            onClick={() => {
              if (confirm('Réinitialiser les données avec le jeu de démo La Grotte ?')) {
                resetToDemoData();
              }
            }}
            className="flex items-center gap-1 hover:text-rose-300 transition-colors"
            title="Réinitialiser Démo"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* Help Modal */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-cream rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-sand text-navy">
            <h3 className="text-base font-bold text-navy uppercase tracking-wider mb-2">
              Méthode de Calcul du Coulage — La Grotte Monastir
            </h3>
            <p className="text-xs text-slate-600 mb-4">
              Ce système compare la consommation théorique (recettes × ventes POS) à la consommation réelle constatée lors des inventaires physiques.
            </p>

            <div className="space-y-3 text-xs text-slate-800 bg-white p-4 rounded-xl border border-sand font-mono">
              <p>
                <strong className="text-navy font-sans">1. Conso Réelle :</strong><br/>
                Stock départ + Livraisons reçues - Stock physique compté
              </p>
              <p>
                <strong className="text-navy font-sans">2. Conso Théorique :</strong><br/>
                Quantité vendue (POS) × Grammage recette (BOM)
              </p>
              <p>
                <strong className="text-navy font-sans">3. Écart (Variance) :</strong><br/>
                Conso Réelle - Conso Théorique
              </p>
              <p>
                <strong className="text-navy font-sans">4. Perte Financière (DT) :</strong><br/>
                Écart × Coût d'achat unitaire (DT)
              </p>
            </div>

            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">
              💡 Un écart positif indique un coulage ou surconsommation (sur-portionnage, casse non enregistrée, vol, coulage bar).
            </div>

            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setShowHelpModal(false)}
                className="px-5 py-2.5 bg-navy text-white rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-navy-mid shadow-xs"
              >
                Compris
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 bg-navy flex-col shrink-0 border-r border-white/10 min-h-screen">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Overlay */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
          />
          <div className="relative w-64 max-w-[80vw] bg-navy text-white h-full z-10 flex flex-col shadow-2xl">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
