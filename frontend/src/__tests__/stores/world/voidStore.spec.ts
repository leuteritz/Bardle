import { setActivePinia, createPinia } from 'pinia'
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { useVoidStore } from '@/stores/world/voidStore'
import { useGameStore } from '@/stores/core/gameStore'
import { usePlayerStore } from '@/stores/battle/playerStore'
import { useGalaxyStore } from '@/stores/world/galaxyStore'
import { getVoidRift, VOID_RIFTS } from '@/config/world/void'
import { voidRiftScreenPos, voidRiftHalfExtent } from '@/utils/orbit/voidRiftPath'
import { drifterField, measuredFieldInsets } from '@/utils/orbit/drifterPath'
import {
  VOID_UNLOCK_LEVEL,
  VOID_RIFT_MAX_CONCURRENT,
  VOID_RIFT_HP_BASE,
  VOID_RIFT_HP_PER_GALAXY,
  VOID_RIFT_HP_SEVERITY_MULT,
  VOID_RIFT_LIFETIME_MS,
  VOID_RIFT_CLICK_DAMAGE_PCT,
  VOID_RIFT_DRAIN_RAMP_MIN,
  VOID_COLLAPSE_HP_LOSS,
  VOID_COLLAPSE_AFTERMATH_MS,
  VOID_RIFT_SPAWN_RETRY_SEC,
  GAME_TICK_INTERVAL_MS,
} from '@/config/constants'

/** Hebt das Bard-Level über die Freischaltschwelle. */
function unlock() {
  useGameStore().level = VOID_UNLOCK_LEVEL
}

/** Reisst einen bestimmten Typ auf und gibt die lebende Instanz zurück. */
function open(defId: string) {
  const store = useVoidStore()
  store.active = []
  const rift = store.openRift(defId)
  expect(rift).not.toBeNull()
  return rift!
}

