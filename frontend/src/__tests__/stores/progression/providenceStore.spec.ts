import { setActivePinia, createPinia } from 'pinia'
import { describe, it, expect, beforeEach } from 'vitest'
import { useProvidenceStore } from '@/stores/progression/providenceStore'
import { useGameStore } from '@/stores/core/gameStore'
import {
  PROVIDENCE_AXES,
  PROVIDENCE_DOMAINS,
  PROVIDENCE_DOMAIN_LABELS,
  providenceAxis,
  providenceEffectLines,
  rollProvidence,
} from '@/config/progression/providences'
import { universes } from '@/config/progression/universes'
import {
  PROVIDENCE_OFFER_SIZE,
  PROVIDENCE_NEUTRAL_MULTIPLIER,
  PROVIDENCE_PCT_STEP,
} from '@/config/constants'
import type { ProvidenceAxis, ProvidenceEffects, RolledProvidence } from '@/types'

/** Jeder Effektgetter des Stores mit dem Schlüssel, den er liest. Steht hier
 *  einmal, damit eine `via: 'store'`-Achse ohne Getter sofort auffällt. */
const EFFECT_GETTERS: (keyof ProvidenceEffects)[] = [
  'starLifetimeMult',
  'materialDropMult',
  'combatDpsMult',
  'turretDpsMult',
  'bossHpMult',
  'bossRewardMult',
  'xpMult',
  'lpGainMult',
  'forgeMaterialCostMult',
  'expeditionSpeedMult',
  'expeditionRewardMult',
  'drifterSpawnIntervalMult',
  'drifterBuffDurationMult',
]

/** Wie viele Prozent eine Achse gegenüber ihrem Nullpunkt verschoben wurde. */
function pctOf(mult: number): number {
  return Math.round(Math.abs(mult - 1) * 100)
}

/** Ob dieser Multiplikator die Achse in ihre GUTE Richtung schiebt. */
function isImprovement(axis: ProvidenceAxis, mult: number): boolean {
  return axis.higherIsBetter ? mult > 1 : mult < 1
}

/** Viele Ziehungen über alle Domänen — die Zufallslogik ist nur über Masse
 *  prüfbar, ein einzelner Roll beweist nichts. */
function everyRoll(fn: (rolled: RolledProvidence) => void, rounds = 60): void {
  for (let i = 0; i < rounds; i++) {
    for (const domain of PROVIDENCE_DOMAINS) fn(rollProvidence(domain))
  }
}

