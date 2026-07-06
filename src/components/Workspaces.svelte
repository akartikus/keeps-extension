<script>
  /**
   * @typedef {Object} WorkspacesProps
   * @property {any[]} workspaces
   * @property {number} activeTabsCount
   * @property {() => void} onSaveContext
   * @property {(workspace: any) => void} onRestore
   * @property {(id: number) => void} onDelete
   */

  /** @type {WorkspacesProps} */
  let { workspaces, activeTabsCount, onSaveContext, onRestore, onDelete } =
    $props();

  // Calculer les workspaces valides directement dans le template
  // en utilisant une approche qui fonctionne avec les props
</script>

<div class="border-t border-zinc-800/60 pt-4 mt-4 bg-background shrink-0">
  <div class="flex items-center justify-between mb-3">
    <span
      class="text-[11px] font-medium tracking-wider text-stone-400 flex items-center gap-1.5"
    >
      🗂️ WORKSPACES
      <span
        class="font-mono bg-stone-950 text-stone-500 px-1.5 py-0.2 rounded-full text-[10px] border border-stone-900/30"
      >
        {workspaces.filter((ws) => Array.isArray(ws.tabs) && ws.tabs.length > 0).length}
      </span>
    </span>

    <!-- Make sure to have at least an active tab-->
    {#if activeTabsCount > 0}
      <button
        onclick={onSaveContext}
        class="cursor-pointer text-[10px] font-medium text-emerald-500 hover:text-emerald-400 bg-emerald-950/20 border border-emerald-900/40 px-2 py-0.5 rounded transition"
      >
        ＋ Sauvegarder la session
      </button>
    {/if}
  </div>

  {#if workspaces.filter((ws) => Array.isArray(ws.tabs) && ws.tabs.length > 0).length === 0}
    <p class="text-xs text-zinc-600 italic py-1">
      Aucun espace de travail valide sauvegardé.
    </p>
  {:else}
    <div class="max-h-[150px] overflow-y-auto space-y-1.5 pr-1.5 scroll-smooth">
      {#each workspaces.filter((ws) => Array.isArray(ws.tabs) && ws.tabs.length > 0) as ws (ws.id)}
        <div
          class="flex items-center justify-between p-2 rounded-lg bg-stone-950/40 border border-stone-900/60 hover:border-stone-800/60 text-[11px] group transition-all duration-150"
        >
          <div class="flex flex-col min-w-0 flex-1 pr-2">
            <span
              class="truncate text-stone-400 font-medium group-hover:text-stone-200 transition-colors"
              title={ws.name}
            >
              {ws.name}
            </span>
            <span class="text-[9px] text-stone-500 font-mono mt-0.5">
              {ws.tabs.length} onglet(s) mis au chaud
            </span>
          </div>

          <div class="flex items-center gap-2.5 shrink-0">
            <button
              onclick={() => onRestore(ws)}
              class="cursor-pointer text-[10px] text-stone-400 hover:text-amber-200/80 font-medium transition-colors"
            >
              Ouvrir
            </button>

            <div class="relative group/tooltip inline-block">
              <button
                onclick={() => onDelete(ws.id)}
                class="text-[10px] text-stone-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
              >
                ✕
              </button>
              <span
                class="absolute right-full top-1/2 -translate-y-1/2 mr-2 px-2 py-1 text-[10px] text-red-200 bg-red-950/90 border border-red-900/40 rounded shadow-xl whitespace-nowrap pointer-events-none opacity-0 scale-95 group-hover/tooltip:opacity-100 group-hover/tooltip:scale-100 transition-all duration-100 origin-right z-50"
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