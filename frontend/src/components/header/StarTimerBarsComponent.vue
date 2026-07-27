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
          'timer-bar-row--raging': entry.isRaging,
          'timer-bar-row--eclipsed': entry.isEclipsed,
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
          <!-- Eclipse: der Stern steht hinter der Sonne. Die Füllung verschwindet
               nicht, sie geht in den Kernschatten — dunkle Scheibe mit glühendem
               Korona-Saum, über die einmal je Runde ein Lichtblitz zieht. Eigenes
               Element statt eines Filters auf .bar-fill, weil ein Filter den
               Korona-Saum gleich mit abdunkeln würde, und eigenes statt ::after,
               weil dieses beim Rage-Zustand schon belegt ist: ein rasender Stern
               kann gleichzeitig verdeckt sein. -->
          <Transition name="bar-eclipse-fade">
            <div
              v-if="entry.isEclipsed"
              class="bar-eclipse"
              :style="{ transform: `scaleX(${entry.fillRatio})` }"
            >
              <span class="bar-eclipse-flash" />
            </div>
          </Transition>
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
              <!-- HP-Zahlen hängen hinten an der Kugelreihe: nur sie wächst und
                   schrumpft beim Ein-/Ausblenden, die Kugeln davor stehen fest. -->
              <span v-if="entry.hpLabels.length" class="planet-hp-list">
                <span
                  v-for="label in entry.hpLabels"
                  :key="label.id"
                  v-ink-center.y
                  class="planet-hp"
                  :class="`planet-hp--${label.state}`"
                  ><span v-ink-center class="planet-hp__num">{{ label.pct }}</span></span
                >
              </span>
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
          <Transition name="bar-eclipse-fade">
            <div
              v-if="entry.isEclipsed"
              class="bar-eclipse bar-eclipse--mirrored"
              :style="{ transform: `scaleX(${entry.fillRatio})` }"
            >
              <span class="bar-eclipse-flash" />
            </div>
          </Transition>
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
              <!-- HP-Zahlen hängen hinten an der Kugelreihe: nur sie wächst und
                   schrumpft beim Ein-/Ausblenden, die Kugeln davor stehen fest. -->
              <span v-if="entry.hpLabels.length" class="planet-hp-list">
                <span
                  v-for="label in entry.hpLabels"
                  :key="label.id"
                  v-ink-center.y
                  class="planet-hp"
                  :class="`planet-hp--${label.state}`"
                  ><span v-ink-center class="planet-hp__num">{{ label.pct }}</span></span
                >
              </span>
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
  STAR_TIMER_HP_PCT_STEPS,
  STAR_TIMER_HP_MIN_PCT,
  STAR_TIMER_HP_REVEAL_MS,
} from '../../config/constants'
import { CHAMPION_ROLES } from '../../config/championData'
import { starInForeground } from '../../utils/foregroundGate'
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
  /** Ganzzahliger HP-Prozentwert für das Zahlenfeld neben der Kugel */
  hpPct: number
  /** Rohe HP — nur zum Treffer-Vergleich zwischen zwei Snapshots, nie gebunden */
  rawHp: number
  /** Zeitpunkt, bis zu dem die HP-Zahl nach einem Treffer sichtbar bleibt */
  revealUntil: number
  champion?: string
}

const bossSnapshot = shallowRef<Map<string, BossSnapshot>>(new Map())
/** Planet, der gerade bekämpft wird — seine HP steht dauerhaft. */
const focusedBossId = shallowRef<string | null>(null)

/**
 * Treffer werden aus dem HP-Verlauf zweier Snapshots abgeleitet, nicht an den
 * Schadensquellen gemeldet: So erfasst die Anzeige jede Quelle automatisch
 * (Klick, Splash, Rollen-Burst, Turret, DoT), ohne dass eine davon die
 * Header-Bars kennen muss — und ohne ein zusätzliches Feld im Boss-Store,
 * das bei jedem Schadensereignis mitgeschrieben werden müsste.
 *
 * Die Merker leben im Snapshot selbst. Da er jeden Tick nur aus den lebenden
 * Bossen neu aufgebaut wird, räumen sich abgelaufene Einträge von allein auf —
 * eine dauerhaft wachsende Map wäre bei vielen Sternen ein Leck.
 */