describe('rollProvidence', () => {
  it('würfelt genau zwei Achsen, und nie zweimal dieselbe', () => {
    everyRoll((r) => {
      expect(Object.keys(r.effects)).toHaveLength(2)
      expect(r.buffKey).not.toBe(r.debuffKey)
      expect(r.effects[r.buffKey]).toBeTypeOf('number')
      expect(r.effects[r.debuffKey]).toBeTypeOf('number')
    })
  })

  it('schiebt den Buff in die gute und den Debuff in die schlechte Richtung', () => {
    // Der Kern der Ziehung: auf einer Achse mit `higherIsBetter: false`
    // (Baukosten, Boss-HP, Forge-Kosten) SENKT der Buff den Wert und der Debuff
    // hebt ihn — wer das verwechselt, verschenkt einen Bonus als Strafe.
    everyRoll((r) => {
      const buff = providenceAxis(r.buffKey)!
      const debuff = providenceAxis(r.debuffKey)!
      expect(isImprovement(buff, r.effects[r.buffKey]!), `${r.name}: Buff auf ${r.buffKey}`).toBe(
        true,
      )
      expect(
        isImprovement(debuff, r.effects[r.debuffKey]!),
        `${r.name}: Debuff auf ${r.debuffKey}`,
      ).toBe(false)
    })
  })

  it('bleibt mit jedem Wert in der Spanne seiner Achse', () => {
    everyRoll((r) => {
      const buff = providenceAxis(r.buffKey)!
      const debuff = providenceAxis(r.debuffKey)!
      const buffPct = pctOf(r.effects[r.buffKey]!)
      const debuffPct = pctOf(r.effects[r.debuffKey]!)
      // Gerastert wird nach dem Ziehen, das kann um bis zu einen halben Schritt
      // über die Kante gehen — genau diese Toleranz und keine grössere.
      const slack = PROVIDENCE_PCT_STEP / 2
      expect(buffPct).toBeGreaterThanOrEqual(buff.buffPct[0] - slack)
      expect(buffPct).toBeLessThanOrEqual(buff.buffPct[1] + slack)
      expect(debuffPct).toBeGreaterThanOrEqual(debuff.debuffPct[0] - slack)
      expect(debuffPct).toBeLessThanOrEqual(debuff.debuffPct[1] + slack)
    })
  })

  it('rastert jeden Prozentwert auf PROVIDENCE_PCT_STEP', () => {
    everyRoll((r) => {
      for (const key of [r.buffKey, r.debuffKey]) {
        expect(pctOf(r.effects[key]!) % PROVIDENCE_PCT_STEP).toBe(0)
      }
    })
  })

  it('lässt keinen Multiplikator auf oder unter null fallen', () => {
    everyRoll((r) => {
      for (const key of [r.buffKey, r.debuffKey]) {
        expect(r.effects[key]!).toBeGreaterThan(0)
      }
    })
  })

  it('nimmt Name und Glyph von der Buff-Achse — daran bleibt die Karte erkennbar', () => {
    everyRoll((r) => {
      const buff = providenceAxis(r.buffKey)!
      expect(buff.names).toContain(r.name)
      expect(r.icon).toBe(buff.icon)
      expect(r.domain).toBe(buff.domain)
    })
  })

  it('holt den Debuff aus derselben Domäne wie den Buff', () => {
    // Thematische Geschlossenheit: „mehr Champion-Schaden, dafür schwächere
    // Turrets" ist eine Entscheidung über den Orbit; „… dafür teurere
    // Expeditionen" wären zwei Nachrichten aus zwei Welten.
    everyRoll((r) => {
      expect(providenceAxis(r.debuffKey)!.domain).toBe(r.domain)
    })
  })

  it('liefert genau eine positive und eine negative Zeile, Buff zuerst', () => {
    everyRoll((r) => {
      const lines = providenceEffectLines(r)
      expect(lines).toHaveLength(2)
      expect(lines[0].positive).toBe(true)
      expect(lines[1].positive).toBe(false)
      expect(lines[0].label).toBe(providenceAxis(r.buffKey)!.label)
      // Prozent, kein Faktor — und immer mit Vorzeichen.
      for (const line of lines) expect(line.value).toMatch(/^[+−]\d+%$/)
    })
  })
})

