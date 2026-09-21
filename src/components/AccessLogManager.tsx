import React, { useState } from 'react';
import { 
  Key, 
  DoorOpen, 
  Clock, 
  AlertTriangle, 
  User, 
  Plus, 
  Filter, 
  Trash2, 
  CheckCircle2,
  ShieldAlert
} from 'lucide-react';
import { useStock } from '../context/StockContext';
import { AccessLog } from '../types';

export const AccessLogManager: React.FC = () => {
  const { accessLogs, staff, addAccessLog, checkOutAccessLog, deleteAccessLog } = useStock();

  const [selectedStaff, setSelectedStaff] = useState<string>(staff[0]?.name || 'Omar Sellemi');
  const [selectedLocation, setSelectedLocation] = useState<string>('Chambre Froide Poissons');
  const [actionType, setActionType] = useState<'entry' | 'exit'>('entry');
  const [timestamp, setTimestamp] = useState<string>(() => {
    const now = new Date();
    return now.toISOString().slice(0, 16);
  });
  const [notes, setNotes] = useState<string>('');
  const [filterLocation, setFilterLocation] = useState<string>('all');
  const [filterStaff, setFilterStaff] = useState<string>('all');
  const [showAddForm, setShowAddForm] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const ITEMS_PER_PAGE = 15;

  const locations = [
    'Chambre Froide Poissons',
    'Chambre Froide Viandes & Grillades',
    'Cave des Vins & Bar Grotte',
    'Économat Sécable & Huiles',
    'Réserve Boissons & Fûts',
  ];

  const getLogTimestamp = (log: AccessLog): string => {
    if (log.timestamp) return log.timestamp;
    if (log.timestamp_in) return log.timestamp_in.replace('T', ' ');
    return '';
  };

  const getLogStaffName = (log: AccessLog): string => {
    if (log.staff_name) return log.staff_name;
    const stf = staff.find(s => s && (s.id === log.staff_id || (s.name && s.name.toLowerCase() === log.staff_id?.toLowerCase())));
    return stf ? stf.name : log.staff_id || 'Personnel';
  };

  const handleCreateLog = (e: React.FormEvent) => {
    e.preventDefault();
    const staffMember = staff.find(s => s && s.name === selectedStaff);
    addAccessLog({
      staff_id: staffMember?.id || 'stf-1',
      staff_name: selectedStaff,
      location: selectedLocation,
      action: actionType,
      timestamp_in: timestamp.includes('T') ? timestamp : timestamp.replace(' ', 'T'),
      timestamp: timestamp.replace('T', ' '),
      notes: notes.trim() !== '' ? notes.trim() : undefined,
    });

    setSuccessMsg(true);
    setNotes('');
    setTimeout(() => {
      setSuccessMsg(false);
      setShowAddForm(false);
    }, 1200);
  };

  const filteredLogs = [...accessLogs].filter(log => {
    const staffName = getLogStaffName(log);
    if (filterLocation !== 'all' && log.location !== filterLocation) return false;
    if (filterStaff !== 'all' && staffName !== filterStaff) return false;
    return true;
  }).sort((a, b) => {
    const timeA = getLogTimestamp(a);
    const timeB = getLogTimestamp(b);
    return (timeB || '').localeCompare(timeA || '');
  });

  // Count late night accesses (after 23h or before 07h)
  const lateNightLogs = filteredLogs.filter(log => {
    const ts = getLogTimestamp(log);
    const timePart = ts.includes(' ') ? ts.split(' ')[1] : (ts.includes('T') ? ts.split('T')[1] : '');
    const hour = parseInt(timePart.split(':')[0] || '12', 10);
    return hour >= 23 || hour < 7;
  });

  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / ITEMS_PER_PAGE));
  const paginatedLogs = filteredLogs.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header & Metrics Banner */}
      <div className="bg-white rounded-2xl border border-sand p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-navy text-terracotta shadow-xs">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-navy uppercase tracking-wide">
                  Registre des Accès Réserves & Chambres Froides
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cream text-navy border border-sand uppercase tracking-wider">
                  Badgeage Électronique
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Audit horodaté des ouvertures de portes pour corréler les variances de stock avec les présences en chambre froide.
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowAddForm(prev => !prev)}
            className="px-4 py-2.5 bg-navy hover:bg-navy-mid text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-colors shadow-xs"
          >
            <Plus className="w-4 h-4 text-terracotta" />
            {showAddForm ? 'Fermer le formulaire' : 'Badger un passage'}
          </button>
        </div>

        {/* Quick KPI stats row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-5 pt-4 border-t border-sand">
          <div className="p-3.5 bg-cream rounded-xl border border-sand">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              Total Passages Enregistrés
            </span>
            <span className="text-lg font-bold font-mono text-navy tabular-nums mt-0.5 block">
              {accessLogs.length} passages
            </span>
          </div>

          <div className="p-3.5 bg-alert/5 rounded-xl border border-alert/20">
            <span className="text-[10px] font-bold text-alert uppercase tracking-wider block flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-alert" />
              Accès Nocturnes / Suspects (23h - 07h)
            </span>
            <span className="text-lg font-bold font-mono text-alert tabular-nums mt-0.5 block">
              {lateNightLogs.length} passages hors service
            </span>
          </div>

          <div className="p-3.5 bg-cream rounded-xl border border-sand">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              Collaborateurs Autorisés
            </span>
            <span className="text-lg font-bold font-mono text-navy tabular-nums mt-0.5 block">
              {staff.filter(s => s.active).length} actifs
            </span>
          </div>
        </div>
      </div>

      {/* Badge Entry Form (Collapsible) */}
      {showAddForm && (
        <div className="bg-white rounded-2xl border border-sand p-5 shadow-sm">
          <div className="flex items-center gap-2 pb-3 mb-4 border-b border-sand">
            <DoorOpen className="w-4 h-4 text-terracotta" />
            <h3 className="text-xs font-bold text-navy uppercase tracking-wider">
              Enregistrer un mouvement de badge (Borne / Tablette Réserve)
            </h3>
          </div>

          <form onSubmit={handleCreateLog} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-slate-600 font-bold uppercase tracking-wider text-[10px] mb-1">
                  Collaborateur *
                </label>
                <select
                  value={selectedStaff}
                  onChange={e => setSelectedStaff(e.target.value)}
                  className="w-full bg-cream border border-sand rounded-xl px-3 py-2 text-xs text-navy font-semibold focus:outline-none focus:ring-1 focus:ring-navy"
                  required
                >
                  {staff.map(s => (
                    <option key={s.id} value={s.name}>
                      {s.name} ({s.role})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-600 font-bold uppercase tracking-wider text-[10px] mb-1">
                  Zone / Local *
                </label>
                <select
                  value={selectedLocation}
                  onChange={e => setSelectedLocation(e.target.value)}
                  className="w-full bg-cream border border-sand rounded-xl px-3 py-2 text-xs text-navy focus:outline-none focus:ring-1 focus:ring-navy"
                  required
                >
                  {locations.map(loc => (
                    <option key={loc} value={loc}>
                      {loc}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-600 font-bold uppercase tracking-wider text-[10px] mb-1">
                  Action *
                </label>
                <div className="grid grid-cols-2 gap-1 p-0.5 bg-cream rounded-xl border border-sand">
                  <button
                    type="button"
                    onClick={() => setActionType('entry')}
                    className={`py-1.5 rounded-lg text-xs font-bold transition-colors ${
                      actionType === 'entry' ? 'bg-navy text-white shadow-2xs' : 'text-slate-600'
                    }`}
                  >
                    Entrée
                  </button>
                  <button
                    type="button"
                    onClick={() => setActionType('exit')}
                    className={`py-1.5 rounded-lg text-xs font-bold transition-colors ${
                      actionType === 'exit' ? 'bg-navy text-white shadow-2xs' : 'text-slate-600'
                    }`}
                  >
                    Sortie
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-bold uppercase tracking-wider text-[10px] mb-1">
                  Date et Heure du passage *
                </label>
                <input
                  type="datetime-local"
                  value={timestamp}
                  onChange={e => setTimestamp(e.target.value)}
                  className="w-full bg-cream border border-sand rounded-xl px-3 py-2 text-xs text-navy focus:outline-none focus:ring-1 focus:ring-navy"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-600 font-bold uppercase tracking-wider text-[10px] mb-1">
                Motif / Justification du passage (Optionnel)
              </label>
              <input
                type="text"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Ex: Réassort bar pour soirée, mise en place poissons du port..."
                className="w-full bg-cream border border-sand rounded-xl px-3 py-2 text-xs text-navy focus:outline-none focus:ring-1 focus:ring-navy"
              />
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-sand">
              {successMsg ? (
                <div className="flex items-center gap-1.5 text-success text-xs font-bold">
                  <CheckCircle2 className="w-4 h-4 text-success" />
                  Passage enregistré avec succès !
                </div>
              ) : (
                <div className="text-xs text-slate-500">
                  L'horodatage sera horodaté dans la chaîne d'audit de sécurité.
                </div>
              )}

              <button
                type="submit"
                className="px-5 py-2.5 bg-navy hover:bg-navy-mid text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-xs transition-colors"
              >
                Confirmer le badgeage
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Access Logs Table with Filter Controls */}
      <div className="bg-white rounded-2xl border border-sand shadow-xs overflow-hidden">
        <div className="p-4 border-b border-sand flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-cream">
          <div>
            <h3 className="text-xs font-bold text-navy uppercase tracking-wider">
              Journal d'audit des accès ({filteredLogs.length} passages)
            </h3>
            <p className="text-[11px] text-slate-500">
              Les passages en horaires de fermeture ou nuit sont mis en exergue.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <div className="flex items-center gap-1.5 bg-white border border-sand px-3 py-1.5 rounded-xl">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={filterLocation}
                onChange={e => setFilterLocation(e.target.value)}
                className="bg-transparent border-none text-xs font-semibold text-navy focus:outline-none"
              >
                <option value="all">Toutes les zones</option>
                {locations.map(loc => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5 bg-white border border-sand px-3 py-1.5 rounded-xl">
              <User className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={filterStaff}
                onChange={e => setFilterStaff(e.target.value)}
                className="bg-transparent border-none text-xs font-semibold text-navy focus:outline-none"
              >
                <option value="all">Tous collaborateurs</option>
                {staff.map(s => (
                  <option key={s.id} value={s.name}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-cream border-b border-sand text-slate-600 font-bold text-[11px] uppercase tracking-wider">
                <th className="py-3 px-4">Date & Heure</th>
                <th className="py-3 px-3">Collaborateur</th>
                <th className="py-3 px-3">Local Sécurisé</th>
                <th className="py-3 px-3 text-center">Type</th>
                <th className="py-3 px-3">Motif / Justification</th>
                <th className="py-3 px-3">Alerte Audit</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sand/60">
              {paginatedLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    Aucun passage enregistré pour ces filtres.
                  </td>
                </tr>
              ) : (
                paginatedLogs.map(log => {
                  const timeStr = getLogTimestamp(log);
                  const staffName = getLogStaffName(log);
                  const timePart = timeStr.includes(' ') ? timeStr.split(' ')[1] : (timeStr.includes('T') ? timeStr.split('T')[1] : '');
                  const hour = parseInt(timePart.split(':')[0] || '12', 10);
                  const isLateNight = hour >= 23 || hour < 7;
                  const staffMember = staff.find(s => s && (s.name === staffName || s.id === log.staff_id));

                  return (
                    <tr key={log.id} className="hover:bg-cream/60 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-navy tabular-nums whitespace-nowrap">
                        {timeStr || 'Non daté'}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-lg bg-navy text-terracotta flex items-center justify-center font-bold text-[10px]">
                            {staffName.charAt(0)}
                          </span>
                          <div>
                            <div className="font-bold text-navy">{staffName}</div>
                            <div className="text-[10px] text-slate-500">{staffMember?.role || 'Équipe'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3 font-medium text-navy">
                        {log.location}
                      </td>
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        {(log.action || 'entry') === 'entry' ? (
                          !log.timestamp_out ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-700 border border-amber-500/30">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                              En zone
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-success/10 text-success border border-success/25">
                              Terminé ({log.timestamp_out.includes('T') ? log.timestamp_out.split('T')[1]?.slice(0, 5) : log.timestamp_out.split(' ')[1]?.slice(0, 5)})
                            </span>
                          )
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-cream text-slate-700 border border-sand">
                            Sortie
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-slate-600 text-[11px] max-w-xs truncate">
                        {log.notes || <span className="text-slate-400 italic">Aucune note</span>}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        {isLateNight ? (
                          <span className="inline-flex items-center gap-1 bg-alert/10 text-alert border border-alert/25 px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                            <AlertTriangle className="w-3 h-3 text-alert" />
                            Accès nocturne ({timePart})
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[10px]">Horaires de service</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          {(!log.timestamp_out && (log.action || 'entry') === 'entry') && (
                            <button
                              onClick={() => checkOutAccessLog(log.id)}
                              className="px-2 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[10px] font-bold tracking-wider transition-colors shadow-2xs"
                              title="Enregistrer la sortie (check-out)"
                            >
                              Sortie
                            </button>
                          )}
                          <button
                            onClick={() => {
                              if (confirm('Supprimer cette entrée de log ?')) {
                                deleteAccessLog(log.id);
                              }
                            }}
                            className="p-1.5 text-slate-400 hover:text-alert rounded-lg transition-colors"
                            title="Supprimer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
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
              Affichage {((currentPage - 1) * ITEMS_PER_PAGE) + 1} à {Math.min(currentPage * ITEMS_PER_PAGE, filteredLogs.length)} sur {filteredLogs.length} passages
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

export default AccessLogManager;
