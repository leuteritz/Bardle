<template>
  <div class="roster-panel">
    <div class="roster-head">
      <span class="roster-title">YOUR TEAM</span>
      <span v-if="isBattleLive" class="ready-badge ready-badge--full">LIVE</span>
      <span
        v-else
        class="ready-badge"
        :class="hasFullTeam ? 'ready-badge--full' : 'ready-badge--open'"
      >
        {{ teamProgress }} / 5 {{ hasFullTeam ? 'READY' : 'OPEN' }}
      </span>
    </div>

    <div class="roster-rows">
      <div
        v-for="(role, idx) in roleRows"
        :key="role.key"
        class="roster-row"
        :class="[
          battleStore.headerSlots[idx] ? 'roster-row--filled' : 'roster-row--empty',
          { 'roster-row--mvp': battleStore.headerSlots[idx] === mvpHolder },
        ]"
        :style="rowStyle(role, !!battleStore.headerSlots[idx])"
      >
        <template v-if="battleStore.headerSlots[idx]">
          <!-- Standout badges: uniform labeled ribbons, stacked (max 4 per column).
               Always rendered so the center block aligns across all rows. -->
          <div class="row-badges">
            <div
              v-for="badge in badgesFor(battleStore.headerSlots[idx]!)"
              :key="badge.key"
              class="row-ribbon"
              :style="{
                background: `linear-gradient(90deg, ${hexToRgba(badge.color, 0.38)}, rgba(10, 8, 4, 0.85))`,
              }"
              :title="badge.label"
            >
              <Icon
                :icon="badge.icon"
                width="24"
                height="24"
                class="ribbon-icon"
                :style="{ color: badge.color }"
              />
              <span>{{ badge.label }}</span>
            </div>
          </div>

          <div class="row-center">
            <div class="row-name-line">
              <span class="row-champ-name">{{ battleStore.headerSlots[idx] }}</span>
              <span class="row-role-label" :style="{ color: role.color }">{{ role.roleLabel }}</span>
            </div>
            <div class="row-stats">
              <div class="row-stat">
                <span class="row-stat-value row-stat-value--kills">
                  {{ statFor(battleStore.headerSlots[idx]!).kills }}
                </span>
                <span class="row-stat-label">KILLS</span>
              </div>
              <div class="row-stat">
                <span class="row-stat-value">{{ statFor(battleStore.headerSlots[idx]!).kda }}</span>
                <span class="row-stat-label">KDA</span>
              </div>
              <div class="row-stat">
                <span class="row-stat-value row-stat-value--mvp">
                  {{ statFor(battleStore.headerSlots[idx]!).mvps }}
                </span>
                <span class="row-stat-label">MVP</span>
              </div>
            </div>
          </div>

          <img
            :src="battleStore.getChampionImage(battleStore.headerSlots[idx]!)"
            :alt="battleStore.headerSlots[idx]!"
            class="row-champ-img"
          />

          <!-- Hover stat sheet: full career breakdown for this champion -->
          <div class="row-detail">
            <div class="detail-head">
              <span class="detail-name">{{ battleStore.headerSlots[idx] }}</span>
              <span class="detail-role" :style="{ color: role.color }">{{ role.roleLabel }}</span>
            </div>
            <div class="detail-grid">
              <div
                v-for="entry in detailFor(battleStore.headerSlots[idx]!)"
                :key="entry.label"
                class="detail-stat"
              >
                <span
                  class="detail-value"
                  :style="entry.color ? { color: entry.color } : undefined"
                >
                  {{ entry.value }}
                </span>
                <span class="detail-label">{{ entry.label }}</span>
              </div>
            </div>
          </div>
        </template>
        <template v-else>
          <div class="row-badges" />
          <div class="row-center">
            <div class="row-name-line">
              <span class="row-champ-name row-champ-name--empty">Empty slot</span>
              <span class="row-role-label" :style="{ color: hexToRgba(role.color, 0.55) }">
                {{ role.roleLabel }}
              </span>
            </div>
          </div>
          <div class="row-empty-slot" :style="{ borderColor: hexToRgba(role.color, 0.45) }" />
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, type CSSProperties } from 'vue'
import { Icon } from '@iconify/vue'
import { useBattleStore } from '@/stores/battleStore'
import { ROLES } from '@/config/constants'
import { formatNumber } from '@/config/numberFormat'

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

function rowStyle(role: { color: string }, filled: boolean): CSSProperties {
  if (!filled) return { borderLeft: `3px solid ${hexToRgba(role.color, 0.3)}` }
  return {
    borderLeft: `3px solid ${role.color}`,
    // Role tint sits behind the portrait on the right edge
    background: `linear-gradient(90deg, rgba(0, 0, 0, 0.25), ${hexToRgba(role.color, 0.12)})`,
  }
}

const battleStore = useBattleStore()
const teamProgress = computed(() => battleStore.headerSlots.filter((s) => s !== null).length)
const hasFullTeam = computed(() => teamProgress.value >= 5)
const isBattleLive = computed(() => battleStore.isAutoBattleInitialized)

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

