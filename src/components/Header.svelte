<script>
  let { appName, ramPercent, ramValue } = $props();
</script>

<div
  class="flex items-center justify-between bg-background p-1 shrink-0 select-none"
>
  <div class="flex items-center gap-2">
    <h1 class="text-sm font-bold text-zinc-100 tracking-tight">{appName}</h1>
    <span
      class="text-[8px] font-mono bg-zinc-900 text-zinc-500 px-1 py-0.2 rounded border border-zinc-800/40"
      >v1.0</span
    >
  </div>

  <div class="flex items-center gap-3">
    <div
      class="flex items-center gap-1.5 bg-zinc-900/40 hover:bg-zinc-900/80 border {ramPercent >
      20
        ? 'border-amber-500/20'
        : 'border-emerald-500/20'} rounded px-1.5 py-0.5 min-w-[62px] shadow-sm shadow-black/20 transition-all duration-300 group"
    >
      <div class="relative flex h-1.5 w-1.5 shrink-0">
        {#if ramPercent > 20}
          <span
            class="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-40"
          ></span>
          <span
            class="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500/90"
          ></span>
        {:else}
          <span
            class="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500/90"
          ></span>
        {/if}
      </div>

      <div class="flex flex-col justify-center leading-none gap-0.5">
        <span
          class="text-[9px] font-mono text-zinc-500 font-medium tracking-tight group-hover:text-zinc-400 transition-colors"
        >
          {ramValue}
        </span>
        <span
          class="text-[10px] font-mono font-bold tracking-tight {ramPercent > 20
            ? 'text-amber-400/90 drop-shadow-[0_0_6px_rgba(251,191,36,0.1)]'
            : 'text-emerald-400/90 drop-shadow-[0_0_6px_rgba(52,211,153,0.1)]'}"
        >
          {ramPercent}%
        </span>
      </div>
    </div>
  </div>
</div>
