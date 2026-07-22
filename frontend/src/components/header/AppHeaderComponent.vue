<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useGameStore } from '../../stores/gameStore'
import { useUiStore } from '../../stores/uiStore'
import { useBattleStore } from '../../stores/battleStore'
import { useExpeditionStore } from '../../stores/expeditionStore'
import { useSolarUpgradeStore } from '../../stores/solarUpgradeStore'
import { useMeepTreeStore } from '../../stores/meepTreeStore'
import { formatNumber } from '../../config/numberFormat'
import { usePersistence } from '../../composables/usePersistence'
import {
  BOTTOM_FRAME_STROKE_SHADOW,
  BOTTOM_FRAME_STROKE_WOOD,
  BOTTOM_FRAME_STROKE_GRAIN,
  BOTTOM_FRAME_STROKE_SHEEN,
  HEADER_NOTIF_BADGE_MIN_PX,
  HEADER_NOTIF_BADGE_VW,
  HEADER_NOTIF_BADGE_MAX_PX,
  HEADER_BADGE_EDGE_GAP_FRAC,
  CENTER_CHIMES_TOOLTIP_GAP_PX,
} from '../../config/constants'
import RpgBadgeTooltip from '../ui/RpgBadgeTooltip.vue'
import ExpeditionReadyTip from '../ui/ExpeditionReadyTip.vue'
import NewChampionsTip from '../ui/NewChampionsTip.vue'
import ForgeReadyTip from '../ui/ForgeReadyTip.vue'
import SkillReadyTip from '../ui/SkillReadyTip.vue'
import LevelProgressTip from '../ui/LevelProgressTip.vue'
import BardProfileMenu from '../bardProfil/BardProfileMenu.vue'
import UniverseRescueComponent from './UniverseRescueComponent.vue'
import HeaderMaterialsComponent from './HeaderMaterialsComponent.vue'
import SunPhaseIndicator from './SunPhaseIndicator.vue'

const gameStore = useGameStore()
const uiStore = useUiStore()
const battleStore = useBattleStore()
const expeditionStore = useExpeditionStore()
const solarStore = useSolarUpgradeStore()
const meepTreeStore = useMeepTreeStore()
const { resetGame } = usePersistence()

const championBadgeCount = computed(() => battleStore.newlyUnlockedChampions.length)
const skillBadgeCount = computed(() => meepTreeStore.buyableNodeCount)
const expeditionBadgeCount = computed(
  () => expeditionStore.activeExpeditions.filter((e) => e.status !== 'active').length,
)
const forgeBadgeReady = computed(() => solarStore.canUpgradeStar)

/* Badge anchors on the arc ellipse (θ = π/2 at the apex where the level badge
   sits). Slots are solved numerically so the edge-to-edge pixel gap is the
   SAME between every neighbour pair (level↔forge, forge↔champion, and the
   mirrored level↔expedition) at every arc size / desktop resolution. Equal
   x-steps would NOT work: towards the arc ends the vertical component grows,
   so equal horizontal spacing looks increasingly stretched. */
