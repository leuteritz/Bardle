<template>
  <div class="bpl-root">
    <div class="bpl-title">
      <span class="bpl-title-line" />
      <span class="bpl-title-text"><img src="/img/star.png" alt="★" class="star-icon"> Next Planets</span>
      <span class="bpl-title-line" />
    </div>

    <div class="bpl-list">
      <!-- Leerstate -->
      <div v-if="displayedEntries.length === 0" class="bpl-empty">All Planets Defeated</div>

      <div
        v-for="(entry, i) in displayedEntries"
        :key="entry.planetId"
        class="bpl-item"
        :class="{ 'bpl-item--galaxy': entry.boss?.isGalaxyBoss }"
      >
        <!-- Planet SVG -->
        <div :ref="(el) => registerPlanetEl(el as HTMLDivElement | null, i)" class="bpl-planet" />

        <!-- Boss Image -->
        <div class="bpl-boss-img-wrap">
          <img
            :src="bossImageUrl(entry.planetId)"
            :alt="entry.boss?.bossName ?? 'Boss'"
            class="bpl-boss-img"
            @error="($event.target as HTMLImageElement).style.display = 'none'"
          />
        </div>

        <!-- Info -->
        <div class="bpl-info">
          <span class="bpl-boss-name">{{ entry.boss?.bossName ?? entry.label }}</span>
          <span class="bpl-planet-name">{{ entry.label }}</span>
          <div v-if="entry.boss" class="bpl-hp-wrap">
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
          <span v-else class="bpl-pending-badge">— Pending</span>
        </div>
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

const bossStore = usePlanetBossStore()
const starGroupStore = useStarGroupStore()
const planetEls = ref<(HTMLDivElement | null)[]>([])

const planetQueue = computed(() => starGroupStore.starFightPlanetQueue)
const activeIndex = computed(() => starGroupStore.starFightCurrentIndex)

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
  planetQueue.value.map((planetId) => {
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
    const planetType: PlanetType = boss?.planetType ?? slot?.type ?? FALLBACK_PLANET_TYPE
    return { planetId, label, planetType, cleared, boss }
  }),
)

const displayedEntries = computed<PlanetEntry[]>(() =>
  planetEntries.value.slice(activeIndex.value + 1),
)

function hpPercent(boss: PlanetBossEvent): number {
  if (!boss.maxHP || boss.maxHP === 0) return 100
  return Math.max(0, Math.min(100, (boss.currentHP / boss.maxHP) * 100))
}

const BOSS_IMAGE_COUNT = 12

function bossImageUrl(planetId: string): string {
  let hash = 0
  for (let i = 0; i < planetId.length; i++) hash = (hash * 31 + planetId.charCodeAt(i)) & 0xffff
  return `/img/Boss/Boss${(hash % BOSS_IMAGE_COUNT) + 1}.png`
}

let isMounted = false

