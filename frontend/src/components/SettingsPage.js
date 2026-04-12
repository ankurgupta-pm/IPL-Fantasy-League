import React, { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../utils/api';

export default function SettingsPage({ currentUser, showToast }) {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const importRef = useRef();

  const isAdmin = currentUser.role === 'admin';

  const loadSettings = useCallback(async () => {
    try {
      const res = await api.getSettings();
      setSettings(res.data);
      setLoading(false);
    } catch (e) {
      showToast('Failed to load settings', 'error');
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const saveSettings = async () => {
    try {
      await api.updateSettings(settings);
      showToast('Settings saved!');
    } catch (e) {
      showToast('Failed to save settings', 'error');
    }
  };

  // ─── BACKUP EXPORT ─────────────────────────────────────────────────────
  // Exports in the EXACT same format as the original JSX prototype.
  // Keys: settings, playerMaster, teamA, teamB, subsA, subsB, matches, matchPoints, users
  const handleExport = async () => {
    try {
      showToast('Preparing backup...');

      const [settingsRes, playersRes, teamsRes, subsRes, matchesRes, pointsRes, usersRes] = await Promise.all([
        api.getSettings(),
        api.getPlayers(),
        api.getTeams(),
        api.getSubstitutions(),
        api.getMatches(),
        api.getAllMatchPoints(),
        api.getUsers()
      ]);

      // Build the backup in original JSX format
      const backup = {
        settings: settingsRes.data,
        playerMaster: playersRes.data,
        teamA: teamsRes.data.teamA || [],
        teamB: teamsRes.data.teamB || [],
        subsA: subsRes.data.teamA || 0,
        subsB: subsRes.data.teamB || 0,
        matches: matchesRes.data,
        matchPoints: pointsRes.data,
        users: usersRes.data
      };

      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ipl_fantasy_backup_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 200);

      showToast('Backup exported successfully!');
    } catch (e) {
      showToast('Failed to export backup: ' + e.message, 'error');
    }
  };

  // ─── BACKUP IMPORT ─────────────────────────────────────────────────────
  // Accepts BOTH the original JSX format (teamA/teamB/subsA/subsB/playerMaster)
  // AND the newer API format (teams.teamA/teams.teamB/substitutions)
  const handleImport = async (file) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = JSON.parse(e.target.result);

        // Detect format: original JSX uses `teamA` at root level,
        // newer API uses `teams: { teamA, teamB }`
        const isJsxFormat = data.teamA !== undefined || data.playerMaster !== undefined;

        let importPayload;

        if (isJsxFormat) {
          // Original JSX prototype format
          importPayload = {
            settings: data.settings || undefined,
            players: data.playerMaster || undefined,
            teams: {
              teamA: data.teamA || [],
              teamB: data.teamB || []
            },
            matches: data.matches || undefined,
            matchPoints: (() => {
              // matchPoints in JSX format is an object keyed by matchId
              // Convert to array for the API
              if (!data.matchPoints) return undefined;
              if (Array.isArray(data.matchPoints)) return data.matchPoints;
              return Object.values(data.matchPoints);
            })(),
            users: data.users || undefined,
            substitutions: {
              teamA: data.subsA || 0,
              teamB: data.subsB || 0
            }
          };
        } else {
          // Newer API format (already in correct shape)
          importPayload = {
            settings: data.settings || undefined,
            players: data.players || undefined,
            teams: data.teams || undefined,
            matches: data.matches || undefined,
            matchPoints: (() => {
              if (!data.matchPoints) return undefined;
              if (Array.isArray(data.matchPoints)) return data.matchPoints;
              return Object.values(data.matchPoints);
            })(),
            users: data.users || undefined,
            substitutions: data.substitutions || undefined
          };
        }

        // Remove undefined keys
        Object.keys(importPayload).forEach(k => {
          if (importPayload[k] === undefined) delete importPayload[k];
        });

        showToast('Importing backup...');
        await api.importBackup(importPayload);

        showToast('Backup imported successfully! Reloading data...');
        // Reload settings
        await loadSettings();
      } catch (err) {
        showToast('Failed to import backup: ' + err.message, 'error');
      }
    };
    reader.readAsText(file);
  };

  if (loading || !settings) {
    return <div className="text-center py-20 text-slate-400">Loading settings...</div>;
  }

  const set = (path, val) => {
    setSettings(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      const keys = path.split('.');
      let obj = next;
      for (let i = 0; i < keys.length - 1; i++) obj = obj[keys[i]];
      obj[keys[keys.length - 1]] = val;
      return next;
    });
  };

  const field = (label, path, hint = '') => {
    const keys = path.split('.');
    let val = settings;
    for (const k of keys) val = val[k];

    return (
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1">{label}</label>
        {hint && <p className="text-xs text-slate-500 mb-1">{hint}</p>}
        <input
          type="number"
          value={val}
          onChange={e => set(path, Number(e.target.value))}
          disabled={!isAdmin}
          className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm disabled:opacity-50"
        />
      </div>
    );
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6" data-testid="settings-page">
      {/* ── Backup & Restore ── */}
      <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700" data-testid="backup-section">
        <div className="flex items-start gap-3 mb-4">
          <div className="text-2xl">💾</div>
          <div>
            <h3 className="text-lg font-bold text-white">Backup & Restore</h3>
            <p className="text-sm text-slate-400 mt-1">
              All changes save automatically to the database. Export a JSON backup before making major changes.
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleExport}
            className="flex-1 bg-green-700 hover:bg-green-600 text-white text-sm py-2.5 px-3 rounded-lg font-medium transition-colors"
            data-testid="export-backup-btn"
          >
            📤 Export JSON Backup
          </button>
          <button
            onClick={() => importRef.current?.click()}
            className="flex-1 bg-slate-600 hover:bg-slate-500 text-white text-sm py-2.5 px-3 rounded-lg font-medium transition-colors"
            data-testid="import-backup-btn"
          >
            📥 Import Backup
          </button>
          <input
            ref={importRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={e => {
              const f = e.target.files[0];
              if (f) { handleImport(f); e.target.value = ''; }
            }}
          />
        </div>

        <div className="mt-3 p-3 bg-blue-900/20 border border-blue-700/30 rounded-lg">
          <p className="text-xs text-blue-300">
            💡 Compatible with backups from your original Claude artifact prototype. Both old and new formats are supported.
          </p>
        </div>
      </div>

      {/* ── Team Names ── */}
      <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
        <h3 className="text-lg font-bold text-white mb-4">Team Names</h3>
        <div className="grid grid-cols-2 gap-4">
          {[['teamAName', 'Your Team Name'], ['teamBName', "Friend's Team Name"]].map(([k, l]) => (
            <div key={k}>
              <label className="block text-sm text-slate-300 mb-1">{l}</label>
              <input
                type="text"
                value={settings[k]}
                onChange={e => set(k, e.target.value)}
                disabled={!isAdmin}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm disabled:opacity-50"
              />
            </div>
          ))}
        </div>

        <div className="mt-4">
          <label className="block text-sm text-slate-300 mb-1">Maximum Substitutions Per Team</label>
          <input
            type="number"
            value={settings.maxSubstitutions}
            onChange={e => set('maxSubstitutions', Number(e.target.value))}
            disabled={!isAdmin}
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm disabled:opacity-50"
          />
        </div>
      </div>

      {/* ── Scoring Rules ── */}
      <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
        <h3 className="text-lg font-bold text-white mb-4">Scoring Rules</h3>
        
        <div className="grid grid-cols-2 gap-4">
          {field('Points per Run', 'scoring.runPoints', 'Each run scored by a batsman')}
          {field('Points per Wicket', 'scoring.wicketPoints', 'Each wicket taken by a bowler')}
          {field('Bonus: 3-4 Wickets in Match', 'scoring.bonus34Wickets', 'Bonus when bowler takes 3 or 4 wickets in a single match')}
          {field('Bonus: 5+ Wickets in Match', 'scoring.bonus5PlusWickets', 'Bonus when bowler takes 5 or more wickets in a single match')}
          {field('Bonus: 50-99 Runs in Match', 'scoring.bonus50to99Runs', 'Bonus when batsman scores a half-century')}
          {field('Bonus: 100+ Runs in Match', 'scoring.bonus100PlusRuns', 'Bonus when batsman scores a century')}
        </div>

        <div className="mt-4 p-3 bg-slate-900/50 rounded border border-slate-700">
          <div className="text-sm font-semibold mb-2">Current scoring summary:</div>
          <div className="text-xs text-slate-400 space-y-1">
            <div>• Run: {settings.scoring.runPoints} pts</div>
            <div>• Wicket: {settings.scoring.wicketPoints} pts</div>
            <div>• 50+ runs: +{settings.scoring.bonus50to99Runs} bonus</div>
            <div>• 100+ runs: +{settings.scoring.bonus100PlusRuns} bonus</div>
            <div>• 3-4 wickets: +{settings.scoring.bonus34Wickets} bonus</div>
            <div>• 5+ wickets: +{settings.scoring.bonus5PlusWickets} bonus</div>
          </div>
        </div>
      </div>

      {/* Save / Read-only */}
      {isAdmin ? (
        <button
          onClick={saveSettings}
          className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-medium transition-colors"
          data-testid="save-settings-btn"
        >
          💾 Save Settings
        </button>
      ) : (
        <div className="p-3 bg-amber-900/20 border border-amber-700/30 rounded-lg text-center">
          <p className="text-sm text-amber-300">
            👁 Read-only mode. Only admins can modify settings.
          </p>
        </div>
      )}
    </div>
  );
}
