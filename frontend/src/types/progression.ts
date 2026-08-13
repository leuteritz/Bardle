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

/**
 * Ein Universum — nur noch Identität.
 *
 * Seine Effekte trug es früher als fester `modifier` mit sich; das hiess zehn
 * feste Kombinationen, und der zweite Besuch von Void Nexus war Zeile für Zeile
 * der erste. Heute bringt die beim Prestige GEZOGENE Vorsehung die Effekte mit
 * (`ProvidenceDef.effects` → `gameStore.activeModifier`), und das Universum
 * steuert bei, was es immer schon ausgemacht hat: Name, Farbe, Herkunft.
 */
export interface UniverseConfig {
  id: number
  name: string
  description: string
  /** Wappen des Universums auf der Prestige-Karte. */
  icon: string
}

// ── Providence (chosen at prestige, runs for the whole universe) ─────────────

/**
 * Womit eine Vorsehung den Lauf färbt — die EINZIGE Effektquelle eines
 * Durchlaufs.
 *
 * Erbt von `ModifierEffects`, und das ist der Kern der Zusammenführung: früher
 * gab es zwei Schichten (das Universum stellte die Wirtschaft, die Vorsehung den
 * Kosmos) und damit zwei Wahlen hintereinander. Heute trägt eine Karte beides,
 * und `gameStore.activeModifier` liest schlicht die Effekte der gewählten
 * Vorsehung — jede der rund 25 Lesestellen im Projekt blieb dabei unangetastet.
 *
 * Zwei Klassen von Achsen, unterschieden durch `via` in
 * `PROVIDENCE_EFFECT_META`:
 *  - `'modifier'` — die geerbten Wirtschaftsachsen, gelesen über
 *    `activeModifier` (shopStore, gameStore, planetShopStore),
 *  - `'store'` — die Kosmos-Achsen darunter, mit je einem Getter im
 *    `providenceStore` und genau einer Multiplikation am Zielstore.
 *
 * Alle verwendeten Achsen sind reine Multiplikatoren um 1 herum. Achsen von
 * `ModifierEffects`, die etwas anderes sind (`levelExponent`,
 * `maxAbilityLevel`, `skillPointInterval`), stehen bewusst in KEINER Definition:
 * sie liessen sich auf einer Karte nicht als „x1.4" lesen und bräuchten je eine
 * eigene Schreibweise.
 */
export interface ProvidenceEffects extends ModifierEffects {
  /** Wie lange ein Resource-Star im Orbit steht. */
  starLifetimeMult?: number
  /** Chance, dass ein Kill Material fallen lässt. */
  materialDropMult?: number
  /** Schaden der Champions im Orbit. */
  combatDpsMult?: number
  /** Schaden der Turret-Planeten. */
  turretDpsMult?: number
  /** Lebenspunkte, mit denen ein Planeten-Boss erscheint. */
  bossHpMult?: number
  /** Chimes aus den Belohnungsslots eines gefallenen Bosses. */
  bossRewardMult?: number
  /** Champion-XP aus allen Quellen. */
  xpMult?: number
  /** LP je gewonnenem Auto-Battle. */
  lpGainMult?: number
  /** Materialkosten in der Star Forge. */
  forgeMaterialCostMult?: number
  /** Laufzeit einer Expedition — kleiner heisst schneller. */
  expeditionSpeedMult?: number
  /** Chimes aus einer erfolgreichen Expedition. */
  expeditionRewardMult?: number
  /** Abstand zwischen zwei Drifter-Spawns — kleiner heisst häufiger. */
  drifterSpawnIntervalMult?: number
  /** Laufzeit eines eingesammelten Drifter-Buffs. */
  drifterBuffDurationMult?: number
}

/**
 * Das System, aus dem eine Vorsehung ihren Charakter zieht. Das Angebot legt je
 * eine Karte aus DREI verschiedenen Domänen aus — dieselbe Regel wie bei den
 * Omen, und aus demselben Grund: drei Varianten desselben Themas sind keine Wahl.
 */
export type ProvidenceDomain = 'economy' | 'cosmos' | 'combat' | 'roster' | 'forge' | 'expedition'

/**
 * Eine Effektachse, aus der eine Vorsehung gewürfelt wird.
 *
 * Der Katalog fester Vorsehungen ist genau das hier geworden: nicht mehr
 * achtzehn fertige Karten, sondern die Bausteine, aus denen jede Karte im
 * Moment des Prestige entsteht. Name und Icon hängen an der BUFF-Achse — so
 * bleibt „Bladed Orbit" die Karte, die Champion-Schaden hebt, auch wenn Höhe
 * und Preis jedes Mal andere sind.
 */
