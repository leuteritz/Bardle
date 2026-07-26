<template>
  <div class="star-timer-bars-host">
    <TransitionGroup name="bar-slide" tag="div" class="star-timer-bars">
      <div
        v-for="entry in sortedEntries"
        :key="entry.starId"
        class="timer-bar-row"
        :class="{
          'timer-bar-row--cursed': entry.isCursed,
          'timer-bar-row--champion': entry.isChampion,
          'timer-bar-row--escort': entry.starType === 'boss_escort',
          'timer-bar-row--boss': entry.starType === 'galaxy_boss',
          'star-hover-active': starGroupStore.hoveredTimerStarId === entry.starId,
        }"
        :style="{
          ...(entry.isCursed ? { '--curse-ratio': entry.curseRatio } : {}),
          ...(entry.isChampion ? { '--champ-outline': entry.palette.mid + '44' } : {}),
        }"
        @click="starGroupStore.openStarFightModal(entry.starId)"
        @mouseenter="starGroupStore.setHoveredTimerStar(entry.starId)"
        @mouseleave="starGroupStore.setHoveredTimerStar(null)"
      >
        <div class="bar-side bar-side--left">
          <div
            class="bar-fill"
            :style="{
              transform: `scaleX(${entry.fillRatio})`,
              '--c1': entry.palette.outer,
              '--c2': entry.palette.mid,
              '--c3': entry.palette.inner,
              '--glow': entry.palette.glow,
            }"
          />
          <!-- Track-Wrapper wandern per transform (Compositor) statt per
               left/right (Layout + Paint pro Frame und Balken) -->
          <div
            v-if="entry.fillRatio > 0"
            class="bar-edge-track bar-edge-track--left"
            :style="{ '--fill': entry.fillRatio }"
          >
            <span
              v-if="!entry.timeless"
              class="bar-seconds-label bar-seconds-label--left"
              :style="{
                '--label-color': entry.palette.mid,
                '--label-glow': entry.palette.glow,
              }"
              >{{ entry.secondsInt }}</span
            >
            <div class="planet-dots planet-dots--left">
              <span
                v-for="dot in entry.planets"
                :key="dot.id"
                class="planet-dot"
                :class="[`planet-dot--${dot.state}`, { 'planet-dot--cleared': dot.cleared }]"
                :style="{ '--hp': dot.hp }"
              />
            </div>
          </div>
          <!-- Endkampf: Typ-Label mittig auf der Seitenfüllung — die
               Bildschirmmitte gehört dem Header-Oval + Level-Badge -->
          <span
            v-if="entry.timeless"
            class="bar-type-label"
            :style="{
              '--label-color': entry.palette.inner,
              '--label-glow': entry.palette.glow,
            }"
            >{{ entry.starType === 'galaxy_boss' ? '✦ GALAXY BOSS ✦' : '☄ ESCORT' }}</span
          >
        </div>

        <div class="bar-center" />

        <div class="bar-side bar-side--right">
          <div
            class="bar-fill bar-fill--mirrored"
            :style="{
              transform: `scaleX(${entry.fillRatio})`,
              '--c1': entry.palette.outer,
              '--c2': entry.palette.mid,
              '--c3': entry.palette.inner,
              '--glow': entry.palette.glow,
            }"
          />
          <div
            v-if="entry.fillRatio > 0"
            class="bar-edge-track bar-edge-track--right"
            :style="{ '--fill': entry.fillRatio }"
          >
            <span
              v-if="!entry.timeless"
              class="bar-seconds-label bar-seconds-label--right"
              :style="{
                '--label-color': entry.palette.mid,
                '--label-glow': entry.palette.glow,
              }"
              >{{ entry.secondsInt }}</span
            >
            <div class="planet-dots planet-dots--right">
              <span
                v-for="dot in entry.planets"
                :key="dot.id"
                class="planet-dot"
                :class="[`planet-dot--${dot.state}`, { 'planet-dot--cleared': dot.cleared }]"
                :style="{ '--hp': dot.hp }"
              />
            </div>
          </div>
          <span
            v-if="entry.timeless"
            class="bar-type-label"
            :style="{
              '--label-color': entry.palette.inner,
              '--label-glow': entry.palette.glow,
            }"
            >{{ entry.starType === 'galaxy_boss' ? '✦ GALAXY BOSS ✦' : '☄ ESCORT' }}</span
          >
        </div>
      </div>
    </TransitionGroup>
  </div>
