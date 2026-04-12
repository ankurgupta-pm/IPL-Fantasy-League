import axios from 'axios';

const API_BASE = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const api = {
  // Auth
  login: (username, password) => axios.post(`${API_BASE}/auth/login`, { username, password }),
  getUsers: () => axios.get(`${API_BASE}/auth/users`),
  createUser: (data) => axios.post(`${API_BASE}/auth/users`, data),
  updateUser: (userId, data) => axios.put(`${API_BASE}/auth/users/${userId}`, data),
  deleteUser: (userId) => axios.delete(`${API_BASE}/auth/users/${userId}`),
  changePassword: (userId, newPassword) => axios.post(`${API_BASE}/auth/change-password`, { userId, newPassword }),
  
  // Players (shared)
  getPlayers: () => axios.get(`${API_BASE}/players`),
  createPlayer: (player) => axios.post(`${API_BASE}/players`, player),
  updatePlayer: (playerId, player) => axios.put(`${API_BASE}/players/${playerId}`, player),
  deletePlayer: (playerId) => axios.delete(`${API_BASE}/players/${playerId}`),
  
  // Matches (shared)
  getMatches: () => axios.get(`${API_BASE}/matches`),
  createMatch: (match) => axios.post(`${API_BASE}/matches`, match),
  updateMatch: (matchId, match) => axios.put(`${API_BASE}/matches/${matchId}`, match),
  
  // Competitions
  getCompetitions: () => axios.get(`${API_BASE}/competitions`),
  getCompetition: (compId) => axios.get(`${API_BASE}/competitions/${compId}`),
  createCompetition: (data) => axios.post(`${API_BASE}/competitions`, data),
  updateCompetition: (compId, data) => axios.put(`${API_BASE}/competitions/${compId}`, data),
  deleteCompetition: (compId) => axios.delete(`${API_BASE}/competitions/${compId}`),
  
  // Active competition
  getActiveCompetitionId: () => axios.get(`${API_BASE}/active-competition`),
  setActiveCompetitionId: (id) => axios.put(`${API_BASE}/active-competition`, { activeCompetitionId: id }),
  
  // Competition-scoped: Teams
  getTeams: (compId) => axios.get(`${API_BASE}/competitions/${compId}/teams`),
  addTeamPlayer: (compId, teamId, player) => axios.post(`${API_BASE}/competitions/${compId}/teams/${teamId}/players`, player),
  updateTeamPlayer: (compId, teamId, playerId, player) => axios.put(`${API_BASE}/competitions/${compId}/teams/${teamId}/players/${playerId}`, player),
  deleteTeamPlayer: (compId, teamId, playerId) => axios.delete(`${API_BASE}/competitions/${compId}/teams/${teamId}/players/${playerId}`),
  substitutePlayer: (compId, teamId, data) => axios.post(`${API_BASE}/competitions/${compId}/teams/${teamId}/substitute`, data),
  getSubstitutions: (compId) => axios.get(`${API_BASE}/competitions/${compId}/substitutions`),
  bulkImportPlayers: (compId, teamId, players) => axios.post(`${API_BASE}/competitions/${compId}/teams/bulk-import/${teamId}`, players),
  
  // Competition-scoped: Match Points
  getAllMatchPoints: (compId) => axios.get(`${API_BASE}/competitions/${compId}/match-points`),
  updateMatchPoints: (compId, matchId, points) => axios.put(`${API_BASE}/competitions/${compId}/match-points/${matchId}`, points),
  
  // Competition-scoped: Scores
  refreshScoreAPI: (compId, matchId) => axios.post(`${API_BASE}/competitions/${compId}/scores/refresh-api`, { matchId }),
  refreshScoreClaude: (compId, matchId) => axios.post(`${API_BASE}/competitions/${compId}/scores/refresh-claude`, { matchId }),
  
  // Competition-scoped: Settings
  getSettings: (compId) => axios.get(`${API_BASE}/competitions/${compId}/settings`),
  updateSettings: (compId, settings) => axios.put(`${API_BASE}/competitions/${compId}/settings`, settings),
  
  // Backup
  exportBackup: () => axios.get(`${API_BASE}/backup/export`),
  importBackup: (data) => axios.post(`${API_BASE}/backup/import`, data),
};
