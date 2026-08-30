<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { Icon } from '@iconify/vue'
import { useGalaxyStore } from '@/stores/world/galaxyStore'
import { useLandfallStore } from '@/stores/world/landfallStore'
import { useUiStore } from '@/stores/core/uiStore'
import { LANDFALLS, getLandfall, LANDFALL_LANDMARK_KIND } from '@/config/world/landfalls'
import { LANDFALL_BOONS } from '@/config/world/landfallBoons'
import { drawLandmark } from '@/utils/fx/galaxyLandmarks'
import { landfallCleared } from '@/utils/game/landfalls'
import {
  ADMIN_LANDFALL_PREVIEW_PX,
  ADMIN_LANDFALL_PREVIEW_R,
  LANDFALL_ACCENT_HEX,
} from '@/config/constants'
import type { LandfallKindId } from '@/types'
import AdminCollapsiblePanel from './AdminCollapsiblePanel.vue'

withDefaults(defineProps<{ dashboard?: boolean }>(), { dashboard: false })

const galaxyStore = useGalaxyStore()
const landfallStore = useLandfallStore()
const uiStore = useUiStore()

/**
 * Ein Ort geht NUR unterwegs auf: `_tickLandfall` läuft ausschliesslich aus dem
 * Etappen-Tick. Ausserhalb hätte er kein Fenster, das abläuft, und einen Balken,
 * der stillsteht — deshalb sperrt das Panel die Kacheln, statt einen Zustand zu
 * erzeugen, den es im Spiel nicht gibt.
 */
const travelling = computed(() => galaxyStore.championTravelState === 'traveling')

/** Was gerade offen steht — der Grund für ein „nichts ist passiert". */
const openName = computed(() => {
  const a = galaxyStore.activeLandfall
  return a ? (getLandfall(a.kind)?.name ?? a.kind) : null
})

const boonName = computed(() => {
  if (!landfallStore.boon) return null
  return LANDFALL_BOONS.find((b) => b.id === landfallStore.boon)?.name ?? null
})

/**
 * Losschicken. Das Profil schliesst zuerst, wie bei Drifter und Void: das
 * Fenster des Ortes läuft hinter einem offenen Modal weiter, und seine HUD-Karte
 * ist unsichtbar, solange ein Tab offen ist.
 */
function spawn(kind?: LandfallKindId): void {
  uiStore.closeBardModal()
  galaxyStore.forceLandfall(kind)
}

/** Den offenen Ort jetzt abrechnen, statt auf sein Fenster zu warten. */
function resolveOpen(): void {
  const a = galaxyStore.activeLandfall
  if (a) galaxyStore.resolveLandfall(landfallCleared(a))
}

/* Chronik und Segen schliessen das Profil NICHT — sie sind Zustand, keine Uhr.
   Dieselbe Trennung wie bei `clearField()` im Drifter-Panel. */
function fillChronicle(): void {
  galaxyStore.adminFillLandfallChronicle()
}

function clearChronicle(): void {
  galaxyStore.adminClearLandfallChronicle()
}

// ── Vorschau: jede Kachel zeigt die ECHTE Marke ──────────────────────────────
// Dasselbe `drawLandmark`, das auch die Karte malt, mit erzwungener voller
// Detailstufe. Seit dem Fall der Kartenlegende ist das die EINZIGE Sonde, die
// so malt — `galaxyLandmarks.spec.ts` haelt ihre Kachel deshalb gegen
// `LANDMARK_PAD_SPAN`. Riff und Konvoi haben sich beim Bauen genau hier
// verwechselt; eine Kachel, die nur den Namen zeigt, deckt das nicht auf.
const probes = ref<(HTMLCanvasElement | null)[]>([])

/** Die Sonde trägt ihre CSS-Grösse fest; die Backing-Auflösung setzt `paint`. */
const probeStyle = {
  width: `${ADMIN_LANDFALL_PREVIEW_PX}px`,
  height: `${ADMIN_LANDFALL_PREVIEW_PX}px`,
}

function paint(): void {
  const size = ADMIN_LANDFALL_PREVIEW_PX
  const dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 2))
  LANDFALLS.forEach((def, i) => {
    const el = probes.value[i]
    if (!el) return
    el.width = Math.round(size * dpr)
    el.height = Math.round(size * dpr)
    const ctx = el.getContext('2d')
    if (!ctx) return
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, size, size)
    drawLandmark(
      ctx,
      LANDFALL_LANDMARK_KIND[def.id],
      size / 2,
      size / 2,
      ADMIN_LANDFALL_PREVIEW_R,
      { dpr, detail: 2 },
    )
  })
}

onMounted(paint)
// Der Reiter bleibt gemountet; ein Wechsel zurück malt neu, falls die Sonde
// zwischenzeitlich verworfen wurde.
watch(() => uiStore.bardActiveTab, (tab) => tab === 'admin' && paint())
</script>

