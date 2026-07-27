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
          <!-- Eclipse: der Stern steht hinter der Sonne. Die Zeile hört auf, eine
               Restzeit zu zeigen, und wird zur Anzeige der Verdeckung selbst: ein
               leerer Rahmen über die ganze Balkenseite, in den vom Bildschirmrand
               her das Sonnenlicht zurückläuft. Beide Seiten treffen sich in dem
               Moment in der Mitte, in dem der Stern wieder hervortritt. -->
          <Transition name="bar-eclipse-fade">
            <div v-if="entry.isEclipsed" class="bar-eclipse" :style="{ '--p': entry.eclipseProgress }">
              <span class="bar-eclipse-fill" />
              <span class="bar-eclipse-front" />
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
              :style="{ '--p': entry.eclipseProgress }"
            >
              <span class="bar-eclipse-fill" />
              <span class="bar-eclipse-front" />
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
import { starEclipseProgress } from '../../utils/foregroundGate'
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

/**
 * Verdeckungsstand je Stern — nur Sterne hinter der Sonne stehen darin.
 *
 * Wie der Boss-Snapshot im Ticker fortgeschrieben, damit das Bar-Computed
 * unverändert höchstens 5×/s neu rechnet.
 *
 * Eine Verdeckung dauert je nach Bahntempo rund 4 s (Resource-Stern) bis 13 s
 * (Galaxieboss) — der verdeckte Bogen von ~3,06 rad geteilt durch die
 * Bahngeschwindigkeit mal `STAR_BEHIND_SUN_SPEED_MULTIPLIER`. Die Füllung
 * wandert also pro Tick um wenige Prozent; den Rest glättet die CSS-Transition.
 */
interface EclipseSnapshot {
  /** Anzeigeziel 0…1 — um einen Tick vorausgerechnet, siehe unten. */
  target: number
  /** Zuletzt gemessener Rohstand, Basis der Vorausrechnung im nächsten Tick. */
  raw: number
}

const eclipseSnapshot = shallowRef<Map<string, EclipseSnapshot>>(new Map())

