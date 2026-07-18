<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { storeToRefs } from 'pinia'
import { Icon } from '@iconify/vue'
import { useGameStore } from '@/stores/gameStore'
import { useGalaxyStore } from '@/stores/galaxyStore'
import { useSynergyStore } from '@/stores/synergyStore'
import { useAugmentStore } from '@/stores/augmentStore'
import { useSolarUpgradeStore } from '@/stores/solarUpgradeStore'
import { useUiStore } from '@/stores/uiStore'
import type { CompletedGalaxyRecord } from '@/stores/galaxyStore'
import {
  STAR_PHASE_DATA,
  COMET_PHASE_DATA,
  STATS_TAB_STARFIELD,
  STATS_TAB_PHASE_DOT_SCALE,
  SUN_PHASE_DISPLAY_OFFSET,
  SUN_PHASE_DISPLAY_TOTAL,
} from '@/config/constants'
import { AUGMENTS } from '@/config/augments'
import { AUGMENT_RARITY_COLOR } from '@/composables/useRarityColors'
import { renderGalaxySnapshot } from '@/utils/galaxySnapshot'
import type { AugmentDefinition } from '@/types'

const gameStore = useGameStore()
const galaxyStore = useGalaxyStore()
const synergyStore = useSynergyStore()
const augmentStore = useAugmentStore()
const solarStore = useSolarUpgradeStore()
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

/* ── Generated backdrop starfield ────────────────────────────── */
/* Seeded PRNG (mulberry32) so the sky layout is identical on every render */
function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

interface BgStar {
  x: number
  y: number
  size: number
  opacity: number
  twinkleDur: number
  twinkleDelay: number
  bright: boolean
  tint: 'white' | 'phase' | 'blue'
}

/* Three drift layers by star size: small stars drift slowest (far),
   big stars fastest (near) — cheap parallax depth. */
const STAR_LAYERS: BgStar[][] = (() => {
  const cfg = STATS_TAB_STARFIELD
  const rnd = mulberry32(cfg.SEED)
  const layers: BgStar[][] = [[], [], []]
  for (let i = 0; i < cfg.COUNT; i++) {
    const size = cfg.SIZE_MIN_PX + rnd() * (cfg.SIZE_MAX_PX - cfg.SIZE_MIN_PX)
    const tintRoll = rnd()
    const layer = size < cfg.LAYER_SIZE_CUTOFFS_PX[0] ? 0 : size < cfg.LAYER_SIZE_CUTOFFS_PX[1] ? 1 : 2
    layers[layer].push({
      x: rnd() * 100,
      y: rnd() * 100,
      size,
      opacity: cfg.OPACITY_MIN + rnd() * (cfg.OPACITY_MAX - cfg.OPACITY_MIN),
      twinkleDur: cfg.TWINKLE_MIN_S + rnd() * (cfg.TWINKLE_MAX_S - cfg.TWINKLE_MIN_S),
      twinkleDelay: -rnd() * cfg.TWINKLE_MAX_S,
      bright: size >= cfg.BRIGHT_THRESHOLD_PX,
      tint:
        tintRoll < cfg.PHASE_TINT_SHARE
          ? 'phase'
          : tintRoll < cfg.PHASE_TINT_SHARE + cfg.BLUE_TINT_SHARE
            ? 'blue'
            : 'white',
    })
  }
  return layers
})()

/* ── Star phase (sun + timeline) ─────────────────────────────── */
const totalPhases = STAR_PHASE_DATA.length
const phase = computed(() => STAR_PHASE_DATA[solarStore.starPhase])
const isMax = computed(() => solarStore.starPhase >= totalPhases - 1)

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

