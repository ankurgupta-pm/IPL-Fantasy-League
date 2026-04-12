import React, { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../utils/api';
import { fmtDate, uid, can, FRANCHISES } from '../utils/helpers';
import { PlayerFormModal, SubstituteModal } from './PlayerModals';
import * as XLSX from 'xlsx';

// Excel helpers
function triggerXlsxDownload(wb, filename) {
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([wbout], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 200);
}

function downloadTemplate(teamName) {
  const ws = XLSX.utils.aoa_to_sheet([
    ['PlayerName', 'Franchise', 'Role', 'EffectiveDate', 'EndDate'],
    ['Virat Kohli', 'RCB', 'Batsman', '2026-03-28', ''],
    ['Jasprit Bumrah', 'MI', 'Bowler', '2026-03-28', ''],
    ['MS Dhoni', 'CSK', 'Wicket-keeper', '2026-03-28', ''],
  ]);
  ws['!cols'] = [{ wch: 25 }, { wch: 12 }, { wch: 16 }, { wch: 15 }, { wch: 12 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Players');
  triggerXlsxDownload(wb, `${teamName.replace(/\s+/g, '_')}_template.xlsx`);
}

function exportTeamToXlsx(teamPlayers, teamName) {
  const rows = teamPlayers.map(p => ({
    PlayerName: p.name,
    Franchise: p.franchise,
    Role: p.role,
    EffectiveDate: p.effectiveDate || '',
    EndDate: p.endDate || '',
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = [{ wch: 25 }, { wch: 12 }, { wch: 16 }, { wch: 15 }, { wch: 12 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Players');
  triggerXlsxDownload(wb, `${teamName.replace(/\s+/g, '_')}_players.xlsx`);
}

function parseExcel(file, callback) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = new Uint8Array(e.target.result);
      const wb = XLSX.read(data, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
      const players = rows
        .map(row => ({
          id: `p_${Date.now()}_${Math.random().toString(36).slice(2)}`,
          name: String(row.PlayerName || row.Name || '').trim(),
          franchise: String(row.Franchise || row.Team || '').toUpperCase().trim(),
          role: String(row.Role || 'Batsman').trim(),
          effectiveDate: String(row.EffectiveDate || row.Date || '').trim(),
          endDate: row.EndDate ? String(row.EndDate).trim() : null,
        }))
        .filter(p => p.name);
      callback(players);
    } catch (err) {
      console.error('Excel parse error:', err);
      callback([]);
    }
  };
  reader.readAsArrayBuffer(file);
}

export default function TeamsPage({ currentUser, showToast }) {
  const [activeTeam, setActiveTeam] = useState('teamA');
  const [players, setPlayers] = useState({ teamA: [], teamB: [] });
  const [subs, setSubs] = useState({ teamA: 0, teamB: 0 });
  const [settings, setSettings] = useState(null);
  const [playerMaster, setPlayerMaster] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showAddPlayer, setShowAddPlayer] = useState(false);
  const [showSubstitute, setShowSubstitute] = useState(null);
  const [editPlayer, setEditPlayer] = useState(null);

  const [searchQ, setSearchQ] = useState('');
  const [filterFranchise, setFilterFranchise] = useState('ALL');

  const fileRef = useRef();

  const canEdit = can(currentUser, 'edit_teams');

  const loadData = useCallback(async () => {
    try {
      const [teamsRes, subsRes, settingsRes, playersRes] = await Promise.all([
        api.getTeams(),
        api.getSubstitutions(),
        api.getSettings(),
        api.getPlayers()
      ]);
      setPlayers(teamsRes.data);
      setSubs(subsRes.data);
      setSettings(settingsRes.data);
      setPlayerMaster(playersRes.data);
      setLoading(false);
    } catch (e) {
      showToast('Failed to load team data', 'error');
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading || !settings) {
    return <div className="text-center py-20 text-slate-400">Loading teams...</div>;
  }

  const teamName = activeTeam === 'teamA' ? settings.teamAName : settings.teamBName;
  const teamPlayers = players[activeTeam] || [];
  const subsUsed = subs[activeTeam] || 0;
  const subsLeft = settings.maxSubstitutions - subsUsed;
  const today = new Date().toISOString().split('T')[0];

  const filteredPlayers = teamPlayers.filter(p => {
    const matchQ = !searchQ || p.name.toLowerCase().includes(searchQ.toLowerCase());
    const matchF = filterFranchise === 'ALL' || p.franchise === filterFranchise;
    return matchQ && matchF;
  });

  const activeCount = teamPlayers.filter(p => !p.endDate || p.endDate >= today).length;

  // Add player
  const addPlayer = async (p) => {
    const newPlayer = { ...p, id: uid() };
    try {
      await api.addTeamPlayer(activeTeam, newPlayer);
      setPlayers(prev => ({ ...prev, [activeTeam]: [...prev[activeTeam], newPlayer] }));
      setShowAddPlayer(false);
      showToast(`${p.name} added to ${teamName}!`);
    } catch (e) {
      showToast('Failed to add player', 'error');
    }
  };

  // Save edit
  const saveEdit = async (p) => {
    try {
      await api.updateTeamPlayer(activeTeam, p.id, p);
      setPlayers(prev => ({ ...prev, [activeTeam]: prev[activeTeam].map(x => x.id === p.id ? p : x) }));
      setEditPlayer(null);
      showToast('Player updated!');
    } catch (e) {
      showToast('Failed to update player', 'error');
    }
  };

  // Remove player
  const removePlayer = async (id) => {
    if (!window.confirm('Remove this player?')) return;
    try {
      await api.deleteTeamPlayer(activeTeam, id);
      setPlayers(prev => ({ ...prev, [activeTeam]: prev[activeTeam].filter(p => p.id !== id) }));
      showToast('Player removed');
    } catch (e) {
      showToast('Failed to remove player', 'error');
    }
  };

  // Substitute
  const doSubstitute = async ({ oldId, oldEndDate, newPlayer }) => {
    try {
      const newPlayerWithId = { ...newPlayer, id: uid() };
      const res = await api.substitutePlayer(activeTeam, {
        oldPlayerId: oldId,
        oldEndDate: oldEndDate,
        newPlayer: newPlayerWithId
      });
      const subNumber = res.data.subNumber;

      setPlayers(prev => ({
        ...prev,
        [activeTeam]: [
          ...prev[activeTeam].map(p => p.id === oldId ? { ...p, endDate: oldEndDate, subOutNumber: subNumber } : p),
          { ...newPlayerWithId, subInNumber: subNumber }
        ]
      }));
      setSubs(prev => ({ ...prev, [activeTeam]: subNumber }));
      setShowSubstitute(null);
      showToast(`Substitution #${subNumber} made!`);
    } catch (e) {
      showToast('Failed to substitute player', 'error');
    }
  };

  // Excel import
  const handleFileUpload = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    parseExcel(f, async (newPlayers) => {
      try {
        await api.bulkImportPlayers(activeTeam, newPlayers);
        setPlayers(prev => ({ ...prev, [activeTeam]: [...prev[activeTeam], ...newPlayers] }));
        showToast(`${newPlayers.length} players imported!`);
      } catch (err) {
        showToast('Failed to import players', 'error');
      }
    });
    e.target.value = '';
  };

  // Excel export
  const exportTeam = () => {
    exportTeamToXlsx(teamPlayers, teamName);
  };

  return (
    <div className="space-y-4" data-testid="teams-page">
      {/* Team Tabs */}
      <div className="flex gap-2" data-testid="team-tabs">
        {[['teamA', settings.teamAName], ['teamB', settings.teamBName]].map(([k, n]) => (
          <button
            key={k}
            onClick={() => { setActiveTeam(k); setSearchQ(''); setFilterFranchise('ALL'); }}
            data-testid={`team-tab-${k}`}
            className={`flex-1 py-3 rounded-lg text-sm font-medium transition-colors ${
              activeTeam === k ? 'bg-green-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            {n} ({k === activeTeam ? activeCount : (players[k] || []).filter(p => !p.endDate || p.endDate >= today).length} active)
          </button>
        ))}
      </div>

      {/* Stats bar */}
      <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700" data-testid="team-stats">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="text-sm text-slate-300">
            <span className="font-semibold text-white">Total Players:</span> {teamPlayers.length}
            <span className="mx-3 text-slate-600">|</span>
            <span className="font-semibold text-white">Substitutions:</span> {subsUsed}/{settings.maxSubstitutions}
          </div>
          
          <div className="flex items-center gap-2 flex-wrap">
            {!canEdit && <span className="text-xs text-amber-400 bg-amber-900/20 px-2 py-1 rounded">👁 Read-only</span>}
            <button onClick={() => downloadTemplate(teamName)} className="text-xs bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded transition-colors" data-testid="download-template-btn">
              ⬇ Template
            </button>
            {canEdit && (
              <button onClick={() => fileRef.current.click()} className="text-xs bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded transition-colors" data-testid="import-btn">
                ⬆ Import
              </button>
            )}
            <button onClick={exportTeam} className="text-xs bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded transition-colors" data-testid="export-team-btn">
              📤 Export
            </button>
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleFileUpload} className="hidden" />
          </div>
        </div>
      </div>

      {/* Search + Franchise filter */}
      <div className="flex gap-2">
        <input
          value={searchQ}
          onChange={e => setSearchQ(e.target.value)}
          placeholder="🔍 Search player by name..."
          className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-green-500"
          data-testid="team-search-input"
        />
        <select
          value={filterFranchise}
          onChange={e => setFilterFranchise(e.target.value)}
          className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-2 text-sm text-white focus:outline-none"
          data-testid="team-franchise-filter"
        >
          <option value="ALL">All Teams</option>
          {FRANCHISES.map(f => <option key={f} value={f}>{f}</option>)}
        </select>
      </div>

      {/* Players list */}
      <div className="space-y-2" data-testid="players-list">
        {filteredPlayers.length === 0 && (
          <div className="text-center py-12 bg-slate-800/30 rounded-lg border border-slate-700">
            <div className="text-4xl mb-3">🔍</div>
            <div className="text-slate-400">
              {teamPlayers.length === 0 ? 'No players yet. Add players or import via Excel.' : 'No players match your search.'}
            </div>
          </div>
        )}
        
        {filteredPlayers.map(p => {
          const ended = p.endDate && p.endDate < today;
          const notStarted = p.effectiveDate && p.effectiveDate > today;
          
          return (
            <div key={p.id} className={`bg-slate-800/50 rounded-lg border border-slate-700 p-4 flex items-center gap-3 transition-all hover:border-slate-600 ${ended ? 'opacity-50' : ''}`} data-testid={`player-card-${p.id}`}>
              {/* Avatar */}
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0 ${
                ended ? 'bg-slate-600' : 'bg-gradient-to-br from-green-500 to-emerald-600'
              }`}>
                {p.name.charAt(0).toUpperCase()}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-white truncate">{p.name}</span>
                  {p.subOutNumber && <span className="bg-red-600 px-1.5 py-0.5 rounded text-xs">Sub -{p.subOutNumber}</span>}
                  {p.subInNumber && <span className="bg-green-600 px-1.5 py-0.5 rounded text-xs">Sub +{p.subInNumber}</span>}
                  {ended && <span className="text-red-400 text-xs">Ended {fmtDate(p.endDate)}</span>}
                  {notStarted && <span className="text-amber-400 text-xs">Starts {fmtDate(p.effectiveDate)}</span>}
                </div>
                <div className="text-xs text-slate-400 mt-0.5">
                  <span className="bg-slate-700 px-1.5 py-0.5 rounded mr-1">{p.franchise}</span>
                  <span className="bg-slate-700 px-1.5 py-0.5 rounded mr-1">{p.role}</span>
                  {p.effectiveDate && <span>· From {fmtDate(p.effectiveDate)}</span>}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1.5 shrink-0">
                {canEdit && !ended && subsLeft > 0 && (
                  <button onClick={() => setShowSubstitute(p)} className="text-xs bg-yellow-700 hover:bg-yellow-600 text-white px-2 py-1 rounded transition-colors" data-testid={`sub-btn-${p.id}`}>
                    Sub
                  </button>
                )}
                {canEdit && (
                  <button onClick={() => setEditPlayer(p)} className="text-xs bg-slate-600 hover:bg-slate-500 text-white px-2 py-1 rounded transition-colors" data-testid={`edit-btn-${p.id}`}>
                    Edit
                  </button>
                )}
                {canEdit && (
                  <button onClick={() => removePlayer(p.id)} className="text-xs bg-red-800 hover:bg-red-700 text-white px-2 py-1 rounded transition-colors" data-testid={`remove-btn-${p.id}`}>
                    ✕
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Player Button */}
      {canEdit && (
        <button
          onClick={() => setShowAddPlayer(true)}
          className="w-full bg-green-700 hover:bg-green-600 text-white py-3 rounded-xl font-medium transition-colors"
          data-testid="add-player-btn"
        >
          + Add Player to {teamName}
        </button>
      )}

      {/* Modals */}
      {canEdit && showAddPlayer && (
        <PlayerFormModal
          onSave={addPlayer}
          onClose={() => setShowAddPlayer(false)}
          title={`Add Player — ${teamName}`}
          playerMaster={playerMaster}
        />
      )}
      {canEdit && editPlayer && (
        <PlayerFormModal
          initial={editPlayer}
          onSave={saveEdit}
          onClose={() => setEditPlayer(null)}
          title="Edit Player"
          playerMaster={playerMaster}
        />
      )}
      {canEdit && showSubstitute && (
        <SubstituteModal
          player={showSubstitute}
          subsLeft={subsLeft}
          onSave={doSubstitute}
          onClose={() => setShowSubstitute(null)}
          playerMaster={playerMaster}
        />
      )}
    </div>
  );
}
