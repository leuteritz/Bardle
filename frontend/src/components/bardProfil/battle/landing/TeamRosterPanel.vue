<template>
  <!-- Hero #2 of the landing stage: the five champ-select style roster cards -->
  <div class="roster-panel">
    <div class="roster-head">
      <span class="roster-rule" />
      <span class="roster-title">YOUR TEAM</span>
      <span
        class="ready-badge"
        :class="hasFullTeam ? 'ready-badge--full' : 'ready-badge--open'"
      >
        {{ teamProgress }} / 5 {{ hasFullTeam ? 'READY' : 'FILLED' }}
      </span>
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
      >
        <template v-if="battleStore.headerSlots[idx]">
          <img
            :src="battleStore.getChampionImage(battleStore.headerSlots[idx]!)"
            :alt="battleStore.headerSlots[idx]!"
            class="card-art"
          />
          <div class="card-scrim" />
          <div class="card-tint" :style="{ background: tintFor(role.color) }" />

          <!-- Role chip, top-left -->
          <span class="card-role" :style="{ color: role.color, borderColor: hexToRgba(role.color, 0.5) }">
            {{ role.roleLabel }}
          </span>

          <!-- Standout badges, top-right; label via tooltip -->
          <div class="card-badges">
            <span
              v-for="badge in badgesFor(battleStore.headerSlots[idx]!)"
              :key="badge.key"
              class="card-badge"
              :title="badge.label"
            >
              <Icon :icon="badge.icon" class="card-badge-icon" :style="{ color: badge.color }" />
            </span>
          </div>

          <!-- Name + headline stats, bottom -->
          <div class="card-foot">
            <span class="card-name">{{ battleStore.headerSlots[idx] }}</span>
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

          <!-- Hover stat sheet: full career breakdown for this champion -->
          <div class="card-detail">
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
                <span class="detail-label">{{ entry.label }}</span>
                <span class="detail-value" :style="entry.color ? { color: entry.color } : undefined">
                  {{ entry.value }}
                </span>
              </div>
            </div>
          </div>
        </template>

        <template v-else>
          <span class="card-role" :style="{ color: hexToRgba(role.color, 0.6), borderColor: hexToRgba(role.color, 0.3) }">
            {{ role.roleLabel }}
          </span>
          <div class="empty-body">
            <span class="empty-mark" :style="{ color: hexToRgba(role.color, 0.5) }">＋</span>
            <span class="empty-text">EMPTY SLOT</span>
          </div>
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

/** Role color drives the card's border and the wash over the splash art. */
function cardStyle(role: { color: string }, filled: boolean): CSSProperties {
  return filled
    ? { borderColor: hexToRgba(role.color, 0.55) }
    : { borderColor: hexToRgba(role.color, 0.22) }
}

function tintFor(color: string): string {
  return `linear-gradient(to top, ${hexToRgba(color, 0.32)}, transparent 62%)`
}

const battleStore = useBattleStore()
const teamProgress = computed(() => battleStore.headerSlots.filter((s) => s !== null).length)
const hasFullTeam = computed(() => teamProgress.value >= 5)

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
  gap: clamp(7px, 1.1vh, 13px);
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
  font-size: clamp(11px, 1.4vh, 14px);
  font-weight: 700;
  letter-spacing: 5px;
  color: #d4a020;
}

.ready-badge {
  font-size: clamp(9px, 1.15vh, 11px);
  font-weight: 700;
  letter-spacing: 1.5px;
  padding: 2px 10px;
  border-radius: 4px;
}
.ready-badge--full {
  color: #8ee060;
  border: 1px solid #3f6b24;
  background: #16250e;
}
.ready-badge--open {
  color: #cc6050;
  border: 1px solid #64302a;
  background: #24100d;
}

/* ── Card row: five equal champ-select tiles ── */
/* minmax(0, 1fr) pins the single row to the container height — without it the
   cards' intrinsic height wins and they spill out over the start button. */
.roster-cards {
  flex: 1;
  min-height: clamp(120px, 15vh, 200px);
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  grid-template-rows: minmax(0, 1fr);
  gap: clamp(8px, 0.9vw, 16px);
}

