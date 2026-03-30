<template>
  <Transition name="modal-fade">
    <div
      v-if="bossStore.bossModalOpen"
      class="modal-backdrop rpg-overlay"
      aria-modal="true"
      role="dialog"
      @click.self="bossStore.closeBossModal()"
    >
      <div class="boss-modal rpg-frame">
        <!-- ── Header ──────────────────────────────────────────────────── -->
        <div class="boss-header rpg-header">
          <span class="boss-title" :class="{ 'boss-title--section': bossStore.activeBoss?.isSectionBoss }">
            <span v-if="bossStore.activeBoss?.isSectionBoss" class="section-boss-crown">★ </span>
            {{ bossStore.activeBoss?.bossName ?? 'Planet Boss' }}
            <span v-if="bossStore.activeBoss?.isSectionBoss" class="section-boss-label"> — Section Boss</span>
          </span>
          <div class="timer-chip" :class="{ 'timer-chip--urgent': secondsRemaining < 10 }">
            <svg class="timer-icon" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <circle cx="8" cy="8" r="6.5" stroke="currentColor" stroke-width="1.4" />
              <path
                d="M8 4.5V8l2.5 1.5"
                stroke="currentColor"
                stroke-width="1.4"
                stroke-linecap="round"
              />
            </svg>
            {{ secondsRemaining }}s
          </div>
        </div>

        <div class="rpg-accent-bar" />

        <!-- ── Bars ────────────────────────────────────────────────────── -->
        <div class="bars-section">
          <!-- Enrage Timer -->
          <div class="bar-row">
            <span class="bar-label">Zeit</span>
            <div class="bar-track">
              <div class="bar-fill bar-fill--enrage" :style="{ width: enragePercent + '%' }" />
            </div>
          </div>
          <!-- HP -->
          <div class="bar-row">
            <span class="bar-label">HP</span>
            <div class="bar-track">
              <div
                class="bar-fill bar-fill--hp"
                :style="{ width: bossStore.bossHPPercent + '%' }"
              />
            </div>
            <span class="hp-text">
              {{ formatNumber(bossStore.activeBoss?.currentHP ?? 0) }}
              <span class="hp-sep">/</span>
              {{ formatNumber(bossStore.activeBoss?.maxHP ?? 0) }}
            </span>
          </div>
        </div>

        <!-- ── DPS Indicator ───────────────────────────────────────────── -->
        <div class="dps-row">
          <div class="dps-chip">
            <span class="dps-label">Dein DPS</span>
            <span class="dps-val">{{ formatNumber(estimatedPlayerDPS) }}/s</span>
          </div>
          <span
            class="dps-verdict"
            :class="canWin ? 'dps-verdict--ok' : 'dps-verdict--weak'"
            :title="canWin ? 'Sieg möglich' : 'DPS zu niedrig'"
          >
            {{ canWin ? '✓' : '✗' }}
          </span>
          <div class="dps-chip">
            <span class="dps-label">Benötigt</span>
            <span class="dps-val">{{ formatNumber(requiredDPS) }}/s</span>
          </div>
        </div>

        <!-- ── Visual: Planet + Boss ───────────────────────────────────── -->
        <div class="visual-section">
          <div ref="planetStage" class="planet-stage-bg" />
          <img
            ref="bossImgEl"
            :src="bossImage"
            class="boss-img"
            alt="Boss"
            @click="handleClick($event)"
          />
        </div>

        <!-- ── Idle DPS ────────────────────────────────────────────────── -->
        <p class="passive-info">
          Idle-Schaden: {{ formatNumber(bossStore.activeBoss?.passiveDPS ?? 0) }}/s
        </p>

        <!-- ── Rewards ─────────────────────────────────────────────────── -->
        <div v-if="assignedMaterial || homePlanetChampion" class="rewards-block">
          <p class="rewards-title">Belohnung</p>
          <div class="rewards-list">
            <div v-if="assignedMaterial" class="reward-row">
              <span class="reward-label">Material</span>
              <span class="reward-name" :class="`rarity--${assignedMaterial.rarity}`">
                {{ assignedMaterial.name }}
              </span>
              <span class="reward-chance">
                {{ Math.round((bossStore.activeBoss?.assignedDropChance ?? 0) * 100) }}%
              </span>
            </div>
            <div v-if="homePlanetChampion" class="reward-row reward-row--champion">
              <span class="reward-label">Champion</span>
              <div class="reward-champion-inner">
                <img
                  v-if="homePlanetChampionImage"
                  :src="homePlanetChampionImage"
                  :alt="homePlanetChampion"
                  class="reward-champion-img"
                  @error="($event.target as HTMLImageElement).style.display = 'none'"
                />
                <span class="reward-champion-name">{{ homePlanetChampion }}</span>
              </div>
              <span class="reward-hint">freischaltbar</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Transition>

  <!-- Floating Damage Numbers – globally positioned via Teleport -->
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

