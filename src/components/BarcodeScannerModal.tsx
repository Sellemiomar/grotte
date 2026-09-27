import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { 
  Camera, 
  X, 
  RotateCcw, 
  Zap, 
  Volume2, 
  VolumeX, 
  Check, 
  AlertCircle, 
  Plus, 
  Minus, 
  Search, 
  Sparkles, 
  ArrowRight,
  Package,
  Layers,
  MapPin,
  Barcode as BarcodeIcon,
  HelpCircle,
  ExternalLink
} from 'lucide-react';
import { Ingredient } from '../types';
import { useStock } from '../context/StockContext';
import { formatQuantity, formatCurrency } from '../utils/calculations';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  // If provided, handles continuous counting directly into the caller's draftCounts
  draftCounts?: Record<string, number>;
  onUpdateDraftCount?: (ingredientId: string, newCount: number) => void;
  // If provided, single scan callback
  onSelectIngredient?: (ingredient: Ingredient, code: string) => void;
  title?: string;
  subtitle?: string;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  draftCounts,
  onUpdateDraftCount,
  onSelectIngredient,
  title = 'Scanner Code-Barres & QR',
  subtitle = 'Pointez la caméra vers le code du bac, carton ou cageot'
}) => {
  const { ingredients, findIngredientByBarcode, assignBarcodeToIngredient, showToast } = useStock();

  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameras, setCameras] = useState<Array<{ id: string; label: string }>>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [torchEnabled, setTorchEnabled] = useState<boolean>(false);
  const [hasTorch, setHasTorch] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Scanned item overlay
  const [scannedCode, setScannedCode] = useState<string | null>(null);
  const [matchedIngredient, setMatchedIngredient] = useState<Ingredient | null>(null);
  const [tempCount, setTempCount] = useState<number>(0);
  const [scanCountSession, setScanCountSession] = useState<number>(0);
  const [showAssociateModal, setShowAssociateModal] = useState<boolean>(false);
  const [selectedIngredientToAssociate, setSelectedIngredientToAssociate] = useState<string>('');
  
  // Manual / Simulation fallback
  const [manualCodeInput, setManualCodeInput] = useState<string>('');
  const [showSimulations, setShowSimulations] = useState<boolean>(false);

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const readerElementId = 'lagrotte-barcode-scanner-viewport';
  const audioCtxRef = useRef<AudioContext | null>(null);
  const isScanningPausedRef = useRef<boolean>(false);

  // Play subtle feedback beep using Web Audio API
  const playBeep = useCallback(() => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      if (!audioCtxRef.current || audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current = new AudioCtx();
      }
      const ctx = audioCtxRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime); // A5 note
      osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.08); // A6 note
      
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.09);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.09);
    } catch {
      // Audio autoplay restriction fallback
    }
  }, [soundEnabled]);

  // Vibrate mobile device
  const triggerHaptic = useCallback(() => {
    try {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([60, 40, 60]);
      }
    } catch {
      // Ignore vibration errors
    }
  }, []);

  // Handle successful scan from camera or simulation
  const handleScanSuccess = useCallback((decodedText: string) => {
    if (isScanningPausedRef.current) return;
    const cleanText = decodedText.trim();
    if (!cleanText) return;

    playBeep();
    triggerHaptic();

    setScannedCode(cleanText);
    const found = findIngredientByBarcode(cleanText);

    if (found) {
      setMatchedIngredient(found);
      const currentVal = draftCounts ? (draftCounts[found.id] ?? found.current_stock) : found.current_stock;
      setTempCount(currentVal);
      setScanCountSession(prev => prev + 1);

      // If single selection callback is active (e.g. delivery picker)
      if (onSelectIngredient && !draftCounts) {
        onSelectIngredient(found, cleanText);
        showToast(`Article identifié : ${found.name}`, 'success');
        onClose();
        return;
      }

      // Temporarily pause camera scans while dialog is open
      isScanningPausedRef.current = true;
    } else {
      // Unknown barcode
      setMatchedIngredient(null);
      isScanningPausedRef.current = true;
    }
  }, [findIngredientByBarcode, draftCounts, onSelectIngredient, showToast, onClose, playBeep, triggerHaptic]);

  // Start Scanner
  const startCamera = useCallback(async (cameraIdToUse?: string) => {
    setCameraError(null);
    try {
      if (!html5QrCodeRef.current) {
        html5QrCodeRef.current = new Html5Qrcode(readerElementId, {
          formatsToSupport: [
            Html5QrcodeSupportedFormats.QR_CODE,
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E,
          ],
          verbose: false,
        });
      }

      const availableCameras = await Html5Qrcode.getCameras();
      setCameras(availableCameras);

      // Determine camera config
      let cameraConfig: string | { facingMode: string } = { facingMode: 'environment' };
      if (cameraIdToUse) {
        cameraConfig = cameraIdToUse;
      } else if (availableCameras && availableCameras.length > 0) {
        // Prioritize rear camera for crates
        const backCam = availableCameras.find(c => 
          c.label.toLowerCase().includes('back') || 
          c.label.toLowerCase().includes('rear') || 
          c.label.toLowerCase().includes('arrière') ||
          c.label.toLowerCase().includes('environment')
        );
        cameraConfig = backCam ? backCam.id : availableCameras[0].id;
        setSelectedCameraId(backCam ? backCam.id : availableCameras[0].id);
      }

      await html5QrCodeRef.current.start(
        cameraConfig,
        {
          fps: 15,
          qrbox: { width: 260, height: 260 },
          aspectRatio: 1.0,
        },
        (decodedText) => {
          handleScanSuccess(decodedText);
        },
        () => {
          // ignore scan frame miss
        }
      );

      setIsCameraActive(true);

      // Check torch capability
      try {
        const capabilities = (html5QrCodeRef.current as any).getRunningTrackCapabilities?.();
        if (capabilities && 'torch' in capabilities) {
          setHasTorch(true);
        }
      } catch {
        setHasTorch(false);
      }

    } catch (err: any) {
      console.warn('Camera start error:', err);
      setIsCameraActive(false);
      if (err?.name === 'NotAllowedError' || err?.message?.includes('Permission denied')) {
        setCameraError("Accès à la caméra refusé. Veuillez autoriser l'appareil photo dans les paramètres de votre navigateur.");
      } else if (err?.name === 'NotFoundError' || err?.message?.includes('Devices not found')) {
        setCameraError("Aucune caméra détectée sur cet appareil. Utilisez la saisie manuelle ou la simulation.");
      } else {
        setCameraError("Impossible d'activer le flux vidéo direct. Vous pouvez saisir le code manuellement ou utiliser le mode simulation.");
      }
    }
  }, [handleScanSuccess]);

  // Stop Scanner
  const stopCamera = useCallback(async () => {
    if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
      try {
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current.clear();
      } catch (err) {
        console.warn('Camera stop cleanup warning:', err);
      }
    }
    setIsCameraActive(false);
  }, []);

  // Toggle Torch
  const toggleTorch = async () => {
    if (!html5QrCodeRef.current) return;
    try {
      const newTorch = !torchEnabled;
      await (html5QrCodeRef.current as any).applyVideoConstraints({
        advanced: [{ torch: newTorch }]
      });
      setTorchEnabled(newTorch);
    } catch {
      showToast("La fonction torche n'est pas supportée sur ce périphérique", 'info');
    }
  };

  // Switch Camera
  const switchCamera = async () => {
    if (cameras.length <= 1) return;
    await stopCamera();
    const currentIndex = cameras.findIndex(c => c.id === selectedCameraId);
    const nextIndex = (currentIndex + 1) % cameras.length;
    const nextCamera = cameras[nextIndex];
    setSelectedCameraId(nextCamera.id);
    startCamera(nextCamera.id);
  };

  // Resume camera scanning after item validated
  const resumeScanning = () => {
    setScannedCode(null);
    setMatchedIngredient(null);
    setShowAssociateModal(false);
    isScanningPausedRef.current = false;
  };

  // Save count & resume
  const handleConfirmCount = () => {
    if (matchedIngredient && onUpdateDraftCount) {
      onUpdateDraftCount(matchedIngredient.id, Math.max(0, Number(tempCount.toFixed(2))));
      showToast(`${matchedIngredient.name} : ${tempCount} ${matchedIngredient.unit} enregistré`, 'success');
    }
    resumeScanning();
  };

  // Associate unknown barcode with ingredient
  const handleAssociateBarcode = async () => {
    if (!scannedCode || !selectedIngredientToAssociate) return;
    await assignBarcodeToIngredient(selectedIngredientToAssociate, scannedCode);
    const ing = ingredients.find(i => i.id === selectedIngredientToAssociate);
    if (ing) {
      setMatchedIngredient(ing);
      const currentVal = draftCounts ? (draftCounts[ing.id] ?? ing.current_stock) : ing.current_stock;
      setTempCount(currentVal);
      setShowAssociateModal(false);
    }
  };

  // Mount / Unmount lifecycle
  useEffect(() => {
    if (isOpen) {
      // Small delay to ensure modal DOM container is mounted
      const timer = setTimeout(() => {
        startCamera();
      }, 200);
      return () => {
        clearTimeout(timer);
        stopCamera();
      };
    } else {
      stopCamera();
    }
  }, [isOpen, startCamera, stopCamera]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="relative bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-sand overflow-hidden flex flex-col my-auto max-h-[95vh]">
        
        {/* Header */}
        <div className="p-4 sm:p-5 bg-navy text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-terracotta text-white shadow-xs">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold tracking-tight text-white">{title}</h3>
                {scanCountSession > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-terracotta/90 text-white text-[10px] font-bold">
                    {scanCountSession} {scanCountSession === 1 ? 'scan' : 'scans'}
                  </span>
                )}
              </div>
              <p className="text-xs text-sand/80 mt-0.5">{subtitle}</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              title={soundEnabled ? 'Désactiver le bip' : 'Activer le bip'}
              className="p-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors"
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Viewport Area */}
        <div className="relative bg-slate-950 flex flex-col items-center justify-center overflow-hidden min-h-[300px] max-h-[380px]">
          {/* HTML5 QR Code Mount Element */}
          <div 
            id={readerElementId} 
            className="w-full h-full flex items-center justify-center [&_video]:object-cover [&_video]:w-full [&_video]:max-h-[380px]"
          />

          {/* Optical Targeting Reticle overlay */}
          {isCameraActive && !scannedCode && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="relative w-60 h-60 border-2 border-dashed border-white/60 rounded-2xl flex items-center justify-center shadow-[0_0_0_9999px_rgba(0,0,0,0.4)]">
                {/* Laser scan animation line */}
                <div className="absolute inset-x-2 h-0.5 bg-terracotta shadow-[0_0_12px_#D05A3F] animate-pulse top-1/2 -translate-y-1/2" />
                
                {/* Corner markers */}
                <div className="absolute -top-1 -left-1 w-5 h-5 border-t-4 border-l-4 border-terracotta rounded-tl-md" />
                <div className="absolute -top-1 -right-1 w-5 h-5 border-t-4 border-r-4 border-terracotta rounded-tr-md" />
                <div className="absolute -bottom-1 -left-1 w-5 h-5 border-b-4 border-l-4 border-terracotta rounded-bl-md" />
                <div className="absolute -bottom-1 -right-1 w-5 h-5 border-b-4 border-r-4 border-terracotta rounded-br-md" />

                <span className="absolute bottom-2 text-[10px] font-mono font-medium tracking-widest text-white/80 bg-black/60 px-2 py-0.5 rounded-full">
                  ALIGNER LE CODE-BARRES / QR
                </span>
              </div>
            </div>
          )}

          {/* Camera controls toolbar at bottom of viewport */}
          {isCameraActive && (
            <div className="absolute top-3 right-3 flex items-center gap-1.5 z-10 bg-black/60 backdrop-blur-xs p-1 rounded-xl border border-white/10">
              {hasTorch && (
                <button
                  type="button"
                  onClick={toggleTorch}
                  className={`p-2 rounded-lg text-xs font-medium transition-colors ${
                    torchEnabled ? 'bg-amber-400 text-navy' : 'text-white/80 hover:text-white'
                  }`}
                  title="Allumer la lampe torche (chambre froide sombre)"
                >
                  <Zap className="w-4 h-4" />
                </button>
              )}

              {cameras.length > 1 && (
                <button
                  type="button"
                  onClick={switchCamera}
                  className="p-2 rounded-lg text-xs font-medium text-white/80 hover:text-white transition-colors"
                  title="Basculer la caméra (Avant / Arrière)"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              )}
            </div>
          )}

          {/* Camera Error or Denied view */}
          {cameraError && (
            <div className="absolute inset-0 bg-slate-900/95 p-6 flex flex-col items-center justify-center text-center text-white z-20">
              <div className="p-3 bg-terracotta/20 text-terracotta rounded-full mb-3 border border-terracotta/30">
                <AlertCircle className="w-8 h-8" />
              </div>
              <h4 className="text-sm font-bold text-white mb-1">Accès caméra non disponible</h4>
              <p className="text-xs text-slate-300 max-w-xs mb-4">{cameraError}</p>
              
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => startCamera()}
                  className="px-4 py-2 bg-terracotta hover:bg-terracotta/90 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
                >
                  Réessayer
                </button>
                <button
                  type="button"
                  onClick={() => setShowSimulations(true)}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all border border-white/20"
                >
                  Mode Simulation
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Dynamic Scan Result Card (Bottom Overlay or Content) */}
        {scannedCode && matchedIngredient && (
          <div className="p-4 sm:p-5 bg-cream/80 border-t border-sand border-b flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-2 duration-150">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md bg-navy/10 text-navy font-mono text-[10px] font-bold">
                    {scannedCode}
                  </span>
                  <span className="text-[11px] font-medium text-slate-500 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-terracotta" />
                    {matchedIngredient.location || 'Chambre Froide'}
                  </span>
                </div>
                <h4 className="text-base font-black text-navy mt-1">{matchedIngredient.name}</h4>
                <div className="text-xs text-slate-600 flex items-center gap-2 mt-0.5">
                  <span>En stock théorique : <strong>{formatQuantity(matchedIngredient.current_stock, matchedIngredient.unit)}</strong></span>
                  <span>•</span>
                  <span>Coût : {formatCurrency(matchedIngredient.cost_per_unit)} / {matchedIngredient.unit}</span>
                </div>
              </div>

              <div className="text-right">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Quantité Comptée</div>
                <div className="text-xl font-mono font-black text-terracotta">
                  {tempCount} <span className="text-xs font-sans text-navy">{matchedIngredient.unit}</span>
                </div>
              </div>
            </div>

            {/* Tactile adjustment keys for cold room counting with gloves */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-1">
              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                <button
                  type="button"
                  onClick={() => setTempCount(prev => Math.max(0, Number((prev - 1).toFixed(2))))}
                  className="px-2.5 sm:px-3 py-2 bg-white hover:bg-linen border border-sand rounded-xl text-xs font-black text-navy shadow-2xs active:scale-95 shrink-0"
                >
                  -1
                </button>
                <button
                  type="button"
                  onClick={() => setTempCount(prev => Math.max(0, Number((prev - 0.5).toFixed(2))))}
                  className="px-2 sm:px-2.5 py-2 bg-white hover:bg-linen border border-sand rounded-xl text-xs font-bold text-slate-700 shadow-2xs active:scale-95 shrink-0"
                >
                  -0.5
                </button>

                <div className="relative flex-1 min-w-[54px]">
                  <input
                    type="number"
                    step="any"
                    value={tempCount === 0 ? '' : tempCount}
                    onChange={e => setTempCount(parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    className="w-full text-center font-mono font-bold bg-white border border-sand rounded-xl py-2 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-terracotta"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => setTempCount(prev => Number((prev + 0.5).toFixed(2)))}
                  className="px-2 sm:px-2.5 py-2 bg-white hover:bg-linen border border-sand rounded-xl text-xs font-bold text-slate-700 shadow-2xs active:scale-95 shrink-0"
                >
                  +0.5
                </button>
                <button
                  type="button"
                  onClick={() => setTempCount(prev => Number((prev + 1).toFixed(2)))}
                  className="px-2.5 sm:px-3 py-2 bg-white hover:bg-linen border border-sand rounded-xl text-xs font-black text-navy shadow-2xs active:scale-95 shrink-0"
                >
                  +1
                </button>
                <button
                  type="button"
                  onClick={() => setTempCount(prev => Number((prev + 5).toFixed(2)))}
                  className="px-2 sm:px-2.5 py-2 bg-white hover:bg-linen border border-sand rounded-xl text-xs font-bold text-terracotta shadow-2xs active:scale-95 shrink-0"
                  title="Ajouter un carton / pack de 5"
                >
                  +5
                </button>
              </div>

              <button
                type="button"
                onClick={handleConfirmCount}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-terracotta hover:bg-terracotta/90 text-white rounded-xl text-xs font-bold transition-all shadow-xs active:scale-95 shrink-0"
              >
                <Check className="w-4 h-4" />
                Valider & Suivant
              </button>
            </div>
          </div>
        )}

        {/* Unrecognized Barcode Card */}
        {scannedCode && !matchedIngredient && (
          <div className="p-4 sm:p-5 bg-amber-50 border-t border-amber-200 flex flex-col gap-3">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-amber-100 text-amber-800">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-bold text-amber-950">Code-barres inconnu : {scannedCode}</h4>
                <p className="text-xs text-amber-800 mt-0.5">
                  Ce code n'est actuellement rattaché à aucun article de votre mercuriale.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={resumeScanning}
                className="px-3 py-1.5 bg-white border border-sand rounded-xl text-xs font-semibold text-slate-700 hover:bg-linen"
              >
                Ignorer & Reprendre
              </button>

              <button
                type="button"
                onClick={() => setShowAssociateModal(true)}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-navy hover:bg-navy/90 text-white rounded-xl text-xs font-bold shadow-xs"
              >
                <Plus className="w-3.5 h-3.5 text-terracotta" />
                Associer à un ingrédient
              </button>
            </div>
          </div>
        )}

        {/* Association Sub-modal (Inline) */}
        {showAssociateModal && (
          <div className="p-4 bg-linen border-t border-sand space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-navy">
                Associer le code <code className="text-terracotta font-mono">{scannedCode}</code>
              </span>
              <button onClick={() => setShowAssociateModal(false)} className="text-slate-400 hover:text-navy">
                <X className="w-4 h-4" />
              </button>
            </div>

            <select
              value={selectedIngredientToAssociate}
              onChange={e => setSelectedIngredientToAssociate(e.target.value)}
              className="w-full bg-white border border-sand rounded-xl px-3 py-2 text-xs text-navy focus:outline-none focus:ring-1 focus:ring-terracotta"
            >
              <option value="">Sélectionnez un produit...</option>
              {ingredients.map(ing => (
                <option key={ing.id} value={ing.id}>
                  {ing.name} ({ing.unit}) — {ing.location || 'Réserve'}
                </option>
              ))}
            </select>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                disabled={!selectedIngredientToAssociate}
                onClick={handleAssociateBarcode}
                className="px-4 py-2 bg-terracotta text-white rounded-xl text-xs font-bold disabled:opacity-50 transition-colors shadow-xs"
              >
                Enregistrer l'association
              </button>
            </div>
          </div>
        )}

        {/* Footer Bar: Manual Entry & Quick Test Barcodes */}
        <div className="p-4 bg-cream border-t border-sand space-y-3">
          {/* Quick Manual input for foggy lens / manual typing */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={manualCodeInput}
                onChange={e => setManualCodeInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && manualCodeInput.trim()) {
                    handleScanSuccess(manualCodeInput.trim());
                    setManualCodeInput('');
                  }
                }}
                placeholder="Code-barres ou référence (ex: 619001001001)..."
                className="w-full bg-white border border-sand rounded-xl pl-9 pr-3 py-2 text-xs text-navy font-mono placeholder:font-sans focus:outline-none focus:ring-1 focus:ring-navy"
              />
              <BarcodeIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            </div>

            <button
              type="button"
              disabled={!manualCodeInput.trim()}
              onClick={() => {
                if (manualCodeInput.trim()) {
                  handleScanSuccess(manualCodeInput.trim());
                  setManualCodeInput('');
                }
              }}
              className="px-3.5 py-2 bg-navy hover:bg-navy/90 text-white rounded-xl text-xs font-bold disabled:opacity-40 transition-colors"
            >
              Tester
            </button>

            <button
              type="button"
              onClick={() => setShowSimulations(!showSimulations)}
              className="px-3 py-2 bg-white hover:bg-linen border border-sand text-slate-700 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1 shadow-2xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-terracotta" />
              <span>Simuler</span>
            </button>
          </div>

          {/* Quick Simulation Barcode Drawer (Ideal for instant testing in AI Studio without printing barcodes) */}
          {showSimulations && (
            <div className="p-3 bg-white rounded-2xl border border-sand/80 space-y-2 animate-in fade-in duration-150">
              <div className="flex items-center justify-between text-[11px] text-slate-500 font-semibold">
                <span>Cliquez pour simuler un scan en chambre froide :</span>
                <span className="text-[10px] font-mono text-terracotta">La Grotte Monastir</span>
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
                {ingredients.slice(0, 12).map(ing => (
                  <button
                    key={ing.id}
                    type="button"
                    onClick={() => {
                      const codeToScan = ing.barcode || ing.id;
                      handleScanSuccess(codeToScan);
                    }}
                    className="flex items-center gap-1.5 px-2.5 py-1 bg-cream hover:bg-linen border border-sand rounded-lg text-[11px] text-navy font-medium transition-colors group"
                  >
                    <span className="w-2 h-2 rounded-full bg-terracotta/70 group-hover:bg-terracotta" />
                    <span>{ing.name}</span>
                    <span className="font-mono text-[9px] text-slate-400">({ing.barcode || ing.id})</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
            <span className="flex items-center gap-1">
              <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
              Compatible étiquettes QR, codes EAN-13, Code 128 et bacs plastiques
            </span>
            <button
              type="button"
              onClick={onClose}
              className="text-xs font-bold text-terracotta hover:underline"
            >
              Fermer
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
