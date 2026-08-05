// Die fünf Rollen (Top, Jungle, Mid, ADC, Support) und alles, was sie im Orbit
// tun: Schilde, Flüche, Bursts, Heilung — samt der Schadenszahlen, die dabei
// aufsteigen. Die Registry ROLES ist die Single Source of Truth für Farbe,
// Icon und Bahnmaße einer Rolle.

import type { ChampionRole, RoleStat, RoleAbilityDetail } from '@/types'
import { SUN_RADIUS } from '@/config/constants/sun'

/** Nachlauf nach der Rollenwahl, damit die Auswahl-Animation sichtbar bleibt. */
export const ROLE_SELECTION_CONFIRM_DELAY_MS = 260

/** Passive DPS bonus per assigned ally of the attacking main's role.
 *  Full row (5 allies) → ×3.0 = the old ceiling where main + 2 orbiting allies attacked as 3 units. */
export const ALLY_DPS_CONTRIBUTION = 0.4

// Role Behavior — orbit abilities per role
export const ROLE_SUPPORT_HEAL_INTERVAL_MS = 8000 // heal player every 8s
export const ROLE_SUPPORT_HEAL_AMOUNT = 5 // +5 HP per heal
export const SUPPORT_HEAL_RANGE = 1000 // px: max. distance Support Champion → Player Planet center
export const SUPPORT_PLANET_HEAL_AMOUNT = 20 // HP per heal tick on Player Planets
export const SUPPORT_PLANET_HEAL_INTERVAL_MS = 2000 // interval between two Planet heals in ms
export const SUPPORT_MAX_HEAL_TARGETS = 1 // max. planets healed simultaneously per heal tick
export const ROLE_TOP_SHIELD_REBUILD_MS = 5000 // seconds to rebuild shield after absorbing a shot
export const ROLE_MID_CURSE_INTERVAL_MS = 15000 // curse: 15s cooldown between casts
/**
 * Wie viele verschiedene Flüche der Midlaner werfen kann. Die Flüche selbst
 * stehen als CURSE_DEFS im roleBehaviorStore (sie tragen Verhaltensdaten, kein
 * reines Zahlenwerk) — eine Konstante darf aus config/ nicht in einen Store
 * greifen, deshalb steht die Anzahl hier. Sie ist die Kardinalität von
 * MidCurseType in `types/combat.ts`: wächst der Typ, wächst diese Zahl mit.
 */
export const ROLE_MID_CURSE_TYPE_COUNT = 5
export const ROLE_MID_CURSE_DURATION_MS = 10000 // curse lasts 10s
export const ROLE_MID_CURSE_RANGE = 1500 // px screen-space range from midlaner to boss planet
export const ROLE_MID_CURSE_CAST_MS = 600 // cast flash animation duration
export const ROLE_MID_CURSE_DOT_DPS = 8 // Corruption: 8 dmg/s × 10 ticks = 80 total
export const ROLE_MID_CURSE_ATTACK_DEBUFF = 0.4 // Weakness: enemy deals only 40% damage
export const ROLE_MID_CURSE_DAMAGE_AMP = 1.8 // Hexblight: all player damage ×1.8
export const ROLE_MID_CURSE_ATTACK_SLOW = 3.0 // Petrify: enemy attack interval ×3
export const ROLE_MID_CURSE_DAMNATION_FRAC = 0.2 // Damnation: instant 20% of boss maxHP
export const ROLE_MID_CURSE_URGENT_S = 3 // last seconds: the curse mark starts blinking
export const ROLE_ADC_BURST_DAMAGE = 80 // bonus burst hit on boss
export const ROLE_ADC_BURST_INTERVAL_MS = 5000 // every 5s

// ── Role Star Attacks — every orbiting role fires an attack at the active
//    star/planet boss on its own cooldown, on top of its normal role ability
//    (roleBehaviorStore._tickRoleAttacks / RoleStrikerSquad.vue) ────────────
export const ROLE_STAR_ATTACKS: Record<ChampionRole, { damage: number; intervalMs: number }> = {
  top: { damage: 35, intervalMs: 7000 }, // heavy slow smash
  jungle: { damage: 20, intervalMs: 4000 }, // quick raking strikes
  mid: { damage: 25, intervalMs: 6000 }, // arcane bolt
  adc: { damage: 15, intervalMs: 3000 }, // rapid shots (burst stays separate)
  support: { damage: 12, intervalMs: 5000 }, // light chime blast
}

