import type { OmenDef, OmenDomain, TimedBuffEffects } from '@/types'

// ═════════════════════════════════════════════════════════════════════════════
// OMENS OF THE CARETAKER — der Katalog der Vorzeichen
//
// Der Kosmos kündigt an, Bard folgt EINEM. Das ist die Zeitskala, die dem Spiel
// bis dahin fehlte: die Chronicle registriert nur, was ohnehin geschieht, und
// eine Expedition läuft von selbst ab. Ein Vorzeichen dagegen verlangt eine
// Entscheidung und richtet danach für ein paar Minuten aus, worauf gespielt
// wird.
//
// ── Die eine Regel, die das System trägt ────────────────────────────────────
// Ein Vorzeichen misst in System A und zahlt in System B. Wer Sterne rettet,
// findet danach mehr Material; wer Bosse fällt, produziert mehr Chimes. Das ist
// bewusst das GEGENTEIL der Chronicle, die in dasselbe System zurückzahlt, in
// dem sie misst (Drifter → Drifter-Buffs, Forge → Forge-Rabatt): die eine
// belohnt Vertiefung, die andere Breite. Nebeneinander decken sie beide
// Spielweisen ab — dieselbe Belohnungsrichtung in beiden hätte eine der zwei
// überflüssig gemacht.
//
// Deshalb ist `domain` kein Zierrat: der Store zieht die drei Karten aus DREI
// verschiedenen Domänen, sonst stünde dreimal dieselbe Beschäftigung zur Wahl.
//
// ── Zielmengen ──────────────────────────────────────────────────────────────
// Absolut, nicht mitwachsend. „Fälle vier Bosse" bleibt in Galaxie 12 dieselbe
// Aufgabe wie in Galaxie 1 — sie geht nur schneller, und genau das ist der
// spürbare Lohn des Fortschritts. Einzige Ausnahme sind Chimes, deren
// Größenordnung um Zehnerpotenzen wandert; dort steht `targetFromCpsSeconds`.
//
// Die Fristen liegen bei rund zwei Dritteln dessen, was das Ziel im mittleren
// Spiel braucht: pünktlich ist etwas wert, aber nichts geht verloren.
// ═════════════════════════════════════════════════════════════════════════════

export const OMENS: OmenDef[] = [
  // ── Cosmos ─────────────────────────────────────────────────────────────────
  {
    id: 'dimming',
    name: 'The Dimming',
    blurb: 'Lights are going out along the drift.',
    objective: 'Pull {n} stars back out of the dark',
    icon: 'game-icons:eclipse',
    color: '#d0a8f0',
    domain: 'cosmos',
    metric: 'starsRescued',
    target: 3,
    unit: 'stars',
    deadlineSec: 420,
    reward: { durationSec: 300, effects: { materialDropMult: 1.5 } },
  },
  {
    id: 'scatteringWinds',
    name: 'Scattering Winds',
    blurb: 'The current is carrying loose things past.',
    objective: 'Catch {n} drifters crossing the orbit',
    icon: 'game-icons:whirlwind',
    color: '#68c0a8',
    domain: 'cosmos',
    metric: 'driftersCollected',
    target: 4,
    unit: 'drifters',
    deadlineSec: 360,
    reward: { durationSec: 240, effects: { combatDpsMult: 1.4 } },
  },

  // ── Combat ─────────────────────────────────────────────────────────────────
  {
    id: 'tideOfRuin',
    name: 'Tide of Ruin',
    blurb: 'Something has been feeding on the worlds out here.',
    objective: 'Put down {n} planet bosses',
    icon: 'game-icons:skull-crossed-bones',
    color: '#e07868',
    domain: 'combat',
    metric: 'bossesDefeated',
    target: 4,
    unit: 'bosses',
    deadlineSec: 420,
    reward: { durationSec: 300, effects: { cpsMult: 1.6 } },
  },
  {
    id: 'trialByRift',
    name: 'Trial by Rift',
    blurb: 'The ladder is watching how this run ends.',
    objective: 'Win {n} ranked battles',
    icon: 'game-icons:portal',
    color: '#7ab8f0',
    domain: 'combat',
    metric: 'battleWins',
    target: 2,
    unit: 'wins',
    deadlineSec: 600,
    reward: { durationSec: 360, effects: { materialDropMult: 1.6 } },
  },
  {
    id: 'redHarvest',
    name: 'Red Harvest',
    blurb: 'Old debts are being settled on the rift.',
    objective: 'Land {n} champion kills',
    icon: 'game-icons:bloody-sword',
    color: '#cc6050',
    domain: 'combat',
    metric: 'championKills',
    target: 25,
    unit: 'kills',
    deadlineSec: 480,
    reward: { durationSec: 300, effects: { cpcMult: 2 } },
  },

  // ── Economy ────────────────────────────────────────────────────────────────
  {
    id: 'wakingHand',
    name: 'The Waking Hand',
    blurb: 'The cosmos answers what is touched, not what is watched.',
    objective: 'Strike the sun {n} times',
    icon: 'game-icons:open-palm',
    color: '#e8c040',
    domain: 'economy',
    metric: 'clicks',
    target: 150,
    unit: 'strikes',
    deadlineSec: 240,
    reward: { durationSec: 300, effects: { xpMult: 1.6 } },
  },
  {
    id: 'hoardOfAges',
    name: 'Hoard of Ages',
    blurb: 'A weight of chimes is wanted, and soon.',
    // Die einzige Zielmenge, die aus der Produktion kommt — siehe Kopf.
    objective: 'Gather {n} chimes',
    icon: 'game-icons:gold-stack',
    color: '#f0c860',
    domain: 'economy',
    metric: 'chimesEarned',
    target: 2_000,
    targetFromCpsSeconds: 420,
    unit: 'chimes',
    deadlineSec: 300,
    reward: { durationSec: 240, effects: { combatDpsMult: 1.5 } },
  },
  {
    id: 'siftingVoid',
    name: 'Sifting the Void',
    blurb: 'What the dark keeps can still be taken back.',
    objective: 'Recover {n} materials',
    icon: 'game-icons:crystal-cluster',
    color: '#9ad0e0',
    domain: 'economy',
    metric: 'materialsCollected',
    target: 30,
    unit: 'materials',
    deadlineSec: 420,
    reward: { durationSec: 300, effects: { xpMult: 1.5 } },
  },

  // ── Roster ─────────────────────────────────────────────────────────────────
  {
    id: 'ascendantPath',
    name: 'Ascendant Path',
    blurb: 'Someone in the company is ready for more.',
    objective: 'Raise {n} champion levels',
    icon: 'game-icons:stairs-goal',
    color: '#9a6fd0',
    domain: 'roster',
    metric: 'championLevelsGained',
    target: 6,
    unit: 'levels',
    deadlineSec: 480,
    reward: { durationSec: 300, effects: { cpsMult: 1.5 } },
  },
  {
    id: 'gatheringFlock',
    name: 'The Gathering Flock',
    blurb: 'Small voices are finding their way to you.',
    objective: 'Guide in {n} meeps',
    icon: 'game-icons:meeple-group',
    color: '#8ad080',
    domain: 'roster',
    metric: 'meepsEarned',
    target: 4,
    unit: 'meeps',
    deadlineSec: 420,
    reward: { durationSec: 240, effects: { cpcMult: 1.8 } },
  },

  // ── Expedition ─────────────────────────────────────────────────────────────
  {
    id: 'farWanderings',
    name: 'Far Wanderings',
    blurb: 'The long roads are open, and they are asking.',
    objective: 'Bring {n} expeditions home',
    icon: 'game-icons:footsteps',
    color: '#d8a860',
    domain: 'expedition',
    metric: 'expeditionsCompleted',
    target: 2,
    unit: 'expeditions',
    deadlineSec: 600,
    reward: { durationSec: 360, effects: { cpsMult: 1.45 } },
  },
]

