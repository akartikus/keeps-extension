<script>
  import { onMount } from 'svelte';
  import TabItem from './components/TabItem.svelte';
  import Header from './components/Header.svelte';
  import EmptyState from './components/EmptyState.svelte';
  import Icebox from './components/Icebox.svelte';
  import { fade, slide } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';

  /* global chrome */

  /** @type {Array<{id: number, title: string, discarded: boolean}>} */
  let tabs = [];

  /** @type {any[]} */
  let icebox = []; // Notre liste d'onglets "sauvegardés au frais"

  let appName = 'Keeps';
  let restoringCount = 0;

  onMount(() => {
    loadIcebox().then(() => {
      refreshTabs();
    });

    //  Listen to icebox local storage change
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.onChanged.addListener((changes, areaName) => {
        if (areaName === 'local' && changes.icebox) {
          // @ts-ignore
          icebox = changes.icebox.newValue || [];
          if (restoringCount === 0) {
            refreshTabs();
          }
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
          // On filtre les onglets affichés pour ne pas montrer ceux qui sont déjà dans la Icebox
          const iceboxUrls = icebox.map((t) => t.url);
          // @ts-ignore
          tabs = response.tabs.filter((t) => !iceboxUrls.includes(t.url));
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
</script>

<main
  class="p-6 h-screen flex flex-col justify-between bg-background text-zinc-100 select-none"
>
  <!-- ZONE SUPÉRIEURE : Header & Onglets Actifs -->
  <div class="space-y-6 overflow-y-auto flex-1 pr-1">
    <!-- Header -->
    <Header {appName} onRefresh={() => refreshTabs()}></Header>

    <!-- Section Onglets Actifs -->
    <div class="space-y-3">
      <h2 class="text-xs font-medium text-zinc-400 tracking-wide uppercase">
        Espace de travail actuel ({tabs.length})
      </h2>

      {#if tabs.length === 0}
        <!-- 🌌 EMPTY STATE : Si aucun onglet n'est ouvert (ou s'ils sont tous au frais) -->
        <EmptyState></EmptyState>
      {:else}
        <!-- Liste des Onglets -->
        <div class="space-y-2">
          {#each tabs as tab (tab.id)}
            <!--  Ne pas appliquer l`qnimation si c`est un freeze, prevoire une liste de freeze a mettre a jour correctement -->
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

  <!-- ZONE INFÉRIEURE : La Icebox Fixe en bas -->
  <Icebox
    {icebox}
    onRestore={(tab) => restoreFromIcebox(tab)}
    onDelete={(id) => deleteFromIcebox(id)}
  ></Icebox>
</main>
