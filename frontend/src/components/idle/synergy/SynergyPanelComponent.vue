<script setup lang="ts">
import { ref } from 'vue'
import { storeToRefs } from 'pinia'
import { Icon } from '@iconify/vue'
import { useSynergyStore } from '@/stores/synergyStore'
import { ROLES as ROLE_DEFS } from '@/config/constants'
import type { ActiveSynergy } from '@/types'

const synergyStore = useSynergyStore()
const { synergyByRole } = storeToRefs(synergyStore)

const TIER_COLORS: Record<string, string> = {
  bronze: '#c08040',
  silver: '#a0b8c8',
  gold: '#e8c040',
}

const hoveredId = ref<string | null>(null)
const tooltipStyle = ref<Record<string, string>>({})

function onBadgeEnter(e: MouseEvent, id: string) {
  hoveredId.value = id
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
  tooltipStyle.value = {
    left: rect.left + rect.width / 2 + 'px',
    top: rect.bottom + 8 + 'px',
  }
}

function onBadgeLeave() {
  hoveredId.value = null
}

function formatEffect(syn: ActiveSynergy): string {
  return syn.effects
    .map((e) => {
      const pct = Math.round((e.multiplier - 1) * 100)
      const label = e.type === 'cps' ? 'CPS' : e.type === 'power' ? 'Macht' : 'DPS'
      return `${label} +${pct}%`
    })
    .join(' · ')
}

function tierColor(syn: ActiveSynergy): string {
  return TIER_COLORS[syn.tier] ?? '#c89040'
}

const allSynergies = () => synergyByRole.value.flat()
</script>

<template>
  <div class="syn-panel">
    <!-- Gold accent line -->
    <div class="syn-gold-line" />

    <!-- 5-column grid: one per role -->
    <div class="syn-grid">
      <!-- Role columns -->
      <div
        v-for="(roleDef, i) in ROLE_DEFS"
        :key="roleDef.key"
        class="syn-col"
        :style="{ '--rc': roleDef.color }"
      >
        <div class="syn-col-header">
          <img class="syn-col-icon" :src="roleDef.image" :alt="roleDef.label" />
          <span class="syn-col-label">{{ roleDef.label }}</span>
        </div>
        <div class="syn-col-body">
          <div v-if="synergyByRole[i].length === 0" class="syn-empty">—</div>
          <button
            v-for="syn in synergyByRole[i]"
            :key="syn.id"
            class="syn-card"
            :style="{ '--sc': syn.color, '--tc': tierColor(syn) }"
            @mouseenter="onBadgeEnter($event, syn.id)"
            @mouseleave="onBadgeLeave"
          >
            <img v-if="syn.icon.startsWith('/')" class="syn-card-icon" :src="syn.icon" :alt="syn.name" />
            <Icon v-else-if="syn.icon.includes(':')" :icon="syn.icon" class="syn-card-icon" />
            <span v-else class="syn-card-icon">{{ syn.icon }}</span>
            <span class="syn-card-name">{{ syn.name }}</span>
            <span class="syn-card-fx">{{ formatEffect(syn) }}</span>
          </button>
        </div>
      </div>

    </div>

    <!-- Tooltip -->
    <Teleport to="body">
      <Transition name="syn-tip">
        <div v-if="hoveredId" class="syn-tooltip" :style="tooltipStyle">
          <template v-for="syn in allSynergies()" :key="syn.id">
            <template v-if="syn.id === hoveredId">
              <div class="syn-tip-head" :style="{ color: syn.color }">
                <img v-if="syn.icon.startsWith('/')" class="syn-tip-icon" :src="syn.icon" :alt="syn.name" />
                <Icon v-else-if="syn.icon.includes(':')" :icon="syn.icon" class="syn-tip-icon" />
                <span v-else class="syn-tip-icon">{{ syn.icon }}</span>
                {{ syn.name }}
              </div>
              <div class="syn-tip-desc">{{ syn.description }}</div>
              <div class="syn-tip-fx">{{ formatEffect(syn) }}</div>
              <div v-if="syn.involvedChampions.length" class="syn-tip-champs">
                {{ syn.involvedChampions.join(' · ') }}
              </div>
            </template>
          </template>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.syn-panel {
  background: #111008;
  border-bottom: 3px solid #5c3310;
  box-shadow: inset 0 0 0 2px #3e200a, inset 0 0 0 4px #5c3310;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
}

