<script>
  import { onMount } from 'svelte';
  import TabItem from './components/TabItem.svelte';
  import Header from './components/Header.svelte';
  import EmptyState from './components/EmptyState.svelte';
  import Icebox from './components/Icebox.svelte';

  /* global chrome */

  /** @type {Array<{id: number, title: string, discarded: boolean}>} */
  let tabs = [];

  /** @type {any[]} */
  let icebox = []; // Notre liste d'onglets "sauvegardés au frais"

  let appName = 'Keeps';

  onMount(() => {
    refreshTabs();
  });

  function refreshTabs() {
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.sendMessage({ action: 'GET_TABS' }, (response) => {
        if (response && response.tabs) {
          // Pour le POC, on ne prend pas en compte les onglets déjà mis dans la Icebox
          const iceboxIds = icebox.map((t) => t.id);
          tabs = response.tabs.filter((t) => !iceboxIds.includes(t.id));
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
    // 1. On l'ajoute à notre état local Icebox
    icebox = [...icebox, tab];
    // 2. On le retire de la liste principale
    tabs = tabs.filter((t) => t.id !== tab.id);

    // NB : Dans la prochaine étape, nous demanderons à chrome.tabs.remove()
    // de fermer réellement l'onglet dans le navigateur pour libérer la barre d'onglets.
  }

  /** @type {(tab: any) => void} */
  function restoreFromIcebox(tab) {
    // Retirer de la icebox
    icebox = icebox.filter((t) => t.id !== tab.id);
    // Dans l'app finale, on réouvrira l'onglet via chrome.tabs.create({ url: tab.url })
    refreshTabs();
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
            <TabItem
              {tab}
              onFreeze={(e) => freezeTab(e)}
              onPutToIcebox={(e) => sendToIcebox(e)}
            />
          {/each}
        </div>
      {/if}
    </div>
  </div>

  <!-- ZONE INFÉRIEURE : La Icebox Fixe en bas -->
  <Icebox
    {icebox}
    onRestore={(tab) => restoreFromIcebox(tab)}
    onRefresh={() => refreshTabs()}
  ></Icebox>
</main>
