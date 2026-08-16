import { setActivePinia, createPinia } from 'pinia'
import { describe, it, expect, beforeEach } from 'vitest'
import { useStarForgeStore } from '@/stores/progression/starForgeStore'
import { useSolarUpgradeStore } from '@/stores/progression/solarUpgradeStore'
import {
  FORGE_LEAF_MAX_LEVEL,
  FORGE_BRANCH_MAX_LEVEL_CAP,
  FORGE_MAX_DOUBLE_CLICK_CHANCE,
  FORGE_MIN_DWELL_MULT,
  FORGE_MIN_EXPEDITION_MULT,
  FORGE_MIN_DAMAGE_TAKEN_MULT,
  FORGE_OVERFLOW_EXPEDITION_REWARD_RATE,
  FORGE_OVERFLOW_STAR_LIFETIME_RATE,
  FORGE_OVERFLOW_HP_REGEN_PER_PCT,
  STAR_PHASE_FINAL_INDEX,
} from '@/config/constants'
import { getForgeNode, FORGE_RELICS } from '@/config/progression/starForge'

/**
 * Der ÜBERLAUF: was eine harte Kappe abschneidet, fliesst woandershin.
 *
 * Die vier Kappen (`FORGE_MIN_*`, `FORGE_MAX_DOUBLE_CLICK_CHANCE`) sind
 * richtig — ohne sie brechen Expeditionsdauer, Sonnenrampe und Klickwert.
 * Falsch war, was dahinter geschah: nichts. Wer eine gekappte Achse weiter
 * hochzog, zahlte für ein bezahltes Nichts.
 *
 * Diese Spec haelt drei Dinge fest, die man im Bild nicht sieht:
 *
 *   1. Die Kappen-Getter aendern ihr Verhalten NICHT. Der Ueberlauf steht
 *      daneben, nicht darin — sonst waeren die Herleitungen an den
 *      `FORGE_MIN_*` hinfaellig.
 *   2. Der Ueberlauf ist EXAKT die Differenz, kein neuer freier Wert.
 *   3. Er kommt in seiner Zielachse auch wirklich an.
 *
 * Aegis bekommt einen eigenen Fall: seine Kappe wird bei Vollausbau gar nicht
 * erreicht, sein Ueberlauf steht also auf 0. Das ist eine BEHAUPTUNG im
 * Kommentar an `FORGE_OVERFLOW_*` — hier wird sie geprueft, damit sie nicht
 * still veraltet, wenn jemand `effectPerLevel` des Zweiges anhebt.
 */
