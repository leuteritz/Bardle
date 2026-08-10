import type { ProvidenceDef, ProvidenceEffectLine, ProvidenceEffects } from '@/types'
import { PROVIDENCE_NEUTRAL_MULTIPLIER } from '@/config/constants'

/**
 * PROVIDENCES OF THE WANDERER
 *
 * Beim Prestige wählt Bard zwei Dinge: das Universum und die Vorsehung, unter
 * der er es bereist. Die Trennung zwischen beiden ist die Regel, an der das
 * System hängt — **das Universum färbt die Wirtschaft, die Vorsehung den
 * Kosmos**. `ModifierEffects` bewegt CPS, CPC, Gebäudekosten, Meep-Preise und
 * die Bard-Levelkurve; keiner der Schlüssel hier tut das, und keiner dort
 * berührt Sterne, Kampf, Kader, Forge, Expeditionen oder Drifter.
 *
 * Ohne diese Trennung wäre die Vorsehung eine zweite Ausgabe des
 * Universe-Modifiers: zwei Karten, die dieselbe Zahl in dieselbe Richtung
 * schieben, und ein Spieler, der nicht mehr sagen kann, woher sein CPS kommt.
 *
 * ── Warum jede Vorsehung etwas kostet ───────────────────────────────────────
 * Jede trägt genau ein Plus und genau ein Minus. Eine Karte ohne Preis wäre
 * keine Wahl, sondern ein Geschenk, und drei Geschenke nebeneinander sind ein
 * Ranking — der Spieler nimmt das grösste und denkt nicht weiter nach. Erst der
 * Preis macht aus dem Angebot eine Frage: worauf will ich diesen Lauf spielen?
 *
 * Die Paare sind deshalb bewusst gegenläufig gebaut (Ironclad ↔ Bladed,
 * Emberthrift ↔ Cinder Hoard, Far Wanderer ↔ Swift Relay): dieselbe Achse,
 * andere Richtung. Wer eine Karte verstanden hat, versteht ihr Gegenstück
 * sofort mit.
 */
export const PROVIDENCES: ProvidenceDef[] = [
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
]

/**
 * Wie eine Effektachse heisst und in welche Richtung sie gut ist.
 *
 * Steht hier und nicht in der Komponente: die Karte im Prestige-Modal und der
 * Chip im Header lesen beide daraus, und ein Effekt, der an einer Stelle grün
 * und an der anderen rot erscheint, wäre schlimmer als gar keine Färbung.
 */
export const PROVIDENCE_EFFECT_META: Record<
  keyof ProvidenceEffects,
  { label: string; higherIsBetter: boolean }
> = {
  starLifetimeMult: { label: 'Star lifetime', higherIsBetter: true },
  materialDropMult: { label: 'Material drops', higherIsBetter: true },
  combatDpsMult: { label: 'Champion DPS', higherIsBetter: true },
  turretDpsMult: { label: 'Turret DPS', higherIsBetter: true },
  bossHpMult: { label: 'Boss HP', higherIsBetter: false },
  bossRewardMult: { label: 'Boss spoils', higherIsBetter: true },
  xpMult: { label: 'Champion XP', higherIsBetter: true },
  lpGainMult: { label: 'LP per win', higherIsBetter: true },
  forgeMaterialCostMult: { label: 'Forge cost', higherIsBetter: false },
  expeditionSpeedMult: { label: 'Expedition time', higherIsBetter: false },
  expeditionRewardMult: { label: 'Expedition rewards', higherIsBetter: true },
  drifterSpawnIntervalMult: { label: 'Drifter interval', higherIsBetter: false },
  drifterBuffDurationMult: { label: 'Drifter buff time', higherIsBetter: true },
}

/** Wie eine Domäne auf der Karte heisst. Steht hier, damit die drei Karten des
 *  Angebots ihre Herkunft benennen können — ohne das Label sähe eine Auswahl aus
 *  drei Domänen wie drei beliebige Karten aus. */
export const PROVIDENCE_DOMAIN_LABELS: Record<ProvidenceDef['domain'], string> = {
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
    if (!meta || value === undefined) continue
    const positive = meta.higherIsBetter
      ? value > PROVIDENCE_NEUTRAL_MULTIPLIER
      : value < PROVIDENCE_NEUTRAL_MULTIPLIER
    lines.push({ text: `${meta.label} x${value}`, positive })
  }
  return lines
}
