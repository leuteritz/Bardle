<template>
  <Transition name="boss-entrance">
    <div
      v-if="bossStore.bossModalOpen"
      class="battle-backdrop"
      :class="{ 'battle-backdrop--shaking': isShaking }"
      aria-modal="true"
      role="dialog"
      @click.self="bossStore.closeBossModal()"
    >
      <!-- ── Atmospheric Embers ─────────────────────────────────────────── -->
      <div class="atmosphere" :class="{ 'atmosphere--galaxy': isGalaxyBoss }">
        <span v-for="i in 24" :key="i" class="ember" :style="emberStyle(i)" />
      </div>

      <div
        class="battle-modal"
        :class="{
          'battle-modal--section': bossStore.activeBoss?.isSectionBoss,
          'battle-modal--galaxy': isGalaxyBoss,
        }"
      >
        <!-- Corner rune decorations -->
        <div class="corner corner--tl" />
        <div class="corner corner--tr" />
        <div class="corner corner--bl" />
        <div class="corner corner--br" />

        <!-- ── Boss Name Banner ──────────────────────────────────────────── -->
        <div
          class="name-banner"
          :class="{
            'name-banner--galaxy': isGalaxyBoss,
            'name-banner--section': bossStore.activeBoss?.isSectionBoss,
          }"
        >
          <div v-if="isGalaxyBoss" class="boss-type-badge boss-type-badge--galaxy">
            ✦ GALAXIE-BOSS ✦
          </div>
          <div
            v-else-if="bossStore.activeBoss?.isSectionBoss"
            class="boss-type-badge boss-type-badge--section"
          >
            ★ SECTION BOSS ★
          </div>
          <h2
            class="boss-name"
            :class="{
              'boss-name--galaxy': isGalaxyBoss,
              'boss-name--section': bossStore.activeBoss?.isSectionBoss,
            }"
          >
            {{ bossStore.activeBoss?.bossName ?? 'Planet Boss' }}
          </h2>
        </div>

        <!-- ── Battle Arena ──────────────────────────────────────────────── -->
        <div class="arena" :class="{ 'arena--galaxy': isGalaxyBoss }">
          <div ref="planetStage" class="planet-bg" :class="{ 'planet-bg--galaxy': isGalaxyBoss }" />

          <!-- Boss aura + image -->
          <div
            class="boss-wrapper"
            :class="{
              'boss-wrapper--hit': isHit,
              'boss-wrapper--critical': bossStore.bossHPPercent < 25,
            }"
          >
            <div
              class="boss-aura"
              :class="{
                'boss-aura--galaxy': isGalaxyBoss,
                'boss-aura--section': bossStore.activeBoss?.isSectionBoss,
                'boss-aura--critical': bossStore.bossHPPercent < 25,
              }"
            />
            <img
              ref="bossImgEl"
              :src="bossImage"
              class="boss-img"
              alt="Boss"
              @click="handleClick($event)"
            />
            <div class="boss-ground-shadow" />
          </div>

          <!-- Circular Enrage Timer -->
          <div
            class="enrage-ring"
            :class="{ 'enrage-ring--urgent': secondsRemaining < 10 }"
            title="Enrage-Timer"
          >
            <svg viewBox="0 0 60 60" class="enrage-svg" aria-hidden="true">
              <circle cx="30" cy="30" r="24" class="enrage-track" />
              <circle
                cx="30"
                cy="30"
                r="24"
                class="enrage-arc"
                :class="{ 'enrage-arc--urgent': secondsRemaining < 10 }"
                :style="{ strokeDasharray: `${enragePercent * 1.508} 150.8` }"
              />
            </svg>
            <span class="enrage-seconds">{{ secondsRemaining }}</span>
            <span class="enrage-label">SEK</span>
          </div>
        </div>

        <!-- ── HP Bar ────────────────────────────────────────────────────── -->
        <div class="hp-section">
          <div class="hp-header">
            <span class="stat-label">❤ LEBEN</span>
            <span class="hp-numbers">
              {{ formatNumber(bossStore.activeBoss?.currentHP ?? 0) }}
              <span class="hp-sep">／</span>
              {{ formatNumber(bossStore.activeBoss?.maxHP ?? 0) }}
            </span>
          </div>
          <div
            class="hp-track"
            :class="{
              'hp-track--critical': bossStore.bossHPPercent < 25,
              'hp-track--galaxy': isGalaxyBoss,
            }"
          >
            <div
              class="hp-fill"
              :class="{
                'hp-fill--galaxy': isGalaxyBoss,
                'hp-fill--low': bossStore.bossHPPercent < 50 && !isGalaxyBoss,
                'hp-fill--critical': bossStore.bossHPPercent < 25,
              }"
              :style="{ width: bossStore.bossHPPercent + '%' }"
            />
            <div class="hp-segments">
              <div v-for="i in 9" :key="i" class="hp-seg-line" :style="{ left: i * 10 + '%' }" />
            </div>
          </div>
        </div>

        <!-- ── DPS Combat Stats ──────────────────────────────────────────── -->
        <div class="combat-row">
          <div class="stat-block">
            <span class="stat-label">⚔ DEIN DPS</span>
            <span class="stat-val">{{ formatNumber(estimatedPlayerDPS) }}/s</span>
          </div>
          <div class="verdict-badge" :class="canWin ? 'verdict--win' : 'verdict--lose'">
            {{ canWin ? '✓ SIEG' : '✗ NIEDERLAGE' }}
          </div>
          <div class="stat-block stat-block--right">
            <span class="stat-label">🛡 BENÖTIGT</span>
            <span class="stat-val">{{ formatNumber(requiredDPS) }}/s</span>
          </div>
        </div>

        <!-- Idle DPS -->
        <div class="passive-row">
          <span class="stat-label"
            >💤 Idle-Schaden:
            <span class="stat-val stat-val--dim"
              >{{ formatNumber(bossStore.activeBoss?.passiveDPS ?? 0) }}/s</span
            ></span
          >
        </div>

        <!-- ── Rewards ───────────────────────────────────────────────────── -->
        <div v-if="assignedMaterial || homePlanetChampion" class="loot-panel">
          <div class="loot-title">⚡ BELOHNUNG</div>
          <div class="loot-grid">
            <div v-if="assignedMaterial" class="loot-item">
              <span class="loot-icon">💎</span>
              <div class="loot-info">
                <span class="loot-label">Material</span>
                <span class="loot-name" :class="`rarity--${assignedMaterial.rarity}`">{{
                  assignedMaterial.name
                }}</span>
              </div>
              <span class="loot-chance"
                >{{ Math.round((bossStore.activeBoss?.assignedDropChance ?? 0) * 100) }}%</span
              >
            </div>
            <div v-if="homePlanetChampion" class="loot-item loot-item--champion">
              <img
                v-if="homePlanetChampionImage"
                :src="homePlanetChampionImage"
                :alt="homePlanetChampion"
                class="champion-portrait"
                @error="($event.target as HTMLImageElement).style.display = 'none'"
              />
              <div class="loot-info">
                <span class="loot-label">Champion</span>
                <span class="champion-name">{{ homePlanetChampion }}</span>
              </div>
              <span class="loot-hint">freischaltbar</span>
            </div>
          </div>
        </div>

        <!-- Atmospheric scanlines -->
        <div class="scanlines" aria-hidden="true" />
      </div>
    </div>
  </Transition>

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
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted, reactive } from 'vue'
import { usePlanetBossStore } from '../../stores/planetBossStore'
import { formatNumber } from '../../config/numberFormat'
import { NS, drawPlanet } from '../../utils/planetDraw'
import { MATERIALS } from '../../config/materials'

