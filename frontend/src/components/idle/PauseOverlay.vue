<template>
  <Teleport to="body">
    <Transition name="pause-fade">
      <div
        v-if="!windowFocused"
        class="pause-overlay"
        role="dialog"
        aria-modal="true"
        aria-label="Spiel pausiert"
      >
        <!-- Ambient particles -->
        <div class="pause-particles">
          <span v-for="i in 20" :key="i" class="particle" :style="particleStyle(i)" />
        </div>

        <!-- Scanlines -->
        <div class="overlay-scanlines" />

        <div class="pause-card">
          <!-- Ornate top border -->
          <div class="pause-ornament-top" />

          <!-- Corner decorations -->
          <div class="corner corner--tl"><span class="corner-gem" /></div>
          <div class="corner corner--tr"><span class="corner-gem" /></div>
          <div class="corner corner--bl"><span class="corner-gem" /></div>
          <div class="corner corner--br"><span class="corner-gem" /></div>

          <!-- Header -->
          <div class="pause-header">
            <div class="pause-header-icon">
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.5"
              >
                <rect x="6" y="4" width="4" height="16" rx="1" />
                <rect x="14" y="4" width="4" height="16" rx="1" />
              </svg>
            </div>
            <div class="pause-title-wrap">
              <span class="pause-eyebrow">✦ DER BARDE RUHT ✦</span>
              <h2 class="pause-title">— Pausiert —</h2>
            </div>
            <div class="pause-header-icon">
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.5"
              >
                <rect x="6" y="4" width="4" height="16" rx="1" />
                <rect x="14" y="4" width="4" height="16" rx="1" />
              </svg>
            </div>
          </div>

          <!-- Divider -->
          <div class="pause-divider">
            <div class="divider-line" />
            <svg width="18" height="18" viewBox="0 0 24 24" fill="#c89040" stroke="none">
              <polygon
                points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"
              />
            </svg>
            <div class="divider-line" />
          </div>

          <!-- Body -->
          <div class="pause-body">
            <p class="pause-subtitle">✦ Klicke ins Spielfenster um fortzufahren ✦</p>

            <!-- ══ HERO: Player HP ══ -->
            <div class="hp-hero">
              <div class="hp-hero-header">
                <div class="hp-hero-title-row">
                  <span class="hp-hero-icon">❤</span>
                  <span class="hp-hero-label">Trefferpunkte</span>
                  <span class="hp-hero-badge" :class="hpBadgeClass">{{ hpStatusText }}</span>
                </div>
                <span class="hp-hero-numbers">
                  <span class="hp-current" :class="hpColor">{{
                    Math.round(playerStore.currentHP)
                  }}</span>
                  <span class="hp-sep"> / </span>
                  <span class="hp-max">{{ playerStore.maxHP }}</span>
                </span>
              </div>
              <!-- Main HP bar -->
              <div class="hp-bar-track hp-bar-track--hero">
                <div
                  class="hp-bar-fill hp-bar-fill--hero"
                  :class="hpColor"
                  :style="{ width: hpPercent + '%' }"
                />
                <!-- Tick marks -->
                <div v-for="t in 9" :key="t" class="hp-tick" :style="{ left: t * 10 + '%' }" />
                <!-- Danger pulse overlay -->
                <div v-if="hpPercent <= 25" class="hp-danger-pulse" />
              </div>
              <!-- HP segment indicators -->
              <div class="hp-segments">
                <span
                  v-for="seg in 10"
                  :key="seg"
                  class="hp-seg"
                  :class="{
                    'hp-seg--filled': seg * 10 <= hpPercent,
                    'hp-seg--danger': hpPercent <= 25,
                  }"
                />
              </div>
              <div class="hp-flavor-text">
                <span v-if="hpPercent > 75">⚔ Der Barde ist kampfbereit!</span>
                <span v-else-if="hpPercent > 50">🎵 Die Melodie trägt ihn noch...</span>
                <span v-else-if="hpPercent > 25">⚠ Der Barde ist geschwächt!</span>
                <span v-else class="text--danger">💀 In höchster Gefahr! Kehre sofort zurück!</span>
              </div>
            </div>

            <!-- Divider -->
            <div class="pause-divider pause-divider--sm">
              <div class="divider-line" />
              <span class="divider-rune">⚔</span>
              <div class="divider-line" />
            </div>

            <!-- Accumulated chimes -->
            <div class="chime-reward">
              <div class="chime-reward-glow" />
              <div class="chime-reward-icon">
                <img src="/img/BardAbilities/BardChime.png" alt="Chime" class="chime-img" />
              </div>
              <div class="chime-reward-text">
                <span class="chime-label">⟡ Gesammelte Chimes</span>
                <span class="chime-value">+{{ formatNumber(accumulatedChimes) }}</span>
                <span class="chime-sublabel">werden beim Weiterspielen gutgeschrieben</span>
              </div>
            </div>

            <!-- Notifications row -->
            <div class="notifications-grid">
              <!-- Pending level-ups -->
              <div
                v-if="gameStore.pendingAugmentSelections.length > 0"
                class="notif-card notif-card--gold"
              >
                <div class="notif-icon notif-icon--gold">
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2.5"
                  >
                    <polyline points="18 15 12 9 6 15" />
                  </svg>
                </div>
                <div class="notif-body">
                  <span class="notif-title">Level-Up!</span>
                  <span class="notif-desc">
                    {{
                      gameStore.pendingAugmentSelections.length === 1
                        ? 'Wähle dein Augment!'
                        : `${gameStore.pendingAugmentSelections.length}× Augment wählen!`
                    }}
                  </span>
                </div>
                <div class="notif-badge notif-badge--gold">
                  {{ gameStore.pendingAugmentSelections.length }}
                </div>
              </div>

              <!-- Bonus stars -->
              <div v-if="pendingStars > 0" class="notif-card notif-card--green">
                <div class="notif-icon notif-icon--green">
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2.5"
                  >
                    <polygon
                      points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"
                    />
                  </svg>
                </div>
                <div class="notif-body">
                  <span class="notif-title">Sternsysteme!</span>
                  <span class="notif-desc">
                    {{
                      pendingStars === 1
                        ? 'Ein Bonus-Stern wartet'
                        : `${pendingStars}× Bonus-Sterne warten`
                    }}
                  </span>
                </div>
                <div class="notif-badge notif-badge--green">{{ pendingStars }}</div>
              </div>

              <!-- Pause kills -->
              <div v-if="pauseKills > 0" class="notif-card notif-card--red">
                <div class="notif-icon notif-icon--red">
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2.5"
                  >
                    <path
                      d="M14.5 10c-.83 0-1.5-.67-1.5-1.5v-5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5v5c0 .83-.67 1.5-1.5 1.5z"
                    />
                    <path
                      d="M20.5 10H19V8.5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"
                    />
                    <path d="M9.5 14.5v-5c0-.83-.67-1.5-1.5-1.5S6.5 8.67 6.5 9.5v5" />
                    <path d="M3.5 10H5v-1.5C5 7.67 4.33 7 3.5 7S2 7.67 2 8.5 2.67 10 3.5 10z" />
                    <path
                      d="M11.5 15h1a2 2 0 012 2v2.5a2 2 0 01-2 2h-3a2 2 0 01-2-2V17a2 2 0 012-2h.5"
                    />
                  </svg>
                </div>
                <div class="notif-body">
                  <span class="notif-title">Bosse besiegt!</span>
                  <span class="notif-desc">Während der Pause</span>
                </div>
                <div class="notif-badge notif-badge--red">{{ pauseKills }}</div>
              </div>

              <!-- Material drops -->
              <div
                v-if="pauseMaterialEntries.length > 0"
                class="notif-card notif-card--teal notif-card--wide"
              >
                <div class="notif-icon notif-icon--teal">
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2.5"
                  >
                    <polygon
                      points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"
                    />
                  </svg>
                </div>
                <div class="notif-body notif-body--mats">
                  <span class="notif-title">Materialien erbeutet</span>
                  <div class="mats-list">
                    <span v-for="entry in pauseMaterialEntries" :key="entry.id" class="mat-entry">
                      <img
                        v-if="entry.image"
                        :src="entry.image"
                        :alt="entry.name"
                        class="mat-icon"
                      />
                      <span>{{ entry.name }}</span>
                      <span class="mat-amount">×{{ entry.amount }}</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Bottom divider -->
            <div class="pause-divider pause-divider--sm">
              <div class="divider-line" />
              <span class="divider-rune">🎵</span>
              <div class="divider-line" />
            </div>

            <!-- Unpause button -->
            <button class="pause-btn" @click="unpause">
              <span class="pause-btn-inner">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
                Weiterspielen
              </span>
              <div class="pause-btn-shine" />
            </button>
          </div>

          <!-- Ornate bottom border -->
          <div class="pause-ornament-bottom" />
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, ref, watch, onUnmounted } from 'vue'
import { useWindowFocus } from '@/composables/useWindowFocus'
import { useGalaxyStore } from '@/stores/galaxyStore'
import { useGameStore } from '@/stores/gameStore'
import { usePlayerStore } from '@/stores/playerStore'
import { formatNumber } from '@/config/numberFormat'
import { MATERIALS } from '@/config/materials'

