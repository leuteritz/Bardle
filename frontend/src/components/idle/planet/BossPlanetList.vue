<template>
  <div class="bpl-root">
    <div class="bpl-title">
      <span class="bpl-title-text">⭐ Planeten</span>
    </div>

    <div class="bpl-list">
      <div
        v-for="(entry, i) in planetEntries"
        :key="entry.planetId"
        class="bpl-item"
        :class="{
          'bpl-item--active': i === activeIndex && !entry.cleared,
          'bpl-item--cleared': entry.cleared,
          'bpl-item--galaxy': entry.boss?.isGalaxyBoss,
        }"
      >
        <!-- Planet SVG -->
        <div :ref="(el) => registerPlanetEl(el as HTMLDivElement | null, i)" class="bpl-planet" />

        <!-- Info -->
        <div class="bpl-info">
          <span class="bpl-boss-name">{{ entry.boss?.bossName ?? entry.label }}</span>
          <span class="bpl-planet-name">{{ entry.label }}</span>

          <!-- HP Bar -->
          <div v-if="entry.boss && !entry.cleared" class="bpl-hp-wrap">
            <div class="bpl-hp-track">
              <div
                class="bpl-hp-fill"
                :class="{
                  'bpl-hp-fill--low': hpPercent(entry.boss) < 50,
                  'bpl-hp-fill--critical': hpPercent(entry.boss) < 25,
                  'bpl-hp-fill--galaxy': entry.boss.isGalaxyBoss,
                }"
                :style="{ width: hpPercent(entry.boss) + '%' }"
              />
            </div>
            <span class="bpl-hp-label">{{ formatNumber(entry.boss.currentHP) }}</span>
          </div>

          <!-- Cleared Badge -->
          <span v-else-if="entry.cleared" class="bpl-cleared-badge">✓ Besiegt</span>
        </div>

        <!-- Aktiv-Indikator -->
        <div v-if="i === activeIndex && !entry.cleared" class="bpl-active-dot" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, watch, nextTick, ref } from 'vue'
import { NS, drawPlanet } from '../../../utils/planetDraw'
import { usePlanetBossStore } from '../../../stores/planetBossStore'
import { useStarGroupStore } from '../../../stores/starGroupStore'
import { formatNumber } from '../../../config/numberFormat'
import type { PlanetBossEvent, PlanetType } from '../../../types'

const props = defineProps<{
  planetQueue: string[]
  activeIndex: number
  isGalaxyBoss: boolean
}>()

const bossStore = usePlanetBossStore()
const starGroupStore = useStarGroupStore()

const planetEls = ref<(HTMLDivElement | null)[]>([])

function registerPlanetEl(el: HTMLDivElement | null, i: number) {
  planetEls.value[i] = el
}

const activeStar = computed(() =>
  starGroupStore.activeStars.find((s) => s.id === starGroupStore.activeFightStarId),
)

interface PlanetEntry {
  planetId: string
  label: string
  planetType: PlanetType
  cleared: boolean
  boss: PlanetBossEvent | null
}

const FALLBACK_PLANET_TYPE: PlanetType = 'rocky'

const planetEntries = computed<PlanetEntry[]>(() =>
  props.planetQueue.map((planetId) => {
    const slot = activeStar.value?.planetSlots.find((p) => p.planetId === planetId)
    const boss = bossStore.activeBosses.find((b) => b.planetId === planetId) ?? null
    const cleared = slot?.cleared ?? false
    const label =
      boss?.bossName ??
      (slot?.isChampionPlanet
        ? '♛ Champion'
        : slot?.type
          ? slot.type.charAt(0).toUpperCase() + slot.type.slice(1)
          : planetId)

    // boss.planetType und slot.type sind beide PlanetType — Fallback ist 'rocky'
    const planetType: PlanetType = boss?.planetType ?? slot?.type ?? FALLBACK_PLANET_TYPE

    return { planetId, label, planetType, cleared, boss }
  }),
)

function hpPercent(boss: PlanetBossEvent): number {
  if (!boss.maxHP || boss.maxHP === 0) return 100
  return Math.max(0, Math.min(100, (boss.currentHP / boss.maxHP) * 100))
}

let isMounted = false

function renderAllPlanets() {
  planetEntries.value.forEach((entry, i) => {
    const el = planetEls.value[i]
    if (!el || !isMounted) return
    el.innerHTML = ''
    const svg = document.createElementNS(NS, 'svg') as SVGSVGElement
    svg.setAttribute('width', '56')
    svg.setAttribute('height', '56')
    svg.setAttribute('viewBox', '0 0 56 56')
    svg.style.display = 'block'
    drawPlanet(svg, `list-planet-${entry.planetId}-${i}`, entry.planetType, 28, 28, 26)
    el.appendChild(svg)
  })
}

onMounted(async () => {
  isMounted = true
  await nextTick()
  renderAllPlanets()
})

onUnmounted(() => {
  isMounted = false
})

watch(
  () => [props.planetQueue.join(','), bossStore.activeBosses.length],
  async () => {
    if (!isMounted) return
    await nextTick()
    renderAllPlanets()
  },
)
</script>

<style scoped>
.bpl-root {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  width: 100%;
  padding: 0 0.2rem;
}

