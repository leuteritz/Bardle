<script setup lang="ts">
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import { useVoidStore } from '@/stores/world/voidStore'
import { useUiStore } from '@/stores/core/uiStore'
import { VOID_RIFTS, getVoidRift } from '@/config/world/void'
import { VOID_SEVERITY_COLOR, ADMIN_VOID_SWARM_SIZE } from '@/config/constants'
import AdminCollapsiblePanel from './AdminCollapsiblePanel.vue'

withDefaults(defineProps<{ dashboard?: boolean }>(), { dashboard: false })

const voidStore = useVoidStore()
const uiStore = useUiStore()

/** Was gerade unterwegs ist — das vorderste beim Namen zu nennen erklärt jedes
 *  „es ist nichts passiert", und die Zahl dahinter die Lage. */
const inbound = computed(() => {
  const lead = voidStore.leadMonster
  if (!lead) return null
  const name = getVoidRift(lead.defId)?.name ?? lead.defId
  const rest = voidStore.active.length - 1
  return rest > 0 ? `${name} +${rest}` : name
})

/**
 * Ein Wesen schicken. Das Profil schliesst dabei zuerst, aus demselben Grund
 * wie beim Drifter-Panel: die Reise läuft ab `spawnedAt` weiter, und ein Wesen,
 * das hinter einem offenen Modal losgeht, legt einen Teil des Weges ungesehen
 * zurück — beim kleinsten Typ wäre das schon die Hälfte.
 */
function spawn(defId?: string): void {
  uiStore.closeBardModal()
  voidStore.forceSpawn(defId)
}

/** Das vorderste Wesen sofort einschlagen lassen — der kurze Weg zur Strafe,
 *  ohne eine Minute danebenzustehen. */
function impact(): void {
  uiStore.closeBardModal()
  voidStore.forceImpact()
}

/** Stresstest: ein Schwarm auf einmal. Der Renderer trägt ihn (ein Canvas für
 *  alle), und genau das lässt sich hier in einem Klick nachprüfen. */
function swarm(): void {
  uiStore.closeBardModal()
  for (let i = 0; i < ADMIN_VOID_SWARM_SIZE; i++) voidStore.spawnMonster()
}

/** Räumt das Feld UND jedes laufende Nachbeben. */
function clearField(): void {
  voidStore.clearAll()
}
</script>

<template>
  <AdminCollapsiblePanel title="The Void" icon="game-icons:vortex" :collapsible="!dashboard">
    <template #meta>
      {{ inbound ? `Inbound: ${inbound}` : 'Nothing inbound' }}
      <template v-if="!voidStore.isUnlocked"> · locked </template>
      <template v-if="voidStore.liveAftermaths.length">
        · {{ voidStore.liveAftermaths.length }} effect{{
          voidStore.liveAftermaths.length === 1 ? '' : 's'
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
        @click="spawn(def.id)"
      >
        <Icon :icon="def.icon" class="vt-icon" width="26" height="26" />
        <span class="vt-name">{{ def.name }}</span>
        <span class="vt-severity" :style="{ color: VOID_SEVERITY_COLOR[def.severity] }">
          {{ def.severity }}
        </span>
      </button>
    </div>

    <div class="vt-footer">
      <button class="vt-action vt-action--random" @click="spawn()">
        <Icon icon="lucide:dices" width="16" height="16" />
        Random
      </button>
      <button class="vt-action vt-action--swarm" @click="swarm">
        <Icon icon="lucide:layers" width="16" height="16" />
        Swarm ×{{ ADMIN_VOID_SWARM_SIZE }}
      </button>
      <button class="vt-action vt-action--collapse" :disabled="!inbound" @click="impact">
        <Icon icon="lucide:zap" width="16" height="16" />
        Impact
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

.vt-action--swarm {
  color: #8a6fd0;
  border-color: #2f2148;
}
.vt-action--swarm:hover:not(:disabled) {
  background: #16102a;
  border-color: #8a6fd0;
  color: #b9a4f0;
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
