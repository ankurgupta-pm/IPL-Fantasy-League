import React, { useState, useEffect, useCallback } from 'react';
import './App.css';
import { api } from './utils/api';
import { fmtDate, can, sha256, EDIT_PERMS, GUEST_USER } from './utils/helpers';
import TeamsPage from './components/TeamsPage';
import SettingsPage from './components/SettingsPage';
import MatchDetailModal from './components/MatchDetailModal';

// Toast notification component
const Toast = ({ message, type = 'success', onClose }) => (
  <div className={`fixed top-4 right-4 px-6 py-3 rounded-lg shadow-lg z-50 max-w-sm ${
    type === 'success' ? 'bg-green-600' : 'bg-red-600'
  } text-white font-medium animate-fade-in`} data-testid="toast-message">
    {message}
    <button onClick={onClose} className="ml-4 text-white hover:text-gray-200">&times;</button>
  </div>
);

// Main App Component
function App() {
  const [currentUser, setCurrentUser] = useState(() => {
    // Restore session from sessionStorage on mount
    try {
      const saved = sessionStorage.getItem('ipl_fantasy_user');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });
  const [currentPage, setCurrentPage] = useState('leaderboard');
  const [toast, setToast] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  
  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  // Persist session whenever currentUser changes
  const handleLogin = useCallback((user) => {
    setCurrentUser(user);
    if (user) {
      sessionStorage.setItem('ipl_fantasy_user', JSON.stringify(user));
    } else {
      sessionStorage.removeItem('ipl_fantasy_user');
    }
  }, []);

  const handleLogout = useCallback(() => {
    setCurrentUser(null);
    sessionStorage.removeItem('ipl_fantasy_user');
  }, []);

  // Called after backup import to force all child pages to re-fetch data
  const handleDataRefresh = useCallback(() => {
    setRefreshKey(k => k + 1);
  }, []);

  if (!currentUser) {
    return (
      <>
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        <LoginPage onLogin={handleLogin} showToast={showToast} />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      
      {/* Header */}
      <header className="bg-slate-800/50 border-b border-slate-700 sticky top-0 z-40 backdrop-blur-sm" data-testid="app-header">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🏏</span>
            <div>
              <h1 className="text-xl font-bold text-green-400" data-testid="app-title">IPL Fantasy 2026</h1>
              <p className="text-xs text-slate-400">Compete. Track. Win.</p>
            </div>
          </div>
          
          <nav className="hidden md:flex gap-2" data-testid="nav-desktop">
            {['leaderboard', 'teams', 'analytics', 'settings'].map(page => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                data-testid={`nav-${page}`}
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
                data-testid="nav-admin"
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
              <div className="text-sm font-medium" data-testid="user-display">{currentUser.username}</div>
              <div className="text-xs text-slate-400 capitalize">{currentUser.role}</div>
            </div>
            <button
              onClick={handleLogout}
              data-testid="logout-btn"
              className="px-3 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-sm transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
        
        {/* Mobile nav */}
        <div className="md:hidden flex gap-1 px-2 pb-2 overflow-x-auto" data-testid="nav-mobile">
          {['leaderboard', 'teams', 'analytics', 'settings'].map(page => (
            <button
              key={page}
              onClick={() => setCurrentPage(page)}
              data-testid={`nav-mobile-${page}`}
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
              data-testid="nav-mobile-admin"
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
        {currentPage === 'leaderboard' && <LeaderboardPage key={`lb-${refreshKey}`} currentUser={currentUser} showToast={showToast} />}
        {currentPage === 'teams' && <TeamsPage key={`tm-${refreshKey}`} currentUser={currentUser} showToast={showToast} />}
        {currentPage === 'analytics' && <AnalyticsPage key={`an-${refreshKey}`} currentUser={currentUser} showToast={showToast} />}
        {currentPage === 'settings' && <SettingsPage key={`st-${refreshKey}`} currentUser={currentUser} showToast={showToast} onDataRefresh={handleDataRefresh} />}
        {currentPage === 'admin' && <AdminPanel key={`ad-${refreshKey}`} currentUser={currentUser} setCurrentUser={handleLogin} showToast={showToast} />}
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center px-4" data-testid="login-page">
      <div className="w-full max-w-md bg-slate-800 rounded-2xl shadow-2xl p-8 border border-slate-700">
        <div className="text-center mb-8">
          <div className="text-6xl mb-3">🏏</div>
          <h1 className="text-3xl font-bold text-green-400 mb-1" data-testid="login-title">IPL Fantasy 2026</h1>
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
              data-testid="login-username"
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
                data-testid="login-password"
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-green-500 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPw(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
                data-testid="toggle-password"
              >
                {showPw ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          <button
            onClick={handleLogin}
            disabled={busy}
            data-testid="login-submit-btn"
            className="w-full bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-xl font-medium transition-colors disabled:opacity-50"
          >
            {busy ? 'Signing in...' : 'Sign In'}
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
            data-testid="guest-login-btn"
            className="w-full bg-slate-700 hover:bg-slate-600 text-slate-300 py-2.5 rounded-xl text-sm font-medium transition-colors"
          >
            👁 Continue as Guest (read-only · no login needed)
          </button>

          <button
            onClick={loadUsers}
            data-testid="sync-users-btn"
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
  const [teams, setTeams] = useState({ teamA: [], teamB: [] });
  const [loading, setLoading] = useState(true);
  const [refreshingId, setRefreshingId] = useState(null);
  const [refreshingMode, setRefreshingMode] = useState(null);
  const [selectedMatch, setSelectedMatch] = useState(null);

  const loadData = useCallback(async () => {
    try {
      const [matchesRes, pointsRes, settingsRes, teamsRes] = await Promise.all([
        api.getMatches(),
        api.getAllMatchPoints(),
        api.getSettings(),
        api.getTeams()
      ]);
      setMatches(matchesRes.data);
      setMatchPoints(pointsRes.data);
      setSettings(settingsRes.data);
      setTeams(teamsRes.data);
      setLoading(false);
    } catch (e) {
      showToast('Failed to load data', 'error');
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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

  // Handle save from match detail modal
  const handleMatchDetailSave = (matchId, newPoints, updatedMatch) => {
    if (newPoints) {
      setMatchPoints(prev => ({ ...prev, [matchId]: newPoints }));
      showToast('Match points saved!');
    }
    if (updatedMatch) {
      setMatches(prev => prev.map(m => m.id === matchId ? updatedMatch : m));
      // Update selectedMatch so modal reflects changes
      setSelectedMatch(updatedMatch);
      showToast('Match info updated!');
    }
  };

  if (loading || !settings) {
    return <div className="text-center py-20 text-slate-400" data-testid="loading-indicator">Loading...</div>;
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
    <div className="space-y-6" data-testid="leaderboard-page">
      <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700" data-testid="leaderboard-header">
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
            <div className="text-xs text-slate-500 mt-1">
              {totalA > totalB ? `${settings.teamAName} leads` : totalA < totalB ? `${settings.teamBName} leads` : ''}
            </div>
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
          const mp = matchPoints[m.id] || {};
          const isToday = m.date === today;
          const isRefreshing = refreshingId === m.id;
          const hasData = mp.found;
          const tA = hasData ? (mp.teamA?.total || 0) + (mp.teamA?.adjustment || 0) : 0;
          const tB = hasData ? (mp.teamB?.total || 0) + (mp.teamB?.adjustment || 0) : 0;
          const diff = tA - tB;

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
                  {mp?.error && <div className="text-xs text-amber-400 mt-1">⚠ {mp.error}</div>}
                  {mp?.lastRefreshed && (
                    <div className="text-xs text-green-400 mt-1">
                      Refreshed {new Date(mp.lastRefreshed).toLocaleTimeString()}
                      {mp.source === 'api' && ' 📡 API'}
                      {mp.source === 'claude' && ' 🤖 Claude'}
                    </div>
                  )}
                  {isRefreshing && (
                    <div className="text-xs text-blue-400 mt-1 animate-pulse">
                      {refreshingMode === 'api' ? '📡 Fetching from CricketData API...' : '🤖 Claude searching the web...'}
                    </div>
                  )}
                </button>

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
                      data-testid={`refresh-api-${m.id}`}
                      className={`px-3 py-3 border-b border-slate-700 text-base transition-colors ${
                        isRefreshing && refreshingMode === 'api'
                          ? 'opacity-50 cursor-not-allowed bg-blue-900/30'
                          : 'hover:bg-blue-900/40 text-blue-400'
                      }`}
                    >
                      {isRefreshing && refreshingMode === 'api' ? '⏳' : '📡'}
                    </button>
                    <button
                      onClick={() => handleRefreshClaude(m)}
                      disabled={isRefreshing}
                      title="Refresh via Claude AI web search (uses tokens)"
                      data-testid={`refresh-claude-${m.id}`}
                      className={`px-3 py-3 text-base transition-colors ${
                        isRefreshing && refreshingMode === 'claude'
                          ? 'opacity-50 cursor-not-allowed bg-purple-900/30'
                          : 'hover:bg-purple-900/40 text-purple-400'
                      }`}
                    >
                      {isRefreshing && refreshingMode === 'claude' ? '⏳' : '🤖'}
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col px-3 py-3 text-slate-600 text-xs border-l border-slate-700">
                    <div className="py-2">📡</div>
                    <div className="py-2">🤖</div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Match Detail Modal */}
      {selectedMatch && (
        <MatchDetailModal
          match={selectedMatch}
          matchPoints={matchPoints}
          teams={teams}
          settings={settings}
          onClose={() => setSelectedMatch(null)}
          onSave={handleMatchDetailSave}
          onRefreshAPI={handleRefreshAPI}
          onRefreshClaude={handleRefreshClaude}
          refreshingId={refreshingId}
          refreshingMode={refreshingMode}
          currentUser={currentUser}
        />
      )}
    </div>
  );
}

// ANALYTICS PAGE
function AnalyticsPage({ currentUser, showToast }) {
  return (
    <div className="text-center py-20" data-testid="analytics-page">
      <div className="text-6xl mb-4">📈</div>
      <h2 className="text-2xl font-bold mb-2">Player Analytics</h2>
      <p className="text-slate-400">Detailed player statistics and performance tracking</p>
      <p className="text-sm text-slate-500 mt-4">Match-by-match breakdown, sorting, filtering - Coming in next phase</p>
    </div>
  );
}

// ADMIN PANEL
function AdminPanel({ currentUser, setCurrentUser, showToast }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadUsers = useCallback(async () => {
    try {
      const res = await api.getUsers();
      setUsers(res.data);
      setLoading(false);
    } catch (e) {
      showToast('Failed to load users', 'error');
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  if (loading) {
    return <div className="text-center py-20">Loading...</div>;
  }

  const roleColor = { admin: 'text-amber-400', 'read-only': 'text-slate-400', edit: 'text-blue-400' };
  const roleLabel = { admin: 'Admin', 'read-only': 'Read-only', edit: 'Editor' };

  return (
    <div className="max-w-4xl mx-auto" data-testid="admin-panel">
      <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-amber-400">🔐 User Management</h2>
            <p className="text-sm text-slate-400 mt-1">{users.length} user{users.length !== 1 ? 's' : ''} registered</p>
          </div>
        </div>

        <div className="space-y-3" data-testid="users-list">
          {users.map(u => (
            <div key={u.id} className="bg-slate-700/50 rounded-lg p-4 flex items-center gap-4" data-testid={`user-card-${u.id}`}>
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
      </div>
    </div>
  );
}

export default App;