.syn-gold-line {
  height: 3px;
  background: linear-gradient(
    to right,
    #5c3310,
    #c89040,
    #e8c060,
    #d4a020,
    #c89040,
    #5c3310
  );
  flex-shrink: 0;
}

.syn-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  flex: 1;
  min-height: 0;
}

.syn-col {
  display: flex;
  flex-direction: column;
  border-right: 1px solid #2a1a08;
  min-width: 0;
}

.syn-col:last-child {
  border-right: none;
}

.syn-col-header {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px 3px;
  background: #1e1006;
  border-bottom: 1px solid #2a1a08;
  flex-shrink: 0;
}

.syn-col-icon {
  width: 11px;
  height: 11px;
  object-fit: contain;
  image-rendering: pixelated;
  flex-shrink: 0;
}

.syn-col-label {
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--rc, #c89040);
}

.syn-col--global .syn-col-label {
  color: #e8c040;
}

.syn-col-body {
  flex: 1;
  padding: 4px 5px;
  display: flex;
  flex-direction: column;
  gap: 3px;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: #5c3310 #111;
}

.syn-empty {
  font-size: 11px;
  color: color-mix(in srgb, var(--rc, #c89040) 25%, transparent);
  padding: 2px 0;
  text-align: center;
}

.syn-card {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 6px;
  background: #1a1008;
  border: 1px solid var(--tc, #c89040);
  border-radius: 4px;
  cursor: default;
  transition: box-shadow 0.15s;
  width: 100%;
  text-align: left;
  min-height: 26px;
  box-shadow: 0 0 5px color-mix(in srgb, var(--sc, #e8c040) 20%, transparent);
}

.syn-card:hover {
  box-shadow:
    0 0 10px color-mix(in srgb, var(--sc, #e8c040) 50%, transparent),
    inset 0 0 5px color-mix(in srgb, var(--sc, #e8c040) 12%, transparent);
}

.syn-card-icon {
  width: 13px;
  height: 13px;
  object-fit: contain;
  image-rendering: pixelated;
  flex-shrink: 0;
}

.syn-card-name {
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: var(--tc, #c89040);
  text-transform: uppercase;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  min-width: 0;
}

.syn-card-fx {
  font-size: 8px;
  color: #e8c040;
  white-space: nowrap;
  flex-shrink: 0;
  opacity: 0.85;
}
</style>

<!-- Tooltip — global, rendered in body -->
<style>
.syn-tooltip {
  position: fixed;
  z-index: 9999;
  transform: translateX(-50%);
  background: #16140e;
  border: 2px solid #5c3310;
  border-radius: 4px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.85);
  padding: 8px 11px;
  max-width: 220px;
  pointer-events: none;
}

.syn-tip-head {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.05em;
  margin-bottom: 3px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.syn-tip-icon {
  width: 13px;
  height: 13px;
  object-fit: contain;
  image-rendering: pixelated;
  flex-shrink: 0;
}

.syn-tip-desc {
  font-size: 10px;
  color: #c8a060;
  margin-bottom: 4px;
  line-height: 1.4;
}

.syn-tip-fx {
  font-size: 11px;
  color: #e8c040;
  font-weight: 700;
  margin-bottom: 3px;
}

.syn-tip-champs {
  font-size: 9px;
  color: rgba(200, 160, 96, 0.5);
  line-height: 1.35;
}

.syn-tip-enter-active,
.syn-tip-leave-active {
  transition: opacity 0.1s ease;
}
.syn-tip-enter-from,
.syn-tip-leave-to {
  opacity: 0;
}
</style>
