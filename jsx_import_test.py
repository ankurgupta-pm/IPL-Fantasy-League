#!/usr/bin/env python3
"""
JSX Backup Import Testing
Tests the specific bug fix for JSX format backup import where:
1. Frontend was double-converting JSX format, losing matchId keys
2. MongoDB _id fields were causing re-import issues
"""

import requests
import json
import sys
from datetime import datetime

class JSXImportTester:
    def __init__(self, base_url="https://fantasy-cricket-hub-38.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.session = requests.Session()
        self.session.headers.update({'Content-Type': 'application/json'})
        self.tests_run = 0
        self.tests_passed = 0

    def log_result(self, test_name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {test_name}")
        else:
            print(f"❌ {test_name} - {details}")

    def create_jsx_test_data(self):
        """Create test data in JSX format (original prototype format)"""
        return {
            "settings": {
                "teamAName": "Test Team A",
                "teamBName": "Test Team B", 
                "maxSubstitutions": 8,
                "scoring": {
                    "runPoints": 1,
                    "wicketPoints": 20,
                    "bonus34Wickets": 10,
                    "bonus5PlusWickets": 20,
                    "bonus50to99Runs": 10,
                    "bonus100PlusRuns": 20
                }
            },
            "playerMaster": [
                {
                    "id": "test_player_1",
                    "name": "Test Player 1",
                    "franchise": "CSK",
                    "role": "Batsman"
                },
                {
                    "id": "test_player_2", 
                    "name": "Test Player 2",
                    "franchise": "MI",
                    "role": "Bowler"
                }
            ],
            "teamA": [
                {
                    "id": "test_player_1",
                    "name": "Test Player 1",
                    "franchise": "CSK",
                    "role": "Batsman",
                    "effectiveDate": "2026-03-01"
                }
            ],
            "teamB": [
                {
                    "id": "test_player_2",
                    "name": "Test Player 2", 
                    "franchise": "MI",
                    "role": "Bowler",
                    "effectiveDate": "2026-03-01"
                }
            ],
            "subsA": 0,
            "subsB": 0,
            "matches": [
                {
                    "id": "test_match_1",
                    "no": 1,
                    "date": "2026-03-15",
                    "t1": "CSK",
                    "t2": "MI",
                    "venue": "Test Stadium"
                }
            ],
            # This is the critical part - matchPoints as dict keyed by matchId (JSX format)
            "matchPoints": {
                "test_match_1": {
                    "matchId": "test_match_1",
                    "teamA": {
                        "players": [
                            {
                                "id": "test_player_1",
                                "name": "Test Player 1",
                                "franchise": "CSK",
                                "role": "Batsman",
                                "runs": 50,
                                "wickets": 0,
                                "points": 60,
                                "active": True,
                                "scraped": True,
                                "manual": False
                            }
                        ],
                        "total": 60,
                        "adjustment": 0
                    },
                    "teamB": {
                        "players": [
                            {
                                "id": "test_player_2",
                                "name": "Test Player 2",
                                "franchise": "MI", 
                                "role": "Bowler",
                                "runs": 0,
                                "wickets": 3,
                                "points": 70,
                                "active": True,
                                "scraped": True,
                                "manual": False
                            }
                        ],
                        "total": 70,
                        "adjustment": 0
                    },
                    "found": True,
                    "source": "test",
                    "lastRefreshed": "2026-03-15T10:00:00"
                }
            },
            "users": [
                {
                    "id": "test_user_1",
                    "username": "test@example.com",
                    "passwordHash": "test_hash",
                    "role": "admin",
                    "editPerms": []
                }
            ]
        }

    def test_jsx_import(self):
        """Test JSX format backup import"""
        print("\n📥 Testing JSX Format Backup Import...")
        
        # Create JSX test data
        jsx_data = self.create_jsx_test_data()
        
        try:
            # Import the JSX data
            response = self.session.post(f"{self.base_url}/backup/import", json=jsx_data)
            if response.status_code == 200:
                result = response.json()
                if result.get("success"):
                    self.log_result("JSX backup import", True, "Import successful")
                else:
                    self.log_result("JSX backup import", False, "Import returned success=false")
            else:
                self.log_result("JSX backup import", False, f"Status: {response.status_code}, Response: {response.text}")
        except Exception as e:
            self.log_result("JSX backup import", False, str(e))

    def test_data_retrieval_after_import(self):
        """Test that imported data can be retrieved correctly"""
        print("\n🔍 Testing Data Retrieval After Import...")
        
        # Test settings
        try:
            response = self.session.get(f"{self.base_url}/settings")
            if response.status_code == 200:
                settings = response.json()
                if settings.get("teamAName") == "Test Team A" and settings.get("teamBName") == "Test Team B":
                    self.log_result("Settings after import", True, "Settings imported correctly")
                else:
                    self.log_result("Settings after import", False, f"Wrong team names: {settings.get('teamAName')}, {settings.get('teamBName')}")
            else:
                self.log_result("Settings after import", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_result("Settings after import", False, str(e))

        # Test players
        try:
            response = self.session.get(f"{self.base_url}/players")
            if response.status_code == 200:
                players = response.json()
                test_players = [p for p in players if p.get("name", "").startswith("Test Player")]
                if len(test_players) >= 2:
                    self.log_result("Players after import", True, f"Found {len(test_players)} test players")
                else:
                    self.log_result("Players after import", False, f"Expected 2+ test players, found {len(test_players)}")
            else:
                self.log_result("Players after import", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_result("Players after import", False, str(e))

        # Test teams
        try:
            response = self.session.get(f"{self.base_url}/teams")
            if response.status_code == 200:
                teams = response.json()
                team_a_players = teams.get("teamA", [])
                team_b_players = teams.get("teamB", [])
                
                # Check if test players are in teams
                team_a_test = any(p.get("name") == "Test Player 1" for p in team_a_players)
                team_b_test = any(p.get("name") == "Test Player 2" for p in team_b_players)
                
                if team_a_test and team_b_test:
                    self.log_result("Teams after import", True, "Test players found in both teams")
                else:
                    self.log_result("Teams after import", False, f"TeamA has test player: {team_a_test}, TeamB has test player: {team_b_test}")
            else:
                self.log_result("Teams after import", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_result("Teams after import", False, str(e))

        # Test matches
        try:
            response = self.session.get(f"{self.base_url}/matches")
            if response.status_code == 200:
                matches = response.json()
                test_matches = [m for m in matches if m.get("id") == "test_match_1"]
                if test_matches:
                    self.log_result("Matches after import", True, "Test match found")
                else:
                    self.log_result("Matches after import", False, "Test match not found")
            else:
                self.log_result("Matches after import", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_result("Matches after import", False, str(e))

        # Test match points - this is the critical test for the bug fix
        try:
            response = self.session.get(f"{self.base_url}/match-points")
            if response.status_code == 200:
                match_points = response.json()
                test_match_points = match_points.get("test_match_1")
                
                if test_match_points:
                    # Check if matchId is properly set
                    if test_match_points.get("matchId") == "test_match_1":
                        self.log_result("MatchPoints matchId injection", True, "matchId properly injected")
                    else:
                        self.log_result("MatchPoints matchId injection", False, f"matchId: {test_match_points.get('matchId')}")
                    
                    # Check if team data is preserved
                    team_a_data = test_match_points.get("teamA", {})
                    team_b_data = test_match_points.get("teamB", {})
                    
                    if team_a_data.get("total") == 60 and team_b_data.get("total") == 70:
                        self.log_result("MatchPoints data preservation", True, "Team totals preserved correctly")
                    else:
                        self.log_result("MatchPoints data preservation", False, f"TeamA: {team_a_data.get('total')}, TeamB: {team_b_data.get('total')}")
                else:
                    self.log_result("MatchPoints after import", False, "Test match points not found")
            else:
                self.log_result("MatchPoints after import", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_result("MatchPoints after import", False, str(e))

    def test_reimport_with_id_fields(self):
        """Test that re-import works even with _id fields present (simulating MongoDB export)"""
        print("\n🔄 Testing Re-import with _id Fields...")
        
        # Get current data (which will have _id fields from MongoDB)
        try:
            response = self.session.get(f"{self.base_url}/backup/export")
            if response.status_code == 200:
                backup_data = response.json()
                
                # Simulate what would happen if this data had _id fields
                # (In real scenario, these would come from MongoDB exports)
                if "users" in backup_data and backup_data["users"]:
                    for user in backup_data["users"]:
                        user["_id"] = "fake_mongo_id_" + user.get("id", "unknown")
                
                if "playerMaster" in backup_data and backup_data["playerMaster"]:
                    for player in backup_data["playerMaster"]:
                        player["_id"] = "fake_mongo_id_" + player.get("id", "unknown")
                
                # Try to re-import this data
                reimport_response = self.session.post(f"{self.base_url}/backup/import", json=backup_data)
                if reimport_response.status_code == 200:
                    result = reimport_response.json()
                    if result.get("success"):
                        self.log_result("Re-import with _id fields", True, "_id fields handled gracefully")
                    else:
                        self.log_result("Re-import with _id fields", False, "Re-import failed")
                else:
                    self.log_result("Re-import with _id fields", False, f"Status: {reimport_response.status_code}")
            else:
                self.log_result("Re-import test setup", False, f"Could not get backup data: {response.status_code}")
        except Exception as e:
            self.log_result("Re-import with _id fields", False, str(e))

    def run_all_tests(self):
        """Run all JSX import tests"""
        print("🚀 Starting JSX Backup Import Tests")
        print(f"Testing against: {self.base_url}")
        print("=" * 60)
        
        self.test_jsx_import()
        self.test_data_retrieval_after_import()
        self.test_reimport_with_id_fields()
        
        print("\n" + "=" * 60)
        print(f"📊 Test Results: {self.tests_passed}/{self.tests_run} passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All JSX import tests passed!")
            return True
        else:
            print(f"⚠️  {self.tests_run - self.tests_passed} tests failed")
            return False

def main():
    """Main test execution"""
    tester = JSXImportTester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())