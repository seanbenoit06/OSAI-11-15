import { sampleContract } from "./sampleContract.js";

const DEFAULT_SEVERITY_SET = new Set();
const API_URL = "http://localhost:3000/analyze";
const PDF_FAIL_TEXT = "Failed to extract text from PDF.";

let activeSeverities = new Set(DEFAULT_SEVERITY_SET);
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
const severityGroupEl = document.getElementById("severityGroup");
const sortSelect = document.getElementById("sortSelect");

const analyzeBtnDefaultContent = analyzeBtn.innerHTML;

analyzeBtn.addEventListener("click", handleAnalyze);
closeResultsBtn.addEventListener("click", () => {
  resultsSection.style.display = "none";
});

severityGroupEl.addEventListener("change", () => {
  updateActiveSeverities();
  rerenderWithCurrentFilters();
});

sortSelect.addEventListener("change", () => {
  rerenderWithCurrentFilters();
});

async function handleAnalyze() {
  setLoading(true);
  try {
    const contractText = await getContractText();
    const analysis = await fetchAnalysis(contractText);
    lastAnalysis = analysis;
    rerenderWithCurrentFilters();
  } catch (err) {
    console.error(err);
    alert(err?.message || "Unable to analyze contract. Ensure the local server is running.");
  } finally {
    setLoading(false);
  }
}

window.setSeverityFilter = function setSeverityFilter(value) {
  updateActiveSeverities(new Set([Number(value)]));
  rerenderWithCurrentFilters();
};

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

function applyFilters(analysis) {
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
  if (tab && isPdfTab(tab)) {
    try {
      const text = await extractPdfText(tab.url);
      return text?.trim() ? text : PDF_FAIL_TEXT;
    } catch (err) {
      console.error("PDF extraction failed:", err);
      return PDF_FAIL_TEXT;
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
  const url = tab.url || "";
  const title = tab.title || "";
  return (
    url.toLowerCase().includes(".pdf") ||
    title.toLowerCase().endsWith(".pdf")
  );
}

async function extractPdfText(pdfUrl) {
  if (!pdfUrl) throw new Error("Missing PDF URL");
  const pdfjsLib = await import(
    "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.0.379/build/pdf.min.mjs"
  );
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.0.379/build/pdf.worker.min.mjs";

  const response = await fetch(pdfUrl, { credentials: "include" });
  if (!response.ok) {
    throw new Error(`Unable to fetch PDF (${response.status})`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
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

function sortIssues(flags) {
  const sortMode = sortSelect.value;
  const sorted = {};

  const categoryEntries = Object.entries(flags);
  categoryEntries.sort(([a], [b]) => a.localeCompare(b));

  for (const [category, issues] of categoryEntries) {
    const issuesCopy = [...issues];

    if (sortMode === "severity-asc") {
      issuesCopy.sort((a, b) => Number(a.severity) - Number(b.severity));
    } else if (sortMode === "category-asc") {
      issuesCopy.sort((a, b) => (a.example || "").localeCompare(b.example || ""));
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
