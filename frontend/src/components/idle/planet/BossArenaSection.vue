<template>
  <div ref="arenaEl" class="arena" :class="{ 'arena--galaxy': isGalaxyBoss }">
    <div ref="planetStageRef" class="planet-bg" :class="{ 'planet-bg--galaxy': isGalaxyBoss }" />

    <div
      class="boss-wrapper"
      :class="{
        'boss-wrapper--hit': isHit,
        'boss-wrapper--critical': bossHPPercent < 25,
      }"
    >
      <div
        class="boss-aura"
        :class="{
          'boss-aura--galaxy': isGalaxyBoss,
          'boss-aura--critical': bossHPPercent < 25,
        }"
      />
      <img :src="bossImage" class="boss-img" alt="Boss" @click="handleClick($event)" />
      <div class="boss-ground-shadow" />
    </div>

    <!-- Champion Semicircle Arc -->
    <div v-if="teamChampions.length" class="champ-arc">
      <div
        v-for="(name, i) in teamChampions"
        :key="name"
        class="champ-arc-item"
        :style="champArcStyle(i, teamChampions.length)"
      >
        <div class="champ-striker" :class="{ 'champ-striker--ult': ultActives[i] }">
          <div class="champ-charge">
            <span
              v-for="p in 4"
              :key="p"
              class="champ-pip"
              :class="{
                'champ-pip--active': (attackCounts[i] ?? 0) % 5 >= p,
                'champ-pip--ready': (attackCounts[i] ?? 0) % 5 === 4,
              }"
            />
          </div>
          <div class="champ-portrait" :class="{ 'champ-portrait--ulting': ultActives[i] }">
            <img
              :src="getChampionImage(name)"
              :alt="name"
              class="champ-avatar"
              @error="($event.target as HTMLImageElement).style.display = 'none'"
            />
            <div class="champ-dmg">⚔ {{ championDamage ?? 1 }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Floating Damage Numbers -->
    <Teleport to="body">
      <div class="dmg-overlay" aria-hidden="true">
        <TransitionGroup name="dmg-float">
          <span
            v-for="dmg in damageFloats"
            :key="dmg.id"
            class="damage-number"
            :style="{ left: dmg.x + 'px', top: dmg.y + 'px' }"
          >
            -{{ formatNumber(dmg.value) }}
          </span>
        </TransitionGroup>
      </div>
    </Teleport>

    <!-- Enrage Timer: komplett ausblenden wenn Champion-Planet (kein Ablauftimer) -->
    <div
      v-if="showEnrageTimer"
      class="enrage-ring"
      :class="{ 'enrage-ring--urgent': effectiveSecondsRemaining < 10 }"
      title="Enrage-Timer"
    >
      <svg viewBox="0 0 60 60" class="enrage-svg" aria-hidden="true">
        <circle cx="30" cy="30" r="24" class="enrage-track" />
        <circle
          cx="30"
          cy="30"
          r="24"
          class="enrage-arc"
          :class="{ 'enrage-arc--urgent': effectiveSecondsRemaining < 10 }"
          :style="{ strokeDasharray: `${effectiveEnragePercent * 1.508} 150.8` }"
        />
      </svg>
      <span class="enrage-seconds">{{ effectiveSecondsRemaining }}</span>
      <span class="enrage-label">SEK</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, reactive, nextTick, computed } from 'vue'
import { NS, drawPlanet } from '../../../utils/planetDraw'
import { usePlanetBossStore } from '../../../stores/planetBossStore'
import { useStarGroupStore } from '../../../stores/starGroupStore'
import { formatNumber } from '../../../config/numberFormat'
import type { PlanetBossEvent } from '../../../types'

const CYCLE_MS = 2600
const IMPACT_OFFSET_MS = Math.round(0.36 * CYCLE_MS)
const STAGGER_MS = 650

