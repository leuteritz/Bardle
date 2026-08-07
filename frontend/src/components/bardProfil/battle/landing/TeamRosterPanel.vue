<template>
  <!-- Hero #2 of the landing stage: the five champ-select style roster cards -->
  <div class="roster-panel" :style="rosterStyle">
    <div class="roster-head">
      <span class="roster-rule" />
      <span v-ink-center class="roster-title">YOUR TEAM</span>
      <span class="roster-rule" />
    </div>

    <div class="roster-cards">
      <div
        v-for="(role, idx) in roleRows"
        :key="role.key"
        class="champ-card"
        :class="[
          battleStore.headerSlots[idx] ? 'champ-card--filled' : 'champ-card--empty',
          { 'champ-card--mvp': battleStore.headerSlots[idx] === mvpHolder },
        ]"
        :style="cardStyle(role, !!battleStore.headerSlots[idx])"
        :role="battleStore.headerSlots[idx] ? 'button' : undefined"
        :tabindex="battleStore.headerSlots[idx] ? 0 : undefined"
        @click="onCardClick(idx)"
        @keydown.enter="onCardClick(idx)"
        @keydown.space.prevent="onCardClick(idx)"
        @mouseenter="onCardEnter(idx)"
        @mouseleave="onCardLeave()"
        @focus="onCardEnter(idx)"
        @blur="onCardLeave()"
      >
        <!-- Everything but the frame lives in here: the card clips its own
             content, which leaves the frame free to let its crown rise above
             the top edge. -->
        <div class="card-inner">
        <!-- Head row: role on the left, standout badges on the right. One flex
             line, so the two can never overlap however wide the badges get. -->
        <div class="card-head">
          <span
            class="card-role"
            :class="{ 'card-role--empty': !battleStore.headerSlots[idx] }"
          >
            {{ role.roleLabel }}
          </span>

          <div v-if="battleStore.headerSlots[idx]" class="card-badges">
            <span
              v-for="badge in badgesFor(battleStore.headerSlots[idx]!)"
              :key="badge.key"
              class="card-badge"
              :style="{ color: badge.color }"
              :title="badge.label"
            >
              <span class="card-badge-text">{{ badge.short }}</span>
              <Icon :icon="badge.icon" class="card-badge-icon" />
            </span>
          </div>
        </div>

        <template v-if="battleStore.headerSlots[idx]">
          <img
            :src="battleStore.getChampionImage(battleStore.headerSlots[idx]!)"
            :alt="battleStore.headerSlots[idx]!"
            class="card-art"
          />
          <div class="card-scrim" />
          <div class="card-tint" :style="{ background: tintFor(role.color) }" />
          <!-- role stripe: the card's colour signature along its bottom edge -->
          <span
            class="card-stripe"
            :style="{ background: `linear-gradient(to right, transparent, ${role.color}, transparent)` }"
          />

          <!-- Name + headline stats, bottom -->
          <div class="card-foot">
            <!-- Identity line: the level insignia leads, the name follows.
                 The plate carries the same escalation the team tab's medallion
                 does (rim, heat, glow per regalia stage) — just without the
                 ornaments, which would read as noise over splash art. -->
            <div v-if="levelBySlot[idx]" class="foot-id">
              <span
                class="lvl-badge"
                :class="{
                  'lvl-badge--max': levelBySlot[idx]!.capped,
                  'lvl-badge--attention': levelBySlot[idx]!.attention,
                }"
                :style="levelBySlot[idx]!.vars"
                :title="levelBySlot[idx]!.title"
                :aria-label="levelBySlot[idx]!.title"
              >
                <span v-if="levelBySlot[idx]!.attention" class="lvl-ping" aria-hidden="true" />
                <span class="lvl-plate" aria-hidden="true" />
                <span class="lvl-core" aria-hidden="true" />
                <span class="lvl-face">
                  <span class="lvl-tag">{{ levelBySlot[idx]!.capped ? 'MAX' : 'LV' }}</span>
                  <span v-ink-center class="lvl-num">{{ levelBySlot[idx]!.level }}</span>
                </span>
              </span>
              <span class="card-name">{{ battleStore.headerSlots[idx] }}</span>
            </div>
            <span v-else class="card-name">{{ battleStore.headerSlots[idx] }}</span>

            <!-- XP rail — the divider above the numbers IS the progress bar, so
                 the card gains a readout without giving up a line of height.
                 scaleX on its own layer: no per-frame layout, no repaint. -->
            <span
              v-if="levelBySlot[idx]"
              class="card-xp"
              :class="{ 'card-xp--max': levelBySlot[idx]!.capped }"
              aria-hidden="true"
            >
              <span
                class="card-xp-fill"
                :style="{ transform: `scaleX(${levelBySlot[idx]!.pct})` }"
              />
            </span>

            <div class="card-stats">
              <div class="card-stat">
                <span class="card-stat-value card-stat-value--kills">
                  {{ statFor(battleStore.headerSlots[idx]!).kills }}
                </span>
                <span class="card-stat-label">KILLS</span>
              </div>
              <div class="card-stat">
                <span class="card-stat-value">{{ statFor(battleStore.headerSlots[idx]!).kda }}</span>
                <span class="card-stat-label">KDA</span>
              </div>
              <div class="card-stat">
                <span class="card-stat-value card-stat-value--mvp">
                  {{ statFor(battleStore.headerSlots[idx]!).mvps }}
                </span>
                <span class="card-stat-label">MVP</span>
              </div>
            </div>
          </div>

          <!-- Hover stat sheet: the champion's headline career numbers -->
          <div class="card-detail">
            <div class="detail-head">
              <div class="detail-top">
                <span class="detail-name">{{ battleStore.headerSlots[idx] }}</span>
                <!-- the sheet hides the foot, so the level comes along -->
                <span v-if="levelBySlot[idx]" class="detail-lvl">
                  <span class="detail-lvl-num">{{ levelBySlot[idx]!.level }}</span>
                  <span class="detail-lvl-rank">{{ levelBySlot[idx]!.stageName }}</span>
                </span>
              </div>
              <span class="detail-cta">MANAGE ROLE →</span>
            </div>
            <div class="detail-grid">
              <div
                v-for="entry in detailFor(battleStore.headerSlots[idx]!)"
                :key="entry.label"
                class="detail-stat"
              >
                <span class="detail-value" :style="entry.color ? { color: entry.color } : undefined">
                  {{ entry.value }}
                </span>
                <span class="detail-label">{{ entry.label }}</span>
              </div>
            </div>
          </div>
        </template>

        <template v-else>
          <!-- Clicking an open slot jumps straight to the team tab with this
               role pre-selected, so the player can fill it right away. -->
          <button
            type="button"
            class="empty-body"
            :style="{ '--role-accent': role.color }"
            :title="`Assign a ${role.roleLabel} champion`"
            @click.stop="openRole(idx)"
          >
            <span class="empty-ring" />
            <span class="empty-mark">＋</span>
            <span class="empty-caption">
              <span class="empty-text">EMPTY SLOT</span>
              <span class="empty-cta">ASSIGN CHAMPION →</span>
            </span>
          </button>
        </template>
        </div>

        <!-- Rank frame on top of everything: the card's border is the player's
             ladder tier, so the whole roster levels up with the climb. -->
        <ChampionRankFrame :tier="rankTier" :lit="!!battleStore.headerSlots[idx]" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onUnmounted, type CSSProperties } from 'vue'
