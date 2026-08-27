import { setActivePinia, createPinia } from 'pinia'
import { describe, it, expect, beforeEach } from 'vitest'
import { forgeNodeTipView, FORGE_EMPTY_UPGRADE_ENTRY } from '@/composables/ui/useForgeUpgrades'
import { useForgeOffers, forgeFusionTipView } from '@/composables/ui/useForgeOffers'
import { useStarForgeStore } from '@/stores/progression/starForgeStore'
import { meetForgeRequirements } from '@/__tests__/forgeTestUtils'
import { FORGE_CONSTELLATIONS } from '@/config/progression/starForge'
import { FORGE_TIP_MAX_LABEL, FORGE_VAULT_FUSED_BADGE } from '@/config/constants'
import type { ForgeUpgradeEntry } from '@/types'

/**
 * Die Bühne des Skill-Tree-Reiters trägt ZWEI Körperarten, und beide werden
 * überfahren: Baumknoten und Konstellation. Sie haben keine gemeinsame
 * Katalogform — eine Fusion hat weder `parentId` noch `tier`, `phase` oder
 * Ränge —, und genau deshalb trug der Fusionskörper einmal ein natives `title`
 * mit blossem Namen, während der Knoten daneben die volle Karte zeigte.
 *
 * `ForgeTipView` ist die Naht, die das behebt: EINE Karte, zwei Bauer. Diese
 * Spec bindet, dass beide dieselben Regeln anwenden — sonst laufen sie wieder
 * auseinander, und der Bruch sähe im Test grün aus.
 */
beforeEach(() => {
  setActivePinia(createPinia())
})

function entry(over: Partial<ForgeUpgradeEntry>): ForgeUpgradeEntry {
  return { ...FORGE_EMPTY_UPGRADE_ENTRY, ...over }
}

const REQ = { id: 'solarSails', name: 'Solar Sails', have: 1, need: 3, met: false, progress: 1 / 3 }

describe('forgeNodeTipView — der Baumknoten als Karte', () => {
  it('traegt den MAX-Chip nur im ausgewachsenen Zustand', () => {
    expect(forgeNodeTipView(entry({ state: 'maxed' })).chip).toBe(FORGE_TIP_MAX_LABEL)
    expect(forgeNodeTipView(entry({ state: 'affordable' })).chip).toBe('')
  })

  it('zeigt den Wirkungssatz der NAECHSTEN Stufe, solange nichts gekauft ist', () => {
    const tip = forgeNodeTipView(entry({ level: 0, desc: 'now', nextDesc: 'next' }))
    expect(tip.effect).toBe('next')
    expect(forgeNodeTipView(entry({ level: 1, desc: 'now', nextDesc: 'next' })).effect).toBe('now')
  })

  it('zeigt die Bedingungsliste nur, wenn ein Vorgaenger die Antwort ist', () => {
    expect(forgeNodeTipView(entry({ lockKind: 'parent', reqs: [REQ] })).reqs).toHaveLength(1)
    // Phase, Prestige-Tor, Gleichwuchs-Deckel: dagegen hilft kein Vorgaenger,
    // dort traegt der Sperrsatz.
    const gated = forgeNodeTipView(entry({ lockKind: 'phase', reqs: [REQ], lockReason: 'Zenith' }))
    expect(gated.reqs).toEqual([])
    expect(gated.lockReason).toBe('Zenith')
  })
})

describe('forgeFusionTipView — die Konstellation als dieselbe Karte', () => {
  const DEF = FORGE_CONSTELLATIONS[0]

  it('traegt den FUSED-Chip genau dann, wenn sie geschmiedet ist', () => {
    const { offerForConstellation } = useForgeOffers()
    const offer = offerForConstellation(DEF.id)!
    expect(forgeFusionTipView(offer, true).chip).toBe(FORGE_VAULT_FUSED_BADGE)
    expect(forgeFusionTipView(offer, false).chip).toBe('')
  })

  it('zeigt die Tore, solange eines zu ist — und schweigt, sobald alle offen sind', () => {
    const { offerForConstellation } = useForgeOffers()
    const offer = offerForConstellation(DEF.id)!
    expect(forgeFusionTipView(offer, false).reqs.length).toBeGreaterThan(0)
    // Geschmiedet trägt der Chip die Auskunft — dieselbe Regel wie am
    // ausgewachsenen Knoten, und sie gilt unabhängig von den Toren.
    expect(forgeFusionTipView(offer, true).reqs).toEqual([])

    meetForgeRequirements(DEF.requires)
    // Dieselbe Regel wie am kaufbaren Knoten: die Liste steht nur, solange sie
    // die Antwort ist.
    expect(forgeFusionTipView(offerForConstellation(DEF.id)!, false).reqs).toEqual([])
  })

  it('liefert fuer JEDE Konstellation Motiv, Name und einen Wirkungssatz', () => {
    const { offerForConstellation } = useForgeOffers()
    for (const def of FORGE_CONSTELLATIONS) {
      const tip = forgeFusionTipView(offerForConstellation(def.id)!, false)
      expect(tip.icon, def.id).not.toBe('')
      expect(tip.name, def.id).not.toBe('')
      // Bricht, sobald jemand einen Eintrag ohne `desc` ergaenzt — die Karte
      // stuende dann mit einer leeren Wirkungszeile im Netz.
      expect(tip.effect, def.id).not.toBe('')
    }
  })

  it('findet auch das Fusionierte — der Koerper bleibt im Netz stehen', () => {
    const { offerForConstellation } = useForgeOffers()
    useStarForgeStore().forgedConstellations.push(DEF.id)
    expect(offerForConstellation(DEF.id)).not.toBeNull()
  })

  it('meldet null fuer eine Id, die kein Katalogeintrag ist', () => {
    expect(useForgeOffers().offerForConstellation('nichts')).toBeNull()
  })
})
