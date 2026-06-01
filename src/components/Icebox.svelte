<script>
  // On déclare les entrées et les sorties au même endroit (les Props)
  /** * @typedef {Object} Props
   * @property {Array<{id: number, title: string, discarded: boolean}>} icebox = [];
   * @property {(tab: any) => void} onRestore
   * @property {() => void} onRefresh
   */

  /** @type {Props} */
  let { icebox, onRestore, onRefresh } = $props(); // $props() est la nouvelle Rune Svelte 5

  /** @type {(tab: any) => void} */
  function restoreFromIcebox(tab) {
    // Déléguer la mutation à App.svelte via le callback
    onRestore(tab);
  }
</script>

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
      {#each icebox as frozenTab (frozenTab.id)}
        <div
          class="flex items-center justify-between p-2 rounded-lg bg-zinc-950 border border-zinc-900 text-[11px]"
        >
          <span class="truncate text-zinc-400 max-w-[170px]"
            >{frozenTab.title}</span
          >
          <button
            onclick={() => restoreFromIcebox(frozenTab)}
            class="text-[10px] text-zinc-500 hover:text-zinc-300 font-medium transition"
          >
            Restaurer
          </button>
        </div>
      {/each}
    </div>
  {/if}
</div>
