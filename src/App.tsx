import React, { useState, useEffect, Suspense, lazy } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { StockProvider, useStock } from './context/StockContext';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { X, ShieldAlert, Loader2, CheckCircle2, AlertTriangle, Info } from 'lucide-react';

// Lazy-loaded Tab Views
const OverviewDashboard = lazy(() =>
  import('./components/OverviewDashboard').then(m => ({ default: m.OverviewDashboard }))
);
const VarianceDashboard = lazy(() =>
  import('./components/VarianceDashboard').then(m => ({ default: m.VarianceDashboard }))
);
const StockCountSheet = lazy(() =>
  import('./components/StockCountSheet').then(m => ({ default: m.StockCountSheet }))
);
const IngredientsManager = lazy(() =>
  import('./components/IngredientsManager').then(m => ({ default: m.IngredientsManager }))
);
const DeliveriesManager = lazy(() =>
  import('./components/DeliveriesManager').then(m => ({ default: m.DeliveriesManager }))
);
const RecipeManager = lazy(() =>
  import('./components/RecipeManager').then(m => ({ default: m.RecipeManager }))
);
const SalesManager = lazy(() =>
  import('./components/SalesManager').then(m => ({ default: m.SalesManager }))
);
const AccessLogManager = lazy(() =>
  import('./components/AccessLogManager').then(m => ({ default: m.AccessLogManager }))
);
const PosVoidsManager = lazy(() =>
  import('./components/PosVoidsManager').then(m => ({ default: m.PosVoidsManager }))
);
const StaffManager = lazy(() =>
  import('./components/StaffManager').then(m => ({ default: m.StaffManager }))
);
const PurchaseOrdersManager = lazy(() =>
  import('./components/PurchaseOrdersManager').then(m => ({ default: m.PurchaseOrdersManager }))
);
const ReportsView = lazy(() =>
  import('./components/ReportsView').then(m => ({ default: m.ReportsView }))
);
const SettingsView = lazy(() =>
  import('./components/SettingsView').then(m => ({ default: m.SettingsView }))
);
const WasteRegisterView = lazy(() =>
  import('./components/WasteRegisterView').then(m => ({ default: m.WasteRegisterView }))
);

// Lazy-loaded Modals
const SalesImportModal = lazy(() =>
  import('./components/SalesImportModal').then(m => ({ default: m.SalesImportModal }))
);
const AuthModal = lazy(() =>
  import('./components/AuthModal').then(m => ({ default: m.AuthModal }))
);
const WasteLogModal = lazy(() =>
  import('./components/WasteLogModal').then(m => ({ default: m.WasteLogModal }))
);
const LossInvestigationModal = lazy(() =>
  import('./components/LossInvestigationModal').then(m => ({ default: m.LossInvestigationModal }))
);

import { ModuleSkeletonView } from './components/SkeletonLoader';
import { LoginScreen } from './components/LoginScreen';

// Branded loading state matching La Grotte aesthetic
const TabLoadingFallback: React.FC = () => (
  <div className="space-y-6">
    <div className="flex items-center justify-between pb-2 border-b border-sand/40">
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 rounded-full border-2 border-sand border-t-terracotta animate-spin" />
        <span className="text-xs font-bold uppercase tracking-widest text-terracotta">
          La Grotte • Monastir — Chargement des données
        </span>
      </div>
      <span className="text-[11px] font-mono text-slate-400">Actualisation en cours...</span>
    </div>
    <ModuleSkeletonView />
  </div>
);

const ModalLoadingFallback: React.FC<{ label?: string }> = ({ label = 'Ouverture en cours...' }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
    <div className="bg-cream rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-sand flex flex-col items-center text-center">
      <div className="relative flex items-center justify-center mb-3">
        <div className="w-9 h-9 rounded-full border-2 border-sand border-t-terracotta animate-spin" />
        <div className="absolute w-2 h-2 rounded-full bg-navy" />
      </div>
      <span className="text-xs font-bold uppercase tracking-widest text-terracotta">
        La Grotte
      </span>
      <p className="text-xs font-medium text-navy/80 mt-1">
        {label}
      </p>
    </div>
  </div>
);

