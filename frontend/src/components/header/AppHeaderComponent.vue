<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useGameStore } from '../../stores/gameStore'
import { useUiStore } from '../../stores/uiStore'
import { useBattleStore } from '../../stores/battleStore'
import { useExpeditionStore } from '../../stores/expeditionStore'
import { formatNumber } from '../../config/numberFormat'
import { usePersistence } from '../../composables/usePersistence'
import { CHAMPION_ROLES } from '../../config/championRoles'
import {
  BOTTOM_FRAME_STROKE_SHADOW,
  BOTTOM_FRAME_STROKE_WOOD,
  BOTTOM_FRAME_STROKE_GRAIN,
  BOTTOM_FRAME_STROKE_SHEEN,
  CHAMP_TOOLTIP_MAX_VISIBLE,
} from '../../config/constants'
import BardProfileMenu from '../bardProfil/BardProfileMenu.vue'
import UniverseRescueComponent from './UniverseRescueComponent.vue'
import HeaderMaterialsComponent from './HeaderMaterialsComponent.vue'
import SunPhaseIndicator from './SunPhaseIndicator.vue'

const gameStore = useGameStore()
const uiStore = useUiStore()
const battleStore = useBattleStore()
const expeditionStore = useExpeditionStore()
const { resetGame } = usePersistence()

const championBadgeCount = computed(() => battleStore.newlyUnlockedChampions.length)
const expeditionBadgeCount = computed(
  () => expeditionStore.activeExpeditions.filter((e) => e.status !== 'active').length,
)

const expedBadgeStyle = computed(() => {
  const xFrac = 0.22
  const t = (xFrac - 0.5) / 0.5
  return {
    top: `${svgH.value * Math.sqrt(Math.max(0, 1 - t * t)) - badgeOverlapPx.value}px`,
    left: `${svgW.value * xFrac}px`,
  }
})
const champBadgeStyle = computed(() => {
  const xFrac = 0.78
  const t = (xFrac - 0.5) / 0.5
  return {
    top: `${svgH.value * Math.sqrt(Math.max(0, 1 - t * t)) - badgeOverlapPx.value}px`,
    left: `${svgW.value * xFrac}px`,
  }
})

function openTeamTab() {
  uiStore.openBardModal()
  uiStore.setBardTab('team')
}

// ── Champion badge tooltip ────────────────────────────────────────────────────
const champBadgeRef = ref<HTMLButtonElement | null>(null)
const showChampTooltip = ref(false)
const champTooltipStyle = ref<Record<string, string>>({ left: '0px', top: '0px', transform: '' })
let champHideTimer: ReturnType<typeof setTimeout> | null = null

const champTooltipList = computed(() =>
  battleStore.newlyUnlockedChampions.slice(0, CHAMP_TOOLTIP_MAX_VISIBLE),
)
const champTooltipExtra = computed(() =>
  Math.max(0, battleStore.newlyUnlockedChampions.length - CHAMP_TOOLTIP_MAX_VISIBLE),
)

const ROLE_DISPLAY: Record<string, { label: string; color: string }> = {
  top:     { label: 'Fighter',  color: '#e6813a' },
  jungle:  { label: 'Assassin', color: '#e8534a' },
  mid:     { label: 'Mage',     color: '#5b8de8' },
  adc:     { label: 'Marksman', color: '#61c76f' },
  support: { label: 'Support',  color: '#c37de0' },
}

function getRoleDisplay(name: string) {
  const role = CHAMPION_ROLES[name] ?? 'mid'
  return ROLE_DISPLAY[role] ?? { label: 'Mage', color: '#5b8de8' }
}

function onChampBadgeEnter() {
  if (champHideTimer) { clearTimeout(champHideTimer); champHideTimer = null }
  if (champBadgeRef.value) {
    const rect = champBadgeRef.value.getBoundingClientRect()
    champTooltipStyle.value = {
      left: `${rect.left}px`,
      top: `${rect.bottom + 8}px`,
      transform: 'none',
      '--caret-x': `${rect.width / 2}px`,
    }
  }
  showChampTooltip.value = true
}

