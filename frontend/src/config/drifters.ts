import type { DrifterBuffEffects, DrifterDef, DrifterRarity } from '../types'

/**
 * Drifters — objects that pass through the idle orbit view and pay out when
 * clicked. Everything about a type lives here: silhouette, flight behavior,
 * instant reward and timed buff. The store only rolls, flies and settles them.
 *
 * Balance intent, cheapest to richest:
 *  - common    → keeps the screen alive, small but always welcome
 *  - uncommon  → touches a currency the player cannot simply wait for
 *  - rare      → buys TIME (dwell clock, star timers) or a combat window
 *  - legendary → the one everybody stops to chase
 */
export const DRIFTERS: DrifterDef[] = [
  {
    id: 'errantChime',
    name: 'Errant Chime',
    rarity: 'common',
    weight: 30,
    icon: 'game-icons:musical-notes',
    image: '/img/BardAbilities/BardChime-128.png',
    color: '#e8c040',
    flightMs: 12_000,
    sizePx: 46,
    hits: 1,
    effectLine: '90 seconds of production, instantly',
    reward: { chimesFromCpsSeconds: 90 },
  },
  {
    id: 'emberShard',
    name: 'Ember Shard',
    rarity: 'common',
    weight: 22,
    icon: 'game-icons:burning-embers',
    color: '#ff8a3c',
    flightMs: 11_000,
    sizePx: 44,
    hits: 1,
    effectLine: '×3 chimes per click for 30s',
    buff: { durationMs: 30_000, effects: { cpcMult: 3 } },
  },
  {
    id: 'lostMeep',
    name: 'Lost Meep',
    rarity: 'uncommon',
    weight: 14,
    icon: 'game-icons:meeple',
    image: '/img/BardAbilities/BardMeep-64.png',
    color: '#9fd4ff',
    // Tumbles along slowly — it is lost, after all, and the extra seconds make
    // the rarest currency in the game feel catchable.
    flightMs: 16_000,
    sizePx: 50,
    hits: 1,
    effectLine: '+1 Meep and a full meep bar',
    reward: { meeps: 1 },
  },
  {
    id: 'salvageProbe',
    name: 'Salvage Probe',
    rarity: 'uncommon',
    weight: 12,
    icon: 'game-icons:delivery-drone',
    color: '#52b830',
    flightMs: 13_000,
    sizePx: 48,
    hits: 1,
    effectLine: '4 materials, then ×2 drop chance for 60s',
    reward: { materials: 4 },
    buff: { durationMs: 60_000, effects: { materialDropMult: 2 } },
  },
  {
    id: 'coronalSurge',
    name: 'Coronal Surge',
    rarity: 'rare',
    weight: 8,
    icon: 'game-icons:sun-radiations',
    color: '#ffe28a',
    // A pressure wave running ahead of the sun — fast, and gone if missed.
    flightMs: 9_500,
    sizePx: 54,
    hits: 1,
    effectLine: 'Star phase −3 min, ×2 chimes for 20s',
    reward: { dwellSkipSeconds: 180 },
    buff: { durationMs: 20_000, effects: { cpsMult: 2 } },
  },
  {
    id: 'riftEcho',
    name: 'Rift Echo',
    rarity: 'rare',
    weight: 8,
    icon: 'game-icons:vortex',
    color: '#b45cff',
    flightMs: 12_000,
    sizePx: 52,
    hits: 1,
    effectLine: '×2 champion and turret damage for 45s',
    buff: { durationMs: 45_000, effects: { combatDpsMult: 2 } },
  },
  {
    id: 'wayfarerBeacon',
    name: "Wayfarer's Beacon",
    rarity: 'rare',
    weight: 5,
    icon: 'game-icons:lighthouse',
    color: '#e04a4a',
    flightMs: 14_000,
    sizePx: 50,
    hits: 1,
    effectLine: '+45s on every star currently in orbit',
    reward: { starTimeSeconds: 45 },
  },
  {
    id: 'starLeviathan',
    name: 'Star Leviathan',
    rarity: 'legendary',
    weight: 2,
    icon: 'game-icons:whale-tail',
    color: '#46d6c0',
    // Vast and unhurried: four strikes along a long, slow passage. Missing one
    // is not fatal — the passage lasts long enough to come back to it.
    flightMs: 26_000,
    sizePx: 128,
    hits: 4,
    effectLine: "Bard's Serenade — ×3 to everything for 90s",
    buff: {
      durationMs: 90_000,
      effects: {
        cpsMult: 3,
        cpcMult: 3,
        combatDpsMult: 3,
        materialDropMult: 3,
        xpMult: 3,
      },
    },
  },
]

export const DRIFTER_INDEX: Record<string, DrifterDef> = Object.fromEntries(
  DRIFTERS.map((d) => [d.id, d]),
)

export function getDrifter(id: string): DrifterDef | undefined {
  return DRIFTER_INDEX[id]
}

/** Chip/aura treatment per rarity — legendary gets the loudest frame. */
export const DRIFTER_RARITY_GLOW: Record<DrifterRarity, number> = {
  common: 0.35,
  uncommon: 0.45,
  rare: 0.6,
  legendary: 0.85,
}

/** Total spawn weight across the pool — cached, the pool is static. */
export const DRIFTER_TOTAL_WEIGHT = DRIFTERS.reduce((sum, d) => sum + d.weight, 0)

/** Chip captions per effect key. A buff touching more than one key shows
 *  DRIFTER_BUFF_LABEL_ALL instead of listing them.
 *  Kept to one short word: the buff bar has to fit six chips between the two
 *  raised HUD panels, which leaves ~1260px on Full HD. */
export const DRIFTER_BUFF_EFFECT_LABELS: Record<keyof DrifterBuffEffects, string> = {
  cpsMult: 'CHIMES',
  cpcMult: 'CLICK',
  combatDpsMult: 'DAMAGE',
  materialDropMult: 'DROPS',
  xpMult: 'XP',
}

export const DRIFTER_BUFF_LABEL_ALL = 'ALL'

/** Icon of the MVP honor buff, which shares the buff bar with the drifters. */
export const MVP_BUFF_ICON = 'game-icons:laurel-crown'
export const MVP_BUFF_COLOR = '#e8c040'
export const MVP_BUFF_LABEL = 'CHIMES'
export const MVP_BUFF_NAME = 'MVP Honor'
