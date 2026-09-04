// Welt: Planeten, Sterne, Boss-Events, Drifter, Planeten-Slots.

import type { ChampionRole, TimedBuffEffects } from './core'

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

/** Gestalt eines Orbit-Sterns — rein kosmetisch, beim Spawn gewürfelt
 *  (`utils/fx/starBodySprite.ts`). Die FARBE trägt weiter die Rolle. */
export type StarLook =
  | 'dwarf'
  | 'giant'
  | 'pulsar'
  | 'binary'
  | 'flare'
  | 'veil'
  | 'umbra'
  | 'splinter'

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
  /** Extra sprite passes the body is rastered with. */
  detail: 0 | 1 | 2
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

/** Which sprite motif `drifterSprite.ts` paints for a drifter in flight. Every
 *  type has its own body; the icon only ever shows up in the HUD chips. */
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
  /** Sprite motif drawn while the drifter crosses the orbit view. */
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

/** Was im Schlund gezeichnet wird: Glutpunkte tief drin, oder Kristallspitzen,
 *  die herausragen. Gezeichnet, kein Bild — der Void hat keine Gestalt. */
export type VoidDwellerMotif = 'embers' | 'spires'

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
   * Das Motiv im Schlund — oder `undefined` für ein blosses Loch.
   *
   * Bewusst nicht für jeden Typ: die kleinen Wesen bleiben gestaltlose Risse,
   * und genau dadurch heisst „da ist etwas drin" etwas.
   */
  dweller?: VoidDwellerMotif
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

/* ── Landfalls — Orte auf einer Reiseetappe ───────────────────────────────── */

/** Der Katalog WÄCHST; jeder neue Ort erweitert diese Union und
 *  `config/world/landfalls.ts` gemeinsam, damit nichts halb existiert. */
export type LandfallKindId =
  | 'wayside_cairn'
  | 'chime_reef'
  | 'the_gloaming'
  | 'sunken_ossuary'
  | 'adrift_convoy'
  | 'the_rupture'

/**
 * Wie ein Ort bedient wird. Die GESTE ist das, was die Orte voneinander trennt —
 * mehr als der Lohn: Ausdauer, eine Entscheidung, ein Endspurt, Nachdenken,
 * Eile, oder gar nichts.
 */
export type LandfallGesture =
  /** Viele Griffe, jeder legt zu (Chime Reef). */
  | 'gradient'
  /** Griffe bis zu `tapCap`; darunter zahlt er NICHTS (Adrift Convoy). */
  | 'threshold'
  /** Ein einziger Griff genügt und schliesst ihn sofort (Sunken Ossuary). */
  | 'single'
  /** Eine Wahl unter dreien (Wayside Cairn). */
  | 'choice'
  /** Keine Geste — er zahlt beim Vorbeifliegen (The Gloaming). */
  | 'none'

/**
 * Wie selten ein Ort ist — und damit, wie viel Raum sein Körper auf der Bühne
 * einnimmt. Vorbild ist `DrifterRarity`, und der Grund ist derselbe: die
 * Wertigkeit stand als `weight` schon im Katalog, war aber nirgends zu sehen.
 *
 * EXPLIZIT am Def, nicht aus `weight` gerechnet: eine abgeleitete Stufe spränge,
 * sobald jemand ein Gewicht um zwei Punkte verschiebt. Die Monotonie gegen die
 * Gewichtsfolge bindet stattdessen eine Spec.
 */
export type LandfallPresence = 'common' | 'uncommon' | 'rare' | 'singular'

/**
 * Was für ein Objekt der Körper auf der Bühne IST.
 *
 * Jeder Ort hat seine eigene Silhouette, und jede ist etwas, das man so auch im
 * echten Weltall fände: ein Trümmerschwarm, eine Dunkelwolke, eine Kette
 * Havaristen, ein totes Habitat, ein Planetoid mit Landmarke, eine
 * Gravitationslinse. Die 4-px-Marke der Karte teilt sich weiterhin EINE Raute —
 * dort trägt keine Textur, hier stehen 53 bis 197 px zur Verfügung.
 *
 * Getrennt von `LandfallKindId` geführt wie `DrifterBodyKind` von `DrifterId`:
 * ein siebter Ort darf sich ein Motiv leihen, ohne dass es dafür einen zweiten
 * Zeichenzweig braucht.
 */