const props = defineProps<{
  isGalaxyBoss: boolean
  bossHPPercent: number
  secondsRemaining: number
  enragePercent: number
  teamChampions: string[]
  getChampionImage: (name: string) => string
  activeBoss: PlanetBossEvent | null
  championDamage?: number
}>()

const emit = defineEmits<{ shake: [ms: number] }>()

const bossStore = usePlanetBossStore()
const starGroupStore = useStarGroupStore()

// Prüft ob der aktive Boss zu einem Champion-Stern gehört.
// Greift sowohl auf isChampionPlanet als auch auf den starGroupStore zurück,
// damit auch Planeten erfasst werden die nicht direkt als isChampionPlanet markiert sind.
const isChampionStarPlanet = computed<boolean>(() => {
  if (!props.activeBoss) return false
  if (props.activeBoss.isChampionPlanet) return true
  // Zusätzlich: prüfe ob die planetId zu einem champion-Stern im starGroupStore gehört
  const planetId = props.activeBoss.planetId
  return starGroupStore.activeStars.some(
    (star) =>
      star.starType === 'champion' && star.planetSlots.some((slot) => slot.planetId === planetId),
  )
})

// Timer nur anzeigen wenn kein Champion-Stern-Planet
const showEnrageTimer = computed<boolean>(() => !isChampionStarPlanet.value)

// Effektive Werte: bei Champion-Planeten auf 0 fixieren (Fallback-Schutz)
const effectiveSecondsRemaining = computed<number>(() =>
  isChampionStarPlanet.value ? 0 : props.secondsRemaining,
)
const effectiveEnragePercent = computed<number>(() =>
  isChampionStarPlanet.value ? 0 : props.enragePercent,
)

// ── Boss image discovery ──────────────────────────────────────────────────
const arenaEl = ref<HTMLDivElement | null>(null)
const planetStageRef = ref<HTMLDivElement | null>(null)
const bossImage = ref('/img/Boss/Boss1.png')
const bossImageList = ref<string[]>([])
let discoveryDone = false
let discoveryPromise: Promise<void> | null = null

function discoverBossImages(): Promise<void> {
  if (discoveryDone) return Promise.resolve()
  if (discoveryPromise) return discoveryPromise
  discoveryPromise = (async () => {
    const found: string[] = []
    let i = 1
    while (true) {
      const path = `/img/Boss/Boss${i}.png`
      const exists = await new Promise<boolean>((resolve) => {
        const img = new Image()
        img.onload = () => resolve(true)
        img.onerror = () => resolve(false)
        img.src = path
      })
      if (!exists) break
      found.push(path)
      i++
    }
    bossImageList.value = found.length > 0 ? found : ['/img/Boss/Boss1.png']
    discoveryDone = true
  })()
  return discoveryPromise
}

function pickRandomBossImage(): string {
  const list = bossImageList.value
  return list.length > 0 ? list[Math.floor(Math.random() * list.length)] : '/img/Boss/Boss1.png'
}

function renderPlanet() {
  if (!planetStageRef.value || !props.activeBoss) return
  planetStageRef.value.innerHTML = ''
  const svg = document.createElementNS(NS, 'svg') as SVGSVGElement
  svg.setAttribute('width', '280')
  svg.setAttribute('height', '280')
  svg.setAttribute('viewBox', '0 0 280 280')
  svg.style.width = '100%'
  svg.style.height = '100%'
  const radius = props.isGalaxyBoss ? 138 : 120
  drawPlanet(svg, `boss-${Date.now()}`, props.activeBoss.planetType, 140, 140, radius)
  planetStageRef.value.appendChild(svg)
}

// ── Damage floats ─────────────────────────────────────────────────────────
const isHit = ref(false)
let dmgIdCounter = 0
const damageFloats = reactive<Array<{ id: number; value: number; x: number; y: number }>>([])