function refreshEclipseSnapshot(): void {
  const prev = eclipseSnapshot.value
  const next = new Map<string, EclipseSnapshot>()

  for (const star of starGroupStore.activeStars) {
    const raw = starEclipseProgress(star.id)
    const before = prev.get(star.id)

    if (raw < 0) {
      // Der Stern ist hervorgetreten. Einen Tick lang voll stehen lassen: die
      // beiden Lichtfronten sollen die Mitte sichtbar erreichen, bevor die Bar
      // abtritt — dieser Moment IST die Aussage der Anzeige.
      if (before && before.target < 1) next.set(star.id, { target: 1, raw: 1 })
      continue
    }

    // Die CSS-Transition läuft genau einen Tick lang. Bekäme sie den JETZT
    // gemessenen Stand, liefe die Füllung dem Stern dauerhaft einen Tick
    // hinterher und stünde beim Austritt spürbar vor der Mitte. Sie bekommt
    // deshalb den Stand, den der Stern am ENDE des Ticks haben wird: Dann
    // interpoliert sie die tatsächliche Bewegung, statt ihr nachzulaufen.
    // Der Schritt wird aus dem letzten Tick gemessen statt aus der Bahn
    // gerechnet — so trägt er das Hochlerpen des Tempos hinter der Sonne
    // automatisch mit.
    const step = before ? Math.max(0, raw - before.raw) : 0
    next.set(star.id, { target: Math.min(1, raw + step), raw })
  }

  eclipseSnapshot.value = next
}
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
  refreshEclipseSnapshot()
  ticker = setInterval(() => {
    refreshBossSnapshot()
    refreshEclipseSnapshot()
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
  /** 0…1 durch die Verdeckung — treibt die Füllung des Eclipse-Balkens */
  eclipseProgress: number
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
  const raw: Omit<BarEntry, 'palette' | 'isRaging' | 'isEclipsed' | 'eclipseProgress'>[] = []
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
  return raw.map((entry, index) => {
    // Zustand und Fortschritt der Verdeckung kommen aus EINEM Snapshot, damit
    // „verdeckt" und „wie weit" nie auseinanderlaufen können. Er stammt aus
    // derselben Quelle wie das Kampf-Gate: Die Bar geht exakt in dem Moment in
    // den Schatten, in dem der Stern aufhört, Schaden zu nehmen, und ist exakt
    // dann voll, wenn er wieder hervortritt.
    const eclipse = eclipseSnapshot.value.get(entry.starId)
    return {
      ...entry,
      isRaging: entry.starId === ragingStarId,
      isEclipsed: eclipse !== undefined,
      eclipseProgress: eclipse?.target ?? 0,
      palette: (() => {
        const star = starGroupStore.activeStars.find((s) => s.id === entry.starId)
        if (entry.timeless && star) return rgbToPalette(star.starColor)
        if (!entry.isChampion) return palettes[index % palettes.length]
        const roleColor = star ? getStarRoleColor(star) : null
        return roleColor ? roleColorToPalette(roleColor) : championPalette
      })(),
    }
  })
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
  transition:
    transform 0.2s linear,
    opacity 0.3s ease;
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
   Medaillon zeigen. Hier bekommt er kein Abzeichen, sondern die ganze Zeile:
   Solange der Stern verdeckt ist, hat eine Restzeit ohnehin keine Bedeutung —
   es passiert nichts, bis er wieder hervortritt. Also hört die Bar auf, eine
   Restzeit zu zeigen, und zeigt stattdessen genau das eine, was jetzt zählt:
   wie lange die Verdeckung noch dauert.

   Das Bild dafür ist die Finsternis selbst. Übrig bleibt ein leerer, von der
   Korona umrissener Rahmen; von beiden Bildschirmrändern läuft das Sonnenlicht
   zurück nach innen. Wenn die beiden Fronten die Mitte erreichen, tritt der
   Stern hervor — die Anzeige ist damit nicht bloß Fortschritt, sondern ein Bild
   der Bewegung, die sie misst.

   Der Zustand steht bewusst ÜBER Fluch und Rage: Beide beschreiben, wie viel
   Schaden fließt — die Eclipse, dass gerade gar keiner fließt. */
.timer-bar-row--eclipsed {
  border-radius: 3px;
}

/* Der Rahmen: volle Balkenseite, nicht die Restzeit-Breite. Er ist der
   Behälter, den die Verdeckung füllt, und muss deshalb immer gleich groß sein. */
.bar-eclipse {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  width: 100%;
  /* Bewusst 0 und nicht 1: `.bar-edge-track` trägt ein transform und bildet
     damit einen eigenen Stacking-Kontext, der trotz seiner inneren z-index-2-
     Kugeln als Ganzes auf Ebene 0 gemalt wird. Jeder Wert > 0 legte den Rahmen
     über Kugeln und HP-Zahlen. Auf Ebene 0 entscheidet die DOM-Reihenfolge:
     nach der Füllung, vor dem Track — genau richtig. */
  z-index: 0;
  pointer-events: none;
  /* Kein eigenes overflow: `.bar-side` clippt bereits, und so darf die
     Lichtfront am Ende über die Innenkante hinausleuchten — genau dort, wo
     beide Seiten sich treffen. */
  border-radius: 0 3px 3px 0;
  /* Kühles Fast-Schwarz statt eines halbtransparenten Braun: ließe man die
     Farbe darunter durchscheinen, sähe die Zeile nur „abgedunkelt" aus. Der
     Kernschatten muss sie wirklich schlucken, damit das Gold als Korona liest. */
  background: linear-gradient(
    to bottom,
    rgba(8, 7, 14, 0.955) 0%,
    rgba(14, 11, 20, 0.965) 52%,
    rgba(5, 4, 10, 0.96) 100%
  );
  /* Korona als Rahmen: oben und unten kräftig (der Sonnenrand hinter der
     Scheibe), seitlich nur eine Haarlinie, damit die 14 px hohe Zeile auf
     Full HD nicht zum Kasten wird. Reihenfolge zählt — die Saumfarben liegen
     vor der umlaufenden Linie und überdecken sie oben und unten. */
  box-shadow:
    inset 0 2px 0 rgba(255, 242, 200, 0.95),
    inset 0 5px 7px -4px rgba(255, 200, 90, 0.7),
    inset 0 -2px 0 rgba(240, 156, 40, 0.8),
    inset 0 -5px 7px -4px rgba(232, 140, 30, 0.45),
    inset 0 0 0 1px rgba(214, 156, 70, 0.5),
    0 0 8px rgba(255, 200, 80, 0.4),
    0 0 18px rgba(232, 140, 30, 0.22);
}

.bar-eclipse--mirrored {
  right: 0;
  left: auto;
  border-radius: 3px 0 0 3px;
}

/* Das zurückkehrende Sonnenlicht. Wächst vom Bildschirmrand nach innen, also
   entgegen der normalen Füllung — beide Seiten laufen damit aufeinander zu.
   Der Verlauf wird von scaleX mitgestaucht, wodurch sein helles Ende immer an
   der Front sitzt, egal wie weit sie schon gelaufen ist. */
.bar-eclipse-fill {
  position: absolute;
  inset: 0;
  transform-origin: left center;
  transform: scaleX(var(--p, 0));
  border-radius: inherit;
  background: linear-gradient(to right, rgba(96, 50, 8, 0.92), #c07a1c 58%, #f2c664 100%);
  box-shadow:
    inset 0 1px 0 rgba(255, 240, 200, 0.3),
    inset 0 -1px 0 rgba(0, 0, 0, 0.35);
  /* Gleiche Dauer wie der 200-ms-Ticker, der --p neu setzt: die Füllung wandert
     dadurch stetig weiter, statt fünfmal je Sekunde zu springen. */
  transition: transform 0.2s linear;
  will-change: transform;
}

.bar-eclipse--mirrored .bar-eclipse-fill {
  transform-origin: right center;
  background: linear-gradient(to left, rgba(96, 50, 8, 0.92), #c07a1c 58%, #f2c664 100%);
}

/* Die Lichtfront. Eigenes Element statt eines Saums auf der Füllung: Die
   Füllung skaliert, ein Saum darauf würde mit ihr gestaucht und wäre bei
   niedrigem Fortschritt kaum noch da. Als reine Verschiebung bleibt die Front
   auf jeder Position exakt gleich scharf. */
.bar-eclipse-front {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  width: 100%;
  transform: translateX(calc(var(--p, 0) * 100%));
  transition: transform 0.2s linear;
  will-change: transform;
}

.bar-eclipse--mirrored .bar-eclipse-front {
  transform: translateX(calc(var(--p, 0) * -100%));
}

.bar-eclipse-front::after {
  content: '';
  position: absolute;
  top: -1px;
  bottom: -1px;
  left: 0;
  width: 3px;
  transform: translateX(-50%);
  background: linear-gradient(to bottom, #fff8e2, #ffd07a 52%, #e8a038);
  box-shadow:
    0 0 8px 1px rgba(255, 205, 110, 0.9),
    0 0 18px 4px rgba(255, 170, 60, 0.4);
}

.bar-eclipse--mirrored .bar-eclipse-front::after {
  left: auto;
  right: 0;
  transform: translateX(50%);
}

/* Restzeit-Füllung und alles, was an ihrer Kante hängt (Sekunden, Kugeln,
   HP-Zahlen, Typ-Label), treten für die Dauer der Verdeckung ab. Sie messen
   Dinge, die währenddessen stillstehen, und würden dem einen Balken, der jetzt
   etwas aussagt, nur die Aufmerksamkeit nehmen. */
.timer-bar-row--eclipsed .bar-fill,
.timer-bar-row--eclipsed .bar-edge-track,
.timer-bar-row--eclipsed .bar-type-label {
  opacity: 0;
}

/* Was unsichtbar ist, muss auch nicht mehr animiert werden. */
.timer-bar-row--eclipsed .bar-fill::after,
.timer-bar-row--eclipsed .planet-hp--critical {
  animation: none;
}

/* Nach den Typ-Hovern (Champion/Boss), damit die Korona-Outline auch auf einer
   Galaxieboss-Zeile den verdeckten Zustand spricht. */
.timer-bar-row--eclipsed:hover,
.timer-bar-row--eclipsed.star-hover-active {
  outline: 1px solid rgba(255, 210, 120, 0.5);
  outline-offset: 1px;
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
  /* Der Eclipse-Balken behält seine Transition: Sie glättet nur die 200-ms-
     Sprünge des Tickers zu der Bewegung, die der Stern tatsächlich macht — sie
     ist die Information, keine Dekoration. */
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
  /* opacity mit im Bunde, damit der Wechsel in den Eclipse-Zustand überblendet
     statt zu springen — die Bar tauscht dort ihre gesamte Aussage aus. */
  transition:
    transform 0.2s linear,
    opacity 0.3s ease;
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
