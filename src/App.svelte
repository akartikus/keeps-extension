<script>
  import { onMount } from 'svelte';

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
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <h1 class="text-lg font-semibold tracking-tight text-zinc-200">
          {appName}
        </h1>
        <span
          class="text-[10px] bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded-full text-zinc-400 font-mono"
          >v0.1</span
        >
      </div>
      <button
        on:click={refreshTabs}
        class="text-[11px] text-zinc-400 hover:text-zinc-200 transition flex items-center gap-1"
      >
        🔄 Actualiser
      </button>
    </div>

    <!-- Section Onglets Actifs -->
    <div class="space-y-3">
      <h2 class="text-xs font-medium text-zinc-400 tracking-wide uppercase">
        Espace de travail actuel ({tabs.length})
      </h2>

      {#if tabs.length === 0}
        <!-- 🌌 EMPTY STATE : Si aucun onglet n'est ouvert (ou s'ils sont tous au frais) -->
        <div
          class="border border-dashed border-zinc-800 rounded-xl p-6 text-center space-y-3 mt-4 bg-surface/10"
        >
          <p class="text-sm font-medium text-zinc-300">
            Votre esprit est calme.
          </p>
          <p
            class="text-xs text-zinc-500 max-w-[200px] mx-auto leading-relaxed"
          >
            Tous vos onglets de travail sont rangés ou gelés.
          </p>
        </div>
      {:else}
        <!-- Liste des Onglets -->
        <div class="space-y-2">
          {#each tabs as tab}
            <div
              class="flex items-center justify-between p-2.5 rounded-xl bg-surface/30 border border-zinc-800/60 hover:border-zinc-800 transition group text-xs"
            >
              <div class="flex flex-col min-w-0 pr-2">
                <span
                  class="truncate font-medium text-zinc-300 {tab.discarded
                    ? 'opacity-40 italic'
                    : ''}"
                >
                  {tab.title}
                </span>
                <span
                  class="text-[10px] text-zinc-500 truncate font-mono mt-0.5"
                  >{tab.url ? new URL(tab.url).hostname : ''}</span
                >
              </div>

              <!-- Actions au survol (pattern UX moderne) -->
              <div class="flex items-center gap-1.5 shrink-0">
                {#if !tab.discarded}
                  <button
                    on:click={() => freezeTab(tab.id)}
                    title="Geler la RAM de cet onglet"
                    class="text-[10px] bg-sky-950/40 text-sky-400 border border-sky-900/50 px-2 py-1 rounded-md hover:bg-sky-900/60 transition"
                  >
                    ❄️ Geler
                  </button>
                {:else}
                  <span
                    class="text-[10px] text-zinc-400 font-mono bg-zinc-900/80 px-2 py-1 border border-zinc-800 rounded-md"
                    >Cold</span
                  >
                {/if}

                <button
                  on:click={() => sendToIcebox(tab)}
                  title="Mettre de côté dans la Icebox"
                  class="text-[10px] bg-zinc-800 text-zinc-300 px-2 py-1 rounded-md hover:bg-zinc-700 hover:text-white transition"
                >
                  📦 Mettre au frais
                </button>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  </div>

  <!-- ZONE INFÉRIEURE : La Icebox Fixe en bas -->
  <div class="border-t border-zinc-900 pt-4 mt-4 bg-background shrink-0">
    <div
      class="flex items-center justify-between text-[11px] font-medium tracking-wider text-zinc-400 mb-3"
    >
      <span class="flex items-center gap-1.5"
        >📦 ICEBOX <span
          class="font-mono bg-zinc-900 text-zinc-500 px-1.5 py-0.2 rounded-full text-[10px] border border-zinc-800/60"
          >{icebox.length}</span
        ></span
      >
    </div>

    {#if icebox.length === 0}
      <p class="text-xs text-zinc-600 italic py-1">
        Rien au frais pour le moment...
      </p>
    {:else}
      <div class="max-h-[150px] overflow-y-auto space-y-1.5 pr-1">
        {#each icebox as frozenTab}
          <div
            class="flex items-center justify-between p-2 rounded-lg bg-zinc-950 border border-zinc-900 text-[11px]"
          >
            <span class="truncate text-zinc-400 max-w-[170px]"
              >{frozenTab.title}</span
            >
            <button
              on:click={() => restoreFromIcebox(frozenTab)}
              class="text-[10px] text-zinc-500 hover:text-zinc-300 font-medium transition"
            >
              Restaurer
            </button>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</main>
