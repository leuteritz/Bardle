import type {
  ProvidenceAxis,
  ProvidenceDomain,
  ProvidenceEffectLine,
  ProvidenceEffects,
  RolledProvidence,
} from '@/types'
import { PROVIDENCE_PCT_STEP, PROVIDENCE_MULT_PRECISION } from '@/config/constants'

/**
 * PROVIDENCES OF THE WANDERER
 *
 * Was beim Prestige über einem Universum steht: ein Buff und ein Debuff, beide
 * im Moment der Ziehung GEWÜRFELT — welche Achse, in welche Richtung, und um
 * wie viel Prozent.
 *
 * ── Warum kein Katalog mehr ─────────────────────────────────────────────────
 * Es gab einmal achtzehn fertige Vorsehungen. Achtzehn Karten sind nach ein
 * paar Läufen auswendig gelernt, und dann ist die Wahl eine Erinnerungsübung:
 * man weiss, welche die beste ist, und wartet auf sie. Gewürfelte Höhen machen
 * jede Ziehung zu einer echten Abwägung — „+150 % Champion-DPS für −30 %
 * Turret-DPS" ist ein anderes Angebot als „+45 % für −50 %", obwohl beide auf
 * denselben zwei Achsen liegen.
 *
 * Geblieben ist alles, was Wiedererkennbarkeit trägt: Name und Glyph hängen an
 * der BUFF-Achse. „Bladed Orbit" ist immer die Karte, die Champion-Schaden
 * hebt — nur Höhe und Preis sind jedes Mal andere.
 *
 * ── Die Regel, die das Angebot trägt ────────────────────────────────────────
 * Genau ein Plus und genau ein Minus, nie auf derselben Achse (das hübe sich
 * auf). Der Debuff kommt bevorzugt aus derselben Domäne wie der Buff: „mehr
 * Champion-Schaden, dafür schwächere Turrets" ist eine Entscheidung über den
 * Orbit, „mehr Champion-Schaden, dafür teurere Expeditionen" wären zwei
 * Nachrichten aus zwei Welten.
 */

/**
 * Die Achsen, aus denen gewürfelt wird.
 *
 * `buffPct` und `debuffPct` stehen je Achse, weil die Achsen verschieden
 * empfindlich sind: 150 % mehr Chimes pro Sekunde sind ein guter Lauf, 150 %
 * mehr Boss-HP wären eine Mauer. Die Spannen sind ausserdem asymmetrisch — ein
 * Buff darf weiter ausschlagen als ein Debuff, sonst fühlt sich jede Karte wie
 * ein Nullsummenspiel an, und niemand freut sich über eine Ziehung.
 *
 * Jede Domäne führt mindestens ZWEI Achsen, damit der Debuff im Regelfall aus
 * derselben Domäne kommen kann.
 */