</template>

<script setup lang="ts">
import { hexToRgb } from '@/utils/format'
import { ref, shallowRef, computed, onMounted, onUnmounted } from 'vue'
import { useStarGroupStore } from '../../stores/starGroupStore'
import { usePlanetBossStore } from '../../stores/planetBossStore'
import { useRoleBehaviorStore } from '../../stores/roleBehaviorStore'
import {
  ROLE_MID_CURSE_DURATION_MS,
  ROLE_COLORS,
  STAR_TIMER_TICK_MS,
  STAR_TIMER_HP_STEPS,
  STAR_TIMER_HP_LOW_RATIO,
  STAR_TIMER_HP_CRITICAL_RATIO,
  STAR_TIMER_HP_MIN_FILL,
} from '../../config/constants'
import { CHAMPION_ROLES } from '../../config/championData'
import type { StarGroup } from '../../stores/starGroupStore'
import type { StarType } from '../../types'

const starGroupStore = useStarGroupStore()
const planetBossStore = usePlanetBossStore()
const roleBehaviorStore = useRoleBehaviorStore()
const now = ref(Date.now())

/**
 * Getakteter Boss-Snapshot statt reaktivem Zugriff auf `activeBosses`.
 *
 * Boss-HP sinkt bei jedem Klick, jedem Rollen-Angriff und jedem passiven Tick.
 * Läse das Bar-Computed die Bosse direkt, würde jede dieser Mutationen alle
 * Bars invalidieren und neu rendern. Der Snapshot wird stattdessen im
 * setInterval gebaut (kein reaktives Tracking im Callback), sodass die Bars
 * exakt im Ticker-Takt aktualisieren — unabhängig davon, wie viele Sterne
 * gerade Schaden nehmen.
 */
interface BossSnapshot {
  startTime: number
  enrageTimerMs: number
  /** HP-Anteil 0..1, auf STAR_TIMER_HP_STEPS Stufen gerundet */
  hp: number
  champion?: string
}

const bossSnapshot = shallowRef<Map<string, BossSnapshot>>(new Map())

function refreshBossSnapshot(): void {
  const next = new Map<string, BossSnapshot>()
  for (const boss of planetBossStore.activeBosses) {
    const ratio = boss.maxHP > 0 ? boss.currentHP / boss.maxHP : 0
    next.set(boss.planetId, {
      startTime: boss.startTime,
      enrageTimerMs: boss.enrageTimerMs,
      hp: Math.round(clamp01(ratio) * STAR_TIMER_HP_STEPS) / STAR_TIMER_HP_STEPS,
      champion: boss.homePlanetChampion,
    })
  }
  bossSnapshot.value = next
}

let ticker: ReturnType<typeof setInterval> | null = null
onMounted(() => {
  refreshBossSnapshot()
  ticker = setInterval(() => {
    refreshBossSnapshot()
    now.value = Date.now()
  }, STAR_TIMER_TICK_MS)
})
onUnmounted(() => {
  if (ticker) clearInterval(ticker)
})

interface Palette {
  outer: string
  mid: string
  inner: string
  glow: string
}

/** Ein Planet der Bar: eine Kugel, deren Füllstand die Boss-HP spiegelt. */
interface PlanetDot {
  id: string
  cleared: boolean
  /** 0..1 — Füllhöhe der Kugel (gerettete Planeten: 0) */
  hp: number
  /** 'ok' | 'low' | 'critical' — steuert die Füllfarbe */
  state: 'ok' | 'low' | 'critical'
}

interface BarEntry {
  starId: string
  starType: StarType
  isChampion: boolean
  // Endkampf-Bars (Eskorten + Galaxieboss) laufen nicht ab: volle statische
  // Füllung, kein Sekunden-Label — nur Planeten-Punkte und Klick zum Kampf.
  timeless: boolean
  valueStr: string
  secondsInt: number
  fillRatio: number
  sortKey: number
  palette: Palette
  isCursed: boolean
  curseRatio: number
  planets: PlanetDot[]
}