describe('Forge-Ueberlauf', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    // Endphase: `nodeMaxLevel` staffelt „+1 je Phase ueber der Freischaltphase",
    // ein Zweig erreicht `FORGE_BRANCH_MAX_LEVEL_CAP` also erst hier.
    useSolarUpgradeStore().starPhase = STAR_PHASE_FINAL_INDEX
  })

  /** Zweig und sein Blatt auf Endstufe — der Zustand, in dem die Kappen greifen. */
  function maxBranch(branchId: string): number {
    const forge = useStarForgeStore()
    const leaf = forge.leafOfBranch(branchId)
    forge.branchLevels[branchId] = FORGE_BRANCH_MAX_LEVEL_CAP
    if (leaf) forge.leafLevels[leaf.id] = FORGE_LEAF_MAX_LEVEL
    return forge.branchEffect(branchId)
  }

  // ─── Golden Echo → Dreifachklick ────────────────────────────────────────────

  it('laesst den Doppelklick auf seiner Kappe und macht aus dem Rest Dreifachklick', () => {
    const forge = useStarForgeStore()
    const raw = maxBranch('goldenEcho') / 100

    expect(raw, 'der Zweig muss ueber die Kappe laufen').toBeGreaterThan(
      FORGE_MAX_DOUBLE_CLICK_CHANCE,
    )
    expect(forge.doubleClickChance).toBeCloseTo(FORGE_MAX_DOUBLE_CLICK_CHANCE, 10)
    expect(forge.tripleClickChance).toBeCloseTo(raw - FORGE_MAX_DOUBLE_CLICK_CHANCE, 10)
    // Nichts geht mehr verloren: beide Bereiche zusammen sind der Rohwert.
    expect(forge.doubleClickChance + forge.tripleClickChance).toBeCloseTo(raw, 10)
  })

  it('gibt unterhalb der Kappe gar keinen Dreifachklick', () => {
    const forge = useStarForgeStore()
    forge.branchLevels.goldenEcho = 1
    expect(forge.doubleClickChance).toBeLessThan(FORGE_MAX_DOUBLE_CLICK_CHANCE)
    expect(forge.tripleClickChance).toBe(0)
  })

  // ─── Solar Sails → Expeditionsbeute ─────────────────────────────────────────

  it('leitet das geschluckte Expeditionstempo in die Beute', () => {
    const forge = useStarForgeStore()
    const rewardBefore = forge.expeditionRewardMult

    const raw = maxBranch('solarSails')
    // Das Relikt zahlt auf dieselbe Achse — mit ihm ist der Ueberlauf am groessten.
    const compass = FORGE_RELICS.find((r) => r.id === 'stellarCompass')!
    forge.relicLevels.stellarCompass = compass.maxLevel
    const total = raw + forge.relicEffect('stellarCompass')

    expect(forge.expeditionSpeedMult).toBeCloseTo(FORGE_MIN_EXPEDITION_MULT, 10)
    const swallowed = total - (1 - FORGE_MIN_EXPEDITION_MULT) * 100
    expect(swallowed, 'die Kappe muss wirklich etwas schlucken').toBeGreaterThan(0)
    expect(forge.expeditionSpeedOverflowPct).toBeCloseTo(swallowed, 10)
    expect(forge.expeditionRewardMult - rewardBefore).toBeCloseTo(
      (swallowed * FORGE_OVERFLOW_EXPEDITION_REWARD_RATE) / 100,
      10,
    )
  })

  // ─── Quickening → Sternlebensdauer ──────────────────────────────────────────

  it('leitet die geschluckte Verweildauer in die Sternlebensdauer', () => {
    const forge = useStarForgeStore()
    const lifetimeBefore = forge.starLifetimeMult

    const raw = maxBranch('quickening')
    expect(forge.dwellMult).toBeCloseTo(FORGE_MIN_DWELL_MULT, 10)

    const swallowed = raw - (1 - FORGE_MIN_DWELL_MULT) * 100
    expect(swallowed).toBeGreaterThan(0)
    expect(forge.dwellOverflowPct).toBeCloseTo(swallowed, 10)
    expect(forge.starLifetimeMult - lifetimeBefore).toBeCloseTo(
      (swallowed * FORGE_OVERFLOW_STAR_LIFETIME_RATE) / 100,
      10,
    )
  })

  // ─── Aegis → Regeneration (heute leer) ──────────────────────────────────────

  /**
   * Der Zweig erreicht seine Kappe bei Vollausbau NICHT — der Ueberlauf steht
   * damit auf 0. Er ist trotzdem gebaut, aus demselben Grund, aus dem die
   * Boughs vor Phase 5 leer sind: nicht tot, nur noch leer. Bricht dieser Test,
   * hat jemand die Achse verstaerkt, und der Kommentar an `FORGE_OVERFLOW_*`
   * stimmt nicht mehr.
   */
  it('schluckt bei Aegis heute nichts — die Kappe wird nicht erreicht', () => {
    const forge = useStarForgeStore()
    maxBranch('aegis')
    expect(forge.damageTakenMult).toBeGreaterThan(FORGE_MIN_DAMAGE_TAKEN_MULT)
    expect(forge.damageTakenOverflowPct).toBe(0)
  })

  it('leitet einen Aegis-Ueberlauf in die Regeneration, sobald es einen gibt', () => {
    const forge = useStarForgeStore()
    const regenBefore = forge.hpRegenPerSec
    // Ueber jede erreichbare Stufe hinaus gesetzt: geprueft wird die Leitung,
    // nicht der heutige Katalogwert.
    const def = getForgeNode('aegis')!
    forge.branchLevels.aegis = 40
    const raw = def.effectPerLevel * 40
    const swallowed = raw - (1 - FORGE_MIN_DAMAGE_TAKEN_MULT) * 100

    expect(forge.damageTakenMult).toBeCloseTo(FORGE_MIN_DAMAGE_TAKEN_MULT, 10)
    expect(forge.damageTakenOverflowPct).toBeCloseTo(swallowed, 10)
    expect(forge.hpRegenPerSec - regenBefore).toBeCloseTo(
      swallowed * FORGE_OVERFLOW_HP_REGEN_PER_PCT,
      10,
    )
  })

  // ─── Kein Ueberlauf ohne Ausbau ─────────────────────────────────────────────

  it('steht im frischen Spielstand ueberall auf null', () => {
    const forge = useStarForgeStore()
    expect(forge.expeditionSpeedOverflowPct).toBe(0)
    expect(forge.dwellOverflowPct).toBe(0)
    expect(forge.damageTakenOverflowPct).toBe(0)
    expect(forge.tripleClickChance).toBe(0)
  })

  /**
   * Der Ueberlauf darf die Zielachse nicht heimlich anheben, solange die Kappe
   * gar nicht greift — sonst waere er kein Ueberlauf, sondern ein Bonus.
   */
  it('laesst die Zielachsen unberuehrt, solange keine Kappe greift', () => {
    const forge = useStarForgeStore()
    const reward = forge.expeditionRewardMult
    const lifetime = forge.starLifetimeMult
    const regen = forge.hpRegenPerSec

    forge.branchLevels.solarSails = 1
    forge.branchLevels.quickening = 1
    forge.branchLevels.aegis = 1

    expect(forge.expeditionRewardMult).toBe(reward)
    expect(forge.starLifetimeMult).toBe(lifetime)
    expect(forge.hpRegenPerSec).toBe(regen)
  })
})
