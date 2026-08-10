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

// ── Void Tide — Risse, die den Orbit von aussen aufziehen ───────────────────
// Das Gegenstück zu allem anderen in diesem Spiel: kein System, das etwas gibt,
// sondern eines, das etwas nimmt, solange man es stehen lässt.

/** Wie schwer ein Riss wiegt — steuert Spawn-Uhr, Grösse und Kartenfarbe. */
export type VoidRiftSeverity = 'lesser' | 'greater' | 'abyssal'

/**
 * Die Achsen, an denen ein Riss zieht bzw. seine Beute zahlt. Bewusst DIESELBE
 * Liste wie bei Drifter und Omen — ein Riss ist ein Multiplikator wie jeder
 * andere, er steht nur unter 1. Eine eigene Liste hätte beim nächsten Zusatz
 * still danebengestanden.
 */
export type VoidTideEffects = TimedBuffEffects

/**
 * Statische Definition eines Riss-Typs — reine Daten. Der Store öffnet, zieht
 * und schliesst sie; gezeichnet werden sie vom `VoidTideLayer`.
 */
export interface VoidRiftDef {
  id: string
  /** Was der Spieler liest — Toast, HUD-Karte, Herald. */
  name: string
  severity: VoidRiftSeverity
  /** Relatives Gewicht INNERHALB der eigenen Schwere. */
  weight: number
  /** Iconify-Name für die HUD-Karte. Der Riss selbst ist reines CSS. */
  icon: string
  /** Signaturfarbe: Aura, Rand-Ping, HUD-Karte. */
  color: string
  /** Kantenlänge des Risses in px bei vollem Wachstum. */
  sizePx: number
  /** Eine Zeile, die sagt, was er kostet — steht auf der HUD-Karte. */
  drainLine: string
  /** Eine Zeile, die sagt, was das Schliessen einbringt. */
  boonLine: string
  /**
   * Woran er zieht, solange er offen steht. Die Werte gelten bei VOLLEM
   * Wachstum — frisch geöffnet wirkt er anteilig schwächer, siehe
   * `voidTideStore.drainEffects`.
   */
  drain: VoidTideEffects
  /** Was das Schliessen auszahlt. */
  boon: {
    durationMs: number
    effects: VoidTideEffects
    /** Chimes im Wert von so vielen Sekunden aktueller Produktion. */
    chimesFromCpsSeconds?: number
    /** So viele Materialwürfe. */
    materials?: number
  }
  /** Was ein Kollaps hinterlässt — dasselbe Ziehen, nur befristet und härter. */
  aftermath: VoidTideEffects
}

/** Ein Riss, der gerade offen steht. Position und Wachstum leitet der Renderer
 *  aus `openedAt` ab, damit ein gedrosselter Tab sie nicht desynchronisiert. */
export interface ActiveVoidRift {
  /** Eindeutige Instanz-Id — zugleich der Vue-Render-Key. */
  uid: number
  defId: string
  /** Winkel auf dem Rand-Ring (rad) — wo am Bildrand er aufreisst. */
  angle: number
  /** Abstand von der Bildmitte, als Anteil der halben Bildschirmdiagonale. */
  radiusFrac: number
  openedAt: number
  /** Wanduhr-Zeitpunkt, an dem er kollabiert, wenn er dann noch steht. */
  collapseAt: number
  maxHp: number
  currentHp: number
  /** Hochgezählt bei jedem Klick — treibt den Trefferblitz im Layer. */
  hitsLanded: number
}

/** Ein laufendes Kollaps-Nachbeben. `sourceId` ist die `VoidRiftDef.id`. */
export interface VoidTideAftermath {
  sourceId: string
  expiresAt: number
  durationMs: number
  effects: VoidTideEffects
}

/** Bilanz des letzten geschlossenen bzw. kollabierten Risses. Der Layer spielt
 *  sich an `seq` ab — ein erzwungener Kollaps sieht damit aus wie ein echter. */
export interface VoidTideOutcome {
  /** Hochgezählt bei jedem Ausgang; `0` heisst: noch keiner. */
  seq: number
  at: number
  defId: string
  /** `true` = geschlossen, `false` = kollabiert. */
  sealed: boolean
  /** Bildschirmposition, an der es passierte — dort spielt der Effekt. */
  x: number
  y: number
  /** Sonnen-HP, die der Kollaps gekostet hat. Bei `sealed` immer 0. */
  hpLost: number
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
