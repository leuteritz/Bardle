<script setup lang="ts">
/**
 * Das Suchfeld über dem Sternennetz — die einzige freie Ecke des Viewports.
 *
 * Unten rechts sitzt die Zoom-Leiste, unten links die Kürzel-Zeile; oben rechts
 * war nichts. Die Sperrfläche dazu steht als `FORGE_VIEWPORT_KEEPOUTS.topRight`
 * und ist aus dem Mass der Leiste abgeleitet — was dahinter läge, wäre für den
 * Spieler nicht vorhanden.
 *
 * Die Vorschlagsfläche klappt nur bei Fokus auf: dreiundzwanzig Chips dauerhaft
 * nebeneinander deckten das halbe Netz zu.
 */
import { computed, ref } from 'vue'
import { Icon } from '@iconify/vue'
import RpgSearchBar from '@/components/ui/RpgSearchBar.vue'
import {
  FORGE_FAMILY_LABEL,
  FORGE_GLIMMER_FAMILY_ICON,
  FORGE_SEARCH_BAR,
  FORGE_SEARCH_CHIP_ICON,
  FORGE_SEARCH_PANEL_MAX_H,
  FORGE_SEARCH_PANEL_W,
  FORGE_SEARCH_STATE_CHIPS,
  FORGE_SEARCH_KIND_CHIPS,
  FORGE_VIEWPORT_INSET_PX,
  SOLAR_BRANCHES,
} from '@/config/constants'
import { useForgeSearch } from '@/composables/ui/useForgeSearch'
import type { ForgeAxisId, ForgeEffectFamily } from '@/types'

const {
  query,
  activeAxis,
  activeFamily,
  activeStates,
  activeKinds,
  recent,
  searchActive,
  facetActive,
  matchCount,
  totalCount,
  chipCounts,
  toggleAxis,
  toggleFamily,
  toggleState,
  toggleKind,
  commitRecent,
  clearSearch,
} = useForgeSearch()

const barRef = ref<InstanceType<typeof RpgSearchBar> | null>(null)
const focused = ref(false)

const panelOpen = computed(() => focused.value)

const axisChips = computed(() =>
  SOLAR_BRANCHES.map((b) => ({
    id: b.id as ForgeAxisId,
    label: b.name,
    icon: b.icon,
    color: b.color,
    count: chipCounts.value.axis[b.id] ?? 0,
    active: activeAxis.value === b.id,
  })),
)

const familyChips = computed(() =>
  (Object.keys(FORGE_FAMILY_LABEL) as ForgeEffectFamily[]).map((id) => ({
    id,
    label: FORGE_FAMILY_LABEL[id],
    icon: FORGE_GLIMMER_FAMILY_ICON[id],
    count: chipCounts.value.family[id] ?? 0,
    active: activeFamily.value === id,
  })),
)

const stateChips = computed(() =>
  FORGE_SEARCH_STATE_CHIPS.map((chip) => ({
    ...chip,
    count: chipCounts.value.state[chip.id] ?? 0,
    active: activeStates.value.has(chip.id),
  })),
)

/* Die vierte Facette: was der Kauf VERSCHIEBT, nicht was er gerade ist.

   Heute genau ein Chip, und der steht bewusst nicht in der Zustandsgruppe
   darüber — unter „State" wäre „Unlocks" falsch beschriftet. Ein Zustand
   ändert sich, eine Art nie. */
const kindChips = computed(() =>
  FORGE_SEARCH_KIND_CHIPS.map((chip) => ({
    ...chip,
    count: chipCounts.value.kind[chip.id] ?? 0,
    active: activeKinds.value.has(chip.id),
  })),
)

/** Was gerade filtert, als eine Zeile — sonst schnitte etwas, das man bei
 *  geschlossener Fläche nirgends sieht. */
