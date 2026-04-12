from fastapi import FastAPI, APIRouter, HTTPException, Body
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import hashlib
from datetime import datetime
import anthropic
import httpx

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# API Keys
ANTHROPIC_API_KEY = os.environ['ANTHROPIC_API_KEY']
CRICKETDATA_API_KEY = os.environ['CRICKETDATA_API_KEY']
CRICKETDATA_BASE = "https://api.cricapi.com/v1"

# Create the main app
app = FastAPI()
api_router = APIRouter(prefix="/api")

# ─── MODELS ──────────────────────────────────────────────────────────────────

class User(BaseModel):
    id: str
    username: str
    passwordHash: str
    role: str  # "admin" | "edit" | "read-only"
    editPerms: List[str] = []

class UserCreate(BaseModel):
    username: str
    password: str
    role: str
    editPerms: List[str] = []

class UserUpdate(BaseModel):
    username: Optional[str] = None
    role: Optional[str] = None
    editPerms: Optional[List[str]] = None

class PasswordChange(BaseModel):
    userId: str
    newPassword: str

class LoginRequest(BaseModel):
    username: str
    password: str

class Player(BaseModel):
    id: str
    name: str
    franchise: str
    role: str

class TeamPlayer(BaseModel):
    id: str
    name: str
    franchise: str
    role: str
    effectiveDate: Optional[str] = None
    endDate: Optional[str] = None
    subInNumber: Optional[int] = None
    subOutNumber: Optional[int] = None

class SubstituteRequest(BaseModel):
    oldPlayerId: str
    oldEndDate: str
    newPlayer: TeamPlayer

class Match(BaseModel):
    id: str
    no: Any  # can be int or string like "Q1", "Final"
    date: str
    t1: str
    t2: str
    venue: str
    cricketDataId: Optional[str] = None

class MatchPlayerStats(BaseModel):
    id: str
    name: str
    franchise: str
    role: str
    runs: int = 0
    wickets: int = 0
    points: int = 0
    active: bool = True
    scraped: bool = False
    manual: bool = False

class TeamMatchPoints(BaseModel):
    players: List[MatchPlayerStats]
    total: int = 0
    adjustment: int = 0

class MatchPoints(BaseModel):
    matchId: str
    teamA: Optional[TeamMatchPoints] = None
    teamB: Optional[TeamMatchPoints] = None
    found: bool = False
    source: Optional[str] = None  # "api" | "claude"
    lastRefreshed: Optional[str] = None
    error: Optional[str] = None

class ScoringRules(BaseModel):
    runPoints: int = 1
    wicketPoints: int = 20
    bonus34Wickets: int = 10
    bonus5PlusWickets: int = 20
    bonus50to99Runs: int = 10
    bonus100PlusRuns: int = 20

class Settings(BaseModel):
    teamAName: str = "Ankur"
    teamBName: str = "Sarawat"
    maxSubstitutions: int = 8
    scoring: ScoringRules = Field(default_factory=ScoringRules)

class RefreshScoreRequest(BaseModel):
    matchId: str

class SetCricketDataIdRequest(BaseModel):
    matchId: str
    cricketDataId: str

# ─── HELPER FUNCTIONS ────────────────────────────────────────────────────────

def sha256(text: str) -> str:
    """Generate SHA-256 hash"""
    return hashlib.sha256(text.encode()).hexdigest()

def calc_points(runs: int, wickets: int, scoring: ScoringRules) -> int:
    """Calculate fantasy points"""
    pts = runs * scoring.runPoints + wickets * scoring.wicketPoints
    if runs >= 100:
        pts += scoring.bonus100PlusRuns
    elif runs >= 50:
        pts += scoring.bonus50to99Runs
    if wickets >= 5:
        pts += scoring.bonus5PlusWickets
    elif wickets >= 3:
        pts += scoring.bonus34Wickets
    return pts