const timelineDots = computed(() =>
  STAR_PHASE_DATA.map((p, i) => ({
    label: p.name,
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
)

const timelineFillPct = computed(() => (solarStore.starPhase / (totalPhases - 1)) * 100)

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
  dwellRequiredMs.value <= 0 ? 100 : Math.min(100, (dwellElapsedMs.value / dwellRequiredMs.value) * 100),
)

/* Active timeline segment (current dot → next dot) filled by dwell progress */
const activeSegLeftPct = computed(() => (solarStore.starPhase / (totalPhases - 1)) * 100)
const activeSegWidthPct = computed(() => (dwellPct.value / 100 / (totalPhases - 1)) * 100)
/* Timer label centers on the active segment's midpoint (track coordinates) */
const timerLabelFrac = computed(() => (solarStore.starPhase + 0.5) / (totalPhases - 1))

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
const archive = computed(() =>
  [...completedGalaxies.value].sort((a, b) => b.galaxy - a.galaxy),
)

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

const augmentCount = computed(() => augCards.value.length)

/* ── Aggregate buff chips (augments + abilities + synergies) ─── */
const buffCPSPct = computed(() => {
  const mod = activeModifier.value
  const total =
    (mod.cpsMultiplier ?? 1) - 1 +
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
    chips.push({ key: 'cps', icon: 'game-icons:lyre', label: 'Production', value: `+${buffCPSPct.value}%`, positive: true })
  if (buffCPCPct.value > 0)
    chips.push({ key: 'cpc', icon: 'game-icons:hand', label: 'Click', value: `+${buffCPCPct.value}%`, positive: true })
  if (buffPowerSynergyPct.value > 0 || buffPowerFlat.value > 0) {
    const parts: string[] = []
    if (buffPowerSynergyPct.value > 0) parts.push(`+${buffPowerSynergyPct.value}%`)
    if (buffPowerFlat.value > 0) parts.push(`+${buffPowerFlat.value}`)
    chips.push({ key: 'power', icon: 'game-icons:magic-swirl', label: 'Power', value: parts.join(' & '), positive: true })
  }
  if (buffMeepPct.value > 0)
    chips.push({ key: 'meep', icon: 'game-icons:crystal-ball', label: 'Meep Power', value: `+${buffMeepPct.value}%`, positive: true })
  if (dpsPct.value > 0)
    chips.push({ key: 'dps', icon: 'game-icons:crossed-swords', label: 'Combat DPS', value: `+${dpsPct.value}%`, positive: true })
  if (buffCDRPct.value > 0)
    chips.push({ key: 'cdr', icon: 'game-icons:sand-clock', label: 'Cooldowns', value: `-${buffCDRPct.value}%`, positive: false })
  if (buffExpPct.value > 0)
    chips.push({ key: 'exp', icon: 'game-icons:treasure-map', label: 'Expeditions', value: `+${buffExpPct.value}%`, positive: true })
  if (buffCostPct.value > 0)
    chips.push({ key: 'cost', icon: 'game-icons:stone-wall', label: 'Build Cost', value: `-${buffCostPct.value}%`, positive: false })
  if (buffEnemyPct.value > 0)
    chips.push({ key: 'enemy', icon: 'game-icons:turtle', label: 'Enemy Speed', value: `-${buffEnemyPct.value}%`, positive: false })
  return chips
})

/* ── Shared search: filters buff chips AND augment cards ─────── */
const buffSearch = ref('')

const searchQuery = computed(() => buffSearch.value.trim().toLowerCase())

const filteredChips = computed(() => {
  const q = searchQuery.value
  if (!q) return totalChips.value
  return totalChips.value.filter(
    (c) => c.label.toLowerCase().includes(q) || c.key.includes(q),
  )
})

const filteredAugCards = computed(() => {
  const q = searchQuery.value
  if (!q) return augCards.value
  return augCards.value.filter(
    (c) =>
      c.aug.name.toLowerCase().includes(q) ||
      c.aug.effectLine.toLowerCase().includes(q) ||
      c.aug.rarity.toLowerCase().includes(q),
  )
})
</script>

<template>
  <div class="sf-root" :style="phaseVars">
    <!-- ══ Ambient space backdrop ══ -->
    <div class="sf-bg" aria-hidden="true">
      <div
        v-for="(layer, li) in STAR_LAYERS"
        :key="li"
        class="sf-drift"
        :class="`sf-drift--${li}`"
      >
        <span
          v-for="(s, si) in layer"
          :key="si"
          class="sf-star"
          :class="{
            'sf-star--bright': s.bright,
            'sf-star--phase': s.tint === 'phase',
            'sf-star--blue': s.tint === 'blue',
          }"
          :style="{
            left: s.x + '%',
            top: s.y + '%',
            width: s.size + 'px',
            height: s.size + 'px',
            '--star-opacity': s.opacity,
            animationDuration: s.twinkleDur + 's',
            animationDelay: s.twinkleDelay + 's',
          }"
        />
      </div>
      <div class="sf-nebula" />
      <div class="sf-shooting-star" />
    </div>

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
          <span class="sf-phase-name">{{ solarStore.isCometState ? COMET_PHASE_DATA.name : phase.name }}</span>
          <span class="sf-solar-age">
            <Icon icon="game-icons:sand-clock" width="10" height="10" />
            {{ phaseAge ?? '—' }} in phase
          </span>
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
          :title="`${STAR_PHASE_DATA[i].name} · ${STAR_PHASE_DATA[i].astroName}`"
        >
          <div class="sf-tl-dot-slot">
            <div
              class="sf-tl-dot"
              :class="{ 'is-done': dot.done, 'is-current': dot.current }"
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
          <span class="sf-tl-lbl" :class="{ 'is-current': dot.current }" :style="dot.current ? { color: dot.color } : undefined">
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
          {{ solarStore.isCometState ? 'Ignite · Shop' : 'Evolve · Shop' }}
        </div>
        <div v-else-if="solarStore.branchesReadyForEvolve" class="sf-pill sf-pill--wait">
          {{ solarStore.isCometState ? 'Igniting in' : 'Evolving in' }} {{ formatDuration(dwellRemainingMs) }}
        </div>
        <div v-else class="sf-pill sf-pill--hint" role="button" @click="uiStore.setBardTab('shop')">
          {{ solarStore.isCometState ? 'Ignite in Shop →' : 'Evolve in Shop →' }}
        </div>
        <!-- TEMP: admin dwell-skip — remove later (incl. adminSkipDwellTime in solarUpgradeStore) -->
        <button
          v-if="!isMax && !dwellMet"
          class="sf-dev-skip"
          type="button"
          title="Admin: skip the remaining dwell time of this phase"
          @click.stop="solarStore.adminSkipDwellTime()"
        >
          DEV · Skip Time
        </button>
        <!-- /TEMP -->
      </div>
    </section>

    <!-- ══ Panel deck: stats | augments | galaxy archive ══ -->
    <div class="sf-deck">
      <!-- ─ Journey stats ─ -->
      <section class="sf-panel sf-col">
        <header class="sf-p-head">
          <span class="sf-p-title">Journey</span>
          <span class="sf-p-aside">
            <Icon icon="game-icons:sand-clock" width="11" height="11" />
            {{ playTime }}
          </span>
        </header>
        <div class="sf-p-body sf-stats-body rpg-scrollbar">
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

          <div class="sf-hero-row">
            <img class="sf-ico sf-ico--lg" src="/img/BardAbilities/BardChime.png" alt="" aria-hidden="true" />
            <span class="sf-srow-lbl">Chimes / Sec</span>
            <span class="sf-hero-val">{{ $formatNumber(chimesPerSecond) }}</span>
          </div>

          <div class="sf-srow">
            <img class="sf-ico" src="/img/BardAbilities/BardChime.png" alt="" aria-hidden="true" />
            <span class="sf-srow-lbl">Chimes / Click</span>
            <span class="sf-srow-val">{{ $formatNumber(chimesPerClick) }}</span>
          </div>
          <div class="sf-srow">
            <img class="sf-ico" src="/img/BardAbilities/BardChime.png" alt="" aria-hidden="true" />
            <span class="sf-srow-lbl">Total Chimes</span>
            <span class="sf-srow-val">{{ $formatNumber(animChimes) }}</span>
          </div>
          <div class="sf-srow">
            <img class="sf-ico" src="/img/BardAbilities/BardMeep.png" alt="" aria-hidden="true" />
            <span class="sf-srow-lbl">Meeps Guided</span>
            <span class="sf-srow-val sf-srow-val--green">{{ $formatNumber(animMeeps) }}</span>
          </div>
          <div class="sf-srow">
            <img class="sf-ico" src="/img/BardAbilities/BardChime.png" alt="" aria-hidden="true" />
            <span class="sf-srow-lbl">Total Clicks</span>
            <span class="sf-srow-val">{{ $formatNumber(animClicks) }}</span>
          </div>
          <div class="sf-srow">
            <img class="sf-ico" src="/img/star.png" alt="" aria-hidden="true" />
            <span class="sf-srow-lbl">Stars Rescued</span>
            <span class="sf-srow-val">{{ $formatNumber(animStars) }}</span>
          </div>
          <div class="sf-srow">
            <Icon icon="game-icons:galaxy" class="sf-ico sf-ico--tint" width="17" height="17" />
            <span class="sf-srow-lbl">Galaxies Freed</span>
            <span class="sf-srow-val">{{ archive.length }}</span>
          </div>
        </div>
      </section>

      <!-- ─ Augments & buffs ─ -->
      <section class="sf-panel sf-col">
        <header class="sf-p-head">
          <span class="sf-p-title">
            Augments
            <span class="sf-p-count">{{ augmentCount }}</span>
          </span>
          <input
            v-model="buffSearch"
            class="sf-search"
            type="text"
            placeholder="Search…"
          />
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
                augmentCount === 0
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
          <span class="sf-p-title">
            Galaxy Archive
            <span class="sf-p-count">{{ archive.length }}</span>
          </span>
          <span class="sf-p-aside">freed</span>
        </header>
        <div class="sf-p-body rpg-scrollbar">
          <div v-if="archive.length === 0" class="sf-empty-block">
            <Icon icon="game-icons:spiral-arrow" width="28" height="28" class="sf-empty-icon" />
            <span>No galaxies freed yet — rescue every star and defeat the core to preserve your first map here.</span>
          </div>
          <div v-else class="sf-arch-list">
            <div
              v-for="rec in archive"
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
                <div class="sf-arch-title">
                  <span class="sf-arch-galaxy">Galaxy {{ rec.galaxy }}</span>
                </div>
              </div>
              <div class="sf-arch-meta">
                <span class="sf-arch-stat sf-arch-stat--rescued" title="Stars rescued">
                  ✦ {{ archiveRescued(rec) }}
                </span>
                <span
                  v-if="archiveFailed(rec) > 0"
                  class="sf-arch-stat sf-arch-stat--failed"
                  title="Stars lost"
                >
                  ✕ {{ archiveFailed(rec) }}
                </span>
                <span class="sf-arch-stat sf-arch-stat--time" title="Time to free this galaxy">
                  <Icon icon="game-icons:sand-clock" width="11" height="11" />
                  {{ formatDuration(rec.durationSeconds * 1000) }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>
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
  background:
    radial-gradient(circle at 88% 0%, color-mix(in srgb, var(--sun-glow1) 14%, transparent), transparent 45%),
    radial-gradient(120% 120% at 12% 100%, #16110b, #0a0806 72%);
  color: var(--rpg-text);
}

/* ─── Ambient backdrop ──────────────────────────────────────── */
.sf-bg {
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  overflow: hidden;
}

.sf-drift {
  position: absolute;
  inset: -14px;
  animation: sf-stars-drift 90s ease-in-out infinite alternate;
}
.sf-drift--1 {
  animation-duration: 65s;
  animation-direction: alternate-reverse;
  animation-delay: -22s;
}
.sf-drift--2 {
  animation-duration: 45s;
  animation-delay: -10s;
}

.sf-star {
  position: absolute;
  border-radius: 50%;
  background: #ffffff;
  opacity: var(--star-opacity);
  animation: sf-star-twinkle 6s ease-in-out infinite;
}
.sf-star--bright {
  box-shadow: 0 0 6px rgba(255, 255, 255, 0.55);
}
.sf-star--phase {
  background: color-mix(in srgb, white 55%, var(--phase-primary));
}
.sf-star--phase.sf-star--bright {
  box-shadow: 0 0 6px var(--phase-glow);
}
.sf-star--blue {
  background: #a8c8ff;
}
.sf-star--blue.sf-star--bright {
  box-shadow: 0 0 6px rgba(140, 180, 255, 0.6);
}

@keyframes sf-star-twinkle {
  0%,
  100% {
    opacity: var(--star-opacity);
  }
  50% {
    opacity: calc(var(--star-opacity) * 0.3);
  }
}

@keyframes sf-stars-drift {
  from {
    transform: translate(0, 0);
  }
  to {
    transform: translate(7px, -5px);
  }
}

.sf-nebula {
  position: absolute;
  top: -25%;
  left: 28%;
  width: 50%;
  height: 75%;
  background: radial-gradient(
    ellipse 50% 40% at 50% 50%,
    color-mix(in srgb, var(--phase-glow) 60%, #6040a0) 0%,
    transparent 70%
  );
  opacity: 0.06;
  animation: sf-nebula-drift 60s ease-in-out infinite alternate;
}

@keyframes sf-nebula-drift {
  from {
    transform: translate(0, 0) scale(1);
  }
  to {
    transform: translate(-4%, 6%) scale(1.12);
  }
}

.sf-shooting-star {
  position: absolute;
  top: 14%;
  left: -8%;
  width: 90px;
  height: 2px;
  border-radius: 2px;
  background: linear-gradient(to left, rgba(255, 255, 255, 0.9), rgba(255, 255, 255, 0.25) 60%, transparent);
  transform: rotate(16deg);
  opacity: 0;
  animation: sf-shooting 14s linear infinite;
}

@keyframes sf-shooting {
  0%,
  91% {
    transform: translate(0, 0) rotate(16deg);
    opacity: 0;
  }
  92% {
    opacity: 0.9;
  }
  97% {
    transform: translate(52vw, 16vh) rotate(16deg);
    opacity: 0;
  }
  100% {
    transform: translate(52vw, 16vh) rotate(16deg);
    opacity: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .sf-timeline-fill--active,
  .sf-drift,
  .sf-star,
  .sf-nebula,
  .sf-shooting-star,
  .sf-mini-sun,
  .sf-mini-ring {
    animation: none;
  }
}

/* ─── Shared panel chrome ───────────────────────────────────── */
.sf-panel {
  position: relative;
  z-index: 1;
  display: flex;
  background: rgba(13, 12, 7, 0.85);
  border: 1px solid #4a2c12;
  border-radius: 6px;
  box-shadow: inset 0 0 0 1px #2c1806, 0 8px 24px rgba(0, 0, 0, 0.45);
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
  padding: 7px 12px;
  border-bottom: 1px solid #2c1806;
}

.sf-p-title {
  display: flex;
  align-items: baseline;
  gap: 7px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--rpg-wood);
  white-space: nowrap;
}

.sf-p-count {
  font-size: 13px;
  font-weight: 900;
  letter-spacing: 0;
  color: var(--rpg-gold);
  font-variant-numeric: tabular-nums;
}

.sf-p-aside {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--rpg-text-muted);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.sf-p-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 10px 12px;
}

/* ─── Solar strip (row 1) ───────────────────────────────────── */
.sf-solar {
  flex-shrink: 0;
  align-items: center;
  gap: clamp(14px, 2.5vw, 34px);
  padding: 8px 16px;
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
  text-shadow: 0 0 14px var(--phase-glow), 0 0 26px var(--phase-glow);
}

.sf-solar-age {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
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
  padding: 6px 12px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  text-align: center;
  border-radius: 5px;
  white-space: nowrap;
  transition: box-shadow 0.15s, color 0.15s, border-color 0.15s;
}
.sf-pill--ready {
  background: rgba(26, 42, 16, 0.9);
  border: 1px solid #52b830;
  color: #7ac060;
  box-shadow: 0 0 14px rgba(82, 184, 48, 0.3);
  cursor: pointer;
}
.sf-pill--ready:hover {
  box-shadow: 0 0 22px rgba(82, 184, 48, 0.5);
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

/* TEMP: admin dwell-skip chip */
.sf-dev-skip {
  padding: 3px 8px;
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
  transition: opacity 0.15s, box-shadow 0.15s;
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
  /* headroom for the dwell clock floating above the track */
  padding-top: 14px;
}

.sf-timeline-track {
  position: absolute;
  /* vertical center of the 36px dot slot (+14px clock headroom) */
  top: 31px;
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

/* Floating dwell clock above the active segment */
.sf-tl-timer {
  position: absolute;
  top: 0;
  transform: translateX(-50%);
  /* fixed box: ticking digits never resize or shift the label */
  width: 76px;
  text-align: center;
  cursor: help;
  z-index: 2;
}

.sf-tl-clock {
  font-size: 11px;
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
  transition: box-shadow 0.2s ease, background 0.2s ease;
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
  box-shadow: 0 0 12px var(--dot-glow), 0 0 22px color-mix(in srgb, var(--dot-glow) 50%, transparent);
  animation: sf-dot-pulse var(--pulse-speed) ease-in-out infinite;
}
@keyframes sf-dot-pulse {
  0%,
  100% {
    box-shadow: 0 0 8px var(--dot-glow), 0 0 14px color-mix(in srgb, var(--dot-glow) 50%, transparent);
  }
  50% {
    box-shadow: 0 0 16px var(--dot-glow), 0 0 28px color-mix(in srgb, var(--dot-glow) 60%, transparent);
  }
}

.sf-tl-lbl {
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.04em;
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
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: minmax(228px, 290px) minmax(0, 1fr) minmax(238px, 330px);
  gap: 10px;
}

/* ─ Journey stats panel ─ */
.sf-stats-body {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.sf-chips {
  display: flex;
  gap: 6px;
}

.sf-chip {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 5px 4px;
  background: #111008;
  border-radius: 5px;
}
.sf-chip--gold {
  border: 1px solid #5c3310;
}
.sf-chip--green {
  border: 1px solid #4a6a2a;
}
.sf-chip--rare {
  border: 1px solid #6a4a80;
}

.sf-chip-lbl {
  font-size: 8px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #7a6848;
}

.sf-chip-val {
  font-size: 15px;
  font-weight: 900;
  line-height: 1;
  color: var(--rpg-gold);
  font-variant-numeric: tabular-nums;
}
.sf-chip--green .sf-chip-val {
  color: var(--rpg-green-light);
}
.sf-chip--rare .sf-chip-val {
  color: var(--rpg-rarity-rare);
}

.sf-hero-row {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 8px 10px;
  background: linear-gradient(to right, #1a1008, #120d07);
  border: 1px solid #3e200a;
  border-radius: 5px;
}

.sf-hero-val {
  font-size: 20px;
  font-weight: 900;
  line-height: 1;
  color: var(--rpg-gold);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.sf-srow {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 5px 10px;
  background: #141008;
  border: 1px solid #241a0c;
  border-radius: 5px;
}

.sf-ico {
  width: 17px;
  height: 17px;
  flex-shrink: 0;
  object-fit: contain;
}
.sf-ico--lg {
  width: 24px;
  height: 24px;
}
.sf-ico--tint {
  color: #c89040;
}

.sf-srow-lbl {
  flex: 1;
  min-width: 0;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--rpg-text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sf-srow-val {
  font-size: 14px;
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
.sf-search {
  width: min(150px, 45%);
  padding: 4px 9px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.03em;
  color: var(--rpg-text);
  background: #111008;
  border: 1px solid #3e200a;
  border-radius: 4px;
  outline: none;
  transition: border-color 0.15s;
}
.sf-search::placeholder {
  color: var(--rpg-text-dim);
  font-weight: 400;
}
.sf-search:focus {
  border-color: #7a4e20;
}

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
  transition: box-shadow 0.15s, background 0.15s;
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
  transition: box-shadow 0.15s, border-color 0.15s;
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

/* Name plate over the map's lower edge — readable on any galaxy color */
.sf-arch-title {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  padding: 12px 9px 5px;
  background: linear-gradient(to top, rgba(8, 6, 3, 0.92), rgba(8, 6, 3, 0));
}

.sf-arch-galaxy {
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 0.05em;
  color: var(--rpg-gold);
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.9);
  white-space: nowrap;
}

.sf-arch-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 5px 9px 6px;
  border-top: 1px solid #241a0c;
}

.sf-arch-stat {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.03em;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.sf-arch-stat--rescued {
  color: var(--rpg-gold);
}
.sf-arch-stat--failed {
  color: #cc6050;
}
.sf-arch-stat--time {
  margin-left: auto;
  color: var(--rpg-text-muted);
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
