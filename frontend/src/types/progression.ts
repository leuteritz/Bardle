// Fortschritt: Universen, Prestige-Läufe, Abschnitte.

import type { TimedBuffEffects } from './core'
import type { IconPoolKey } from './ui'

export interface ModifierEffects {
  cpsMultiplier?: number
  cpcMultiplier?: number
  buildingCostMultiplier?: number
  meepCostMultiplier?: number
  meepPowerMultiplier?: number
  levelExponent?: number
  maxAbilityLevel?: number
  skillPointInterval?: number
  baseChimesPerClick?: number
  expeditionRewardMultiplier?: number
  eloPowerMultiplier?: number
  buildingMultipliers?: Record<string, number>
  abilityCPSPerLevel?: number
  abilityCPCPerLevel?: number
  abilityPowerPerLevel?: number
  abilityMeepCostPerLevel?: number
  cooldownMultiplier?: number
  enemySpeedMultiplier?: number
  enemyMaxHPDrainPerSecond?: number
}

export interface UniverseModifier {
  id: string
  name: string
  description: string
  icon: string
  effects: ModifierEffects
}

export interface UniverseConfig {
  id: number
  name: string
  description: string
  modifier: UniverseModifier | null
}

export interface SectionProgress {
  rescueCount: number
  completed: boolean
}

/**
 * Stand der Lebenszeit-Zähler beim Betreten des aktuellen Universums.
 *
 * Jeder „in diesem Universum"-Wert ist eine Differenz gegen diesen Stand —
 * damit braucht kein Store einen zweiten, parallel gepflegten Zähler, der beim
 * Prestige mit zurückgesetzt werden müsste.
 */
export interface UniverseRunBaseline {
  /** `gameStore.inGameTime` (Sekunden) beim Betreten — wie im Galaxie-Archiv. */
  startedAtInGameTime: number
  starsRescued: number
  starsLost: number
  galaxiesFreed: number
  planetsCleared: number
  bossesFelled: number
  meepsEarned: number
  materialsGathered: number
  clicks: number
}

/** Die daraus abgeleiteten Werte des laufenden Durchlaufs. */
export interface UniverseRunStats {
  playedSeconds: number
  starsRescued: number
  starsLost: number
  galaxiesFreed: number
  planetsCleared: number
  bossesFelled: number
  meepsEarned: number
  materialsGathered: number
  clicks: number
}

/** Ein abgeschlossener Universums-Durchlauf, archiviert beim Prestige. */
export interface UniverseRunRecord {
  universe: number
  durationSeconds: number
  starsRescued: number
  galaxiesFreed: number
  /** Chimes, die die Rettung dieses Universums gekostet hat. */
  chimes: number
  completedAt: number
}

// ── Bard-Fähigkeiten (Passive + Q/W/E/R) ─────────────────────────────────────

/** Die vier aktiven Fähigkeiten. Die Passive hat keinen Slot — sie läuft immer. */
export type BardAbilityId = 'q' | 'w' | 'e' | 'r'

/**
 * Statische Beschreibung einer Fähigkeit. Alles Zahlenmäßige steht in
 * `config/constants/abilities.ts`; hier liegt nur, was die Kachel zeigt und
 * ab wann sie überhaupt existiert.
 */
export interface BardAbilityDef {
  id: BardAbilityId
  /** Beschriftung der Keycap — zugleich die Taste selbst. */
  key: string
  name: string
  /** Ein Satz Flavour über dem Wirkungstext. */
  tagline: string
  /** Bild in `public/img/BardAbilities/`. */
  image: string
  /** Leitfarbe der Kachel: Rahmen, Ring, Zahlen. */
  color: string
  /** Bard-Level, ab dem die Fähigkeit nutzbar ist. */
  unlockLevel: number
  /** Grundabklingzeit in Sekunden bei Rang 1, ohne jede Reduktion. */
  baseCooldownSec: number
}

/** Was ein Wirken tatsächlich bewirkt hat — Grundlage der Rückmeldung im HUD. */
export interface BardAbilityCastResult {
  id: BardAbilityId
  /** Zählt bei jedem Wirken hoch, damit zweimal dasselbe erneut auslöst. */
  seq: number
  at: number
  /** Eine Zeile Klartext: „2 bosses struck for 1.2M". */
  summary: string
}

/** Ein laufender Zeiteffekt einer Fähigkeit — Gegenstück zu `DrifterActiveBuff`. */
export interface BardAbilityBuff {
  sourceId: BardAbilityId
  expiresAt: number
  durationMs: number
  cpsMult?: number
  cpcMult?: number
  combatDpsMult?: number
}

// ═══════════════════════════════════════════════════════════════════════════
// CHRONICLE — Meilensteine über alle Spielsysteme
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Die Einbaustelle, die eine Bahn speist — genau eine je Bahn, genau ein
 * Getter je Stelle (dasselbe Muster wie `drifterStore`). Der Schlüssel bleibt
 * bewusst nah am Namen des Getters, der ihn ausliest, damit ein Blick in die
 * Bahn-Definition sagt, wo ihr Bonus ankommt.
 */
