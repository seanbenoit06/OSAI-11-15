# Reddit Review Analyzer API - Project Summary

## ✅ Project Complete!

A fully functional FastAPI backend service that analyzes housing/rental company reviews from Reddit using OpenAI GPT.

---

## 📁 Project Structure

```
Oss4 ai 11_15/
├── main.py                    # FastAPI application with /analyze endpoint
├── config.py                  # Configuration management
├── requirements.txt           # Python dependencies
├── .env.example              # Environment template
├── .gitignore                # Git ignore rules
├── README.md                 # Full documentation
├── QUICKSTART.md             # 5-minute setup guide
├── test_api.py               # Test script
├── start_api.bat             # Windows startup script
├── start_api.sh              # Linux/Mac startup script
├── models/
│   ├── __init__.py
│   └── schemas.py            # Pydantic models (Request/Response)
└── services/
    ├── __init__.py
    ├── reddit_service.py     # Reddit JSON integration (no auth)
    └── openai_service.py     # OpenAI API integration
```

---

## 🎯 Key Features Implemented

### 1. Reddit Integration
- ✅ Uses Reddit's public JSON endpoints (no API keys needed)
- ✅ Searches site-wide for the company name in quotes
- ✅ Filters posts by relevance and age (last 3 years by default)
- ✅ Extracts post titles, bodies, and top-level comments
- ✅ Formats data into a readable corpus for the AI model

### 2. OpenAI Analysis
- ✅ Uses provided prompt template exactly as specified
- ✅ Analyzes sentiment (positive/mixed/negative/unclear)
- ✅ Assesses risk level (low/medium/high)
- ✅ Extracts red flags and positive notes
- ✅ Generates summary and sample experiences
- ✅ Returns structured JSON response

### 3. FastAPI Backend
- ✅ POST `/analyze` endpoint - main analysis endpoint
- ✅ GET `/health` - health check
- ✅ GET `/` - API information
- ✅ CORS enabled for Chrome extension
- ✅ Automatic API documentation at `/docs`
- ✅ Error handling and validation

### 4. Configuration
- ✅ Environment-based configuration (.env)
- ✅ Only OpenAI API key required
- ✅ Customizable Reddit scraping limits, delays, and user agent

---

## 🚀 Getting Started

### Prerequisites
- Python 3.8+
- OpenAI API key
- (Optional) Custom Reddit User-Agent string

### Quick Setup
1. Install dependencies: `pip install -r requirements.txt`
2. Copy `.env.example` to `.env`
3. Add your OpenAI API key (optional: tweak Reddit settings)
4. Run: `python main.py` or `start_api.bat` (Windows)
5. Visit: http://localhost:8000/docs

### Test the API
```bash
python test_api.py
```

Or with curl:
```bash
curl -X POST "http://localhost:8000/analyze" \
  -H "Content-Type: application/json" \
  -d '{"company_name": "Greystar"}'
```

---

## 📡 API Endpoint

### POST /analyze

**Request:**
```json
{
  "company_name": "ABC Property Management"
}
```

**Response:**
```json
{
  "overall_sentiment": "negative",
  "risk_level": "high",
  "summary": "Renters consistently report serious issues...",
  "red_flags": [
    "Maintenance requests ignored for weeks",
    "Security deposits not returned",
    "Hidden fees and unexpected charges"
  ],
  "positive_notes": [
    "Convenient locations"
  ],
  "sample_experiences": [
    "Tenant reported waiting 3 months for broken AC repair",
    "Multiple users mentioned losing entire deposit"
  ]
}
```

---

## 🔌 Chrome Extension Integration

Ready to connect with your Chrome extension:

```javascript
async function analyzeCompany(companyName) {
  const response = await fetch('http://localhost:8000/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ company_name: companyName })
  });
  return await response.json();
}

// Usage
const result = await analyzeCompany('ABC Property Management');
console.log('Risk Level:', result.risk_level);
console.log('Summary:', result.summary);
```

---

## 📦 Dependencies

- **FastAPI** - Modern web framework
- **Uvicorn** - ASGI server
- **httpx** - HTTP client for Reddit JSON endpoints
- **OpenAI** - GPT API client
- **Pydantic** - Data validation
- **python-dotenv** - Environment management

---

## 🔧 Configuration Options

Edit `.env` to customize:

```env
# Reddit JSON settings
REDDIT_USER_AGENT=reddit-review-analyzer/1.0 (Educational project)
REDDIT_SEARCH_LIMIT=40
REDDIT_COMMENT_LIMIT=8
REDDIT_REQUEST_DELAY=1.5
REDDIT_MAX_RETRIES=3
REDDIT_MAX_POST_AGE_DAYS=1095

# OpenAI settings
OPENAI_API_KEY=sk-proj-...
OPENAI_MODEL=gpt-4o-mini
```

---

## 📚 Documentation

- **Full Documentation**: [README.md](README.md)
- **Quick Start Guide**: [QUICKSTART.md](QUICKSTART.md)
- **API Documentation**: http://localhost:8000/docs (when running)

---

## ✨ Next Steps

1. **Set up credentials**: Add your OpenAI API key to `.env`
2. **Test locally**: Run `python test_api.py`
3. **Build Chrome extension**: Connect to the `/analyze` endpoint
4. **Customize**: Adjust search limits, delays, or AI model
5. **Deploy**: Consider deploying to cloud (AWS, GCP, Heroku)

---

## 📝 Notes

- The API uses the **exact prompt template** you provided
- All responses are **structured JSON** as specified
- **CORS is enabled** for easy Chrome extension integration
- The system is **honest about unclear data** (won't invent details)
- Error handling includes helpful messages for missing OpenAI keys or rate limits

---

## 🎉 Ready to Use!

Your Reddit Review Analyzer API is complete and ready to integrate with your Chrome extension. All todos have been completed successfully!

**Need help?** Check the README.md or QUICKSTART.md for detailed instructions.

