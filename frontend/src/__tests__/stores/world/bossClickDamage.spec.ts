import { setActivePinia, createPinia } from 'pinia'
import { describe, it, expect, beforeEach } from 'vitest'
import { usePlanetBossStore } from '@/stores/world/planetBossStore'
import { useGameStore } from '@/stores/core/gameStore'
import { useSolarUpgradeStore } from '@/stores/progression/solarUpgradeStore'
import { useGalaxyStore } from '@/stores/world/galaxyStore'
import { useSectionStore } from '@/stores/core/sectionStore'
import {
  BOSS_CLICK_DAMAGE_BASE,
  BOSS_BASE_HP,
  BOSS_TARGET_KILL_SECONDS,
  BOSS_TARGET_CLICKS_START,
  BOSS_TARGET_CLICKS_MAX,
  BOSS_CLICK_RAMP_KILLS,
  BOSS_HP_PER_GALAXY,
  BOSS_PASSIVE_DPS_FRACTION,
  BOSS_CLICK_DAMAGE_CPC_BONUS,
  SOLAR_MAX_LEVELS,
} from '@/config/constants'
import { SECTIONS } from '@/config/progression/sections'
import { bossClickBudgetHP, expectedClickDamage } from '@/utils/game/bossScaling'

/**
 * Der Bosskampf hängt NICHT am Chime-Klickwert.
 *
 * Er hing es einmal: `planetBossStore` rechnete mit `gameStore.chimesPerClick`,
 * der Klick richtete also so viel Schaden an, wie er Chimes einbrachte. Beide
 * Zahlen an einem Wert heisst, dass jede Änderung an der Wirtschaft still den
 * Kampf mitverschiebt — und zwar UNSYMMETRISCH, weil `BOSS_BASE_HP` als Boden
 * unter den HP liegt, unter dem Klickschaden aber nichts.
 *
 * Konkret gerechnet beim Absenken des Klickwerts von 20 auf 1: der Schaden fiel
 * um 95 %, die HP nur um 44 % — der erste Boss wäre von 18 auf 200 Klicks
 * gegangen, bei 30 Sekunden Enrage-Uhr. Kein einziger Test hätte das bemerkt,
 * denn die HP-Formel war ungeprüft. Diese Datei schliesst die Lücke.
 */
describe('Boss-Klickschaden ist von der Wirtschaft entkoppelt', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('folgt der eigenen Basis, nicht dem Chime-Klickwert', () => {
    const game = useGameStore()
    game.chimesPerClick = 1
    expect(game.dmgPerClick).toBe(BOSS_CLICK_DAMAGE_BASE)

    game.chimesPerClick = 1_000_000
    expect(game.dmgPerClick).toBe(BOSS_CLICK_DAMAGE_BASE)
  })

  it('der Solar-Zweig hebt ihn weiterhin — als Faktor, nicht als Summand', () => {
    // Additiv waren es +2 auf eine Basis von 20, also +10 %. Auf der heutigen
    // Basis von 1 wären dieselben +2 eine Verdreifachung je Stufe — und zwar in
    // Chime-Einheiten, an einer Zahl, die keine Chimes mehr ist.
    const game = useGameStore()
    const solar = useSolarUpgradeStore()
    solar.chimesPerClickLevel = 3
    expect(game.dmgPerClick).toBeCloseTo(
      BOSS_CLICK_DAMAGE_BASE * (1 + 3 * BOSS_CLICK_DAMAGE_CPC_BONUS),
      10,
    )
  })

  it('Boss-HP und Klickschaden bleiben gleich, egal wie der Klick bezahlt', () => {
    const boss = usePlanetBossStore()
    const game = useGameStore()

    game.chimesPerClick = 1
    boss.spawnBoss('p-arm', 'lava')
    const lean = boss.activeBosses.find((b) => b.planetId === 'p-arm')!

    boss.activeBosses = []
    game.chimesPerClick = 5_000
    boss.spawnBoss('p-rich', 'lava')
    const rich = boss.activeBosses.find((b) => b.planetId === 'p-rich')!

    expect(rich.maxHP).toBe(lean.maxHP)
    expect(rich.clickDamagePerHit).toBe(lean.clickDamagePerHit)
  })

  it('der erste Boss kostet genau die entworfene Klickzahl — bei 1 Schaden', () => {
    // Das ist die Zahl, die der Spieler spürt, und die Basis ist die Zahl, die
    // er LIEST: im frischen Spielstand steht am Sprite „-1", der Boss hat sechs
    // HP und fällt nach sechs Klicks.
    const boss = usePlanetBossStore()
    boss.spawnBoss('p-first', 'lava')
    const first = boss.activeBosses.find((b) => b.planetId === 'p-first')!

    expect(first.clickDamagePerHit).toBe(BOSS_CLICK_DAMAGE_BASE)
    expect(first.maxHP).toBe(BOSS_CLICK_DAMAGE_BASE * BOSS_TARGET_CLICKS_START)
    expect(Math.ceil(first.maxHP / first.clickDamagePerHit)).toBe(BOSS_TARGET_CLICKS_START)
    expect(first.maxHP).toBeGreaterThanOrEqual(BOSS_BASE_HP)
  })

  it('sechs Klicks fällen ihn wirklich — der fünfte noch nicht', () => {
    // Die Rechnung oben ist eine Formel; das hier ist der Kampf. Er läuft über
    // dieselbe Kette wie im Spiel (Rundung, Multiplikatoren, Boden von 1).
    const boss = usePlanetBossStore()
    boss.spawnBoss('p-fight', 'lava')

    for (let i = 1; i < BOSS_TARGET_CLICKS_START; i++) {
      expect(boss.dealClickDamage()).toBe(BOSS_CLICK_DAMAGE_BASE)
      expect(boss.activeBoss?.defeated).toBe(false)
    }
    expect(boss.dealClickDamage()).toBe(BOSS_CLICK_DAMAGE_BASE)
    expect(boss.activeBosses[0].defeated).toBe(true)
  })

  it('die Schadenszahl meldet, was WIRKLICH ankommt', () => {
    // Die Arena zeigt den Rückgabewert. Vorher zeigte sie `clickDamagePerHit`,
    // also den Wert vor `dmgMultiplier` — bei einer Basis von 1 stünde dort
    // dauerhaft „-1", während ein Vielfaches ankommt.
    const boss = usePlanetBossStore()
    const solar = useSolarUpgradeStore()
    solar.dmgPerClickLevel = SOLAR_MAX_LEVELS

    boss.spawnBoss('p-shown', 'lava')
    const shown = boss.dealClickDamage()

    expect(shown).toBeGreaterThan(boss.activeBosses[0].clickDamagePerHit)
    expect(shown).toBe(Math.max(1, Math.round(BOSS_CLICK_DAMAGE_BASE * solar.dmgMultiplier)))
  })
})

