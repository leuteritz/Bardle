// Welt: Planeten, Sterne, Boss-Events, Drifter, Planeten-Slots.

import type { TimedBuffEffects } from './core'

export type PlanetType =
  | 'rocky'
  | 'ice'
  | 'gas-giant'
  | 'lava'
  | 'ocean'
  | 'desert'
  | 'jungle'
  | 'ringed'
  | 'crystal'
  | 'toxic'
  | 'void'
  | 'aurora'
  | 'shattered'
  | 'storm'
  | 'bloom'
  | 'neon'
  | 'obsidian'
  | 'coral'

export type StarType = 'champion' | 'resource' | 'galaxy_boss' | 'boss_escort'

export interface PlanetBossRewardSlot {
  type: 'chimes' | 'material'
  amount?: number
  materialId?: string
}

export interface PlanetBossEvent {
  planetId: string
  planetType: PlanetType
  bossName: string
  startTime: number
  enrageTimerMs: number
  maxHP: number
  currentHP: number
  clickDamagePerHit: number
  passiveDPS: number
  totalDamageDealt: number
  rewardSlots: PlanetBossRewardSlot[]
  defeated: boolean
  expired: boolean
  noEnrage?: boolean
  homePlanetChampion?: string
  isGalaxyBoss?: boolean
  isBossEscort?: boolean
  isChampionPlanet?: boolean
  isChampionEscort?: boolean
  sectionId?: number
}

// ── Drifters — clickable objects passing through the orbit view ──────────────

/** Rarity band of a drifter — drives spawn weight and chip styling. */
export type DrifterRarity = 'common' | 'uncommon' | 'rare' | 'legendary'

/** Every multiplier a drifter buff can put on the game. Each key has exactly
 *  one integration point; see `drifterStore`'s effect getters. */
/**
 * Die Achsen eines Drifter-Buffs. Namensgleich zu dem, was das Omen-System
 * ausschüttet — deshalb ein Alias auf den gemeinsamen Typ statt einer zweiten
 * Liste. Der Drifter-Name bleibt, weil er an jeder Fundstelle sagt, WESSEN Buff
 * gemeint ist.
 */
export type DrifterBuffEffects = TimedBuffEffects

/** Instant, one-shot payouts a drifter grants the moment it is clicked. */
export interface DrifterInstantReward {
  /** Chimes worth this many seconds of current production. */
  chimesFromCpsSeconds?: number
  /** Fill the meep progress bar and hand over this many meeps outright. */
  meeps?: number
  /** Roll this many random materials into the inventory. */
  materials?: number
  /** Backdate the star-phase dwell clock by this many seconds. */
  dwellSkipSeconds?: number
  /** Extend every active star's despawn timer by this many seconds. */
  starTimeSeconds?: number
  /** Strike EVERY living planet boss in the orbit at once for this fraction of
   *  its own maximum health. A share rather than a flat number on purpose: boss
   *  HP scales with level, production, team strength and galaxy, so a fixed
   *  amount would one-shot the early game and be a scratch later on. */
  orbitStrikeMaxHpPct?: number
}

/**
 * How much ornament a rarity band earns — the rank axis of the flying body.
 *
 * Modelled on `CHAMPION_REGALIA_STAGES`: continuous values that keep climbing
 * plus boolean feature flags, so every step adds exactly ONE new layer instead
 * of restating the one before it. Before this table the only rarity-dependent
 * value in flight was an aura alpha, and escalation ran along the TYPE axis
 * instead — a rare Coronal Surge carried more motion than the legendary.
 *
 * Every flag is read together with `DRIFTER_ORNAMENT_MIN_SIZE`, never on its
 * own (performance rule 7): a layer that measures under two pixels is invisible
 * and still paid for in full.
 */
