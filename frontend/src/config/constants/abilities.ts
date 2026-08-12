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

/** Wie viele Planeten-Bosse der Blitz durchschlägt. */
export const BINDING_TARGET_COUNT = 2

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

/** Dauer des Nachklangs. */
export const SHRINE_BUFF_DURATION_MS = 25_000

/** Chime-Produktion während des Nachklangs. */
export const SHRINE_CPS_MULT = 1.6

// ── E: Magical Journey ──────────────────────────────────────────────────────

/** Sekunden, die jede laufende Expedition überspringt. */
export const JOURNEY_EXPEDITION_SKIP_SEC = 120

/** Sekunden, die die Sonnenphase vorrückt. */
export const JOURNEY_DWELL_SKIP_SEC = 120

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

/** Dauer des Reisefensters. */
export const JOURNEY_BUFF_DURATION_MS = 20_000

/** Klickwert während des Reisefensters. */
export const JOURNEY_CPC_MULT = 3

// ── R: Tempered Fate ────────────────────────────────────────────────────────

/** Wie lange das System stillsteht. */
export const FATE_STASIS_DURATION_MS = 8000

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

/**
 * Ab dieser Restzeit zeigt die Kachel Zehntelsekunden statt ganzer Sekunden —
 * dieselbe Schwelle, ab der ein Cooldown im MOBA-HUD feiner wird.
 */
export const ABILITY_COOLDOWN_DECIMAL_BELOW_SEC = 5

/** Verzögerung, bis die Leiste nach dem Laden hereinfährt (wie die Keycap-Leiste). */
export const ABILITY_BAR_REVEAL_MS = 700

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
 * Sammelfenster für Meep-Zuwächse. Muss über `MEEP_ADD_DELAY_MS` (100ms)
 * liegen — `gameStore.addMeep` schreibt verzögert gut, und mehrere Gutschriften
 * in diesem Fenster sollen als EIN Float mit der Summe erscheinen statt als
 * zwei, die einander abwürgen.
 */
export const ABILITY_MEEP_GAIN_COALESCE_MS = 220
