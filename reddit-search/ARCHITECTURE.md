# Architecture Overview

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      Chrome Extension (Frontend)                │
│                     (Not in this project)                       │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTP POST
                             │ /analyze
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                         FastAPI Backend                         │
│                         (main.py)                               │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │  POST /analyze Endpoint                                    │ │
│  │  - Receives company_name                                   │ │
│  │  - Orchestrates Reddit search & AI analysis                │ │
│  │  - Returns structured JSON response                        │ │
│  └─────────────┬────────────────────────┬─────────────────────┘ │
└────────────────┼────────────────────────┼───────────────────────┘
                 │                        │
                 ▼                        ▼
    ┌────────────────────────┐  ┌────────────────────────┐
    │   Reddit Service       │  │   OpenAI Service       │
    │  (reddit_service.py)   │  │  (openai_service.py)   │
    │                        │  │                        │
    │ - Query Reddit JSON    │  │ - Build prompt         │
    │ - Fetch posts/comments │  │ - Call GPT API         │
    │ - Extract reviews      │  │ - Parse JSON response  │
    │ - Format corpus        │  │ - Return analysis      │
    └───────────┬────────────┘  └────────────┬───────────┘
                │                            │
                ▼                            ▼
    ┌────────────────────────┐  ┌────────────────────────┐
    │ Reddit JSON Endpoints  │  │    OpenAI API          │
    │  (anonymous access)    │  │   (GPT-4o-mini)        │
    └────────────────────────┘  └────────────────────────┘
```

---

## Request Flow

### Step-by-Step Process

1. **Chrome Extension → API**
   - User enters company name in extension
   - Extension sends POST request to `/analyze`
   - Request body: `{"company_name": "ABC Property Management"}`

2. **API → Reddit Service**
   - FastAPI endpoint receives request
   - Calls `RedditService.search_company_reviews()`
   - Service queries Reddit's public JSON search endpoint

3. **Reddit Service → Reddit JSON**
   - Sends GET request to `https://www.reddit.com/search.json`
   - Fetches matching posts (limit configurable)
   - Retrieves post bodies and top comments via `.json` endpoints
   - Filters by relevance and age (default last 3 years)

4. **Reddit Service → Format Corpus**
   - Extracts: title, score, subreddit, post body, top comments
   - Formats into readable text corpus
   - Returns formatted string to API

5. **API → OpenAI Service**
   - Passes company name and corpus to `OpenAIService.analyze_reviews()`
   - Service builds analysis prompt using template

6. **OpenAI Service → OpenAI API**
   - Sends prompt to GPT with JSON mode enabled
   - Requests sentiment analysis, risk assessment, insights
   - Model: gpt-4o-mini (configurable)

7. **OpenAI Service → Parse Response**
   - Receives JSON response from GPT
   - Validates against Pydantic schema
   - Ensures required fields are present

8. **API → Chrome Extension**
   - Returns structured JSON response
   - Includes: sentiment, risk_level, summary, red_flags, positive_notes, sample_experiences

---

## Component Details

### 1. FastAPI Application (`main.py`)

**Responsibilities:**
- Expose REST API endpoints
- Handle HTTP requests/responses
- Manage CORS for Chrome extension
- Initialize and coordinate services
- Error handling and logging

**Key Features:**
- Automatic API documentation at `/docs`
- Health check endpoint at `/health`
- Lifespan events for service initialization
- Comprehensive error messages

---

### 2. Reddit Service (`services/reddit_service.py`)

**Responsibilities:**
- Call Reddit's public JSON endpoints (no auth required)
- Run site-wide searches for the company name in quotes
- Fetch associated post bodies and top-level comments
- Apply rate limiting and retry logic (configurable)
- Extract and format review data for the AI model

**Search Strategy:**
```python
Endpoint: https://www.reddit.com/search.json
Query: "Company Name"
Limit: reddit_search_limit (default 40)
Sort: relevance (time filter: all)
Comments: fetched from {permalink}.json (top reddit_comment_limit)
```

**Data Extracted:**
- Post title
- Post score (upvotes)
- Subreddit name
- Post body (first 2000 chars)
- Top 10 comments (up to 1000 chars each)
- Comment scores