const palettes: Palette[] = [
  { outer: '#b86a22', mid: '#d9923b', inner: '#f0c98b', glow: 'rgba(217,146,59,0.28)' },
  { outer: '#b55b1f', mid: '#d67f37', inner: '#ebb77d', glow: 'rgba(214,127,55,0.27)' },
  { outer: '#ae4f1d', mid: '#cc7234', inner: '#e8a976', glow: 'rgba(204,114,52,0.26)' },
  { outer: '#a6471b', mid: '#c86831', inner: '#e39b6d', glow: 'rgba(200,104,49,0.25)' },
  { outer: '#9d4019', mid: '#bd5e2d', inner: '#dc8f67', glow: 'rgba(189,94,45,0.24)' },
]

const championPalette: Palette = {
  outer: '#1a52cc',
  mid: '#3a7aee',
  inner: '#80b8ff',
  glow: 'rgba(58,122,238,0.32)',
}

function fmtMs(ms: number): string {
  const s = Math.ceil(Math.max(0, ms) / 1000)
  const m = Math.floor(s / 60)
  const sec = s % 60
  return m > 0 ? `${m}:${String(sec).padStart(2, '0')}` : `${sec}s`
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v))
}

function roleColorToPalette(hex: string): Palette {
  const [r, g, b] = hexToRgb(hex)
  return rgbToPalette([r, g, b])
}

// Endkampf-Bars färben sich nach der tatsächlichen Sternfarbe (Eskorten-Glut
// bzw. Boss-Magenta) — Bar und Stern lesen sich als ein Gegner.
function rgbToPalette([r, g, b]: [number, number, number]): Palette {
  const cap = (v: number) => Math.min(255, Math.round(v))
  const toHex = (r: number, g: number, b: number) =>
    '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')
  return {
    outer: toHex(cap(r * 0.6), cap(g * 0.6), cap(b * 0.6)),
    mid: toHex(r, g, b),
    inner: toHex(cap(r * 1.5), cap(g * 1.5), cap(b * 1.5)),
    glow: `rgba(${r}, ${g}, ${b}, 0.32)`,
  }
}

function getStarRoleColor(star: StarGroup): string | null {
  const champSlot = star.planetSlots.find(s => s.isChampionPlanet)
  if (!champSlot) return null
  const name = bossSnapshot.value.get(champSlot.planetId)?.champion
  if (!name) return null
  const role = CHAMPION_ROLES[name]
  return role ? ROLE_COLORS[role] : null
}

function getBossRemainingMs(planetId: string): number | null {
  const boss = bossSnapshot.value.get(planetId)
  if (!boss) return null
  return Math.max(0, boss.enrageTimerMs - (now.value - boss.startTime))
}

/**
 * Planeten-Kugeln einer Bar. Aktive Planeten zuerst, gerettete danach — so
 * wandern erledigte Kugeln wie bisher zur Bildschirmmitte hin.
 */
function buildPlanetDots(star: StarGroup): PlanetDot[] {
  const snap = bossSnapshot.value
  const dots: PlanetDot[] = []
  const clearedDots: PlanetDot[] = []

  for (const slot of star.planetSlots) {
    if (slot.cleared) {
      clearedDots.push({ id: slot.planetId, cleared: true, hp: 0, state: 'ok' })
      continue
    }
    // Kein Boss im Snapshot (frisch gespawnt, noch nicht getickt) → volle Kugel
    const hp = snap.get(slot.planetId)?.hp ?? 1
    dots.push({
      id: slot.planetId,
      cleared: false,
      // Anzeigehöhe mit Bodensatz — der Zustand kommt weiterhin vom echten Wert
      hp: hp > 0 ? Math.max(STAR_TIMER_HP_MIN_FILL, hp) : 0,
      state: hp <= STAR_TIMER_HP_CRITICAL_RATIO ? 'critical' : hp <= STAR_TIMER_HP_LOW_RATIO ? 'low' : 'ok',
    })
  }

  return dots.concat(clearedDots)
}

