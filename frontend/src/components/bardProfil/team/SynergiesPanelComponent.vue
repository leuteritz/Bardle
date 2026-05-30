<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Icon } from '@iconify/vue'
import { storeToRefs } from 'pinia'
import { useSynergyStore } from '@/stores/synergyStore'

defineProps<{ activeSlotIndex: number; collapsed?: boolean }>()
const emit = defineEmits<{
  'hovered-syn-change': [value: { involvedChampions: string[]; color: string } | null]
}>()

const synergyStore = useSynergyStore()
const { activeTraits, activeOriginSynergies } = storeToRefs(synergyStore)

const hoveredId = ref<string | null>(null)
const tooltipPos = ref({ x: 0, y: 0 })

const TIER_COLORS = {
  bronze: '#a06030',
  silver: '#9aa4b4',
  gold: '#d4a830',
} as const

// Unified display list: new traits + origin synergies, sorted by tier
const displayTraits = computed(() => {
  // Map new TFT traits to display format
  const traitRows = activeTraits.value.map((at) => {
    const thresholds = at.trait.thresholds
    const activeIdx = at.activeThreshold ? thresholds.indexOf(at.activeThreshold) : -1
    const total = thresholds.length
    const tier: 'bronze' | 'silver' | 'gold' =
      activeIdx >= total - 1 ? 'gold' : activeIdx >= Math.ceil(total / 2) - 1 ? 'silver' : 'bronze'
    return {
      id: 'trait-' + at.trait.id,
      name: at.trait.name,
      icon: at.trait.icon,
      color: at.trait.color,
      tier,
      count: at.count,
      maxCount: thresholds.at(-1)!.count,
      nextCount: at.nextThreshold?.count ?? null,
      thresholds: thresholds.map((t) => ({ count: t.count, bonus: t.bonus })),
      activeThresholdIdx: activeIdx,
      involvedChampions: at.involvedChampions,
      isOrigin: false,
    }
  })

  // Map origin synergies (only those with an active threshold)
  const originRows = activeOriginSynergies.value
    .filter((os) => os.activeThreshold !== null)
    .map((os) => {
      const activeIdx = os.def.thresholds.findIndex((t) => t === os.activeThreshold)
      const total = os.def.thresholds.length
      const tier: 'bronze' | 'silver' | 'gold' =
        activeIdx >= total - 1 ? 'gold' : activeIdx >= Math.ceil(total / 2) - 1 ? 'silver' : 'bronze'
      return {
        id: 'origin-' + os.origin,
        name: String(os.origin),
        icon: os.def.icon,
        color: os.def.color,
        tier,
        count: os.count,
        maxCount: os.def.thresholds.at(-1)!.count,
        nextCount: os.nextThreshold?.count ?? null,
        thresholds: os.def.thresholds.map((t) => ({ count: t.count, bonus: t.bonus })),
        activeThresholdIdx: activeIdx,
        involvedChampions: os.involvedChampions,
        isOrigin: true,
      }
    })

  const ORDER = { gold: 0, silver: 1, bronze: 2 }
  return [...traitRows, ...originRows].sort((a, b) => ORDER[a.tier] - ORDER[b.tier])
})

const hoveredSyn = computed(() => {
  if (hoveredId.value) {
    const row = displayTraits.value.find((t) => t.id === hoveredId.value)
    if (row) return { involvedChampions: row.involvedChampions, color: row.color }
  }
  return null
})

watch(hoveredSyn, (val) => emit('hovered-syn-change', val))

function onTraitHover(id: string, e: MouseEvent) {
  hoveredId.value = id
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
  tooltipPos.value = { x: rect.left - 8, y: rect.top }
}
</script>

<template>
  <!-- ══ Synergy / Trait Panel (right side) ══ -->
  <div class="tft-syn-panel" :class="{ 'tft-syn-panel--collapsed': collapsed }" @click.stop>
    <div class="tft-syn-label">Synergies</div>

    <div
      v-for="row in displayTraits"
      :key="row.id"
      class="tft-trait-row"
      :style="{ '--tc': TIER_COLORS[row.tier] }"
      @mouseenter="onTraitHover(row.id, $event)"
      @mouseleave="hoveredId = null"
    >
      <div class="tft-hex-badge">
        <div class="tft-hex-inner" :style="{ background: TIER_COLORS[row.tier] }">
          <Icon v-if="row.icon.includes(':')" :icon="row.icon" class="tft-hex-icon" />
          <span v-else class="tft-hex-icon tft-hex-icon--emoji">{{ row.icon }}</span>
        </div>
      </div>
      <span class="tft-trait-name">{{ row.name }}</span>
      <span class="tft-trait-count">
        {{ row.count }} / {{ row.nextCount ?? row.maxCount }}
      </span>
    </div>

    <div v-if="displayTraits.length === 0" class="tft-syn-empty">
      <span>No active synergies</span>
    </div>
  </div>

  <!-- Tooltip (Teleport → body) -->
  <Teleport to="body">
    <Transition name="tft-tooltip-fade">
      <div
        v-if="hoveredId !== null"
        class="tft-tooltip"
        :style="{ left: tooltipPos.x + 'px', top: tooltipPos.y + 'px' }"
      >
        <template
          v-for="row in displayTraits.filter((t) => t.id === hoveredId)"
          :key="row.id"
        >
          <div class="tft-tooltip-header">
            <Icon v-if="row.icon.includes(':')" :icon="row.icon" class="tft-tooltip-icon" />
            <span v-else class="tft-tooltip-icon tft-tooltip-icon--emoji">{{ row.icon }}</span>
            <span class="tft-tooltip-title" :style="{ color: row.isOrigin ? row.color : TIER_COLORS[row.tier] }">
              {{ row.name }}
            </span>
          </div>

          <!-- Threshold progression (same format for both traits and origins) -->
          <div
            v-for="(thresh, idx) in row.thresholds"
            :key="idx"
            class="tft-tooltip-thresh"
            :class="{ 'tft-tooltip-thresh--active': idx === row.activeThresholdIdx }"
          >
            <span class="tft-tooltip-thresh-count">{{ thresh.count }}</span>
            <span class="tft-tooltip-thresh-bonus">{{ thresh.bonus }}</span>
          </div>

          <div v-if="row.involvedChampions.length" class="tft-tooltip-champs">
            {{ row.involvedChampions.join(' · ') }}
          </div>
        </template>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* ══════════════════════════════
   TFT SYNERGY PANEL
   ══════════════════════════════ */