function renderAllPlanets() {
  displayedEntries.value.forEach((entry, i) => {
    const el = planetEls.value[i]
    if (!el || !isMounted) return
    el.innerHTML = ''
    const svg = document.createElementNS(NS, 'svg') as SVGSVGElement
    svg.setAttribute('width', '48')
    svg.setAttribute('height', '48')
    svg.setAttribute('viewBox', '0 0 48 48')
    svg.style.display = 'block'
    drawPlanet(svg, `list-planet-${entry.planetId}-${i}`, entry.planetType, 24, 24, 22)
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
  () => [planetQueue.value.join(','), activeIndex.value, bossStore.activeBosses.length],
  async () => {
    if (!isMounted) return
    await nextTick()
    renderAllPlanets()
  },
)
</script>

<style scoped>
/* ── Root ─────────────────────────────────────────────────────────────────── */
.bpl-root {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  width: 100%;
  padding: 0;
  background: transparent;
  height: 100%;
}

/* ── Titel ────────────────────────────────────────────────────────────────── */
.bpl-title {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.4rem 0.9rem 0.3rem;
  flex-shrink: 0;
}

.bpl-title-line {
  flex: 1;
  height: 1px;
  background: linear-gradient(to right, transparent, rgba(200, 146, 42, 0.35));
}
.bpl-title-line:last-child {
  background: linear-gradient(to left, transparent, rgba(200, 146, 42, 0.35));
}

.bpl-title-text {
  font-size: 0.75rem;
  font-weight: 900;
  letter-spacing: 0.14em;
  color: rgba(200, 146, 42, 0.8);
  text-transform: uppercase;
  white-space: nowrap;
}

/* ── Liste ────────────────────────────────────────────────────────────────── */
.bpl-list {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 0 0.9rem 0.9rem;
  scrollbar-width: thin;
  scrollbar-color: #5c3310 transparent;
  justify-content: flex-start;
}

/* ── Item ─────────────────────────────────────────────────────────────────── */
.bpl-item {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.65rem;
  padding: 0.7rem 0.75rem 0.7rem 0.9rem;
  border-radius: 5px;
  background: rgba(255, 255, 255, 0.03);
  transition:
    background 0.2s,
    opacity 0.2s;
  overflow: hidden;
}

/* Horizontaler Trenner zwischen Items */
.bpl-item + .bpl-item {
  border-top: 1px solid rgba(200, 146, 42, 0.08);
}

.bpl-item--active {
  background: rgba(232, 192, 64, 0.06);
}

.bpl-item--cleared {
  opacity: 0.35;
  filter: grayscale(0.65);
}

.bpl-item--galaxy {
  background: rgba(180, 40, 255, 0.04);
}
.bpl-item--galaxy.bpl-item--active {
  background: rgba(200, 60, 255, 0.08);
}

/* ── Aktiv-Bar links ──────────────────────────────────────────────────────── */
.bpl-active-bar {
  position: absolute;
  left: 0;
  top: 15%;
  height: 70%;
  width: 3px;
  border-radius: 0 3px 3px 0;
  background: #e8c040;
  box-shadow: 0 0 8px rgba(232, 192, 64, 0.9);
  animation: bar-pulse 1s ease-in-out infinite alternate;
}

.bpl-item--galaxy .bpl-active-bar {
  background: #cc44ff;
  box-shadow: 0 0 8px rgba(200, 60, 255, 0.9);
}

@keyframes bar-pulse {
  from {
    opacity: 0.6;
    box-shadow: 0 0 5px rgba(232, 192, 64, 0.6);
  }
  to {
    opacity: 1;
    box-shadow: 0 0 12px rgba(232, 192, 64, 1);
  }
}

/* ── Planet ───────────────────────────────────────────────────────────────── */
.bpl-planet {
  width: 48px;
  height: 48px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  overflow: hidden;
  background: rgba(0, 0, 0, 0.4);
  box-shadow:
    0 0 10px rgba(0, 0, 0, 0.7),
    inset 0 0 5px rgba(0, 0, 0, 0.5);
}

.bpl-item--active .bpl-planet {
  box-shadow:
    0 0 14px rgba(232, 192, 64, 0.4),
    inset 0 0 5px rgba(0, 0, 0, 0.4);
}

.bpl-item--galaxy .bpl-planet {
  box-shadow:
    0 0 14px rgba(180, 40, 255, 0.4),
    inset 0 0 5px rgba(0, 0, 0, 0.4);
}

/* ── Boss Image ───────────────────────────────────────────────────────────── */
.bpl-boss-img-wrap {
  width: 48px;
  height: 48px;
  flex-shrink: 0;
  border-radius: 50%;
  overflow: hidden;
  background: rgba(8, 5, 0, 0.6);
  border: 2px solid rgba(200, 146, 42, 0.3);
  box-shadow:
    0 0 8px rgba(0, 0, 0, 0.6),
    inset 0 0 4px rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
}

.bpl-item--active .bpl-boss-img-wrap {
  border-color: rgba(232, 192, 64, 0.55);
  box-shadow:
    0 0 12px rgba(232, 192, 64, 0.3),
    inset 0 0 4px rgba(0, 0, 0, 0.4);
}

.bpl-item--galaxy .bpl-boss-img-wrap {
  border-color: rgba(180, 40, 255, 0.45);
  box-shadow:
    0 0 12px rgba(180, 40, 255, 0.3),
    inset 0 0 4px rgba(0, 0, 0, 0.4);
}

.bpl-boss-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center top;
  image-rendering: pixelated;
}

/* ── Info ─────────────────────────────────────────────────────────────────── */
.bpl-info {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
  flex: 1;
}

.bpl-boss-name {
  font-size: 0.95rem;
  font-weight: 800;
  color: #d4b060;
  letter-spacing: 0.04em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.2;
  text-shadow: 0 0 8px rgba(200, 146, 42, 0.35);
}
.bpl-item--active .bpl-boss-name {
  color: #e8c040;
  text-shadow: 0 0 10px rgba(232, 192, 64, 0.5);
}
.bpl-item--galaxy .bpl-boss-name {
  color: #dd88ff;
  text-shadow: 0 0 10px rgba(200, 80, 255, 0.45);
}

.bpl-planet-name {
  font-size: 0.65rem;
  font-weight: 600;
  color: rgba(150, 120, 60, 0.65);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.bpl-item--active .bpl-planet-name {
  color: rgba(200, 160, 60, 0.75);
}

/* ── HP ───────────────────────────────────────────────────────────────────── */
.bpl-hp-wrap {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-top: 2px;
}

.bpl-hp-track {
  flex: 1;
  height: 7px;
  border-radius: 3px;
  background: rgba(8, 6, 2, 0.7);
  overflow: hidden;
}

.bpl-hp-fill {
  height: 100%;
  border-radius: 3px;
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
  font-size: 0.52rem;
  font-weight: 700;
  color: rgba(160, 120, 50, 0.7);
  white-space: nowrap;
  flex-shrink: 0;
}
.bpl-item--active .bpl-hp-label {
  color: rgba(200, 160, 60, 0.85);
}

/* ── Pending Badge ────────────────────────────────────────────────────────── */
.bpl-pending-badge {
  font-size: 0.56rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  color: rgba(150, 120, 60, 0.5);
  text-transform: uppercase;
  margin-top: 2px;
}

/* ── Leerstate ────────────────────────────────────────────────────────────── */
.bpl-empty {
  text-align: center;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  color: rgba(150, 120, 60, 0.45);
  text-transform: uppercase;
  padding: 1rem 0;
}
</style>