const badgeSlotStyles = computed(() => {
  const W = svgW.value
  const H = svgH.value
  const overlap = badgeOverlapPx.value
  const levelR = (overlap * 2.5) / 2 // overlap = 0.4 × level-badge height
  const nD = notifBadgePx.value
  const nR = nD / 2
  const gap = nD * HEADER_BADGE_EDGE_GAP_FRAC
  const cx = W / 2

  // Badge CENTERS: notify badges hang `overlap` above the ellipse line, the
  // level badge hangs the same way off the apex — offsets included below.
  const levelCenter = { x: cx, y: H - overlap + levelR }
  const notifCenter = (th: number) => ({
    x: cx + cx * Math.cos(th),
    y: H * Math.sin(th) - overlap + nR,
  })

  const thetas: number[] = []
  let last = levelCenter
  let need = levelR + nR + gap // level ↔ first badge
  for (let th = Math.PI / 2; th > 0.02 && thetas.length < 2; th -= 0.003) {
    const p = notifCenter(th)
    if (Math.hypot(p.x - last.x, p.y - last.y) >= need) {
      thetas.push(th)
      last = p
      need = nD + gap // badge ↔ badge
    }
  }
  // Arc too short to fit both slots → spread the remainder evenly.
  while (thetas.length < 2) thetas.push((thetas[thetas.length - 1] ?? Math.PI / 2) / 2)

  const styleAt = (th: number) => ({
    left: `${cx + cx * Math.cos(th)}px`,
    top: `${H * Math.sin(th) - overlap}px`,
  })
  return {
    expedition: styleAt(Math.PI - thetas[0]), // mirrored to the left side
    forge: styleAt(thetas[0]),
    champion: styleAt(thetas[1]),
    skill: styleAt(Math.PI - thetas[1]), // left side, outer slot (mirror of champion)
  }
})

const expedBadgeStyle = computed(() => badgeSlotStyles.value.expedition)
const forgeBadgeStyle = computed(() => badgeSlotStyles.value.forge)
const champBadgeStyle = computed(() => badgeSlotStyles.value.champion)
const skillBadgeStyle = computed(() => badgeSlotStyles.value.skill)

function openShopTab() {
  uiStore.openBardModal()
  uiStore.setBardTab('shop')
}

function openTeamTab() {
  uiStore.openBardModal()
  uiStore.setBardTab('team')
}

function openTreeTab() {
  uiStore.openBardModal()
  uiStore.setBardTab('tree')
}

function handleReset() {
  if (window.confirm('Really delete save? This action cannot be undone.')) {
    resetGame()
  }
}

const headerRef = ref<HTMLElement | null>(null)
const chimesRef = ref<HTMLElement | null>(null)
let resizeObserver: ResizeObserver | null = null

const xpProgress = computed(() => Math.max(0, Math.min(1, (gameStore.levelProgress ?? 0) / 100)))

const svgW = ref(360)
const svgH = ref(100)
const badgeOverlapPx = ref(20)
// rendered notify-badge diameter — JS mirror of the CSS clamp, kept fresh on resize
const notifBadgePx = ref(28)

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
  const timerBarY = Math.max(0, headerRect.bottom - r.top) // y from element top to timer-bar row
  const hR = r.width * 0.5
  const vR = r.height
  const t = Math.min(1, timerBarY / vR)
  const xInset = hR * (1 - Math.sqrt(1 - t * t)) // inset of visible border from box edge
  document.documentElement.style.setProperty(
    '--bar-side-width',
    `${Math.max(0, r.left + xInset - headerRect.left)}px`,
  )
  // Read actual rendered badge height so --level-badge-bottom stays correct at all fluid sizes
  const badgeEl = headerRef.value?.querySelector('.arc-level-badge') as HTMLElement | null
  const badgeH = badgeEl ? badgeEl.getBoundingClientRect().height : 50
  badgeOverlapPx.value = badgeH * 0.4
  notifBadgePx.value = Math.min(
    HEADER_NOTIF_BADGE_MAX_PX,
    Math.max(HEADER_NOTIF_BADGE_MIN_PX, window.innerWidth * HEADER_NOTIF_BADGE_VW),
  )
  document.documentElement.style.setProperty('--level-badge-bottom', `${r.bottom + badgeH * 0.6}px`)
}

function updateHeaderHeight() {
  if (!headerRef.value) return
  const rect = headerRef.value.getBoundingClientRect()
  document.documentElement.style.setProperty('--header-total-height', `${rect.bottom}px`)
  document.documentElement.style.setProperty('--header-vp-left', `${rect.left}px`)
  document.documentElement.style.setProperty(
    '--header-vp-right',
    `${window.innerWidth - rect.right}px`,
  )
  headerW.value = rect.width
  headerH.value = rect.height
  headerR.value = parseFloat(getComputedStyle(headerRef.value).borderBottomLeftRadius) || 20
}

