# API Usage Examples

## Example Requests and Responses

### Example 1: Large Property Management Company

**Request:**
```json
POST http://localhost:8000/analyze
Content-Type: application/json

{
  "company_name": "Greystar"
}
```

**Expected Response:**
```json
{
  "overall_sentiment": "mixed",
  "risk_level": "medium",
  "summary": "Greystar receives mixed reviews from tenants. While some appreciate the amenities and professional management in certain properties, others report issues with maintenance responsiveness, deposit disputes, and corporate policies. Experiences vary significantly by location and property manager.",
  "red_flags": [
    "Slow maintenance response times reported",
    "Disputes over security deposit deductions",
    "Unexpected fee charges",
    "Corporate policies can be inflexible",
    "Communication issues with management"
  ],
  "positive_notes": [
    "Good amenities in many properties",
    "Professional property management at some locations",
    "Well-maintained common areas",
    "Online portal for rent payment and requests"
  ],
  "sample_experiences": [
    "Tenant waited 2 weeks for AC repair in summer heat",
    "Multiple residents reported unexpected cleaning fees at move-out",
    "Some locations praised for quick response to urgent issues",
    "Mixed experiences with deposit returns, ranging from full refunds to unexpected deductions"
  ]
}
```

---

### Example 2: Small Local Company

**Request:**
```json
POST http://localhost:8000/analyze

{
  "company_name": "Johnson Property Management LLC"
}
```

**Expected Response (if no data found):**
```json
{
  "overall_sentiment": "unclear",
  "risk_level": "unknown",
  "summary": "No Reddit reviews found for Johnson Property Management LLC. This could mean the company is very small, new, or not frequently discussed online.",
  "red_flags": [],
  "positive_notes": [],
  "sample_experiences": []
}
```

---

### Example 3: Company with Serious Issues

**Request:**
```json
POST http://localhost:8000/analyze

{
  "company_name": "BadLandlord Properties"
}
```

**Expected Response:**
```json
{
  "overall_sentiment": "negative",
  "risk_level": "high",
  "summary": "BadLandlord Properties has overwhelmingly negative reviews. Tenants consistently report serious issues including failure to make essential repairs, aggressive deposit withholding, harassment, and potential code violations. Multiple reviewers recommend avoiding this company.",
  "red_flags": [
    "Essential repairs not completed for months",
    "Illegal or questionable eviction practices mentioned",
    "Aggressive deposit withholding",
    "Management described as hostile or harassing",
    "Potential health and safety code violations",
    "Failure to provide habitable conditions",
    "Threats or intimidation tactics reported"
  ],
  "positive_notes": [],
  "sample_experiences": [
    "Tenant reported living without heat for 3 months in winter",
    "Multiple users mention being charged for pre-existing damage",
    "One tenant mentioned management entering unit without proper notice",
    "Several reviewers advise others to document everything and consider legal action"
  ]
}
```

---

### Example 4: Well-Regarded Company

**Request:**
```json
POST http://localhost:8000/analyze

{
  "company_name": "GoodLife Apartments"
}
```

**Expected Response:**
```json
{
  "overall_sentiment": "positive",
  "risk_level": "low",
  "summary": "GoodLife Apartments receives mostly positive reviews from tenants. Residents appreciate the responsive maintenance, fair pricing, and professional management. While minor issues are mentioned, they are generally resolved quickly and satisfactorily.",
  "red_flags": [
    "Occasional delays in non-urgent maintenance",
    "Some parking issues reported"
  ],
  "positive_notes": [
    "Very responsive to maintenance requests",
    "Fair and transparent pricing",
    "Professional and friendly staff",
    "Clean and well-maintained properties",
    "Quick to address tenant concerns",
    "Full security deposits returned in most cases",
    "Good communication"
  ],
  "sample_experiences": [
    "Tenant praised same-day response to emergency plumbing issue",
    "Multiple users mention getting full deposit back with itemized statement",
    "Resident appreciated proactive communication about building updates",
    "One user noted reasonable rent increases compared to market rates"
  ]
}
```

---

## Error Responses

### Missing OpenAI Key

**Response (500):**
```json
{
  "detail": "OpenAI API key not configured. Please set OPENAI_API_KEY in .env file."
}
```

### Invalid Request

**Response (422):**
```json
{
  "detail": [
    {
      "loc": ["body", "company_name"],
      "msg": "field required",
      "type": "value_error.missing"
    }
  ]
}
```

---

## Testing with Different Tools

### cURL (Command Line)

