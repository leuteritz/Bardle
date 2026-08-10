import type { ProvidenceDef, ProvidenceEffectLine, ProvidenceEffects } from '@/types'
import { PROVIDENCE_NEUTRAL_MULTIPLIER } from '@/config/constants'

/**
 * PROVIDENCES OF THE WANDERER
 *
 * Was beim Prestige über einem Universum steht. Jede Vorsehung trägt genau EIN
 * Plus und genau EIN Minus, und beim Prestige liegen drei davon aus — je eine
 * über einem anderen Universum, je eine aus einer anderen Domäne.
 *
 * ── Warum die Effekte nicht mehr am Universum hängen ────────────────────────
 * Sie taten es einmal: jedes Universum hatte einen festen `modifier`. Das ergab
 * zehn Universen und damit zehn feste Läufe — der zweite Besuch von Void Nexus
 * war Zeile für Zeile der erste. Seit die Vorsehung gezogen wird, sind es zehn
 * mal achtzehn, ohne dass ein Universum seine Herkunft verliert: das Universum
 * sagt WOHIN, die Vorsehung WORUNTER.
 *
 * ── Warum jede Vorsehung etwas kostet ───────────────────────────────────────
 * Eine Karte ohne Preis wäre keine Wahl, sondern ein Geschenk, und drei
 * Geschenke nebeneinander sind ein Ranking — der Spieler nimmt das grösste und
 * denkt nicht weiter nach. Erst der Preis macht aus dem Angebot eine Frage:
 * worauf will ich diesen Lauf spielen? Eine Spec bindet die Regel an den
 * Katalog.
 *
 * Die Paare sind deshalb gegenläufig gebaut (Ironclad ↔ Bladed, Emberthrift ↔
 * Cinder Hoard, Far Wanderer ↔ Swift Relay): dieselbe Achse, andere Richtung.
 * Wer eine Karte verstanden hat, versteht ihr Gegenstück sofort mit.
 */
