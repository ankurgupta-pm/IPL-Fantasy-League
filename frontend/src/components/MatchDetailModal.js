import React, { useState, useCallback } from 'react';
import { calcPoints, fmtDate, uid, can, FRANCHISES } from '../utils/helpers';
import { api } from '../utils/api';

/* ────────────────────────────────────────────────────
   MatchPlayerTable — renders one team's player rows.
   Kept OUTSIDE the modal so React doesn't re-mount it
   on every render (which would steal input focus).
   ──────────────────────────────────────────────────── */
function MatchPlayerTable({ team, label, players, adj, setAdj, onUpdate, onAdd, onRemove, canEdit, scoring }) {
  const total = players
    .filter(p => p.active !== false)
    .reduce((s, p) => s + (Number(p.points) || 0), 0) + (Number(adj) || 0);

  return (
    <div data-testid={`match-player-table-${team}`}>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-700 text-xs text-slate-400">
            <th className="text-left py-2 pl-2">Player</th>
            <th className="text-center py-2 w-16">Runs</th>
            <th className="text-center py-2 w-16">Wkts</th>
            <th className="text-center py-2 w-16">Pts</th>
            {canEdit && <th className="w-8"></th>}
          </tr>
        </thead>
        <tbody>
          {players.map((p, i) => (
            <tr key={p.id || i} className="border-b border-slate-800/50 hover:bg-slate-700/20">
              <td className="py-2 pl-2">
                <div className="text-white text-sm font-medium">{p.name}</div>
                <div className="text-xs text-slate-500">
                  {p.franchise} · {p.role}
                  {!p.scraped && p.active !== false && (
                    <span className="text-amber-400 ml-1">⚠ Not in scorecard</span>
                  )}
                </div>
              </td>
              <td className="text-center">
                <input
                  type="number"
                  min="0"
                  value={p.runs ?? 0}
                  onChange={e => canEdit && onUpdate(i, 'runs', e.target.value)}
                  onBlur={e => { if (canEdit && isNaN(parseInt(e.target.value, 10))) onUpdate(i, 'runs', 0); }}
                  disabled={p.active === false || !canEdit}
                  className="w-14 bg-slate-700 rounded text-center text-xs py-1 disabled:opacity-30 focus:outline-none focus:ring-1 focus:ring-green-500"
                  data-testid={`runs-input-${team}-${i}`}
                />
              </td>
              <td className="text-center">
                <input
                  type="number"
                  min="0"
                  value={p.wickets ?? 0}
                  onChange={e => canEdit && onUpdate(i, 'wickets', e.target.value)}
                  onBlur={e => { if (canEdit && isNaN(parseInt(e.target.value, 10))) onUpdate(i, 'wickets', 0); }}
                  disabled={p.active === false || !canEdit}
                  className="w-14 bg-slate-700 rounded text-center text-xs py-1 disabled:opacity-30 focus:outline-none focus:ring-1 focus:ring-green-500"
                  data-testid={`wickets-input-${team}-${i}`}
                />
              </td>
              <td className={`text-center font-mono ${p.active === false ? 'text-slate-600' : 'text-green-400'}`}>
                {p.active === false ? '-' : (Number(p.points) || 0)}
              </td>
              {canEdit && (
                <td className="text-center">
                  {p.manual && (
                    <button onClick={() => onRemove(i)} className="text-red-400 hover:text-red-300 text-xs px-1" data-testid={`remove-player-${team}-${i}`}>✕</button>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Manual Adjustment + Add Player */}
      <div className="flex items-center justify-between px-2 py-2 border-t border-slate-700 mt-1">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span>Manual Adj:</span>
          <input
            type="number"
            value={adj}
            onChange={e => canEdit && setAdj(e.target.value)}
            onBlur={e => { if (canEdit && (e.target.value === '' || isNaN(Number(e.target.value)))) setAdj(0); }}
            disabled={!canEdit}
            className="w-16 bg-slate-700 rounded text-center text-xs py-1 disabled:opacity-40 focus:outline-none focus:ring-1 focus:ring-green-500"
            data-testid={`adj-input-${team}`}
          />
        </div>
        {canEdit && (
          <button onClick={() => onAdd()} className="text-xs text-green-400 hover:text-green-300" data-testid={`add-player-${team}`}>+ Add Player</button>
        )}
      </div>

      {/* Total */}
      <div className="flex justify-between px-2 py-2 bg-slate-700/30 rounded-b text-sm font-semibold">
        <span>Total</span>
        <span className="text-green-400" data-testid={`total-${team}`}>{total}</span>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────
   MatchEditModal — edit teams, venue, date for a match
   ──────────────────────────────────────────────────── */
function MatchEditModal({ initial, onSave, onClose }) {
  const [form, setForm] = useState({ ...initial });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const save = () => { if (!form.t1 || !form.t2 || !form.date) return; onSave(form); };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-slate-800 rounded-2xl w-full max-w-md border border-slate-700 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <h3 className="text-lg font-bold">Edit Match</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white" data-testid="match-edit-close">✕</button>
        </div>
        <div className="p-4 space-y-3">
          <div>
            <label className="block text-sm text-slate-300 mb-1">Match No</label>
            <input type="text" value={form.no} onChange={e => set('no', e.target.value)}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white" />
          </div>
          <div>
            <label className="block text-sm text-slate-300 mb-1">Date *</label>
            <input type="date" value={form.date} onChange={e => set('date', e.target.value)}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-slate-300 mb-1">Team 1 *</label>
              <select value={form.t1} onChange={e => set('t1', e.target.value)}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white">
                {[...FRANCHISES, 'TBD'].map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate-300 mb-1">Team 2 *</label>
              <select value={form.t2} onChange={e => set('t2', e.target.value)}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white">
                {[...FRANCHISES, 'TBD'].map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm text-slate-300 mb-1">Venue</label>
            <input type="text" value={form.venue} onChange={e => set('venue', e.target.value)} placeholder="Stadium, City"
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white" />
          </div>
        </div>
        <div className="p-4 border-t border-slate-700 flex gap-3">
          <button onClick={onClose} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2 rounded-lg text-sm" data-testid="match-edit-cancel">Cancel</button>
          <button onClick={save} className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg text-sm font-medium" data-testid="match-edit-save">Update Match</button>
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────
   MatchDetailModal — the full scorecard viewer/editor.
   Shows per-player runs, wickets, points for each team.
   ──────────────────────────────────────────────────── */
export default function MatchDetailModal({ match, matchPoints, teams, settings, onClose, onSave, onRefreshAPI, onRefreshClaude, refreshingId, refreshingMode, currentUser }) {
  const mp = matchPoints[match.id] || {};

  // Deep-copy player arrays for editing
  const [editA, setEditA] = useState(() => JSON.parse(JSON.stringify(mp.teamA?.players || [])));
  const [editB, setEditB] = useState(() => JSON.parse(JSON.stringify(mp.teamB?.players || [])));
  const [adjA, setAdjA] = useState(mp.teamA?.adjustment ?? 0);
  const [adjB, setAdjB] = useState(mp.teamB?.adjustment ?? 0);
  const [dirty, setDirty] = useState(false);
  const [activeTab, setActiveTab] = useState('A');
  const [showEditMatch, setShowEditMatch] = useState(false);
  const [saving, setSaving] = useState(false);

  const canEdit = can(currentUser, 'edit_match_points');
  const canRefresh = can(currentUser, 'refresh_scores');
  const isAdmin = currentUser?.role === 'admin';

  const scoring = settings.scoring;

  // Filter by playing franchises
  const franchises = new Set([match.t1, match.t2]);
  const visibleA = editA.filter(p => franchises.has(p.franchise));
  const visibleB = editB.filter(p => franchises.has(p.franchise));
  const hiddenA = editA.filter(p => !franchises.has(p.franchise));
  const hiddenB = editB.filter(p => !franchises.has(p.franchise));

  // Recalculate points for a player
  const recalcPlayer = useCallback((p) => ({
    ...p,
    points: calcPoints(Number(p.runs) || 0, Number(p.wickets) || 0, scoring),
  }), [scoring]);

  // Update a player field (runs or wickets)
  const onUpdate = useCallback((team, idx, field, rawVal) => {
    setDirty(true);
    const setter = team === 'A' ? setEditA : setEditB;
    setter(prev => {
      const next = [...prev];
      // Find the actual index in the full array (since visibleX is a subset)
      const target = next[idx];
      if (!target) return prev;
      const parsed = rawVal === '' ? '' : (parseInt(rawVal, 10) || 0);
      next[idx] = recalcPlayer({ ...target, [field]: parsed });
      return next;
    });
  }, [recalcPlayer]);

  // Add a manual player
  const onAdd = useCallback((team) => {
    setDirty(true);
    const newP = { id: uid(), name: 'New Player', franchise: match.t1, role: 'Batsman', runs: 0, wickets: 0, points: 0, active: true, manual: true, scraped: false };
    if (team === 'A') setEditA(prev => [...prev, newP]);
    else setEditB(prev => [...prev, newP]);
  }, [match.t1]);

  // Remove a manual player
  const onRemove = useCallback((team, idx) => {
    setDirty(true);
    if (team === 'A') setEditA(prev => prev.filter((_, i) => i !== idx));
    else setEditB(prev => prev.filter((_, i) => i !== idx));
  }, []);

  // Save all changes
  const saveChanges = async () => {
    setSaving(true);
    const sumPts = arr => arr.filter(p => p.active !== false).reduce((s, p) => s + (Number(p.points) || 0), 0);
    const newPoints = {
      matchId: match.id,
      teamA: { players: editA, total: sumPts(editA), adjustment: Number(adjA) || 0 },
      teamB: { players: editB, total: sumPts(editB), adjustment: Number(adjB) || 0 },
      found: true,
      source: mp.source || 'manual',
      lastRefreshed: new Date().toISOString(),
    };
    try {
      await api.updateMatchPoints(match.id, newPoints);
      onSave(match.id, newPoints);
      setDirty(false);
    } catch (e) {
      console.error('Failed to save match points:', e);
    }
    setSaving(false);
  };

  // Save match info (teams, venue, date)
  const saveMatchInfo = async (updatedMatch) => {
    try {
      await api.updateMatch(match.id, updatedMatch);
      setShowEditMatch(false);
      onSave(match.id, null, updatedMatch);
    } catch (e) {
      console.error('Failed to update match:', e);
    }
  };

  const totalA = visibleA.filter(p => p.active !== false).reduce((s, p) => s + (Number(p.points) || 0), 0) + (Number(adjA) || 0);
  const totalB = visibleB.filter(p => p.active !== false).reduce((s, p) => s + (Number(p.points) || 0), 0) + (Number(adjB) || 0);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col border border-slate-700 shadow-2xl" onClick={e => e.stopPropagation()} data-testid="match-detail-modal">
        {/* Header */}
        <div className="p-4 border-b border-slate-700 shrink-0">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="text-lg font-bold text-white" data-testid="match-detail-title">M{match.no}: {match.t1} vs {match.t2}</h3>
              <div className="text-xs text-slate-400">{fmtDate(match.date)} · {match.venue}</div>
              <div className="text-xs text-slate-500 mt-1">
                Showing players from {match.t1} & {match.t2} only
                {(hiddenA.length + hiddenB.length) > 0 && (
                  <span> · {hiddenA.length + hiddenB.length} from other franchises hidden</span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isAdmin && (
                <button onClick={() => setShowEditMatch(true)} className="text-xs bg-slate-700 hover:bg-slate-600 px-2 py-1 rounded" data-testid="edit-match-info-btn">
                  ✏️ Edit Match
                </button>
              )}
              <button onClick={onClose} className="text-slate-400 hover:text-white text-xl" data-testid="match-detail-close">✕</button>
            </div>
          </div>

          {/* Score summary */}
          <div className="grid grid-cols-3 gap-3 mt-3 text-center">
            <div className="bg-blue-900/30 rounded-lg py-2 border border-blue-700/20">
              <div className="text-2xl font-bold text-blue-400" data-testid="modal-total-a">{totalA}</div>
              <div className="text-xs text-slate-400">{settings.teamAName}</div>
            </div>
            <div className="flex items-center justify-center">
              <div className={`text-xl font-mono ${totalA - totalB > 0 ? 'text-green-400' : totalA - totalB < 0 ? 'text-red-400' : 'text-slate-400'}`}>
                {totalA - totalB > 0 ? `+${totalA - totalB}` : totalA - totalB}
              </div>
            </div>
            <div className="bg-purple-900/30 rounded-lg py-2 border border-purple-700/20">
              <div className="text-2xl font-bold text-purple-400" data-testid="modal-total-b">{totalB}</div>
              <div className="text-xs text-slate-400">{settings.teamBName}</div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-700 shrink-0">
          {[['A', settings.teamAName, totalA], ['B', settings.teamBName, totalB]].map(([t, n, tot]) => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              data-testid={`tab-team-${t}`}
              className={`flex-1 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === t ? 'border-green-400 text-green-400' : 'border-transparent text-slate-400 hover:text-slate-300'
              }`}
            >
              {n} ({tot} pts)
            </button>
          ))}
        </div>

        {/* Body — scrollable */}
        <div className="flex-1 overflow-y-auto p-4">
          {!mp.found && !editA.length && !editB.length && (
            <div className="text-center py-10">
              <div className="text-4xl mb-3">🏏</div>
              <div className="text-slate-400">No scorecard data yet. Click Refresh to fetch scores, or manually add players below.</div>
            </div>
          )}

          {activeTab === 'A' && (
            <MatchPlayerTable
              team="A"
              label={settings.teamAName}
              players={visibleA}
              adj={adjA}
              setAdj={v => { setAdjA(v); setDirty(true); }}
              onUpdate={(idx, field, val) => {
                // Map visible index to editA index
                const actualIdx = editA.indexOf(visibleA[idx]);
                if (actualIdx >= 0) onUpdate('A', actualIdx, field, val);
              }}
              onAdd={() => onAdd('A')}
              onRemove={(idx) => {
                const actualIdx = editA.indexOf(visibleA[idx]);
                if (actualIdx >= 0) onRemove('A', actualIdx);
              }}
              canEdit={canEdit}
              scoring={scoring}
            />
          )}

          {activeTab === 'B' && (
            <MatchPlayerTable
              team="B"
              label={settings.teamBName}
              players={visibleB}
              adj={adjB}
              setAdj={v => { setAdjB(v); setDirty(true); }}
              onUpdate={(idx, field, val) => {
                const actualIdx = editB.indexOf(visibleB[idx]);
                if (actualIdx >= 0) onUpdate('B', actualIdx, field, val);
              }}
              onAdd={() => onAdd('B')}
              onRemove={(idx) => {
                const actualIdx = editB.indexOf(visibleB[idx]);
                if (actualIdx >= 0) onRemove('B', actualIdx);
              }}
              canEdit={canEdit}
              scoring={scoring}
            />
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-700 flex items-center justify-between shrink-0">
          <div className="flex gap-2">
            {canRefresh && (
              <>
                <button
                  onClick={() => onRefreshAPI(match)}
                  disabled={refreshingId === match.id}
                  className={`text-xs px-3 py-1.5 rounded transition-colors ${
                    refreshingId === match.id && refreshingMode === 'api'
                      ? 'opacity-50 cursor-not-allowed bg-blue-900/30 text-blue-300'
                      : 'bg-blue-900/40 hover:bg-blue-900/60 text-blue-300'
                  }`}
                  data-testid="modal-refresh-api"
                >
                  {refreshingId === match.id && refreshingMode === 'api' ? '⏳ Fetching...' : '📡 CricketData API'}
                </button>
                <button
                  onClick={() => onRefreshClaude(match)}
                  disabled={refreshingId === match.id}
                  className={`text-xs px-3 py-1.5 rounded transition-colors ${
                    refreshingId === match.id && refreshingMode === 'claude'
                      ? 'opacity-50 cursor-not-allowed bg-purple-900/30 text-purple-300'
                      : 'bg-purple-900/40 hover:bg-purple-900/60 text-purple-300'
                  }`}
                  data-testid="modal-refresh-claude"
                >
                  {refreshingId === match.id && refreshingMode === 'claude' ? '⏳ Searching...' : '🤖 Claude AI'}
                </button>
              </>
            )}
          </div>

          <div className="flex items-center gap-3">
            {mp?.source && (
              <div className="text-xs text-slate-500">
                Last: {mp.source === 'api' ? '📡 API' : mp.source === 'claude' ? '🤖 Claude' : '✏️ Manual'}
                {mp.lastRefreshed ? ` · ${new Date(mp.lastRefreshed).toLocaleTimeString()}` : ''}
              </div>
            )}
            {dirty && canEdit && (
              <button
                onClick={saveChanges}
                disabled={saving}
                className="bg-green-600 hover:bg-green-700 text-white text-sm px-4 py-1.5 rounded-lg font-medium transition-colors disabled:opacity-50"
                data-testid="save-match-points-btn"
              >
                {saving ? '⏳ Saving...' : '💾 Save Changes'}
              </button>
            )}
          </div>
        </div>

        {/* Edit Match Modal */}
        {showEditMatch && (
          <MatchEditModal
            initial={match}
            onSave={saveMatchInfo}
            onClose={() => setShowEditMatch(false)}
          />
        )}
      </div>
    </div>
  );
}