const activeChipLabels = computed(() => {
  const out: string[] = []
  if (activeAxis.value) {
    out.push(SOLAR_BRANCHES.find((b) => b.id === activeAxis.value)?.name ?? activeAxis.value)
  }
  if (activeFamily.value) out.push(FORGE_FAMILY_LABEL[activeFamily.value])
  for (const chip of FORGE_SEARCH_STATE_CHIPS) {
    if (activeStates.value.has(chip.id)) out.push(chip.label)
  }
  for (const chip of FORGE_SEARCH_KIND_CHIPS) {
    if (activeKinds.value.has(chip.id)) out.push(chip.label)
  }
  return out
})

function onFocus(): void {
  focused.value = true
}

function onBlur(): void {
  focused.value = false
  commitRecent()
}

function useRecent(entry: string): void {
  query.value = entry
  barRef.value?.focus()
}

function onClearAll(): void {
  clearSearch()
  barRef.value?.focus()
}

const barW = `${FORGE_SEARCH_BAR.w}px`
const dockInset = `${FORGE_VIEWPORT_INSET_PX}px`
const panelMaxH = `${FORGE_SEARCH_PANEL_MAX_H}px`
const panelW = `${FORGE_SEARCH_PANEL_W}px`
</script>

<template>
  <!-- `.stop` an jeder Zeigergeste: der Viewport darunter zieht die Bühne und
       löst bei jedem Klick auf den freien Grund den Fokus. -->
  <div
    class="fs-dock"
    @click.stop
    @pointerdown.stop
    @pointermove.stop
    @wheel.stop
  >
    <RpgSearchBar
      ref="barRef"
      v-model="query"
      placeholder="Search effects…"
      aria-label="Search star forge nodes"
      :aria-expanded="panelOpen"
      @focus="onFocus"
      @blur="onBlur"
      @escape="barRef?.blur()"
    >
      <template #trailing>
        <span class="fs-count" :class="{ 'fs-count--empty': searchActive && matchCount === 0 }">
          {{ searchActive ? matchCount : totalCount }}
        </span>
      </template>
    </RpgSearchBar>

    <div v-if="facetActive && !panelOpen" class="fs-active-row">
      <span v-for="label in activeChipLabels" :key="label" class="fs-active-tag">{{ label }}</span>
      <button class="fs-active-clear" type="button" @click="onClearAll">Clear</button>
    </div>

    <!-- `mousedown.prevent` an JEDEM Knopf hier drin: ohne ihn nimmt der Klick
         dem Feld den Fokus, die Fläche schliesst sich noch vor dem `click`. -->
    <div v-if="panelOpen" class="fs-panel">
      <div v-if="recent.length > 0" class="fs-group">
        <span class="fs-group-title">Recent</span>
        <div class="fs-recent">
          <button
            v-for="entry in recent"
            :key="entry"
            class="fs-recent-item"
            type="button"
            @mousedown.prevent
            @click="useRecent(entry)"
          >
            <Icon icon="lucide:history" width="14" height="14" aria-hidden="true" />
            {{ entry }}
          </button>
        </div>
      </div>

      <div class="fs-group">
        <span class="fs-group-title">Effect</span>
        <div class="fs-chips">
          <button
            v-for="chip in axisChips"
            :key="chip.id"
            class="fs-chip"
            :class="{ 'fs-chip--on': chip.active, 'fs-chip--void': chip.count === 0 }"
            :style="{ '--chip-accent': chip.color }"
            type="button"
            @mousedown.prevent
            @click="toggleAxis(chip.id)"
          >
            <Icon
              :icon="chip.icon"
              :width="FORGE_SEARCH_CHIP_ICON.axis"
              :height="FORGE_SEARCH_CHIP_ICON.axis"
              aria-hidden="true"
            />
            <span class="fs-chip-label">{{ chip.label }}</span>
            <span class="fs-chip-count">{{ chip.count }}</span>
          </button>
        </div>
      </div>

      <div class="fs-group">
        <span class="fs-group-title">Family</span>
        <div class="fs-chips">
          <button
            v-for="chip in familyChips"
            :key="chip.id"
            class="fs-chip fs-chip--sm"
            :class="{ 'fs-chip--on': chip.active, 'fs-chip--void': chip.count === 0 }"
            type="button"
            @mousedown.prevent
            @click="toggleFamily(chip.id)"
          >
            <Icon
              :icon="chip.icon"
              :width="FORGE_SEARCH_CHIP_ICON.family"
              :height="FORGE_SEARCH_CHIP_ICON.family"
              aria-hidden="true"
            />
            <span class="fs-chip-label">{{ chip.label }}</span>
            <span class="fs-chip-count">{{ chip.count }}</span>
          </button>
        </div>
      </div>

      <div class="fs-group">
        <span class="fs-group-title">State</span>
        <div class="fs-chips">
          <button
            v-for="chip in stateChips"
            :key="chip.id"
            class="fs-chip fs-chip--sm"
            :class="{ 'fs-chip--on': chip.active, 'fs-chip--void': chip.count === 0 }"
            type="button"
            @mousedown.prevent
            @click="toggleState(chip.id)"
          >
            <Icon
              :icon="chip.icon"
              :width="FORGE_SEARCH_CHIP_ICON.state"
              :height="FORGE_SEARCH_CHIP_ICON.state"
              aria-hidden="true"
            />
            <span class="fs-chip-label">{{ chip.label }}</span>
            <span class="fs-chip-count">{{ chip.count }}</span>
          </button>
        </div>
      </div>

      <!-- Die vierte Gruppe. Ein Klick, und die zweiundzwanzig Knoten, die eine
           Regel kaufen, stehen türkis im Netz — alles andere tritt zurück. Es
           ist der einzige Weg, sie AUFZUZÄHLEN: die Upgrade-Liste rechts zeigt
           Gesperrtes nicht, und im Netz stehen sie über fünfundzwanzig Cluster
           verstreut. -->
      <div class="fs-group">
        <span class="fs-group-title">Kind</span>
        <div class="fs-chips">
          <button
            v-for="chip in kindChips"
            :key="chip.id"
            class="fs-chip fs-chip--sm"
            :class="{ 'fs-chip--on': chip.active, 'fs-chip--void': chip.count === 0 }"
            type="button"
            @mousedown.prevent
            @click="toggleKind(chip.id)"
          >
            <Icon
              :icon="chip.icon"
              :width="FORGE_SEARCH_CHIP_ICON.kind"
              :height="FORGE_SEARCH_CHIP_ICON.kind"
              aria-hidden="true"
            />
            <span class="fs-chip-label">{{ chip.label }}</span>
            <span class="fs-chip-count">{{ chip.count }}</span>
          </button>
        </div>
      </div>

      <button
        v-if="searchActive"
        class="fs-clear-all"
        type="button"
        @mousedown.prevent
        @click="onClearAll"
      >
        <Icon icon="lucide:rotate-ccw" width="14" height="14" aria-hidden="true" />
        Clear search
      </button>
    </div>
  </div>
