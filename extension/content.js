chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "GET_SELECTED_TEXT") {
    const selection = window.getSelection().toString();
    sendResponse({ text: selection });
    return true;
  }
});