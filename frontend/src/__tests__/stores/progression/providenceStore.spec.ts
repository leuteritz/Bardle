import { setActivePinia, createPinia } from 'pinia'
import { describe, it, expect, beforeEach } from 'vitest'
import { useProvidenceStore } from '@/stores/progression/providenceStore'
import {
  PROVIDENCES,
  PROVIDENCE_DOMAIN_LABELS,
  PROVIDENCE_EFFECT_META,
  getProvidence,
  providenceEffectLines,
} from '@/config/progression/providences'
import { PROVIDENCE_OFFER_SIZE, PROVIDENCE_NEUTRAL_MULTIPLIER } from '@/config/constants'
import type { ProvidenceEffects } from '@/types'

/** Jeder Effektgetter des Stores mit dem Schlüssel, den er liest. Steht hier
 *  einmal, damit ein neuer Getter, der zu ergänzen vergessen wurde, in den
 *  Neutralwert- und Durchreich-Tests sofort auffällt. */
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
    it('legt genau PROVIDENCE_OFFER_SIZE verschiedene Karten aus', () => {
      const store = useProvidenceStore()
      store.rollOffer()
      expect(store.offer).toHaveLength(PROVIDENCE_OFFER_SIZE)
      expect(new Set(store.offer).size).toBe(PROVIDENCE_OFFER_SIZE)
      expect(store.hasOffer).toBe(true)
    })

    it('zieht aus lauter verschiedenen Domänen — über viele Ziehungen', () => {
      const store = useProvidenceStore()
      for (let i = 0; i < 200; i++) {
        store.rollOffer()
        const domains = store.offerCards.map((c) => c.domain)
        expect(new Set(domains).size).toBe(domains.length)
      }
    })

    it('lässt eine laufende Vorsehung unangetastet', () => {
      const store = useProvidenceStore()
      store.activeId = 'long-vigil'
      store.rollOffer()
      expect(store.activeId).toBe('long-vigil')
    })
  })

  describe('choose', () => {
    it('nimmt eine Karte des Angebots an und leert es', () => {
      const store = useProvidenceStore()
      store.rollOffer()
      const picked = store.offer[0]

      expect(store.choose(picked)).toBe(true)
      expect(store.activeId).toBe(picked)
      expect(store.offer).toEqual([])
      expect(store.hasOffer).toBe(false)
    })

    it('lehnt eine Karte ab, die nicht im Angebot steht', () => {
      const store = useProvidenceStore()
      store.rollOffer()
      const notOffered = PROVIDENCES.find((p) => !store.offer.includes(p.id))!

      expect(store.choose(notOffered.id)).toBe(false)
      expect(store.activeId).toBeNull()
      expect(store.offer).toHaveLength(PROVIDENCE_OFFER_SIZE)
    })

    it('reicht die Effekte der gewählten Vorsehung an ihre Getter durch', () => {
      const store = useProvidenceStore()
      // Long Vigil: längere Sterne, dafür seltenere Materialfunde.
      store.offer = ['long-vigil']
      store.choose('long-vigil')

      const def = getProvidence('long-vigil')!
      expect(store.starLifetimeMult).toBe(def.effects.starLifetimeMult)
      expect(store.materialDropMult).toBe(def.effects.materialDropMult)
      // Achsen, die diese Vorsehung nicht anfasst, bleiben neutral.
      expect(store.combatDpsMult).toBe(PROVIDENCE_NEUTRAL_MULTIPLIER)
      expect(store.lpGainMult).toBe(PROVIDENCE_NEUTRAL_MULTIPLIER)
    })
  })

  describe('clearOffer / clearAll', () => {
    it('verwirft clearOffer nur das Angebot, nicht die laufende Vorsehung', () => {
      const store = useProvidenceStore()
      store.activeId = 'long-vigil'
      store.rollOffer()

      store.clearOffer()
      expect(store.offer).toEqual([])
      expect(store.activeId).toBe('long-vigil')
    })

    it('räumt clearAll beides ab', () => {
      const store = useProvidenceStore()
      store.activeId = 'long-vigil'
      store.rollOffer()

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

    it('hält genug Domänen für ein vollzähliges Angebot vor', () => {
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
        expect(lines.filter((l) => l.positive)).toHaveLength(1)
        expect(lines.filter((l) => !l.positive)).toHaveLength(1)
      }
    })

    it('nennt keine Effektachse, die im Store keinen Getter hat', () => {
      for (const def of PROVIDENCES) {
        for (const key of Object.keys(def.effects)) {
          expect(EFFECT_GETTERS).toContain(key as keyof ProvidenceEffects)
          expect(PROVIDENCE_EFFECT_META[key as keyof ProvidenceEffects]).toBeDefined()
        }
      }
    })

    it('verwendet keine Achse mit dem Neutralwert — die täte nichts', () => {
      for (const def of PROVIDENCES) {
        for (const value of Object.values(def.effects)) {
          expect(value).not.toBe(PROVIDENCE_NEUTRAL_MULTIPLIER)
        }
      }
    })
  })
})
