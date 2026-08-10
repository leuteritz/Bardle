import { setActivePinia, createPinia } from 'pinia'
import { describe, it, expect, beforeEach } from 'vitest'
import { maxEverything } from '@/utils/game/maxEverything'
import { useGameStore } from '@/stores/core/gameStore'
import { useSectionStore } from '@/stores/core/sectionStore'
import { useItemStore } from '@/stores/economy/itemStore'
import { useBattleStore } from '@/stores/battle/battleStore'
import { usePlayerStore } from '@/stores/battle/playerStore'
import { useChampionLevelStore } from '@/stores/champions/championLevelStore'
import { usePlanetShopStore, computePlanetMaxHp } from '@/stores/world/planetShopStore'
import { useGalaxyStore } from '@/stores/world/galaxyStore'
import { useSolarUpgradeStore } from '@/stores/progression/solarUpgradeStore'
import { useStarForgeStore, FORGE_NODES } from '@/stores/progression/starForgeStore'
import { useMeepTreeStore } from '@/stores/progression/meepTreeStore'
import { useAchievementStore } from '@/stores/progression/achievementStore'
import { CHRONICLE_TRACKS } from '@/config/progression/achievements'
import { SHOP_ITEMS } from '@/config/economy/items'
import {
  ADMIN_MAX_GALAXY,
  ADMIN_MAX_PLANET_LEVEL,
  ADMIN_MAX_UNIVERSE,
  ITEM_SLOT_COUNT,
  STAR_PHASE_FINAL_INDEX,
  TOTAL_SECTIONS,
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
      const level = def.tier === 'branch' ? forge.branchLevels[def.id] : forge.leafLevels[def.id]
      expect(level).toBe(forge.nodeMaxLevel(def.id))
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
      if (slot.role === 'resonance_tower') expect(slot.slotConfig?.buildingId).toBeTruthy()
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

  it('ist idempotent: ein zweiter Druck verändert den Endzustand nicht mehr', () => {
    const first = maxEverything()
    const game = useGameStore()
    const chimesAfterFirst = game.chimes

    const second = maxEverything()

    expect(second.rank).toBe(first.rank)
    expect(second.galaxy).toBe(first.galaxy)
    expect(game.chimes).toBe(chimesAfterFirst)
    expect(useChampionLevelStore().pendingPerks).toHaveLength(0)
    expect(game.activeAugments).toHaveLength(new Set(game.activeAugments).size)
  })
})
