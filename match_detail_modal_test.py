#!/usr/bin/env python3
"""
Match Detail Modal Backend API Testing
Tests specific endpoints used by the Match Detail Modal
"""

import requests
import json
import sys
from datetime import datetime

class MatchDetailModalTester:
    def __init__(self, base_url="https://fantasy-cricket-hub-38.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.session = requests.Session()
        self.session.headers.update({'Content-Type': 'application/json'})
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        self.test_match_id = None

    def log_result(self, test_name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {test_name}")
        else:
            print(f"❌ {test_name} - {details}")
        
        self.test_results.append({
            "test": test_name,
            "success": success,
            "details": details
        })

    def setup_test_data(self):
        """Get test match ID for testing"""
        print("\n🔧 Setting up test data...")
        
        try:
            response = self.session.get(f"{self.base_url}/matches")
            if response.status_code == 200:
                matches = response.json()
                if matches:
                    # Use first match for testing
                    self.test_match_id = matches[0]['id']
                    match_info = f"M{matches[0]['no']}: {matches[0]['t1']} vs {matches[0]['t2']}"
                    self.log_result("Test match selection", True, f"Using {match_info}")
                    return True
                else:
                    self.log_result("Test match selection", False, "No matches found")
                    return False
            else:
                self.log_result("Test match selection", False, f"Status: {response.status_code}")
                return False
        except Exception as e:
            self.log_result("Test match selection", False, str(e))
            return False

    def test_match_points_crud(self):
        """Test match points CRUD operations used by modal"""
        print("\n📊 Testing Match Points CRUD Operations...")
        
        if not self.test_match_id:
            self.log_result("Match points CRUD", False, "No test match ID available")
            return
        
        # Test GET specific match points
        try:
            response = self.session.get(f"{self.base_url}/match-points/{self.test_match_id}")
            if response.status_code == 200:
                points = response.json()
                self.log_result("GET /match-points/{matchId}", True, f"Retrieved points data")
            else:
                self.log_result("GET /match-points/{matchId}", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_result("GET /match-points/{matchId}", False, str(e))

        # Test PUT match points (save functionality)
        try:
            test_points = {
                "matchId": self.test_match_id,
                "teamA": {
                    "players": [
                        {
                            "id": "test-player-1",
                            "name": "Test Player 1",
                            "franchise": "RCB",
                            "role": "Batsman",
                            "runs": 45,
                            "wickets": 0,
                            "points": 45,
                            "active": True,
                            "scraped": False,
                            "manual": True
                        }
                    ],
                    "total": 45,
                    "adjustment": 5
                },
                "teamB": {
                    "players": [
                        {
                            "id": "test-player-2",
                            "name": "Test Player 2",
                            "franchise": "SRH",
                            "role": "Bowler",
                            "runs": 10,
                            "wickets": 2,
                            "points": 50,
                            "active": True,
                            "scraped": False,
                            "manual": True
                        }
                    ],
                    "total": 50,
                    "adjustment": -3
                },
                "found": True,
                "source": "manual",
                "lastRefreshed": datetime.now().isoformat()
            }
            
            response = self.session.put(f"{self.base_url}/match-points/{self.test_match_id}", json=test_points)
            if response.status_code == 200:
                self.log_result("PUT /match-points/{matchId}", True, "Match points saved successfully")
                
                # Verify the save by getting the data back
                verify_response = self.session.get(f"{self.base_url}/match-points/{self.test_match_id}")
                if verify_response.status_code == 200:
                    saved_data = verify_response.json()
                    if (saved_data.get('teamA', {}).get('total') == 45 and 
                        saved_data.get('teamB', {}).get('total') == 50):
                        self.log_result("Match points save verification", True, "Data persisted correctly")
                    else:
                        self.log_result("Match points save verification", False, "Data not saved correctly")
                else:
                    self.log_result("Match points save verification", False, f"Status: {verify_response.status_code}")
            else:
                self.log_result("PUT /match-points/{matchId}", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_result("PUT /match-points/{matchId}", False, str(e))

    def test_match_update(self):
        """Test match info update (Edit Match functionality)"""
        print("\n✏️ Testing Match Update Operations...")
        
        if not self.test_match_id:
            self.log_result("Match update", False, "No test match ID available")
            return
        
        # Get current match data
        try:
            response = self.session.get(f"{self.base_url}/matches")
            if response.status_code == 200:
                matches = response.json()
                test_match = next((m for m in matches if m['id'] == self.test_match_id), None)
                
                if test_match:
                    # Test updating match info
                    updated_match = {
                        **test_match,
                        "venue": "Test Stadium, Test City",
                        "date": test_match["date"]  # Keep original date
                    }
                    
                    update_response = self.session.put(f"{self.base_url}/matches/{self.test_match_id}", json=updated_match)
                    if update_response.status_code == 200:
                        self.log_result("PUT /matches/{matchId}", True, "Match info updated successfully")
                        
                        # Verify the update
                        verify_response = self.session.get(f"{self.base_url}/matches")
                        if verify_response.status_code == 200:
                            updated_matches = verify_response.json()
                            updated_test_match = next((m for m in updated_matches if m['id'] == self.test_match_id), None)
                            
                            if updated_test_match and updated_test_match.get('venue') == "Test Stadium, Test City":
                                self.log_result("Match update verification", True, "Match venue updated correctly")
                            else:
                                self.log_result("Match update verification", False, "Match venue not updated")
                        else:
                            self.log_result("Match update verification", False, f"Status: {verify_response.status_code}")
                    else:
                        self.log_result("PUT /matches/{matchId}", False, f"Status: {update_response.status_code}")
                else:
                    self.log_result("Match update", False, "Test match not found")
            else:
                self.log_result("Match update setup", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_result("PUT /matches/{matchId}", False, str(e))

    def test_teams_data_for_modal(self):
        """Test teams data retrieval for modal player mapping"""
        print("\n👥 Testing Teams Data for Modal...")
        
        try:
            response = self.session.get(f"{self.base_url}/teams")
            if response.status_code == 200:
                teams = response.json()
                
                # Check structure
                if 'teamA' in teams and 'teamB' in teams:
                    team_a_count = len(teams.get('teamA', []))
                    team_b_count = len(teams.get('teamB', []))
                    self.log_result("Teams data structure", True, f"TeamA: {team_a_count}, TeamB: {team_b_count} players")
                    
                    # Check if teams have players (needed for modal functionality)
                    if team_a_count == 0 and team_b_count == 0:
                        self.log_result("Teams data availability", False, "No players in teams - modal will be empty")
                    else:
                        self.log_result("Teams data availability", True, "Teams have players for modal display")
                else:
                    self.log_result("Teams data structure", False, "Missing teamA or teamB keys")
            else:
                self.log_result("GET /teams", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_result("GET /teams", False, str(e))

    def test_settings_for_modal(self):
        """Test settings data needed by modal"""
        print("\n⚙️ Testing Settings for Modal...")
        
        try:
            response = self.session.get(f"{self.base_url}/settings")
            if response.status_code == 200:
                settings = response.json()
                
                # Check required fields for modal
                required_fields = ['teamAName', 'teamBName', 'scoring']
                missing_fields = [field for field in required_fields if field not in settings]
                
                if not missing_fields:
                    team_a_name = settings.get('teamAName')
                    team_b_name = settings.get('teamBName')
                    scoring = settings.get('scoring', {})
                    
                    self.log_result("Settings for modal", True, f"Teams: {team_a_name} vs {team_b_name}")
                    
                    # Check scoring rules
                    scoring_fields = ['runPoints', 'wicketPoints']
                    if all(field in scoring for field in scoring_fields):
                        self.log_result("Scoring rules", True, f"Run points: {scoring['runPoints']}, Wicket points: {scoring['wicketPoints']}")
                    else:
                        self.log_result("Scoring rules", False, "Missing scoring configuration")
                else:
                    self.log_result("Settings for modal", False, f"Missing fields: {missing_fields}")
            else:
                self.log_result("GET /settings", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_result("GET /settings", False, str(e))

    def run_all_tests(self):
        """Run all match detail modal tests"""
        print("🚀 Starting Match Detail Modal Backend Tests")
        print(f"Testing against: {self.base_url}")
        print("=" * 60)
        
        if not self.setup_test_data():
            print("❌ Cannot proceed without test data")
            return False
        
        self.test_match_points_crud()
        self.test_match_update()
        self.test_teams_data_for_modal()
        self.test_settings_for_modal()
        
        print("\n" + "=" * 60)
        print(f"📊 Test Results: {self.tests_passed}/{self.tests_run} passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All Match Detail Modal backend tests passed!")
            return True
        else:
            print(f"⚠️  {self.tests_run - self.tests_passed} tests failed")
            return False

def main():
    """Main test execution"""
    tester = MatchDetailModalTester()
    success = tester.run_all_tests()
    
    # Print detailed results for debugging
    print("\n📋 Detailed Test Results:")
    for result in tester.test_results:
        status = "✅" if result["success"] else "❌"
        print(f"{status} {result['test']}: {result['details']}")
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())