export const PROVIDENCES: ProvidenceDef[] = [
  // ── economy: Produktion, Klick, Meeps ──────────────────────────────────────
  {
    id: 'gilded-tide',
    name: 'Gilded Tide',
    description: 'Chimes come in waves. Everything you build costs what a wave is worth.',
    icon: 'game-icons:coins-pile',
    domain: 'economy',
    effects: { cpsMultiplier: 2.4, buildingCostMultiplier: 1.8 },
  },
  {
    id: 'wanderers-hand',
    name: "Wanderer's Hand",
    description: 'The cosmos answers the hand, not the machine.',
    icon: 'game-icons:windchimes',
    domain: 'economy',
    effects: { cpcMultiplier: 3, cpsMultiplier: 0.5 },
  },
  {
    id: 'meep-covenant',
    name: 'Meep Covenant',
    description: 'They gather willingly, and ask for little. They carry little, too.',
    icon: 'game-icons:sparkles',
    domain: 'economy',
    effects: { meepCostMultiplier: 0.4, meepPowerMultiplier: 0.55 },
  },

  // ── cosmos: Sterne und Drifter ─────────────────────────────────────────────
  {
    id: 'long-vigil',
    name: 'Long Vigil',
    description: 'The stars linger, and the wanderer keeps watch far longer than he should.',
    icon: 'game-icons:all-seeing-eye',
    domain: 'cosmos',
    effects: { starLifetimeMult: 1.4, materialDropMult: 0.75 },
  },
  {
    id: 'culling-light',
    name: 'Culling Light',
    description: 'Stars burn out in a breath — but what they leave behind is worth the haste.',
    icon: 'game-icons:falling-star',
    domain: 'cosmos',
    effects: { materialDropMult: 2.2, starLifetimeMult: 0.55 },
  },
  {
    id: 'hollow-tide',
    name: 'Hollow Tide',
    description:
      'The void sends its flotsam twice as often, and takes back the gift twice as fast.',
    icon: 'game-icons:scout-ship',
    domain: 'cosmos',
    effects: { drifterSpawnIntervalMult: 0.5, drifterBuffDurationMult: 0.5 },
  },

  // ── combat: Orbit und Bosse ────────────────────────────────────────────────
  {
    id: 'ironclad-orbit',
    name: 'Ironclad Orbit',
    description: 'The batteries answer for the orbit. Let the champions rest their blades.',
    icon: 'game-icons:shield-echoes',
    domain: 'combat',
    effects: { turretDpsMult: 2.2, combatDpsMult: 0.6 },
  },
  {
    id: 'bladed-orbit',
    name: 'Bladed Orbit',
    description: 'Steel over stone — the guardians strike, and the batteries fall silent.',
    icon: 'game-icons:crossed-swords',
    domain: 'combat',
    effects: { combatDpsMult: 1.8, turretDpsMult: 0.45 },
  },
  {
    id: 'wardens-toll',
    name: "Warden's Toll",
    description: 'Every keeper of a world grows heavier — and richer for the felling.',
    icon: 'game-icons:star-skull',
    domain: 'combat',
    effects: { bossRewardMult: 2.5, bossHpMult: 1.6 },
  },

  // ── roster: Champions und Ladder ───────────────────────────────────────────
  {
    id: 'quickened-path',
    name: 'Quickened Path',
    description: 'The road teaches quickly, but the rift remembers little of it.',
    icon: 'game-icons:progression',
    domain: 'roster',
    effects: { xpMult: 2.5, lpGainMult: 0.6 },
  },
  {
    id: 'rift-ascendant',
    name: 'Rift Ascendant',
    description: 'Glory is counted in the rift alone. What the journey taught fades on arrival.',
    icon: 'game-icons:podium-winner',
    domain: 'roster',
    effects: { lpGainMult: 1.8, xpMult: 0.55 },
  },
  {
    id: 'proven-in-fire',
    name: 'Proven in Fire',
    description: 'A roster forged for war carries no room for salvage.',
    icon: 'game-icons:heraldic-sun',
    domain: 'roster',
    effects: { eloPowerMultiplier: 2.4, materialDropMult: 0.6 },
  },

  // ── forge: Schmiede und Material ───────────────────────────────────────────
  {
    id: 'emberthrift',
    name: 'Emberthrift',
    description: 'The forge asks for little. The cosmos, in turn, gives up little.',
    icon: 'game-icons:anvil-impact',
    domain: 'forge',
    effects: { forgeMaterialCostMult: 0.55, materialDropMult: 0.7 },
  },
  {
    id: 'cinder-hoard',
    name: 'Cinder Hoard',
    description: 'Every shard finds its way to the pile — and the forge knows its worth.',
    icon: 'game-icons:crystal-cluster',
    domain: 'forge',
    effects: { materialDropMult: 1.9, forgeMaterialCostMult: 1.5 },
  },
  {
    id: 'molten-tithe',
    name: 'Molten Tithe',
    description: 'The sun takes its cut from the works, not from the ore.',
    icon: 'game-icons:contract',
    domain: 'forge',
    effects: { forgeMaterialCostMult: 0.4, cpsMultiplier: 0.65 },
  },

  // ── expedition: die langen Wege ────────────────────────────────────────────
  {
    id: 'far-wanderer',
    name: 'Far Wanderer',
    description: 'The long way round is the only way that pays.',
    icon: 'game-icons:caravel',
    domain: 'expedition',
    effects: { expeditionRewardMult: 2.6, expeditionSpeedMult: 1.8 },
  },
  {
    id: 'swift-relay',
    name: 'Swift Relay',
    description: 'Send them out, call them home, send them out again. Nobody counts the haul.',
    icon: 'game-icons:backward-time',
    domain: 'expedition',
    effects: { expeditionSpeedMult: 0.5, expeditionRewardMult: 0.6 },
  },
  {
    id: 'distant-shores',
    name: 'Distant Shores',
    description: 'What lies beyond the reach pays better than what lies under the hand.',
    icon: 'game-icons:galaxy',
    domain: 'expedition',
    effects: { expeditionRewardMult: 2, cpcMultiplier: 0.5 },
  },
]

/**
 * Wie eine Effektachse heisst, wo sie neutral steht und über welchen Weg sie
 * wirkt.
 *
 * `via` trennt die beiden Klassen, die sich seit der Zusammenführung in einer
 * Struktur teilen:
 *  - `'modifier'` — geerbt von `ModifierEffects`, gelesen über
 *    `gameStore.activeModifier` (shopStore, gameStore, planetShopStore),
 *  - `'store'` — Kosmos-Achsen mit je einem Getter im `providenceStore`.
 * Eine Spec prüft daran, dass keine `'store'`-Achse ohne Getter im Katalog steht.
 *
 * `neutral` steht je Achse und nicht global, damit eine spätere Achse mit
 * anderem Nullpunkt nicht still falsch eingefärbt wird. Heute ist es überall
 * `PROVIDENCE_NEUTRAL_MULTIPLIER` — jede verwendete Achse ist ein reiner
 * Multiplikator, siehe `ProvidenceEffects`.
 *
 * Steht hier und nicht in der Komponente: Prestige-Karte und Header-Tooltip
 * lesen beide daraus, und ein Effekt, der an einer Stelle grün und an der
 * anderen rot erscheint, wäre schlimmer als gar keine Färbung.
 */
export interface ProvidenceEffectMeta {
  label: string
  higherIsBetter: boolean
  neutral: number
  via: 'modifier' | 'store'
}

export const PROVIDENCE_EFFECT_META: Partial<
  Record<keyof ProvidenceEffects, ProvidenceEffectMeta>