/** Central role registry — single source of truth for key, label, icon, color and orbit parameters. */
export const ROLES = [
  {
    key: 'top' as ChampionRole,
    label: 'Top',
    short: 'TOP',
    icon: 'game-icons:broadsword',
    image: '/img/roles/top.png',
    color: '#e05050',
    stats: [
      { key: 'atk', icon: 'game-icons:crossed-swords', label: 'Atk Interval', value: '4.0s' },
      {
        key: 'shield',
        icon: 'game-icons:shield',
        label: 'Shield Rebuild',
        value: `${ROLE_TOP_SHIELD_REBUILD_MS / 1000}s`,
      },
      { key: 'type', icon: 'game-icons:biceps', label: 'Style', value: 'Tank / Frontline' },
    ] satisfies RoleStat[],
    abilityCompact: `Shield – ${ROLE_TOP_SHIELD_REBUILD_MS / 1000}s Rebuild · Tank / Frontline`,
    abilityDetails: [
      { name: 'Atk Interval', desc: 'Hits boss every', value: '4.0s' },
      {
        name: 'Shield',
        desc: 'Absorbs 1 hit, then rebuilds after',
        value: `${ROLE_TOP_SHIELD_REBUILD_MS / 1000}s`,
      },
      { name: 'Style', desc: 'Tank / Frontline – fights on the inner orbit' },
    ] satisfies RoleAbilityDetail[],
    orbitDesc: `Shield: ${ROLE_TOP_SHIELD_REBUILD_MS / 1000}s rebuild`,
    orbit: {
      rx: SUN_RADIUS * 2.58,
      ry: SUN_RADIUS * 1.13,
      tiltDeg: 14,
      tiltRad: 0.2443,
      color: '#F34B49',
      speed: 0.00032,
      hitIntervalMs: 4000,
      hitDurationMs: 350,
      championSize: SUN_RADIUS * 1.0,
    },
  },
  {
    key: 'jungle' as ChampionRole,
    label: 'Jungle',
    short: 'JGL',
    icon: 'game-icons:thorny-vine',
    image: '/img/roles/jungle.png',
    color: '#50c060',
    stats: [
      { key: 'style', icon: 'game-icons:plain-dagger', label: 'Style', value: 'Assassin / Ganker' },
      { key: 'effect', icon: 'game-icons:tornado', label: 'Effect', value: 'Crowd Control' },
      { key: 'range', icon: 'game-icons:orbit', label: 'Orbit', value: 'Wide Patrol' },
    ] satisfies RoleStat[],
    abilityCompact: 'Jungle Buffs · Crowd Control · Wide Patrol',
    abilityDetails: [
      {
        name: 'Red Buff',
        desc: 'Burn DoT on hit, slow enemy movement',
        value: '10 dmg/s · −30% slow',
      },
      { name: 'Blue Buff', desc: 'Ability cooldown reduction & mana regen for nearby allies' },
      { name: 'Scuttle', desc: 'River vision + movement speed bonus in river zone' },
      {
        name: 'Crowd Control',
        desc: 'Applies CC debuffs to boss planets reducing their effectiveness',
      },
      { name: 'Style', desc: 'Assassin / Ganker – patrols wide outer orbit' },
    ] satisfies RoleAbilityDetail[],
    orbitDesc: 'Crowd Control',
    orbit: {
      rx: SUN_RADIUS * 7.8,
      ry: SUN_RADIUS * 3.35,
      tiltDeg: -15,
      tiltRad: -0.2618,
      color: '#5CE66A',
      speed: 0.00022,
      championSize: SUN_RADIUS * 1.0,
    },
  },
  {
    key: 'mid' as ChampionRole,
    label: 'Mid',
    short: 'MID',
    icon: 'game-icons:wizard-staff',
    image: '/img/roles/mid.png',
    color: '#5090e8',
    stats: [
      {
        key: 'cursecd',
        icon: 'game-icons:empty-hourglass',
        label: 'Curse CD',
        value: `${ROLE_MID_CURSE_INTERVAL_MS / 1000}s`,
      },
      {
        key: 'cursedur',
        icon: 'game-icons:hourglass',
        label: 'Curse Duration',
        value: `${ROLE_MID_CURSE_DURATION_MS / 1000}s`,
      },
      {
        key: 'dot',
        icon: 'game-icons:death-skull',
        label: 'DoT DPS',
        value: `${ROLE_MID_CURSE_DOT_DPS} dmg/s`,
      },
      {
        key: 'amp',
        icon: 'game-icons:lightning-arc',
        label: 'Dmg Amplify',
        value: `×${ROLE_MID_CURSE_DAMAGE_AMP}`,
      },
    ] satisfies RoleStat[],
    abilityCompact: `Curse ${ROLE_MID_CURSE_INTERVAL_MS / 1000}s CD · 5 Curse Types · DoT ${ROLE_MID_CURSE_DOT_DPS} dmg/s`,
    abilityDetails: [
      {
        name: 'Corruption',
        desc: `DoT ${ROLE_MID_CURSE_DOT_DPS} dmg/s × ${ROLE_MID_CURSE_DURATION_MS / 1000}s`,
        value: `${ROLE_MID_CURSE_DOT_DPS * (ROLE_MID_CURSE_DURATION_MS / 1000)} total dmg`,
      },
      {
        name: 'Weakness',
        desc: 'Enemy attack reduced for curse duration',
        value: `×${ROLE_MID_CURSE_ATTACK_DEBUFF} (${Math.round((1 - ROLE_MID_CURSE_ATTACK_DEBUFF) * 100)}% less)`,
      },
      {
        name: 'Hexblight',
        desc: 'All player damage amplified for curse duration',
        value: `×${ROLE_MID_CURSE_DAMAGE_AMP}`,
      },
      {
        name: 'Petrify',
        desc: 'Enemy attack interval multiplied for curse duration',
        value: `×${ROLE_MID_CURSE_ATTACK_SLOW} slower`,
      },
      {
        name: 'Damnation',
        desc: 'Instant damage as fraction of boss max HP',
        value: `${Math.round(ROLE_MID_CURSE_DAMNATION_FRAC * 100)}% MaxHP`,
      },
      {
        name: 'Cooldown',
        desc: 'Time between curse casts',
        value: `${ROLE_MID_CURSE_INTERVAL_MS / 1000}s`,
      },
      {
        name: 'Duration',
        desc: 'Each curse lasts',
        value: `${ROLE_MID_CURSE_DURATION_MS / 1000}s`,
      },
      { name: 'Range', desc: 'Max distance to boss planet', value: `${ROLE_MID_CURSE_RANGE}px` },
    ] satisfies RoleAbilityDetail[],
    orbitDesc: `Curse every ${ROLE_MID_CURSE_INTERVAL_MS / 1000}s · DoT ${ROLE_MID_CURSE_DOT_DPS}/s`,
    orbit: {
      rx: SUN_RADIUS * 10.75,
      ry: SUN_RADIUS * 4.62,
      tiltDeg: 12,
      tiltRad: 0.2094,
      color: '#3694FF',
      speed: 0.00017,
      championSize: SUN_RADIUS * 1.0,
    },
  },
  {
    key: 'adc' as ChampionRole,
    label: 'ADC',
    short: 'ADC',
    icon: 'game-icons:bow-arrow',
    image: '/img/roles/adc.png',
    color: '#e89840',
    stats: [
      {
        key: 'burst',
        icon: 'game-icons:archery-target',
        label: 'Burst Damage',
        value: `${ROLE_ADC_BURST_DAMAGE}`,
      },
      {
        key: 'burstcd',
        icon: 'game-icons:stopwatch',
        label: 'Burst CD',
        value: `${ROLE_ADC_BURST_INTERVAL_MS / 1000}s`,
      },
      { key: 'style', icon: 'game-icons:arrow-scope', label: 'Style', value: 'Ranged / DPS' },
    ] satisfies RoleStat[],
    abilityCompact: `Burst ${ROLE_ADC_BURST_DAMAGE} dmg / ${ROLE_ADC_BURST_INTERVAL_MS / 1000}s · Ranged DPS`,
    abilityDetails: [
      {
        name: 'Burst Damage',
        desc: 'Bonus damage on direct hit every burst cycle',
        value: `${ROLE_ADC_BURST_DAMAGE} dmg`,
      },
      {
        name: 'Burst CD',
        desc: 'Time between burst shots',
        value: `${ROLE_ADC_BURST_INTERVAL_MS / 1000}s`,
      },
      { name: 'Style', desc: 'Ranged / DPS – fires from long outer orbit' },
    ] satisfies RoleAbilityDetail[],
    orbitDesc: `Burst ${ROLE_ADC_BURST_DAMAGE} dmg / ${ROLE_ADC_BURST_INTERVAL_MS / 1000}s`,
    orbit: {
      rx: SUN_RADIUS * 12.67,
      ry: SUN_RADIUS * 5.43,
      tiltDeg: -8,
      tiltRad: -0.1396,
      color: '#FF9300',
      speed: 0.00014,
      championSize: SUN_RADIUS * 1.0,
    },
  },
  {
    key: 'support' as ChampionRole,
    label: 'Supp',
    short: 'SUP',
    icon: 'game-icons:health-potion',
    image: '/img/roles/supp.png',
    color: '#b8c8d8',
    stats: [
      {
        key: 'heal',
        icon: 'game-icons:healing',
        label: 'Heal / Tick',
        value: `${ROLE_SUPPORT_HEAL_AMOUNT} HP`,
      },
      {
        key: 'healcd',
        icon: 'game-icons:pocket-watch',
        label: 'Heal CD',
        value: `${ROLE_SUPPORT_HEAL_INTERVAL_MS / 1000}s`,
      },
      {
        key: 'pheal',
        icon: 'game-icons:medical-drip',
        label: 'Planet Heal',
        value: `${SUPPORT_PLANET_HEAL_AMOUNT} HP`,
      },
      {
        key: 'pcd',
        icon: 'game-icons:cuckoo-clock',
        label: 'Planet CD',
        value: `${SUPPORT_PLANET_HEAL_INTERVAL_MS / 1000}s`,
      },
    ] satisfies RoleStat[],
    abilityCompact: `Heal ${ROLE_SUPPORT_HEAL_AMOUNT} HP / ${ROLE_SUPPORT_HEAL_INTERVAL_MS / 1000}s · Planet Heal ${SUPPORT_PLANET_HEAL_AMOUNT} HP / ${SUPPORT_PLANET_HEAL_INTERVAL_MS / 1000}s`,
    abilityDetails: [
      {
        name: 'Player Heal',
        desc: 'Restores HP to the player every cycle',
        value: `${ROLE_SUPPORT_HEAL_AMOUNT} HP / ${ROLE_SUPPORT_HEAL_INTERVAL_MS / 1000}s`,
      },
      {
        name: 'Planet Heal',
        desc: 'Heals up to 1 nearby ally planet per cycle',
        value: `${SUPPORT_PLANET_HEAL_AMOUNT} HP / ${SUPPORT_PLANET_HEAL_INTERVAL_MS / 1000}s`,
      },
      { name: 'Range', desc: 'Heal targets within distance', value: '1000px' },
      { name: 'Style', desc: 'Healer / Utility – follows ADC on outer orbit' },
    ] satisfies RoleAbilityDetail[],
    orbitDesc: `Heal ${ROLE_SUPPORT_HEAL_AMOUNT} HP / ${ROLE_SUPPORT_HEAL_INTERVAL_MS / 1000}s`,
    orbit: {
      rx: SUN_RADIUS * 12.67,
      ry: SUN_RADIUS * 5.43,
      tiltDeg: -8,
      tiltRad: -0.1396,
      // Helle Variante der Support-Rollenfarbe (#b8c8d8) — wie bei allen
      // anderen Rollen ist orbit.color nur die Neon-Version derselben Farbe
      // (vorher #12B8FF, kollidierte mit Mids Orbit-Blau #3694FF)
      color: '#E2ECF8',
      speed: 0.00014,
      championSize: SUN_RADIUS * 1.0,
    },
  },
] as const

