<template>
  <!-- Galaxy Boss Spawn — Episches cinematisches Overlay -->
  <Transition name="galaxy-boss-fade">
    <div v-if="showGalaxyBossFlash" class="galaxy-boss-overlay" aria-hidden="true">
      <div class="galaxy-boss-rings">
        <div class="boss-ring boss-ring--1" />
        <div class="boss-ring boss-ring--2" />
        <div class="boss-ring boss-ring--3" />
      </div>
      <div class="galaxy-boss-text">
        <span class="boss-alert-line">⚠ SIGNALQUELLE GEORTET ⚠</span>
        <span class="boss-title-line">☠ GALAXIS-BOSS ☠</span>
      </div>
    </div>
  </Transition>

  <!-- Alert vignette flash when rescue event spawns -->
  <Transition name="vignette-fade">
    <div v-if="showFlash" class="planet-vignette" aria-hidden="true" />
  </Transition>

  <!-- Champion-Ankunft Vignette (feuerrot) -->
  <Transition name="champion-vignette-fade">
    <div v-if="showChampionFlash" class="planet-vignette--champion" aria-hidden="true" />
  </Transition>

  <!-- Stacked countdown bars — one per active planet boss -->
  <TransitionGroup
    v-if="activeBosses.length > 0"
    name="bar-stack"
    tag="div"
    class="planet-bar-stack"
    aria-hidden="true"
  >
    <div
      v-for="(boss, idx) in activeBosses"
      :key="boss.planetId"
      class="planet-countdown-bar"
      :style="{
        '--bar-color': barColor(idx, activeBosses.length),
        '--bar-color-dark': barColorDark(idx, activeBosses.length),
      }"
    >
      <div
        class="planet-countdown-fill planet-countdown-fill--left"
        :style="{
          right: leftFill.right + 'px',
          width: (progressPercent(boss) / 100) * leftFill.width + 'px',
        }"
      />
      <div
        class="planet-countdown-fill planet-countdown-fill--right"
        :style="{
          left: rightFill.left + 'px',
          width: (progressPercent(boss) / 100) * rightFill.width + 'px',
        }"
      />
      <span class="planet-countdown-label">
        ⚠ {{ boss.bossName }} — {{ formatCountdown(boss) }}
      </span>
    </div>
  </TransitionGroup>

  <!-- Boss Defeated toast -->
  <Transition name="toast-slide">
    <div v-if="showVictoryToast" class="planet-toast planet-toast--saved">
      ✨ Boss Defeated! +{{ formatNumber(savedReward) }} Chimes
      <template v-if="droppedMaterial">
        <br />
        <span class="toast-material">
          <img :src="droppedMaterial.image" class="toast-material-img rpg-img" alt="" />
          {{ droppedMaterial.name }} erhalten!
        </span>
      </template>
      <template v-else-if="savedHadMaterial">
        <br />
        <span class="toast-material toast-material--none">Kein Material gedroppt</span>
      </template>
      <template v-if="savedChampionName">
        <br />
        <span class="toast-material toast-material--champion">
          <img
            v-if="savedChampionImage"
            :src="savedChampionImage"
            :alt="savedChampionName"
            class="toast-material-img toast-material-img--champion"
          />
          {{ savedChampionName }} entdeckt! Sieh im Champion Shop nach.
        </span>
      </template>
    </div>
  </Transition>

  <!-- Boss Enraged toast -->
  <Transition name="toast-slide">
    <div v-if="showDefeatToast" class="planet-toast planet-toast--lost">
      💥 Boss Enraged! -5% CPS für 30s
    </div>
  </Transition>

  <!-- Champion-Ankunft Toast (feuerrot) -->
  <Transition name="toast-slide">
    <div v-if="showChampionArrivedToast" class="planet-toast planet-toast--champion-arrived">
      🔥 Champion-Planet eingetroffen!
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import type { PlanetBossEvent } from '@/types'
import { usePlanetEventStore } from '@/stores/planetEventStore'
import { usePlanetBossStore } from '@/stores/planetBossStore'
import { useGalaxyStore } from '@/stores/galaxyStore'
import { useStarGroupStore } from '@/stores/starGroupStore'
import { formatNumber } from '@/config/numberFormat'
import { MATERIALS } from '@/config/materials'