import { Icon } from '@iconify/vue'
import { useBattleStore } from '@/stores/battle/battleStore'
import { useUiStore } from '@/stores/core/uiStore'
import { useChampionLevelStore } from '@/stores/champions/championLevelStore'
import { regaliaStageFor } from '@/config/champions/championLevels'
import { facetClipPath } from '@/utils/orbit/geometry'
import {
  ROLES,
  ROSTER_CARD_MAX_BADGES,
  ROSTER_LEVEL_PLATE_FACETS,
  CHAMPION_REGALIA_BASE_SIZE,
  RANK_FRAME_STYLES,
  RANK_FRAME_EMPTY_GLOW_FACTOR,
  RANK_FRAME_HOVER_GLOW_FACTOR,
  RANK_FRAME_CONTENT_INSET,
  RANK_FRAME_CROWN_FOOT,
  RANK_FRAME_MAX_SCALE,
  RANK_TIER_COLORS,
} from '@/config/constants'
import { formatNumber } from '@/config/ui/numberFormat'
import ChampionRankFrame from './ChampionRankFrame.vue'

const uiStore = useUiStore()
const battleStore = useBattleStore()
const levelStore = useChampionLevelStore()

// ── Champion level ──
// Every filled card wears its champion's level the way the team tab does — the
// numeral on a faceted plate that grows richer with the regalia stage, plus the
// XP arc flattened into the rail above the headline numbers.
//
// The plate is authored against CHAMPION_REGALIA_BASE_SIZE and handed on as
// RATIOS, so it can ride the card's own clamp() instead of a fixed px size: on
// 4K the insignia grows with the card, on Full HD it stays inside it.
const LEVEL_PLATE_CLIP = facetClipPath(ROSTER_LEVEL_PLATE_FACETS)
/** Half a corner off the plate — the core reads as a second, turned facet. */
const LEVEL_CORE_CLIP = facetClipPath(ROSTER_LEVEL_PLATE_FACETS, 0.5)

interface RosterLevel {
  level: number
  /** 0…1 fill of the XP rail; 1 once the level cap is reached */
  pct: number
  capped: boolean
  /** banked XP or an unspent perk — the plate pings, never a second colour */
  attention: boolean
  stageName: string
  title: string
  vars: CSSProperties
}

function buildLevel(name: string): RosterLevel {
  const level = levelStore.levelOf(name)
  const xp = levelStore.xpBarOf(name)
  const stage = regaliaStageFor(level)
  const { stars, rank } = levelStore.ascensionOf(name)
  const ratio = (v: number) => String(Math.round((v / CHAMPION_REGALIA_BASE_SIZE) * 1000) / 1000)
  return {
    level,
    pct: xp.pct,
    capped: xp.capped,
    attention: levelStore.needsAttention(name),
    stageName: stage.name,
    title:
      `Level ${level} — ${stage.name}` +
      (stars > 0 ? ` · ${stars}★ ${rank.name}` : '') +
      (xp.capped ? ' · level cap' : ` · ${Math.round(xp.pct * 100)}% to next`),
    vars: {
      '--lv-clip': LEVEL_PLATE_CLIP,
      '--lv-core-clip': LEVEL_CORE_CLIP,
      '--lv-rim': ratio(stage.rim),
      '--lv-glow': ratio(stage.glow),
      '--lv-glow-a': `${Math.round(stage.glowAlpha * 100)}%`,
      // the rim runs hottest, the numeral a touch cooler so digits stay legible
      '--lv-heat': `${Math.round(stage.heat * 100)}%`,
      '--lv-heat-ink': `${Math.round(30 + stage.heat * 52)}%`,
      '--lv-core': `${Math.round(12 + stage.heat * 26)}%`,
    } as CSSProperties,
  }
}

