<script setup lang="ts">
import ChampionSplashPanel from './ChampionSplashPanel.vue'
import RoleSidebarComponent from './RoleSidebarComponent.vue'
</script>

<template>
  <div class="roles-tab">
    <div class="main-layout">
      <!-- ══ LEFT — Splash Area ══ -->
      <ChampionSplashPanel />

      <!-- ══ RIGHT — Sidebar ══ -->
      <RoleSidebarComponent />
    </div>
  </div>
</template>

<style scoped>
.roles-tab {
  --gold: #c89040;
  --gold-bright: #e8c060;
  --gold-dim: rgba(200, 144, 64, 0.32);
  --gold-glow: rgba(200, 144, 64, 0.2);
  --bg: #0d0a03;
  --bg-card: #181208;
  --border: rgba(92, 51, 16, 0.45);
  --r: 5px;
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--bg);
  overflow: hidden;
}
.main-layout {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: 65fr 35fr;
  gap: 0;
}
</style>
