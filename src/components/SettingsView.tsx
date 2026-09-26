import React, { useState } from 'react';
import { 
  Sliders, 
  Download, 
  Upload, 
  RotateCcw, 
  ShieldCheck, 
  Database, 
  Bell, 
  CheckCircle2, 
  AlertTriangle,
  RefreshCw,
  Building2,
  Lock,
  UserCheck
} from 'lucide-react';
import { useStock } from '../context/StockContext';
import { formatCurrency } from '../utils/calculations';

export const SettingsView: React.FC = () => {
  const {
    alertThresholdPercent,
    alertThresholdCost,
    setAlertThresholdPercent,
    setAlertThresholdCost,
    resetToDemoData,
    exportDataJSON,
    importDataJSON,
    isSupabaseConnected,
    isSupabaseAuthActive,
    currentUser,
    switchStaffRole,
    showToast,
  } = useStock();

  const [thresholdPct, setThresholdPct] = useState(alertThresholdPercent);
  const [thresholdCost, setThresholdCost] = useState(alertThresholdCost);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSaveThresholds = (e: React.FormEvent) => {
    e.preventDefault();
    setAlertThresholdPercent(thresholdPct);
    setAlertThresholdCost(thresholdCost);
    setSaveSuccess(true);
    showToast('Seuils d\'alerte mis à jour avec succès', 'success');
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  const handleDownloadBackup = () => {
    const jsonStr = exportDataJSON();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `la-grotte-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Sauvegarde exportée avec succès', 'success');
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = event => {
      const content = event.target?.result as string;
      if (content) {
        const success = importDataJSON(content);
        if (success) {
          showToast('Données restaurées avec succès', 'success');
        } else {
          showToast('Erreur lors de la lecture du fichier de sauvegarde', 'error');
        }
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6 sm:space-y-8 pb-12 max-w-4xl">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-sand p-5 sm:p-6 shadow-xs">
        <div className="flex items-center gap-2 mb-1">
          <Sliders className="w-4 h-4 text-terracotta" />
          <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
            Configuration & Paramètres Système
          </span>
        </div>
        <h1 className="text-xl sm:text-2xl font-black text-navy tracking-tight">
          Paramètres d'Exploitation & Données
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Configuration des seuils de détection des pertes, sauvegardes d'exploitation et gestion des données.
        </p>
      </div>

      {/* 1. SEUILS D'ALERTE COULAGE */}
      <div className="bg-white rounded-2xl border border-sand p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-sand">
          <Bell className="w-4 h-4 text-terracotta" />
          <h2 className="text-sm font-bold text-navy uppercase tracking-wider">
            Seuils de Détection Automatique du Coulage
          </h2>
        </div>

        <form onSubmit={handleSaveThresholds} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-navy mb-1.5">
                Seuil de Variance Relative (%)
              </label>
              <input
                type="number"
                min="1"
                max="100"
                value={thresholdPct}
                onChange={e => setThresholdPct(Number(e.target.value))}
                className="w-full px-3 py-2 bg-cream border border-sand rounded-xl text-xs font-mono font-semibold focus:outline-none focus:ring-2 focus:ring-navy/20"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Déclenche une alerte si l'écart dépasse ce pourcentage de la consommation théorique.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-navy mb-1.5">
                Seuil de Perte Financière Minimale (DT)
              </label>
              <input
                type="number"
                min="1"
                max="500"
                value={thresholdCost}
                onChange={e => setThresholdCost(Number(e.target.value))}
                className="w-full px-3 py-2 bg-cream border border-sand rounded-xl text-xs font-mono font-semibold focus:outline-none focus:ring-2 focus:ring-navy/20"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Ignore les écarts mineurs en dessous de ce montant financier.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            {saveSuccess ? (
              <span className="text-xs font-bold text-success flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                Seuils enregistrés
              </span>
            ) : <span />}

            <button
              type="submit"
              className="px-5 py-2.5 bg-navy hover:bg-navy-mid text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-colors shadow-xs"
            >
              Enregistrer les Paramètres
            </button>
          </div>
        </form>
      </div>

      {/* 2. SAUVEGARDE & RESTAURATION */}
      <div className="bg-white rounded-2xl border border-sand p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-sand">
          <Database className="w-4 h-4 text-terracotta" />
          <h2 className="text-sm font-bold text-navy uppercase tracking-wider">
            Sauvegarde & Export des Données
          </h2>
        </div>

        <p className="text-xs text-slate-600">
          Téléchargez une archive complète des données du restaurant (stocks, recettes, livraisons, inventaires, pertes) pour archivage comptable.
        </p>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button
            onClick={handleDownloadBackup}
            className="px-4 py-2.5 bg-cream hover:bg-linen text-navy border border-sand rounded-xl text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-2 shadow-2xs"
          >
            <Download className="w-4 h-4 text-terracotta" />
            <span>Télécharger Sauvegarde JSON</span>
          </button>

          <label className="px-4 py-2.5 bg-cream hover:bg-linen text-navy border border-sand rounded-xl text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-2 shadow-2xs cursor-pointer">
            <Upload className="w-4 h-4 text-terracotta" />
            <span>Restaurer Fichier JSON</span>
            <input
              type="file"
              accept=".json"
              onChange={handleImportFile}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* 3. SIMULATION ET JEU DE DONNÉES */}
      <div className="bg-white rounded-2xl border border-sand p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-sand">
          <RotateCcw className="w-4 h-4 text-terracotta" />
          <h2 className="text-sm font-bold text-navy uppercase tracking-wider">
            Jeu de Démonstration & Réinitialisation
          </h2>
        </div>

        <p className="text-xs text-slate-600">
          Recharger les données modèles du restaurant La Grotte Monastir (recettes de poissons, viandes, alcools, livraisons récentes et écarts types).
        </p>

        <div className="pt-2">
          <button
            onClick={() => {
              if (confirm('Voulez-vous réinitialiser toutes les données avec le jeu de démo standard ?')) {
                resetToDemoData();
                showToast('Jeu de démonstration chargé', 'info');
              }
            }}
            className="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4 text-alert" />
            <span>Recharger Données Démo La Grotte</span>
          </button>
        </div>
      </div>
    </div>
  );
};