// ── Boss Image Discovery ──────────────────────────────────────────────────────
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
  if (list.length === 0) return '/img/Boss/Boss1.png'
  return list[Math.floor(Math.random() * list.length)]
}

// ── Store & Refs ──────────────────────────────────────────────────────────────
const bossStore = usePlanetBossStore()
const planetStage = ref<HTMLDivElement | null>(null)
const bossImgEl = ref<HTMLImageElement | null>(null)
const bossImage = ref('/img/Boss/Boss1.png')
const isShaking = ref(false)
const isHit = ref(false)

// ── Ticker ────────────────────────────────────────────────────────────────────
const now = ref(Date.now())
let tickInterval: ReturnType<typeof setInterval> | null = null

onMounted(async () => {
  tickInterval = setInterval(() => {
    now.value = Date.now()
  }, 200)
  await discoverBossImages()
})
onUnmounted(() => {
  if (tickInterval) clearInterval(tickInterval)
})

// ── Computed ──────────────────────────────────────────────────────────────────
const secondsRemaining = computed(() => {
  const boss = bossStore.activeBoss
  if (!boss || !bossStore.isBossActive) return 0
  return Math.max(0, Math.ceil((boss.enrageTimerMs - (now.value - boss.startTime)) / 1000))
})

const enragePercent = computed(() => {
  const boss = bossStore.activeBoss
  if (!boss || !bossStore.isBossActive) return 0
  const remaining = Math.max(0, boss.enrageTimerMs - (now.value - boss.startTime))
  return (remaining / boss.enrageTimerMs) * 100
})

