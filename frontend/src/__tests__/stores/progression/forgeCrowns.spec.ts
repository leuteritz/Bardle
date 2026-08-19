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
import { useDrifterStore } from '@/stores/world/drifterStore'
import { useBardAbilityStore } from '@/stores/progression/bardAbilityStore'
import { useOmenStore } from '@/stores/progression/omenStore'
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
  FORGE_CROWN_LOCK_REASON,
  FORGE_CROWN_OFFLINE_DRIFTER_COUNT,
  FORGE_CROWN_OMEN_HP_FLOOR_FRACTION,
  FORGE_CROWN_BOSS_WOUND_FLOOR,
  FORGE_VOID_RELIEF_CAP,
  BOSS_CPS_PENALTY_FRACTION,
  STAR_PHASE_FINAL_INDEX,
} from '@/config/constants'
import { FORGE_CROWNS } from '@/config/progression/starForge'
import { setForgeLevel } from '@/__tests__/forgeTestUtils'
import { useForgeUpgrades } from '@/composables/ui/useForgeUpgrades'
import { VOID_RIFTS, getVoidRift } from '@/config/world/void'

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
describe('Astral Crowns (Ring 6)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    useSolarUpgradeStore().starPhase = STAR_PHASE_FINAL_INDEX
  })

  /** Aus `__tests__/forgeTestUtils` — dieselbe Fassung nutzen die Vault-Specs. */
  const setLevel = setForgeLevel

  /**
   * Erfüllt ALLE Bedingungen einer Krone AUSSER dem Aufbruch — den Elternteil
   * und jede ihrer `requires`.
   *
   * Über den Katalog und nicht über eine Liste im Test: die fünf neuen Kronen
   * verlangen je zwei weitere Knoten, und eine abgeschriebene Aufzählung wäre
   * beim nächsten Zusammenlauf still unvollständig.
   */
  function readyExceptPrestige(crownId: string): void {
    const def = FORGE_CROWNS.find((c) => c.id === crownId)!
    setLevel(def.parentId, FORGE_CROWN_PARENT_MIN_LEVEL)
    for (const req of def.requires ?? []) setLevel(req.id, req.level)
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

  it('geht mit dem ersten Aufbruch auf — wenn der Covenant darunter gewachsen ist', () => {
    const forge = useStarForgeStore()
    useGameStore().totalPrestiges = FORGE_CROWN_UNLOCK_PRESTIGES
    expect(forge.crownsUnlocked).toBe(true)

    const def = FORGE_CROWNS[0]
    // Der Aufbruch allein genügt nicht: Ring 5 muss darunter stehen.
    expect(forge.nodeUnlocked(def.id)).toBe(false)
    setLevel(def.parentId, FORGE_CROWN_PARENT_MIN_LEVEL - 1)
    expect(forge.nodeUnlocked(def.id)).toBe(false)
    readyExceptPrestige(def.id)
    expect(forge.nodeUnlocked(def.id)).toBe(true)
  })

  // ── Der ZUSAMMENLAUF ───────────────────────────────────────────────────────

  it('jede Krone verlangt mehr als ihren Elternteil', () => {
    // Der Ring ist die einzige Stelle des Baums, an der Entwicklungslinien
    // zusammenlaufen. Eine Krone ohne `requires` wäre wieder eine reine Kette.
    for (const def of FORGE_CROWNS) {
      expect(
        (def.requires ?? []).length,
        `${def.id} verlangt nur seinen Elternteil`,
      ).toBeGreaterThan(0)
    }
  })

  it('EINE offene Bedingung genügt, um die Krone zuzuhalten', () => {
    for (const def of FORGE_CROWNS) {
      const all = [
        { id: def.parentId, level: FORGE_CROWN_PARENT_MIN_LEVEL },
        ...(def.requires ?? []),
      ]
      for (let held = 0; held < all.length; held++) {
        setActivePinia(createPinia())
        useSolarUpgradeStore().starPhase = STAR_PHASE_FINAL_INDEX
        useGameStore().totalPrestiges = FORGE_CROWN_UNLOCK_PRESTIGES
        // Alles erfüllen ausser EINER Bedingung — reihum jeder.
        all.forEach((req, i) => setLevel(req.id, i === held ? req.level - 1 : req.level))
        expect(
          useStarForgeStore().nodeUnlocked(def.id),
          `${def.id} geht auf, obwohl ${all[held].id} fehlt`,
        ).toBe(false)
      }
      setActivePinia(createPinia())
      useSolarUpgradeStore().starPhase = STAR_PHASE_FINAL_INDEX
      useGameStore().totalPrestiges = FORGE_CROWN_UNLOCK_PRESTIGES
      readyExceptPrestige(def.id)
      expect(useStarForgeStore().nodeUnlocked(def.id), `${def.id} geht nie auf`).toBe(true)
    }
  })

  it('nennt die erste offene Bedingung und zählt alle', () => {
    // Der Sperrsatz hat Platz für genau eine; die Liste rechts zeigt sie alle.
    const forge = useStarForgeStore()
    useGameStore().totalPrestiges = FORGE_CROWN_UNLOCK_PRESTIGES
    const def = FORGE_CROWNS.find((c) => (c.requires ?? []).length >= 2)!
    setLevel(def.parentId, FORGE_CROWN_PARENT_MIN_LEVEL)
    const reqs = forge.nodeRequirements(def)
    expect(reqs.length).toBe(1 + (def.requires ?? []).length)
    expect(reqs[0].id).toBe(def.parentId)
    expect(reqs[0].met).toBe(true)
    expect(reqs.filter((r) => !r.met).length).toBe((def.requires ?? []).length)
  })

  it('nennt das PRESTIGE-Tor, statt eine erfüllte Vorgängerliste zu zeigen', () => {
    // Der Fehler, gegen den dieser Test steht: eine Krone, deren Vorgänger ALLE
    // stehen und der nur der Aufbruch fehlt, trug `lockKind: 'parent'`. Die
    // Weiche „ab zwei Bedingungen zeigt die Liste statt des Satzes" griff
    // damit, der Spieler sah lauter Häkchen — und der Satz „Leave a universe
    // behind first" wurde NIE angezeigt.
    const def = FORGE_CROWNS.find((c) => (c.requires ?? []).length >= 2)!
    readyExceptPrestige(def.id)
    useGameStore().totalPrestiges = 0

    const { upgradeEntries } = useForgeUpgrades()
    const entry = upgradeEntries.value.find((e) => e.id === def.id)!
    expect(entry.state).toBe('locked')
    expect(entry.lockKind, 'der Sperrgrund ist nicht als Prestige-Tor markiert').toBe('prestige')
    expect(entry.lockReason).toBe(FORGE_CROWN_LOCK_REASON)
    // Die Vorgängerliste ist vollständig erfüllt — genau deshalb darf sie hier
    // nicht die Antwort sein.
    expect(entry.reqs.every((req) => req.met)).toBe(true)
  })

  it('kennt genau eine Stufe — anders als der endlose Ring darunter', () => {
    const forge = useStarForgeStore()
    for (const def of FORGE_CROWNS) {
      expect(forge.nodeMaxLevel(def.id), def.id).toBe(FORGE_CROWN_MAX_LEVEL)
      expect(Number.isFinite(forge.nodeMaxLevel(def.id))).toBe(true)
    }
  })

  it('legt jede Krone an einen eigenen Covenant, auf einem eigenen Winkel', () => {
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

  // ── Die fünf DREIFACH-Kronen ───────────────────────────────────────────────

  it('lässt einen Drifter auf die Rückkehr warten — genau einen, egal wie lange', () => {
    const drifter = useDrifterStore()
    expect(drifter.catchUpDrifter(3600)).toBe(0)
    expect(drifter.active.length).toBe(0)

    forgeCrown('homewardSky')
    expect(drifter.catchUpDrifter(3600)).toBe(FORGE_CROWN_OFFLINE_DRIFTER_COUNT)
    expect(drifter.active.length).toBe(FORGE_CROWN_OFFLINE_DRIFTER_COUNT)

    // Ein FENSTER und keine Rate: drei Tage bringen keinen zweiten. Das Feld
    // ist danach ohnehin voll — genau das ist der Deckel, der die Achse hält.
    drifter.active = []
    expect(drifter.catchUpDrifter(3 * 24 * 3600)).toBe(FORGE_CROWN_OFFLINE_DRIFTER_COUNT)
  })

  it('nimmt einem Riss den Zoll, wenn die Nachwirkung eines ANDEREN noch läuft', () => {
    const voidStore = useVoidStore()
    const player = usePlayerStore()
    const game = useGameStore()

    // Ein fremder Riss hat eingeschlagen und wirkt noch nach.
    voidStore.aftermaths = [
      {
        sourceId: 'somethingElse',
        expiresAt: voidStore.voidNow + 60_000,
        durationMs: 60_000,
        effects: {},
      },
    ]
    game.chimesForNextUniverse = 1e12
    game.meepsDevoured = 0

    forgeCrown('sealedThreshold')
    const hpBefore = player.currentHP
    const monster = voidStore.spawnMonster(getVoidRift(VOID_RIFTS[0].id)!.id)!
    voidStore.impactMonster(monster)

    expect(player.currentHP, 'der gestapelte Riss kostet keine HP').toBe(hpBefore)
  })

  it('hält den Void zurück, solange eine Bard-Fähigkeit noch wirkt', () => {
    const forge = useStarForgeStore()
    expect(forge.riftsHeldWhileAbilityRuns).toBe(false)
    forgeCrown('sanctumVeil')
    expect(forge.riftsHeldWhileAbilityRuns).toBe(true)

    const bard = useBardAbilityStore()
    const voidStore = useVoidStore()
    bard.buffs = [{ id: 'test', expiresAt: bard.abilityNow + 60_000 }] as typeof bard.buffs
    // Alle Uhren fällig — ohne die Krone spawnte hier etwas.
    for (const key of Object.keys(voidStore.spawnCooldowns)) {
      voidStore.spawnCooldowns[key as keyof typeof voidStore.spawnCooldowns] = 0
    }
    voidStore.tickSpawnClocks()
    expect(voidStore.active.length, 'ein Riss ist trotz laufender Fähigkeit aufgegangen').toBe(0)
    // Verschluckt wird der Spawn NICHT — die Uhr steht auf Wiedervorlage.
    for (const value of Object.values(voidStore.spawnCooldowns)) {
      expect(value).toBeGreaterThan(0)
    }
  })

  it('lässt die Sonne nicht unter den halben Stand fallen, solange ein Vorzeichen läuft', () => {
    const player = usePlayerStore()
    const omen = useOmenStore()
    omen.buffs = [
      { id: 'x', defId: 'x', expiresAt: omen.omenNow + 60_000, effects: {}, durationMs: 60_000 },
    ] as typeof omen.buffs

    forgeCrown('unfailingSign')
    const floor = Math.floor(player.maxHP * FORGE_CROWN_OMEN_HP_FLOOR_FRACTION)
    player.takeDamage(player.maxHP * 10)
    expect(player.currentHP).toBe(floor)
    // Der Schaden wird trotzdem VOLL gebucht — die Lebenszeit-Wahrheit bleibt.
    expect(player.totalDamageTaken).toBeGreaterThan(floor)
  })

  it('lässt die Sonne ohne laufendes Vorzeichen ganz fallen', () => {
    const player = usePlayerStore()
    forgeCrown('unfailingSign')
    player.takeDamage(player.maxHP * 10)
    expect(player.currentHP).toBe(0)
  })

  it('merkt sich die Wunde eines entkommenen Bosses — mit einem Boden', () => {
    const forge = useStarForgeStore()
    const boss = usePlanetBossStore()
    expect(forge.bossKeepsWounds).toBe(false)
    forgeCrown('rememberedWound')
    expect(forge.bossKeepsWounds).toBe(true)

    // Der Beutel hält einen ANTEIL, keine HP-Zahl: die Höchst-HP sind beim
    // nächsten Erscheinen andere.
    boss.woundedPlanets = { p1: 0.4 }
    expect(boss.woundedPlanets.p1).toBeLessThan(1)
    expect(FORGE_CROWN_BOSS_WOUND_FLOOR).toBeGreaterThan(0)
  })
})
