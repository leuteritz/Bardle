<script setup lang="ts">
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import { useDrifterStore } from '@/stores/drifterStore'
import { useUiStore } from '@/stores/uiStore'
import { DRIFTERS, getDrifter } from '@/config/drifters'
import { DRIFTER_RARITY_COLOR, ADMIN_DRIFTER_PREVIEW_PX } from '@/config/constants'
import DrifterBody from '@/components/idle/drifter/DrifterBody.vue'
import AdminCollapsiblePanel from './AdminCollapsiblePanel.vue'

withDefaults(defineProps<{ dashboard?: boolean }>(), { dashboard: false })

const drifterStore = useDrifterStore()
const uiStore = useUiStore()

/** What is in the sky right now — the panel spawns one at a time (the store
 *  caps concurrency), so naming it is enough to explain a "nothing happened". */
const inFlight = computed(() => {
  const active = drifterStore.active[0]
  return active ? (getDrifter(active.defId)?.name ?? active.defId) : null
})

/**
 * Send one off. The profile closes first on purpose: a drifter's flight clock
 * starts at `spawnedAt` and keeps running behind an open modal, so a spawn made
 * from here would burn part — or all — of its passage unseen.
 */
function spawn(defId?: string): void {
  uiStore.closeBardModal()
  drifterStore.forceSpawn(defId)
}

/** Clears the sky AND every running buff — the way back to a clean baseline. */
function clearField(): void {
  drifterStore.clearAll()
}
</script>

<template>
  <AdminCollapsiblePanel
    title="Drifter Spawn"
    icon="game-icons:falling-star"
    :collapsible="!dashboard"
  >
    <template #meta>
      {{ inFlight ? `In flight: ${inFlight}` : 'Sky clear' }}
      <template v-if="drifterStore.liveBuffs.length">
        · {{ drifterStore.liveBuffs.length }} buff{{
          drifterStore.liveBuffs.length === 1 ? '' : 's'
        }}
      </template>
    </template>

    <!-- One tile per type, each showing the CSS body it actually spawns —
         picking by silhouette beats picking by name when the point of the
         test is the silhouette. -->
    <div class="dr-grid">
      <button
        v-for="def in DRIFTERS"
        :key="def.id"
        class="dr-btn"
        :style="{ '--dr-color': def.color }"
        :title="def.effectLine"
        @click="spawn(def.id)"
      >
        <span class="dr-preview" :style="{ '--drifter-size': `${ADMIN_DRIFTER_PREVIEW_PX}px` }">
          <DrifterBody :kind="def.body" :color="def.color" />
        </span>
        <span class="dr-name">{{ def.name }}</span>
        <span class="dr-rarity" :style="{ color: DRIFTER_RARITY_COLOR[def.rarity] }">
          {{ def.rarity }}
        </span>
      </button>
    </div>

    <div class="dr-footer">
      <button class="dr-action dr-action--random" @click="spawn()">
        <Icon icon="lucide:dices" width="16" height="16" />
        Random Type
      </button>
      <button class="dr-action dr-action--clear" @click="clearField">
        <Icon icon="lucide:eraser" width="16" height="16" />
        Clear Sky &amp; Buffs
      </button>
    </div>
  </AdminCollapsiblePanel>
</template>

<style scoped>
/* Eight types, four columns — two even rows, same rhythm as the star-phase
   grid one panel above. */
.dr-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
}

.dr-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  padding: 8px 4px 7px;
  border: 2px solid #3e200a;
  border-radius: var(--bp-radius);
  background: #111008;
  color: rgba(255, 255, 255, 0.55);
  cursor: pointer;
  transition:
    background 0.15s,
    border-color 0.15s,
    color 0.15s;
}

.dr-btn:hover {
  background: color-mix(in srgb, var(--dr-color) 12%, #111008);
  border-color: var(--dr-color);
  color: #e6dcc0;
}

/* The body draws itself into an absolutely positioned box, so the tile has to
   reserve the space — width and height come off the same variable that scales
   the silhouette. */
.dr-preview {
  position: relative;
  flex-shrink: 0;
  width: var(--drifter-size);
  height: var(--drifter-size);
}

.dr-name {
  font-size: 0.6rem;
  font-weight: 700;
  line-height: 1.15;
  text-align: center;
  color: inherit;
}

.dr-rarity {
  font-size: 0.5rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  opacity: 0.85;
}

.dr-footer {
  display: flex;
  gap: 8px;
  margin-top: 10px;
}

.dr-action {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 7px 8px;
  font-size: 0.7rem;
  font-weight: 600;
  border: 1px solid var(--rpg-wood-mid);
  border-radius: var(--bp-radius);
  background: transparent;
  cursor: pointer;
  transition:
    background 0.15s,
    border-color 0.15s,
    color 0.15s;
}

.dr-action--random {
  color: var(--rpg-gold-dim);
}
.dr-action--random:hover {
  background: #1c1810;
  border-color: var(--rpg-gold-dim);
  color: var(--rpg-gold);
}

.dr-action--clear {
  color: #cc6050;
  border-color: #4a1e18;
}
.dr-action--clear:hover {
  background: #1e0f0c;
  border-color: #cc6050;
  color: #e88070;
}
</style>