**Output Format:**
```
--- Post 1 ---
Title: [Post Title]
Score: 42
Subreddit: r/renting

Post Body:
[Post content...]

Top Comments:
  [Score: 15] [Comment text...]
  [Score: 8] [Comment text...]
```

---

### 3. OpenAI Service (`services/openai_service.py`)

**Responsibilities:**
- Build analysis prompts
- Call OpenAI API
- Parse and validate responses
- Handle AI errors gracefully

**Prompt Structure:**
1. System context (expert analyst role)
2. User instructions (your exact template)
3. Company name injection
4. Reddit corpus data
5. JSON format requirements

**API Configuration:**
```python
Model: gpt-4o-mini (default, configurable)
Temperature: 0.3 (consistent analysis)
Response Format: JSON mode
Max Tokens: 2000
```

**Validation:**
- Ensures JSON is valid
- Validates against Pydantic schema
- Provides fallback response on errors
- Logs all API calls

---

### 4. Data Models (`models/schemas.py`)

**AnalyzeRequest:**
```python
{
  "company_name": str  # Required, min length 1
}
```

**AnalyzeResponse:**
```python
{
  "overall_sentiment": Literal["positive", "mixed", "negative", "unclear"],
  "risk_level": Literal["low", "medium", "high", "unknown"],
  "summary": str,
  "red_flags": List[str],
  "positive_notes": List[str],
  "sample_experiences": List[str]
}
```

**ErrorResponse:**
```python
{
  "error": str,
  "detail": str
}
```

---

### 5. Configuration (`config.py`)

**Environment Variables:**
```python
REDDIT_USER_AGENT         # Required; describe your app (default provided)
REDDIT_SEARCH_LIMIT       # Max posts to fetch (default: 40)
REDDIT_COMMENT_LIMIT      # Max comments per post (default: 8)
REDDIT_REQUEST_DELAY      # Seconds to sleep between requests (default: 1.5)
REDDIT_MAX_RETRIES        # Retries on HTTP 429 (default: 3)
REDDIT_MAX_POST_AGE_DAYS  # Skip posts older than this (default: 3 yrs)

OPENAI_API_KEY            # OpenAI API key (required)
OPENAI_MODEL              # Model to use (default: gpt-4o-mini)
```

**Settings Management:**
- Uses python-dotenv for .env files
- Cached settings with lru_cache
- Type-safe with Pydantic
- Default values for optional settings

---

## Error Handling

### Reddit JSON Errors
- Rate limiting: handled with exponential backoff
- No results: Returns "unclear" sentiment
- Network errors: logged and surfaced to client

### OpenAI API Errors
- Invalid API key: HTTP 500 with message
- JSON parse errors: Fallback response
- Rate limiting: Propagated to client
- Model errors: Logged and fallback used

### Input Validation
- Empty company name: HTTP 422
- Invalid JSON: HTTP 422
- Missing fields: HTTP 422

---

## Performance Considerations

### Reddit JSON
- **Rate Limit**: Target ≤1 request/second
- **Search Time**: ~3-6 seconds for full query (includes comments)
- **Total Time**: 8-15 seconds depending on number of posts

### OpenAI API
- **Rate Limit**: Depends on plan
- **Processing Time**: 5-15 seconds for analysis
- **Token Usage**: ~1000-2000 tokens per request

### Total Response Time
- **Typical**: 15-35 seconds
- **Cached** (future): < 1 second
- **No results**: 10-15 seconds

### Optimization Opportunities
1. **Caching**: Store results for 24 hours
2. **Parallel Requests**: Search subreddits concurrently
3. **Background Jobs**: Process async, return immediately
4. **Database**: Store and reuse past analyses

---

## Security Considerations

### Current Implementation
- ✅ Environment-based configuration (only OpenAI key required)
- ✅ CORS enabled (allow all origins)
- ✅ Input validation with Pydantic
- ✅ Error messages don't expose internals
- ✅ No sensitive data in logs

### Production Recommendations
1. **CORS**: Restrict to specific Chrome extension ID
2. **Authentication**: Add API key authentication
3. **Rate Limiting**: Implement per-IP rate limits
4. **HTTPS**: Use SSL/TLS in production
5. **Secrets Management**: Use cloud secrets manager
6. **Input Sanitization**: Additional validation for company names
7. **Logging**: Implement audit logging
8. **Monitoring**: Set up alerts for unusual activity

