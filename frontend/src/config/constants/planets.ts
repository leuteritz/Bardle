// Planeten-Slots und was auf ihnen passiert: Rollen und Jungle-Buffs der sechs
// Slots, ihre Attunement-Stufen, sowie die Boss-Kämpfe mitsamt Arena, Turret-
// Batterie und Striker-Squad.

import type { ChampionRole, PlanetRole, PlanetRoleType, JungleBuffDef } from '@/types'

/** Eigene, tiefere Warnschwelle der Striker-Plakette im Star-Fight. */
export const STRIKER_HP_LOW_PCT = 25

// ── Weitere UI-Timings ────────────────────────────────────────────────────
/** Auffrisch-Takt des Star-Fight-Modals: 4 Hz reichen für Ringe und Countdowns. */
export const STAR_FIGHT_MODAL_TICK_MS = 250
/** Radius des Planeten-Hintergrunds im Star-Fight-Modal (600er viewBox). */
export const STAR_FIGHT_MODAL_PLANET_R = 260
export const STAR_FIGHT_MODAL_PLANET_R_GALAXY_BOSS = 290

// Pre-scaled planet thumbnails (256px, HQ resampling) for small UI tiles —
// browsers blur when minifying the ~700px originals down to ~60px in one step
export const PLANET_IMAGE_DIR = '/img/planets/'
export const PLANET_IMAGE_THUMB_DIR = '/img/planets/thumb/'

// Resource star flyby — mehrere Sterne erscheinen zufällig gestaffelt während der Reise
export const RESOURCE_STAR_INTERVAL_MIN_MS = 12_000 // frühester Abstand bis zum nächsten Spawn
export const RESOURCE_STAR_INTERVAL_MAX_MS = 40_000 // spätester Abstand bis zum nächsten Spawn
export const RESOURCE_STAR_MAX_CONCURRENT = 3 // max. gleichzeitig aktive Resource-Stars
export const RESOURCE_STAR_DURATION_MS = 45_000 // flyby lasts 45s
export const RESOURCE_STAR_PLANET_COUNT = 3 // max. planets per flyby

// Planet Boss Fight
export const BOSS_BASE_HP = 200
export const BOSS_HP_LEVEL_SCALE = 10
// Gegengewicht zu den vielen sichtbaren Schadensquellen im Star-Fight-Modal:
// jeder Champion-Stern im Team und jede erreichte Galaxie skalieren die HP mit
export const BOSS_HP_PER_CHAMPION_STAR = 0.1 // +10% HP per star level of each slotted champion
export const BOSS_HP_PER_GALAXY = 0.2 // +20% HP per galaxy beyond the first
export const BOSS_HP_CPS_SCALE = 50
export const BOSS_HP_POWER_SCALE = 5000
export const BOSS_ENRAGE_BASE_SECONDS = 30
export const BOSS_ENRAGE_LEVEL_STEP = 5
export const BOSS_ENRAGE_MAX_SECONDS = 60
export const BOSS_PASSIVE_DPS_FRACTION = 0.1
export const BOSS_CPS_PENALTY_FRACTION = 0.05
export const BOSS_CPS_PENALTY_DURATION_MS = 30_000
/** Nachlauf, bevor ein besiegter oder abgelaufener Boss vom Planeten verschwindet. */
export const BOSS_REMOVE_DELAY_MS = 900
export { BOSS_NAMES } from '@/config/battle/bossNames'

// ── Boss-Arena: Darstellung des Kampfes (BossArenaSection) ─────────────────
/** Takt eines Champion-Angriffszyklus und der Punkt darin, an dem der Schlag landet. */
export const BOSS_ARENA_ATTACK_CYCLE_MS = 2600
export const BOSS_ARENA_IMPACT_OFFSET_FRACTION = 0.36
/** Versatz zwischen zwei Champions, damit nicht alle gleichzeitig zuschlagen. */
export const BOSS_ARENA_ATTACK_STAGGER_MS = 650
/** Jeder ULT_EVERY-te Angriff ist ein Ult; so lange läuft dessen Animation. */
export const BOSS_ARENA_ULT_EVERY = 5
export const BOSS_ARENA_ULT_ANIM_MS = 3400
/**
 * Auffrisch-Takt der Arena. Bewusst 250 ms statt 100 ms: das Intervall
 * re-rendert den kompletten Arena-Subtree, 10×/s war im Star-Fight-Modal ein
 * messbarer FPS-Fresser.
 */