function getSharedStarRemainingMs(star: {
  starType: StarType
  planetSlots: { planetId: string; cleared: boolean }[]
  spawnedAt?: number
  durationMs?: number
}): number {
  const activePlanetIds = star.planetSlots.filter((p) => !p.cleared).map((p) => p.planetId)

  const bossRemainings = activePlanetIds
    .map((planetId) => getBossRemainingMs(planetId))
    .filter((v): v is number => v !== null)

  if (bossRemainings.length > 0) {
    return Math.min(...bossRemainings)
  }

  if (star.spawnedAt !== undefined && star.durationMs !== undefined) {
    return Math.max(0, star.spawnedAt + star.durationMs - now.value)
  }

  return 0
}

const sortedEntries = computed<BarEntry[]>(() => {
  const raw: Omit<BarEntry, 'palette'>[] = []
  const curse = roleBehaviorStore.activeCurse
  const cursedStarId = roleBehaviorStore.cursedStarId
  const nowTs = now.value

  for (const star of starGroupStore.activeStars) {
    const total = star.planetSlots.length
    const cleared = star.planetSlots.filter((p) => p.cleared).length
    const allCleared = total > 0 && cleared >= total
    const isCursed = cursedStarId === star.id && !!curse && nowTs < curse.activeUntil
    const curseRatio = isCursed ? clamp01((curse!.activeUntil - nowTs) / ROLE_MID_CURSE_DURATION_MS) : 0
    const planets = buildPlanetDots(star)

    if (star.starType === 'resource') {
      const remaining = allCleared ? 0 : getSharedStarRemainingMs(star)
      const durationFromBoss =
        star.planetSlots
          .filter((p) => !p.cleared)
          .map((p) => bossSnapshot.value.get(p.planetId)?.enrageTimerMs)
          .find((v): v is number => typeof v === 'number' && v > 0) ??
        star.durationMs ??
        0

      const fillRatio = durationFromBoss > 0 ? remaining / durationFromBoss : 0

      if (!allCleared || remaining > 0) {
        raw.push({
          starId: star.id,
          starType: 'resource',
          isChampion: false,
          timeless: false,
          valueStr: fmtMs(remaining),
          secondsInt: Math.ceil(Math.max(0, remaining) / 1000),
          fillRatio: clamp01(fillRatio),
          sortKey: remaining,
          isCursed,
          curseRatio,
          planets,
        })
      }
    } else if (star.starType === 'champion') {
      const remaining = allCleared
        ? 0
        : star.spawnedAt !== undefined && star.durationMs !== undefined
          ? Math.max(0, star.spawnedAt + star.durationMs - nowTs)
          : 0
      const totalMs = star.durationMs ?? 1
      const fillRatio = totalMs > 0 ? remaining / totalMs : 0

      if (!allCleared) {
        raw.push({
          starId: star.id,
          starType: 'champion',
          isChampion: true,
          timeless: false,
          valueStr: fmtMs(remaining),
          secondsInt: Math.ceil(Math.max(0, remaining) / 1000),
          fillRatio: clamp01(fillRatio),
          sortKey: Number.MAX_SAFE_INTEGER,
          isCursed,
          curseRatio,
          planets,
        })
      }
    } else if (star.starType === 'boss_escort' || star.starType === 'galaxy_boss') {
      // Endkampf: kein Ablaufdatum — die Bar steht voll, bis der Stern fällt.
      // Eskorten über den normalen Bars, der Boss als unterste, epischste Zeile.
      if (!allCleared) {
        raw.push({
          starId: star.id,
          starType: star.starType,
          isChampion: false,
          timeless: true,
          valueStr: '',
          secondsInt: 0,
          fillRatio: 1,
          sortKey:
            star.starType === 'galaxy_boss'
              ? Number.MAX_SAFE_INTEGER
              : Number.MAX_SAFE_INTEGER - 1,
          isCursed,
          curseRatio,
          planets,
        })
      }
    }
  }

  raw.sort((a, b) => a.sortKey - b.sortKey)
  return raw.map((entry, index) => ({
    ...entry,
    palette: (() => {
      const star = starGroupStore.activeStars.find(s => s.id === entry.starId)
      if (entry.timeless && star) return rgbToPalette(star.starColor)
      if (!entry.isChampion) return palettes[index % palettes.length]
      const roleColor = star ? getStarRoleColor(star) : null
      return roleColor ? roleColorToPalette(roleColor) : championPalette
    })(),
  }))
})
</script>