export type LandfallMotif =
  /** Chime Reef — ein Schwarm Eistrümmer auf einer flachen Ellipse. */
  | 'shoal'
  /** The Gloaming — eine Dunkelwolke ohne Kante, die nur Dichte hat. */
  | 'darkcloud'
  /** Adrift Convoy — drei gestaffelte Rümpfe, einer mit Notsignal. */
  | 'derelicts'
  /** Sunken Ossuary — ein gekippter Zylinder unter Regolith, Luke versiegelt. */
  | 'hulk'
  /** Wayside Cairn — ein Planetoid, darauf ein gestapelter Steinturm. */
  | 'planetoid'
  /** The Rupture — kein Körper: Sichelbögen gelinsten Sternlichts. */
  | 'lens'

/**
 * Wie viel Zierrat eine Präsenzstufe trägt. Wie `DrifterFxStage` gebaut: jede
 * Stufe legt GENAU EINE Ebene dazu, statt die vorige neu zu formulieren.
 *
 * Jeder Wert wird zusammen mit `LANDFALL_ORNAMENT_MIN_PX` gelesen, nie allein
 * (Performance-Regel 7): an den Enden der Sehne steht der Körper auf 45 % seiner
 * Grösse, und eine Ebene von zwei Pixeln ist unsichtbar und trotzdem voll bezahlt.
 */
export interface LandfallFxStage {
  presence: LandfallPresence
  /** Staubschleier um den Körper, 0–2 — jeder atmet auf eigenem Versatz. */
  veilLayers: number
  /** Deckkraft des innersten Schleiers. */
  veilAlpha: number
  /** Begleitsplitter, die mit dem Körper ziehen. */
  motes: number
  /** Zusätzliche Sprite-Pässe: mehr Krater, mehr Plattenfugen, Begleitkörner. */
  detail: 0 | 1 | 2
  /** Eine einmalige Welle beim Auftauchen — nur der seltenste Ort meldet sich an. */
  herald: boolean
}

export interface LandfallDef {
  id: LandfallKindId
  name: string
  blurb: string
  icon: string
  /** Ab welcher Galaxie dieser Ort in die Auswahl kommt. */
  unlockGalaxy: number
  /** Gewicht innerhalb der bereits freigeschalteten Menge. */
  weight: number
  /** Wie selten er ist — steuert allein den Zierrat des Körpers, nie den Lohn. */
  presence: LandfallPresence
  gesture: LandfallGesture
  /**
   * Wie viele Griffe der Ort höchstens zählt. Bei `threshold` ist es zugleich
   * das ZIEL: darunter gilt er als versäumt.
   *
   * Am DEF und nicht auf Modulebene: die vier `LANDFALL_REEF_*` standen dort,
   * und mit sechs Orten wären daraus vierundzwanzig lose Konstanten geworden.
   */
  tapCap?: number
  /** Sockel in Sekunden aktueller CpS — der Anteil, der auch ohne Griff fällt. */
  baseSeconds?: number
  /** Was ein einzelner Griff obendrauf legt, ebenfalls in CpS-Sekunden. */
  tapSeconds?: number
  /** Wie viele Materialwürfe er auslöst, wenn er gelingt. */
  materials?: number
  /**
   * NUR The Rupture: so viele Void-Wesen entkommen, wenn sie nicht versiegelt
   * wird. Die Geste bleibt `threshold` — der Unterschied zum Konvoi liegt in
   * der FOLGE des Versäumens, nicht im Bedienen.
   */
  burst?: number
}

/* ── Der Segen des Wayside Cairn ──────────────────────────────────────────── */

export type LandfallBoonId = 'keptChimes' | 'sureFooting' | 'watchfulSky' | 'longSight'

/**
 * Die Achse, an der ein Segen zieht.
 *
 * Bewusst ein Ausschnitt aus `TimedBuffEffects` und keine eigene Liste:
 * `materialDropMult` fehlt, weil es sättigt (`tryDropMaterial` würfelt gegen
 * `Math.random()`), und ein Segen, der ab einem Ausbaustand nichts mehr tut,
 * wäre eine Falle.
 */
export type LandfallBoonAxis = 'cpsMult' | 'cpcMult' | 'combatDpsMult' | 'xpMult'