const estimatedPlayerDPS = computed(() => bossStore.playerDPS)
const requiredDPS = computed(() => bossStore.requiredDPS)
const canWin = computed(() => estimatedPlayerDPS.value >= requiredDPS.value * 0.7)
const isGalaxyBoss = computed(() => bossStore.activeBoss?.isGalaxyBoss ?? false)

const assignedMaterial = computed(() => {
  const id = bossStore.activeBoss?.potentialMaterialId
  return id ? (MATERIALS.find((m) => m.id === id) ?? null) : null
})

const homePlanetChampion = computed(() => bossStore.activeBoss?.homePlanetChampion ?? null)
const homePlanetChampionImage = computed(() => {
  const name = homePlanetChampion.value
  if (!name) return null
  return name === 'Bard' ? '/img/BardAbilities/Bard.png' : `/img/champion/${name}.jpg`
})

// ── Ember particle styles ─────────────────────────────────────────────────────
function emberStyle(i: number): Record<string, string> {
  const duration = 1.8 + (i % 6) * 0.7
  const delay = (i % 11) * -0.35
  const left = (i * 4.17) % 100
  const size = 1.5 + (i % 3)
  return {
    left: `${left}%`,
    width: `${size}px`,
    height: `${size}px`,
    animationDuration: `${duration}s`,
    animationDelay: `${delay}s`,
    opacity: `${0.4 + (i % 4) * 0.15}`,
  }
}

// ── Planet rendering ──────────────────────────────────────────────────────────
function renderPlanet() {
  if (!planetStage.value) return
  const boss = bossStore.activeBoss
  if (!boss) return
  planetStage.value.innerHTML = ''
  const svg = document.createElementNS(NS, 'svg') as SVGSVGElement
  svg.setAttribute('width', '280')
  svg.setAttribute('height', '280')
  svg.setAttribute('viewBox', '0 0 280 280')
  svg.style.width = '100%'
  svg.style.height = '100%'
  const planetRadius = isGalaxyBoss.value ? 138 : 120
  drawPlanet(svg, `boss-${Date.now()}`, boss.planetType, 140, 140, planetRadius)
  planetStage.value.appendChild(svg)
}

