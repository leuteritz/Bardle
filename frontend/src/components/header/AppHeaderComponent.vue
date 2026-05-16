<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useGameStore } from '../../stores/gameStore'
import { useUiStore } from '../../stores/uiStore'
import { formatNumber } from '../../config/numberFormat'
import BardProfileMenu from '../bardProfil/BardProfileMenu.vue'
import UniverseRescueComponent from './UniverseRescueComponent.vue'
import HeaderMaterialsComponent from './HeaderMaterialsComponent.vue'

const gameStore = useGameStore()
const uiStore = useUiStore()

const headerRef = ref<HTMLElement | null>(null)
const chimesRef = ref<HTMLElement | null>(null)
let resizeObserver: ResizeObserver | null = null

const xpProgress = computed(() => Math.max(0, Math.min(1, (gameStore.levelProgress ?? 0) / 100)))

const svgW = ref(360)
const svgH = ref(100)

const arcD = computed(
  () => `M 0,0 A ${svgW.value / 2},${svgH.value} 0 0 0 ${svgW.value},0`,
)

const arcLen = computed(() => {
  const a = svgW.value / 2
  const b = svgH.value
  const h = Math.pow(a - b, 2) / Math.pow(a + b, 2)
  return (Math.PI * (a + b) * (1 + (3 * h) / (10 + Math.sqrt(4 - 3 * h)))) / 2
})

const arcDashoffset = computed(() => arcLen.value * (1 - xpProgress.value))

async function measure() {
  await nextTick()
  if (!chimesRef.value) return
  const r = chimesRef.value.getBoundingClientRect()
  if (!r.width || !r.height) return
  svgW.value = r.width
  svgH.value = r.height
}

function updateHeaderHeight() {
  if (!headerRef.value) return
  const rect = headerRef.value.getBoundingClientRect()
  document.documentElement.style.setProperty('--header-total-height', `${rect.bottom}px`)
}

onMounted(async () => {
  updateHeaderHeight()
  await measure()
  resizeObserver = new ResizeObserver(async () => {
    updateHeaderHeight()
    await measure()
  })
  if (headerRef.value) resizeObserver.observe(headerRef.value)
})

onUnmounted(() => resizeObserver?.disconnect())
</script>

