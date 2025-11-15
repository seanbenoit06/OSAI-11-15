import { sampleContract } from "./sampleContract.js";
import { searchCompanyReviews, getSentimentClass, getRiskLevelClass } from "./redditService.js";

const API_URL = "http://localhost:3000/analyze";
const PDF_FAIL_TEXT = "Failed to extract text from PDF.";

let activeSeverities = new Set();
let lastAnalysis = null;
let lastRedditAnalysis = null;
let detectedCompanyName = null;
let currentDocumentFingerprint = null;
let isUsingCachedResults = false;

const analyzeBtn = document.getElementById("analyzeBtn");
const resultsSection = document.getElementById("resultsSection");
const closeResultsBtn = document.getElementById("closeResults");
const flagCountEl = document.getElementById("flagCount");
const resultsListEl = document.getElementById("resultsList");
const previewCardEl = document.getElementById("previewCard");
const previewCategoryEl = document.getElementById("previewCategory");
const previewExampleEl = document.getElementById("previewExample");
const previewReasonEl = document.getElementById("previewReason");
const previewSeverityEl = document.getElementById("previewSeverity");
const susScoreEl = document.getElementById("susScore");
const severityGroupEl = document.getElementById("severityGroup");
const sortSelect = document.getElementById("sortSelect");

// Reddit tab elements
const companyDetectedEl = document.getElementById("companyDetected");
const detectedCompanyNameEl = document.getElementById("detectedCompanyName");
const companyManualEl = document.getElementById("companyManual");
const manualCompanyInput = document.getElementById("manualCompanyInput");
const manualSearchBtn = document.getElementById("manualSearchBtn");
const redditLoadingEl = document.getElementById("redditLoading");
const redditErrorEl = document.getElementById("redditError");
const redditErrorMessageEl = document.getElementById("redditErrorMessage");
const redditResultsEl = document.getElementById("redditResults");

const analyzeBtnDefaultContent = analyzeBtn.innerHTML;

analyzeBtn.addEventListener("click", handleAnalyze);
closeResultsBtn.addEventListener("click", () => {
  resultsSection.style.display = "none";
});

severityGroupEl.addEventListener("change", () => {
  updateActiveSeverities();
  rerenderWithCurrentFilters();
});

sortSelect.addEventListener("change", () => rerenderWithCurrentFilters());

// Tab switching
document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const targetTab = btn.getAttribute("data-tab");
    switchTab(targetTab);
  });
});

// Manual company search
manualSearchBtn.addEventListener("click", handleManualSearch);

window.setSeverityFilter = function setSeverityFilter(value) {
  updateActiveSeverities(new Set([Number(value)]));
  rerenderWithCurrentFilters();
};

// Document fingerprinting and caching utilities
async function getDocumentFingerprint() {
  const tab = await getActiveTab();
  const text = await getContractText();
  
  // Create a simple hash of the content
  const hash = await simpleHash(text);
  const url = tab?.url || "unknown";
  
  return `doc_${url}_${hash}`;
}

async function simpleHash(str) {
  // Simple hash function for content identification
  let hash = 0;
  if (!str || str.length === 0) return hash.toString();
  
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  return Math.abs(hash).toString(36);
}

async function getCachedAnalysis(fingerprint) {
  try {
    const result = await chrome.storage.local.get([fingerprint]);
    return result[fingerprint] || null;
  } catch (error) {
    console.error("Error getting cached analysis:", error);
    return null;
  }
}

async function setCachedAnalysis(fingerprint, data) {
  try {
    // Store with timestamp
    const cacheData = {
      ...data,
      cachedAt: Date.now()
    };
    await chrome.storage.local.set({ [fingerprint]: cacheData });
    console.log("[ContractShield] Cached results for:", fingerprint);
  } catch (error) {
    console.error("Error setting cached analysis:", error);
  }
}

async function clearCache() {
  try {
    await chrome.storage.local.clear();
    console.log("[ContractShield] Cache cleared");
  } catch (error) {
    console.error("Error clearing cache:", error);
  }
}

