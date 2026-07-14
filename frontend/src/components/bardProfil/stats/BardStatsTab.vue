<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { storeToRefs } from 'pinia'
import { Icon } from '@iconify/vue'
import { useGameStore } from '@/stores/gameStore'
import { useGalaxyStore } from '@/stores/galaxyStore'
import { useBattleStore } from '@/stores/battleStore'
import { useSynergyStore } from '@/stores/synergyStore'
import { useAugmentStore } from '@/stores/augmentStore'
import { useSolarUpgradeStore } from '@/stores/solarUpgradeStore'
import { useUiStore } from '@/stores/uiStore'
import { CHAMPION_ROLES } from '@/config/championRoles'
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
import type { AugmentDefinition } from '@/types'

const totalChampions = Object.keys(CHAMPION_ROLES).length

const gameStore = useGameStore()
const galaxyStore = useGalaxyStore()
const battleStore = useBattleStore()
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
  activeModifier,
  abilityCPSMultiplier,
  abilityCPCMultiplier,
  abilityPowerBonus,
} = storeToRefs(gameStore)
const { starsRescued, currentGalaxy } = storeToRefs(galaxyStore)
const { ownedChampions, currentRank } = storeToRefs(battleStore)
const { cpsSynergyMultiplier, powerSynergyMultiplier, dpsSynergyMultiplier } =
  storeToRefs(synergyStore)
const { temporaryCPSMultiplier } = storeToRefs(augmentStore)

