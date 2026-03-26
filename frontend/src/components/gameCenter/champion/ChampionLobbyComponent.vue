<template>
  <div class="flex flex-col w-full h-full">
    <!-- ─── Champion Shop Button ─── -->
    <div class="flex justify-end px-4 pt-4 pb-2">
      <button
        @click="showShop = true"
        class="flex items-center gap-2 px-4 py-2 text-sm font-black text-white transition-all duration-300 rpg-btn-green active:scale-95"
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
          class="absolute inset-0 rpg-overlay"
          @click="showShop = false"
        />

        <!-- Modal Container -->
        <div
          class="relative z-10 w-full max-w-2xl max-h-[85vh] flex flex-col rpg-frame"
        >
          <!-- Modal Header -->
          <div class="flex items-center justify-between px-5 py-3 rpg-header flex-shrink-0">
            <span class="text-sm font-black tracking-widest uppercase" style="color: var(--rpg-gold);">Champion Shop</span>
            <button
              @click="showShop = false"
              class="rpg-close-btn flex items-center justify-center w-7 h-7 text-sm font-black active:scale-95"
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