const planetEventStore = usePlanetEventStore()
const bossStore = usePlanetBossStore()
const galaxyStore = useGalaxyStore()
const starGroupStore = useStarGroupStore()

// Drive countdown reactivity at 200ms resolution
const now = ref(Date.now())
let tickInterval: ReturnType<typeof setInterval> | null = null

// Pixel-precise fill geometry derived from the actual .center-chimes DOM position
const leftFill = ref({ right: 80, width: 560 })
const rightFill = ref({ left: 80, width: 560 })
let resizeObserver: ResizeObserver | null = null

function measureChimes() {
  const bar = document.querySelector('.planet-countdown-bar') as HTMLElement | null
  const chimes = document.querySelector('.center-chimes') as HTMLElement | null
  if (!bar || !chimes) return
  const b = bar.getBoundingClientRect()
  const c = chimes.getBoundingClientRect()
  leftFill.value = { right: b.right - c.left, width: c.left - b.left }
  rightFill.value = { left: c.right - b.left, width: b.right - c.right }
}

watch(
  () => planetEventStore.isEventActive,
  (active) => {
    if (active) nextTick(measureChimes)
  },
)

onMounted(() => {
  tickInterval = setInterval(() => {
    now.value = Date.now()
  }, 200)
  measureChimes()
  resizeObserver = new ResizeObserver(measureChimes)
  const header = document.querySelector('.header-bar') as HTMLElement | null
  if (header) resizeObserver.observe(header)
})
onUnmounted(() => {
  if (tickInterval) clearInterval(tickInterval)
  resizeObserver?.disconnect()
})

// ── Genau 1 Timer-Bar pro aktivem Stern ─────────────────────────────────────
//
// Strategie: Wir iterieren über activeStars und wählen pro Stern
// genau den einen repräsentativen Boss aus:
//   - Champion-Stern  → isChampionPlanet=true (der Champion-Planet)
//   - Resource-Stern  → erster nicht-cleared Slot (alle haben denselben Timer)
//   - Galaxy-Boss     → einziger Planet
//
// Fallback (kein starGroupStore-Eintrag vorhanden): alle aktiven Bosses
// ohne noEnrage, dedupliziert auf einen.
const activeBosses = computed((): PlanetBossEvent[] => {
  const bossMap = new Map<string, PlanetBossEvent>()
  for (const b of bossStore.activeBosses) {
    if (!b.defeated && !b.expired) bossMap.set(b.planetId, b)
  }

  if (bossMap.size === 0) return []

  const result: PlanetBossEvent[] = []

  for (const star of starGroupStore.activeStars) {
    let representative: PlanetBossEvent | undefined

    if (star.starType === 'champion') {
      // Champion-Stern: nur der Champion-Planet bekommt einen Bar
      const champSlot = star.planetSlots.find((s) => s.isChampionPlanet && !s.cleared)
      if (champSlot) representative = bossMap.get(champSlot.planetId)
    } else {
      // Resource-Stern und Galaxy-Boss: erster noch nicht gecleared Slot
      for (const slot of star.planetSlots) {
        if (!slot.cleared) {
          const boss = bossMap.get(slot.planetId)
          if (boss) {
            representative = boss
            break
          }
        }
      }
    }

    if (representative) result.push(representative)
  }

  // Fallback: Bosses ohne zugehörigen Stern (sollte nicht vorkommen)
  if (result.length === 0) {
    const enrageable = [...bossMap.values()].filter((b) => !b.noEnrage)
    if (enrageable.length > 0) return [enrageable[0]]
    const first = [...bossMap.values()][0]
    return first ? [first] : []
  }

  return result
})

function progressPercent(boss: PlanetBossEvent): number {
  const remaining = Math.max(0, boss.enrageTimerMs - (now.value - boss.startTime))
  return (remaining / boss.enrageTimerMs) * 100
}