const { windowFocused } = useWindowFocus()
const galaxyStore = useGalaxyStore()
const gameStore = useGameStore()
const playerStore = usePlayerStore()

const pendingStars = computed(() => galaxyStore.pendingResourceStars)

const hpPercent = computed(() => playerStore.hpPercent)

const hpColor = computed(() => {
  if (hpPercent.value > 50) return 'hp--green'
  if (hpPercent.value > 25) return 'hp--yellow'
  return 'hp--red'
})

const hpBadgeClass = computed(() => {
  if (hpPercent.value > 75) return 'hp-badge--great'
  if (hpPercent.value > 50) return 'hp-badge--good'
  if (hpPercent.value > 25) return 'hp-badge--warn'
  return 'hp-badge--crit'
})

const hpStatusText = computed(() => {
  if (hpPercent.value > 75) return 'GUT'
  if (hpPercent.value > 50) return 'STABIL'
  if (hpPercent.value > 25) return 'GESCHWÄCHT'
  return 'KRITISCH'
})

const pauseStartChimes = ref(0)
const pauseTick = ref(0)
let pauseInterval: ReturnType<typeof setInterval> | null = null

watch(
  windowFocused,
  (focused) => {
    if (!focused) {
      gameStore.setPauseState(true)
      pauseStartChimes.value = gameStore.chimes
      pauseInterval = setInterval(() => {
        pauseTick.value++
      }, 1000)
    } else {
      gameStore.setPauseState(false)
      if (pauseInterval !== null) {
        clearInterval(pauseInterval)
        pauseInterval = null
      }
    }
  },
  { immediate: true },
)

