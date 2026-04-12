#!/usr/bin/env python3
"""
Backend API Testing for IPL Fantasy League - Multi-Competition Support
Tests all competition-related endpoints and functionality
"""

import requests
import json
import sys
from datetime import datetime

class MultiCompetitionAPITester:
    def __init__(self, base_url="https://fantasy-cricket-hub-38.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.comp_ids = []  # Track created competition IDs for cleanup

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        if headers is None:
            headers = {'Content-Type': 'application/json'}

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return True, response.json()
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    print(f"   Response: {response.text}")
                except:
                    pass
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_competitions_crud(self):
        """Test competition CRUD operations"""
        print("\n" + "="*60)
        print("TESTING COMPETITION CRUD OPERATIONS")
        print("="*60)
        
        # 1. Get existing competitions
        success, comps = self.run_test(
            "GET /competitions - List competitions",
            "GET", "competitions", 200
        )
        if not success:
            return False
        
        initial_count = len(comps)
        print(f"   Found {initial_count} existing competitions")
        
        # 2. Create new competition
        new_comp_data = {
            "id": f"comp_test_{int(datetime.now().timestamp())}",
            "name": "Test Competition 2026",
            "teamAName": "Test Team A",
            "teamBName": "Test Team B"
        }
        
        success, created_comp = self.run_test(
            "POST /competitions - Create competition",
            "POST", "competitions", 200, new_comp_data
        )
        if not success:
            return False
        
        comp_id = created_comp.get("id")
        if comp_id:
            self.comp_ids.append(comp_id)
            print(f"   Created competition with ID: {comp_id}")
        
        # 3. Get specific competition
        success, comp_detail = self.run_test(
            f"GET /competitions/{comp_id} - Get competition details",
            "GET", f"competitions/{comp_id}", 200
        )
        if not success:
            return False
        
        # Verify competition structure
        required_fields = ["id", "name", "teamAName", "teamBName", "maxSubstitutions", "scoring", "players", "subs", "matchPoints"]
        for field in required_fields:
            if field not in comp_detail:
                print(f"❌ Missing required field: {field}")
                return False
        print(f"   Competition structure verified")
        
        # 4. Update competition
        update_data = {
            "name": "Updated Test Competition",
            "teamAName": "Updated Team A"
        }
        
        success, updated_comp = self.run_test(
            f"PUT /competitions/{comp_id} - Update competition",
            "PUT", f"competitions/{comp_id}", 200, update_data
        )
        if not success:
            return False
        
        if updated_comp.get("name") != "Updated Test Competition":
            print(f"❌ Competition name not updated correctly")
            return False
        print(f"   Competition updated successfully")
        
        # 5. List competitions again to verify count
        success, updated_comps = self.run_test(
            "GET /competitions - List competitions after create",
            "GET", "competitions", 200
        )
        if not success:
            return False
        
        if len(updated_comps) != initial_count + 1:
            print(f"❌ Competition count mismatch. Expected {initial_count + 1}, got {len(updated_comps)}")
            return False
        print(f"   Competition count verified: {len(updated_comps)}")
        
        return True

    def test_active_competition(self):
        """Test active competition management"""
        print("\n" + "="*60)
        print("TESTING ACTIVE COMPETITION MANAGEMENT")
        print("="*60)
        
        # 1. Get current active competition
        success, active_data = self.run_test(
            "GET /active-competition - Get active competition",
            "GET", "active-competition", 200
        )
        if not success:
            return False
        
        original_active = active_data.get("activeCompetitionId")
        print(f"   Current active competition: {original_active}")
        
        # 2. Set new active competition (use first created comp if available)
        if self.comp_ids:
            test_comp_id = self.comp_ids[0]
            success, _ = self.run_test(
                "PUT /active-competition - Set active competition",
                "PUT", "active-competition", 200, {"activeCompetitionId": test_comp_id}
            )
            if not success:
                return False
            
            # 3. Verify active competition changed
            success, new_active_data = self.run_test(
                "GET /active-competition - Verify active competition changed",
                "GET", "active-competition", 200
            )
            if not success:
                return False
            
            if new_active_data.get("activeCompetitionId") != test_comp_id:
                print(f"❌ Active competition not updated. Expected {test_comp_id}, got {new_active_data.get('activeCompetitionId')}")
                return False
            print(f"   Active competition updated to: {test_comp_id}")
            
            # 4. Restore original active competition
            if original_active:
                success, _ = self.run_test(
                    "PUT /active-competition - Restore original active",
                    "PUT", "active-competition", 200, {"activeCompetitionId": original_active}
                )
                if not success:
                    return False
                print(f"   Restored original active competition: {original_active}")
        
        return True

    def test_competition_scoped_endpoints(self):
        """Test competition-scoped endpoints"""
        print("\n" + "="*60)
        print("TESTING COMPETITION-SCOPED ENDPOINTS")
        print("="*60)
        
        # Use default competition for testing
        comp_id = "comp_default"
        
        # 1. Test competition teams endpoint
        success, teams_data = self.run_test(
            f"GET /competitions/{comp_id}/teams - Get competition teams",
            "GET", f"competitions/{comp_id}/teams", 200
        )
        if not success:
            return False
        
        if not isinstance(teams_data, dict) or "teamA" not in teams_data or "teamB" not in teams_data:
            print(f"❌ Invalid teams structure: {teams_data}")
            return False
        print(f"   Teams structure verified: teamA({len(teams_data['teamA'])}), teamB({len(teams_data['teamB'])})")
        
        # 2. Test competition match points endpoint
        success, match_points = self.run_test(
            f"GET /competitions/{comp_id}/match-points - Get competition match points",
            "GET", f"competitions/{comp_id}/match-points", 200
        )
        if not success:
            return False
        
        if not isinstance(match_points, dict):
            print(f"❌ Invalid match points structure: {match_points}")
            return False
        print(f"   Match points structure verified: {len(match_points)} matches")
        
        # 3. Test competition settings endpoint
        success, settings = self.run_test(
            f"GET /competitions/{comp_id}/settings - Get competition settings",
            "GET", f"competitions/{comp_id}/settings", 200
        )
        if not success:
            return False
        
        required_settings = ["teamAName", "teamBName", "maxSubstitutions", "scoring"]
        for field in required_settings:
            if field not in settings:
                print(f"❌ Missing required setting: {field}")
                return False
        print(f"   Settings structure verified")
        
        # 4. Test updating competition settings
        updated_settings = {
            "teamAName": "Test Team Alpha",
            "teamBName": "Test Team Beta",
            "maxSubstitutions": 10
        }
        
        success, _ = self.run_test(
            f"PUT /competitions/{comp_id}/settings - Update competition settings",
            "PUT", f"competitions/{comp_id}/settings", 200, updated_settings
        )
        if not success:
            return False
        
        # 5. Verify settings were updated
        success, updated_settings_data = self.run_test(
            f"GET /competitions/{comp_id}/settings - Verify settings updated",
            "GET", f"competitions/{comp_id}/settings", 200
        )
        if not success:
            return False
        
        if updated_settings_data.get("teamAName") != "Test Team Alpha":
            print(f"❌ Settings not updated correctly")
            return False
        print(f"   Settings updated successfully")
        
        return True

    def test_backup_endpoints(self):
        """Test backup import/export endpoints"""
        print("\n" + "="*60)
        print("TESTING BACKUP IMPORT/EXPORT")
        print("="*60)
        
        # 1. Test backup export
        success, backup_data = self.run_test(
            "GET /backup/export - Export backup",
            "GET", "backup/export", 200
        )
        if not success:
            return False
        
        # Verify v2 format (should have competitions array)
        if "competitions" not in backup_data:
            print(f"❌ Backup missing competitions array (v2 format)")
            return False
        
        # Verify v1 compatibility keys
        v1_keys = ["settings", "playerMaster", "teamA", "teamB", "matches", "users"]
        for key in v1_keys:
            if key not in backup_data:
                print(f"❌ Backup missing v1 compatibility key: {key}")
                return False
        
        print(f"   Backup export verified: v2 format with v1 compatibility")
        print(f"   Competitions: {len(backup_data['competitions'])}")
        print(f"   Players: {len(backup_data.get('playerMaster', []))}")
        print(f"   Matches: {len(backup_data.get('matches', []))}")
        
        # 2. Test backup import (using exported data)
        success, _ = self.run_test(
            "POST /backup/import - Import backup",
            "POST", "backup/import", 200, backup_data
        )
        if not success:
            return False
        
        print(f"   Backup import successful")
        
        return True

    def test_shared_endpoints(self):
        """Test shared endpoints (players, matches, users)"""
        print("\n" + "="*60)
        print("TESTING SHARED ENDPOINTS")
        print("="*60)
        
        # 1. Test players endpoint
        success, players = self.run_test(
            "GET /players - Get all players",
            "GET", "players", 200
        )
        if not success:
            return False
        
        if not isinstance(players, list) or len(players) == 0:
            print(f"❌ No players found")
            return False
        print(f"   Players verified: {len(players)} players")
        
        # 2. Test matches endpoint
        success, matches = self.run_test(
            "GET /matches - Get all matches",
            "GET", "matches", 200
        )
        if not success:
            return False
        
        if not isinstance(matches, list) or len(matches) == 0:
            print(f"❌ No matches found")
            return False
        print(f"   Matches verified: {len(matches)} matches")
        
        # 3. Test users endpoint
        success, users = self.run_test(
            "GET /auth/users - Get all users",
            "GET", "auth/users", 200
        )
        if not success:
            return False
        
        if not isinstance(users, list) or len(users) == 0:
            print(f"❌ No users found")
            return False
        print(f"   Users verified: {len(users)} users")
        
        return True

    def cleanup(self):
        """Clean up test competitions"""
        print("\n" + "="*60)
        print("CLEANING UP TEST DATA")
        print("="*60)
        
        for comp_id in self.comp_ids:
            success, _ = self.run_test(
                f"DELETE /competitions/{comp_id} - Delete test competition",
                "DELETE", f"competitions/{comp_id}", 200
            )
            if success:
                print(f"   Deleted competition: {comp_id}")
            else:
                print(f"   Failed to delete competition: {comp_id}")

    def run_all_tests(self):
        """Run all backend tests"""
        print("🚀 Starting Multi-Competition Backend API Tests")
        print(f"📡 Testing against: {self.base_url}")
        
        try:
            # Run all test suites
            tests = [
                self.test_shared_endpoints,
                self.test_competitions_crud,
                self.test_active_competition,
                self.test_competition_scoped_endpoints,
                self.test_backup_endpoints
            ]
            
            all_passed = True
            for test in tests:
                if not test():
                    all_passed = False
                    break
            
            # Cleanup
            self.cleanup()
            
            # Print results
            print("\n" + "="*60)
            print("TEST RESULTS SUMMARY")
            print("="*60)
            print(f"📊 Tests passed: {self.tests_passed}/{self.tests_run}")
            print(f"🎯 Success rate: {(self.tests_passed/self.tests_run)*100:.1f}%")
            
            if all_passed and self.tests_passed == self.tests_run:
                print("✅ All tests passed!")
                return 0
            else:
                print("❌ Some tests failed!")
                return 1
                
        except Exception as e:
            print(f"💥 Test suite failed with error: {str(e)}")
            return 1

def main():
    tester = MultiCompetitionAPITester()
    return tester.run_all_tests()

if __name__ == "__main__":
    sys.exit(main())