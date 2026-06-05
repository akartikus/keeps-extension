<script>
  import { onMount } from 'svelte';
  import TabItem from './components/TabItem.svelte';
  import Header from './components/Header.svelte';
  import EmptyState from './components/EmptyState.svelte';
  import Icebox from './components/Icebox.svelte';
  import { fade, slide } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import Workspaces from './components/Workspaces.svelte';

  /* global chrome */

  /** @type {Array<{id: number, title: string, discarded: boolean, favIconUrl: string, url: string}>} */
  let tabs = $state([]);
  /** @type {any[]} */
  let icebox = $state([]);

  let appName = 'Keeps';
  let restoringCount = 0;

  let extensionRam = $state('0.0 MB');

  /** @type {any[]} */
  let workspaces = $state([]);

  onMount(() => {
    // Waiting for all data stored ready
    Promise.all([loadIcebox(), loadWorkspaces()]).then(() => {
      refreshTabs();
    });

    updateExtensionRam();
    const ramInterval = setInterval(updateExtensionRam, 5000);

    //  Listen to icebox local storage change
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.onChanged.addListener((changes, areaName) => {
        if (areaName === 'local') {
          // Gestion de la Icebox
          if (changes.icebox) {
            // @ts-ignore
            icebox = changes.icebox.newValue || [];
            if (restoringCount === 0) refreshTabs();
          }

          if (changes.workspaces) {
            // @ts-ignore
            workspaces = changes.workspaces.newValue || [];
          }
        }
      });
    }

    if (typeof chrome !== 'undefined' && chrome.tabs) {
      // Déclenché quand un onglet est créé (nouvel onglet)
      chrome.tabs.onCreated.addListener(() => {
        if (restoringCount === 0) refreshTabs();
      });

      // Déclenché quand un onglet est fermé
      chrome.tabs.onRemoved.addListener(() => {
        if (restoringCount === 0) refreshTabs();
      });

      // Déclenché quand un onglet change d'URL, de titre ou se "réveille" (devient actif/complet)
      chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
        // On rafraîchit si le statut passe à complete ou si l'onglet est mis en veille (discarded)
        if (
          (changeInfo.status === 'complete' ||
            changeInfo.discarded !== undefined) &&
          restoringCount === 0
        ) {
          refreshTabs();
        }
      });
    }

    // Nettoyage obligatoire du setInterval lors du démontage du composant
    return () => {
      clearInterval(ramInterval);
    };

    loadWorkspaces();

    // Écouter également les changements sur les workspaces dans le stockage local
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.onChanged.addListener((changes, areaName) => {
        if (areaName === 'local' && changes.workspaces) {
          // @ts-ignore
          workspaces = changes.workspaces.newValue || [];
        }
      });
    }
  });

  // @ts-ignore
  function loadIcebox() {
    return new Promise((resolve) => {
      if (typeof chrome !== 'undefined' && chrome.storage) {
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
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.sendMessage({ action: 'GET_TABS' }, (response) => {
        if (response && response.tabs) {
          // Les onglets vivants affichent TOUS les onglets de la fenêtre actuelle, sans exception.
          // @ts-ignore
          tabs = response.tabs;
        }
      });
    }
  }

  /** @type {(tabId: number) => void} */
  function freezeTab(tabId) {
    chrome.runtime.sendMessage(
      { action: 'FREEZE_TAB', tabId: tabId },
      (response) => {
        if (response && response.success) {
          refreshTabs();
        }
      },
    );
  }

  /** @type {(tab: any) => void} */
  function sendToIcebox(tab) {
    // Action manuelle depuis l'UI Svelte (clic sur le bouton "Mettre au frais")
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
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      // On lève le drapeau : "Attention, je gère le rafraîchissement moi-même !"
      restoringCount++;
      chrome.tabs.create({ url: item.url }, (newTab) => {
        /** * @param {number} tabId
         * @param {{ status?: string, title?: string }} changeInfo
         */
        const listener = (tabId, changeInfo) => {
          if (tabId === newTab.id && changeInfo.status === 'complete') {
            refreshTabs();
            // L'onglet a fini de charger, on peut rabaisser le drapeau
            restoringCount = Math.max(0, restoringCount - 1);
            chrome.tabs.onUpdated.removeListener(listener);
          }
        };

        chrome.tabs.onUpdated.addListener(listener);

        // Cette ligne va déclencher onChanged, mais refreshTabs() sera bloqué par le flag !
        const updatedIcebox = icebox.filter((t) => t.id !== item.id);
        chrome.storage.local.set({ icebox: updatedIcebox });
      });
    }
  }

  /** @param {number} itemId */
  function deleteFromIcebox(itemId) {
    // Supprime définitivement sans réouvrir
    const updatedIcebox = icebox.filter((t) => t.id !== itemId);
    chrome.storage.local.set({ icebox: updatedIcebox });
  }

  function updateExtensionRam() {
    try {
      // @ts-ignore
      if (typeof performance !== 'undefined' && performance.memory) {
        // @ts-ignore
        const usedJSHeapSize = performance.memory.usedJSHeapSize;
        const ramInMB = (usedJSHeapSize / (1024 * 1024)).toFixed(1);
        extensionRam = `${ramInMB} MB`;
      } else {
        extensionRam = 'N/A';
      }
    } catch (error) {
      console.warn(
        "L'API performance.memory est bloquée ou indisponible :",
        error,
      );
      extensionRam = 'N/A';
    }
  }

  // Modifiée pour retourner une Promesse propre
  function loadWorkspaces() {
    return new Promise((resolve) => {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.local.get({ workspaces: [] }, (result) => {
          // @ts-ignore
          workspaces = result.workspaces || [];
          // @ts-ignore
          resolve(); // On signale que les données sont chargées
        });
      } else {
        // @ts-ignore
        resolve();
      }
    });
  }

  // 1. ASPIRER ET SAUVEGARDER LE CONTEXTE ACTUEL (CORRIGÉ)
  function saveCurrentContext(customName = null) {
    if (tabs.length === 0) return; // Rien à sauvegarder

    const timestamp = new Date();
    const workspaceName =
      customName ||
      `Espace du ${timestamp.toLocaleDateString()} - ${timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

    // On prépare l'objet Workspace avec un instantané des onglets actuels
    const newWorkspace = {
      id: Date.now(),
      name: workspaceName,
      tabs: tabs.map((t) => ({
        title: t.title,
        url: t.url,
        favIconUrl: t.favIconUrl,
      })),
      createdAt: timestamp.toISOString(),
    };

    const updatedWorkspaces = [...workspaces, newWorkspace];

    // Sauvegarde dans le stockage local de Chrome
    chrome.storage.local.set({ workspaces: updatedWorkspaces }, () => {
      if (typeof chrome !== 'undefined' && chrome.tabs) {
        // 🌟 LA PROTECTION : On ouvre d'abord un onglet vide pour empêcher le navigateur de se fermer
        chrome.tabs.create({ active: true }, () => {
          // Une fois l'onglet de secours créé, on peut fermer TOUS les anciens onglets en toute sécurité
          const tabIds = tabs.map((t) => t.id).filter((id) => id !== undefined);
          if (tabIds.length > 0) {
            // @ts-ignore
            chrome.tabs.remove(tabIds, () => {
              refreshTabs();
            });
          }
        });
      }
    });
  }

  // 2. RESTAURER UN WORKSPACE (CORRIGÉ ET SÉCURISÉ CONTRE LA FERMETURE)
  /** @param {any} workspaceToRestore */
  function restoreWorkspace(workspaceToRestore) {
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      if (workspaceToRestore.tabs.length === 0) return;

      // Bloquer temporairement les rafraîchissements automatiques pendant la grosse bascule
      restoringCount++;

      // --- 1. SÉCURITÉ : Sauvegarde automatique de la session en cours ---
      if (tabs.length > 0) {
        const timestamp = new Date();
        // 🌟 UNIFICATION : Même format que la création manuelle, sans la mention "Sauvegarde Auto"
        const cleanName = `Espace du ${timestamp.toLocaleDateString()} - ${timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

        const backupWorkspace = {
          id: Date.now() - 1, // Évite les collisions d'ID
          name: cleanName,
          tabs: tabs.map((t) => ({
            title: t.title,
            url: t.url,
            favIconUrl: t.favIconUrl,
          })),
          createdAt: timestamp.toISOString(),
        };

        const nextWorkspaces = [
          ...workspaces.filter((w) => w.id !== workspaceToRestore.id),
          backupWorkspace,
        ];
        chrome.storage.local.set({ workspaces: nextWorkspaces });
      } else {
        const nextWorkspaces = workspaces.filter(
          (w) => w.id !== workspaceToRestore.id,
        );
        chrome.storage.local.set({ workspaces: nextWorkspaces });
      }

      // --- 2. LA STRATÉGIE DU PIVOT PAR INJECTION ---
      const firstTab = workspaceToRestore.tabs[0];
      const remainingTabs = workspaceToRestore.tabs.slice(1);

      chrome.tabs.create({ url: firstTab.url, active: true }, (anchorTab) => {
        const currentTabIds = tabs
          .map((t) => t.id)
          .filter((id) => id !== undefined && id !== anchorTab.id);

        const proceedWithRestore = () => {
          if (remainingTabs.length === 0) {
            restoringCount = Math.max(0, restoringCount - 1);
            refreshTabs();
            return;
          }

          chrome.runtime.sendMessage(
            {
              action: 'RESTORE_WORKSPACE_TABS',
              tabs: remainingTabs,
            },
            (response) => {
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
      });
    }
  }

  // 3. SUPPRIMER DÉFINITIVEMENT UN WORKSPACE
  /** @param {any} id */
  function deleteWorkspace(id) {
    const nextWorkspaces = workspaces.filter((w) => w.id !== id);
    chrome.storage.local.set({ workspaces: nextWorkspaces });
  }
</script>

<main
  class="p-6 h-screen flex flex-col justify-between bg-background text-zinc-100 select-none overflow-hidden"
>
  <div class="flex-1 flex flex-col min-h-0 space-y-6 mb-4">
    <Header {appName} {extensionRam}></Header>

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
