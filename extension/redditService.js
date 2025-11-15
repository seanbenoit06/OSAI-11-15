// redditService.js - Reddit Review Search API integration

const DEFAULT_REDDIT_API_URL = "http://localhost:8000";

/**
 * Get the configured Reddit API URL from storage
 * @returns {Promise<string>} The API URL
 */
export async function getRedditApiUrl() {
  try {
    const result = await chrome.storage.sync.get(["redditApiUrl"]);
    return result.redditApiUrl || DEFAULT_REDDIT_API_URL;
  } catch (error) {
    console.error("Error loading Reddit API URL from storage:", error);
    return DEFAULT_REDDIT_API_URL;
  }
}

/**
 * Search for company reviews on Reddit
 * @param {string} companyName - The company name to search for
 * @returns {Promise<Object>} Analysis results from Reddit
 */
export async function searchCompanyReviews(companyName) {
  if (!companyName || typeof companyName !== "string" || !companyName.trim()) {
    throw new Error("Invalid company name provided");
  }

  const apiUrl = await getRedditApiUrl();
  const endpoint = `${apiUrl}/analyze`;

  console.log(`[Reddit Service] Searching for: ${companyName}`);
  console.log(`[Reddit Service] API endpoint: ${endpoint}`);

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ company_name: companyName }),
      signal: AbortSignal.timeout(60000), // 60 second timeout
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Reddit Service] API error: ${response.status}`, errorText);
      throw new Error(`Reddit API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log("[Reddit Service] Analysis received:", data);

    // Validate response structure
    if (!data || typeof data !== "object") {
      throw new Error("Invalid response format from Reddit API");
    }

    return {
      overall_sentiment: data.overall_sentiment || "unclear",
      risk_level: data.risk_level || "unknown",
      summary: data.summary || "No summary available.",
      red_flags: Array.isArray(data.red_flags) ? data.red_flags : [],
      positive_notes: Array.isArray(data.positive_notes) ? data.positive_notes : [],
      sample_experiences: Array.isArray(data.sample_experiences) ? data.sample_experiences : [],
      sources: Array.isArray(data.sources) ? data.sources : [],
    };
  } catch (error) {
    console.error("[Reddit Service] Error:", error);
    
    // Handle specific error types
    if (error.name === "AbortError" || error.name === "TimeoutError") {
      throw new Error("Reddit search timed out. The service may be slow or unavailable.");
    }
    
    if (error.message.includes("fetch")) {
      throw new Error("Cannot connect to Reddit API. Make sure the server is running.");
    }
    
    throw error;
  }
}

/**
 * Get sentiment badge color class
 * @param {string} sentiment - The sentiment value
 * @returns {string} CSS class name
 */
export function getSentimentClass(sentiment) {
  switch (sentiment?.toLowerCase()) {
    case "positive":
      return "sentiment-positive";
    case "negative":
      return "sentiment-negative";
    case "mixed":
      return "sentiment-mixed";
    default:
      return "sentiment-unclear";
  }
}

/**
 * Get risk level badge color class
 * @param {string} riskLevel - The risk level value
 * @returns {string} CSS class name
 */
export function getRiskLevelClass(riskLevel) {
  switch (riskLevel?.toLowerCase()) {
    case "low":
      return "risk-low";
    case "medium":
      return "risk-medium";
    case "high":
      return "risk-high";
    default:
      return "risk-unknown";
  }
}

