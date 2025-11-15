# Quick Start Guide

## 5-Minute Setup

### Step 1: Install Dependencies

```bash
pip install -r requirements.txt
```

### Step 2: Understand Reddit JSON Access

- This project uses Reddit's public JSON endpoints (e.g., `https://www.reddit.com/search.json`)
- No Reddit account or API keys are required
- You only need to provide a descriptive `REDDIT_USER_AGENT` (see `.env.example`)

### Step 3: Get OpenAI API Key

1. Visit: https://platform.openai.com/account/api-keys
2. Create a new secret key
3. Copy the key

### Step 4: Configure Environment

```bash
# Copy the example file
cp .env.example .env

# Edit .env and paste your credentials
```

Your `.env` should look like:
```env
REDDIT_USER_AGENT=reddit-review-analyzer/1.0 (Educational project)
REDDIT_SEARCH_LIMIT=40
REDDIT_COMMENT_LIMIT=8
REDDIT_REQUEST_DELAY=1.5
REDDIT_MAX_RETRIES=3
REDDIT_MAX_POST_AGE_DAYS=1095
OPENAI_API_KEY=sk-proj-...your-key-here...
OPENAI_MODEL=gpt-4o-mini
```

### Step 5: Start the API

**On Windows:**
```bash
start_api.bat
```

**On Mac/Linux:**
```bash
chmod +x start_api.sh
./start_api.sh
```

**Or manually:**
```bash
python main.py
```

### Step 6: Test It!

The API should now be running at: http://localhost:8000

**View API Docs:**  
http://localhost:8000/docs

**Test with the provided script:**
```bash
python test_api.py
```

**Or test with curl:**
```bash
curl -X POST "http://localhost:8000/analyze" \
  -H "Content-Type: application/json" \
  -d '{"company_name": "Greystar"}'
```

## Common Issues

### "OpenAI API key not configured"
- Make sure OPENAI_API_KEY is set in `.env`
- Restart the API server

### "Too many requests" errors
- Reddit limits anonymous JSON requests to roughly 1 per second
- Increase `REDDIT_REQUEST_DELAY` or reduce `REDDIT_SEARCH_LIMIT`

### Port 8000 already in use
Change the port in `main.py`:
```python
uvicorn.run("main:app", host="0.0.0.0", port=8001)  # Use 8001 instead
```

## Next Steps

Once your API is running:

1. **Connect your Chrome Extension**: Use `http://localhost:8000/analyze`
2. **Tune Reddit scraping**: Adjust `REDDIT_SEARCH_LIMIT`, `REDDIT_COMMENT_LIMIT`, or delay settings
3. **Switch OpenAI Model**: Change `OPENAI_MODEL` (e.g., `gpt-4o`, `gpt-4o-mini`)

## Example Request from Chrome Extension

```javascript
async function analyzeCompany(companyName) {
  const response = await fetch('http://localhost:8000/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ company_name: companyName })
  });
  return await response.json();
}
```

Need more help? Check the full [README.md](README.md)

