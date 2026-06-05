// Configuration du panneau au démarrage
chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch((error) =>
      console.error('Erreur de configuration du sidePanel:', error),
    );
});

// Écoute du raccourci clavier Alt+S
chrome.commands.onCommand.addListener((command) => {
  if (command === 'save-to-icebox') {
    console.warn('Save to ice box msg');
    // 1. Récupérer l'onglet actif de la fenêtre actuelle
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs || tabs.length === 0) return;
      const activeTab = tabs[0];

      // Éviter de stocker les pages système du navigateur
      if (
        activeTab.url.startsWith('chrome://') ||
        activeTab.url.startsWith('brave://')
      ) {
        return;
      }

      // 2. Récupérer la Icebox existante dans le stockage local
      chrome.storage.local.get({ icebox: [] }, (result) => {
        const currentIcebox = result.icebox;

        // Créer notre objet d'onglet simplifié
        const newIceboxItem = {
          id: Date.now(), // ID unique basé sur le timestamp
          title: activeTab.title,
          url: activeTab.url,
          favIconUrl: activeTab.favIconUrl,
          addedAt: new Date().toISOString(),
        };

        // 3. Sauvegarder la nouvelle liste mise à jour
        chrome.storage.local.set(
          { icebox: [...currentIcebox, newIceboxItem] },
          () => {
            // 4. Une fois sauvegardé, on ferme l'onglet pour libérer l'esprit (et la RAM)
            chrome.tabs.remove(activeTab.id);
          },
        );
      });
    });
  }
});

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