function refreshBossSnapshot(): void {
  const prevSnap = bossSnapshot.value
  const next = new Map<string, BossSnapshot>()
  const nowTs = Date.now()

  for (const boss of planetBossStore.activeBosses) {
    const ratio = clamp01(boss.maxHP > 0 ? boss.currentHP / boss.maxHP : 0)
    const prev = prevSnap.get(boss.planetId)
    const tookDamage = prev !== undefined && boss.currentHP < prev.rawHp
    next.set(boss.planetId, {
      startTime: boss.startTime,
      enrageTimerMs: boss.enrageTimerMs,
      hp: Math.round(ratio * STAR_TIMER_HP_STEPS) / STAR_TIMER_HP_STEPS,
      // Ganzzahlig gerundet: der gebundene Textknoten ändert sich damit nur,
      // wenn sich der angezeigte Wert tatsächlich ändert — nicht bei jedem
      // Bruchteil eines HP-Punktes.
      hpPct: ratio > 0 ? Math.max(STAR_TIMER_HP_MIN_PCT, Math.round(ratio * STAR_TIMER_HP_PCT_STEPS)) : 0,
      rawHp: boss.currentHP,
      revealUntil: tookDamage ? nowTs + STAR_TIMER_HP_REVEAL_MS : (prev?.revealUntil ?? 0),
      champion: boss.homePlanetChampion,
    })
  }

  bossSnapshot.value = next
  // Ebenfalls ungetrackt gelesen — ein reaktiver Zugriff auf activeBoss würde
  // die Bars bei jeder Boss-Mutation invalidieren und den Snapshot aushebeln.
  focusedBossId.value = planetBossStore.activeBoss?.planetId ?? null
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
  /** Exakter HP-Prozentwert (0..100) für das Zahlenfeld neben der Kugel */
  pct: number
  /** Zahl sichtbar? Nur der bekämpfte Planet und frisch getroffene zeigen sie. */
  showHp: boolean
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
  /** Boss dieses Sterns rast gerade — doppelter Schaden, Bar schlägt in Crimson um */
  isRaging: boolean
  /** Stern fliegt hinter der Sonne — kein Schaden fließt, Bar geht in Umbra */
  isEclipsed: boolean
  planets: PlanetDot[]
  /** Teilmenge von `planets`, die gerade eine HP-Zahl zeigt — hinten in der Bar */
  hpLabels: PlanetDot[]
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
 * Planeten-Kugeln einer Bar, sortiert von außen (Bildschirmrand) nach innen
 * (Bildschirmmitte): gerettete zuerst, dann die wartenden, und ganz innen der
 * Planet, der gerade bekämpft wird.
 *
 * Die Reihenfolge bildet die Angriffsfolge des Star-Fights ab
 * (`starGroupStore.starFightPlanetQueue`, abgearbeitet über `selectedBossId`):
 * Der bekämpfte Planet steht am inneren Ende und grenzt damit direkt an seine
 * HP-Zahl, die hinter der Kugelreihe hängt. Die Bar arbeitet sich also von
 * außen nach innen durch den Stern.
 */
function buildPlanetDots(star: StarGroup): PlanetDot[] {
  const snap = bossSnapshot.value
  const dots: PlanetDot[] = []
  const clearedDots: PlanetDot[] = []
  let focusedDot: PlanetDot | null = null

  const focusId = focusedBossId.value
  const nowTs = now.value

  for (const slot of star.planetSlots) {
    if (slot.cleared) {
      clearedDots.push({ id: slot.planetId, cleared: true, hp: 0, pct: 0, showHp: false, state: 'ok' })
      continue
    }
    // Kein Boss im Snapshot (frisch gespawnt, noch nicht getickt) → volle Kugel
    const boss = snap.get(slot.planetId)
    const hp = boss?.hp ?? 1
    const dot: PlanetDot = {
      id: slot.planetId,
      cleared: false,
      // Anzeigehöhe mit Bodensatz — der Zustand kommt weiterhin vom echten Wert
      hp: hp > 0 ? Math.max(STAR_TIMER_HP_MIN_FILL, hp) : 0,
      pct: boss?.hpPct ?? STAR_TIMER_HP_PCT_STEPS,
      showHp: slot.planetId === focusId || nowTs < (boss?.revealUntil ?? 0),
      state: hp <= STAR_TIMER_HP_CRITICAL_RATIO ? 'critical' : hp <= STAR_TIMER_HP_LOW_RATIO ? 'low' : 'ok',
    }
    if (slot.planetId === focusId) focusedDot = dot
    else dots.push(dot)
  }

  const ordered = clearedDots.concat(dots)
  if (focusedDot) ordered.push(focusedDot)
  return ordered
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
  const raw: Omit<BarEntry, 'palette' | 'isRaging' | 'isEclipsed'>[] = []
  const curse = roleBehaviorStore.activeCurse
  const cursedStarId = roleBehaviorStore.cursedStarId
  const nowTs = now.value
  // Rage hängt an genau einem Stern (dem aktiv bekämpften), nicht an einer Map
  // über alle — der Abgleich unten ist deshalb ein String-Vergleich pro Zeile.
  // `rageActiveUntil` wird nur beim Zünden und Verlöschen geschrieben, die Bars
  // invalidieren dadurch nicht öfter als ohnehin im Ticker-Takt.
  const ragingStarId =
    roleBehaviorStore.rageActiveUntil > nowTs ? roleBehaviorStore.rageStarId : null

  for (const star of starGroupStore.activeStars) {
    const total = star.planetSlots.length
    const cleared = star.planetSlots.filter((p) => p.cleared).length
    const allCleared = total > 0 && cleared >= total
    const isCursed = cursedStarId === star.id && !!curse && nowTs < curse.activeUntil
    const curseRatio = isCursed ? clamp01((curse!.activeUntil - nowTs) / ROLE_MID_CURSE_DURATION_MS) : 0
    const planets = buildPlanetDots(star)
    // Einmal vorgefiltert statt im Template — sonst entstünde bei jedem Render
    // ein neues Array und v-for müsste die Liste jedes Mal neu abgleichen.
    // Gespiegelt zur Kugelreihe: die Zahl des innersten (bekämpften) Planeten
    // steht dadurch am nächsten an seiner Kugel, statt am weitesten weg.
    const hpLabels = planets.filter((p) => p.showHp).reverse()

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
          hpLabels,
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
          hpLabels,
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
          hpLabels,
        })
      }
    }
  }

  raw.sort((a, b) => a.sortKey - b.sortKey)
  return raw.map((entry, index) => ({
    ...entry,
    isRaging: entry.starId === ragingStarId,
    // Eclipse kommt aus derselben Quelle wie das Kampf-Gate (`starInForeground`)
    // und nicht aus einer eigenen Rechnung — die Bar geht damit exakt in dem
    // Moment in den Schatten, in dem der Stern aufhört, Schaden zu nehmen.
    // Der Abgriff im 200-ms-Ticker reicht: eine Verdeckung dauert mehrere
    // Sekunden, ein RAF-Poll wie im Command Panel wäre hier verschwendet.
    isEclipsed: !starInForeground(entry.starId),
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

/* ── Boss-Rage: die Bar dieses Sterns schlägt in Crimson um ─────────────────
   Bewusst ohne Text und ohne Höhenänderung: die Zeile ist auf Full HD nur
   ~14 px hoch und trägt bereits Sekunden, Planetenkugeln und HP-Zahlen — ein
   weiteres Label würde je nach Planetenzahl und Restzeit mit einem davon
   kollidieren. Die Restdauer steht am Stern selbst; hier zählt allein, dass
   man die betroffene Zeile sofort findet.

   Umgesetzt als Überzug auf der Füllung, dessen Opazität pulst. Das ist der
   entscheidende Unterschied zum älteren Fluch-Puls darüber, der box-shadow
   animiert: ein Schatten-Keyframe zwingt zum Neumalen der Zeile in jedem
   Frame, Opazität nicht. Selbst wenn jede Bar gleichzeitig rot stünde, bliebe
   es damit reine Compositor-Arbeit.

   Die vorhandenen Animationen von Fluch, Eskorte und Boss bleiben absichtlich
   unberührt: sie sitzen auf dem Außenschein, der Überzug auf der Innenfläche.
   Beide Zustände bleiben so gleichzeitig ablesbar. */
.timer-bar-row--raging .bar-fill::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: linear-gradient(to bottom, #ff5c85 0%, #ff2e63 55%, #b8003a 100%);
  animation: bar-rage-pulse 1.1s ease-in-out infinite;
  will-change: opacity;
  pointer-events: none;
}

@keyframes bar-rage-pulse {
  0%,
  100% {
    opacity: 0.55;
  }
  50% {
    opacity: 0.92;
  }
}

/* Rage schlägt Fluch beim Label: doppelter Schaden ist der akutere Zustand,
   und die Fluch-Restdauer steht ohnehin als eigener Chip am Stern. */
.timer-bar-row--raging .bar-seconds-label {
  color: #ffb0c4;
  filter: drop-shadow(0 0 6px rgba(255, 46, 99, 0.85)) drop-shadow(0 0 2px rgba(0, 0, 0, 0.9));
}

.timer-bar-row--raging:hover,
.timer-bar-row--raging.star-hover-active {
  outline: 1px solid rgba(255, 92, 133, 0.55);
  outline-offset: 1px;
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

/* ── Eclipse: der Stern fliegt hinter der Sonne ─────────────────────────────
   Derselbe Zustand, den Star-Fight-Modal, Command Panel und Striker Squad als
   Medaillon zeigen — hier ohne Icon und ohne Text, denn die Zeile ist auf
   Full HD nur ~14 px hoch und trägt schon Sekunden, Kugeln und HP-Zahlen (siehe
   die Begründung beim Rage-Zustand oben). Die Bar sagt es stattdessen mit dem
   Bild der Finsternis selbst: die farbige Füllung verschwindet unter einer
   dunklen Scheibe, an deren Rand die Korona stehen bleibt — auf einen Blick
   erkennbar, ohne einen Pixel zusätzlichen Platz zu verlangen.

   Der Zustand steht bewusst ÜBER Fluch und Rage: Beide beschreiben, wie viel
   Schaden fließt — die Eclipse, dass gerade gar keiner fließt. */
.timer-bar-row--eclipsed {
  border-radius: 3px;
}

.bar-eclipse {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  width: 100%;
  /* Bewusst 0 und nicht 1: `.bar-edge-track` trägt ein transform und bildet
     damit einen eigenen Stacking-Kontext, der trotz seiner inneren z-index-2-
     Kugeln als Ganzes auf Ebene 0 gemalt wird. Jeder Wert > 0 legte die Scheibe
     über Kugeln und HP-Zahlen und machte sie unlesbar. Auf Ebene 0 entscheidet
     die DOM-Reihenfolge: nach der Füllung, vor dem Track — genau richtig. */
  z-index: 0;
  pointer-events: none;
  overflow: hidden;
  transform-origin: right center;
  border-radius: 0 3px 3px 0;
  /* Kühles Fast-Schwarz statt eines halbtransparenten Braun: ließe man die
     orange Füllung durchscheinen, sähe die Zeile nur „abgedunkelt" aus. Der
     Kernschatten muss die Farbe wirklich schlucken, damit der Goldsaum als
     Korona liest und nicht als Rahmen. */
  background: linear-gradient(
    to bottom,
    rgba(8, 7, 14, 0.955) 0%,
    rgba(14, 11, 20, 0.965) 52%,
    rgba(5, 4, 10, 0.96) 100%
  );
  /* Korona-Saum. Nur vertikale Offsets — sie überstehen das scaleX der Scheibe
     unverzerrt, ein seitlicher Saum würde mit dem Balken mitschrumpfen. */
  box-shadow:
    inset 0 2px 0 rgba(255, 242, 200, 0.95),
    inset 0 5px 7px -4px rgba(255, 200, 90, 0.75),
    inset 0 -2px 0 rgba(240, 156, 40, 0.8),
    inset 0 -5px 7px -4px rgba(232, 140, 30, 0.5),
    0 0 8px rgba(255, 200, 80, 0.45),
    0 0 18px rgba(232, 140, 30, 0.25);
  transition: transform 0.2s linear;
  will-change: transform;
}

.bar-eclipse--mirrored {
  right: 0;
  left: auto;
  transform-origin: left center;
  border-radius: 3px 0 0 3px;
}

/* Diamond Ring: ein Lichtblitz zieht einmal je Runde über den Kernschatten und
   hält die Zeile lebendig, ohne zu blinken. Reine transform-/opacity-Keyframes
   auf einem einmal gerasterten Verlauf — Compositor-Arbeit, selbst wenn jede
   Bar gleichzeitig verdeckt wäre. Beide Seiten laufen gespiegelt nach innen
   (rechts per `reverse`), sodass die Zeile symmetrisch bleibt. */
.bar-eclipse-flash {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  width: 26%;
  background: linear-gradient(
    90deg,
    rgba(255, 236, 170, 0) 0%,
    rgba(255, 236, 170, 0.32) 38%,
    rgba(255, 250, 224, 0.8) 50%,
    rgba(255, 200, 80, 0.32) 62%,
    rgba(232, 140, 30, 0) 100%
  );
  animation: bar-eclipse-flash 3.4s ease-in-out infinite;
  will-change: transform, opacity;
}

.bar-eclipse--mirrored .bar-eclipse-flash {
  animation-direction: reverse;
}

@keyframes bar-eclipse-flash {
  0% {
    transform: translateX(-120%);
    opacity: 0;
  }
  14% {
    opacity: 0.9;
  }
  66% {
    opacity: 0.9;
  }
  80%,
  100% {
    transform: translateX(400%);
    opacity: 0;
  }
}

/* Kugeln treten zurück, verschwinden aber nicht: der Stand des Sterns bleibt
   ablesbar, während er verdeckt ist. Auf dem fast schwarzen Kernschatten reicht
   dafür ein leichtes Dimmen — alles darunter macht die hellen Kugeln zu Löchern.
   Die HP-Zahlen bleiben bewusst ungedimmt: sie sind die einzige exakte Angabe
   in der Zeile und dürfen in keinem Zustand schlechter lesbar werden. */
.timer-bar-row--eclipsed .planet-dot {
  opacity: 0.86;
}

/* Der Puls der kritischen Zahl ruht mit — er meldet „gleich fällt er", und
   genau das kann in der Verdeckung nicht passieren. */
.timer-bar-row--eclipsed .planet-hp--critical {
  animation: none;
  transform: none;
}

/* Unter der Scheibe pulst nichts weiter: der Rage-Überzug ist dort nicht mehr
   zu sehen und würde nur Frames kosten. */
.timer-bar-row--eclipsed .bar-fill::after {
  animation-play-state: paused;
}

/* Labels in Koronafarbe. Steht nach der Rage-Regel, weil ein Stern rasen UND
   verdeckt sein kann — dann zählt, dass gerade nichts passiert. */
.timer-bar-row--eclipsed .bar-seconds-label,
.timer-bar-row--eclipsed .bar-type-label {
  color: #ffe6b0;
  filter: drop-shadow(0 0 7px rgba(255, 190, 70, 0.85)) drop-shadow(0 0 2px rgba(0, 0, 0, 0.95));
}

/* Nach den Typ-Hovern (Champion/Boss), damit die Korona-Outline auch auf einer
   Galaxieboss-Zeile den verdeckten Zustand spricht. */
.timer-bar-row--eclipsed:hover,
.timer-bar-row--eclipsed.star-hover-active {
  outline: 1px solid rgba(255, 210, 120, 0.5);
  outline-offset: 1px;
}

.timer-bar-row--eclipsed:hover .bar-fill,
.timer-bar-row--eclipsed.star-hover-active .bar-fill {
  filter: none;
}

.bar-eclipse-fade-enter-active,
.bar-eclipse-fade-leave-active {
  transition: opacity 0.35s ease;
}

.bar-eclipse-fade-enter-from,
.bar-eclipse-fade-leave-to {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  /* Scheibe und Saum bleiben — nur der Blitz zieht nicht mehr. Er steht dabei
     außerhalb der Bar, statt mitten auf ihr einzufrieren. */
  .bar-eclipse-flash {
    animation: none;
    opacity: 0;
  }

  .timer-bar-row--escort .bar-fill,
  .timer-bar-row--boss .bar-fill,
  .timer-bar-row--boss .bar-type-label {
    animation: none;
  }

  /* Überzug bleibt stehen — ohne Puls wäre die Zeile sonst je nach
     Keyframe-Position mal kräftig rot und mal fast unmarkiert. */
  .timer-bar-row--raging .bar-fill::after {
    animation: none;
    opacity: 0.78;
  }

  .planet-dot::before {
    transition: none;
  }

  .planet-hp,
  .planet-hp--critical {
    animation: none;
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

/* ── Planeten-Chips: 1 Chip pro Planet = Kugel + Prozentzahl. Sie sitzen auf
   der Füllung direkt innen an der wandernden Balkenkante und ziehen mit ihr
   zur Mitte. Gefüllt = Planet übrig, hohl/abgedunkelt = gerettet. Kühles Weiß
   mit dunklem Ring, damit sie sich vom warmen/blauen Balkenverlauf abheben. ── */
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

/* Die HP-Zahlen sitzen als eigene Gruppe hinter der Kugelreihe, nicht zwischen
   den Kugeln. Zwei Gründe: die Kugeln stehen dadurch so eng wie ohne Zahlen,
   und weil die Gruppe im Flex-Fluss NACH ihnen kommt, verschiebt ihr Wachsen
   und Schrumpfen beim Ein-/Ausblenden keine einzige Kugel.
   `contain: layout style` hält den Reflow einer Ziffernänderung in der Gruppe.
   Bewusst OHNE `paint`/`size`: der Textschein darf hinausleuchten. */
.planet-hp-list {
  display: flex;
  align-items: center;
  gap: clamp(5px, 0.25vw + 2px, 9px);
  margin-left: clamp(3px, 0.15vw + 1px, 6px);
  contain: layout style;
}

.planet-dots--right .planet-hp-list {
  flex-direction: row-reverse;
  margin-left: 0;
  margin-right: clamp(3px, 0.15vw + 1px, 6px);
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
  /* Weder Kugel noch Zahlenfeld dürfen im Chip gestaucht werden */
  flex: none;
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

/* Die Zustandsfarben stehen auf Kugel und Zahl getrennt, weil beide nicht mehr
   im selben Elternelement sitzen — die Werte bleiben paarweise identisch,
   sodass eine Zahl immer dieselbe Farbe spricht wie ihre Kugel. */

/* Volle Fahrt: kühles Weißblau wie bisher */
.planet-dot--ok,
.planet-hp--ok {
  --hp-deep: #7ea8d8;
  --hp-main: #cfe4ff;
  --hp-crest: #ffffff;
  --hp-rim: rgba(255, 255, 255, 0.16);
}

/* Angeschlagen: Bernstein — deutlich vom Weiß unterscheidbar */
.planet-dot--low,
.planet-hp--low {
  --hp-deep: #a85f0e;
  --hp-main: #f0aa38;
  --hp-crest: #ffdc96;
  --hp-rim: rgba(255, 190, 90, 0.9);
}

.planet-dot--low {
  box-shadow:
    0 0 0 1.5px rgba(10, 14, 24, 0.8),
    0 0 7px rgba(240, 170, 56, 0.55);
}

/* Kurz vor dem Fall: Rot plus kräftigerer Schein. Die Kugel selbst bleibt
   bewusst statisch — eine Puls-Animation pro Kugel wäre bei vielen Sternen ein
   Paint-Sturm. Gepulst wird nur die Zahl, und die rein auf dem Compositor. */
.planet-dot--critical,
.planet-hp--critical {
  --hp-deep: #8d1b10;
  --hp-main: #ee4b34;
  --hp-crest: #ff9d84;
  --hp-rim: rgba(255, 120, 96, 0.95);
}

.planet-dot--critical {
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

/* ── Prozentzahl: der exakte HP-Wert des Planeten-Bosses, live ───────────── */
.planet-hp {
  display: inline-flex;
  /* `center` statt `baseline`: an der Baseline ausgerichtet hängen die Ziffern
     an der Unterkante ihrer Zeilenbox, wodurch die Zahl in der schmalen Bar zu
     hoch sitzt. Zusammen mit `line-height: 1` und dem Metrik-Ausgleich unten
     steht sie exakt auf Kugelmitte. */
  align-items: center;
  flex: none;
  /* Der Metrik-Ausgleich nach unten kommt nicht mehr aus einer em-Konstante,
     sondern gemessen von `v-ink-center.y` im Template: der nötige Versatz ist
     kein fester Bruchteil der Schriftgröße, sondern wächst zwischen Full HD
     und 2K von 0.079em auf 0.117em (siehe utils/textInkOffset.ts). Die alten
     0.16em standen deshalb nur auf 2K richtig und ließen die Zahl auf Full HD
     gut einen Pixel zu tief stehen. */
  /* Flüssig skaliert für 1280px (~11.3px) bis 2560px (~14.7px) Viewport-Breite */
  font-size: clamp(0.72rem, 0.26vw + 0.5rem, 0.95rem);
  font-weight: 800;
  line-height: 1;
  letter-spacing: 0.01em;
  /* Einmalige Animation beim Erscheinen — die Zahl taucht nicht hart auf,
     kostet aber nichts Laufendes, weil sie nach 0.2s endet. */
  animation: hp-num-appear 0.2s ease-out;
  font-variant-numeric: tabular-nums;
  color: var(--hp-crest);
  /* text-shadow statt filter: drop-shadow — wird einmal gerastert und muss
     beim Puls der kritischen Chips nicht pro Frame neu gefiltert werden.
     Die dunkle Kontur steht zuerst und liegt damit direkt am Glyph: sie trägt
     den Kontrast, denn der farbige Glow allein verschwimmt auf der hellen
     Balkenfüllung. Der Farbschein liegt außen und bleibt reine Signalfarbe. */
  text-shadow:
    0 0 2px rgba(0, 0, 0, 0.95),
    0 1px 2px rgba(0, 0, 0, 0.95),
    0 0 8px var(--hp-main);
}

/* Prozentzeichen statisch aus CSS: bei einem Treffer wechselt so nur der
   Zifferntext, nicht der komplette Textinhalt des Elements. */
.planet-hp::after {
  content: '%';
  font-size: 0.66em;
  opacity: 0.62;
  margin-left: 0.08em;
}

@keyframes hp-num-appear {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

/* Kritisch: die Zahl atmet. Nur opacity + transform, damit der Puls
   ausschließlich auf dem Compositor läuft — kein Layout, kein Repaint, auch
   nicht wenn dutzende Sterne gleichzeitig kritische Planeten haben.
   Ursprung an der Kugelseite, sonst läuft die Zahl beim Skalieren hinein. */
.planet-hp--critical {
  /* Heller als die Kammfarbe der Kugel (--hp-crest): Rot auf der orangefarbenen
     Balkenfüllung braucht mehr Helligkeit als Rot auf der dunklen Kugel. */
  color: #ffc9b8;
  transform-origin: left center;
  animation: hp-num-pulse 1.15s ease-in-out infinite;
  will-change: opacity, transform;
}

.planet-dots--right .planet-hp--critical {
  transform-origin: right center;
}

/* Der Puls trägt bewusst über den Maßstab, nicht über das Ausblenden: ein tiefer
   Opazitäts-Tiefpunkt würde ausgerechnet den dringendsten Wert die halbe Zeit
   unlesbar machen. 0.78 bleibt auf der hellen Balkenfüllung klar lesbar. */
@keyframes hp-num-pulse {
  0%,
  100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.78;
    transform: scale(1.14);
  }
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
