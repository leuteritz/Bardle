<template>
  <div ref="hostRef" class="star-timer-bars-host">
    <TransitionGroup name="bar-slide" tag="div" class="star-timer-bars">
      <div
        v-for="entry in sortedEntries"
        :key="entry.starId"
        :data-star-id="entry.starId"
        class="timer-bar-row"
        :class="{
          'timer-bar-row--cursed': entry.isCursed,
          'timer-bar-row--champion': entry.isChampion,
          'timer-bar-row--escort': entry.starType === 'boss_escort',
          'timer-bar-row--boss': entry.starType === 'galaxy_boss',
          'timer-bar-row--raging': entry.isRaging,
          'timer-bar-row--eclipsed': entry.isEclipsed,
          'timer-bar-row--joined': entry.joined,
          'star-hover-active': starGroupStore.hoveredTimerStarId === entry.starId,
        }"
        :style="entry.style"
        @click="starGroupStore.openStarFightModal(entry.starId)"
        @mouseenter="starGroupStore.setHoveredTimerStar(entry.starId)"
        @mouseleave="starGroupStore.setHoveredTimerStar(null)"
      >
        <div class="bar-side bar-side--left">
          <!-- Eclipse: der Stern steht hinter der Sonne. Die Balkenseite behält
               ihre Form — denselben Balken, der mit der Restzeit schrumpft und
               zur Mitte wandert —, verliert aber ihre Farbe an die Finsternis:
               `.bar-fill` selbst wird zum Rahmen. Darin läuft die Sternfarbe
               über die Dauer der Verdeckung von außen zurück; voll ist sie genau
               dann, wenn der Stern hervortritt.

               Die Füllung sitzt IM Balken statt daneben, weil beide dieselbe
               Geometrie haben: So skaliert sie automatisch mit der Restzeit mit,
               `--p` bleibt der Anteil am Rahmen, und der Zustand kostet ein
               einziges zusätzliches Element je Seite. -->
          <div class="bar-fill" :style="{ transform: `scaleX(${entry.fillRatio})` }">
            <Transition name="bar-eclipse-fade">
              <span
                v-if="entry.isEclipsed"
                class="bar-eclipse-fill"
                :style="{ transform: entry.tf.fill }"
              />
            </Transition>
          </div>
          <!-- Track-Wrapper wandern per transform (Compositor) statt per
               left/right (Layout + Paint pro Frame und Balken) -->
          <div
            v-if="entry.fillRatio > 0"
            class="bar-edge-track bar-edge-track--left"
            :style="{ transform: entry.tf.trackL }"
          >
            <!-- `v-ink-center.y` rückt die Zahl auf ihre optische Mitte: In
                 MedievalSharp stehen Ziffern fast vollständig über der
                 Baseline, mittig gesetzt sitzen sie dadurch sichtbar zu hoch.
                 Der nötige Versatz ist kein fester em-Wert, sondern wächst mit
                 dem Schriftgrad — genau deshalb stand der kleinere
                 Verdeckungs-Countdown neben der großen Restzeit schief.
                 `:key` erzwingt beim Wechsel des Zustands ein Neuaufsetzen:
                 Die Direktive misst die Schriftmerkmale beim Mounten, und mit
                 dem Zustand ändert sich der Schriftgrad. -->
            <span
              v-if="entry.secondsLabel !== null"
              :key="entry.isEclipsed ? 'eclipsed' : 'plain'"
              v-ink-center.y
              class="bar-seconds-label bar-seconds-label--left"
              >{{ entry.secondsLabel }}</span
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
          <span v-if="entry.timeless" class="bar-type-label">{{
            entry.starType === 'galaxy_boss' ? '✦ GALAXY BOSS ✦' : '☄ ESCORT'
          }}</span>
        </div>

        <div class="bar-center" />

        <div class="bar-side bar-side--right">
          <div
            class="bar-fill bar-fill--mirrored"
            :style="{ transform: `scaleX(${entry.fillRatio})` }"
          >
            <Transition name="bar-eclipse-fade">
              <span
                v-if="entry.isEclipsed"
                class="bar-eclipse-fill"
                :style="{ transform: entry.tf.fill }"
              />
            </Transition>
          </div>
          <div
            v-if="entry.fillRatio > 0"
            class="bar-edge-track bar-edge-track--right"
            :style="{ transform: entry.tf.trackR }"
          >
            <span
              v-if="entry.secondsLabel !== null"
              :key="entry.isEclipsed ? 'eclipsed' : 'plain'"
              v-ink-center.y
              class="bar-seconds-label bar-seconds-label--right"
              >{{ entry.secondsLabel }}</span
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
          <span v-if="entry.timeless" class="bar-type-label">{{
            entry.starType === 'galaxy_boss' ? '✦ GALAXY BOSS ✦' : '☄ ESCORT'
          }}</span>
        </div>
      </div>
    </TransitionGroup>

    <!-- Die Achse als durchgehende Zierleiste — gezeigt nur, wenn sich Zeilen
         auf ihr treffen. -->
    <Transition name="seam-fade">
      <StarTimerCenterSeam v-if="hasJoinedRows" />
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { hexToRgb } from '@/utils/ui/format'
import { ref, shallowRef, computed, watch, onMounted, onUnmounted } from 'vue'
import { useStarGroupStore } from '@/stores/world/starGroupStore'
import { usePlanetBossStore } from '@/stores/world/planetBossStore'
import { useRoleBehaviorStore } from '@/stores/battle/roleBehaviorStore'
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
  STAR_TIMER_CENTER_OVERLAP_PX,
  STAR_TIMER_WIDTH_SNAP_PX,
} from '@/config/constants'
import { CHAMPION_ROLES } from '@/config/champions/championData'
import { starEclipseState } from '@/utils/orbit/foregroundGate'
import { useHeaderCenterArc } from '@/composables/ui/useHeaderCenterArc'
import { centerArcSideWidth } from '@/utils/orbit/geometry'
import StarTimerCenterSeam from './StarTimerCenterSeam.vue'
import type { StarGroup } from '@/stores/world/starGroupStore'
import type { StarType } from '@/types'

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
  /** Ganze Sekunden bis zum Wiederauftauchen — der Countdown neben dem Balken. */
  secondsLeft: number
}

