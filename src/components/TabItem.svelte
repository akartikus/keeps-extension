<script>
  /**
   * @typedef {Object} Props
   * @property {any} tab
   * @property {(id: number) => void} onFreeze
   * @property {(tab: any) => void} onPutToIcebox
   */

  /** @type {Props} */
  let { tab, onFreeze, onPutToIcebox } = $props();

  /* global chrome */
  // Génère l'URL sécurisée du favicon via l'API Chrome
  let faviconUrl = $derived(
    tab.url && typeof chrome !== 'undefined'
      ? `chrome-extension://${chrome.runtime.id}/_favicon/?pageUrl=${encodeURIComponent(tab.url)}&size=32`
      : '',
  );
  let isImageValid = $state(true);
</script>

<div
  class="flex items-center justify-between p-2.5 rounded-xl bg-surface/30 border border-zinc-800 hover:border-zinc-600/80 transition-colors duration-150 text-xs group"
>
  <div class="flex items-center min-w-0 pr-2 gap-2.5">
    {#if faviconUrl && isImageValid}
      <img
        src={faviconUrl}
        alt=""
        class="w-4 h-4 rounded shrink-0 bg-zinc-800 {tab.discarded
          ? 'grayscale'
          : ''}"
        onerror={() => (isImageValid = false)}
      />
    {/if}

    <div class="flex flex-col min-w-0">
      <span
        class="truncate font-medium text-zinc-300 {tab.discarded
          ? 'opacity-40 italic'
          : ''}"
      >
        {tab.title}
      </span>
      <span class="text-[10px] text-zinc-500 truncate font-mono mt-0.5">
        {tab.url ? new URL(tab.url).hostname : ''}
      </span>
    </div>
  </div>

  <div class="flex items-center gap-1.5 shrink-0">
    {#if !tab.discarded}
      <button
        onclick={() => onFreeze(tab.id)}
        class="cursor-pointer text-[10px] bg-sky-950/40 text-sky-400 hover:bg-sky-900/40 border border-sky-900/50 px-2 py-1 rounded-md"
        >Geler</button
      >
    {/if}
    <button
      onclick={() => onPutToIcebox(tab)}
      class="cursor-pointer text-[10px] bg-zinc-800 text-zinc-300 hover:bg-zinc-700 px-2 py-1 rounded-md"
      >Mettre au frais</button
    >
  </div>
</div>
