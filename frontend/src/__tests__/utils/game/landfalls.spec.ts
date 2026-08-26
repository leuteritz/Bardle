import { describe, it, expect } from 'vitest'
import {
  landfallCountFor,
  landfallChanceFor,
  landfallOnLeg,
  landfallsOfRun,
  landfallWorldPos,
  landfallWindowMs,
  landfallMarks,
} from '@/utils/game/landfalls'
import { galaxyDepth } from '@/utils/game/galaxyDepth'
import { generateGalaxyDots } from '@/components/bottom/minimap/minimapGalaxyGeometry'
import { coreGateClearance, GALAXY_PLATE_REF_W } from '@/utils/fx/galaxyPlate'
import { LANDFALLS, unlockedLandfalls } from '@/config/world/landfalls'
import {
  LANDFALL_UNLOCK_GALAXY,
  LANDFALL_MAX,
  LANDFALL_T_MIN,
  LANDFALL_T_MAX,
  LANDFALL_BOW_MIN,
  LANDFALL_BOW_MAX,
  LANDFALL_WINDOW_MIN_MS,
  LANDFALL_WINDOW_MAX_MS,
  GALAXY_STARS_BASE_REQUIRED,
  GALAXY_STARS_MAX,
  CHAMPION_TRAVEL_BASE_MS,
  CHAMPION_TRAVEL_SCALE_MS,
  CHAMPION_TRAVEL_MAX_MS,
  FORGE_MIN_CHAMPION_TRAVEL_MULT,
  SOLAR_MAX_LEVELS,
  SOLAR_CPS_FLIGHT_BONUS,
  VOYAGE_MAP_HISTORY_SCALE,
  VOYAGE_MAP_ASPECT_MAX,
  VOYAGE_GATE_GAP_PX,
  CORE_GATE_MOUTH_R,
  CORE_GATE_CROWN_SPAN,
} from '@/config/constants'

/**
 * Landfalls sind ABGELEITET: Lage und Art stehen nirgends im Spielstand,
 * sondern fallen aus `mapSeed` plus Etappennummer. Diese Datei hält die
 * Eigenschaften fest, auf denen das steht.
 */