const eclipseSnapshot = shallowRef<Map<string, EclipseSnapshot>>(new Map())

function refreshEclipseSnapshot(): void {
  const prev = eclipseSnapshot.value
  const next = new Map<string, EclipseSnapshot>()

  for (const star of starGroupStore.activeStars) {
    const state = starEclipseState(star.id)
    const before = prev.get(star.id)

    if (state === null) {
      // Der Stern ist hervorgetreten. Einen Tick lang voll stehen lassen: die
      // beiden Lichtfronten sollen die Mitte sichtbar erreichen, bevor die Bar
      // abtritt — dieser Moment IST die Aussage der Anzeige. Der Countdown
      // steht dabei auf 0, dem Wert, auf den er die ganze Zeit zugelaufen ist.
      if (before && before.target < 1) next.set(star.id, { target: 1, raw: 1, secondsLeft: 0 })
      continue
    }
    const raw = state.progress

    // Die CSS-Transition läuft genau einen Tick lang. Bekäme sie den JETZT
    // gemessenen Stand, liefe die Füllung dem Stern dauerhaft einen Tick
    // hinterher und stünde beim Austritt spürbar vor der Mitte. Sie bekommt
    // deshalb den Stand, den der Stern am ENDE des Ticks haben wird: Dann
    // interpoliert sie die tatsächliche Bewegung, statt ihr nachzulaufen.
    // Der Schritt wird aus dem letzten Tick gemessen statt aus der Bahn
    // gerechnet — so trägt er das Hochlerpen des Tempos hinter der Sonne
    // automatisch mit.
    const step = before ? Math.max(0, raw - before.raw) : 0
    next.set(star.id, {
      target: Math.min(1, raw + step),
      raw,
      // Aufgerundet wie jeder Countdown im Spiel (`fmtMs`): Die angezeigte Zahl
      // ist die Sekunde, die gerade läuft, nicht die schon vergangene. Um einen
      // Tick vorausgerechnet wie die Füllung darüber — sonst stünde die Zahl
      // noch auf 1, während der Balken schon voll ist, und beide Anzeigen
      // desselben Moments widersprächen sich.
      secondsLeft: Math.max(0, Math.ceil((state.remainingMs - STAR_TIMER_TICK_MS) / 1000)),
    })
  }

  eclipseSnapshot.value = next
}
// ── Wie weit reicht eine Bar nach innen? ───────────────────────────────────
// Bis an die Bogenkante des Header-Ovals — aber jede Zeile hängt tiefer und
// trifft den Bogen dort, wo er schmaler ist. Die unterste Zeile innerhalb des
// Ovals reicht also am weitesten, und Zeilen unterhalb davon laufen bis zur
// Mitte des Headers durch, wo sie sich berühren.
//
// Der Ausschlag ist die UNTERkante der Zeile: Auf ihrer Höhe ist das Oval für
// diese Zeile am schmalsten, sodass die senkrechte Balkenkante über die ganze
// restliche Zeilenhöhe hinter dem Oval liegt. Bei ablaufender Restzeit
// schrumpft die Bar damit gegen genau diesen Punkt und verschwindet dort im
// Oval, statt neben ihm als Strich stehenzubleiben.
const hostRef = ref<HTMLElement | null>(null)
const { headerCenterArc } = useHeaderCenterArc()

