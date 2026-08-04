// Star Forge (Sonnen-Baum aus Roots, Branches und Leaves samt Relikten,
// Konstellationen und Schnäppchen) und der Meep Skill Tree.

// ── Meep Skill Tree: radiales Netz-Layout (SkillTreeComponent) ─────────────
// Ein Startknoten in der Mitte, fünf Pfade strahlen aus; leichter Zickzack pro
// Stufe für den organischen Netz-Look. Die Radien sind so gewählt, dass sich
// Kreise und Labels nie überlappen — einzeln geändert kleben sie aneinander.
/** Grundwinkel der fünf Zweige, gleichmäßig über 360°. */
export const SKILL_TREE_BASE_ANGLES_DEG = [-90, -18, 54, 126, 198]
/** Zickzack-Zuschlag je Stufe, damit die Zweige nicht schnurgerade laufen. */
export const SKILL_TREE_TIER_JITTER_DEG = [0, 10, -9, 10, -8]
/** Abstand der fünf Stufen vom Zentrum. */
export const SKILL_TREE_TIER_RADIUS = [200, 355, 510, 665, 820]
/** Stauchung der y-Achse — das Netz sitzt in einem Breitbild-Rahmen. */
export const SKILL_TREE_Y_SQUASH = 0.85
/** Kreis-Mittelpunkt innerhalb des Node-Wrappers (muss zum CSS passen). */
export const SKILL_TREE_NODE_CENTER = { x: 78, y: 40 }
export const SKILL_TREE_START_CENTER = { x: 80, y: 48 }
/** Einpassung beim Öffnen: Zoom-Clamp, damit das Netz lesbar startet. */
export const SKILL_TREE_FIT_PADDING = 0.06
export const SKILL_TREE_FIT_MIN_ZOOM = 0.62
export const SKILL_TREE_FIT_MAX_ZOOM = 0.9
/**
 * Verzögerung vor `fitView`. Ohne sie kollidiert die Zoom-Animation mit den
 * Mount-Kosten des Netzes und drückt die Framerate sichtbar.
 */
export const SKILL_TREE_FIT_DELAY_MS = 100
/** Strichstärke der Verbindungen, je nach Zustand des Zielknotens. */
export const SKILL_TREE_EDGE_WIDTH_BOUGHT = 3.5
export const SKILL_TREE_EDGE_WIDTH_BUYABLE = 2.75
export const SKILL_TREE_EDGE_WIDTH_LOCKED = 2.25

// ── Star Forge: Baum-Darstellung (ForgeTreePanel) ─────────────────────────
/** Winkel der fünf Wurzeln auf dem Ring, im Uhrzeigersinn ab oben. */
export const FORGE_ROOT_ANGLES_DEG = {
  flightSpeed: 270,
  maxHp: 342,
  chimesPerClick: 54,
  chimesPerSecond: 126,
  dmgPerClick: 198,
} as const
/** Icon-Kantenlänge je Knotenstufe. */
export const FORGE_ICON_SIZE_ROOT = 28
export const FORGE_ICON_SIZE_BRANCH = 22
export const FORGE_ICON_SIZE_LEAF = 18
/** Freiraum am oberen Rand für das schwebende Phasen-Dock. */
export const FORGE_PHASE_DOCK_HEADROOM_PX = 96
/** Radius, an dem eine Wurzel-Verbindung am Sonnenrand ansetzt. */
export const FORGE_SUN_EDGE_R = 110

export const MEEP_ADD_DELAY_MS = 100

export const MEEP_POWER_MULTIPLIER = 100

// ── Star Forge (Shop tab) ─────────────────────────────────────────────────────
// Tree geometry — the tree lives on a square stage, nodes placed on 3 polar rings.
export const FORGE_STAGE_SIZE = 820
export const FORGE_RING_ROOT_R = 165
export const FORGE_RING_BRANCH_R = 285
export const FORGE_RING_LEAF_R = 385

// Ring unlock gating (starPhase index)
export const FORGE_BRANCH_UNLOCK_PHASE = 2
export const FORGE_LEAF_UNLOCK_PHASE = 4
/** Branch max level at unlock; +1 per phase past the unlock phase, up to the cap
 *  → "old upgrades gain new tiers" with every sun evolution. */
export const FORGE_BRANCH_BASE_MAX_LEVEL = 3
export const FORGE_BRANCH_MAX_LEVEL_CAP = 5
export const FORGE_LEAF_MAX_LEVEL = 3
/** Parent level required before a child node can be bought. */
export const FORGE_BRANCH_PARENT_MIN_LEVEL = 1
export const FORGE_LEAF_PARENT_MIN_LEVEL = 2
/** Each leaf level amplifies its parent branch's effect by this fraction. */
export const FORGE_LEAF_AMPLIFY_PER_LEVEL = 0.25

export const FORGE_CONSTELLATION_REQUIRED_LEVEL = 3
/** Dieselbe Verstärkung in Prozent — für die Beschreibungstexte im Baum. */
export const FORGE_LEAF_AMPLIFY_PER_LEVEL_PCT = FORGE_LEAF_AMPLIFY_PER_LEVEL * 100

/**
 * Wirkung der geschmiedeten Konstellationen. Die Zahlen stehen zusätzlich als
 * Prozentangabe im `desc`-Text der jeweiligen Definition in config/starForge.ts
 * — ändert sich eine, muss der Text mitgeführt werden.
 */
export const FORGE_CONSTELLATION_BULWARK_DAMAGE_MULT = 0.9
export const FORGE_CONSTELLATION_STELLAR_WIND_CPS_MULT = 1.18
export const FORGE_CONSTELLATION_GOLDEN_TEMPEST_CPC_MULT = 1.12

/** Obergrenzen, damit gestapelte Forge-Effekte den Spielablauf nicht brechen. */
export const FORGE_MIN_DAMAGE_TAKEN_MULT = 0.25
export const FORGE_MIN_DWELL_MULT = 0.5
export const FORGE_MIN_EXPEDITION_MULT = 0.4
export const FORGE_MAX_DOUBLE_CLICK_CHANCE = 0.8

// Cosmic Bargain
export const FORGE_BARGAIN_RESTOCK_MS = 8 * 3_600_000
export const FORGE_BARGAIN_REROLL_MATERIAL = 'dark_matter'
export const FORGE_BARGAIN_REROLL_COST = 1

// Tree zoom (wheel + buttons). The default starts zoomed-in on the sun and
// its five core rays; zooming out reveals the branch and leaf rings.
export const FORGE_TREE_ZOOM_MIN = 0.55
export const FORGE_TREE_ZOOM_MAX = 2.2
export const FORGE_TREE_ZOOM_STEP = 0.15
export const FORGE_TREE_ZOOM_DEFAULT = 1.7

// Header universe block — meep counter count-up tween (steps × interval ≈ 320ms)
export const MEEP_COUNTUP_STEPS = 20
export const MEEP_COUNTUP_INTERVAL_MS = 16
// How long the meep counter keeps its "rising" highlight after the tween ends.
export const MEEP_RISING_HOLD_MS = 300