function spawnFloat(value: number, x?: number, y?: number) {
  const id = ++dmgIdCounter
  let fx = x ?? window.innerWidth / 2
  let fy = y ?? window.innerHeight / 2
  if (!x && arenaEl.value) {
    const r = arenaEl.value.getBoundingClientRect()
    fx = r.left + r.width * (0.4 + Math.random() * 0.2)
    fy = r.top + r.height * (0.2 + Math.random() * 0.3)
  }
  damageFloats.push({ id, value, x: fx, y: fy })
  setTimeout(
    () => {
      const idx = damageFloats.findIndex((d) => d.id === id)
      if (idx !== -1) damageFloats.splice(idx, 1)
    },
    value > 1 ? 1100 : 900,
  )
}

function triggerHit(hitMs: number, shakeMs: number) {
  isHit.value = true
  emit('shake', shakeMs)
  setTimeout(() => {
    isHit.value = false
  }, hitMs)
}

function handleClick(event: MouseEvent) {
  const boss = props.activeBoss
  if (!boss || boss.defeated || boss.expired) return
  bossStore.dealClickDamage()
  spawnFloat(boss.clickDamagePerHit, event.clientX, event.clientY)
  triggerHit(160, 320)
}

function handleChampionHit() {
  if (!props.activeBoss || props.activeBoss.defeated || props.activeBoss.expired) return
  bossStore.dealDamage(1)
  triggerHit(140, 280)
  spawnFloat(1)
}

function handleChampionUlt() {
  if (!props.activeBoss || props.activeBoss.defeated || props.activeBoss.expired) return
  bossStore.dealDamage(5)
  triggerHit(280, 520)
  spawnFloat(5)
}

// ── Champion attack state & timers ───────────────────────────────────────
const attackCounts = reactive<number[]>([])
const ultActives = reactive<boolean[]>([])
const _hitTimeouts: number[] = []
const _hitIntervals: number[] = []
const _ultTimeouts: number[] = []

const ULT_EVERY = 5
const ULT_ANIM_MS = 3400

function fireAttack(i: number) {
  if (!props.activeBoss || props.activeBoss.defeated || props.activeBoss.expired) return
  attackCounts[i] = (attackCounts[i] ?? 0) + 1
  const count = attackCounts[i]
  if (count % ULT_EVERY === 0) {
    ultActives[i] = true
    handleChampionUlt()
    _ultTimeouts.push(
      window.setTimeout(() => {
        ultActives[i] = false
      }, ULT_ANIM_MS),
    )
  } else if (!ultActives[i]) {
    handleChampionHit()
  }
}

function startAttackCycles() {
  stopAttackCycles()
  if (!props.activeBoss) return
  props.teamChampions.forEach((_, i) => {
    attackCounts[i] = 0
    ultActives[i] = false
  })
  props.teamChampions.forEach((_, i) => {
    const initialDelay = i * STAGGER_MS + IMPACT_OFFSET_MS
    _hitTimeouts.push(
      window.setTimeout(() => {
        fireAttack(i)
        _hitIntervals.push(window.setInterval(() => fireAttack(i), CYCLE_MS))
      }, initialDelay),
    )
  })
}

function stopAttackCycles() {
  _hitTimeouts.forEach(clearTimeout)
  _hitIntervals.forEach(clearInterval)
  _ultTimeouts.forEach(clearTimeout)
  _hitTimeouts.length = 0
  _hitIntervals.length = 0
  _ultTimeouts.length = 0
}

onMounted(async () => {
  await discoverBossImages()
  bossImage.value = pickRandomBossImage()
  await nextTick()
  renderPlanet()
  startAttackCycles()
})
onUnmounted(() => stopAttackCycles())

watch(
  () => props.activeBoss?.planetId,
  async (newId) => {
    if (newId) {
      bossImage.value = pickRandomBossImage()
      await nextTick()
      renderPlanet()
    }
  },
)
watch(
  () => [props.teamChampions.length, props.activeBoss?.planetId] as const,
  () => startAttackCycles(),
)