export interface DrifterFxStage {
  rarity: DrifterRarity
  /** Opacity of the innermost aura shell. */
  auraAlpha: number
  /** Stacked aura shells, 1–3 — each one breathes on its own offset. */
  auraLayers: number
  /** Amplitude of the body's own motion, 0..1. Scales durations and travel. */
  motion: number
  /** Debris motes orbiting the body. */
  motes: number
  /** Grazing highlight along the sunlit limb. */
  rim: boolean
  /** Second, offset aura beat — the shell stops reading as one flat ring. */
  pulse: boolean
  /** Dust plume trailing inside the wake. */
  dust: boolean
  /**
   * Streaks drifting backwards through the wake.
   *
   * The one thing that makes a trail read as MOVING rather than as a line
   * stuck to the body — and the only motion that pays off here, because the
   * flight routes are shallow enough that a curved or lagging tail would be
   * invisible. Pure CSS, inside the rotating wake, so it costs no frame write.
   */
  flow: number
  /** Debris belt around the body. */
  ring: boolean
  /** Announces itself at the screen edge earlier, and with a second beat. */
  herald: boolean
}

/** Which CSS body `DrifterBody.vue` builds for a drifter in flight. Every type
 *  has its own silhouette — the flying object is drawn entirely in CSS, the
 *  icon/artwork only ever shows up in the HUD (info card, buff chip, herald). */
export type DrifterBodyKind =
  | 'chime'
  | 'shard'
  | 'meep'
  | 'probe'
  | 'surge'
  | 'vortex'
  | 'beacon'
  | 'pulse'
  | 'leviathan'

/** Static definition of a drifter type — pure data, no runtime state. */
export interface DrifterDef {
  id: string
  /** Player-facing name, shown in the toast and on the buff chip. */
  name: string
  rarity: DrifterRarity
  /** Relative spawn weight inside the whole pool. */
  weight: number
  /** Iconify `game-icons:*` name — the chip/card icon. NOT the flying body. */
  icon: string
  /** CSS silhouette drawn while the drifter crosses the orbit view. */
  body: DrifterBodyKind
  /** Optional image shown instead of the icon in the HUD (chime / meep art). */
  image?: string
  /** Signature color: aura, trail, edge ping and buff chip. */
  color: string
  /** Flight duration across the screen in ms — rare types linger longer. */
  flightMs: number
  /** Rendered size of the clickable body in px. */
  sizePx: number
  /** Clicks needed to collect it. >1 spreads the payout across the flight. */
  hits: number
  /** One-line effect summary for the collect toast. */
  effectLine: string
  reward?: DrifterInstantReward
  buff?: {
    durationMs: number
    effects: DrifterBuffEffects
  }
}

/** A drifter currently in flight. Position is derived from `spawnedAt`, so a
 *  paused/stuttering frame loop can never desync it from the game clock. */
export interface ActiveDrifter {
  /** Unique instance id — also the Vue render key. */
  uid: number
  defId: string
  /** Index into `DRIFTER_ROUTES`. */
  routeIndex: number
  /** Mirror the route horizontally — doubles the path variety. */
  mirrored: boolean
  spawnedAt: number
  flightMs: number
  /** Hits landed so far; the drifter is collected at `def.hits`. */
  hitsLanded: number
}

/** A drifter buff ticking down. `sourceId` is the defining `DrifterDef.id`. */
export interface DrifterActiveBuff {
  sourceId: string
  expiresAt: number
  durationMs: number
  effects: DrifterBuffEffects
}

/** The tally of the last orbit-wide strike. The store records it, the shockwave
 *  layer replays itself off `seq` — so an admin-forced collect looks exactly
 *  like a clicked one, and the same drifter caught twice still fires twice. */
export interface DrifterOrbitStrike {
  /** Bumped on every strike; `0` means none has happened yet. */
  seq: number
  at: number
  /** Which type fired it — the wave takes its color from that definition. */
  defId: string
  /** Living bosses that took the hit. `0` = the orbit was empty. */
  planetsHit: number
  /** Damage actually applied, after every boss-damage multiplier. */
  damage: number
  /** How many of those planets the wave killed outright. */
  kills: number
}

// ── The Void — was aus der Leere auf die Sonne zukriecht ───────────────────
// Das Gegenstück zu allem anderen in diesem Spiel: kein System, das etwas gibt,
// sondern eines, das etwas nimmt, wenn man es gewähren lässt.
//
// Ein Void-Wesen reisst am Bildrand aus dem Nichts und wandert von dort zur
// Sonne. Es hat keine Frist — es hat einen WEG, und der ist die Uhr. Wer nicht
// eingreift, sieht es ankommen; das ist die Drohung, und sie steht die ganze
// Zeit sichtbar auf dem Schirm, statt in einem Countdown zu stecken.