// Full career breakdown for the hover stat sheet (all tracked fields)
function detailFor(name: string): DetailEntry[] {
  const career = battleStore.championCareer[name]
  const kills = mergedKills(name)
  const stat = statFor(name)
  const fmt = (v: number | undefined) => (career || kills > 0 ? formatNumber(v ?? 0) : '—')
  return [
    { label: 'BATTLES', value: fmt(career?.battles) },
    { label: 'KILLS', value: career || kills > 0 ? formatNumber(kills) : '—', color: '#6ee7b7' },
    { label: 'DEATHS', value: fmt(career?.deaths), color: '#fca5a5' },
    { label: 'ASSISTS', value: fmt(career?.assists), color: '#93c5fd' },
    { label: 'KDA', value: stat.kda, color: '#e8c040' },
    { label: 'MVPS', value: fmt(career?.mvps), color: '#e8c040' },
    { label: 'DAMAGE', value: fmt(career?.damage), color: '#f06820' },
    { label: 'GOLD', value: fmt(career?.gold), color: '#e8c040' },
    { label: 'CS', value: fmt(career?.cs), color: '#52b830' },
    { label: 'HEALING', value: fmt(career?.healing), color: '#6ee7b7' },
    { label: 'DMG TAKEN', value: fmt(career?.damageTaken), color: '#5b8dd9' },
    { label: 'WARDS', value: fmt(career?.wardsPlaced), color: '#93c5fd' },
  ]
}

// ── Standout badge engine ──
// Each category crowns the team leader (>0 required; ties: first slot).
// Loop order = display priority; one champion can hold several badges.
interface BadgeDef {
  key: string
  label: string
  icon: string
  color: string
  statOf: (name: string) => number
}

const BADGE_DEFS: BadgeDef[] = [
  {
    key: 'mvp',
    label: 'TEAM MVP',
    icon: 'game-icons:imperial-crown',
    color: '#e8c040',
    statOf: (n) => battleStore.championCareer[n]?.mvps ?? 0,
  },
  {
    key: 'kills',
    label: 'TOP KILLS',
    icon: 'game-icons:bloody-sword',
    color: '#cc6050',
    statOf: (n) => mergedKills(n),
  },
  {
    key: 'damage',
    label: 'TOP DAMAGE',
    icon: 'game-icons:fire-punch',
    color: '#f06820',
    statOf: (n) => battleStore.championCareer[n]?.damage ?? 0,
  },
  {
    key: 'gold',
    label: 'GOLD LEADER',
    icon: 'game-icons:gold-stack',
    color: '#e8c040',
    statOf: (n) => battleStore.championCareer[n]?.gold ?? 0,
  },
  {
    key: 'cs',
    label: 'FARM LORD',
    icon: 'game-icons:sickle',
    color: '#52b830',
    statOf: (n) => battleStore.championCareer[n]?.cs ?? 0,
  },
  {
    key: 'healing',
    label: 'GUARDIAN',
    icon: 'game-icons:health-normal',
    color: '#6ee7b7',
    statOf: (n) => battleStore.championCareer[n]?.healing ?? 0,
  },
  {
    key: 'tank',
    label: 'FRONTLINE',
    icon: 'game-icons:arrows-shield',
    color: '#5b8dd9',
    statOf: (n) => battleStore.championCareer[n]?.damageTaken ?? 0,
  },
  {
    key: 'wards',
    label: 'SENTINEL',
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

function badgesFor(name: string): BadgeDef[] {
  return badgesByChampion.value[name] ?? []
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
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 0;
  background: rgba(0, 0, 0, 0.35);
  border: 1px solid rgba(212, 160, 32, 0.12);
  border-radius: 5px;
  padding: 14px 16px;
}

.roster-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
}

.roster-title {
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 2px;
  color: #d4a020;
}

.ready-badge {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 1px;
  padding: 2px 9px;
  border-radius: 4px;
}
.ready-badge--full {
  color: #52b830;
  border: 1px solid rgba(74, 138, 40, 0.5);
  background: rgba(74, 138, 40, 0.12);
}
.ready-badge--open {
  color: #cc6050;
  border: 1px solid rgba(204, 96, 80, 0.4);
  background: rgba(204, 96, 80, 0.1);
}

.roster-rows {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 0;
}

.roster-row {
  flex: 1;
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0;
  border-radius: 5px;
  min-height: 72px;
  transition:
    transform 0.25s ease,
    box-shadow 0.25s ease;
}
.roster-row--filled:hover {
  transform: translateY(-2px);
  box-shadow:
    inset 0 0 20px rgba(212, 160, 32, 0.1),
    0 4px 16px rgba(0, 0, 0, 0.55),
    0 0 14px rgba(212, 160, 32, 0.3);
}

/* Default content fades out while the stat sheet fades in */
.row-badges,
.row-center,
.row-champ-img {
  transition: opacity 0.25s ease;
}
.roster-row--filled:hover .row-badges,
.roster-row--filled:hover .row-center,
.roster-row--filled:hover .row-champ-img {
  opacity: 0.06;
}

/* ── Hover stat sheet ── */
.row-detail {
  position: absolute;
  inset: 0;
  z-index: 3;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 5px;
  padding: 6px 14px;
  opacity: 0;
  transform: translateY(6px);
  pointer-events: none;
  transition:
    opacity 0.25s ease,
    transform 0.25s ease;
}
.roster-row--filled:hover .row-detail {
  opacity: 1;
  transform: translateY(0);
}

.detail-head {
  display: flex;
  align-items: baseline;
  gap: 8px;
}
.detail-name {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 1px;
  color: #d4a020;
}
.detail-role {
  font-size: 9px;
  letter-spacing: 2px;
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 3px 10px;
}

.detail-stat {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  min-width: 0;
}
.detail-value {
  font-size: 13px;
  font-weight: 700;
  color: #e8e2d0;
  line-height: 1.1;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.9);
  white-space: nowrap;
}
.detail-label {
  font-size: 7px;
  letter-spacing: 1px;
  color: rgba(232, 226, 208, 0.5);
  white-space: nowrap;
}