export const BOSS_ARENA_TICK_INTERVAL_MS = 250
/** Standzeit einer Schadenszahl — größere Treffer bleiben etwas länger stehen. */
export const BOSS_ARENA_FLOAT_LIFETIME_MS = 900
export const BOSS_ARENA_FLOAT_LIFETIME_BIG_MS = 1100
/** Streuung der Schadenszahl in der Arena, als Anteil ihrer Fläche. */
export const BOSS_ARENA_FLOAT_X_BASE = 0.4
export const BOSS_ARENA_FLOAT_X_SPREAD = 0.2
export const BOSS_ARENA_FLOAT_Y_BASE = 0.2
export const BOSS_ARENA_FLOAT_Y_SPREAD = 0.3
/** Aufleuchten des Bosses und Wackeln der Arena, je Trefferart. */
export const BOSS_ARENA_HIT_CLICK_MS = 160
export const BOSS_ARENA_SHAKE_CLICK_MS = 320
export const BOSS_ARENA_HIT_CHAMPION_MS = 140
export const BOSS_ARENA_SHAKE_CHAMPION_MS = 280
export const BOSS_ARENA_HIT_ULT_MS = 280
export const BOSS_ARENA_SHAKE_ULT_MS = 520
/** Schaden je Champion-Angriff bzw. -Ult. */
export const BOSS_ARENA_CHAMPION_HIT_DAMAGE = 1
export const BOSS_ARENA_CHAMPION_ULT_DAMAGE = 5
/** Bogen, auf dem die Champions um den Boss stehen. */
export const BOSS_ARENA_ARC_SPAN_BASE_DEG = 70
export const BOSS_ARENA_ARC_SPAN_PER_CHAMPION_DEG = 45
export const BOSS_ARENA_ARC_SPAN_MAX_DEG = 160
export const BOSS_ARENA_ARC_RADIUS_PX = 115
/** Strecke, die ein Champion beim Zuschlagen Richtung Boss ausschlägt. */
export const BOSS_ARENA_STRIKE_REACH_PX = 62
/** Versatz der CSS-Schlaganimation zwischen den Champions, in Sekunden. */
export const BOSS_ARENA_STRIKE_STAGGER_S = 0.65

/**
 * Boss-Sprites in `public/img/Boss/`. Bewusst eine feste Liste: die frühere
 * Laufzeit-Erkennung lud `Boss1.png`, `Boss2.png`, … sequenziell per `new Image()`
 * bis zum ersten 404 — 11 Requests und ~10 MB PNG-Decode bei JEDEM Öffnen des
 * Star-Fight-Modals, mitten in der Einblende-Animation.
 *
 * Neue Sprites hier eintragen. Maßstab: die Sprites werden mit 400–700 px Höhe
 * dargestellt (Full HD bis 4K), mehr als ~1400 px Kantenlänge ist verschwendeter
 * Decode — Boss11/12 lagen ursprünglich bei 2760×1504 (4,15 Mpx) und wurden
 * deshalb auf 1408×767 gebracht, wie der restliche Satz.
 */
export const BOSS_IMAGE_PATHS = [
  '/img/Boss/Boss1.png',
  '/img/Boss/Boss2.png',
  '/img/Boss/Boss3.png',
  '/img/Boss/Boss4.png',
  '/img/Boss/Boss5.png',
  '/img/Boss/Boss6.png',
  '/img/Boss/Boss7.png',
  '/img/Boss/Boss8.png',
  '/img/Boss/Boss9.png',
  '/img/Boss/Boss10.png',
  '/img/Boss/Boss11.png',
  '/img/Boss/Boss12.png',
] as const