def name_similarity(a: str, b: str) -> float:
    """Calculate name similarity score 0-1"""
    if not a or not b:
        return 0
    
    import re
    norm = lambda s: re.sub(r'[^a-z\s]', '', s.lower()).strip()
    na, nb = norm(a), norm(b)
    
    if na == nb:
        return 1.0
    
    ap = na.split()
    bp = nb.split()
    if not ap or not bp:
        return 0
    
    aFirst, bFirst = ap[0], bp[0]
    aLast, bLast = ap[-1], bp[-1]
    
    # Both first AND last match
    if aFirst == bFirst and aLast == bLast:
        return 0.97
    
    # Last name + first initial
    if aLast == bLast and len(aLast) > 3 and aFirst[0] == bFirst[0]:
        return 0.88
    
    # Containment
    if na in nb or nb in na:
        return 0.75
    
    # Last name only
    if aLast == bLast and len(aLast) > 4:
        return 0.50
    
    # First name only
    if aFirst == bFirst and len(aFirst) > 4:
        return 0.45
    
    return 0

def best_scorecard_match(playerName: str, scorecardPlayers: List[Dict]):
    """Find best matching player in scorecard"""
    threshold = 0.50
    scored = [
        {"sp": sp, "score": name_similarity(sp.get("name", ""), playerName)}
        for sp in scorecardPlayers
    ]
    scored = [x for x in scored if x["score"] >= threshold]
    scored.sort(key=lambda x: x["score"], reverse=True)
    return scored[0] if scored else None

# ─── AUTH ENDPOINTS ──────────────────────────────────────────────────────────

@api_router.post("/auth/login")
async def login(request: LoginRequest):
    """User login"""
    password_hash = sha256(request.password)
    user = await db.users.find_one(
        {"username": request.username, "passwordHash": password_hash},
        {"_id": 0}
    )
    
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    return user

@api_router.get("/auth/users")
async def get_users():
    """Get all users"""
    users = await db.users.find({}, {"_id": 0}).to_list(1000)
    return users

@api_router.post("/auth/users")
async def create_user(user: UserCreate):
    """Create new user"""
    # Check if username exists
    existing = await db.users.find_one({"username": user.username})
    if existing:
        raise HTTPException(status_code=400, detail="Username already exists")
    
    user_id = f"u_{datetime.now().timestamp()}"
    new_user = {
        "id": user_id,
        "username": user.username,
        "passwordHash": sha256(user.password),
        "role": user.role,
        "editPerms": user.editPerms if user.role == "edit" else []
    }
    
    await db.users.insert_one(new_user)
    new_user.pop("_id", None)
    return new_user

@api_router.put("/auth/users/{user_id}")
async def update_user(user_id: str, update: UserUpdate):
    """Update user"""
    update_data = {k: v for k, v in update.dict().items() if v is not None}
    
    if update_data:
        await db.users.update_one({"id": user_id}, {"$set": update_data})
    
    updated_user = await db.users.find_one({"id": user_id}, {"_id": 0})
    return updated_user

@api_router.delete("/auth/users/{user_id}")
async def delete_user(user_id: str):
    """Delete user"""
    await db.users.delete_one({"id": user_id})
    return {"success": True}

@api_router.post("/auth/change-password")
async def change_password(request: PasswordChange):
    """Change user password"""
    new_hash = sha256(request.newPassword)
    await db.users.update_one(
        {"id": request.userId},
        {"$set": {"passwordHash": new_hash}}
    )
    return {"success": True}

# ─── PLAYER ENDPOINTS ────────────────────────────────────────────────────────

@api_router.get("/players")
async def get_players():
    """Get all players from master list"""
    players = await db.players.find({}, {"_id": 0}).to_list(10000)
    return players

@api_router.post("/players")
async def create_player(player: Player):
    """Add player to master list"""
    await db.players.insert_one(player.dict())
    return player

@api_router.put("/players/{player_id}")
async def update_player(player_id: str, player: Player):
    """Update player in master list"""
    await db.players.update_one({"id": player_id}, {"$set": player.dict()})
    return player

@api_router.delete("/players/{player_id}")
async def delete_player(player_id: str):
    """Delete player from master list"""
    await db.players.delete_one({"id": player_id})
    return {"success": True}