function onChampBadgeLeave() {
  champHideTimer = setTimeout(() => { showChampTooltip.value = false }, 120)
}

function onChampTooltipEnter() {
  if (champHideTimer) { clearTimeout(champHideTimer); champHideTimer = null }
}

function onChampTooltipLeave() {
  champHideTimer = setTimeout(() => { showChampTooltip.value = false }, 120)
}

function openChampionInShop(name: string) {
  showChampTooltip.value = false
  uiStore.pendingChampionSearch = name
  uiStore.setBardTab('team')
}

function handleReset() {
  if (
    window.confirm(
      'Really delete save? This action cannot be undone.',
    )
  ) {
    resetGame()
  }
}

const headerRef = ref<HTMLElement | null>(null)
const chimesRef = ref<HTMLElement | null>(null)
const leftDividerRef = ref<HTMLElement | null>(null)
const rightDividerRef = ref<HTMLElement | null>(null)
let resizeObserver: ResizeObserver | null = null

const xpProgress = computed(() => Math.max(0, Math.min(1, (gameStore.levelProgress ?? 0) / 100)))

const svgW = ref(360)
const svgH = ref(100)
const badgeOverlapPx = ref(20)

const headerW = ref(0)
const headerH = ref(0)
const headerR = ref(20)

const headerFramePath = computed(() => {
  const W = headerW.value
  const H = headerH.value
  const R = headerR.value
  const O = 1.5
  if (!W || !H) return ''
  return [
    `M ${O},0`,
    `L ${O},${H - R}`,
    `A ${R},${R} 0 0,0 ${R + O},${H - O}`,
    `L ${W - R - O},${H - O}`,
    `A ${R},${R} 0 0,0 ${W - O},${H - R}`,
    `L ${W - O},0`,
  ].join(' ')
})

const arcD = computed(() => `M 0,0 A ${svgW.value / 2},${svgH.value} 0 0 0 ${svgW.value},0`)

const arcLen = computed(() => {
  const a = svgW.value / 2
  const b = svgH.value
  const h = Math.pow(a - b, 2) / Math.pow(a + b, 2)
  return (Math.PI * (a + b) * (1 + (3 * h) / (10 + Math.sqrt(4 - 3 * h)))) / 2
})

const arcDashoffset = computed(() => arcLen.value * (1 - xpProgress.value))

const chimesForLevel = computed(() => ({
  current: gameStore.currentLevelChimes,
  total: gameStore.totalChimesThisLevel,
}))

const showCenterTooltip = ref(false)
const centerTooltipStyle = ref<{ left: string; top: string }>({ left: '0px', top: '0px' })

function onCenterEnter() {
  if (chimesRef.value) {
    const rect = chimesRef.value.getBoundingClientRect()
    centerTooltipStyle.value = {
      left: `${rect.left + rect.width / 2}px`,
      top: `${rect.bottom + 40}px`,
    }
  }
  showCenterTooltip.value = true
}

function onCenterLeave() {
  showCenterTooltip.value = false
}

