// Bard-Fähigkeiten — Passive „Traveler's Call" und die vier Slots Q/W/E/R.
//
// Die Fähigkeiten sind das aktive Gegenstück zum Idle-Kern: sie greifen in
// genau die Systeme ein, die ohnehin laufen (Planeten-Bosse, Sterne,
// Expeditionen, Chime-Produktion), statt ein eigenes Nebenspiel aufzumachen.
// Die Definitionen (Name, Bild, Farbe) stehen in `config/progression/bardAbilities.ts`;
// hier liegen ausschließlich die Zahlen.
//
// Zwei Skalen wirken auf jede Fähigkeit:
//   Rang       — steigt mit dem Bard-Level, hebt die Wirkung und senkt die Zeit
//   Resonance  — die Passive, aufgebaut durch Klicken auf die Sonne
//
// Der Rang wirkt dabei auf ZWEI Wegen, die Resonance nur auf dem ersten:
//
//   multiplikativ  über `powerMultOf` — Schaden, Heilung, Zeitsprünge. Rang und
//                  Resonance heben ihn gemeinsam.
//   additiv        über `bardRankValue` — Zielzahl, Stasedauer, Fensterlängen.
//                  ALLEIN der Rang. Die Konstanten dazu heißen `*_PER_RANK*`.
//
// Die Trennung ist keine Geschmacksfrage: hinge ein Buff-FENSTER an der
// Resonance, verlängerte Klicken das Fenster, in dem Klicken mehr zählt.

// ── Passive: Traveler's Call ────────────────────────────────────────────────

/** Klicks auf die Sonne je Resonance-Stufe. */
export const RESONANCE_CLICKS_PER_STACK = 25

/** Obergrenze der Stufen — dort steht die Wirkung bei ×2 und die CDR am Deckel. */
export const RESONANCE_MAX_STACKS = 100

/** Wirkungszuwachs je Stufe: 100 Stufen verdoppeln jede Fähigkeit. */
export const RESONANCE_POWER_PER_STACK = 0.01

/** Abklingzeit-Reduktion je Stufe — bei vollen Stufen 25 %. */
export const RESONANCE_CDR_PER_STACK = 0.0025

/**
 * Was ein einzelner Klick von jeder laufenden Abklingzeit abzieht. Das ist der
 * eigentliche Kniff der Passive: wer aktiv klickt, wirkt merklich öfter, ohne
 * dass Idle-Spiel dadurch bestraft würde — die Zeit läuft ja weiterhin selbst.
 */
export const RESONANCE_CLICK_REFUND_MS = 150

/**
 * Der Fortschrittsring der Passiv-Kachel — Maße im 100×100-Koordinatenraum
 * ihres SVG, nicht in Pixeln. Die Kachel skaliert über `--ab-passive-size`
 * (72 / 88 / 108 px), der Ring wächst über den `viewBox` von selbst mit.
 *
 * `RADIUS` zieht mit der halben Strichstärke nach INNEN, damit die äußere Kante
 * bei 48,5 bleibt: die Kachel behält ihren Umriss, dünner wird die Linie nach
 * innen. Zur Strichstärke 3 gehört damit 48,5 − 1,5 = 47.
 *
 * Die Ticks sind Anteile, keine Winkel — der Ring beginnt oben und läuft im
 * Uhrzeigersinn, die Umrechnung macht die Komponente.
 */
export const ABILITY_PASSIVE_RING = {
  RADIUS: 47,
  STROKE: 3,
  /** Der Punkt am Ende der Füllung; etwas dicker als die Linie, damit er trägt. */
  HEAD_RADIUS: 3.4,
  /** Viertel-Orientierung. Bei 0 sitzt schon der Ringanfang. */
  TICK_FRACTIONS: [0.25, 0.5, 0.75],
  /**
   * Halbe radiale Länge der Maskenlinie, die den Ring an einem Viertel
   * DURCHTRENNT. Muss `STROKE` sicher überschreiten, sonst bleiben Fransen der
   * Linie stehen — mit 3,2 zu 3 ist an jeder Seite Reserve.
   */
  TICK_HALF_LENGTH: 3.2,
  /**
   * Breite der Lücke ENTLANG des Bogens, gegen `STROKE` gesetzt: die doppelte
   * Ringstärke liest sich als Trennung, ohne dass die vier Segmente zerfallen.
   * Wandert die Strichstärke, wandert dieser Wert mit.
   */
  TICK_GAP: 6,
  /**
   * Der Marken-Punkt in der Lücke. Bewusst halb so groß wie `HEAD_RADIUS` — die
   * wandernde Marke soll die eindeutige bleiben.
   */
  TICK_DOT_RADIUS: 1.7,
  /**
   * Die vier Zonen zwischen den Viertel-Marken, je drei Farben für die Stops
   * des Ring-Verlaufs. Der Ring HEIZT zum Ziel hin auf: von gedämpftem Kupfer
   * über das Meep-Orange bis an die Goldkante, sobald das letzte Viertel läuft.
   *
   * Bewusst alles in EINER Familie — der Wechsel soll das Vorankommen fühlbar
   * machen, nicht eine neue Bedeutung ankündigen. Meep-Orange (`#fb923c`) bleibt
   * der Ankerton, den auch Header und Materialleiste tragen.
   *
   * Ein Zonenwechsel kommt höchstens DREIMAL je Meep-Schritt vor. Deshalb darf
   * er als Übergang laufen: er ist ein Ereignis, kein Dauerläufer.
   */
  ZONE_COLORS: [
    ['#8a3a12', '#d9600f', '#f59356'],
    ['#a33d0d', '#ec6c10', '#fba263'],
    ['#c2410c', '#fb923c', '#fdba74'],
    ['#d4560e', '#fdae67', '#fde3a7'],
  ],
  /**
   * Nachlauf von Füllung und Kopfpunkt. Lang genug, dass ein einzelner Klick
   * sichtbar wandert, kurz genug, dass schnelles Klicken nicht nachhinkt.
   */
  TRANSITION_MS: 260,
} as const

