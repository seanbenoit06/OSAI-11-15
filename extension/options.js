// options.js - Settings page for Contract Shield extension

const DEFAULT_REDDIT_API_URL = "http://localhost:8000";

const redditApiUrlInput = document.getElementById("redditApiUrl");
const saveBtn = document.getElementById("saveBtn");
const resetBtn = document.getElementById("resetBtn");
const statusMessage = document.getElementById("statusMessage");

// Load saved settings on page load
document.addEventListener("DOMContentLoaded", loadSettings);

saveBtn.addEventListener("click", saveSettings);
resetBtn.addEventListener("click", resetToDefault);

async function loadSettings() {
  try {
    const result = await chrome.storage.sync.get(["redditApiUrl"]);
    const savedUrl = result.redditApiUrl || DEFAULT_REDDIT_API_URL;
    redditApiUrlInput.value = savedUrl;
  } catch (error) {
    console.error("Error loading settings:", error);
    showStatus("Error loading settings", "error");
  }
}

async function saveSettings() {
  const url = redditApiUrlInput.value.trim();

  // Validate URL format
  if (!isValidUrl(url)) {
    showStatus("Please enter a valid URL (e.g., http://localhost:8000)", "error");
    return;
  }

  try {
    saveBtn.disabled = true;
    await chrome.storage.sync.set({ redditApiUrl: url });
    showStatus("Settings saved successfully!", "success");
    setTimeout(() => {
      saveBtn.disabled = false;
    }, 1000);
  } catch (error) {
    console.error("Error saving settings:", error);
    showStatus("Error saving settings", "error");
    saveBtn.disabled = false;
  }
}

async function resetToDefault() {
  redditApiUrlInput.value = DEFAULT_REDDIT_API_URL;
  try {
    await chrome.storage.sync.set({ redditApiUrl: DEFAULT_REDDIT_API_URL });
    showStatus("Reset to default settings", "success");
  } catch (error) {
    console.error("Error resetting settings:", error);
    showStatus("Error resetting settings", "error");
  }
}

function isValidUrl(string) {
  try {
    const url = new URL(string);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch (_) {
    return false;
  }
}

function showStatus(message, type) {
  statusMessage.textContent = message;
  statusMessage.className = `status-message ${type}`;
  statusMessage.style.display = "block";

  setTimeout(() => {
    statusMessage.style.display = "none";
  }, 3000);
}