async function measure() {
  await nextTick()
  if (!chimesRef.value) return
  const r = chimesRef.value.getBoundingClientRect()
  if (!r.width || !r.height) return
  svgW.value = r.width
  svgH.value = r.height
  document.documentElement.style.setProperty('--xp-arc-outer-width', `${r.width}px`)

  // Compute where the center-chimes' VISIBLE curved border is at the timer-bar y-level.
  // border-radius: 0 0 50% 50% / 0 0 100% 100% → entire left/right sides are elliptical arcs
  // with h-radius = 50%w, v-radius = 100%h, arc center at (w/2, 0) relative to element top.
  const headerRect = headerRef.value!.getBoundingClientRect()
  const timerBarY = Math.max(0, headerRect.bottom - r.top)   // y from element top to timer-bar row
  const hR = r.width * 0.5
  const vR = r.height
  const t = Math.min(1, timerBarY / vR)
  const xInset = hR * (1 - Math.sqrt(1 - t * t))       // inset of visible border from box edge
  document.documentElement.style.setProperty('--bar-side-width',
    `${Math.max(0, r.left + xInset - headerRect.left)}px`)
  // Read actual rendered badge height so --level-badge-bottom stays correct at all fluid sizes
  const badgeEl = headerRef.value?.querySelector('.arc-level-badge') as HTMLElement | null
  const badgeH = badgeEl ? badgeEl.getBoundingClientRect().height : 50
  badgeOverlapPx.value = badgeH * 0.4
  document.documentElement.style.setProperty('--level-badge-bottom', `${r.bottom + badgeH * 0.6}px`)
}

function updateHeaderHeight() {
  if (!headerRef.value) return
  const rect = headerRef.value.getBoundingClientRect()
  document.documentElement.style.setProperty('--header-total-height', `${rect.bottom}px`)
  document.documentElement.style.setProperty('--header-vp-left',  `${rect.left}px`)
  document.documentElement.style.setProperty('--header-vp-right', `${window.innerWidth - rect.right}px`)
  headerW.value = rect.width
  headerH.value = rect.height
  headerR.value = parseFloat(getComputedStyle(headerRef.value).borderBottomLeftRadius) || 20
}

function updateDividerPositions() {
  const l = leftDividerRef.value?.getBoundingClientRect()
  const r = rightDividerRef.value?.getBoundingClientRect()
  if (!l || !r) return
  document.documentElement.style.setProperty('--bard-profile-left', `${l.left}px`)
  document.documentElement.style.setProperty('--bard-profile-right', `${window.innerWidth - r.right}px`)
}

onMounted(async () => {
  updateHeaderHeight()
  updateDividerPositions()
  await measure()
  resizeObserver = new ResizeObserver(async () => {
    updateHeaderHeight()
    updateDividerPositions()
    await measure()
  })
  if (headerRef.value) resizeObserver.observe(headerRef.value)
})

onUnmounted(() => resizeObserver?.disconnect())
</script>