async function handleAnalyze(forceRescan = false) {
  setLoading(true);
  isUsingCachedResults = false;
  
  try {
    // Generate document fingerprint
    currentDocumentFingerprint = await getDocumentFingerprint();
    console.log("[ContractShield] Document fingerprint:", currentDocumentFingerprint);
    
    // Check cache if not forcing rescan
    if (!forceRescan) {
      const cached = await getCachedAnalysis(currentDocumentFingerprint);
      if (cached) {
        console.log("[ContractShield] Using cached results");
        isUsingCachedResults = true;
        
        // Restore cached data
        lastAnalysis = cached.contractAnalysis;
        lastRedditAnalysis = cached.redditAnalysis;
        detectedCompanyName = cached.companyName;
        
        // Render from cache
        if (lastAnalysis) {
          rerenderWithCurrentFilters();
        }
        if (lastRedditAnalysis) {
          renderRedditResults();
        }
        
        // Show cached indicator
        showCachedIndicator();
        setLoading(false);
        return;
      }
    }
    
    const contractText = await getContractText();
    console.log("[ContractShield] Text length:", contractText?.length || 0);
    
    // Run both analyses in parallel
    const [contractAnalysis, redditAnalysis] = await Promise.allSettled([
      fetchAnalysis(contractText),
      fetchRedditAnalysis(contractText)
    ]);

    // Handle contract analysis
    if (contractAnalysis.status === "fulfilled") {
      lastAnalysis = contractAnalysis.value;
      rerenderWithCurrentFilters();
    } else {
      console.error("Contract analysis failed:", contractAnalysis.reason);
      alert(contractAnalysis.reason?.message || "Unable to analyze contract. Ensure the local server is running.");
    }

    // Handle Reddit analysis
    if (redditAnalysis.status === "fulfilled") {
      lastRedditAnalysis = redditAnalysis.value;
      detectedCompanyName = redditAnalysis.value.companyName;
      renderRedditResults();
    } else {
      console.error("Reddit analysis failed:", redditAnalysis.reason);
      showRedditError(redditAnalysis.reason?.message || "Unable to fetch Reddit reviews.");
    }
    
    // Cache the results
    await setCachedAnalysis(currentDocumentFingerprint, {
      contractAnalysis: lastAnalysis,
      redditAnalysis: lastRedditAnalysis,
      companyName: detectedCompanyName
    });

  } catch (err) {
    console.error(err);
    alert(err?.message || "An unexpected error occurred.");
  } finally {
    setLoading(false);
  }
}

async function fetchRedditAnalysis(contractText) {
  // First get the contract analysis to extract company name
  const analysis = await fetchAnalysis(contractText);
  const companyName = analysis.companyName;

  if (!companyName) {
    return { companyName: null, analysis: null };
  }

  try {
    const redditData = await searchCompanyReviews(companyName);
    return { companyName, analysis: redditData };
  } catch (error) {
    console.error("Reddit search failed:", error);
    return { companyName, analysis: null, error };
  }
}

async function handleManualSearch() {
  const companyName = manualCompanyInput.value.trim();
  if (!companyName) {
    alert("Please enter a company name.");
    return;
  }

  detectedCompanyName = companyName;
  showRedditLoading();

  try {
    const redditData = await searchCompanyReviews(companyName);
    lastRedditAnalysis = { companyName, analysis: redditData };
    renderRedditResults();
  } catch (error) {
    console.error("Manual Reddit search failed:", error);
    showRedditError(error?.message || "Unable to fetch Reddit reviews.");
  }
}

function setLoading(isLoading) {
  analyzeBtn.disabled = isLoading;
  analyzeBtn.innerHTML = isLoading ? "Analyzing…" : analyzeBtnDefaultContent;
}

async function fetchAnalysis(text) {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text })
  });

  if (!response.ok) {
    throw new Error("Analysis request failed");
  }

  return response.json();
}

function applyFilters(analysis) {
  if (!analysis) {
    return {
      flagged: {},
      susScore: null,
      preview: null,
      totalCount: 0
    };
  }

  if (!activeSeverities.size) {
    return {
      flagged: {},
      susScore: typeof analysis.susScore === "number" ? analysis.susScore : null,
      preview: null,
      totalCount: 0
    };
  }

  const filteredFlags = {};
  let totalCount = 0;

  for (const [category, issues] of Object.entries(analysis.flagged || {})) {
    const kept = issues.filter((issue) =>
      activeSeverities.has(Number(issue.severity))
    );

    if (kept.length) {
      filteredFlags[category] = kept;
      totalCount += kept.length;
    }
  }

  const sortedFlags = sortIssues(filteredFlags);
  const preview = getTopIssue(sortedFlags);

  return {
    flagged: sortedFlags,
    susScore: typeof analysis.susScore === "number" ? analysis.susScore : null,
    preview,
    totalCount
  };
}

function getTopIssue(flags) {
  let top = null;

  for (const [category, issues] of Object.entries(flags)) {
    for (const issue of issues) {
      if (!top || issue.severity > top.issue.severity) {
        top = { category, issue };
      }
    }
  }

  return top;
}