export interface ProvidenceAxis {
  key: keyof ProvidenceEffects
  /** „Champion DPS" — steht auf der Karte unter dem Wert. */
  label: string
  domain: ProvidenceDomain
  /** Ob ein HÖHERER Multiplikator die gute Richtung ist. Entscheidet, in welche
   *  Richtung Buff und Debuff die Achse schieben. */
  higherIsBetter: boolean
  /** Wie die Achse wirkt: `'modifier'` über `gameStore.activeModifier`,
   *  `'store'` über einen Getter im `providenceStore`. */
  via: 'modifier' | 'store'
  /** Glyph der Karte, wenn diese Achse der Buff ist. */
  icon: string
  /** Namen der Karte, wenn diese Achse der Buff ist — einer wird gezogen. */
  names: string[]
  /** Spanne in Prozent, um die ein Buff diese Achse verbessert. */
  buffPct: [number, number]
  /** Spanne in Prozent, um die ein Debuff diese Achse verschlechtert. */
  debuffPct: [number, number]
}

/**
 * Eine gewürfelte Vorsehung — das Ergebnis, nicht die Vorlage.
 *
 * Sie wird VOLLSTÄNDIG im Spielstand abgelegt, denn sie steht in keinem Katalog:
 * eine ID liesse sich nicht mehr auflösen. Damit sind die Achsen-SCHLÜSSEL in
 * `effects` der Save-Vertrag — wer `xpMult` umbenennt, macht laufende Läufe
 * wirkungslos.
 */
export interface RolledProvidence {
  name: string
  icon: string
  domain: ProvidenceDomain
  /** Die Achse, die der Buff hebt — für Anzeige und Tests. */
  buffKey: keyof ProvidenceEffects
  /** Die Achse, die der Debuff drückt. */
  debuffKey: keyof ProvidenceEffects
  effects: ProvidenceEffects
}

/**
 * Eine Effektzeile.
 *
 * Label und Wert stehen GETRENNT, weil die beiden Anzeigestellen sie
 * verschieden gewichten: die Prestige-Karte setzt den Wert gross und das Label
 * als kleine Überschrift darüber — dort wird verglichen, und verglichen wird die
 * Zahl. Der Header-Tooltip nimmt `text`, weil er in eine Zeile passen muss.
 * Beide aus einer Quelle, damit sie nie auseinanderlaufen.
 */
export interface ProvidenceEffectLine {
  /** „Champion DPS" */
  label: string
  /** „+143%" bzw. „−38%" — die Änderung, nicht der Faktor. Seit die Höhe
   *  gewürfelt wird, gibt es keine runden Multiplikatoren mehr: „x2.43" liest
   *  sich als Rauschen, „+143%" als Aussage. */
  value: string
  /** „Champion DPS +143%" — für kompakte, einzeilige Anzeigen. */
  text: string
  positive: boolean
}

/**
 * Eine der drei Karten beim Prestige: wohin es geht und worunter.
 *
 * Universum und Vorsehung werden ZUSAMMEN gezogen und zusammen gewählt — der
 * Spieler trifft eine Entscheidung, nicht zwei hintereinander. Die Karte trägt
 * den Namen des Universums und darunter den der Vorsehung, so wie früher der
 * feste Modifier dort stand.
 */
export interface PrestigeOffer {
  universeId: number
  providence: RolledProvidence
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
  /**
   * Ein bis zwei Sätze in Klartext: was die Fähigkeit TUT, ohne eine einzige
   * Zahl. Die Zahlen stehen darüber; dieser Satz beantwortet, was sie
   * bedeuten — dass der Blitz mehrere Planeten auf einmal nimmt, dass die
   * Stase wirklich ALLES anhält.
   */
  description: string
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

/**
 * Eine Wirkungszeile im Tooltip einer Fähigkeit — was sie tut, mit der Zahl,
 * die JETZT gilt, und optional derselben Zahl eine Rangstufe weiter.
 */
export interface BardEffectLine {
  label: string
  value: string
  /**
   * Derselbe Wert bei Rang + 1. Fehlt, wenn sich die ANZEIGE nicht bewegt (ein
   * Zuwachs, der auf denselben Text rundet, verspricht nichts Ablesbares), am
   * Höchstrang, und bei einer gesperrten Fähigkeit — dort ist die nächste Frage
   * die Freischaltung, nicht der Rang danach.
   */
  next?: string
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

/**
 * Ein Rang der Gesamtleiter. Der Titel folgt aus der Zahl geschriebener Stufen,
 * und er ist nicht nur Zierde: `mult` verstärkt JEDEN Bahn-Bonus.
 *
 * Warum ein Faktor und keine eigenen Boni je Rang: die acht Bahnen decken die
 * acht Systeme bereits ab. Ein Rang mit eigener Wirkung wäre eine zweite
 * Balance-Achse daneben — als Faktor auf das Vorhandene bleibt es EINE
 * Einbaustelle (`bonusPct`), und das Panel erzählt eine Geschichte statt zwei:
 * Stufen geben, der Rang verstärkt.
 */
export interface ChronicleRankDef {
  /** Ab so vielen geschriebenen Stufen gilt der Rang. */
  min: number
  title: string
  /** Faktor auf jeden Bahn-Bonus. 1 = keine Verstärkung. */
  mult: number
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
