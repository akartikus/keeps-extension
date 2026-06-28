// Configure panel on start
chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch((error) =>
      console.error('Erreur de configuration du sidePanel:', error),
    );
});

chrome.commands.onCommand.addListener((command) => {
  if (command === 'save-to-icebox') {
    // 1. Retreive active tab of the current window
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs || tabs.length === 0) return;
      const activeTab = tabs[0];

      // Avoid system page
      if (
        activeTab.url.startsWith('chrome://') ||
        activeTab.url.startsWith('brave://')
      ) {
        return;
      }

      // 2. Get current Icebox on local storage
      chrome.storage.local.get({ icebox: [] }, (result) => {
        const currentIcebox = result.icebox;

        const newIceboxItem = {
          id: Date.now(),
          title: activeTab.title,
          url: activeTab.url,
          favIconUrl: activeTab.favIconUrl,
          addedAt: new Date().toISOString(),
        };

        // 3. Update Icebox on local storage and free memory
        chrome.storage.local.set(
          { icebox: [...currentIcebox, newIceboxItem] },
          () => {
            chrome.tabs.remove(activeTab.id);
          },
        );
      });
    });
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.action) {
    case 'GET_TABS':
      chrome.tabs.query({ currentWindow: true }, (tabs) => {
        sendResponse({ tabs: tabs });
      });
      return true;

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
          const memoryInfo = await chrome.system.memory.getInfo();
          const totalCapacity = memoryInfo.capacity;

          chrome.tabs.query({}, (tabs) => {
            let totalBrowserBytes = 0;

            const BROWSER_BASE_MEMORY = 350 * 1024 * 1024; // 350 Mo
            totalBrowserBytes += BROWSER_BASE_MEMORY;

            if (tabs) {
              tabs.forEach((tab) => {
                if (tab.discarded) {
                  totalBrowserBytes += 2 * 1024 * 1024; // 2 Mo for a frozen tab
                } else {
                  if (tab.active) {
                    totalBrowserBytes += 180 * 1024 * 1024; // ~180 Mo pour l'onglet au premier plan
                  } else {
                    totalBrowserBytes += 85 * 1024 * 1024; // ~85 Mo pour les onglets passifs en arrière-plan
                  }
                }
              });
            }

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

chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ windowId: tab.windowId }).catch(() => {
    chrome.tabs.create({ url: 'index.html' });
  });
});

const INACTIVITY_THRESHOLD_MS = 5 * 60 * 1000; 
const CHECK_INTERVAL_MINUTES = 1; 

let lastActiveTimes = {}; // {tabId: timestamp}
chrome.tabs.query({}, (tabs) => {
  tabs.forEach(tab => {
    lastActiveTimes[tab.id] = Date.now();
  });
});


chrome.tabs.onActivated.addListener((activeInfo) => {
  lastActiveTimes[activeInfo.tabId] = Date.now();
});

chrome.tabs.onRemoved.addListener((tabId) => {
  delete lastActiveTimes[tabId];
});

async function checkInactiveTabs() {
  const now = Date.now();
  try {
    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
      if (
        tab.active ||
        tab.discarded ||
        tab.url.startsWith('chrome://') ||
        tab.url.startsWith('about:') ||
        tab.url.startsWith('brave://')
      ) {
        continue;
      }

      const lastActive = lastActiveTimes[tab.id];
      if (lastActive && (now - lastActive > INACTIVITY_THRESHOLD_MS)) {
        try {
          await chrome.tabs.discard(tab.id);
          console.log(`[Keeps] Onglet suspendu par inactivité: ${tab.title}`);
          chrome.runtime.sendMessage({ action: 'REFRESH_TABS' }).catch(() => { });
        } catch (e) {
        }
      }
    }
  } catch (error) {
    console.error('[Keeps] Erreur lors du check d\'inactivité:', error);
  }
}

chrome.alarms.create('checkInactivity', { periodInMinutes: CHECK_INTERVAL_MINUTES });

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'checkInactivity') {
    checkInactiveTabs();
  }
});