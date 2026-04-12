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
import re
import json
import copy

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

ANTHROPIC_API_KEY = os.environ.get('ANTHROPIC_API_KEY', '')
CRICKETDATA_API_KEY = os.environ.get('CRICKETDATA_API_KEY', '')
CRICKETDATA_BASE = "https://api.cricapi.com/v1"

app = FastAPI()
api_router = APIRouter(prefix="/api")

# ─── LOGGING ──────────────────────────────────────────────────────────────────
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ─── MODELS ───────────────────────────────────────────────────────────────────

class ScoringRules(BaseModel):
    runPoints: int = 1
    wicketPoints: int = 20
    bonus34Wickets: int = 10
    bonus5PlusWickets: int = 20
    bonus50to99Runs: int = 10
    bonus100PlusRuns: int = 20

DEFAULT_SCORING = ScoringRules().dict()

def make_default_competition(overrides=None):
    comp = {
        "id": f"comp_{datetime.now().timestamp()}",
        "name": "IPL 2026",
        "teamAName": "Ankur",
        "teamBName": "Sarawat",
        "maxSubstitutions": 8,
        "scoring": DEFAULT_SCORING,
        "players": {"teamA": [], "teamB": []},
        "subs": {"teamA": 0, "teamB": 0},
        "matchPoints": {},
    }
    if overrides:
        comp.update(overrides)
    return comp

# ─── HELPERS ──────────────────────────────────────────────────────────────────

def sha256(text: str) -> str:
    return hashlib.sha256(text.encode()).hexdigest()

def calc_points(runs: int, wickets: int, scoring: dict) -> int:
    pts = runs * scoring.get("runPoints", 1) + wickets * scoring.get("wicketPoints", 20)
    if runs >= 100: pts += scoring.get("bonus100PlusRuns", 20)
    elif runs >= 50: pts += scoring.get("bonus50to99Runs", 10)
    if wickets >= 5: pts += scoring.get("bonus5PlusWickets", 20)
    elif wickets >= 3: pts += scoring.get("bonus34Wickets", 10)
    return pts

def name_similarity(a: str, b: str) -> float:
    if not a or not b: return 0
    norm = lambda s: re.sub(r'[^a-z\s]', '', s.lower()).strip()
    na, nb = norm(a), norm(b)
    if na == nb: return 1.0
    ap, bp = na.split(), nb.split()
    if not ap or not bp: return 0
    aF, bF, aL, bL = ap[0], bp[0], ap[-1], bp[-1]
    if aF == bF and aL == bL: return 0.97
    if aL == bL and len(aL) > 3 and aF[0] == bF[0]: return 0.88
    if na in nb or nb in na: return 0.75
    if aL == bL and len(aL) > 4: return 0.50
    if aF == bF and len(aF) > 4: return 0.45
    return 0

def best_scorecard_match(playerName, scorecardPlayers):
    scored = [{"sp": sp, "score": name_similarity(sp.get("name", ""), playerName)} for sp in scorecardPlayers]
    scored = [x for x in scored if x["score"] >= 0.50]
    scored.sort(key=lambda x: x["score"], reverse=True)
    return scored[0] if scored else None

def clean_doc(doc):
    if isinstance(doc, dict):
        return {k: v for k, v in doc.items() if k != '_id'}
    return doc

def clean_docs(docs):
    if isinstance(docs, list):
        return [clean_doc(d) for d in docs if isinstance(d, dict)]
    return clean_doc(docs) if isinstance(docs, dict) else docs

# ─── AUTH ─────────────────────────────────────────────────────────────────────

@api_router.get("/auth/users")
async def get_users():
    return await db.users.find({}, {"_id": 0}).to_list(1000)

@api_router.post("/auth/login")
async def login(data: Dict[str, Any] = Body(...)):
    h = sha256(data["password"])
    user = await db.users.find_one({"username": data["username"], "passwordHash": h}, {"_id": 0})
    if not user: raise HTTPException(status_code=401, detail="Invalid credentials")
    return user