@api_router.post("/players/fetch-from-web")
async def fetch_players_from_web():
    """Fetch IPL 2026 squads using Claude AI"""
    prompt = """Search espncricinfo.com or cricbuzz.com for the complete IPL 2026 squad lists for all 10 teams (CSK, DC, GT, KKR, LSG, MI, PBKS, RCB, RR, SRH).
For each player include their role: Batsman, Bowler, All-rounder, or Wicket-keeper.
Return ONLY valid JSON (no markdown, no explanation):
{"players":[{"name":"Full Name","franchise":"TEAM_CODE","role":"Role"}]}
Include ALL players from all 10 squads. franchise must be one of: CSK,DC,GT,KKR,LSG,MI,PBKS,RCB,RR,SRH"""
    
    try:
        client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
        
        messages = [{"role": "user", "content": prompt}]
        
        for i in range(8):
            response = client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=8000,
                tools=[{"type": "web_search_20250305", "name": "web_search"}],
                messages=messages
            )
            
            text_blocks = [b.text for b in response.content if hasattr(b, 'text')]
            tool_blocks = [b for b in response.content if hasattr(b, 'type') and b.type == 'tool_use']
            
            if response.stop_reason == "end_turn" or not tool_blocks:
                text = "".join(text_blocks)
                # Extract JSON
                import re
                text = re.sub(r'```json|```', '', text).strip()
                match = re.search(r'\{[\s\S]*\}', text)
                if match:
                    import json
                    data = json.loads(match.group(0))
                    if "players" in data:
                        return {"players": data["players"]}
                return {"players": []}
            
            messages.append({"role": "assistant", "content": response.content})
            messages.append({
                "role": "user",
                "content": [{"type": "tool_result", "tool_use_id": t.id, "content": ""} for t in tool_blocks]
            })
        
        return {"players": []}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ─── TEAM ENDPOINTS ──────────────────────────────────────────────────────────

@api_router.get("/teams")
async def get_teams():
    """Get both teams with their players"""
    teams = await db.teams.find_one({}, {"_id": 0})
    if not teams:
        teams = {"teamA": [], "teamB": []}
    return teams

@api_router.post("/teams/{team_id}/players")
async def add_team_player(team_id: str, player: TeamPlayer):
    """Add player to team"""
    teams = await db.teams.find_one({}, {"_id": 0}) or {"teamA": [], "teamB": []}
    teams[team_id].append(player.dict())
    await db.teams.update_one({}, {"$set": teams}, upsert=True)
    return player

@api_router.put("/teams/{team_id}/players/{player_id}")
async def update_team_player(team_id: str, player_id: str, player: TeamPlayer):
    """Update player in team"""
    teams = await db.teams.find_one({}, {"_id": 0})
    for i, p in enumerate(teams[team_id]):
        if p["id"] == player_id:
            teams[team_id][i] = player.dict()
            break
    await db.teams.update_one({}, {"$set": teams})
    return player

@api_router.delete("/teams/{team_id}/players/{player_id}")
async def delete_team_player(team_id: str, player_id: str):
    """Remove player from team"""
    teams = await db.teams.find_one({}, {"_id": 0})
    teams[team_id] = [p for p in teams[team_id] if p["id"] != player_id]
    await db.teams.update_one({}, {"$set": teams})
    return {"success": True}

@api_router.post("/teams/{team_id}/substitute")
async def substitute_player(team_id: str, request: SubstituteRequest):
    """Substitute a player"""
    teams = await db.teams.find_one({}, {"_id": 0})
    subs = await db.substitutions.find_one({}, {"_id": 0}) or {"teamA": 0, "teamB": 0}
    
    sub_number = subs[team_id] + 1
    
    # Update old player
    for i, p in enumerate(teams[team_id]):
        if p["id"] == request.oldPlayerId:
            teams[team_id][i]["endDate"] = request.oldEndDate
            teams[team_id][i]["subOutNumber"] = sub_number
            break
    
    # Add new player
    new_player_dict = request.newPlayer.dict()
    new_player_dict["subInNumber"] = sub_number
    teams[team_id].append(new_player_dict)
    
    # Update substitution count
    subs[team_id] = sub_number
    
    await db.teams.update_one({}, {"$set": teams}, upsert=True)
    await db.substitutions.update_one({}, {"$set": subs}, upsert=True)
    
    return {"success": True, "subNumber": sub_number}

