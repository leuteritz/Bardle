<template>
  <div class="flex flex-col w-full h-full p-4 space-y-4">
    <!-- ─── Content ─── -->
    <div class="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
      <ChampionShopComponent />
    </div>
  </div>
</template>

<script lang="ts">
import ChampionShopComponent from './ChampionShopComponent.vue'

export default {
  name: 'ChampionLobbyComponent',
  components: { ChampionShopComponent },
}
</script>