.champ-card {
  position: relative;
  overflow: hidden;
  min-height: 0;
  background: #0d0b06;
  border: 1px solid;
  border-radius: 5px;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.55);
  transition:
    transform 0.22s ease,
    box-shadow 0.22s ease,
    border-color 0.22s ease;
}
.champ-card--filled:hover {
  transform: translateY(-4px);
  box-shadow:
    0 12px 30px rgba(0, 0, 0, 0.7),
    0 0 20px rgba(212, 160, 32, 0.28);
}
.champ-card--mvp {
  box-shadow:
    inset 0 0 22px rgba(212, 160, 32, 0.16),
    0 6px 20px rgba(0, 0, 0, 0.55),
    0 0 14px rgba(212, 160, 32, 0.3);
}
.champ-card--empty {
  background: #0b0904;
  border-style: dashed;
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

/* ── Role chip ── */
.card-role {
  position: absolute;
  top: 7px;
  left: 7px;
  z-index: 2;
  padding: 2px 7px;
  font-size: clamp(9px, 1.2vh, 12px);
  font-weight: 700;
  letter-spacing: 2px;
  background: rgba(6, 5, 3, 0.78);
  border: 1px solid;
  border-radius: 4px;
}

/* ── Standout badges ── */
.card-badges {
  position: absolute;
  top: 7px;
  right: 7px;
  z-index: 2;
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 3px;
  max-width: 58%;
}

.card-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2px;
  background: rgba(6, 5, 3, 0.78);
  border: 1px solid #3a2c14;
  border-radius: 4px;
}

.card-badge-icon {
  width: clamp(13px, 1.7vh, 17px);
  height: clamp(13px, 1.7vh, 17px);
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.9));
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
  gap: clamp(4px, 0.7vh, 8px);
  padding: clamp(7px, 1vh, 12px) clamp(7px, 0.6vw, 12px);
  transition: opacity 0.22s ease;
}

.card-name {
  font-size: clamp(14px, 2vh, 22px);
  color: #fff;
  line-height: 1.1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-shadow: 0 2px 6px rgba(0, 0, 0, 0.95);
}

.card-stats {
  display: flex;
  justify-content: space-between;
  gap: 4px;
  padding-top: clamp(4px, 0.6vh, 7px);
  border-top: 1px solid rgba(212, 160, 32, 0.18);
}

.card-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 0;
}

.card-stat-value {
  font-size: clamp(12px, 1.7vh, 17px);
  font-weight: 700;
  color: #e8e2d0;
  line-height: 1.1;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.9);
}
.card-stat-value--kills {
  color: #6ee7b7;
}
.card-stat-value--mvp {
  color: #e8c040;
}

.card-stat-label {
  font-size: clamp(7px, 0.95vh, 9px);
  letter-spacing: 1.2px;
  color: rgba(232, 226, 208, 0.5);
}

/* ── Hover stat sheet ── */
.card-detail {
  position: absolute;
  inset: 0;
  z-index: 3;
  display: flex;
  flex-direction: column;
  gap: clamp(4px, 0.7vh, 8px);
  padding: clamp(8px, 1.1vh, 13px) clamp(8px, 0.7vw, 13px);
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
  gap: 1px;
  padding-bottom: clamp(3px, 0.5vh, 6px);
  border-bottom: 1px solid #3a2c14;
  flex-shrink: 0;
}
.detail-name {
  font-size: clamp(12px, 1.6vh, 16px);
  font-weight: 700;
  color: #d4a020;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.detail-role {
  font-size: clamp(8px, 1.05vh, 10px);
  letter-spacing: 2px;
}

.detail-grid {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: 1fr;
  align-content: space-between;
  gap: 1px;
}

.detail-stat {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 6px;
  min-width: 0;
}
.detail-label {
  font-size: clamp(7px, 0.95vh, 9px);
  letter-spacing: 1px;
  color: rgba(232, 226, 208, 0.45);
  white-space: nowrap;
}
.detail-value {
  font-size: clamp(10px, 1.35vh, 13px);
  font-weight: 700;
  color: #e8e2d0;
  white-space: nowrap;
}

/* ── Empty slot ── */
.empty-body {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: clamp(4px, 0.6vh, 8px);
}

.empty-mark {
  font-size: clamp(26px, 4vh, 44px);
  line-height: 1;
}

.empty-text {
  font-size: clamp(8px, 1.05vh, 10px);
  letter-spacing: 2.5px;
  color: #5a4820;
}

/* Full HD and flatter: the detail sheet stays legible in shorter cards */
@media (max-height: 1100px) {
  .detail-value {
    font-size: 11px;
  }
}

@media (max-height: 880px) {
  .card-stat-label {
    display: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .champ-card,
  .card-art {
    transition: opacity 0.22s ease;
  }
  .champ-card--filled:hover {
    transform: none;
  }
  .champ-card--filled:hover .card-art {
    transform: none;
  }
}
</style>