/** One pass per slot instead of a getter call per template expression — every
 *  level getter is a Pinia function getter and hands back an uncached closure. */
const levelBySlot = computed<(RosterLevel | null)[]>(() =>
  battleStore.headerSlots.map((name) => (name ? buildLevel(name) : null)),
)

// ── Rank frame ──
// Every card wears the player's current ladder tier, so the whole roster grows
// more ornate with the climb. The tier drives the edge; the role keeps its
// stripe, its label and the wash over the art.
const rankTier = computed(() => battleStore.currentRank.tier)
const rankColor = computed(() => RANK_TIER_COLORS[rankTier.value] ?? '#8a9098')
const rankFrame = computed(() => RANK_FRAME_STYLES[rankTier.value] ?? RANK_FRAME_STYLES.Iron)

/**
 * Headroom above the cards, reserved once for the tallest crown in the game
 * rather than the one currently worn. Sizing it to the current tier would make
 * every promotion shrink the cards to pay for its bigger crown — this way the
 * crown grows into room that was always there and the cards never move.
 */
const CROWN_HEADROOM =
  Math.max(...Object.values(RANK_FRAME_STYLES).map((s) => s.crownH)) - RANK_FRAME_CROWN_FOOT

const rosterStyle = computed<CSSProperties>(() => ({
  '--crown-space': `calc(${CROWN_HEADROOM}px * var(--frame-scale, 1))`,
  '--crown-foot': `calc(${RANK_FRAME_CROWN_FOOT}px * var(--frame-scale, 1))`,
  // the rail under the crowns carries the tier's colour too
  '--rank-color': rankColor.value,
}))

/** Open slot clicked → team tab, this role pre-selected. Same navigation the
 *  command panel's role cards use, plus a marker so the team tab can offer a
 *  one-click way back to the battle tab. */
function openRole(slotIndex: number) {
  uiStore.requestRoleFillFromBattle(slotIndex)
}

/** Filled cards navigate the same way — empty ones do it through their own
 *  button, whose click is stopped before it reaches the card. */
function onCardClick(slotIndex: number) {
  if (!battleStore.headerSlots[slotIndex]) return
  openRole(slotIndex)
}

/** Pointing at a roster card also lights that role up in the command panel on
 *  the right, so both readouts of the same team stay linked across the screen.
 *  Same channel the command panel writes when it is hovered itself. */
function onCardEnter(slotIndex: number) {
  uiStore.setHoveredChampionSlotIndex(slotIndex)
}

function onCardLeave() {
  uiStore.setHoveredChampionSlotIndex(null)
}

// Switching or closing the tab is cleared centrally by the ui store, since the
// tabs are only hidden and never unmounted; this covers the panel itself going.
onUnmounted(() => uiStore.setHoveredChampionSlotIndex(null))

// Same order as battleStore.headerSlots: top, jungle, mid, adc, support
const roleRows = ROLES.map((r) => ({
  key: r.key,
  roleLabel: r.key.toUpperCase(),
  color: r.color,
}))