/** O(1) lookup from ChampionRole key to the full role entry. */
export const ROLE_BY_KEY = Object.fromEntries(ROLES.map((r) => [r.key, r])) as Record<
  ChampionRole,
  (typeof ROLES)[number]
>

/** Role key → its slot index in ROLES / headerSlots / secondarySlots. */
export const ROLE_INDEX_BY_KEY = Object.fromEntries(ROLES.map((r, i) => [r.key, i])) as Record<
  ChampionRole,
  number
>

// Support orbits the same path as ADC, offset by this angle (radians) behind
export const SUPPORT_ANGLE_OFFSET = Math.PI / 5

/** Role UI colors derived from ROLES[].color — for ChampionSelector, Event Log, etc. */
export const ROLE_COLORS = Object.fromEntries(ROLES.map((r) => [r.key, r.color])) as Record<
  ChampionRole,
  string
>

// Heal floats (Support role — visual feedback)
/** Duration a heal float number remains visible (ms) */
export const HEAL_FLOAT_DURATION_MS = 1200
/** Y-offset applied upward from the heal target position (px) */
export const HEAL_FLOAT_Y_OFFSET = 35
/** Horizontal spread of the random player heal float position (px) */
export const HEAL_FLOAT_X_SPREAD = 60
/** Y-offset from the player planet center for player heal floats (px) */
export const HEAL_FLOAT_PLAYER_Y_OFFSET = 80