export type ChronicleBonusKey =
  | 'cpsMult'
  | 'xpMult'
  | 'lpGainMult'
  | 'drifterBuffDurationMult'
  | 'forgeMaterialDiscount'
  | 'turretDpsMult'
  | 'bossDamageMult'
  | 'materialDropMult'

/**
 * Die Zahl, an der eine Bahn ihren Fortschritt misst. Nur der Schlüssel steht
 * in der Config — welches Store-Feld dahintersteht, löst der Store auf. Sonst
 * müsste `config/` Stores importieren, und die Richtung läuft umgekehrt.
 */
export type ChronicleMetricId =
  | 'lifetimeChimes'
  | 'championsRecruited'
  | 'battleWins'
  | 'driftersCollected'
  | 'forgeLevels'
  | 'planetLevels'
  | 'bossesDefeated'
  | 'starsRescued'

/** Eine Stufe einer Bahn. Das Zahlzeichen (I–V) folgt aus dem Index. */
export interface ChronicleStageDef {
  /** Wert der Metrik, ab dem die Stufe fällt. */
  threshold: number
  /**
   * Der Bonus, der bei DIESER Stufe gilt — kein Summand. Wer Stufe III hat,
   * hat genau deren Wert; die Stufen darunter sind darin schon enthalten.
   * Das hält die Anzeige ehrlich (die Karte zeigt, was wirkt) und die Balance
   * an einer Zahl statt an einer Summe.
   *
   * Einheit sind Prozentpunkte: 12 heißt +12 % bzw. bei einem Rabatt −12 %.
   */
  value: number
}

/** Eine Bahn: ein System, eine Metrik, eine Einbaustelle, fünf Stufen. */
export interface ChronicleTrackDef {
  id: string
  /** Name auf der Karte. */
  name: string
  /** Eine Zeile darüber, was die Bahn zählt. */
  blurb: string
  icon: string
  /** Leitfarbe der Karte: Rahmen, Balken, Stufenzeichen. */
  color: string
  metric: ChronicleMetricId
  bonus: ChronicleBonusKey
  /** Einheit hinter den Fortschrittszahlen ("chimes", "wins", …). */
  unit: string
  /** Eine Zeile mit `{v}` für den Wert der erreichten Stufe. */
  effect: string
  /** Genau `CHRONICLE_STAGES_PER_TRACK` Einträge, aufsteigend nach Schwelle. */
  stages: ChronicleStageDef[]
}

/** Eine Bahn, wie die Karte sie zeigt — Definition plus laufender Stand. */
export interface ChronicleTrackView extends ChronicleTrackDef {
  /** 0 = noch keine Stufe, 5 = ausgereizt. */
  stage: number
  /** Aktueller Wert der Metrik. */
  current: number
  /** Schwelle der nächsten Stufe; `null`, wenn die Bahn ausgereizt ist. */
  nextThreshold: number | null
  /** Anteil 0–1 zur nächsten Stufe (bei ausgereizter Bahn 1). */
  progress: number
  /** Bonuswert der erreichten Stufe in Prozentpunkten (0 ohne Stufe). */
  value: number
}

// ── OMENS OF THE CARETAKER ───────────────────────────────────────────────────

/**
 * Die Zahl, an der ein Vorzeichen seinen Fortschritt misst. Wie bei der
 * Chronicle steht nur der Schlüssel in der Config und der Store löst ihn auf —
 * `config/` importiert keine Stores.
 *
 * Jede Metrik hier MUSS monoton wachsen: der Fortschritt ist die Differenz zu
 * einem bei der Annahme eingefrorenen Startwert, und ein fallender Zähler
 * (Prestige) machte daraus eine negative Zahl. Der Store fängt das ab, indem er
 * den Startwert nachzieht — aber ein Zähler, der REGELMÄSSIG fällt, wäre als
 * Ziel trotzdem unfair und gehört nicht in diese Liste.
 */
export type OmenMetricId =
  | 'chimesEarned'
  | 'clicks'
  | 'meepsEarned'
  | 'driftersCollected'
  | 'bossesDefeated'
  | 'starsRescued'
  | 'battleWins'
  | 'championKills'
  | 'championLevelsGained'
  | 'materialsCollected'
  | 'expeditionsCompleted'

/**
 * Das System, dem ein Vorzeichen entstammt. Rein zum Sortieren des Angebots:
 * die drei Karten sollen aus DREI verschiedenen Systemen kommen, sonst steht
 * dreimal dieselbe Beschäftigung zur Wahl und die Entscheidung ist keine.
 */
export type OmenDomain = 'economy' | 'cosmos' | 'combat' | 'roster' | 'expedition'

