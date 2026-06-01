<script>
  // On déclare les entrées et les sorties au même endroit (les Props)
  /** * @typedef {Object} Props
   * @property {any} tab
   * @property {(id: number) => void} onFreeze - Notre ancienne sortie 'freeze'
   * @property {(tab: any) => void} onPutToIcebox - Notre ancienne sortie 'putToIcebox'
   */

  /** @type {Props} */
  let { tab, onFreeze, onPutToIcebox } = $props(); // $props() est la nouvelle Rune Svelte 5
</script>

<div
  class="flex items-center justify-between p-2.5 rounded-xl bg-surface/30 border border-zinc-800/60 text-xs"
>
  <div class="flex flex-col min-w-0 pr-2">
    <span
      class="truncate font-medium text-zinc-300 {tab.discarded
        ? 'opacity-40 italic'
        : ''}"
    >
      {tab.title}
    </span>
  </div>

  <div class="flex items-center gap-1.5 shrink-0">
    {#if !tab.discarded}
      <button
        onclick={() => onFreeze(tab.id)}
        class="text-[10px] bg-sky-950/40 text-sky-400 border border-sky-900/50 px-2 py-1 rounded-md"
      >
        ❄️ Geler
      </button>
    {/if}

    <button
      onclick={() => onPutToIcebox(tab)}
      class="text-[10px] bg-zinc-800 text-zinc-300 px-2 py-1 rounded-md"
    >
      📦 Mettre au frais
    </button>
  </div>
</div>