---

## Scalability

### Current Capacity
- Single-threaded FastAPI
- Synchronous Reddit/OpenAI calls
- No caching or persistence

### Scaling Strategies

**Vertical Scaling:**
- Increase server resources
- Use Uvicorn workers: `--workers 4`

**Horizontal Scaling:**
- Deploy multiple instances
- Use load balancer (nginx, AWS ALB)

**Caching Layer:**
- Redis for result caching
- Cache TTL: 24 hours
- Cache key: `company_name` hash

**Async Processing:**
- Background job queue (Celery, RQ)
- Return job ID immediately
- Poll for results endpoint

**Database:**
- PostgreSQL for storing analyses
- Index on company_name
- Historical data tracking

---

## Deployment Options

### Local Development
```bash
python main.py
```

### Docker
```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Cloud Platforms
- **Heroku**: `Procfile` with `web: uvicorn main:app`
- **AWS**: Elastic Beanstalk or ECS
- **GCP**: Cloud Run or App Engine
- **Azure**: App Service or Container Instances
- **Vercel/Netlify**: Not ideal (need persistent server)

---

## Monitoring & Observability

### Logging
- FastAPI request/response logging
- Reddit API call logging
- OpenAI API call logging
- Error stack traces

### Metrics to Track
- Requests per minute
- Average response time
- Error rate
- Reddit JSON call count / failures
- OpenAI token usage
- Cache hit rate (if implemented)

### Tools
- **Sentry**: Error tracking
- **DataDog**: APM and logs
- **Prometheus**: Metrics
- **Grafana**: Dashboards

---

## Testing Strategy

### Unit Tests
```python
# Test Reddit service
test_reddit_search()
test_corpus_formatting()

# Test OpenAI service
test_prompt_building()
test_response_parsing()

# Test endpoints
test_analyze_endpoint()
test_health_endpoint()
```

### Integration Tests
- Mock Reddit API responses
- Mock OpenAI API responses
- Test full request flow

### End-to-End Tests
```python
# Use test_api.py
python test_api.py
```

---

## Future Enhancements

### High Priority
1. **Caching**: Redis integration
2. **Database**: Store historical analyses
3. **Authentication**: Secure the API

### Medium Priority
4. **Async Processing**: Background jobs
5. **More Sources**: Twitter, Yelp, Google Reviews
6. **Sentiment Trends**: Track over time
7. **Company Profiles**: Store metadata

### Nice to Have
8. **Admin Dashboard**: View usage stats
9. **Webhooks**: Notify on new reviews
10. **Export**: PDF reports
11. **Multi-language**: Support non-English reviews

---

## File Size Summary

```
Total Project Size: ~51 KB

Core Application:
  main.py             6.2 KB
  config.py           1.4 KB
  reddit_service.py   5.2 KB
  openai_service.py   5.4 KB
  schemas.py          1.6 KB

Documentation:
  README.md           7.5 KB
  QUICKSTART.md       2.7 KB
  API_EXAMPLES.md    10.7 KB
  PROJECT_SUMMARY.md  5.8 KB
  ARCHITECTURE.md     (this file)

Utilities:
  test_api.py         2.4 KB
  start_api.bat       0.6 KB
  start_api.sh        0.6 KB
  requirements.txt    0.1 KB
  .gitignore          0.4 KB
  .env.example        0.5 KB
```

---

## Quick Reference

### Start Server
```bash
python main.py
```

### Make Request
```bash
curl -X POST http://localhost:8000/analyze \
  -H "Content-Type: application/json" \
  -d '{"company_name": "Greystar"}'
```

### View Docs
```
http://localhost:8000/docs
```

### Health Check
```bash
curl http://localhost:8000/health
```

---

## Support

For questions or issues:
1. Check [README.md](README.md) for setup
2. Review [QUICKSTART.md](QUICKSTART.md) for quick start
3. See [API_EXAMPLES.md](API_EXAMPLES.md) for usage examples
4. Read [PROJECT_SUMMARY.md](PROJECT_SUMMARY.md) for overview