<template>
  <header ref="headerRef" class="z-[120] header-bar w-full mx-auto relative">
    <!-- ════════ SVG WOOD FRAME (same technique as BottomBarComponent) ════════ -->
    <svg
      class="header-frame-svg"
      :viewBox="`0 0 ${headerW} ${headerH}`"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path :d="headerFramePath" fill="none" :stroke="BOTTOM_FRAME_STROKE_SHADOW" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" />
      <path :d="headerFramePath" fill="none" :stroke="BOTTOM_FRAME_STROKE_WOOD"   stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
      <path :d="headerFramePath" fill="none" :stroke="BOTTOM_FRAME_STROKE_GRAIN"  stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
      <path :d="headerFramePath" fill="none" :stroke="BOTTOM_FRAME_STROKE_SHEEN"  stroke-width="1"   stroke-linecap="round" />
    </svg>

    <!-- ════════ LINKE SEITE ════════ -->
    <div class="flex items-center gap-3 header-side header-side--left">
      <div class="flex-shrink-0 header-profile-bump">
        <BardProfileMenu />
      </div>
      <div ref="leftDividerRef" class="header-divider" aria-hidden="true"></div>
      <HeaderMaterialsComponent style="flex: 1; min-width: 0" />
    </div>

    <!-- ════════ MITTE – Platzhalter ════════ -->
    <div class="header-center-anchor" aria-hidden="true"></div>

    <!-- ════════ MITTE (absolut zentriert) ════════ -->
    <div class="header-center">
      <!-- XP-Bogen entlang der Tropfen-Außenkontur -->
      <svg class="xp-arc-overlay" :viewBox="`0 0 ${svgW} ${svgH}`" aria-hidden="true">
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

      <div
        ref="chimesRef"
        class="center-chimes"
        @mouseenter="onCenterEnter"
        @mouseleave="onCenterLeave"
        @click="uiStore.setBardTab('bard')"
      >
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

      <div class="arc-level-badge" :style="{ top: (svgH - badgeOverlapPx) + 'px' }">
        <span class="arc-level-text">{{ gameStore.level }}</span>
      </div>

      <button
        class="center-reset-btn"
        :style="{ top: (svgH - badgeOverlapPx * 0.5) + 'px' }"
        title="Delete Save"
        @click.stop="handleReset"
      >
        ✕
      </button>

      <Transition name="header-badge">
        <button
          v-if="expeditionBadgeCount > 0"
          class="header-notif-badge header-notif-badge--expedition"
          :style="expedBadgeStyle"
          :aria-label="`${expeditionBadgeCount} expedition(s) ready`"
          @click.stop="openTeamTab"
        >{{ expeditionBadgeCount }}</button>
      </Transition>

      <Transition name="header-badge">
        <button
          v-if="championBadgeCount > 0"
          ref="champBadgeRef"
          class="header-notif-badge header-notif-badge--champion"
          :style="champBadgeStyle"
          :aria-label="`${championBadgeCount} new champion(s)`"
          @click.stop="openTeamTab"
          @mouseenter="onChampBadgeEnter"
          @mouseleave="onChampBadgeLeave"
        >{{ championBadgeCount }}</button>
      </Transition>
    </div>

    <!-- ════════ RECHTE SEITE ════════ -->
    <div class="flex items-center gap-3 header-side header-side--right">
      <SunPhaseIndicator />
      <div class="z-[65] header-portal-wrap" style="flex: 1">
        <UniverseRescueComponent />
      </div>
      <div ref="rightDividerRef" class="header-divider" aria-hidden="true"></div>
      <div class="flex-shrink-0 header-inventory-bump">
        <button class="btn-gem" title="Open Skill Tree" @click="uiStore.setBardTab('tree')">
          <img src="/img/menu/TREE.png" class="btn-gem-img" alt="Open Skill Tree" />
        </button>
      </div>
    </div>
  </header>

  <Teleport to="body">
    <Transition name="xp-tt">
      <div v-if="showCenterTooltip" class="xp-tt" :style="centerTooltipStyle" aria-hidden="true">
        <div class="xp-tt__caret" />
        <span class="xp-tt__label">Next Level</span>
        <div class="xp-tt__row">
          <span class="xp-tt__current">{{ chimesForLevel.current.toLocaleString('en-US') }}</span>
          <span class="xp-tt__sep">/</span>
          <span class="xp-tt__total">{{ chimesForLevel.total.toLocaleString('en-US') }}</span>
          <span class="xp-tt__unit">Chimes</span>
        </div>
        <div class="xp-tt__percent">{{ Math.round(xpProgress * 100) }} % to next Level</div>
      </div>
    </Transition>

    <Transition name="champ-tt">
      <div
        v-if="showChampTooltip && champTooltipList.length > 0"
        class="champ-tt"
        :style="champTooltipStyle"
        @mouseenter="onChampTooltipEnter"
        @mouseleave="onChampTooltipLeave"
      >
        <div class="champ-tt__caret" />
        <ul class="champ-tt__list">
          <li
            v-for="name in champTooltipList"
            :key="name"
            class="champ-tt__item"
            @click="openChampionInShop(name)"
          >
            <img
              :src="battleStore.getChampionImage(name)"
              class="champ-tt__img"
              :alt="name"
            />
            <span class="champ-tt__name" :style="{ color: getRoleDisplay(name).color }">{{ name }}</span>
          </li>
          <li v-if="champTooltipExtra > 0" class="champ-tt__item champ-tt__item--more">
            <span class="champ-tt__more-dots">…</span>
            <span class="champ-tt__more-count">+{{ champTooltipExtra }} more</span>
          </li>
        </ul>
      </div>
    </Transition>
  </Teleport>