// ─────────────────────────────────────────────────────────────────────────────
// Boss-Image Discovery (Runtime Probing — public/img/Boss/Boss1.png … BossN.png)
// Neue Bilder einfach ablegen, kein Code-Änderung nötig.
// ─────────────────────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────────────────────
// Store & Refs
// ─────────────────────────────────────────────────────────────────────────────
const bossStore = usePlanetBossStore()
const planetStage = ref<HTMLDivElement | null>(null)
const bossImgEl = ref<HTMLImageElement | null>(null)
const bossImage = ref('/img/Boss/Boss1.png')

// ─────────────────────────────────────────────────────────────────────────────
// Countdown-Ticker (200ms)
// ─────────────────────────────────────────────────────────────────────────────
const now = ref(Date.now())
let tickInterval: ReturnType<typeof setInterval> | null = null

onMounted(async () => {
  tickInterval = setInterval(() => {
    now.value = Date.now()
  }, 200)
  // Probing beim Mount anstoßen, damit beim ersten Modal-Öffnen alles bereit ist
  await discoverBossImages()
})

onUnmounted(() => {
  if (tickInterval) clearInterval(tickInterval)
})

// ─────────────────────────────────────────────────────────────────────────────
// Computed
// ─────────────────────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────────────────────
// Planet rendern
// ─────────────────────────────────────────────────────────────────────────────
function renderPlanet() {
  if (!planetStage.value) return
  const boss = bossStore.activeBoss
  if (!boss) return

  planetStage.value.innerHTML = ''
  const svg = document.createElementNS(NS, 'svg') as SVGSVGElement
  svg.setAttribute('width', '260')
  svg.setAttribute('height', '260')
  svg.setAttribute('viewBox', '0 0 280 280')
  svg.style.width = '100%'
  svg.style.height = '100%'
  drawPlanet(svg, `boss-${Date.now()}`, boss.planetType, 140, 140, 120, 280)
  planetStage.value.appendChild(svg)
}

// ─────────────────────────────────────────────────────────────────────────────
// Watchers
// ─────────────────────────────────────────────────────────────────────────────
watch(
  () => bossStore.bossModalOpen,
  async (open) => {
    if (open) {
      await discoverBossImages() // no-op wenn bereits fertig
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

// ─────────────────────────────────────────────────────────────────────────────
// Click / Floating Damage Numbers
// ─────────────────────────────────────────────────────────────────────────────
let dmgIdCounter = 0
const damageFloats = reactive<Array<{ id: number; value: number; x: number; y: number }>>([])

function handleClick(event: MouseEvent) {
  const boss = bossStore.activeBoss
  if (!boss) return

  const defeated = bossStore.dealClickDamage()

  // Floating damage number at exact click position
  const id = ++dmgIdCounter
  const x = event.clientX
  const y = event.clientY
  damageFloats.push({ id, value: boss.clickDamagePerHit, x, y })
  setTimeout(() => {
    const idx = damageFloats.findIndex((d) => d.id === id)
    if (idx !== -1) damageFloats.splice(idx, 1)
  }, 800)

  if (!defeated) {
    const img = bossImgEl.value
    if (img) {
      img.style.filter = 'drop-shadow(0 0 30px rgba(255,100,0,0.95))'
      setTimeout(() => {
        img.style.filter = ''
      }, 150)
    }
  }
}
</script>

<style scoped>
/* ─── Backdrop ───────────────────────────────────────────────────────────── */
.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 110;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: auto;
}

/* ─── Modal-Card ─────────────────────────────────────────────────────────── */
.boss-modal {
  position: relative;
  pointer-events: auto;
  width: clamp(340px, 42vw, 500px);
  display: flex;
  flex-direction: column;
  align-items: stretch;
  overflow: hidden;
}

/* ─── Header ─────────────────────────────────────────────────────────────── */
.boss-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.6rem 1rem;
}

.boss-title {
  font-size: 0.85rem;
  font-weight: 900;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--rpg-danger);
  text-shadow: 0 0 10px rgba(255, 60, 0, 0.55);
}