// Planet type display names
export const PLANET_TYPE_NAMES: Record<string, string> = {
  rocky: 'Rocky Planet',
  ice: 'Ice Planet',
  'gas-giant': 'Gas Giant',
  lava: 'Lava Planet',
  ocean: 'Ocean Planet',
  desert: 'Desert Planet',
  jungle: 'Jungle Planet',
  ringed: 'Ringed Planet',
  crystal: 'Crystal Planet',
  toxic: 'Toxic Planet',
  void: 'Void Planet',
  aurora: 'Aurora Planet',
  shattered: 'Shattered Planet',
  storm: 'Storm Planet',
  bloom: 'Bloom Planet',
  neon: 'Neon Planet',
  obsidian: 'Obsidian Planet',
  coral: 'Coral Planet',
}

export const BARON_OBJECTIVE_HP = 4000

/** Standardhöhe eines Planeten-Glyphs; die Breite folgt dem viewBox-Verhältnis. */
export const PLANET_GLYPH_DEFAULT_SIZE_PX = 96

/** Aufblitzen der Spieler-HP-Leiste nach einem Treffer. */
export const PLAYER_HP_HIT_FLASH_MS = 350

/** Game-seconds the jungler stands at a camp before its clear event fires */
export const JUNGLE_BUFF_CLEAR_DURATION_T = 45

/** Game-seconds a slain buff camp needs to respawn (5:00, like on the Rift) */
export const JUNGLE_BUFF_RESPAWN_T = 300
/** Minimum game-seconds after a buff respawn until the jungler re-clears it */
export const JUNGLE_BUFF_RECLEAR_GAP_MIN_T = 60
/** Maximum game-seconds after a buff respawn until the jungler re-clears it */
export const JUNGLE_BUFF_RECLEAR_GAP_MAX_T = 240
/** No buff re-clears are scripted later than this margin before the nexus falls */
export const JUNGLE_BUFF_LATE_MARGIN_T = 600
/** Game-seconds the cosmetic buff aura stays on the jungler after a clear */
export const JUNGLE_BUFF_CARRY_DURATION_T = 150

export const PLAYER_MAX_HP_BASE = 100
export const PLAYER_HP_REGEN_PER_SEC = 1
export const PLAYER_HP_LOSS_ON_ENRAGE = 25

// Enemy planet attacks
export const PLANET_SLOT_MAX_HP = 100
// Planet "Attunement" leveling — per-slot progression gated by Chimes + Sun Phase
export const PLANET_LEVEL_BONUS_PCT = 0.1 // +10% to the role's bonusPerSlot per level above 1
export const PLANET_LEVEL_HP_PCT = 0.2 // +20% of base max HP per level above 1
export const PLANET_LEVEL_COST_FACTOR = 0.5 // level-up base cost = slot.baseCost * factor
export const PLANET_LEVEL_COST_MULTIPLIER = 1.6 // geometric cost growth per level
export const PLANET_LEVELS_PER_PHASE = 5 // levels unlocked per Sun Phase
export const PLANET_LEVEL_MAX_PHASE = 5 // cap aligned to starPhase max (0–5)
export const PLANET_MILESTONE_INTERVAL = 5 // every Nth Attunement grants a perk spike
export const PLANET_MILESTONE_BONUS = 0.25 // +25% of base role bonus per milestone reached
export const PLANET_MAX_BULK_LEVELS = 1000 // safety cap for the "Max" simulation loop
// Attunement rank tiers — ordered bands; highest min <= level wins
export const PLANET_RANK_TIERS: { min: number; name: string; color: string }[] = [
  { min: 1, name: 'Nascent', color: '#9aa0a6' },
  { min: 5, name: 'Resonant', color: '#52b830' },
  { min: 10, name: 'Harmonic', color: '#40a0e0' },
  { min: 20, name: 'Celestial', color: '#c060e0' },
  { min: 35, name: 'Transcendent', color: '#e8c040' },
]
export const ENEMY_PROJECTILE_DAMAGE = 8

/**
 * Planeten-Batterie im Star-Fight-HUD. Die drei Maße spiegeln das CSS
 * `clamp(54px, 7vh, 76px)` der Planetenkachel — der Cooldown-Ring wird im
 * Canvas gezeichnet und muss dieselbe Größe treffen, sonst sitzt er daneben.
 */
