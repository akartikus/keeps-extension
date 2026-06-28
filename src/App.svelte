<script>
  import { onMount } from "svelte";
  import TabItem from "./components/TabItem.svelte";
  import Header from "./components/Header.svelte";
  import EmptyState from "./components/EmptyState.svelte";
  import Icebox from "./components/Icebox.svelte";
  import { fade, slide } from "svelte/transition";
  import { cubicOut } from "svelte/easing";
  import Workspaces from "./components/Workspaces.svelte";

  /* global chrome */

  /** @type {Array<{id: number, title: string, discarded: boolean, favIconUrl: string, url: string}>} */
  let tabs = $state([]);
  /** @type {any[]} */
  let icebox = $state([]);

  let appName = "Keeps";
  let restoringCount = 0;

  let browserRamPercent = $state(0);
  // @ts-ignore
  let totalSystemMemoryBytes = 0;
  let browserRamMB = $state("0 MB");

  /** @type {any[]} */
  let workspaces = $state([]);

  onMount(() => {
    // 1. Chargement initial séquentiel de toutes les données du disque
    Promise.all([loadIcebox(), loadWorkspaces()]).then(() => {
      refreshTabs();
    });

    // 2. Boucle de surveillance de la RAM
    updateBrowserRamUsage();
    const ramInterval = setInterval(updateBrowserRamUsage, 4000);

    // 3. Centralisation de l'écouteur unique pour le stockage local (Icebox + Workspaces)
    if (typeof chrome !== "undefined" && chrome.storage) {
      chrome.storage.onChanged.addListener((changes, areaName) => {
        if (areaName === "local") {
          // Mise à jour de la Icebox
          if (changes.icebox) {
            // @ts-ignore
            icebox = changes.icebox.newValue || [];
            if (restoringCount === 0) refreshTabs();
          }

          // Mise à jour des Workspaces
          if (changes.workspaces) {
            // @ts-ignore
            workspaces = changes.workspaces.newValue || [];
          }
        }
      });
    }

    // 3.5 Listen for background-initiated refreshes
    if (typeof chrome !== "undefined" && chrome.runtime) {
      chrome.runtime.onMessage.addListener((message) => {
        if (message.action === "REFRESH_TABS") {
          if (restoringCount === 0) refreshTabs();
        }
      });
    }

    // 4. Écouteurs pour les mouvements d'onglets du navigateur
    if (typeof chrome !== "undefined" && chrome.tabs) {
      chrome.tabs.onCreated.addListener(() => {
        if (restoringCount === 0) refreshTabs();
      });

      chrome.tabs.onRemoved.addListener(() => {
        if (restoringCount === 0) refreshTabs();
      });

      // 🌟 Événement déclenché quand l'utilisateur change d'onglet actif
      chrome.tabs.onActivated.addListener(() => {
        if (restoringCount === 0) refreshTabs();
      });

      chrome.tabs.onHighlighted.addListener(() => {
        if (restoringCount === 0) refreshTabs();
      });

      // @ts-ignore
      // @ts-ignore
      chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
        // On attend bien que le statut passe à 'complete' (page chargée)
        // ou que l'état de mise en veille change
        if (
          (changeInfo.status === "complete" ||
            changeInfo.discarded !== undefined) &&
          restoringCount === 0
        ) {
          refreshTabs();
        }
      });
    }

    // 5. Nettoyage unique lors du démontage (Le return doit TOUJOURS être à la toute fin)
    return () => {
      clearInterval(ramInterval);
    };
  });

  // @ts-ignore
  function loadIcebox() {
    return new Promise((resolve) => {
      if (typeof chrome !== "undefined" && chrome.storage) {
        chrome.storage.local.get({ icebox: [] }, (result) => {
          // @ts-ignore
          icebox = result.icebox;
          // @ts-ignore
          resolve();
        });
      } else {
        // @ts-ignore
        resolve();
      }
    });
  }
  function refreshTabs() {
    if (typeof chrome !== "undefined" && chrome.runtime) {
      chrome.runtime.sendMessage({ action: "GET_TABS" }, (response) => {
        if (response && response.tabs) {
          // Les onglets vivants affichent TOUS les onglets de la fenêtre actuelle
          // TODO take in account state of the tab, the tab may be already forzen
          // @ts-ignore
          tabs = response.tabs;
        }
        updateBrowserRamUsage();
      });
    }
  }

  /** @type {(tabId: number) => void} */
  function freezeTab(tabId) {
    chrome.runtime.sendMessage(
      { action: "FREEZE_TAB", tabId: tabId },
      (response) => {
        if (response && response.success) {
          refreshTabs();
        }
      },
    );
  }

  /** @type {(tab: any) => void} */
  function sendToIcebox(tab) {
    const newIceboxItem = {
      id: Date.now(),
      title: tab.title,
      url: tab.url,
      favIconUrl: tab.favIconUrl,
      addedAt: new Date().toISOString(),
    };

    chrome.storage.local.set({ icebox: [...icebox, newIceboxItem] }, () => {
      if (tab.id) chrome.tabs.remove(tab.id);
    });
  }

  /** @param {any} item */
  function restoreFromIcebox(item) {
    if (typeof chrome !== "undefined" && chrome.tabs) {
      restoringCount++;
      chrome.tabs.create({ url: item.url }, (newTab) => {
        /** * @param {number} tabId
         * @param {{ status?: string, title?: string }} changeInfo
         */
        const listener = (tabId, changeInfo) => {
          if (tabId === newTab.id && changeInfo.status === "complete") {
            refreshTabs();
            restoringCount = Math.max(0, restoringCount - 1);
            chrome.tabs.onUpdated.removeListener(listener);
          }
        };

        chrome.tabs.onUpdated.addListener(listener);

        // this trigger onChanged, but refreshTabs() will be bloqued by flag restoringCount
        const updatedIcebox = icebox.filter((t) => t.id !== item.id);
        chrome.storage.local.set({ icebox: updatedIcebox });
      });
    }
  }

  /** @param {number} itemId */
  function deleteFromIcebox(itemId) {
    const updatedIcebox = icebox.filter((t) => t.id !== itemId);
    chrome.storage.local.set({ icebox: updatedIcebox });
  }

  function loadWorkspaces() {
    return new Promise((resolve) => {
      if (typeof chrome !== "undefined" && chrome.storage) {
        chrome.storage.local.get({ workspaces: [] }, (result) => {
          // @ts-ignore
          workspaces = result.workspaces || [];
          // @ts-ignore
          resolve();
        });
      } else {
        // @ts-ignore
        resolve();
      }
    });
  }

  function saveCurrentContext(customName = null) {
    const tabsToSave = Array.from(tabs).map((t) => ({
      title: t.title,
      url: t.url,
      favIconUrl: t.favIconUrl,
    }));

    if (tabsToSave.length === 0) {
      console.warn(
        "Création bloquée : Impossible de sauvegarder un espace vide.",
      );
      return;
    }

    const timestamp = new Date();
    const workspaceName =
      customName ||
      `Espace du ${timestamp.toLocaleDateString()} - ${timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;

    const newWorkspace = {
      id: Date.now(),
      name: workspaceName,
      tabs: tabsToSave,
      createdAt: timestamp.toISOString(),
    };

    if (typeof chrome !== "undefined" && chrome.storage) {
      chrome.storage.local.get({ workspaces: [] }, (result) => {
        const currentWorkspaces = result.workspaces || [];
        // @ts-ignore
        const updatedWorkspaces = [...currentWorkspaces, newWorkspace];

        chrome.storage.local.set({ workspaces: updatedWorkspaces }, () => {
          // PROTECTION : Open an emplty tab to avoid browser to close
          chrome.tabs.create({ active: true }, () => {
            const tabIds = tabs
              .map((t) => t.id)
              .filter((id) => id !== undefined);
            if (tabIds.length > 0) {
              // @ts-ignore
              chrome.tabs.remove(tabIds, () => {
                refreshTabs();
              });
            }
          });
        });
      });
    }
  }
  /** Restore an existing wordspace and automatically save the current tabs in a workspace*/
  /** @param {any} workspaceToRestore */
  function restoreWorkspace(workspaceToRestore) {
    if (typeof chrome !== "undefined" && chrome.tabs && chrome.storage) {
      // Snapshot of a tabs instead of manupulate reactive "tabs"
      const currentTabsSnapshot = JSON.parse(JSON.stringify(tabs));

      const rawTabsToRestore = Array.from(workspaceToRestore.tabs || []);
      if (rawTabsToRestore.length === 0) return;

      // Used to block refresh, TODO: use $effet to trigger?
      restoringCount++;

      // STEP  1 : retreive list from storage
      chrome.storage.local.get({ workspaces: [] }, (result) => {
        const currentWorkspaces = result.workspaces || [];

        let nextWorkspaces = [];

        // --- Sauvegarde automatique de la session qui va être fermée ---
        if (currentTabsSnapshot && currentTabsSnapshot.length > 0) {
          const timestamp = new Date();

          // TODO: If the opened workspace is an defined workspace keep the name
          const cleanName = `Espace du ${timestamp.toLocaleDateString()} - ${timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;

          const backupWorkspace = {
            id: Date.now(),
            name: cleanName,
            // @ts-ignore
            tabs: currentTabsSnapshot.map((t) => ({
              title: t.title,
              url: t.url,
              favIconUrl: t.favIconUrl,
            })),
            createdAt: timestamp.toISOString(),
          };

          nextWorkspaces = [
            // @ts-ignore
            ...currentWorkspaces.filter((w) => w.id !== workspaceToRestore.id),
            backupWorkspace,
          ];
        } else {
          // @ts-ignore
          nextWorkspaces = currentWorkspaces.filter(
            // @ts-ignore
            (w) => w.id !== workspaceToRestore.id,
          );
        }

        // STEP 2 : Save updated wordspaces list and open expected workspace
        chrome.storage.local.set({ workspaces: nextWorkspaces }, () => {
          const firstTab = rawTabsToRestore[0];
          const remainingTabs = rawTabsToRestore.slice(1);

          chrome.tabs.create(
            { url: firstTab.url, active: true },
            (anchorTab) => {
              const currentTabIds = currentTabsSnapshot
                // @ts-ignore
                .map((t) => t.id)
                // @ts-ignore
                .filter((id) => id !== undefined && id !== anchorTab.id);

              const proceedWithRestore = () => {
                if (remainingTabs.length === 0) {
                  restoringCount = Math.max(0, restoringCount - 1);
                  refreshTabs();
                  return;
                }

                // Background open the others and directly freeze them
                chrome.runtime.sendMessage(
                  {
                    action: "RESTORE_WORKSPACE_TABS",
                    tabs: remainingTabs,
                  },
                  // @ts-ignore
                  () => {
                    restoringCount = Math.max(0, restoringCount - 1);
                    refreshTabs();
                  },
                );
              };

              if (currentTabIds.length > 0) {
                // @ts-ignore
                chrome.tabs.remove(currentTabIds, proceedWithRestore);
              } else {
                proceedWithRestore();
              }
            },
          );
        });
      });
    }
  }

  /** @param {any} id */
  function deleteWorkspace(id) {
    const nextWorkspaces = workspaces.filter((w) => w.id !== id);
    chrome.storage.local.set({ workspaces: nextWorkspaces });
  }

  /** @param {any} tab */
  function focusTab(tab) {
    if (typeof chrome !== "undefined" && chrome.tabs) {
      chrome.tabs.update(tab.id, { active: true }, () => {
        chrome.windows.update(tab.windowId, { focused: true });
      });
    }
  }

  function updateBrowserRamUsage() {
    if (
      typeof chrome !== "undefined" &&
      chrome.runtime &&
      chrome.runtime.sendMessage
    ) {
      // On demande au background de faire le travail de bas niveau
      chrome.runtime.sendMessage({ action: "GET_BROWSER_RAM" }, (response) => {
        if (response && response.success) {
          const totalBrowserBytes = response.bytes;
          const totalSystemMemoryBytes = response.capacity;

          // Calcul de l'affichage textuel (MB ou GB)
          const ramMB = totalBrowserBytes / (1024 * 1024);
          if (ramMB >= 1024) {
            browserRamMB = `${(ramMB / 1024).toFixed(1)} GB`;
          } else {
            browserRamMB = `${Math.round(ramMB)} MB`;
          }

          // Calcul du pourcentage
          browserRamPercent = Math.round(
            (totalBrowserBytes / totalSystemMemoryBytes) * 100,
          );
        }
      });
    } else {
      // Fallback pour le développement local hors extension
      browserRamMB = "340 MB";
      browserRamPercent = 8;
    }
  }
