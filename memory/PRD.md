# IPL Fantasy League 2026 - PRD

## Original Problem Statement
Build an IPL Fantasy League web app based on a provided JSX file with all logic and screens. The app supports two teams competing across IPL 2026 matches, with live score fetching, player management, substitutions, and analytics.

## Architecture
- **Backend**: FastAPI + MongoDB (Motor async driver)
- **Frontend**: React 19 + Tailwind CSS
- **Database**: MongoDB (ipl_fantasy_db)
- **External APIs**: CricketData.org API, Anthropic Claude AI (web search for scorecard scraping)

## User Personas
1. **Admin (ankur.citm@gmail.com)** - Full access: manage users, settings, teams, scores
2. **Editor** - Granular permissions: edit_player_config, edit_teams, refresh_scores, edit_match_points
3. **Read-only** - View leaderboard, teams, analytics
4. **Guest** - No login required, view-only access

## Core Requirements (Static)
1. Authentication with SHA-256 hashing and role-based permissions
2. Player master list (145+ IPL 2026 players across 10 franchises)
3. Two-team fantasy league (Ankur vs Sarawat)
4. 88 match schedule (84 league + 4 playoffs)
5. Live score fetching from CricketData API + Claude AI fallback
6. Configurable scoring rules (runs, wickets, bonuses)
7. Player substitution system (max 8 per team)
8. Excel import/export for teams
9. JSON backup/restore (compatible with original Claude artifact prototype format)
10. Analytics dashboard
11. Match detail modal for viewing/editing per-match scores

## What's Been Implemented

### Phase 1 (Initial MVP) - Jan 2026
- Backend API with 25+ endpoints
- Login page with admin/guest access + sessionStorage persistence
- Leaderboard page with 88 matches
- Settings page
- Admin panel (user viewing)
- Database seeded with 145 players, 88 matches

### Phase 2 (Teams + Backup) - Jan 2026
- Full Teams page with add/edit/remove players
- Searchable player dropdown (auto-fills franchise & role)
- Substitution system with tracking
- Excel template download, import, and export
- Backup export in exact JSX prototype format
- Backup import supporting BOTH old JSX format AND new API format
- Bug fix: Import no longer logs out user (sessionStorage)
- Bug fix: Import preserves admin credentials

### Phase 3 (Match Detail Modal) - Jan 2026
- Click any match on Leaderboard to open detail modal
- Per-player score editing (runs, wickets) with auto-calculated points
- Manual adjustment per team
- Team tabs (Ankur/Sarawat) filtering by playing franchise
- Add/remove manual players
- Edit Match info (teams, venue, date) — admin only
- Save Changes persists to backend
- Refresh buttons (CricketData API / Claude AI) inside modal
- Score summary with team totals and diff

## Prioritized Backlog
### P0 (Critical) - DONE
- [x] Authentication system
- [x] Leaderboard page
- [x] Teams page with full CRUD
- [x] Substitution feature
- [x] Backup/Restore (JSX format compatible)
- [x] Match Detail Modal (view/edit scores)

### P1 (Important)
- [ ] Analytics page (player-wise performance, match-by-match breakdown)
- [ ] Admin panel - user CRUD (create, edit, delete users)
- [ ] Password change functionality

### P2 (Nice to have)
- [ ] Player master config modal (add/edit/delete from master list)
- [ ] Fetch IPL squads from web (Claude AI integration)
- [ ] Add new match modal from leaderboard

## Next Tasks
1. Build Analytics page with sortable player statistics table
2. Add user CRUD in Admin panel
3. Add password change functionality