function renderResults({ flagged, totalCount, preview, susScore }) {
  flagCountEl.textContent = totalCount;
  susScoreEl.textContent =
    typeof susScore === "number" ? `Sus Score: ${susScore.toFixed(1)}%` : "Sus Score: --%";

  resultsListEl.innerHTML = "";

  if (!totalCount) {
    renderNoResults();
  } else {
    for (const [category, issues] of Object.entries(flagged)) {
      issues.forEach((issue) => {
        resultsListEl.appendChild(createResultItem(category, issue));
      });
    }
  }

  renderPreview(preview);
  resultsSection.style.display = "block";
}

function renderPreview(preview) {
  if (!preview) {
    previewCardEl.style.display = "none";
    return;
  }

  previewCardEl.style.display = "block";
  previewCategoryEl.textContent = preview.category;
  previewExampleEl.textContent = preview.issue.example
    ? `"${preview.issue.example}"`
    : "No example provided.";
  previewReasonEl.textContent = preview.issue.reason || "";
  previewSeverityEl.textContent = `Severity ${preview.issue.severity}`;
}

function renderNoResults() {
  const noResults = document.createElement("div");
  noResults.className = "no-results";
  noResults.innerHTML = `
    <div class="no-results-icon">⚖️</div>
    <p class="no-results-text">${
      activeSeverities.size ? "Looks clean!" : "Select severities"
    }</p>
    <p class="no-results-subtext">${
      activeSeverities.size
        ? "No issues meet the chosen severity levels."
        : "Choose one or more severity levels to view results."
    }</p>
  `;
  resultsListEl.appendChild(noResults);
}

function updateActiveSeverities(forcedSet) {
  if (forcedSet instanceof Set) {
    activeSeverities = new Set(
      [...forcedSet].filter((value) => Number.isFinite(value) && value >= 1)
    );
  } else {
    const selected = Array.from(
      severityGroupEl.querySelectorAll('input[type="checkbox"]:checked')
    ).map((input) => Number(input.value));

    activeSeverities = new Set(selected);
  }

  severityGroupEl
    .querySelectorAll('input[type="checkbox"]')
    .forEach((input) => {
      input.checked = activeSeverities.has(Number(input.value));
    });
}

function rerenderWithCurrentFilters() {
  if (!lastAnalysis) return;
  const filtered = applyFilters(lastAnalysis);
  renderResults(filtered);
}

async function getContractText() {
  const tab = await getActiveTab();
  console.log("[ContractShield] Active tab:", tab?.url);
  if (tab && isPdfTab(tab)) {
    try {
      console.log("[ContractShield] Detected PDF tab.");
      const text = await extractPdfText(tab.url);
      console.log("[ContractShield] Extracted PDF chars:", text?.length || 0);
      return text?.trim() ? text : PDF_FAIL_TEXT;
    } catch (err) {
      console.error("PDF extraction failed:", err);
      return PDF_FAIL_TEXT;
    }
  }

  if (tab?.id) {
    const pageText = await getPageText(tab.id);
    console.log("[ContractShield] Page text chars:", pageText?.length || 0);
    if (pageText?.trim()) {
      return pageText.trim();
    }
  }

  return sampleContract;
}

function getActiveTab() {
  return new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      resolve(tabs[0]);
    });
  });
}

function isPdfTab(tab) {
  if (!tab) return false;
  const url = (tab.url || "").toLowerCase();
  const title = (tab.title || "").toLowerCase();
  return (
    url.includes(".pdf") ||
    title.endsWith(".pdf") ||
    (url.startsWith("chrome-extension://") &&
      (url.includes("pdfurl=") || url.includes("file=")))
  );
}

function getPageText(tabId) {
  return new Promise((resolve) => {
    chrome.tabs.sendMessage(tabId, { type: "GET_WEBPAGE_TEXT" }, (response) => {
      if (chrome.runtime.lastError) {
        console.warn(chrome.runtime.lastError.message);
        resolve("");
        return;
      }
      resolve(response?.text || "");
    });
  });
}

async function extractPdfText(pdfUrl) {
  if (!pdfUrl) throw new Error("Missing PDF URL");
  const resolvedUrl = resolvePdfUrl(pdfUrl);
  console.log("[ContractShield] Fetching PDF:", resolvedUrl);

  const pdfjsLib = await import(chrome.runtime.getURL("vendor/pdfjs/pdf.mjs"));
  pdfjsLib.GlobalWorkerOptions.workerSrc = chrome.runtime.getURL(
    "vendor/pdfjs/pdf.worker.mjs"
  );

  const arrayBuffer = await requestPdfArrayBuffer(resolvedUrl);
  const pdfData = ensureUint8Array(arrayBuffer);
  if (!pdfData || !pdfData.length) {
    throw new Error("Empty PDF data");
  }
  const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;
  let text = "";

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ");
    text += pageText + "\n";
  }

  return text;
}