```bash
# Basic request
curl -X POST "http://localhost:8000/analyze" \
  -H "Content-Type: application/json" \
  -d '{"company_name": "Greystar"}'

# Pretty print with jq
curl -X POST "http://localhost:8000/analyze" \
  -H "Content-Type: application/json" \
  -d '{"company_name": "Greystar"}' | jq

# Health check
curl http://localhost:8000/health
```

### Python Requests

```python
import requests
import json

def analyze_company(company_name):
    url = "http://localhost:8000/analyze"
    payload = {"company_name": company_name}
    
    response = requests.post(url, json=payload)
    
    if response.status_code == 200:
        result = response.json()
        print(f"Company: {company_name}")
        print(f"Sentiment: {result['overall_sentiment']}")
        print(f"Risk: {result['risk_level']}")
        print(f"\nSummary:\n{result['summary']}")
        
        if result['red_flags']:
            print(f"\nRed Flags:")
            for flag in result['red_flags']:
                print(f"  - {flag}")
                
        if result['positive_notes']:
            print(f"\nPositive Notes:")
            for note in result['positive_notes']:
                print(f"  - {note}")
                
        return result
    else:
        print(f"Error: {response.status_code}")
        print(response.text)
        return None

# Test
analyze_company("Greystar")
```

### JavaScript (Fetch API)

```javascript
async function analyzeCompany(companyName) {
  try {
    const response = await fetch('http://localhost:8000/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ company_name: companyName })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    console.log('Company:', companyName);
    console.log('Sentiment:', data.overall_sentiment);
    console.log('Risk Level:', data.risk_level);
    console.log('Summary:', data.summary);
    console.log('Red Flags:', data.red_flags);
    console.log('Positive Notes:', data.positive_notes);
    
    return data;
  } catch (error) {
    console.error('Error:', error);
    return null;
  }
}

// Usage
analyzeCompany('Greystar');
```

### Chrome Extension Background Script

```javascript
// In your Chrome extension's background.js or content script

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'analyzeCompany') {
    analyzeCompanyFromExtension(request.companyName)
      .then(result => sendResponse({ success: true, data: result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Will respond asynchronously
  }
});

async function analyzeCompanyFromExtension(companyName) {
  const response = await fetch('http://localhost:8000/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ company_name: companyName })
  });
  
  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }
  
  return await response.json();
}
```

---

## Response Field Descriptions

| Field | Type | Values | Description |
|-------|------|--------|-------------|
| `overall_sentiment` | string | "positive", "mixed", "negative", "unclear" | Overall sentiment from all reviews |
| `risk_level` | string | "low", "medium", "high", "unknown" | Risk assessment based on complaint severity |
| `summary` | string | - | 2-4 sentence summary of tenant experiences |
| `red_flags` | array[string] | - | List of common problems or concerns |
| `positive_notes` | array[string] | - | List of positive aspects (empty if none) |
| `sample_experiences` | array[string] | - | 2-4 paraphrased examples of typical experiences |

---

## Rate Limits

### Reddit JSON Endpoints
- Aim for ≤1 request per second
- The service auto-retries on HTTP 429 with exponential backoff
- Increase `REDDIT_REQUEST_DELAY` in `.env` if you hit rate limits

### OpenAI API
- Depends on your plan
- Check usage at: https://platform.openai.com/usage

### Recommendations
- Cache results when possible
- Implement rate limiting in your Chrome extension
- Consider adding a local database for frequently searched companies

---

## Best Practices

1. **Handle Empty Results**: Not all companies will have Reddit reviews
2. **Show Loading States**: Analysis can take 10-30 seconds
3. **Cache Results**: Same company searches can reuse cached data
4. **Error Handling**: Always handle network errors and API failures
5. **User Feedback**: Show progress indicators during analysis
6. **Respect Privacy**: Don't store sensitive user data
7. **Rate Limiting**: Implement delays between multiple requests

---

## Production Considerations

When deploying to production:

1. **Update CORS**: Replace `allow_origins=["*"]` with specific origins
2. **Use HTTPS**: Secure all API communications
3. **Add Authentication**: Protect your API with API keys or OAuth
4. **Implement Caching**: Use Redis to cache analysis results
5. **Add Rate Limiting**: Prevent abuse with rate limiting middleware
6. **Monitor Usage**: Track API calls and costs
7. **Error Logging**: Set up proper error monitoring (Sentry, etc.)
8. **Environment Variables**: Use proper secrets management

---

## Need Help?

- Check the main [README.md](README.md) for setup instructions
- See [QUICKSTART.md](QUICKSTART.md) for quick setup guide
- View API docs at http://localhost:8000/docs when running