/**
 * Stern-ID → Tiefe der Zeilenunterkante unter der Header-Kante.
 *
 * Gemessen statt gerechnet: Die Zeilenhöhen skalieren flüssig mit dem Viewport,
 * die Galaxieboss-Zeile ist höher als die übrigen, und beim Nachrücken eines
 * geretteten Sterns wandert jede Zeile darunter eine Position hoch. Aus dem DOM
 * gelesen stimmt die Zuordnung in all diesen Fällen von selbst — nachgebildet
 * müsste sie jede dieser Regeln doppelt führen.
 */
const rowBottoms = shallowRef<Map<string, number>>(new Map())

/**
 * Auf das nächste Raster AUFgerundet, nie ab: Die Rasterung soll die Breite nur
 * nach innen verschieben, also unter das Oval. Abrunden würde die Balkenkante
 * nach außen schieben und genau den Spalt öffnen, den die Überlappung schließen
 * soll — nahe dem unteren Scheitel verläuft der Bogen so steil, dass schon ein
 * Bruchteil eines Pixels sichtbar würde.
 */
function snapPx(v: number): number {
  return Math.ceil(v / STAR_TIMER_WIDTH_SNAP_PX) * STAR_TIMER_WIDTH_SNAP_PX
}

function measureRowBottoms(): void {
  const host = hostRef.value
  if (!host) return

  const hostTop = host.getBoundingClientRect().top
  const next = new Map<string, number>()
  for (const el of host.querySelectorAll<HTMLElement>('.timer-bar-row[data-star-id]')) {
    const rect = el.getBoundingClientRect()
    // Eine gerade eintretende Zeile steht noch auf max-height 0. Sie ist in
    // diesem Frame unsichtbar; ihre echte Tiefe kommt mit der nächsten Messung.
    if (rect.height <= 0) continue
    // Ungerastert: Der Bogen ist an dieser Stelle so steil, dass ein halber
    // Pixel Tiefe die Breite um fast einen ganzen verschöbe. Stabil bleibt die
    // Ausgabe durch die Rasterung der Breite, nicht die der Tiefe.
    next.set(el.dataset.starId!, rect.bottom - hostTop)
  }

  const prev = rowBottoms.value
  if (prev.size === next.size) {
    let unchanged = true
    for (const [id, y] of next) {
      if (prev.get(id) !== y) {
        unchanged = false
        break
      }
    }
    if (unchanged) return
  }
  rowBottoms.value = next
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
let hostObserver: ResizeObserver | null = null
onMounted(() => {
  refreshBossSnapshot()
  refreshEclipseSnapshot()
  measureRowBottoms()
  // Die Zeilentiefen hängen an der Höhe des Stapels: Sie ändern sich, wenn eine
  // Zeile ein- oder ausblendet — und dann über die ganze Dauer der Animation,
  // Frame für Frame. Genau das meldet der Observer, und in Ruhe meldet er
  // nichts. Im Ticker mitzumessen hätte dieselben 30 Zeilen fünfmal je Sekunde
  // abgefragt, um fast immer denselben Wert zu bestätigen.
  hostObserver = new ResizeObserver(() => measureRowBottoms())
  if (hostRef.value) hostObserver.observe(hostRef.value)

  ticker = setInterval(() => {
    refreshBossSnapshot()
    refreshEclipseSnapshot()
    now.value = Date.now()
  }, STAR_TIMER_TICK_MS)
})
onUnmounted(() => {
  if (ticker) clearInterval(ticker)
  hostObserver?.disconnect()
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
  /**
   * Beide Hälften treffen sich auf der Mittelachse — die Zeile hängt unterhalb
   * des Header-Ovals, wo keine Rundung mehr dazwischen liegt. Nur dann bekommt
   * der Stoß eine Fassung; darüber verschwindet er ohnehin hinter dem Oval.
   */
  joined: boolean
  /** Stern fliegt hinter der Sonne — kein Schaden fließt, Bar geht in Umbra */
  isEclipsed: boolean
  /** 0…1 durch die Verdeckung — treibt die Füllung des Eclipse-Balkens */
  eclipseProgress: number
  /**
   * Die Zahl an der Balkenkante — während der Verdeckung der Countdown bis zum
   * Wiederauftauchen, sonst die Restzeit des Sterns. `null`, wenn keine Zahl
   * gezeigt wird (Endkampf-Bars laufen nicht ab).
   *
   * Beide Zeiten teilen sich denselben Platz, weil sie dasselbe beantworten:
   * wie lange dauert der Zustand noch, in dem die Zeile gerade steht.
   */
  secondsLabel: number | null
  planets: PlanetDot[]
  /** Teilmenge von `planets`, die gerade eine HP-Zahl zeigt — hinten in der Bar */
  hpLabels: PlanetDot[]
  /**
   * Die STATISCHEN CSS-Variablen der Zeile: Palette und Zustandsfarben, von
   * allem darunter geerbt. Sie ändern sich praktisch nie, weshalb sie hier oben
   * nichts kosten — Vue schreibt sie nur bei echter Änderung.
   *
   * Die laufenden Werte stehen bewusst NICHT hier, sondern als fertige
   * transforms an den Elementen selbst — siehe `tf`.
   */
  style: Record<string, string | number>
  /**
   * Fertige transform-Strings für alles, was sich pro Tick bewegt.
   *
   * Sie hängen direkt am bewegten Element statt als Custom Property an dessen
   * Container. Der Grund ist gemessen: Eine Custom Property zu ändern
   * invalidiert den Style des gesamten Subtrees darunter. `--fill` am
   * Track-Wrapper zog so bei jedem Tick dessen ~10 Nachkommen (Sekunden,
   * Kugeln, HP-Zahlen) in den Recalc — bei 30 Sternen und zwei Seiten 600
   * Elemente, fünfmal je Sekunde. Ein inline-transform betrifft nur das
   * Element, an dem er steht.
   */
  tf: {
    /** Track-Wrapper — wandert mit der Füllkante nach innen. */
    trackL: string
    trackR: string
    /** Zurückkehrendes Licht im Rahmen — Anteil an der Verdeckung. */
    fill: string
  }
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
  const raw: Omit<
    BarEntry,
    | 'palette'
    | 'isRaging'
    | 'joined'
    | 'isEclipsed'
    | 'eclipseProgress'
    | 'secondsLabel'
    | 'style'
    | 'tf'
  >[] = []
  // Nachschlagen statt Suchen: die Palette-Zuweisung unten braucht den Stern zu
  // jeder Zeile. Mit `find` wäre das O(n²) — bei 30 Sternen 900 Vergleiche in
  // jedem Tick, nur um Farben zu bestimmen.
  const starById = new Map(starGroupStore.activeStars.map((s) => [s.id, s]))
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
    const star = starById.get(entry.starId)
    const palette = entry.timeless && star
      ? rgbToPalette(star.starColor)
      : !entry.isChampion
        ? palettes[index % palettes.length]
        : (() => {
            const roleColor = star ? getStarRoleColor(star) : null
            return roleColor ? roleColorToPalette(roleColor) : championPalette
          })()

    const style: Record<string, string | number> = {
      '--c1': palette.outer,
      '--c2': palette.mid,
      '--c3': palette.inner,
      '--glow': palette.glow,
    }
    if (entry.isCursed) style['--curse-ratio'] = entry.curseRatio
    if (entry.isChampion) style['--champ-outline'] = palette.mid + '44'

    // Die Zeile endet dort, wo das Header-Oval auf ihrer Höhe endet. Solange
    // noch keine Tiefe gemessen ist (allererster Frame einer neuen Zeile), bleibt
    // die Angabe weg und die CSS-Regel greift — sichtbar wird das nie, weil die
    // Zeile in diesem Frame noch eingeblendet wird.
    const arc = headerCenterArc.value
    const rowBottom = rowBottoms.value.get(entry.starId)
    let joined = false
    if (arc && rowBottom !== undefined) {
      // Gerastert wird VOR dem Deckeln: Sonst schöbe das Aufrunden die Seiten
      // über die Achse hinaus und beide Hälften überlappten sich in der Mitte.
      const sideWidth = Math.min(
        arc.cx,
        snapPx(centerArcSideWidth(arc, rowBottom) + STAR_TIMER_CENTER_OVERLAP_PX),
      )
      // `minmax(0, 1fr)` statt `1fr`: Unterhalb des Ovals gehen die Seiten bis
      // zur Achse, die Mittelspalte also auf 0. Ein blankes `1fr` hätte dort
      // seine Inhaltsmindestbreite behauptet und beide Seiten zurückgedrängt.
      style.gridTemplateColumns = `${sideWidth}px minmax(0, 1fr) ${sideWidth}px`
      // Unter dem Oval stoßen die beiden Hälften auf der Achse aufeinander.
      // Ohne Füllung gibt es nichts zu verbinden — dann bleibt die Naht weg.
      joined = sideWidth >= arc.cx && entry.fillRatio > 0
    }

    const trackPct = (1 - entry.fillRatio) * 100
    const tf = {
      trackL: `translateX(${trackPct}%)`,
      trackR: `translateX(${-trackPct}%)`,
      fill: `scaleX(${eclipse?.target ?? 0})`,
    }

    return {
      tf,
      ...entry,
      isRaging: entry.starId === ragingStarId,
      joined,
      isEclipsed: eclipse !== undefined,
      eclipseProgress: eclipse?.target ?? 0,
      secondsLabel: eclipse ? eclipse.secondsLeft : entry.timeless ? null : entry.secondsInt,
      palette,
      style,
    }
  })
})

