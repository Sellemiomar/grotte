import React, { useState } from 'react';
import { UploadCloud, TrendingUp, Search, Trash2 } from 'lucide-react';
import { useStock } from '../context/StockContext';

interface SalesManagerProps {
  onOpenImportModal: () => void;
}

export const SalesManager: React.FC<SalesManagerProps> = ({ onOpenImportModal }) => {
  const { sales, menuItems, deleteSale } = useStock();
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 15;

  const filteredSales = sales.filter(s => {
    const item = menuItems.find(m => m.id === s.menu_item_id);
    const name = item ? item.name.toLowerCase() : '';
    const code = item ? item.pos_reference.toLowerCase() : '';
    const src = s.source.toLowerCase();
    const term = searchTerm.toLowerCase();
    return name.includes(term) || code.includes(term) || src.includes(term);
  });

  const totalPortionsSold = sales.reduce((acc, s) => acc + s.quantity_sold, 0);
  const totalPages = Math.max(1, Math.ceil(filteredSales.length / ITEMS_PER_PAGE));
  const paginatedSales = filteredSales.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-sand p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-navy text-terracotta shadow-xs">
            <UploadCloud className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-navy uppercase tracking-wide">
              Ventes Enregistrées par la Caisse (POS)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Tickets caisse synchronisés pour calculer le déstockage théorique via les recettes.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-cream border border-sand px-4 py-2 rounded-xl text-xs flex items-center gap-2.5">
            <TrendingUp className="w-4 h-4 text-success" />
            <div>
              <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">
                Total Portions Vendues
              </span>
              <span className="font-bold text-navy font-mono tabular-nums text-sm">
                {totalPortionsSold} portions
              </span>
            </div>
          </div>

          <button
            onClick={onOpenImportModal}
            className="flex items-center gap-2 px-4 py-2.5 bg-navy hover:bg-navy-mid text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-xs transition-colors"
          >
            <UploadCloud className="w-4 h-4 text-terracotta" />
            Importer Export Caisse
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-sand shadow-xs overflow-hidden">
        <div className="p-4 border-b border-sand flex items-center justify-between gap-3 bg-cream">
          <div className="relative max-w-sm flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Rechercher une vente..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-sand rounded-xl text-navy placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-navy"
            />
          </div>
          <span className="text-xs text-slate-600 font-medium">
            {filteredSales.length} lignes de ventes analysées
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-cream border-b border-sand text-slate-600 font-bold text-[11px] uppercase tracking-wider">
                <th className="py-3 px-4">Date Vente</th>
                <th className="py-3 px-3">Plat / Article Menu</th>
                <th className="py-3 px-3">Code Caisse (POS)</th>
                <th className="py-3 px-3 text-right">Quantité Vendue</th>
                <th className="py-3 px-3">Fichier Source</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sand/60">
              {paginatedSales.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    Aucune vente enregistrée pour cette recherche.
                  </td>
                </tr>
              ) : (
                paginatedSales.map(sale => {
                  const item = menuItems.find(m => m.id === sale.menu_item_id);

                  return (
                    <tr key={sale.id} className="hover:bg-cream/60 transition-colors">
                      <td className="py-3 px-4 font-mono text-slate-500 tabular-nums">
                        {sale.date}
                      </td>
                      <td className="py-3 px-3 font-bold text-navy">
                        {item?.name || 'Article introuvable'}
                      </td>
                      <td className="py-3 px-3 font-mono text-xs text-navy tabular-nums">
                        <span className="bg-cream px-2 py-0.5 rounded-md border border-sand">
                          {item?.pos_reference || '-'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-navy tabular-nums">
                        {sale.quantity_sold}
                      </td>
                      <td className="py-3 px-3 text-slate-500 text-[11px]">
                        {sale.source}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => {
                            if (confirm('Supprimer cette ligne de vente ?')) {
                              deleteSale(sale.id);
                            }
                          }}
                          className="p-1.5 text-slate-400 hover:text-alert rounded-lg transition-colors"
                          title="Supprimer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="p-3.5 bg-cream border-t border-sand flex items-center justify-between text-xs text-slate-600">
            <div>
              Affichage {((currentPage - 1) * ITEMS_PER_PAGE) + 1} à {Math.min(currentPage * ITEMS_PER_PAGE, filteredSales.length)} sur {filteredSales.length} lignes
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 bg-white border border-sand rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 font-medium"
              >
                Précédent
              </button>
              <span className="font-mono text-xs font-bold text-navy">
                Page {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 bg-white border border-sand rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 font-medium"
              >
                Suivant
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SalesManager;
