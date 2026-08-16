import { setActivePinia, createPinia } from 'pinia'
import { describe, it, expect, beforeEach } from 'vitest'
import { useStarForgeStore } from '@/stores/progression/starForgeStore'
import { useSolarUpgradeStore } from '@/stores/progression/solarUpgradeStore'
import { useGameStore } from '@/stores/core/gameStore'
import { useVoidStore } from '@/stores/world/voidStore'
import { usePlayerStore } from '@/stores/battle/playerStore'
import { usePlanetBossStore } from '@/stores/world/planetBossStore'
import { useInventoryStore } from '@/stores/economy/inventoryStore'
import { useExpeditionStore } from '@/stores/economy/expeditionStore'
import {
  FORGE_CROWN_MAX_LEVEL,
  FORGE_CROWN_UNLOCK_PRESTIGES,
  FORGE_CROWN_PARENT_MIN_LEVEL,
  FORGE_CROWN_VOID_RELIEF,
  FORGE_CROWN_REPRIEVE_FRACTION,
  FORGE_CROWN_BOSS_FLIP_HP_FRACTION,
  FORGE_CROWN_OVERFLOW_MIN_CHIMES,
  FORGE_CROWN_OVERFLOW_MAX_PER_SEC,
  FORGE_CROWN_OVERFLOW_MATERIAL,
  FORGE_VOID_RELIEF_CAP,
  BOSS_CPS_PENALTY_FRACTION,
  STAR_PHASE_FINAL_INDEX,
} from '@/config/constants'
import { FORGE_CROWNS } from '@/config/progression/starForge'

/**
 * Ring 5 — die Astral Crowns.
 *
 * Der Ring ist die Gegenfigur zu den Boughs: EINE Stufe je Knoten, dafür
 * verschiebt jeder eine Regel statt einer Zahl. Geprüft wird deshalb nicht der
 * Katalog, sondern dass die Regel beim Verbraucher wirklich kippt — und dass
 * sie es OHNE die Krone nicht tut.
 *
 * Das Tor hängt als einziges im Baum nicht an der Sonne, sondern am Aufbruch.
 * Die Sonnenrampe endet mit Ring 4; ein Ring darüber ohne eigene Bedingung
 * wäre am Tag der Endphase einfach mit da.
 */