/**
 * Die Klickzahl war einmal für das ganze Spiel dieselbe — 18, vom ersten Boss
 * bis zum letzten. Der Klickschaden stand in der HP-Formel auf beiden Seiten
 * und kürzte sich weg. Diese Suite hält die beiden Eigenschaften fest, die den
 * Kreis geöffnet haben: die Rampe über den Fortschritt und die Entkopplung des
 * Klickschadens vom Schätzer.
 */
describe('Boss-HP folgt der Klickrampe', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  function spawn(id: string): number {
    const boss = usePlanetBossStore()
    boss.spawnBoss(id, 'lava')
    return boss.activeBosses.find((b) => b.planetId === id)!.maxHP
  }

  it('der späte Boss kostet mehr Klicks als der frühe', () => {
    const boss = usePlanetBossStore()
    const early = spawn('p-early')

    boss.activeBosses = []
    boss.totalBossesDefeated = BOSS_CLICK_RAMP_KILLS
    const late = spawn('p-late')

    // Ohne Upgrades ist die Erwartung genau die Basis — die Rampe steht hier
    // allein für sich.
    expect(late).toBe(BOSS_CLICK_DAMAGE_BASE * BOSS_TARGET_CLICKS_MAX)
    expect(early).toBe(BOSS_CLICK_DAMAGE_BASE * BOSS_TARGET_CLICKS_START)
    expect(late / early).toBeCloseTo(BOSS_TARGET_CLICKS_MAX / BOSS_TARGET_CLICKS_START, 5)
  })

  it('die Rampe ist gedeckelt — jenseits des Endwerts wächst nichts mehr', () => {
    const boss = usePlanetBossStore()
    boss.totalBossesDefeated = BOSS_CLICK_RAMP_KILLS
    const atCap = spawn('p-cap')

    boss.activeBosses = []
    boss.totalBossesDefeated = BOSS_CLICK_RAMP_KILLS * 10
    const beyond = spawn('p-beyond')

    expect(beyond).toBe(atCap)
  })

  it('ein Klick-Upgrade verkürzt den Kampf wirklich — die HP wachsen langsamer mit', () => {
    // DER Kerntest der Dämpfung, und er hat seine Aussage geändert: solange das
    // Budget mit der reinen Basis rechnete, blieben die HP beim Aufwerten
    // GLEICH (`upgraded === plain`). Seit die Erwartung das geometrische Mittel
    // aus Basis und echtem Klickschaden ist, wachsen sie mit — aber mit halber
    // Potenz, also langsamer als der Schaden. Beide Randfälle schlagen hier
    // fehl: bei voller Kopplung bliebe die Klickzahl gleich, bei gar keiner
    // stünden die HP still und der Klick-Kanal verlöre gegen den DPS-Kanal.
    const boss = usePlanetBossStore()
    const game = useGameStore()
    const solar = useSolarUpgradeStore()

    const plain = spawn('p-plain')
    const plainClicks = Math.ceil(plain / (game.dmgPerClick * solar.dmgMultiplier))

    boss.activeBosses = []
    solar.chimesPerClickLevel = SOLAR_MAX_LEVELS
    solar.dmgPerClickLevel = SOLAR_MAX_LEVELS
    const upgraded = spawn('p-upgraded')
    const upgradedClicks = Math.ceil(upgraded / (game.dmgPerClick * solar.dmgMultiplier))

    expect(upgraded).toBeGreaterThan(plain)
    expect(upgradedClicks).toBeLessThan(plainClicks)
  })

  it('kein Upgrade-Stand kostet je MEHR Klicks als der vorige', () => {
    // Der Fallstrick der Basis 1: die Erwartung wächst mit der Wurzel, der
    // gebuchte Schaden in ganzen Schritten. Rechnete die Erwartung mit dem
    // ungerundeten Wert, hübe Solar-Stufe 4 (clickPower 1,4) das Budget um 18 %,
    // während der Schaden gerundet auf 1 stehen bliebe — der Spieler hätte
    // investiert und bräuchte mehr Klicks. Diese Spec geht jede erreichbare
    // Stufenkombination der beiden Solar-Zweige durch.
    const boss = usePlanetBossStore()
    const solar = useSolarUpgradeStore()

    const stands: Array<{ power: number; clicks: number }> = []
    for (let cpc = 0; cpc <= SOLAR_MAX_LEVELS; cpc++) {
      for (let dmg = 0; dmg <= SOLAR_MAX_LEVELS; dmg++) {
        boss.activeBosses = []
        solar.chimesPerClickLevel = cpc
        solar.dmgPerClickLevel = dmg
        const hp = spawn(`p-${cpc}-${dmg}`)
        stands.push({ power: boss.clickPower, clicks: Math.ceil(hp / boss.clickPower) })
      }
    }

    // Nach Klickstärke sortiert darf die Klickzahl nur fallen — die Zweige
    // lassen sich in beliebiger Reihenfolge kaufen, geprüft wird die Kurve.
    stands.sort((a, b) => a.power - b.power)
    for (let i = 1; i < stands.length; i++) {
      expect(stands[i].clicks).toBeLessThanOrEqual(stands[i - 1].clicks)
    }
    expect(stands[0].clicks).toBe(BOSS_TARGET_CLICKS_START)
    // Am Vollausbau steht der Kampf spürbar kürzer als am Anfang.
    expect(stands[stands.length - 1].clicks).toBeLessThan(BOSS_TARGET_CLICKS_START)
  })

  it('Galaxie und Sektion greifen auch auf das Klickbudget', () => {
    // Bewusst NICHT ausgenommen: der Klickanteil soll später mitwachsen — das
    // ist die Achse, an der der Kampf wieder fordernd wird.
    const boss = usePlanetBossStore()
    const galaxy = useGalaxyStore()
    const section = useSectionStore()

    const base = spawn('p-base')

    boss.activeBosses = []
    galaxy.currentGalaxy = 3
    const farGalaxy = spawn('p-galaxy')
    // Die Galaxie zählt bewusst DOPPELT: als Sockel auf der Klickrampe und als
    // HP-Multiplikator. Ein offener Kreis wird daraus nicht, weil die
    // Klickzahl bei BOSS_TARGET_CLICKS_MAX hart gedeckelt ist.
    expect(farGalaxy).toBe(
      Math.floor(bossClickBudgetHP(0, 3, BOSS_CLICK_DAMAGE_BASE) * (1 + 2 * BOSS_HP_PER_GALAXY)),
    )
    expect(farGalaxy).toBeGreaterThan(Math.floor(base * (1 + 2 * BOSS_HP_PER_GALAXY)))

    boss.activeBosses = []
    galaxy.currentGalaxy = 1
    const harder = SECTIONS[1]
    section.activeSectionId = harder.id
    const farSection = spawn('p-section')
    expect(farSection).toBe(Math.floor(base * harder.difficultyMultiplier))
  })

  it('DPS-Kanal und Klick-Kanal addieren sich, sie multiplizieren nicht', () => {
    // Beweist, dass der Klickterm nicht mehr mit BOSS_TARGET_KILL_SECONDS
    // multipliziert wird — genau diese Multiplikation war die Kürzung.
    const game = useGameStore()
    game.chimesPerSecond = 1000
    const passiveDPS = Math.floor(1000 * BOSS_PASSIVE_DPS_FRACTION)

    const maxHP = spawn('p-mixed')

    expect(maxHP).toBe(
      passiveDPS * BOSS_TARGET_KILL_SECONDS +
        expectedClickDamage(BOSS_CLICK_DAMAGE_BASE) * BOSS_TARGET_CLICKS_START,
    )
  })
})
