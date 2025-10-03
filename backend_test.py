import requests
import sys
from datetime import datetime, timedelta
import json

class TrongamingAPITester:
    def __init__(self, base_url="https://game-scheduler-6.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.session_token = "session_1759502634076"  # Admin user session
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []

    def run_test(self, name, method, endpoint, expected_status, data=None, params=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        # Use session token as cookie
        cookies = {'session_token': self.session_token}

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, cookies=cookies, params=params)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, cookies=cookies, params=params)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, cookies=cookies)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, cookies=cookies)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    print(f"   Response: {json.dumps(response_data, indent=2)[:200]}...")
                except:
                    print(f"   Response: {response.text[:200]}...")
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"   Response: {response.text[:300]}")
                self.failed_tests.append({
                    'name': name,
                    'expected': expected_status,
                    'actual': response.status_code,
                    'response': response.text[:300]
                })

            return success, response.json() if response.text and response.status_code < 400 else {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            self.failed_tests.append({
                'name': name,
                'error': str(e)
            })
            return False, {}

    def test_auth_endpoints(self):
        """Test authentication endpoints"""
        print("\n" + "="*50)
        print("TESTING AUTHENTICATION ENDPOINTS")
        print("="*50)
        
        # Test get current user
        success, user_data = self.run_test(
            "Get Current User",
            "GET",
            "auth/me",
            200
        )
        
        if success:
            print(f"   User: {user_data.get('name')} ({user_data.get('email')})")
            print(f"   Admin: {user_data.get('is_admin')}")
            print(f"   Wallet: ₹{user_data.get('wallet_balance', 0)}")
        
        return user_data if success else None

    def test_wallet_endpoints(self):
        """Test wallet endpoints"""
        print("\n" + "="*50)
        print("TESTING WALLET ENDPOINTS")
        print("="*50)
        
        # Test get wallet balance
        self.run_test(
            "Get Wallet Balance",
            "GET",
            "wallet/balance",
            200
        )
        
        # Test wallet transactions
        self.run_test(
            "Get Wallet Transactions",
            "GET",
            "wallet/transactions",
            200
        )
        
        # Test wallet topup
        success, topup_response = self.run_test(
            "Wallet Topup (₹500)",
            "POST",
            "wallet/topup",
            200,
            data={"amount": 500}
        )
        
        if success:
            print(f"   Bonus: ₹{topup_response.get('bonus', 0)}")
            print(f"   New Balance: ₹{topup_response.get('new_balance', 0)}")

    def test_booking_endpoints(self):
        """Test booking endpoints"""
        print("\n" + "="*50)
        print("TESTING BOOKING ENDPOINTS")
        print("="*50)
        
        # Test price calculation
        self.run_test(
            "Calculate Price (1hr, 2 controllers)",
            "GET",
            "bookings/calculate-price",
            200,
            params={"duration_minutes": 60, "controllers": 2}
        )
        
        # Test availability check
        tomorrow = (datetime.now() + timedelta(days=1)).strftime('%Y-%m-%d')
        self.run_test(
            "Check Availability",
            "GET",
            "bookings/availability",
            200,
            params={"date": tomorrow, "ps5_setup": 1}
        )
        
        # Test create booking
        booking_data = {
            "date": tomorrow,
            "start_time": "14:00",
            "duration_minutes": 60,
            "ps5_setup": 1,
            "controllers": 2,
            "payment_method": "wallet"
        }
        
        success, booking_response = self.run_test(
            "Create Booking",
            "POST",
            "bookings",
            200,
            data=booking_data
        )
        
        booking_id = None
        if success:
            booking_id = booking_response.get('id')
            print(f"   Booking ID: {booking_id}")
            print(f"   Total Price: ₹{booking_response.get('total_price', 0)}")
        
        # Test get my bookings
        self.run_test(
            "Get My Bookings",
            "GET",
            "bookings/my-bookings",
            200
        )
        
        return booking_id

    def test_admin_endpoints(self):
        """Test admin endpoints"""
        print("\n" + "="*50)
        print("TESTING ADMIN ENDPOINTS")
        print("="*50)
        
        # Test admin stats
        self.run_test(
            "Get Admin Stats",
            "GET",
            "admin/stats",
            200
        )
        
        # Test get all bookings
        self.run_test(
            "Get All Bookings",
            "GET",
            "admin/bookings",
            200
        )
        
        # Test get bookings by date
        today = datetime.now().strftime('%Y-%m-%d')
        self.run_test(
            "Get Bookings by Date",
            "GET",
            "admin/bookings",
            200,
            params={"date": today}
        )

    def test_edge_cases(self):
        """Test edge cases and error handling"""
        print("\n" + "="*50)
        print("TESTING EDGE CASES & ERROR HANDLING")
        print("="*50)
        
        # Test invalid booking data
        invalid_booking = {
            "date": "2025-01-15",
            "start_time": "14:00",
            "duration_minutes": 45,  # Invalid duration
            "ps5_setup": 3,  # Invalid setup
            "controllers": 5,  # Invalid controllers
            "payment_method": "wallet"
        }
        
        self.run_test(
            "Invalid Booking Data",
            "POST",
            "bookings",
            400,
            data=invalid_booking
        )
        
        # Test insufficient wallet balance
        expensive_booking = {
            "date": (datetime.now() + timedelta(days=2)).strftime('%Y-%m-%d'),
            "start_time": "10:00",
            "duration_minutes": 180,
            "ps5_setup": 1,
            "controllers": 4,
            "payment_method": "wallet"
        }
        
        # This might fail if wallet has insufficient balance
        self.run_test(
            "High Price Booking (might fail if insufficient balance)",
            "POST",
            "bookings",
            400,  # Expecting 400 for insufficient balance
            data=expensive_booking
        )

def main():
    print("🎮 TRONGAMING API TESTING SUITE")
    print("="*60)
    
    tester = TrongamingAPITester()
    
    # Test authentication
    user_data = tester.test_auth_endpoints()
    if not user_data:
        print("❌ Authentication failed, stopping tests")
        return 1
    
    # Test wallet functionality
    tester.test_wallet_endpoints()
    
    # Test booking functionality
    booking_id = tester.test_booking_endpoints()
    
    # Test admin functionality (if admin user)
    if user_data.get('is_admin'):
        tester.test_admin_endpoints()
    else:
        print("\n⚠️  Skipping admin tests - user is not admin")
    
    # Test edge cases
    tester.test_edge_cases()
    
    # Print final results
    print("\n" + "="*60)
    print("📊 FINAL TEST RESULTS")
    print("="*60)
    print(f"Tests Run: {tester.tests_run}")
    print(f"Tests Passed: {tester.tests_passed}")
    print(f"Tests Failed: {tester.tests_run - tester.tests_passed}")
    print(f"Success Rate: {(tester.tests_passed/tester.tests_run)*100:.1f}%")
    
    if tester.failed_tests:
        print("\n❌ FAILED TESTS:")
        for i, test in enumerate(tester.failed_tests, 1):
            print(f"{i}. {test['name']}")
            if 'error' in test:
                print(f"   Error: {test['error']}")
            else:
                print(f"   Expected: {test['expected']}, Got: {test['actual']}")
    
    return 0 if tester.tests_passed == tester.tests_run else 1

if __name__ == "__main__":
    sys.exit(main())