@api_router.get("/teams/substitutions")
async def get_substitutions():
    """Get substitution counts"""
    subs = await db.substitutions.find_one({}, {"_id": 0})
    if not subs:
        subs = {"teamA": 0, "teamB": 0}
    return subs

@api_router.post("/teams/bulk-import/{team_id}")
async def bulk_import_players(team_id: str, players: List[TeamPlayer]):
    """Bulk import players to team"""
    teams = await db.teams.find_one({}, {"_id": 0}) or {"teamA": [], "teamB": []}
    teams[team_id].extend([p.dict() for p in players])
    await db.teams.update_one({}, {"$set": teams}, upsert=True)
    return {"success": True, "count": len(players)}

# ─── MATCH ENDPOINTS ─────────────────────────────────────────────────────────

@api_router.get("/matches")
async def get_matches():
    """Get all matches"""
    matches = await db.matches.find({}, {"_id": 0}).to_list(1000)
    return matches

@api_router.post("/matches")
async def create_match(match: Match):
    """Create new match"""
    await db.matches.insert_one(match.dict())
    return match

@api_router.put("/matches/{match_id}")
async def update_match(match_id: str, match: Match):
    """Update match"""
    await db.matches.update_one({"id": match_id}, {"$set": match.dict()})
    return match

@api_router.post("/matches/set-cricket-data-id")
async def set_cricket_data_id(request: SetCricketDataIdRequest):
    """Set CricketData match ID"""
    await db.matches.update_one(
        {"id": request.matchId},
        {"$set": {"cricketDataId": request.cricketDataId}}
    )
    return {"success": True}

# ─── MATCH POINTS ENDPOINTS ──────────────────────────────────────────────────

@api_router.get("/match-points")
async def get_all_match_points():
    """Get all match points"""
    points = await db.match_points.find({}, {"_id": 0}).to_list(1000)
    return {p["matchId"]: p for p in points}

@api_router.get("/match-points/{match_id}")
async def get_match_points(match_id: str):
    """Get points for specific match"""
    points = await db.match_points.find_one({"matchId": match_id}, {"_id": 0})
    return points or {}

@api_router.put("/match-points/{match_id}")
async def update_match_points(match_id: str, points: MatchPoints):
    """Update match points"""
    await db.match_points.update_one(
        {"matchId": match_id},
        {"$set": points.dict()},
        upsert=True
    )
    return points

# ─── SCORE REFRESH ENDPOINTS ─────────────────────────────────────────────────