</template>

<style>
/* ================================================================
   HEADER BAR
   ================================================================ */
.header-bar {
  max-width: var(--header-max-width);
  height: var(--header-height);
  background: var(--rpg-bg-header, rgba(6, 4, 14, 0.88));
  border-radius: 0 0 var(--bard-avatar-radius) var(--bard-avatar-radius);
  overflow: visible;
  position: relative;
  display: grid;
  grid-template-columns: 1fr clamp(90px, 14vw, 270px) 1fr;
  align-items: stretch;
}

.header-frame-svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  overflow: visible;
  z-index: 0;
}

.header-portal-wrap {
  min-width: clamp(150px, 15vw, 280px);
  align-self: stretch;
  overflow: hidden;
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
  padding-left: clamp(6px, 1.2vw, 14px);
  /* symmetric inner gap towards the center teardrop (matches --right padding-left) */
  padding-right: clamp(8px, 1vw, 16px);
}
.header-side--right {
  justify-content: flex-end;
  gap: clamp(5px, 0.6vw, 10px);
  padding-right: clamp(6px, 1.2vw, 14px);
  /* symmetric inner gap towards the center teardrop (matches --left padding-right) */
  padding-left: clamp(8px, 1vw, 16px);
}

.header-profile-bump {
  display: flex;
  align-items: center;
  align-self: stretch;
  flex-shrink: 0;
  padding: 0 6px;
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
    -1 * (min(max(var(--bump-center), 50dvh - min(480px, 45dvh) - var(--header-total-height)), clamp(20px, 5dvh, 55px)) + 7px)
  );
  transform: translateX(-50%);
  z-index: 20;
  display: flex;
  align-items: center;
  gap: 0;
  pointer-events: none;
  width: clamp(90px, 14vw, 270px);
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
  padding: 4px 14px calc(var(--bump-center) + 4px) 14px;
  box-shadow:
    inset 0 1px 0 rgba(255, 200, 80, 0.08),
    0 6px 24px rgba(0, 0, 0, 0.7);
  align-self: stretch;
  overflow: hidden;
  pointer-events: auto;
  cursor: pointer;
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
  gap: clamp(4px, 0.7vw, 8px);
  margin-top: 2px;
  opacity: 0.72;
}
.chimes-sub-stat {
  display: flex;
  align-items: center;
  gap: 4px;
}
.chimes-sub-divider {
  width: 1px;
  height: 14px;
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
  width: clamp(10px, 1.1vw, 14px);
  height: clamp(10px, 1.1vw, 14px);
  object-fit: contain;
  flex-shrink: 0;
  opacity: 0.9;
}
.sub-stat-value {
  font-size: clamp(0.55rem, 0.75vw, 0.85rem);
  font-weight: 700;
  letter-spacing: 0.03em;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}