export const BATTERY_PLANET_MIN_PX = 54
export const BATTERY_PLANET_MAX_PX = 76
export const BATTERY_PLANET_VIEWPORT_H_FRACTION = 0.07
/** Saum zwischen Planetenrand und Ring. */
export const BATTERY_RING_SEAM_PX = 7

export const BOSS_CHAMPION_ATTACK_DPS = 6 // boss dmg/s dealt to each orbiting champion
export const BOSS_GALAXY_CHAMPION_DPS_MULT = 2 // galaxy bosses hit twice as hard

export const BOSS_HIT_REACT_MS = 350 // boss flinch animation when a champion projectile lands

// ── Boss Rage — every boss periodically enrages and deals double damage;
//    interval and duration are rolled per boss (roleBehaviorStore._tickBossRage)
export const BOSS_RAGE_DMG_MULT = 2 // damage multiplier while raging
export const BOSS_RAGE_INTERVAL_MIN_MS = 9000 // min cooldown between rages
export const BOSS_RAGE_INTERVAL_MAX_MS = 16000 // max cooldown between rages
export const BOSS_RAGE_DURATION_MIN_MS = 5000 // min rage duration
export const BOSS_RAGE_DURATION_MAX_MS = 12000 // max rage duration

// ── Star Fight Modal — Role Striker Squad (RoleStrikerSquad.vue) ──────────
export const STRIKER_FLOAT_DURATION_MS = 1400 // floating dmg number lifetime above a striker
export const STRIKER_FLOAT_MAX = 8 // cap on simultaneous striker damage floats
export const STRIKER_PROJECTILE_FLIGHT_MS = 550 // projectile travel time
/**
 * Funken-Richtungen beim Einschlag. Fest verdrahtet statt gewürfelt: ein
 * Math.random pro Frame würde die Streuung jedes Bild neu ziehen und den
 * Einschlag flackern lassen.
 */
export const STRIKER_SPARK_DIRS = [
  { x: 24, y: -8 },
  { x: 14, y: -22 },
  { x: -10, y: -24 },
  { x: -24, y: -6 },
  { x: -16, y: 18 },
  { x: 18, y: 16 },
] as const
/** Abstand des Mündungsblitzes vom Portraitmittelpunkt, Richtung Boss. */
export const STRIKER_MUZZLE_OFFSET_PX = 52
export const STRIKER_IMPACT_MS = 900 // impact burst + damage number lifetime
export const STRIKER_FIRE_FLASH_MS = 550 // snap phase of the attack (lunge → impact hold → settle)
export const STRIKER_ATTACK_WINDUP_MS = 1000 // windup phase: starts the moment the pill shows 0s (one store tick before fire)
export const STRIKER_MUZZLE_MS = 280 // muzzle flash lifetime (matches its CSS animation)
export const STRIKER_ATTACK_LUNGE_PX = 22 // how far the portrait lunges toward the boss on attack
// Der Windup zieht die Einheit "weg vom Boss" — der steht ÜBER der Row, der
// Rückzug geht also nach unten. Für den Mid-Striker ist das exakt senkrecht
// (er steht in der Boss-Spalte): er zöge sich mitsamt seiner Info-Plate 21 px
// in die Sonne zurück, auf der er steht, und über deren HP-Leiste. Nach unten
// ist der Rückzug deshalb gedeckelt — seitwärts bleibt er unbeschnitten, dort
// steht nichts im Weg.
export const STRIKER_WINDUP_MAX_DOWN_PX = 8
// Champion-Row am Sonnen-Horizont: Winkel in Grad (0° = rechts, 90° = unten)
// je Rolle — Top ganz links, Mid oben Mitte, Support rechts. Alle Maße in %
// der Arena, damit das Layout auf Full-HD wie auf 2K identisch sitzt.
// Winkel so gewählt, dass die fünf Striker HORIZONTAL gleichmäßig verteilt
// sind (x = 24 / 37 / 50 / 63 / 76 % — je 13 % Abstand); der schmalere Bogen
// hält die Außenrollen klar von den Turret-Battery-Spalten (13 % / 87 %) frei.
// Die Winkel liegen auf der OBEREN Ellipsenhälfte (sin < 0) — die Row wölbt
// sich damit wie der Sonnen-Horizont darunter: Mid am höchsten, Top/Support
// weiter außen und tiefer, exakt der Krümmung der Sonnenscheibe folgend.
export const STRIKER_ARC_ANGLES: Record<ChampionRole, number> = {
  top: 210,
  jungle: 244,
  mid: 270,
  adc: 296,
  support: 330,
}
export const STRIKER_ARC_RX_PCT = 30 // horizontal semi-axis of the striker arc (% arena width)
// Flach: die Champions stehen als Row auf dem Sonnen-Horizont, kein tiefer
// Halbkreis mehr — sonst tauchen die Info-Plates in die Sonnenscheibe ein
export const STRIKER_ARC_RY_PCT = 3 // vertical semi-axis of the striker arc (% arena height)
// 68 statt 71: die Info-Plates hängen unter den Portraits und sind mit der
// auflösungsabhängigen Skalierung (--sip-u) gewachsen — die MITTLERE Plate lief
// dadurch in den Kopf der Sonnen-HP-Anzeige (.sfsun-hp-head), die exakt darunter
// mittig sitzt. Gemessene Überlappung vorher: 13 px auf Full HD, 18 px auf
// WUXGA, 26 px auf 2K. Die 3 % Hebung sind das obere Ende dessen, was das
// Vertikal-Budget hergibt: über der Row liegt das Loot-Banner (Unterkante
// 55–59 %), danach bleiben 11 px Luft auf WUXGA — dem flachsten Fall mit dem
// größten Banner. Nicht weiter anheben, ohne das Banner mitzumessen.
export const STRIKER_ARC_CENTER_Y_PCT = 68 // arc center as % of arena height (between loot banner and sun horizon)
export const STRIKER_BOSS_ANCHOR_X_PCT = 50 // projectile target: boss center X (% arena width)
export const STRIKER_BOSS_ANCHOR_Y_PCT = 41 // projectile target: boss center Y (% arena height)
export const STRIKER_PROJECTILE_IMPACT_FRAC = 0.7 // projectile stops at this fraction toward boss center

