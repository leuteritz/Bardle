<script setup lang="ts">
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import { useVoidTideStore } from '@/stores/world/voidTideStore'
import { useUiStore } from '@/stores/core/uiStore'
import { VOID_RIFTS, getVoidRift } from '@/config/world/voidTide'
import { VOID_RIFT_SEVERITY_COLOR } from '@/config/constants'
import AdminCollapsiblePanel from './AdminCollapsiblePanel.vue'

withDefaults(defineProps<{ dashboard?: boolean }>(), { dashboard: false })

const voidTideStore = useVoidTideStore()
const uiStore = useUiStore()

/** Was gerade offen steht — der Store lässt nur einen Riss zu, ihn zu benennen
 *  erklärt also jedes „es ist nichts passiert". */
const openRift = computed(() => {
  const rift = voidTideStore.active[0]
  return rift ? (getVoidRift(rift.defId)?.name ?? rift.defId) : null
})

/**
 * Einen Riss aufreissen lassen. Das Profil schliesst dabei zuerst, aus
 * demselben Grund wie beim Drifter-Panel: die Frist läuft ab `openedAt` weiter,
 * und ein Riss, der hinter einem offenen Modal aufgeht, verbrennt einen Teil
 * davon ungesehen — beim kleinsten Typ wäre das schon die Hälfte.
 */
function open(defId?: string): void {
  uiStore.closeBardModal()
  voidTideStore.forceOpen(defId)
}

/** Den offenen Riss sofort kollabieren lassen — der kurze Weg zur Strafe, ohne
 *  eine Minute danebenzustehen. */
function collapse(): void {
  uiStore.closeBardModal()
  voidTideStore.forceCollapse()
}

/** Räumt das Feld UND jedes laufende Nachbeben. */
function clearField(): void {
  voidTideStore.clearAll()
}
</script>

<template>
  <AdminCollapsiblePanel title="Void Tide" icon="game-icons:vortex" :collapsible="!dashboard">
    <template #meta>
      {{ openRift ? `Open: ${openRift}` : 'No rift' }}
      <template v-if="!voidTideStore.isUnlocked"> · locked </template>
      <template v-if="voidTideStore.liveAftermaths.length">
        · {{ voidTideStore.liveAftermaths.length }} effect{{
          voidTideStore.liveAftermaths.length === 1 ? '' : 's'
        }}
      </template>
    </template>

    <div class="vt-grid">
      <button
        v-for="def in VOID_RIFTS"
        :key="def.id"
        class="vt-btn"
        :style="{ '--vt-color': def.color }"
        :title="def.drainLine"
        @click="open(def.id)"
      >
        <Icon :icon="def.icon" class="vt-icon" width="26" height="26" />
        <span class="vt-name">{{ def.name }}</span>
        <span class="vt-severity" :style="{ color: VOID_RIFT_SEVERITY_COLOR[def.severity] }">
          {{ def.severity }}
        </span>
      </button>
    </div>

    <div class="vt-footer">
      <button class="vt-action vt-action--random" @click="open()">
        <Icon icon="lucide:dices" width="16" height="16" />
        Random Rift
      </button>
      <button class="vt-action vt-action--collapse" :disabled="!openRift" @click="collapse">
        <Icon icon="lucide:zap" width="16" height="16" />
        Force Collapse
      </button>
      <button class="vt-action vt-action--clear" @click="clearField">
        <Icon icon="lucide:eraser" width="16" height="16" />
        Clear
      </button>
    </div>
  </AdminCollapsiblePanel>
</template>

<style scoped>
/* Fünf Typen, drei Spalten — dieselbe Rasterbreite wie das Drifter-Panel
   darüber, damit die beiden Weltereignis-Panels dasselbe Bild machen. */
.vt-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.vt-btn {
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

.vt-btn:hover {
  background: color-mix(in srgb, var(--vt-color) 12%, #111008);
  border-color: var(--vt-color);
  color: #e6dcc0;
}

.vt-icon {
  color: var(--vt-color);
}

.vt-name {
  font-size: 0.6rem;
  font-weight: 700;
  line-height: 1.15;
  text-align: center;
  color: inherit;
}

.vt-severity {
  font-size: 0.5rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  opacity: 0.85;
}

.vt-footer {
  display: flex;
  gap: 8px;
  margin-top: 10px;
}

.vt-action {
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

.vt-action:disabled {
  opacity: 0.5;
  filter: grayscale(55%);
  cursor: not-allowed;
}

.vt-action--random {
  color: var(--rpg-gold-dim);
}
.vt-action--random:hover:not(:disabled) {
  background: #1c1810;
  border-color: var(--rpg-gold-dim);
  color: var(--rpg-gold);
}

.vt-action--collapse {
  color: #b04fd8;
  border-color: #3d1a4a;
}
.vt-action--collapse:hover:not(:disabled) {
  background: #1a0c20;
  border-color: #b04fd8;
  color: #d68ff0;
}

.vt-action--clear {
  color: #cc6050;
  border-color: #4a1e18;
}
.vt-action--clear:hover:not(:disabled) {
  background: #1e0f0c;
  border-color: #cc6050;
  color: #e88070;
}
</style>