</template>

<style scoped>
.fs-dock {
  position: absolute;
  top: v-bind(dockInset);
  right: v-bind(dockInset);
  z-index: 20;
  width: v-bind(barW);
  display: flex;
  flex-direction: column;
  gap: 6px;
}

/* Die Leiste bringt Rahmen und Fokusschein selbst mit; hier steht nur der
   undurchsichtige Grund — sie liegt über dem Netz. */
.fs-dock :deep(.sb) {
  background: #16110a;
}

.fs-count {
  min-width: 22px;
  padding: 0 5px;
  font-size: 12.5px;
  font-weight: 900;
  color: #e8c040;
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.fs-count--empty {
  color: #cc6050;
}

/* ══════════════════════════════════════════════════
   AKTIVE FACETTEN bei geschlossener Fläche
══════════════════════════════════════════════════ */
.fs-active-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 5px;
}

.fs-active-tag {
  padding: 3px 8px;
  font-size: 11.5px;
  font-weight: 800;
  color: #e8c040;
  background: #1e1006;
  border: 1px solid #7a4e20;
  border-radius: 4px;
}

.fs-active-clear {
  padding: 3px 8px;
  font-size: 11.5px;
  font-weight: 800;
  color: #cc6050;
  background: #16110a;
  border: 1px solid #4a3010;
  border-radius: 4px;
  cursor: pointer;
}