// ── Ränge ───────────────────────────────────────────────────────────────────

/** Bard-Level zwischen zwei Rängen einer bereits freigeschalteten Fähigkeit. */
export const ABILITY_LEVELS_PER_RANK = 10

/** Höchster Rang. */
export const ABILITY_MAX_RANK = 5

/** Wirkungszuwachs je Rang über Rang 1 — Rang 5 wirkt doppelt. */
export const ABILITY_RANK_POWER_STEP = 0.25

/** Abklingzeit-Nachlass je Rang über Rang 1 — Rang 5 kühlt 20 % schneller. */
export const ABILITY_RANK_CDR_STEP = 0.05

/** Deckel über alle Quellen der Abklingzeit-Reduktion zusammen. */
export const ABILITY_CDR_CAP = 0.6

// ── Freischaltung (Bard-Level) ──────────────────────────────────────────────

export const ABILITY_UNLOCK_LEVEL_Q = 3
export const ABILITY_UNLOCK_LEVEL_W = 8
export const ABILITY_UNLOCK_LEVEL_E = 15
export const ABILITY_UNLOCK_LEVEL_R = 25

// ── Abklingzeiten (Sekunden, Rang 1) ────────────────────────────────────────

export const ABILITY_COOLDOWN_Q_SEC = 14
export const ABILITY_COOLDOWN_W_SEC = 45
export const ABILITY_COOLDOWN_E_SEC = 90
export const ABILITY_COOLDOWN_R_SEC = 150

// ── Q: Cosmic Binding ───────────────────────────────────────────────────────

/** Wie viele Planeten-Bosse der Blitz bei Rang 1 durchschlägt. */
export const BINDING_TARGET_COUNT = 2

/**
 * Zusätzliche Ziele je Rang über Rang 1 — 2 · 3 · 4 · 5 · 6.
 *
 * Das ist der Grund, Q überhaupt hochzuziehen: der Schaden JE ZIEL wächst
 * ohnehin über `powerMultOf`, aber die Zahl der Einschläge stand fest, und
 * genau die sieht der Spieler. Bei Rang 5 nimmt ein Guss den vollen Orbit —
 * der Rang endet dort, wo die Zahl der Planeten endet.
 */
export const BINDING_TARGET_PER_RANK = 1

/** Schaden je Ziel als Anteil seiner EIGENEN maximalen Lebenspunkte. */
export const BINDING_DAMAGE_MAX_HP_PCT = 0.06

/**
 * Wie weit die Enrage-Uhr eines getroffenen Bosses zurückgestellt wird — das
 * ist die Betäubung aus dem Original, übersetzt in die einzige Uhr, die ein
 * Planeten-Boss hier führt.
 */
export const BINDING_STUN_MS = 5000

/**
 * Ohne Ziel prallt der Blitz an der Sonne ab: so viele Klickwerte fallen als
 * Chimes an. Eine Fähigkeit, die ins Leere geht, wäre der schlechteste Moment
 * für die kürzeste Abklingzeit im Spiel.
 */
export const BINDING_EMPTY_CLICK_VALUES = 40

// ── W: Caretaker's Shrine ───────────────────────────────────────────────────

/** Sofortheilung als Anteil der maximalen Spieler-HP. */
export const SHRINE_HEAL_MAX_HP_PCT = 0.25

/** Dauer des Nachklangs bei Rang 1. */
export const SHRINE_BUFF_DURATION_MS = 25_000

