import React, { useState, useEffect, useCallback } from 'react';
import './App.css';
import { api } from './utils/api';
import { fmtDate, can, sha256, EDIT_PERMS, GUEST_USER, uid } from './utils/helpers';
import TeamsPage from './components/TeamsPage';
import SettingsPage from './components/SettingsPage';
import MatchDetailModal from './components/MatchDetailModal';

const Toast = ({ message, type = 'success', onClose }) => (
  <div className={`fixed top-4 right-4 px-6 py-3 rounded-lg shadow-lg z-50 max-w-sm ${type === 'success' ? 'bg-green-600' : 'bg-red-600'} text-white font-medium animate-fade-in`} data-testid="toast-message">
    {message}
    <button onClick={onClose} className="ml-4 text-white hover:text-gray-200">&times;</button>
  </div>
);

// ─── COMPETITION PICKER MODAL ────────────────────────────────────────────────
function CompetitionPickerModal({ competitions, activeId, onSwitch, onCreate, onUpdate, onDelete, onClose }) {
  const [editId, setEditId] = useState(null); // null = list, "new" = creating, compId = editing
  const [form, setForm] = useState(null);

  const openNew = () => {
    setForm({ name: '', teamAName: '', teamBName: '' });
    setEditId('new');
  };
  const openEdit = (c) => {
    setForm({ name: c.name, teamAName: c.teamAName, teamBName: c.teamBName });
    setEditId(c.id);
  };
  const cancel = () => { setEditId(null); setForm(null); };

  const save = () => {
    if (!form.name.trim()) return;
    if (editId === 'new') {
      onCreate({ name: form.name, teamAName: form.teamAName || 'Team A', teamBName: form.teamBName || 'Team B' });
    } else {
      onUpdate(editId, form);
    }
    cancel();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-slate-800 rounded-2xl w-full max-w-md max-h-[80vh] flex flex-col border border-slate-700 shadow-2xl" onClick={e => e.stopPropagation()} data-testid="comp-picker-modal">
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <h3 className="text-lg font-bold text-white">🏆 Competitions</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-xl" data-testid="comp-picker-close">&times;</button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {editId !== null ? (
            <div className="space-y-3" data-testid="comp-edit-form">
              <div>
                <label className="block text-sm text-slate-300 mb-1">Competition Name *</label>
                <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="e.g. IPL 2026 Fantasy"
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white" data-testid="comp-name-input" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-slate-300 mb-1">Team A Name</label>
                  <input value={form.teamAName} onChange={e => setForm({...form, teamAName: e.target.value})} placeholder="Ankur"
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white" data-testid="comp-teamA-input" />
                </div>
                <div>
                  <label className="block text-sm text-slate-300 mb-1">Team B Name</label>
                  <input value={form.teamBName} onChange={e => setForm({...form, teamBName: e.target.value})} placeholder="Sarawat"
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white" data-testid="comp-teamB-input" />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={cancel} className="flex-1 bg-slate-700 hover:bg-slate-600 py-2 rounded-lg text-sm" data-testid="comp-edit-cancel">Cancel</button>
                <button onClick={save} className="flex-1 bg-green-600 hover:bg-green-700 py-2 rounded-lg text-sm font-medium" data-testid="comp-edit-save">
                  {editId === 'new' ? 'Create' : 'Save'}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2" data-testid="comp-list">
              {competitions.map(c => (
                <div key={c.id} className={`rounded-lg p-3 flex items-center gap-3 border transition-colors cursor-pointer ${
                  c.id === activeId ? 'bg-green-900/30 border-green-600' : 'bg-slate-700/50 border-slate-700 hover:border-slate-500'
                }`} data-testid={`comp-item-${c.id}`}>
                  <button className="flex-1 text-left" onClick={() => onSwitch(c.id)} data-testid={`comp-switch-${c.id}`}>
                    <div className="font-medium text-white">{c.name}</div>
                    <div className="text-xs text-slate-400">{c.teamAName} vs {c.teamBName}</div>
                    {c.id === activeId && <span className="text-xs text-green-400 mt-1 inline-block">Active</span>}
                  </button>
                  <div className="flex gap-1.5 shrink-0">
                    <button onClick={() => openEdit(c)} className="text-xs bg-slate-600 hover:bg-slate-500 px-2 py-1 rounded" data-testid={`comp-edit-${c.id}`}>Edit</button>
                    {competitions.length > 1 && (
                      <button onClick={() => onDelete(c.id)} className="text-xs bg-red-800 hover:bg-red-700 px-2 py-1 rounded" data-testid={`comp-delete-${c.id}`}>Del</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {editId === null && (
          <div className="p-4 border-t border-slate-700">
            <button onClick={openNew} className="w-full bg-green-700 hover:bg-green-600 text-white py-2.5 rounded-lg text-sm font-medium" data-testid="comp-create-btn">
              + New Competition
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── MAIN APP ────────────────────────────────────────────────────────────────
function App() {
  const [currentUser, setCurrentUser] = useState(() => {
    try { const s = sessionStorage.getItem('ipl_fantasy_user'); return s ? JSON.parse(s) : null; } catch { return null; }
  });
  const [currentPage, setCurrentPage] = useState('leaderboard');
  const [toast, setToast] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Multi-competition state
  const [competitions, setCompetitions] = useState([]);
  const [activeCompId, setActiveCompId] = useState(null);
  const [showCompPicker, setShowCompPicker] = useState(false);

  const showToast = useCallback((msg, type = 'success') => { setToast({ message: msg, type }); setTimeout(() => setToast(null), 3000); }, []);
  const handleLogin = useCallback((user) => { setCurrentUser(user); if (user) sessionStorage.setItem('ipl_fantasy_user', JSON.stringify(user)); else sessionStorage.removeItem('ipl_fantasy_user'); }, []);
  const handleLogout = useCallback(() => { setCurrentUser(null); sessionStorage.removeItem('ipl_fantasy_user'); }, []);
  const handleDataRefresh = useCallback(() => { setRefreshKey(k => k + 1); loadCompetitions(); }, []);

  const loadCompetitions = useCallback(async () => {
    try {
      const [compsRes, activeRes] = await Promise.all([api.getCompetitions(), api.getActiveCompetitionId()]);
      setCompetitions(compsRes.data);
      const aid = activeRes.data.activeCompetitionId;
      if (aid && compsRes.data.some(c => c.id === aid)) setActiveCompId(aid);
      else if (compsRes.data.length > 0) setActiveCompId(compsRes.data[0].id);
    } catch (e) { console.error('Failed to load competitions', e); }
  }, []);

  useEffect(() => { if (currentUser) loadCompetitions(); }, [currentUser, loadCompetitions]);

  const activeComp = competitions.find(c => c.id === activeCompId) || null;

  const handleSwitchComp = async (id) => {
    setActiveCompId(id);
    await api.setActiveCompetitionId(id);
    setShowCompPicker(false);
    setRefreshKey(k => k + 1);
  };

  const handleCreateComp = async (data) => {
    try {
      const res = await api.createCompetition({ id: `comp_${Date.now()}`, ...data });
      await loadCompetitions();
      showToast(`Competition "${data.name}" created!`);
    } catch (e) { showToast('Failed to create', 'error'); }
  };

  const handleUpdateComp = async (id, data) => {
    try {
      await api.updateCompetition(id, data);
      await loadCompetitions();
      setRefreshKey(k => k + 1);
      showToast('Competition updated!');
    } catch (e) { showToast('Failed to update', 'error'); }
  };

  const handleDeleteComp = async (id) => {
    if (!window.confirm('Delete this competition? This cannot be undone.')) return;
    try {
      await api.deleteCompetition(id);
      if (activeCompId === id) {
        const remaining = competitions.filter(c => c.id !== id);
        if (remaining.length) await handleSwitchComp(remaining[0].id);
      }
      await loadCompetitions();
      showToast('Competition deleted');
    } catch (e) { showToast('Failed to delete', 'error'); }
  };

  if (!currentUser) {
    return (<>{toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}<LoginPage onLogin={handleLogin} showToast={showToast} /></>);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <header className="bg-slate-800/50 border-b border-slate-700 sticky top-0 z-40 backdrop-blur-sm" data-testid="app-header">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🏏</span>
            <div>
              <h1 className="text-xl font-bold text-green-400" data-testid="app-title">IPL Fantasy 2026</h1>
              {/* Competition Switcher */}
              <button onClick={() => setShowCompPicker(true)} className="text-xs text-slate-400 hover:text-green-400 transition-colors flex items-center gap-1" data-testid="comp-switcher-btn">
                🏆 {activeComp?.name || 'No competition'} <span className="text-slate-600">▼</span>
              </button>
            </div>
          </div>
          <nav className="hidden md:flex gap-2" data-testid="nav-desktop">
            {['leaderboard', 'teams', 'analytics', 'settings'].map(page => (
              <button key={page} onClick={() => setCurrentPage(page)} data-testid={`nav-${page}`}
                className={`px-4 py-2 rounded-lg capitalize transition-colors ${currentPage === page ? 'bg-green-600 text-white' : 'text-slate-300 hover:bg-slate-700'}`}>{page}</button>
            ))}
            {currentUser.role === 'admin' && (
              <button onClick={() => setCurrentPage('admin')} data-testid="nav-admin"
                className={`px-4 py-2 rounded-lg transition-colors ${currentPage === 'admin' ? 'bg-amber-600 text-white' : 'text-amber-400 hover:bg-slate-700'}`}>🔒 Admin</button>
            )}
          </nav>
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <div className="text-sm font-medium" data-testid="user-display">{currentUser.username}</div>
              <div className="text-xs text-slate-400 capitalize">{currentUser.role}</div>
            </div>
            <button onClick={handleLogout} data-testid="logout-btn" className="px-3 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-sm transition-colors">Logout</button>
          </div>
        </div>
        <div className="md:hidden flex gap-1 px-2 pb-2 overflow-x-auto" data-testid="nav-mobile">
          {['leaderboard', 'teams', 'analytics', 'settings'].map(page => (
            <button key={page} onClick={() => setCurrentPage(page)} data-testid={`nav-mobile-${page}`}
              className={`px-3 py-1.5 rounded text-xs whitespace-nowrap capitalize ${currentPage === page ? 'bg-green-600' : 'bg-slate-700'}`}>{page}</button>
          ))}
          {currentUser.role === 'admin' && (
            <button onClick={() => setCurrentPage('admin')} data-testid="nav-mobile-admin"
              className={`px-3 py-1.5 rounded text-xs whitespace-nowrap ${currentPage === 'admin' ? 'bg-amber-600' : 'bg-slate-700'}`}>Admin</button>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {!activeCompId ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🏆</div>
            <p className="text-slate-400 mb-4">No competition selected. Create or select one.</p>
            <button onClick={() => setShowCompPicker(true)} className="bg-green-600 hover:bg-green-700 px-6 py-2 rounded-lg">Open Competitions</button>
          </div>
        ) : (
          <>
            {currentPage === 'leaderboard' && <LeaderboardPage key={`lb-${refreshKey}-${activeCompId}`} compId={activeCompId} currentUser={currentUser} showToast={showToast} />}
            {currentPage === 'teams' && <TeamsPage key={`tm-${refreshKey}-${activeCompId}`} compId={activeCompId} currentUser={currentUser} showToast={showToast} />}
            {currentPage === 'analytics' && <AnalyticsPage key={`an-${refreshKey}-${activeCompId}`} compId={activeCompId} currentUser={currentUser} showToast={showToast} />}
            {currentPage === 'settings' && <SettingsPage key={`st-${refreshKey}-${activeCompId}`} compId={activeCompId} currentUser={currentUser} showToast={showToast} onDataRefresh={handleDataRefresh} />}
            {currentPage === 'admin' && <AdminPanel key={`ad-${refreshKey}`} currentUser={currentUser} setCurrentUser={handleLogin} showToast={showToast} />}
          </>
        )}
      </main>

      {showCompPicker && (
        <CompetitionPickerModal competitions={competitions} activeId={activeCompId}
          onSwitch={handleSwitchComp} onCreate={handleCreateComp} onUpdate={handleUpdateComp} onDelete={handleDeleteComp}
          onClose={() => setShowCompPicker(false)} />
      )}
    </div>
  );
}

// ─── LOGIN PAGE ──────────────────────────────────────────────────────────────
function LoginPage({ onLogin, showToast }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [users, setUsers] = useState([]);
  useEffect(() => { loadUsers(); }, []);
  const loadUsers = async () => { try { setUsers((await api.getUsers()).data); } catch {} };
  const handleLogin = async () => {
    if (!username.trim() || !password) { showToast('Enter username and password', 'error'); return; }
    setBusy(true);
    try {
      const hash = await sha256(password);
      const user = users.find(u => u.username.toLowerCase() === username.trim().toLowerCase() && u.passwordHash === hash);
      setBusy(false);
      if (user) onLogin(user); else showToast('Incorrect username or password', 'error');
    } catch { setBusy(false); showToast('Login failed', 'error'); }
  };
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center px-4" data-testid="login-page">
      <div className="w-full max-w-md bg-slate-800 rounded-2xl shadow-2xl p-8 border border-slate-700">
        <div className="text-center mb-8"><div className="text-6xl mb-3">🏏</div><h1 className="text-3xl font-bold text-green-400 mb-1" data-testid="login-title">IPL Fantasy 2026</h1><p className="text-slate-400">Sign in to continue</p></div>
        <div className="space-y-4">
          <div><label className="block text-sm font-medium text-slate-300 mb-2">Username / Email</label>
            <input type="text" value={username} onChange={e => setUsername(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogin()} placeholder="Enter your username or email" data-testid="login-username" className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-green-500" /></div>
          <div><label className="block text-sm font-medium text-slate-300 mb-2">Password</label>
            <div className="relative"><input type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogin()} placeholder="••••••••" data-testid="login-password" className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-green-500 pr-10" />
              <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs" data-testid="toggle-password">{showPw ? 'Hide' : 'Show'}</button></div></div>
          <button onClick={handleLogin} disabled={busy} data-testid="login-submit-btn" className="w-full bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-xl font-medium transition-colors disabled:opacity-50">{busy ? 'Signing in...' : 'Sign In'}</button>
          <div className="relative my-6"><div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-700"></div></div><div className="relative flex justify-center text-sm"><span className="px-2 bg-slate-800 text-slate-500">or</span></div></div>
          <button onClick={() => onLogin(GUEST_USER)} data-testid="guest-login-btn" className="w-full bg-slate-700 hover:bg-slate-600 text-slate-300 py-2.5 rounded-xl text-sm font-medium transition-colors">👁 Continue as Guest (read-only · no login needed)</button>
          <button onClick={loadUsers} data-testid="sync-users-btn" className="w-full text-sm text-slate-400 hover:text-green-400 transition-colors mt-4">🔄 Sync latest accounts from server</button>
        </div>
      </div>
    </div>
  );
}

// ─── LEADERBOARD PAGE ────────────────────────────────────────────────────────
function LeaderboardPage({ compId, currentUser, showToast }) {
  const [matches, setMatches] = useState([]);
  const [matchPoints, setMatchPoints] = useState({});
  const [settings, setSettings] = useState(null);
  const [teams, setTeams] = useState({ teamA: [], teamB: [] });
  const [loading, setLoading] = useState(true);
  const [refreshingId, setRefreshingId] = useState(null);
  const [refreshingMode, setRefreshingMode] = useState(null);
  const [selectedMatch, setSelectedMatch] = useState(null);

  const loadData = useCallback(async () => {
    try {
      const [matchesRes, pointsRes, settingsRes, teamsRes] = await Promise.all([
        api.getMatches(), api.getAllMatchPoints(compId), api.getSettings(compId), api.getTeams(compId)
      ]);
      setMatches(matchesRes.data); setMatchPoints(pointsRes.data); setSettings(settingsRes.data); setTeams(teamsRes.data);
      setLoading(false);
    } catch (e) { showToast('Failed to load data', 'error'); setLoading(false); }
  }, [compId, showToast]);
  useEffect(() => { loadData(); }, [loadData]);

  const canRefresh = can(currentUser, 'refresh_scores');
  const handleRefreshAPI = async (match) => {
    setRefreshingId(match.id); setRefreshingMode('api');
    try { await api.refreshScoreAPI(compId, match.id); await loadData(); showToast('Scores refreshed!'); } catch { showToast('Failed to refresh', 'error'); }
    setRefreshingId(null); setRefreshingMode(null);
  };
  const handleRefreshClaude = async (match) => {
    setRefreshingId(match.id); setRefreshingMode('claude');
    try { await api.refreshScoreClaude(compId, match.id); await loadData(); showToast('Scores refreshed!'); } catch { showToast('Failed to refresh', 'error'); }
    setRefreshingId(null); setRefreshingMode(null);
  };
  const handleMatchDetailSave = (matchId, newPoints, updatedMatch) => {
    if (newPoints) { setMatchPoints(prev => ({ ...prev, [matchId]: newPoints })); showToast('Match points saved!'); }
    if (updatedMatch) { setMatches(prev => prev.map(m => m.id === matchId ? updatedMatch : m)); setSelectedMatch(updatedMatch); showToast('Match info updated!'); }
  };

  if (loading || !settings) return <div className="text-center py-20 text-slate-400">Loading...</div>;
  const today = new Date().toISOString().split('T')[0];
  const totalA = Object.values(matchPoints).reduce((s, mp) => mp.found ? s + (mp.teamA?.total || 0) + (mp.teamA?.adjustment || 0) : s, 0);
  const totalB = Object.values(matchPoints).reduce((s, mp) => mp.found ? s + (mp.teamB?.total || 0) + (mp.teamB?.adjustment || 0) : s, 0);

  return (
    <div className="space-y-6" data-testid="leaderboard-page">
      <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
        <h2 className="text-2xl font-bold text-green-400 mb-4">🏆 Leaderboard</h2>
        <div className="grid grid-cols-3 gap-4 items-center">
          <div className="bg-blue-900/30 rounded-lg p-4 border border-blue-700/30 text-center">
            <div className="text-sm text-slate-400 mb-1">{settings.teamAName}</div>
            <div className="text-4xl font-bold text-blue-400" data-testid="total-points-a">{totalA}</div>
            <div className="text-xs text-slate-500 mt-1">Total Points</div>
          </div>
          <div className="text-center">
            <div className={`text-xl font-bold ${totalA > totalB ? 'text-blue-400' : totalA < totalB ? 'text-purple-400' : 'text-slate-400'}`} data-testid="score-difference">
              {totalA === totalB ? 'Tied!' : `${Math.abs(totalA - totalB)} pts`}
            </div>
            <div className="text-xs text-slate-500 mt-1">{totalA > totalB ? `${settings.teamAName} leads` : totalA < totalB ? `${settings.teamBName} leads` : ''}</div>
          </div>
          <div className="bg-purple-900/30 rounded-lg p-4 border border-purple-700/30 text-center">
            <div className="text-sm text-slate-400 mb-1">{settings.teamBName}</div>
            <div className="text-4xl font-bold text-purple-400" data-testid="total-points-b">{totalB}</div>
            <div className="text-xs text-slate-500 mt-1">Total Points</div>
          </div>
        </div>
      </div>
      <div className="space-y-3" data-testid="matches-list">
        {matches.map(m => {
          const mp = matchPoints[m.id] || {}; const isToday = m.date === today; const isRefreshing = refreshingId === m.id;
          const hasData = mp.found; const tA = hasData ? (mp.teamA?.total||0)+(mp.teamA?.adjustment||0) : 0; const tB = hasData ? (mp.teamB?.total||0)+(mp.teamB?.adjustment||0) : 0; const diff = tA-tB;
          return (
            <div key={m.id} className="bg-slate-800/50 rounded-lg overflow-hidden border border-slate-700 hover:border-slate-600 transition-all" data-testid={`match-row-${m.id}`}>
              <div className="flex items-center">
                <button className="flex-1 p-4 text-left hover:bg-slate-750 transition-colors" onClick={() => setSelectedMatch(m)} data-testid={`match-click-${m.id}`}>
                  <div className="flex items-center gap-3 mb-1">
                    <span className="bg-slate-700 px-2 py-1 rounded text-xs font-mono">M{m.no}</span>
                    <span className="font-semibold">{m.t1} vs {m.t2}</span>
                    {isToday && <span className="bg-green-600 px-2 py-0.5 rounded text-xs animate-pulse">TODAY</span>}
                  </div>
                  <div className="text-xs text-slate-400">{fmtDate(m.date)} · {m.venue}</div>
                  {mp?.lastRefreshed && <div className="text-xs text-green-400 mt-1">Refreshed {new Date(mp.lastRefreshed).toLocaleTimeString()} {mp.source === 'api' ? '📡 API' : mp.source === 'claude' ? '🤖 Claude' : ''}</div>}
                  {isRefreshing && <div className="text-xs text-blue-400 mt-1 animate-pulse">{refreshingMode === 'api' ? '📡 Fetching...' : '🤖 Searching...'}</div>}
                </button>
                {hasData ? (
                  <div className="flex gap-6 px-4 text-center">
                    <div><div className="text-2xl font-bold text-blue-400">{tA}</div><div className="text-xs text-slate-500">{settings.teamAName.slice(0,4)}</div></div>
                    <div><div className={`text-xl font-mono ${diff>0?'text-green-400':diff<0?'text-red-400':'text-slate-400'}`}>{diff>0?`+${diff}`:diff}</div><div className="text-xs text-slate-500">Diff</div></div>
                    <div><div className="text-2xl font-bold text-purple-400">{tB}</div><div className="text-xs text-slate-500">{settings.teamBName.slice(0,4)}</div></div>
                  </div>
                ) : <div className="px-4 text-slate-500 text-sm">{isRefreshing ? 'Fetching...' : 'No data'}</div>}
                {canRefresh ? (
                  <div className="flex flex-col border-l border-slate-700">
                    <button onClick={() => handleRefreshAPI(m)} disabled={isRefreshing} data-testid={`refresh-api-${m.id}`}
                      className={`px-3 py-3 border-b border-slate-700 text-base transition-colors ${isRefreshing&&refreshingMode==='api'?'opacity-50 cursor-not-allowed bg-blue-900/30':'hover:bg-blue-900/40 text-blue-400'}`}>
                      {isRefreshing&&refreshingMode==='api'?'⏳':'📡'}</button>
                    <button onClick={() => handleRefreshClaude(m)} disabled={isRefreshing} data-testid={`refresh-claude-${m.id}`}
                      className={`px-3 py-3 text-base transition-colors ${isRefreshing&&refreshingMode==='claude'?'opacity-50 cursor-not-allowed bg-purple-900/30':'hover:bg-purple-900/40 text-purple-400'}`}>
                      {isRefreshing&&refreshingMode==='claude'?'⏳':'🤖'}</button>
                  </div>
                ) : <div className="flex flex-col px-3 py-3 text-slate-600 text-xs border-l border-slate-700"><div className="py-2">📡</div><div className="py-2">🤖</div></div>}
              </div>
            </div>
          );
        })}
      </div>
      {selectedMatch && (
        <MatchDetailModal match={selectedMatch} matchPoints={matchPoints} teams={teams} settings={settings} compId={compId}
          onClose={() => setSelectedMatch(null)} onSave={handleMatchDetailSave}
          onRefreshAPI={handleRefreshAPI} onRefreshClaude={handleRefreshClaude}
          refreshingId={refreshingId} refreshingMode={refreshingMode} currentUser={currentUser} />
      )}
    </div>
  );
}

// ─── ANALYTICS PAGE ──────────────────────────────────────────────────────────
function AnalyticsPage({ compId, currentUser, showToast }) {
  return (
    <div className="text-center py-20" data-testid="analytics-page">
      <div className="text-6xl mb-4">📈</div>
      <h2 className="text-2xl font-bold mb-2">Player Analytics</h2>
      <p className="text-slate-400">Coming in next phase</p>
    </div>
  );
}

// ─── ADMIN PANEL ─────────────────────────────────────────────────────────────
function AdminPanel({ currentUser, setCurrentUser, showToast }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const loadUsers = useCallback(async () => { try { setUsers((await api.getUsers()).data); setLoading(false); } catch { setLoading(false); } }, []);
  useEffect(() => { loadUsers(); }, [loadUsers]);
  if (loading) return <div className="text-center py-20">Loading...</div>;
  const roleColor = { admin: 'text-amber-400', 'read-only': 'text-slate-400', edit: 'text-blue-400' };
  const roleLabel = { admin: 'Admin', 'read-only': 'Read-only', edit: 'Editor' };
  return (
    <div className="max-w-4xl mx-auto" data-testid="admin-panel">
      <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
        <h2 className="text-2xl font-bold text-amber-400 mb-6">🔐 User Management</h2>
        <div className="space-y-3" data-testid="users-list">
          {users.map(u => (
            <div key={u.id} className="bg-slate-700/50 rounded-lg p-4 flex items-center gap-4">
              <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-blue-500 rounded-full flex items-center justify-center text-white font-bold text-lg">{u.username.charAt(0).toUpperCase()}</div>
              <div className="flex-1">
                <div className="flex items-center gap-2"><span className="font-medium">{u.username}</span>
                  {u.id === currentUser.id && <span className="bg-green-600 px-2 py-0.5 rounded text-xs">You</span>}</div>
                <div className={`text-sm ${roleColor[u.role]}`}>{roleLabel[u.role]}
                  {u.role === 'edit' && u.editPerms?.length > 0 && <span className="text-slate-500 ml-2">· {u.editPerms.map(pk => EDIT_PERMS.find(p => p.key === pk)?.label).filter(Boolean).join(', ')}</span>}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default App;
