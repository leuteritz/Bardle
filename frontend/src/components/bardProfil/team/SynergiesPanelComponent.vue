<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useSynergyStore } from '@/stores/synergyStore'
import type { ActiveSynergy } from '@/types'

const props = defineProps<{ activeSlotIndex: number; collapsed?: boolean }>()
const emit = defineEmits<{
  'hovered-syn-change': [value: { involvedChampions: string[]; color: string } | null]
}>()

const synergyStore = useSynergyStore()
const { activeSynergies, activeOriginSynergies } = storeToRefs(synergyStore)

const hoveredTftId = ref<string | null>(null)
const tooltipPos = ref({ x: 0, y: 0 })

const TIER_COLORS = {
  bronze: '#a06030',
  silver: '#9aa4b4',
  gold: '#d4a830',
} as const

const sortedRoleSynergies = computed<ActiveSynergy[]>(() => {
  const globals = activeSynergies.value.filter((s) => s.roleIndex === undefined)
  const roleSpecific = activeSynergies.value.filter((s) => s.roleIndex === props.activeSlotIndex)
  return [...globals, ...roleSpecific]
})

const tftActiveTraits = computed(() => {
  const synTraits = sortedRoleSynergies.value.map((syn) => ({
    id: syn.id,
    name: syn.name,
    icon: syn.icon,
    color: syn.color,
    tier: syn.tier as 'bronze' | 'silver' | 'gold',
    count: syn.involvedChampions.length,
    maxCount: null as number | null,
    nextCount: null as number | null,
    effects: syn.effects,
    thresholds: null as import('@/types').OriginSynergyThreshold[] | null,
    activeThresholdIdx: -1,
    involvedChampions: syn.involvedChampions,
    isOrigin: false,
  }))

  const originTraits = activeOriginSynergies.value
    .filter((os) => os.activeThreshold !== null)
    .map((os) => {
      const activeIdx = os.def.thresholds.findIndex((t) => t === os.activeThreshold)
      const total = os.def.thresholds.length
      const tier: 'bronze' | 'silver' | 'gold' =
        activeIdx >= total - 1
          ? 'gold'
          : activeIdx >= Math.ceil(total / 2) - 1
            ? 'silver'
            : 'bronze'
      return {
        id: 'origin-' + os.origin,
        name: os.def.name,
        icon: os.def.icon,
        color: os.def.color,
        tier,
        count: os.count,
        maxCount: os.def.thresholds.at(-1)!.count,
        nextCount: os.nextThreshold?.count ?? null,
        effects: null as import('@/types').SynergyEffect[] | null,
        thresholds: os.def.thresholds,
        activeThresholdIdx: activeIdx,
        involvedChampions: os.involvedChampions,
        isOrigin: true,
      }
    })

  const ORDER = { gold: 0, silver: 1, bronze: 2 }
  return [...synTraits, ...originTraits].sort((a, b) => ORDER[a.tier] - ORDER[b.tier])
})

const hoveredSyn = computed(() => {
  if (hoveredTftId.value) {
    const tft = tftActiveTraits.value.find((t) => t.id === hoveredTftId.value)
    if (tft) return { involvedChampions: tft.involvedChampions, color: tft.color }
  }
  return null
})

watch(hoveredSyn, (val) => emit('hovered-syn-change', val))

function onTraitHover(id: string, e: MouseEvent) {
  hoveredTftId.value = id
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
  tooltipPos.value = { x: rect.left - 8, y: rect.top }
}
</script>

<template>
  <!-- ══ TFT Synergy Panel (rechts) ══ -->
  <div class="tft-syn-panel" :class="{ 'tft-syn-panel--collapsed': props.collapsed }" @click.stop>
    <div class="tft-syn-label">Synergies</div>

    <div
      v-for="trait in tftActiveTraits"
      :key="trait.id"
      class="tft-trait-row"
      :style="{ '--tc': TIER_COLORS[trait.tier] }"
      @mouseenter="onTraitHover(trait.id, $event)"
      @mouseleave="hoveredTftId = null"
    >
      <div class="tft-hex-badge">
        <div class="tft-hex-inner" :style="{ background: TIER_COLORS[trait.tier] }">
          <span class="tft-hex-icon">{{ trait.icon }}</span>
        </div>
      </div>
      <span class="tft-trait-name">{{ trait.name }}</span>
      <span class="tft-trait-count">
        <template v-if="trait.maxCount !== null">
          {{ trait.count }} / {{ trait.nextCount ?? trait.maxCount }}
        </template>
        <template v-else>
          {{ trait.count }}
        </template>
      </span>
    </div>

    <div v-if="tftActiveTraits.length === 0" class="tft-syn-empty">
      <span>No active synergies</span>
    </div>
  </div>

  <!-- TFT Tooltip (Teleport → body, fixed links vom Panel) -->
  <Teleport to="body">
    <Transition name="tft-tooltip-fade">
      <div
        v-if="hoveredTftId !== null"
        class="tft-tooltip"
        :style="{ left: tooltipPos.x + 'px', top: tooltipPos.y + 'px' }"
      >
        <template
          v-for="trait in tftActiveTraits.filter((t) => t.id === hoveredTftId)"
          :key="trait.id"
        >
          <div class="tft-tooltip-header">
            <span class="tft-tooltip-icon">{{ trait.icon }}</span>
            <span class="tft-tooltip-title" :style="{ color: TIER_COLORS[trait.tier] }">{{ trait.name }}</span>
          </div>
          <template v-if="trait.isOrigin && trait.thresholds">
            <div
              v-for="(thresh, idx) in trait.thresholds"
              :key="idx"
              class="tft-tooltip-thresh"
              :class="{ 'tft-tooltip-thresh--active': idx === trait.activeThresholdIdx }"
            >
              <span class="tft-tooltip-thresh-count">{{ thresh.count }}</span>
              <span class="tft-tooltip-thresh-bonus">{{ thresh.bonus }}</span>
            </div>
          </template>
          <template v-else-if="trait.effects">
            <div
              v-for="(eff, idx) in trait.effects"
              :key="idx"
              class="tft-tooltip-effect"
            >
              {{ eff.type === 'cps' ? 'CPS' : eff.type === 'power' ? 'Power' : 'DPS' }}
              +{{ Math.round((eff.multiplier - 1) * 100) }}%
            </div>
          </template>
          <div v-if="trait.involvedChampions.length" class="tft-tooltip-champs">
            {{ trait.involvedChampions.join(' · ') }}
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
  width: 24px;
  height: 28px;
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
  font-size: 13px;
  line-height: 1;
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
   TFT TOOLTIP (via Teleport)
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
  font-size: 16px;
  line-height: 1;
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
.tft-tooltip-effect {
  font-size: 11px;
  color: #e8c040;
  padding: 2px 0;
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