// ── Watchers ──────────────────────────────────────────────────────────────────
watch(
  () => bossStore.bossModalOpen,
  async (open) => {
    if (open) {
      await discoverBossImages()
      bossImage.value = pickRandomBossImage()
      nextTick(renderPlanet)
    }
  },
)
watch(
  () => bossStore.isBossActive,
  (active) => {
    if (!active) bossStore.closeBossModal()
  },
)

// ── Click / Floating Damage ───────────────────────────────────────────────────
let dmgIdCounter = 0
const damageFloats = reactive<Array<{ id: number; value: number; x: number; y: number }>>([])

function handleClick(event: MouseEvent) {
  const boss = bossStore.activeBoss
  if (!boss) return

  bossStore.dealClickDamage()

  // Floating damage number
  const id = ++dmgIdCounter
  damageFloats.push({ id, value: boss.clickDamagePerHit, x: event.clientX, y: event.clientY })
  setTimeout(() => {
    const idx = damageFloats.findIndex((d) => d.id === id)
    if (idx !== -1) damageFloats.splice(idx, 1)
  }, 900)

  // Hit flash + shake
  isHit.value = true
  isShaking.value = true
  setTimeout(() => {
    isHit.value = false
  }, 160)
  setTimeout(() => {
    isShaking.value = false
  }, 320)
}
</script>

<style scoped>
/* ══════════════════════════════════════════════════════════════════════════════
   BACKDROP
══════════════════════════════════════════════════════════════════════════════ */
.battle-backdrop {
  position: fixed;
  inset: 0;
  z-index: 110;
  display: flex;
  align-items: center;
  justify-content: center;
  background: radial-gradient(ellipse at center, rgba(20, 4, 0, 0.92) 0%, rgba(0, 0, 0, 0.97) 100%);
  pointer-events: auto;
}

.battle-backdrop--shaking {
  animation: screen-shake 0.32s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
}

@keyframes screen-shake {
  10%,
  90% {
    transform: translate(-2px, 0);
  }
  20%,
  80% {
    transform: translate(3px, 1px);
  }
  30%,
  50%,
  70% {
    transform: translate(-3px, -1px);
  }
  40%,
  60% {
    transform: translate(3px, 1px);
  }
}

/* ══════════════════════════════════════════════════════════════════════════════
   ATMOSPHERIC EMBERS
══════════════════════════════════════════════════════════════════════════════ */
.atmosphere {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}

