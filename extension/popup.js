import { sampleContract } from "./sampleContract.js";

const DEFAULT_MIN_SEVERITY = 3;
const API_URL = "http://localhost:3000/analyze";

let currentMinSeverity = DEFAULT_MIN_SEVERITY;
let lastAnalysis = null;

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
const severitySelect = document.getElementById("minSeveritySelect");

const analyzeBtnDefaultContent = analyzeBtn.innerHTML;

analyzeBtn.addEventListener("click", handleAnalyze);
closeResultsBtn.addEventListener("click", () => {
  resultsSection.style.display = "none";
});

severitySelect.addEventListener("change", () => {
  updateMinSeverity(Number(severitySelect.value));
  if (lastAnalysis) {
    const filtered = applySeverityFilter(lastAnalysis, currentMinSeverity);
    renderResults(filtered);
  }
});

async function handleAnalyze() {
  setLoading(true);
  try {
    const analysis = await fetchAnalysis(sampleContract);
    lastAnalysis = analysis;
    const filtered = applySeverityFilter(lastAnalysis, currentMinSeverity);
    renderResults(filtered);
  } catch (err) {
    console.error(err);
    alert(err?.message || "Unable to analyze contract. Ensure the local server is running.");
  } finally {
    setLoading(false);
  }
}

window.setSeverityFilter = function setSeverityFilter(value) {
  updateMinSeverity(Number(value));
  if (lastAnalysis) {
    const filtered = applySeverityFilter(lastAnalysis, currentMinSeverity);
    renderResults(filtered);
  }
};

function updateMinSeverity(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 1) return;
  currentMinSeverity = numeric;
  if (severitySelect.value !== String(currentMinSeverity)) {
    severitySelect.value = String(currentMinSeverity);
  }
}

function setLoading(isLoading) {
  analyzeBtn.disabled = isLoading;
  if (isLoading) {
    analyzeBtn.textContent = "Analyzing…";
  } else {
    analyzeBtn.innerHTML = analyzeBtnDefaultContent;
  }
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

function applySeverityFilter(analysis, minSeverity) {
  const filteredFlags = {};
  let totalCount = 0;

  for (const [category, issues] of Object.entries(analysis.flagged || {})) {
    const kept = issues
      .filter((issue) => issue.severity >= minSeverity)
      .sort((a, b) => b.severity - a.severity);

    if (kept.length) {
      filteredFlags[category] = kept;
      totalCount += kept.length;
    }
  }

  const preview = getTopIssue(filteredFlags);

  return {
    flagged: filteredFlags,
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
  if (typeof susScore === "number") {
    susScoreEl.textContent = `Sus Score: ${susScore.toFixed(1)}%`;
  } else {
    susScoreEl.textContent = "Sus Score: --%";
  }
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
  previewExampleEl.textContent = preview.issue.example || "No example provided.";
  previewReasonEl.textContent = preview.issue.reason || "";
  previewSeverityEl.textContent = `Severity ${preview.issue.severity}`;
}

function renderNoResults() {
  const noResults = document.createElement("div");
  noResults.className = "no-results";
  noResults.innerHTML = `
    <div class="no-results-icon">⚖️</div>
    <p class="no-results-text">Looks clean!</p>
    <p class="no-results-subtext">No issues meet the severity threshold.</p>
  `;
  resultsListEl.appendChild(noResults);
}

function createResultItem(category, issue) {
  const container = document.createElement("div");
  container.className = `result-item ${severityClass(issue.severity)}`;

  const title = document.createElement("div");
  title.className = "result-title";
  title.textContent = category;

  const example = document.createElement("p");
  example.className = "result-description";
  example.textContent = `Example: ${issue.example}`;

  const reason = document.createElement("p");
  reason.className = "result-description";
  reason.textContent = issue.reason;

  const badge = document.createElement("span");
  const severityLevel = severityLabel(issue.severity);
  badge.className = `severity-badge ${severityLevel.toLowerCase()}`;
  badge.textContent = `${severityLevel} • ${issue.severity}`;

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