.tft-syn-panel {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  z-index: 6;
  display: flex;
  flex-direction: column;
  gap: 4px;
  pointer-events: auto;
  width: 186px;
  max-height: 75%;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: #5c3310 #111;
  transition: transform 0.3s ease, opacity 0.25s ease;
}
.tft-syn-panel--collapsed {
  transform: translateY(-50%) translateX(115%);
  opacity: 0;
  pointer-events: none;
}
.tft-syn-panel::-webkit-scrollbar {
  width: 3px;
}
.tft-syn-panel::-webkit-scrollbar-track {
  background: transparent;
}
.tft-syn-panel::-webkit-scrollbar-thumb {
  background: rgba(92, 51, 16, 0.6);
  border-radius: 2px;
}
.tft-syn-label {
  font-size: 9px;
  font-weight: 900;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: rgba(232, 192, 64, 0.55);
  text-align: center;
  padding-bottom: 4px;
  border-bottom: 1px solid rgba(92, 51, 16, 0.45);
  flex-shrink: 0;
}
.tft-trait-row {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 5px 8px 5px 6px;
  background: rgba(8, 5, 2, 0.82);
  border: 1px solid rgba(92, 51, 16, 0.4);
  border-left: 2px solid var(--tc, #d4a830);
  border-radius: 4px;
  cursor: default;
  transition: background 0.12s, border-color 0.12s;
}
.tft-trait-row:hover {
  background: rgba(14, 10, 4, 0.92);
  border-color: var(--tc, #d4a830);
}
.tft-hex-badge {
  flex-shrink: 0;
  width: 28px;
  height: 32px;
  clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
  overflow: hidden;
}
.tft-hex-inner {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.tft-hex-icon {
  width: 18px;
  height: 18px;
  color: #fff;
  flex-shrink: 0;
  display: block;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.5));
}
.tft-hex-icon--emoji {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 15px;
  line-height: 1;
  filter: none;
}
.tft-trait-name {
  font-size: 11px;
  font-weight: 700;
  color: #d8c8a0;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
  min-width: 0;
}
.tft-trait-count {
  font-size: 10px;
  font-weight: 800;
  color: var(--tc, #d4a830);
  flex-shrink: 0;
  letter-spacing: 0.04em;
}
.tft-syn-empty {
  font-size: 10px;
  color: rgba(232, 192, 64, 0.35);
  text-align: center;
  padding: 12px 0;
  letter-spacing: 0.06em;
}

/* ══════════════════════════════
   TOOLTIP (via Teleport)
   ══════════════════════════════ */
.tft-tooltip {
  position: fixed;
  transform: translateX(-100%);
  z-index: 9999;
  width: 200px;
  background: #16140e;
  border: 2px solid #5c3310;
  border-radius: 4px;
  padding: 10px 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.85);
  pointer-events: none;
}
.tft-tooltip-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  padding-bottom: 6px;
  border-bottom: 1px solid rgba(92, 51, 16, 0.5);
}
.tft-tooltip-icon {
  width: 24px;
  height: 24px;
  flex-shrink: 0;
  color: #e8c040;
  filter: drop-shadow(0 1px 3px rgba(0, 0, 0, 0.8));
}
.tft-tooltip-icon--emoji {
  font-size: 22px;
  line-height: 1;
  filter: none;
}
.tft-tooltip-title {
  font-size: 12px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.07em;
}
.tft-tooltip-thresh {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 3px 0;
  opacity: 0.45;
  font-size: 11px;
}
.tft-tooltip-thresh--active {
  opacity: 1;
  font-weight: 700;
}
.tft-tooltip-thresh-count {
  width: 18px;
  text-align: center;
  font-weight: 800;
  color: #e8c040;
  flex-shrink: 0;
}
.tft-tooltip-thresh-bonus {
  color: #c8b88a;
}
.tft-tooltip-champs {
  margin-top: 8px;
  padding-top: 6px;
  border-top: 1px solid rgba(92, 51, 16, 0.4);
  font-size: 9px;
  color: rgba(200, 180, 140, 0.65);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  line-height: 1.5;
}
.tft-tooltip-fade-enter-active,
.tft-tooltip-fade-leave-active {
  transition: opacity 0.1s;
}
.tft-tooltip-fade-enter-from,
.tft-tooltip-fade-leave-to {
  opacity: 0;
}
</style>