// Turret Battery — turret-planet volleys in the Star Fight Modal, synced with
// the idle-orbit turret shots via planetBossStore.turretVolleyCounter
export const TURRET_PROJECTILE_FLIGHT_MS = 420 // turret comet travel time to the boss
export const TURRET_DAMAGE_FLOAT_MS = 1000 // lifetime of the turret damage float at the boss
export const TURRET_ATTACK_LUNGE_PX = 16 // how far a turret planet snaps toward the boss on volley
export const TURRET_CD_TICK_MS = 100 // UI refresh of the turret cooldown pill (sub-second display)
export const BOSS_PLANET_ATTACK_DPS = 3 // boss dmg/s dealt to each player planet slot during the fight
// Boss-Schockwelle: der Ring läuft sichtbar bis über Champions + Turrets;
// Hit-Flash und Damage-Labels feuern erst, wenn der Ring die Ziele erreicht
export const BOSS_WAVE_TRAVEL_MS = 800 // full lifetime of the expanding boss shockwave ring
export const BOSS_WAVE_HIT_DELAY_MS = 500 // moment the ring reaches champions/turrets → hit flash + damage labels
// Boss-Fähigkeit "Shock Nova": die AoE-Welle ist eine Fähigkeit mit Cooldown —
// pro Auslösung trifft sie alle Champions, alle Turret-Planeten UND den Spieler.
// Schaden pro Welle = DPS × Intervall (balance-neutral zum alten Sekundentakt).
// Der Idle-Orbit-Stern des aktiven Bosses teilt sich exakt diesen Cooldown.
export const BOSS_NOVA_INTERVAL_MS = 5000 // cooldown between two Shock Nova waves
export const BOSS_NOVA_PLAYER_DAMAGE = 5 // base damage each nova deals to the sun (Bard) in the orbit center
// Boss-Fähigkeit "Strike" (Auto-Attack): kurzer Cooldown, trifft EIN zufällig
// gewähltes lebendes Ziel (Champion, Spieler-Planet ODER die Sonne) — Rage
// verdoppelt auch diesen Schaden, wodurch die Rage-Phase bedrohlicher wird
export const BOSS_AUTO_INTERVAL_MS = 3000 // cooldown between two boss auto-attacks
export const BOSS_AUTO_ATTACK_DAMAGE = 8 // base single-target damage per auto-attack
/**
 * Gewicht der Sonne im Zufalls-Zielpool des Strikes. Champions und
 * Spieler-Planeten zählen je 1 — 5 bedeutet also: die Sonne wird so häufig
 * anvisiert wie alle fünf Orbit-Champions zusammen. Bewusst hoch, damit der
 * Treffer auf den Spieler im Star-Fight-Modal wie im Idle-Orbit sichtbar
 * bleibt und nicht in 1-von-12-Fällen untergeht.
 */