<template>
  <header ref="headerRef" class="z-[120] header-bar w-full max-w-[1400px] mx-auto relative">
    <!-- ════════ LINKE SEITE ════════ -->
    <div class="flex items-center gap-2 header-side header-side--left">
      <div class="flex-shrink-0 header-profile-bump">
        <BardProfileMenu />
      </div>
      <div class="header-divider" aria-hidden="true"></div>
      <HeaderMaterialsComponent style="flex: 1; min-width: 0" />
    </div>

    <!-- ════════ MITTE – Platzhalter ════════ -->
    <div class="header-center-anchor" aria-hidden="true"></div>

    <!-- ════════ MITTE (absolut zentriert) ════════ -->
    <div class="header-center">
      <!-- XP-Bogen entlang der Tropfen-Außenkontur -->
      <svg
        class="xp-arc-overlay"
        :viewBox="`0 0 ${svgW} ${svgH}`"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="xp-grad-fixed" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#c89040" />
            <stop offset="50%" stop-color="#f0d060" />
            <stop offset="100%" stop-color="#c89040" />
          </linearGradient>
        </defs>

        <path
          :d="arcD"
          fill="none"
          stroke="rgba(160,110,15,0.55)"
          stroke-width="6"
          stroke-linecap="round"
        />

        <path
          :d="arcD"
          fill="none"
          stroke="url(#xp-grad-fixed)"
          stroke-width="6"
          stroke-linecap="round"
          :stroke-dasharray="arcLen"
          :stroke-dashoffset="arcDashoffset"
          class="xp-arc-fill"
        />
      </svg>

      <div ref="chimesRef" class="center-chimes">
        <span class="chimes-value chimes-text-glow">
          {{ formatNumber(gameStore.chimes) }}
        </span>
        <div class="chimes-sub-row">
          <div class="chimes-sub-stat">
            <img
              src="/img/BardAbilities/BardChime.png"
              class="sub-chime-icon chime-glow-green"
              alt=""
              aria-hidden="true"
            />
            <span class="sub-stat-value cps-text-glow">{{
              formatNumber(gameStore.chimesPerSecond)
            }}</span>
            <span class="sub-stat-label cps-text-glow">/sec</span>
          </div>
          <div class="chimes-sub-divider" aria-hidden="true"></div>
          <div class="chimes-sub-stat">
            <img
              src="/img/BardAbilities/BardChime.png"
              class="sub-chime-icon chime-glow-click"
              alt=""
              aria-hidden="true"
            />
            <span class="sub-stat-value click-text-glow">{{
              formatNumber(gameStore.chimesPerClick)
            }}</span>
            <span class="sub-stat-label click-text-glow">/click</span>
          </div>
        </div>
      </div>
    </div>

    <!-- ════════ RECHTE SEITE ════════ -->
    <div class="flex items-center gap-2 header-side header-side--right">
      <div class="z-[65] header-portal-wrap" style="flex: 1; min-width: 0">
        <UniverseRescueComponent />
      </div>
      <div class="header-divider" aria-hidden="true"></div>
      <div class="flex-shrink-0 header-inventory-bump">
        <button
          class="inventory-circle-btn"
          title="Skilltree öffnen"
          @click="uiStore.setBardTab('tree')"
        >
          <div class="relative w-36 h-36">
            <svg class="absolute inset-0 w-full h-full" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="rgba(160,110,15,0.45)"
                stroke-width="7"
              />
            </svg>
            <div class="absolute overflow-hidden inset-2 inventory-portrait-inner">
              <img
                src="/img/menu/TREE.png"
                class="object-contain w-full h-full p-3"
                alt="Skilltree öffnen"
              />
            </div>
          </div>
        </button>
      </div>
    </div>
  </header>
</template>

<style>
/* ================================================================
   HEADER BAR
   ================================================================ */
