# IPL Fantasy League 2026 - PRD

## Original Problem Statement
Build an IPL Fantasy League web app based on a provided JSX file with all logic and screens. The app supports two teams competing across IPL 2026 matches, with live score fetching, player management, substitutions, analytics, and multiple competitions.

## Architecture
- **Backend**: FastAPI + MongoDB (Motor async driver)
- **Frontend**: React 19 + Tailwind CSS
- **Database**: MongoDB (ipl_fantasy_db)
- **External APIs**: CricketData.org API, Anthropic Claude AI (web search for scorecard scraping)
- **Data Model**: Competition-scoped (each competition = self-contained object with settings, teams, subs, matchPoints). Shared: matches, players, users.

## What's Been Implemented

### Phase 1: Initial MVP
- Login, Leaderboard, Settings, Admin panel, Database seed (145 players, 88 matches)

### Phase 2: Teams + Backup
- Full Teams page (CRUD, substitution, Excel import/export)
- Backup export/import (JSX prototype format compatible)

### Phase 3: Match Detail Modal
- Click match to open detail modal, edit per-player scores, manual adjustments, save to backend

### Phase 4: Multi-Competition Support
- **Competition Picker** in header — switch, create, edit, delete competitions
- Each competition has own: team names, scoring rules, player rosters, substitution counts, match points
- Shared data: match schedule, player master list, users
- Backup v1 (JSX single-comp) auto-converts to competition on import
- Backup v2 includes `competitions` array for multi-comp support

## Prioritized Backlog
### P1 (Important)
- [ ] Analytics page (player-wise performance, match-by-match breakdown)
- [ ] Admin panel user CRUD (create, edit, delete users + password changes)

### P2 (Nice to have)
- [ ] Player master config modal
- [ ] Score application across ALL competitions on refresh

## Next Tasks
1. Build Analytics page
2. Admin user CRUD