@api_router.post("/scores/refresh-api")
async def refresh_score_api(request: RefreshScoreRequest):
    """Refresh match score using CricketData API"""
    match = await db.matches.find_one({"id": request.matchId}, {"_id": 0})
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    
    teams = await db.teams.find_one({}, {"_id": 0})
    settings = await db.settings.find_one({}, {"_id": 0})
    
    try:
        # Fetch scorecard from CricketData API
        match_id = match.get("cricketDataId")
        
        if match_id:
            # Direct scorecard fetch
            url = f"{CRICKETDATA_BASE}/match_scorecard?apikey={CRICKETDATA_API_KEY}&id={match_id}"
        else:
            # Find match first
            url = f"{CRICKETDATA_BASE}/matches?apikey={CRICKETDATA_API_KEY}&offset=0"
        
        async with httpx.AsyncClient() as client:
            response = await client.get(url)
            data = response.json()
        
        # Process scorecard (simplified - would need actual parsing logic)
        # For now, return structure
        return {
            "success": True,
            "found": False,
            "matchId": request.matchId,
            "message": "API integration ready - scorecard parsing to be implemented"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/scores/refresh-claude")
async def refresh_score_claude(request: RefreshScoreRequest):
    """Refresh match score using Claude AI web search"""
    match = await db.matches.find_one({"id": request.matchId}, {"_id": 0})
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    
    teams = await db.teams.find_one({}, {"_id": 0})
    settings = await db.settings.find_one({}, {"_id": 0}) or {"scoring": {}}
    
    prompt = f"""Search cricbuzz.com or espncricinfo.com for the IPL 2026 scorecard: {match['t1']} vs {match['t2']} on {match['date']}.
Return ONLY valid JSON, no markdown:
{{"found":true,"players":[{{"name":"Full Name","franchise":"CODE","runs":0,"wickets":0}}]}}
Rules: include all batsmen (runs) and bowlers (wickets). Merge if player did both. Franchise codes: CSK DC GT KKR LSG MI PBKS RCB RR SRH.
If match not done yet: {{"found":false,"players":[]}}"""
    
    try:
        client_anthropic = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
        messages = [{"role": "user", "content": prompt}]
        
        for i in range(4):
            response = client_anthropic.messages.create(
                model="claude-haiku-4-5-20251001",
                max_tokens=1000,
                tools=[{"type": "web_search_20250305", "name": "web_search"}],
                messages=messages
            )
            
            text_blocks = [b.text for b in response.content if hasattr(b, 'text')]
            tool_blocks = [b for b in response.content if hasattr(b, 'type') and b.type == 'tool_use']
            
            if response.stop_reason == "end_turn" or not tool_blocks:
                text = "".join(text_blocks)
                import re, json
                text = re.sub(r'```json|```', '', text).strip()
                match_json = re.search(r'\{[\s\S]*\}', text)
                if match_json:
                    data = json.loads(match_json.group(0))
                    
                    # Build match points
                    if data.get("found"):
                        scorecard_players = data.get("players", [])
                        
                        # Map players to teams
                        teamA_players = []
                        teamB_players = []
                        
                        for team_key, team_list in [("teamA", teamA_players), ("teamB", teamB_players)]:
                            for tp in teams.get(team_key, []):
                                # Find in scorecard
                                found_match = best_scorecard_match(tp["name"], scorecard_players)
                                
                                if found_match:
                                    sp = found_match["sp"]
                                    runs = int(sp.get("runs", 0))
                                    wickets = int(sp.get("wickets", 0))
                                    points = calc_points(runs, wickets, ScoringRules(**settings.get("scoring", {})))
                                    
                                    team_list.append({
                                        "id": tp["id"],
                                        "name": tp["name"],
                                        "franchise": tp["franchise"],
                                        "role": tp["role"],
                                        "runs": runs,
                                        "wickets": wickets,
                                        "points": points,
                                        "active": True,
                                        "scraped": True,
                                        "manual": False
                                    })
                                else:
                                    # Not found in scorecard
                                    team_list.append({
                                        "id": tp["id"],
                                        "name": tp["name"],
                                        "franchise": tp["franchise"],
                                        "role": tp["role"],
                                        "runs": 0,
                                        "wickets": 0,
                                        "points": 0,
                                        "active": True,
                                        "scraped": False,
                                        "manual": False
                                    })
                        
                        match_points = {
                            "matchId": request.matchId,
                            "teamA": {
                                "players": teamA_players,
                                "total": sum(p["points"] for p in teamA_players),
                                "adjustment": 0
                            },
                            "teamB": {
                                "players": teamB_players,
                                "total": sum(p["points"] for p in teamB_players),
                                "adjustment": 0
                            },
                            "found": True,
                            "source": "claude",
                            "lastRefreshed": datetime.now().isoformat()
                        }
                        
                        await db.match_points.update_one(
                            {"matchId": request.matchId},
                            {"$set": match_points},
                            upsert=True
                        )
                        
                        return match_points
                    else:
                        return {"found": False, "players": []}
                
                return {"found": False, "players": []}
            
            messages.append({"role": "assistant", "content": response.content})
            messages.append({
                "role": "user",
                "content": [{"type": "tool_result", "tool_use_id": t.id, "content": ""} for t in tool_blocks]
            })
        
        return {"found": False, "players": []}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ─── SETTINGS ENDPOINTS ──────────────────────────────────────────────────────

@api_router.get("/settings")
async def get_settings():
    """Get app settings"""
    settings = await db.settings.find_one({}, {"_id": 0})
    if not settings:
        settings = Settings().dict()
    return settings

@api_router.put("/settings")
async def update_settings(settings: Settings):
    """Update app settings"""
    await db.settings.update_one({}, {"$set": settings.dict()}, upsert=True)
    return settings

# ─── BACKUP ENDPOINTS ────────────────────────────────────────────────────────

@api_router.get("/backup/export")
async def export_backup():
    """Export all data as JSON"""
    data = {
        "users": await db.users.find({}, {"_id": 0}).to_list(1000),
        "players": await db.players.find({}, {"_id": 0}).to_list(10000),
        "teams": await db.teams.find_one({}, {"_id": 0}) or {"teamA": [], "teamB": []},
        "matches": await db.matches.find({}, {"_id": 0}).to_list(1000),
        "matchPoints": await db.match_points.find({}, {"_id": 0}).to_list(1000),
        "settings": await db.settings.find_one({}, {"_id": 0}) or Settings().dict(),
        "substitutions": await db.substitutions.find_one({}, {"_id": 0}) or {"teamA": 0, "teamB": 0}
    }
    return data

@api_router.post("/backup/import")
async def import_backup(data: Dict[str, Any] = Body(...)):
    """Import data from JSON backup"""
    try:
        if "users" in data:
            await db.users.delete_many({})
            if data["users"]:
                await db.users.insert_many(data["users"])
        
        if "players" in data:
            await db.players.delete_many({})
            if data["players"]:
                await db.players.insert_many(data["players"])
        
        if "teams" in data:
            await db.teams.delete_many({})
            await db.teams.insert_one(data["teams"])
        
        if "matches" in data:
            await db.matches.delete_many({})
            if data["matches"]:
                await db.matches.insert_many(data["matches"])
        
        if "matchPoints" in data:
            await db.match_points.delete_many({})
            if data["matchPoints"]:
                await db.match_points.insert_many(data["matchPoints"])
        
        if "settings" in data:
            await db.settings.delete_many({})
            await db.settings.insert_one(data["settings"])
        
        if "substitutions" in data:
            await db.substitutions.delete_many({})
            await db.substitutions.insert_one(data["substitutions"])
        
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ─── ANALYTICS ENDPOINTS ─────────────────────────────────────────────────────

@api_router.get("/analytics/{team_id}")
async def get_analytics(team_id: str):
    """Get player analytics for a team"""
    teams = await db.teams.find_one({}, {"_id": 0})
    matches = await db.matches.find({}, {"_id": 0}).to_list(1000)
    match_points = await db.match_points.find({}, {"_id": 0}).to_list(1000)
    
    team_players = teams.get(team_id, [])
    points_dict = {p["matchId"]: p for p in match_points}
    
    analytics = []
    for player in team_players:
        player_stats = {
            **player,
            "totalPoints": 0,
            "perMatch": {}
        }
        
        for match in matches:
            mp = points_dict.get(match["id"])
            if not mp or not mp.get("found"):
                continue
            
            # Check if player's franchise is playing
            franchises = {match["t1"], match["t2"]}
            if player["franchise"] not in franchises:
                player_stats["perMatch"][match["id"]] = None
                continue
            
            # Check if player is active for this match
            match_date = match["date"]
            if player.get("effectiveDate") and player["effectiveDate"] > match_date:
                player_stats["perMatch"][match["id"]] = {"pts": 0, "inactive": True}
                continue
            if player.get("endDate") and player["endDate"] < match_date:
                player_stats["perMatch"][match["id"]] = {"pts": 0, "inactive": True}
                continue
            
            # Find player in match points
            all_players = (mp.get("teamA", {}).get("players", []) + 
                          mp.get("teamB", {}).get("players", []))
            
            found_player = None
            for sp in all_players:
                if sp["id"] == player["id"] or sp["name"] == player["name"]:
                    found_player = sp
                    break
            
            if found_player:
                pts = found_player.get("points", 0)
                player_stats["totalPoints"] += pts
                player_stats["perMatch"][match["id"]] = {
                    "pts": pts,
                    "runs": found_player.get("runs", 0),
                    "wickets": found_player.get("wickets", 0)
                }
            else:
                player_stats["perMatch"][match["id"]] = {"pts": 0, "runs": 0, "wickets": 0}
        
        analytics.append(player_stats)
    
    return analytics

# Include router
app.include_router(api_router)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()