describe('Landfalls — Platzierung', () => {
  const plannedLegs = (g: number) =>
    Math.min(GALAXY_STARS_BASE_REQUIRED + (g - 1), GALAXY_STARS_MAX) + 1

  it('Galaxie 1 bleibt leer — der erste Lauf liest sich als sauberer Anfang', () => {
    expect(landfallCountFor(1)).toBe(0)
    for (let leg = 0; leg < 8; leg++) {
      expect(landfallOnLeg(12345, 1, leg, plannedLegs(1))).toBeNull()
    }
  })

  it('die Zahl wächst und sättigt beim Deckel', () => {
    expect(landfallCountFor(LANDFALL_UNLOCK_GALAXY)).toBe(1)
    let vorher = 0
    for (let g = 1; g <= 60; g++) {
      const n = landfallCountFor(g)
      expect(n).toBeGreaterThanOrEqual(vorher) // monoton
      expect(n).toBeLessThanOrEqual(LANDFALL_MAX)
      vorher = n
    }
    expect(landfallCountFor(60)).toBe(LANDFALL_MAX)
  })

  it('spät trägt JEDE geplante Etappe einen Ort', () => {
    // 8 Orte auf 8 Etappen (7 Sterne + Kernflug) → Chance 1.
    const g = 30
    expect(landfallChanceFor(g, plannedLegs(g))).toBe(1)
    for (let leg = 0; leg < plannedLegs(g); leg++) {
      expect(landfallOnLeg(777, g, leg, plannedLegs(g))).not.toBeNull()
    }
  })

  /**
   * Der Nenner ist die GEPLANTE Etappenzahl, nicht die tatsächliche. Ein
   * verlorener Stern hängt eine Etappe an; verdünnte er die Chance, bekäme
   * ausgerechnet der längere Lauf WENIGER Orte.
   */
  it('ein verlorener Stern nimmt keine Orte weg, er legt einen dazu', () => {
    const g = 30
    const geplant = plannedLegs(g)
    const sauber = landfallsOfRun(4242, g, geplant, geplant)
    const mitVerlust = landfallsOfRun(4242, g, geplant, geplant + 2)
    expect(mitVerlust.length).toBeGreaterThanOrEqual(sauber.length)
    // und der gemeinsame Anfang ist Zeichen für Zeichen derselbe
    expect(mitVerlust.slice(0, sauber.length)).toEqual(sauber)
  })

  it('ist deterministisch in mapSeed und Galaxie', () => {
    const a = landfallsOfRun(9001, 12, 8, 9)
    const b = landfallsOfRun(9001, 12, 8, 9)
    expect(a).toEqual(b)
    expect(landfallsOfRun(9002, 12, 8, 9)).not.toEqual(a)
  })

  it('liegt nie am Anfang und nie am Ende einer Etappe', () => {
    // Dort stehen Abflug und Ankunft; ein Ort genau darauf verschwindet dahinter.
    for (let seed = 1; seed <= 60; seed++) {
      for (const p of landfallsOfRun(seed * 31, 40, 8, 9)) {
        expect(p.t).toBeGreaterThanOrEqual(LANDFALL_T_MIN)
        expect(p.t).toBeLessThanOrEqual(LANDFALL_T_MAX)
      }
    }
  })

  it('der Bogen hat immer Betrag und Richtung', () => {
    let links = 0
    let rechts = 0
    for (let seed = 1; seed <= 80; seed++) {
      for (const p of landfallsOfRun(seed * 17, 40, 8, 9)) {
        expect(Math.abs(p.bow)).toBeGreaterThanOrEqual(LANDFALL_BOW_MIN)
        expect(Math.abs(p.bow)).toBeLessThanOrEqual(LANDFALL_BOW_MAX)
        if (p.bow < 0) links++
        else rechts++
      }
    }
    // Beide Seiten kommen vor — ein einseitiger Versatz sähe wie ein Fehler aus.
    expect(links).toBeGreaterThan(0)
    expect(rechts).toBeGreaterThan(0)
  })

  it('zieht nur aus dem, was bei dieser Galaxie offen ist', () => {
    for (const g of [2, 5, 12, 40]) {
      const offen = new Set(unlockedLandfalls(g).map((d) => d.id))
      expect(offen.size).toBeGreaterThan(0)
      for (const p of landfallsOfRun(555, g, 8, 9)) {
        expect(offen.has(p.kind)).toBe(true)
      }
    }
  })

  it('jeder Katalogeintrag ist erreichbar und wohlgeformt', () => {
    // Eine Art, die niemand ziehen kann, ist ein toter Datensatz.
    for (const d of LANDFALLS) {
      expect(d.weight).toBeGreaterThan(0)
      expect(d.unlockGalaxy).toBeGreaterThanOrEqual(LANDFALL_UNLOCK_GALAXY)
      expect(d.icon).toMatch(/^[a-z0-9-]+:[a-z0-9-]+$/)
      expect(d.name.length).toBeGreaterThan(0)
    }
    expect(new Set(LANDFALLS.map((d) => d.id)).size).toBe(LANDFALLS.length)
  })

  /**
   * Die Zusicherung, an der die ganze Mechanik hängt: das Fenster endet, BEVOR
   * der Stern da ist. Sonst steht der Ort neben dem Stern, und der Stern gewinnt
   * immer.
   *
   * Gerechnet gegen die kürzeste Etappe, die überhaupt einen Ort tragen kann —
   * Galaxie `LANDFALL_UNLOCK_GALAXY` —, und zwar in ihrer kürzestmöglichen
   * Fassung: `flightSpeedMultiplier` (bis ×1,6) und der Forge-Faktor
   * (`FORGE_MIN_CHAMPION_TRAVEL_MULT`) stauchen sie zusammen.
   */
  it('das Fenster endet vor der Ankunft — auch bei voll gebuffter Reise', () => {
    const restAnteil = 1 - LANDFALL_T_MAX
    // Die kürzeste Etappe, die überhaupt einen Ort tragen kann: Galaxie
    // LANDFALL_UNLOCK_GALAXY, gestaucht von flightSpeedMultiplier (Deckel ×1,6)
    // und dem Forge-Faktor.
    const flugDeckel = 1 + SOLAR_MAX_LEVELS * SOLAR_CPS_FLIGHT_BONUS
    const roh = Math.min(
      CHAMPION_TRAVEL_MAX_MS,
      CHAMPION_TRAVEL_BASE_MS + galaxyDepth(LANDFALL_UNLOCK_GALAXY) * CHAMPION_TRAVEL_SCALE_MS,
    )
    for (const flug of [1, flugDeckel]) {
      const kuerzeste = (roh / flug) * FORGE_MIN_CHAMPION_TRAVEL_MULT
      expect(landfallWindowMs(kuerzeste)).toBeLessThanOrEqual(kuerzeste * restAnteil)
    }

    // Der Anteil trägt für sich genommen immer (0,16 < 0,32) — brechen kann nur
    // der BODEN, und zwar unterhalb dieser Etappendauer. Sie muss mit Luft unter
    // der kürzesten realen Etappe liegen, sonst reicht das Fenster in die
    // Ankunft, sobald jemand einen Reise-Buff nachlegt.
    const bodenGrenzeMs = LANDFALL_WINDOW_MIN_MS / restAnteil
    const kuerzesteReal = (roh / flugDeckel) * FORGE_MIN_CHAMPION_TRAVEL_MULT
    expect(bodenGrenzeMs).toBeLessThan(kuerzesteReal)

    // Und auf der längsten Etappe wird daraus keine zweite Idle-Uhr.
    expect(landfallWindowMs(CHAMPION_TRAVEL_MAX_MS)).toBeLessThanOrEqual(LANDFALL_WINDOW_MAX_MS)
    expect(landfallWindowMs(1)).toBe(LANDFALL_WINDOW_MIN_MS)
  })
})

