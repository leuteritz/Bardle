// Star Forge (Sonnen-Baum aus Roots, Branches und Leaves samt Relikten,
// Konstellationen und Schnäppchen) und der Meep Skill Tree.

import type { ForgeSectionDef } from '@/types'

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
/**
 * Luft an JEDER Seite beim Einpassen des Baums.
 *
 * Vorher standen hier 96 px, aber nur oben — Kopfraum für das schwebende
 * Phasen-Dock, unter dem die Bühne zusätzlich um die halbe Höhe nach unten
 * gerückt war. Das Dock sitzt jetzt als Kopfleiste in der Forge-Sidebar, also
 * verteilt sich derselbe Betrag auf beide Seiten: die Bühne steht mittig und
 * bleibt exakt so groß wie zuvor (auf jedem Desktop-Format begrenzt die Höhe,
 * und 780 − 2·48 ist dasselbe wie 780 − 96). Der Baum wird durch den Umzug
 * also weder größer noch kleiner, nur zentriert.
 */
export const FORGE_TREE_FIT_PADDING_PX = 48
/** Radius, an dem eine Wurzel-Verbindung am Sonnenrand ansetzt. */
export const FORGE_SUN_EDGE_R = 110

export const MEEP_ADD_DELAY_MS = 100

/**
 * Battle Power je gehaltenem Meep. Der Meep-Term dominiert `totalPower` —
 * `abilityPowerBonus` und `tree.powerBonus` sind daneben Beiwerk.
 *
 * Angehoben von 100, als die Meep-Ausbeute auf den Ratschen-Anker umgestellt
 * wurde (`MEEP_RUN_BASE_MIN`/`MEEP_RUN_SHARE`): der Lebenszufluss fiel dabei
 * von rund 7800 auf rund 1250 Meeps, also auf ein Sechstel. Geeicht ist der
 * Faktor am ZUFLUSS-Verhältnis und nicht am Endstand — der Spieler hält fast
 * durchweg Zwischenbestände zwischen zwei Baumkäufen, nicht den Rest am Ende.
 */
export const MEEP_POWER_MULTIPLIER = 600

/**
 * Wie die gefalteten Baum-Effekte im Meep-Panel des Headers gelesen werden.
 * Der Store liefert einen Beutel roher Zahlen (`meepTreeStore.fx`) — welcher
 * Schlüssel welche Beschriftung trägt und in welcher Einheit er steht, weiß
 * nur diese Tabelle. Sie gibt zugleich die Reihenfolge vor: erst was der
 * Spieler dauernd sieht (Produktion, Klick), dann Kampf, Überleben, und zuletzt
 * das, was nur zwischendurch greift (Offline, Expeditionen).
 *
 * `kind` entscheidet die Schreibweise:
 *   mult  — Faktor über 1, als „×1,25" gezeigt
 *   lower — Faktor unter 1, wo klein gut ist (Kosten, Dauer, Schaden) → „−20 %"
 *   pct   — Bruchteil, als Prozent gezeigt
 *   flat / rate / hours — additiv, mit der jeweiligen Einheit
 * Neutral (1 bzw. 0) bleibt ungezeigt — das Panel listet nur, was wirkt.
 */
export type MeepTreeEffectKind = 'mult' | 'lower' | 'pct' | 'flat' | 'rate' | 'hours'

export interface MeepTreeEffectRowDef {
  key: string
  label: string
  kind: MeepTreeEffectKind
}