function requestPdfArrayBuffer(pdfUrl) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      { type: "FETCH_PDF_ARRAY_BUFFER", url: pdfUrl },
      (response) => {
        if (chrome.runtime.lastError) {
          console.warn("[ContractShield] Runtime error:", chrome.runtime.lastError.message);
          return reject(chrome.runtime.lastError);
        }
        if (!response?.success || !response.buffer) {
          console.warn("[ContractShield] Background fetch error:", response?.error);
          return reject(new Error(response?.error || "Unknown fetch error"));
        }
        resolve(response.buffer);
      }
    );
  });
}

function resolvePdfUrl(url) {
  try {
    const parsed = new URL(url);
    if (parsed.protocol === "chrome-extension:") {
      if (parsed.searchParams.has("pdfurl")) {
        return decodeURIComponent(parsed.searchParams.get("pdfurl"));
      }
      if (parsed.searchParams.has("file")) {
        return decodeURIComponent(parsed.searchParams.get("file"));
      }
    }
    return url;
  } catch {
    return url;
  }
}

function ensureUint8Array(bufferLike) {
  if (bufferLike instanceof ArrayBuffer) {
    return new Uint8Array(bufferLike);
  }
  if (Array.isArray(bufferLike)) {
    return new Uint8Array(bufferLike);
  }
  if (bufferLike?.buffer && bufferLike.buffer instanceof ArrayBuffer) {
    return new Uint8Array(bufferLike.buffer);
  }
  return null;
}

function sortIssues(flags) {
  const sortMode = sortSelect.value;
  const sorted = {};
  const categories = Object.entries(flags).sort(([a], [b]) =>
    a.localeCompare(b)
  );

  for (const [category, issues] of categories) {
    const issuesCopy = [...issues];

    if (sortMode === "severity-asc") {
      issuesCopy.sort((a, b) => Number(a.severity) - Number(b.severity));
    } else if (sortMode === "category-asc") {
      issuesCopy.sort((a, b) =>
        (a.example || "").localeCompare(b.example || "")
      );
    } else {
      issuesCopy.sort((a, b) => Number(b.severity) - Number(a.severity));
    }

    sorted[category] = issuesCopy;
  }

  return sorted;
}

function createResultItem(category, issue) {
  const container = document.createElement("div");
  container.className = `result-item ${severityClass(issue.severity)}`;

  const title = document.createElement("div");
  title.className = "result-title";
  title.textContent = category;

  const example = document.createElement("p");
  example.className = "result-description";
  example.textContent = issue.example
    ? `Example: "${issue.example}"`
    : "Example: (not provided)";

  const reason = document.createElement("p");
  reason.className = "result-description";
  reason.textContent = issue.reason;

  const badge = document.createElement("span");
  const level = severityLabel(issue.severity);
  badge.className = `severity-badge ${level.toLowerCase()}`;
  badge.textContent = `${level} • ${issue.severity}`;

  container.appendChild(title);
  container.appendChild(example);
  container.appendChild(reason);
  container.appendChild(badge);

  return container;
}

function severityClass(severity) {
  if (severity >= 5) return "severity-high";
  if (severity >= 3) return "severity-medium";
  return "severity-low";
}

function severityLabel(severity) {
  if (severity >= 5) return "High";
  if (severity >= 3) return "Medium";
  return "Low";
}

// Tab switching functionality
function switchTab(tabName) {
  // Update tab buttons
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    if (btn.getAttribute("data-tab") === tabName) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
  });

  // Update tab content
  document.querySelectorAll(".tab-content").forEach((content) => {
    content.classList.remove("active");
  });

  if (tabName === "contract") {
    document.getElementById("contractTab").classList.add("active");
  } else if (tabName === "reddit") {
    document.getElementById("redditTab").classList.add("active");
  }
}

