# Reddit Review Analyzer API

A FastAPI-based backend service that searches Reddit for housing/rental company reviews and analyzes them using OpenAI GPT to provide sentiment analysis, risk assessment, and key insights.

## Features

- 🔍 **Reddit Search**: Automatically searches relevant subreddits for company reviews
- 🤖 **AI Analysis**: Uses OpenAI GPT to analyze sentiment and extract insights
- 📊 **Structured Output**: Returns JSON with sentiment, risk level, red flags, and positive notes
- 🌐 **CORS Enabled**: Ready to integrate with Chrome extensions and web frontends
- ⚡ **FastAPI**: Modern, fast, and includes automatic API documentation

## Prerequisites

- Python 3.8 or higher
- OpenAI API key (for GPT analysis)
- Reddit public JSON endpoints (no keys needed)

## Installation

1. **Clone or navigate to the project directory**:
   ```bash
   cd "Oss4 ai 11_15"
   ```

2. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Set up environment variables**:
   - Copy `.env.example` to `.env`:
     ```bash
     cp .env.example .env
     ```
   - Edit `.env` and fill in your credentials (see Configuration section below)

## Configuration

### Reddit JSON API (no credentials required)

The service calls Reddit's public JSON endpoints (e.g., `https://www.reddit.com/search.json`) and only needs a descriptive `User-Agent` header. You can customize the scraping behavior via environment variables but no Reddit developer account is required.

### Getting OpenAI API Key

1. Go to [https://platform.openai.com/account/api-keys](https://platform.openai.com/account/api-keys)
2. Sign in or create an account
3. Click "Create new secret key"
4. Copy the key (you won't be able to see it again)

### Environment Variables

Edit your `.env` file with the following:

```env
# Reddit scraping configuration
REDDIT_USER_AGENT=reddit-review-analyzer/1.0 (Educational project)
REDDIT_SEARCH_LIMIT=40
REDDIT_COMMENT_LIMIT=8
REDDIT_REQUEST_DELAY=1.5
REDDIT_MAX_RETRIES=3
REDDIT_MAX_POST_AGE_DAYS=1095

# OpenAI API Key
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-4o-mini
```

## Running the API

### Development Mode

```bash
python main.py
```

Or using uvicorn directly:

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Production Mode

```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
```

The API will be available at:
- **API**: http://localhost:8000
- **Interactive Docs**: http://localhost:8000/docs
- **Alternative Docs**: http://localhost:8000/redoc

## API Endpoints

### `POST /analyze`

Analyze reviews for a rental/housing company.

**Request Body**:
```json
{
  "company_name": "ABC Property Management"
}
```

**Response**:
```json
{
  "overall_sentiment": "negative",
  "risk_level": "high",
  "summary": "Renters consistently report serious issues with this company including unresponsive management, poor maintenance, and deposit withholding. Very few positive experiences were found.",
  "red_flags": [
    "Maintenance requests ignored for weeks",
    "Security deposits not returned",
    "Hidden fees and unexpected charges",
    "Unresponsive management",
    "Poor communication"
  ],
  "positive_notes": [
    "Convenient locations"
  ],
  "sample_experiences": [
    "Tenant reported waiting 3 months for broken AC repair during summer",
    "Multiple users mentioned losing entire deposit with no explanation",
    "Several complaints about being charged for pre-existing damage"
  ]
}
```

### `GET /health`

Check API health and configuration status.

**Response**:
```json
{
  "status": "healthy",
  "openai_configured": true
}
```

### `GET /`

Root endpoint with API information.

## Usage Examples

### Using cURL

```bash
curl -X POST "http://localhost:8000/analyze" \
  -H "Content-Type: application/json" \
  -d '{"company_name": "ABC Property Management"}'
```

### Using Python

```python
import requests

response = requests.post(
    "http://localhost:8000/analyze",
    json={"company_name": "ABC Property Management"}
)

result = response.json()
print(f"Sentiment: {result['overall_sentiment']}")
print(f"Risk Level: {result['risk_level']}")
print(f"Summary: {result['summary']}")
```

### Using JavaScript (for Chrome Extension)

```javascript
async function analyzeCompany(companyName) {
  const response = await fetch('http://localhost:8000/analyze', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ company_name: companyName })
  });
  
  const result = await response.json();
  console.log('Analysis:', result);
  return result;
}

// Usage
analyzeCompany('ABC Property Management').then(result => {
  console.log('Sentiment:', result.overall_sentiment);
  console.log('Risk Level:', result.risk_level);
});
```

## Project Structure

```
.
├── main.py                 # FastAPI application and endpoints
├── config.py               # Configuration and environment variables
├── requirements.txt        # Python dependencies
├── .env.example           # Environment variable template
├── models/
│   ├── __init__.py
│   └── schemas.py         # Pydantic models for request/response
└── services/
    ├── __init__.py
    ├── reddit_service.py  # Reddit JSON endpoint integration
    └── openai_service.py  # OpenAI API integration
```

## Reddit Search Strategy

The service uses Reddit's global search endpoint (`/search.json`) with a query of the company name in quotes. Post bodies and top-level comments are fetched directly from the corresponding `.json` endpoints. You can adjust the number of posts/comments fetched and the request pacing via the environment variables listed above.

## Error Handling

The API handles various error scenarios:

- **No reviews found**: Returns `unclear` sentiment with appropriate message
- **Missing OpenAI key**: Returns 500 error with configuration instructions
- **API failures**: Returns 500 error with error details
- **Invalid input**: Returns 400 error with validation details

## Troubleshooting

### "OpenAI API key not configured"

Make sure you've:
1. Added your `OPENAI_API_KEY` to the `.env` file
2. Restarted the API server

### "Too many requests" / Rate limiting

- Reddit's public JSON endpoints allow roughly 1 request per second
- Adjust `REDDIT_REQUEST_DELAY` (seconds) or keep the default 1.5s delay
- The service automatically retries with exponential backoff on HTTP 429

### Rate Limiting

- **Reddit JSON**: Aim for ≤1 request/second to avoid 429 errors
- **OpenAI**: Depends on your plan; monitor usage at platform.openai.com

### CORS Issues

The API is configured to allow all origins (`allow_origins=["*"]`). In production, update this in `main.py` to specific allowed origins:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["chrome-extension://your-extension-id"],
    ...
)
```

## Contributing

Feel free to submit issues and enhancement requests!

## License

This project is provided as-is for educational and personal use.