.header-bar {
  background: var(--rpg-bg-header, rgba(6, 4, 14, 0.88));
  border: 2px solid var(--rpg-wood, #7c4f1a);
  border-top: none;
  border-radius: 0 0 var(--bard-avatar-radius) var(--bard-avatar-radius);
  box-shadow:
    inset 0 0 0 1px var(--rpg-wood-inner, rgba(255, 200, 80, 0.08)),
    inset 0 0 0 3px var(--rpg-wood-mid, rgba(255, 200, 80, 0.04)),
    0 6px 28px rgba(0, 0, 0, 0.75);
  overflow: visible;
  position: relative;
  display: grid;
  grid-template-columns: 1fr clamp(300px, 30vw, 400px) 1fr;
  align-items: stretch;
}

.header-portal-wrap {
  width: clamp(148px, 14vw, 215px);
  align-self: stretch;
  display: flex;
  align-items: stretch;
}

.header-side {
  min-width: 0;
  padding-top: 1px;
  padding-bottom: 1px;
  overflow: hidden;
}
.header-side--left {
  justify-content: flex-start;
}
.header-side--right {
  justify-content: flex-end;
}

.header-profile-bump {
  display: flex;
  align-items: center;
  align-self: stretch;
  flex-shrink: 0;
}

/* ================================================================
   MITTE
   ================================================================ */
.header-center-anchor {
  flex-shrink: 0;
}

.header-center {
  position: absolute;
  left: 50%;
  top: 2px;
  bottom: calc(
    -1 * (max(var(--bump-center), 50dvh - min(480px, 45dvh) - var(--header-total-height)) + 7px)
  );
  transform: translateX(-50%);
  z-index: 20;
  display: flex;
  align-items: center;
  gap: 0;
  pointer-events: none;
  width: clamp(300px, 30vw, 400px);
  overflow: visible;
}

/* ================================================================
   CENTER-CHIMES – Tropfen-Panel
   ================================================================ */
.center-chimes {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0;
  width: 100%;
  flex-shrink: 0;
  flex-grow: 0;
  background: linear-gradient(to bottom, rgba(30, 16, 6, 0.97), rgba(10, 6, 2, 0.99));
  border-left: 1px solid rgba(255, 200, 80, 0.24);
  border-right: 1px solid rgba(255, 200, 80, 0.24);
  border-bottom: 1px solid rgba(255, 200, 80, 0.28);
  border-radius: 0 0 50% 50% / 0 0 100% 100%;
  padding: 4px 20px calc(var(--bump-center) + 10px) 20px;
  box-shadow:
    inset 0 1px 0 rgba(255, 200, 80, 0.08),
    0 6px 24px rgba(0, 0, 0, 0.7);
  align-self: stretch;
  overflow: hidden;
}

/* ================================================================
   XP-BOGEN (Overlay innerhalb .header-center)
   ================================================================ */
.xp-arc-overlay {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  overflow: visible;
  z-index: 2;
}

.xp-arc-fill {
  filter: drop-shadow(0 0 5px rgba(240, 208, 96, 0.75))
    drop-shadow(0 0 12px rgba(240, 208, 96, 0.35));
  transition: stroke-dashoffset 0.8s ease-out;
}

/* ── Unterzeile ── */
.chimes-sub-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 4px;
}
.chimes-sub-stat {
  display: flex;
  align-items: center;
  gap: 4px;
}
.chimes-sub-divider {
  width: 1px;
  height: 18px;
  border-radius: 1px;
  background: linear-gradient(
    to bottom,
    transparent,
    rgba(255, 200, 80, 0.3) 30%,
    rgba(255, 200, 80, 0.3) 70%,
    transparent
  );
  flex-shrink: 0;
  margin-inline: 2px;
}
.sub-chime-icon {
  width: clamp(16px, 2vw, 22px);
  height: clamp(16px, 2vw, 22px);
  object-fit: contain;
  flex-shrink: 0;
  opacity: 0.9;
}
.sub-stat-value {
  font-size: clamp(1rem, 1.6vw, 1.4rem);
  font-weight: 700;
  letter-spacing: 0.03em;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}
.sub-stat-label {
  font-size: clamp(0.78rem, 1.1vw, 1rem);
  font-weight: 600;
  letter-spacing: 0.05em;
  opacity: 0.7;
  line-height: 1;
  margin-left: 1px;
}

/* ================================================================
   TRENNLINIEN
   ================================================================ */
.header-divider {
  flex-shrink: 0;
  width: 2px;
  height: 80px;
  margin-inline: 4px;
  align-self: center;
  border-radius: 1px;
  background: linear-gradient(
    to bottom,
    transparent 0%,
    rgba(124, 79, 26, 0.12) 8%,
    rgba(160, 110, 15, 0.38) 20%,
    rgba(180, 125, 35, 0.52) 50%,
    rgba(160, 110, 15, 0.38) 80%,
    rgba(124, 79, 26, 0.12) 92%,
    transparent 100%
  );
  box-shadow:
    inset 0 0 0 1px rgba(255, 200, 80, 0.08),
    0 0 8px rgba(160, 110, 15, 0.06);
}

/* ================================================================
   TYPOGRAFIE
   ================================================================ */
.header-label {
  font-size: 0.65rem;
  font-weight: 600;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  color: var(--color-label);
  line-height: 1;
  margin-bottom: 1px;
}
.chimes-value {
  font-size: clamp(3rem, 5vw, 5.5rem);
  font-weight: 800;
  letter-spacing: 0.04em;
  color: var(--color-chimes);
  line-height: 1.1;
  font-variant-numeric: tabular-nums;
  text-align: center;
  min-width: 9.5ch;
  white-space: nowrap;
}
.cps-value {
  font-size: clamp(0.9rem, 1.3vw, 1.15rem);
  font-weight: 600;
  letter-spacing: 0.02em;
  color: #74d448;
  line-height: 1.1;
  font-variant-numeric: tabular-nums;
}
.stat-value {
  font-size: clamp(0.8rem, 1.1vw, 1rem);
  font-weight: 600;
  letter-spacing: 0.02em;
  line-height: 1.1;
  font-variant-numeric: tabular-nums;
  color: var(--color-label);
}