async function remeasure() {
  updateHeaderHeight()
  await measure()
}

onMounted(async () => {
  await remeasure()
  resizeObserver = new ResizeObserver(remeasure)
  if (headerRef.value) resizeObserver.observe(headerRef.value)
  // ResizeObserver feuert nur bei Größenänderung des Headers selbst. Ist der
  // Header am max-width-Cap, ändert ein Fenster-Resize nur seine Position —
  // --header-vp-left/right müssen dann trotzdem neu gesetzt werden.
  window.addEventListener('resize', remeasure)
})

onUnmounted(() => {
  resizeObserver?.disconnect()
  window.removeEventListener('resize', remeasure)
})
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
      <path
        :d="headerFramePath"
        fill="none"
        :stroke="BOTTOM_FRAME_STROKE_SHADOW"
        stroke-width="5"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <path
        :d="headerFramePath"
        fill="none"
        :stroke="BOTTOM_FRAME_STROKE_WOOD"
        stroke-width="3"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <path
        :d="headerFramePath"
        fill="none"
        :stroke="BOTTOM_FRAME_STROKE_GRAIN"
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <path
        :d="headerFramePath"
        fill="none"
        :stroke="BOTTOM_FRAME_STROKE_SHEEN"
        stroke-width="1"
        stroke-linecap="round"
      />
    </svg>

    <!-- ════════ LINKE SEITE ════════ -->
    <div class="flex items-center gap-3 header-side header-side--left">
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

      <RpgBadgeTooltip :gap="CENTER_CHIMES_TOOLTIP_GAP_PX">
      <div
        ref="chimesRef"
        class="center-chimes"
        @click="uiStore.setBardTab('bard')"
      >
        <span class="chimes-value chimes-text-glow">
          {{ formatNumber(gameStore.chimes) }}
        </span>
        <div class="chimes-sub-row">
          <div class="chimes-sub-stat">
            <span
              class="sub-stat-value cps-text-glow"
              :class="{ 'stat-buffed': gameStore.mvpBuffMultiplier > 1 }"
              >{{ formatNumber(gameStore.chimesPerSecond * gameStore.mvpBuffMultiplier) }}</span
            >
            <span
              class="sub-stat-label cps-text-glow"
              :class="{ 'stat-buffed': gameStore.mvpBuffMultiplier > 1 }"
              ><span class="sub-stat-slash">/</span>sec</span
            >
          </div>
          <!-- One shared chime between the two stats instead of one each -->
          <img
            src="/img/BardAbilities/BardChime.png"
            class="sub-chime-icon chime-glow-green"
            alt=""
            aria-hidden="true"
          />
          <div class="chimes-sub-stat">
            <span
              class="sub-stat-value click-text-glow"
              :class="{ 'stat-buffed': gameStore.mvpBuffMultiplier > 1 }"
              >{{ formatNumber(gameStore.chimesPerClick * gameStore.mvpBuffMultiplier) }}</span
            >
            <span
              class="sub-stat-label click-text-glow"
              :class="{ 'stat-buffed': gameStore.mvpBuffMultiplier > 1 }"
              ><span class="sub-stat-slash">/</span>click</span
            >
          </div>
        </div>
      </div>
      <template #tip>
        <LevelProgressTip />
      </template>
      </RpgBadgeTooltip>

      <RpgBadgeTooltip>
        <div class="arc-level-badge" :style="{ top: svgH - badgeOverlapPx + 'px' }">
          <span class="arc-level-text">{{ gameStore.level }}</span>
        </div>
        <template #tip>
          <LevelProgressTip />
        </template>
      </RpgBadgeTooltip>

      <button class="center-reset-btn" title="Delete Save" @click.stop="handleReset">✕</button>

      <RpgBadgeTooltip>
        <Transition name="header-badge">
          <button
            v-if="expeditionBadgeCount > 0"
            class="header-notif-badge header-notif-badge--expedition"
            :style="expedBadgeStyle"
            :aria-label="`${expeditionBadgeCount} expedition(s) ready`"
            @click.stop="openTeamTab"
          >
            {{ expeditionBadgeCount }}
          </button>
        </Transition>
        <template #tip="{ close }">
          <ExpeditionReadyTip @collected="close" />
        </template>
      </RpgBadgeTooltip>

      <RpgBadgeTooltip>
        <Transition name="header-badge">
          <button
            v-if="forgeBadgeReady"
            class="header-notif-badge header-notif-badge--forge"
            :style="forgeBadgeStyle"
            aria-label="Sun evolution ready"
            @click.stop="openShopTab"
          >
            ✦
          </button>
        </Transition>
        <template #tip>
          <ForgeReadyTip />
        </template>
      </RpgBadgeTooltip>

      <RpgBadgeTooltip>
        <Transition name="header-badge">
          <button
            v-if="championBadgeCount > 0"
            class="header-notif-badge header-notif-badge--champion"
            :style="champBadgeStyle"
            :aria-label="`${championBadgeCount} new champion(s)`"
            @click.stop="openTeamTab"
          >
            {{ championBadgeCount }}
          </button>
        </Transition>
        <template #tip="{ close }">
          <NewChampionsTip @picked="close" />
        </template>
      </RpgBadgeTooltip>

      <RpgBadgeTooltip>
        <Transition name="header-badge">
          <button
            v-if="skillBadgeCount > 0"
            class="header-notif-badge header-notif-badge--skill"
            :style="skillBadgeStyle"
            :aria-label="`${skillBadgeCount} skill(s) ready to learn`"
            @click.stop="openTreeTab"
          >
            {{ skillBadgeCount }}
          </button>
        </Transition>
        <template #tip>
          <SkillReadyTip />
        </template>
      </RpgBadgeTooltip>
    </div>

    <!-- ════════ RECHTE SEITE ════════ -->
    <div class="flex items-center gap-3 header-side header-side--right">
      <SunPhaseIndicator />
      <div class="z-[65] header-portal-wrap" style="flex: 1">
        <UniverseRescueComponent />
      </div>
      <div class="header-divider" aria-hidden="true"></div>
      <div class="flex-shrink-0 header-inventory-bump">
        <button
          class="btn-gem btn-gem--corner-right"
          title="Open Skill Tree"
          @click="uiStore.setBardTab('tree')"
        >
          <img src="/img/menu/TREE.png" class="btn-gem-img" alt="Open Skill Tree" />
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
  /* One gap value for the corner buttons: same distance to the left/right
     edge, to the bottom edge and to the top — and it feeds the nested
     corner radius so the button arc runs parallel to the frame arc. */
  --header-corner-gap: clamp(7px, 0.65vw, 13px);
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
  padding-left: var(--header-corner-gap);
  /* symmetric inner gap towards the center teardrop (matches --right padding-left) */
  padding-right: clamp(8px, 1vw, 16px);
}
.header-side--right {
  justify-content: flex-end;
  gap: clamp(5px, 0.6vw, 10px);
  padding-right: var(--header-corner-gap);
  /* symmetric inner gap towards the center teardrop (matches --left padding-right) */
  padding-left: clamp(8px, 1vw, 16px);
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
    -1 *
      (
        min(
            max(var(--bump-center), 50dvh - min(480px, 45dvh) - var(--header-total-height)),
            clamp(20px, 5dvh, 55px)
          ) +
          7px
      )
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
  /* Small breathing room between the number and its "/unit" label */
  gap: 2px;
}
/* …and the same small gap between the slash and the unit text */
.sub-stat-slash {
  margin-right: 2px;
}
.sub-chime-icon {
  width: clamp(10px, 1.1vw, 14px);
  height: clamp(10px, 1.1vw, 14px);
  object-fit: contain;
  flex-shrink: 0;
  opacity: 0.9;
  /* Rendered larger via scale so the layout box (and both stats
     around it) stays exactly where it is */
  transform: scale(1.75);
  transform-origin: center;
}
.sub-stat-value {
  font-size: clamp(0.55rem, 0.75vw, 0.85rem);
  font-weight: 700;
  letter-spacing: 0.03em;
  line-height: 1;
  font-variant-numeric: tabular-nums;
  /* Smooth hand-back when the MVP buff highlight ends */
  transition:
    color 1s ease-out,
    text-shadow 1s ease-out;
}
/* MVP honor buff: numbers AND their /sec | /click labels get bolder and glow
   stronger in their OWN color (green for /sec, amber for /click) — currentColor
   keeps each stat in the hue it already has in the header. */
