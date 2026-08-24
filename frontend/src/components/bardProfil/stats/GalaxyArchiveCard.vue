<script setup lang="ts">
/**
 * Eine befreite Galaxie im Archiv — ihre eigene Minimap mit dem Urteil darüber.
 *
 * Das Bild wird erst gezeichnet, wenn die Karte ins Sichtfeld kommt:
 * `renderGalaxySnapshot` rastert 640×400 px synchron, und ein per Admin
 * nachgetragenes Archiv bringt Dutzende davon in EINEN Frame. Gleiches Gatter
 * wie `expedition/ExpeditionDestinationCard.vue`; der modulweite Cache im
 * Renderer macht es danach einmal je Sitzung.
 */
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import { formatCompactDuration } from '@/utils/ui/format'
import { useLazyGalaxySnapshot } from '@/composables/ui/useLazyGalaxySnapshot'
import type { CompletedGalaxyRecord } from '@/stores/world/galaxyStore'

const props = defineProps<{ record: CompletedGalaxyRecord }>()

const { root, snapshot } = useLazyGalaxySnapshot(() => props.record, 'full')

const rescued = computed(() => props.record.attemptResults.filter((r) => r === 'rescued').length)
const failed = computed(() => props.record.attemptResults.filter((r) => r === 'failed').length)
const date = computed(() => new Date(props.record.completedAt).toLocaleDateString())
</script>

<template>
  <div
    ref="root"
    class="sf-arch-card"
    :title="`Galaxy ${record.galaxy} — freed ${date}`"
  >
    <div class="sf-arch-imgwrap">
      <img
        v-if="snapshot"
        :src="snapshot"
        :alt="`Minimap of galaxy ${record.galaxy}`"
        class="sf-arch-img"
      />
      <!-- Galaxy number badge, top-left over the map -->
      <span class="sf-arch-badge">Galaxy {{ record.galaxy }}</span>
      <!-- Stars rescued / lost, top-right over the map -->
      <span class="sf-arch-stars">
        <span class="sf-arch-star sf-arch-star--won" title="Stars rescued">
          <Icon class="sf-arch-star-ico" icon="ph:star-fill" width="15" height="15" />
          <span class="sf-arch-star-n">{{ rescued }}</span>
        </span>
        <span class="sf-arch-star sf-arch-star--lost" title="Stars lost">
          <Icon class="sf-arch-star-ico" icon="game-icons:cracked-glass" width="15" height="15" />
          <span class="sf-arch-star-n">{{ failed }}</span>
        </span>
      </span>
      <!-- Time spent + date freed, over the map's lower edge -->
      <div class="sf-arch-info">
        <span class="sf-arch-info-item sf-arch-info-time" title="Time spent in this galaxy">
          <Icon class="sf-arch-info-ico" icon="lucide:timer" width="15" height="15" />
          {{ formatCompactDuration(record.durationSeconds * 1000) }}
        </span>
        <span class="sf-arch-info-item sf-arch-info-date" title="Date this galaxy was freed">
          <Icon class="sf-arch-info-ico" icon="lucide:calendar-days" width="15" height="15" />
          {{ date }}
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
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
</style>
