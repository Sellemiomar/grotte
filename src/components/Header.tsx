import React, { useState } from 'react';
import { 
  ClipboardList, 
  UploadCloud, 
  Truck, 
  Menu,
  TrendingDown,
  CloudCheck,
  Database,
  Trash2,
  Bell,
  AlertTriangle,
  ChevronRight,
  ShoppingCart
} from 'lucide-react';
import { useStock } from '../context/StockContext';
import { formatCurrency } from '../utils/calculations';
import { Ingredient } from '../types';

interface HeaderProps {
  activeTab: string;
  onOpenFastCount: () => void;
  onOpenSalesImport: () => void;
  onOpenNewDelivery: () => void;
  onOpenMobileMenu: () => void;
  onOpenAuthModal?: () => void;
  onOpenWasteLog?: () => void;
  onSelectTab?: (tab: string) => void;
}

const TAB_TITLES: Record<string, { title: string; subtitle: string }> = {
  overview: {
    title: 'Tableau de Bord Général',
    subtitle: 'RESTAURANT LA GROTTE MONASTIR • SYNTHÈSE DES FLUX & MATIÈRES',
  },
  variance: {
    title: 'Audit des Écarts & Détection du Coulage',
    subtitle: 'COMPARAISON THÉORIQUE VS RÉEL • SURVEILLANCE DU RATIO MATIÈRE',
  },
  counts: {
    title: 'Inventaire Physique & Relevés Terrain',
    subtitle: 'CHAMBRES FROIDES, CAVE, BAR & ÉPICERIE • SAISIE PAR SHIFT',
  },
  ingredients: {
    title: 'Catalogue des Ingrédients & Stocks Réels',
    subtitle: 'VALORISATION DÉTAILLÉE DU STOCK & SEUILS DE RÉAPPROVISIONNEMENT',
  },
  deliveries: {
    title: 'Réception des Livraisons Fournisseurs',
    subtitle: 'BONS DE LIVRAISON (STOCK ENTRANT) & CONTRÔLE DE CONFORMITÉ',
  },
  purchase_orders: {
    title: 'Bons de Commande Fournisseurs',
    subtitle: 'RÉAPPROVISIONNEMENT ET SUGGESTIONS D\'ACHAT AUTOMATIQUES',
  },
  recipes: {
    title: 'Fiches Techniques & Recettes',
    subtitle: 'GRAMMAGES THÉORIQUES, COÛTS PORTION & COÛT MATIÈRE',
  },
  sales: {
    title: 'Ventes Enregistrées par la Caisse',
    subtitle: 'DÉSTOCKAGE THÉORIQUE DES RECETTES SELON LES TICKETS DE CAISSE',
  },
  waste: {
    title: 'Registre des Pertes & Freintes',
    subtitle: 'DÉCLARATION DES COULAGES JUSTIFIÉS, AVARIES ET CASSES',
  },
  reports: {
    title: 'Rapports Financiers & États de Gestion',
    subtitle: 'BILANS MATIÈRES, VALORISATIONS ET HISTORIQUE D\'EXPLOITATION',
  },
  access_logs: {
    title: 'Registre des Accès Réserves & Chambres Froides',
    subtitle: 'BADGEAGE ÉLECTRONIQUE • SURVEILLANCE HORAIRE DES LOCAUX SÉCURISÉS',
  },
  pos_voids: {
    title: 'Surveillance des Annulations & Remises Caisse',
    subtitle: 'ANNULATIONS, OFFERTS ET REMISES • ANALYSE CROISÉE DU COULAGE',
  },
  staff: {
    title: 'Équipe & Habilitations Opérationnelles',
    subtitle: 'RÔLES, SIGNATAIRES DES BONS DE LIVRAISON ET AUDITS',
  },
  settings: {
    title: 'Paramètres d\'Exploitation & Données',
    subtitle: 'SEUILS D\'ALERTE COULAGE, SAUVEGARDES ET EXPORTATIONS',
  },
};

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onOpenFastCount,
  onOpenSalesImport,
  onOpenNewDelivery,
  onOpenMobileMenu,
  onOpenAuthModal,
  onOpenWasteLog,
  onSelectTab,
}) => {
  const { 
    totalLossCost, 
    currentUser, 
    isSupabaseConnected, 
    isSupabaseAuthActive,
    ingredients,
  } = useStock();

  const lowStockIngredients: Ingredient[] = ingredients.filter(
    (ing: Ingredient) => (ing.min_alert_threshold !== undefined && ing.current_stock <= ing.min_alert_threshold)
  );

  const [isAlertsOpen, setIsAlertsOpen] = useState(false);
  const currentTabInfo = TAB_TITLES[activeTab] || {
    title: 'La Grotte Monastir — Stock & Anti-Coulage',
    subtitle: 'CONTRÔLE MATIÈRE RESTAURATION',
  };

  const isManagerOrOwner = currentUser?.role === 'owner' || currentUser?.role === 'stock_manager';

  const roleEmojiMap: Record<string, string> = {
    owner: '👑',
    stock_manager: '📦',
    cook: '👨‍🍳',
    server: '🍷',
  };

  return (
    <header className="bg-cream border-b border-sand sticky top-0 z-30 px-4 sm:px-6 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4">
      {/* Left: View title and breadcrumbs */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileMenu}
          aria-label="Ouvrir le menu de navigation"
          className="lg:hidden p-2 text-navy hover:bg-sand/50 rounded-xl transition-colors focus-visible:ring-2 focus-visible:ring-ochre focus-visible:outline-none"
          title="Ouvrir le menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <h1 className="text-base sm:text-lg font-black text-navy tracking-tight leading-tight">
            {currentTabInfo.title}
          </h1>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">
            {currentTabInfo.subtitle}
          </p>
        </div>
      </div>

      {/* Right: Live status and quick actions */}
      <div className="flex items-center gap-2 sm:gap-3 flex-wrap ml-auto">
        {/* Connection status (No technical jargon) */}
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border bg-white border-sand">
          <div className={`w-2 h-2 rounded-full ${isSupabaseConnected ? 'bg-emerald-500' : 'bg-amber-500'}`} />
          <span className="text-slate-700 text-[11px]">
            {isSupabaseConnected ? 'Données synchronisées' : 'Mode local'}
          </span>
        </div>

        {/* Quick Loss Notice if any */}
        {totalLossCost > 0 && (
          <div 
            onClick={() => onSelectTab && onSelectTab('variance')}
            className="hidden md:flex items-center gap-1.5 bg-rose-50 text-alert px-3 py-1 rounded-full text-xs font-bold border border-rose-200 cursor-pointer hover:border-rose-300 transition-colors"
            title="Cliquez pour voir le détail des pertes"
          >
            <TrendingDown className="w-3.5 h-3.5 text-alert" />
            <span className="font-mono tabular-nums">+{formatCurrency(totalLossCost)}</span>
          </div>
        )}

        {/* Low Stock Alerts Notification Bell */}
        <div className="relative">
          <button
            id="btn-stock-alerts"
            onClick={() => setIsAlertsOpen(prev => !prev)}
            className="relative p-2 rounded-xl bg-white hover:bg-linen border border-sand text-navy transition-colors shadow-2xs"
            title="Alertes de stock minimum & réapprovisionnement"
          >
            <Bell className="w-4 h-4 text-slate-700" />
            {lowStockIngredients.length > 0 && (
              <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-4 h-4 px-1 rounded-full bg-terracotta text-white text-[10px] font-bold">
                {lowStockIngredients.length}
              </span>
            )}
          </button>

          {isAlertsOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-sand p-4 z-50 animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between pb-3 border-b border-sand">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-terracotta" />
                  <span className="font-bold text-navy text-xs uppercase tracking-wider">
                    Alertes Stock Minimum ({lowStockIngredients.length})
                  </span>
                </div>
                <button
                  onClick={() => setIsAlertsOpen(false)}
                  className="text-xs text-slate-400 hover:text-slate-600 font-bold"
                >
                  Fermer
                </button>
              </div>

              <div className="max-h-64 overflow-y-auto py-2 divide-y divide-sand/50">
                {lowStockIngredients.length === 0 ? (
                  <p className="text-xs text-slate-500 py-4 text-center">
                    Tous les stocks sont au-dessus de leur seuil d'alerte.
                  </p>
                ) : (
                  lowStockIngredients.map(ing => (
                    <div key={ing.id} className="py-2.5 flex items-center justify-between text-xs">
                      <div>
                        <p className="font-bold text-navy">{ing.name}</p>
                        <p className="text-[11px] text-slate-500">
                          Stock actuel : <span className="font-bold text-alert font-mono tabular-nums">{ing.current_stock} {ing.unit}</span> (Min : {ing.min_alert_threshold ?? 0} {ing.unit})
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          setIsAlertsOpen(false);
                          if (onSelectTab) onSelectTab('purchase_orders');
                        }}
                        className="px-2.5 py-1 rounded-lg bg-cream hover:bg-linen text-navy font-bold text-[10px] uppercase border border-sand transition-colors flex items-center gap-1"
                      >
                        <span>Commander</span>
                        <ChevronRight className="w-3 h-3 text-terracotta" />
                      </button>
                    </div>
                  ))
                )}
              </div>

              {lowStockIngredients.length > 0 && (
                <div className="pt-2 border-t border-sand">
                  <button
                    onClick={() => {
                      setIsAlertsOpen(false);
                      if (onSelectTab) onSelectTab('purchase_orders');
                    }}
                    className="w-full py-2 bg-navy hover:bg-navy-mid text-white rounded-xl text-xs font-bold transition-colors text-center"
                  >
                    Générer Bons de Commande
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* User Role Badge */}
        {currentUser ? (
          <button
            onClick={onOpenAuthModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white hover:bg-linen border border-sand text-navy transition-colors shadow-2xs"
            title="Gérer la session / Authentification"
          >
            <span>{roleEmojiMap[currentUser.role] || '👤'}</span>
            <span className="font-bold truncate max-w-[120px]">{currentUser.name}</span>
            <span className="text-[10px] text-slate-500 hidden md:inline">
              ({currentUser.roleTitle || currentUser.role})
            </span>
          </button>
        ) : (
          <button
            onClick={onOpenAuthModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-navy hover:bg-navy-mid text-white transition-colors shadow-xs"
          >
            <span>Connexion</span>
          </button>
        )}

        {/* Primary Action Buttons */}
        {onOpenWasteLog && (
          <button
            id="btn-waste-log"
            onClick={onOpenWasteLog}
            className="bg-white hover:bg-linen text-rose-800 border border-rose-200 px-3 py-2 rounded-xl text-xs font-bold shadow-2xs flex items-center gap-1.5 transition-colors"
            title="Déclarer une perte, casse ou coulage connu"
          >
            <Trash2 className="w-4 h-4 text-alert" />
            <span className="hidden sm:inline">Perte</span>
          </button>
        )}

        <button
          id="btn-fast-count"
          onClick={onOpenFastCount}
          className="bg-terracotta hover:bg-terracotta-hover text-white px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold shadow-xs uppercase tracking-wider flex items-center gap-1.5 transition-colors"
          title="Comptage rapide terrain / smartphone"
        >
          <ClipboardList className="w-4 h-4" />
          <span>Comptage</span>
        </button>

        {isManagerOrOwner && (
          <button
            id="btn-new-delivery"
            onClick={onOpenNewDelivery}
            className="bg-navy hover:bg-navy-mid text-white px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold shadow-xs uppercase tracking-wider flex items-center gap-1.5 transition-colors"
            title="Réception bon de livraison"
          >
            <Truck className="w-4 h-4 text-terracotta" />
            <span className="hidden sm:inline">Livraison</span>
          </button>
        )}
      </div>
    </header>
  );
};