describe('voidStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('Freischaltung', () => {
    it('bleibt unter dem Freischalt-Level verschlossen', () => {
      const store = useVoidStore()
      useGameStore().level = VOID_UNLOCK_LEVEL - 1
      expect(store.isUnlocked).toBe(false)

      store.spawnCooldowns.lesser = 0
      store.tick()
      expect(store.active).toHaveLength(0)
    })

    it('öffnet ab dem Freischalt-Level', () => {
      const store = useVoidStore()
      unlock()
      expect(store.isUnlocked).toBe(true)

      store.spawnCooldowns.lesser = GAME_TICK_INTERVAL_MS / 1000
      store.tick()
      expect(store.active).toHaveLength(1)
    })

    // Ein Nachbeben, das beim Wipe des Levels feststeckt, wäre ein Faktor, den
    // niemand mehr sieht und niemand mehr loswird.
    it('lässt ein laufendes Nachbeben auch ohne Freischaltung auslaufen', () => {
      const store = useVoidStore()
      useGameStore().level = 0
      store.aftermaths = [
        {
          sourceId: 'sunlessBreach',
          expiresAt: Date.now() - 1,
          durationMs: 1000,
          effects: { cpsMult: 0.5 },
        },
      ]
      store.tick()
      expect(store.aftermaths).toHaveLength(0)
    })
  })

  describe('Aufreissen', () => {
    it('hält die Obergrenze gleichzeitiger Risse ein', () => {
      unlock()
      const store = useVoidStore()
      for (let i = 0; i < VOID_RIFT_MAX_CONCURRENT + 3; i++) store.openRift('sunlessBreach')
      expect(store.active).toHaveLength(VOID_RIFT_MAX_CONCURRENT)
    })

    it('skaliert die Zähigkeit mit Schwere und Galaxie', () => {
      unlock()
      useGalaxyStore().currentGalaxy = 3
      const rift = open('sunlessBreach')
      const expected = Math.round(
        VOID_RIFT_HP_BASE * VOID_RIFT_HP_SEVERITY_MULT.lesser * (1 + 2 * VOID_RIFT_HP_PER_GALAXY),
      )
      expect(rift.maxHp).toBe(expected)
      expect(rift.currentHp).toBe(expected)
    })

    it('setzt die Frist nach der Schwere', () => {
      unlock()
      const rift = open('unmakingScar')
      expect(rift.collapseAt - rift.openedAt).toBe(VOID_RIFT_LIFETIME_MS.abyssal)
    })

    it('reisst nicht auf, während ein Overlay den Idle-Layer deckt', () => {
      unlock()
      const store = useVoidStore()
      store.setSpawningBlocked(true)
      store.spawnCooldowns.lesser = 0
      store.tick()
      expect(store.active).toHaveLength(0)
      // Die Uhr darf dabei nicht leerlaufen, sonst kippt beim Schliessen des
      // Overlays ein Stapel Risse auf einmal heraus.
      expect(store.spawnCooldowns.lesser).toBe(0)
    })

    it('lässt eine fällige Uhr kurz warten, wenn schon ein Riss steht', () => {
      unlock()
      const store = useVoidStore()
      open('sunlessBreach')
      store.spawnCooldowns.greater = GAME_TICK_INTERVAL_MS / 1000
      store.tick()
      expect(store.active).toHaveLength(1)
      expect(store.spawnCooldowns.greater).toBe(VOID_RIFT_SPAWN_RETRY_SEC)
    })
  })

  describe('Ziehen', () => {
    it('zieht frisch geöffnet nur anteilig und bei voller Frist ganz', () => {
      unlock()
      const store = useVoidStore()
      const rift = open('sunlessBreach')
      const def = getVoidRift('sunlessBreach')!
      const full = def.drain.cpsMult!

      // Frisch: die Rampe steht auf ihrem Minimum.
      store.voidNow = rift.openedAt
      expect(store.cpsMult).toBeCloseTo(1 - (1 - full) * VOID_RIFT_DRAIN_RAMP_MIN, 6)

      // Kurz vor dem Kollaps: volle Wirkung.
      store.voidNow = rift.collapseAt
      expect(store.cpsMult).toBeCloseTo(full, 6)
    })

    it('lässt jede unberührte Achse auf 1', () => {
      unlock()
      const store = useVoidStore()
      open('starvingMaw')
      expect(store.cpsMult).toBe(1)
      expect(store.xpMult).toBe(1)
      expect(store.materialDropMult).toBeLessThan(1)
    })

    it('multipliziert offenen Riss und laufendes Nachbeben', () => {
      unlock()
      const store = useVoidStore()
      const rift = open('sunlessBreach')
      store.voidNow = rift.collapseAt
      const fromRift = store.cpsMult

      store.aftermaths.push({
        sourceId: 'other',
        expiresAt: store.voidNow + 10_000,
        durationMs: 10_000,
        effects: { cpsMult: 0.5 },
      })
      expect(store.cpsMult).toBeCloseTo(fromRift * 0.5, 6)
    })
  })

  describe('Schliessen', () => {
    it('nimmt einen Anteil der eigenen Trefferpunkte je Klick', () => {
      unlock()
      const store = useVoidStore()
      const rift = open('unmakingScar')
      const before = rift.currentHp
      store.hitRift(rift.uid)
      expect(store.active[0].currentHp).toBeCloseTo(
        before - rift.maxHp * VOID_RIFT_CLICK_DAMAGE_PCT,
        6,
      )
    })

    it('schliesst den Riss, sobald die Trefferpunkte fallen', () => {
      unlock()
      const store = useVoidStore()
      const rift = open('sunlessBreach')
      const sealed = store.damageRift(rift.maxHp)
      expect(sealed).toBe(true)
      expect(store.active).toHaveLength(0)
      expect(store.totalRiftsSealed).toBe(1)
      expect(store.lastOutcome.sealed).toBe(true)
    })

    it('startet beim Schliessen das Beute-Fenster', () => {
      unlock()
      const store = useVoidStore()
      const rift = open('dimmingWound')
      store.damageRift(rift.maxHp)

      const boon = store.aftermaths.find((a) => a.sourceId === 'dimmingWound')
      expect(boon).toBeDefined()
      // Die Beute liegt ÜBER 1 — dieselbe Liste trägt Strafe und Lohn.
      expect(boon!.effects.combatDpsMult).toBeGreaterThan(1)
      expect(store.combatDpsMult).toBeGreaterThan(1)
    })

    it('zahlt Chimes mindestens in Höhe des Klick-Bodens', () => {
      unlock()
      const store = useVoidStore()
      const gameStore = useGameStore()
      gameStore.chimes = 0
      gameStore.chimesPerSecond = 0
      gameStore.chimesPerClick = 10

      const rift = open('sunlessBreach')
      store.damageRift(rift.maxHp)
      expect(gameStore.chimes).toBeGreaterThan(0)
    })
  })

  describe('Kollaps', () => {
    it('kollabiert, sobald die Frist abgelaufen ist', () => {
      unlock()
      const store = useVoidStore()
      const rift = open('sunlessBreach')
      store.voidNow = rift.collapseAt
      store.checkCollapse()

      expect(store.active).toHaveLength(0)
      expect(store.totalRiftsCollapsed).toBe(1)
      expect(store.lastOutcome.sealed).toBe(false)
    })

    it('kostet Sonnen-HP und hinterlässt ein Nachbeben', () => {
      unlock()
      const store = useVoidStore()
      const player = usePlayerStore()
      const before = player.currentHP

      const rift = open('sunlessBreach')
      store.collapseRift(rift)

      expect(player.currentHP).toBeLessThan(before)
      expect(store.totalVoidHpLost).toBeGreaterThan(0)
      const echo = store.aftermaths.find((a) => a.sourceId === 'sunlessBreach')
      expect(echo).toBeDefined()
      expect(echo!.durationMs).toBe(VOID_COLLAPSE_AFTERMATH_MS)
      // Das Nachbeben zieht härter als der offene Riss es tat.
      expect(echo!.effects.cpsMult).toBeLessThan(getVoidRift('sunlessBreach')!.drain.cpsMult!)
    })

    // Ohne diese Staffelung wäre angefangene Arbeit wertlos, und die beste
    // Antwort auf einen Riss, den man nicht schafft, wäre ihn zu ignorieren.
    it('staffelt den Schaden nach den verbliebenen Trefferpunkten', () => {
      unlock()
      const store = useVoidStore()
      const player = usePlayerStore()

      const rift = open('unmakingScar')
      rift.currentHp = rift.maxHp * 0.25
      store.collapseRift(rift)

      const full = VOID_COLLAPSE_HP_LOSS.abyssal
      expect(store.totalVoidHpLost).toBeLessThan(full)
      expect(store.totalVoidHpLost).toBeGreaterThan(0)
      expect(player.currentHP).toBeGreaterThan(0)
    })

    it('kostet auch bei fast geschlossenem Riss mindestens 1 HP', () => {
      unlock()
      const store = useVoidStore()
      const rift = open('sunlessBreach')
      rift.currentHp = 1
      store.collapseRift(rift)
      expect(store.totalVoidHpLost).toBeGreaterThanOrEqual(1)
    })
  })

  // Ein Riss hinter der deckenden Minimap oder dem Command-Panel wäre
  // unsichtbar UND unklickbar — also ein sicherer Kollaps, den der Spieler
  // nicht abwenden kann. Das ist der eine Ausgang, den dieses System nie
  // erzwingen darf, deshalb steht die Geometrie hier unter Test.
  describe('Platzierung', () => {
    it('stellt keinen Riss unter die erhobenen HUD-Panels', () => {
      unlock()
      const store = useVoidStore()
      const f = drifterField(window.innerWidth, window.innerHeight, measuredFieldInsets())

      for (const def of VOID_RIFTS) {
        const half = voidRiftHalfExtent(def.sizePx)
        for (let i = 0; i < 40; i++) {
          store.active = []
          const rift = store.openRift(def.id)!
          const pos = voidRiftScreenPos(rift, half)
          const inSideColumn =
            pos.x < f.left + f.sidePanelWidth + half ||
            pos.x > f.left + f.width - f.sidePanelWidth - half
          if (inSideColumn) {
            expect(
              pos.y + half,
              `${def.id} steht in der Seitenspalte und ragt in das HUD-Panel`,
            ).toBeLessThanOrEqual(f.sidePanelTop)
          }
        }
      }
    })

    it('hält jeden Riss im sichtbaren Feld', () => {
      unlock()
      const store = useVoidStore()
      for (const def of VOID_RIFTS) {
        const half = voidRiftHalfExtent(def.sizePx)
        for (let i = 0; i < 25; i++) {
          store.active = []
          const rift = store.openRift(def.id)!
          const pos = voidRiftScreenPos(rift, half)
          expect(pos.x - half).toBeGreaterThanOrEqual(0)
          expect(pos.x + half).toBeLessThanOrEqual(window.innerWidth)
          expect(pos.y - half).toBeGreaterThanOrEqual(0)
          expect(pos.y + half).toBeLessThanOrEqual(window.innerHeight)
        }
      }
    })
  })

  describe('Katalog', () => {
    it('führt jede Schwere mit mindestens einem Typ', () => {
      const severities = new Set(VOID_RIFTS.map((r) => r.severity))
      expect(severities.size).toBeGreaterThanOrEqual(3)
    })

    // Ein Riss, der an einer Achse zieht und an einer anderen auszahlt, wäre
    // zwei Nachrichten statt einer — siehe der Kopf von config/world/void.
    it('zahlt auf denselben Achsen aus, an denen er zieht', () => {
      for (const def of VOID_RIFTS) {
        const drained = Object.keys(def.drain)
        const paid = Object.keys(def.boon.effects)
        expect(paid.sort()).toEqual(drained.sort())
      }
    })

    it('zieht immer nach unten und zahlt immer nach oben', () => {
      for (const def of VOID_RIFTS) {
        for (const value of Object.values(def.drain)) {
          expect(value).toBeGreaterThan(0)
          expect(value).toBeLessThan(1)
        }
        for (const value of Object.values(def.boon.effects)) {
          expect(value).toBeGreaterThan(1)
        }
        // Das Nachbeben ist die Verschärfung desselben Zugs, nie eine Milderung.
        for (const [key, value] of Object.entries(def.aftermath)) {
          expect(value).toBeLessThanOrEqual(def.drain[key as keyof typeof def.drain]!)
        }
      }
    })
  })
})