function hexToRgba(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`
}

/** The rank owns the card's edge and its glow; the role stays in the label, the
 *  bottom stripe and the wash over the art. Both glows ride in as custom
 *  properties so the hover and MVP rules can compose their own shadow stacks. */
function cardStyle(role: { color: string }, filled: boolean): CSSProperties {
  const { glow, glowAlpha, width } = rankFrame.value
  const alpha = filled ? glowAlpha : glowAlpha * RANK_FRAME_EMPTY_GLOW_FACTOR
  const rank = rankColor.value
  return {
    '--role-color': role.color,
    '--rank-color': rank,
    // content stays clear of the line and of the corner blades running along
    // it; scales with the frame, because those do too
    '--frame-inset': `calc(${width + RANK_FRAME_CONTENT_INSET}px * var(--frame-scale, 1))`,
    // the role stripe rides just inside the widest the edge can ever get
    '--stripe-lift': `${Math.round(width * RANK_FRAME_MAX_SCALE) + 1}px`,
    '--rank-glow': glow > 0 ? `0 0 ${glow}px ${hexToRgba(rank, alpha)}` : '0 0 0 transparent',
    '--rank-glow-hover':
      glow > 0
        ? `0 0 ${Math.round(glow * RANK_FRAME_HOVER_GLOW_FACTOR)}px ${hexToRgba(
            rank,
            Math.min(1, alpha * RANK_FRAME_HOVER_GLOW_FACTOR),
          )}`
        : '0 0 0 transparent',
    borderColor: hexToRgba(rank, filled ? 0.45 : 0.18),
  } as CSSProperties
}

function tintFor(color: string): string {
  return `linear-gradient(to top, ${hexToRgba(color, 0.32)}, transparent 62%)`
}

// Career kills merged with the running battle, same display-only pattern as
// the landing stat panels (career accumulates once the battle finalizes).
function liveKills(name: string): number {
  const champ = battleStore.team1.find((c) => c.name === name)
  return champ ? champ.kills : 0
}

function mergedKills(name: string): number {
  return (battleStore.championCareer[name]?.kills ?? 0) + liveKills(name)
}

function statFor(name: string): { kills: string; kda: string; mvps: string } {
  const career = battleStore.championCareer[name]
  const kills = mergedKills(name)
  if (!career && kills === 0) return { kills: '—', kda: '—', mvps: '—' }
  const deaths = career?.deaths ?? 0
  const assists = career?.assists ?? 0
  const kda =
    deaths === 0
      ? kills + assists > 0
        ? 'Perfect'
        : '—'
      : ((kills + assists) / deaths).toFixed(1)
  return {
    kills: formatNumber(kills),
    kda,
    mvps: formatNumber(career?.mvps ?? 0),
  }
}

interface DetailEntry {
  label: string
  value: string
  color?: string
}

/** Hover sheet: the six numbers that actually say something about a champion's
 *  career. Kept short on purpose so each one can be shown large. */
function detailFor(name: string): DetailEntry[] {
  const career = battleStore.championCareer[name]
  const kills = mergedKills(name)
  const stat = statFor(name)
  const fmt = (v: number | undefined) => (career || kills > 0 ? formatNumber(v ?? 0) : '—')
  return [
    { label: 'BATTLES', value: fmt(career?.battles) },
    { label: 'KDA', value: stat.kda, color: '#e8c040' },
    { label: 'KILLS', value: career || kills > 0 ? formatNumber(kills) : '—', color: '#6ee7b7' },
    { label: 'DEATHS', value: fmt(career?.deaths), color: '#fca5a5' },
    { label: 'ASSISTS', value: fmt(career?.assists), color: '#93c5fd' },
    { label: 'DAMAGE', value: fmt(career?.damage), color: '#f06820' },
  ]
}

// ── Standout badge engine ──
// Each category crowns the team leader (>0 required; ties: first slot).
// Loop order = display priority; one champion can hold several badges.
interface BadgeDef {
  key: string
  label: string
  /** one word on the card; the full label rides along as the tooltip */
  short: string
  icon: string
  color: string
  statOf: (name: string) => number
}

const BADGE_DEFS: BadgeDef[] = [
  {
    key: 'mvp',
    label: 'TEAM MVP',
    short: 'MVP',
    icon: 'game-icons:imperial-crown',
    color: '#e8c040',
    statOf: (n) => battleStore.championCareer[n]?.mvps ?? 0,
  },
  {
    key: 'kills',
    label: 'TOP KILLS',
    short: 'KILLS',
    icon: 'game-icons:bloody-sword',
    color: '#cc6050',
    statOf: (n) => mergedKills(n),
  },
  {
    key: 'damage',
    label: 'TOP DAMAGE',
    short: 'DAMAGE',
    icon: 'game-icons:fire-punch',
    color: '#f06820',
    statOf: (n) => battleStore.championCareer[n]?.damage ?? 0,
  },
  {
    key: 'gold',
    label: 'GOLD LEADER',
    short: 'GOLD',
    icon: 'game-icons:gold-stack',
    color: '#e8c040',
    statOf: (n) => battleStore.championCareer[n]?.gold ?? 0,
  },
  {
    key: 'cs',
    label: 'FARM LORD',
    short: 'FARM',
    icon: 'game-icons:sickle',
    color: '#52b830',
    statOf: (n) => battleStore.championCareer[n]?.cs ?? 0,
  },
  {
    key: 'healing',
    label: 'GUARDIAN',
    short: 'HEAL',
    icon: 'game-icons:health-normal',
    color: '#6ee7b7',
    statOf: (n) => battleStore.championCareer[n]?.healing ?? 0,
  },
  {
    key: 'tank',
    label: 'FRONTLINE',
    short: 'TANK',
    icon: 'game-icons:arrows-shield',
    color: '#5b8dd9',
    statOf: (n) => battleStore.championCareer[n]?.damageTaken ?? 0,
  },
  {
    key: 'wards',
    label: 'SENTINEL',
    short: 'VISION',
    icon: 'game-icons:surrounded-eye',
    color: '#93c5fd',
    statOf: (n) => battleStore.championCareer[n]?.wardsPlaced ?? 0,
  },
]

const badgesByChampion = computed<Record<string, BadgeDef[]>>(() => {
  const result: Record<string, BadgeDef[]> = {}
  for (const def of BADGE_DEFS) {
    let bestName: string | null = null
    let best = 0
    for (const name of battleStore.headerSlots) {
      if (!name) continue
      const value = def.statOf(name)
      if (value > best) {
        best = value
        bestName = name
      }
    }
    if (bestName) (result[bestName] ??= []).push(def)
  }
  return result
})

/** BADGE_DEFS order doubles as priority — with a word next to every icon only
 *  the first few fit the card, so the rest is cut here rather than wrapped. */
function badgesFor(name: string): BadgeDef[] {
  return (badgesByChampion.value[name] ?? []).slice(0, ROSTER_CARD_MAX_BADGES)
}

const mvpHolder = computed<string | null>(() => {
  for (const [name, defs] of Object.entries(badgesByChampion.value)) {
    if (defs.some((d) => d.key === 'mvp')) return name
  }
  return null
})
</script>

<style scoped>
.roster-panel {
  /* one dial for line, blades and crown alike, so the whole border grows with
     the viewport — the frame component reads it via var(--frame-scale) */
  --frame-scale: 1;
  display: flex;
  flex-direction: column;
  /* tight: the crown rail below carries the separation, not this gap */
  gap: clamp(2px, 0.4cqh, 6px);
  min-height: 0;
}

/* ── Head: centered title between two hairlines ── */
.roster-head {
  display: flex;
  align-items: center;
  gap: clamp(8px, 1vw, 16px);
  flex-shrink: 0;
}

.roster-rule {
  flex: 1;
  height: 1px;
  background: linear-gradient(to right, transparent, #3a2c14);
}
.roster-rule:last-child {
  background: linear-gradient(to left, transparent, #3a2c14);
}

.roster-title {
  font-size: clamp(17px, 2.4cqh, 30px);
  font-weight: 700;
  letter-spacing: 8px;
  line-height: 1;
  /* the trailing letter-spacing would push the word off-centre */
  padding-left: 8px;
  color: #e8c040;
  text-shadow: 0 0 20px rgba(232, 192, 64, 0.28);
}

/* ── Card row: five equal champ-select tiles ── */
/* minmax(0, 1fr) pins the single row to the container height — without it the
   cards' intrinsic height wins and they spill out over the start button.
   min-height 0 for the same reason: the roster's own height is the budget, and
   a floor here would push the cards straight back over the start button. */
.roster-cards {
  position: relative;
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  grid-template-rows: minmax(0, 1fr);
  gap: clamp(8px, 0.9vw, 16px);
  /* headroom for the crowns, which stand above their cards */
  padding-top: var(--crown-space, 0px);
}

/* ── Crown rail ──
   A rank-coloured band running the full width just above the cards. The crowns
   stand on it and rise through it, which turns the headroom above the roster
   into a deliberate zone instead of an empty gap. Drawn before the cards, so
   every crown passes in front of it. */
.roster-cards::before {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  top: calc(var(--crown-space, 0px) - clamp(5px, 0.7cqh, 9px));
  height: 2px;
  background: linear-gradient(
    to right,
    transparent,
    color-mix(in srgb, var(--rank-color, #5c3310) 28%, #2a2114) 9%,
    color-mix(in srgb, var(--rank-color, #5c3310) 58%, #2a2114) 50%,
    color-mix(in srgb, var(--rank-color, #5c3310) 28%, #2a2114) 91%,
    transparent
  );
  box-shadow: 0 0 10px color-mix(in srgb, var(--rank-color, #5c3310) 22%, transparent);
  pointer-events: none;
}

.champ-card {
  position: relative;
  /* visible so the frame's crown can rise past the top edge — the content
     below does its own clipping in .card-inner */
  overflow: visible;
  min-height: 0;
  background: #0d0b06;
  border: 1px solid;
  border-radius: 5px;
  /* the second shadow is the rank's own halo — see cardStyle() */
  box-shadow:
    0 6px 20px rgba(0, 0, 0, 0.55),
    var(--rank-glow, 0 0 0 transparent);
  transition:
    transform 0.22s ease,
    box-shadow 0.22s ease,
    border-color 0.22s ease;
}
/* Clips the art, the scrim and the sheets to the card's rounded box */
.card-inner {
  position: absolute;
  inset: 0;
  overflow: hidden;
  border-radius: 5px;
}

/* Filled cards navigate to their role in the team tab, so they read as buttons */
.champ-card--filled {
  cursor: pointer;
}
.champ-card--filled:focus-visible {
  outline: 2px solid #d4a020;
  outline-offset: 2px;
}
.champ-card--filled:hover {
  transform: translateY(-4px);
  box-shadow:
    0 12px 30px rgba(0, 0, 0, 0.7),
    var(--rank-glow-hover, 0 0 20px rgba(212, 160, 32, 0.28));
}
/* The team MVP keeps a warm inner shimmer on top of the rank halo */
.champ-card--mvp {
  box-shadow:
    inset 0 0 22px rgba(212, 160, 32, 0.16),
    0 6px 20px rgba(0, 0, 0, 0.55),
    var(--rank-glow, 0 0 14px rgba(212, 160, 32, 0.3));
}
.champ-card--mvp.champ-card--filled:hover {
  box-shadow:
    inset 0 0 26px rgba(212, 160, 32, 0.2),
    0 12px 30px rgba(0, 0, 0, 0.7),
    var(--rank-glow-hover, 0 0 20px rgba(212, 160, 32, 0.28));
}
.champ-card--empty {
  background: #0b0904;
  border-style: dashed;
}
.champ-card--empty:hover {
  border-style: solid;
  transform: translateY(-3px);
}
/* An empty slot lights its frame up to the filled cards' level on hover */
.champ-card--empty:hover :deep(.rank-frame--dim) {
  opacity: 0.7;
}

/* ── Role stripe: colour signature along the card's bottom edge ──
   Lifted just inside the rank frame, so a Challenger edge cannot swallow it. */
.card-stripe {
  position: absolute;
  left: var(--stripe-lift, 0px);
  right: var(--stripe-lift, 0px);
  bottom: var(--stripe-lift, 0px);
  z-index: 3;
  height: 2px;
  opacity: 0.75;
  transition:
    height 0.22s ease,
    opacity 0.22s ease;
}
.champ-card--filled:hover .card-stripe {
  height: 3px;
  opacity: 1;
}

/* ── Splash art fills the whole card, darkened toward the bottom ── */
.card-art {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center 22%;
  transition:
    transform 0.5s ease,
    filter 0.25s ease;
}
.champ-card--filled:hover .card-art {
  transform: scale(1.06);
}

.card-scrim {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    to top,
    rgba(6, 5, 3, 0.96) 0%,
    rgba(6, 5, 3, 0.7) 34%,
    rgba(6, 5, 3, 0.12) 62%,
    rgba(6, 5, 3, 0.42) 100%
  );
}

.card-tint {
  position: absolute;
  inset: 0;
  mix-blend-mode: screen;
  opacity: 0.55;
}

/* ── Head row ──
   Crest + role on the left, badges on the right, one flex line across the top
   of the card. Absolute so it floats over the art, but internally laid out —
   the two sides push each other apart instead of stacking up. */
.card-head {
  position: absolute;
  /* starts below the crown's foot, which overlaps the top edge */
  top: calc(var(--crown-foot, 0px) + clamp(4px, 0.6cqh, 9px));
  left: calc(var(--frame-inset, 2px) + clamp(6px, 0.55vw, 11px));
  right: calc(var(--frame-inset, 2px) + clamp(6px, 0.55vw, 11px));
  z-index: 2;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: clamp(5px, 0.5vw, 10px);
  /* click-through; the badges below re-enable it for their tooltips */
  pointer-events: none;
}

/* ── Role label: bare type, no frame, no plate — same treatment as the command
   panel's role caption so both readouts speak one language ── */
.card-role {
  display: flex;
  align-items: center;
  gap: clamp(3px, 0.3vw, 6px);
  flex-shrink: 0;
  font-size: clamp(12px, 1.5cqh, 17px);
  font-weight: 800;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  line-height: 1;
  color: color-mix(in srgb, var(--role-color, #c89040) 55%, #f0e6d0);
  text-shadow:
    0 1px 3px rgba(0, 0, 0, 0.95),
    0 0 12px color-mix(in srgb, var(--role-color, #c89040) 45%, transparent);
  pointer-events: none;
}

.card-role--empty {
  color: color-mix(in srgb, var(--role-color, #c89040) 40%, rgba(200, 180, 140, 0.55));
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.95);
}
.champ-card--filled:hover .card-role {
  color: color-mix(in srgb, var(--role-color, #c89040) 40%, #fff);
  text-shadow:
    0 1px 3px rgba(0, 0, 0, 0.95),
    0 0 16px color-mix(in srgb, var(--role-color, #c89040) 70%, transparent);
}

/* ── Standout badges: stacked down the right edge, each naming its award.
   Frameless like the role label — the drop shadow carries them over the art. ── */
.card-badges {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: clamp(3px, 0.5cqh, 7px);
  /* yields to the role side when the card gets narrow — the badge text ellipses */
  min-width: 0;
  max-width: 62%;
  pointer-events: none;
}

.card-badge {
  display: flex;
  align-items: center;
  gap: 5px;
  min-width: 0;
  padding: 2px 6px;
  /* just enough plate to lift the word off a bright splash, no frame */
  background: rgba(8, 6, 4, 0.5);
  border-radius: 4px;
  /* the container is click-through; the badges themselves keep their tooltip */
  pointer-events: auto;
}

.card-badge-text {
  font-size: clamp(9px, 1.2cqh, 13px);
  font-weight: 800;
  letter-spacing: 0.12em;
  line-height: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-shadow:
    0 1px 3px rgba(0, 0, 0, 0.95),
    0 0 10px rgba(0, 0, 0, 0.9);
}

.card-badge-icon {
  width: clamp(17px, 2.3cqh, 26px);
  height: clamp(17px, 2.3cqh, 26px);
  flex-shrink: 0;
  filter:
    drop-shadow(0 1px 3px rgba(0, 0, 0, 0.95)) drop-shadow(0 0 8px currentColor);
}

/* ── Foot: champion name + headline career stats ── */
.card-foot {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 2;
  display: flex;
  flex-direction: column;
  gap: clamp(4px, 0.7cqh, 8px);
  /* clears the frame on both axes: the stripe below, the corner gems aside */
  padding: clamp(7px, 1cqh, 12px) calc(var(--frame-inset, 2px) + clamp(6px, 0.5vw, 11px))
    calc(var(--stripe-lift, 0px) + clamp(6px, 0.9cqh, 11px));
  transition: opacity 0.22s ease;
}

/* Identity line: insignia + name share one row, the name takes what is left */
.foot-id {
  display: flex;
  align-items: center;
  gap: clamp(6px, 0.6vw, 12px);
  min-width: 0;
}

.card-name {
  flex: 1;
  min-width: 0;
  font-size: clamp(17px, 2.5cqh, 30px);
  color: #fff;
  line-height: 1.05;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.95);
}

/* ── Level insignia ──
   A faceted plate carrying the champion's level, drawn entirely in the role
   colour: rank is told through metal, heat and glow, never through a second
   hue — the same language the team tab's medallion speaks. Ornaments (crown,
   rays, orbit spark) are deliberately left out: over splash art at this size
   they read as noise, and five cards would pay for them at once.

   Everything static — the only animated layer is the attention ping, and it
   moves on transform/opacity alone. */
.lvl-badge {
  --lv-size: clamp(38px, 6.2cqh, 68px);
  position: relative;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  width: var(--lv-size);
  height: var(--lv-size);
  line-height: 1;
}

/* the plate itself: cut metal in the role colour, brightening with the stage */
.lvl-plate {
  position: absolute;
  inset: 0;
  clip-path: var(--lv-clip);
  background: linear-gradient(
    155deg,
    color-mix(in srgb, #fff var(--lv-heat, 0%), var(--role-color, #c89040)),
    color-mix(in srgb, var(--role-color, #c89040) 62%, #0a0704) 62%,
    color-mix(in srgb, var(--role-color, #c89040) 38%, #0a0704)
  );
  filter: drop-shadow(
    0 0 calc(var(--lv-size) * var(--lv-glow, 0.18))
      color-mix(in srgb, var(--role-color, #c89040) var(--lv-glow-a, 20%), transparent)
  );
}

/* the dark core, turned half a corner against the plate — two hexagons make a
   twelve-point star, so the higher stages read richer without a new layer */
.lvl-core {
  position: absolute;
  inset: calc(var(--lv-size) * var(--lv-rim, 0.05));
  clip-path: var(--lv-core-clip);
  background: radial-gradient(
    circle at 50% 30%,
    color-mix(in srgb, var(--role-color, #c89040) var(--lv-core, 16%), #12100a),
    #080603 78%
  );
}

.lvl-face {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.lvl-tag {
  font-size: clamp(8px, 1.05cqh, 13px);
  font-weight: 700;
  letter-spacing: 0.14em;
  line-height: 1;
  color: color-mix(in srgb, var(--role-color, #c89040) 72%, #d8cdb6);
}

.lvl-num {
  font-size: clamp(18px, 2.9cqh, 33px);
  font-weight: 800;
  line-height: 0.85;
  font-variant-numeric: tabular-nums;
  color: color-mix(in srgb, #fff var(--lv-heat-ink, 30%), var(--role-color, #c89040));
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.92);
}

/* Level cap: the one place a second colour is earned — it is an end state, not
   a rank on the same ladder. */
.lvl-badge--max .lvl-tag {
  color: #e8c040;
}
.lvl-badge--max .lvl-num {
  color: #fff;
}

/* Banked XP or an unspent perk: one hexagon expanding out of the plate */
.lvl-ping {
  position: absolute;
  inset: 0;
  clip-path: var(--lv-clip);
  background: var(--role-color, #c89040);
  animation: lvl-ping 2s ease-out infinite;
  pointer-events: none;
}
.lvl-badge--attention .lvl-num {
  color: color-mix(in srgb, #fff 70%, var(--role-color, #c89040));
}

@keyframes lvl-ping {
  0% {
    transform: scale(1);
    opacity: 0.55;
  }
  100% {
    transform: scale(1.55);
    opacity: 0;
  }
}

/* ── XP rail ──
   The hairline that used to separate name and numbers now carries the progress
   toward the next level, so the readout costs no height at all. */
.card-xp {
  position: relative;
  display: block;
  overflow: hidden;
  height: clamp(4px, 0.55cqh, 7px);
  border-radius: 3px;
  /* strong enough that an empty rail still reads as the divider it replaced */
  background: color-mix(in srgb, var(--role-color, #d4a020) 26%, rgba(0, 0, 0, 0.62));
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.55);
}

.card-xp-fill {
  position: absolute;
  inset: 0;
  transform-origin: left center;
  border-radius: 3px;
  background: linear-gradient(
    to right,
    color-mix(in srgb, var(--role-color, #d4a020) 55%, #0a0704),
    color-mix(in srgb, #fff 30%, var(--role-color, #d4a020))
  );
  box-shadow: 0 0 8px color-mix(in srgb, var(--role-color, #d4a020) 45%, transparent);
  transition: transform 0.35s ease;
}

/* Capped: the rail turns to the gold every finished thing wears in Bardle */
.card-xp--max .card-xp-fill {
  background: linear-gradient(to right, #8a6410, #e8c040 55%, #f4d868);
  box-shadow: 0 0 10px rgba(232, 192, 64, 0.45);
}

/* The three headline numbers — the card's whole resting story */
.card-stats {
  display: flex;
  justify-content: space-between;
  gap: 4px;
  padding-top: clamp(5px, 0.8cqh, 9px);
}

.card-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 0;
}

.card-stat-value {
  font-size: clamp(16px, 2.2cqh, 26px);
  font-weight: 700;
  color: #e8e2d0;
  line-height: 1.05;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.95);
}
.card-stat-value--kills {
  color: #6ee7b7;
}
.card-stat-value--mvp {
  color: #e8c040;
}

.card-stat-label {
  margin-top: 1px;
  font-size: clamp(7px, 0.95cqh, 10px);
  font-weight: 700;
  letter-spacing: 1.5px;
  color: rgba(232, 226, 208, 0.5);
}

/* ── Hover stat sheet ── */
.card-detail {
  position: absolute;
  inset: 0;
  z-index: 3;
  display: flex;
  flex-direction: column;
  gap: clamp(4px, 0.7cqh, 8px);
  /* same top offset as the head row: the corner blades sit above the sheet */
  padding: calc(var(--crown-foot, 0px) + clamp(5px, 0.7cqh, 10px))
    calc(var(--frame-inset, 2px) + clamp(7px, 0.55vw, 12px)) clamp(8px, 1.1cqh, 13px);
  background: rgba(8, 6, 4, 0.93);
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.22s ease;
}
.champ-card--filled:hover .card-detail {
  opacity: 1;
}
.champ-card--filled:hover .card-foot {
  opacity: 0;
}

.detail-head {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding-bottom: clamp(4px, 0.7cqh, 8px);
  border-bottom: 1px solid color-mix(in srgb, var(--role-color, #d4a020) 32%, transparent);
  flex-shrink: 0;
}
/* Name left, level right — one line, so a long name can never push the level
   out of the sheet; it ellipses instead. */
.detail-top {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: clamp(6px, 0.6vw, 12px);
  min-width: 0;
}

.detail-lvl {
  display: flex;
  align-items: baseline;
  gap: 5px;
  flex-shrink: 0;
}
.detail-lvl-num {
  font-size: clamp(15px, 2.1cqh, 24px);
  font-weight: 800;
  line-height: 1;
  font-variant-numeric: tabular-nums;
  color: color-mix(in srgb, #fff 30%, var(--role-color, #c89040));
}
.detail-lvl-rank {
  font-size: clamp(7px, 0.95cqh, 10px);
  font-weight: 700;
  letter-spacing: 1.2px;
  text-transform: uppercase;
  color: rgba(232, 226, 208, 0.5);
  white-space: nowrap;
}

.detail-name {
  flex: 1;
  min-width: 0;
  font-size: clamp(15px, 2.1cqh, 24px);
  font-weight: 700;
  line-height: 1.05;
  color: #fff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Tells the player the card is a door into the team tab */
.detail-cta {
  font-size: clamp(7px, 0.95cqh, 10px);
  font-weight: 700;
  letter-spacing: 1.5px;
  color: color-mix(in srgb, var(--role-color, #d4a020) 70%, #f0e6d0);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Six numbers in two columns — each one large enough to read from a distance */
.detail-grid {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: 1fr 1fr;
  align-content: space-evenly;
  gap: clamp(4px, 0.8cqh, 12px) clamp(6px, 0.6vw, 14px);
}

.detail-stat {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.detail-value {
  font-size: clamp(16px, 2.2cqh, 28px);
  font-weight: 700;
  color: #e8e2d0;
  line-height: 1.05;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.detail-label {
  font-size: clamp(7px, 0.95cqh, 10px);
  font-weight: 700;
  letter-spacing: 1.5px;
  color: rgba(232, 226, 208, 0.45);
  white-space: nowrap;
}

/* ── Empty slot: a call to action, not a hole ──
   Ring and cross share one anchor point, so the cross always sits dead centre
   in the circle no matter what the caption below it does. */
.empty-body {
  --empty-anchor: 44%;
  --empty-ring: clamp(46px, 6.6cqh, 78px);
  position: absolute;
  inset: 0;
  z-index: 2;
  padding: 0;
  font-family: inherit;
  background: none;
  border: 0;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.25s ease;
}
.empty-body:hover,
.empty-body:focus-visible {
  background: radial-gradient(
    circle at 50% var(--empty-anchor),
    color-mix(in srgb, var(--role-accent) 14%, transparent),
    transparent 68%
  );
  outline: none;
}

/* Idle: a slow breathing ring hints the slot wants filling.
   Hover: it simply turns solid and takes the role colour. */
.empty-ring {
  position: absolute;
  top: var(--empty-anchor);
  left: 50%;
  width: var(--empty-ring);
  height: var(--empty-ring);
  transform: translate(-50%, -50%);
  border: 2px dashed color-mix(in srgb, var(--role-accent) 35%, transparent);
  border-radius: 50%;
  animation: empty-breathe 3.6s ease-in-out infinite;
  transition:
    border-color 0.25s ease,
    box-shadow 0.25s ease;
  pointer-events: none;
}
.empty-body:hover .empty-ring,
.empty-body:focus-visible .empty-ring {
  border-style: solid;
  border-color: var(--role-accent);
  box-shadow: 0 0 18px color-mix(in srgb, var(--role-accent) 40%, transparent);
  animation: none;
}

/* Same anchor as the ring — optically centred via the line-box correction */
.empty-mark {
  position: absolute;
  top: var(--empty-anchor);
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: clamp(26px, 4cqh, 44px);
  line-height: 1;
  color: color-mix(in srgb, var(--role-accent) 55%, transparent);
  transition: color 0.25s ease;
  pointer-events: none;
}
.empty-body:hover .empty-mark,
.empty-body:focus-visible .empty-mark {
  color: var(--role-accent);
}

/* Caption sits below the circle; the two lines share one box and cross-fade in
   place, so nothing jumps around on hover. */
.empty-caption {
  position: absolute;
  left: 0;
  right: 0;
  bottom: clamp(12px, 2cqh, 22px);
  display: grid;
  place-items: center;
  pointer-events: none;
}

.empty-text,
.empty-cta {
  grid-area: 1 / 1;
  font-size: clamp(8px, 1.05cqh, 11px);
  font-weight: 700;
  letter-spacing: 2.5px;
  white-space: nowrap;
  transition: opacity 0.2s ease;
}
.empty-text {
  color: #6a5528;
}
.empty-cta {
  color: var(--role-accent);
  opacity: 0;
}
.empty-body:hover .empty-text,
.empty-body:focus-visible .empty-text {
  opacity: 0;
}
.empty-body:hover .empty-cta,
.empty-body:focus-visible .empty-cta {
  opacity: 1;
}

@keyframes empty-breathe {
  0%,
  100% {
    opacity: 0.5;
  }
  50% {
    opacity: 1;
  }
}

/* All height breakpoints below query the stage container (see .landing-root in
   BattleLandingScreen.vue), not the window: the battle tab only ever gets about
   70% of the window's height, so window-based thresholds fired at the wrong
   moment on every laptop. */

/* Tall desktops (2K/4K): frame and crest grow with the cards so neither reads
   thin from a distance; flat stages pull them back off the content. */
@container landing (min-height: 890px) {
  .roster-panel {
    --frame-scale: 1.25;
  }
}
@container landing (max-height: 630px) {
  .roster-panel {
    --frame-scale: 0.85;
  }
}

/* Flat stages: six large numbers still have to fit a shorter card */
@container landing (max-height: 780px) {
  .detail-value {
    font-size: 19px;
  }
  .card-detail {
    /* keeps both frame insets — the corner blades sit above the sheet */
    padding: calc(var(--crown-foot, 0px) + 6px) calc(var(--frame-inset, 2px) + 10px) 8px;
  }
}

/* Last resort, flatter than any desktop we target: the three headline numbers
   drop their captions rather than the card losing its splash art. */
@container landing (max-height: 480px) {
  .card-stat-label {
    display: none;
  }
  /* the insignia gives up its caption before the numeral gets small */
  .lvl-badge {
    --lv-size: 28px;
  }
  .lvl-tag {
    display: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .champ-card,
  .card-art {
    transition: opacity 0.22s ease;
  }
  .champ-card--filled:hover,
  .champ-card--empty:hover {
    transform: none;
  }
  .champ-card--filled:hover .card-art {
    transform: none;
  }
  .empty-ring,
  .lvl-ping {
    animation: none;
  }
  .card-xp-fill {
    transition: none;
  }
}
</style>