@api_router.post("/auth/users")
async def create_user(data: Dict[str, Any] = Body(...)):
    if await db.users.find_one({"username": data["username"]}):
        raise HTTPException(status_code=400, detail="Username exists")
    user = {"id": f"u_{datetime.now().timestamp()}", "username": data["username"],
            "passwordHash": sha256(data["password"]), "role": data.get("role", "read-only"),
            "editPerms": data.get("editPerms", [])}
    await db.users.insert_one(user)
    user.pop("_id", None)
    return user

@api_router.put("/auth/users/{user_id}")
async def update_user(user_id: str, data: Dict[str, Any] = Body(...)):
    update = {k: v for k, v in data.items() if v is not None and k != '_id'}
    if update: await db.users.update_one({"id": user_id}, {"$set": update})
    return await db.users.find_one({"id": user_id}, {"_id": 0})

@api_router.delete("/auth/users/{user_id}")
async def delete_user(user_id: str):
    await db.users.delete_one({"id": user_id})
    return {"success": True}

@api_router.post("/auth/change-password")
async def change_password(data: Dict[str, Any] = Body(...)):
    await db.users.update_one({"id": data["userId"]}, {"$set": {"passwordHash": sha256(data["newPassword"])}})
    return {"success": True}

# ─── PLAYERS (shared master list) ─────────────────────────────────────────────

@api_router.get("/players")
async def get_players():
    return await db.players.find({}, {"_id": 0}).to_list(10000)

@api_router.post("/players")
async def create_player(data: Dict[str, Any] = Body(...)):
    await db.players.insert_one(data)
    return clean_doc(data)

@api_router.put("/players/{player_id}")
async def update_player(player_id: str, data: Dict[str, Any] = Body(...)):
    await db.players.update_one({"id": player_id}, {"$set": clean_doc(data)})
    return clean_doc(data)

@api_router.delete("/players/{player_id}")
async def delete_player(player_id: str):
    await db.players.delete_one({"id": player_id})
    return {"success": True}

# ─── MATCHES (shared schedule) ────────────────────────────────────────────────

@api_router.get("/matches")
async def get_matches():
    return await db.matches.find({}, {"_id": 0}).to_list(1000)

@api_router.post("/matches")
async def create_match(data: Dict[str, Any] = Body(...)):
    await db.matches.insert_one(data)
    return clean_doc(data)

@api_router.put("/matches/{match_id}")
async def update_match(match_id: str, data: Dict[str, Any] = Body(...)):
    await db.matches.update_one({"id": match_id}, {"$set": clean_doc(data)})
    return clean_doc(data)

# ─── COMPETITIONS ─────────────────────────────────────────────────────────────

@api_router.get("/competitions")
async def get_competitions():
    comps = await db.competitions.find({}, {"_id": 0}).to_list(100)
    return comps

@api_router.get("/competitions/{comp_id}")
async def get_competition(comp_id: str):
    comp = await db.competitions.find_one({"id": comp_id}, {"_id": 0})
    if not comp: raise HTTPException(status_code=404, detail="Competition not found")
    return comp

@api_router.post("/competitions")
async def create_competition(data: Dict[str, Any] = Body(...)):
    comp = make_default_competition(data)
    await db.competitions.insert_one(comp)
    return clean_doc(comp)

@api_router.put("/competitions/{comp_id}")
async def update_competition(comp_id: str, data: Dict[str, Any] = Body(...)):
    update = clean_doc(data)
    update.pop("id", None)  # don't overwrite id
    await db.competitions.update_one({"id": comp_id}, {"$set": update})
    comp = await db.competitions.find_one({"id": comp_id}, {"_id": 0})
    return comp

@api_router.delete("/competitions/{comp_id}")
async def delete_competition(comp_id: str):
    await db.competitions.delete_one({"id": comp_id})
    return {"success": True}

# ─── COMPETITION-SCOPED: TEAMS ────────────────────────────────────────────────

