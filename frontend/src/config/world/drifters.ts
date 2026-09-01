import type { DrifterBuffEffects, DrifterDef, DrifterFxStage, DrifterRarity } from '@/types'

/**
 * Drifters — objects that pass through the idle orbit view and pay out when
 * clicked. Everything about a type lives here: silhouette, flight behavior,
 * instant reward and timed buff. The store only rolls, flies and settles them.
 *
 * `body` picks the sprite motif drifterSprite.ts paints in flight — the icon
 * below it is the HUD glyph (buff chip, herald), never the object.
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
    icon: 'game-icons:ringing-bell',
    body: 'chime',
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
    body: 'shard',
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
    body: 'meep',
    image: '/img/BardAbilities/BardMeep-64.png',
    color: '#9fd4ff',
    // Tumbles along slowly — it is lost, after all, and the extra seconds make
    // the rarest currency in the game feel catchable.
    flightMs: 16_000,
    sizePx: 50,
    hits: 1,
    // Die „volle Meep-Leiste" gibt es seit dem Ökonomie-Umbau nicht mehr —
    // Meeps zahlt jetzt der Aufbruch. Der Fund bleibt bei 1 und ist dabei
    // WERTVOLLER geworden: gegen die Senke gerechnet ist das ein Drittel des
    // billigsten Baumknotens statt eines Fünfzehntels.
    effectLine: '+1 Meep',
    reward: { meeps: 1 },
  },
  {
    id: 'salvageProbe',
    name: 'Salvage Probe',
    rarity: 'uncommon',
    weight: 12,
    icon: 'game-icons:delivery-drone',
    body: 'probe',
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
    body: 'surge',
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
    body: 'vortex',
    color: '#b45cff',
    flightMs: 12_000,
    sizePx: 52,
    hits: 1,
    effectLine: '×2 champion and turret damage for 45s',
    buff: { durationMs: 45_000, effects: { combatDpsMult: 2 } },
  },
  {
    id: 'sunderingPulse',
    name: 'Sundering Pulse',
    rarity: 'rare',
    weight: 7,
    icon: 'game-icons:resonance',
    body: 'pulse',
    color: '#ff4f8b',
    // The one drifter that is not a payout but a weapon: catching it fires a
    // shockwave through the whole orbit and hits every planet at once. Short,
    // urgent flight — a strike the player has to decide on, not collect at
    // leisure. Worth a share of MAX health rather than a flat number, so it
    // stays exactly as relevant in galaxy 1 as in galaxy 12.
    flightMs: 10_500,
    sizePx: 56,
    hits: 1,
    effectLine: '−20% max HP on every planet in orbit',
    reward: { orbitStrikeMaxHpPct: 0.2 },
  },
  {
    id: 'wayfarerBeacon',
    name: "Wayfarer's Beacon",
    rarity: 'rare',
    weight: 5,
    icon: 'game-icons:lighthouse',
    body: 'beacon',
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
    body: 'leviathan',
    color: '#46d6c0',
    // Vast and unhurried: four strikes along a long, slow passage. Missing one
    // is not fatal — the passage lasts long enough to come back to it.
    flightMs: 26_000,
    sizePx: 128,
    hits: 4,
    effectLine: "Caretaker's Boon — ×3 to everything for 90s",
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

/**
 * How much ornament each rarity band earns in flight — the RANK axis.
 *
 * Modelled on `CHAMPION_REGALIA_STAGES`: numbers that keep climbing plus
 * boolean flags, and every step adds exactly ONE new layer rather than saying
 * the previous one again. Reading down a column tells you what a band is worth;
 * reading across a row tells you what it costs.
 *
 * Why this replaced a single alpha value: before it, the only rarity-dependent
 * thing about a flying drifter was the opacity of its aura. Escalation ran
 * along the TYPE axis instead, and it ran backwards — the rare Coronal Surge
 * carried seven running animations, the legendary Star Leviathan five.
 *
 * Every flag here is read together with `DRIFTER_ORNAMENT_MIN_SIZE`, never on
 * its own. That is performance rule 7 and it is not optional: a layer too small
 * to see is still rastered, still composited and still paid for.
 *
 * The cost lands where it belongs. A common drifter comes every 20–30 s and is
 * the CHEAPEST body in the set; the legendary comes every 10–15 minutes and is
 * the only one carrying a debris belt and a mote swarm.
 */
/* prettier-ignore */
export const DRIFTER_FX_STAGES: Record<DrifterRarity, DrifterFxStage> = {
  common:    { rarity: 'common',    auraAlpha: 0.30, auraLayers: 1, motion: 0.35, detail: 0, motes: 0, flow: 0, rim: true, pulse: false, dust: false, ring: false, herald: false },
  uncommon:  { rarity: 'uncommon',  auraAlpha: 0.40, auraLayers: 1, motion: 0.50, detail: 1, motes: 2, flow: 1, rim: true, pulse: true,  dust: false, ring: false, herald: false },
  rare:      { rarity: 'rare',      auraAlpha: 0.55, auraLayers: 2, motion: 0.70, detail: 1, motes: 4, flow: 2, rim: true, pulse: true,  dust: true,  ring: false, herald: false },
  legendary: { rarity: 'legendary', auraAlpha: 0.75, auraLayers: 3, motion: 1.00, detail: 2, motes: 7, flow: 3, rim: true, pulse: true,  dust: true,  ring: true,  herald: true  },
}

/** The stage a drifter flies at. */
export function drifterFxStage(rarity: DrifterRarity): DrifterFxStage {
  return DRIFTER_FX_STAGES[rarity]
}

/**
 * Bodies whose silhouette has a FRONT, and which therefore have to be flipped
 * to match the direction of travel.
 *
 * Almost every drifter is radially symmetric — a crystal, a rock, a lens, a
 * pulsar look the same whichever way they go, and turning them would only make
 * their own animation wobble. The leviathan does not: it has an eye at one end
 * and fins at the other, and once the wake was corrected to trail BEHIND the
 * body, it became obvious that it was swimming backwards.
 *
 * Flipped with `scaleX(-1)` rather than rotated to the heading: a rotation
 * would stand the creature on its nose during the steep parts of a route,
 * while a mirror keeps it level and only ever answers the one question the
 * silhouette actually asks — which way is forward.
 */
export const DRIFTER_DIRECTIONAL_BODIES: ReadonlySet<string> = new Set(['leviathan'])

/** Total spawn weight across the pool — cached, the pool is static. */
export const DRIFTER_TOTAL_WEIGHT = DRIFTERS.reduce((sum, d) => sum + d.weight, 0)

/** Chip captions per effect key. A buff touching more than one key shows
 *  DRIFTER_BUFF_LABEL_ALL instead of listing them.
 *  Kept short: the label line of a buff chip is 88px wide on Full HD, and six
 *  chips have to fit between the two raised HUD panels. */
export const DRIFTER_BUFF_EFFECT_LABELS: Record<keyof DrifterBuffEffects, string> = {
  cpsMult: 'CHIMES',
  cpcMult: 'PER CLICK',
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