.sub-stat-label {
  font-size: clamp(0.45rem, 0.6vw, 0.72rem);
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
  height: clamp(28px, calc(-1.5px + 2.6vw), 55px);
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
  font-size: clamp(1.4rem, 2.2vw, 3.4rem);
  font-weight: 800;
  letter-spacing: 0.04em;
  color: var(--color-chimes);
  line-height: 1.1;
  font-variant-numeric: tabular-nums;
  text-align: center;
  min-width: 8ch;
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
  filter: drop-shadow(0 0 10px rgba(251, 191, 36, 0.7))
          drop-shadow(0 0 24px rgba(251, 191, 36, 0.28));
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
   HEADER GEM BUTTONS (Shop & Tree) – runde Holzrahmen-Buttons
   (global: auch von BardProfileMenu verwendet)
   ================================================================ */
.header-inventory-bump {
  display: flex;
  align-items: center;
  align-self: stretch;
  flex-shrink: 0;
}
.btn-gem {
  position: relative;
  width: clamp(44px, 3.4vw, 64px);
  height: clamp(44px, 3.4vw, 64px);
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  padding: 0;
  background: radial-gradient(circle at 40% 32%, #2a1a0a, #120a03);
  border: 2px solid #c89040;
  box-shadow:
    inset 0 0 0 2px #3e200a,
    inset 0 3px 8px rgba(0, 0, 0, 0.7),
    0 0 10px rgba(232, 192, 64, 0.2);
  transition:
    transform 0.2s,
    box-shadow 0.2s;
}
.btn-gem::before {
  content: '';
  position: absolute;
  top: 8%;
  left: 17%;
  right: 30%;
  height: 22%;
  border-radius: 50%;
  background: linear-gradient(to bottom, rgba(255, 230, 160, 0.25), transparent);
  pointer-events: none;
}
.btn-gem:hover {
  transform: scale(1.06);
  box-shadow:
    inset 0 0 0 2px #3e200a,
    0 0 16px rgba(232, 192, 64, 0.55),
    0 3px 10px rgba(0, 0, 0, 0.5);
}
.btn-gem:active {
  transform: scale(0.95);
}
.btn-gem-img {
  width: 70%;
  height: 70%;
  object-fit: contain;
  filter: drop-shadow(0 1px 4px rgba(0, 0, 0, 0.6));
}
@media (max-width: 768px) {
  .btn-gem {
    width: clamp(40px, 5vh, 52px);
    height: clamp(40px, 5vh, 52px);
  }
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

/* ================================================================
   LEVEL-BADGE (Arc-Tiefpunkt)
   ================================================================ */
.arc-level-badge {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  z-index: 25;
  width:  clamp(26px, 2.2vw, 48px);
  height: clamp(26px, 2.2vw, 48px);
  border-radius: 50%;
  background: linear-gradient(to bottom, #4a8a28, #2e6018);
  border: 2px solid #6ec040;
  box-shadow:
    0 0 8px rgba(80, 180, 40, 0.6),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
}

.arc-level-text {
  font-size: clamp(13px, 1.15vw, 24px);
  font-weight: 900;
  color: #fff;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.8);
  line-height: 1;
}

/* ================================================================
   RESET-BUTTON (Center, immer sichtbar)
   ================================================================ */
.center-reset-btn {
  position: absolute;
  left: calc(50% + 33px);
  z-index: 26;
  pointer-events: auto;
  width:     clamp(12px, 1.2vw, 18px);
  height:    clamp(12px, 1.2vw, 18px);
  font-size: clamp(5px, 0.55vw, 8px);
  font-weight: 900;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  background: linear-gradient(to bottom, #4a1010, #2e0808);
  border: 1.5px solid #8a3020;
  border-radius: 50%;
  color: #cc6050;
  cursor: pointer;
  transition:
    background 0.12s ease,
    border-color 0.12s ease;
}
.center-reset-btn:hover {
  background: linear-gradient(to bottom, #6a1818, #4a0e0e);
  color: #ff9080;
  border-color: #cc4830;
}
.center-reset-btn:active {
  transform: scale(0.88);
}

/* ================================================================
   TOOLTIP: PROZENT-ZEILE
   ================================================================ */
.xp-tt__percent {
  font-size: 11px;
  font-weight: 700;
  color: rgba(255, 200, 80, 0.55);
  letter-spacing: 0.04em;
  margin-top: 1px;
}

/* ================================================================
   HEADER NOTIFICATION BADGES (arc-positioned, number-only)
   ================================================================ */
.header-notif-badge {
  position: absolute;
  z-index: 27;
  width:  clamp(20px, 1.8vw, 36px);
  height: clamp(20px, 1.8vw, 36px);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: clamp(9px, 0.85vw, 18px);
  font-weight: 900;
  color: #fff;
  line-height: 1;
  cursor: pointer;
  pointer-events: auto;
  transform: translateX(-50%);
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.8);
  animation: header-badge-glow 1.8s ease-in-out infinite;
}

.header-notif-badge--expedition {
  background: linear-gradient(to bottom, #e8af34, #c87028);
  border: 2px solid #ffcf60;
  box-shadow:
    0 0 8px rgba(232, 175, 52, 0.6),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
  --badge-glow-a: rgba(232, 175, 52, 0.5);
  --badge-glow-b: rgba(232, 175, 52, 0.9);
  --badge-glow-c: rgba(200, 112, 40, 0.4);
}

.header-notif-badge--champion {
  background: linear-gradient(to bottom, #06b6d4, #0891b2);
  border: 2px solid #38bdf8;
  box-shadow:
    0 0 8px rgba(6, 182, 212, 0.6),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
  --badge-glow-a: rgba(6, 182, 212, 0.5);
  --badge-glow-b: rgba(6, 182, 212, 0.9);
  --badge-glow-c: rgba(8, 145, 178, 0.4);
}

.header-notif-badge:hover {
  filter: brightness(1.2);
}

.header-notif-badge:active {
  filter: brightness(0.85);
}

@keyframes header-badge-glow {
  0%,
  100% {
    box-shadow: 0 0 6px var(--badge-glow-a);
  }
  50% {
    box-shadow:
      0 0 14px var(--badge-glow-b),
      0 0 24px var(--badge-glow-c);
  }
}

.header-badge-enter-active,
.header-badge-leave-active {
  transition:
    transform 0.22s cubic-bezier(0.34, 1.56, 0.64, 1),
    opacity 0.18s ease;
}
.header-badge-enter-from,
.header-badge-leave-to {
  transform: translateX(-50%) scale(0);
  opacity: 0;
}

/* ================================================================
   CHAMPION BADGE TOOLTIP
   ================================================================ */
.champ-tt {
  position: fixed;
  z-index: 200;
  min-width: 260px;
  background: #111008;
  border: 4px solid #7a4e20;
  border-radius: 4px;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.9);
  pointer-events: auto;
  overflow: hidden;
}

.champ-tt__caret {
  position: absolute;
  top: -6px;
  left: var(--caret-x, 20px);
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-left: 6px solid transparent;
  border-right: 6px solid transparent;
  border-bottom: 6px solid #7a4e20;
}

.champ-tt__list {
  list-style: none;
  margin: 0;
  padding: 4px 0;
}

.champ-tt__item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 7px 12px;
  cursor: pointer;
  transition: background 0.12s;
}

.champ-tt__item:hover {
  background: rgba(255, 255, 255, 0.05);
}

.champ-tt__img {
  width: 36px;
  height: 36px;
  border-radius: 6px;
  object-fit: cover;
  object-position: top;
  flex-shrink: 0;
  display: block;
}

.champ-tt__name {
  font-size: 1rem;
  font-weight: 700;
  flex: 1;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.champ-tt__item--more {
  cursor: default;
  gap: 6px;
  padding: 5px 12px 6px;
  border-top: 1px solid #3e200a;
}

.champ-tt__item--more:hover {
  background: none;
}

.champ-tt__more-dots {
  font-size: 0.875rem;
  color: rgba(200, 200, 220, 0.35);
  font-style: italic;
}

.champ-tt__more-count {
  font-size: 0.8rem;
  font-weight: 600;
  color: rgba(200, 200, 220, 0.45);
  letter-spacing: 0.03em;
}

.champ-tt-enter-active {
  transition:
    opacity 0.18s ease,
    transform 0.18s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.champ-tt-leave-active {
  transition:
    opacity 0.12s ease,
    transform 0.1s ease;
}

.champ-tt-enter-from {
  opacity: 0;
  transform: translateY(-6px);
}

.champ-tt-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

</style>