.boss-title--section {
  color: #e8c040;
  text-shadow: 0 0 12px rgba(232, 192, 64, 0.6);
}

.section-boss-crown {
  margin-right: 0.1rem;
}

.section-boss-label {
  font-size: 0.65rem;
  color: #c89040;
  opacity: 0.85;
  letter-spacing: 0.05em;
}

.timer-chip {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.2rem 0.65rem;
  background: var(--rpg-bg-deep);
  border: 1px solid var(--rpg-wood-mid);
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--rpg-gold);
  letter-spacing: 0.04em;
  transition:
    border-color 0.2s,
    color 0.2s;
}

.timer-chip--urgent {
  border-color: var(--rpg-danger);
  color: var(--rpg-danger);
  animation: pulse-urgent 0.6s ease-in-out infinite alternate;
}

@keyframes pulse-urgent {
  from {
    opacity: 1;
  }
  to {
    opacity: 0.5;
  }
}

.timer-icon {
  width: 13px;
  height: 13px;
  flex-shrink: 0;
  opacity: 0.8;
}

/* ─── Bars ───────────────────────────────────────────────────────────────── */
.bars-section {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  padding: 0.7rem 1rem 0.55rem;
}

.bar-row {
  display: flex;
  align-items: center;
  gap: 0.55rem;
}

.bar-label {
  font-size: 0.58rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: var(--rpg-text-dim);
  min-width: 2rem;
  flex-shrink: 0;
}

.bar-track {
  flex: 1;
  height: 7px;
  background: #1a1a16;
  border-radius: 4px;
  overflow: hidden;
  border: 1px solid var(--rpg-wood-inner);
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.5);
}

.bar-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.2s linear;
}

.bar-fill--enrage {
  background: linear-gradient(90deg, var(--rpg-danger), var(--rpg-danger-dark));
  box-shadow: 0 0 6px rgba(255, 60, 0, 0.65);
}

.bar-fill--hp {
  background: linear-gradient(to bottom, var(--rpg-green-top), var(--rpg-green-bottom));
  box-shadow: 0 0 5px rgba(82, 184, 48, 0.4);
}

.hp-text {
  font-size: 0.6rem;
  font-weight: 700;
  color: var(--rpg-gold);
  letter-spacing: 0.03em;
  white-space: nowrap;
  min-width: 7.5rem;
  text-align: right;
  flex-shrink: 0;
}

.hp-sep {
  color: var(--rpg-text-dim);
  margin: 0 0.1rem;
}

/* ─── DPS Row ─────────────────────────────────────────────────────────────── */
.dps-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  padding: 0.4rem 1rem;
  background: var(--rpg-bg-row);
  border-top: 1px solid var(--rpg-wood-inner);
  border-bottom: 1px solid var(--rpg-wood-inner);
}

.dps-chip {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.1rem;
  min-width: 6rem;
}

.dps-label {
  font-size: 0.55rem;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: var(--rpg-text-dim);
}

.dps-val {
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--rpg-gold);
}

.dps-verdict {
  font-size: 1rem;
  font-weight: 900;
  padding: 0.1rem 0.45rem;
  border-radius: 3px;
  line-height: 1;
}

.dps-verdict--ok {
  color: var(--rpg-green-top);
  text-shadow: 0 0 8px rgba(82, 184, 48, 0.7);
}

.dps-verdict--weak {
  color: var(--rpg-danger);
  text-shadow: 0 0 8px rgba(255, 60, 0, 0.7);
}