export const PROVIDENCE_AXES: ProvidenceAxis[] = [
  // ── economy ────────────────────────────────────────────────────────────────
  {
    key: 'cpsMultiplier',
    label: 'Chimes/sec',
    domain: 'economy',
    higherIsBetter: true,
    via: 'modifier',
    icon: 'game-icons:coins-pile',
    names: ['Gilded Tide', 'Endless Coffer', 'Chime Bloom'],
    buffPct: [60, 180],
    debuffPct: [25, 50],
  },
  {
    key: 'cpcMultiplier',
    label: 'Chimes/click',
    domain: 'economy',
    higherIsBetter: true,
    via: 'modifier',
    icon: 'game-icons:windchimes',
    names: ["Wanderer's Hand", 'Quickened Touch', 'Struck Resonance'],
    buffPct: [80, 250],
    debuffPct: [30, 55],
  },
  {
    key: 'buildingCostMultiplier',
    label: 'Building cost',
    domain: 'economy',
    higherIsBetter: false,
    via: 'modifier',
    icon: 'game-icons:contract',
    names: ['Frugal Pact', 'Lean Foundations', 'Cheap Passage'],
    buffPct: [20, 45],
    debuffPct: [30, 70],
  },
  {
    key: 'meepCostMultiplier',
    label: 'Meep cost',
    domain: 'economy',
    higherIsBetter: false,
    via: 'modifier',
    icon: 'game-icons:sparkles',
    names: ['Meep Covenant', 'Willing Flock', 'Easy Summons'],
    buffPct: [30, 60],
    debuffPct: [35, 80],
  },
  {
    key: 'meepPowerMultiplier',
    label: 'Meep power',
    domain: 'economy',
    higherIsBetter: true,
    via: 'modifier',
    icon: 'game-icons:stars-stack',
    // „Burdened" stand hier einmal und las sich als Strafe, obwohl der Name nur
    // fällt, wenn diese Achse der BUFF ist. Ein Kartenname darf nie gegen die
    // Richtung sprechen, die er ankündigt.
    names: ['Laden Flock', 'Strong Flock', 'Willing Burden'],
    buffPct: [40, 120],
    debuffPct: [25, 50],
  },

  // ── cosmos ─────────────────────────────────────────────────────────────────
  {
    key: 'starLifetimeMult',
    label: 'Star lifetime',
    domain: 'cosmos',
    higherIsBetter: true,
    via: 'store',
    icon: 'game-icons:all-seeing-eye',
    names: ['Long Vigil', 'Lingering Light', 'Patient Stars'],
    buffPct: [25, 70],
    debuffPct: [20, 45],
  },
  {
    key: 'drifterSpawnIntervalMult',
    label: 'Drifter interval',
    domain: 'cosmos',
    higherIsBetter: false,
    via: 'store',
    icon: 'game-icons:scout-ship',
    names: ['Hollow Tide', 'Restless Drift', 'Crowded Lanes'],
    buffPct: [25, 55],
    debuffPct: [30, 70],
  },
  {
    key: 'drifterBuffDurationMult',
    label: 'Drifter buff time',
    domain: 'cosmos',
    higherIsBetter: true,
    via: 'store',
    icon: 'game-icons:backward-time',
    names: ['Lasting Boon', 'Slow Fade', 'Held Breath'],
    buffPct: [40, 110],
    debuffPct: [25, 50],
  },

  // ── combat ─────────────────────────────────────────────────────────────────
  {
    key: 'combatDpsMult',
    label: 'Champion DPS',
    domain: 'combat',
    higherIsBetter: true,
    via: 'store',
    icon: 'game-icons:crossed-swords',
    names: ['Bladed Orbit', 'Sharpened Guard', 'Keen Escort'],
    buffPct: [40, 120],
    debuffPct: [25, 50],
  },
  {
    key: 'turretDpsMult',
    label: 'Turret DPS',
    domain: 'combat',
    higherIsBetter: true,
    via: 'store',
    icon: 'game-icons:shield-echoes',
    names: ['Ironclad Orbit', 'Loaded Batteries', 'Steady Barrage'],
    buffPct: [50, 150],
    debuffPct: [30, 55],
  },
  {
    key: 'bossHpMult',
    label: 'Boss HP',
    domain: 'combat',
    higherIsBetter: false,
    via: 'store',
    icon: 'game-icons:star-skull',
    names: ['Brittle Wardens', 'Thin Keepers', 'Hollow Guardians'],
    buffPct: [20, 45],
    debuffPct: [30, 70],
  },
  {
    key: 'bossRewardMult',
    label: 'Boss spoils',
    domain: 'combat',
    higherIsBetter: true,
    via: 'store',
    icon: 'game-icons:two-coins',
    names: ["Warden's Toll", 'Rich Felling', 'Deep Spoils'],
    buffPct: [60, 180],
    debuffPct: [25, 50],
  },

  // ── roster ─────────────────────────────────────────────────────────────────
  {
    key: 'xpMult',
    label: 'Champion XP',
    domain: 'roster',
    higherIsBetter: true,
    via: 'store',
    icon: 'game-icons:progression',
    names: ['Quickened Path', 'Fast Study', 'Eager Road'],
    buffPct: [60, 180],
    debuffPct: [25, 50],
  },
  {
    key: 'lpGainMult',
    label: 'LP per win',
    domain: 'roster',
    higherIsBetter: true,
    via: 'store',
    icon: 'game-icons:podium-winner',
    names: ['Rift Ascendant', 'Crowned Climb', 'Loud Victory'],
    buffPct: [40, 110],
    debuffPct: [25, 50],
  },
  {
    key: 'eloPowerMultiplier',
    label: 'Battle power',
    domain: 'roster',
    higherIsBetter: true,
    via: 'modifier',
    icon: 'game-icons:heraldic-sun',
    names: ['Proven in Fire', 'Tempered Roster', 'Battle-Worn'],
    buffPct: [60, 160],
    debuffPct: [25, 50],
  },

  // ── forge ──────────────────────────────────────────────────────────────────
  {
    key: 'forgeMaterialCostMult',
    label: 'Forge cost',
    domain: 'forge',
    higherIsBetter: false,
    via: 'store',
    icon: 'game-icons:anvil-impact',
    names: ['Emberthrift', 'Molten Tithe', 'Cheap Kindling'],
    buffPct: [25, 55],
    debuffPct: [30, 70],
  },
  {
    key: 'materialDropMult',
    label: 'Material drops',
    domain: 'forge',
    higherIsBetter: true,
    via: 'store',
    icon: 'game-icons:crystal-cluster',
    names: ['Cinder Hoard', 'Rich Seams', 'Generous Dust'],
    buffPct: [50, 150],
    debuffPct: [25, 50],
  },

  // ── expedition ─────────────────────────────────────────────────────────────
  {
    key: 'expeditionSpeedMult',
    label: 'Expedition time',
    domain: 'expedition',
    higherIsBetter: false,
    via: 'store',
    icon: 'game-icons:caravel',
    names: ['Swift Relay', 'Short Passage', 'Fair Winds'],
    buffPct: [25, 55],
    debuffPct: [35, 80],
  },
  {
    key: 'expeditionRewardMult',
    label: 'Expedition rewards',
    domain: 'expedition',
    higherIsBetter: true,
    via: 'store',
    icon: 'game-icons:galaxy',
    names: ['Far Wanderer', 'Distant Shores', 'Rich Landfall'],
    buffPct: [60, 180],
    debuffPct: [25, 50],
  },
]