.bpl-title {
  padding: 0.2rem 0.4rem 0.3rem;
  border-bottom: 1px solid rgba(90, 45, 10, 0.4);
  margin-bottom: 0.2rem;
}

.bpl-title-text {
  font-size: 0.58rem;
  font-weight: 800;
  letter-spacing: 0.16em;
  color: #8a6020;
  text-transform: uppercase;
}

/* ── Liste ───────────────────────────────────────────────────────────────── */
.bpl-list {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  max-height: 340px;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: #5c3310 transparent;
  padding-right: 2px;
}

.bpl-item {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.3rem 0.4rem;
  border-radius: 5px;
  border: 1px solid rgba(50, 25, 5, 0.4);
  background: rgba(12, 7, 0, 0.65);
  transition:
    border-color 0.2s,
    background 0.2s,
    opacity 0.2s;
}

.bpl-item--active {
  border-color: rgba(232, 192, 64, 0.55);
  background: rgba(28, 16, 2, 0.85);
  box-shadow:
    0 0 12px rgba(232, 192, 64, 0.12),
    inset 0 0 0 1px rgba(232, 192, 64, 0.08);
}

.bpl-item--cleared {
  opacity: 0.38;
  filter: grayscale(0.6);
}

.bpl-item--galaxy {
  border-color: rgba(140, 30, 180, 0.4);
  background: rgba(14, 2, 22, 0.8);
}

.bpl-item--galaxy.bpl-item--active {
  border-color: rgba(200, 60, 255, 0.55);
  box-shadow: 0 0 14px rgba(180, 40, 255, 0.15);
}

/* ── Planet-Bild ─────────────────────────────────────────────────────────── */
.bpl-planet {
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  overflow: hidden;
  background: rgba(0, 0, 0, 0.4);
  box-shadow:
    0 0 8px rgba(0, 0, 0, 0.6),
    inset 0 0 4px rgba(0, 0, 0, 0.4);
}

.bpl-item--active .bpl-planet {
  box-shadow:
    0 0 12px rgba(232, 192, 64, 0.35),
    inset 0 0 4px rgba(0, 0, 0, 0.4);
}

.bpl-item--galaxy .bpl-planet {
  box-shadow:
    0 0 12px rgba(180, 40, 255, 0.35),
    inset 0 0 4px rgba(0, 0, 0, 0.4);
}

/* ── Info ────────────────────────────────────────────────────────────────── */
.bpl-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  flex: 1;
}

.bpl-boss-name {
  font-size: 0.67rem;
  font-weight: 800;
  color: #d4b060;
  letter-spacing: 0.04em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.2;
}
.bpl-item--active .bpl-boss-name {
  color: #e8c040;
}
.bpl-item--galaxy .bpl-boss-name {
  color: #dd88ff;
}

.bpl-planet-name {
  font-size: 0.52rem;
  font-weight: 600;
  color: #6a5828;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.bpl-item--active .bpl-planet-name {
  color: #9a7e38;
}

/* ── HP ──────────────────────────────────────────────────────────────────── */
.bpl-hp-wrap {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 1px;
}

.bpl-hp-track {
  flex: 1;
  height: 4px;
  border-radius: 2px;
  background: rgba(8, 6, 2, 0.7);
  overflow: hidden;
}

.bpl-hp-fill {
  height: 100%;
  border-radius: 2px;
  background: linear-gradient(to right, #2a7018, #50b430);
  transition: width 0.3s ease-out;
}
.bpl-hp-fill--low {
  background: linear-gradient(to right, #7a4808, #c07018);
}
.bpl-hp-fill--critical {
  background: linear-gradient(to right, #620606, #c01818);
}
.bpl-hp-fill--galaxy {
  background: linear-gradient(to right, #520870, #a01acc);
}

.bpl-hp-label {
  font-size: 0.46rem;
  font-weight: 700;
  color: #7a6030;
  white-space: nowrap;
  flex-shrink: 0;
}
.bpl-item--active .bpl-hp-label {
  color: #a08040;
}

/* ── Cleared Badge ───────────────────────────────────────────────────────── */
.bpl-cleared-badge {
  font-size: 0.5rem;
  font-weight: 800;
  letter-spacing: 0.1em;
  color: #52b830;
  text-transform: uppercase;
  margin-top: 1px;
}

/* ── Aktiv-Indikator ─────────────────────────────────────────────────────── */
.bpl-active-dot {
  position: absolute;
  left: -1px;
  top: 50%;
  transform: translateY(-50%);
  width: 3px;
  height: 60%;
  border-radius: 0 2px 2px 0;
  background: #e8c040;
  box-shadow: 0 0 6px rgba(232, 192, 64, 0.8);
  animation: bpl-dot-pulse 1s ease-in-out infinite alternate;
}

.bpl-item--galaxy .bpl-active-dot {
  background: #cc44ff;
  box-shadow: 0 0 6px rgba(200, 60, 255, 0.8);
}

@keyframes bpl-dot-pulse {
  from {
    opacity: 0.6;
  }
  to {
    opacity: 1;
    box-shadow: 0 0 10px rgba(232, 192, 64, 1);
  }
}
</style>