export const MEEP_TREE_EFFECT_ROWS: readonly MeepTreeEffectRowDef[] = [
  { key: 'cpsMult', label: 'Chimes per second', kind: 'mult' },
  { key: 'cpcMult', label: 'Chimes per click', kind: 'mult' },
  { key: 'doubleClickChance', label: 'Double-strike chance', kind: 'pct' },
  { key: 'cpcFromCpsPct', label: 'Click gains of CpS', kind: 'pct' },
  { key: 'meepCostMult', label: 'Chimes per meep', kind: 'lower' },
  { key: 'meepPowerMult', label: 'Power per meep', kind: 'mult' },
  { key: 'powerBonus', label: 'Flat battle power', kind: 'flat' },
  { key: 'championDpsMult', label: 'Champion orbit DPS', kind: 'mult' },
  { key: 'bossDamageMult', label: 'Damage to planet bosses', kind: 'mult' },
  { key: 'materialDropMult', label: 'Material drop chance', kind: 'mult' },
  { key: 'hpRegenPerSec', label: 'Health regeneration', kind: 'rate' },
  { key: 'damageTakenMult', label: 'Damage taken', kind: 'lower' },
  { key: 'offlineEarningsMult', label: 'Offline earnings', kind: 'mult' },
  { key: 'offlineMaxHoursBonus', label: 'Offline cap', kind: 'hours' },
  { key: 'expeditionRewardMult', label: 'Expedition rewards', kind: 'mult' },
  { key: 'expeditionSpeedMult', label: 'Expedition duration', kind: 'lower' },
] as const

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
/**
 * Von 5 auf 6 gehoben, und die Blätter von 3 auf 4.
 *
 * Zwei Gründe, die dasselbe verlangen. Erstens war die Codex-Bahn „Sunsmith"
 * dadurch UNERREICHBAR: ihre letzte Stufe verlangt 200 `forgeLevels`, das
 * theoretische Maximum lag bei 10 Branches × 5 + 10 Leaves × 3 + 6 Relikte × 3
 * = 98. Zweitens braucht die verlängerte Sonnenrampe Inhalt: `nodeMaxLevel`
 * staffelt „+1 je Phase über der Freischaltphase", die letzte Branch-Stufe
 * existiert damit erst in der Schlussphase.
 *
 * Neues Maximum: 60 + 40 + 30 = 130. Die Materialkosten skalieren bereits mit
 * der Stufe (`qty × nextLevel`) und ziehen damit am selben Strang wie die
 * Tier-Tore — eine Quelle, mehrere Verbraucher, sechs Slots, eine Entscheidung.
 */
export const FORGE_BRANCH_MAX_LEVEL_CAP = 6
export const FORGE_LEAF_MAX_LEVEL = 4
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
 * Prozentangabe im `desc`-Text der jeweiligen Definition in config/progression/starForge.ts
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

// ── Detailspalte des Shop-Tabs (StarForgePanel) ───────────────────────────────
/**
 * Die drei Abteilungen der rechten Spalte, Reihenfolge = Reiterfolge.
 * Gestapelt waren sie ein Endlos-Scroll in einer 440px-Spalte; als Reiter
 * bekommt jede die volle Höhe, und darum darf die Schrift so groß sein, dass
 * man sie liest.
 */
export const FORGE_PANEL_SECTIONS: ForgeSectionDef[] = [
  { id: 'relics', label: 'Relics', icon: 'game-icons:anvil-impact', accent: '#e8a020' },
  {
    id: 'constellations',
    label: 'Constellations',
    icon: 'game-icons:barbed-star',
    accent: '#86d0ff',
  },
  { id: 'bargain', label: 'Bargain', icon: 'ph:handshake-fill', accent: '#e8c040' },
]

/** Platzhalter im `desc` einer Forge-Definition, den der Stufenwert ersetzt. */
export const FORGE_DESC_VALUE_TOKEN = '{v}'
/** Derselbe Platzhalter mit Prozentzeichen — daran hängt die Einheit der Werte. */
export const FORGE_DESC_PERCENT_TOKEN = `${FORGE_DESC_VALUE_TOKEN}%`

// Cosmic Bargain
export const FORGE_BARGAIN_RESTOCK_MS = 8 * 3_600_000
/** Steht auf der Karte, solange kein Handel ausliegt — der Händler ist unterwegs. */
export const FORGE_BARGAIN_EMPTY_ICON = 'game-icons:night-sky'
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
