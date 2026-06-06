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

  let browserRamPercent = $state(0);
  // @ts-ignore
  let totalSystemMemoryBytes = 0;
  let browserRamMB = $state('0 MB');

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
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.onChanged.addListener((changes, areaName) => {
        if (areaName === 'local') {
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

    // 4. Écouteurs pour les mouvements d'onglets du navigateur
    if (typeof chrome !== 'undefined' && chrome.tabs) {
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
          (changeInfo.status === 'complete' ||
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
          // Les onglets vivants affichent TOUS les onglets de la fenêtre actuelle
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
    // On extrait proprement la donnée vivante des onglets actuels
    const tabsToSave = Array.from(tabs).map((t) => ({
      title: t.title,
      url: t.url,
      favIconUrl: t.favIconUrl,
    }));

    if (tabsToSave.length === 0) {
      console.warn(
        'Création bloquée : Impossible de sauvegarder un espace vide.',
      );
      return;
    }

    const timestamp = new Date();
    const workspaceName =
      customName ||
      `Espace du ${timestamp.toLocaleDateString()} - ${timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

    // On prépare le nouvel objet Workspace
    const newWorkspace = {
      id: Date.now(),
      name: workspaceName,
      tabs: tabsToSave,
      createdAt: timestamp.toISOString(),
    };

    // On va chercher les vrais workspaces sur le disque avant d'écrire
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.get({ workspaces: [] }, (result) => {
        const currentWorkspaces = result.workspaces || [];

        // On fusionne les anciens workspaces du disque avec le nouveau
        // @ts-ignore
        const updatedWorkspaces = [...currentWorkspaces, newWorkspace];

        // On sauvegarde la liste complète et fusionnée
        chrome.storage.local.set({ workspaces: updatedWorkspaces }, () => {
          // PROTECTION : On ouvre d'abord un onglet vide pour empêcher le navigateur de se fermer
          chrome.tabs.create({ active: true }, () => {
            // Une fois l'onglet de secours créé, on ferme les anciens
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

  // 2. RESTAURER UN WORKSPACE (CORRIGÉ ET SÉCURISÉ CONTRE LA FERMETURE)
  /** @param {any} workspaceToRestore */
  // 2. RESTAURER UN WORKSPACE (CORRIGÉ : INSTANTANÉ DES ONGLETS SÉCURISÉ)
  /** @param {any} workspaceToRestore */
  function restoreWorkspace(workspaceToRestore) {
    if (typeof chrome !== 'undefined' && chrome.tabs && chrome.storage) {
      // On fige IMMÉDIATEMENT la session actuelle en texte brut.
      // En faisant un JSON stringify/parse, on détruit le lien avec le Proxy réactif de Svelte.
      // Quoi qu'il arrive aux onglets après cette ligne, notre snapshot ne bougera pas.
      const currentTabsSnapshot = JSON.parse(JSON.stringify(tabs));

      const rawTabsToRestore = Array.from(workspaceToRestore.tabs || []);
      if (rawTabsToRestore.length === 0) return;

      // Bloquer temporairement les rafraîchissements automatiques
      restoringCount++;

      // ÉTAPE 1 : Récupérer la liste propre du stockage Chrome
      chrome.storage.local.get({ workspaces: [] }, (result) => {
        const currentWorkspaces = result.workspaces || [];

        let nextWorkspaces = [];

        // --- Sauvegarde automatique de la session qui va être fermée ---
        // On utilise notre snapshot figé à la place de la variable réactive "tabs"
        if (currentTabsSnapshot && currentTabsSnapshot.length > 0) {
          const timestamp = new Date();
          const cleanName = `Espace du ${timestamp.toLocaleDateString()} - ${timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

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

          // On garde les autres workspaces intacts et on ajoute le backup
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

        // ÉTAPE 2 : On enregistre la nouvelle liste sur le disque
        chrome.storage.local.set({ workspaces: nextWorkspaces }, () => {
          // --- ÉTAPE 3 : RESTAURATION DES ONGLETS ---
          const firstTab = rawTabsToRestore[0];
          const remainingTabs = rawTabsToRestore.slice(1);

          chrome.tabs.create(
            { url: firstTab.url, active: true },
            (anchorTab) => {
              // On cible les anciens onglets à fermer en utilisant le snapshot figé
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

                chrome.runtime.sendMessage(
                  {
                    action: 'RESTORE_WORKSPACE_TABS',
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

  // 3. SUPPRIMER DÉFINITIVEMENT UN WORKSPACE
  /** @param {any} id */
  function deleteWorkspace(id) {
    const nextWorkspaces = workspaces.filter((w) => w.id !== id);
    chrome.storage.local.set({ workspaces: nextWorkspaces });
  }

  /** @param {any} tab */
  function focusTab(tab) {
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      // 1. Activer l'onglet spécifique dans sa fenêtre
      chrome.tabs.update(tab.id, { active: true }, () => {
        // 2. Mettre la fenêtre qui contient cet onglet au premier plan (focus global)
        chrome.windows.update(tab.windowId, { focused: true });
      });
    }
  }

  function updateBrowserRamUsage() {
    if (
      typeof chrome !== 'undefined' &&
      chrome.runtime &&
      chrome.runtime.sendMessage
    ) {
      // On demande au background de faire le travail de bas niveau
      chrome.runtime.sendMessage({ action: 'GET_BROWSER_RAM' }, (response) => {
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
      browserRamMB = '340 MB';
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