/** Ein Vorzeichen nach seiner ID. */
export function getOmen(id: string): OmenDef | undefined {
  return OMENS.find((o) => o.id === id)
}

/** Jede Domäne, die im Katalog wirklich vorkommt — die Grundlage der
 *  Angebots-Ziehung, die aus drei verschiedenen davon zieht. */
export const OMEN_DOMAINS: OmenDomain[] = [...new Set(OMENS.map((o) => o.domain))]

/**
 * Was eine Buff-Achse dem Spieler sagt. Wortgleich zu den Drifter-Labels, damit
 * ein Chip in der Buff-Leiste sich nicht danach liest, WOHER er kommt — die
 * Herkunft erzählen Icon und Farbe.
 */
export const OMEN_BUFF_EFFECT_LABELS: Record<keyof TimedBuffEffects, string> = {
  cpsMult: 'CHIMES/SEC',
  cpcMult: 'PER CLICK',
  combatDpsMult: 'DAMAGE',
  materialDropMult: 'MATERIALS',
  xpMult: 'CHAMPION XP',
}

/**
 * Der Lohn in einer Zeile: „+60% CHIMES/SEC".
 *
 * Steht hier und nicht in Store oder Komponente, weil DREI Stellen sie zeigen —
 * die Wahlkarte (was gäbe es), die HUD-Karte (woran arbeite ich) und die
 * Abschlussmeldung (was gilt jetzt). Drei Fassungen desselben Satzes wären drei
 * Gelegenheiten, dass eine davon eine Balance-Änderung nicht mitbekommt.
 *
 * Mehrachsige Belohnungen gibt es im Katalog derzeit nicht; die Schleife hält
 * den Fall trotzdem offen, damit ein zweiter Effekt nicht stillschweigend unter
 * den Tisch fällt.
 */
export function omenRewardLine(def: OmenDef): string {
  return Object.entries(def.reward.effects)
    .map(([key, mult]) => {
      const label = OMEN_BUFF_EFFECT_LABELS[key as keyof TimedBuffEffects]
      return `+${Math.round((mult - 1) * 100)}% ${label}`
    })
    .join(' · ')
}

/** Überschrift des Wahl-Overlays. */
export const OMEN_CHOICE_TITLE = 'Three Omens Stand in the Sky'
export const OMEN_CHOICE_SUBTITLE = 'The Caretaker may follow only one'
