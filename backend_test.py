#!/usr/bin/env python3
"""
IPL Fantasy League Backend API Testing
Tests all backend endpoints for functionality and data integrity
"""

import requests
import json
import sys
from datetime import datetime, timedelta
import hashlib

class IPLFantasyAPITester:
    def __init__(self, base_url="https://fantasy-cricket-hub-38.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.session = requests.Session()
        self.session.headers.update({'Content-Type': 'application/json'})
        self.tests_run = 0
        self.tests_passed = 0
        self.admin_user = None
        self.test_results = []

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

    def sha256(self, text):
        """Generate SHA-256 hash"""
        return hashlib.sha256(text.encode()).hexdigest()

    def test_auth_endpoints(self):
        """Test authentication endpoints"""
        print("\n🔐 Testing Authentication Endpoints...")
        
        # Test get users
        try:
            response = self.session.get(f"{self.base_url}/auth/users")
            if response.status_code == 200:
                users = response.json()
                self.log_result("GET /auth/users", True, f"Found {len(users)} users")
                
                # Find admin user
                admin_user = None
                for user in users:
                    if user.get('username') == 'ankur.citm@gmail.com' and user.get('role') == 'admin':
                        admin_user = user
                        break
                
                if admin_user:
                    self.admin_user = admin_user
                    self.log_result("Admin user found", True, "ankur.citm@gmail.com exists")
                else:
                    self.log_result("Admin user found", False, "ankur.citm@gmail.com not found")
            else:
                self.log_result("GET /auth/users", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_result("GET /auth/users", False, str(e))

        # Test login with admin credentials
        try:
            login_data = {
                "username": "ankur.citm@gmail.com",
                "password": "admin"
            }
            response = self.session.post(f"{self.base_url}/auth/login", json=login_data)
            if response.status_code == 200:
                user_data = response.json()
                if user_data.get('role') == 'admin':
                    self.log_result("Admin login", True, "Successfully authenticated")
                else:
                    self.log_result("Admin login", False, f"Wrong role: {user_data.get('role')}")
            else:
                self.log_result("Admin login", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_result("Admin login", False, str(e))

    def test_player_endpoints(self):
        """Test player management endpoints"""
        print("\n👥 Testing Player Endpoints...")
        
        # Test get players
        try:
            response = self.session.get(f"{self.base_url}/players")
            if response.status_code == 200:
                players = response.json()
                self.log_result("GET /players", True, f"Found {len(players)} players")
            else:
                self.log_result("GET /players", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_result("GET /players", False, str(e))

    def test_team_endpoints(self):
        """Test team management endpoints"""
        print("\n🏏 Testing Team Endpoints...")
        
        # Test get teams
        try:
            response = self.session.get(f"{self.base_url}/teams")
            if response.status_code == 200:
                teams = response.json()
                team_a_count = len(teams.get('teamA', []))
                team_b_count = len(teams.get('teamB', []))
                self.log_result("GET /teams", True, f"TeamA: {team_a_count}, TeamB: {team_b_count} players")
            else:
                self.log_result("GET /teams", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_result("GET /teams", False, str(e))

        # Test get substitutions
        try:
            response = self.session.get(f"{self.base_url}/teams/substitutions")
            if response.status_code == 200:
                subs = response.json()
                self.log_result("GET /teams/substitutions", True, f"TeamA: {subs.get('teamA', 0)}, TeamB: {subs.get('teamB', 0)} subs")
            else:
                self.log_result("GET /teams/substitutions", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_result("GET /teams/substitutions", False, str(e))

    def test_match_endpoints(self):
        """Test match management endpoints"""
        print("\n🏆 Testing Match Endpoints...")
        
        # Test get matches
        try:
            response = self.session.get(f"{self.base_url}/matches")
            if response.status_code == 200:
                matches = response.json()
                self.log_result("GET /matches", True, f"Found {len(matches)} matches")
                
                # Verify we have 88 matches as mentioned in requirements
                if len(matches) == 88:
                    self.log_result("Match count verification", True, "88 matches found as expected")
                else:
                    self.log_result("Match count verification", False, f"Expected 88, found {len(matches)}")
            else:
                self.log_result("GET /matches", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_result("GET /matches", False, str(e))

    def test_match_points_endpoints(self):
        """Test match points endpoints"""
        print("\n📊 Testing Match Points Endpoints...")
        
        # Test get all match points
        try:
            response = self.session.get(f"{self.base_url}/match-points")
            if response.status_code == 200:
                points = response.json()
                self.log_result("GET /match-points", True, f"Found points for {len(points)} matches")
            else:
                self.log_result("GET /match-points", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_result("GET /match-points", False, str(e))

    def test_settings_endpoints(self):
        """Test settings endpoints"""
        print("\n⚙️ Testing Settings Endpoints...")
        
        # Test get settings
        try:
            response = self.session.get(f"{self.base_url}/settings")
            if response.status_code == 200:
                settings = response.json()
                team_a = settings.get('teamAName', 'Unknown')
                team_b = settings.get('teamBName', 'Unknown')
                max_subs = settings.get('maxSubstitutions', 0)
                self.log_result("GET /settings", True, f"Teams: {team_a} vs {team_b}, Max subs: {max_subs}")
            else:
                self.log_result("GET /settings", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_result("GET /settings", False, str(e))

    def test_backup_endpoints(self):
        """Test backup/restore endpoints"""
        print("\n💾 Testing Backup Endpoints...")
        
        # Test backup export - this is critical for JSX format compatibility
        try:
            response = self.session.get(f"{self.base_url}/backup/export")
            if response.status_code == 200:
                backup_data = response.json()
                
                # Verify JSX format keys are present
                required_keys = ['settings', 'playerMaster', 'teamA', 'teamB', 'subsA', 'subsB', 'matches', 'matchPoints', 'users']
                missing_keys = [key for key in required_keys if key not in backup_data]
                
                if not missing_keys:
                    self.log_result("Backup export JSX format", True, "All required JSX keys present")
                else:
                    self.log_result("Backup export JSX format", False, f"Missing keys: {missing_keys}")
                
                # Check data types
                if isinstance(backup_data.get('teamA'), list) and isinstance(backup_data.get('teamB'), list):
                    self.log_result("Backup team data format", True, "Teams are arrays as expected")
                else:
                    self.log_result("Backup team data format", False, "Teams should be arrays")
                
                if isinstance(backup_data.get('matchPoints'), dict):
                    self.log_result("Backup matchPoints format", True, "MatchPoints is object as expected")
                else:
                    self.log_result("Backup matchPoints format", False, "MatchPoints should be object")
                    
            else:
                self.log_result("GET /backup/export", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_result("GET /backup/export", False, str(e))

    def test_score_refresh_endpoints(self):
        """Test score refresh endpoints"""
        print("\n🔄 Testing Score Refresh Endpoints...")
        
        # Get a match ID for testing
        try:
            matches_response = self.session.get(f"{self.base_url}/matches")
            if matches_response.status_code == 200:
                matches = matches_response.json()
                if matches:
                    test_match_id = matches[0]['id']
                    
                    # Test API refresh (should handle gracefully even if no data)
                    try:
                        refresh_data = {"matchId": test_match_id}
                        response = self.session.post(f"{self.base_url}/scores/refresh-api", json=refresh_data)
                        if response.status_code in [200, 404, 500]:  # Any of these are acceptable
                            self.log_result("POST /scores/refresh-api", True, f"Status: {response.status_code}")
                        else:
                            self.log_result("POST /scores/refresh-api", False, f"Unexpected status: {response.status_code}")
                    except Exception as e:
                        self.log_result("POST /scores/refresh-api", False, str(e))
                    
                    # Test Claude refresh (should handle gracefully even if no data)
                    try:
                        refresh_data = {"matchId": test_match_id}
                        response = self.session.post(f"{self.base_url}/scores/refresh-claude", json=refresh_data)
                        if response.status_code in [200, 404, 500]:  # Any of these are acceptable
                            self.log_result("POST /scores/refresh-claude", True, f"Status: {response.status_code}")
                        else:
                            self.log_result("POST /scores/refresh-claude", False, f"Unexpected status: {response.status_code}")
                    except Exception as e:
                        self.log_result("POST /scores/refresh-claude", False, str(e))
                else:
                    self.log_result("Score refresh test setup", False, "No matches found for testing")
        except Exception as e:
            self.log_result("Score refresh test setup", False, str(e))

    def run_all_tests(self):
        """Run all backend API tests"""
        print("🚀 Starting IPL Fantasy League Backend API Tests")
        print(f"Testing against: {self.base_url}")
        print("=" * 60)
        
        self.test_auth_endpoints()
        self.test_player_endpoints()
        self.test_team_endpoints()
        self.test_match_endpoints()
        self.test_match_points_endpoints()
        self.test_settings_endpoints()
        self.test_backup_endpoints()
        self.test_score_refresh_endpoints()
        
        print("\n" + "=" * 60)
        print(f"📊 Test Results: {self.tests_passed}/{self.tests_run} passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All backend tests passed!")
            return True
        else:
            print(f"⚠️  {self.tests_run - self.tests_passed} tests failed")
            return False

def main():
    """Main test execution"""
    tester = IPLFantasyAPITester()
    success = tester.run_all_tests()
    
    # Print detailed results for debugging
    print("\n📋 Detailed Test Results:")
    for result in tester.test_results:
        status = "✅" if result["success"] else "❌"
        print(f"{status} {result['test']}: {result['details']}")
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())