describe('Astral Crowns (Ring 5)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    useSolarUpgradeStore().starPhase = STAR_PHASE_FINAL_INDEX
  })

  /** Erfüllt alle Bedingungen einer Krone AUSSER dem Aufbruch. */
  function readyExceptPrestige(crownId: string): void {
    const forge = useStarForgeStore()
    const def = FORGE_CROWNS.find((c) => c.id === crownId)!
    forge.boughLevels[def.parentId] = FORGE_CROWN_PARENT_MIN_LEVEL
  }

  /** Setzt eine Krone, ohne den Kaufweg zu gehen. */
  function forgeCrown(crownId: string): void {
    useStarForgeStore().crownLevels[crownId] = FORGE_CROWN_MAX_LEVEL
  }

  // ── Das Tor ────────────────────────────────────────────────────────────────

  it('bleibt zu, solange kein Universum zurückgelassen wurde', () => {
    const forge = useStarForgeStore()
    for (const def of FORGE_CROWNS) {
      readyExceptPrestige(def.id)
      expect(forge.nodeUnlocked(def.id), def.id).toBe(false)
    }
    expect(forge.crownsUnlocked).toBe(false)
  })

  it('geht mit dem ersten Aufbruch auf — wenn der Bough darunter gewachsen ist', () => {
    const forge = useStarForgeStore()
    useGameStore().totalPrestiges = FORGE_CROWN_UNLOCK_PRESTIGES
    expect(forge.crownsUnlocked).toBe(true)

    const def = FORGE_CROWNS[0]
    // Der Aufbruch allein genügt nicht: Ring 4 muss darunter stehen.
    expect(forge.nodeUnlocked(def.id)).toBe(false)
    forge.boughLevels[def.parentId] = FORGE_CROWN_PARENT_MIN_LEVEL - 1
    expect(forge.nodeUnlocked(def.id)).toBe(false)
    forge.boughLevels[def.parentId] = FORGE_CROWN_PARENT_MIN_LEVEL
    expect(forge.nodeUnlocked(def.id)).toBe(true)
  })

  it('kennt genau eine Stufe — anders als der endlose Ring darunter', () => {
    const forge = useStarForgeStore()
    for (const def of FORGE_CROWNS) {
      expect(forge.nodeMaxLevel(def.id), def.id).toBe(FORGE_CROWN_MAX_LEVEL)
      expect(Number.isFinite(forge.nodeMaxLevel(def.id))).toBe(true)
    }
  })

  it('legt jede Krone an einen eigenen Bough, auf einem eigenen Winkel', () => {
    const parents = FORGE_CROWNS.map((c) => c.parentId)
    const angles = FORGE_CROWNS.map((c) => c.angleDeg)
    expect(new Set(parents).size).toBe(FORGE_CROWNS.length)
    expect(new Set(angles).size).toBe(FORGE_CROWNS.length)
  })

  // ── Tideless Watch → Void ──────────────────────────────────────────────────

  it('halbiert den Void-Zoll und verdoppelt den Lohn eines erlegten Wesens', () => {
    const forge = useStarForgeStore()
    const voidStore = useVoidStore()
    voidStore.aftermaths = [
      {
        sourceId: 't',
        expiresAt: voidStore.voidNow + 60_000,
        durationMs: 60_000,
        effects: { cpsMult: 0.5 },
      },
    ]

    expect(voidStore.cpsMult).toBeCloseTo(0.5, 10)
    expect(forge.voidSlayRewardMult).toBe(1)

    forgeCrown('tidelessWatch')
    expect(forge.voidTollRelief).toBeCloseTo(FORGE_CROWN_VOID_RELIEF, 10)
    expect(voidStore.cpsMult).toBeCloseTo(1 - 0.5 * (1 - FORGE_CROWN_VOID_RELIEF), 10)
    expect(forge.voidSlayRewardMult).toBeGreaterThan(1)
  })

  /**
   * Krone und Siegel MULTIPLIZIEREN sich auf dem verbleibenden Rest. Addiert
   * kämen 50 % und 60 % auf 110 % — der Void wäre abgeschafft, und er ist das
   * einzige System im Spiel, das gegen den Spieler drängt.
   */
  it('bleibt zusammen mit dem Siegel unter dem gemeinsamen Boden', () => {
    const forge = useStarForgeStore()
    forgeCrown('tidelessWatch')
    forge.relicLevels.riftwardensSeal = 99
    expect(forge.voidTollRelief).toBeCloseTo(FORGE_VOID_RELIEF_CAP, 10)
    expect(forge.voidTollRelief).toBeLessThan(1)
  })

  // ── Sunderer's Mark → Boss-Zoll ────────────────────────────────────────────

  it('kippt den Boss-Zoll, sobald der Boss unter die Schwelle fällt', () => {
    const forge = useStarForgeStore()
    const boss = usePlanetBossStore()
    boss.cpsPenaltyActive = true
    boss.activeBosses = [
      { planetId: 'p1', currentHP: 900, maxHP: 1000, defeated: false, expired: false },
    ] as unknown as typeof boss.activeBosses

    expect(boss.cpsPenaltyMultiplier).toBeCloseTo(1 - BOSS_CPS_PENALTY_FRACTION, 10)

    forgeCrown('sunderersMark')
    expect(forge.bossTollFlipsBelowPct).toBeCloseTo(FORGE_CROWN_BOSS_FLIP_HP_FRACTION, 10)
    // Über der Schwelle bleibt der Zoll ein Zoll.
    expect(boss.cpsPenaltyMultiplier).toBeCloseTo(1 - BOSS_CPS_PENALTY_FRACTION, 10)

    boss.activeBosses[0].currentHP = 100
    expect(boss.cpsPenaltyMultiplier).toBeCloseTo(1 + BOSS_CPS_PENALTY_FRACTION, 10)
  })

  /**
   * Gemessen wird an ALLEN lebenden Bossen, nicht am ausgewählten: `activeBoss`
   * folgt der Anzeige (`selectedBossId`), und ein Zoll, der davon abhinge,
   * welche Karte gerade offen ist, wäre nicht zu erklären.
   */
  it('kippt nicht, solange auch nur ein Boss über der Schwelle steht', () => {
    const boss = usePlanetBossStore()
    forgeCrown('sunderersMark')
    boss.cpsPenaltyActive = true
    boss.activeBosses = [
      { planetId: 'p1', currentHP: 100, maxHP: 1000, defeated: false, expired: false },
      { planetId: 'p2', currentHP: 900, maxHP: 1000, defeated: false, expired: false },
    ] as unknown as typeof boss.activeBosses

    expect(boss.cpsPenaltyMultiplier).toBeCloseTo(1 - BOSS_CPS_PENALTY_FRACTION, 10)
  })

  // ── Warden's Reprieve → die gefallene Sonne ────────────────────────────────

  it('holt die gefallene Sonne zurück — genau einmal je Sonnenphase', () => {
    const player = usePlayerStore()
    const solar = useSolarUpgradeStore()
    forgeCrown('wardensReprieve')

    player.currentHP = 5
    player.takeDamage(9999)
    const revived = Math.round(player.maxHP * FORGE_CROWN_REPRIEVE_FRACTION)
    expect(player.currentHP).toBe(revived)
    // Der Fall hat stattgefunden — der Aufschub ist eine Antwort darauf, keine
    // Verhinderung, und alles, was am Fall hängt, ist bereits gelaufen.
    expect(player.timesDowned).toBe(1)

    // Zweiter Fall in derselben Phase: kein Aufschub mehr.
    player.takeDamage(9999)
    expect(player.currentHP).toBe(0)
    expect(player.timesDowned).toBe(2)

    // Neue Phase, neuer Aufschub — aber erst beim nächsten FALL. Die Bedingung
    // im Store ist `wasUp`, nicht „liegt gerade": eine Sonne, die schon auf 0
    // steht, fällt nicht noch einmal, und die Regeneration zieht sie ohnehin
    // wieder hoch.
    solar.starPhase = STAR_PHASE_FINAL_INDEX - 1
    player.takeDamage(9999)
    expect(player.currentHP, 'kein Fall, kein Aufschub').toBe(0)

    player.currentHP = 5
    player.takeDamage(9999)
    expect(player.currentHP).toBe(revived)
  })

  it('lässt die Sonne ohne die Krone liegen', () => {
    const player = usePlayerStore()
    player.currentHP = 5
    player.takeDamage(9999)
    expect(player.currentHP).toBe(0)
  })

  // ── Midas Overflow → Chime-Berg zu Stardust ────────────────────────────────

  it('setzt erst über der Schwelle etwas ab und bleibt unter dem Deckel', () => {
    const forge = useStarForgeStore()
    const game = useGameStore()
    forgeCrown('midasOverflow')

    game.chimes = FORGE_CROWN_OVERFLOW_MIN_CHIMES - 1
    expect(forge.chimeOverflowPerSec).toBe(0)

    game.chimes = FORGE_CROWN_OVERFLOW_MIN_CHIMES * 1000
    expect(forge.chimeOverflowPerSec).toBe(FORGE_CROWN_OVERFLOW_MAX_PER_SEC)

    // Ganze Stücke, nie Bruchteile: `addMaterial` bucht die Menge roh in den
    // Bestand, und ein Material mit Nachkommastellen wäre nicht zu erklären.
    game.chimes = FORGE_CROWN_OVERFLOW_MIN_CHIMES * 1.4
    expect(Number.isInteger(forge.chimeOverflowPerSec)).toBe(true)
  })

  it('setzt ohne die Krone nichts ab, auch auf einem Chime-Berg', () => {
    const game = useGameStore()
    game.chimes = FORGE_CROWN_OVERFLOW_MIN_CHIMES * 1000
    expect(useStarForgeStore().chimeOverflowPerSec).toBe(0)
  })

  it('bucht den Überlauf im Tick auf den Bestand', () => {
    const game = useGameStore()
    const inventory = useInventoryStore()
    forgeCrown('midasOverflow')
    game.chimes = FORGE_CROWN_OVERFLOW_MIN_CHIMES * 1000

    const before = inventory.collectedMaterials[FORGE_CROWN_OVERFLOW_MATERIAL] ?? 0
    game.tick()
    expect(inventory.collectedMaterials[FORGE_CROWN_OVERFLOW_MATERIAL]).toBeGreaterThan(before)
  })

  // ── Wanderer's Gate → die nächste Passage ──────────────────────────────────

  /** Eine Expedition, die in dieser Sekunde fällig wird. */
  function resolvableExpedition() {
    return {
      id: 'exp-test',
      configId: 'slot',
      name: 'Test Run',
      description: '',
      icon: 'game-icons:caravel',
      requiredRoles: [],
      assignedChampions: [],
      durationSeconds: 0,
      startTime: 0,
      baseReward: 100,
      successChance: 1,
      status: 'active',
      reward: 0,
      colorKey: 'gold',
      tier: 'common',
      hazards: [],
    }
  }

  it('lässt eine zurückkehrende Expedition die Spawn-Uhr zurücksetzen', () => {
    const expeditions = useExpeditionStore()
    forgeCrown('wanderersGate')

    expeditions.activeExpeditions = [
      resolvableExpedition(),
    ] as unknown as typeof expeditions.activeExpeditions
    expeditions.nextSpawnAt = Number.MAX_SAFE_INTEGER
    expeditions.checkExpeditions()

    expect(expeditions.activeExpeditions[0].status).not.toBe('active')
    expect(expeditions.nextSpawnAt).toBe(0)
  })

  it('lässt die Spawn-Uhr ohne die Krone stehen', () => {
    const expeditions = useExpeditionStore()
    expect(useStarForgeStore().expeditionInstantRespawn).toBe(false)

    expeditions.activeExpeditions = [
      resolvableExpedition(),
    ] as unknown as typeof expeditions.activeExpeditions
    expeditions.nextSpawnAt = Number.MAX_SAFE_INTEGER
    expeditions.checkExpeditions()

    expect(expeditions.activeExpeditions[0].status).not.toBe('active')
    expect(expeditions.nextSpawnAt).toBe(Number.MAX_SAFE_INTEGER)
  })
})
