import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import QRCode from 'qrcode';
import { 
  Printer, 
  X, 
  Tag, 
  Filter, 
  Grid, 
  Layers, 
  MapPin, 
  Check, 
  Barcode as BarcodeIcon,
  HelpCircle,
  Download
} from 'lucide-react';
import { useStock } from '../context/StockContext';
import { Ingredient } from '../types';

interface PrintableLabelsModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultLocation?: string;
}

interface LabelItem {
  ingredient: Ingredient;
  qrDataUrl: string;
}

export const PrintableLabelsModal: React.FC<PrintableLabelsModalProps> = ({
  isOpen,
  onClose,
  defaultLocation = 'all',
}) => {
  const { ingredients } = useStock();
  const [selectedLocation, setSelectedLocation] = useState<string>(defaultLocation);
  const [labelFormat, setLabelFormat] = useState<'large' | 'compact'>('large');
  const [labels, setLabels] = useState<LabelItem[]>([]);
  const [isGenerating, setIsGenerating] = useState<boolean>(true);

  const locations = Array.from(new Set(ingredients.map(i => i.location || 'Réserve Principale')));

  const filteredIngredients = ingredients.filter(ing => {
    if (selectedLocation !== 'all' && (ing.location || 'Réserve Principale') !== selectedLocation) {
      return false;
    }
    return true;
  });

  // Generate QR Code data URLs for each ingredient
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setIsGenerating(true);

    const generateAllQrs = async () => {
      const items: LabelItem[] = [];
      for (const ing of filteredIngredients) {
        // We encode either their explicit barcode or clean structured payload
        const barcodeValue = ing.barcode || ing.id;
        try {
          const url = await QRCode.toDataURL(barcodeValue, {
            errorCorrectionLevel: 'M',
            margin: 1,
            width: 200,
            color: {
              dark: '#1B2A4A', // La Grotte Navy
              light: '#FFFFFF',
            },
          });
          items.push({ ingredient: ing, qrDataUrl: url });
        } catch (err) {
          console.error('QR code generation error for', ing.name, err);
        }
      }
      if (isMounted) {
        setLabels(items);
        setIsGenerating(false);
      }
    };

    generateAllQrs();

    return () => {
      isMounted = false;
    };
  }, [isOpen, selectedLocation, filteredIngredients.length]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="fixed inset-0 bg-black/75 backdrop-blur-xs"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="relative bg-white rounded-3xl max-w-4xl w-full shadow-2xl border border-sand overflow-hidden flex flex-col my-auto max-h-[92vh] z-10"
          >
            {/* Header - Screen only */}
        <div className="p-5 bg-navy text-white flex items-center justify-between print:hidden">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-terracotta text-white shadow-xs">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold tracking-tight text-white">
                Planches d'Étiquettes Bacs & QR Codes
              </h3>
              <p className="text-xs text-sand/80 mt-0.5">
                À coller sur les bacs gastro, cagettes de chambre froide et étagères
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              disabled={isGenerating || labels.length === 0}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-terracotta hover:bg-terracotta/90 text-white rounded-xl text-xs font-bold transition-all shadow-xs disabled:opacity-50"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimer ({labels.length})</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter bar - Screen only */}
        <div className="p-4 bg-cream border-b border-sand flex flex-wrap items-center justify-between gap-3 text-xs print:hidden">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-500" />
            <span className="font-semibold text-slate-700">Filtrer par zone :</span>
            <select
              value={selectedLocation}
              onChange={e => setSelectedLocation(e.target.value)}
              className="bg-white border border-sand rounded-xl px-3 py-1.5 text-xs text-navy focus:outline-none focus:ring-1 focus:ring-navy"
            >
              <option value="all">Toutes les zones ({ingredients.length} articles)</option>
              {locations.map(loc => (
                <option key={loc} value={loc}>{loc}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">Format d'impression :</span>
            <div className="flex rounded-xl bg-white border border-sand p-0.5">
              <button
                type="button"
                onClick={() => setLabelFormat('large')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                  labelFormat === 'large' ? 'bg-navy text-white shadow-2xs' : 'text-slate-600 hover:text-navy'
                }`}
              >
                Cagettes & Bacs (2x4)
              </button>
              <button
                type="button"
                onClick={() => setLabelFormat('compact')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                  labelFormat === 'compact' ? 'bg-navy text-white shadow-2xs' : 'text-slate-600 hover:text-navy'
                }`}
              >
                Rayonnages (3x8)
              </button>
            </div>
          </div>
        </div>

        {/* Labels Sheet Preview & Printable Content */}
        <div className="p-6 overflow-y-auto flex-1 bg-slate-100 print:bg-white print:p-0">
          {isGenerating ? (
            <div className="p-12 flex flex-col items-center justify-center text-center">
              <div className="w-8 h-8 rounded-full border-2 border-sand border-t-terracotta animate-spin mb-3" />
              <p className="text-xs font-medium text-slate-600">Génération des QR codes vectoriels en cours...</p>
            </div>
          ) : labels.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-xs">
              Aucun ingrédient ne correspond à cette zone.
            </div>
          ) : (
            <div 
              className={`grid gap-4 print:gap-3 bg-white p-6 print:p-2 rounded-2xl shadow-xs print:shadow-none border border-sand print:border-none ${
                labelFormat === 'large' 
                  ? 'grid-cols-1 sm:grid-cols-2 print:grid-cols-2' 
                  : 'grid-cols-1 sm:grid-cols-3 print:grid-cols-3'
              }`}
            >
              {labels.map(({ ingredient, qrDataUrl }) => (
                <div
                  key={ingredient.id}
                  className="border-2 border-dashed border-slate-300 print:border-slate-800 rounded-xl p-3.5 flex items-center gap-3 bg-white break-inside-avoid relative overflow-hidden"
                >
                  {/* QR code */}
                  <div className="w-20 h-20 shrink-0 bg-white p-1 rounded-lg border border-slate-200 flex items-center justify-center">
                    <img 
                      src={qrDataUrl} 
                      alt={`QR ${ingredient.name}`} 
                      className="w-full h-full object-contain"
                    />
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1 flex flex-col justify-between h-full">
                    <div>
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[9px] font-black uppercase tracking-wider text-terracotta">
                          La Grotte • Monastir
                        </span>
                        <span className="text-[9px] font-mono text-slate-400">
                          {ingredient.unit}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-navy leading-snug truncate mt-0.5" title={ingredient.name}>
                        {ingredient.name}
                      </h4>
                      <p className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5 truncate">
                        <MapPin className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                        {ingredient.location || 'Réserve'}
                      </p>
                    </div>

                    <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between text-[9px] font-mono text-slate-600">
                      <span>REF: {ingredient.barcode || ingredient.id}</span>
                      <span className="font-bold text-navy">{ingredient.category}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer info - Screen only */}
        <div className="p-4 bg-cream border-t border-sand flex items-center justify-between text-xs text-slate-600 print:hidden">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-slate-400" />
            <span>Imprimez sur du papier étiquette adhésif ou cartonné pour résister à l'humidité du froid.</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-white border border-sand hover:bg-linen text-navy font-semibold rounded-xl transition-colors"
          >
            Fermer
          </button>
        </div>

      </motion.div>
    </div>
      )}
    </AnimatePresence>
  );
};