onUnmounted(() => {
  if (pauseInterval !== null) clearInterval(pauseInterval)
})

const accumulatedChimes = computed(() => {
  void pauseTick.value
  return Math.max(0, gameStore.chimes - pauseStartChimes.value)
})

const pauseKills = computed(() => gameStore.pauseStats.kills)

const pauseMaterialEntries = computed(() =>
  Object.entries(gameStore.pauseStats.materialsEarned).map(([id, amount]) => {
    const mat = MATERIALS.find((m) => m.id === id)
    return { id, amount, name: mat?.name ?? id, image: mat?.image ?? null }
  }),
)

function unpause() {
  window.focus()
}

function particleStyle(i: number): Record<string, string> {
  const angle = (i / 20) * 360
  const dist = 160 + ((i * 23) % 160)
  const size = 2 + (i % 5)
  const delay = ((i * 0.35) % 3).toFixed(1)
  const duration = (3.5 + (i % 5)).toFixed(1)
  const x = Math.cos((angle * Math.PI) / 180) * dist
  const y = Math.sin((angle * Math.PI) / 180) * dist
  return {
    '--x': `${x}px`,
    '--y': `${y}px`,
    '--size': `${size}px`,
    '--delay': `${delay}s`,
    '--duration': `${duration}s`,
    left: `calc(50% + ${x}px)`,
    top: `calc(50% + ${y}px)`,
    width: `${size}px`,
    height: `${size}px`,
    animationDelay: `${delay}s`,
    animationDuration: `${duration}s`,
  }
}
</script>

<style scoped>
/* ─── Overlay ──────────────────────────────────────────────────────────── */
.pause-overlay {
  position: fixed;
  inset: 0;
  z-index: 9998;
  display: flex;
  align-items: center;
  justify-content: center;
  background: radial-gradient(
    ellipse at 50% 30%,
    rgba(60, 20, 0, 0.72) 0%,
    rgba(0, 0, 0, 0.95) 70%
  );
  backdrop-filter: blur(3px);
}