function AppContent() {
  const { 
    currentUser, 
    switchStaffRole, 
    isLoading, 
    isSyncing, 
    error, 
    isError,
    isAuthChecking,
    toastMessage, 
    clearToast 
  } = useStock();
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isFastCountModalOpen, setIsFastCountModalOpen] = useState(false);
  const [isSalesImportModalOpen, setIsSalesImportModalOpen] = useState(false);
  const [isNewDeliveryModalOpen, setIsNewDeliveryModalOpen] = useState(false);
  const [isWasteLogModalOpen, setIsWasteLogModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [investigatingIngredientId, setInvestigatingIngredientId] = useState<string | null>(null);

  // Enforce role-based access to tabs
  const userRole = currentUser?.role || 'owner';

  const isTabAllowed = (tab: string): boolean => {
    if (!currentUser) return false;
    if (userRole === 'cook') {
      return ['counts', 'recipes', 'waste'].includes(tab);
    }
    if (userRole === 'server') {
      return ['counts', 'pos_voids'].includes(tab);
    }
    return true; // owner & stock_manager have access to all tabs
  };

  useEffect(() => {
    if (currentUser && !isTabAllowed(activeTab)) {
      setActiveTab('counts');
    }
  }, [userRole, activeTab, currentUser]);

  // Handle URL hash fragments (e.g. Supabase email confirmation redirect or expired links)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const hash = window.location.hash;
    if (hash && hash.includes('error=')) {
      const params = new URLSearchParams(hash.replace(/^#/, ''));
      const errorCode = params.get('error_code');
      const errorDesc = params.get('error_description');

      if (errorCode === 'otp_expired' || errorDesc?.includes('expired') || errorDesc?.includes('invalid')) {
        setIsAuthModalOpen(true);
      }
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }
  }, []);

  // 1. Loading Session Gate
  if (isAuthChecking) {
    return (
      <div className="min-h-screen bg-sand/30 font-sans text-navy flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl border border-sand flex flex-col items-center text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-navy text-terracotta flex items-center justify-center shadow-xs">
            <Loader2 className="w-6 h-6 animate-spin text-terracotta" />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-terracotta">
            La Grotte • Monastir
          </span>
          <h3 className="font-bold text-navy text-sm">Vérification de la session...</h3>
          <p className="text-xs text-slate-500">
            Contrôle des autorisations d'accès au système restaurant
          </p>
        </div>
      </div>
    );
  }

  // 2. Unauthenticated Gate — Absolute Gate: No operational data rendered
  if (!currentUser) {
    return (
      <>
        <LoginScreen />
        {toastMessage && (
          <div className="fixed bottom-5 right-5 z-50 max-w-sm w-full animate-bounce-short">
            <div
              className={`p-3.5 rounded-xl shadow-xl border flex items-start gap-3 text-xs ${
                toastMessage.type === 'success'
                  ? 'bg-emerald-950/95 border-emerald-700/80 text-emerald-100'
                  : toastMessage.type === 'error'
                  ? 'bg-rose-950/95 border-rose-700/80 text-rose-100'
                  : 'bg-slate-900/95 border-slate-700 text-white'
              }`}
            >
              {toastMessage.type === 'success' && (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              )}
              {toastMessage.type === 'error' && (
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              )}
              {toastMessage.type === 'info' && (
                <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
              )}
              <div className="flex-1 font-medium leading-relaxed">{toastMessage.text}</div>
              <button
                onClick={clearToast}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <div className="min-h-screen bg-cream font-sans text-navy flex">
      {/* Navigation Sidebar (5-Section Operational Hierarchy) */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenFastCount={() => setIsFastCountModalOpen(true)}
        onOpenWasteLog={() => setIsWasteLogModalOpen(true)}
        isOpenMobile={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        {/* Header Bar */}
        <Header
          activeTab={activeTab}
          onOpenFastCount={() => setIsFastCountModalOpen(true)}
          onOpenSalesImport={() => setIsSalesImportModalOpen(true)}
          onOpenNewDelivery={() => setIsNewDeliveryModalOpen(true)}
          onOpenWasteLog={() => setIsWasteLogModalOpen(true)}
          onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
          onOpenAuthModal={() => setIsAuthModalOpen(true)}
          onSelectTab={setActiveTab}
        />

        {/* View Components */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {/* Syncing status */}
            {isSyncing && (
              <div className="mb-4 bg-navy/5 border border-navy/15 text-navy px-4 py-2.5 rounded-xl flex items-center justify-between text-xs font-medium">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-terracotta" />
                  <span>Synchronisation des données en temps réel...</span>
                </div>
              </div>
            )}

            {isError && error && (
              <div className="mb-4 bg-alert/10 border border-alert/30 text-alert px-4 py-3 rounded-xl flex items-center justify-between text-xs shadow-2xs">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-alert shrink-0" />
                  <div>
                    <strong className="font-bold">Avertissement : </strong>
                    <span>{error}</span>
                  </div>
                </div>
              </div>
            )}

            {isLoading ? (
              <div className="bg-white rounded-2xl border border-sand p-12 text-center max-w-lg mx-auto my-12 shadow-xs space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-navy text-terracotta flex items-center justify-center mx-auto shadow-xs">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
                <div>
                  <h3 className="font-bold text-navy text-base">Chargement des données La Grotte Monastir...</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Récupération des stocks, fiches techniques, livraisons et calculs de variance.
                  </p>
                </div>
                <div className="pt-2">
                  <div className="h-2 w-48 bg-cream rounded-full mx-auto overflow-hidden border border-sand">
                    <div className="h-full bg-navy rounded-full animate-pulse w-2/3"></div>
                  </div>
                </div>
              </div>
            ) : !isTabAllowed(activeTab) ? (
              <div className="bg-white rounded-2xl border border-sand p-8 text-center max-w-md mx-auto my-12 shadow-xs space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-alert/10 text-alert flex items-center justify-center mx-auto">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-navy text-base">Accès Restreint</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Votre profil actuel ({currentUser?.roleTitle || userRole}) n'a pas les droits requis pour ce module.
                  </p>
                </div>
                <div className="flex items-center justify-center gap-2 pt-2">
                  <button
                    onClick={() => setActiveTab('counts')}
                    className="px-4 py-2 bg-navy text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-xs"
                  >
                    Aller aux inventaires
                  </button>
                  <button
                    onClick={() => switchStaffRole('owner')}
                    className="px-4 py-2 bg-cream hover:bg-linen text-navy border border-sand rounded-xl text-xs font-bold uppercase tracking-wider transition-colors"
                  >
                    Passer en Direction
                  </button>
                </div>
              </div>
            ) : (
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.18, ease: 'easeOut' }}
                >
                  <Suspense fallback={<TabLoadingFallback />}>
                    {activeTab === 'overview' && (
                      <OverviewDashboard
                        onSelectTab={setActiveTab}
                        onOpenInvestigation={(id) => setInvestigatingIngredientId(id)}
                        onOpenFastCount={() => setIsFastCountModalOpen(true)}
                        onOpenWasteLog={() => setIsWasteLogModalOpen(true)}
                        onOpenNewDelivery={() => setIsNewDeliveryModalOpen(true)}
                      />
                    )}
                    {activeTab === 'variance' && <VarianceDashboard />}
                    {activeTab === 'counts' && <StockCountSheet />}
                    {activeTab === 'ingredients' && <IngredientsManager />}
                    {activeTab === 'deliveries' && <DeliveriesManager />}
                    {activeTab === 'recipes' && <RecipeManager />}
                    {activeTab === 'sales' && (
                      <SalesManager onOpenImportModal={() => setIsSalesImportModalOpen(true)} />
                    )}
                    {activeTab === 'waste' && (
                      <WasteRegisterView onOpenNewWaste={() => setIsWasteLogModalOpen(true)} />
                    )}
                    {activeTab === 'reports' && <ReportsView />}
                    {activeTab === 'access_logs' && <AccessLogManager />}
                    {activeTab === 'pos_voids' && <PosVoidsManager />}
                    {activeTab === 'staff' && <StaffManager />}
                    {activeTab === 'purchase_orders' && <PurchaseOrdersManager />}
                    {activeTab === 'settings' && <SettingsView />}
                  </Suspense>
                </motion.div>
              </AnimatePresence>
            )}
          </div>
        </main>

        {/* Footer Bar */}
        <footer className="border-t border-sand bg-white py-3.5 px-4 sm:px-8 text-xs text-slate-500">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <strong className="text-navy">La Grotte • Monastir</strong>
              <span className="text-sand">|</span>
              <span>Contrôle des stocks, consommations et pertes matières</span>
            </div>
            <div className="text-[11px] text-slate-400">
              Système de gestion et surveillance des ratios restaurant
            </div>
          </div>
        </footer>
      </div>

      {/* Fast Count Modal */}
      <AnimatePresence>
        {isFastCountModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs"
              onClick={() => setIsFastCountModalOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="relative bg-cream rounded-2xl max-w-3xl w-full max-h-[92vh] overflow-hidden shadow-2xl border border-sand flex flex-col z-10 my-auto"
            >
              <div className="p-4 bg-navy text-white flex items-center justify-between">
                <div>
                  <span className="font-bold text-xs uppercase tracking-wider text-terracotta block">
                    Comptage Terrain
                  </span>
                  <h3 className="text-sm font-bold text-white">
                    Saisie Rapide — Inventaire Physique par Shift
                  </h3>
                </div>
                <button
                  onClick={() => setIsFastCountModalOpen(false)}
                  className="p-1.5 text-slate-300 hover:text-white rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-4 overflow-y-auto flex-1">
                <Suspense fallback={<TabLoadingFallback />}>
                  <StockCountSheet
                    isModal={true}
                    onClose={() => setIsFastCountModalOpen(false)}
                  />
                </Suspense>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* POS Sales Import Modal */}
      <AnimatePresence>
        {isSalesImportModalOpen && (
          <Suspense fallback={<ModalLoadingFallback label="Chargement import caisse..." />}>
            <SalesImportModal onClose={() => setIsSalesImportModalOpen(false)} />
          </Suspense>
        )}
      </AnimatePresence>

      {/* Auth / Login Modal */}
      <AnimatePresence>
        {isAuthModalOpen && (
          <Suspense fallback={<ModalLoadingFallback label="Connexion sécurisée..." />}>
            <AuthModal onClose={() => setIsAuthModalOpen(false)} />
          </Suspense>
        )}
      </AnimatePresence>

      {/* New Delivery Modal */}
      <AnimatePresence>
        {isNewDeliveryModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs"
              onClick={() => setIsNewDeliveryModalOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="relative bg-cream rounded-2xl max-w-3xl w-full max-h-[92vh] overflow-hidden shadow-2xl border border-sand flex flex-col z-10 my-auto"
            >
              <div className="p-4 bg-navy text-white flex items-center justify-between">
                <div>
                  <span className="font-bold text-xs uppercase tracking-wider text-terracotta block">
                    Stock Entrant
                  </span>
                  <h3 className="text-sm font-bold text-white">
                    Réception Marchandise Fournisseur (Bon de Livraison)
                  </h3>
                </div>
                <button
                  onClick={() => setIsNewDeliveryModalOpen(false)}
                  className="p-1.5 text-slate-300 hover:text-white rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-4 overflow-y-auto flex-1">
                <Suspense fallback={<TabLoadingFallback />}>
                  <DeliveriesManager
                    isModal={true}
                    onClose={() => setIsNewDeliveryModalOpen(false)}
                  />
                </Suspense>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Waste Log Modal */}
      <AnimatePresence>
        {isWasteLogModalOpen && (
          <Suspense fallback={<ModalLoadingFallback label="Ouverture registre des pertes..." />}>
            <WasteLogModal onClose={() => setIsWasteLogModalOpen(false)} />
          </Suspense>
        )}
      </AnimatePresence>

      {/* Loss Investigation Modal */}
      <AnimatePresence>
        {investigatingIngredientId && (
          <Suspense fallback={<ModalLoadingFallback label="Ouverture de l'enquête anti-coulage..." />}>
            <LossInvestigationModal
              ingredientId={investigatingIngredientId}
              onClose={() => setInvestigatingIngredientId(null)}
            />
          </Suspense>
        )}
      </AnimatePresence>

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 max-w-sm w-full animate-bounce-short">
          <div
            className={`p-3.5 rounded-xl shadow-xl border flex items-start gap-3 text-xs ${
              toastMessage.type === 'success'
                ? 'bg-emerald-950/95 border-emerald-700/80 text-emerald-100'
                : toastMessage.type === 'error'
                ? 'bg-rose-950/95 border-rose-700/80 text-rose-100'
                : 'bg-slate-900/95 border-slate-700 text-white'
            }`}
          >
            {toastMessage.type === 'success' && (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            )}
            {toastMessage.type === 'error' && (
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            )}
            {toastMessage.type === 'info' && (
              <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
            )}
            <div className="flex-1 font-medium leading-relaxed">{toastMessage.text}</div>
            <button
              onClick={clearToast}
              className="text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <StockProvider>
      <AppContent />
    </StockProvider>
  );
}
