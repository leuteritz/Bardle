<template>
  <div class="flex flex-col w-full h-full">
    <!-- ─── Champion Shop Button ─── -->
    <div class="flex justify-end px-4 pt-4 pb-2">
      <button
        @click="showShop = true"
        class="flex items-center gap-2 px-4 py-2 text-sm font-black text-white transition-all duration-300 border rounded-xl bg-gradient-to-r from-cyan-600 to-blue-700 border-cyan-500/40 hover:from-cyan-500 hover:to-blue-600 hover:shadow-lg hover:shadow-cyan-900/50 active:scale-95"
      >
        🛒 Champion Shop
      </button>
    </div>

    <!-- ─── Primary Content: Team ─── -->
    <div class="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
      <ChampionTeamComponent />
    </div>

    <!-- ─── Shop Modal ─── -->
    <Teleport to="body">
      <div
        v-if="showShop"
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
        @click.self="showShop = false"
      >
        <!-- Backdrop -->
        <div
          class="absolute inset-0 bg-black/60 backdrop-blur-sm"
          @click="showShop = false"
        />

        <!-- Modal Container -->
        <div
          class="relative z-10 w-full max-w-2xl max-h-[85vh] flex flex-col rounded-2xl border border-white/10 bg-black/80 backdrop-blur-xl shadow-[0_24px_64px_rgba(0,0,0,0.8)]"
        >
          <!-- Modal Header -->
          <div class="flex items-center justify-between px-5 py-3 border-b border-white/10 flex-shrink-0">
            <span class="text-sm font-black tracking-widest uppercase text-white/70">Champion Shop</span>
            <button
              @click="showShop = false"
              class="flex items-center justify-center w-7 h-7 text-sm font-black text-white/50 transition-all duration-200 border rounded-lg border-white/10 bg-white/5 hover:bg-white/15 hover:text-white active:scale-95"
            >
              ✕
            </button>
          </div>

          <!-- Modal Body -->
          <div class="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
            <ChampionShopComponent />
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script lang="ts">
import { ref } from 'vue'
import ChampionTeamComponent from './ChampionTeamComponent.vue'
import ChampionShopComponent from './ChampionShopComponent.vue'

export default {
  name: 'ChampionLobbyComponent',
  components: { ChampionTeamComponent, ChampionShopComponent },
  setup() {
    const showShop = ref(false)
    return { showShop }
  },
}
</script>