// Reddit results rendering functions
function renderRedditResults() {
  hideRedditStates();

  if (!lastRedditAnalysis) {
    showRedditError("No Reddit analysis available.");
    return;
  }

  const { companyName, analysis } = lastRedditAnalysis;

  // Show company name
  if (companyName) {
    detectedCompanyNameEl.textContent = companyName;
    companyDetectedEl.style.display = "block";
    companyManualEl.style.display = "none";
  } else {
    companyDetectedEl.style.display = "none";
    companyManualEl.style.display = "block";
  }

  // If no analysis, stop here
  if (!analysis) {
    showRedditError("Unable to fetch Reddit reviews. Please try again or use manual search.");
    return;
  }

  // Show results
  redditResultsEl.style.display = "block";

  // Render sentiment and risk badges
  const sentimentBadge = document.getElementById("sentimentBadge");
  const riskBadge = document.getElementById("riskBadge");
  
  sentimentBadge.textContent = `Sentiment: ${analysis.overall_sentiment}`;
  sentimentBadge.className = `sentiment-badge ${getSentimentClass(analysis.overall_sentiment)}`;
  
  riskBadge.textContent = `Risk: ${analysis.risk_level}`;
  riskBadge.className = `risk-badge ${getRiskLevelClass(analysis.risk_level)}`;

  // Render summary
  document.getElementById("redditSummary").textContent = analysis.summary;

  // Render red flags
  if (analysis.red_flags && analysis.red_flags.length > 0) {
    const redFlagsList = document.getElementById("redditRedFlagsList");
    redFlagsList.innerHTML = "";
    analysis.red_flags.forEach((flag) => {
      const li = document.createElement("li");
      li.textContent = flag;
      redFlagsList.appendChild(li);
    });
    document.getElementById("redditRedFlagsSection").style.display = "block";
  } else {
    document.getElementById("redditRedFlagsSection").style.display = "none";
  }

  // Render positive notes
  if (analysis.positive_notes && analysis.positive_notes.length > 0) {
    const positiveList = document.getElementById("redditPositiveList");
    positiveList.innerHTML = "";
    analysis.positive_notes.forEach((note) => {
      const li = document.createElement("li");
      li.textContent = note;
      positiveList.appendChild(li);
    });
    document.getElementById("redditPositiveSection").style.display = "block";
  } else {
    document.getElementById("redditPositiveSection").style.display = "none";
  }

  // Render experiences
  if (analysis.sample_experiences && analysis.sample_experiences.length > 0) {
    const experiencesList = document.getElementById("redditExperiencesList");
    experiencesList.innerHTML = "";
    analysis.sample_experiences.forEach((exp) => {
      const li = document.createElement("li");
      li.textContent = exp;
      experiencesList.appendChild(li);
    });
    document.getElementById("redditExperiencesSection").style.display = "block";
  } else {
    document.getElementById("redditExperiencesSection").style.display = "none";
  }

  // Render sources
  if (analysis.sources && analysis.sources.length > 0) {
    const sourcesList = document.getElementById("redditSourcesList");
    sourcesList.innerHTML = "";
    analysis.sources.forEach((source) => {
      const sourceDiv = document.createElement("div");
      sourceDiv.className = "reddit-source";
      
      const link = document.createElement("a");
      link.href = source.url;
      link.target = "_blank";
      link.textContent = source.title;
      
      const meta = document.createElement("div");
      meta.className = "source-meta";
      meta.textContent = `r/${source.subreddit} • ${source.score} points`;
      
      sourceDiv.appendChild(link);
      sourceDiv.appendChild(meta);
      sourcesList.appendChild(sourceDiv);
    });
    document.getElementById("redditSourcesSection").style.display = "block";
  } else {
    document.getElementById("redditSourcesSection").style.display = "none";
  }
}

function showRedditLoading() {
  hideRedditStates();
  redditLoadingEl.style.display = "block";
}

function showRedditError(message) {
  hideRedditStates();
  redditErrorMessageEl.textContent = message;
  redditErrorEl.style.display = "block";
  
  // Show manual search option
  companyDetectedEl.style.display = "none";
  companyManualEl.style.display = "block";
}

function hideRedditStates() {
  redditLoadingEl.style.display = "none";
  redditErrorEl.style.display = "none";
  redditResultsEl.style.display = "none";
}

function showCachedIndicator() {
  // Show cached indicator in the results header
  const cachedIndicator = document.getElementById("cachedIndicator");
  const rescanBtn = document.getElementById("rescanBtn");
  
  if (cachedIndicator) {
    cachedIndicator.style.display = "inline-block";
  }
  if (rescanBtn) {
    rescanBtn.style.display = "inline-block";
  }
}

function hideCachedIndicator() {
  const cachedIndicator = document.getElementById("cachedIndicator");
  const rescanBtn = document.getElementById("rescanBtn");
  
  if (cachedIndicator) {
    cachedIndicator.style.display = "none";
  }
  if (rescanBtn) {
    rescanBtn.style.display = "none";
  }
}

async function handleRescan() {
  hideCachedIndicator();
  await handleAnalyze(true);
}

// Add rescan button event listener when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  const rescanBtn = document.getElementById("rescanBtn");
  if (rescanBtn) {
    rescanBtn.addEventListener("click", handleRescan);
  }
});