function champArcStyle(i: number, total: number): Record<string, string> {
  const span = total > 1 ? Math.min(160, 70 + (total - 1) * 45) : 0
  const startAngle = -span / 2
  const step = total > 1 ? span / (total - 1) : 0
  const angleDeg = startAngle + i * step
  const angleRad = (angleDeg * Math.PI) / 180
  const radius = 115
  const tx = Math.sin(angleRad) * radius
  const ty = Math.cos(angleRad) * radius
  const mag = Math.sqrt(tx * tx + ty * ty) || 1
  const strikeX = ((-tx / mag) * 62).toFixed(1)
  const strikeY = ((-ty / mag) * 62).toFixed(1)
  const stagger = (i * 0.65).toFixed(2)
  return {
    transform: `translate(calc(${tx.toFixed(1)}px - 50%), calc(${ty.toFixed(1)}px - 50%))`,
    '--strike-x': `${strikeX}px`,
    '--strike-y': `${strikeY}px`,
    '--strike-delay': `${stagger}s`,
  }
}
</script>

<style scoped>
/* ══════════════════════════════════════════════════════════════════════════════
   BATTLE ARENA
══════════════════════════════════════════════════════════════════════════════ */
.arena {
  position: relative;
  width: 100%;
  aspect-ratio: 1 / 0.65;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background: radial-gradient(ellipse at 50% 100%, rgba(80, 30, 0, 0.4) 0%, transparent 70%);
}

.arena--galaxy {
  background: radial-gradient(
    ellipse at 50% 60%,
    rgba(60, 0, 90, 0.5) 0%,
    rgba(5, 0, 15, 0.95) 100%
  );
}

.arena--galaxy::before {
  content: '';
  position: absolute;
  inset: 0;
  background:
    radial-gradient(1px 1px at 15% 20%, rgba(255, 255, 255, 0.8) 0%, transparent 0%),
    radial-gradient(1px 1px at 75% 12%, rgba(255, 255, 255, 0.6) 0%, transparent 0%),
    radial-gradient(1px 1px at 88% 55%, rgba(255, 255, 255, 0.7) 0%, transparent 0%),
    radial-gradient(1px 1px at 35% 80%, rgba(200, 150, 255, 0.5) 0%, transparent 0%),
    radial-gradient(1px 1px at 55% 35%, rgba(150, 200, 255, 0.6) 0%, transparent 0%),
    radial-gradient(2px 2px at 22% 60%, rgba(180, 100, 255, 0.4) 0%, transparent 0%),
    radial-gradient(1px 1px at 92% 30%, rgba(255, 180, 200, 0.5) 0%, transparent 0%),
    radial-gradient(1px 1px at 10% 75%, rgba(255, 255, 255, 0.5) 0%, transparent 0%),
    radial-gradient(1px 1px at 65% 90%, rgba(200, 200, 255, 0.4) 0%, transparent 0%);
  pointer-events: none;
}

.arena::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(200, 100, 0, 0.5), transparent);
}

.planet-bg {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0.22;
  pointer-events: none;
}

.planet-bg--galaxy {
  opacity: 0.5;
  animation: planet-glow-pulse 2.5s ease-in-out infinite alternate;
}

@keyframes planet-glow-pulse {
  from {
    filter: drop-shadow(0 0 10px rgba(140, 40, 200, 0.5));
  }
  to {
    filter: drop-shadow(0 0 28px rgba(200, 80, 255, 0.9));
  }
}

/* ── Boss Wrapper ─────────────────────────────────────────────────────────── */
.boss-wrapper {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  animation: boss-idle 3s ease-in-out infinite;
}

.boss-wrapper--hit {
  animation: boss-hit 0.16s ease-out both;
}
.boss-wrapper--critical {
  animation: boss-idle-critical 1.2s ease-in-out infinite;
}

@keyframes boss-idle {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-8px);
  }
}

@keyframes boss-hit {
  0% {
    transform: translateX(0) scale(1);
    filter: brightness(1);
  }
  25% {
    transform: translateX(-6px) scale(0.97);
    filter: brightness(3) saturate(0);
  }
  75% {
    transform: translateX(6px) scale(1.02);
    filter: brightness(2.5) saturate(0);
  }
  100% {
    transform: translateX(0) scale(1);
    filter: brightness(1);
  }
}

