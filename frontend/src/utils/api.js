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
  
  // Players
  getPlayers: () => axios.get(`${API_BASE}/players`),
  createPlayer: (player) => axios.post(`${API_BASE}/players`, player),
  updatePlayer: (playerId, player) => axios.put(`${API_BASE}/players/${playerId}`, player),
  deletePlayer: (playerId) => axios.delete(`${API_BASE}/players/${playerId}`),
  fetchPlayersFromWeb: () => axios.post(`${API_BASE}/players/fetch-from-web`),
  
  // Teams
  getTeams: () => axios.get(`${API_BASE}/teams`),
  addTeamPlayer: (teamId, player) => axios.post(`${API_BASE}/teams/${teamId}/players`, player),
  updateTeamPlayer: (teamId, playerId, player) => axios.put(`${API_BASE}/teams/${teamId}/players/${playerId}`, player),
  deleteTeamPlayer: (teamId, playerId) => axios.delete(`${API_BASE}/teams/${teamId}/players/${playerId}`),
  substitutePlayer: (teamId, data) => axios.post(`${API_BASE}/teams/${teamId}/substitute`, data),
  getSubstitutions: () => axios.get(`${API_BASE}/teams/substitutions`),
  bulkImportPlayers: (teamId, players) => axios.post(`${API_BASE}/teams/bulk-import/${teamId}`, players),
  
  // Matches
  getMatches: () => axios.get(`${API_BASE}/matches`),
  createMatch: (match) => axios.post(`${API_BASE}/matches`, match),
  updateMatch: (matchId, match) => axios.put(`${API_BASE}/matches/${matchId}`, match),
  setCricketDataId: (matchId, cricketDataId) => axios.post(`${API_BASE}/matches/set-cricket-data-id`, { matchId, cricketDataId }),
  
  // Match Points
  getAllMatchPoints: () => axios.get(`${API_BASE}/match-points`),
  getMatchPoints: (matchId) => axios.get(`${API_BASE}/match-points/${matchId}`),
  updateMatchPoints: (matchId, points) => axios.put(`${API_BASE}/match-points/${matchId}`, points),
  
  // Scores
  refreshScoreAPI: (matchId) => axios.post(`${API_BASE}/scores/refresh-api`, { matchId }),
  refreshScoreClaude: (matchId) => axios.post(`${API_BASE}/scores/refresh-claude`, { matchId }),
  
  // Settings
  getSettings: () => axios.get(`${API_BASE}/settings`),
  updateSettings: (settings) => axios.put(`${API_BASE}/settings`, settings),
  
  // Backup
  exportBackup: () => axios.get(`${API_BASE}/backup/export`),
  importBackup: (data) => axios.post(`${API_BASE}/backup/import`, data),
  
  // Analytics
  getAnalytics: (teamId) => axios.get(`${API_BASE}/analytics/${teamId}`)
};
