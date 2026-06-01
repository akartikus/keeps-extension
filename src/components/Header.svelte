<script>
  // On déclare les entrées et les sorties au même endroit (les Props)
  /** * @typedef {Object} Props
   * @property {string} appName
   * @property {() => void} onRefresh
   */

  /** @type {Props} */
  let { appName, onRefresh } = $props(); // $props() est la nouvelle Rune Svelte 5
</script>

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
    onclick={() => onRefresh()}
    class="text-[11px] text-zinc-400 hover:text-zinc-200 transition flex items-center gap-1"
  >
    🔄 Actualiser
  </button>
</div>