describe('providenceStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  describe('ohne Vorsehung', () => {
    it('gibt jeder Effektgetter den Neutralwert zurück', () => {
      const store = useProvidenceStore()
      expect(store.active).toBeNull()
      for (const key of EFFECT_GETTERS) {
        expect(store[key]).toBe(PROVIDENCE_NEUTRAL_MULTIPLIER)
      }
    })
  })

  describe('rollOffer', () => {
    it('legt genau PROVIDENCE_OFFER_SIZE Karten aus', () => {
      const store = useProvidenceStore()
      store.rollOffer(1)
      expect(store.offer).toHaveLength(PROVIDENCE_OFFER_SIZE)
      expect(store.offerCards).toHaveLength(PROVIDENCE_OFFER_SIZE)
      expect(store.hasOffer).toBe(true)
    })

    it('bietet nie das laufende Universum an und nie eines doppelt', () => {
      const store = useProvidenceStore()
      for (const current of universes.map((u) => u.id)) {
        store.rollOffer(current)
        const ids = store.offer.map((o) => o.universeId)
        expect(ids).not.toContain(current)
        expect(new Set(ids).size).toBe(ids.length)
      }
    })

    it('zieht die drei Karten aus verschiedenen Domänen', () => {
      const store = useProvidenceStore()
      for (let i = 0; i < 200; i++) {
        store.rollOffer(1)
        const domains = store.offerCards.map((c) => c.providence.domain)
        expect(new Set(domains).size).toBe(domains.length)
      }
    })

    it('würfelt bei jedem Öffnen neu', () => {
      // Sonst liesse sich durch Schliessen und Wiederöffnen nichts anderes
      // erhoffen, und die Ziehung wäre eine Formalie.
      const store = useProvidenceStore()
      const seen = new Set<string>()
      for (let i = 0; i < 40; i++) {
        store.rollOffer(1)
        seen.add(store.offer.map((o) => `${o.universeId}:${o.providence.name}`).join('|'))
      }
      expect(seen.size).toBeGreaterThan(1)
    })

    it('lässt eine laufende Vorsehung unangetastet', () => {
      const store = useProvidenceStore()
      const running = rollProvidence('cosmos')
      store.active = running
      store.rollOffer(1)
      // toEqual, nicht toBe: Pinia reicht den State als Proxy heraus, die
      // Referenz ist also nie dieselbe wie das eingesetzte Objekt.
      expect(store.active).toEqual(running)
    })
  })

  describe('choose', () => {
    it('nimmt die Karte des gewählten Universums an und leert das Angebot', () => {
      const store = useProvidenceStore()
      store.rollOffer(1)
      const picked = store.offer[0]

      expect(store.choose(picked.universeId)).toBe(true)
      expect(store.active).toEqual(picked.providence)
      expect(store.offer).toEqual([])
      expect(store.hasOffer).toBe(false)
    })

    it('lehnt ein Universum ab, das nicht im Angebot steht', () => {
      const store = useProvidenceStore()
      store.rollOffer(1)
      const offered = new Set(store.offer.map((o) => o.universeId))
      const notOffered = universes.find((u) => !offered.has(u.id))!

      expect(store.choose(notOffered.id)).toBe(false)
      expect(store.active).toBeNull()
      expect(store.offer).toHaveLength(PROVIDENCE_OFFER_SIZE)
    })

    it('reicht die Kosmos-Achsen an ihre Getter durch', () => {
      const store = useProvidenceStore()
      store.offer = [
        {
          universeId: 2,
          providence: {
            name: 'Test Vigil',
            icon: 'game-icons:all-seeing-eye',
            domain: 'cosmos',
            buffKey: 'starLifetimeMult',
            debuffKey: 'drifterBuffDurationMult',
            effects: { starLifetimeMult: 1.5, drifterBuffDurationMult: 0.7 },
          },
        },
      ]
      store.choose(2)

      expect(store.starLifetimeMult).toBe(1.5)
      expect(store.drifterBuffDurationMult).toBe(0.7)
      // Achsen, die diese Vorsehung nicht anfasst, bleiben neutral.
      expect(store.combatDpsMult).toBe(PROVIDENCE_NEUTRAL_MULTIPLIER)
      expect(store.lpGainMult).toBe(PROVIDENCE_NEUTRAL_MULTIPLIER)
    })
  })

  describe('Zusammenführung mit dem Universe-Modifier', () => {
    it('speist die Wirtschaftsachsen der Vorsehung in gameStore.activeModifier', () => {
      // Die Zusammenführung in einem Test: seit das Universum keinen eigenen
      // Modifier mehr trägt, ist die Vorsehung die Basis von `activeModifier` —
      // und damit von rund 25 unveränderten Lesestellen im Projekt.
      const store = useProvidenceStore()
      const game = useGameStore()
      expect(game.activeModifier.cpsMultiplier).toBe(PROVIDENCE_NEUTRAL_MULTIPLIER)

      store.offer = [
        {
          universeId: 2,
          providence: {
            name: 'Test Tide',
            icon: 'game-icons:coins-pile',
            domain: 'economy',
            buffKey: 'cpsMultiplier',
            debuffKey: 'buildingCostMultiplier',
            effects: { cpsMultiplier: 2.4, buildingCostMultiplier: 1.5 },
          },
        },
      ]
      store.choose(2)

      expect(game.activeModifier.cpsMultiplier).toBe(2.4)
      expect(game.activeModifier.buildingCostMultiplier).toBe(1.5)
    })
  })

  describe('clearOffer / clearAll', () => {
    it('verwirft clearOffer nur das Angebot, nicht die laufende Vorsehung', () => {
      const store = useProvidenceStore()
      store.active = rollProvidence('cosmos')
      store.rollOffer(1)

      store.clearOffer()
      expect(store.offer).toEqual([])
      expect(store.active).not.toBeNull()
    })

    it('räumt clearAll beides ab', () => {
      const store = useProvidenceStore()
      store.active = rollProvidence('cosmos')
      store.rollOffer(1)

      store.clearAll()
      expect(store.offer).toEqual([])
      expect(store.active).toBeNull()
    })
  })
})