describe('Landfalls — Weltposition', () => {
  it('liegt auf der Sehne, seitlich versetzt', () => {
    const von = { x: 0.2, y: 0.2 }
    const nach = { x: 0.8, y: 0.2 }
    const p = landfallWorldPos(von, nach, 0.5, 0.05)
    expect(p.x).toBeCloseTo(0.5, 6)
    // Bogen steht senkrecht auf der Sehne — hier also rein in y.
    expect(p.y).toBeCloseTo(0.25, 6)
  })

  it('ohne Bogen liegt er exakt auf der Linie', () => {
    const p = landfallWorldPos({ x: 0, y: 0 }, { x: 1, y: 1 }, 0.25, 0)
    expect(p.x).toBeCloseTo(0.25, 6)
    expect(p.y).toBeCloseTo(0.25, 6)
  })

  it('kippt nicht um, wenn beide Enden aufeinander liegen', () => {
    const p = landfallWorldPos({ x: 0.4, y: 0.4 }, { x: 0.4, y: 0.4 }, 0.5, 0.03)
    expect(Number.isFinite(p.x)).toBe(true)
    expect(Number.isFinite(p.y)).toBe(true)
  })

  /**
   * Die Marken müssen im Bild bleiben. `generateGalaxyDots` klemmt seine Punkte
   * auf 0,06–0,94; der Bogen schiebt daneben, darf aber nicht hinausschieben.
   */
  it('bleibt mit echten Streckenpunkten im Bild', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const mapSeed = seed * 977
      const { spawn, dots } = generateGalaxyDots(mapSeed, 8)
      const kette = [spawn, ...dots, { x: 0.5, y: 0.5 }]
      for (const p of landfallsOfRun(mapSeed, 40, 8, kette.length - 1)) {
        const pos = landfallWorldPos(kette[p.leg], kette[p.leg + 1], p.t, p.bow)
        expect(pos.x).toBeGreaterThan(0)
        expect(pos.x).toBeLessThan(1)
        expect(pos.y).toBeGreaterThan(0)
        expect(pos.y).toBeLessThan(1)
      }
    }
  })
})

