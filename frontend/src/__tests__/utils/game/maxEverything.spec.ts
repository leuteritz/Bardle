import { setActivePinia, createPinia } from 'pinia'
import { describe, it, expect, beforeEach } from 'vitest'
import { maxEverything } from '@/utils/game/maxEverything'
import { useGameStore } from '@/stores/core/gameStore'
import { useSectionStore } from '@/stores/core/sectionStore'
import { useItemStore } from '@/stores/economy/itemStore'
import { useShopStore } from '@/stores/economy/shopStore'
import { useBattleStore } from '@/stores/battle/battleStore'
import { usePlayerStore } from '@/stores/battle/playerStore'
import { useChampionLevelStore } from '@/stores/champions/championLevelStore'
import { usePlanetShopStore, computePlanetMaxHp } from '@/stores/world/planetShopStore'
import { useGalaxyStore } from '@/stores/world/galaxyStore'
import { useSolarUpgradeStore } from '@/stores/progression/solarUpgradeStore'
import { useStarForgeStore, FORGE_NODES } from '@/stores/progression/starForgeStore'
import { FORGE_BOUGHS } from '@/config/progression/starForge'
import { useMeepTreeStore } from '@/stores/progression/meepTreeStore'
import { useAchievementStore } from '@/stores/progression/achievementStore'
import { useProvidenceStore } from '@/stores/progression/providenceStore'
import { useMissionStore } from '@/stores/progression/missionStore'
import { useExpeditionChartStore } from '@/stores/economy/expeditionChartStore'
import { computeRequired } from '@/stores/world/galaxyStore'
import { buildFirmamentGates, buildFirmamentNodes } from '@/utils/ui/firmamentLayout'
import { universes } from '@/config/progression/universes'
import { FORGE_CONFLUENCES } from '@/config/progression/starForge'
import { MISSION_COUNT } from '@/config/progression/missions'
import { CHRONICLE_TRACKS } from '@/config/progression/achievements'
import { SHOP_ITEMS } from '@/config/economy/items'
import {
  ADMIN_MAX_BOUGH_LEVEL,
  FORGE_CROWN_MAX_LEVEL,
  ADMIN_MAX_GALAXY,
  ADMIN_MAX_PLANET_LEVEL,
  ADMIN_MAX_UNIVERSE,
  EXPEDITION_CHART_MAX,
  FORGE_YIELD_SOURCES,
  ITEM_SLOT_COUNT,
  UNIVERSE_RESCUE_COST_MULTIPLIER,
  UNIVERSE_RESCUE_INITIAL_COST,
  STAR_PHASE_FINAL_INDEX,
  TOTAL_SECTIONS,
  SOLAR_BRANCHES,
  SOLAR_SIGNATURE_STAGES,
  SOLAR_SIGNATURE_BASE_STAGES,
} from '@/config/constants'

/*
 * Die Reihenfolge in maxEverything() ist der eigentliche Inhalt der Funktion —
 * jede Vertauschung lässt sie glatt durchlaufen und trotzdem etwas ungemaxt.
 * Genau darauf zielen die Prüfungen hier: sie belegen nicht nur "der Wert steht
 * oben", sondern dass die Stufe davor rechtzeitig gelaufen ist.
 */