/** Wie eine Domäne auf der Karte heisst. Ohne das Label sähe eine Auswahl aus
 *  drei Domänen wie drei beliebige Karten aus. */
export const PROVIDENCE_DOMAIN_LABELS: Record<ProvidenceDomain, string> = {
  economy: 'Economy',
  cosmos: 'Cosmos',
  combat: 'Combat',
  roster: 'Roster',
  forge: 'Forge',
  expedition: 'Expedition',
}

/** Alle Domänen, die tatsächlich Achsen führen — die Quelle für die Spreizung
 *  des Angebots. Abgeleitet statt gepflegt: eine neue Achse bringt ihre Domäne
 *  von selbst mit. */
export const PROVIDENCE_DOMAINS: ProvidenceDomain[] = [
  ...new Set(PROVIDENCE_AXES.map((a) => a.domain)),
]

export function providenceAxis(key: keyof ProvidenceEffects): ProvidenceAxis | undefined {
  return PROVIDENCE_AXES.find((a) => a.key === key)
}

function pick<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)]
}

/** Ein Prozentwert aus der Spanne, auf `PROVIDENCE_PCT_STEP` gerastert — eine
 *  krumme „+143 %" läse sich wie Rauschen, „+145 %" wie eine Ansage. */
function rollPct([min, max]: [number, number]): number {
  const raw = min + Math.random() * (max - min)
  return Math.round(raw / PROVIDENCE_PCT_STEP) * PROVIDENCE_PCT_STEP
}

/**
 * Der Multiplikator, den ein Prozentwert auf dieser Achse ergibt.
 *
 * Ob er hebt oder senkt, folgt aus zwei Fragen: ist das ein Buff, und ist auf
 * dieser Achse „mehr" gut? Bei gleicher Antwort geht es hinauf, sonst hinunter —
 * ein Buff auf `buildingCostMultiplier` senkt die Kosten, ein Debuff hebt sie.
 */
function multiplierFor(axis: ProvidenceAxis, pct: number, isBuff: boolean): number {
  const raises = isBuff === axis.higherIsBetter
  const value = raises ? 1 + pct / 100 : 1 - pct / 100
  // Auf feste Stellen bringen: `1 - 0.55` ist in Gleitkomma 0.44999999999999996,
  // und daraus zurückgerechnete Prozente zeigten sonst „-45.000000000000004".
  return Number(value.toFixed(PROVIDENCE_MULT_PRECISION))
}

/**
 * Eine Vorsehung dieser Domäne würfeln.
 *
 * Der Debuff kommt aus derselben Domäne, solange sie eine zweite Achse hat —
 * sonst (theoretisch, heute führt jede Domäne mindestens zwei) aus dem ganzen
 * Vorrat. Nie dieselbe Achse wie der Buff: das hübe sich auf und liesse eine
 * Karte übrig, die nichts tut.
 */
export function rollProvidence(domain: ProvidenceDomain): RolledProvidence {
  const inDomain = PROVIDENCE_AXES.filter((a) => a.domain === domain)
  const buff = pick(inDomain)

  const sameDomain = inDomain.filter((a) => a.key !== buff.key)
  const debuffPool = sameDomain.length
    ? sameDomain
    : PROVIDENCE_AXES.filter((a) => a.key !== buff.key)
  const debuff = pick(debuffPool)

  return {
    name: pick(buff.names),
    icon: buff.icon,
    domain,
    buffKey: buff.key,
    debuffKey: debuff.key,
    effects: {
      [buff.key]: multiplierFor(buff, rollPct(buff.buffPct), true),
      [debuff.key]: multiplierFor(debuff, rollPct(debuff.debuffPct), false),
    },
  }
}

/**
 * Die zwei Zeilen einer gewürfelten Vorsehung — Buff zuerst, damit die Karte
 * mit dem Grund beginnt, sie zu nehmen, und nicht mit dem Preis.
 *
 * `positive` kommt aus dem ROLL (welche Achse war der Buff) und wird nicht aus
 * dem Wert zurückgerechnet: die Bewertung ist eine Eigenschaft der Ziehung, und
 * sie zweimal unabhängig herzuleiten hiesse, zwei Stellen zu haben, die
 * auseinanderlaufen können.
 */
export function providenceEffectLines(rolled: RolledProvidence): ProvidenceEffectLine[] {
  const lines: ProvidenceEffectLine[] = []
  for (const [key, positive] of [
    [rolled.buffKey, true],
    [rolled.debuffKey, false],
  ] as const) {
    const axis = providenceAxis(key)
    const mult = rolled.effects[key]
    if (!axis || typeof mult !== 'number') continue
    const pct = Math.round((mult - 1) * 100)
    const value = `${pct >= 0 ? '+' : '−'}${Math.abs(pct)}%`
    lines.push({ label: axis.label, value, text: `${axis.label} ${value}`, positive })
  }
  return lines
}