export const BOSS_STRIKE_SUN_WEIGHT = 5
export const BOSS_AUTO_AIM_MS = 900 // telegraph: reticle locks onto the victim before the bolt fires (< 1 game tick → shot follows on the very next tick)
export const BOSS_AUTO_HIT_DELAY_MS = 450 // flight time of the strike bolt → impact flash + damage label
// 6 feste Anker auf einem Ellipsenbogen um den Boss (Gegenstück zum unteren
// Striker-Halbkreis): Slots 1–3 auf der linken Bogenhälfte, 4–6 rechts —
// jeder Turret sitzt immer an der Position seines Slots
export const TURRET_ARC_RX_PCT = 37 // horizontal semi-axis of the turret arc (% arena width)
export const TURRET_ARC_RY_PCT = 28 // vertical semi-axis of the turret arc (% arena height)
export const TURRET_ARC_CENTER_Y_PCT = 38 // arc center as % of arena height (boss level)
export const TURRET_ARC_ROW_ANGLE_DEG = 30 // angular spacing of the 3 rows from the horizontal axis
// Gestrichelte Guide-Linien (Turret-Bogen + Striker-Halbkreis) laufen über die
// äußersten Slots hinaus weiter, bis sie die zentrale Planeten-Silhouette
// erreichen — so wirkt es, als schlössen sie sich hinter dem Planeten
export const ARC_GUIDE_PLANET_RADIUS_FRAC = 0.42 // planet silhouette radius as fraction of min(arena w, h)
export const ARC_GUIDE_MAX_EXTEND_DEG = 80 // safety cap for extending a guide past its outermost slot
export const ARC_GUIDE_STEP_DEG = 1 // angular resolution of the planet-edge search

/** Required sun phase (starPhase) to unlock each planet slot. Every sun phase after
 *  the comet unlocks one slot: slot index 0 → Spark (phase 0), …,
 *  slot index 5 → Collapse (phase 5). */
export const PLANET_SLOT_SUN_PHASE_REQUIREMENTS: number[] = [0, 1, 2, 3, 4, 5]

/** Pre-scale planet-slot orbit radii (× ORBIT_RADIUS_SCALE = effective radius in px).
 *  These orbit planets around *stars*, not the sun — not scaled via SUN_RADIUS. */
// ── Planeten-Slots: Rollen, Jungle-Buffs und Slot-Grunddaten ────────────
// Balance-Tabellen des Planeten-Shops. Standen bis zuletzt im Store selbst;
// laut Architektur gehören statische Spieldaten nach config/ — der Store
// re-exportiert sie nur noch für seine bisherigen Verbraucher.
export const PLANET_ROLES: Record<PlanetRoleType, PlanetRole> = {
  turret_planet: {
    id: 'turret_planet',
    name: 'Turret',
    bonusType: 'auto_attack_dps',
    bonusPerSlot: 2,
    icon: 'game-icons:archery-target',
    color: '#cc4444',
    image: '/img/planets/planet1.png',
  },
  harvest_node: {
    id: 'harvest_node',
    name: 'Harvester',
    bonusType: 'material_harvest_rate',
    bonusPerSlot: 1,
    icon: 'game-icons:wheat',
    color: '#80c840',
    image: '/img/planets/planet2.png',
  },
  expedition_relay: {
    id: 'expedition_relay',
    name: 'Relay',
    bonusType: 'expedition_reward_multiplier',
    bonusPerSlot: 0.3,
    icon: 'game-icons:rocket-thruster',
    color: '#40a0e0',
    image: '/img/planets/planet3.png',
  },
  shield_barrier: {
    id: 'shield_barrier',
    name: 'Aegis',
    bonusType: 'boss_damage_reduction',
    bonusPerSlot: 0.15,
    icon: '/img/roles/top.png',
    color: '#60a0ff',
    image: '/img/planets/planet4.png',
  },
  time_capsule: {
    id: 'time_capsule',
    name: 'Timewarp',
    bonusType: 'offline_boost',
    bonusPerSlot: 0.25,
    icon: 'game-icons:hourglass',
    color: '#40c080',
    image: '/img/planets/planet5.png',
  },
  resonance_tower: {
    id: 'resonance_tower',
    name: 'Resonator',
    bonusType: 'building_cps_multiplier',
    bonusPerSlot: 0.25,
    icon: 'game-icons:radio-tower',
    color: '#c09040',
    image: '/img/planets/planet6.png',
  },
}