<style scoped>
.star-timer-bars-host {
  position: fixed;
  top: var(--header-total-height, 50px);
  left: var(--header-vp-left, 1rem);
  right: var(--header-vp-right, 1rem);
  z-index: 119;
  pointer-events: none;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.star-timer-bars {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 2px;
  width: 100%;
}

.timer-bar-row {
  display: grid;
  grid-template-columns: var(--bar-side-width, 1fr) 1fr var(--bar-side-width, 1fr);
  align-items: center;
  /* Flüssig skaliert für 1280px (~14px) bis 2560px (~21px) Viewport-Breite */
  height: clamp(14px, 0.5vw + 7.6px, 22px);
  width: 100%;
  overflow: hidden;
  cursor: pointer;
  pointer-events: auto;
}

.timer-bar-row:hover,
.timer-bar-row.star-hover-active {
  outline: 1px solid rgba(255, 200, 80, 0.22);
  outline-offset: 1px;
}

.timer-bar-row:hover .bar-fill,
.timer-bar-row.star-hover-active .bar-fill {
  filter: brightness(1.18);
}

.timer-bar-row--champion {
  border-radius: 3px;
}

.timer-bar-row--champion:hover,
.timer-bar-row--champion.star-hover-active {
  outline: 1px solid var(--champ-outline, rgba(100, 160, 255, 0.5));
  outline-offset: 1px;
  filter: brightness(1.12);
}

.timer-bar-row--cursed {
  border-radius: 3px;
}

/* Der Fluch-Glow liegt auf den Füllungen selbst, die per scaleX zur Mitte
   schrumpfen — so folgt er der tatsächlichen Balkenbreite statt der ganzen Zeile */
.timer-bar-row--cursed .bar-fill {
  /* Kräftiger lila Ring direkt auf der Füllung + starkes Innenleuchten,
     Intensität skaliert mit der Fluch-Restdauer (--curse-ratio) */
  box-shadow:
    inset 0 0 0 1.5px rgba(200, 100, 255, calc(var(--curse-ratio) * 0.6 + 0.35)),
    inset 0 0 14px rgba(170, 50, 230, calc(var(--curse-ratio) * 0.5 + 0.4)),
    0 0 calc(var(--curse-ratio) * 12px + 4px) 3px rgba(160, 40, 220, calc(var(--curse-ratio) * 0.5 + 0.4)),
    0 0 calc(var(--curse-ratio) * 24px + 8px) 6px rgba(100, 0, 180, calc(var(--curse-ratio) * 0.35 + 0.25));
  animation: curse-pulse 1.4s ease-in-out infinite;
}

@keyframes curse-pulse {
  0%, 100% {
    box-shadow:
      inset 0 0 0 1.5px rgba(200, 100, 255, calc(var(--curse-ratio) * 0.6 + 0.35)),
      inset 0 0 14px rgba(170, 50, 230, calc(var(--curse-ratio) * 0.5 + 0.4)),
      0 0 calc(var(--curse-ratio) * 12px + 4px) 3px rgba(160, 40, 220, calc(var(--curse-ratio) * 0.5 + 0.4)),
      0 0 calc(var(--curse-ratio) * 24px + 8px) 6px rgba(100, 0, 180, calc(var(--curse-ratio) * 0.35 + 0.25));
  }
  50% {
    box-shadow:
      inset 0 0 0 2px rgba(215, 130, 255, calc(var(--curse-ratio) * 0.5 + 0.5)),
      inset 0 0 18px rgba(190, 80, 255, calc(var(--curse-ratio) * 0.4 + 0.55)),
      0 0 calc(var(--curse-ratio) * 18px + 6px) 4px rgba(180, 60, 255, calc(var(--curse-ratio) * 0.4 + 0.55)),
      0 0 calc(var(--curse-ratio) * 32px + 10px) 8px rgba(120, 0, 200, calc(var(--curse-ratio) * 0.3 + 0.35));
  }
}

/* Verfluchte Timer: Sekunden-Label lila einfärben */
.timer-bar-row--cursed .bar-seconds-label {
  color: #c77dff;
  filter: drop-shadow(0 0 6px rgba(160, 40, 220, 0.8)) drop-shadow(0 0 2px rgba(0, 0, 0, 0.9));
}

.bar-side {
  position: relative;
  height: 100%;
  overflow: hidden;
  background: transparent;
}

.bar-fill {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 100%;
  background: linear-gradient(to right, var(--c1) 0%, var(--c2) 56%, var(--c3) 100%);
  box-shadow:
    0 0 6px var(--glow),
    0 0 14px var(--glow),
    inset 0 1px 0 rgba(255, 236, 190, 0.18),
    inset 0 -1px 0 rgba(0, 0, 0, 0.22);
  transition: transform 0.2s linear;
  will-change: transform;
}

.bar-side--left .bar-fill {
  left: 0;
  transform-origin: right center;
  border-radius: 0 3px 3px 0;
}

.bar-fill--mirrored {
  right: 0;
  left: auto;
  transform-origin: left center !important;
  background: linear-gradient(to left, var(--c1) 0%, var(--c2) 56%, var(--c3) 100%) !important;
  border-radius: 3px 0 0 3px;
}

.bar-center {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 100%;
  padding-inline: 8px;
  background: transparent;
  font-size: 0.64rem;
  font-weight: 800;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}

.bar-value {
  color: var(--text-color);
  filter: drop-shadow(0 0 3px var(--icon-color));
}

/* ── Endkampf-Bars (zeitlos): Typ-Label mittig auf jeder Seitenfüllung ── */
.bar-type-label {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 0.62rem;
  font-weight: 800;
  letter-spacing: 0.14em;
  line-height: 1;
  white-space: nowrap;
  pointer-events: none;
  z-index: 1;
  color: var(--label-color);
  filter: drop-shadow(0 0 6px var(--label-glow)) drop-shadow(0 0 2px rgba(0, 0, 0, 0.9));
}

/* Eskorten: glimmende Glut — dezent flackernder Schein auf der vollen Füllung */
.timer-bar-row--escort .bar-fill {
  animation: escort-ember 2.6s ease-in-out infinite;
}

@keyframes escort-ember {
  0%,
  100% {
    box-shadow:
      0 0 6px var(--glow),
      0 0 14px var(--glow),
      inset 0 1px 0 rgba(255, 236, 190, 0.18),
      inset 0 -1px 0 rgba(0, 0, 0, 0.22);
  }
  50% {
    box-shadow:
      0 0 10px var(--glow),
      0 0 22px var(--glow),
      inset 0 1px 0 rgba(255, 236, 190, 0.28),
      inset 0 -1px 0 rgba(0, 0, 0, 0.22);
  }
}

/* Galaxieboss: höchste Zeile, atmender Magenta-Glow, leuchtendes Banner-Label */
.timer-bar-row--boss {
  height: clamp(18px, 0.55vw + 10px, 27px);
  border-radius: 3px;
}

.timer-bar-row--boss .bar-fill {
  animation: boss-bar-breathe 2s ease-in-out infinite;
}

@keyframes boss-bar-breathe {
  0%,
  100% {
    box-shadow:
      0 0 8px var(--glow),
      0 0 18px var(--glow),
      inset 0 0 10px rgba(255, 255, 255, 0.12),
      inset 0 1px 0 rgba(255, 220, 250, 0.25),
      inset 0 -1px 0 rgba(0, 0, 0, 0.25);
  }
  50% {
    box-shadow:
      0 0 14px var(--glow),
      0 0 32px var(--glow),
      0 0 48px var(--glow),
      inset 0 0 16px rgba(255, 255, 255, 0.2),
      inset 0 1px 0 rgba(255, 220, 250, 0.35),
      inset 0 -1px 0 rgba(0, 0, 0, 0.25);
  }
}

.timer-bar-row--boss .bar-type-label {
  font-size: 0.8rem;
  letter-spacing: 0.18em;
  animation: boss-label-glow 2s ease-in-out infinite;
}

@keyframes boss-label-glow {
  0%,
  100% {
    filter: drop-shadow(0 0 6px var(--label-glow)) drop-shadow(0 0 2px rgba(0, 0, 0, 0.9));
  }
  50% {
    filter: drop-shadow(0 0 12px var(--label-glow)) drop-shadow(0 0 4px var(--label-glow))
      drop-shadow(0 0 2px rgba(0, 0, 0, 0.9));
  }
}

.timer-bar-row--boss:hover,
.timer-bar-row--boss.star-hover-active {
  outline: 1px solid rgba(255, 120, 220, 0.45);
  outline-offset: 1px;
}

@media (prefers-reduced-motion: reduce) {
  .timer-bar-row--escort .bar-fill,
  .timer-bar-row--boss .bar-fill,
  .timer-bar-row--boss .bar-type-label {
    animation: none;
  }

  .planet-dot::before {
    transition: none;
  }
}

/* Track-Wrapper: so breit wie die Balkenseite, wandert per transform mit der
   Füllkante mit. transform-% bezieht sich auf die eigene Breite (=100% der
   Seite), daher stimmt die Mathematik mit dem früheren left-calc überein —
   läuft aber komplett auf dem Compositor statt Layout+Paint pro Frame. */
.bar-edge-track {
  position: absolute;
  inset: 0;
  pointer-events: none;
  transition: transform 0.2s linear;
  will-change: transform;
}

.bar-edge-track--left {
  transform: translateX(calc((1 - var(--fill)) * 100%));
}

.bar-edge-track--right {
  transform: translateX(calc((1 - var(--fill)) * -100%));
}

.bar-seconds-label {
  position: absolute;
  top: 50%;
  /* Flüssig skaliert für 1280px (~12.5px) bis 2560px (~16.5px) Viewport-Breite */
  font-size: clamp(0.78rem, 0.3vw + 0.51rem, 1.03rem);
  font-weight: 800;
  line-height: 1;
  letter-spacing: 0.06em;
  pointer-events: none;
  white-space: nowrap;
  color: var(--label-color);
  filter: drop-shadow(0 0 6px var(--label-glow)) drop-shadow(0 0 2px rgba(0, 0, 0, 0.9));
  z-index: 1;
}

.bar-seconds-label--left {
  left: 0;
  transform: translateX(calc(-50% - 1.3em)) translateY(-50%);
}

.bar-seconds-label--right {
  right: 0;
  transform: translateX(calc(50% + 1.3em)) translateY(-50%);
}

/* ── Planeten-Punkte: 1 Punkt pro Planet, sitzen auf der Füllung direkt
   innen an der wandernden Balkenkante und ziehen mit ihr zur Mitte.
   Gefüllt = Planet übrig, hohl/abgedunkelt = gerettet. Kühles Weiß mit
   dunklem Ring, damit sie sich vom warmen/blauen Balkenverlauf abheben. ── */
.planet-dots {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  gap: clamp(4px, 0.2vw + 2px, 7px);
  z-index: 2;
  pointer-events: none;
}

.planet-dots--left {
  left: 0;
  padding-left: clamp(6px, 0.5vw, 12px);
}

.planet-dots--right {
  right: 0;
  padding-right: clamp(6px, 0.5vw, 12px);
  flex-direction: row-reverse;
}

/* Die Kugel ist zugleich HP-Anzeige des Planeten-Bosses: sie steht voll bei
   100 % HP und leert sich von oben nach unten wie ein Gefäß. Umgesetzt als
   ein einziges Pseudo-Element mit scaleY(var(--hp)) — reine Transform-
   Änderung auf dem Compositor, kein Layout, kein Repaint der Zeile. Selbst
   bei dutzenden Sternen bleibt das ein Style-Write pro Kugel und Ticker-
   Schritt, nicht pro Schadensereignis (siehe Boss-Snapshot im Script). */
.planet-dot {
  /* Flüssig skaliert für 1280px (~9px) bis 2560px (~13px) Viewport-Breite */
  width: clamp(9px, 0.3vw + 5px, 13px);
  aspect-ratio: 1;
  border-radius: 50%;
  position: relative;
  display: block;
  overflow: hidden;
  /* Leere Schale — der Teil, der bereits an Schaden verloren ging */
  background: radial-gradient(circle at 35% 30%, #232c3d, #080b12 72%);
  /* Dunkler Ring als Kontrastkern gegen den Farbverlauf der Füllung */
  box-shadow:
    0 0 0 1.5px rgba(10, 14, 24, 0.75),
    0 0 6px rgba(220, 235, 255, 0.35);
}

/* Füllstand */
.planet-dot::before {
  content: '';
  position: absolute;
  inset: 0;
  transform-origin: bottom center;
  transform: scaleY(var(--hp, 1));
  transition: transform 0.2s linear;
  background: linear-gradient(to top, var(--hp-deep), var(--hp-main) 76%, var(--hp-crest) 100%);
}

/* Glas-/Kugelglanz plus farbiger Innenrand. Der Rand ist das zweite, vom
   Füllstand unabhängige Zustandssignal: eine fast leere Kugel wäre sonst nur
   ein dunkler Punkt — mit rotem Rand liest sie sich sofort als "gleich fällt er". */
.planet-dot::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 50%;
  pointer-events: none;
  background: radial-gradient(circle at 34% 26%, rgba(255, 255, 255, 0.4), rgba(255, 255, 255, 0) 40%);
  box-shadow: inset 0 0 0 1.5px var(--hp-rim, rgba(255, 255, 255, 0.16));
}

/* Volle Fahrt: kühles Weißblau wie bisher */
.planet-dot--ok {
  --hp-deep: #7ea8d8;
  --hp-main: #cfe4ff;
  --hp-crest: #ffffff;
  --hp-rim: rgba(255, 255, 255, 0.16);
}

/* Angeschlagen: Bernstein — deutlich vom Weiß unterscheidbar */
.planet-dot--low {
  --hp-deep: #a85f0e;
  --hp-main: #f0aa38;
  --hp-crest: #ffdc96;
  --hp-rim: rgba(255, 190, 90, 0.9);
  box-shadow:
    0 0 0 1.5px rgba(10, 14, 24, 0.8),
    0 0 7px rgba(240, 170, 56, 0.55);
}

/* Kurz vor dem Fall: Rot plus kräftigerer Schein. Bewusst statisch — eine
   Puls-Animation pro Kugel wäre bei vielen Sternen ein Paint-Sturm. */
.planet-dot--critical {
  --hp-deep: #8d1b10;
  --hp-main: #ee4b34;
  --hp-crest: #ff9d84;
  --hp-rim: rgba(255, 120, 96, 0.95);
  box-shadow:
    0 0 0 1.5px rgba(10, 14, 24, 0.85),
    0 0 9px rgba(238, 75, 52, 0.8);
}

.planet-dot--cleared {
  background: transparent;
  border: 1.5px solid rgba(230, 240, 255, 0.85);
  box-shadow: 0 0 0 1px rgba(10, 14, 24, 0.5);
  opacity: 0.45;
}

.planet-dot--cleared::before,
.planet-dot--cleared::after {
  display: none;
}

/* ── Transition: leaving-Element nimmt keinen Platz mehr ein ── */
.bar-slide-enter-active {
  transition:
    opacity 0.22s ease,
    transform 0.22s ease,
    max-height 0.22s ease;
  overflow: hidden;
}

.bar-slide-leave-active {
  transition:
    opacity 0.18s ease,
    transform 0.18s ease,
    max-height 0.18s ease;
  /* Absolut aus dem Flow herausnehmen → belegt keinen Platz mehr */
  position: absolute;
  width: 100%;
  overflow: hidden;
  pointer-events: none;
}

.bar-slide-enter-from {
  opacity: 0;
  transform: translateY(-4px);
  max-height: 0;
}

.bar-slide-leave-to {
  opacity: 0;
  transform: translateY(-4px);
  max-height: 0;
}

.bar-slide-enter-to,
.bar-slide-leave-from {
  max-height: 32px;
}
</style>