/** Wie schwer ein Wesen wiegt — steuert Spawn-Uhr, Grösse, Tempo und Einschlag. */
export type VoidRiftSeverity = 'lesser' | 'greater' | 'abyssal'

/**
 * Die Achsen, an denen der Void zieht bzw. seine Beute zahlt. Bewusst DIESELBE
 * Liste wie bei Drifter und Omen — der Void ist ein Multiplikator wie jeder
 * andere, er steht nur unter 1. Eine eigene Liste hätte beim nächsten Zusatz
 * still danebengestanden.
 */
export type VoidEffects = TimedBuffEffects

/**
 * Statische Definition eines Void-Wesens — reine Daten. Der Store lässt sie
 * wandern, der `VoidLayer` zeichnet sie alle in EINEM Canvas.
 */
export interface VoidRiftDef {
  id: string
  /** Was der Spieler liest — Toast, HUD-Karte, Herald. */
  name: string
  severity: VoidRiftSeverity
  /** Relatives Gewicht INNERHALB der eigenen Schwere. */
  weight: number
  /** Iconify-Name für die HUD-Karte. Der Körper wird gezeichnet, nicht geicont. */
  icon: string
  /** Signaturfarbe: Aura, Schweif, HP-Ring, HUD-Karte. */
  color: string
  /** Kantenlänge des Wesens in px, wenn es an der Sonne ankommt. */
  sizePx: number
  /**
   * Das Bild im Schlund — oder `undefined` für ein blosses Loch.
   *
   * Bewusst nicht für jeden Typ: die kleinen Wesen bleiben gestaltlose Risse,
   * und genau dadurch heisst „da ist etwas drin" etwas. Der Void bekommt so
   * eine Eskalation, ohne seine Gestaltlosigkeit ganz aufzugeben — man sieht
   * nie das ganze Wesen, immer nur den Ausschnitt, den der Riss freigibt.
   */
  dweller?: string
  /** Eine Zeile, die sagt, was es kostet — steht auf der HUD-Karte. */
  drainLine: string
  /** Eine Zeile, die sagt, was das Erlegen einbringt. */
  boonLine: string
  /**
   * Woran es zieht, während es unterwegs ist. Die Werte gelten bei ANKUNFT —
   * am Bildrand wirkt es anteilig schwächer, siehe `voidStore.drainEffects`.
   */
  drain: VoidEffects
  /** Was das Erlegen auszahlt. */
  boon: {
    durationMs: number
    effects: VoidEffects
    /** Chimes im Wert von so vielen Sekunden aktueller Produktion. */
    chimesFromCpsSeconds?: number
    /** So viele Materialwürfe. */
    materials?: number
  }
  /** Was ein Einschlag hinterlässt — dasselbe Ziehen, nur befristet und härter. */
  aftermath: VoidEffects
}

/**
 * Ein Wesen, das gerade unterwegs ist.
 *
 * Die Position wird NICHT gespeichert, sondern aus `spawnedAt` und der Wanduhr
 * abgeleitet (siehe `utils/orbit/voidPath.ts`) — dasselbe Prinzip wie beim
 * Drifter: ein gedrosselter Tab, ein verschluckter Frame oder ein offenes Modal
 * können es damit nie von der Spiellogik abkoppeln. Gespeichert ist nur, WOHER
 * es kam und WIE LANGE es braucht.
 */
export interface VoidMonster {
  /** Eindeutige Instanz-Id — auch der Schlüssel im Renderer. */
  uid: number
  defId: string
  /** Winkel des Startpunkts am Bildrand (rad). */
  angle: number
  /** Seitlicher Versatz der Bahn (−1..1) — sonst laufen alle exakt radial. */
  drift: number
  spawnedAt: number
  /** Reisedauer in ms. `spawnedAt + travelMs` ist der Einschlag. */
  travelMs: number
  maxHp: number
  currentHp: number
  /** Hochgezählt bei jedem Klick — treibt den Trefferblitz. */
  hitsLanded: number