@api_router.get("/competitions/{comp_id}/teams")
async def get_comp_teams(comp_id: str):
    comp = await db.competitions.find_one({"id": comp_id}, {"_id": 0})
    if not comp: raise HTTPException(status_code=404)
    return comp.get("players", {"teamA": [], "teamB": []})

@api_router.post("/competitions/{comp_id}/teams/{team_id}/players")
async def add_comp_team_player(comp_id: str, team_id: str, data: Dict[str, Any] = Body(...)):
    await db.competitions.update_one({"id": comp_id}, {"$push": {f"players.{team_id}": clean_doc(data)}})
    return data

@api_router.put("/competitions/{comp_id}/teams/{team_id}/players/{player_id}")
async def update_comp_team_player(comp_id: str, team_id: str, player_id: str, data: Dict[str, Any] = Body(...)):
    comp = await db.competitions.find_one({"id": comp_id}, {"_id": 0})
    players = comp.get("players", {}).get(team_id, [])
    for i, p in enumerate(players):
        if p.get("id") == player_id:
            players[i] = clean_doc(data)
            break
    await db.competitions.update_one({"id": comp_id}, {"$set": {f"players.{team_id}": players}})
    return data

@api_router.delete("/competitions/{comp_id}/teams/{team_id}/players/{player_id}")
async def delete_comp_team_player(comp_id: str, team_id: str, player_id: str):
    comp = await db.competitions.find_one({"id": comp_id}, {"_id": 0})
    players = [p for p in comp.get("players", {}).get(team_id, []) if p.get("id") != player_id]
    await db.competitions.update_one({"id": comp_id}, {"$set": {f"players.{team_id}": players}})
    return {"success": True}

@api_router.post("/competitions/{comp_id}/teams/{team_id}/substitute")
async def substitute_comp_player(comp_id: str, team_id: str, data: Dict[str, Any] = Body(...)):
    comp = await db.competitions.find_one({"id": comp_id}, {"_id": 0})
    players = comp.get("players", {}).get(team_id, [])
    subs = comp.get("subs", {"teamA": 0, "teamB": 0})
    sub_number = subs.get(team_id, 0) + 1
    for i, p in enumerate(players):
        if p.get("id") == data["oldPlayerId"]:
            players[i]["endDate"] = data["oldEndDate"]
            players[i]["subOutNumber"] = sub_number
            break
    new_player = clean_doc(data["newPlayer"])
    new_player["subInNumber"] = sub_number
    players.append(new_player)
    subs[team_id] = sub_number
    await db.competitions.update_one({"id": comp_id}, {"$set": {f"players.{team_id}": players, "subs": subs}})
    return {"success": True, "subNumber": sub_number}

@api_router.get("/competitions/{comp_id}/substitutions")
async def get_comp_subs(comp_id: str):
    comp = await db.competitions.find_one({"id": comp_id}, {"_id": 0})
    return comp.get("subs", {"teamA": 0, "teamB": 0})

@api_router.post("/competitions/{comp_id}/teams/bulk-import/{team_id}")
async def bulk_import_comp_players(comp_id: str, team_id: str, data: List[Dict[str, Any]] = Body(...)):
    await db.competitions.update_one({"id": comp_id}, {"$push": {f"players.{team_id}": {"$each": clean_docs(data)}}})
    return {"success": True, "count": len(data)}

# ─── COMPETITION-SCOPED: MATCH POINTS ─────────────────────────────────────────

@api_router.get("/competitions/{comp_id}/match-points")
async def get_comp_match_points(comp_id: str):
    comp = await db.competitions.find_one({"id": comp_id}, {"_id": 0})
    return comp.get("matchPoints", {})

@api_router.put("/competitions/{comp_id}/match-points/{match_id}")
async def update_comp_match_points(comp_id: str, match_id: str, data: Dict[str, Any] = Body(...)):
    await db.competitions.update_one({"id": comp_id}, {"$set": {f"matchPoints.{match_id}": clean_doc(data)}})
    return data

