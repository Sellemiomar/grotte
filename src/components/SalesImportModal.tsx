import React, { useState } from 'react';
import { motion } from 'motion/react';
import { UploadCloud, Check, Trash2, X, Sparkles } from 'lucide-react';
import { useStock } from '../context/StockContext';
import { Sale } from '../types';

interface SalesImportModalProps {
  onClose: () => void;
}

export const SalesImportModal: React.FC<SalesImportModalProps> = ({ onClose }) => {
  const { menuItems, sales, importSales, deleteSale, addSale } = useStock();

  const [activeTab, setActiveTab] = useState<'csv' | 'manual' | 'history'>('csv');
  const [csvText, setCsvText] = useState('');
  const [importDate, setImportDate] = useState(new Date().toISOString().slice(0, 10));
  const [sourceTag, setSourceTag] = useState('Export Caisse POS');
  const [previewRows, setPreviewRows] = useState<Array<{ menuItemName: string; menuItemId: string; quantity: number; rawRef: string }>>([]);
  const [importError, setImportError] = useState<string | null>(null);
  const [successCount, setSuccessCount] = useState<number | null>(null);

  // Manual entry state
  const [manualMenuItemId, setManualMenuItemId] = useState(menuItems[0]?.id || '');
  const [manualQuantity, setManualQuantity] = useState(10);

  // Sample CSV generator for La Grotte Monastir
  const handleLoadSampleCSV = () => {
    const sample = `pos_reference,quantity_sold,dish_name
POS-DAUR-GRILL,28,Daurade Royale Grillée au Feu de Bois
POS-LOUP-SEL,16,Loup de Mer en Croûte de Sel
POS-GAMB-FLAM,22,Assiette Gambas Royales Flambées
POS-COUS-MEROU,34,Couscous Traditionnel au Mérou de Monastir
POS-OJJA-FRM,42,Ojja Tunisienne aux Fruits de Mer
POS-BRK-THON,55,Brik à l'Œuf & Thon de Mahdia
POS-VIN-MAGN,18,Magnifique Rouge Mornag Grand Cru (Btle)
POS-EAU-SAFIA,65,Eau Minérale Safia 1L
POS-THE-MENTH,70,Thé aux Pignons & Menthe Fraîche`;
    setCsvText(sample);
    parseCsv(sample);
  };

  const parseCsv = (raw: string) => {
    setImportError(null);
    const lines = raw.trim().split('\n');
    if (lines.length < 2) {
      setPreviewRows([]);
      return;
    }

    const rows: Array<{ menuItemName: string; menuItemId: string; quantity: number; rawRef: string }> = [];

    // Check header
    const headers = lines[0].toLowerCase().split(',').map(h => h.trim());
    const refIdx = headers.findIndex(h => h.includes('ref') || h.includes('code') || h.includes('id') || h.includes('item'));
    const qtyIdx = headers.findIndex(h => h.includes('qty') || h.includes('quant') || h.includes('sold') || h.includes('vente'));

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const cols = line.split(',').map(c => c.trim().replace(/^"|"$/g, ''));
      const ref = cols[refIdx !== -1 ? refIdx : 0];
      const qty = parseInt(cols[qtyIdx !== -1 ? qtyIdx : 1], 10);

      if (!isNaN(qty) && ref) {
        // Match with menuItem by pos_reference or by name
        const matched = menuItems.find(
          m => m.pos_reference.toLowerCase() === ref.toLowerCase() ||
               m.name.toLowerCase() === ref.toLowerCase()
        );

        if (matched) {
          rows.push({
            menuItemId: matched.id,
            menuItemName: matched.name,
            quantity: qty,
            rawRef: ref,
          });
        } else {
          rows.push({
            menuItemId: '',
            menuItemName: `⚠️ Plat inconnu (${ref})`,
            quantity: qty,
            rawRef: ref,
          });
        }
      }
    }

    setPreviewRows(rows);
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCsvText(e.target.value);
    parseCsv(e.target.value);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = evt => {
      const content = evt.target?.result as string;
      setCsvText(content);
      parseCsv(content);
    };
    reader.readAsText(file);
  };

  const handleCommitImport = () => {
    const valid = previewRows.filter(r => r.menuItemId !== '');
    if (valid.length === 0) {
      setImportError('Aucune ligne valide à importer. Vérifiez la correspondance des codes POS.');
      return;
    }

    const payload: Array<Omit<Sale, 'id'>> = valid.map(r => ({
      menu_item_id: r.menuItemId,
      quantity_sold: r.quantity,
      date: importDate,
      source: `${sourceTag} (${importDate})`,
    }));

    importSales(payload);
    setSuccessCount(valid.length);
    setTimeout(() => {
      onClose();
    }, 1500);
  };

  const handleManualAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualMenuItemId || manualQuantity <= 0) return;

    addSale({
      menu_item_id: manualMenuItemId,
      quantity_sold: manualQuantity,
      date: importDate,
      source: 'Saisie manuelle shift',
    });

    setSuccessCount(1);
    setTimeout(() => setSuccessCount(null), 2000);
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
        className="relative bg-white rounded-2xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-sand overflow-hidden z-10 my-auto"
      >
        {/* Header */}
        <div className="p-4 bg-navy text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-white/10 text-terracotta">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-[10px] uppercase tracking-wider text-terracotta block">
                Intégration Caisse
              </span>
              <h2 className="text-sm font-bold text-white uppercase tracking-wide">
                Importation des Ventes de Caisse (POS)
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-300 hover:text-white rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="px-5 pt-3 border-b border-sand flex gap-4 bg-cream">
          <button
            onClick={() => setActiveTab('csv')}
            className={`pb-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors ${
              activeTab === 'csv'
                ? 'border-navy text-navy'
                : 'border-transparent text-slate-500 hover:text-navy'
            }`}
          >
            Import CSV / Copier-Coller
          </button>
          <button
            onClick={() => setActiveTab('manual')}
            className={`pb-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors ${
              activeTab === 'manual'
                ? 'border-navy text-navy'
                : 'border-transparent text-slate-500 hover:text-navy'
            }`}
          >
            Saisie Manuelle Rapide
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`pb-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors ${
              activeTab === 'history'
                ? 'border-navy text-navy'
                : 'border-transparent text-slate-500 hover:text-navy'
            }`}
          >
            Ventes Actuelles ({sales.length})
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4 text-xs">
          {successCount !== null && (
            <div className="p-3 bg-success/10 border border-success/30 rounded-xl text-success flex items-center gap-2 shadow-2xs">
              <Check className="w-4 h-4 text-success shrink-0" />
              {successCount} vente(s) enregistrée(s) avec succès ! Les ratios de variance ont été recalculés.
            </div>
          )}

          {importError && (
            <div className="p-3 bg-alert/10 border border-alert/30 rounded-xl text-alert text-xs">
              {importError}
            </div>
          )}

          {activeTab === 'csv' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-navy uppercase tracking-wider text-[11px]">
                  Collez le texte CSV ou chargez votre export de caisse POS
                </span>
                <button
                  type="button"
                  onClick={handleLoadSampleCSV}
                  className="flex items-center gap-1.5 px-3 py-1 bg-cream hover:bg-linen text-navy border border-sand rounded-xl text-xs font-bold uppercase tracking-wider transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5 text-terracotta" />
                  Exemple POS La Grotte Monastir
                </button>
              </div>

              {/* Upload file input */}
              <div className="flex items-center gap-3">
                <input
                  type="file"
                  accept=".csv,.txt"
                  onChange={handleFileUpload}
                  className="block w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-3.5 file:rounded-xl file:border-0 file:text-xs file:font-bold file:uppercase file:bg-cream file:text-navy hover:file:bg-linen cursor-pointer"
                />
              </div>

              {/* Text Area */}
              <div>
                <textarea
                  rows={6}
                  value={csvText}
                  onChange={handleTextChange}
                  placeholder={`pos_reference,quantity_sold\nPOS-DAUR-GRILL,28\nPOS-LOUP-SEL,16\nPOS-GAMB-FLAM,22`}
                  className="w-full font-mono tabular-nums text-xs p-3 bg-cream border border-sand rounded-xl focus:outline-none focus:ring-1 focus:ring-navy text-navy"
                />
              </div>

              {/* Parameters */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block text-slate-600 font-bold uppercase tracking-wider text-[10px] mb-1">
                    Date du service / ventes
                  </label>
                  <input
                    type="date"
                    value={importDate}
                    onChange={e => setImportDate(e.target.value)}
                    className="w-full bg-cream border border-sand rounded-xl px-3 py-2 text-xs text-navy focus:outline-none focus:ring-1 focus:ring-navy"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-bold uppercase tracking-wider text-[10px] mb-1">
                    Source / Identifiant Export
                  </label>
                  <input
                    type="text"
                    value={sourceTag}
                    onChange={e => setSourceTag(e.target.value)}
                    className="w-full bg-cream border border-sand rounded-xl px-3 py-2 text-xs text-navy focus:outline-none focus:ring-1 focus:ring-navy"
                  />
                </div>
              </div>

              {/* Parsed Preview Table */}
              {previewRows.length > 0 && (
                <div className="mt-3 border border-sand rounded-xl overflow-hidden">
                  <div className="bg-cream px-3 py-2 font-bold text-navy text-[11px] uppercase tracking-wider flex justify-between border-b border-sand">
                    <span>Aperçu des correspondances ({previewRows.length} lignes)</span>
                    <span className="text-success font-bold">
                      {previewRows.filter(r => r.menuItemId !== '').length} reconnues
                    </span>
                  </div>
                  <div className="max-h-40 overflow-y-auto divide-y divide-sand/60">
                    {previewRows.map((row, idx) => (
                      <div key={idx} className="px-3 py-2 flex items-center justify-between">
                        <span className={`truncate max-w-[280px] ${row.menuItemId ? 'text-navy font-bold' : 'text-alert font-bold'}`}>
                          {row.menuItemName}
                        </span>
                        <div className="flex items-center gap-2 font-mono tabular-nums">
                          <span className="text-slate-400 text-[10px]">({row.rawRef})</span>
                          <span className="font-bold text-navy bg-cream px-2 py-0.5 rounded-md border border-sand">
                            {row.quantity} vendus
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'manual' && (
            <form onSubmit={handleManualAdd} className="space-y-4">
              <div>
                <label className="block text-slate-600 font-bold uppercase tracking-wider text-[10px] mb-1">
                  Plat vendu
                </label>
                <select
                  value={manualMenuItemId}
                  onChange={e => setManualMenuItemId(e.target.value)}
                  className="w-full bg-cream border border-sand rounded-xl px-3 py-2 text-xs text-navy focus:outline-none focus:ring-1 focus:ring-navy"
                >
                  {menuItems.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.pos_reference})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-bold uppercase tracking-wider text-[10px] mb-1">
                    Quantité vendue
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={manualQuantity}
                    onChange={e => setManualQuantity(parseInt(e.target.value, 10) || 0)}
                    className="w-full bg-cream border border-sand rounded-xl px-3 py-2 text-xs font-mono tabular-nums text-navy focus:outline-none focus:ring-1 focus:ring-navy"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-bold uppercase tracking-wider text-[10px] mb-1">
                    Date du service
                  </label>
                  <input
                    type="date"
                    value={importDate}
                    onChange={e => setImportDate(e.target.value)}
                    className="w-full bg-cream border border-sand rounded-xl px-3 py-2 text-xs text-navy focus:outline-none focus:ring-1 focus:ring-navy"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-navy hover:bg-navy-mid text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-colors shadow-xs"
              >
                Ajouter cette vente
              </button>
            </form>
          )}

          {activeTab === 'history' && (
            <div className="space-y-2">
              <div className="divide-y divide-sand/60 max-h-72 overflow-y-auto">
                {sales.map(s => {
                  const m = menuItems.find(item => item.id === s.menu_item_id);
                  return (
                    <div key={s.id} className="py-2.5 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-bold text-navy">
                          {m?.name || 'Plat inconnu'}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {s.date} • {s.source}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-navy bg-cream px-2.5 py-1 rounded-md border border-sand tabular-nums">
                          {s.quantity_sold} vendus
                        </span>
                        <button
                          onClick={() => deleteSale(s.id)}
                          className="text-slate-400 hover:text-alert p-1 transition-colors"
                          title="Supprimer la vente"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {activeTab === 'csv' && (
          <div className="p-4 border-t border-sand bg-cream flex items-center justify-between">
            <span className="text-[11px] text-slate-600 font-medium">
              {previewRows.length} articles identifiés dans l'export
            </span>

            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-600 hover:bg-linen rounded-xl transition-colors"
              >
                Fermer
              </button>
              <button
                onClick={handleCommitImport}
                disabled={previewRows.length === 0}
                className="px-5 py-2 bg-navy hover:bg-navy-mid disabled:opacity-50 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-xs transition-colors"
              >
                Valider l'importation POS
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default SalesImportModal;