> = {
  // Wirtschaft — über activeModifier
  cpsMultiplier: {
    label: 'Chimes/sec',
    higherIsBetter: true,
    neutral: PROVIDENCE_NEUTRAL_MULTIPLIER,
    via: 'modifier',
  },
  cpcMultiplier: {
    label: 'Chimes/click',
    higherIsBetter: true,
    neutral: PROVIDENCE_NEUTRAL_MULTIPLIER,
    via: 'modifier',
  },
  buildingCostMultiplier: {
    label: 'Building cost',
    higherIsBetter: false,
    neutral: PROVIDENCE_NEUTRAL_MULTIPLIER,
    via: 'modifier',
  },
  meepCostMultiplier: {
    label: 'Meep cost',
    higherIsBetter: false,
    neutral: PROVIDENCE_NEUTRAL_MULTIPLIER,
    via: 'modifier',
  },
  meepPowerMultiplier: {
    label: 'Meep power',
    higherIsBetter: true,
    neutral: PROVIDENCE_NEUTRAL_MULTIPLIER,
    via: 'modifier',
  },
  eloPowerMultiplier: {
    label: 'Battle power',
    higherIsBetter: true,
    neutral: PROVIDENCE_NEUTRAL_MULTIPLIER,
    via: 'modifier',
  },

  // Kosmos — über je einen Getter im providenceStore
  starLifetimeMult: {
    label: 'Star lifetime',
    higherIsBetter: true,
    neutral: PROVIDENCE_NEUTRAL_MULTIPLIER,
    via: 'store',
  },
  materialDropMult: {
    label: 'Material drops',
    higherIsBetter: true,
    neutral: PROVIDENCE_NEUTRAL_MULTIPLIER,
    via: 'store',
  },
  combatDpsMult: {
    label: 'Champion DPS',
    higherIsBetter: true,
    neutral: PROVIDENCE_NEUTRAL_MULTIPLIER,
    via: 'store',
  },
  turretDpsMult: {
    label: 'Turret DPS',
    higherIsBetter: true,
    neutral: PROVIDENCE_NEUTRAL_MULTIPLIER,
    via: 'store',
  },
  bossHpMult: {
    label: 'Boss HP',
    higherIsBetter: false,
    neutral: PROVIDENCE_NEUTRAL_MULTIPLIER,
    via: 'store',
  },
  bossRewardMult: {
    label: 'Boss spoils',
    higherIsBetter: true,
    neutral: PROVIDENCE_NEUTRAL_MULTIPLIER,
    via: 'store',
  },
  xpMult: {
    label: 'Champion XP',
    higherIsBetter: true,
    neutral: PROVIDENCE_NEUTRAL_MULTIPLIER,
    via: 'store',
  },
  lpGainMult: {
    label: 'LP per win',
    higherIsBetter: true,
    neutral: PROVIDENCE_NEUTRAL_MULTIPLIER,
    via: 'store',
  },
  forgeMaterialCostMult: {
    label: 'Forge cost',
    higherIsBetter: false,
    neutral: PROVIDENCE_NEUTRAL_MULTIPLIER,
    via: 'store',
  },
  expeditionSpeedMult: {
    label: 'Expedition time',
    higherIsBetter: false,
    neutral: PROVIDENCE_NEUTRAL_MULTIPLIER,
    via: 'store',
  },
  expeditionRewardMult: {
    label: 'Expedition rewards',
    higherIsBetter: true,
    neutral: PROVIDENCE_NEUTRAL_MULTIPLIER,
    via: 'store',
  },
  drifterSpawnIntervalMult: {
    label: 'Drifter interval',
    higherIsBetter: false,
    neutral: PROVIDENCE_NEUTRAL_MULTIPLIER,
    via: 'store',
  },
  drifterBuffDurationMult: {
    label: 'Drifter buff time',
    higherIsBetter: true,
    neutral: PROVIDENCE_NEUTRAL_MULTIPLIER,
    via: 'store',
  },
}

/** Wie eine Domäne auf der Karte heisst. Ohne das Label sähe eine Auswahl aus
 *  drei Domänen wie drei beliebige Karten aus. */
export const PROVIDENCE_DOMAIN_LABELS: Record<ProvidenceDef['domain'], string> = {
  economy: 'Economy',
  cosmos: 'Cosmos',
  combat: 'Combat',
  roster: 'Roster',
  forge: 'Forge',
  expedition: 'Expedition',
}

export function getProvidence(id: string): ProvidenceDef | undefined {
  return PROVIDENCES.find((p) => p.id === id)
}

/**
 * Die Effektzeilen einer Vorsehung, in Katalogreihenfolge — das Plus steht in
 * jeder Definition zuerst, damit die Karte mit dem Grund beginnt, sie zu nehmen,
 * und nicht mit dem Preis.
 */
export function providenceEffectLines(def: ProvidenceDef): ProvidenceEffectLine[] {
  const lines: ProvidenceEffectLine[] = []
  for (const [key, value] of Object.entries(def.effects)) {
    const meta = PROVIDENCE_EFFECT_META[key as keyof ProvidenceEffects]
    if (!meta || typeof value !== 'number') continue
    const positive = meta.higherIsBetter ? value > meta.neutral : value < meta.neutral
    lines.push({
      label: meta.label,
      value: `x${value}`,
      text: `${meta.label} x${value}`,
      positive,
    })
  }
  return lines
}