const championCount = computed(() => ownedChampions.value.filter((c) => c !== 'Bard').length)
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
const animChampions = computed(() => Math.floor(championCount.value * countUpProgress.value))

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
  <div class="sf-root rpg-scrollbar">
    <!-- ══ Cinematic stage: Bard | stats | sun ══ -->
    <div class="sf-stage" :style="phaseVars">
      <div class="sf-stage-bg" aria-hidden="true">
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
        <span class="sf-sparkle sf-sparkle--1">✦</span>
        <span class="sf-sparkle sf-sparkle--2">✦</span>
        <span class="sf-sparkle sf-sparkle--3">✦</span>
        <div class="sf-galaxy" />
        <div class="sf-nebula" />
        <div class="sf-shooting-star" />
        <div class="sf-shooting-star sf-shooting-star--2" />
      </div>
      <img
        src="/img/BardAbilities/Bard.png"
        alt="Bard – The Wandering Caretaker"
        class="sf-bard"
      />

      <!-- ─ Center stat card ─ -->
      <div class="sf-card">
        <div class="sf-card-gold" />
        <div class="sf-chips">
          <div class="sf-chip sf-chip--gold">
            <span class="sf-chip-lbl">Level</span>
            <span class="sf-chip-val">{{ level }}</span>
          </div>
          <div class="sf-chip sf-chip--green">
            <span class="sf-chip-lbl">Rank</span>
            <span class="sf-chip-val sf-chip-val--sm">{{ currentRank.tier }} {{ currentRank.division }}</span>
          </div>
          <div class="sf-chip sf-chip--rare">
            <span class="sf-chip-lbl">Galaxy</span>
            <span class="sf-chip-val sf-chip-val--sm">{{ currentGalaxy }}</span>
          </div>
        </div>

        <div class="sf-hero-row">
          <img class="sf-row-icon sf-row-icon--lg" src="/img/BardAbilities/BardChime.png" alt="" aria-hidden="true" />
          <span class="sf-row-lbl">Chimes / Sec</span>
          <span class="sf-hero-val">{{ $formatNumber(chimesPerSecond) }}</span>
        </div>

        <div class="sf-row">
          <img class="sf-row-icon" src="/img/BardAbilities/BardChime.png" alt="" aria-hidden="true" />
          <span class="sf-row-lbl">Chimes / Click</span>
          <span class="sf-row-val">{{ $formatNumber(chimesPerClick) }}</span>
        </div>
        <div v-if="dpsPct > 0" class="sf-row">
          <Icon icon="game-icons:crossed-swords" class="sf-row-icon sf-icon-dps" width="19" height="19" />
          <span class="sf-row-lbl">Combat DPS</span>
          <span class="sf-row-val sf-row-val--dps">+{{ dpsPct }}%</span>
        </div>
        <div class="sf-row">
          <img class="sf-row-icon" src="/img/BardAbilities/BardMeep.png" alt="" aria-hidden="true" />
          <span class="sf-row-lbl">Meeps Guided</span>
          <span class="sf-row-val sf-row-val--green">{{ $formatNumber(animMeeps) }}</span>
        </div>
        <div class="sf-row">
          <img class="sf-row-icon" src="/img/BardAbilities/BardChime.png" alt="" aria-hidden="true" />
          <span class="sf-row-lbl">Total Chimes</span>
          <span class="sf-row-val">{{ $formatNumber(animChimes) }}</span>
        </div>
        <div class="sf-row">
          <img class="sf-row-icon" src="/img/star.png" alt="" aria-hidden="true" />
          <span class="sf-row-lbl">Stars Rescued</span>
          <span class="sf-row-val">{{ $formatNumber(animStars) }}</span>
        </div>
        <div class="sf-row">
          <img class="sf-row-icon" src="/img/menu/TEAM.png" alt="" aria-hidden="true" />
          <span class="sf-row-lbl">Champions</span>
          <span class="sf-row-val">
            {{ animChampions }}<span class="sf-row-val-sub"> / {{ totalChampions }}</span>
          </span>
        </div>
        <div class="sf-row">
          <img class="sf-row-icon" src="/img/BardAbilities/BardChime.png" alt="" aria-hidden="true" />
          <span class="sf-row-lbl">Total Clicks</span>
          <span class="sf-row-val">{{ $formatNumber(animClicks) }}</span>
        </div>
      </div>

      <!-- ─ Sun column (click → solar shop) ─ -->
      <div class="sf-sun-col" @click="uiStore.setBardTab('shop')">
        <div class="sf-sun-wrap">
          <div class="sf-ring sf-ring--outer" />
          <div class="sf-ring sf-ring--inner" />
          <div class="sf-sun" />
        </div>
        <div class="sf-phase-kicker">
          {{ solarStore.isCometState ? `Star Phase · 1 / ${SUN_PHASE_DISPLAY_TOTAL}` : `Star Phase · ${solarStore.starPhase + SUN_PHASE_DISPLAY_OFFSET} / ${SUN_PHASE_DISPLAY_TOTAL}` }}
        </div>
        <div class="sf-phase-name">{{ solarStore.isCometState ? COMET_PHASE_DATA.name : phase.name }}</div>
        <div class="sf-time">
          <span class="sf-time-big">{{ phaseAge ?? '—' }}</span>
          <span class="sf-time-sub">
            <Icon icon="game-icons:sand-clock" width="12" height="12" class="sf-time-sub-icon" />
            Time in phase
          </span>
        </div>
        <div v-if="isMax" class="sf-pill sf-pill--max">Fully Evolved · MAX</div>
        <div v-else-if="solarStore.canUpgradeStar" class="sf-pill sf-pill--ready">
          {{ solarStore.isCometState ? 'Ready to Ignite · Shop' : 'Ready to Evolve · Shop' }}
        </div>
        <div v-else-if="solarStore.branchesReadyForEvolve" class="sf-pill sf-pill--wait">
          {{ solarStore.isCometState ? 'Igniting in' : 'Evolving in' }} {{ formatDuration(dwellRemainingMs) }}
        </div>
        <div v-else class="sf-pill sf-pill--hint">
          {{ solarStore.isCometState ? 'Ignite in Shop →' : 'Evolve in Shop →' }}
        </div>
      </div>
    </div>

    <!-- ══ Bottom band: evolution timeline + augment shelf ══ -->
    <div class="sf-band" :style="phaseVars">
      <div class="sf-evo">
        <div class="sf-band-label">Stellar Evolution</div>
        <!-- TEMP: admin dwell-skip — remove later (incl. .sf-dev-skip CSS + adminSkipDwellTime in solarUpgradeStore) -->
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
        <div class="sf-timeline">
          <!-- Dwell timer above the currently filling segment -->
          <div
            v-if="!isMax"
            class="sf-tl-timer"
            :style="{ left: `calc(7% + 86% * ${timerLabelFrac})` }"
            :title="`${formatDuration(dwellElapsedMs)} of ${formatDuration(dwellRequiredMs)} in this phase — time the sun must spend before it can evolve`"
          >
            <span v-if="dwellMet" class="sf-time-big sf-time-big--sm is-met">✓ Ready</span>
            <span v-else class="sf-time-big sf-time-big--sm">{{ formatDuration(dwellRemainingMs) }}</span>
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
      </div>

      <div class="sf-aug-zone">
        <!-- ─ Left: buff panel with search ─ -->
        <div class="sf-buff-panel">
          <div class="sf-buff-head">
            <span class="sf-band-label">Augments</span>
            <span class="sf-shelf-count">
              {{ augmentCount }} <span class="sf-shelf-count-sub">active</span>
            </span>
          </div>
          <input
            v-model="buffSearch"
            class="sf-buff-search"
            type="text"
            placeholder="Search augment or buff…"
          />
          <div class="sf-buff-chips rpg-scrollbar">
            <div v-if="filteredChips.length === 0" class="sf-buff-empty">
              {{ totalChips.length === 0 ? 'No buffs active yet' : 'No buffs match' }}
            </div>
            <div v-for="chip in filteredChips" :key="chip.key" class="sf-chip-buff">
              <Icon :icon="chip.icon" width="15" height="15" class="sf-chip-buff-icon" />
              <span class="sf-chip-buff-lbl">{{ chip.label }}</span>
              <span class="sf-chip-buff-val" :class="chip.positive ? 'is-up' : 'is-down'">
                {{ chip.value }}
              </span>
            </div>
          </div>
        </div>

        <!-- ─ Right: augment card shelf (fixed height) ─ -->
        <div class="sf-shelf-col">
          <div v-if="filteredAugCards.length === 0" class="sf-shelf-empty">
            <Icon icon="game-icons:gems" width="30" height="30" class="sf-shelf-empty-icon" />
            <span>
              {{
                augmentCount === 0
                  ? 'No augments active yet — level up to pick your first one'
                  : 'No augments match your search'
              }}
            </span>
          </div>
          <div v-else class="sf-shelf rpg-scrollbar">
            <div
              v-for="card in filteredAugCards"
              :key="card.key"
              class="sf-aug-card"
              :style="{ '--rarity': card.color }"
              :title="card.aug.effectLine"
            >
              <div class="sf-aug-icon">
                <img v-if="card.aug.image" :src="card.aug.image" :alt="card.aug.name" />
                <Icon
                  v-else-if="card.aug.icon.includes(':')"
                  :icon="card.aug.icon"
                  width="32"
                  height="32"
                />
                <span v-else class="sf-aug-emoji">{{ card.aug.icon }}</span>
              </div>
              <span class="sf-aug-name">{{ card.aug.name }}</span>
              <span class="sf-aug-effect">{{ card.aug.effectLine }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ══════════════════════════════════════════════════════════════
   BARD STATS — "Star Forge": cinematic stage + evolution band
══════════════════════════════════════════════════════════════ */

.sf-root {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow-y: auto;
  background: var(--rpg-bg-deep);
  color: var(--rpg-text);
}

/* ─── Cinematic stage ───────────────────────────────────────── */
.sf-stage {
  position: relative;
  flex: 1;
  min-height: 440px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 24px 30px;
  overflow: hidden;
  background:
    radial-gradient(circle at 84% 50%, color-mix(in srgb, var(--sun-glow1) 24%, transparent), transparent 40%),
    radial-gradient(circle at 90% 50%, color-mix(in srgb, var(--sun-glow2) 14%, transparent), transparent 60%),
    radial-gradient(120% 120% at 12% 50%, #16110b, #0a0806 72%);
}

/* ─── Animated space backdrop (stars, galaxy, nebula) ───────── */
.sf-stage-bg {
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  overflow: hidden;
}

/* Generated starfield: three drift layers (slow/mid/fast by star size,
   seeded PRNG layout) — every star twinkles at its own pace. */
.sf-drift {
  position: absolute;
  /* slight overscan so the gentle drift never reveals hard edges */
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

/* Barely-there parallax drift (≤8px), run with `alternate` */
@keyframes sf-stars-drift {
  from {
    transform: translate(0, 0);
  }
  to {
    transform: translate(7px, -5px);
  }
}

/* Distant spiral galaxy: tilted ellipse slowly rotating in the
   upper-left quadrant — cool violet counterpoint to the warm sun. */
.sf-galaxy {
  position: absolute;
  top: 6%;
  left: 8%;
  width: 200px;
  height: 200px;
  opacity: 0.22;
  background:
    radial-gradient(ellipse 50% 14% at 50% 50%, rgba(232, 224, 255, 0.9) 0%, rgba(160, 130, 220, 0.5) 34%, transparent 72%),
    radial-gradient(ellipse 26% 8% at 50% 50%, rgba(255, 255, 255, 0.95) 0%, transparent 60%),
    radial-gradient(ellipse 62% 22% at 50% 50%, rgba(128, 96, 192, 0.35) 0%, transparent 78%);
  animation: sf-galaxy-spin 240s linear infinite;
}

@keyframes sf-galaxy-spin {
  from {
    transform: rotate(-24deg);
  }
  to {
    transform: rotate(336deg);
  }
}

/* Nebula wisp: large soft blob near the top center, tinted to the
   current star phase so it recolors on evolution. */
.sf-nebula {
  position: absolute;
  top: -20%;
  left: 30%;
  width: 46%;
  height: 70%;
  background: radial-gradient(
    ellipse 50% 40% at 50% 50%,
    color-mix(in srgb, var(--phase-glow) 60%, #6040a0) 0%,
    transparent 70%
  );
  opacity: 0.07;
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

/* Rare shooting star: one streak crossing the upper stage, visible
   for a blink (~6% of a 14s cycle) — rarity keeps it charming. */
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

/* Second shooting star: opposite direction, off-sync cycle */
.sf-shooting-star--2 {
  top: 34%;
  left: auto;
  right: -8%;
  width: 70px;
  background: linear-gradient(to right, rgba(255, 255, 255, 0.85), rgba(255, 255, 255, 0.2) 60%, transparent);
  transform: rotate(-170deg);
  animation: sf-shooting-2 19s linear infinite;
  animation-delay: -7s;
}

@keyframes sf-shooting-2 {
  0%,
  90% {
    transform: translate(0, 0) rotate(-170deg);
    opacity: 0;
  }
  91% {
    opacity: 0.8;
  }
  96% {
    transform: translate(-46vw, 10vh) rotate(-170deg);
    opacity: 0;
  }
  100% {
    transform: translate(-46vw, 10vh) rotate(-170deg);
    opacity: 0;
  }
}

/* Sparkle stars: four-point ✦ glints pinging at their own cadence */
.sf-sparkle {
  position: absolute;
  font-size: 13px;
  line-height: 1;
  color: rgba(255, 255, 255, 0.85);
  text-shadow: 0 0 6px rgba(255, 255, 255, 0.6);
  animation: sf-sparkle-ping 5s ease-in-out infinite;
}
.sf-sparkle--1 {
  top: 18%;
  left: 40%;
}
.sf-sparkle--2 {
  top: 66%;
  left: 12%;
  font-size: 10px;
  color: color-mix(in srgb, white 75%, var(--phase-primary));
  text-shadow: 0 0 6px var(--phase-glow);
  animation-duration: 7s;
  animation-delay: -2.8s;
}
.sf-sparkle--3 {
  top: 8%;
  left: 74%;
  font-size: 11px;
  animation-duration: 6s;
  animation-delay: -4.4s;
}

@keyframes sf-sparkle-ping {
  0%,
  100% {
    transform: scale(0.5) rotate(0deg);
    opacity: 0.15;
  }
  50% {
    transform: scale(1.15) rotate(45deg);
    opacity: 0.9;
  }
}

@media (prefers-reduced-motion: reduce) {
  .sf-timeline-fill--active,
  .sf-drift,
  .sf-star,
  .sf-galaxy,
  .sf-nebula,
  .sf-shooting-star,
  .sf-sparkle,
  .sf-bard,
  .sf-sun,
  .sf-ring {
    animation: none;
  }
}

/* ─ Bard hero ─ */
.sf-bard {
  position: relative;
  z-index: 1;
  width: clamp(170px, 24%, 300px);
  height: auto;
  flex-shrink: 1;
  object-fit: contain;
  filter: drop-shadow(0 10px 30px rgba(0, 0, 0, 0.7)) drop-shadow(0 0 22px rgba(232, 192, 64, 0.3));
  animation: sf-floaty 7s ease-in-out infinite;
}

@keyframes sf-floaty {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-7px);
  }
}

/* ─ Center stat card ─ */
.sf-card {
  position: relative;
  z-index: 1;
  flex: 0 1 384px;
  min-width: 300px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 16px 18px;
  background: rgba(13, 12, 7, 0.82);
  border: 1px solid #5c3310;
  border-radius: 5px;
  box-shadow: inset 0 0 0 1px #3e200a, 0 12px 34px rgba(0, 0, 0, 0.55);
}

.sf-card-gold {
  height: 3px;
  margin: -16px -18px 2px;
  background: linear-gradient(to right, #5c3310, #c89040, #e8c040, #d4a020, #c89040, #5c3310);
  border-radius: 5px 5px 0 0;
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
  padding: 6px 4px;
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
  font-size: 17px;
  font-weight: 900;
  line-height: 1;
  color: var(--rpg-gold);
  font-variant-numeric: tabular-nums;
}
.sf-chip-val--sm {
  font-size: 14px;
}
.sf-chip--green .sf-chip-val {
  color: var(--rpg-green-light);
}
.sf-chip--rare .sf-chip-val {
  color: var(--rpg-rarity-rare);
}

/* ─ Hero CPS row ─ */
.sf-hero-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 12px;
  background: linear-gradient(to right, #1a1008, #120d07);
  border: 1px solid #3e200a;
  border-radius: 5px;
}

.sf-hero-val {
  font-size: 27px;
  font-weight: 900;
  line-height: 1;
  color: var(--rpg-gold);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

/* ─ Compact stat rows ─ */
.sf-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 7px 12px;
  border-top: 1px solid #241a0c;
}

.sf-row-icon {
  width: 19px;
  height: 19px;
  flex-shrink: 0;
  object-fit: contain;
}
.sf-row-icon--lg {
  width: 26px;
  height: 26px;
}
.sf-icon-dps {
  color: #c060a0;
}

.sf-row-lbl {
  flex: 1;
  min-width: 0;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--rpg-text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sf-row-val {
  font-size: 18px;
  font-weight: 900;
  line-height: 1;
  color: var(--rpg-gold);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  flex-shrink: 0;
}
.sf-row-val--dps {
  color: #c060a0;
}
.sf-row-val--green {
  color: var(--rpg-green-light);
}
.sf-row-val-sub {
  font-size: 12px;
  font-weight: 700;
  color: var(--rpg-text-dim);
}

/* ─ Sun column ─ */
.sf-sun-col {
  position: relative;
  z-index: 1;
  flex-shrink: 0;
  width: clamp(220px, 27%, 320px);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  cursor: pointer;
}

.sf-sun-wrap {
  position: relative;
  width: clamp(190px, 90%, 300px);
  aspect-ratio: 1;
}

.sf-ring {
  position: absolute;
  border-radius: 50%;
  pointer-events: none;
}
.sf-ring--outer {
  inset: -6px;
  border: 1px solid color-mix(in srgb, var(--phase-glow) 25%, transparent);
  animation: sf-cw 30s linear infinite;
}
.sf-ring--inner {
  inset: 8%;
  border: 1px dashed color-mix(in srgb, var(--phase-glow) 17%, transparent);
  animation: sf-ccw 18s linear infinite;
}
@keyframes sf-cw {
  to {
    transform: rotate(360deg);
  }
}
@keyframes sf-ccw {
  to {
    transform: rotate(-360deg);
  }
}

.sf-sun {
  position: absolute;
  inset: 14%;
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
    0 0 50px 18px color-mix(in srgb, var(--sun-glow1) 75%, transparent),
    0 0 110px 44px color-mix(in srgb, var(--sun-glow1) 45%, transparent),
    0 0 190px 80px color-mix(in srgb, var(--sun-glow2) 28%, transparent),
    0 0 250px 110px color-mix(in srgb, var(--sun-glow3) 14%, transparent);
  animation: sf-sun-pulse var(--pulse-speed) ease-in-out infinite;
}

@keyframes sf-sun-pulse {
  0%,
  100% {
    transform: scale(1);
    filter: brightness(1);
  }
  50% {
    transform: scale(1.05);
    filter: brightness(1.2);
  }
}

.sf-phase-kicker {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.32em;
  text-transform: uppercase;
  color: #b0a080;
  text-align: center;
}

.sf-phase-name {
  font-size: 34px;
  letter-spacing: 0.04em;
  color: var(--phase-primary);
  line-height: 1.15;
  text-align: center;
  animation: sf-name-pulse var(--pulse-speed) ease-in-out infinite;
}

@keyframes sf-name-pulse {
  0%,
  100% {
    text-shadow: 0 0 12px var(--phase-glow), 0 0 26px var(--phase-glow);
  }
  50% {
    text-shadow: 0 0 4px var(--phase-glow);
  }
}

.sf-time {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
}

/* Shared time-display style: big gold value + muted uppercase sub-label —
   used by the timeline dwell timer and the sun's "Time in phase". */
.sf-time-big {
  font-size: 17px;
  font-weight: 900;
  line-height: 1;
  letter-spacing: 0.03em;
  color: var(--rpg-gold);
  text-shadow: 0 0 10px rgba(232, 192, 64, 0.45);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.sf-time-big.is-met {
  color: #7ac060;
  text-shadow: 0 0 10px rgba(82, 184, 48, 0.6);
}
/* Compact variant: same look, sized to fit between two timeline dots */
.sf-time-big--sm {
  font-size: 13px;
  text-shadow: 0 0 8px rgba(232, 192, 64, 0.4);
}
.sf-time-big--sm.is-met {
  text-shadow: 0 0 8px rgba(82, 184, 48, 0.55);
}

.sf-time-sub {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--rpg-text-muted);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.sf-time-sub-icon {
  color: var(--rpg-text-muted);
  flex-shrink: 0;
}

.sf-pill {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  border-radius: 5px;
  transition: box-shadow 0.15s;
}
.sf-pill--ready {
  background: rgba(26, 42, 16, 0.9);
  border: 1px solid #52b830;
  color: #7ac060;
  box-shadow: 0 0 16px rgba(82, 184, 48, 0.3);
}
.sf-sun-col:hover .sf-pill--ready {
  box-shadow: 0 0 24px rgba(82, 184, 48, 0.5);
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
}
.sf-sun-col:hover .sf-pill--hint {
  color: var(--phase-primary);
  border-color: #5c3310;
}

/* ─── Bottom band ───────────────────────────────────────────── */
.sf-band {
  flex-shrink: 0;
  background: #1a1008;
  border-top: 2px solid #5c3310;
  padding: 18px 22px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.sf-band-label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--rpg-wood);
}

/* ─ Stellar Evolution timeline ─ */
.sf-evo {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* TEMP: admin dwell-skip chip — absolutely positioned, zero layout impact */
.sf-dev-skip {
  position: absolute;
  top: -4px;
  right: 0;
  z-index: 3;
  padding: 3px 8px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #cc6050;
  background: #16100c;
  border: 1px dashed #cc6050;
  border-radius: 4px;
  opacity: 0.55;
  cursor: pointer;
  transition: opacity 0.15s, box-shadow 0.15s;
}
.sf-dev-skip:hover {
  opacity: 1;
  box-shadow: 0 0 8px rgba(204, 96, 80, 0.4);
}

.sf-timeline {
  position: relative;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 0;
}

.sf-timeline-track {
  position: absolute;
  /* vertical center of the 36px dot slot */
  top: 17px;
  /* 7 columns × 14% + space-between → first/last dot centers sit exactly
     at 7% / 93%, so the line starts at the first sun and ends at the last */
  left: 7%;
  right: 7%;
  height: 2px;
  background: #2a1a08;
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

/* Big on-graph dwell timer above the active segment */
.sf-tl-timer {
  position: absolute;
  /* just below the track, in the gap between the two dot labels */
  top: 28px;
  transform: translateX(-50%);
  /* fixed box: ticking digits never resize or shift the label */
  width: 76px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  /* hoverable: title tooltip carries the elapsed/total detail */
  cursor: help;
  text-align: center;
  z-index: 2;
}

/* Countdown reads as a neutral clock, not another gold stat value */
.sf-tl-timer .sf-time-big--sm {
  color: #e8e4d8;
  text-shadow: 0 0 8px rgba(232, 228, 216, 0.35);
}
.sf-tl-timer .sf-time-big--sm.is-met {
  color: #7ac060;
  text-shadow: 0 0 8px rgba(82, 184, 48, 0.55);
}


.sf-timeline-fill {
  height: 100%;
  background: var(--phase-primary);
  box-shadow: 0 0 6px var(--phase-glow);
  transition: width 0.6s ease;
}

.sf-tl-step {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 7px;
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
}
.sf-tl-lbl.is-current {
  font-size: 10px;
  font-weight: 900;
}

/* ─ Augment zone: fixed height in every state ─ */
.sf-aug-zone {
  display: flex;
  gap: 14px;
  height: 190px;
}

/* Left: buff panel with shared search */
.sf-buff-panel {
  flex-shrink: 0;
  width: 300px;
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-right: 14px;
  border-right: 1px solid #3e200a;
}

.sf-buff-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
}

.sf-shelf-count {
  font-size: 18px;
  font-weight: 900;
  color: var(--rpg-gold);
  line-height: 1;
  font-variant-numeric: tabular-nums;
}
.sf-shelf-count-sub {
  font-size: 11px;
  font-weight: 700;
  color: #7a6848;
}

.sf-buff-search {
  width: 100%;
  padding: 6px 10px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.03em;
  color: var(--rpg-text);
  background: #111008;
  border: 1px solid #3e200a;
  border-radius: 4px;
  outline: none;
  transition: border-color 0.15s;
}
.sf-buff-search::placeholder {
  color: var(--rpg-text-dim);
  font-weight: 400;
}
.sf-buff-search:focus {
  border-color: #7a4e20;
}

.sf-buff-chips {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-wrap: wrap;
  align-content: flex-start;
  gap: 6px;
  overflow-y: auto;
  padding-right: 4px;
}

.sf-buff-empty {
  width: 100%;
  align-self: center;
  text-align: center;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: var(--rpg-text-dim);
}

.sf-chip-buff {
  display: flex;
  align-items: center;
  gap: 6px;
  height: fit-content;
  padding: 6px 10px;
  background: #1c1c18;
  border: 1px solid #3e200a;
  border-radius: 4px;
}
.sf-chip-buff-icon {
  color: #c89040;
  flex-shrink: 0;
}
.sf-chip-buff-lbl {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--rpg-text-muted);
}
.sf-chip-buff-val {
  font-size: 13px;
  font-weight: 900;
  font-variant-numeric: tabular-nums;
}
.sf-chip-buff-val.is-up {
  color: var(--rpg-gold);
}
.sf-chip-buff-val.is-down {
  color: #52b830;
}

/* Right: augment card shelf */
.sf-shelf-col {
  flex: 1;
  min-width: 0;
  height: 100%;
  display: flex;
}

.sf-shelf-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  text-align: center;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: var(--rpg-text-dim);
}
.sf-shelf-empty-icon {
  color: #5c4a30;
  flex-shrink: 0;
}

.sf-shelf {
  flex: 1;
  display: flex;
  align-items: stretch;
  gap: 9px;
  overflow-x: auto;
  padding-bottom: 4px;
  min-width: 0;
}

.sf-aug-card {
  flex-shrink: 0;
  width: 120px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: center;
  padding: 12px 10px;
  background: #1c1c18;
  border: 1px solid #3e200a;
  border-top: 3px solid var(--rarity);
  border-radius: 5px;
  box-shadow: inset 0 0 12px color-mix(in srgb, var(--rarity) 10%, transparent);
  transition: box-shadow 0.15s, background 0.15s;
}
.sf-aug-card:hover {
  background: #221f18;
  box-shadow:
    inset 0 0 12px color-mix(in srgb, var(--rarity) 16%, transparent),
    0 0 10px color-mix(in srgb, var(--rarity) 30%, transparent);
}

.sf-aug-icon {
  width: 56px;
  height: 56px;
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
  font-size: 24px;
  line-height: 1;
}

.sf-aug-name {
  font-size: 11px;
  font-weight: 700;
  color: var(--rarity);
  text-align: center;
  line-height: 1.05;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* The buff is the card's key info — biggest text, anchored to the bottom
   so the card's full height is used. */
.sf-aug-effect {
  margin-top: auto;
  font-size: 14px;
  font-weight: 900;
  color: var(--rpg-gold);
  text-align: center;
  line-height: 1.15;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