export interface LandfallBoonDef {
  id: LandfallBoonId
  name: string
  /** Eine Zeile, die der Spieler am Stein liest. */
  line: string
  icon: string
  axis: LandfallBoonAxis
}

/**
 * Was ein Stern hergab — mitgeschrieben, weil nichts davon abzuleiten ist.
 *
 * Lage, Name und Sprite-Variante eines Sterns kommen aus `mapSeed` plus Index;
 * der Champion dagegen wird beim Boss-Spawn gegen den LEBENDEN Kader gezogen
 * (`planetBossStore`), und die Bilanz seiner Planeten ist mit `activeStars`
 * weg. Steht parallel zu `attemptResults`: gleiche Länge, gleicher Index,
 * derselbe Stern.
 */
export interface StarManifest {
  /** Champion des Heimatplaneten. Fehlt, wenn kein freigeschaltetes Tier mehr
   *  einen ungeworbenen hergab — der Stern gilt trotzdem als befreit. */
  champion?: string
  /** Die Rolle, für die er geflogen wurde. */
  role?: ChampionRole
  /** Planetenslots des Sterns — das Spiel nennt sie durchweg PLANETEN
   *  (`planetSlots`, `totalPlanetsCleared`), nicht Welten … */
  planets: number
  /** … und davon geräumt, als er abging. */
  cleared: number
  /** Chimes, die seine Bosse zusammen zahlten — nach Fortune, wie gebucht. */
  chimes: number
  /** Spielzeit-Sekunden von Spawn bis Abgang … */
  heldSec: number
  /** … gegen das Fenster, das er hatte. MITGESCHRIEBEN statt aus
   *  `CHAMPION_STAR_DURATION_MS` gelesen: die Konstante darf sich ändern, ein
   *  Archiv nicht rückwirkend lügen. */
  windowSec: number
}

/** Was ein Ort auf der Karte hinterlässt. Position und Art sind ABGELEITET,
 *  nur der Ausgang wird gespeichert — parallel zu `attemptResults`. */
export interface LandfallOutcome {
  kind: LandfallKindId
  cleared: boolean
}

/** Die Ereignis-Chronik einer Galaxie: was passiert ist, ohne einen Ort zu
 *  haben. Drifter und Void-Wesen sind ORTLOS — die LAGE der Marke ist deshalb
 *  abgeleitet (`utils/game/galaxyIncidents.ts`), gespeichert wird das Ereignis. */
export type GalaxyIncidentKind = 'void-impact' | 'drifter-caught' | 'drifter-missed'

export interface GalaxyIncident {
  kind: GalaxyIncidentKind
  /** Etappe, auf deren Sehne die Marke liegt. 0 = Abflugportal zum ersten Stern. */
  leg: number
  /** Katalog-ID (`VoidRiftDef.id` / `DrifterDef.id`) — sie trägt Name, Icon und Rang.
   *  Der Rang steht nicht daneben: zwei Quellen laufen auseinander. */
  id: string
  /** Nur beim Einschlag: was er gekostet hat. */
  hp?: number
  meeps?: number
}

/** Ein geplanter Ort auf einer Etappe. Rein aus `mapSeed` + Etappennummer
 *  gerechnet, nie gespeichert (`utils/game/landfalls.ts`). */
export interface LandfallPlan {
  kind: LandfallKindId
  /** Etappennummer: 0 = Abflugportal → erster Stern. */
  leg: number
  /** Anteil auf der Etappe, an dem der Ort fällig wird. */
  t: number
  /** Seitlicher Versatz von der Routenlinie, damit die Linie ihn nicht deckt. */
  bow: number
}

/** Der eine Ort, der GERADE offen steht. Nicht persistiert — dieselbe Regel wie
 *  bei Void-Wesen unterwegs: er käme mit halb abgelaufenem Fenster wieder. */
export interface ActiveLandfall extends LandfallPlan {
  /** Spielzeit-Stempel, zu dem der Ort fällig wurde. */
  openedAt: number
  /** Wie oft der Spieler ihn schon angefasst hat. Generisch: das Riff summiert
   *  sie, Konvoi und Rupture messen sie gegen ein Ziel, das Ossuar braucht
   *  genau einen, Cairn und Gloaming zählen keinen. */
  taps: number
  /** NUR `gesture: 'choice'` — der genommene Segen. `null` heisst „noch nicht". */
  choice?: string | null
}