.ember {
  position: absolute;
  bottom: -6px;
  border-radius: 50%;
  background: radial-gradient(circle, #ff8800 0%, #ff3300 60%, transparent 100%);
  animation: ember-rise linear infinite;
  filter: blur(0.5px);
}

.atmosphere--galaxy .ember {
  background: radial-gradient(circle, #cc55ff 0%, #8800cc 60%, transparent 100%);
}

@keyframes ember-rise {
  0% {
    transform: translateY(0) translateX(0) scale(1);
    opacity: 0.9;
  }
  50% {
    transform: translateY(-40vh) translateX(12px) scale(0.8);
    opacity: 0.6;
  }
  100% {
    transform: translateY(-90vh) translateX(-8px) scale(0.3);
    opacity: 0;
  }
}

/* ══════════════════════════════════════════════════════════════════════════════
   MODAL CARD
══════════════════════════════════════════════════════════════════════════════ */
.battle-modal {
  position: relative;
  pointer-events: auto;
  width: clamp(340px, 44vw, 510px);
  display: flex;
  flex-direction: column;
  align-items: stretch;
  overflow: hidden;
  background: linear-gradient(180deg, #0e0800 0%, #140c04 40%, #0a0600 100%);
  border: 2px solid #6b3a10;
  border-radius: 6px;
  box-shadow:
    inset 0 0 0 1px #3a1e06,
    inset 0 0 40px rgba(0, 0, 0, 0.8),
    0 0 30px rgba(200, 80, 0, 0.25),
    0 0 70px rgba(150, 40, 0, 0.12),
    0 20px 60px rgba(0, 0, 0, 0.9);
}

.battle-modal--section {
  border-color: #8a6a10;
  box-shadow:
    inset 0 0 0 1px #4a3a06,
    0 0 30px rgba(220, 180, 0, 0.2),
    0 20px 60px rgba(0, 0, 0, 0.9);
}

.battle-modal--galaxy {
  border-color: #7a1888;
  box-shadow:
    inset 0 0 0 1px #3a0848,
    inset 0 0 40px rgba(80, 0, 100, 0.4),
    0 0 40px rgba(180, 40, 220, 0.3),
    0 0 80px rgba(120, 20, 160, 0.15),
    0 20px 60px rgba(0, 0, 0, 0.9);
}

/* ── Corner Rune Decorations ─────────────────────────────────────────────── */
.corner {
  position: absolute;
  width: 18px;
  height: 18px;
  z-index: 10;
  pointer-events: none;
}

.corner--tl {
  top: 0;
  left: 0;
  border-top: 2px solid var(--rpg-gold, #c8922a);
  border-left: 2px solid var(--rpg-gold, #c8922a);
}
.corner--tr {
  top: 0;
  right: 0;
  border-top: 2px solid var(--rpg-gold, #c8922a);
  border-right: 2px solid var(--rpg-gold, #c8922a);
}
.corner--bl {
  bottom: 0;
  left: 0;
  border-bottom: 2px solid var(--rpg-gold, #c8922a);
  border-left: 2px solid var(--rpg-gold, #c8922a);
}
.corner--br {
  bottom: 0;
  right: 0;
  border-bottom: 2px solid var(--rpg-gold, #c8922a);
  border-right: 2px solid var(--rpg-gold, #c8922a);
}

.battle-modal--galaxy .corner {
  border-color: #cc44ff;
}
.battle-modal--section .corner {
  border-color: #e8c040;
}

/* ══════════════════════════════════════════════════════════════════════════════
   BOSS NAME BANNER
══════════════════════════════════════════════════════════════════════════════ */
.name-banner {
  position: relative;
  text-align: center;
  padding: 0.7rem 1.2rem 0.5rem;
  background: linear-gradient(180deg, rgba(60, 20, 0, 0.9) 0%, rgba(20, 6, 0, 0.5) 100%);
  border-bottom: 1px solid #4a2508;
  overflow: hidden;
}

.name-banner::before {
  content: '';
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(
    90deg,
    transparent,
    transparent 40px,
    rgba(200, 100, 0, 0.04) 40px,
    rgba(200, 100, 0, 0.04) 41px
  );
  pointer-events: none;
}

.name-banner--galaxy {
  background: linear-gradient(180deg, rgba(40, 0, 60, 0.95) 0%, rgba(10, 0, 20, 0.5) 100%);
  border-bottom-color: #4a0860;
}
.name-banner--section {
  background: linear-gradient(180deg, rgba(50, 35, 0, 0.95) 0%, rgba(20, 12, 0, 0.5) 100%);
  border-bottom-color: #5a4010;
}

.boss-type-badge {
  font-size: 0.5rem;
  font-weight: 900;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--rpg-gold, #c8922a);
  opacity: 0.75;
  margin-bottom: 0.2rem;
  animation: badge-pulse 2s ease-in-out infinite alternate;
}

.boss-type-badge--galaxy {
  color: #cc44ff;
}
.boss-type-badge--section {
  color: #e8c040;
}

@keyframes badge-pulse {
  from {
    opacity: 0.6;
  }
  to {
    opacity: 1;
  }
}

.boss-name {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 900;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--rpg-danger, #ff3c00);
  text-shadow:
    0 0 8px rgba(255, 60, 0, 0.7),
    0 0 20px rgba(255, 60, 0, 0.3),
    0 2px 4px rgba(0, 0, 0, 0.9);
  animation: name-flicker 4s ease-in-out infinite;
}

.boss-name--section {
  color: #e8c040;
  text-shadow:
    0 0 10px rgba(232, 192, 64, 0.7),
    0 2px 4px rgba(0, 0, 0, 0.9);
  animation: none;
}

.boss-name--galaxy {
  color: #d060f8;
  text-shadow:
    0 0 12px rgba(200, 60, 255, 0.9),
    0 0 30px rgba(200, 60, 255, 0.4),
    0 2px 4px rgba(0, 0, 0, 0.9);
  animation: galaxy-name-pulse 1.8s ease-in-out infinite alternate;
}

@keyframes name-flicker {
  0%,
  95%,
  100% {
    opacity: 1;
  }
  96% {
    opacity: 0.7;
  }
  97% {
    opacity: 1;
  }
  98% {
    opacity: 0.6;
  }
  99% {
    opacity: 1;
  }
}

@keyframes galaxy-name-pulse {
  from {
    text-shadow:
      0 0 12px rgba(200, 60, 255, 0.9),
      0 0 30px rgba(200, 60, 255, 0.3),
      0 2px 4px rgba(0, 0, 0, 0.9);
  }
  to {
    text-shadow:
      0 0 20px rgba(220, 100, 255, 1),
      0 0 50px rgba(200, 60, 255, 0.6),
      0 2px 4px rgba(0, 0, 0, 0.9);
  }
}

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

/* Starfield for galaxy */
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

/* Dramatic ground line */
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

.boss-aura--section {
  background: radial-gradient(ellipse at center, rgba(220, 180, 0, 0.15) 0%, transparent 70%);
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

/* ── Enrage Ring (circular countdown) ────────────────────────────────────── */
.enrage-ring {
  position: absolute;
  top: 8px;
  right: 10px;
  width: 52px;
  height: 52px;
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
  font-size: 0.8rem;
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
  font-size: 0.38rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  color: rgba(200, 146, 42, 0.6);
  text-transform: uppercase;
  z-index: 1;
  margin-top: 0.05rem;
}

/* ══════════════════════════════════════════════════════════════════════════════
   HP BAR
══════════════════════════════════════════════════════════════════════════════ */
.hp-section {
  padding: 0.55rem 0.9rem 0.4rem;
  background: rgba(0, 0, 0, 0.35);
  border-top: 1px solid rgba(255, 100, 0, 0.15);
}

.hp-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.3rem;
}

.stat-label {
  font-size: 0.55rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgba(200, 180, 140, 0.65);
}

.hp-numbers {
  font-size: 0.62rem;
  font-weight: 700;
  color: var(--rpg-gold, #c8922a);
  letter-spacing: 0.03em;
}

.hp-sep {
  color: rgba(200, 180, 140, 0.4);
  margin: 0 0.12rem;
}

.hp-track {
  position: relative;
  height: 12px;
  background: #0d0804;
  border-radius: 3px;
  overflow: hidden;
  border: 1px solid rgba(100, 50, 10, 0.6);
  box-shadow:
    inset 0 2px 6px rgba(0, 0, 0, 0.7),
    0 0 6px rgba(255, 80, 0, 0.1);
}

.hp-track--critical {
  border-color: rgba(255, 40, 0, 0.5);
  box-shadow:
    inset 0 2px 6px rgba(0, 0, 0, 0.7),
    0 0 8px rgba(255, 40, 0, 0.3);
  animation: track-critical-pulse 0.6s ease-in-out infinite alternate;
}

.hp-track--galaxy {
  border-color: rgba(160, 40, 200, 0.5);
  box-shadow:
    inset 0 2px 6px rgba(0, 0, 0, 0.7),
    0 0 8px rgba(160, 40, 200, 0.2);
}

@keyframes track-critical-pulse {
  from {
    border-color: rgba(255, 40, 0, 0.3);
  }
  to {
    border-color: rgba(255, 40, 0, 0.8);
  }
}

.hp-fill {
  height: 100%;
  border-radius: 2px;
  background: linear-gradient(to bottom, #6de030 0%, #3aaa10 50%, #2a8808 100%);
  box-shadow:
    0 0 8px rgba(80, 200, 40, 0.5),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
  transition: width 0.25s linear;
  position: relative;
}

.hp-fill::after {
  content: '';
  position: absolute;
  top: 1px;
  left: 0;
  right: 0;
  height: 3px;
  border-radius: 2px;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.25), transparent);
}

.hp-fill--low {
  background: linear-gradient(to bottom, #f0c030 0%, #c08010 50%, #906010 100%);
  box-shadow:
    0 0 8px rgba(200, 160, 40, 0.5),
    inset 0 1px 0 rgba(255, 255, 255, 0.15);
}

.hp-fill--critical {
  background: linear-gradient(to bottom, #ff4020 0%, #cc1a00 50%, #a01000 100%);
  box-shadow:
    0 0 12px rgba(255, 60, 0, 0.7),
    inset 0 1px 0 rgba(255, 255, 255, 0.15);
  animation: hp-critical-flash 0.45s ease-in-out infinite alternate;
}

.hp-fill--galaxy {
  background: linear-gradient(to bottom, #b840e8 0%, #7a10b0 50%, #5a0888 100%);
  box-shadow:
    0 0 10px rgba(160, 40, 220, 0.6),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
}

@keyframes hp-critical-flash {
  from {
    box-shadow: 0 0 8px rgba(255, 60, 0, 0.5);
  }
  to {
    box-shadow: 0 0 16px rgba(255, 60, 0, 0.9);
  }
}

.hp-segments {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.hp-seg-line {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 1px;
  background: rgba(0, 0, 0, 0.4);
  transform: translateX(-50%);
}

/* ══════════════════════════════════════════════════════════════════════════════
   COMBAT STATS ROW
══════════════════════════════════════════════════════════════════════════════ */
.combat-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.45rem 0.9rem;
  background: rgba(0, 0, 0, 0.25);
  border-top: 1px solid rgba(100, 50, 0, 0.3);
  border-bottom: 1px solid rgba(100, 50, 0, 0.3);
  gap: 0.5rem;
}

.stat-block {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.1rem;
  min-width: 5.5rem;
}

.stat-block--right {
  align-items: flex-end;
}

.stat-val {
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--rpg-gold, #c8922a);
  letter-spacing: 0.02em;
}

.stat-val--dim {
  color: rgba(200, 180, 140, 0.5);
  font-size: 0.7rem;
}

.verdict-badge {
  padding: 0.25rem 0.7rem;
  border-radius: 3px;
  font-size: 0.65rem;
  font-weight: 900;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  border: 1px solid currentColor;
  white-space: nowrap;
}

.verdict--win {
  color: #52c830;
  background: rgba(50, 180, 30, 0.12);
  text-shadow: 0 0 8px rgba(80, 200, 48, 0.7);
  border-color: rgba(80, 200, 48, 0.4);
}

.verdict--lose {
  color: #ff4020;
  background: rgba(200, 40, 0, 0.12);
  text-shadow: 0 0 8px rgba(255, 60, 0, 0.7);
  border-color: rgba(255, 60, 0, 0.4);
  animation: verdict-pulse 0.8s ease-in-out infinite alternate;
}

@keyframes verdict-pulse {
  from {
    opacity: 0.7;
  }
  to {
    opacity: 1;
  }
}

/* ── Passive Row ─────────────────────────────────────────────────────────── */
.passive-row {
  display: flex;
  justify-content: center;
  padding: 0.28rem 0.9rem;
  background: rgba(0, 0, 0, 0.2);
}

/* ══════════════════════════════════════════════════════════════════════════════
   LOOT PANEL
══════════════════════════════════════════════════════════════════════════════ */
.loot-panel {
  border-top: 1px solid rgba(100, 60, 10, 0.5);
  padding: 0.5rem 0.9rem 0.65rem;
  background: rgba(0, 0, 0, 0.3);
}

.loot-title {
  font-size: 0.5rem;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  color: var(--rpg-gold, #c8922a);
  opacity: 0.7;
  margin-bottom: 0.3rem;
}

.loot-grid {
  display: flex;
  flex-direction: column;
  gap: 0.28rem;
}

.loot-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.72rem;
  padding: 0.25rem 0.5rem;
  background: rgba(255, 200, 100, 0.04);
  border: 1px solid rgba(100, 60, 0, 0.3);
  border-radius: 3px;
}

.loot-item--champion {
  border-color: rgba(60, 100, 160, 0.4);
  background: rgba(60, 100, 200, 0.06);
}

.loot-icon {
  font-size: 0.9rem;
  flex-shrink: 0;
}

.loot-info {
  display: flex;
  flex-direction: column;
  gap: 0.05rem;
  flex: 1;
  min-width: 0;
}

.loot-label {
  font-size: 0.48rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: rgba(200, 180, 140, 0.55);
}

.loot-name {
  font-weight: 700;
  font-size: 0.72rem;
}

.loot-chance {
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--rpg-gold, #c8922a);
  min-width: 2rem;
  text-align: right;
}

.champion-portrait {
  height: 48px;
  width: auto;
  object-fit: contain;
  border-radius: 3px;
  border: 1px solid rgba(60, 100, 160, 0.5);
  flex-shrink: 0;
}

.champion-name {
  color: var(--rpg-blue, #4a90d9);
  font-weight: 700;
  font-size: 0.78rem;
}

.loot-hint {
  font-size: 0.52rem;
  color: rgba(200, 180, 140, 0.45);
  letter-spacing: 0.05em;
  white-space: nowrap;
}

/* ── Rarity Colors ───────────────────────────────────────────────────────── */
.rarity--common {
  color: var(--rpg-rarity-common, #aaaaaa);
}
.rarity--uncommon {
  color: var(--rpg-rarity-uncommon, #1eff00);
}
.rarity--rare {
  color: var(--rpg-rarity-rare, #0070dd);
}
.rarity--epic {
  color: var(--rpg-rarity-epic, #a335ee);
}

/* ══════════════════════════════════════════════════════════════════════════════
   SCANLINES OVERLAY
══════════════════════════════════════════════════════════════════════════════ */
.scanlines {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: repeating-linear-gradient(
    0deg,
    transparent,
    transparent 2px,
    rgba(0, 0, 0, 0.06) 2px,
    rgba(0, 0, 0, 0.06) 4px
  );
  z-index: 50;
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
  font-size: 1.1rem;
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

/* ══════════════════════════════════════════════════════════════════════════════
   MODAL ENTRANCE ANIMATION
══════════════════════════════════════════════════════════════════════════════ */
.boss-entrance-enter-active {
  animation: epicEntrance 0.45s cubic-bezier(0.16, 1, 0.3, 1);
}
.boss-entrance-leave-active {
  animation: epicExit 0.28s ease-in forwards;
}

@keyframes epicEntrance {
  0% {
    opacity: 0;
    transform: scale(1.12) translateY(-12px);
    filter: blur(8px) brightness(2);
  }
  40% {
    opacity: 1;
    filter: blur(0) brightness(1.3);
  }
  100% {
    opacity: 1;
    transform: scale(1) translateY(0);
    filter: blur(0) brightness(1);
  }
}

@keyframes epicExit {
  0% {
    opacity: 1;
    transform: scale(1);
    filter: blur(0);
  }
  100% {
    opacity: 0;
    transform: scale(0.88);
    filter: blur(6px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .boss-wrapper {
    animation: none;
  }
  .boss-wrapper--critical {
    animation: none;
  }
  .planet-bg--galaxy {
    animation: none;
  }
  .boss-aura {
    animation: none;
  }
  .ember {
    animation: none;
  }
}
</style>
