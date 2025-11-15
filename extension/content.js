chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "GET_SELECTED_TEXT") {
    const selection = window.getSelection()?.toString() || "";
    sendResponse({ text: selection });
    return true;
  }

  if (msg.type === "GET_WEBPAGE_TEXT" || msg.type === "GET_PAGE_TEXT") {
    const selection = window.getSelection()?.toString()?.trim();
    if (selection) {
      sendResponse({ text: selection });
      return true;
    }

    const bodyText = document.body ? document.body.innerText : "";
    sendResponse({ text: bodyText });
    return true;
  }
});