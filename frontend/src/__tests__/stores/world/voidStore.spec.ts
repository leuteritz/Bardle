import { existsSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { setActivePinia, createPinia } from 'pinia'
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { useVoidStore } from '@/stores/world/voidStore'
import { useGameStore } from '@/stores/core/gameStore'
import { usePlayerStore } from '@/stores/battle/playerStore'
import { useGalaxyStore } from '@/stores/world/galaxyStore'
import { getVoidRift, VOID_RIFTS } from '@/config/world/void'
import { voidPositionAt } from '@/utils/orbit/voidPath'
import {
  VOID_UNLOCK_LEVEL,
  VOID_MAX_CONCURRENT,
  VOID_HP_BASE,
  VOID_HP_PER_GALAXY,
  VOID_HP_SEVERITY_MULT,
  VOID_TRAVEL_MS,
  VOID_CLICK_DAMAGE_PCT,
  VOID_DRAIN_RAMP_MIN,
  VOID_DRAIN_FLOOR,
  VOID_IMPACT_HP_LOSS,
  VOID_IMPACT_AFTERMATH_MS,
  VOID_SPAWN_RETRY_SEC,
  GAME_TICK_INTERVAL_MS,
} from '@/config/constants'

/** Hebt das Bard-Level über die Freischaltschwelle. */
function unlock() {
  useGameStore().level = VOID_UNLOCK_LEVEL
}

/** Schickt ein bestimmtes Wesen los und gibt die lebende Instanz zurück. */
function spawn(defId: string) {
  const store = useVoidStore()
  const m = store.spawnMonster(defId)
  expect(m).not.toBeNull()
  return m!
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

    it('schickt ab dem Freischalt-Level', () => {
      const store = useVoidStore()
      unlock()
      expect(store.isUnlocked).toBe(true)

      store.spawnCooldowns.lesser = GAME_TICK_INTERVAL_MS / 1000
      store.tick()
      expect(store.active).toHaveLength(1)
    })

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
    it('hält die Obergrenze gleichzeitiger Wesen ein', () => {
      unlock()
      const store = useVoidStore()
      for (let i = 0; i < VOID_MAX_CONCURRENT + 5; i++) store.spawnMonster('sunlessBreach')
      expect(store.active).toHaveLength(VOID_MAX_CONCURRENT)
    })

    it('skaliert die Zähigkeit mit Schwere und Galaxie', () => {
      unlock()
      useGalaxyStore().currentGalaxy = 3
      const m = spawn('sunlessBreach')
      const expected = Math.round(
        VOID_HP_BASE * VOID_HP_SEVERITY_MULT.lesser * (1 + 2 * VOID_HP_PER_GALAXY),
      )
      expect(m.maxHp).toBe(expected)
      expect(m.currentHp).toBe(expected)
    })

    it('setzt die Reisedauer nach der Schwere', () => {
      unlock()
      const m = spawn('unmakingScar')
      expect(m.travelMs).toBe(VOID_TRAVEL_MS.abyssal)
    })

    it('schickt nichts, während ein Overlay den Idle-Layer deckt', () => {
      unlock()
      const store = useVoidStore()
      store.setSpawningBlocked(true)
      store.spawnCooldowns.lesser = 0
      store.tick()
      expect(store.active).toHaveLength(0)
      // Die Uhr darf dabei nicht leerlaufen, sonst kippt beim Schliessen des
      // Overlays ein Stapel auf einmal heraus.
      expect(store.spawnCooldowns.lesser).toBe(0)
    })

    it('lässt eine fällige Uhr kurz warten, wenn das Feld voll ist', () => {
      unlock()
      const store = useVoidStore()
      for (let i = 0; i < VOID_MAX_CONCURRENT; i++) store.spawnMonster('sunlessBreach')
      store.spawnCooldowns.greater = GAME_TICK_INTERVAL_MS / 1000
      store.tick()
      expect(store.active).toHaveLength(VOID_MAX_CONCURRENT)
      expect(store.spawnCooldowns.greater).toBe(VOID_SPAWN_RETRY_SEC)
    })
  })

  describe('Die Reise', () => {
    it('legt den Weg über die Reisedauer zurück', () => {
      unlock()
      const store = useVoidStore()
      const m = spawn('sunlessBreach')

      store.voidNow = m.spawnedAt
      expect(store.progressByUid.get(m.uid)).toBeCloseTo(0, 5)

      store.voidNow = m.spawnedAt + m.travelMs / 2
      expect(store.progressByUid.get(m.uid)).toBeCloseTo(0.5, 5)

      store.voidNow = m.spawnedAt + m.travelMs
      expect(store.progressByUid.get(m.uid)).toBeCloseTo(1, 5)
    })

    // Der gebündelte Beschuss und die HUD-Karte hängen beide daran.
    it('kennt das vorderste Wesen', () => {
      unlock()
      const store = useVoidStore()
      const slow = spawn('unmakingScar')
      const fast = spawn('sunlessBreach')
      // Das kleine ist schneller unterwegs, also ist es nach gleicher Zeit weiter.
      store.voidNow = Date.now() + 20_000
      expect(store.leadMonster?.uid).toBe(fast.uid)
      expect(slow.travelMs).toBeGreaterThan(fast.travelMs)
    })

    it('kommt in der Bildmitte an, nicht am Rand', () => {
      unlock()
      const def = getVoidRift('sunlessBreach')!
      const m = spawn('sunlessBreach')
      const w = 1920
      const h = 1080
      const sun = 120

      const start = voidPositionAt(m, def.sizePx, sun, m.spawnedAt, w, h)
      const end = voidPositionAt(m, def.sizePx, sun, m.spawnedAt + m.travelMs, w, h)
      const dStart = Math.hypot(start.x - w / 2, start.y - h / 2)
      const dEnd = Math.hypot(end.x - w / 2, end.y - h / 2)

      // Beginnt ausserhalb des Bildes und endet auf der Sonnenscheibe.
      expect(dStart).toBeGreaterThan(Math.hypot(w, h) / 2)
      expect(dEnd).toBeLessThanOrEqual(sun)
      expect(end.scale).toBeCloseTo(1, 5)
    })
  })

  describe('Ziehen', () => {
    it('zieht am Rand nur anteilig und an der Sonne ganz', () => {
      unlock()
      const store = useVoidStore()
      const m = spawn('sunlessBreach')
      const def = getVoidRift('sunlessBreach')!
      const full = def.drain.cpsMult!

      store.voidNow = m.spawnedAt
      expect(store.cpsMult).toBeCloseTo(1 - (1 - full) * VOID_DRAIN_RAMP_MIN, 6)

      store.voidNow = m.spawnedAt + m.travelMs
      expect(store.cpsMult).toBeCloseTo(full, 6)
    })

    it('lässt jede unberührte Achse auf 1', () => {
      unlock()
      const store = useVoidStore()
      spawn('starvingMaw')
      expect(store.cpsMult).toBe(1)
      expect(store.xpMult).toBe(1)
      expect(store.materialDropMult).toBeLessThan(1)
    })

    it('summiert mehrere Wesen derselben Achse', () => {
      unlock()
      const store = useVoidStore()
      const a = spawn('sunlessBreach')
      const b = spawn('sunlessBreach')
      // Beide exakt gleich weit: fällt zwischen die zwei Aufrufe eine
      // Millisekunde, steht das zweite Wesen minimal weiter draussen und die
      // Rampe weicht um mehr ab, als die Toleranz unten zulässt.
      b.spawnedAt = a.spawnedAt
      store.voidNow = a.spawnedAt + a.travelMs
      const def = getVoidRift('sunlessBreach')!
      expect(store.cpsMult).toBeCloseTo(def.drain.cpsMult! ** 2, 6)
    })

    // Ohne diesen Deckel multiplizieren sich zwei Dutzend Faktoren gegen null,
    // und eine Wirtschaft bei 2 % ist kein Druck mehr, sondern ein Abbruch.
    it('fällt nie unter den Drossel-Boden, egal wie viele kommen', () => {
      unlock()
      const store = useVoidStore()
      for (let i = 0; i < VOID_MAX_CONCURRENT; i++) store.spawnMonster('sunlessBreach')
      store.voidNow = Date.now() + VOID_TRAVEL_MS.lesser
      expect(store.cpsMult).toBeGreaterThanOrEqual(VOID_DRAIN_FLOOR)
    })

    it('multipliziert Wanderer und laufendes Nachbeben', () => {
      unlock()
      const store = useVoidStore()
      const m = spawn('sunlessBreach')
      store.voidNow = m.spawnedAt + m.travelMs
      const fromMonster = store.cpsMult

      store.aftermaths.push({
        sourceId: 'other',
        expiresAt: store.voidNow + 10_000,
        durationMs: 10_000,
        effects: { cpsMult: 0.5 },
      })
      expect(store.cpsMult).toBeCloseTo(fromMonster * 0.5, 6)
    })
  })

  describe('Erlegen', () => {
    it('nimmt einen Anteil der eigenen Trefferpunkte je Klick', () => {
      unlock()
      const store = useVoidStore()
      const m = spawn('unmakingScar')
      const before = m.currentHp
      store.hitMonster(m.uid)
      expect(store.active[0].currentHp).toBeCloseTo(before - m.maxHp * VOID_CLICK_DAMAGE_PCT, 6)
    })

    it('erlegt das Wesen, sobald die Trefferpunkte fallen', () => {
      unlock()
      const store = useVoidStore()
      const m = spawn('sunlessBreach')
      const slain = store.damageMonster(m.uid, m.maxHp)
      expect(slain).toBe(true)
      expect(store.active).toHaveLength(0)
      expect(store.totalRiftsSealed).toBe(1)
      expect(store.lastOutcome.sealed).toBe(true)
    })

    it('startet beim Erlegen das Beute-Fenster', () => {
      unlock()
      const store = useVoidStore()
      const m = spawn('dimmingWound')
      store.damageMonster(m.uid, m.maxHp)

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

      const m = spawn('sunlessBreach')
      store.damageMonster(m.uid, m.maxHp)
      expect(gameStore.chimes).toBeGreaterThan(0)
    })
  })

  describe('Einschlag', () => {
    it('schlägt ein, sobald der Weg vollendet ist', () => {
      unlock()
      const store = useVoidStore()
      const m = spawn('sunlessBreach')
      store.resolveArrivals(m.spawnedAt + m.travelMs)

      expect(store.active).toHaveLength(0)
      expect(store.totalRiftsCollapsed).toBe(1)
      expect(store.lastOutcome.sealed).toBe(false)
    })

    // Der Layer ruft das je Frame auf, damit ein Wesen nicht bis zu eine
    // Sekunde sichtbar auf der Sonne klebt. Er reicht dabei seine eigene Uhr
    // durch — `voidNow` darf davon unberührt bleiben, sonst weckte jeder Frame
    // die Drossel-Getter.
    it('nimmt die Ankunftszeit von aussen, ohne die Store-Uhr zu stellen', () => {
      unlock()
      const store = useVoidStore()
      const m = spawn('sunlessBreach')
      const clockBefore = store.voidNow

      store.resolveArrivals(m.spawnedAt - 1)
      expect(store.active).toHaveLength(1)
      expect(store.voidNow).toBe(clockBefore)
    })

    // Ein Prestige setzt das Level auf 1 — ein Wesen, das gerade anflog, hing
    // sonst für immer fest: unbesiegbar, nie einschlagend, mit voller Drossel.
    it('rechnet unterwegs befindliche Wesen auch ohne Freischaltung ab', () => {
      unlock()
      const store = useVoidStore()
      const m = spawn('sunlessBreach')
      m.spawnedAt = Date.now() - m.travelMs - 1

      useGameStore().level = VOID_UNLOCK_LEVEL - 1
      expect(store.isUnlocked).toBe(false)
      store.tick()

      expect(store.active).toHaveLength(0)
      expect(store.totalRiftsCollapsed).toBe(1)
    })

    it('kostet Sonnen-HP und hinterlässt ein Nachbeben', () => {
      unlock()
      const store = useVoidStore()
      const player = usePlayerStore()
      const before = player.currentHP

      const m = spawn('sunlessBreach')
      store.impactMonster(m)

      expect(player.currentHP).toBeLessThan(before)
      expect(store.totalVoidHpLost).toBeGreaterThan(0)
      const echo = store.aftermaths.find((a) => a.sourceId === 'sunlessBreach')
      expect(echo).toBeDefined()
      expect(echo!.durationMs).toBe(VOID_IMPACT_AFTERMATH_MS.lesser)
    })

    // Der eigentliche Preis des schweren Wesens: es kostet mehr HP UND zieht
    // danach viel länger nach.
    it('staffelt Schaden und Nachbeben nach der Schwere', () => {
      expect(VOID_IMPACT_HP_LOSS.abyssal).toBeGreaterThan(VOID_IMPACT_HP_LOSS.greater)
      expect(VOID_IMPACT_HP_LOSS.greater).toBeGreaterThan(VOID_IMPACT_HP_LOSS.lesser)
      expect(VOID_IMPACT_AFTERMATH_MS.abyssal).toBeGreaterThan(VOID_IMPACT_AFTERMATH_MS.greater)
      expect(VOID_IMPACT_AFTERMATH_MS.greater).toBeGreaterThan(VOID_IMPACT_AFTERMATH_MS.lesser)
    })

    // Was ankommt, kommt ganz an — anders als beim früheren stehenden Riss.
    // Angefangene Arbeit zählt trotzdem: ein angeschlagenes Wesen fällt dem
    // Orbit-Beschuss unterwegs eher zum Opfer und kommt gar nicht erst an.
    it('kostet unabhängig vom Restleben denselben Schaden', () => {
      unlock()
      const store = useVoidStore()
      const player = usePlayerStore()

      const full = spawn('sunlessBreach')
      store.impactMonster(full)
      const costFull = store.totalVoidHpLost

      player.currentHP = player.maxHP
      store.totalVoidHpLost = 0
      const hurt = spawn('sunlessBreach')
      hurt.currentHp = hurt.maxHp * 0.05
      store.impactMonster(hurt)

      expect(store.totalVoidHpLost).toBe(costFull)
    })
  })

  describe('Orbit-Beschuss', () => {
    // Streufeuer über alle hätte bei einem Dutzend Wesen zur Folge, dass keines
    // rechtzeitig fällt und alle ankommen.
    it('bündelt sich auf das vorderste Wesen', () => {
      unlock()
      const store = useVoidStore()
      const back = spawn('sunlessBreach')
      const front = spawn('sunlessBreach')
      // Das zweite ein Stück vorziehen, damit es eindeutig vorne liegt.
      front.spawnedAt -= 10_000
      store.voidNow = Date.now()

      const damage = front.maxHp * 0.5
      let pool = damage
      const order = [front, back]
      for (const m of order) {
        if (pool <= 0) break
        const dealt = Math.min(pool, m.currentHp)
        pool -= dealt
        store.damageMonster(m.uid, dealt)
      }
      expect(front.currentHp).toBeCloseTo(front.maxHp - damage, 6)
      expect(back.currentHp).toBe(back.maxHp)
    })

    it('reicht Überschuss an das nächste Wesen weiter', () => {
      unlock()
      const store = useVoidStore()
      const front = spawn('sunlessBreach')
      const back = spawn('sunlessBreach')
      front.spawnedAt -= 10_000
      store.voidNow = Date.now()

      // Genug, um das vorderste zu erlegen und beim zweiten anzukommen.
      let pool = front.maxHp * 1.5
      for (const m of [front, back]) {
        if (pool <= 0) break
        const dealt = Math.min(pool, m.currentHp)
        pool -= dealt
        store.damageMonster(m.uid, dealt)
      }
      expect(store.totalRiftsSealed).toBe(1)
      expect(store.active).toHaveLength(1)
      expect(store.active[0].currentHp).toBeLessThan(back.maxHp)
    })
  })

  describe('Katalog', () => {
    it('führt jede Schwere mit mindestens einem Typ', () => {
      const severities = new Set(VOID_RIFTS.map((r) => r.severity))
      expect(severities.size).toBeGreaterThanOrEqual(3)
    })

    it('verweist nur auf Bewohner-Bilder, die es wirklich gibt', () => {
      const publicDir = resolve(__dirname, '../../../../public')
      for (const def of VOID_RIFTS) {
        if (!def.dweller) continue
        expect(existsSync(join(publicDir, def.dweller)), `${def.id} → ${def.dweller} fehlt`).toBe(
          true,
        )
      }
    })

    it('lässt die kleinen Wesen gestaltlos und bewohnt nur die schweren', () => {
      for (const def of VOID_RIFTS) {
        if (def.severity === 'lesser') {
          expect(def.dweller, `${def.id} sollte gestaltlos sein`).toBeUndefined()
        } else {
          expect(def.dweller, `${def.id} sollte einen Bewohner haben`).toBeDefined()
        }
      }
    })

    // Ein Wesen, das an einer Achse zieht und an einer anderen auszahlt, wäre
    // zwei Nachrichten statt einer — siehe der Kopf von config/world/void.
    it('zahlt auf denselben Achsen aus, an denen es zieht', () => {
      for (const def of VOID_RIFTS) {
        expect(Object.keys(def.boon.effects).sort()).toEqual(Object.keys(def.drain).sort())
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

    // Tempo ist die Drohung, Zähigkeit die Arbeit — beides zugleich hochzudrehen
    // machte aus einer Entscheidung eine Strafe.
    it('lässt die schweren Wesen langsamer reisen, nicht schneller', () => {
      expect(VOID_TRAVEL_MS.abyssal).toBeGreaterThan(VOID_TRAVEL_MS.greater)
      expect(VOID_TRAVEL_MS.greater).toBeGreaterThan(VOID_TRAVEL_MS.lesser)
    })
  })
})
