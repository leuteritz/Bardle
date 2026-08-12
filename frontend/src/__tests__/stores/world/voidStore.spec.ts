import { existsSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { setActivePinia, createPinia } from 'pinia'
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { useVoidStore } from '@/stores/world/voidStore'
import { useGameStore } from '@/stores/core/gameStore'
import { usePlayerStore } from '@/stores/battle/playerStore'
import { useCombatStore } from '@/stores/battle/combatStore'
import { useRoleBehaviorStore } from '@/stores/battle/roleBehaviorStore'
import { useBardAbilityStore } from '@/stores/progression/bardAbilityStore'
import { useGalaxyStore } from '@/stores/world/galaxyStore'
import { usePlanetShopStore, isPlanetDown } from '@/stores/world/planetShopStore'
import { getVoidRift, VOID_RIFTS } from '@/config/world/void'
import { voidPositionAt } from '@/utils/orbit/voidPath'
import { hudFieldMetrics } from '@/utils/ui/hudField'
import { activeChampionBodies, activePlayerPlanetPositions } from '@/utils/orbit/liveState'
import { contactCooldownCount, resetContactCooldowns } from '@/utils/orbit/voidContact'
import type { ChampionRole, VoidMonster } from '@/types'
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
  VOID_IMPACT_MEEP_LOSS_PCT,
  VOID_IMPACT_MEEP_LOSS_MIN,
  VOID_SPAWN_RETRY_SEC,
  VOID_ROLE_ABILITIES,
  VOID_CONTACT_REARM_MS,
  VOID_PLANET_CONTACT_REARM_MS,
  VOID_PLANET_RIDER,
  VOID_TOP_BLOCK_MS,
  VOID_MID_CURSE_MS,
  VOID_MID_CURSE_AMP,
  VOID_ADC_FOCUS_MS,
  VOID_SUPPORT_WARD_MS,
  VOID_JUNGLE_STRIKE_PCT,
  VOID_JUNGLE_EXECUTE_PCT,
  ROLE_SUPPORT_HEAL_AMOUNT,
  ROLES,
  PLANET_ROLES_LIST,
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

/**
 * Setzt einen Orbit-Körper GENAU dorthin, wo das Wesen zu diesem Zeitpunkt
 * steht — mit denselben Argumenten, mit denen der Store die Position rechnet.
 * Ein von Hand gesetzter Punkt träfe je nach jsdom-Viewport mal und mal nicht.
 */
function placeBodyOn(
  m: VoidMonster,
  kind: 'champion' | 'planet',
  key: string,
  now: number,
  radius = 60,
) {
  const def = getVoidRift(m.defId)!
  const metrics = hudFieldMetrics(null)
  const pos = voidPositionAt(
    m,
    def.sizePx,
    usePlanetShopStore().orbitSunRadius,
    now,
    metrics.viewportW,
    metrics.viewportH,
    metrics,
  )
  const body = { cx: pos.x, cy: pos.y, isForeground: true, r: radius }
  if (kind === 'champion') activeChampionBodies.set(key as ChampionRole, body)
  else activePlayerPlanetPositions.set(key, body)
}

describe('voidStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    // Modul-Zustand ausserhalb von Pinia — er überlebt sonst den Testfall.
    activeChampionBodies.clear()
    activePlayerPlanetPositions.clear()
    resetContactCooldowns()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
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

      // Beginnt am Bildrand und endet auf der Sonnenscheibe. Wie weit der
      // Startpunkt genau von der Mitte weg ist, hängt am Anflugwinkel — die
      // Bahngeometrie prüft `utils/orbit/voidPath.spec.ts`.
      expect(dStart).toBeGreaterThan(dEnd)
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

    // Der zweite Preis neben den HP, und der schwerere: Sonnen-HP regenerieren
    // von selbst, anstehende Meeps nicht.
    it('frisst anstehende Meeps und meldet sie im Ausgang', () => {
      unlock()
      const store = useVoidStore()
      const gameStore = useGameStore()
      gameStore.chimesForNextUniverse = 400 * 100 // 20 anstehende Meeps
      const before = gameStore.pendingMeeps
      expect(before).toBe(20)

      store.impactMonster(spawn('sunlessBreach'))

      expect(gameStore.pendingMeeps).toBeLessThan(before)
      expect(store.lastOutcome.meepsLost).toBe(before - gameStore.pendingMeeps)
      expect(gameStore.totalMeepsDevoured).toBe(store.lastOutcome.meepsLost)
    })

    // Wer nichts im Feuer hat, verliert nichts — das Frühspiel wird vom Void
    // bedroht, aber nicht bestraft.
    it('kostet ohne Ernte nur HP, keine Meeps', () => {
      unlock()
      const store = useVoidStore()
      const gameStore = useGameStore()
      const player = usePlayerStore()
      gameStore.chimesForNextUniverse = 0
      const hpBefore = player.currentHP

      store.impactMonster(spawn('sunlessBreach'))

      expect(player.currentHP).toBeLessThan(hpBefore)
      expect(store.lastOutcome.meepsLost).toBe(0)
      expect(gameStore.meepsDevoured).toBe(0)
    })

    it('ein erlegtes Wesen frisst nichts', () => {
      unlock()
      const store = useVoidStore()
      const gameStore = useGameStore()
      gameStore.chimesForNextUniverse = 400 * 100
      const before = gameStore.pendingMeeps

      store.slayMonster(spawn('sunlessBreach'))

      expect(store.lastOutcome.sealed).toBe(true)
      expect(store.lastOutcome.meepsLost).toBe(0)
      // Die Beute kann Chimes gutschreiben, aber nichts wegnehmen.
      expect(gameStore.pendingMeeps).toBeGreaterThanOrEqual(before)
      expect(gameStore.meepsDevoured).toBe(0)
    })

    it('staffelt auch den Meep-Frass nach der Schwere', () => {
      expect(VOID_IMPACT_MEEP_LOSS_PCT.abyssal).toBeGreaterThan(VOID_IMPACT_MEEP_LOSS_PCT.greater)
      expect(VOID_IMPACT_MEEP_LOSS_PCT.greater).toBeGreaterThan(VOID_IMPACT_MEEP_LOSS_PCT.lesser)
      expect(VOID_IMPACT_MEEP_LOSS_MIN.abyssal).toBeGreaterThan(VOID_IMPACT_MEEP_LOSS_MIN.greater)
      expect(VOID_IMPACT_MEEP_LOSS_MIN.greater).toBeGreaterThan(VOID_IMPACT_MEEP_LOSS_MIN.lesser)
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

  // ── Berührung ─────────────────────────────────────────────────────────────
  // Der Orbit steht dem Void körperlich im Weg. Die Bahnradien geben die
  // Reihenfolge vor — Support/ADC ganz aussen, dann Mid, dann Jungle, zuletzt
  // Top —, und jede Rolle tut etwas anderes.
  describe('Berührung', () => {
    it('feuert je Paar nur einmal je Sperrzeit, egal wie oft gefragt wird', () => {
      unlock()
      const store = useVoidStore()
      const m = spawn('sunlessBreach')
      const now = Date.now()
      placeBodyOn(m, 'champion', 'mid', now)

      // Sechzig Frames innerhalb einer Sekunde. Ohne die Paar-Sperre stünde der
      // Fluch danach sechzigmal neu — und das Wesen wäre dauerhaft verflucht,
      // statt es für eine begrenzte Zeit zu sein.
      for (let i = 0; i < 60; i++) store.resolveOrbitContacts(now + i)
      expect(m.cursedUntil).toBe(now + VOID_MID_CURSE_MS)
    })

    it('lässt Frame-Takt und Sekundentakt nicht doppelt zünden', () => {
      unlock()
      const store = useVoidStore()
      const m = spawn('sunlessBreach')
      const now = Date.now()
      placeBodyOn(m, 'champion', 'adc', now)

      store.resolveOrbitContacts(now)
      const afterFirst = m.currentHp
      expect(afterFirst).toBeLessThan(m.maxHp)

      // Der Sekundentakt ruft denselben Auflöser — er darf den Burst nicht
      // ein zweites Mal abrechnen.
      store.tick()
      expect(m.currentHp).toBe(afterFirst)
    })

    it('hält ein Wesen an, ohne seinen Fortschritt zurückzudrehen', () => {
      unlock()
      const store = useVoidStore()
      const m = spawn('sunlessBreach')
      m.spawnedAt -= 20_000
      store.voidNow = Date.now()
      const before = store.progressByUid.get(m.uid)!

      m.blockedUntil = Date.now() + VOID_TOP_BLOCK_MS
      // Eine Sekunde Wanduhr weiter, und der Halte-Tick schiebt die Startmarke
      // im selben Takt mit: der Bruch bleibt stehen, er springt nicht zurück.
      store.voidNow = Date.now() + GAME_TICK_INTERVAL_MS
      store._tickContactHolds()
      const after = (store.voidNow - m.spawnedAt) / m.travelMs

      expect(after).toBeCloseTo(before, 6)
      expect(after).toBeGreaterThanOrEqual(0)
    })

    it('verschiebt spawnedAt nicht doppelt, während die Stase läuft', () => {
      unlock()
      const store = useVoidStore()
      const m = spawn('sunlessBreach')
      m.blockedUntil = Date.now() + VOID_TOP_BLOCK_MS

      // Bard R schiebt bereits JEDES spawnedAt um einen vollen Takt, und sie
      // läuft im selben gameStore-Tick VOR uns. Ein zweites Schieben liesse
      // ein gehaltenes Wesen rückwärts laufen.
      useBardAbilityStore().stasisUntil = Date.now() + 10_000
      useBardAbilityStore().abilityNow = Date.now()

      const before = m.spawnedAt
      store.voidNow = Date.now()
      store._tickContactHolds()
      expect(m.spawnedAt).toBe(before)
    })

    it('schiebt die Ankunft nach hinten, statt sie zu verhindern', () => {
      unlock()
      const store = useVoidStore()
      const m = spawn('sunlessBreach')
      const arrivalBefore = m.spawnedAt + m.travelMs

      m.blockedUntil = Date.now() + VOID_TOP_BLOCK_MS
      store.voidNow = Date.now()
      store._tickContactHolds()

      expect(m.spawnedAt + m.travelMs).toBe(arrivalBefore + GAME_TICK_INTERVAL_MS)
      expect(store.active).toHaveLength(1)
    })

    it('bremst ein verflucht-langsames Wesen, ohne es ganz anzuhalten', () => {
      unlock()
      const store = useVoidStore()
      const m = spawn('sunlessBreach')
      m.slowedUntil = Date.now() + VOID_MID_CURSE_MS
      const before = m.spawnedAt

      store.voidNow = Date.now()
      store._tickContactHolds()

      const shift = m.spawnedAt - before
      expect(shift).toBeGreaterThan(0)
      expect(shift).toBeLessThan(GAME_TICK_INTERVAL_MS)
    })

    it('nimmt ein gewardetes Wesen aus der Drossel, lässt es aber weiterlaufen', () => {
      unlock()
      const store = useVoidStore()
      const m = spawn('sunlessBreach')
      m.spawnedAt -= VOID_TRAVEL_MS.lesser / 2
      store.voidNow = Date.now()
      expect(store.cpsMult).toBeLessThan(1)

      // Über die reaktive Liste setzen, nicht über die rohe Instanz: der
      // Drossel-Getter ist gecacht und würde eine Mutation am Rohobjekt nicht
      // bemerken.
      store.active[0].wardedUntil = store.voidNow + VOID_SUPPORT_WARD_MS
      expect(store.cpsMult).toBe(1)

      // Es zieht nicht mehr — aufgehalten ist es deswegen nicht.
      const progress = store.progressByUid.get(m.uid)!
      expect(progress).toBeGreaterThan(0.4)
      store.resolveArrivals(m.spawnedAt + m.travelMs)
      expect(store.active).toHaveLength(0)
    })

    it('gibt die Führung ab, solange es aufgehalten wird', () => {
      unlock()
      const store = useVoidStore()
      const held = spawn('sunlessBreach')
      const runner = spawn('sunlessBreach')
      held.spawnedAt -= 20_000
      runner.spawnedAt -= 19_000
      store.voidNow = Date.now()
      expect(store.leadMonster?.uid).toBe(held.uid)

      // Das vordere anhalten: das nächste zieht vorbei, und mit ihm springt der
      // gesamte Orbit-Beschuss um — ohne eine Zeile Zusatzcode.
      held.blockedUntil = store.voidNow + 60_000
      for (let i = 1; i <= 3; i++) {
        store.voidNow = Date.now() + i * GAME_TICK_INTERVAL_MS
        store._tickContactHolds()
      }
      expect(store.leadMonster?.uid).toBe(runner.uid)
    })

    it('verstärkt jeden Schaden am verfluchten Wesen und reicht den Überschuss exakt weiter', () => {
      unlock()
      const store = useVoidStore()
      const front = spawn('sunlessBreach')
      const back = spawn('sunlessBreach')
      front.spawnedAt -= 10_000
      store.voidNow = Date.now()
      front.cursedUntil = Date.now() + VOID_MID_CURSE_MS

      // Genau so viel Rohschaden, wie es braucht, um das verfluchte vordere
      // Wesen zu erlegen — plus einen bekannten Rest für das zweite. Ohne die
      // Deckelung auf currentHp/amp ginge dieser Rest um genau den
      // Fluchfaktor daneben.
      const rest = 40
      let pool = front.maxHp / VOID_MID_CURSE_AMP + rest
      for (const m of [front, back]) {
        if (pool <= 0) break
        const dealt = Math.min(
          pool,
          m.currentHp / (m.cursedUntil > Date.now() ? VOID_MID_CURSE_AMP : 1),
        )
        pool -= dealt
        store.damageMonster(m.uid, dealt)
      }
      expect(store.totalRiftsSealed).toBe(1)
      expect(store.active).toHaveLength(1)
      expect(store.active[0].currentHp).toBeCloseTo(back.maxHp - rest, 6)
    })

    it('nimmt beim Klick verstärkten Schaden, solange der Fluch steht', () => {
      unlock()
      const store = useVoidStore()
      const m = spawn('sunlessBreach')
      m.cursedUntil = Date.now() + VOID_MID_CURSE_MS
      store.hitMonster(m.uid)
      expect(m.currentHp).toBeCloseTo(
        m.maxHp - m.maxHp * VOID_CLICK_DAMAGE_PCT * VOID_MID_CURSE_AMP,
        6,
      )
    })

    it('lenkt den Beschuss auf das markierte Wesen, nicht auf das vorderste', () => {
      unlock()
      const store = useVoidStore()
      const front = spawn('sunlessBreach')
      const marked = spawn('sunlessBreach')
      front.spawnedAt -= 20_000
      store.voidNow = Date.now()
      marked.focusedUntil = store.voidNow + VOID_ADC_FOCUS_MS

      // Der Pool kommt aus zwei fremden Stores; hier zählt allein, in welcher
      // Reihenfolge applyOrbitPressure die Wesen bedient.
      vi.spyOn(useCombatStore(), 'fullOrbitDps').mockReturnValue(marked.maxHp * 0.5)
      store.applyOrbitPressure()

      expect(marked.currentHp).toBeLessThan(marked.maxHp)
      expect(front.currentHp).toBe(front.maxHp)
    })

    it('erlegt unter der Hinrichtungsschwelle, darüber nur Schaden', () => {
      unlock()
      const store = useVoidStore()
      const now = Date.now()

      const healthy = spawn('sunlessBreach')
      placeBodyOn(healthy, 'champion', 'jungle', now)
      store.resolveOrbitContacts(now)
      expect(store.active).toHaveLength(1)
      expect(healthy.currentHp).toBeCloseTo(
        healthy.maxHp - healthy.maxHp * VOID_JUNGLE_STRIKE_PCT,
        6,
      )

      // Dasselbe Wesen, diesmal angeschlagen unter die Schwelle.
      store.clearAll()
      const wounded = spawn('sunlessBreach')
      wounded.currentHp = wounded.maxHp * VOID_JUNGLE_EXECUTE_PCT * 0.5
      placeBodyOn(wounded, 'champion', 'jungle', now)
      store.resolveOrbitContacts(now)
      expect(store.active).toHaveLength(0)
      expect(store.totalRiftsSealed).toBe(1)
    })

    it('bricht Tops Schild und stellt es erst nach dem Wiederaufbau', () => {
      unlock()
      const store = useVoidStore()
      const rb = useRoleBehaviorStore()
      rb.tankShieldActive = true
      const now = Date.now()

      const first = spawn('sunlessBreach')
      placeBodyOn(first, 'champion', 'top', now)
      store.resolveOrbitContacts(now)

      expect(first.blockedUntil).toBe(now + VOID_TOP_BLOCK_MS)
      expect(rb.tankShieldActive).toBe(false)
      expect(rb.tankShieldBrokenMs).toBeGreaterThan(0)

      // Ohne Schild hält Top nichts mehr auf — EIN Wesen je Wiederaufbau,
      // egal wie viele kommen.
      const second = spawn('sunlessBreach')
      placeBodyOn(second, 'champion', 'top', now)
      store.resolveOrbitContacts(now)
      expect(second.blockedUntil).toBe(0)
    })

    it('verbrennt die Sperre nicht, wenn Tops Schild gerade unten ist', () => {
      unlock()
      const store = useVoidStore()
      const rb = useRoleBehaviorStore()
      rb.tankShieldActive = false
      const now = Date.now()
      const m = spawn('sunlessBreach')
      placeBodyOn(m, 'champion', 'top', now)

      store.resolveOrbitContacts(now)
      expect(m.blockedUntil).toBe(0)

      // Schild wieder da, gleiche Sekunde: der gescheiterte Versuch darf das
      // Wesen nicht sekundenlang unberührbar gemacht haben.
      rb.tankShieldActive = true
      store.resolveOrbitContacts(now)
      expect(m.blockedUntil).toBe(now + VOID_TOP_BLOCK_MS)
    })

    it('wardet und heilt, ohne dem Wesen zu schaden', () => {
      unlock()
      const store = useVoidStore()
      const player = usePlayerStore()
      player.currentHP = player.maxHP - ROLE_SUPPORT_HEAL_AMOUNT
      const now = Date.now()
      const m = spawn('sunlessBreach')
      placeBodyOn(m, 'champion', 'support', now)

      store.resolveOrbitContacts(now)
      expect(m.wardedUntil).toBe(now + VOID_SUPPORT_WARD_MS)
      expect(m.currentHp).toBe(m.maxHp)
      expect(player.currentHP).toBe(player.maxHP)
    })

    it('zerstört einen Planeten nie durch Berührung', () => {
      unlock()
      const store = useVoidStore()
      const shop = usePlanetShopStore()
      const slot = shop.slots[0]
      slot.purchased = true
      slot.role = 'turret_planet'
      slot.currentHp = 1

      const now = Date.now()
      const m = spawn('unmakingScar')
      placeBodyOn(m, 'planet', slot.id, now)

      // Hämmern, so oft die Sperre es zulässt — der Boden bei 1 HP hält.
      for (let i = 0; i < 20; i++) {
        store.resolveOrbitContacts(now + i * VOID_PLANET_CONTACT_REARM_MS * 2)
        if (store.active.length === 0) spawn('unmakingScar')
        placeBodyOn(store.active[0], 'planet', slot.id, now)
      }
      expect(slot.currentHp).toBeGreaterThanOrEqual(1)
      expect(isPlanetDown(slot)).toBe(false)
      expect(slot.downUntilMs).toBe(0)
    })

    it('lässt einen Aegis-Planeten weder austeilen noch einstecken', () => {
      unlock()
      const store = useVoidStore()
      const shop = usePlanetShopStore()
      const slot = shop.slots[0]
      slot.purchased = true
      slot.role = 'shield_barrier'
      const hpBefore = slot.currentHp

      const now = Date.now()
      const m = spawn('unmakingScar')
      placeBodyOn(m, 'planet', slot.id, now)
      store.resolveOrbitContacts(now)

      expect(slot.currentHp).toBe(hpBefore)
      expect(m.currentHp).toBe(m.maxHp)
    })

    it('wirft ein Wesen am Relay zurück, ohne den Fortschritt unter null zu drücken', () => {
      unlock()
      const store = useVoidStore()
      const shop = usePlanetShopStore()
      const slot = shop.slots[0]
      slot.purchased = true
      slot.role = 'expedition_relay'

      const now = Date.now()
      const m = spawn('sunlessBreach')
      placeBodyOn(m, 'planet', slot.id, now)
      store.resolveOrbitContacts(now)

      // Frisch aufgerissen: der Rückwurf darf spawnedAt nicht in die Zukunft
      // schieben, sonst läuft der Fortschritt ins Negative.
      expect(m.spawnedAt).toBeLessThanOrEqual(now)
      store.voidNow = now
      expect(store.progressByUid.get(m.uid)!).toBeGreaterThanOrEqual(0)
    })

    it('berührt nichts, was hinter der Sonne steht', () => {
      unlock()
      const store = useVoidStore()
      const now = Date.now()
      const m = spawn('sunlessBreach')
      placeBodyOn(m, 'champion', 'mid', now)
      activeChampionBodies.get('mid')!.isForeground = false

      store.resolveOrbitContacts(now)
      expect(m.cursedUntil).toBe(0)
    })

    it('räumt die Sperrzeiten erlegter Wesen wieder ab', () => {
      unlock()
      const store = useVoidStore()
      const now = Date.now()
      for (let i = 0; i < 30; i++) {
        const m = spawn('sunlessBreach')
        placeBodyOn(m, 'champion', 'mid', now)
        store.resolveOrbitContacts(now)
        store.slayMonster(m)
      }
      expect(contactCooldownCount()).toBeGreaterThan(0)
      store.tick()
      expect(contactCooldownCount()).toBe(0)
    })

    it('nennt für jede Rolle ein Berührungsverhalten', () => {
      for (const role of ROLES) {
        expect(VOID_ROLE_ABILITIES[role.key]?.name, `${role.key} ohne Verb`).toBeTruthy()
        expect(VOID_CONTACT_REARM_MS[role.key], `${role.key} ohne Sperrzeit`).toBeGreaterThan(0)
      }
    })

    it('nennt für jede Planetenrolle einen Rider', () => {
      for (const planetRole of PLANET_ROLES_LIST) {
        const rider = VOID_PLANET_RIDER[planetRole.id]
        expect(rider, `${planetRole.id} ohne Rider`).toBeDefined()
        expect(rider.damageMult).toBeGreaterThanOrEqual(0)
      }
    })

    // Die Sperre je Paar muss länger stehen als die Wirkung, die sie auslöst —
    // sonst frischt ein Champion, der eine Weile mitläuft, seinen eigenen
    // Effekt dauernd auf, und aus einem Moment wird ein Dauerzustand.
    it('hält jede Sperrzeit länger als die Wirkung, die sie auslöst', () => {
      expect(VOID_CONTACT_REARM_MS.top).toBeGreaterThan(VOID_TOP_BLOCK_MS)
      expect(VOID_CONTACT_REARM_MS.mid).toBeGreaterThan(VOID_MID_CURSE_MS)
      expect(VOID_CONTACT_REARM_MS.adc).toBeGreaterThan(VOID_ADC_FOCUS_MS)
      expect(VOID_CONTACT_REARM_MS.support).toBeGreaterThan(VOID_SUPPORT_WARD_MS)
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