/* ─── Scanlines ────────────────────────────────────────────────────────── */
.overlay-scanlines {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: repeating-linear-gradient(
    to bottom,
    transparent 0px,
    transparent 3px,
    rgba(0, 0, 0, 0.08) 3px,
    rgba(0, 0, 0, 0.08) 4px
  );
  z-index: 0;
}

/* ─── Floating particles ───────────────────────────────────────────────── */
.pause-particles {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}
.particle {
  position: absolute;
  border-radius: 50%;
  background: radial-gradient(circle, #e8c04099 0%, transparent 70%);
  animation: particle-float var(--duration, 5s) ease-in-out var(--delay, 0s) infinite alternate;
  opacity: 0.35;
}
@keyframes particle-float {
  0% {
    transform: translateY(0px) scale(1);
    opacity: 0.2;
  }
  50% {
    opacity: 0.55;
  }
  100% {
    transform: translateY(-28px) scale(1.4);
    opacity: 0.1;
  }
}

/* ─── Card ─────────────────────────────────────────────────────────────── */
.pause-card {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  min-width: 440px;
  max-width: 540px;
  width: 100%;
  background: radial-gradient(ellipse at 50% 0%, #261508 0%, #0b0704 55%), #0b0704;
  border: 2px solid #7a4e20;
  box-shadow:
    inset 0 0 0 1px #3e200a,
    inset 0 0 60px rgba(200, 144, 64, 0.06),
    0 0 80px rgba(200, 144, 64, 0.18),
    0 40px 100px rgba(0, 0, 0, 0.95);
  border-radius: 8px;
  overflow: hidden;
}

/* ─── Corners with gems ────────────────────────────────────────────────── */
.corner {
  position: absolute;
  width: 20px;
  height: 20px;
  border-color: #c89040;
  border-style: solid;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
}
.corner--tl {
  top: 5px;
  left: 5px;
  border-width: 2px 0 0 2px;
}
.corner--tr {
  top: 5px;
  right: 5px;
  border-width: 2px 2px 0 0;
}
.corner--bl {
  bottom: 5px;
  left: 5px;
  border-width: 0 0 2px 2px;
}
.corner--br {
  bottom: 5px;
  right: 5px;
  border-width: 0 2px 2px 0;
}
.corner-gem {
  position: absolute;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #c89040;
  box-shadow: 0 0 6px #e8c040;
}

/* ─── Ornament bars ────────────────────────────────────────────────────── */
.pause-ornament-top {
  height: 5px;
  flex-shrink: 0;
  background: linear-gradient(
    to right,
    #2a0e00,
    #7a3a10,
    #c89040,
    #f0d060,
    #f8e070,
    #f0d060,
    #c89040,
    #7a3a10,
    #2a0e00
  );
}
.pause-ornament-bottom {
  height: 5px;
  flex-shrink: 0;
  background: linear-gradient(to right, #2a0e00, #5c2a0a, #7a4e20, #5c2a0a, #2a0e00);
  opacity: 0.7;
}

/* ─── Header ───────────────────────────────────────────────────────────── */
.pause-header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
  padding: 18px 32px 14px;
  background: linear-gradient(to bottom, #1e1208, #100c06);
  border-bottom: 1px solid #5c3310;
  color: #e8c040;
}
.pause-header-icon {
  color: rgba(200, 144, 64, 0.55);
  flex-shrink: 0;
}
.pause-title-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}
.pause-eyebrow {
  font-size: 0.65rem;
  color: rgba(200, 160, 64, 0.5);
  letter-spacing: 0.2em;
  text-transform: uppercase;
}
.pause-title {
  font-size: 1.65rem;
  color: #f0d060;
  margin: 0;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  text-shadow:
    0 0 24px rgba(240, 208, 96, 0.6),
    0 0 50px rgba(200, 144, 64, 0.3);
}

/* ─── Divider ──────────────────────────────────────────────────────────── */
.pause-divider {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 24px;
  margin: 2px 0;
}
.pause-divider--sm {
  margin: 2px 0;
}
.divider-line {
  flex: 1;
  height: 1px;
  background: linear-gradient(to right, transparent, #7a4e2077, #c8904044, #7a4e2077, transparent);
}
.divider-rune {
  font-size: 0.95rem;
  color: rgba(200, 144, 64, 0.4);
}

/* ─── Body ─────────────────────────────────────────────────────────────── */
.pause-body {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 14px 24px 20px;
}
.pause-subtitle {
  font-size: 0.82rem;
  color: rgba(200, 185, 140, 0.45);
  margin: 0;
  letter-spacing: 0.07em;
}

/* ══════════════════════════════════════════════════════════════════════
   ─── HP HERO BLOCK ──────────────────────────────────────────────────
   ══════════════════════════════════════════════════════════════════════ */
.hp-hero {
  width: 100%;
  padding: 20px 20px 16px;
  background: linear-gradient(135deg, #1c1006 0%, #0e0804 100%);
  border: 2px solid #7a4e20;
  border-radius: 6px;
  box-shadow:
    inset 0 0 0 1px #3e200a,
    inset 0 0 30px rgba(200, 144, 64, 0.05),
    0 0 20px rgba(200, 144, 64, 0.1);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.hp-hero-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.hp-hero-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.hp-hero-icon {
  font-size: 1.1rem;
  animation: heartbeat 1.6s ease-in-out infinite;
}
@keyframes heartbeat {
  0%,
  100% {
    transform: scale(1);
  }
  14% {
    transform: scale(1.2);
  }
  28% {
    transform: scale(1);
  }
  42% {
    transform: scale(1.15);
  }
  56% {
    transform: scale(1);
  }
}
.hp-hero-label {
  font-size: 0.8rem;
  color: rgba(200, 185, 140, 0.6);
  text-transform: uppercase;
  letter-spacing: 0.1em;
}
.hp-hero-badge {
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  padding: 2px 7px;
  border-radius: 3px;
  text-transform: uppercase;
}
.hp-badge--great {
  background: rgba(82, 184, 48, 0.2);
  color: #52b830;
  border: 1px solid rgba(82, 184, 48, 0.4);
}
.hp-badge--good {
  background: rgba(82, 184, 48, 0.12);
  color: #7ec050;
  border: 1px solid rgba(82, 184, 48, 0.28);
}
.hp-badge--warn {
  background: rgba(212, 160, 32, 0.18);
  color: #d4a020;
  border: 1px solid rgba(212, 160, 32, 0.35);
}
.hp-badge--crit {
  background: rgba(204, 96, 80, 0.2);
  color: #e05040;
  border: 1px solid rgba(204, 96, 80, 0.45);
  animation: crit-blink 0.9s step-start infinite;
}
@keyframes crit-blink {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.hp-hero-numbers {
  display: flex;
  align-items: baseline;
  gap: 2px;
}
.hp-current {
  font-size: 2rem;
  font-weight: 800;
  line-height: 1;
  transition: color 400ms;
}
.hp-sep {
  font-size: 1.1rem;
  color: rgba(200, 185, 140, 0.3);
  margin: 0 2px;
}
.hp-max {
  font-size: 1rem;
  color: rgba(200, 185, 140, 0.45);
}

/* The big HP bar */
.hp-bar-track--hero {
  position: relative;
  width: 100%;
  height: 18px;
  background: #060402;
  border: 1px solid #3e200a;
  border-radius: 5px;
  overflow: hidden;
  box-shadow: inset 0 2px 6px rgba(0, 0, 0, 0.7);
}
.hp-bar-fill--hero {
  height: 100%;
  border-radius: 4px;
  transition:
    width 600ms cubic-bezier(0.25, 1, 0.5, 1),
    background 600ms ease;
  position: relative;
}
.hp-bar-fill--hero::after {
  content: '';
  position: absolute;
  inset: 2px 4px;
  background: linear-gradient(to bottom, rgba(255, 255, 255, 0.18), transparent);
  border-radius: 2px;
  pointer-events: none;
}
.hp-tick {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 1px;
  background: rgba(0, 0, 0, 0.4);
  z-index: 1;
}
.hp-danger-pulse {
  position: absolute;
  inset: 0;
  background: rgba(204, 96, 80, 0.15);
  animation: danger-pulse 0.8s ease-in-out infinite alternate;
  z-index: 2;
  pointer-events: none;
}
@keyframes danger-pulse {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

/* Segment indicators */
.hp-segments {
  display: flex;
  gap: 3px;
  width: 100%;
}
.hp-seg {
  flex: 1;
  height: 4px;
  border-radius: 2px;
  background: #1a0e06;
  border: 1px solid #3e200a;
  transition:
    background 400ms,
    box-shadow 400ms;
}
.hp-seg--filled {
  background: #3a6a20;
  box-shadow: 0 0 4px rgba(82, 184, 48, 0.4);
}
.hp-seg--filled.hp-seg--danger {
  background: #8a2010;
  box-shadow: 0 0 4px rgba(204, 96, 80, 0.5);
}

/* Flavor text */
.hp-flavor-text {
  font-size: 0.78rem;
  color: rgba(200, 185, 140, 0.45);
  text-align: center;
  letter-spacing: 0.05em;
  font-style: italic;
  min-height: 1.1em;
}
.text--danger {
  color: #e05040;
  font-style: normal;
  font-weight: 600;
  animation: crit-blink 0.9s step-start infinite;
}

/* HP color classes */
.hp--green {
  background: linear-gradient(to right, #2e7a1a, #52b830);
  box-shadow: 0 0 10px rgba(82, 184, 48, 0.5);
}
.hp--yellow {
  background: linear-gradient(to right, #7a5010, #d4a020);
  box-shadow: 0 0 10px rgba(212, 160, 32, 0.5);
}
.hp--red {
  background: linear-gradient(to right, #6a1a10, #cc6050);
  box-shadow: 0 0 10px rgba(204, 96, 80, 0.6);
}

/* text color variants for hp-current */
.hp-current.hp--green {
  color: #62d840;
}
.hp-current.hp--yellow {
  color: #e8c040;
}
.hp-current.hp--red {
  color: #e06050;
}

/* ─── Chime reward ─────────────────────────────────────────────────────── */
.chime-reward {
  position: relative;
  display: flex;
  align-items: center;
  gap: 18px;
  width: 100%;
  padding: 16px 18px;
  background: linear-gradient(135deg, #1a1008 0%, #130c04 100%);
  border: 2px solid #7a4e20;
  border-radius: 5px;
  box-shadow:
    inset 0 0 0 1px #3e200a,
    inset 0 0 20px rgba(200, 144, 64, 0.05);
  overflow: hidden;
}
.chime-reward-glow {
  position: absolute;
  top: -40px;
  right: -40px;
  width: 120px;
  height: 120px;
  background: radial-gradient(circle, rgba(232, 192, 64, 0.14) 0%, transparent 70%);
  pointer-events: none;
}
.chime-reward-icon {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 54px;
  height: 54px;
  background: #120e06;
  border: 2px solid #7a4e20;
  border-radius: 5px;
  box-shadow:
    inset 0 0 0 1px #3e200a,
    0 0 16px rgba(200, 144, 64, 0.22);
}
.chime-img {
  width: 40px;
  height: 40px;
  object-fit: contain;
  image-rendering: pixelated;
  filter: drop-shadow(0 0 7px rgba(232, 192, 64, 0.45));
}
.chime-reward-text {
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.chime-label {
  font-size: 0.72rem;
  color: rgba(200, 185, 140, 0.45);
  text-transform: uppercase;
  letter-spacing: 0.1em;
}
.chime-value {
  font-size: 1.9rem;
  font-weight: 700;
  color: #f0d060;
  text-shadow:
    0 0 18px rgba(240, 208, 96, 0.65),
    0 0 36px rgba(200, 144, 64, 0.3);
  line-height: 1;
  animation: chime-pulse 2.5s ease-in-out infinite;
}
@keyframes chime-pulse {
  0%,
  100% {
    text-shadow:
      0 0 16px rgba(240, 208, 96, 0.55),
      0 0 32px rgba(200, 144, 64, 0.25);
  }
  50% {
    text-shadow:
      0 0 28px rgba(240, 208, 96, 0.9),
      0 0 56px rgba(200, 144, 64, 0.5);
  }
}
.chime-sublabel {
  font-size: 0.72rem;
  color: rgba(200, 185, 140, 0.35);
}

/* ─── Notifications grid ───────────────────────────────────────────────── */
.notifications-grid {
  display: flex;
  flex-direction: column;
  gap: 7px;
  width: 100%;
}

.notif-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-radius: 5px;
  border: 1px solid;
  font-size: 0.86rem;
}
.notif-card--wide {
  align-items: flex-start;
}

.notif-card--gold {
  background: rgba(232, 192, 64, 0.07);
  border-color: rgba(232, 192, 64, 0.32);
  color: #e8c040;
}
.notif-card--green {
  background: rgba(82, 184, 48, 0.07);
  border-color: rgba(82, 184, 48, 0.28);
  color: #52b830;
}
.notif-card--red {
  background: rgba(204, 96, 80, 0.07);
  border-color: rgba(204, 96, 80, 0.32);
  color: #e07060;
}
.notif-card--teal {
  background: rgba(64, 192, 180, 0.06);
  border-color: rgba(64, 192, 180, 0.26);
  color: rgba(64, 210, 200, 0.85);
}

.notif-icon {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: 5px;
  border: 1px solid currentColor;
}
.notif-icon--gold {
  color: #e8c040;
  background: rgba(232, 192, 64, 0.1);
}
.notif-icon--green {
  color: #52b830;
  background: rgba(82, 184, 48, 0.1);
}
.notif-icon--red {
  color: #cc6050;
  background: rgba(204, 96, 80, 0.1);
}
.notif-icon--teal {
  color: #40c0b4;
  background: rgba(64, 192, 180, 0.1);
}

.notif-body {
  display: flex;
  flex-direction: column;
  gap: 1px;
  flex: 1;
}
.notif-title {
  font-weight: 700;
  font-size: 0.84rem;
}
.notif-desc {
  font-size: 0.76rem;
  opacity: 0.7;
}
.notif-body--mats {
  gap: 6px;
}

.notif-badge {
  margin-left: auto;
  flex-shrink: 0;
  min-width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 5px;
  font-size: 0.88rem;
  font-weight: 700;
  padding: 0 6px;
}
.notif-badge--gold {
  background: rgba(232, 192, 64, 0.15);
  color: #f0d060;
  border: 1px solid rgba(232, 192, 64, 0.35);
}
.notif-badge--green {
  background: rgba(82, 184, 48, 0.15);
  color: #52b830;
  border: 1px solid rgba(82, 184, 48, 0.35);
}
.notif-badge--red {
  background: rgba(204, 96, 80, 0.15);
  color: #e06050;
  border: 1px solid rgba(204, 96, 80, 0.35);
}

/* Mats */
.mats-list {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}
.mat-entry {
  display: flex;
  align-items: center;
  gap: 4px;
  background: rgba(64, 192, 180, 0.08);
  border: 1px solid rgba(64, 192, 180, 0.2);
  border-radius: 4px;
  padding: 2px 8px;
  font-size: 0.8rem;
}
.mat-icon {
  width: 16px;
  height: 16px;
  object-fit: contain;
  image-rendering: pixelated;
}
.mat-amount {
  color: #40c0b4;
  font-weight: 700;
}

/* ─── Button ───────────────────────────────────────────────────────────── */
.pause-btn {
  position: relative;
  margin-top: 4px;
  padding: 0;
  background: transparent;
  border: none;
  cursor: pointer;
  overflow: hidden;
  border-radius: 5px;
  width: 100%;
  max-width: 260px;
}
.pause-btn-inner {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 14px 36px;
  background: linear-gradient(to bottom, #4aaa28, #2d7818);
  border: 2px solid #6ec040;
  border-radius: 5px;
  color: #fff;
  font-size: 1rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.5);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.18),
    0 4px 20px rgba(78, 168, 40, 0.35);
  transition:
    filter 120ms,
    transform 120ms;
  width: 100%;
}
.pause-btn-shine {
  position: absolute;
  top: 0;
  left: -100%;
  width: 60%;
  height: 100%;
  background: linear-gradient(to right, transparent, rgba(255, 255, 255, 0.12), transparent);
  transform: skewX(-20deg);
  transition: left 400ms ease;
}
.pause-btn:hover .pause-btn-inner {
  filter: brightness(1.15);
  transform: translateY(-1px);
}
.pause-btn:hover .pause-btn-shine {
  left: 160%;
}
.pause-btn:active .pause-btn-inner {
  filter: brightness(0.9);
  transform: translateY(1px);
}

/* ─── Transitions ──────────────────────────────────────────────────────── */
.pause-fade-enter-active {
  transition:
    opacity 280ms ease,
    transform 280ms cubic-bezier(0.34, 1.56, 0.64, 1);
}
.pause-fade-leave-active {
  transition:
    opacity 180ms ease,
    transform 180ms ease;
}
.pause-fade-enter-from,
.pause-fade-leave-to {
  opacity: 0;
  transform: scale(0.92);
}
</style>