# ─── COMPETITION-SCOPED: SETTINGS (read from competition itself) ──────────────

@api_router.get("/competitions/{comp_id}/settings")
async def get_comp_settings(comp_id: str):
    comp = await db.competitions.find_one({"id": comp_id}, {"_id": 0})
    if not comp: raise HTTPException(status_code=404)
    return {
        "teamAName": comp.get("teamAName", "Team A"),
        "teamBName": comp.get("teamBName", "Team B"),
        "maxSubstitutions": comp.get("maxSubstitutions", 8),
        "scoring": comp.get("scoring", DEFAULT_SCORING),
    }

@api_router.put("/competitions/{comp_id}/settings")
async def update_comp_settings(comp_id: str, data: Dict[str, Any] = Body(...)):
    update = {}
    for k in ["teamAName", "teamBName", "maxSubstitutions", "scoring"]:
        if k in data: update[k] = data[k]
    if update:
        await db.competitions.update_one({"id": comp_id}, {"$set": update})
    return data

# ─── SCORE REFRESH (applies to a specific competition) ────────────────────────

@api_router.post("/competitions/{comp_id}/scores/refresh-claude")
async def refresh_comp_score_claude(comp_id: str, data: Dict[str, Any] = Body(...)):
    match_id = data["matchId"]
    match = await db.matches.find_one({"id": match_id}, {"_id": 0})
    if not match: raise HTTPException(status_code=404, detail="Match not found")
    comp = await db.competitions.find_one({"id": comp_id}, {"_id": 0})
    if not comp: raise HTTPException(status_code=404, detail="Competition not found")

    prompt = f"""Search cricbuzz.com or espncricinfo.com for the IPL 2026 scorecard: {match['t1']} vs {match['t2']} on {match['date']}.
Return ONLY valid JSON, no markdown:
{{"found":true,"players":[{{"name":"Full Name","franchise":"CODE","runs":0,"wickets":0}}]}}
Rules: include all batsmen (runs) and bowlers (wickets). Merge if player did both. Franchise codes: CSK DC GT KKR LSG MI PBKS RCB RR SRH.
If match not done yet: {{"found":false,"players":[]}}"""

    try:
        client_ai = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
        messages = [{"role": "user", "content": prompt}]
        for i in range(4):
            response = client_ai.messages.create(model="claude-haiku-4-5-20251001", max_tokens=1000,
                tools=[{"type": "web_search_20250305", "name": "web_search"}], messages=messages)
            text_blocks = [b.text for b in response.content if hasattr(b, 'text')]
            tool_blocks = [b for b in response.content if hasattr(b, 'type') and b.type == 'tool_use']
            if response.stop_reason == "end_turn" or not tool_blocks:
                text = "".join(text_blocks)
                text = re.sub(r'```json|```', '', text).strip()
                match_json = re.search(r'\{[\s\S]*\}', text)
                if match_json:
                    sc = json.loads(match_json.group(0))
                    if sc.get("found"):
                        scorecard_players = sc.get("players", [])
                        scoring = comp.get("scoring", DEFAULT_SCORING)
                        result = _apply_scorecard_to_comp(comp, match_id, scorecard_players, scoring, "claude")
                        await db.competitions.update_one({"id": comp_id}, {"$set": {f"matchPoints.{match_id}": result}})
                        return result
                return {"found": False, "players": []}
            messages.append({"role": "assistant", "content": response.content})
            messages.append({"role": "user", "content": [{"type": "tool_result", "tool_use_id": t.id, "content": ""} for t in tool_blocks]})
        return {"found": False, "players": []}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/competitions/{comp_id}/scores/refresh-api")
async def refresh_comp_score_api(comp_id: str, data: Dict[str, Any] = Body(...)):
    match_id = data["matchId"]
    match = await db.matches.find_one({"id": match_id}, {"_id": 0})
    if not match: raise HTTPException(status_code=404)
    return {"success": True, "found": False, "message": "CricketData API - no live data for future matches"}