export const PLANET_ROLES_LIST: PlanetRole[] = Object.values(PLANET_ROLES)

export const JUNGLE_BUFF_DEFS: Record<PlanetRoleType, JungleBuffDef> = {
  turret_planet: { name: 'Mark of the Hunter', multiplier: 2.5, durationMs: 15_000 },
  harvest_node: { name: "Scavenger's Blessing", multiplier: 3.0, durationMs: 12_000 },
  expedition_relay: { name: 'Warp Trail', multiplier: 2.0, durationMs: 20_000 },
  shield_barrier: { name: 'Aegis Pulse', multiplier: 1.5, durationMs: 15_000 },
  time_capsule: { name: 'Temporal Rift', multiplier: 2.0, durationMs: 30_000 },
  resonance_tower: { name: 'Resonant Smite', multiplier: 2.0, durationMs: 18_000 },
}

/** Laufrichtung, Bahngeschwindigkeit und Grundpreis je Slot. */
export const PLANET_SLOT_CONFIG = [
  { id: 'slot_1', direction: 1 as const, baseSpeed: 0.00018, baseCost: 500 },
  { id: 'slot_2', direction: -1 as const, baseSpeed: 0.00014, baseCost: 2000 },
  { id: 'slot_3', direction: 1 as const, baseSpeed: 0.0001, baseCost: 8000 },
  { id: 'slot_4', direction: -1 as const, baseSpeed: 0.00007, baseCost: 35000 },
  { id: 'slot_5', direction: 1 as const, baseSpeed: 0.00005, baseCost: 150000 },
  { id: 'slot_6', direction: -1 as const, baseSpeed: 0.000035, baseCost: 600000 },
] as const

export const PLANET_SLOT_ORBITS = [
  { rx: 180, ry: 50, tiltDeg: 18 },
  { rx: 236, ry: 57, tiltDeg: -12 },
  { rx: 370, ry: 85, tiltDeg: 28 },
  { rx: 460, ry: 100, tiltDeg: -8 },
  { rx: 550, ry: 115, tiltDeg: 22 },
  { rx: 640, ry: 130, tiltDeg: -18 },
] as const

// Planet Shop Roles
export const PLANET_HARVEST_INTERVAL_TICKS = 30 // harvest_node: 1 Material every 30 ticks
export const JUNGLE_BUFF_RANGE = 120 // px, screen-space proximity radius for jungle buff trigger
export const JUNGLE_BUFF_COOLDOWN_MS = 30_000 // 30s cooldown between jungle buff triggers
/**
 * Ausfallzeit eines zerstörten Planeten. Während dieser Zeit trägt er keinen
 * Rollen-Bonus bei, ist kein Ziel und fliegt nicht im Orbit; danach kehrt er mit
 * vollen HP zurück. Deutlich länger als CHAMPION_REVIVE_MS (8s), weil Planeten
 * viel mehr HP haben und entsprechend selten fallen.
 */
export const PLANET_RESPAWN_MS = 30_000