.sub-stat-value.stat-buffed,
.sub-stat-label.stat-buffed {
  opacity: 1;
  font-weight: 900;
  -webkit-text-stroke: 0.6px currentColor;
  text-shadow:
    0 0 3px currentColor,
    0 0 12px currentColor;
  animation: stat-buffed-pulse 1.2s ease-in-out infinite;
}
@keyframes stat-buffed-pulse {
  0%,
  100% {
    text-shadow:
      0 0 3px currentColor,
      0 0 10px currentColor;
  }
  50% {
    text-shadow:
      0 0 4px currentColor,
      0 0 20px currentColor;
  }
}
@media (prefers-reduced-motion: reduce) {
  .sub-stat-value.stat-buffed,
  .sub-stat-label.stat-buffed {
    animation: none;
  }
}
.sub-stat-label {
  font-size: clamp(0.45rem, 0.6vw, 0.72rem);
  font-weight: 600;
  letter-spacing: 0.05em;
  opacity: 0.7;
  line-height: 1;
  /* Smooth hand-back when the MVP buff highlight ends */
  transition:
    color 1s ease-out,
    text-shadow 1s ease-out;
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
.chimes-text-glow {
  filter: drop-shadow(0 0 10px rgba(251, 191, 36, 0.7))
    drop-shadow(0 0 24px rgba(251, 191, 36, 0.28));
}
.cps-text-glow {
  color: #74d448;
  filter: drop-shadow(0 0 7px rgba(116, 212, 72, 0.4));
}
.click-text-glow {
  color: #74d448;
  filter: drop-shadow(0 0 7px rgba(116, 212, 72, 0.4));
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
   HEADER GEM BUTTONS (Shop & Tree) – Corner Plates mit Nested Radius
   (global: auch von BardProfileMenu verwendet)
   Größe = Header-Höhe − 2×Gap → oben/unten/außen exakt gleicher
   Abstand; die äußere untere Ecke übernimmt den Header-Radius
   minus Gap, sodass beide Rundungen parallel verlaufen.
   ================================================================ */
.header-inventory-bump {
  display: flex;
  align-items: center;
  align-self: stretch;
  flex-shrink: 0;
}
.btn-gem {
  position: relative;
  width: calc(var(--header-height) - 2 * var(--header-corner-gap));
  height: calc(var(--header-height) - 2 * var(--header-corner-gap));
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  padding: 0;
  /* Tonal statt Medaillon: gleiche warme rgba-Sprache wie center-chimes
     und die Divider, damit der Button im Header-Grund aufgeht. */
  background: linear-gradient(to bottom, rgba(255, 200, 80, 0.07), rgba(255, 200, 80, 0.02));
  border: 1px solid rgba(200, 144, 64, 0.32);
  box-shadow:
    inset 0 1px 0 rgba(255, 200, 80, 0.08),
    inset 0 -8px 14px rgba(0, 0, 0, 0.28);
  transition:
    background 0.2s,
    border-color 0.2s,
    box-shadow 0.2s;
}
/* Nested-Radius: innere Rundung = äußere Rundung − Abstand */
.btn-gem--corner-left {
  border-bottom-left-radius: max(6px, calc(var(--bard-avatar-radius) - var(--header-corner-gap)));
}
.btn-gem--corner-right {
  border-bottom-right-radius: max(6px, calc(var(--bard-avatar-radius) - var(--header-corner-gap)));
}
.btn-gem::before {
  content: '';
  position: absolute;
  top: 4%;
  left: 8%;
  right: 8%;
  height: 22%;
  border-radius: 4px 4px 50% 50%;
  background: linear-gradient(to bottom, rgba(255, 230, 160, 0.08), transparent);
  pointer-events: none;
}
/* Kein Scale im Hover: der Button bliebe sonst nicht parallel zur
   Header-Rundung — Gold erscheint erst hier, als dezenter Akzent. */
.btn-gem:hover {
  background: linear-gradient(to bottom, rgba(255, 200, 80, 0.13), rgba(255, 200, 80, 0.04));
  border-color: rgba(232, 192, 64, 0.65);
  box-shadow:
    inset 0 1px 0 rgba(255, 200, 80, 0.14),
    0 0 12px rgba(232, 192, 64, 0.22);
}
.btn-gem:hover .btn-gem-img {
  transform: scale(1.08);
}
.btn-gem:active .btn-gem-img {
  transform: scale(0.94);
}
.btn-gem-img {
  width: 72%;
  height: 72%;
  object-fit: contain;
  filter: drop-shadow(0 1px 4px rgba(0, 0, 0, 0.6));
  transition: transform 0.18s ease;
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
  pointer-events: auto;
  left: 50%;
  transform: translateX(-50%);
  z-index: 25;
  width: clamp(26px, 2.2vw, 48px);
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
   RESET-BUTTON (temporär — wird später entfernt)
   Top corner of the center chimes panel, fully outside the arc lane so
   the whole arc stays free for the level badge + notification badges.
   ================================================================ */
.center-reset-btn {
  position: absolute;
  top: 4px;
  right: 6px;
  z-index: 26;
  pointer-events: auto;
  width: clamp(12px, 1.2vw, 18px);
  height: clamp(12px, 1.2vw, 18px);
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
   HEADER NOTIFICATION BADGES (arc-positioned, number-only)
   ================================================================ */
.header-notif-badge {
  position: absolute;
  z-index: 27;
  width: clamp(20px, 1.8vw, 36px);
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
  background: linear-gradient(to bottom, #a855f7, #7c3aed);
  border: 2px solid #c9a0ff;
  box-shadow:
    0 0 8px rgba(168, 85, 247, 0.6),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
  --badge-glow-a: rgba(168, 85, 247, 0.5);
  --badge-glow-b: rgba(168, 85, 247, 0.9);
  --badge-glow-c: rgba(124, 58, 237, 0.4);
}

.header-notif-badge--forge {
  background: linear-gradient(to bottom, #f0d060, #c89040);
  border: 2px solid #ffe080;
  color: #2a1608;
  text-shadow: 0 1px 0 rgba(255, 240, 180, 0.5);
  box-shadow:
    0 0 8px rgba(232, 192, 64, 0.65),
    inset 0 1px 0 rgba(255, 255, 255, 0.35);
  --badge-glow-a: rgba(232, 192, 64, 0.55);
  --badge-glow-b: rgba(240, 208, 96, 0.95);
  --badge-glow-c: rgba(200, 144, 64, 0.45);
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

.header-notif-badge--skill {
  background: linear-gradient(to bottom, #ec4899, #be185d);
  border: 2px solid #f9a8d4;
  box-shadow:
    0 0 8px rgba(236, 72, 153, 0.6),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
  --badge-glow-a: rgba(236, 72, 153, 0.5);
  --badge-glow-b: rgba(236, 72, 153, 0.9);
  --badge-glow-c: rgba(190, 24, 93, 0.4);
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
   CHAMPION BADGE TOOLTIP → moved to ui/RpgBadgeTooltip.vue + NewChampionsTip.vue
   ================================================================ */
</style>
