// Fortschritt: Universen, Prestige-Läufe, Abschnitte.

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