/** Ein Vorzeichen, wie es im Katalog steht. */
export interface OmenDef {
  id: string
  /** Name auf der Karte. */
  name: string
  /** Was der Kosmos ankündigt — eine Zeile Stimmung, keine Spielanweisung. */
  blurb: string
  /** Was zu tun ist, mit `{n}` für die Zielmenge. */
  objective: string
  /**
   * Motivfamilie statt festem Glyph — gezogen wird je Angebot neu (`omenIcon`
   * in `utils/game/rolledIcons.ts`). Die Familie folgt der `domain`: das Icon
   * zeigt, WAS zu tun ist, und das steht in der Domäne.
   */
  iconPool: IconPoolKey
  /** Leitfarbe der Karte: Rahmen, Balken, Zahl. */
  color: string
  domain: OmenDomain
  metric: OmenMetricId
  /**
   * Zielmenge, gemessen ab der Annahme. Für die allermeisten Metriken absolut
   * und bewusst NICHT mitwachsend: „fälle vier Bosse" bleibt in Galaxie 12
   * dieselbe Aufgabe wie in Galaxie 1, sie geht nur schneller — genau das soll
   * ein Vorzeichen belohnen.
   *
   * Bei `targetFromCpsSeconds` ist dieser Wert nur der Boden für einen frischen
   * Spielstand, in dem die Produktion noch bei null liegt.
   */
  target: number
  /**
   * Nur für Zähler, deren Größenordnung mit dem Spielstand explodiert: das Ziel
   * ist dann so viel, wie die aktuelle Produktion in dieser Zeit abwirft, und
   * wird bei der ANNAHME einmal festgeschrieben.
   *
   * Ohne das wäre ein festes Chime-Ziel im späten Spiel in einer Sekunde
   * erfüllt und früh unerreichbar — dieselbe Zahl kann beides nicht leisten.
   * Dasselbe Muster wie `DrifterInstantReward.chimesFromCpsSeconds`.
   */
  targetFromCpsSeconds?: number
  /** Einheit hinter den Fortschrittszahlen ("stars", "bosses", …). */
  unit: string
  /** Frist in Sekunden, ab Annahme. Verstreicht sie, ist NICHTS verloren —
   *  nur der Eilbonus auf die Buff-Dauer. */
  deadlineSec: number
  /** Der Lohn: ein befristeter Buff in ein ANDERES System als `domain`. */
  reward: {
    /** Grunddauer in Sekunden. Innerhalb der Frist erfüllt: mal
     *  `OMEN_SWIFT_DURATION_MULT`. */
    durationSec: number
    effects: TimedBuffEffects
  }
}

/** Eine Karte im Angebot — die Definition plus das für dieses Angebot gezogene Glyph. */
export interface OmenOfferCard extends OmenDef {
  icon: string
}

/** Das Vorzeichen, dem Bard gerade folgt. */
export interface ActiveOmen {
  defId: string
  /** Wert der Metrik im Moment der Annahme — der Nullpunkt des Fortschritts. */
  startValue: number
  /**
   * Die bei der Annahme festgeschriebene Zielmenge. Steht hier und nicht nur in
   * der Definition, weil `targetFromCpsSeconds` sie aus der Produktion ableitet:
   * ein Ziel, das sich mitbewegte, während der Spieler daran arbeitet, wäre nie
   * erreichbar — jeder Ausbau der Produktion schöbe es vor sich her.
   */
  target: number
  acceptedAt: number
  /** Zeitpunkt, ab dem der Eilbonus verfällt. */
  deadlineAt: number
  /**
   * Das auf der gewählten Karte gezogene Glyph. Festgehalten statt nachgerechnet:
   * das Angebot löst Dubletten mit einem Versatz auf (`pickDistinctIcons`), und
   * der ist nach dem Abräumen des Angebots nicht mehr rekonstruierbar. Fehlt es
   * in einem alten Spielstand, wird eines aus der Familie gezogen.
   */
  icon?: string
}

/** Ein laufender Omen-Buff. Gleiche Bauart wie `DrifterActiveBuff`, damit die
 *  Buff-Leiste beide durch dieselbe Schleife schicken kann. */
export interface OmenActiveBuff {
  sourceId: string
  expiresAt: number
  durationMs: number
  /** Der Eilbonus lag an — die Karte und der Chip sagen es. */
  swift: boolean
  /**
   * Das Glyph der erfüllten Karte, damit der Chip dasselbe Zeichen trägt.
   * Optional: ein Buff aus einem Spielstand von vor den Motiv-Pools hat keines.
   */
  icon?: string
  effects: TimedBuffEffects
}

/** Ein Vorzeichen, wie die Karte es zeigt — Definition plus laufender Stand.
 *  `target` kommt aus dem angenommenen Omen und überschreibt damit den Wert der
 *  Definition, sobald die Produktion ihn festgeschrieben hat. */
export interface OmenView extends OmenDef {
  /** Das für diesen Lauf gezogene Glyph — aufgelöst aus `iconPool` + `iconSeq`. */
  icon: string
  /** Erreichte Menge seit der Annahme, bei `target` gedeckelt. */
  progress: number
  /** Anteil 0–1. */
  ratio: number
  /** Sekunden bis zum Verfall des Eilbonus; 0, wenn er schon weg ist. */
  secondsLeft: number
  /** Der Eilbonus ist noch zu holen. */
  swiftAvailable: boolean
}