// ── Jungle-Buff-Marke im Idle-Orbit ────────────────────────────────────────
// Der gebuffte Planet trägt seinen Zustand in derselben Grammatik wie ein
// verfluchter oder rasender Stern (siehe StarSystemComponent): Marke an einer
// Leine, Restdauer als abschmelzender Balken, farbige Aura am Körper.
/** Abstand zwischen oberem Planetenrand und Unterkante der Buff-Marke (px) */
export const PLANET_BUFF_MARK_GAP_PX = 18
/** Restsekunden, ab denen die Buff-Marke blinkt (bleibt grün — kein Alarm) */
export const PLANET_BUFF_URGENT_SECS = 3

export const COMBAT_FLOAT_DURATION_MS = 1000
export const COMBAT_FLOAT_OFFSET_Y = 30
export const COMBAT_FLOAT_OFFSET_X_SPREAD = 10

// Planet boss (extended)
export const BOSS_ENRAGE_BONUS_SECONDS_PER_STEP = 5
export const BOSS_ENRAGE_MIN_SECONDS = 10
export const BOSS_REWARD_CHIMES_MAX = 5
export const BOSS_REWARD_MATERIAL_CHANCE = 0.5
export const BOSS_REMOVAL_DELAY_MS = 600
export const BOSS_REMOVAL_LONG_DELAY_MS = 900
export const BOSS_UNIVERSE_PROGRESS_FRACTION = 0.3

// Player state
/** HP percentage below which the "low HP" warning state activates */
export const PLAYER_LOW_HP_THRESHOLD_PCT = 25

// Planet shop — damage reduction
/** Maximum fraction of boss damage that can be absorbed by shield-barrier planets */
export const BOSS_DAMAGE_REDUCTION_CAP = 0.8

// Inventory
/** Default base probability for a material drop from a rescue planet */
export const MATERIAL_DROP_BASE_CHANCE = 0.3

/** Striker-Geschoss schlägt auf dem Bossplaneten ein. */
export const STRIKER_DAMAGE_FLOAT_X_SPREAD = 36
export const STRIKER_DAMAGE_FLOAT_Y_OFFSET = 48
export const STRIKER_DAMAGE_FLOAT_MS = 1100

/** Duration of the Jungle champion buff-granted flash animation (ms) */
export const JUNGLE_BUFF_FLASH_ANIM_MS = 450

// ── Planet Tab stage sizing ───────────────────────────────────────────────────
/** Sun image diameter (px) in the Planet Tab at the smallest phase radius. */
export const PLANET_TAB_SUN_MIN_DIAMETER = 340
/** Sun image diameter (px) in the Planet Tab at the largest phase radius. */
export const PLANET_TAB_SUN_MAX_DIAMETER = 560
/** Fixed base diameter (px) of the orbiting planet image (kept small vs. the sun). */
export const PLANET_TAB_PLANET_DIAMETER = 112

// ── Planet glyph (PlanetGlyph.vue) ───────────────────────────────────────────
/**
 * Drawing box of the icon-sized planet renderer. Wider than tall because a
 * ringed planet's rings reach 1.9× its radius sideways — at this aspect and
 * radius they just fit (60 = 31 × 1.9 rounded up), so no type has to be drawn
 * small enough to keep the widest one inside a square.
 */
export const PLANET_GLYPH_VIEW_W = 120
export const PLANET_GLYPH_VIEW_H = 100
export const PLANET_GLYPH_RADIUS = 31

export const BOSS_MUSIC_PATH = '/audio/StarBossMusic.ogg'
export const BOSS_MUSIC_VOLUME = 0.05
export const BOSS_MUSIC_FADE_MS = 800

// ── Resource-Star Color Palette ────────────────────────────────────────────
// Six realistic stellar spectral colors for resource stars (no champion).
// None overlap with role colors (red/green/blue/orange/silver-blue).
// Stored as RGB tuples to match StarGroup.starColor directly.
export const RESOURCE_STAR_COLORS: [number, number, number][] = [
  [255, 248, 226], // F-type  — cream white    (Procyon-class)
  [255, 252, 192], // F5-type — pale lemon-white
  [255, 234, 86], // G-type  — golden yellow   (sun-like)
  [230, 240, 255], // A-type  — ice-blue white   (Vega-class)
  [204, 196, 255], // B-type  — pale violet-white (hot, Rigel-class)
  [255, 214, 162], // K-type  — warm buff        (subdued, not orange)
]