  // ── Was der Orbit ihm angetan hat ────────────────────────────────────────
  // Alles absolute Wanduhrzeit, wie jede andere Frist im Spiel: ein
  // gedrosselter Tab oder ein Reload kann sie damit nicht desynchronisieren.
  // Flache Zahlen statt eines `marks`-Objekts — ein verschachteltes Objekt im
  // Pinia-State wird proxiert, und jeder Lesevorgang liefe durch den Proxy.
  /** Bis wann Top es körperlich aufhält (0 = frei). */
  blockedUntil: number
  /** Bis wann sein Vorrücken gebremst ist — Mid-Fluch ODER Zeitkapsel. */
  slowedUntil: number
  /** Bis wann es verflucht ist und allen Schaden verstärkt nimmt. */
  cursedUntil: number
  /** Bis wann die ADC-Marke darauf steht — der Beschuss geht zuerst hierher. */
  focusedUntil: number
  /** Bis wann ein Ward seine Drossel stilllegt. */
  wardedUntil: number
  /** Letzte Berührung — treibt den Funken im Canvas. */
  lastContactAt: number
}

/**
 * Was der Orbit einem Wesen gerade auferlegt — in der Reihenfolge, in der der
 * Zustandsring sie zeigt. Es wird immer nur EINER gezeichnet: vier Ringe auf
 * zwei Dutzend Wesen wären echte Arbeit, und der oberste sagt ohnehin das
 * Dringlichste.
 */
export type VoidContactState = 'blocked' | 'warded' | 'cursed' | 'focused'

/** Was ein Planet tut, wenn ein Wesen ihn streift. */
export type VoidPlanetVerb = 'volley' | 'absorb' | 'slow' | 'scavenge' | 'splash' | 'banish'

/**
 * Der Rider einer Planetenrolle bei Berührung.
 *
 * Als `Record<PlanetRoleType, …>` getippt: eine siebte Planetenrolle ist damit
 * ein Compile-Fehler und kein stiller Leerlauf.
 */
export interface VoidPlanetRider {
  verb: VoidPlanetVerb
  /** Faktor auf `VOID_PLANET_STRIKE_PCT`. 0 = dieser Planet schlägt nicht zu. */
  damageMult: number
  /** Nimmt der Planet bei Berührung selbst Schaden? */
  takesChip: boolean
}

/** Ein laufendes Einschlag-Nachbeben. `sourceId` ist die `VoidRiftDef.id`. */
export interface VoidAftermath {
  sourceId: string
  expiresAt: number
  durationMs: number
  effects: VoidEffects
}

/** Bilanz des letzten Ausgangs. Der Layer spielt sich an `seq` ab — ein
 *  erzwungener Einschlag sieht damit aus wie ein erspielter. */
export interface VoidOutcome {
  /** Hochgezählt bei jedem Ausgang; `0` heisst: noch keiner. */
  seq: number
  at: number
  defId: string
  /** `true` = erlegt, `false` = eingeschlagen. */
  sealed: boolean
  /** Bildschirmposition, an der es passierte — dort spielt der Effekt. */
  x: number
  y: number
  /** Sonnen-HP, die der Einschlag gekostet hat. Bei `sealed` immer 0. */
  hpLost: number
  /** Anstehende Meeps, die der Einschlag gefressen hat. Bei `sealed` immer 0 —
   *  und auch bei einem Einschlag 0, wenn der Lauf nichts gesammelt hatte. */
  meepsLost: number
}

// ── Planeten-Slots ─────────────────────────────────────────────────────────
// Rollen der sechs Orbit-Slots. Die Tabellen dazu stehen in config/constants.ts,
// die Logik im planetShopStore — der Typ gehört keiner der beiden Seiten allein.
export type PlanetRoleType =
  | 'turret_planet'
  | 'harvest_node'
  | 'expedition_relay'
  | 'shield_barrier'
  | 'time_capsule'
  | 'resonance_tower'

export interface PlanetRole {
  id: PlanetRoleType
  name: string
  bonusType:
    | 'auto_attack_dps'
    | 'material_harvest_rate'
    | 'expedition_reward_multiplier'
    | 'boss_damage_reduction'
    | 'offline_boost'
    | 'building_cps_multiplier'
  bonusPerSlot: number
  icon: string
  color: string
  image: string
}

export interface JungleBuffDef {
  name: string
  multiplier: number
  durationMs: number
}
