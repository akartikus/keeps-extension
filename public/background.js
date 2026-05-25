// Écouter les messages en provenance de l'UI Svelte
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Action 1 : Récupérer tous les onglets de la fenêtre actuelle
  if (message.action === 'GET_TABS') {
    chrome.tabs.query({ currentWindow: true }, (tabs) => {
      sendResponse({ tabs: tabs });
    });
    return true; // Garde le canal ouvert pour la réponse asynchrone
  }

  // Action 2 : Mettre en veille (hiberner) un onglet spécifique
  if (message.action === 'FREEZE_TAB') {
    chrome.tabs
      .discard(message.tabId)
      .then((discardedTab) => {
        sendResponse({ success: true, tab: discardedTab });
      })
      .catch((err) => {
        sendResponse({ success: false, error: err.message });
      });
    return true;
  }
});

// On garde notre code d'ouverture pour Brave/Chrome
chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ windowId: tab.windowId }).catch(() => {
    chrome.tabs.create({ url: 'index.html' });
  });
});
