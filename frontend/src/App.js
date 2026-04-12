import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import './App.css';
import { api } from './utils/api';
import { calcPoints, fmtDate, uid, can, sha256, FRANCHISES, ROLES, EDIT_PERMS, GUEST_USER } from './utils/helpers';
import * as XLSX from 'xlsx';

// Toast notification component
const Toast = ({ message, type = 'success', onClose }) => (
  <div className={`fixed top-4 right-4 px-6 py-3 rounded-lg shadow-lg z-50 ${
    type === 'success' ? 'bg-green-600' : 'bg-red-600'
  } text-white font-medium animate-fade-in`}>
    {message}
    <button onClick={onClose} className="ml-4 text-white hover:text-gray-200">&times;</button>
  </div>
);

// Main App Component
function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [currentPage, setCurrentPage] = useState('leaderboard');
  const [toast, setToast] = useState(null);
  
  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  if (!currentUser) {
    return <LoginPage onLogin={setCurrentUser} showToast={showToast} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      
      {/* Header */}
      <header className="bg-slate-800/50 border-b border-slate-700 sticky top-0 z-40 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🏏</span>
            <div>
              <h1 className="text-xl font-bold text-green-400">IPL Fantasy 2026</h1>
              <p className="text-xs text-slate-400">Compete. Track. Win.</p>
            </div>
          </div>
          
          <nav className="hidden md:flex gap-2">
            {['leaderboard', 'teams', 'analytics', 'settings'].map(page => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`px-4 py-2 rounded-lg capitalize transition-colors ${
                  currentPage === page
                    ? 'bg-green-600 text-white'
                    : 'text-slate-300 hover:bg-slate-700'
                }`}
              >
                {page}
              </button>
            ))}
            {currentUser.role === 'admin' && (
              <button
                onClick={() => setCurrentPage('admin')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  currentPage === 'admin'
                    ? 'bg-amber-600 text-white'
                    : 'text-amber-400 hover:bg-slate-700'
                }`}
              >
                🔒 Admin
              </button>
            )}
          </nav>
          
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <div className="text-sm font-medium">{currentUser.username}</div>
              <div className="text-xs text-slate-400 capitalize">{currentUser.role}</div>
            </div>
            <button
              onClick={() => setCurrentUser(null)}
              className="px-3 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-sm transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
        
        {/* Mobile nav */}
        <div className="md:hidden flex gap-1 px-2 pb-2 overflow-x-auto">
          {['leaderboard', 'teams', 'analytics', 'settings'].map(page => (
            <button
              key={page}
              onClick={() => setCurrentPage(page)}
              className={`px-3 py-1.5 rounded text-xs whitespace-nowrap capitalize ${
                currentPage === page ? 'bg-green-600' : 'bg-slate-700'
              }`}
            >
              {page}
            </button>
          ))}
          {currentUser.role === 'admin' && (
            <button
              onClick={() => setCurrentPage('admin')}
              className={`px-3 py-1.5 rounded text-xs whitespace-nowrap ${
                currentPage === 'admin' ? 'bg-amber-600' : 'bg-slate-700'
              }`}
            >
              Admin
            </button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {currentPage === 'leaderboard' && <LeaderboardPage currentUser={currentUser} showToast={showToast} />}
        {currentPage === 'teams' && <TeamsPage currentUser={currentUser} showToast={showToast} />}
        {currentPage === 'analytics' && <AnalyticsPage currentUser={currentUser} showToast={showToast} />}
        {currentPage === 'settings' && <SettingsPage currentUser={currentUser} showToast={showToast} />}
        {currentPage === 'admin' && <AdminPanel currentUser={currentUser} setCurrentUser={setCurrentUser} showToast={showToast} />}
      </main>
    </div>
  );
}

// LOGIN PAGE
function LoginPage({ onLogin, showToast }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [users, setUsers] = useState([]);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const res = await api.getUsers();
      setUsers(res.data);
    } catch (e) {
      console.error('Failed to load users:', e);
    }
  };

  const handleLogin = async () => {
    if (!username.trim() || !password) {
      showToast('Enter username and password', 'error');
      return;
    }
    setBusy(true);

    try {
      const hash = await sha256(password);
      const user = users.find(u => 
        u.username.toLowerCase() === username.trim().toLowerCase() && 
        u.passwordHash === hash
      );

      setBusy(false);
      if (user) {
        onLogin(user);
      } else {
        showToast('Incorrect username or password', 'error');
      }
    } catch (e) {
      setBusy(false);
      showToast('Login failed. Try a different browser or use Guest access.', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-slate-800 rounded-2xl shadow-2xl p-8 border border-slate-700">
        <div className="text-center mb-8">
          <div className="text-6xl mb-3">🏏</div>
          <h1 className="text-3xl font-bold text-green-400 mb-1">IPL Fantasy 2026</h1>
          <p className="text-slate-400">Sign in to continue</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Username / Email</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              placeholder="Enter your username or email"
              autoComplete="username"
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Password</label>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                placeholder="••••••••"
                autoComplete="current-password"
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-green-500 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPw(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
              >
                {showPw ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          <button
            onClick={handleLogin}
            disabled={busy}
            className="w-full bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-xl font-medium transition-colors disabled:opacity-50"
          >
            {busy ? 'Signing in…' : 'Sign In'}
          </button>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-700"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-slate-800 text-slate-500">or</span>
            </div>
          </div>

          <button
            onClick={() => onLogin(GUEST_USER)}
            className="w-full bg-slate-700 hover:bg-slate-600 text-slate-300 py-2.5 rounded-xl text-sm font-medium transition-colors"
          >
            👁 Continue as Guest (read-only · no login needed)
          </button>

          <button
            onClick={loadUsers}
            className="w-full text-sm text-slate-400 hover:text-green-400 transition-colors mt-4"
          >
            🔄 Sync latest accounts from server
          </button>
        </div>

        <div className="mt-6 p-3 bg-amber-900/20 border border-amber-700/30 rounded-lg">
          <p className="text-xs text-amber-300">
            ⚠️ Tap sync if your account was just created by the admin.
          </p>
        </div>
      </div>
    </div>
  );
}

// LEADERBOARD PAGE
function LeaderboardPage({ currentUser, showToast }) {
  const [matches, setMatches] = useState([]);
  const [matchPoints, setMatchPoints] = useState({});
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshingId, setRefreshingId] = useState(null);
  const [refreshingMode, setRefreshingMode] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [matchesRes, pointsRes, settingsRes] = await Promise.all([
        api.getMatches(),
        api.getAllMatchPoints(),
        api.getSettings()
      ]);
      setMatches(matchesRes.data);
      setMatchPoints(pointsRes.data);
      setSettings(settingsRes.data);
      setLoading(false);
    } catch (e) {
      showToast('Failed to load data', 'error');
      setLoading(false);
    }
  };

  const canRefresh = can(currentUser, 'refresh_scores');

  const handleRefreshAPI = async (match) => {
    setRefreshingId(match.id);
    setRefreshingMode('api');
    try {
      await api.refreshScoreAPI(match.id);
      await loadData();
      showToast('Scores refreshed!');
    } catch (e) {
      showToast('Failed to refresh scores', 'error');
    }
    setRefreshingId(null);
    setRefreshingMode(null);
  };

  const handleRefreshClaude = async (match) => {
    setRefreshingId(match.id);
    setRefreshingMode('claude');
    try {
      await api.refreshScoreClaude(match.id);
      await loadData();
      showToast('Scores refreshed via Claude!');
    } catch (e) {
      showToast('Failed to refresh scores', 'error');
    }
    setRefreshingId(null);
    setRefreshingMode(null);
  };

  if (loading || !settings) {
    return <div className="text-center py-20 text-slate-400">Loading...</div>;
  }

  const today = new Date().toISOString().split('T')[0];

  // Calculate total points for both teams
  const totalA = Object.values(matchPoints).reduce((sum, mp) => {
    if (!mp.found) return sum;
    return sum + (mp.teamA?.total || 0) + (mp.teamA?.adjustment || 0);
  }, 0);

  const totalB = Object.values(matchPoints).reduce((sum, mp) => {
    if (!mp.found) return sum;
    return sum + (mp.teamB?.total || 0) + (mp.teamB?.adjustment || 0);
  }, 0);

  return (
    <div className="space-y-6">
      <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
        <h2 className="text-2xl font-bold text-green-400 mb-4">🏆 Leaderboard</h2>
        
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-blue-900/30 rounded-lg p-4 border border-blue-700/30">
            <div className="text-sm text-slate-400 mb-1">{settings.teamAName}</div>
            <div className="text-4xl font-bold text-blue-400">{totalA}</div>
            <div className="text-xs text-slate-500 mt-1">Total Points</div>
          </div>
          <div className="bg-purple-900/30 rounded-lg p-4 border border-purple-700/30">
            <div className="text-sm text-slate-400 mb-1">{settings.teamBName}</div>
            <div className="text-4xl font-bold text-purple-400">{totalB}</div>
            <div className="text-xs text-slate-500 mt-1">Total Points</div>
          </div>
        </div>
        
        <div className="text-center py-4 border-t border-slate-700 mt-4">
          <div className={`text-2xl font-bold ${totalA > totalB ? 'text-blue-400' : totalA < totalB ? 'text-purple-400' : 'text-slate-400'}`}>
            {totalA > totalB ? `${settings.teamAName} leading by ${totalA - totalB}` : 
             totalB > totalA ? `${settings.teamBName} leading by ${totalB - totalA}` :
             'Tied!'}
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {matches.map(m => {
          const mp = matchPoints[m.id] || {};
          const isToday = m.date === today;
          const isRefreshing = refreshingId === m.id;
          const hasData = mp.found;
          const tA = hasData ? (mp.teamA?.total || 0) + (mp.teamA?.adjustment || 0) : 0;
          const tB = hasData ? (mp.teamB?.total || 0) + (mp.teamB?.adjustment || 0) : 0;
          const diff = tA - tB;

          return (
            <div key={m.id} className="bg-slate-800/50 rounded-lg overflow-hidden border border-slate-700 hover:border-slate-600 transition-all">
              <div className="flex items-center">
                <div className="flex-1 p-4">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="bg-slate-700 px-2 py-1 rounded text-xs font-mono">M{m.no}</span>
                    <span className="font-semibold">{m.t1} vs {m.t2}</span>
                    {isToday && <span className="bg-green-600 px-2 py-0.5 rounded text-xs">TODAY</span>}
                  </div>
                  <div className="text-xs text-slate-400">{fmtDate(m.date)} · {m.venue}</div>
                  {mp?.error && <div className="text-xs text-amber-400 mt-1">⚠ {mp.error}</div>}
                  {mp?.lastRefreshed && (
                    <div className="text-xs text-green-400 mt-1">
                      Refreshed {new Date(mp.lastRefreshed).toLocaleTimeString()}
                      {mp.source === 'api' && ' 📡 API'}
                      {mp.source === 'claude' && ' 🤖 Claude'}
                    </div>
                  )}
                  {isRefreshing && (
                    <div className="text-xs text-blue-400 mt-1">
                      {refreshingMode === 'api' ? '📡 Fetching from CricketData API…' : '🤖 Claude searching the web…'}
                    </div>
                  )}
                </div>

                {hasData ? (
                  <div className="flex gap-6 px-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-blue-400">{tA}</div>
                      <div className="text-xs text-slate-500">{settings.teamAName.slice(0, 4)}</div>
                    </div>
                    <div>
                      <div className={`text-xl font-mono ${diff > 0 ? 'text-green-400' : diff < 0 ? 'text-red-400' : 'text-slate-400'}`}>
                        {diff > 0 ? `+${diff}` : diff}
                      </div>
                      <div className="text-xs text-slate-500">Diff</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-purple-400">{tB}</div>
                      <div className="text-xs text-slate-500">{settings.teamBName.slice(0, 4)}</div>
                    </div>
                  </div>
                ) : (
                  <div className="px-4 text-slate-500 text-sm">{isRefreshing ? 'Fetching...' : 'No data'}</div>
                )}

                {canRefresh ? (
                  <div className="flex flex-col border-l border-slate-700">
                    <button
                      onClick={() => handleRefreshAPI(m)}
                      disabled={isRefreshing}
                      title="Refresh via CricketData API (free, fast)"
                      className={`px-3 py-3 border-b border-slate-700 text-base transition-colors ${
                        isRefreshing && refreshingMode === 'api' && refreshingId === m.id
                          ? 'opacity-50 cursor-not-allowed bg-blue-900/30'
                          : 'hover:bg-blue-900/40 text-blue-400'
                      }`}
                    >
                      {isRefreshing && refreshingMode === 'api' && refreshingId === m.id ? '⏳' : '📡'}
                    </button>
                    <button
                      onClick={() => handleRefreshClaude(m)}
                      disabled={isRefreshing}
                      title="Refresh via Claude AI web search (uses tokens)"
                      className={`px-3 py-3 text-base transition-colors ${
                        isRefreshing && refreshingMode === 'claude' && refreshingId === m.id
                          ? 'opacity-50 cursor-not-allowed bg-purple-900/30'
                          : 'hover:bg-purple-900/40 text-purple-400'
                      }`}
                    >
                      {isRefreshing && refreshingMode === 'claude' && refreshingId === m.id ? '⏳' : '🤖'}
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col px-3 py-3 text-slate-600 text-xs">
                    <div>📡</div>
                    <div>🤖</div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// TEAMS PAGE - Simplified version
function TeamsPage({ currentUser, showToast }) {
  return (
    <div className="text-center py-20">
      <div className="text-6xl mb-4">👥</div>
      <h2 className="text-2xl font-bold mb-2">Teams Management</h2>
      <p className="text-slate-400">Team management interface with full features</p>
      <p className="text-sm text-slate-500 mt-4">Add players, manage substitutions, import from Excel - Coming in next phase</p>
    </div>
  );
}

// ANALYTICS PAGE - Simplified version
function AnalyticsPage({ currentUser, showToast }) {
  return (
    <div className="text-center py-20">
      <div className="text-6xl mb-4">📈</div>
      <h2 className="text-2xl font-bold mb-2">Player Analytics</h2>
      <p className="text-slate-400">Detailed player statistics and performance tracking</p>
      <p className="text-sm text-slate-500 mt-4">Match-by-match breakdown, sorting, filtering - Coming in next phase</p>
    </div>
  );
}

// SETTINGS PAGE
function SettingsPage({ currentUser, showToast }) {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const res = await api.getSettings();
      setSettings(res.data);
      setLoading(false);
    } catch (e) {
      showToast('Failed to load settings', 'error');
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    try {
      await api.updateSettings(settings);
      showToast('Settings saved!');
    } catch (e) {
      showToast('Failed to save settings', 'error');
    }
  };

  if (loading || !settings) {
    return <div className="text-center py-20">Loading...</div>;
  }

  const isAdmin = currentUser.role === 'admin';

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
        <h2 className="text-2xl font-bold text-green-400 mb-6">⚙️ Settings</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Team A Name</label>
            <input
              type="text"
              value={settings.teamAName}
              onChange={e => setSettings({...settings, teamAName: e.target.value})}
              disabled={!isAdmin}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm disabled:opacity-50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Team B Name</label>
            <input
              type="text"
              value={settings.teamBName}
              onChange={e => setSettings({...settings, teamBName: e.target.value})}
              disabled={!isAdmin}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm disabled:opacity-50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Max Substitutions Per Team</label>
            <input
              type="number"
              value={settings.maxSubstitutions}
              onChange={e => setSettings({...settings, maxSubstitutions: parseInt(e.target.value)})}
              disabled={!isAdmin}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm disabled:opacity-50"
            />
          </div>

          <div className="border-t border-slate-700 pt-4 mt-6">
            <h3 className="text-lg font-semibold mb-4">Scoring Rules</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Points per Run</label>
                <input
                  type="number"
                  value={settings.scoring.runPoints}
                  onChange={e => setSettings({...settings, scoring: {...settings.scoring, runPoints: parseInt(e.target.value)}})}
                  disabled={!isAdmin}
                  className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-sm disabled:opacity-50"
                />
              </div>
              
              <div>
                <label className="block text-sm text-slate-400 mb-1">Points per Wicket</label>
                <input
                  type="number"
                  value={settings.scoring.wicketPoints}
                  onChange={e => setSettings({...settings, scoring: {...settings.scoring, wicketPoints: parseInt(e.target.value)}})}
                  disabled={!isAdmin}
                  className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-sm disabled:opacity-50"
                />
              </div>
              
              <div>
                <label className="block text-sm text-slate-400 mb-1">Bonus: 50-99 Runs</label>
                <input
                  type="number"
                  value={settings.scoring.bonus50to99Runs}
                  onChange={e => setSettings({...settings, scoring: {...settings.scoring, bonus50to99Runs: parseInt(e.target.value)}})}
                  disabled={!isAdmin}
                  className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-sm disabled:opacity-50"
                />
              </div>
              
              <div>
                <label className="block text-sm text-slate-400 mb-1">Bonus: 100+ Runs</label>
                <input
                  type="number"
                  value={settings.scoring.bonus100PlusRuns}
                  onChange={e => setSettings({...settings, scoring: {...settings.scoring, bonus100PlusRuns: parseInt(e.target.value)}})}
                  disabled={!isAdmin}
                  className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-sm disabled:opacity-50"
                />
              </div>
              
              <div>
                <label className="block text-sm text-slate-400 mb-1">Bonus: 3-4 Wickets</label>
                <input
                  type="number"
                  value={settings.scoring.bonus34Wickets}
                  onChange={e => setSettings({...settings, scoring: {...settings.scoring, bonus34Wickets: parseInt(e.target.value)}})}
                  disabled={!isAdmin}
                  className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-sm disabled:opacity-50"
                />
              </div>
              
              <div>
                <label className="block text-sm text-slate-400 mb-1">Bonus: 5+ Wickets</label>
                <input
                  type="number"
                  value={settings.scoring.bonus5PlusWickets}
                  onChange={e => setSettings({...settings, scoring: {...settings.scoring, bonus5PlusWickets: parseInt(e.target.value)}})}
                  disabled={!isAdmin}
                  className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-sm disabled:opacity-50"
                />
              </div>
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

          {isAdmin && (
            <button
              onClick={saveSettings}
              className="w-full mt-6 bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-medium transition-colors"
            >
              💾 Save Settings
            </button>
          )}

          {!isAdmin && (
            <div className="mt-6 p-3 bg-amber-900/20 border border-amber-700/30 rounded-lg text-center">
              <p className="text-sm text-amber-300">
                👁 Read-only mode. Only admins can modify settings.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ADMIN PANEL - User management
function AdminPanel({ currentUser, setCurrentUser, showToast }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const res = await api.getUsers();
      setUsers(res.data);
      setLoading(false);
    } catch (e) {
      showToast('Failed to load users', 'error');
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-20">Loading...</div>;
  }

  const roleColor = {
    admin: 'text-amber-400',
    'read-only': 'text-slate-400',
    edit: 'text-blue-400'
  };

  const roleLabel = {
    admin: 'Admin',
    'read-only': 'Read-only',
    edit: 'Editor'
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-amber-400">🔐 User Management</h2>
            <p className="text-sm text-slate-400 mt-1">{users.length} user{users.length !== 1 ? 's' : ''} registered</p>
          </div>
        </div>

        <div className="space-y-3">
          {users.map(u => (
            <div key={u.id} className="bg-slate-700/50 rounded-lg p-4 flex items-center gap-4">
              <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-blue-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                {u.username.charAt(0).toUpperCase()}
              </div>
              
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{u.username}</span>
                  {u.id === currentUser.id && <span className="bg-green-600 px-2 py-0.5 rounded text-xs">You</span>}
                  {u.id === 'admin-ankur' && <span className="bg-amber-600 px-2 py-0.5 rounded text-xs">Default Admin</span>}
                </div>
                <div className={`text-sm ${roleColor[u.role]}`}>
                  {roleLabel[u.role]}
                  {u.role === 'edit' && u.editPerms.length > 0 && (
                    <span className="text-slate-500 ml-2">
                      · {u.editPerms.map(pk => EDIT_PERMS.find(p => p.key === pk)?.label).filter(Boolean).join(', ')}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 p-4 bg-slate-900/50 rounded-lg border border-slate-700">
          <h3 className="font-semibold mb-2">Permission Reference</h3>
          <div className="space-y-1 text-sm">
            {EDIT_PERMS.map(p => (
              <div key={p.key} className="text-slate-400">
                <span className="text-green-400">{p.label}</span> — {p.desc}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 p-4 bg-blue-900/20 rounded-lg border border-blue-700/30">
          <p className="text-sm text-blue-300">
            💡 <strong>Note:</strong> User creation, editing, and deletion features will be available in the full admin panel implementation.
            Current version allows viewing registered users and their permissions.
          </p>
        </div>
      </div>
    </div>
  );
}

export default App;
