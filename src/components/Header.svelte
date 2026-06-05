<script>
  // On déclare les entrées et les sorties au même endroit (les Props)
  /** * @typedef {Object} Props
   * @property {string} appName
   * @property {string} extensionRam
   */

  /** @type {Props} */
  let { appName, extensionRam } = $props(); // $props() est la nouvelle Rune Svelte 5
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
  <span
    class="text-[9px] font-mono text-emerald-500/70 bg-emerald-950/20 border border-emerald-900/30 px-1 py-0.2 rounded"
    title="Utilisation mémoire de l'extension (JS Heap)"
  >
    ⚡ {extensionRam}
  </span>
</div>