describe('maxEverything', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('setzt die Sonne auf die Endphase und beendet den Kometenzustand', () => {
    maxEverything()
    const solar = useSolarUpgradeStore()

    // Ohne isCometState = false greift jeder Sonnen-Renderer ins Leere.
    expect(solar.isCometState).toBe(false)
    expect(solar.starPhase).toBe(STAR_PHASE_FINAL_INDEX)
  })

  it('maxt die Forge — beweist, dass die Sonnenphase VOR ihr lief', () => {
    maxEverything()
    const forge = useStarForgeStore()

    // adminMaxAll() überspringt jeden Knoten mit phase > starPhase. Geprüft
    // wird die HÖCHSTE im Katalog vergebene Phase — stünde die Sonne später,
    // blieben genau diese Knoten leer.
    const gatePhase = Math.max(...FORGE_NODES.map((def) => def.phase))
    const lateNodes = FORGE_NODES.filter((def) => def.phase === gatePhase)
    expect(gatePhase).toBeGreaterThan(0)
    expect(lateNodes.length).toBeGreaterThan(0)
    for (const def of lateNodes) {
      if (def.tier === 'branch') {
        expect(forge.branchLevels[def.id], def.id).toBe(forge.nodeMaxLevel(def.id))
      } else if (def.tier === 'leaf') {
        expect(forge.leafLevels[def.id], def.id).toBe(forge.nodeMaxLevel(def.id))
      } else if (def.tier === 'crown') {
        // Ring 5 hängt nicht an der Sonne, sondern am Aufbruch. Er steht hier
        // trotzdem: `maxEverything` setzt den Prestige-Zähler passend zum
        // Universum, und ohne diese Zeile fehlte ausgerechnet der Ring, den es
        // nur ganz am Ende gibt, im „alles gemaxt".
        expect(forge.crownLevels[def.id], def.id).toBe(FORGE_CROWN_MAX_LEVEL)
      } else if (def.tier === 'confluence') {
        // Die Naht steht auf derselben Endphase wie die Boughs. Der Zweig
        // fehlte hier ebenso wie in `adminMaxAll` — und ein `else`, das jeden
        // Rest für einen Bough hält, hat den Fehler mit festgeschrieben.
        expect(forge.confluenceLevels[def.id], def.id).toBe(1)
      } else {
        // Ring 4 hat kein Maximum — `adminMaxAll` setzt dort die gewählte
        // Testhöhe. Ein `toBe(nodeMaxLevel(...))` verlangte hier `Infinity`.
        expect(forge.boughLevels[def.id], def.id).toBe(ADMIN_MAX_BOUGH_LEVEL)
      }
    }
  })

  it('maxt auch den endlosen Ring, ohne sich an ihm aufzuhängen', () => {
    maxEverything()
    const forge = useStarForgeStore()

    // Der Aufruf ist zweimal hintereinander gültig — beim zweiten Mal steht der
    // Bough bereits auf der Testhöhe und darf weder weiterwachsen noch die
    // gebuchte Max-HP ein zweites Mal aufschlagen.
    const hpAfterFirst = usePlayerStore().maxHP
    forge.adminMaxAll()

    expect(usePlayerStore().maxHP).toBe(hpAfterFirst)
    for (const def of FORGE_BOUGHS) {
      expect(forge.boughLevels[def.id], def.id).toBe(ADMIN_MAX_BOUGH_LEVEL)
      expect(forge.nodeMaxLevel(def.id)).toBe(Infinity)
    }
  })

  it('lässt keine Augment-Auswahl offen', () => {
    const game = useGameStore()
    maxEverything()

    // adminSetLevel legt sonst ein Modal plus Warteschlange an.
    expect(game.pendingAugmentChoice).toBe(false)
    expect(game.pendingAugmentOptions).toHaveLength(0)
    expect(game.pendingAugmentSelections).toHaveLength(0)
    // Und die Automatik läuft, sonst legt der nächste Tick sofort das nächste
    // Modal auf — bei den CpS dieses Zustands im Sekundentakt.
    expect(game.autoPickAugments).toBe(true)
  })

  it('hebt jeden besessenen Champion auf das Cap und lässt keine Perk-Wahl offen', () => {
    maxEverything()
    const levels = useChampionLevelStore()
    const battle = useBattleStore()

    expect(battle.ownedChampions.length).toBeGreaterThan(100)
    for (const name of battle.ownedChampions) {
      const progress = levels.progress[name]
      if (!progress) continue
      expect(progress.level).toBe(levels.levelCap)
    }
    // Sonst hingen hunderte Nag-Abzeichen in der Champion-UI.
    expect(levels.pendingPerks).toHaveLength(0)
  })

  it('macht jeden Planetenslot produktiv — Rolle, Konfiguration, Level, HP', () => {
    maxEverything()
    const planets = usePlanetShopStore()

    for (const slot of planets.slots) {
      expect(slot.purchased).toBe(true)
      expect(slot.role).not.toBeNull()
      expect(slot.level).toBe(ADMIN_MAX_PLANET_LEVEL)
      expect(slot.maxHp).toBe(computePlanetMaxHp(slot.level))
      expect(slot.currentHp).toBe(slot.maxHp)
      expect(slot.downUntilMs).toBe(0)
      // Diese zwei Rollen liefern ohne Konfiguration schlicht nichts.
      if (slot.role === 'harvest_node') expect(slot.slotConfig?.materialId).toBeTruthy()
      if (slot.role === 'resonance_tower') expect(slot.slotConfig?.rayId).toBeTruthy()
    }
  })

  it('trägt ein vollständiges Item-Set auf allen Slots, ohne den Bestand zu überziehen', () => {
    maxEverything()
    const items = useItemStore()

    // Set-Bonus greift nur bei gleicher setId über alle drei Kategorien.
    expect(items.activeSetBonuses.length).toBeGreaterThan(0)
    for (let slot = 0; slot < ITEM_SLOT_COUNT; slot++) {
      const equipment = items.slotEquipment[slot]
      expect(equipment.weapon).toBeTruthy()
      expect(equipment.armor).toBeTruthy()
      expect(equipment.artefact).toBeTruthy()
    }
    // Negative Verfügbarkeit hieße: mehr getragen als besessen.
    for (const item of SHOP_ITEMS) expect(items.availableCount(item.id)).toBeGreaterThanOrEqual(0)
  })

  it('schreibt den Astral Codex still voll', () => {
    maxEverything()
    const chronicle = useAchievementStore()

    for (const track of CHRONICLE_TRACKS) {
      expect(chronicle.stages[track.id]).toBe(track.stages.length)
    }
    // evaluate(true) hätte für jede Stufe ein Herald-Banner geschickt.
    expect(chronicle.unseen).toHaveLength(0)
  })

  it('steigt bis Challenger', () => {
    maxEverything()
    expect(useBattleStore().currentRank.tier).toBe('Challenger')
  })

  it('setzt Universum, Galaxie, Sections und den Meep-Baum', () => {
    maxEverything()

    expect(useGameStore().currentUniverse).toBe(ADMIN_MAX_UNIVERSE)
    expect(useGalaxyStore().currentGalaxy).toBe(ADMIN_MAX_GALAXY)
    expect(useSectionStore().highestUnlockedSectionId).toBe(TOTAL_SECTIONS)
    expect(useMeepTreeStore().bought.length).toBeGreaterThan(0)
  })

  it('füllt die Sonne wieder auf — maxHP wächst, currentHP zieht sonst nicht nach', () => {
    maxEverything()
    const player = usePlayerStore()
    expect(player.currentHP).toBe(player.maxHP)
  })

  /**
   * Der Befund, der diese Spec ausgelöst hat: nach „Max Everything" stand im
   * Ertragsband des Shops weiterhin eine „N unused"-Zone. Das Band gibt es
   * nicht mehr — die Aussage darunter schon, und sie ist die eigentliche:
   * **im Endzustand darf keine erspielbare Quelle mehr neutral stehen.**
   *
   * Drei Ursachen lagen darunter, und alle drei fängt diese Spec ab:
   *   • `boons`, `void` und `bosses` galten als „ungenutzt", obwohl das eine
   *     befristet und die anderen ZÖLLE sind — daher das `nature`-Feld.
   *   • Der Endzustand stand auf Universum 10 ohne einen einzigen Aufbruch —
   *     und damit ohne Vorsehung, weshalb `universe` leer blieb.
   *   • Die Kronen (Ring 5) hängen am Prestige-Zähler und blieben deshalb zu.
   *
   * Was hier zählt, ist die ERWORBENE Natur: was der Spieler erspielen kann,
   * muss im Endzustand auch tragen. Zölle und Befristetes sind ausdrücklich
   * ausgenommen — dass sie neutral sind, ist der Bestfall.
   */
  it('lässt keine erworbene Ertragsquelle mehr auf neutral stehen', () => {
    maxEverything()
    const factors = new Map(useShopStore().cpsFactorBreakdown.map((f) => [f.id, f.factor]))

    for (const def of FORGE_YIELD_SOURCES) {
      if (def.nature !== 'earned') continue
      expect(factors.get(def.id), `${def.id} traegt im Endzustand nichts bei`).toBeGreaterThan(1)
    }
  })

  it('zieht eine Vorsehung, statt neun Aufbrüche ohne eine einzige Karte zu behaupten', () => {
    maxEverything()
    const game = useGameStore()
    const providence = useProvidenceStore()

    expect(game.totalPrestiges).toBeGreaterThanOrEqual(ADMIN_MAX_UNIVERSE - 1)
    expect(providence.active, 'keine Vorsehung gezogen').not.toBeNull()
    expect(providence.activeEffects.cpsMultiplier ?? 1).toBeGreaterThan(1)
  })

  it('bringt jede Achse der Sonnensignatur auf die oberste Stufe', () => {
    // Die EICHUNG der Sättigungskurve, und der einzige Ort, an dem sie fällt:
    // steht eine Achse im Endzustand nicht ganz oben, ist `SOLAR_SIGNATURE_K`
    // zu groß oder eine Schwelle in `SOLAR_SIGNATURE_STAGES` zu hoch — die
    // Sonne erreichte dann ihr letztes Bild nie, und niemand sähe es.
    maxEverything()
    const sig = useSolarUpgradeStore().solarSignature
    const top = SOLAR_SIGNATURE_STAGES.length - 1

    for (const axis of SOLAR_BRANCHES.map((r) => r.id)) {
      expect(sig.axes[axis].stage, `Achse ${axis} bleibt unter der obersten Stufe`).toBe(top)
      expect(sig.axes[axis].t).toBeGreaterThan(0.9)
    }
    expect(sig.base.stage).toBe(SOLAR_SIGNATURE_BASE_STAGES.length - 1)
  })

  /**
   * Der Befund, der diesen Block ausgelöst hat: nach „Max Everything" stand das
   * Firmament auf fünfzig Galaxien und NULL Toren. `universeRuns` wird nur beim
   * echten Prestige geschrieben, und das rührt der Knopf bewusst nicht an — also
   * las jede Zeile der Universumsleiste ausser der laufenden „not yet walked"
   * und war nicht anklickbar.
   */
  it('lässt kein Universum auf „not yet walked" stehen', () => {
    maxEverything()
    const game = useGameStore()

    for (const u of universes) {
      const walked =
        u.id === game.currentUniverse || game.universeRuns.some((r) => r.universe === u.id)
      expect(walked, `Universum ${u.id} nie betreten`).toBe(true)
    }
  })

  it('gibt jedem verlassenen Universum ein Tor auf der Bahn', () => {
    maxEverything()
    const game = useGameStore()
    const galaxy = useGalaxyStore()

    const nodes = buildFirmamentNodes({
      completed: galaxy.completedGalaxies,
      currentGalaxy: galaxy.currentGalaxy,
      currentRescued: 0,
      currentLost: 0,
      currentLandfalls: 0,
      currentThemeIndex: galaxy.currentThemeIndex,
      starsOf: computeRequired,
    })
    const gates = buildFirmamentGates(nodes, game.universeRuns)

    // Gleich `untoldRuns === 0` im Wappenband — kein Lauf bleibt „unmarked".
    expect(gates).toHaveLength(game.universeRuns.length)
    expect(new Set(gates.map((g) => g.afterIndex)).size).toBe(gates.length)
  })

  it('stellt den Rettungsbalken auf den Stand, den die Aufbrüche verlangen', () => {
    maxEverything()
    const game = useGameStore()

    expect(game.chimesToUniverseRescue).toBe(
      UNIVERSE_RESCUE_INITIAL_COST * UNIVERSE_RESCUE_COST_MULTIPLIER ** game.totalPrestiges,
    )
    expect(game.chimesForNextUniverse).toBeGreaterThanOrEqual(game.chimesToUniverseRescue)
    expect(game.universeRescueProgress).toBe(100)
  })

  /**
   * Die Meep-Ratsche steigt nur beim Aufbruch. Bliebe sie bei nachgetragenen
   * Läufen auf null, fiele der Anker auf `MEEP_RUN_BASE_MIN` — und der Knopf
   * schenkte fünfstellig Meeps, wo der Entwurf rund neunzig je Aufbruch vorsieht.
   */
  it('hebt die Meep-Ratsche auf den besten archivierten Lauf', () => {
    maxEverything()
    const game = useGameStore()

    expect(game.bestUniverseRunChimes).toBe(Math.max(...game.universeRuns.map((r) => r.chimes)))
    expect(game.pendingMeeps).toBeLessThan(1000)
  })

  it('zählt „in diesem Universum" ab dem Ankommen, nicht ab dem Archiv', () => {
    maxEverything()
    expect(useGameStore().universeRunStats.galaxiesFreed).toBe(0)
  })

  /**
   * `adminMaxAll` hatte keinen `confluence`-Zweig: die fünf fielen in den
   * `else` und landeten als Fremd-IDs in `boughLevels`, während
   * `confluenceEffect` weiter null zurückgab. Keiner der Yield-Tests fing das —
   * keine Confluence zahlt auf CpS.
   */
  it('setzt jede Confluence auf ihre eine Stufe, nicht in den Bough-Record', () => {
    maxEverything()
    const forge = useStarForgeStore()

    for (const def of FORGE_CONFLUENCES) {
      expect(forge.confluenceLevels[def.id], def.id).toBe(1)
      expect(forge.boughLevels[def.id], def.id).toBeUndefined()
      expect(forge.confluenceEffect(def.id), def.id).toBeGreaterThan(0)
    }
  })

  /* Der Wayfinder stünde sonst TOT bei Stufe eins: er rückt nur bei erfüllter
     Metrik vor, und die erste verlangt zehn Klicks. */
  it('stellt die zweite stille Leiter ebenfalls voll', () => {
    maxEverything()
    const mission = useMissionStore()

    expect(mission.isComplete).toBe(true)
    expect(mission.claimedCount).toBe(MISSION_COUNT)
    expect(mission.caughtUp).toBe(0)
  })

  it('lässt kein befreites Ziel unkartiert und keine „NEW"-Marke stehen', () => {
    maxEverything()
    const chart = useExpeditionChartStore()
    const freed = useGalaxyStore().completedGalaxies

    expect(freed.length).toBeGreaterThan(0)
    for (const record of freed) {
      expect(chart.progressOf(record.galaxy).charted, `Galaxie ${record.galaxy}`).toBe(
        EXPEDITION_CHART_MAX,
      )
      expect(chart.seenDestinations).toContain(record.galaxy)
    }
    expect(chart.chartedCount).toBe(freed.length)
  })

  it('ist idempotent: ein zweiter Druck verändert den Endzustand nicht mehr', () => {
    const first = maxEverything()
    const game = useGameStore()
    const chimesAfterFirst = game.chimes
    const runsAfterFirst = game.universeRuns.length
    const costAfterFirst = game.chimesToUniverseRescue

    const second = maxEverything()

    expect(second.rank).toBe(first.rank)
    expect(second.galaxy).toBe(first.galaxy)
    expect(game.chimes).toBe(chimesAfterFirst)
    expect(useChampionLevelStore().pendingPerks).toHaveLength(0)
    expect(game.activeAugments).toHaveLength(new Set(game.activeAugments).size)
    // Die nachgetragenen Aufbrüche dürfen sich nicht verdoppeln, und
    // `caughtUp` wird in `catchUpSilently` ABSOLUT geschrieben — der Grund,
    // warum der Wayfinder eine eigene Admin-Aktion hat.
    expect(game.universeRuns).toHaveLength(runsAfterFirst)
    expect(game.chimesToUniverseRescue).toBe(costAfterFirst)
    expect(useMissionStore().caughtUp).toBe(0)
  })
})
