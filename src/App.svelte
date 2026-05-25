<script>
  let appName = 'Keeps';
</script>

<main
  class="p-6 h-screen flex flex-col justify-between bg-background text-zinc-100 select-none"
>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-lg font-semibold tracking-tight text-zinc-200">
        {appName}
      </h1>
      <span
        class="text-[10px] bg-zinc-800 px-2 py-0.5 rounded-full text-zinc-400 font-mono"
        >v0.1</span
      >
    </div>

    <!-- Mode Empty State Temporaire -->
    <div
      class="border border-dashed border-zinc-800 rounded-xl p-6 text-center space-y-3 mt-12 bg-surface/30"
    >
      <p class="text-sm font-medium text-zinc-300">Votre esprit est calme.</p>
      <p class="text-xs text-zinc-500 max-w-[200px] mx-auto leading-relaxed">
        Ouvrez quelques onglets pour un projet, ils apparaîtront ici.
      </p>
    </div>
  </div>

  <div class="border-t border-zinc-900 pt-4 bg-background">
    <div
      class="flex items-center justify-between text-[11px] font-medium tracking-wider text-zinc-500 mb-2"
    >
      <span>ICEBOX</span>
      <span class="font-mono">0</span>
    </div>
    <p class="text-xs text-zinc-600 italic">Rien au frais pour le moment...</p>
  </div>
</main>