</script>

<main
  class="p-6 h-screen flex flex-col justify-between bg-background text-zinc-100 select-none overflow-hidden"
>
  <div class="flex-1 flex flex-col min-h-0 space-y-6 mb-4">
    <Header {appName} ramPercent={browserRamPercent} ramValue={browserRamMB} />

    <div class="flex-1 flex flex-col min-h-0 space-y-3">
      <h2
        class="text-xs font-medium text-zinc-400 tracking-wide uppercase shrink-0"
      >
        Espace de travail actuel ({tabs.length})
      </h2>

      {#if tabs.length === 0}
        <div class="flex-1 overflow-y-auto">
          <EmptyState></EmptyState>
        </div>
      {:else}
        <div class="flex-1 overflow-y-auto space-y-2 pr-1.5 scroll-smooth">
          {#each tabs as tab (tab.id)}
            <div
              in:slide={{ duration: 200, easing: cubicOut }}
              out:fade={{ duration: 150 }}
              class="origin-top"
            >
              <TabItem
                {tab}
                onFreeze={(e) => freezeTab(e)}
                onPutToIcebox={(e) => sendToIcebox(e)}
                onFocus={() => focusTab(tab)}
              />
            </div>
          {/each}
        </div>
      {/if}
    </div>
  </div>

  <div class="shrink-0">
    <Workspaces
      {workspaces}
      activeTabsCount={tabs.length}
      onSaveContext={() => saveCurrentContext()}
      onRestore={(ws) => restoreWorkspace(ws)}
      onDelete={(id) => deleteWorkspace(id)}
    />

    <Icebox
      {icebox}
      onRestore={(tab) => restoreFromIcebox(tab)}
      onDelete={(id) => deleteFromIcebox(id)}
    ></Icebox>
  </div>
</main>

<style>
  :global(::-webkit-scrollbar) {
    width: 6px; /* Largeur de la barre verticale (ultra-fine) */
    height: 6px; /* Hauteur de la barre horizontale */
  }

  /* Le fond de la piste de défilement (invisible ou très sombre) */
  :global(::-webkit-scrollbar-track) {
    background: transparent;
  }

  /* La poignée (le "vrai" curseur qui bouge) */
  :global(::-webkit-scrollbar-thumb) {
    background-color: var(--color-zinc-800, #27272a); /* Couleur Zinc-800 */
    border-radius: 9999px; /* Bords parfaitement arrondis */
    border: 1px solid transparent; /* Donne un effet d'espacement si besoin */
  }

  /* Au survol de la poignée, elle s'éclaire légèrement */
  :global(::-webkit-scrollbar-thumb:hover) {
    background-color: var(--color-zinc-700, #3f3f46); /* Couleur Zinc-700 */
  }

  /* Optionnel : Masquer les boutons fléchés haut/bas souvent inesthétiques */
  :global(::-webkit-scrollbar-button) {
    display: none;
  }
</style>