def _apply_scorecard_to_comp(comp, match_id, scorecard_players, scoring, source):
    """Build matchPoints entry for a competition from raw scorecard players."""
    teamA_players = []
    teamB_players = []
    for team_key, team_list in [("teamA", teamA_players), ("teamB", teamB_players)]:
        for tp in comp.get("players", {}).get(team_key, []):
            found = best_scorecard_match(tp["name"], scorecard_players)
            if found:
                sp = found["sp"]
                runs = int(sp.get("runs", 0))
                wickets = int(sp.get("wickets", 0))
                points = calc_points(runs, wickets, scoring)
                team_list.append({"id": tp["id"], "name": tp["name"], "franchise": tp["franchise"],
                    "role": tp["role"], "runs": runs, "wickets": wickets, "points": points,
                    "active": True, "scraped": True, "manual": False})
            else:
                team_list.append({"id": tp["id"], "name": tp["name"], "franchise": tp["franchise"],
                    "role": tp["role"], "runs": 0, "wickets": 0, "points": 0,
                    "active": True, "scraped": False, "manual": False})
    return {
        "matchId": match_id,
        "teamA": {"players": teamA_players, "total": sum(p["points"] for p in teamA_players), "adjustment": 0},
        "teamB": {"players": teamB_players, "total": sum(p["points"] for p in teamB_players), "adjustment": 0},
        "found": True, "source": source, "lastRefreshed": datetime.now().isoformat()
    }

# ─── ACTIVE COMPETITION ID ────────────────────────────────────────────────────

@api_router.get("/active-competition")
async def get_active_competition_id():
    doc = await db.app_state.find_one({"key": "activeCompetitionId"}, {"_id": 0})
    return {"activeCompetitionId": doc["value"] if doc else None}

@api_router.put("/active-competition")
async def set_active_competition_id(data: Dict[str, Any] = Body(...)):
    await db.app_state.update_one({"key": "activeCompetitionId"}, {"$set": {"key": "activeCompetitionId", "value": data["activeCompetitionId"]}}, upsert=True)
    return {"success": True}

# ─── BACKUP ───────────────────────────────────────────────────────────────────

@api_router.get("/backup/export")
async def export_backup():
    """Export in v2 multi-competition format, but also include v1 keys for backward compat."""
    comps = await db.competitions.find({}, {"_id": 0}).to_list(100)
    active_doc = await db.app_state.find_one({"key": "activeCompetitionId"}, {"_id": 0})
    active_id = active_doc["value"] if active_doc else (comps[0]["id"] if comps else None)
    active_comp = next((c for c in comps if c["id"] == active_id), comps[0] if comps else None)

    # v1 keys (backward compat with JSX prototype)
    backup = {
        "settings": {"teamAName": active_comp.get("teamAName", ""), "teamBName": active_comp.get("teamBName", ""),
                      "maxSubstitutions": active_comp.get("maxSubstitutions", 8), "scoring": active_comp.get("scoring", DEFAULT_SCORING)} if active_comp else {},
        "playerMaster": await db.players.find({}, {"_id": 0}).to_list(10000),
        "teamA": active_comp.get("players", {}).get("teamA", []) if active_comp else [],
        "teamB": active_comp.get("players", {}).get("teamB", []) if active_comp else [],
        "subsA": active_comp.get("subs", {}).get("teamA", 0) if active_comp else 0,
        "subsB": active_comp.get("subs", {}).get("teamB", 0) if active_comp else 0,
        "matches": await db.matches.find({}, {"_id": 0}).to_list(1000),
        "matchPoints": active_comp.get("matchPoints", {}) if active_comp else {},
        "users": await db.users.find({}, {"_id": 0}).to_list(1000),
        # v2 keys
        "competitions": clean_docs(comps),
        "activeCompetitionId": active_id,
    }
    return backup