/** Damnation — der große Fluchtreffer steht länger und höher. */
export const CURSE_DAMAGE_FLOAT_Y_OFFSET = 65
export const CURSE_DAMAGE_FLOAT_MS = 1500
/** ADC-Burst. */
export const ADC_BURST_FLOAT_X_SPREAD = 30
export const ADC_BURST_FLOAT_Y_OFFSET = 45
export const ADC_BURST_FLOAT_MS = 1200
/** Sichtbares Aufblitzen des Burst-Zustands im Orbit. */
export const ADC_BURST_ACTIVE_MS = 350
/** Schild-Symbol über dem Top-Champion beim Abfangen. */
export const SHIELD_FLOAT_Y_OFFSET = 45
export const SHIELD_FLOAT_MS = 1000

/**
 * Sperrzeit der Ereignis-Meldungen im Log. Ohne sie überflutet eine
 * Dauerfähigkeit wie der Fluch-DoT das Log im Tick-Takt.
 */
export const ROLE_EVENT_THROTTLE_SUPPORT_PLANET_MS = 4000
export const ROLE_EVENT_THROTTLE_SUPPORT_PLAYER_MS = 5000
export const ROLE_EVENT_THROTTLE_MID_CURSE_MS = 10000
export const ROLE_EVENT_THROTTLE_ADC_BURST_MS = 10000

// Role behavior — animation durations
/** Duration of the Top champion intercept/shield-broken flash animation (ms) */
export const INTERCEPT_SHIELD_ANIM_MS = 500

/**
 * Mittlere Stufe der Rollen-Artworks (public/img/roles). `ROLES[].image` zeigt
 * bewusst aufs Original, weil dieselbe Konstante an anderer Stelle groß
 * gerendert wird; wer sie klein zeigt, leitet daraus diese Stufe ab.
 */
export const ROLE_ART_MD_SUFFIX = '-256.png'

// ── Hover-effect colors per role (Command Panel slot hover) ───────────────
// Distinct from ROLES[].color — these drive the champion lift-glow and slot
// pulse on hover, giving each role a thematic creative accent.
export const ROLE_HOVER_COLORS: Record<string, string> = {
  top: '#c8a060', // Stone-gold — warrior's golden trim
  jungle: '#3dc850', // Poison-green — hunter's venom
  mid: '#c060f0', // Arcane-violet — mage's essence
  adc: '#50c8ff', // Sky-cyan — marksman's precision
  support: '#ffd060', // Warm-gold — healer's blessing
}
