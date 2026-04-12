// Calculate fantasy points
export const calcPoints = (runs, wickets, scoring) => {
  let pts = runs * scoring.runPoints + wickets * scoring.wicketPoints;
  if (runs >= 100) pts += scoring.bonus100PlusRuns;
  else if (runs >= 50) pts += scoring.bonus50to99Runs;
  if (wickets >= 5) pts += scoring.bonus5PlusWickets;
  else if (wickets >= 3) pts += scoring.bonus34Wickets;
  return pts;
};

// Calculate point breakdown for display
export const calcBreakdown = (runs, wickets, scoring) => {
  const parts = [];
  if (runs > 0) parts.push(`${runs}r × ${scoring.runPoints} = ${runs * scoring.runPoints}`);
  if (wickets > 0) parts.push(`${wickets}w × ${scoring.wicketPoints} = ${wickets * scoring.wicketPoints}`);
  if (runs >= 100) parts.push(`Century bonus +${scoring.bonus100PlusRuns}`);
  else if (runs >= 50) parts.push(`50+ bonus +${scoring.bonus50to99Runs}`);
  if (wickets >= 5) parts.push(`5w bonus +${scoring.bonus5PlusWickets}`);
  else if (wickets >= 3) parts.push(`3-4w bonus +${scoring.bonus34Wickets}`);
  return parts.join(', ') || 'No contribution';
};

// Format date
export const fmtDate = (d) => {
  if (!d) return '';
  return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
};

// Generate unique ID
export const uid = () => `p_${Date.now()}_${Math.random().toString(36).slice(2)}`;

// Check permissions
export const can = (user, perm) => {
  if (!user) return false;
  if (user.role === 'admin') return true;
  if (user.role === 'read-only') return false;
  if (user.role === 'edit') return (user.editPerms || []).includes(perm);
  return false;
};

// SHA-256 hash
export const sha256 = async (str) => {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
};

// Constants
export const FRANCHISES = ['CSK', 'DC', 'GT', 'KKR', 'LSG', 'MI', 'PBKS', 'RCB', 'RR', 'SRH'];
export const ROLES = ['Batsman', 'Bowler', 'Wicket-keeper', 'All-rounder'];

export const EDIT_PERMS = [
  { key: 'edit_player_config', label: 'Edit Player Config', desc: 'Add / edit / delete players in the master player list' },
  { key: 'edit_teams', label: 'Edit Teams', desc: 'Add, edit, substitute players in Ankur / Sarawat teams' },
  { key: 'refresh_scores', label: 'Refresh Scores', desc: 'Click Refresh to fetch live match scores' },
  { key: 'edit_match_points', label: 'Edit Match Points', desc: 'Manually edit runs / wickets / adjustments in a match' },
];

export const GUEST_USER = {
  id: 'guest',
  username: 'Guest',
  role: 'read-only',
  editPerms: []
};
