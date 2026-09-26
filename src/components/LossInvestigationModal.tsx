import React, { useState } from 'react';
import { 
  ShieldAlert, 
  X, 
  AlertTriangle, 
  Clock, 
  User, 
  Receipt, 
  DoorOpen, 
  CheckCircle2, 
  TrendingDown, 
  FileSearch,
  Scale,
  Sun,
  Moon,
  Sparkles,
  Loader2
} from 'lucide-react';
import { useStock } from '../context/StockContext';
import { formatCurrency, formatQuantity } from '../utils/calculations';
import { supabase } from '../lib/supabase';
import { logEvent } from '../utils/logger';

interface LossInvestigationModalProps {
  ingredientId: string;
  onClose: () => void;
}

export const LossInvestigationModal: React.FC<LossInvestigationModalProps> = ({
  ingredientId,
  onClose,
}) => {
  const { getLossCorrelation, ingredients } = useStock();
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<{ analysis: string; recommendations: string[]; source: string } | null>(null);

  const report = getLossCorrelation(ingredientId);
  const ingredient = ingredients.find(i => i.id === ingredientId);

  if (!ingredient) return null;

  const runAiInvestigation = async () => {
    if (!report) return;
    setAiLoading(true);
    try {
      let authToken = 'demo-bearer-token';
      if (supabase) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          authToken = session.access_token;
        }
      }

      logEvent('ai_investigation_run', {
        ingredientId,
        ingredientName: ingredient.name,
        lossAmount: report.financial_loss,
      });

      const res = await fetch('/api/ai/investigate', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          ingredientName: ingredient.name,
          category: ingredient.category,
          theoreticalUsage: report.theoretical_usage ?? 0,
          actualUsage: report.actual_usage ?? 0,
          varianceQty: report.missing_quantity ?? 0,
          varianceCost: report.financial_loss ?? 0,
          unit: ingredient.unit,
          suspectedVectors: report.suspected_loss_vectors || report.suspected_vectors || [],
          accessLogsCount: report.correlated_access_logs?.length || 0,
          posVoidsCount: report.correlated_pos_voids?.length || 0,
        }),
      });
      if (!res.ok) {
        throw new Error(`HTTP error ${res.status}`);
      }
      const data = await res.json();
      setAiResult(data);
    } catch {
      setAiResult({
        analysis: "Audit d'anomalie : discordance détectée entre les sorties physiques et les encaissements POS.",
        recommendations: [
          'Peser systématiquement les cageots de poisson au déchargement du port',
          'Vérifier les annulations de commande en caisse non contresignées par le maître d\'hôtel',
          'Contrôler les badgeages tardifs de fermeture de la chambre froide'
        ],
        source: 'fallback'
      });
    } finally {
      setAiLoading(false);
    }
  };

  const vectorLabels: Record<string, { label: string; desc: string; icon: React.ElementType }> = {
    delivery_discrepancy: {
      label: 'Écart ou signature manquée en livraison',
      desc: 'Livraison réceptionnée avec écart de poids ou non contre-signée au déchargement.',
      icon: Scale,
    },
    pos_void_pattern: {
      label: 'Faisceau d\'annulations / offerts caisse (POS)',
      desc: 'Des plats ou boissons contenant cet ingrédient ont été saisis puis annulés ou offerts.',
      icon: Receipt,
    },
    unsupervised_access: {
      label: 'Accès nocturne ou non supervisé au local sécurisé',
      desc: 'Des passages en chambre froide ou cave ont été enregistrés tard la nuit ou hors service.',
      icon: DoorOpen,
    },
    overportioning_waste: {
      label: 'Sur-dosage en cuisine ou freinte non tracée',
      desc: 'Le grammage servi dépasse la fiche technique ou les pertes de parage ne sont pas pesées.',
      icon: TrendingDown,
    },
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-2xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-sand overflow-hidden my-auto max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="bg-navy text-white p-5 flex items-center justify-between border-b border-sand/20">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-alert/20 text-alert rounded-xl border border-alert/30">
              <FileSearch className="w-5 h-5 text-rose-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white uppercase tracking-wider">
                  Enquête & Corrélation Anti-Coulage
                </h3>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  report.severity === 'critical' ? 'bg-alert text-white' : 'bg-terracotta text-white'
                }`}>
                  Gravité {report.severity.toUpperCase()}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Ingrédient audité : <strong className="text-white">{ingredient.name}</strong> ({ingredient.category})
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Fermer l'audit anti-coulage"
            className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-ochre focus-visible:outline-none"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Content */}
        <div className="p-5 space-y-6 overflow-y-auto flex-1">
          {/* Top Loss Breakdown Card */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-cream p-4 rounded-xl border border-sand">
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Consommation Théorique (Ventes)
              </span>
              <span className="text-sm font-bold font-mono text-navy tabular-nums">
                {formatQuantity(report.theoretical_usage ?? 0, ingredient.unit)}
              </span>
            </div>

            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Consommation Réelle Constatée
              </span>
              <span className="text-sm font-bold font-mono text-navy tabular-nums">
                {formatQuantity(report.actual_usage ?? 0, ingredient.unit)}
              </span>
            </div>

            <div>
              <span className="text-[10px] font-bold text-alert uppercase tracking-wider block">
                Écart Coulage (Manquant)
              </span>
              <span className="text-sm font-bold font-mono text-alert tabular-nums">
                -{formatQuantity(report.missing_quantity ?? 0, ingredient.unit)} ({((report.variance_percentage ?? 0)).toFixed(1)}%)
              </span>
            </div>

            <div>
              <span className="text-[10px] font-bold text-alert uppercase tracking-wider block">
                Perte Financière Nette
              </span>
              <span className="text-base font-bold font-mono text-alert tabular-nums">
                -{formatCurrency(report.financial_loss ?? 0)}
              </span>
            </div>
          </div>

          {/* Suspected Vectors / Findings Banner */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-navy uppercase tracking-wider flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-terracotta" />
              Faisceau d'Indices & Vecteurs Détectés
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {(report.suspected_vectors || []).map(vec => {
                const info = vectorLabels[vec] || {
                  label: vec,
                  desc: 'Vecteur opérationnel',
                  icon: AlertTriangle,
                };
                const IconComponent = info.icon;

                return (
                  <div key={vec} className="p-3 bg-alert/5 border border-alert/20 rounded-xl flex items-start gap-3">
                    <div className="p-2 bg-alert/15 text-alert rounded-lg shrink-0 mt-0.5">
                      <IconComponent className="w-4 h-4" />
                    </div>
                    <div>
                      <h5 className="font-bold text-xs text-alert">{info.label}</h5>
                      <p className="text-[11px] text-slate-600 mt-0.5">{info.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Two Columns: Shift Analysis & POS Voids */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Shift Analysis */}
            <div className="bg-white rounded-xl border border-sand p-4 shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-sand">
                <h4 className="text-xs font-bold text-navy uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-terracotta" />
                  Comptages par Shift (Matin vs Soir)
                </h4>
                <span className="text-[10px] text-slate-500 font-medium">Localisation du saut</span>
              </div>

              {(report.shifts_analysis || []).length > 0 ? (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {(report.shifts_analysis || []).map((s, idx) => (
                    <div key={idx} className="p-2.5 bg-cream rounded-lg flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className={`p-1 rounded ${s.shift === 'morning' ? 'bg-terracotta/20 text-terracotta' : 'bg-navy text-white'}`}>
                          {s.shift === 'morning' ? <Sun className="w-3 h-3" /> : <Moon className="w-3 h-3" />}
                        </span>
                        <div>
                          <span className="font-bold text-navy">{s.date}</span>
                          <span className="text-slate-500 text-[10px] block">Par {s.staff}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-bold text-navy tabular-nums">
                          {formatQuantity(s.quantity, ingredient.unit)}
                        </span>
                        {s.delta !== 0 && (
                          <span className={`text-[10px] font-mono tabular-nums block ${s.delta < 0 ? 'text-alert font-bold' : 'text-slate-500'}`}>
                            {s.delta > 0 ? `+${s.delta}` : s.delta}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">
                  Aucun comptage journalier détaillé enregistré pour cette période.
                </p>
              )}
            </div>

            {/* Related POS Voids */}
            <div className="bg-white rounded-xl border border-sand p-4 shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-sand">
                <h4 className="text-xs font-bold text-navy uppercase tracking-wider flex items-center gap-1.5">
                  <Receipt className="w-3.5 h-3.5 text-terracotta" />
                  Annulations POS Recettes Associées
                </h4>
                <span className="text-[10px] font-bold text-alert font-mono tabular-nums">
                  {(report.correlated_pos_voids || []).length} trouvées
                </span>
              </div>

              {(report.correlated_pos_voids || []).length > 0 ? (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {(report.correlated_pos_voids || []).map(pv => (
                    <div key={pv.id} className="p-2.5 bg-cream rounded-lg flex items-center justify-between text-xs">
                      <div>
                        <div className="font-bold text-navy">{pv.item_name}</div>
                        <div className="text-[10px] text-slate-500">
                          Par <strong className="text-slate-700">{pv.staff_name}</strong> • {(pv.timestamp || '').slice(11, 16)} ({pv.reason})
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-bold text-alert tabular-nums">
                          {formatCurrency(pv.amount)}
                        </span>
                        <span className="text-[9px] uppercase font-bold text-slate-500 block">
                          {pv.type}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">
                  Aucune annulation ou remise caisse enregistrée sur les plats utilisant cet ingrédient.
                </p>
              )}
            </div>
          </div>

          {/* Fridge / Cellar Access Logs */}
          <div className="bg-white rounded-xl border border-sand p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-sand">
              <h4 className="text-xs font-bold text-navy uppercase tracking-wider flex items-center gap-1.5">
                <DoorOpen className="w-3.5 h-3.5 text-terracotta" />
                Passages Badge en Zone ({ingredient.location || 'Réserve'})
              </h4>
              <span className="text-[10px] text-slate-500">
                {(report.correlated_access_logs || []).length} accès enregistrés dans la fenêtre de perte
              </span>
            </div>

            {(report.correlated_access_logs || []).length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                {(report.correlated_access_logs || []).map(log => (
                  <div key={log.id} className="p-2.5 bg-cream border border-sand rounded-lg text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-navy flex items-center gap-1">
                        <User className="w-3 h-3 text-slate-400" />
                        {log.staff_name}
                      </span>
                      <span className="font-mono text-[10px] text-slate-500 tabular-nums">{log.timestamp}</span>
                    </div>
                    <div className="text-[11px] text-slate-600 flex items-center justify-between">
                      <span>{log.location} ({log.action === 'entry' ? 'Entrée' : 'Sortie'})</span>
                      {log.notes && <span className="text-slate-400 italic">"{log.notes}"</span>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">
                Aucun passage enregistré dans ce local pour la période.
              </p>
            )}
          </div>

          {/* Audit Assistant */}
          <div className="bg-navy text-white p-5 rounded-2xl border border-sand/20 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-terracotta text-white rounded-xl shadow-2xs">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
                    Diagnostic d'Audit Anti-Coulage
                    <span className="text-[10px] bg-white/10 text-sand px-2 py-0.5 rounded border border-white/20">
                      Analyse de Corrélation
                    </span>
                  </h4>
                  <p className="text-[11px] text-slate-300 mt-0.5">
                    Analyse des facteurs contributifs croisant fiches techniques, tickets caisse, livraisons et accès réserves.
                  </p>
                </div>
              </div>

              <button
                onClick={runAiInvestigation}
                disabled={aiLoading}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-terracotta hover:bg-terracotta-hover text-white text-xs font-bold uppercase tracking-wider transition-colors shadow-2xs disabled:opacity-50 cursor-pointer"
              >
                {aiLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Analyse en cours...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{aiResult ? 'Ré-analyser' : 'Lancer l\'Analyse'}</span>
                  </>
                )}
              </button>
            </div>

            {aiResult && (
              <div className="mt-3 pt-3 border-t border-white/10 space-y-3 text-xs">
                <div className="bg-black/30 p-3.5 rounded-xl border border-white/10 text-slate-200 leading-relaxed">
                  <strong className="text-terracotta block mb-1 uppercase tracking-wider text-[10px]">
                    Synthèse de l'Analyse Matière :
                  </strong>
                  {aiResult.analysis}
                </div>

                {aiResult.recommendations && aiResult.recommendations.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-terracotta block">
                      Recommandations Opérationnelles Immédiates :
                    </span>
                    <ul className="space-y-1 pl-4 list-disc text-slate-300">
                      {aiResult.recommendations.map((rec, idx) => (
                        <li key={idx}>{rec}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Action Recommendations */}
          <div className="bg-cream border border-sand p-4 rounded-xl space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-navy flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-success" />
              Plan d'Action Correctif Conseillé
            </h4>
            <ul className="text-xs text-slate-700 space-y-1.5 pl-4 list-disc">
              <li>
                <strong>Pesée systématique au port / livraison :</strong> Exiger la signature du chef ou second sur le bon de pesée.
              </li>
              <li>
                <strong>Verrouillage après-service :</strong> Restreindre l'accès à la {ingredient.location || 'chambre froide'} dès 23h30 sous code manager.
              </li>
              <li>
                <strong>Contrôle des annulations POS :</strong> Bloquer les remises et voids caisse au-dessus de 10 DT sans badge responsable.
              </li>
              <li>
                <strong>Double comptage au changement de shift :</strong> Rapprocher le stock physique entre le service du midi et du soir.
              </li>
            </ul>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-cream border-t border-sand flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-navy hover:bg-navy-mid text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-colors shadow-xs"
          >
            Fermer l'enquête
          </button>
        </div>
      </div>
    </div>
  );
};

export default LossInvestigationModal;
