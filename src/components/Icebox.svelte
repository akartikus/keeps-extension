<script>
  /**
   * @typedef {Object} IceboxProps
   * @property {any[]} icebox
   * @property {(item: any) => void} onRestore
   * @property {(id: number) => void} onDelete
   */

  /** @type {IceboxProps} */
  let { icebox, onRestore, onDelete } = $props();
  let isImageValid = $state(true);
  /* global chrome */
</script>

<div class="border-t border-zinc-600 pt-4 mt-4 bg-background shrink-0">
  <div
    class="flex items-center justify-between text-[11px] font-medium tracking-wider text-zinc-400 mb-3"
  >
    <span class="flex items-center gap-1.5">
      📦 ICEBOX
      <span
        class="font-mono bg-zinc-900 text-zinc-500 px-1.5 py-0.2 rounded-full text-[10px] border border-zinc-800/60"
      >
        {icebox.length}
      </span>
    </span>
  </div>

  {#if icebox.length === 0}
    <p class="text-xs text-zinc-600 italic py-1">
      Rien au frais pour le moment...
    </p>
  {:else}
    <div class="max-h-[160px] overflow-y-auto space-y-1.5 pr-1">
      {#each icebox as item (item.id)}
        <div
          class="flex items-center justify-between p-2 rounded-lg bg-zinc-950 border border-zinc-900 text-[11px] group"
        >
          <div class="flex items-center gap-2 min-w-0 flex-1 pr-2">
            {#if typeof chrome !== 'undefined' && isImageValid}
              <img
                src={`chrome-extension://${chrome.runtime.id}/_favicon/?pageUrl=${encodeURIComponent(item.url)}&size=32`}
                alt=""
                class="w-3.5 h-3.5 rounded shrink-0 grayscale opacity-60 group-hover:grayscale-0 group-hover:opacity-100 transition-all"
                onerror={() => (isImageValid = false)}
              />
            {/if}
            <span class="truncate text-zinc-400 font-medium" title={item.title}
              >{item.title}</span
            >
          </div>

          <div class="flex items-center gap-2 shrink-0">
            <button
              onclick={() => onRestore(item)}
              class="cursor-pointer text-[10px] text-teal-700 hover:text-teal-500 font-medium transition"
              >Restaurer</button
            >
            <div class="relative group/tooltip inline-block">
              <button
                onclick={() => onDelete(item.id)}
                class="text-[10px] text-zinc-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
              >
                x
              </button>

              <!-- Notre Tooltip en CSS Pur -->
              <!-- Tooltip positionné à gauche avec un fort Z-Index -->
              <span
                class="absolute right-full top-1/2 -translate-y-1/2 mr-2
               px-2 py-1 text-[10px] text-red-200 bg-red-950/80 border border-red-800 rounded shadow-xl
               whitespace-nowrap pointer-events-none opacity-0 scale-95
               group-hover/tooltip:opacity-100 group-hover/tooltip:scale-100
               transition-all duration-100 origin-right z-50"
              >
                Supprimer
              </span>
            </div>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>
