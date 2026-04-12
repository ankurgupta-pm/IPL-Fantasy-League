import React, { useState } from 'react';
import { PlayerSearchCombobox } from './PlayerSearchCombobox';
import { FRANCHISES, ROLES } from '../utils/helpers';

// Modal for adding/editing a player in a team
export function PlayerFormModal({ initial, onSave, onClose, title, playerMaster }) {
  const [form, setForm] = useState(initial || {
    name: '', franchise: 'RCB', role: 'Batsman',
    effectiveDate: new Date().toISOString().split('T')[0], endDate: ''
  });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handlePlayerSelect = (masterPlayer) => {
    if (!masterPlayer) return;
    setForm(prev => ({
      ...prev,
      name: masterPlayer.name,
      franchise: masterPlayer.franchise,
      role: masterPlayer.role,
    }));
  };

  const save = () => {
    if (!form.name.trim()) return;
    onSave({ ...form, endDate: form.endDate || null });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-slate-800 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto border border-slate-700 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <h3 className="text-lg font-bold text-white">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-lg" data-testid="player-form-close">✕</button>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm text-slate-300 mb-1">Player Name * (search by first or last name)</label>
            <PlayerSearchCombobox
              value={form.name}
              onSelect={handlePlayerSelect}
              playerMaster={playerMaster}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-slate-300 mb-1">Franchise (auto-filled)</label>
              <select value={form.franchise} onChange={e => set('franchise', e.target.value)}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white">
                {FRANCHISES.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate-300 mb-1">Role (auto-filled)</label>
              <select value={form.role} onChange={e => set('role', e.target.value)}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white">
                {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm text-slate-300 mb-1">Effective From *</label>
            <input type="date" value={form.effectiveDate || ''} onChange={e => set('effectiveDate', e.target.value)}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white" />
          </div>

          <div>
            <label className="block text-sm text-slate-300 mb-1">Active Until (optional)</label>
            <input type="date" value={form.endDate || ''} onChange={e => set('endDate', e.target.value || null)}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white" />
          </div>
        </div>

        <div className="p-4 border-t border-slate-700 flex gap-3">
          <button onClick={onClose} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2 rounded-lg text-sm" data-testid="player-form-cancel">Cancel</button>
          <button onClick={save} className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg text-sm font-medium" data-testid="player-form-save">Save Player</button>
        </div>
      </div>
    </div>
  );
}

// Modal for substituting a player
export function SubstituteModal({ player, subsLeft, onSave, onClose, playerMaster }) {
  const today = new Date().toISOString().split('T')[0];
  const [oldEndDate, setOldEndDate] = useState(today);
  const [newPlayer, setNewPlayer] = useState({ name: '', franchise: 'RCB', role: 'Batsman', effectiveDate: today });
  const set = (k, v) => setNewPlayer(p => ({ ...p, [k]: v }));

  const handleNewPlayerSelect = (masterPlayer) => {
    if (!masterPlayer) return;
    setNewPlayer(prev => ({
      ...prev,
      name: masterPlayer.name,
      franchise: masterPlayer.franchise,
      role: masterPlayer.role,
    }));
  };

  const save = () => {
    if (!newPlayer.name.trim()) return;
    onSave({ oldId: player.id, oldEndDate, newPlayer: { ...newPlayer, endDate: null } });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-slate-800 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto border border-slate-700 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <h3 className="text-lg font-bold text-white">Substitute Player</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-lg" data-testid="sub-modal-close">✕</button>
        </div>

        <div className="p-4 space-y-4">
          {/* Outgoing player info */}
          <div className="bg-red-900/20 border border-red-700/30 rounded-lg p-3">
            <div className="text-xs text-red-400 font-semibold mb-1">Replacing</div>
            <div className="text-white font-medium">{player.name}</div>
            <div className="text-xs text-slate-400">{player.franchise} · {player.role}</div>
            <div className="text-xs text-amber-400 mt-2">Substitutions remaining: {subsLeft}</div>
          </div>

          <div>
            <label className="block text-sm text-slate-300 mb-1">Last date {player.name}'s points count</label>
            <input type="date" value={oldEndDate} onChange={e => setOldEndDate(e.target.value)}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white" />
            <div className="text-xs text-amber-400 mt-1">Points will NOT be counted from the next day onwards</div>
          </div>

          {/* Incoming player */}
          <div className="bg-green-900/20 border border-green-700/30 rounded-lg p-3">
            <div className="text-xs text-green-400 font-semibold mb-3">Incoming Player</div>

            <div className="space-y-3">
              <div>
                <label className="block text-sm text-slate-300 mb-1">Player Name * (search or type)</label>
                <PlayerSearchCombobox
                  value={newPlayer.name}
                  onSelect={handleNewPlayerSelect}
                  playerMaster={playerMaster}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Franchise (auto-filled)</label>
                  <select value={newPlayer.franchise} onChange={e => set('franchise', e.target.value)}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white">
                    {FRANCHISES.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Role (auto-filled)</label>
                  <select value={newPlayer.role} onChange={e => set('role', e.target.value)}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white">
                    {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Effective from (points count from this date)</label>
                <input type="date" value={newPlayer.effectiveDate} onChange={e => set('effectiveDate', e.target.value)}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white" />
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-slate-700 flex gap-3">
          <button onClick={onClose} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2 rounded-lg text-sm" data-testid="sub-modal-cancel">Cancel</button>
          <button onClick={save} className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white py-2 rounded-lg text-sm font-medium" data-testid="sub-modal-confirm">Confirm Sub</button>
        </div>
      </div>
    </div>
  );
}

export default PlayerFormModal;
