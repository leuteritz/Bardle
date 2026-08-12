import { setActivePinia, createPinia } from 'pinia'
import { describe, it, expect, beforeEach } from 'vitest'
import { usePlanetBossStore } from '@/stores/world/planetBossStore'
import { useGameStore } from '@/stores/core/gameStore'
import { useSolarUpgradeStore } from '@/stores/progression/solarUpgradeStore'
import {
  BOSS_CLICK_DAMAGE_BASE,
  BOSS_BASE_HP,
  BOSS_TARGET_KILL_SECONDS,
  BOSS_ASSUMED_CLICKS_PER_SEC,
  SOLAR_CPC_PER_LEVEL,
} from '@/config/constants'

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

  it('der Solar-Zweig hebt ihn weiterhin', () => {
    const game = useGameStore()
    const solar = useSolarUpgradeStore()
    solar.chimesPerClickLevel = 3
    expect(game.dmgPerClick).toBe(BOSS_CLICK_DAMAGE_BASE + 3 * SOLAR_CPC_PER_LEVEL)
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

  it('der erste Boss fällt in genau der entworfenen Zeit', () => {
    // Das ist die Zahl, die der Spieler spürt — und sie ist keine willkürliche
    // Grenze, sondern fällt direkt aus dem Entwurf: sind Klicks die einzige
    // Schadensquelle, dauert der Kampf per Konstruktion
    // BOSS_TARGET_KILL_SECONDS lang, also so viele Klicks wie Sekunden mal
    // angenommener Klickrate. Vor der Entkopplung wären daraus 200 Klicks
    // geworden.
    const boss = usePlanetBossStore()
    boss.spawnBoss('p-first', 'lava')
    const first = boss.activeBosses.find((b) => b.planetId === 'p-first')!

    const clicks = Math.ceil(first.maxHP / first.clickDamagePerHit)
    expect(clicks).toBe(BOSS_TARGET_KILL_SECONDS * BOSS_ASSUMED_CLICKS_PER_SEC)
    expect(first.maxHP).toBeGreaterThanOrEqual(BOSS_BASE_HP)
  })
})