.fs-active-clear:hover {
  color: #e07060;
  border-color: #7a4e20;
}

/* ══════════════════════════════════════════════════
   VORSCHLAGSFLÄCHE
══════════════════════════════════════════════════ */
/* Hängt nach LINKS über die Leiste hinaus — fünfzehn Familien-Chips auf 248 px
   brächen in eine Kolonne um. Absolut, damit die Überbreite die Leiste darüber
   nicht mitzieht. */
.fs-panel {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 6px;
  width: v-bind(panelW);
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: v-bind(panelMaxH);
  padding: 11px 12px 12px;
  overflow-y: auto;
  background: #111008;
  border: 1px solid #5c3310;
  border-radius: 4px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.85);
  scrollbar-width: thin;
  scrollbar-color: #5c3310 #111;
}

.fs-panel::-webkit-scrollbar {
  width: 4px;
}

.fs-panel::-webkit-scrollbar-track {
  background: #111;
}

.fs-panel::-webkit-scrollbar-thumb {
  background: #5c3310;
  border-radius: 2px;
}

.fs-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.fs-group-title {
  font-size: 10.5px;
  font-weight: 900;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #8a6030;
}

.fs-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.fs-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 7px;
  font-size: 12px;
  font-weight: 800;
  color: #c8b088;
  background: #1c1c18;
  border: 1px solid #3e2a12;
  border-radius: 4px;
  cursor: pointer;
  transition:
    color 0.15s,
    background 0.15s,
    border-color 0.15s;
}

.fs-chip--sm {
  font-size: 11.5px;
  padding: 3px 6px;
}

.fs-chip :deep(svg) {
  color: var(--chip-accent, #8a6030);
  flex-shrink: 0;
}

.fs-chip:hover {
  color: #e8d8b0;
  border-color: #7a4e20;
}

.fs-chip--on {
  color: #111008;
  background: var(--chip-accent, #e8c040);
  border-color: var(--chip-accent, #e8c040);
}

.fs-chip--on :deep(svg) {
  color: #111008;
}

/* Ohne Treffer bleibt der Chip stehen und wird stumpf — verschwände er, spränge
   die ganze Reihe bei jedem Tastendruck um. */
.fs-chip--void {
  opacity: 0.42;
}

.fs-chip-count {
  font-size: 10.5px;
  font-weight: 900;
  color: #8a6030;
  font-variant-numeric: tabular-nums;
}

.fs-chip--on .fs-chip-count {
  color: rgba(17, 16, 8, 0.7);
}

/* ── Recent ── */
.fs-recent {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.fs-recent-item {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 4px 7px;
  font-size: 12.5px;
  font-weight: 700;
  color: #c8b088;
  background: none;
  border: 1px solid transparent;
  border-radius: 4px;
  cursor: pointer;
  text-align: left;
}

.fs-recent-item:hover {
  color: #e8d8b0;
  background: #1c1c18;
  border-color: #3e2a12;
}

.fs-clear-all {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 6px;
  font-size: 12px;
  font-weight: 800;
  color: #cc6050;
  background: #16110a;
  border: 1px solid #4a3010;
  border-radius: 4px;
  cursor: pointer;
}

.fs-clear-all:hover {
  color: #e07060;
  border-color: #7a4e20;
}

/* ══════════════════════════════════════════════════
   COMPACT DESKTOPS — Full HD ist der flachste Viewport
══════════════════════════════════════════════════ */
@media (max-height: 1100px) {
  .fs-panel {
    max-height: 400px;
    gap: 8px;
    padding: 9px 10px 10px;
  }
}
</style>