@keyframes boss-idle-critical {
  0%,
  100% {
    transform: translateY(0) rotate(-0.5deg);
  }
  50% {
    transform: translateY(-5px) rotate(0.5deg);
  }
}

/* ── Boss Aura ────────────────────────────────────────────────────────────── */
.boss-aura {
  position: absolute;
  inset: -20%;
  border-radius: 50%;
  background: radial-gradient(ellipse at center, rgba(255, 80, 0, 0.15) 0%, transparent 70%);
  animation: aura-pulse 2s ease-in-out infinite alternate;
  pointer-events: none;
  z-index: 0;
}

.boss-aura--galaxy {
  background: radial-gradient(ellipse at center, rgba(180, 40, 255, 0.2) 0%, transparent 70%);
  animation: aura-pulse-galaxy 1.8s ease-in-out infinite alternate;
}
.boss-aura--critical {
  background: radial-gradient(ellipse at center, rgba(255, 0, 0, 0.3) 0%, transparent 65%);
  animation: aura-pulse-critical 0.6s ease-in-out infinite alternate;
}

@keyframes aura-pulse {
  from {
    opacity: 0.6;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1.05);
  }
}
@keyframes aura-pulse-galaxy {
  from {
    opacity: 0.7;
    transform: scale(0.93);
    filter: blur(4px);
  }
  to {
    opacity: 1;
    transform: scale(1.08);
    filter: blur(8px);
  }
}
@keyframes aura-pulse-critical {
  from {
    opacity: 0.8;
    transform: scale(0.98);
  }
  to {
    opacity: 1;
    transform: scale(1.04);
  }
}

/* ── Boss Image ───────────────────────────────────────────────────────────── */
.boss-img {
  position: relative;
  z-index: 1;
  height: 78%;
  width: auto;
  max-width: 55%;
  object-fit: contain;
  image-rendering: pixelated;
  filter: drop-shadow(0 0 18px rgba(255, 80, 0, 0.45)) drop-shadow(0 8px 16px rgba(0, 0, 0, 0.8));
  cursor: pointer;
  transition:
    filter 0.12s ease,
    transform 0.1s ease;
  display: block;
}

.boss-img:hover {
  transform: scale(1.05);
  filter: drop-shadow(0 0 28px rgba(255, 110, 20, 0.7)) drop-shadow(0 8px 16px rgba(0, 0, 0, 0.9));
}
.boss-img:active {
  transform: scale(0.95);
}

.boss-ground-shadow {
  position: absolute;
  bottom: -8px;
  left: 50%;
  transform: translateX(-50%);
  width: 60%;
  height: 12px;
  background: radial-gradient(ellipse at center, rgba(0, 0, 0, 0.7) 0%, transparent 70%);
  pointer-events: none;
  z-index: 0;
}