/**
 * Zusätzliche Länge des Nachklangs je Rang — 25 · 28 · 31 · 34 · 37 s.
 *
 * Der Schritt ist bewusst klein gewählt, denn er läuft gegen eine Abklingzeit,
 * die mit demselben Rang SINKT. Gerechnet ohne Resonance:
 *
 *   Rang 1   25 s Fenster gegen 45,0 s   → 56 %
 *   Rang 3   31 s Fenster gegen 40,5 s   → 77 %
 *   Rang 5   37 s Fenster gegen 36,0 s   → lückenlos
 *
 * Bei 5 s je Rang wäre der Nachklang schon ab Rang 4 lückenlos, und
 * `SHRINE_CPS_MULT` damit kein Nachklang mehr, sondern ein dauerhafter Faktor
 * auf die gesamte Chime-Produktion. So fällt die Lücke erst am HÖCHSTRANG —
 * bis dahin ist sie die Aufgabe der Passive (`RESONANCE_CLICK_REFUND_MS`).
 */
export const SHRINE_BUFF_PER_RANK_MS = 3_000

/** Chime-Produktion während des Nachklangs. */
export const SHRINE_CPS_MULT = 1.6

// ── E: Magical Journey ──────────────────────────────────────────────────────

/** Sekunden, die jede laufende Expedition überspringt. */
export const JOURNEY_EXPEDITION_SKIP_SEC = 120

/** Sekunden, die die Sonnenphase vorrückt. */
export const JOURNEY_DWELL_SKIP_SEC = 60

/**
 * Höchstanteil einer Sonnenphase, den ALLE Abkürzungen zusammen überspringen
 * können — Bard-E, Drifter-Lohn und das Relikt „Solar Winds".
 *
 * Ohne Deckel war der Skip nicht eine Abkürzung, sondern der eigentliche Takt
 * der Sonnenachse: die Abklingzeit von 90 s sinkt über Resonance auf ~49 s, der
 * Rangfaktor geht bis ×4, und der Sprung wurde ungeklemmt vom Phasenbeginn
 * abgezogen. Gemessen ergab das rund 480 übersprungene Sekunden je 40 Sekunden
 * Echtzeit — Faktor 12 auf die gesamte Rampe. Die Sonne war deshalb nach 4,4
 * statt nach 21 Spielstunden fertig, und jede Änderung an
 * `STAR_PHASE_MIN_DWELL_SECONDS` lief ins Leere.
 *
 * 15 % je Phase lassen jede Quelle spürbar bleiben, ohne dass sie die Achse
 * ersetzt. Der Deckel gilt für alle GEMEINSAM (siehe
 * `solarUpgradeStore.skipDwell`) — ein Deckel je Quelle würde das Problem nur
 * auf die jeweils nächste verschieben. Gemessen mit nur EINER gedeckelten
 * Quelle: die volle Sonne fiel nach 13,9 statt der aus der Rampe folgenden
 * ~38 Spielstunden.
 *
 * Die übrigen Wirkungen von Bard-E — Expeditionen, Sternfristen und die
 * Championreise — bleiben ungedeckelt.
 */
export const DWELL_SKIP_PHASE_FRACTION = 0.15

/** Sekunden zusätzlicher Standzeit für jeden Stern im Orbit. */
export const JOURNEY_STAR_TIME_SEC = 60

/**
 * Sekunden, die die laufende Championreise überspringt.
 *
 * „Magical Journey" öffnet einen Korridor — und raffte bislang alles ausser
 * der einzigen Sache, die im Namen steht. Das war nicht nur thematisch schief:
 * die Reise ist ab Galaxie 13 das Tempolimit des Spiels (siehe
 * `CHAMPION_TRAVEL_MAX_MS`), und sie war die einzige Uhr ohne jeden aktiven
 * Griff. Mit 90 s bei Rang 1 nimmt ein Guss einer gedeckelten 4-Minuten-Reise
 * gut ein Drittel — spürbar, aber kein Ersatz für den Flight-Ausbau.
 */
export const JOURNEY_TRAVEL_SKIP_SEC = 90

/** Dauer des Reisefensters bei Rang 1. */
export const JOURNEY_BUFF_DURATION_MS = 20_000

/**
 * Zusätzliche Länge des Reisefensters je Rang — 20 · 23 · 26 · 29 · 32 s.
 *
 * E hat fünf Zahlen, die über `powerMultOf` wachsen, aber alle fünf zahlen in
 * Uhren ein, die der Spieler nicht vor sich sieht. Das Fenster ist die einzige
 * Wirkung, die er im Moment des Drückens SPÜRT — deshalb wächst sie mit.
 * Deckung bei Rang 5 ohne Resonance: 32 s Fenster gegen 72 s Abklingzeit.
 */
export const JOURNEY_BUFF_PER_RANK_MS = 3_000