/* ─── Visual Section ─────────────────────────────────────────────────────── */
.visual-section {
  position: relative;
  width: 100%;
  aspect-ratio: 1 / 0.7;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.planet-stage-bg {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0.28;
  pointer-events: none;
}

.boss-img {
  position: relative;
  z-index: 1;
  height: 80%;
  width: auto;
  max-width: 56%;
  object-fit: contain;
  image-rendering: pixelated;
  filter: drop-shadow(0 0 14px rgba(255, 80, 0, 0.4));
  cursor: pointer;
  transition:
    filter 0.1s ease,
    transform 0.1s ease;
  display: block;
}

.boss-img:hover {
  transform: scale(1.04);
  filter: drop-shadow(0 0 24px rgba(255, 110, 20, 0.65));
}

.boss-img:active {
  transform: scale(0.96);
}

/* ─── Floating Damage Numbers (Teleport → body) ──────────────────────────── */
.dmg-overlay {
  position: fixed;
  inset: 0;
  pointer-events: none;
  overflow: visible;
  z-index: 9999;
}

.damage-number {
  position: fixed;
  font-size: 0.95rem;
  font-weight: 700;
  color: #ffffff;
  text-shadow:
    0 0 4px #000,
    0 0 8px #000,
    0 1px 2px #000;
  pointer-events: none;
  white-space: nowrap;
  transform: translate(-50%, -50%);
}

.dmg-float-enter-active {
  animation: dmgUp 0.8s ease-out forwards;
}
.dmg-float-leave-active {
  display: none;
}

@keyframes dmgUp {
  0% {
    opacity: 1;
    transform: translateY(0) scale(1.1);
  }
  100% {
    opacity: 0;
    transform: translateY(-55px) scale(0.8);
  }
}

/* ─── Passive Info ───────────────────────────────────────────────────────── */
.passive-info {
  font-size: 0.6rem;
  color: var(--rpg-text-dim);
  text-align: center;
  margin: 0;
  padding: 0.3rem 0;
  letter-spacing: 0.04em;
  border-top: 1px solid var(--rpg-wood-inner);
  background: var(--rpg-bg-row);
}

/* ─── Rewards ────────────────────────────────────────────────────────────── */
.rewards-block {
  border-top: 1px solid var(--rpg-wood-mid);
  padding: 0.55rem 1rem 0.65rem;
  background: var(--rpg-bg-row);
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.rewards-title {
  font-size: 0.55rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.09em;
  color: var(--rpg-gold-dim);
  margin: 0 0 0.1rem;
}

.rewards-list {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.reward-row {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  font-size: 0.72rem;
}

.reward-row--champion {
  border-top: 1px solid var(--rpg-wood-inner);
  padding-top: 0.3rem;
}

.reward-label {
  font-size: 0.56rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--rpg-text-dim);
  min-width: 3.5rem;
  flex-shrink: 0;
}

.reward-name {
  flex: 1;
  font-weight: 600;
}

.reward-chance {
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--rpg-gold);
  min-width: 2.2rem;
  text-align: right;
}

.reward-champion-inner {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  flex: 1;
  min-width: 0;
}

.reward-champion-img {
  height: 52px;
  width: auto;
  object-fit: contain;
  flex-shrink: 0;
  border-radius: 3px;
  border: 1px solid #5c3310;
}

.reward-champion-name {
  color: var(--rpg-blue);
  font-weight: 700;
  font-size: 0.78rem;
}

.reward-hint {
  font-size: 0.58rem;
  color: var(--rpg-text-dim);
}

/* ─── Rarity Colors (via globale Klassen falls vorhanden, sonst hier) ──────── */
.rarity--common {
  color: var(--rpg-rarity-common);
}
.rarity--uncommon {
  color: var(--rpg-rarity-uncommon);
}
.rarity--rare {
  color: var(--rpg-rarity-rare);
}
.rarity--epic {
  color: var(--rpg-rarity-epic);
}

/* ─── Modal Transition ───────────────────────────────────────────────────── */
.modal-fade-enter-active {
  animation: modalIn 0.25s cubic-bezier(0.22, 1, 0.36, 1);
}
.modal-fade-leave-active {
  animation: modalOut 0.2s ease-in forwards;
}

@keyframes modalIn {
  from {
    opacity: 0;
    transform: scale(0.9);
    filter: blur(4px);
  }
  to {
    opacity: 1;
    transform: scale(1);
    filter: blur(0);
  }
}
@keyframes modalOut {
  from {
    opacity: 1;
    transform: scale(1);
    filter: blur(0);
  }
  to {
    opacity: 0;
    transform: scale(0.92);
    filter: blur(3px);
  }
}
</style>
