chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === "FETCH_PDF_ARRAY_BUFFER" && message.url) {
    fetch(message.url, { credentials: "include" })
      .then((resp) => {
        if (!resp.ok) {
          throw new Error(`HTTP ${resp.status}`);
        }
        return resp.arrayBuffer();
      })
      .then((buffer) => {
        const bytes = Array.from(new Uint8Array(buffer));
        sendResponse({ success: true, buffer: bytes });
      })
      .catch((error) => {
        console.error("PDF fetch failed:", error);
        sendResponse({ success: false, error: error.message });
      });
    return true;
  }
});