function formatCountdown(boss: PlanetBossEvent): string {
  const remaining = Math.max(0, boss.enrageTimerMs - (now.value - boss.startTime))
  const secs = Math.ceil(remaining / 1000)
  const m = Math.floor(secs / 60)
    .toString()
    .padStart(2, '0')
  const s = (secs % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

function barColor(idx: number, total: number): string {
  const hue = total <= 1 ? 10 : (idx / (total - 1)) * 35
  return `hsl(${hue}, 90%, 48%)`
}

function barColorDark(idx: number, total: number): string {
  const hue = total <= 1 ? 10 : (idx / (total - 1)) * 35
  return `hsl(${hue}, 80%, 25%)`
}

// Flash on rescue event spawn
const showFlash = ref(false)
let flashTimeout: ReturnType<typeof setTimeout> | null = null

watch(
  () => bossStore.activeBosses.length,
  (newLen, oldLen) => {
    if (newLen <= oldLen) return
    showFlash.value = true
    if (flashTimeout) clearTimeout(flashTimeout)
    flashTimeout = setTimeout(() => {
      showFlash.value = false
    }, 1500)
  },
)

// ── Champion-Ankunft Flash + Toast + Sound ────────────────────────────────
const showChampionFlash = ref(false)
const showChampionArrivedToast = ref(false)
let championFlashTimeout: ReturnType<typeof setTimeout> | null = null
let championToastTimeout: ReturnType<typeof setTimeout> | null = null

function playChampionChimes() {
  const chimePaths = [
    '/sounds/chime_high.wav',
    '/sounds/chime_mid.wav',
    '/sounds/chime_high.wav',
    '/sounds/chime_low.wav',
  ]
  const delays = [0, 220, 500, 920]
  const volumes = [0.55, 0.9, 0.75, 0.5]

  chimePaths.forEach((path, i) => {
    setTimeout(() => {
      try {
        const audio = new Audio(path)
        audio.volume = volumes[i]
        audio.play().catch(() => {})
      } catch {
        // Audio nicht verfügbar
      }
    }, delays[i])
  })
}

watch(
  () => galaxyStore.championJustArrived,
  (arrived) => {
    if (!arrived) return

    showChampionFlash.value = true
    if (championFlashTimeout) clearTimeout(championFlashTimeout)
    championFlashTimeout = setTimeout(() => {
      showChampionFlash.value = false
    }, 2800)

    showChampionArrivedToast.value = true
    if (championToastTimeout) clearTimeout(championToastTimeout)
    championToastTimeout = setTimeout(() => {
      showChampionArrivedToast.value = false
    }, 3500)

    playChampionChimes()
  },
)

// Dropped material
const droppedMaterial = computed(() =>
  bossStore.lastDroppedMaterialId
    ? (MATERIALS.find((m) => m.id === bossStore.lastDroppedMaterialId) ?? null)
    : null,
)

// Victory toast
const showVictoryToast = ref(false)
const savedReward = ref(0)
const savedHadMaterial = ref(false)
const savedChampionName = ref<string | null>(null)
const savedChampionImage = computed(() => {
  if (!savedChampionName.value) return null
  return savedChampionName.value === 'Bard'
    ? '/img/BardAbilities/Bard.png'
    : `/img/champion/${savedChampionName.value}.jpg`
})

watch(
  () => bossStore.lastBossResult,
  (result) => {
    if (result === 'victory') {
      savedReward.value =
        bossStore.activeBoss?.rewardSlots
          .filter((s) => s.type === 'chimes')
          .reduce((sum, s) => sum + (s.amount ?? 0), 0) ?? 0
      savedHadMaterial.value =
        !!bossStore.activeBoss?.rewardSlots.some((s) => s.type === 'material')
      savedChampionName.value = bossStore.activeBoss?.homePlanetChampion ?? null
      showVictoryToast.value = true
      setTimeout(() => {
        showVictoryToast.value = false
      }, 3000)
    }
  },
)

// Defeat toast
const showDefeatToast = ref(false)

watch(
  () => bossStore.lastBossResult,
  (result) => {
    if (result === 'defeat') {
      showDefeatToast.value = true
      setTimeout(() => {
        showDefeatToast.value = false
      }, 3000)
    }
  },
)

// ── Galaxy-Boss-Spawn: Episches cinematisches Overlay ────────────────────────
const showGalaxyBossFlash = ref(false)
let bossFlashTimeout: ReturnType<typeof setTimeout> | null = null

watch(
  () => galaxyStore.galaxyBossJustSpawned,
  (spawned) => {
    if (!spawned) return
    showGalaxyBossFlash.value = true
    if (bossFlashTimeout) clearTimeout(bossFlashTimeout)
    bossFlashTimeout = setTimeout(() => {
      showGalaxyBossFlash.value = false
    }, 4500)
  },
)
</script>

<style scoped>
/* ─── Vignette Flash (normaler Rescue-Spawn) ─────────────────────────────── */
.planet-vignette {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 15;
  background: radial-gradient(
    ellipse at center,
    transparent 35%,
    rgba(255, 55, 0, 0.28) 75%,
    rgba(255, 30, 0, 0.45) 100%
  );
}

.vignette-fade-enter-active {
  animation: vignetteIn 0.25s ease-out;
}
.vignette-fade-leave-active {
  animation: vignetteOut 1.3s ease-in forwards;
}

@keyframes vignetteIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
@keyframes vignetteOut {
  0% {
    opacity: 1;
  }
  100% {
    opacity: 0;
  }
}

/* ─── Galaxy-Boss Cinematic Overlay ──────────────────────────────────────── */
.galaxy-boss-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  background: radial-gradient(
    ellipse at center,
    rgba(80, 0, 120, 0.92) 0%,
    rgba(40, 0, 60, 0.88) 40%,
    rgba(150, 10, 10, 0.75) 70%,
    rgba(0, 0, 0, 0.95) 100%
  );
  animation:
    boss-screen-shake 0.5s ease-in-out 0.3s,
    boss-pulse-bg 1.2s ease-in-out infinite alternate;
}

@keyframes boss-screen-shake {
  0%,
  100% {
    transform: translateX(0) translateY(0);
  }
  10% {
    transform: translateX(-8px) translateY(-4px);
  }
  30% {
    transform: translateX(8px) translateY(3px);
  }
  50% {
    transform: translateX(-6px) translateY(-2px);
  }
  70% {
    transform: translateX(6px) translateY(4px);
  }
  90% {
    transform: translateX(-3px) translateY(-1px);
  }
}

@keyframes boss-pulse-bg {
  from {
    filter: brightness(1);
  }
  to {
    filter: brightness(1.35);
  }
}

.galaxy-boss-rings {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.boss-ring {
  position: absolute;
  border-radius: 50%;
  border: 3px solid;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%) scale(0);
  animation: boss-ring-expand 2s ease-out forwards;
}

.boss-ring--1 {
  width: 200px;
  height: 200px;
  border-color: rgba(200, 30, 10, 0.8);
  animation-delay: 0.1s;
}

.boss-ring--2 {
  width: 400px;
  height: 400px;
  border-color: rgba(160, 0, 200, 0.6);
  animation-delay: 0.4s;
}

.boss-ring--3 {
  width: 650px;
  height: 650px;
  border-color: rgba(255, 60, 20, 0.35);
  animation-delay: 0.7s;
}

@keyframes boss-ring-expand {
  0% {
    transform: translate(-50%, -50%) scale(0);
    opacity: 1;
  }
  60% {
    opacity: 0.8;
  }
  100% {
    transform: translate(-50%, -50%) scale(1);
    opacity: 0;
  }
}

.galaxy-boss-text {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  animation: boss-text-appear 0.6s cubic-bezier(0.22, 1.5, 0.4, 1) 0.2s both;
}

@keyframes boss-text-appear {
  from {
    opacity: 0;
    transform: scale(0.4);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.boss-alert-line {
  font-size: 14px;
  letter-spacing: 4px;
  color: #ff6040;
  text-shadow:
    0 0 12px rgba(255, 80, 20, 0.9),
    0 0 24px rgba(255, 60, 0, 0.6);
  animation: boss-text-flicker 0.15s steps(1) 0.8s 4;
}

.boss-title-line {
  font-size: 28px;
  letter-spacing: 6px;
  color: #e8c040;
  text-shadow:
    0 0 20px rgba(232, 192, 64, 0.95),
    0 0 40px rgba(200, 80, 0, 0.7),
    0 0 60px rgba(150, 20, 200, 0.5);
  animation: boss-title-glow 1.5s ease-in-out infinite alternate;
}

@keyframes boss-text-flicker {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0;
  }
}

@keyframes boss-title-glow {
  from {
    text-shadow:
      0 0 20px rgba(232, 192, 64, 0.95),
      0 0 40px rgba(200, 80, 0, 0.7);
  }
  to {
    text-shadow:
      0 0 30px rgba(255, 220, 80, 1),
      0 0 60px rgba(255, 100, 0, 0.9),
      0 0 90px rgba(180, 40, 255, 0.6);
  }
}

.galaxy-boss-fade-enter-active {
  animation: boss-fade-in 0.4s ease-out forwards;
}
.galaxy-boss-fade-leave-active {
  animation: boss-fade-out 0.8s ease-in forwards;
}

@keyframes boss-fade-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
@keyframes boss-fade-out {
  from {
    opacity: 1;
  }
  to {
    opacity: 0;
  }
}

/* ─── Champion-Ankunft Vignette — FEUERROT mit Doppelpuls (abgeschwächt) ───── */
.planet-vignette--champion {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 15;
  background: radial-gradient(
    ellipse at center,
    rgba(255, 60, 0, 0.04) 0%,
    rgba(220, 20, 0, 0.07) 30%,
    rgba(180, 0, 0, 0.18) 60%,
    rgba(140, 0, 0, 0.32) 80%,
    rgba(80, 0, 0, 0.44) 100%
  );
}

.champion-vignette-fade-enter-active {
  animation: championVignetteIn 0.12s ease-out;
}
.champion-vignette-fade-leave-active {
  animation: championVignetteOut 2.8s ease-in forwards;
}

@keyframes championVignetteIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

/* Pulsiert zweimal synchron mit dem Herz-Rhythmus der Planeten-Animation */
@keyframes championVignetteOut {
  0% {
    opacity: 1;
    filter: brightness(1);
  }
  12% {
    opacity: 0.35;
    filter: brightness(0.8);
  }
  22% {
    opacity: 0.62;
    filter: brightness(1.15);
  }
  35% {
    opacity: 0.28;
    filter: brightness(0.75);
  }
  48% {
    opacity: 0.5;
    filter: brightness(1.08);
  }
  100% {
    opacity: 0;
    filter: brightness(1);
  }
}

/* ─── Bar Stack Container ─────────────────────────────────────────────────── */
.planet-bar-stack {
  position: relative;
  width: 100%;
  max-width: 1400px;
  pointer-events: none;
  display: flex;
  flex-direction: column;
}

/* ─── Individual Countdown Bar ────────────────────────────────────────────── */
.planet-countdown-bar {
  position: relative;
  width: 100%;
  height: 20px;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
}

.planet-countdown-bar + .planet-countdown-bar {
  border-top: 1px solid rgba(0, 0, 0, 0.35);
}

.planet-countdown-fill {
  position: absolute;
  height: 100%;
  background: linear-gradient(90deg, var(--bar-color), var(--bar-color-dark));
  box-shadow:
    0 0 10px color-mix(in srgb, var(--bar-color) 70%, transparent),
    0 0 22px color-mix(in srgb, var(--bar-color) 35%, transparent);
  transition: width 0.2s linear;
}

.planet-countdown-fill--left {
  border-radius: 3px 0 0 3px;
}

.planet-countdown-fill--right {
  border-radius: 0 3px 3px 0;
}

.planet-countdown-label {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  white-space: nowrap;
  pointer-events: none;
  color: #fff;
  text-shadow:
    0 0 6px rgba(0, 0, 0, 0.95),
    0 1px 3px rgba(0, 0, 0, 0.85);
  z-index: 1;
}

/* ─── Bar Stack Transitions ───────────────────────────────────────────────── */
.bar-stack-enter-active {
  animation: barSlideIn 0.3s cubic-bezier(0.22, 1, 0.36, 1);
}
.bar-stack-leave-active {
  animation: barSlideOut 0.28s ease-in forwards;
  position: absolute;
  width: 100%;
  top: 0;
}
.bar-stack-move {
  transition: transform 0.3s ease;
}

@keyframes barSlideIn {
  from {
    opacity: 0;
    transform: translateY(-100%);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
@keyframes barSlideOut {
  from {
    opacity: 1;
    transform: translateY(0);
  }
  to {
    opacity: 0;
    transform: translateY(-100%);
  }
}

@media (prefers-reduced-motion: reduce) {
  .bar-stack-enter-active,
  .bar-stack-leave-active,
  .bar-stack-move {
    animation: none !important;
    transition: none !important;
  }
}

/* ─── Toasts (Basis) ───────────────────────────────────────────────────────── */
.planet-toast {
  position: fixed;
  top: 15vh;
  left: 50%;
  transform: translateX(-50%);
  z-index: 60;
  padding: 0.65rem 1.5rem;
  border-radius: 4px;
  font-weight: 700;
  font-size: 0.95rem;
  text-align: center;
  pointer-events: none;
  box-shadow:
    0 8px 32px rgba(0, 0, 0, 0.7),
    inset 0 1px 0 rgba(255, 255, 255, 0.06);
}

/* ─── Lost Toast ───────────────────────────────────────────────────────────── */
.planet-toast--lost {
  background: var(--rpg-bg-red-subtle);
  border: 1px solid var(--rpg-danger);
  color: var(--rpg-danger);
  box-shadow:
    0 0 0 1px rgba(255, 60, 0, 0.08),
    0 0 20px rgba(255, 50, 0, 0.35),
    0 12px 40px rgba(0, 0, 0, 0.75),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
  text-shadow: 0 0 12px rgba(255, 60, 0, 0.6);
}

/* ─── Saved Toast ──────────────────────────────────────────────────────────── */
.planet-toast--saved {
  background: var(--rpg-bg-green-subtle);
  border: 1px solid var(--rpg-green-border);
  color: var(--rpg-green-light);
  box-shadow:
    0 0 0 1px rgba(70, 220, 120, 0.07),
    0 0 20px rgba(60, 200, 100, 0.3),
    0 12px 40px rgba(0, 0, 0, 0.75),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
  text-shadow: 0 0 10px rgba(60, 220, 100, 0.55);
}

/* ─── Champion-Ankunft Toast — FEUERROT ──────────────────────────────────── */
.planet-toast--champion-arrived {
  background: rgba(60, 0, 0, 0.94);
  border: 1px solid rgba(255, 40, 0, 0.8);
  color: rgba(255, 160, 120, 1);
  letter-spacing: 0.06em;
  box-shadow:
    0 0 0 1px rgba(255, 30, 0, 0.15),
    0 0 20px rgba(255, 30, 0, 0.55),
    0 0 50px rgba(200, 0, 0, 0.35),
    0 12px 40px rgba(0, 0, 0, 0.88),
    inset 0 1px 0 rgba(255, 100, 60, 0.08);
  text-shadow:
    0 0 12px rgba(255, 60, 0, 0.95),
    0 0 28px rgba(200, 0, 0, 0.7);
}

/* ─── Toast sub-content ────────────────────────────────────────────────────── */
.toast-material {
  font-size: 0.74rem;
  font-weight: 500;
  opacity: 0.88;
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.toast-material--none {
  opacity: 0.45;
}

.toast-material--champion {
  color: var(--rpg-blue);
  font-weight: 700;
  flex-wrap: wrap;
}

.toast-material-img--champion {
  filter: drop-shadow(0 0 4px rgba(80, 160, 255, 0.65));
}

.toast-material-img {
  width: 1.4rem;
  height: 1.4rem;
  object-fit: contain;
  vertical-align: middle;
  filter: drop-shadow(0 0 4px rgba(255, 200, 100, 0.55));
}

/* ─── Toast Transition ─────────────────────────────────────────────────────── */
.toast-slide-enter-active {
  animation: toastIn 0.3s cubic-bezier(0.22, 1, 0.36, 1);
}
.toast-slide-leave-active {
  animation: toastOut 0.4s ease-in forwards;
}

@keyframes toastIn {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(-14px) scale(0.95);
    filter: blur(3px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0) scale(1);
    filter: blur(0);
  }
}
@keyframes toastOut {
  from {
    opacity: 1;
    transform: translateX(-50%) translateY(0) scale(1);
  }
  to {
    opacity: 0;
    transform: translateX(-50%) translateY(-10px) scale(0.96);
  }
}
</style>