describe('Achsen-Katalog', () => {
  it('führt in jeder Domäne mindestens zwei Achsen', () => {
    // Sonst müsste der Debuff die Domäne verlassen, und die Karte erzählte zwei
    // Geschichten statt einer.
    for (const domain of PROVIDENCE_DOMAINS) {
      const count = PROVIDENCE_AXES.filter((a) => a.domain === domain).length
      expect(count, `Domäne ${domain} führt nur ${count} Achse(n)`).toBeGreaterThanOrEqual(2)
    }
  })

  it('hält genug Universen und Domänen für ein vollzähliges Angebot vor', () => {
    // Ein Universum fällt als das laufende immer weg.
    expect(universes.length).toBeGreaterThan(PROVIDENCE_OFFER_SIZE)
    expect(PROVIDENCE_DOMAINS.length).toBeGreaterThanOrEqual(PROVIDENCE_OFFER_SIZE)
    for (const domain of PROVIDENCE_DOMAINS) {
      expect(PROVIDENCE_DOMAIN_LABELS[domain]).toBeTruthy()
    }
  })

  it('vergibt jede Achse, jedes Glyph und jeden Namen genau einmal', () => {
    const keys = PROVIDENCE_AXES.map((a) => a.key)
    const icons = PROVIDENCE_AXES.map((a) => a.icon)
    const names = PROVIDENCE_AXES.flatMap((a) => a.names)
    expect(new Set(keys).size).toBe(keys.length)
    expect(new Set(icons).size).toBe(icons.length)
    expect(new Set(names).size).toBe(names.length)
  })

  it('teilt kein Glyph mit einem Universum — beide stehen auf derselben Karte', () => {
    const universeIcons = new Set(universes.map((u) => u.icon))
    for (const axis of PROVIDENCE_AXES) {
      expect(universeIcons.has(axis.icon), `${axis.key} doppelt ein Universums-Wappen`).toBe(false)
    }
  })

  it('gibt jeder store-Achse einen Getter und jeder Achse eine Namensauswahl', () => {
    for (const axis of PROVIDENCE_AXES) {
      if (axis.via === 'store') {
        expect(EFFECT_GETTERS, `${axis.key} hat keinen Getter im Store`).toContain(axis.key)
      }
      expect(axis.names.length, `${axis.key} ohne Namen`).toBeGreaterThan(0)
    }
  })

  it('hält jede Spanne aufsteigend und positiv', () => {
    for (const axis of PROVIDENCE_AXES) {
      for (const [lo, hi] of [axis.buffPct, axis.debuffPct]) {
        expect(lo, `${axis.key}: Spanne beginnt bei ${lo}`).toBeGreaterThan(0)
        expect(hi, `${axis.key}: Spanne endet vor ihrem Anfang`).toBeGreaterThanOrEqual(lo)
      }
    }
  })

  it('lässt die SENKENDE Richtung nie 100 % erreichen', () => {
    // 100 % Abzug hiesse Faktor 0 — die Achse wäre danach tot, nicht schwach.
    // Betroffen ist je Achse nur eine Richtung: auf „mehr ist besser" senkt der
    // Debuff, auf „weniger ist besser" der Buff. Die hebende Richtung darf
    // dagegen weit über 100 % gehen, und soll es auch (+180 % Chimes/sec).
    for (const axis of PROVIDENCE_AXES) {
      const lowering = axis.higherIsBetter ? axis.debuffPct : axis.buffPct
      expect(lowering[1], `${axis.key}: ${lowering[1]} % löscht die Achse aus`).toBeLessThan(100)
    }
  })
})
