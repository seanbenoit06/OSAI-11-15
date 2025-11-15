document.getElementById("analyzeBtn").onclick = () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const currentTab = tabs[0];
    const url = currentTab.url;
    
    // Check if it's a PDF
    const isPDF = url.endsWith('.pdf') || url.includes('.pdf?') || 
                  currentTab.title.endsWith('.pdf');
    
    if (isPDF) {
      // Handle PDF case
      handlePDF();
    } else {
        chrome.tabs.sendMessage(
        currentTab.id,
        { type: "GET_WEBPAGE_TEXT" },
        async (response) => {
            console.log(response);
            const text = response?.text;

            if (!text) return alert("No text selected.");

            console.log(`selection: ${text}`);
            // Send to LLM (OpenAI or MuleRun depending on your config)
            // set this up after OpenAI endpoint has been created
            // const analysis = await analyzeText(text);
            // displayResults(analysis);
        }
        );
    }
  });
};

async function handlePDF() {
  let pdfjsLib = await import('https://cdn.jsdelivr.net/npm/pdfjs-dist@4.0.379/build/pdf.min.mjs');
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.0.379/build/pdf.worker.min.mjs';
  
  console.log('extracting text from pdf');

}
