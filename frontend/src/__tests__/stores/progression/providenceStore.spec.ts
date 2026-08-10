import { setActivePinia, createPinia } from 'pinia'
import { describe, it, expect, beforeEach } from 'vitest'
import { useProvidenceStore } from '@/stores/progression/providenceStore'
import { useGameStore } from '@/stores/core/gameStore'
import {
  PROVIDENCES,
  PROVIDENCE_DOMAIN_LABELS,
  PROVIDENCE_EFFECT_META,
  getProvidence,
  providenceEffectLines,
} from '@/config/progression/providences'
import { universes } from '@/config/progression/universes'
import { PROVIDENCE_OFFER_SIZE, PROVIDENCE_NEUTRAL_MULTIPLIER } from '@/config/constants'
import type { ProvidenceEffects } from '@/types'

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

/** Ein Universum, das im Angebot auftauchen darf. */
const OTHER_UNIVERSE = universes[1].id

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

    it('macht eine unbekannte ID aus einem alten Spielstand wirkungslos statt fehlerhaft', () => {
      const store = useProvidenceStore()
      store.activeId = 'a-providence-that-no-longer-exists'
      expect(store.active).toBeNull()
      expect(store.activeEffects).toEqual({})
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

    it('zieht Vorsehungen aus lauter verschiedenen Domänen — über viele Ziehungen', () => {
      const store = useProvidenceStore()
      for (let i = 0; i < 200; i++) {
        store.rollOffer(1)
        const domains = store.offerCards.map((c) => c.providence.domain)
        expect(new Set(domains).size).toBe(domains.length)
        const provIds = store.offer.map((o) => o.providenceId)
        expect(new Set(provIds).size).toBe(provIds.length)
      }
    })

    it('lässt eine laufende Vorsehung unangetastet', () => {
      const store = useProvidenceStore()
      store.activeId = 'long-vigil'
      store.rollOffer(1)
      expect(store.activeId).toBe('long-vigil')
    })
  })

  describe('choose', () => {
    it('nimmt ein Paar des Angebots an und leert es', () => {
      const store = useProvidenceStore()
      store.rollOffer(1)
      const picked = store.offer[0]

      expect(store.choose(picked.universeId, picked.providenceId)).toBe(true)
      expect(store.activeId).toBe(picked.providenceId)
      expect(store.offer).toEqual([])
      expect(store.hasOffer).toBe(false)
    })

    it('lehnt eine Vorsehung ab, die nicht im Angebot steht', () => {
      const store = useProvidenceStore()
      store.rollOffer(1)
      const offered = new Set(store.offer.map((o) => o.providenceId))
      const notOffered = PROVIDENCES.find((p) => !offered.has(p.id))!

      expect(store.choose(store.offer[0].universeId, notOffered.id)).toBe(false)
      expect(store.activeId).toBeNull()
      expect(store.offer).toHaveLength(PROVIDENCE_OFFER_SIZE)
    })

    it('lehnt eine Vorsehung ab, die zu einem ANDEREN Universum des Angebots gehört', () => {
      // Geprüft wird das Paar, nicht die Vorsehung allein — sonst liesse sich
      // die beste Vorsehung mit dem liebsten Universum kombinieren.
      const store = useProvidenceStore()
      store.rollOffer(1)
      const [a, b] = store.offer

      expect(store.choose(a.universeId, b.providenceId)).toBe(false)
      expect(store.activeId).toBeNull()
    })

    it('reicht die Effekte der gewählten Vorsehung an ihre Getter durch', () => {
      const store = useProvidenceStore()
      // Long Vigil: längere Sterne, dafür seltenere Materialfunde.
      store.offer = [{ universeId: OTHER_UNIVERSE, providenceId: 'long-vigil' }]
      store.choose(OTHER_UNIVERSE, 'long-vigil')

      const def = getProvidence('long-vigil')!
      expect(store.starLifetimeMult).toBe(def.effects.starLifetimeMult)
      expect(store.materialDropMult).toBe(def.effects.materialDropMult)
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

      store.offer = [{ universeId: OTHER_UNIVERSE, providenceId: 'gilded-tide' }]
      store.choose(OTHER_UNIVERSE, 'gilded-tide')

      const def = getProvidence('gilded-tide')!
      expect(game.activeModifier.cpsMultiplier).toBe(def.effects.cpsMultiplier)
      expect(game.activeModifier.buildingCostMultiplier).toBe(def.effects.buildingCostMultiplier)
    })
  })

  describe('clearOffer / clearAll', () => {
    it('verwirft clearOffer nur das Angebot, nicht die laufende Vorsehung', () => {
      const store = useProvidenceStore()
      store.activeId = 'long-vigil'
      store.rollOffer(1)

      store.clearOffer()
      expect(store.offer).toEqual([])
      expect(store.activeId).toBe('long-vigil')
    })

    it('räumt clearAll beides ab', () => {
      const store = useProvidenceStore()
      store.activeId = 'long-vigil'
      store.rollOffer(1)

      store.clearAll()
      expect(store.offer).toEqual([])
      expect(store.activeId).toBeNull()
    })
  })

  describe('Katalog', () => {
    it('vergibt jede ID und jedes Glyph genau einmal', () => {
      const ids = PROVIDENCES.map((p) => p.id)
      const icons = PROVIDENCES.map((p) => p.icon)
      expect(new Set(ids).size).toBe(ids.length)
      expect(new Set(icons).size).toBe(icons.length)
    })

    it('teilt kein Glyph mit einem Universum — beide stehen auf derselben Karte', () => {
      const universeIcons = new Set(universes.map((u) => u.icon))
      for (const def of PROVIDENCES) {
        expect(universeIcons.has(def.icon), `${def.id} doppelt ein Universums-Wappen`).toBe(false)
      }
    })

    it('hält genug Universen und Domänen für ein vollzähliges Angebot vor', () => {
      // Ein Universum fällt als das laufende immer weg.
      expect(universes.length).toBeGreaterThan(PROVIDENCE_OFFER_SIZE)
      const domains = new Set(PROVIDENCES.map((p) => p.domain))
      expect(domains.size).toBeGreaterThanOrEqual(PROVIDENCE_OFFER_SIZE)
      for (const domain of domains) {
        expect(PROVIDENCE_DOMAIN_LABELS[domain]).toBeTruthy()
      }
    })

    it('gibt jeder Vorsehung genau ein Plus und genau ein Minus', () => {
      // Die Regel, die aus dem Angebot eine Frage macht: eine Karte ohne Preis
      // wäre ein Geschenk, und drei Geschenke nebeneinander sind ein Ranking.
      for (const def of PROVIDENCES) {
        const lines = providenceEffectLines(def)
        expect(lines.filter((l) => l.positive), `${def.id} ohne Plus`).toHaveLength(1)
        expect(lines.filter((l) => !l.positive), `${def.id} ohne Minus`).toHaveLength(1)
      }
    })

    it('nennt keine Effektachse ohne Metadaten, und keine store-Achse ohne Getter', () => {
      for (const def of PROVIDENCES) {
        for (const key of Object.keys(def.effects) as (keyof ProvidenceEffects)[]) {
          const meta = PROVIDENCE_EFFECT_META[key]
          expect(meta, `${def.id} nennt ${key} ohne Metadaten`).toBeDefined()
          if (meta!.via === 'store') {
            expect(EFFECT_GETTERS, `${key} hat keinen Getter im Store`).toContain(key)
          }
        }
      }
    })

    it('verwendet keine Achse auf ihrem Neutralwert — die täte nichts', () => {
      for (const def of PROVIDENCES) {
        for (const [key, value] of Object.entries(def.effects)) {
          const meta = PROVIDENCE_EFFECT_META[key as keyof ProvidenceEffects]!
          expect(value, `${def.id}: ${key} steht auf neutral`).not.toBe(meta.neutral)
        }
      }
    })
  })
})
