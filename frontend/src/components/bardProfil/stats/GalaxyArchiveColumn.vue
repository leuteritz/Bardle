<script setup lang="ts">
import { ref, computed } from 'vue'
import { storeToRefs } from 'pinia'
import { Icon } from '@iconify/vue'
import { formatCompactDuration } from '@/utils/format'
import { useGalaxyStore } from '@/stores/galaxyStore'
import type { CompletedGalaxyRecord } from '@/stores/galaxyStore'
import { renderGalaxySnapshot } from '@/utils/galaxySnapshot'
import StatsColumnHeader from './StatsColumnHeader.vue'

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

function archiveRescued(rec: CompletedGalaxyRecord): number {
  return rec.attemptResults.filter((r) => r === 'rescued').length
}

function archiveFailed(rec: CompletedGalaxyRecord): number {
  return rec.attemptResults.filter((r) => r === 'failed').length
}

function archiveDate(rec: CompletedGalaxyRecord): string {
  return new Date(rec.completedAt).toLocaleDateString()
}
</script>

<template>
  <section class="sf-panel sf-col">
    <StatsColumnHeader
      v-model="archiveSearch"
      title="Galaxy Archive"
      placeholder="Search galaxies…"
    />

    <div class="sf-p-body rpg-scrollbar">
      <div v-if="filteredArchive.length === 0" class="sf-empty-block">
        <Icon icon="game-icons:spiral-arrow" width="28" height="28" class="sf-empty-icon" />
        <span v-if="archive.length === 0"
          >No galaxies freed yet — rescue every star and defeat the core to preserve your first map
          here.</span
        >
        <span v-else>No galaxies match your search</span>
      </div>
      <div v-else class="sf-arch-list">
        <div
          v-for="rec in filteredArchive"
          :key="rec.galaxy"
          class="sf-arch-card"
          :title="`Galaxy ${rec.galaxy} — freed ${archiveDate(rec)}`"
        >
          <div class="sf-arch-imgwrap">
            <img
              :src="renderGalaxySnapshot(rec)"
              :alt="`Minimap of galaxy ${rec.galaxy}`"
              class="sf-arch-img"
              loading="lazy"
            />
            <!-- Galaxy number badge, top-left over the map -->
            <span class="sf-arch-badge">Galaxy {{ rec.galaxy }}</span>
            <!-- Stars rescued / lost, top-right over the map -->
            <span class="sf-arch-stars">
              <span class="sf-arch-star sf-arch-star--won" title="Stars rescued">
                <Icon class="sf-arch-star-ico" icon="game-icons:round-star" width="15" height="15" />
                <span class="sf-arch-star-n">{{ archiveRescued(rec) }}</span>
              </span>
              <span class="sf-arch-star sf-arch-star--lost" title="Stars lost">
                <Icon
                  class="sf-arch-star-ico"
                  icon="game-icons:cracked-glass"
                  width="15"
                  height="15"
                />
                <span class="sf-arch-star-n">{{ archiveFailed(rec) }}</span>
              </span>
            </span>
            <!-- Time spent + date freed, over the map's lower edge -->
            <div class="sf-arch-info">
              <span class="sf-arch-info-item sf-arch-info-time" title="Time spent in this galaxy">
                <Icon class="sf-arch-info-ico" icon="game-icons:duration" width="15" height="15" />
                {{ formatCompactDuration(rec.durationSeconds * 1000) }}
              </span>
              <span class="sf-arch-info-item sf-arch-info-date" title="Date this galaxy was freed">
                <Icon class="sf-arch-info-ico" icon="game-icons:calendar" width="15" height="15" />
                {{ archiveDate(rec) }}
              </span>
            </div>
          </div>
        </div>
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

.sf-arch-card {
  flex-shrink: 0;
  background: #111008;
  border: 1px solid #3e200a;
  border-radius: 5px;
  overflow: hidden;
  transition:
    box-shadow 0.15s,
    border-color 0.15s;
}
.sf-arch-card:hover {
  border-color: #7a4e20;
  box-shadow: 0 0 12px rgba(232, 192, 64, 0.22);
}

.sf-arch-imgwrap {
  position: relative;
  aspect-ratio: 16 / 10;
  background: #0b0806;
}

.sf-arch-img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* Galaxy number badge — top-left chip floating over the map */
.sf-arch-badge {
  position: absolute;
  top: 7px;
  left: 7px;
  padding: 4px 10px;
  font-size: 14px;
  font-weight: 900;
  letter-spacing: 0.05em;
  color: var(--rpg-gold);
  background: rgba(8, 6, 3, 0.8);
  border: 1px solid rgba(200, 144, 64, 0.45);
  border-radius: 4px;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.9);
  white-space: nowrap;
}

/* Stars rescued / lost — two tinted mini-badges, top-right over the map */
.sf-arch-stars {
  position: absolute;
  top: 7px;
  right: 7px;
  display: flex;
  align-items: center;
  gap: 5px;
}
.sf-arch-star {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 9px;
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 0.02em;
  font-variant-numeric: tabular-nums;
  border-radius: 4px;
  background: rgba(8, 6, 3, 0.82);
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.9);
  white-space: nowrap;
}
.sf-arch-star-ico {
  flex-shrink: 0;
  /* round-star / cracked-glass glyphs sit a hair low in their viewBox —
     lift them so icon and number share the same optical center */
  position: relative;
  top: -2px;
}
.sf-arch-star-n {
  line-height: 1;
}
.sf-arch-star--won {
  color: #e8c040;
  border: 1px solid rgba(232, 192, 64, 0.4);
}
.sf-arch-star--lost {
  color: #e08a7a;
  border: 1px solid rgba(204, 96, 80, 0.4);
}

/* Time + date, over the map's lower edge — readable on any galaxy color */
.sf-arch-info {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 16px 9px 6px;
  background: linear-gradient(to top, rgba(8, 6, 3, 0.94), rgba(8, 6, 3, 0));
}

.sf-arch-info-item {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 13px;
  line-height: 1;
  font-weight: 700;
  letter-spacing: 0.03em;
  font-variant-numeric: tabular-nums;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.95);
  white-space: nowrap;
}
.sf-arch-info-time {
  color: #ffd88a;
}
.sf-arch-info-date {
  color: #c8b890;
}
/* High-contrast white icon + dark outline halo so the small glyphs stay
   clearly readable in front of their value on any galaxy image */
.sf-arch-info-ico {
  flex-shrink: 0;
  color: #ffffff;
  filter: drop-shadow(0 0 1px rgba(0, 0, 0, 1)) drop-shadow(0 1px 2px rgba(0, 0, 0, 1));
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
