<script>
  import { onMount } from 'svelte';

  /** @type {Array<{id: number, title: string, discarded: boolean}>} */
  let tabs = [];
  let appName = 'Keeps POC';

  // Équivalent du ngOnInit() d'Angular
  onMount(() => {
    refreshTabs();
  });

  // Fonction pour demander la liste des onglets au background.js
  function refreshTabs() {
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.sendMessage({ action: 'GET_TABS' }, (response) => {
        if (response && response.tabs) {
          tabs = response.tabs;
        }
      });
    }
  }

  // Fonction pour geler la RAM d'un onglet
  /** @param {number} tabId */
  function freezeTab(tabId) {
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.sendMessage(
        { action: 'FREEZE_TAB', tabId: tabId },
        /** @param {{ success?: boolean, error?: string }} response */
        (response) => {
          if (response && response.success) {
            alert(
              'Onglet mis en veille ! Regardez son icône dans votre navigateur, elle va se recharger au clic.',
            );
            refreshTabs(); // Met à jour l'état local
          } else {
            console.error('Échec de la mise en veille :', response?.error);
          }
        },
      );
    }
  }
</script>

<main
  class="p-6 h-screen flex flex-col bg-background text-zinc-100 select-none"
>
  <div class="flex items-center justify-between mb-6">
    <h1 class="text-lg font-semibold tracking-tight text-zinc-200">
      {appName}
    </h1>
    <button
      on:click={refreshTabs}
      class="text-xs bg-zinc-800 hover:bg-zinc-700 px-2 py-1 rounded transition text-zinc-300"
    >
      🔄 Actualiser
    </button>
  </div>

  <p class="text-xs text-zinc-400 mb-4">
    Onglets ouverts dans cette fenêtre ({tabs.length}) :
  </p>

  <!-- Liste des onglets (Équivalent du *ngFor d'Angular) -->
  <div class="space-y-2 overflow-y-auto flex-1">
    {#each tabs as tab}
      <div
        class="flex items-center justify-between p-2 rounded-lg bg-surface/50 border border-zinc-800/40 text-xs"
      >
        <span
          class="truncate max-w-[180px] text-zinc-300 {tab.discarded
            ? 'opacity-40 italic'
            : ''}"
        >
          {tab.title}
        </span>

        {#if !tab.discarded}
          <button
            on:click={() => freezeTab(tab.id)}
            class="text-[10px] bg-sky-950/40 text-sky-400 border border-sky-900/50 px-2 py-0.5 rounded hover:bg-sky-900/60 transition"
          >
            ❄️ Geler
          </button>
        {:else}
          <span
            class="text-[10px] text-zinc-500 font-mono bg-zinc-900 px-1.5 py-0.5 rounded"
            >Cold</span
          >
        {/if}
      </div>
    {/each}
  </div>
</main>