describe('Landfalls — die Marken einer gelaufenen Galaxie', () => {
  const SEED = 6 * 7919 + 13
  const GALAXY = 30

  function strecke() {
    const { spawn, dots } = generateGalaxyDots(SEED, 9)
    return { spawn, dots }
  }

  /**
   * DIE Zusicherung, für die die Art überhaupt gespeichert wird.
   *
   * Zöge die Karte sie aus dem abgeleiteten Plan, verschöbe jeder neue Ort im
   * Katalog die Ziehung — und jede archivierte Galaxie wäre rückwirkend
   * umetikettiert: ein Riff von gestern wäre morgen ein Riss. Genau das ist
   * beim zweiten und dritten Katalogeintrag unbemerkt passiert.
   */
  it('nimmt die ART aus dem gespeicherten Ausgang, nicht aus dem Plan', () => {
    const { spawn, dots } = strecke()
    const attempts = 8
    // Ein Ausgang, der dem Plan ABSICHTLICH widerspricht.
    const gespeichert = [
      { kind: 'the_rupture' as const, cleared: true },
      { kind: 'wayside_cairn' as const, cleared: false },
      { kind: 'the_gloaming' as const, cleared: true },
    ]
    const marken = landfallMarks(SEED, GALAXY, spawn, dots, attempts, gespeichert)

    expect(marken.length).toBeGreaterThan(0)
    marken.forEach((m, i) => {
      expect(m.kind).toBe(gespeichert[i].kind)
      expect(m.cleared).toBe(gespeichert[i].cleared)
    })
  })

  it('nimmt die LAGE aus dem Plan — sie ist und bleibt abgeleitet', () => {
    const { spawn, dots } = strecke()
    const attempts = 8
    const kette = [spawn, ...dots.slice(0, attempts), { x: 0.5, y: 0.5 }]
    const plaene = landfallsOfRun(SEED, GALAXY, attempts + 1, kette.length - 1)
    const results = plaene.map(() => ({ kind: 'chime_reef' as const, cleared: true }))
    // OHNE Sperrzone: sie ist eine zweite, später hinzugekommene Regel, und
    // dieser Test prüft die erste — dass die Lage überhaupt aus dem Plan kommt.
    const marken = landfallMarks(SEED, GALAXY, spawn, dots, attempts, results, { x: 0, y: 0 })

    marken.forEach((m, i) => {
      const erwartet = landfallWorldPos(
        kette[plaene[i].leg],
        kette[plaene[i].leg + 1],
        plaene[i].t,
        plaene[i].bow,
      )
      expect(m.x).toBeCloseTo(erwartet.x, 9)
      expect(m.y).toBeCloseTo(erwartet.y, 9)
    })
  })

  it('zeichnet nie mehr Marken, als es Ausgänge gibt', () => {
    const { spawn, dots } = strecke()
    expect(landfallMarks(SEED, GALAXY, spawn, dots, 8, [])).toEqual([])
    const eine = landfallMarks(SEED, GALAXY, spawn, dots, 8, [
      { kind: 'chime_reef' as const, cleared: true },
    ])
    expect(eine.length).toBeLessThanOrEqual(1)
  })

  /**
   * Der Kern gehört dem Tor — dieselbe Regel, nach der `generateGalaxyDots`
   * seine Sterne von der Mitte fernhält.
   *
   * Gemessen wird in der MAXIMUMSNORM gegen zwei Halbkanten, nicht euklidisch:
   * der 0..1-Raum ist anisotrop, auf einer Fit-Box mit `VOYAGE_MAP_ASPECT_MAX`
   * ist ein „runder" Abstand senkrecht fast halb so breit wie waagerecht.
   * Genau daran ist der erste Anlauf gescheitert — eine Marke 58 px vom Kern lag
   * noch unter einem Tor von 124 px Kantenlänge.
   */
  it('hält jede Marke aus der Sperrzone des Tores', () => {
    // Beide Enden des Seitenverhältnis-Bandes, denn das schmale ist der Fall,
    // der bricht.
    for (const box of [
      { x: 0, y: 0, w: 916, h: 561 },
      { x: 0, y: 0, w: 916, h: 916 / VOYAGE_MAP_ASPECT_MAX },
      { x: 0, y: 0, w: 320, h: 200 },
    ]) {
      const hk = (box.w / GALAXY_PLATE_REF_W) * VOYAGE_MAP_HISTORY_SCALE
      const c = coreGateClearance(box, hk)
      for (let seed = 1; seed <= 25; seed++) {
        const mapSeed = seed * 977
        const { spawn, dots } = generateGalaxyDots(mapSeed, 9)
        const results = Array.from({ length: 8 }, () => ({
          kind: 'chime_reef' as const,
          cleared: true,
        }))
        for (const m of landfallMarks(mapSeed, 40, spawn, dots, 8, results, c)) {
          const norm = Math.max(Math.abs(m.x - 0.5) / c.x, Math.abs(m.y - 0.5) / c.y)
          expect(norm, `Seed ${mapSeed}, Box ${box.w}×${Math.round(box.h)}`).toBeGreaterThanOrEqual(
            1 - 1e-9,
          )
        }
      }
    }
  })

  it('die Sperrzone deckt das TOR, nicht nur seine Zeichnung', () => {
    // `voyageGateSizeFor` gibt der Klickfläche `markR + VOYAGE_GATE_GAP_PX` als
    // Halbkante — und DIE verdeckt, nicht die gemalte Marke. Dazu der eigene
    // Radius des Ortes, sonst rutscht seine Hälfte darunter.
    const box = { x: 0, y: 0, w: 916, h: 561 }
    const hk = (box.w / GALAXY_PLATE_REF_W) * VOYAGE_MAP_HISTORY_SCALE
    const c = coreGateClearance(box, hk)
    const markR = CORE_GATE_MOUTH_R * CORE_GATE_CROWN_SPAN * (box.w / GALAXY_PLATE_REF_W)
    const torHalbkante = markR + VOYAGE_GATE_GAP_PX
    expect(c.x * box.w).toBeGreaterThan(torHalbkante)
    expect(c.y * box.h).toBeGreaterThan(torHalbkante)
  })

  it('bleibt mit allen Marken im Bild', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const mapSeed = seed * 977
      const { spawn, dots } = generateGalaxyDots(mapSeed, 9)
      const results = Array.from({ length: 8 }, () => ({
        kind: 'chime_reef' as const,
        cleared: true,
      }))
      for (const m of landfallMarks(mapSeed, 40, spawn, dots, 8, results)) {
        expect(m.x).toBeGreaterThan(0)
        expect(m.x).toBeLessThan(1)
        expect(m.y).toBeGreaterThan(0)
        expect(m.y).toBeLessThan(1)
      }
    }
  })
})