@media (prefers-reduced-motion: reduce) {
  .roster-row,
  .row-detail {
    transition: opacity 0.25s ease;
    transform: none;
  }
  .roster-row--filled:hover {
    transform: none;
  }
  .roster-row--filled:hover .row-detail {
    transform: none;
  }
}
.roster-row--filled {
  border-top: 1px solid rgba(0, 0, 0, 0.35);
  border-right: 1px solid rgba(0, 0, 0, 0.35);
  border-bottom: 1px solid rgba(0, 0, 0, 0.35);
}
.roster-row--empty {
  background: rgba(14, 10, 4, 0.6);
  border-top: 1px dashed rgba(90, 60, 20, 0.4);
  border-right: 1px dashed rgba(90, 60, 20, 0.4);
  border-bottom: 1px dashed rgba(90, 60, 20, 0.4);
  opacity: 0.75;
}
.roster-row--mvp {
  border-top: 1px solid rgba(212, 160, 32, 0.55);
  border-right: 1px solid rgba(212, 160, 32, 0.55);
  border-bottom: 1px solid rgba(212, 160, 32, 0.55);
  box-shadow:
    inset 0 0 18px rgba(212, 160, 32, 0.12),
    0 0 12px rgba(212, 160, 32, 0.25);
}

/* ── Standout badges: uniform ribbons, stacked, max 4 per column ── */
.row-badges {
  flex-shrink: 0;
  display: grid;
  grid-auto-flow: column;
  grid-template-rows: repeat(4, auto);
  gap: 3px;
  padding: 4px 0 4px 10px;
  align-self: center;
  /* Reserved badge column so the center block aligns across all rows */
  min-width: 120px;
  box-sizing: border-box;
}

.row-ribbon {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 3px 9px 3px 6px;
  min-width: 104px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 1px;
  color: #f0ead8;
  border-radius: 4px;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.9);
  white-space: nowrap;
}
.ribbon-icon {
  width: 15px;
  height: 15px;
  flex-shrink: 0;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.8));
}

/* Splash portrait: right edge, full row height, fades toward the center */
.row-champ-img {
  align-self: stretch;
  width: 92px;
  object-fit: cover;
  flex-shrink: 0;
  -webkit-mask-image: linear-gradient(to left, #000 55%, transparent 100%);
  mask-image: linear-gradient(to left, #000 55%, transparent 100%);
}

.row-empty-slot {
  align-self: stretch;
  width: 92px;
  margin: 6px 6px 6px 0;
  border-radius: 4px;
  border: 2px dashed rgba(90, 60, 20, 0.5);
  flex-shrink: 0;
}

/* ── Center block: name line over mini-stats ── */
.row-center {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 0 8px;
  text-align: center;
}

.row-name-line {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 8px;
  max-width: 100%;
  min-width: 0;
}

.row-champ-name {
  font-size: 18px;
  color: #fff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.8);
}
.row-champ-name--empty {
  color: #5a4820;
}

.row-role-label {
  font-size: 11px;
  letter-spacing: 2px;
  flex-shrink: 0;
}

/* ── Per-champion career mini-stats ── */
.row-stats {
  display: flex;
  justify-content: center;
  gap: 14px;
}

.row-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 32px;
}

.row-stat-value {
  font-size: 15px;
  font-weight: 700;
  color: #e8e2d0;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.8);
}
.row-stat-value--kills {
  color: #6ee7b7;
}
.row-stat-value--mvp {
  color: #e8c040;
}

.row-stat-label {
  font-size: 8px;
  letter-spacing: 1.5px;
  color: rgba(232, 226, 208, 0.45);
}
</style>
