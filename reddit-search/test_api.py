"""
Simple test script to verify the API is working.
Run this after starting the API server with: python main.py
"""

import requests
import json


def test_health():
    """Test the health endpoint."""
    print("Testing /health endpoint...")
    response = requests.get("http://localhost:8000/health")
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    print()


def test_root():
    """Test the root endpoint."""
    print("Testing / endpoint...")
    response = requests.get("http://localhost:8000/")
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    print()


def test_analyze(company_name="Greystar"):
    """Test the analyze endpoint."""
    print(f"Testing /analyze endpoint with company: {company_name}...")
    response = requests.post(
        "http://localhost:8000/analyze",
        json={"company_name": company_name}
    )
    print(f"Status: {response.status_code}")
    
    if response.status_code == 200:
        result = response.json()
        print(f"Response:")
        print(f"  Sentiment: {result['overall_sentiment']}")
        print(f"  Risk Level: {result['risk_level']}")
        print(f"  Summary: {result['summary']}")
        print(f"  Red Flags: {result['red_flags']}")
        print(f"  Positive Notes: {result['positive_notes']}")
        print(f"  Sample Experiences: {result['sample_experiences']}")
    else:
        print(f"Error: {response.text}")
    print()


if __name__ == "__main__":
    print("=" * 60)
    print("Reddit Review Analyzer API - Test Script")
    print("=" * 60)
    print()
    
    try:
        # Test basic endpoints
        test_health()
        test_root()
        
        # Test analysis (you can change the company name)
        company = input("Enter a company name to analyze (or press Enter for 'Greystar'): ").strip()
        if not company:
            company = "Greystar"
        
        test_analyze(company)
        
        print("✅ All tests completed!")
        
    except requests.exceptions.ConnectionError:
        print("❌ Error: Could not connect to API.")
        print("Make sure the API is running with: python main.py")
    except Exception as e:
        print(f"❌ Error: {e}")