/**
 * Trifft sich überhaupt eine Zeile auf der Achse? Nur dann wird die Zierlinie
 * gezeigt — ohne Treffpunkt hätte sie nichts zu markieren.
 */
const hasJoinedRows = computed(() => sortedEntries.value.some((e) => e.joined))

// Kommt eine Zeile hinzu, fällt eine weg oder tauschen zwei die Reihenfolge,
// liegen die Tiefen sofort neu — ohne bis zum nächsten Ticker zu warten, denn
// bis dahin trüge eine nachgerückte Zeile noch die Breite ihrer alten Position.
// `flush: 'post'` läuft nach dem DOM-Patch, misst also den neuen Stand.
watch(
  () => sortedEntries.value.map((e) => e.starId).join('|'),
  () => measureRowBottoms(),
  { flush: 'post' },
)
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
  /* Die tatsächlichen Spalten setzt das Script je Zeile — sie hängen davon ab,
     wie tief die Zeile unter der Header-Kante liegt und wo das Mittel-Oval
     dort endet. Dieser Wert gilt nur, bis der Header einmal vermessen ist. */
  grid-template-columns: 1fr 0px 1fr;
  align-items: center;
  /* Flüssig skaliert für 1280px (~14px) bis 2560px (~21px) Viewport-Breite */
  height: clamp(14px, 0.5vw + 7.6px, 22px);
  width: 100%;
  overflow: hidden;
  cursor: pointer;
  pointer-events: auto;
  /* Jede Zeile ist ihre eigene Style- und Layout-Insel: Was sich in einer Bar
     ändert, kann keine Berechnung außerhalb auslösen. Bei 30 Zeilen, die
     fünfmal je Sekunde ihre Werte neu bekommen, ist das der Unterschied
     zwischen dreißig kleinen Recalcs und einem großen über den ganzen Header.
     Bewusst ohne `paint`: der Schein der Balken darf über die Zeile
     hinausleuchten. */
  contain: layout style;
}