@api_router.post("/backup/import")
async def import_backup(data: Dict[str, Any] = Body(...)):
    """Import backup. Supports v1 (single-comp JSX) and v2 (multi-comp)."""
    try:
        is_v2 = "competitions" in data and isinstance(data["competitions"], list)
        is_v1 = "teamA" in data or "playerMaster" in data
        logger.info(f"Importing backup. Format: {'v2' if is_v2 else 'v1/JSX' if is_v1 else 'unknown'}. Keys: {list(data.keys())}")

        # Users
        users_data = data.get("users")
        if users_data and isinstance(users_data, list) and len(users_data) > 0:
            existing = await db.users.find({}, {"_id": 0}).to_list(1000)
            existing_by_id = {u["id"]: u for u in existing}
            imported = {u["id"]: u for u in clean_docs(users_data)}
            for uid_val, user in existing_by_id.items():
                if uid_val not in imported and user.get("role") == "admin":
                    imported[uid_val] = user
            if "admin-ankur" not in imported:
                imported["admin-ankur"] = {"id": "admin-ankur", "username": "ankur.citm@gmail.com",
                    "passwordHash": sha256("admin"), "role": "admin", "editPerms": []}
            await db.users.delete_many({})
            await db.users.insert_many(list(imported.values()))

        # Players
        players_data = data.get("playerMaster") if is_v1 else data.get("playerMaster", data.get("players"))
        if players_data and isinstance(players_data, list) and len(players_data) > 0:
            await db.players.delete_many({})
            await db.players.insert_many(clean_docs(players_data))

        # Matches
        if data.get("matches") and isinstance(data["matches"], list) and len(data["matches"]) > 0:
            await db.matches.delete_many({})
            await db.matches.insert_many(clean_docs(data["matches"]))

        # Competitions
        if is_v2:
            await db.competitions.delete_many({})
            for c in data["competitions"]:
                await db.competitions.insert_one(clean_doc(c))
            active_id = data.get("activeCompetitionId", data["competitions"][0]["id"] if data["competitions"] else None)
            if active_id:
                await db.app_state.update_one({"key": "activeCompetitionId"}, {"$set": {"key": "activeCompetitionId", "value": active_id}}, upsert=True)
        elif is_v1:
            # Convert v1 single-comp to a competition
            mp_data = data.get("matchPoints", {})
            if isinstance(mp_data, dict) and not isinstance(mp_data, list):
                for mid, mpv in mp_data.items():
                    if isinstance(mpv, dict):
                        mpv["matchId"] = mpv.get("matchId", mid)
            elif isinstance(mp_data, list):
                mp_dict = {}
                for mp in mp_data:
                    if isinstance(mp, dict) and "matchId" in mp:
                        mp_dict[mp["matchId"]] = mp
                mp_data = mp_dict

            settings = data.get("settings", {})
            comp = make_default_competition({
                "id": "comp_imported",
                "name": settings.get("teamAName", "Ankur") + " vs " + settings.get("teamBName", "Sarawat"),
                "teamAName": settings.get("teamAName", "Ankur"),
                "teamBName": settings.get("teamBName", "Sarawat"),
                "maxSubstitutions": settings.get("maxSubstitutions", 8),
                "scoring": settings.get("scoring", DEFAULT_SCORING),
                "players": {"teamA": data.get("teamA", []), "teamB": data.get("teamB", [])},
                "subs": {"teamA": data.get("subsA", 0), "teamB": data.get("subsB", 0)},
                "matchPoints": mp_data,
            })
            await db.competitions.delete_many({})
            await db.competitions.insert_one(comp)
            await db.app_state.update_one({"key": "activeCompetitionId"}, {"$set": {"key": "activeCompetitionId", "value": comp["id"]}}, upsert=True)

        logger.info("Backup import completed")
        return {"success": True}
    except Exception as e:
        logger.error(f"Import failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ─── INCLUDE ROUTER & MIDDLEWARE ──────────────────────────────────────────────

app.include_router(api_router)
app.add_middleware(CORSMiddleware, allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"], allow_headers=["*"])

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