<template>
  <AdminCollapsiblePanel
    title="Landfall Spawn"
    icon="game-icons:crossroad"
    :collapsible="!dashboard"
  >
    <template #meta>
      <template v-if="openName">Open: {{ openName }}</template>
      <template v-else-if="travelling">En route — pick a place</template>
      <template v-else>Not travelling — spawn locked</template>
      <template v-if="boonName"> · Boon: {{ boonName }}</template>
    </template>

    <!-- Eine Kachel je Katalogeintrag: ein siebter Ort erscheint hier von
         selbst. Die Sonde zeigt die Marke, die er auf der Karte hinterlässt. -->
    <div class="lf-grid">
      <button
        v-for="(def, i) in LANDFALLS"
        :key="def.id"
        class="lf-btn"
        :disabled="!travelling || !!openName"
        :title="def.blurb"
        @click="spawn(def.id)"
      >
        <canvas
          :ref="(el) => (probes[i] = el as HTMLCanvasElement | null)"
          class="lf-probe"
          :style="probeStyle"
        />
        <span class="lf-name">{{ def.name }}</span>
        <span class="lf-from">G{{ def.unlockGalaxy }}</span>
      </button>
    </div>

    <div class="lf-footer">
      <button
        class="lf-action lf-action--random"
        :disabled="!travelling || !!openName"
        @click="spawn()"
      >
        <Icon icon="lucide:dices" width="16" height="16" />
        Random
      </button>
      <button class="lf-action lf-action--resolve" :disabled="!openName" @click="resolveOpen">
        <Icon icon="lucide:check-check" width="16" height="16" />
        Resolve
      </button>
      <button class="lf-action lf-action--fill" @click="fillChronicle">
        <Icon icon="lucide:map-pin" width="16" height="16" />
        Fill Chart
      </button>
      <button class="lf-action lf-action--clear" @click="clearChronicle">
        <Icon icon="lucide:eraser" width="16" height="16" />
        Clear Chart
      </button>
    </div>

    <!-- Der Segen des Wayside Cairn, ohne einen Stein suchen zu müssen. -->
    <div class="lf-boons">
      <button
        v-for="b in LANDFALL_BOONS"
        :key="b.id"
        class="lf-boon"
        :class="{ 'lf-boon--on': landfallStore.boon === b.id }"
        :title="b.line"
        @click="landfallStore.adminSetBoon(b.id)"
      >
        <Icon :icon="b.icon" width="14" height="14" />
        {{ b.name }}
      </button>
      <button class="lf-boon lf-boon--off" @click="landfallStore.adminSetBoon(null)">
        <Icon icon="lucide:x" width="14" height="14" />
      </button>
    </div>
  </AdminCollapsiblePanel>
</template>

<style scoped>
/* Sechs Orte, drei Spalten — zwei gleiche Reihen, derselbe Rhythmus wie beim
   Drifter-Raster darüber. */
.lf-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.lf-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
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

.lf-btn:hover:not(:disabled) {
  background: color-mix(in srgb, #8fbfae 12%, #111008);
  border-color: #8fbfae;
  color: #e6dcc0;
}

.lf-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.lf-probe {
  flex-shrink: 0;
}

.lf-name {
  font-size: 0.68rem;
  font-weight: 600;
  line-height: 1.15;
  text-align: center;
}

.lf-from {
  font-size: 0.6rem;
  font-weight: 700;
  color: var(--rpg-text-muted);
}

.lf-footer {
  display: flex;
  gap: 8px;
  margin-top: 10px;
}

.lf-action {
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
  color: var(--rpg-text-dim);
  cursor: pointer;
  transition:
    background 0.15s,
    border-color 0.15s,
    color 0.15s;
}

.lf-action:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.lf-action--random:hover:not(:disabled) {
  border-color: #8fbfae;
  color: #8fbfae;
}

.lf-action--resolve:hover:not(:disabled) {
  border-color: var(--rpg-gold);
  color: var(--rpg-gold);
}

.lf-action--fill:hover:not(:disabled) {
  border-color: #7ec8e3;
  color: #7ec8e3;
}

.lf-action--clear:hover:not(:disabled) {
  border-color: #cc6050;
  color: #cc6050;
}

/* Vier Achsen plus Abräumen — eine Reihe, weil immer nur EINE gilt. */
.lf-boons {
  display: flex;
  gap: 6px;
  margin-top: 8px;
}

.lf-boon {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 5px 4px;
  font-size: 0.62rem;
  font-weight: 600;
  border: 1px solid var(--rpg-wood-mid);
  border-radius: var(--bp-radius);
  background: transparent;
  color: var(--rpg-text-dim);
  cursor: pointer;
  white-space: nowrap;
  overflow: hidden;
  transition:
    background 0.15s,
    border-color 0.15s,
    color 0.15s;
}

.lf-boon:hover {
  border-color: #8fbfae;
  color: #8fbfae;
}

.lf-boon--on {
  border-color: v-bind('LANDFALL_ACCENT_HEX');
  background: color-mix(in srgb, #8fbfae 14%, transparent);
  color: #e6dcc0;
}

.lf-boon--off {
  flex: 0 0 auto;
  padding: 5px 8px;
}

.lf-boon--off:hover {
  border-color: #cc6050;
  color: #cc6050;
}
</style>
