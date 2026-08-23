<script setup lang="ts">
import { ref, computed } from 'vue'
import { storeToRefs } from 'pinia'
import { Icon } from '@iconify/vue'
import { useGalaxyStore } from '@/stores/world/galaxyStore'
import StatsColumnHeader from './StatsColumnHeader.vue'
import GalaxyArchiveCard from './GalaxyArchiveCard.vue'

/**
 * Right column of the Bard-Stats deck: every galaxy the player has freed,
 * newest first. Each card is the galaxy's own minimap with its verdict laid
 * over it — stars rescued and lost, time spent, the date it fell.
 */
const galaxyStore = useGalaxyStore()
const { completedGalaxies } = storeToRefs(galaxyStore)

const archiveSearch = ref('')

const archive = computed(() => [...completedGalaxies.value].sort((a, b) => b.galaxy - a.galaxy))

const filteredArchive = computed(() => {
  const q = archiveSearch.value.trim().toLowerCase()
  if (!q) return archive.value
  return archive.value.filter((rec) => `galaxy ${rec.galaxy}`.includes(q))
})
</script>

<template>
  <section class="sf-panel sf-col">
    <StatsColumnHeader
      v-model="archiveSearch"
      title="Archive"
      placeholder="Search galaxies…"
    />

    <div class="sf-p-body rpg-scrollbar">
      <div v-if="filteredArchive.length === 0" class="sf-empty-block">
        <Icon icon="lucide:archive" width="28" height="28" class="sf-empty-icon" />
        <span v-if="archive.length === 0"
          >No galaxies freed yet — rescue every star and defeat the core to preserve your first map
          here.</span
        >
        <span v-else>No galaxies match your search</span>
      </div>
      <div v-else class="sf-arch-list">
        <GalaxyArchiveCard v-for="rec in filteredArchive" :key="rec.galaxy" :record="rec" />
      </div>
    </div>
  </section>
</template>

<style scoped>
/* ─── Galaxy Archive column ──────────────────────────────────────
   Frameless like its two siblings: no per-panel border, the shared cosmic
   backdrop shows through and only the deck's hairline divider sets it apart. */
.sf-panel {
  position: relative;
  z-index: 1;
  background: transparent;
}

.sf-col {
  display: flex;
  flex-direction: column;
  min-height: 0;
  min-width: 0;
}

.sf-p-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 10px 12px;
}

.sf-arch-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.sf-empty-block {
  height: 100%;
  min-height: 90px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 0 16px;
  text-align: center;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
  line-height: 1.5;
  color: var(--rpg-text-dim);
}
.sf-empty-icon {
  color: #5c4a30;
  flex-shrink: 0;
}
</style>