/* ================================================================
   GLOWS & FILTER
   ================================================================ */
.chime-glow {
  filter: drop-shadow(0 0 6px rgba(251, 191, 36, 0.7)) drop-shadow(0 0 14px rgba(251, 191, 36, 0.3));
}
.chime-glow-green {
  filter: drop-shadow(0 0 7px rgba(52, 211, 153, 0.5))
    drop-shadow(0 0 14px rgba(52, 211, 153, 0.22));
}
.chime-glow-click {
  filter: drop-shadow(0 0 7px rgba(251, 191, 36, 0.55))
    drop-shadow(0 0 12px rgba(251, 191, 36, 0.22));
}
.chimes-text-glow {
  filter: drop-shadow(0 0 8px rgba(251, 191, 36, 0.5));
}
.cps-text-glow {
  color: #74d448;
  filter: drop-shadow(0 0 7px rgba(116, 212, 72, 0.4));
}
.click-text-glow {
  color: #fbbf24;
  filter: drop-shadow(0 0 7px rgba(251, 191, 36, 0.45));
}
.dmg-text-glow {
  color: #ff7a50;
  filter: drop-shadow(0 0 7px rgba(255, 100, 60, 0.4));
}

/* ================================================================
   CENTER STAT PANELS (Fallback)
   ================================================================ */
.center-stat-panel {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 14px;
  flex-shrink: 0;
  pointer-events: none;
  margin-bottom: var(--bump-center);
}
.center-stat-panel--stacked {
  padding: 0 10px;
}

.stat-grid {
  display: grid;
  grid-template-columns: auto auto;
  column-gap: 6px;
  row-gap: 3px;
  align-items: baseline;
}
.stat-grid--left .header-label,
.stat-grid--left .stat-value,
.stat-grid--right .header-label,
.stat-grid--right .stat-value {
  text-align: left;
}

/* ================================================================
   INVENTAR-KREIS
   ================================================================ */
.header-inventory-bump {
  display: flex;
  align-items: center;
  align-self: stretch;
  flex-shrink: 0;
}
.inventory-circle-btn {
  background: transparent;
  border: none;
  padding: 0;
  cursor: pointer;
  display: block;
}
.inventory-portrait-inner {
  border-radius: 50%;
  background: #141410;
  transition: transform 0.3s ease;
}
.inventory-circle-btn:hover .inventory-portrait-inner {
  transform: scale(1.06);
}
.inventory-circle-btn:active .inventory-portrait-inner {
  transform: scale(0.96);
}

/* ================================================================
   LEGACY
   ================================================================ */
.header-right-status-panel {
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: clamp(150px, 14vw, 210px);
  padding: 6px 8px;
  background: rgba(6, 4, 14, 0.55);
  border: 1px solid rgba(255, 200, 80, 0.12);
  border-radius: 8px;
  box-shadow:
    inset 0 0 0 1px rgba(255, 200, 80, 0.04),
    0 4px 16px rgba(0, 0, 0, 0.45);
}
.status-panel-divider {
  height: 1px;
  background: linear-gradient(
    to right,
    transparent,
    rgba(255, 200, 80, 0.18) 30%,
    rgba(251, 146, 60, 0.18) 70%,
    transparent
  );
  margin-inline: 2px;
}
.header-dot {
  font-size: 1.2rem;
  line-height: 1;
  color: var(--rpg-wood-mid, rgba(255, 200, 80, 0.25));
  user-select: none;
  flex-shrink: 0;
}
</style>
