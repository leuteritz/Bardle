<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { storeToRefs } from 'pinia'
import { Icon } from '@iconify/vue'
import { useGameStore } from '@/stores/gameStore'
import { useGalaxyStore } from '@/stores/galaxyStore'
import { useSynergyStore } from '@/stores/synergyStore'
import { useAugmentStore } from '@/stores/augmentStore'
import { useSolarUpgradeStore } from '@/stores/solarUpgradeStore'
import { useBattleStore } from '@/stores/battleStore'
import { useShopStore } from '@/stores/shopStore'
import { usePlanetShopStore } from '@/stores/planetShopStore'
import { useUiStore } from '@/stores/uiStore'
import type { CompletedGalaxyRecord } from '@/stores/galaxyStore'
import {
  STAR_PHASE_DATA,
  COMET_PHASE_DATA,
  STATS_TAB_PHASE_DOT_SCALE,
  STATS_TAB_COMET_DOT_PX,
  STATS_TAB_DECK_RESIZE,
  SUN_PHASE_DISPLAY_OFFSET,
  SUN_PHASE_DISPLAY_TOTAL,
} from '@/config/constants'
import CosmicStageBackground from '@/components/ui/CosmicStageBackground.vue'
import { AUGMENTS } from '@/config/augments'
import { formatNumber } from '@/config/numberFormat'
import { AUGMENT_RARITY_COLOR } from '@/composables/useRarityColors'
import { renderGalaxySnapshot } from '@/utils/galaxySnapshot'
import type { AugmentDefinition } from '@/types'

const gameStore = useGameStore()
const galaxyStore = useGalaxyStore()
const synergyStore = useSynergyStore()
const augmentStore = useAugmentStore()
const solarStore = useSolarUpgradeStore()
const battleStore = useBattleStore()
const shopStore = useShopStore()
const planetShopStore = usePlanetShopStore()
const uiStore = useUiStore()

const {
  totalChimesEarned,
  chimesPerClick,
  chimesPerSecond,
  meeps,
  level,
  totalClicks,
  inGameTime,
  currentUniverse,
  activeModifier,
  abilityCPSMultiplier,
  abilityCPCMultiplier,
  abilityPowerBonus,
} = storeToRefs(gameStore)
const { starsRescued, currentGalaxy, completedGalaxies } = storeToRefs(galaxyStore)
const { cpsSynergyMultiplier, powerSynergyMultiplier, dpsSynergyMultiplier } =
  storeToRefs(synergyStore)
const { temporaryCPSMultiplier } = storeToRefs(augmentStore)

const dpsPct = computed(() => Math.round((dpsSynergyMultiplier.value - 1) * 100))

/* ── Extra lifetime / journey stats (read-only from their stores) ─── */
const totalPower = computed(() => gameStore.totalPower)
const lifetimeProduction = computed(() => shopStore.totalLifetimeProduction)
const championsRecruited = computed(() => battleStore.ownedChampions.length)
const planetsColonized = computed(() => planetShopStore.purchasedSlots.length)
const battleRank = computed(
  () => `${battleStore.currentRank.tier} ${battleStore.currentRank.division}`,
)
const winRatePct = computed(() => Math.round(battleStore.winRate))
const bestWinStreak = computed(() => battleStore.bestWinStreak)
const careerKda = computed(() => battleStore.careerKda.toFixed(2))
const pentakills = computed(() => battleStore.allTime.multikills.penta)

/* ── Count-up animation on mount ─────────────────────────────── */
const countUpProgress = ref(0)
let rafId: number

onMounted(() => {
  const startTime = performance.now()
  const duration = 1000
  function animFrame(now: number) {
    countUpProgress.value = Math.min((now - startTime) / duration, 1)
    if (countUpProgress.value < 1) rafId = requestAnimationFrame(animFrame)
  }
  rafId = requestAnimationFrame(animFrame)
})

const animChimes = computed(() => Math.floor(totalChimesEarned.value * countUpProgress.value))
const animStars = computed(() => Math.floor(starsRescued.value * countUpProgress.value))
const animMeeps = computed(() => Math.floor(meeps.value * countUpProgress.value))
const animClicks = computed(() => Math.floor(totalClicks.value * countUpProgress.value))

/* ── Star phase (sun + timeline) ─────────────────────────────── */
const totalPhases = STAR_PHASE_DATA.length
/* Timeline steps include the Comet origin as step 0 (7 total) */
const totalSteps = SUN_PHASE_DISPLAY_TOTAL
const displayIndex = computed(() => (solarStore.isCometState ? 0 : solarStore.starPhase + 1))
const phase = computed(() => STAR_PHASE_DATA[solarStore.starPhase])
const isMax = computed(() => !solarStore.isCometState && solarStore.starPhase >= totalPhases - 1)

const phaseVars = computed(() => {
  if (solarStore.isCometState) {
    return {
      '--sun-core': COMET_PHASE_DATA.core,
      '--sun-mid': COMET_PHASE_DATA.mid,
      '--sun-edge': COMET_PHASE_DATA.edge,
      '--sun-glow1': COMET_PHASE_DATA.glow,
      '--sun-glow2': COMET_PHASE_DATA.dust,
      '--sun-glow3': COMET_PHASE_DATA.crater,
      '--phase-primary': COMET_PHASE_DATA.accent,
      '--phase-glow': COMET_PHASE_DATA.glow,
      '--pulse-speed': COMET_PHASE_DATA.pulseSpeed,
    }
  }
  return {
    '--sun-core': phase.value.core,
    '--sun-mid': phase.value.mid,
    '--sun-edge': phase.value.edge,
    '--sun-glow1': phase.value.glow1,
    '--sun-glow2': phase.value.glow2,
    '--sun-glow3': phase.value.glow3,
    '--phase-primary': phase.value.phasePrimary,
    '--phase-glow': phase.value.phaseGlow,
    '--pulse-speed': phase.value.pulseSpeed,
  }
})

const phaseDisplayLabel = computed(() =>
  solarStore.isCometState
    ? `Phase 1 / ${SUN_PHASE_DISPLAY_TOTAL}`
    : `Phase ${solarStore.starPhase + SUN_PHASE_DISPLAY_OFFSET} / ${SUN_PHASE_DISPLAY_TOTAL}`,
)

const timelineDots = computed(() => [
  /* Step 0 — the Comet origin: a tiny rock with a gold tail, before any sun */
  {
    label: COMET_PHASE_DATA.name,
    astro: COMET_PHASE_DATA.astroName,
    comet: true,
    color: COMET_PHASE_DATA.accent,
    glow: COMET_PHASE_DATA.glow,
    core: COMET_PHASE_DATA.core,
    mid: COMET_PHASE_DATA.mid,
    edge: COMET_PHASE_DATA.edge,
    size: STATS_TAB_COMET_DOT_PX,
    done: !solarStore.isCometState,
    current: solarStore.isCometState,
  },
  ...STAR_PHASE_DATA.map((p, i) => ({
    label: p.name,
    astro: p.astroName,
    comet: false,
    color: p.phasePrimary,
    glow: p.phaseGlow,
    core: p.core,
    mid: p.mid,
    edge: p.edge,
    /* diameter true to the in-game sun proportions */
    size: p.radius * STATS_TAB_PHASE_DOT_SCALE,
    done: !solarStore.isCometState && i < solarStore.starPhase,
    current: !solarStore.isCometState && i === solarStore.starPhase,
  })),
])