/* Die Mittelachse als senkrechte Zierleiste liegt in `StarTimerCenterSeam` —
   ein einziges Element für den ganzen Stapel statt einer Markierung je Zeile.
   Hier bleibt nur ihr Ein- und Ausblenden. */
.seam-fade-enter-active,
.seam-fade-leave-active {
  transition: opacity 0.25s ease;
}

.seam-fade-enter-from,
.seam-fade-leave-to {
  opacity: 0;
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

/* Ohne `!important`: Die Regel steht nach `.bar-side--left .bar-fill` und
   `.bar-fill` und gewinnt in ihrer eigenen Seite ohnehin. Erzwungen würde sie
   dagegen auch den Eclipse-Rahmen überstimmen, der dieselbe Füllung umfärbt. */
.bar-fill--mirrored {
  right: 0;
  left: auto;
  transform-origin: left center;
  background: linear-gradient(to left, var(--c1) 0%, var(--c2) 56%, var(--c3) 100%);
  border-radius: 3px 0 0 3px;
}

/* Der Platzhalter zwischen den beiden Balkenseiten — er hält die Grid-Spalte,
   die das Mittel-Oval einnimmt. Ohne Innenabstand, denn unterhalb des Ovals
   geht diese Spalte auf 0: Ein Padding würde die Zeile dort überlaufen lassen,
   statt die Seiten sauber in der Mitte zusammentreffen zu lassen. */
.bar-center {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 0;
  height: 100%;
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

/* ── Der Treffpunkt: wo beide Hälften auf der Achse zusammenkommen ──────────
   Unterhalb des Ovals liegt keine Rundung mehr zwischen den Seiten, sie stoßen
   direkt aneinander. Beide Verläufe enden dort mit ihrem HELLSTEN Ton, sodass
   in der Mitte ein breiter, strukturloser Lichtfleck entsteht — und die beiden
   Innenradien schnüren ihn zusätzlich zu einer Taille ein. Der Stoß liest sich
   damit als Versehen.

   Beantwortet wird das nicht je Zeile, sondern einmal für den ganzen Stapel:
   von einer senkrechten Zierlinie auf der Achse (`.center-seam`). Sie setzt
   dort an, wo das Level-Badge endet, und läuft nach unten durch alle Zeilen,
   die sich in der Mitte treffen. Damit steht die Achse als durchgehende Linie
   im Bild, statt in jeder Zeile neu behauptet zu werden — und der Stoß liest
   sich als Punkt AUF dieser Linie statt als Zufall.

   Die Radien der Innenkanten fallen weg: Sonst schnürten die beiden 3px-Ecken
   den Treffpunkt zu einer Taille ein, die auch unter der Linie als Kerbe an
   Ober- und Unterkante stehenbliebe. */
.timer-bar-row--joined .bar-side--left .bar-fill,
.timer-bar-row--joined .bar-fill--mirrored {
  border-radius: 0;
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
  color: var(--c3);
  filter: drop-shadow(0 0 6px var(--glow)) drop-shadow(0 0 2px rgba(0, 0, 0, 0.9));
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
    filter: drop-shadow(0 0 6px var(--glow)) drop-shadow(0 0 2px rgba(0, 0, 0, 0.9));
  }
  50% {
    filter: drop-shadow(0 0 12px var(--glow)) drop-shadow(0 0 4px var(--glow))
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
   Solange der Stern verdeckt ist, hat eine Restzeit-FÜLLUNG keine Bedeutung —
   es passiert nichts, bis er wieder hervortritt. Also behält die Bar ihre Form,
   tauscht aber ihren Inhalt: Der Rahmen schrumpft weiter mit der Restzeit zur
   Mitte, und in ihm läuft die Sternfarbe über die Dauer der Verdeckung von
   außen zurück. Voll ist er genau dann, wenn der Stern hervortritt — die
   Anzeige ist damit nicht bloß Fortschritt, sondern ein Bild der Bewegung, die
   sie misst.

   Der Zustand kostet genau EIN zusätzliches Element je Balkenseite: `.bar-fill`
   wechselt selbst in den Rahmen-Look, statt einen zweiten, deckungsgleichen
   Rahmen daneben zu stellen. Das ist bei 30 Sternen der Unterschied zwischen 30
   und 90 zusätzlich animierten Ebenen — und `.bar-fill` bringt Geometrie,
   Ursprung, Radius und Transition ohnehin mit.

   Bewusst OHNE `will-change`: Bei 30 Sternen ist rund die Hälfte gleichzeitig
   verdeckt. Die laufende transform-Transition promotet ohnehin für ihre Dauer,
   und die läuft hier praktisch durchgehend.

   Der Zustand steht bewusst ÜBER Fluch und Rage: Beide beschreiben, wie viel
   Schaden fließt — die Eclipse, dass gerade gar keiner fließt. */
.timer-bar-row--eclipsed {
  border-radius: 3px;
}

/* Die Füllung wird zum Rahmen: Farbe raus, Kernschatten rein, Korona als Saum.
   Kühles Fast-Schwarz statt eines halbtransparenten Braun — ließe man die Farbe
   durchscheinen, sähe die Zeile nur „abgedunkelt" aus statt verfinstert.

   Der Saum liegt nur oben und unten: Vertikale Offsets überstehen das scaleX
   unverzerrt, eine seitliche Linie würde mit dem Balken schrumpfen und bei
   kleiner Restzeit zu einem Bruchteil eines Pixels verkommen. Die senkrechten
   Kanten zeichnen stattdessen die Enden dieser beiden Linien.

   Übergang auf Farbe und Schatten, damit der Wechsel nicht umspringt. Er läuft
   nur bei Ein- und Austritt, nicht im Takt des Tickers. */
.timer-bar-row--eclipsed .bar-fill {
  /* Schlägt Eskorten-Glut und Boss-Atem: Beide animieren box-shadow, und eine
     laufende Animation gewinnt gegen jede normale Deklaration — der Korona-Saum
     unten wäre sonst auf genau diesen Zeilen nicht zu sehen. */
  animation: none;
  background: linear-gradient(
    to bottom,
    rgba(8, 7, 14, 0.955) 0%,
    rgba(14, 11, 20, 0.965) 52%,
    rgba(5, 4, 10, 0.96) 100%
  );
  box-shadow:
    inset 0 2px 0 rgba(255, 242, 200, 0.95),
    inset 0 5px 7px -4px rgba(255, 200, 90, 0.7),
    inset 0 -2px 0 rgba(240, 156, 40, 0.8),
    inset 0 -5px 7px -4px rgba(232, 140, 30, 0.45),
    0 0 8px rgba(255, 200, 80, 0.4),
    0 0 18px rgba(232, 140, 30, 0.22);
}

/* Das zurückkehrende Licht — in der Farbe des Sterns, nicht in einer eigenen:
   Die Zeile gewinnt genau die Füllung zurück, die sie an die Finsternis
   verloren hat. Als Kind der Füllung skaliert sie mit ihr, `--p` ist damit
   automatisch der Anteil AM RAHMEN und nicht an der Balkenseite. Sie wächst vom
   äußeren Ende nach innen, sodass beide Seiten aufeinander zulaufen.

   Die Lichtkante steckt im Verlauf statt in einem eigenen Element: Ein
   zusätzliches Element bräuchte eine eigene Transition und eine eigene
   Compositor-Ebene je Seite. Als Verlaufsende staucht sie zwar mit — weil sie
   ein weicher Übergang ist und keine harte Linie, fällt das nicht auf. */
.bar-eclipse-fill {
  position: absolute;
  inset: 0;
  transform-origin: left center;
  border-radius: inherit;
  background: linear-gradient(
    to right,
    var(--c1) 0%,
    var(--c2) 52%,
    var(--c3) 88%,
    #fff8e2 100%
  );
  box-shadow:
    inset 0 1px 0 rgba(255, 236, 190, 0.18),
    inset 0 -1px 0 rgba(0, 0, 0, 0.22),
    0 0 10px 2px rgba(255, 190, 90, 0.35);
  /* Gleiche Dauer wie der Ticker, der den Wert neu setzt: die Kante wandert
     dadurch stetig weiter, statt fünfmal je Sekunde zu springen. */
  transition: transform 0.2s linear;
}

.bar-side--right .bar-eclipse-fill {
  transform-origin: right center;
  background: linear-gradient(
    to left,
    var(--c1) 0%,
    var(--c2) 52%,
    var(--c3) 88%,
    #fff8e2 100%
  );
}

/* Kugeln, HP-Zahlen und Typ-Label treten für die Dauer der Verdeckung ab: Sie
   messen Dinge, die währenddessen stillstehen. Die Zahl an der Kante bleibt —
   sie wechselt nur, worauf sie zählt (siehe `secondsLabel`). */
.timer-bar-row--eclipsed .planet-dots,
.timer-bar-row--eclipsed .bar-type-label {
  opacity: 0;
}

/* ── Der Countdown der Verdeckung: dieselbe Stelle, andere Rolle ────────────
   An der Balkenkante stehen zwei ganz verschiedene Zeiten: wie lange der Stern
   noch DA ist, und wie lange er noch hinter der Sonne steckt. Über die Farbe
   allein waren sie kaum zu trennen — zwei gleich große, gleich fette Zahlen
   in benachbarten Zeilen lesen sich als dieselbe Größe.

   Der Unterschied liegt jetzt im Schriftgrad: Die Restzeit des Sterns steht
   groß, fett und im hellsten Ton der Palette, der Verdeckungs-Countdown
   deutlich kleiner, leichter und in Koronafarbe. Beide bleiben freistehend —
   ohne Fläche, ohne Rahmen, wie jede andere Zahl in der Bar.

   Steht nach den Fluch- und Rage-Regeln: Ein Stern kann verflucht sein und
   rasen, aber solange er verdeckt ist, passiert nichts davon. */
.timer-bar-row--eclipsed .bar-seconds-label {
  /* Rund 78 % der freien Zahl — der Größenunterschied trägt die Unterscheidung
     jetzt allein, muss also deutlicher ausfallen, ohne in der nur ~14 px hohen
     Zeile auf Full HD unleserlich zu werden. */
  font-size: clamp(0.61rem, 0.23vw + 0.4rem, 0.8rem);
  font-weight: 700;
  color: #ffe6b0;
  filter: drop-shadow(0 0 6px rgba(255, 190, 70, 0.8)) drop-shadow(0 0 2px rgba(0, 0, 0, 0.95));
}

/* Der Rage-Überzug liegt auf der Füllung, die jetzt der Rahmen ist — er muss
   also aktiv verschwinden. `animation: none` allein reichte nicht: Ohne
   Keyframes fiele er auf seine volle Deckkraft zurück und färbte den
   Kernschatten rot. Der Puls der kritischen HP-Zahl ruht mit; sie ist während
   der Verdeckung ohnehin ausgeblendet. */
.timer-bar-row--eclipsed .bar-fill::after {
  animation: none;
  opacity: 0;
}

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

/* Die Verschiebung selbst kommt als fertiger inline-transform aus dem Script —
   siehe `tf` dort. Hier stehen nur noch die Eigenschaften, die sich nie
   ändern. */

/* Die Restzeit des Sterns — die Hauptzahl der Zeile. Sie steht frei auf dem
   dunklen Grund neben der Füllung und trägt den hellsten Ton der Palette:
   Gegen den gefassten Verdeckungs-Countdown (weiter unten) muss sie sich als
   das Dringlichere behaupten, und dafür ist Helligkeit in der schmalen Zeile
   das einzige Mittel, das keine zusätzliche Höhe kostet. */
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
  /* Tabellenziffern: Ohne sie wechselt die Zahl bei jedem Sekundenschritt ihre
     Breite und zappelt seitlich — bei 30 Zeilen ein unruhiges Bild. */
  font-variant-numeric: tabular-nums;
  color: var(--c3);
  filter: drop-shadow(0 0 7px var(--glow)) drop-shadow(0 0 2px rgba(0, 0, 0, 0.95));
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
  /* Überblenden statt springen, wenn der Stern in die Verdeckung eintaucht */
  transition: opacity 0.3s ease;
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
     und 2K von 0.079em auf 0.117em (siehe utils/ui/textInkOffset.ts). Die alten
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
