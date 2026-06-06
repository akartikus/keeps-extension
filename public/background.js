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
  switch (message.action) {
    // Action 1 : Récupérer tous les onglets de la fenêtre actuelle
    case 'GET_TABS':
      chrome.tabs.query({ currentWindow: true }, (tabs) => {
        sendResponse({ tabs: tabs });
      });
      return true;

    // Action 2 : Mettre en veille (hiberner) un onglet spécifique
    case 'FREEZE_TAB':
      chrome.tabs
        .discard(message.tabId)
        .then((discardedTab) => {
          sendResponse({ success: true, tab: discardedTab });
        })
        .catch((err) => {
          sendResponse({ success: false, error: err.message });
        });
      return true;

    // Action 3 : Restaurer un espace de travail complet en mode froid
    case 'RESTORE_WORKSPACE_TABS':
      (async () => {
        try {
          for (const tabData of message.tabs) {
            const newTab = await chrome.tabs.create({
              url: tabData.url,
              active: false,
            });

            const discardListener = (tabId, changeInfo, tab) => {
              if (
                tabId === newTab.id &&
                (changeInfo.status === 'loading' ||
                  changeInfo.status === 'complete')
              ) {
                if (tab.url && !tab.url.startsWith('about:')) {
                  chrome.tabs
                    .discard(tabId)
                    .catch((e) =>
                      console.log('Note: Onglet déjà gelé ou géré.'),
                    );
                  chrome.tabs.onUpdated.removeListener(discardListener);
                }
              }
            };
            chrome.tabs.onUpdated.addListener(discardListener);
          }
          sendResponse({ success: true });
        } catch (error) {
          console.error('Erreur lors de la restauration du workspace:', error);
          sendResponse({ success: false, error: error.message });
        }
      })();
      return true;

    case 'GET_BROWSER_RAM':
      (async () => {
        try {
          // 1. Récupérer la capacité totale de la machine à l'instant T
          const memoryInfo = await chrome.system.memory.getInfo();
          const totalCapacity = memoryInfo.capacity;

          // 2. Récupérer l'état EN DIRECT de tous les onglets ouverts
          chrome.tabs.query({}, (tabs) => {
            let totalBrowserBytes = 0;

            // Base fixe du navigateur
            const BROWSER_BASE_MEMORY = 350 * 1024 * 1024; // 350 Mo
            totalBrowserBytes += BROWSER_BASE_MEMORY;

            if (tabs) {
              tabs.forEach((tab) => {
                if (tab.discarded) {
                  totalBrowserBytes += 2 * 1024 * 1024; // 2 Mo pour un onglet gelé
                } else {
                  // 🌟 LA MAGIE DE L'ESTIMATION ULTRA-RÉALISTE :
                  // Si l'onglet est actif (l'utilisateur est dessus), il consomme
                  // naturellement plus de ressources au fil du temps (animations, vidéos, scroll).
                  if (tab.active) {
                    totalBrowserBytes += 180 * 1024 * 1024; // ~180 Mo pour l'onglet au premier plan
                  } else {
                    totalBrowserBytes += 85 * 1024 * 1024; // ~85 Mo pour les onglets passifs en arrière-plan
                  }
                }
              });
            }

            // 3. Renvoyer les données fraîches
            sendResponse({
              success: true,
              bytes: totalBrowserBytes,
              capacity: totalCapacity,
            });
          });
        } catch (error) {
          console.error('Erreur calcul RAM:', error);
          sendResponse({
            success: false,
            bytes: 450 * 1024 * 1024,
            capacity: 16 * 1024 * 1024 * 1024,
          });
        }
      })();
      return true;
  }
});

// On garde notre code d'ouverture pour Brave/Chrome
chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ windowId: tab.windowId }).catch(() => {
    chrome.tabs.create({ url: 'index.html' });
  });
});