/* ── Enrage Ring ─────────────────────────────────────────────────────────── */
.enrage-ring {
  position: absolute;
  top: 8px;
  right: 10px;
  width: 56px;
  height: 56px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.enrage-svg {
  position: absolute;
  inset: 0;
  transform: rotate(-90deg);
  overflow: visible;
}

.enrage-track {
  fill: none;
  stroke: rgba(255, 255, 255, 0.1);
  stroke-width: 3;
}

.enrage-arc {
  fill: none;
  stroke: var(--rpg-gold, #c8922a);
  stroke-width: 3.5;
  stroke-linecap: round;
  stroke-dashoffset: 0;
  transition:
    stroke-dasharray 0.22s linear,
    stroke 0.3s;
  filter: drop-shadow(0 0 4px rgba(200, 146, 42, 0.8));
}

.enrage-arc--urgent {
  stroke: #ff3300;
  filter: drop-shadow(0 0 6px rgba(255, 50, 0, 1));
  animation: arc-flash 0.5s ease-in-out infinite alternate;
}

@keyframes arc-flash {
  from {
    opacity: 1;
  }
  to {
    opacity: 0.4;
  }
}

.enrage-seconds {
  font-size: 1rem;
  font-weight: 900;
  color: var(--rpg-gold, #c8922a);
  letter-spacing: 0.02em;
  line-height: 1;
  text-shadow: 0 0 6px rgba(200, 146, 42, 0.8);
  z-index: 1;
}

.enrage-ring--urgent .enrage-seconds {
  color: #ff3300;
  text-shadow: 0 0 8px rgba(255, 50, 0, 1);
  animation: arc-flash 0.5s ease-in-out infinite alternate;
}

.enrage-label {
  font-size: 0.48rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  color: rgba(200, 146, 42, 0.6);
  text-transform: uppercase;
  z-index: 1;
  margin-top: 0.05rem;
}

/* ══════════════════════════════════════════════════════════════════════════════
   CHAMPION ARC
══════════════════════════════════════════════════════════════════════════════ */
.champ-arc {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 0;
  height: 0;
  z-index: 3;
  pointer-events: none;
}

.champ-arc-item {
  position: absolute;
  left: 0;
  top: 0;
}

.champ-striker {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  animation: champ-strike 2.6s ease-in-out infinite;
  animation-delay: var(--strike-delay, 0s);
}

.champ-portrait {
  position: relative;
  width: 72px;
  height: 72px;
  flex-shrink: 0;
  border-radius: 3px;
  border: 2px solid rgba(200, 146, 42, 0.55);
  box-shadow:
    0 0 8px rgba(0, 0, 0, 0.7),
    inset 0 0 0 1px rgba(255, 200, 80, 0.1);
  overflow: hidden;
}

.champ-avatar {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
  object-position: center top;
  image-rendering: pixelated;
}

.champ-dmg {
  position: absolute;
  bottom: 0;
  right: 0;
  padding: 1px 4px 1px 3px;
  background: rgba(10, 6, 0, 0.88);
  border-top: 1px solid rgba(200, 146, 42, 0.5);
  border-left: 1px solid rgba(200, 146, 42, 0.5);
  border-radius: 3px 0 3px 0;
  font-size: 0.52rem;
  font-weight: 900;
  color: #e8c040;
  letter-spacing: 0.02em;
  text-shadow: 0 0 4px rgba(232, 192, 64, 0.7);
  pointer-events: none;
  line-height: 1.2;
}

/* ── Charge Pips ─────────────────────────────────────────────────────────── */
.champ-charge {
  display: flex;
  gap: 3px;
  justify-content: center;
  margin-bottom: 3px;
}

.champ-pip {
  width: 10px;
  height: 4px;
  border-radius: 2px;
  background: rgba(20, 12, 0, 0.85);
  border: 1px solid rgba(80, 50, 0, 0.6);
  transition:
    background 0.18s,
    box-shadow 0.18s;
}

.champ-pip--active {
  background: linear-gradient(to right, #c8922a, #e8c040);
  border-color: rgba(232, 192, 64, 0.7);
  box-shadow: 0 0 4px rgba(232, 192, 64, 0.6);
}

.champ-pip--ready {
  animation: pip-pulse 0.45s ease-in-out infinite alternate;
}

@keyframes pip-pulse {
  from {
    box-shadow: 0 0 4px rgba(232, 192, 64, 0.7);
  }
  to {
    box-shadow: 0 0 10px rgba(255, 220, 60, 1);
    filter: brightness(1.4);
  }
}

/* ── Portrait ult state ───────────────────────────────────────────────────── */
.champ-portrait--ulting {
  border-color: #e8c040;
  box-shadow:
    0 0 16px rgba(232, 192, 64, 0.9),
    0 0 32px rgba(255, 210, 60, 0.5),
    inset 0 0 0 1px rgba(255, 220, 80, 0.35);
}

/* ── Ultimate Strike Animation ───────────────────────────────────────────── */
.champ-striker--ult {
  animation: champ-ult 3.4s ease-in-out forwards !important;
}

@keyframes champ-ult {
  0% {
    transform: translate(0, 0) scale(1);
    filter: brightness(1);
  }
  7% {
    transform: translate(calc(var(--strike-x) * -0.22), calc(var(--strike-y) * -0.22)) scale(0.82);
    filter: brightness(0.65);
  }
  18% {
    transform: translate(calc(var(--strike-x) * -0.08), calc(var(--strike-y) * -0.08)) scale(1.22);
    filter: brightness(2.8) saturate(2.2) hue-rotate(-5deg);
  }
  32% {
    transform: translate(calc(var(--strike-x) * 1.55), calc(var(--strike-y) * 1.55)) scale(1.55);
    filter: brightness(5) saturate(3);
  }
  38% {
    transform: translate(calc(var(--strike-x) * 1.35), calc(var(--strike-y) * 1.35)) scale(1.3);
    filter: brightness(9) saturate(0.1);
  }
  52% {
    transform: translate(calc(var(--strike-x) * -0.14), calc(var(--strike-y) * -0.14)) scale(1.06);
    filter: brightness(2) saturate(1.8);
  }
  68% {
    transform: translate(0, 0) scale(1.04);
    filter: brightness(1.4) saturate(1.2);
  }
  100% {
    transform: translate(0, 0) scale(1);
    filter: brightness(1);
  }
}

@keyframes champ-strike {
  0%,
  18% {
    transform: translate(0, 0) scale(1);
    filter: brightness(1);
  }
  22% {
    transform: translate(calc(var(--strike-x) * -0.18), calc(var(--strike-y) * -0.18)) scale(0.92);
    filter: brightness(0.85);
  }
  36% {
    transform: translate(var(--strike-x), var(--strike-y)) scale(1.18);
    filter: brightness(2.2) saturate(1.4);
  }
  40% {
    transform: translate(calc(var(--strike-x) * 0.85), calc(var(--strike-y) * 0.85)) scale(1.08);
    filter: brightness(3) saturate(0.2);
  }
  56% {
    transform: translate(calc(var(--strike-x) * -0.08), calc(var(--strike-y) * -0.08)) scale(1.02);
    filter: brightness(1);
  }
  70%,
  100% {
    transform: translate(0, 0) scale(1);
    filter: brightness(1);
  }
}

/* ══════════════════════════════════════════════════════════════════════════════
   FLOATING DAMAGE NUMBERS
══════════════════════════════════════════════════════════════════════════════ */
.dmg-overlay {
  position: fixed;
  inset: 0;
  pointer-events: none;
  overflow: visible;
  z-index: 9999;
}

.damage-number {
  position: fixed;
  font-size: 1.4rem;
  font-weight: 900;
  color: #ffe040;
  text-shadow:
    0 0 6px #ff6600,
    0 0 12px #ff3300,
    0 1px 3px #000,
    -1px -1px 0 #000,
    1px -1px 0 #000,
    -1px 1px 0 #000,
    1px 1px 0 #000;
  pointer-events: none;
  white-space: nowrap;
  transform: translate(-50%, -50%);
  letter-spacing: 0.04em;
}

.dmg-float-enter-active {
  animation: dmgUp 0.9s cubic-bezier(0.2, 0.8, 0.4, 1) forwards;
}
.dmg-float-leave-active {
  display: none;
}

@keyframes dmgUp {
  0% {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1.3);
  }
  20% {
    opacity: 1;
    transform: translate(-50%, -70%) scale(1);
  }
  100% {
    opacity: 0;
    transform: translate(-50%, -130%) scale(0.7);
  }
}

@media (prefers-reduced-motion: reduce) {
  .boss-wrapper,
  .boss-wrapper--critical,
  .planet-bg--galaxy,
  .boss-aura,
  .champ-striker,
  .champ-striker--ult,
  .champ-pip--ready {
    animation: none !important;
  }
}
</style>