const timelineFillPct = computed(() => (displayIndex.value / (totalSteps - 1)) * 100)

/* ── Time in phase ticker ────────────────────────────────────── */
const now = ref(Date.now())
let ticker: ReturnType<typeof setInterval>

onMounted(() => {
  if (!solarStore.phaseEnteredAt) solarStore.phaseEnteredAt = Date.now()
  ticker = setInterval(() => {
    now.value = Date.now()
  }, 1000)
})

onUnmounted(() => {
  cancelAnimationFrame(rafId)
  clearInterval(ticker)
  stopResize() // drop any in-flight drag listeners + restore body cursor
})

/* ── Phase dwell time (evolve time gate) ─────────────────────── */
function formatDuration(ms: number): string {
  const secs = Math.max(0, Math.ceil(ms / 1000))
  const d = Math.floor(secs / 86400)
  const h = Math.floor((secs % 86400) / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = secs % 60
  if (d > 0) return `${d}d ${h}h`
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

const dwellRequiredMs = computed(() => solarStore.phaseDwellRequiredMs)
const dwellElapsedMs = computed(() =>
  Math.max(0, now.value - (solarStore.phaseEnteredAt ?? now.value)),
)
const dwellRemainingMs = computed(() => Math.max(0, dwellRequiredMs.value - dwellElapsedMs.value))
const dwellMet = computed(() => dwellRemainingMs.value <= 0)
const dwellPct = computed(() =>
  dwellRequiredMs.value <= 0
    ? 100
    : Math.min(100, (dwellElapsedMs.value / dwellRequiredMs.value) * 100),
)

/* Active timeline segment (current dot → next dot) filled by dwell progress */
const activeSegLeftPct = computed(() => (displayIndex.value / (totalSteps - 1)) * 100)
const activeSegWidthPct = computed(() => (dwellPct.value / 100 / (totalSteps - 1)) * 100)
/* Timer label centers on the active segment's midpoint (track coordinates) */
const timerLabelFrac = computed(() => (displayIndex.value + 0.5) / (totalSteps - 1))

const phaseAge = computed(() => {
  if (!solarStore.phaseEnteredAt) return null
  const secs = Math.floor((now.value - solarStore.phaseEnteredAt) / 1000)
  const d = Math.floor(secs / 86400)
  const h = Math.floor((secs % 86400) / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = secs % 60
  if (d > 0) return `${d}d ${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m`
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`
  if (m > 0) return `${m}m ${String(s).padStart(2, '0')}s`
  return `${s}s`
})

/* ── Non-battle game stats ───────────────────────────────────── */
const playTime = computed(() => formatDuration(inGameTime.value * 1000))

/* ── Galaxy Archive (completed-galaxy memories) ──────────────── */
const archive = computed(() => [...completedGalaxies.value].sort((a, b) => b.galaxy - a.galaxy))

function archiveRescued(rec: CompletedGalaxyRecord): number {
  return rec.attemptResults.filter((r) => r === 'rescued').length
}

function archiveFailed(rec: CompletedGalaxyRecord): number {
  return rec.attemptResults.filter((r) => r === 'failed').length
}

function archiveDate(rec: CompletedGalaxyRecord): string {
  return new Date(rec.completedAt).toLocaleDateString()
}

/* ── Augment shelf ───────────────────────────────────────────── */
interface AugCard {
  aug: AugmentDefinition
  key: string
  color: string
}

const augCards = computed<AugCard[]>(() =>
  gameStore.activeAugments.flatMap((id, idx) => {
    const aug = AUGMENTS.find((a) => a.id === id)
    if (!aug) return []
    return [{ aug, key: `${id}-${idx}`, color: AUGMENT_RARITY_COLOR[aug.rarity] }]
  }),
)

/* ── Aggregate buff chips (augments + abilities + synergies) ─── */
const buffCPSPct = computed(() => {
  const mod = activeModifier.value
  const total =
    (mod.cpsMultiplier ?? 1) -
    1 +
    (abilityCPSMultiplier.value - 1) +
    (cpsSynergyMultiplier.value - 1) +
    (temporaryCPSMultiplier.value - 1)
  return Math.round(total * 100)
})

const buffCPCPct = computed(() => {
  const mod = activeModifier.value
  const total = (mod.cpcMultiplier ?? 1) - 1 + (abilityCPCMultiplier.value - 1)
  return Math.round(total * 100)
})

const buffPowerSynergyPct = computed(() => Math.round((powerSynergyMultiplier.value - 1) * 100))
const buffPowerFlat = computed(() => abilityPowerBonus.value)
const buffMeepPct = computed(() =>
  Math.round(((activeModifier.value.meepPowerMultiplier ?? 1) - 1) * 100),
)
const buffCDRPct = computed(() => {
  const mul = activeModifier.value.cooldownMultiplier ?? 1
  return mul < 1 ? Math.round((1 - mul) * 100) : 0
})
const buffExpPct = computed(() =>
  Math.round(((activeModifier.value.expeditionRewardMultiplier ?? 1) - 1) * 100),
)
const buffCostPct = computed(() => {
  const mul = activeModifier.value.buildingCostMultiplier ?? 1
  return mul < 1 ? Math.round((1 - mul) * 100) : 0
})
const buffEnemyPct = computed(() => {
  const mul = activeModifier.value.enemySpeedMultiplier ?? 1
  return mul < 1 ? Math.round((1 - mul) * 100) : 0
})

interface BuffChip {
  key: string
  icon: string
  label: string
  value: string
  positive: boolean
}

const totalChips = computed<BuffChip[]>(() => {
  const chips: BuffChip[] = []
  if (buffCPSPct.value > 0)
    chips.push({
      key: 'cps',
      icon: 'game-icons:lyre',
      label: 'Production',
      value: `+${buffCPSPct.value}%`,
      positive: true,
    })
  if (buffCPCPct.value > 0)
    chips.push({
      key: 'cpc',
      icon: 'game-icons:hand',
      label: 'Click',
      value: `+${buffCPCPct.value}%`,
      positive: true,
    })
  if (buffPowerSynergyPct.value > 0 || buffPowerFlat.value > 0) {
    const parts: string[] = []
    if (buffPowerSynergyPct.value > 0) parts.push(`+${buffPowerSynergyPct.value}%`)
    if (buffPowerFlat.value > 0) parts.push(`+${buffPowerFlat.value}`)
    chips.push({
      key: 'power',
      icon: 'game-icons:magic-swirl',
      label: 'Power',
      value: parts.join(' & '),
      positive: true,
    })
  }
  if (buffMeepPct.value > 0)
    chips.push({
      key: 'meep',
      icon: 'game-icons:crystal-ball',
      label: 'Meep Power',
      value: `+${buffMeepPct.value}%`,
      positive: true,
    })
  if (dpsPct.value > 0)
    chips.push({
      key: 'dps',
      icon: 'game-icons:crossed-swords',
      label: 'Combat DPS',
      value: `+${dpsPct.value}%`,
      positive: true,
    })
  if (buffCDRPct.value > 0)
    chips.push({
      key: 'cdr',
      icon: 'game-icons:sand-clock',
      label: 'Cooldowns',
      value: `-${buffCDRPct.value}%`,
      positive: false,
    })
  if (buffExpPct.value > 0)
    chips.push({
      key: 'exp',
      icon: 'game-icons:treasure-map',
      label: 'Expeditions',
      value: `+${buffExpPct.value}%`,
      positive: true,
    })
  if (buffCostPct.value > 0)
    chips.push({
      key: 'cost',
      icon: 'game-icons:stone-wall',
      label: 'Build Cost',
      value: `-${buffCostPct.value}%`,
      positive: false,
    })
  if (buffEnemyPct.value > 0)
    chips.push({
      key: 'enemy',
      icon: 'game-icons:turtle',
      label: 'Enemy Speed',
      value: `-${buffEnemyPct.value}%`,
      positive: false,
    })
  return chips
})

/* ── Per-column context search (Journey / Augments / Archive) ──── */
const journeySearch = ref('')
const augmentSearch = ref('')
const archiveSearch = ref('')

interface JourneyStat {
  key: string
  label: string
  value: string
  img?: string
  icon?: string
  valueClass?: string
}

/* Data-driven Journey rows so the header search can filter them */
const journeyStats = computed<JourneyStat[]>(() => [
  {
    key: 'cps',
    label: 'Chimes / Sec',
    img: '/img/BardAbilities/BardChime.png',
    value: formatNumber(chimesPerSecond.value),
  },
  {
    key: 'cpc',
    label: 'Chimes / Click',
    img: '/img/BardAbilities/BardChime.png',
    value: formatNumber(chimesPerClick.value),
  },
  {
    key: 'total-chimes',
    label: 'Total Chimes',
    img: '/img/BardAbilities/BardChime.png',
    value: formatNumber(animChimes.value),
  },
  {
    key: 'meeps',
    label: 'Meeps Guided',
    img: '/img/BardAbilities/BardMeep.png',
    value: formatNumber(animMeeps.value),
    valueClass: 'sf-srow-val--green',
  },
  {
    key: 'clicks',
    label: 'Total Clicks',
    img: '/img/BardAbilities/BardChime.png',
    value: formatNumber(animClicks.value),
  },
  {
    key: 'stars',
    label: 'Stars Rescued',
    img: '/img/star.png',
    value: formatNumber(animStars.value),
  },
  {
    key: 'galaxies',
    label: 'Galaxies Freed',
    icon: 'game-icons:galaxy',
    value: String(archive.value.length),
  },
  {
    key: 'power',
    label: 'Total Power',
    icon: 'game-icons:embrassed-energy',
    value: formatNumber(totalPower.value),
  },
  {
    key: 'production',
    label: 'Lifetime Production',
    icon: 'game-icons:factory',
    value: formatNumber(lifetimeProduction.value),
  },
  {
    key: 'champions',
    label: 'Champions Recruited',
    icon: 'game-icons:backup',
    value: String(championsRecruited.value),
  },
  {
    key: 'planets',
    label: 'Planets Colonized',
    icon: 'game-icons:jupiter',
    value: String(planetsColonized.value),
  },
  { key: 'rank', label: 'Battle Rank', icon: 'game-icons:rank-1', value: battleRank.value },
  {
    key: 'winrate',
    label: 'Win Rate',
    icon: 'game-icons:pie-chart',
    value: `${winRatePct.value}%`,
  },
  {
    key: 'streak',
    label: 'Best Win Streak',
    icon: 'game-icons:flame',
    value: String(bestWinStreak.value),
  },
  { key: 'kda', label: 'Career KDA', icon: 'game-icons:daggers', value: careerKda.value },
  {
    key: 'penta',
    label: 'Pentakills',
    icon: 'game-icons:pentacle',
    value: String(pentakills.value),
  },
])

const filteredJourneyStats = computed(() => {
  const q = journeySearch.value.trim().toLowerCase()
  if (!q) return journeyStats.value
  return journeyStats.value.filter((s) => s.label.toLowerCase().includes(q))
})

const filteredChips = computed(() => {
  const q = augmentSearch.value.trim().toLowerCase()
  if (!q) return totalChips.value
  return totalChips.value.filter((c) => c.label.toLowerCase().includes(q) || c.key.includes(q))
})

const filteredAugCards = computed(() => {
  const q = augmentSearch.value.trim().toLowerCase()
  if (!q) return augCards.value
  return augCards.value.filter(
    (c) =>
      c.aug.name.toLowerCase().includes(q) ||
      c.aug.effectLine.toLowerCase().includes(q) ||
      c.aug.rarity.toLowerCase().includes(q),
  )
})

const filteredArchive = computed(() => {
  const q = archiveSearch.value.trim().toLowerCase()
  if (!q) return archive.value
  return archive.value.filter((rec) => `galaxy ${rec.galaxy}`.includes(q))
})

/* ── Resizable deck columns — drag the two dividers to rebalance the
   three panels. Side columns are px-driven; the middle flexes and is
   protected by MIN_MIDDLE so it can never collapse. ────────────────── */
const deckEl = ref<HTMLElement | null>(null)
const col1Width = ref<number>(STATS_TAB_DECK_RESIZE.DEFAULT_LEFT)
const col3Width = ref<number>(STATS_TAB_DECK_RESIZE.DEFAULT_RIGHT)
const resizeSide = ref<'left' | 'right' | null>(null)

const deckStyle = computed(() => ({
  gridTemplateColumns: `${col1Width.value}px minmax(0, 1fr) ${col3Width.value}px`,
}))

let resizeStartX = 0
let resizeStartW = 0
let resizeDeckWidth = 0

function startResize(side: 'left' | 'right', e: PointerEvent) {
  resizeSide.value = side
  resizeStartX = e.clientX
  resizeStartW = side === 'left' ? col1Width.value : col3Width.value
  resizeDeckWidth = deckEl.value?.clientWidth ?? 0
  window.addEventListener('pointermove', onResizeMove)
  window.addEventListener('pointerup', stopResize)
  document.body.style.cursor = 'col-resize'
  document.body.style.userSelect = 'none'
  e.preventDefault()
}

function onResizeMove(e: PointerEvent) {
  const R = STATS_TAB_DECK_RESIZE
  const delta = e.clientX - resizeStartX
  if (resizeSide.value === 'left') {
    const maxByMiddle = resizeDeckWidth - col3Width.value - R.MIN_MIDDLE
    const max = Math.min(R.MAX_LEFT, maxByMiddle)
    col1Width.value = Math.max(R.MIN_SIDE, Math.min(resizeStartW + delta, max))
  } else if (resizeSide.value === 'right') {
    const maxByMiddle = resizeDeckWidth - col1Width.value - R.MIN_MIDDLE
    const max = Math.min(R.MAX_RIGHT, maxByMiddle)
    col3Width.value = Math.max(R.MIN_SIDE, Math.min(resizeStartW - delta, max))
  }
}

function stopResize() {
  resizeSide.value = null
  window.removeEventListener('pointermove', onResizeMove)
  window.removeEventListener('pointerup', stopResize)
  document.body.style.cursor = ''
  document.body.style.userSelect = ''
}
</script>

<template>
  <div class="sf-root" :style="phaseVars">
    <!-- ══ Shared cosmic backdrop — same component as Shop / Team / Planets ══ -->
    <CosmicStageBackground />

    <!-- ══ Solar strip: mini sun + phase identity + evolution timeline ══ -->
    <section class="sf-panel sf-solar">
      <div
        class="sf-solar-id"
        role="button"
        title="Open the Solar Shop"
        @click="uiStore.setBardTab('shop')"
      >
        <div class="sf-mini-sun-wrap">
          <div class="sf-mini-ring" />
          <div class="sf-mini-sun" />
        </div>
        <div class="sf-solar-meta">
          <span class="sf-kicker">{{ phaseDisplayLabel }}</span>
          <span class="sf-phase-name">{{
            solarStore.isCometState ? COMET_PHASE_DATA.name : phase.name
          }}</span>
          <span class="sf-solar-age">{{ phaseAge ?? '—' }}</span>
        </div>
      </div>

      <div class="sf-timeline">
        <!-- Dwell timer above the currently filling segment -->
        <div
          v-if="!isMax"
          class="sf-tl-timer"
          :style="{ left: `calc(7% + 86% * ${timerLabelFrac})` }"
          :title="`${formatDuration(dwellElapsedMs)} of ${formatDuration(dwellRequiredMs)} in this phase — time the sun must spend before it can evolve`"
        >
          <span v-if="dwellMet" class="sf-tl-clock is-met">✓ Ready</span>
          <span v-else class="sf-tl-clock">{{ formatDuration(dwellRemainingMs) }}</span>
        </div>
        <div class="sf-timeline-track">
          <div class="sf-timeline-fill" :style="{ width: timelineFillPct + '%' }" />
          <!-- Segment current → next phase, filling with dwell progress -->
          <div
            v-if="!isMax"
            class="sf-timeline-fill--active"
            :class="{ 'is-met': dwellMet }"
            :style="{ left: activeSegLeftPct + '%', width: activeSegWidthPct + '%' }"
          />
        </div>
        <div
          v-for="(dot, i) in timelineDots"
          :key="i"
          class="sf-tl-step"
          :title="`${dot.label} · ${dot.astro}`"
        >
          <div class="sf-tl-dot-slot">
            <div
              class="sf-tl-dot"
              :class="{
                'is-done': dot.done,
                'is-current': dot.current,
                'sf-tl-dot--comet': dot.comet,
              }"
              :style="{
                width: dot.size + 'px',
                height: dot.size + 'px',
                '--dot-color': dot.color,
                '--dot-glow': dot.glow,
                '--dot-core': dot.core,
                '--dot-mid': dot.mid,
                '--dot-edge': dot.edge,
              }"
            />
          </div>
          <span
            class="sf-tl-lbl"
            :class="{ 'is-current': dot.current }"
            :style="dot.current ? { color: dot.color } : undefined"
          >
            {{ dot.label }}
          </span>
        </div>
      </div>

      <div class="sf-solar-status">
        <div v-if="isMax" class="sf-pill sf-pill--max">Fully Evolved</div>
        <div
          v-else-if="solarStore.canUpgradeStar"
          class="sf-pill sf-pill--ready"
          role="button"
          @click="uiStore.setBardTab('shop')"
        >
          Evolve
        </div>
        <div v-else-if="solarStore.branchesReadyForEvolve" class="sf-pill sf-pill--wait">
          Evolving in {{ formatDuration(dwellRemainingMs) }}
        </div>
        <div v-else class="sf-pill sf-pill--hint" role="button" @click="uiStore.setBardTab('shop')">
          Evolve
        </div>
      </div>

      <!-- TEMP: admin dwell-skip — floated in the strip corner so it never
           affects the layout (remove later incl. adminSkipDwellTime in solarUpgradeStore) -->
      <button
        v-if="!isMax && !dwellMet"
        class="sf-dev-skip"
        type="button"
        title="Admin: skip the remaining dwell time of this phase"
        @click.stop="solarStore.adminSkipDwellTime()"
      >
        DEV · Skip
      </button>
      <!-- /TEMP -->
    </section>

    <!-- ══ Panel deck: stats | augments | galaxy archive ══ -->
    <div ref="deckEl" class="sf-deck" :style="deckStyle">
      <!-- ─ Journey stats ─ -->
      <section class="sf-panel sf-col">
        <header class="sf-p-head">
          <span class="sf-p-title">Journey</span>
          <label class="sf-search-wrap">
            <Icon icon="game-icons:magnifying-glass" class="sf-search-ico" width="13" height="13" />
            <input
              v-model="journeySearch"
              class="sf-search"
              type="text"
              placeholder="Search stats…"
            />
          </label>
        </header>
        <div class="sf-p-body sf-stats-body rpg-scrollbar">
          <!-- Idle play-time — the panel's hero stat: far left, oversized -->
          <div class="sf-playtime">
            <span class="sf-playtime-lbl">Play Time</span>
            <span class="sf-playtime-val">{{ playTime }}</span>
          </div>

          <div class="sf-chips">
            <div class="sf-chip sf-chip--gold">
              <span class="sf-chip-lbl">Level</span>
              <span class="sf-chip-val">{{ level }}</span>
            </div>
            <div class="sf-chip sf-chip--rare">
              <span class="sf-chip-lbl">Galaxy</span>
              <span class="sf-chip-val">{{ currentGalaxy }}</span>
            </div>
            <div class="sf-chip sf-chip--green">
              <span class="sf-chip-lbl">Universe</span>
              <span class="sf-chip-val">{{ currentUniverse }}</span>
            </div>
          </div>

          <div v-if="filteredJourneyStats.length === 0" class="sf-empty-line">No stats match</div>
          <div v-for="s in filteredJourneyStats" :key="s.key" class="sf-srow">
            <img v-if="s.img" class="sf-ico" :src="s.img" alt="" aria-hidden="true" />
            <Icon v-else :icon="s.icon!" class="sf-ico sf-ico--tint" width="22" height="22" />
            <span class="sf-srow-lbl">{{ s.label }}</span>
            <span class="sf-srow-val" :class="s.valueClass">{{ s.value }}</span>
          </div>
        </div>
      </section>

      <!-- ─ Augments & buffs ─ -->
      <section class="sf-panel sf-col">
        <header class="sf-p-head">
          <span class="sf-p-title">Augments</span>
          <label class="sf-search-wrap">
            <Icon icon="game-icons:magnifying-glass" class="sf-search-ico" width="13" height="13" />
            <input
              v-model="augmentSearch"
              class="sf-search"
              type="text"
              placeholder="Search augments…"
            />
          </label>
        </header>
        <div class="sf-p-body rpg-scrollbar">
          <div class="sf-buff-chips">
            <div v-if="filteredChips.length === 0" class="sf-empty-line">
              {{ totalChips.length === 0 ? 'No buffs active yet' : 'No buffs match' }}
            </div>
            <div v-for="chip in filteredChips" :key="chip.key" class="sf-chip-buff">
              <Icon :icon="chip.icon" width="14" height="14" class="sf-chip-buff-icon" />
              <span class="sf-chip-buff-lbl">{{ chip.label }}</span>
              <span class="sf-chip-buff-val" :class="chip.positive ? 'is-up' : 'is-down'">
                {{ chip.value }}
              </span>
            </div>
          </div>

          <div v-if="filteredAugCards.length === 0" class="sf-empty-block">
            <Icon icon="game-icons:gems" width="28" height="28" class="sf-empty-icon" />
            <span>
              {{
                augCards.length === 0
                  ? 'No augments active yet — level up to pick your first one'
                  : 'No augments match your search'
              }}
            </span>
          </div>
          <div v-else class="sf-aug-grid">
            <div
              v-for="card in filteredAugCards"
              :key="card.key"
              class="sf-aug-card"
              :style="{ '--rarity': card.color }"
              :title="`${card.aug.name} — ${card.aug.effectLine}`"
            >
              <div class="sf-aug-icon">
                <img v-if="card.aug.image" :src="card.aug.image" :alt="card.aug.name" />
                <Icon
                  v-else-if="card.aug.icon.includes(':')"
                  :icon="card.aug.icon"
                  width="22"
                  height="22"
                />
                <span v-else class="sf-aug-emoji">{{ card.aug.icon }}</span>
              </div>
              <div class="sf-aug-body">
                <span class="sf-aug-name">{{ card.aug.name }}</span>
                <span class="sf-aug-effect">{{ card.aug.effectLine }}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- ─ Galaxy archive ─ -->
      <section class="sf-panel sf-col">
        <header class="sf-p-head">
          <span class="sf-p-title">Galaxy Archive</span>
          <label class="sf-search-wrap">
            <Icon icon="game-icons:magnifying-glass" class="sf-search-ico" width="13" height="13" />
            <input
              v-model="archiveSearch"
              class="sf-search"
              type="text"
              placeholder="Search galaxies…"
            />
          </label>
        </header>
        <div class="sf-p-body rpg-scrollbar">
          <div v-if="filteredArchive.length === 0" class="sf-empty-block">
            <Icon icon="game-icons:spiral-arrow" width="28" height="28" class="sf-empty-icon" />
            <span v-if="archive.length === 0"
              >No galaxies freed yet — rescue every star and defeat the core to preserve your first
              map here.</span
            >
            <span v-else>No galaxies match your search</span>
          </div>
          <div v-else class="sf-arch-list">
            <div
              v-for="rec in filteredArchive"
              :key="rec.galaxy"
              class="sf-arch-card"
              :title="`Galaxy ${rec.galaxy} — freed ${archiveDate(rec)}`"
            >
              <div class="sf-arch-imgwrap">
                <img
                  :src="renderGalaxySnapshot(rec)"
                  :alt="`Minimap of galaxy ${rec.galaxy}`"
                  class="sf-arch-img"
                  loading="lazy"
                />
                <!-- Galaxy number badge, top-left over the map -->
                <span class="sf-arch-badge">Galaxy {{ rec.galaxy }}</span>
                <!-- Stars rescued / lost, top-right over the map -->
                <span class="sf-arch-stars">
                  <span class="sf-arch-star sf-arch-star--won" title="Stars rescued">
                    <Icon
                      class="sf-arch-star-ico"
                      icon="game-icons:round-star"
                      width="12"
                      height="12"
                    />
                    <span class="sf-arch-star-n">{{ archiveRescued(rec) }}</span>
                  </span>
                  <span class="sf-arch-star sf-arch-star--lost" title="Stars lost">
                    <Icon
                      class="sf-arch-star-ico"
                      icon="game-icons:cracked-glass"
                      width="12"
                      height="12"
                    />
                    <span class="sf-arch-star-n">{{ archiveFailed(rec) }}</span>
                  </span>
                </span>
                <!-- Time spent + date freed, over the map's lower edge -->
                <div class="sf-arch-info">
                  <span
                    class="sf-arch-info-item sf-arch-info-time"
                    title="Time spent in this galaxy"
                  >
                    <Icon icon="game-icons:sand-clock" width="12" height="12" />
                    {{ formatDuration(rec.durationSeconds * 1000) }}
                  </span>
                  <span
                    class="sf-arch-info-item sf-arch-info-date"
                    title="Date this galaxy was freed"
                  >
                    <Icon icon="game-icons:calendar" width="12" height="12" />
                    {{ archiveDate(rec) }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Drag handles sitting on the two column dividers -->
      <div
        class="sf-deck-handle sf-deck-handle--left"
        :class="{ 'is-active': resizeSide === 'left' }"
        :style="{ left: col1Width + 'px' }"
        title="Drag to resize the Journey column"
        @pointerdown="startResize('left', $event)"
      >
        <span class="sf-deck-handle-grip" />
      </div>
      <div
        class="sf-deck-handle sf-deck-handle--right"
        :class="{ 'is-active': resizeSide === 'right' }"
        :style="{ right: col3Width + 'px' }"
        title="Drag to resize the Galaxy Archive column"
        @pointerdown="startResize('right', $event)"
      >
        <span class="sf-deck-handle-grip" />
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ══════════════════════════════════════════════════════════════
   BARD STATS — "Command Deck": a fixed-height dashboard.
   Row 1: solar strip (mini sun + phase + evolution timeline).
   Row 2: three equal-height panels — Journey | Augments | Archive.
   The page itself NEVER scrolls; long lists scroll inside their panel.
══════════════════════════════════════════════════════════════ */

.sf-root {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 10px;
  height: 100%;
  overflow: hidden;
  padding: 12px;
  background: #111008; /* same deep-space base as Shop / Team / Planets */
  color: var(--rpg-text);
}

@media (prefers-reduced-motion: reduce) {
  .sf-timeline-fill--active,
  .sf-mini-sun,
  .sf-mini-ring {
    animation: none;
  }
}

/* ─── Frameless sections: no per-panel border/box — the areas are set apart
   by thin dividers only, and the shared cosmic backdrop shows through. ─── */
.sf-panel {
  position: relative;
  z-index: 1;
  display: flex;
  background: transparent;
}

.sf-col {
  flex-direction: column;
  min-height: 0;
  min-width: 0;
}

.sf-p-head {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 6px 12px;
  /* fixed height so all three section headers match exactly — only their
     column widths differ */
  min-height: 40px;
  border-bottom: 1px solid #2c1806;
}

.sf-p-title {
  display: flex;
  align-items: baseline;
  gap: 7px;
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--rpg-wood);
  white-space: nowrap;
}

.sf-p-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 10px 12px;
}

/* ─── Header context search — identical across all three panels ─── */
.sf-search-wrap {
  position: relative;
  display: flex;
  align-items: center;
  flex: 1 1 auto;
  min-width: 0;
  max-width: 168px;
}
.sf-search-ico {
  position: absolute;
  left: 8px;
  color: #6a5a3a;
  pointer-events: none;
}
.sf-search {
  width: 100%;
  padding: 5px 9px 5px 27px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.03em;
  color: var(--rpg-text);
  background: #111008;
  border: 1px solid #3e200a;
  border-radius: 4px;
  outline: none;
  transition:
    border-color 0.15s,
    box-shadow 0.15s;
}
.sf-search::placeholder {
  color: var(--rpg-text-dim);
  font-weight: 400;
}
.sf-search:focus {
  border-color: #7a4e20;
  box-shadow: 0 0 0 1px rgba(122, 78, 32, 0.45);
}
.sf-search-wrap:focus-within .sf-search-ico {
  color: #c89040;
}

/* ─── Solar strip (row 1) ───────────────────────────────────── */
.sf-solar {
  position: relative;
  flex-shrink: 0;
  align-items: center;
  gap: clamp(14px, 2.5vw, 34px);
  padding: 8px 16px 14px;
  /* divider that sets the solar strip apart from the panel deck below */
  border-bottom: 1px solid #4a2c12;
}

.sf-solar-id {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
}

.sf-mini-sun-wrap {
  position: relative;
  width: 52px;
  height: 52px;
  flex-shrink: 0;
}

.sf-mini-ring {
  position: absolute;
  inset: -4px;
  border-radius: 50%;
  border: 1px dashed color-mix(in srgb, var(--phase-glow) 30%, transparent);
  animation: sf-cw 24s linear infinite;
}
@keyframes sf-cw {
  to {
    transform: rotate(360deg);
  }
}

/* The sun, shrunk to an emblem: same phase palette, tight glow */
.sf-mini-sun {
  position: absolute;
  inset: 6px;
  border-radius: 50%;
  background: radial-gradient(
    circle at 38% 35%,
    var(--sun-core) 0%,
    color-mix(in srgb, var(--sun-core) 50%, var(--sun-mid)) 20%,
    var(--sun-mid) 45%,
    color-mix(in srgb, var(--sun-mid) 30%, var(--sun-edge)) 70%,
    var(--sun-edge) 100%
  );
  box-shadow:
    0 0 12px 3px color-mix(in srgb, var(--sun-glow1) 70%, transparent),
    0 0 30px 10px color-mix(in srgb, var(--sun-glow2) 30%, transparent);
  animation: sf-sun-pulse var(--pulse-speed) ease-in-out infinite;
}

@keyframes sf-sun-pulse {
  0%,
  100% {
    transform: scale(1);
    filter: brightness(1);
  }
  50% {
    transform: scale(1.06);
    filter: brightness(1.18);
  }
}

.sf-solar-meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 118px;
}

.sf-kicker {
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: #b0a080;
  white-space: nowrap;
}

.sf-phase-name {
  font-size: 21px;
  line-height: 1.05;
  letter-spacing: 0.04em;
  color: var(--phase-primary);
  text-shadow: 0 0 10px var(--phase-glow);
  white-space: nowrap;
}
.sf-solar-id:hover .sf-phase-name {
  text-shadow:
    0 0 14px var(--phase-glow),
    0 0 26px var(--phase-glow);
}

.sf-solar-age {
  /* Fixed width so the ticking phase time never reflows the solar strip */
  --sf-age-width: 150px;
  width: var(--sf-age-width);
  font-size: 20px;
  font-weight: 700;
  line-height: 1.05;
  letter-spacing: 0.04em;
  color: var(--rpg-text-muted);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.sf-solar-status {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 5px;
  min-width: 128px;
}

.sf-pill {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 11px 20px;
  font-size: 14px;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  text-align: center;
  border-radius: 6px;
  white-space: nowrap;
  transition:
    box-shadow 0.15s,
    color 0.15s,
    border-color 0.15s,
    transform 0.12s;
}
.sf-pill--ready {
  background: rgba(26, 42, 16, 0.9);
  border: 1px solid #52b830;
  color: #8adc50;
  box-shadow: 0 0 16px rgba(82, 184, 48, 0.35);
  cursor: pointer;
}
.sf-pill--ready:hover {
  box-shadow: 0 0 24px rgba(82, 184, 48, 0.55);
  transform: translateY(-1px);
}
.sf-pill--hint:hover {
  transform: translateY(-1px);
}
.sf-pill--max {
  background: #1e1a06;
  border: 1px solid #e8c040;
  color: #e8c040;
}
.sf-pill--wait {
  background: #16130c;
  border: 1px solid color-mix(in srgb, var(--phase-glow) 40%, #3e200a);
  color: var(--phase-primary);
  font-variant-numeric: tabular-nums;
}
.sf-pill--hint {
  background: #16130c;
  border: 1px solid #3e200a;
  color: var(--rpg-text-dim);
  cursor: pointer;
}
.sf-pill--hint:hover {
  color: var(--phase-primary);
  border-color: #5c3310;
}

/* TEMP: admin dwell-skip chip — floated into the strip's top-right corner so
   it is out of the flow and never influences the strip / status-button layout */
.sf-dev-skip {
  position: absolute;
  top: 5px;
  right: 8px;
  z-index: 4;
  padding: 2px 7px;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #cc6050;
  background: #16100c;
  border: 1px dashed #cc6050;
  border-radius: 4px;
  opacity: 0.5;
  cursor: pointer;
  transition:
    opacity 0.15s,
    box-shadow 0.15s;
}
.sf-dev-skip:hover {
  opacity: 1;
  box-shadow: 0 0 8px rgba(204, 96, 80, 0.4);
}

/* ─ Evolution timeline (inside the solar strip) ─ */
.sf-timeline {
  position: relative;
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  /* headroom for the dwell clock floating just above the track */
  padding-top: 10px;
}

.sf-timeline-track {
  position: absolute;
  /* dot-slot center = padding-top(10) + half of 36px slot = 28px;
     the 2px line is centered on it (top 27 → line spans 27–29, center 28),
     so it passes exactly through the vertical middle of every sun dot */
  top: 27px;
  /* 7 columns × 14% + space-between → first/last dot centers sit exactly
     at 7% / 93%, so the line starts at the first sun and ends at the last */
  left: 7%;
  right: 7%;
  height: 2px;
  background: #2a1a08;
}

.sf-timeline-fill {
  height: 100%;
  background: var(--phase-primary);
  box-shadow: 0 0 6px var(--phase-glow);
  transition: width 0.6s ease;
}

/* Dwell progress creeping from the current dot toward the next phase */
.sf-timeline-fill--active {
  position: absolute;
  top: 0;
  height: 100%;
  background: linear-gradient(to right, var(--phase-primary), #ffffff);
  box-shadow: 0 0 8px var(--phase-glow);
  animation: sf-seg-pulse 2.4s ease-in-out infinite;
  transition: width 0.6s ease;
}
.sf-timeline-fill--active.is-met {
  background: linear-gradient(to right, #52b830, #9ae070);
  box-shadow: 0 0 8px rgba(82, 184, 48, 0.7);
  animation: none;
}
@keyframes sf-seg-pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.55;
  }
}

/* Floating dwell clock just above the active segment's line */
.sf-tl-timer {
  position: absolute;
  top: 4px;
  transform: translateX(-50%);
  /* fixed box: ticking digits never resize or shift the label */
  width: 92px;
  text-align: center;
  cursor: help;
  z-index: 2;
}

.sf-tl-clock {
  font-size: 14px;
  font-weight: 900;
  letter-spacing: 0.03em;
  color: #e8e4d8;
  text-shadow: 0 0 8px rgba(232, 228, 216, 0.35);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.sf-tl-clock.is-met {
  color: #7ac060;
  text-shadow: 0 0 8px rgba(82, 184, 48, 0.55);
}

.sf-tl-step {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  width: 14%;
  z-index: 1;
}

/* Fixed-height slot keeps every sun — small Protostar to huge Supernova —
   vertically centered on the track line. */
.sf-tl-dot-slot {
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.sf-tl-dot {
  flex-shrink: 0;
  border-radius: 50%;
  background: #1c1c18;
  border: 1px solid #3e200a;
  transition:
    box-shadow 0.2s ease,
    background 0.2s ease;
}
/* Reached phases render as miniature suns in their real palette */
.sf-tl-dot.is-done,
.sf-tl-dot.is-current {
  border: none;
  background: radial-gradient(
    circle at 38% 35%,
    var(--dot-core),
    var(--dot-mid) 55%,
    var(--dot-edge)
  );
}
.sf-tl-dot.is-done {
  box-shadow: 0 0 8px color-mix(in srgb, var(--dot-glow) 55%, transparent);
}
.sf-tl-dot.is-current {
  box-shadow:
    0 0 12px var(--dot-glow),
    0 0 22px color-mix(in srgb, var(--dot-glow) 50%, transparent);
  animation: sf-dot-pulse var(--pulse-speed) ease-in-out infinite;
}
/* Comet origin dot — a rocky speck with a faint gold rim; it marks the very
   START of the evolution line, so nothing extends to its left. */
.sf-tl-dot--comet.is-done,
.sf-tl-dot--comet.is-current {
  /* rocky body: grey core with a faint gold rim instead of a sun corona */
  background: radial-gradient(
    circle at 38% 35%,
    var(--dot-core),
    var(--dot-mid) 55%,
    var(--dot-edge)
  );
  box-shadow: 0 0 6px color-mix(in srgb, var(--dot-glow) 45%, transparent);
}
.sf-tl-dot--comet.is-done {
  opacity: 0.75;
}

@keyframes sf-dot-pulse {
  0%,
  100% {
    box-shadow:
      0 0 8px var(--dot-glow),
      0 0 14px color-mix(in srgb, var(--dot-glow) 50%, transparent);
  }
  50% {
    box-shadow:
      0 0 16px var(--dot-glow),
      0 0 28px color-mix(in srgb, var(--dot-glow) 60%, transparent);
  }
}

.sf-tl-lbl {
  /* Full-width box centered on the dot: the current-phase weight change never
     nudges neighbours, and every label keeps the same size. */
  width: 100%;
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  color: #6a5a3a;
  text-align: center;
  white-space: nowrap;
}
.sf-tl-lbl.is-current {
  font-weight: 900;
}

/* ─── Panel deck (row 2) ────────────────────────────────────── */
.sf-deck {
  position: relative;
  flex: 1;
  min-height: 0;
  display: grid;
  /* grid-template-columns is driven inline by deckStyle (drag-resizable);
     this is only the pre-hydration fallback */
  grid-template-columns: 400px minmax(0, 1fr) 440px;
  gap: 0;
}
/* Vertical dividers between the three areas (their own padding forms the gutter) */
.sf-deck .sf-col + .sf-col {
  border-left: 1px solid #4a2c12;
}

/* ─ Resizable column dividers ─ */
.sf-deck-handle {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 12px;
  z-index: 3;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: col-resize;
  touch-action: none;
}
.sf-deck-handle--left {
  transform: translateX(-50%);
}
.sf-deck-handle--right {
  transform: translateX(50%);
}
/* the visible grip pill, centered on the divider line */
.sf-deck-handle-grip {
  width: 4px;
  height: 34px;
  border-radius: 3px;
  background: #4a2c12;
  transition:
    background 0.15s,
    box-shadow 0.15s,
    height 0.15s;
}
.sf-deck-handle:hover .sf-deck-handle-grip,
.sf-deck-handle.is-active .sf-deck-handle-grip {
  background: #c89040;
  box-shadow: 0 0 9px rgba(200, 144, 64, 0.55);
  height: 48px;
}

/* ─ Journey stats panel ─ */
.sf-stats-body {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

/* Idle play-time hero: oversized, left-aligned, modern */
.sf-playtime {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 1px;
  margin-bottom: 4px;
}
.sf-playtime-lbl {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--rpg-text-muted);
}
.sf-playtime-val {
  font-size: 34px;
  font-weight: 900;
  line-height: 1;
  letter-spacing: 0.01em;
  color: var(--rpg-gold);
  font-variant-numeric: tabular-nums;
  text-shadow: 0 0 14px rgba(232, 192, 64, 0.25);
}

.sf-chips {
  display: flex;
  gap: 8px;
}

/* Level / Galaxy / Universe — the panel's headline trio: larger, modern
   cards with a colored top accent bar and a glowing oversized value. */
.sf-chip {
  flex: 1;
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 12px 6px 10px;
  background: #141008;
  border: 1px solid #241a0c;
  border-radius: 6px;
  overflow: hidden;
}
.sf-chip::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
}
.sf-chip--gold {
  border-color: #5c3310;
}
.sf-chip--gold::before {
  background: #c89040;
}
.sf-chip--green {
  border-color: #3f6a26;
}
.sf-chip--green::before {
  background: #52b830;
}
.sf-chip--rare {
  border-color: #5a3f78;
}
.sf-chip--rare::before {
  background: #9a6fd0;
}

.sf-chip-lbl {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: #8a7a58;
}

.sf-chip-val {
  font-size: 26px;
  font-weight: 900;
  line-height: 1;
  color: var(--rpg-gold);
  font-variant-numeric: tabular-nums;
  text-shadow: 0 0 12px rgba(232, 192, 64, 0.3);
}
.sf-chip--green .sf-chip-val {
  color: var(--rpg-green-light);
  text-shadow: 0 0 12px rgba(110, 192, 64, 0.3);
}
.sf-chip--rare .sf-chip-val {
  color: var(--rpg-rarity-rare);
  text-shadow: 0 0 12px rgba(154, 111, 208, 0.3);
}

/* Unified stat row — every Journey stat (except the Level/Galaxy/Universe
   chips) shares this one size & style: big, readable, modern. */
.sf-srow {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  background: #141008;
  border: 1px solid #241a0c;
  border-radius: 5px;
}

.sf-ico {
  width: 22px;
  height: 22px;
  flex-shrink: 0;
  object-fit: contain;
}
.sf-ico--tint {
  color: #c89040;
}

.sf-srow-lbl {
  flex: 1;
  min-width: 0;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--rpg-text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sf-srow-val {
  font-size: 18px;
  font-weight: 900;
  line-height: 1;
  color: var(--rpg-gold);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  flex-shrink: 0;
}
.sf-srow-val--green {
  color: var(--rpg-green-light);
}

/* ─ Augments panel ─ */
.sf-buff-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  padding-bottom: 9px;
  margin-bottom: 9px;
  border-bottom: 1px solid #241a0c;
}

.sf-empty-line {
  width: 100%;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: var(--rpg-text-dim);
}

.sf-chip-buff {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 4px 9px;
  background: #1c1c18;
  border: 1px solid #3e200a;
  border-radius: 4px;
}
.sf-chip-buff-icon {
  color: #c89040;
  flex-shrink: 0;
}
.sf-chip-buff-lbl {
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: var(--rpg-text-muted);
  white-space: nowrap;
}
.sf-chip-buff-val {
  font-size: 12px;
  font-weight: 900;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.sf-chip-buff-val.is-up {
  color: var(--rpg-gold);
}
.sf-chip-buff-val.is-down {
  color: #52b830;
}

/* Horizontal augment cards in a fluid grid — each row ~52px, so even a
   long collection stays scannable inside the panel scroll. */
.sf-aug-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
  gap: 7px;
}

.sf-aug-card {
  display: flex;
  align-items: center;
  gap: 9px;
  min-width: 0;
  padding: 7px 9px;
  background: #1c1c18;
  border: 1px solid #3e200a;
  border-left: 3px solid var(--rarity);
  border-radius: 5px;
  box-shadow: inset 0 0 10px color-mix(in srgb, var(--rarity) 8%, transparent);
  transition:
    box-shadow 0.15s,
    background 0.15s;
}
.sf-aug-card:hover {
  background: #221f18;
  box-shadow:
    inset 0 0 10px color-mix(in srgb, var(--rarity) 15%, transparent),
    0 0 8px color-mix(in srgb, var(--rarity) 30%, transparent);
}

.sf-aug-icon {
  width: 34px;
  height: 34px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #141410;
  border: 1px solid #2a1a08;
  border-radius: 5px;
  overflow: hidden;
  color: var(--rarity);
}
.sf-aug-icon img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
}
.sf-aug-emoji {
  font-size: 18px;
  line-height: 1;
}

.sf-aug-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.sf-aug-name {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.03em;
  color: var(--rarity);
  line-height: 1.1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sf-aug-effect {
  font-size: 12px;
  font-weight: 900;
  color: var(--rpg-gold);
  line-height: 1.1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ─ Galaxy archive panel ─ */
.sf-arch-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.sf-arch-card {
  flex-shrink: 0;
  background: #111008;
  border: 1px solid #3e200a;
  border-radius: 5px;
  overflow: hidden;
  transition:
    box-shadow 0.15s,
    border-color 0.15s;
}
.sf-arch-card:hover {
  border-color: #7a4e20;
  box-shadow: 0 0 12px rgba(232, 192, 64, 0.22);
}

.sf-arch-imgwrap {
  position: relative;
  aspect-ratio: 16 / 10;
  background: #0b0806;
}

.sf-arch-img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* Galaxy number badge — top-left chip floating over the map */
.sf-arch-badge {
  position: absolute;
  top: 7px;
  left: 7px;
  padding: 3px 9px;
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 0.05em;
  color: var(--rpg-gold);
  background: rgba(8, 6, 3, 0.8);
  border: 1px solid rgba(200, 144, 64, 0.45);
  border-radius: 4px;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.9);
  white-space: nowrap;
}

/* Stars rescued / lost — two tinted mini-badges, top-right over the map */
.sf-arch-stars {
  position: absolute;
  top: 7px;
  right: 7px;
  display: flex;
  align-items: center;
  gap: 5px;
}
.sf-arch-star {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.02em;
  font-variant-numeric: tabular-nums;
  border-radius: 4px;
  background: rgba(8, 6, 3, 0.82);
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.9);
  white-space: nowrap;
}
.sf-arch-star-ico {
  flex-shrink: 0;
  /* round-star / cracked-glass glyphs sit a hair low in their viewBox —
     lift them so icon and number share the same optical center */
  position: relative;
  top: -2px;
}
.sf-arch-star-n {
  line-height: 1;
}
.sf-arch-star--won {
  color: #e8c040;
  border: 1px solid rgba(232, 192, 64, 0.4);
}
.sf-arch-star--lost {
  color: #e08a7a;
  border: 1px solid rgba(204, 96, 80, 0.4);
}

/* Time + date, over the map's lower edge — readable on any galaxy color */
.sf-arch-info {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 16px 9px 6px;
  background: linear-gradient(to top, rgba(8, 6, 3, 0.94), rgba(8, 6, 3, 0));
}

.sf-arch-info-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  line-height: 1;
  font-weight: 700;
  letter-spacing: 0.03em;
  font-variant-numeric: tabular-nums;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.95);
  white-space: nowrap;
}
.sf-arch-info-time {
  color: #ffd88a;
}
.sf-arch-info-date {
  color: #c8b890;
}

/* ─ Shared empty states ─ */
.sf-empty-block {
  height: 100%;
  min-height: 90px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 0 16px;
  text-align: center;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
  line-height: 1.5;
  color: var(--rpg-text-dim);
}
.sf-empty-icon {
  color: #5c4a30;
  flex-shrink: 0;
}
</style>