/** Klickwert während des Reisefensters. */
export const JOURNEY_CPC_MULT = 3

// ── R: Tempered Fate ────────────────────────────────────────────────────────

/** Wie lange das System bei Rang 1 stillsteht. */
export const FATE_STASIS_DURATION_MS = 8000

/**
 * Zusätzliche Standzeit der Stase je Rang — 8 · 9 · 10 · 11 · 12 s.
 *
 * Die Dauer ist die Zahl, die R überhaupt ausmacht: sie steht während des
 * Wirkens als Zähler im Bild, während `FATE_FINALE_MAX_HP_PCT` — bislang das
 * Einzige, was an R wuchs — erst beim Auflösen sichtbar wird. Ein Rangaufstieg,
 * den man nur im Abspann sieht, fühlt sich nach nichts an.
 *
 * Der Schritt bleibt bei 1 s, weil die Stase gleichzeitig `FATE_DAMAGE_MULT`
 * verlängert: 12 s dreifacher Champion-Schaden bei stehenden Enrage-Uhren sind
 * am Höchstrang bereits das Fünffache eines normalen Fensters.
 */
export const FATE_STASIS_PER_RANK_MS = 1_000

/** Orbit- und Turret-Schaden während der Stase. */
export const FATE_DAMAGE_MULT = 3

/** Schlussschlag beim Auflösen der Stase, Anteil der maximalen Boss-HP je Ziel. */
export const FATE_FINALE_MAX_HP_PCT = 0.12

// ── HUD: die Fähigkeitenleiste ──────────────────────────────────────────────

/** Kantenlänge einer Q/W/E/R-Kachel auf der Referenzauflösung (Full HD). */
export const ABILITY_TILE_SIZE_PX = 84

/** Kantenlänge der Passiv-Kachel — sie steht daneben, nicht darüber. */
export const ABILITY_PASSIVE_SIZE_PX = 62

/** Abstand zwischen zwei Kacheln. */
export const ABILITY_TILE_GAP_PX = 10

/**
 * Wie lange die Kachel nach dem Wirken aufblitzt. Bewusst kürzer als die
 * kürzeste Abklingzeit — der Blitz gehört zum Auslösen, nicht zur Wirkung.
 */
export const ABILITY_CAST_FLASH_MS = 420

/** Wie lange die Klartextzeile über der Leiste stehen bleibt. */
export const ABILITY_CAST_TOAST_MS = 3200

/** Verzögerung, bis die Leiste nach dem Laden hereinfährt (wie die Keycap-Leiste). */
export const ABILITY_BAR_REVEAL_MS = 700

/**
 * Luft zwischen dem Tooltip und der Bildkante.
 *
 * Der Kasten steht über SEINER Kachel und wird dafür waagerecht aus der
 * Leistenmitte geschoben. Erreicht wird diese Grenze auf keiner unterstützten
 * Auflösung — der Kasten ist auf jeder Stufe schmaler als die Kachelreihe, die
 * er überspannt (348/410/480 px gegen 459/565/691 px), und die Leiste sitzt
 * mittig. Der Wert steht als Wächter da: eine breitere Fassung des Kastens
 * soll nicht still aus dem Bild laufen, sondern am Rand anstoßen.
 */
export const ABILITY_TIP_VIEWPORT_MARGIN_PX = 12

/**
 * Luft zwischen Fähigkeitenleiste und Buff-Reihe. Die Leiste veröffentlicht
 * ihre Höhe samt diesem Abstand als `--ability-bar-h`; die Buff-Reihe addiert
 * den Wert nur noch auf ihre eigene Ankerlinie.
 */
export const ABILITY_BAR_STACK_GAP_PX = 12

/**
 * Wie lange der Meep-Gewinn über der Passiv-Kachel aufsteigt. Länger als der
 * Cast-Blitz, kürzer als die Klartextzeile: der Gewinn ist ein Ereignis, das
 * man sehen soll, aber keine Meldung, die man lesen muss.
 */
export const ABILITY_MEEP_GAIN_FLOAT_MS = 1400

/**
 * Sammelfenster für Meep-Zuwächse.
 *
 * Ein Chime-Schub — ein gefällter Boss, ein eingesammelter Drifter, der
 * Offline-Ertrag — hebt `chimesForNextUniverse` in einem Sprung und kann damit
 * mehrere anstehende Meeps gleichzeitig auslösen. Sie sollen als EIN Float mit
 * der Summe erscheinen statt als mehrere, die einander abwürgen.
 *
 * (Der Wert stammt aus der Zeit, als `gameStore.addMeep()` verzögert
 * gutschrieb. Die Funktion gibt es nicht mehr, der Grund für ein Sammelfenster
 * schon.)
 */
export const ABILITY_MEEP_GAIN_COALESCE_MS = 220
