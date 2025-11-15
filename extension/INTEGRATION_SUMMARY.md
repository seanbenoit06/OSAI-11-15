# Reddit Integration - Implementation Summary

## Overview
Successfully integrated Reddit review search functionality with the Contract Shield extension. The extension now runs contract analysis and Reddit review search in parallel, displaying results in separate tabs.

## What Was Implemented

### 1. Configuration System ✅
- **`options.html`** - Settings page for configuring Reddit API URL
- **`options.js`** - Logic for saving/loading API URL from chrome.storage
- **`manifest.json`** - Added `storage` permission and `options_page` entry

### 2. Company Name Extraction ✅
- **`gpt.js`** - Modified system prompt to extract company/landlord names from contracts
- **`contractAnalyzer.js`** - Updated to pass through extracted company names

### 3. Reddit Service ✅
- **`redditService.js`** - New service for Reddit API integration
  - `searchCompanyReviews()` - Fetches Reddit reviews for a company
  - `getSentimentClass()` - Helper for sentiment badge styling
  - `getRiskLevelClass()` - Helper for risk badge styling
  - 60-second timeout for API requests
  - Error handling and validation

### 4. UI Updates ✅
- **`popup.html`** - Added tab navigation and Reddit results section
  - Contract Analysis tab (existing functionality)
  - Reddit Reviews tab (new)
  - Company name display/manual input
  - Loading, error, and results states
  
- **`popup.css`** - Comprehensive styling for all new components
  - Tab navigation styles
  - Sentiment and risk badges (color-coded)
  - Reddit results sections (summary, red flags, positive notes, experiences, sources)
  - Manual company search input
  - Loading spinner and error states

### 5. Parallel Execution Logic ✅
- **`popup.js`** - Major updates for parallel processing
  - Both analyses run simultaneously using `Promise.allSettled()`
  - Independent error handling for each service
  - Tab switching functionality
  - Reddit results rendering
  - Manual company search capability

## How It Works

### Workflow
1. User clicks "Analyze Content"
2. Extension extracts contract text (from PDF or webpage)
3. **Parallel execution:**
   - Contract analysis runs (existing GPT analysis + company name extraction)
   - Reddit search runs (using extracted company name)
4. Results display in two tabs:
   - **Contract Analysis**: Red flags, severity scores, etc.
   - **Reddit Reviews**: Sentiment, risk level, community feedback

### Company Name Detection
- If company name is detected → Automatic Reddit search
- If no company found → Manual input option in Reddit tab

### Configuration
- Users can configure Reddit API URL via extension options
- Default: `http://localhost:8000`
- Access settings: Right-click extension → Options

## API Integration

### Reddit API Endpoint
```
POST http://localhost:8000/analyze
Content-Type: application/json

{
  "company_name": "Company Name"
}
```

### Response Format
```json
{
  "overall_sentiment": "positive|mixed|negative|unclear",
  "risk_level": "low|medium|high|unknown",
  "summary": "Summary text...",
  "red_flags": ["flag1", "flag2"],
  "positive_notes": ["note1", "note2"],
  "sample_experiences": ["exp1", "exp2"],
  "sources": [
    {
      "title": "Post title",
      "url": "https://reddit.com/...",
      "subreddit": "subreddit_name",
      "score": 123
    }
  ]
}
```

## Testing Checklist

### Before Testing
- [ ] Reddit search API server is running on port 8000
- [ ] OpenAI API key is configured for contract analysis
- [ ] Extension is loaded in Chrome

### Test Cases
1. **Basic Flow**
   - [ ] Load a contract/lease PDF or webpage
   - [ ] Click "Analyze Content"
   - [ ] Verify both tabs appear
   - [ ] Check Contract Analysis tab shows red flags
   - [ ] Switch to Reddit Reviews tab
   - [ ] Verify company name is detected and displayed

2. **Manual Search**
   - [ ] If no company detected, verify manual input appears
   - [ ] Enter a company name manually
   - [ ] Click "Search"
   - [ ] Verify Reddit results load

3. **Error Handling**
   - [ ] Test with Reddit API server stopped (should show error message)
   - [ ] Test with invalid company name (should handle gracefully)
   - [ ] Verify contract analysis still works if Reddit fails

4. **Configuration**
   - [ ] Right-click extension → Options
   - [ ] Change Reddit API URL
   - [ ] Save settings
   - [ ] Verify new URL is used for searches

## Files Modified/Created

### New Files
- `extension/options.html` - Settings page
- `extension/options.js` - Settings logic
- `extension/redditService.js` - Reddit API integration
- `extension/INTEGRATION_SUMMARY.md` - This file

### Modified Files
- `extension/manifest.json` - Added permissions and options page
- `extension/gpt.js` - Added company name extraction
- `extension/contractAnalyzer.js` - Pass through company names
- `extension/popup.html` - Added tabs and Reddit UI
- `extension/popup.js` - Parallel execution and Reddit rendering
- `extension/popup.css` - Styling for new components

## Key Features

✅ Parallel execution (both analyses run simultaneously)
✅ Independent error handling (one failure doesn't block the other)
✅ Configurable API endpoint
✅ Manual company search fallback
✅ Color-coded sentiment and risk indicators
✅ Source links to original Reddit posts
✅ Responsive tab-based UI
✅ Loading and error states

## Next Steps

1. **Start the Reddit API server:**
   ```bash
   cd reddit-search
   python main.py
   ```

2. **Load the extension in Chrome:**
   - Go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `extension` folder

3. **Test the integration:**
   - Navigate to a lease/contract webpage or PDF
   - Click the extension icon
   - Click "Analyze Content"
   - View results in both tabs

## Troubleshooting

### "Cannot connect to Reddit API"
- Ensure Reddit API server is running on the configured port
- Check the API URL in extension settings (right-click → Options)

### "No company detected"
- Use the manual search input in the Reddit Reviews tab
- Ensure contract contains clear company/landlord name

### Contract analysis works but Reddit doesn't
- Both services are independent - this is expected behavior
- Check Reddit API server logs for errors
- Verify OpenAI API key is set in Reddit API server's `.env` file

## Architecture Notes

The integration follows a clean separation of concerns:
- **Contract analysis**: Existing GPT-based red flag detection
- **Reddit service**: Separate service for fetching community reviews
- **Parallel execution**: Both run simultaneously for better UX
- **Independent UIs**: Tab-based interface keeps each analysis separate
- **Configurable**: Users can point to local or deployed Reddit API

This architecture ensures that failures in one service don't affect the other, and both analyses complete as quickly as possible.

