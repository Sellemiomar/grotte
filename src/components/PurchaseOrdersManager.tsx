import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  ShoppingCart, 
  Sparkles, 
  Copy, 
  Send, 
  CheckCircle2, 
  Clock, 
  Truck, 
  AlertTriangle, 
  ChevronRight, 
  ArrowLeft, 
  Building2, 
  Calendar, 
  FileText, 
  Check, 
  Trash2, 
  Plus, 
  Loader2,
  Phone,
  MessageSquare,
  Edit2,
  RefreshCw
} from 'lucide-react';
import { useStock } from '../context/StockContext';
import { PurchaseOrder, PurchaseOrderItem, PurchaseOrderStatus, Ingredient } from '../types';
import { generateSuggestedPurchaseOrders, formatCurrency } from '../utils/calculations';
import { supabase } from '../lib/supabase';
import { getErrorMessage } from '../utils/errors';

const STORAGE_KEY_PO = 'lagrotte_purchase_orders_v1';
const STORAGE_KEY_POI = 'lagrotte_purchase_order_items_v1';

const SQL_PURCHASE_ORDERS = `-- ==============================================================================
-- LA GROTTE — PURCHASE ORDERS (BONS DE COMMANDE) MIGRATION
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.purchase_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE RESTRICT,
  status TEXT NOT NULL CHECK (status IN ('draft', 'sent', 'received')) DEFAULT 'draft',
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  sent_at TIMESTAMPTZ,
  received_at TIMESTAMPTZ,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS public.purchase_order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  purchase_order_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  ingredient_id UUID NOT NULL REFERENCES public.ingredients(id) ON DELETE RESTRICT,
  suggested_quantity NUMERIC(10,3) NOT NULL,
  unit_cost NUMERIC(10,3) NOT NULL,
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier_id ON public.purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON public.purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_po_id ON public.purchase_order_items(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_ingredient_id ON public.purchase_order_items(ingredient_id);

ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read purchase_orders" ON public.purchase_orders;
DROP POLICY IF EXISTS "Allow manage purchase_orders" ON public.purchase_orders;
CREATE POLICY "Allow read purchase_orders"
ON public.purchase_orders FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Allow manage purchase_orders"
ON public.purchase_orders FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow read purchase_order_items" ON public.purchase_order_items;
DROP POLICY IF EXISTS "Allow manage purchase_order_items" ON public.purchase_order_items;
CREATE POLICY "Allow read purchase_order_items"
ON public.purchase_order_items FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Allow manage purchase_order_items"
ON public.purchase_order_items FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);`;

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export const PurchaseOrdersManager: React.FC = () => {
  const {
    ingredients,
    deliveries,
    suppliers,
    currentUser,
    addDelivery,
    showToast,
    isSupabaseConnected,
    purchaseOrders,
    orderItems,
    setPurchaseOrders,
    setOrderItems,
    fetchPurchaseOrders,
  } = useStock();

  // State
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | PurchaseOrderStatus>('all');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedOrderId, setCopiedOrderId] = useState<string | null>(null);
  const [isPoTableAvailable, setIsPoTableAvailable] = useState(true);
  const [copiedSQL, setCopiedSQL] = useState(false);
  const [isRetryingSync, setIsRetryingSync] = useState(false);

  // Modal state when marking "Received"
  const [receiveModalOrder, setReceiveModalOrder] = useState<PurchaseOrder | null>(null);
  const [receiveBlNumber, setReceiveBlNumber] = useState('');
  const [receiveDate, setReceiveDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [receiveReceiver, setReceiveReceiver] = useState(currentUser?.name || 'Responsable Stock');
  const [receiveItemsState, setReceiveItemsState] = useState<{
    itemId: string;
    ingredientId: string;
    quantity: number;
    unitCost: number;
    selected: boolean;
  }[]>([]);
  const [isReceivingSubmitting, setIsReceivingSubmitting] = useState(false);

  // Check table availability on mount
  useEffect(() => {
    if (!supabase) return;
    supabase
      .from('purchase_orders')
      .select('id')
      .limit(1)
      .then(({ error }) => {
        if (error) {
          const isTableMissing =
            error.code === 'PGRST205' ||
            error.message?.includes('schema cache') ||
            error.message?.includes('purchase_orders') ||
            error.message?.includes('relation "purchase_orders" does not exist') ||
            error.message?.includes('relation "public.purchase_orders" does not exist');
          if (isTableMissing) {
            setIsPoTableAvailable(false);
          }
        } else {
          setIsPoTableAvailable(true);
        }
      });
  }, []);

  const handleCopySQL = async () => {
    try {
      await navigator.clipboard.writeText(SQL_PURCHASE_ORDERS);
      setCopiedSQL(true);
      showToast('Script SQL copié dans le presse-papier !', 'success');
      setTimeout(() => setCopiedSQL(false), 3000);
    } catch {
      showToast('Impossible de copier automatiquement.', 'error');
    }
  };

  const handleRetrySync = async () => {
    if (!supabase) return;
    setIsRetryingSync(true);
    try {
      const { error: testErr } = await supabase.from('purchase_orders').select('id').limit(1);
      if (testErr) {
        const isTableMissing =
          testErr.code === 'PGRST205' ||
          testErr.message?.includes('schema cache') ||
          testErr.message?.includes('purchase_orders') ||
          testErr.message?.includes('relation "purchase_orders" does not exist');
        if (isTableMissing) {
          setIsPoTableAvailable(false);
          showToast('Tables "purchase_orders" non trouvées sur Supabase. Exécutez le script SQL.', 'info');
          return;
        }
      }

      setIsPoTableAvailable(true);

      // Upsert local orders to Supabase if any
      if (purchaseOrders.length > 0) {
        const { error: syncPoErr } = await supabase.from('purchase_orders').upsert(
          purchaseOrders.map(o => ({
            id: o.id,
            supplier_id: o.supplier_id,
            status: o.status,
            created_by: o.created_by,
            created_at: o.created_at,
            sent_at: o.sent_at,
            received_at: o.received_at,
            notes: o.notes,
          })),
          { onConflict: 'id' }
        );
        if (syncPoErr) throw syncPoErr;
      }

      if (orderItems.length > 0) {
        const { error: syncPoiErr } = await supabase.from('purchase_order_items').upsert(
          orderItems.map(i => ({
            id: i.id,
            purchase_order_id: i.purchase_order_id,
            ingredient_id: i.ingredient_id,
            suggested_quantity: i.suggested_quantity,
            unit_cost: i.unit_cost,
            notes: i.notes,
          })),
          { onConflict: 'id' }
        );
        if (syncPoiErr) throw syncPoiErr;
      }

      showToast('Synchronisation réussie avec Supabase !', 'success');
      await fetchPurchaseOrders();
    } catch (err: unknown) {
      console.warn('Retry sync error:', err);
      showToast(`Échec de la synchronisation : ${getErrorMessage(err)}`, 'error');
    } finally {
      setIsRetryingSync(false);
    }
  };

  // Ingredients map & Suppliers map
  const ingredientsMap = useMemo(() => {
    const map = new Map<string, Ingredient>();
    ingredients.forEach(ing => map.set(ing.id, ing));
    return map;
  }, [ingredients]);

  const suppliersMap = useMemo(() => {
    const map = new Map<string, string>();
    suppliers.forEach(s => map.set(s.id, s.name));
    return map;
  }, [suppliers]);

  // Filtered orders
  const filteredOrders = useMemo(() => {
    return purchaseOrders.filter(order => {
      if (statusFilter === 'all') return true;
      return order.status === statusFilter;
    });
  }, [purchaseOrders, statusFilter]);

  // Currently selected order
  const activeOrder = useMemo(() => {
    return purchaseOrders.find(o => o.id === selectedOrderId) || null;
  }, [purchaseOrders, selectedOrderId]);

  // Items for currently selected order
  const activeOrderItems = useMemo(() => {
    if (!selectedOrderId) return [];
    return orderItems.filter(item => item.purchase_order_id === selectedOrderId);
  }, [orderItems, selectedOrderId]);

  // Total amount for active order
  const activeOrderTotal = useMemo(() => {
    return activeOrderItems.reduce(
      (sum, item) => sum + (Number(item.suggested_quantity) || 0) * (Number(item.unit_cost) || 0),
      0
    );
  }, [activeOrderItems]);

  // (1) GENERATE PURCHASE ORDERS ACTION
  const handleGenerateOrders = async () => {
    setIsGenerating(true);
    try {
      const suggestions = generateSuggestedPurchaseOrders(ingredients, deliveries);

      if (suggestions.length === 0) {
        showToast(
          'Aucun réapprovisionnement requis : tous les stocks sont au-dessus des seuils ou sans historique fournisseur.',
          'info'
        );
        return;
      }

      const newOrders: PurchaseOrder[] = [];
      const newItems: PurchaseOrderItem[] = [];
      const creatorName = currentUser?.name || 'Direction';

      for (const group of suggestions) {
        const orderId = generateUUID();
        const po: PurchaseOrder = {
          id: orderId,
          supplier_id: group.supplier_id,
          status: 'draft',
          created_by: creatorName,
          created_at: new Date().toISOString(),
          sent_at: null,
          received_at: null,
          notes: 'Généré automatiquement par le moteur de seuil d\'alerte',
        };
        newOrders.push(po);

        for (const item of group.items) {
          const poi: PurchaseOrderItem = {
            id: generateUUID(),
            purchase_order_id: orderId,
            ingredient_id: item.ingredient_id,
            suggested_quantity: item.suggested_quantity,
            unit_cost: item.unit_cost,
            notes: null,
          };
          newItems.push(poi);
        }
      }

      // Save to Supabase if connected
      if (supabase && isPoTableAvailable) {
        const { error: poErr } = await supabase.from('purchase_orders').insert(
          newOrders.map(o => ({
            id: o.id,
            supplier_id: o.supplier_id,
            status: o.status,
            created_by: o.created_by,
            created_at: o.created_at,
            notes: o.notes,
          }))
        );
        if (poErr) {
          const isTableMissing =
            poErr.code === 'PGRST205' ||
            poErr.message?.includes('schema cache') ||
            poErr.message?.includes('purchase_orders') ||
            poErr.message?.includes('relation "purchase_orders" does not exist') ||
            poErr.message?.includes('relation "public.purchase_orders" does not exist');
          if (isTableMissing) {
            setIsPoTableAvailable(false);
            console.warn('Supabase purchase_orders table not found in schema cache. Orders kept safely in local storage.');
          } else {
            console.warn('Supabase PO insert notice:', poErr.message);
          }
        }

        const { error: poiErr } = await supabase.from('purchase_order_items').insert(
          newItems.map(i => ({
            id: i.id,
            purchase_order_id: i.purchase_order_id,
            ingredient_id: i.ingredient_id,
            suggested_quantity: i.suggested_quantity,
            unit_cost: i.unit_cost,
            notes: i.notes,
          }))
        );
        if (poiErr) {
          const isTableMissing =
            poiErr.code === 'PGRST205' ||
            poiErr.message?.includes('schema cache') ||
            poiErr.message?.includes('purchase_order_items') ||
            poiErr.message?.includes('relation "purchase_order_items" does not exist') ||
            poiErr.message?.includes('relation "public.purchase_order_items" does not exist');
          if (isTableMissing) {
            setIsPoTableAvailable(false);
            console.warn('Supabase purchase_order_items table not found in schema cache. Items kept safely in local storage.');
          } else {
            console.warn('Supabase PO items insert notice:', poiErr.message);
          }
        }
      }

      setPurchaseOrders(prev => [...newOrders, ...prev]);
      setOrderItems(prev => [...newItems, ...prev]);

      if (newOrders.length > 0) {
        setSelectedOrderId(newOrders[0].id);
      }

      if (!isPoTableAvailable) {
        showToast(
          `${newOrders.length} bon(s) généré(s) et sauvegardé(s) localement (table Supabase "purchase_orders" en attente de script SQL).`,
          'info'
        );
      } else {
        showToast(
          `${newOrders.length} bon(s) de commande généré(s) avec succès pour vos fournisseurs !`,
          'success'
        );
      }
    } catch (err: unknown) {
      console.error('Error generating purchase orders:', err);
      showToast(`Erreur lors de la génération : ${getErrorMessage(err)}`, 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  // Editable item quantity
  const handleUpdateItemQuantity = async (itemId: string, newQty: number) => {
    const validQty = Math.max(0, Number(newQty.toFixed(3)));
    setOrderItems(prev =>
      prev.map(it => (it.id === itemId ? { ...it, suggested_quantity: validQty } : it))
    );

    if (supabase && isPoTableAvailable) {
      try {
        await supabase
          .from('purchase_order_items')
          .update({ suggested_quantity: validQty })
          .eq('id', itemId);
      } catch (e) {
        console.warn('Failed to update PO item in Supabase:', e);
      }
    }
  };

  // Editable item cost
  const handleUpdateItemCost = async (itemId: string, newCost: number) => {
    const validCost = Math.max(0, Number(newCost.toFixed(3)));
    setOrderItems(prev =>
      prev.map(it => (it.id === itemId ? { ...it, unit_cost: validCost } : it))
    );

    if (supabase && isPoTableAvailable) {
      try {
        await supabase
          .from('purchase_order_items')
          .update({ unit_cost: validCost })
          .eq('id', itemId);
      } catch (e) {
        console.warn('Failed to update PO item cost in Supabase:', e);
      }
    }
  };

  // Delete an item from draft order
  const handleDeleteItem = async (itemId: string) => {
    setOrderItems(prev => prev.filter(it => it.id !== itemId));
    if (supabase && isPoTableAvailable) {
      try {
        await supabase.from('purchase_order_items').delete().eq('id', itemId);
      } catch (e) {
        console.warn('Failed to delete PO item in Supabase:', e);
      }
    }
    showToast('Ligne supprimée du bon de commande', 'info');
  };

  // Mark as Sent
  const handleMarkAsSent = async (orderId: string) => {
    const sentTime = new Date().toISOString();
    setPurchaseOrders(prev =>
      prev.map(o => (o.id === orderId ? { ...o, status: 'sent', sent_at: sentTime } : o))
    );

    if (supabase && isPoTableAvailable) {
      try {
        await supabase
          .from('purchase_orders')
          .update({ status: 'sent', sent_at: sentTime })
          .eq('id', orderId);
      } catch (e) {
        console.warn('Failed to mark PO as sent in Supabase:', e);
      }
    }

    showToast('Bon de commande marqué comme "Envoyé" au fournisseur', 'success');
  };

  // Format order as text suitable for WhatsApp
  const formatOrderAsText = (order: PurchaseOrder, items: PurchaseOrderItem[]): string => {
    const supplier = suppliers.find(s => s.id === order.supplier_id);
    const supplierName = supplier?.name || 'Fournisseur';
    const dateFormatted = new Date(order.created_at).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });

    const lines = [
      `📋 *BON DE COMMANDE — RESTAURANT LA GROTTE (MONASTIR)*`,
      `*Fournisseur :* ${supplierName}`,
      supplier?.contact ? `*Contact :* ${supplier.contact}` : null,
      `*Date d'émission :* ${dateFormatted}`,
      `*Responsable :* ${order.created_by}`,
      `*Réf. Commande :* #${order.id.slice(0, 8).toUpperCase()}`,
      ``,
      `*ARTICLES COMMANDÉS :*`,
    ];

    let total = 0;
    items.forEach((item, index) => {
      const ing = ingredientsMap.get(item.ingredient_id);
      const name = ing?.name || 'Article inconnu';
      const unit = ing?.unit || 'u';
      const subtotal = item.suggested_quantity * item.unit_cost;
      total += subtotal;
      lines.push(
        `${index + 1}. *${name}* : ${item.suggested_quantity} ${unit} × ${formatCurrency(item.unit_cost)} = ${formatCurrency(subtotal)}`
      );
    });

    lines.push(``);
    lines.push(`*MONTANT TOTAL ESTIMÉ :* ${formatCurrency(total)}`);
    lines.push(`*Adresse de livraison :* Restaurant La Grotte, Falaise de Monastir`);
    lines.push(`*Confirmation :* Merci de confirmer la bonne prise en compte et le créneau de livraison.`);

    return lines.filter(l => l !== null).join('\n');
  };

  // Copy text to clipboard
  const handleCopyAsText = async (order: PurchaseOrder, items: PurchaseOrderItem[]) => {
    const text = formatOrderAsText(order, items);
    try {
      await navigator.clipboard.writeText(text);
      setCopiedOrderId(order.id);
      showToast('Texte du bon de commande copié ! Prêt à être collé dans WhatsApp.', 'success');
      setTimeout(() => setCopiedOrderId(null), 3000);
    } catch {
      showToast('Erreur lors de la copie dans le presse-papier', 'error');
    }
  };

  // Direct WhatsApp Web / App launcher with pre-filled message
  const handleSendWhatsAppDirect = (order: PurchaseOrder, items: PurchaseOrderItem[]) => {
    const text = formatOrderAsText(order, items);
    const supplier = suppliers.find(s => s.id === order.supplier_id);
    // Sanitize phone number if available (e.g. +216 98 123 456 -> 21698123456)
    const rawContact = supplier?.contact || '';
    const digitsOnly = rawContact.replace(/\D/g, '');
    let phoneParam = '';
    if (digitsOnly.length >= 8) {
      phoneParam = digitsOnly.startsWith('216') ? digitsOnly : `216${digitsOnly}`;
    }

    const encodedText = encodeURIComponent(text);
    const whatsappUrl = phoneParam
      ? `https://api.whatsapp.com/send?phone=${phoneParam}&text=${encodedText}`
      : `https://api.whatsapp.com/send?text=${encodedText}`;

    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    
    // Automatically propose marking as sent if currently draft
    if (order.status === 'draft') {
      handleMarkAsSent(order.id);
    }
  };

  // Open Receive Modal
  const handleOpenReceiveModal = (order: PurchaseOrder) => {
    const items = orderItems.filter(i => i.purchase_order_id === order.id);
    setReceiveModalOrder(order);
    setReceiveBlNumber(`BL-PO-${order.id.slice(0, 6).toUpperCase()}`);
    setReceiveDate(new Date().toISOString().slice(0, 10));
    setReceiveReceiver(currentUser?.name || 'Karim Ben Salem');
    setReceiveItemsState(
      items.map(it => ({
        itemId: it.id,
        ingredientId: it.ingredient_id,
        quantity: it.suggested_quantity,
        unitCost: it.unit_cost,
        selected: true,
      }))
    );
  };

  // Confirm Receipt and convert items to Deliveries
  const handleConfirmReceive = async () => {
    if (!receiveModalOrder) return;
    const selectedItems = receiveItemsState.filter(it => it.selected && it.quantity > 0);

    if (selectedItems.length === 0) {
      showToast('Veuillez sélectionner au moins un article avec une quantité reçue positive.', 'error');
      return;
    }

    setIsReceivingSubmitting(true);
    try {
      // 1. Add deliveries via StockContext addDelivery
      for (const item of selectedItems) {
        await addDelivery({
          ingredient_id: item.ingredientId,
          supplier_id: receiveModalOrder.supplier_id,
          quantity: item.quantity,
          unit_cost: item.unitCost,
          date: receiveDate,
          received_by: receiveReceiver,
          notes: `${receiveBlNumber} (Réception PO #${receiveModalOrder.id.slice(0, 8)})`,
        });
      }

      // 2. Mark order as received
      const receivedTime = new Date().toISOString();
      setPurchaseOrders(prev =>
        prev.map(o =>
          o.id === receiveModalOrder.id
            ? { ...o, status: 'received', received_at: receivedTime }
            : o
        )
      );

      if (supabase && isPoTableAvailable) {
        try {
          await supabase
            .from('purchase_orders')
            .update({ status: 'received', received_at: receivedTime })
            .eq('id', receiveModalOrder.id);
        } catch (e) {
          console.warn('Failed to update PO status in Supabase:', e);
        }
      }

      showToast(
        `Commande réceptionnée ! ${selectedItems.length} livraison(s) enregistrée(s) en stock avec mise à jour immédiate.`,
        'success'
      );
      setReceiveModalOrder(null);
    } catch (err: unknown) {
      console.error('Error receiving purchase order:', err);
      showToast(`Erreur lors de la réception : ${getErrorMessage(err)}`, 'error');
    } finally {
      setIsReceivingSubmitting(false);
    }
  };

  const getStatusBadge = (status: PurchaseOrderStatus) => {
    switch (status) {
      case 'draft':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-sand/30 text-navy border border-sand">
            <Clock className="w-3 h-3 text-sand-dark" />
            Brouillon
          </span>
        );
      case 'sent':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-terracotta/15 text-terracotta border border-terracotta/30">
            <Send className="w-3 h-3 text-terracotta" />
            Envoyé
          </span>
        );
      case 'received':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-success/15 text-success border border-success/30">
            <CheckCircle2 className="w-3 h-3 text-success" />
            Réceptionné
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Action Header */}
      <div className="bg-white rounded-2xl border border-sand p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-navy text-sand flex items-center justify-center shadow-xs">
            <ShoppingCart className="w-6 h-6 text-terracotta" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-terracotta">
                Gestion des Achats & Approvisionnement
              </span>
              {isSupabaseConnected && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-success/10 text-success border border-success/20">
                  Supabase Live
                </span>
              )}
            </div>
            <h2 className="text-xl font-bold text-navy">
              Bons de Commande Fournisseurs (PO)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Calcul automatique basé sur les seuils d'alerte, groupement par fournisseur habituel et conversion directe en BL.
            </p>
          </div>
        </div>

        {/* Generate Action Button */}
        <button
          id="btn-generate-po"
          onClick={handleGenerateOrders}
          disabled={isGenerating}
          className="w-full md:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-terracotta hover:bg-terracotta-hover text-white font-bold text-xs uppercase tracking-wider shadow-sm transition-all disabled:opacity-50"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Analyse des stocks...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              Générer les Commandes Suggérées
            </>
          )}
        </button>
      </div>

      {/* Supabase Schema Migration Notice if table is missing in Supabase */}
      {!isPoTableAvailable && isSupabaseConnected && (
        <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-900 space-y-3 shadow-xs">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold text-amber-950 text-sm">
                Stockage local actif (Table Supabase <code className="bg-amber-100 px-1 py-0.5 rounded font-mono text-xs">purchase_orders</code> en attente de migration)
              </p>
              <p className="text-xs text-amber-800 leading-relaxed">
                Vos bons de commande sont actuellement sauvegardés sur votre appareil sans aucune perte de données. Pour synchroniser avec PostgreSQL et vos autres postes de travail, exécutez le script SQL ci-dessous dans Supabase.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-amber-200">
            <button
              type="button"
              onClick={handleCopySQL}
              className="px-3 py-2 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors shadow-xs"
            >
              {copiedSQL ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copiedSQL ? 'Script SQL copié !' : 'Copier le script SQL'}</span>
            </button>
            <button
              type="button"
              onClick={handleRetrySync}
              disabled={isRetryingSync}
              className="px-3 py-2 bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${isRetryingSync ? 'animate-spin' : ''}`} />
              <span>{isRetryingSync ? 'Vérification...' : 'Vérifier & synchroniser'}</span>
            </button>
            <a
              href="https://supabase.com/dashboard/project/atcpmlaijqxvehuwacpc/sql/new"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-amber-900 underline hover:text-amber-950 font-semibold ml-auto"
            >
              Ouvrir Supabase SQL Editor →
            </a>
          </div>
        </div>
      )}

      {/* Main Content Layout: Left list, Right detail */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Orders List & Filter */}
        <div className="lg:col-span-5 space-y-4">
          {/* Status Filter Tabs */}
          <div className="bg-white rounded-2xl border border-sand p-2 shadow-xs flex items-center gap-1 text-xs">
            <button
              onClick={() => setStatusFilter('all')}
              className={`flex-1 py-1.5 px-2 rounded-xl font-bold transition-colors ${
                statusFilter === 'all'
                  ? 'bg-navy text-white shadow-xs'
                  : 'text-slate-600 hover:text-navy hover:bg-cream'
              }`}
            >
              Tous ({purchaseOrders.length})
            </button>
            <button
              onClick={() => setStatusFilter('draft')}
              className={`flex-1 py-1.5 px-2 rounded-xl font-bold transition-colors ${
                statusFilter === 'draft'
                  ? 'bg-navy text-white shadow-xs'
                  : 'text-slate-600 hover:text-navy hover:bg-cream'
              }`}
            >
              Brouillons ({purchaseOrders.filter(o => o.status === 'draft').length})
            </button>
            <button
              onClick={() => setStatusFilter('sent')}
              className={`flex-1 py-1.5 px-2 rounded-xl font-bold transition-colors ${
                statusFilter === 'sent'
                  ? 'bg-navy text-white shadow-xs'
                  : 'text-slate-600 hover:text-navy hover:bg-cream'
              }`}
            >
              Envoyés ({purchaseOrders.filter(o => o.status === 'sent').length})
            </button>
            <button
              onClick={() => setStatusFilter('received')}
              className={`flex-1 py-1.5 px-2 rounded-xl font-bold transition-colors ${
                statusFilter === 'received'
                  ? 'bg-navy text-white shadow-xs'
                  : 'text-slate-600 hover:text-navy hover:bg-cream'
              }`}
            >
              Reçus ({purchaseOrders.filter(o => o.status === 'received').length})
            </button>
          </div>

          {/* Orders Cards List */}
          {filteredOrders.length === 0 ? (
            <div className="bg-white rounded-2xl border border-sand p-8 text-center shadow-xs">
              <ShoppingCart className="w-10 h-10 text-sand-dark mx-auto mb-3 opacity-60" />
              <h4 className="text-sm font-bold text-navy">Aucun bon de commande trouvé</h4>
              <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                Cliquez sur "Générer les Commandes Suggérées" pour créer des brouillons automatiques selon les niveaux de stock actuels.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredOrders.map(order => {
                const isSelected = order.id === selectedOrderId;
                const supplierName = suppliersMap.get(order.supplier_id) || 'Fournisseur inconnu';
                const itemsCount = orderItems.filter(i => i.purchase_order_id === order.id).length;
                const orderTotal = orderItems
                  .filter(i => i.purchase_order_id === order.id)
                  .reduce((sum, it) => sum + it.suggested_quantity * it.unit_cost, 0);

                return (
                  <div
                    key={order.id}
                    id={`po-card-${order.id}`}
                    onClick={() => setSelectedOrderId(order.id)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-xs ${
                      isSelected
                        ? 'bg-linen/60 border-terracotta ring-1 ring-terracotta/40'
                        : 'bg-white border-sand hover:border-sand-dark'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-terracotta" />
                        <span className="text-sm font-bold text-navy">{supplierName}</span>
                      </div>
                      {getStatusBadge(order.status)}
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-sand/60">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>{new Date(order.created_at).toLocaleDateString('fr-FR')}</span>
                        <span className="text-sand-dark">•</span>
                        <span>{itemsCount} article(s)</span>
                      </div>
                      <div className="font-bold font-mono text-navy">
                        {formatCurrency(orderTotal)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Order Detail View */}
        <div className="lg:col-span-7">
          {!activeOrder ? (
            <div className="bg-white rounded-2xl border border-sand p-12 text-center shadow-xs flex flex-col items-center justify-center min-h-[380px]">
              <FileText className="w-12 h-12 text-sand-dark opacity-50 mb-3" />
              <h3 className="text-base font-bold text-navy">Sélectionnez un bon de commande</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm">
                Sélectionnez une commande dans la liste de gauche pour afficher ses lignes détaillées, modifier les quantités, l'exporter pour WhatsApp ou enregistrer sa réception.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-sand shadow-xs overflow-hidden">
              {/* Detail Header */}
              <div className="p-6 bg-linen/40 border-b border-sand">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                        PO #{activeOrder.id.slice(0, 8).toUpperCase()}
                      </span>
                      {getStatusBadge(activeOrder.status)}
                    </div>
                    <h3 className="text-lg font-bold text-navy">
                      {suppliersMap.get(activeOrder.supplier_id) || 'Fournisseur inconnu'}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Créé le {new Date(activeOrder.created_at).toLocaleString('fr-FR')} par{' '}
                      <span className="font-semibold text-navy">{activeOrder.created_by}</span>
                    </p>
                  </div>

                  {/* Top Action Buttons (WhatsApp & Sent/Received) */}
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      id="btn-send-whatsapp-direct"
                      onClick={() => handleSendWhatsAppDirect(activeOrder, activeOrderItems)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors shadow-2xs"
                      title="Ouvrir directement WhatsApp avec le message pré-rempli pour le fournisseur"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-white" />
                      <span>Envoyer WhatsApp</span>
                    </button>

                    <button
                      id="btn-copy-whatsapp"
                      onClick={() => handleCopyAsText(activeOrder, activeOrderItems)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-cream text-navy border border-sand text-xs font-bold transition-colors shadow-2xs"
                      title="Copier le bon de commande formaté pour WhatsApp"
                    >
                      {copiedOrderId === activeOrder.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-success" />
                          <span className="text-success">Copié !</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-terracotta" />
                          <span>Copier Texte</span>
                        </>
                      )}
                    </button>

                    {activeOrder.status === 'draft' && (
                      <button
                        id="btn-mark-sent"
                        onClick={() => handleMarkAsSent(activeOrder.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-navy hover:bg-navy-mid text-white text-xs font-bold transition-colors shadow-2xs"
                      >
                        <Send className="w-3.5 h-3.5 text-sand" />
                        <span>Marquer Envoyé</span>
                      </button>
                    )}

                    {activeOrder.status !== 'received' && (
                      <button
                        id="btn-mark-received"
                        onClick={() => handleOpenReceiveModal(activeOrder)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-success hover:bg-success/90 text-white text-xs font-bold transition-colors shadow-2xs"
                      >
                        <Truck className="w-3.5 h-3.5" />
                        <span>Marquer Reçu (BL)</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Sent / Received Timestamps if available */}
                {(activeOrder.sent_at || activeOrder.received_at) && (
                  <div className="mt-3 pt-3 border-t border-sand/60 flex flex-wrap items-center gap-4 text-xs text-slate-500">
                    {activeOrder.sent_at && (
                      <div className="flex items-center gap-1">
                        <Send className="w-3 h-3 text-terracotta" />
                        <span>Envoyé le : {new Date(activeOrder.sent_at).toLocaleDateString('fr-FR')}</span>
                      </div>
                    )}
                    {activeOrder.received_at && (
                      <div className="flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-success" />
                        <span>Réceptionné le : {new Date(activeOrder.received_at).toLocaleDateString('fr-FR')}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Items Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-cream/50 text-slate-500 uppercase tracking-wider font-bold border-b border-sand">
                    <tr>
                      <th className="py-3 px-4">Ingrédient</th>
                      <th className="py-3 px-3 text-right">Stock Actuel</th>
                      <th className="py-3 px-3 text-right">Quantité Suggérée</th>
                      <th className="py-3 px-3 text-right">Prix Unitaire</th>
                      <th className="py-3 px-3 text-right">Total Ligne</th>
                      {activeOrder.status === 'draft' && (
                        <th className="py-3 px-3 text-center">Action</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-sand/60">
                    {activeOrderItems.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-6 text-center text-slate-400">
                          Aucun article dans cette commande
                        </td>
                      </tr>
                    ) : (
                      activeOrderItems.map(item => {
                        const ing = ingredientsMap.get(item.ingredient_id);
                        const lineTotal = item.suggested_quantity * item.unit_cost;

                        return (
                          <tr key={item.id} className="hover:bg-cream/30 transition-colors">
                            <td className="py-3 px-4">
                              <div className="font-bold text-navy">{ing?.name || 'Ingrédient'}</div>
                              <div className="text-[11px] text-slate-400">
                                Seuil min : {ing?.min_alert_threshold ?? '—'} {ing?.unit}
                              </div>
                            </td>
                            <td className="py-3 px-3 text-right font-mono text-slate-600">
                              {ing?.current_stock ?? '—'} {ing?.unit}
                            </td>
                            <td className="py-3 px-3 text-right">
                              {activeOrder.status === 'draft' ? (
                                <div className="inline-flex items-center gap-1 justify-end">
                                  <input
                                    type="number"
                                    step="0.1"
                                    min="0"
                                    value={item.suggested_quantity}
                                    onChange={e =>
                                      handleUpdateItemQuantity(item.id, parseFloat(e.target.value) || 0)
                                    }
                                    className="w-20 px-2 py-1 bg-white border border-sand rounded-lg text-right font-mono text-xs font-bold text-navy focus:outline-none focus:border-terracotta"
                                  />
                                  <span className="text-slate-500 text-[11px]">{ing?.unit}</span>
                                </div>
                              ) : (
                                <span className="font-mono font-bold text-navy">
                                  {item.suggested_quantity} {ing?.unit}
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-3 text-right font-mono">
                              {activeOrder.status === 'draft' ? (
                                <input
                                  type="number"
                                  step="0.05"
                                  min="0"
                                  value={item.unit_cost}
                                  onChange={e =>
                                    handleUpdateItemCost(item.id, parseFloat(e.target.value) || 0)
                                  }
                                  className="w-20 px-2 py-1 bg-white border border-sand rounded-lg text-right font-mono text-xs font-bold text-navy focus:outline-none focus:border-terracotta"
                                />
                              ) : (
                                formatCurrency(item.unit_cost)
                              )}
                            </td>
                            <td className="py-3 px-3 text-right font-mono font-bold text-navy">
                              {formatCurrency(lineTotal)}
                            </td>
                            {activeOrder.status === 'draft' && (
                              <td className="py-3 px-3 text-center">
                                <button
                                  onClick={() => handleDeleteItem(item.id)}
                                  className="p-1 rounded text-slate-400 hover:text-alert hover:bg-alert/10 transition-colors"
                                  title="Supprimer cette ligne"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            )}
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Detail Footer with Total */}
              <div className="p-4 bg-cream/40 border-t border-sand flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Total Estimé de la Commande
                </span>
                <div className="text-lg font-bold font-mono text-navy">
                  {formatCurrency(activeOrderTotal)}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MODAL: Prompt to convert PO items into Deliveries when Marked "Received" */}
      {receiveModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-4 animate-fade-in">
          <div className="bg-cream rounded-2xl max-w-2xl w-full max-h-[92vh] overflow-hidden shadow-2xl border border-sand flex flex-col">
            {/* Header */}
            <div className="p-5 bg-navy text-white flex items-center justify-between">
              <div>
                <span className="font-bold text-xs uppercase tracking-wider text-terracotta block">
                  Réception de Commande (Stock IN)
                </span>
                <h3 className="text-base font-bold text-white">
                  Convertir en Bon de Livraison (BL) — {suppliersMap.get(receiveModalOrder.supplier_id)}
                </h3>
              </div>
              <button
                onClick={() => setReceiveModalOrder(null)}
                className="text-sand/70 hover:text-white p-1 rounded-lg transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Form & Items List */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-navy uppercase tracking-wider mb-1">
                    N° Bon de Livraison (BL)
                  </label>
                  <input
                    type="text"
                    value={receiveBlNumber}
                    onChange={e => setReceiveBlNumber(e.target.value)}
                    placeholder="BL-XXXXX"
                    className="w-full px-3 py-2 bg-white border border-sand rounded-xl text-xs font-semibold text-navy focus:outline-none focus:border-terracotta"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-navy uppercase tracking-wider mb-1">
                    Date de Réception
                  </label>
                  <input
                    type="date"
                    value={receiveDate}
                    onChange={e => setReceiveDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-sand rounded-xl text-xs font-semibold text-navy focus:outline-none focus:border-terracotta"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-navy uppercase tracking-wider mb-1">
                    Réceptionné Par
                  </label>
                  <input
                    type="text"
                    value={receiveReceiver}
                    onChange={e => setReceiveReceiver(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-sand rounded-xl text-xs font-semibold text-navy focus:outline-none focus:border-terracotta"
                  />
                </div>
              </div>

              <div>
                <span className="text-xs font-bold text-navy uppercase tracking-wider block mb-2">
                  Articles Reçus (Pré-remplis d'après le bon de commande) :
                </span>
                <div className="border border-sand rounded-xl overflow-hidden bg-white">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-cream text-slate-500 font-bold border-b border-sand">
                      <tr>
                        <th className="py-2.5 px-3">Inclure</th>
                        <th className="py-2.5 px-3">Ingrédient</th>
                        <th className="py-2.5 px-3 text-right">Qté Reçue</th>
                        <th className="py-2.5 px-3 text-right">Coût Unitaire (DT)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-sand/50">
                      {receiveItemsState.map((item, idx) => {
                        const ing = ingredientsMap.get(item.ingredientId);
                        return (
                          <tr key={item.itemId} className="hover:bg-cream/20">
                            <td className="py-2.5 px-3">
                              <input
                                type="checkbox"
                                checked={item.selected}
                                onChange={e => {
                                  const updated = [...receiveItemsState];
                                  updated[idx].selected = e.target.checked;
                                  setReceiveItemsState(updated);
                                }}
                                className="w-4 h-4 rounded text-terracotta focus:ring-terracotta border-sand"
                              />
                            </td>
                            <td className="py-2.5 px-3 font-semibold text-navy">
                              {ing?.name || 'Ingrédient'} ({ing?.unit})
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <input
                                type="number"
                                step="0.1"
                                min="0"
                                value={item.quantity}
                                onChange={e => {
                                  const updated = [...receiveItemsState];
                                  updated[idx].quantity = parseFloat(e.target.value) || 0;
                                  setReceiveItemsState(updated);
                                }}
                                className="w-24 px-2 py-1 bg-cream/30 border border-sand rounded-lg text-right font-mono font-bold text-navy text-xs focus:outline-none focus:border-terracotta"
                              />
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <input
                                type="number"
                                step="0.05"
                                min="0"
                                value={item.unitCost}
                                onChange={e => {
                                  const updated = [...receiveItemsState];
                                  updated[idx].unitCost = parseFloat(e.target.value) || 0;
                                  setReceiveItemsState(updated);
                                }}
                                className="w-24 px-2 py-1 bg-cream/30 border border-sand rounded-lg text-right font-mono font-bold text-navy text-xs focus:outline-none focus:border-terracotta"
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="p-4 bg-white border-t border-sand flex items-center justify-between">
              <button
                type="button"
                onClick={() => setReceiveModalOrder(null)}
                className="px-4 py-2 bg-cream hover:bg-linen text-navy text-xs font-bold rounded-xl border border-sand transition-colors"
              >
                Annuler
              </button>
              <button
                id="btn-confirm-delivery-po"
                type="button"
                disabled={isReceivingSubmitting}
                onClick={handleConfirmReceive}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-success hover:bg-success/90 text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-xs transition-colors disabled:opacity-50"
              >
                {isReceivingSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Enregistrement...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Valider et Créer les Livraisons (Stock IN)
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
