import { describe, it, expect } from 'vitest'
import {
  paintPortalHalo,
  paintPortalMaw,
  paintPortalRim,
  paintPortalSwirl,
  portalSpriteKey,
  portalSpriteSpan,
} from '@/utils/fx/portalSprite'
import {
  FIRMAMENT_PORTAL_ARMS,
  FIRMAMENT_PORTAL_AURA_SPAN,
  FIRMAMENT_PORTAL_BAND_ALPHA,
  FIRMAMENT_PORTAL_BAND_R,
  FIRMAMENT_PORTAL_BAND_SEGMENTS,
  FIRMAMENT_PORTAL_BAND_WOBBLE,
  FIRMAMENT_PORTAL_WEB_JITTER,
  FIRMAMENT_PORTAL_WEB_OUT,
  FIRMAMENT_PORTAL_WEB_SHELLS,
  FIRMAMENT_PORTAL_FIELD_ZOOM,
  FIRMAMENT_PORTAL_RY,
  FIRMAMENT_PORTAL_MOTES,
  FIRMAMENT_PORTAL_PHOTON_R,
  FIRMAMENT_PORTAL_POOL_SPAN,
  FIRMAMENT_PORTAL_SPRITE_SPAN,
  FIRMAMENT_PORTAL_SWIRL_SPAN,
} from '@/config/constants'

/**
 * Gebunden werden ZEICHENBEFEHLE, nicht Pixel: `getContext('2d')` ist in jsdom
 * `null`, ein rasternder Vergleich pruefte hier nichts und saehe gruen aus.
 *
 * Was diese Datei wirklich faengt: die Reihenfolge. Ein Ring, der vor seinem
 * Schlund gestrichen wird, liest sich als Scheibe statt als Durchgang — und das
 * sieht man im Code nicht, nur im Bild.
 */
function recordingCtx(): { ctx: CanvasRenderingContext2D; ops: string[] } {
  const ops: string[] = []
  const num = (v: number) => Math.round(v * 100) / 100
  const rec =
    (name: string) =>
    (...args: unknown[]) => {
      ops.push(
        `${name}(${args.map((a) => (typeof a === 'number' ? num(a) : String(a))).join(',')})`,
      )
    }
  const gradient = { addColorStop: rec('addColorStop') }
  const style = (name: string) => ({
    get: () => '',
    set: (v: unknown) => void ops.push(`${name}=${String(v)}`),
  })
  const ctx = {
    beginPath: rec('beginPath'),
    arc: rec('arc'),
    ellipse: rec('ellipse'),
    moveTo: rec('moveTo'),
    lineTo: rec('lineTo'),
    closePath: rec('closePath'),
    quadraticCurveTo: rec('quadraticCurveTo'),
    fill: rec('fill'),
    stroke: rec('stroke'),
    clip: rec('clip'),
    save: rec('save'),
    restore: rec('restore'),
    translate: rec('translate'),
    scale: rec('scale'),
    setLineDash: rec('setLineDash'),
    createRadialGradient: (...a: unknown[]) => {
      rec('createRadialGradient')(...a)
      return gradient
    },
    createLinearGradient: (...a: unknown[]) => {
      rec('createLinearGradient')(...a)
      return gradient
    },
    lineWidth: 1,
    lineCap: 'butt',
  } as unknown as CanvasRenderingContext2D
  Object.defineProperties(ctx, {
    fillStyle: style('fillStyle'),
    strokeStyle: style('strokeStyle'),
    shadowColor: style('shadowColor'),
    shadowBlur: style('shadowBlur'),
  })
  return { ctx, ops }
}

const R = 130
const TINT = '#a84ce0'
const SEED = 3
/** Das ZIEL — sein Galaxienfeld steht im Schlund. Nicht der Seed: der ist die
 *  Bahn, an deren Ende das Portal steht. */
const TARGET = 7

const count = (ops: string[], name: string) => ops.filter((o) => o.startsWith(`${name}(`)).length
const at = (ops: string[], needle: string) => ops.findIndex((o) => o.includes(needle))

/** Alles, was FARBE sagt — `addColorStop` gehoert dazu, sonst zaehlte ein
 *  Verlaufston als Formunterschied. */
const isInk = (o: string) =>
  o.startsWith('strokeStyle=') ||
  o.startsWith('fillStyle=') ||
  o.startsWith('shadowColor=') ||
  o.startsWith('addColorStop(')

function maw(tint = TINT, seed = SEED, target = TARGET) {
  const { ctx, ops } = recordingCtx()
  paintPortalMaw(ctx, 200, 200, R, tint, seed, target)
  return ops
}

/** Alles ab dem Clip ist das Feld des ZIELS, alles davor die Fassung. */
function fieldOps(ops: string[]) {
  return ops.slice(ops.indexOf('clip()'))
}

function swirl(tint = TINT, seed = SEED) {
  const { ctx, ops } = recordingCtx()
  paintPortalSwirl(ctx, 200, 200, R, tint, seed)
  return ops
}

function rim(tint = TINT) {
  const { ctx, ops } = recordingCtx()
  paintPortalRim(ctx, 200, 200, R, tint)
  return ops
}

describe('Portal — der Durchgang', () => {
  /*
   * DER Test dieser Datei. `paintDeparturePortal` traegt denselben Satz seit es
   * sie gibt: „Dunkler Innenraum: erst dadurch liest sich der Ring als Durchgang
   * und nicht als Scheibe." Wer die Zuege umsortiert, bricht hier.
   */
  it('malt in der Reihenfolge, die die Bedeutung traegt', () => {
    const ops = maw()
    const pool = at(ops, 'rgba(6, 5, 4, 0.62)')
    // Die dunkle Unterlage des Bandes ist der einzige Zug im Schlund-Sprite mit
    // genau diesem Ton — sie markiert die Fassung.
    const band = at(ops, 'strokeStyle=rgba(6, 5, 4, 0.7)')
    const throat = at(ops, 'rgba(3, 2, 6, 0.94)')

    expect(pool).toBeGreaterThanOrEqual(0)
    expect(band).toBeGreaterThan(pool)
    expect(throat).toBeGreaterThan(band)
  })

  /*
   * Der Schnitt zwischen Schlund und Fassung ist der Grund, warum es zwei
   * Sprites sind: die drehenden Arme liegen DAZWISCHEN. In einem Sprite deckte
   * der fast undurchsichtige Schlund sie zu — ein Wirbel, den man nicht sieht,
   * ist kein Wirbel.
   */
  it('laesst den Ring aus dem Durchgang heraus', () => {
    expect(maw().some((o) => o === `strokeStyle=${TINT}`)).toBe(false)
    expect(rim().some((o) => o === `strokeStyle=${TINT}`)).toBe(true)
  })

  /*
   * Der Schlund ist ein DURCHGANG, kein Loch. Schwarz auf dem schwarzen
   * Sternfeld ist keine Tiefe, sondern nichts — innen leuchtet das Ziel, zum
   * Rand hin wird die Schwelle dunkel. Genau diese Richtung wird gebunden.
   */
  it('laesst durch den Schlund hindurchsehen', () => {
    const ops = maw()
    const stops = ops
      .filter((o) => o.startsWith('addColorStop('))
      .map((o) => o.slice('addColorStop('.length, -1))
    // Innen der Ton des Ziels, aussen die dunkle Schwelle.
    const inner = stops.findIndex((s) => s.startsWith('0,rgba(168, 76, 224, 0.32)'))
    const outer = stops.findIndex((s) => s.startsWith('1,rgba(3, 2, 6, 0.94)'))
    expect(inner).toBeGreaterThanOrEqual(0)
    expect(outer).toBeGreaterThan(inner)

    // Und das andere Universum liegt GECLIPPT darin — sonst saesse es auf dem
    // Ring statt dahinter.
    expect(count(ops, 'clip')).toBe(1)
  })

  /*
   * DER Test dieser Runde. Im Schlund standen vierzehn weisse KREISE: ein
   * Punktfeld liest sich als Sternenhimmel, und das ist eine andere
   * Groessenordnung als ein Universum. Was man durch das Portal sieht, ist
   * dieselbe Materie wie auf der Kartenscheibe — geneigte Ellipsen aus
   * `paintGalaxyField`.
   */
  it('malt das Ziel als Galaxienfeld, nicht als Punktfeld', () => {
    const ops = fieldOps(maw())
    // Hinter der Schwelle steht genau EIN Kreis, und der ist kein Koerper: der
    // Staubschleier, ein Verlauf. Jede Marke ist eine Ellipse.
    expect(count(ops, 'arc')).toBe(1)
    expect(count(ops, 'createRadialGradient')).toBe(1)

    const bodies = ops
      .filter((o) => o.startsWith('ellipse('))
      .map((o) => o.slice(8, -1).split(',').map(Number))
    expect(bodies.length).toBeGreaterThan(40)
    // Jeder Koerper ist GENEIGT und hat zwei verschiedene Halbachsen — ein
    // Kreis mit Winkel null waere wieder der Punkt.
    expect(bodies.every(([, , rx, ry]) => rx !== ry)).toBe(true)
    expect(bodies.some(([, , , , rot]) => rot > 0.01)).toBe(true)

    // Und die Stauchung ist die des Schlunds: EIN `scale`, Verhaeltnis `_RY`.
    // Gegen die GERUNDETEN Sollwerte, weil der Rekorder auf zwei Stellen
    // rundet — eine Toleranz laege hier genau auf der Kante.
    const round2 = (v: number) => Math.round(v * 100) / 100
    const scales = ops
      .filter((o) => o.startsWith('scale('))
      .map((o) => o.slice(6, -1).split(',').map(Number))
    expect(scales).toEqual([
      [
        round2(FIRMAMENT_PORTAL_FIELD_ZOOM),
        round2(FIRMAMENT_PORTAL_FIELD_ZOOM * FIRMAMENT_PORTAL_RY),
      ],
    ])
  })

  /*
   * Das Feld haengt am ZIEL, nicht an der Bahn — dieselbe Trennung, die fuer
   * den Ton schon gilt. Zoege es den Seed, zeigte das Portal das Universum, aus
   * dem man kommt, statt des Universums, in das es fuehrt.
   */
  it('nimmt das Feld aus dem ZIEL, nicht aus der Bahn', () => {
    expect(fieldOps(maw(TINT, SEED, 3))).not.toEqual(fieldOps(maw(TINT, SEED, 4)))
    expect(fieldOps(maw(TINT, 1, 3))).toEqual(fieldOps(maw(TINT, 2, 3)))
  })

  /**
   * Die Punkte des Bandes: `lineTo` gehoert im Schlund-Sprite allein ihm — die
   * Straenge des Gewebes laufen ueber `quadraticCurveTo`.
   */
  function bandPoints(ops: string[]) {
    return ops
      .filter((o) => o.startsWith('lineTo('))
      .map((o) => o.slice(7, -1).split(',').map(Number))
      .map(([x, y]) => ({ x, y, ang: Math.atan2(y / FIRMAMENT_PORTAL_RY, x) }))
  }

  /** Alles vor dem ersten Zug des Bandes ist das Gewebe. */
  function webOps(ops: string[]) {
    return ops.slice(0, at(ops, 'strokeStyle=rgba(6, 5, 4, 0.7)'))
  }

  /*
   * Das Band geht ganz um das Portal herum — die Zusage, wegen der es das Band
   * ueberhaupt gibt. Hier lag einmal eine „zersprungene Krone": zwei
   * plattgedrueckte Boegen mit Luecke, angeschnitten am Bildrand ein LOSES
   * Stueck Planetenring neben dem Portal. Wer dem Band eine Luecke gibt, hat sie
   * zurueck.
   */
  it('schliesst das Band zum vollen Umlauf', () => {
    const ops0 = maw()
    const pts = bandPoints(ops0)
    // Zwei Durchgaenge zu je einem Segment pro Schritt.
    expect(pts).toHaveLength(FIRMAMENT_PORTAL_BAND_SEGMENTS * 2)
    // Und sie decken JEDEN Oktanten ab — eine Luecke faellt hier auf, egal wo.
    const octants = new Set(
      pts.map((p) => Math.floor(((p.ang + Math.PI * 2) % (Math.PI * 2)) / (Math.PI / 4))),
    )
    expect(octants.size).toBe(8)

    // Erst der ganze dunkle Durchgang, dann der Ton: ohne die Unterlage
    // verschwindet die duenne Linie ueber dem Sternfeld.
    const lastDark = ops0.lastIndexOf('strokeStyle=rgba(6, 5, 4, 0.7)')
    expect(lastDark).toBeGreaterThanOrEqual(0)
    expect(ops0.slice(lastDark).some((o) => o.startsWith('strokeStyle=rgba(168, 76, 224,'))).toBe(
      true,
    )
  })

  /*
   * DER Test dieser Runde. Nach der Krone stand hier ein Astrolabium: 24 gleiche
   * Zaehne, 8 Speichen, vier Rauten auf den Achsen. Es ging ganz herum und las
   * sich trotzdem falsch — als KOMPASS. Was den Kompass macht, ist die
   * GLEICHVERTEILUNG, nicht die Farbe: N gleiche Teilungen auf gemeinsamen
   * Kreisen sind ein Zifferblatt.
   */
  it('haelt die Fassung unregelmaessig — kein Zifferblatt', () => {
    const ops = webOps(maw())
    const nodes = ops
      .filter((o) => o.startsWith('moveTo('))
      .map((o) => o.slice(7, -1).split(',').map(Number))
      .map(([x, y]) => ({
        ang: Math.atan2(y / FIRMAMENT_PORTAL_RY, x),
        rad: Math.hypot(x, y / FIRMAMENT_PORTAL_RY),
      }))
    expect(nodes.length).toBeGreaterThan(80)

    // Die Knoten liegen NICHT auf gemeinsamen Kreisen — ein Kompass haette drei
    // oder vier Radien (Zahn innen/aussen, Speiche innen/aussen), das Gewebe hat
    // fast so viele wie Knoten. Gemessen auf Zehntelpixel, sonst deckelt schon
    // die Rundung: die ganze Fassung ist nur 24 px breit.
    const radii = new Set(nodes.map((n) => n.rad.toFixed(1)))
    expect(radii.size).toBeGreaterThan(60)

    // Und die Winkelabstaende sind ungleich: bei gleicher Teilung waere die
    // Streuung null.
    const angs = nodes.map((n) => (n.ang + Math.PI * 2) % (Math.PI * 2)).sort((a, b) => a - b)
    const gaps = angs.slice(1).map((v, i) => v - angs[i])
    const mean = gaps.reduce((a, b) => a + b, 0) / gaps.length
    const sd = Math.sqrt(gaps.reduce((a, g) => a + (g - mean) ** 2, 0) / gaps.length)
    expect(sd / mean).toBeGreaterThan(0.3)

    // Die vier Rautenknoten auf den Achsen sind weg — sie waren die einzigen
    // geschlossenen Flaechen im Sprite.
    expect(count(maw(), 'closePath')).toBe(0)
  })

  /* Lichtpunkte auf den Kreuzungen: ohne sie ist ein Netz aus Haarlinien nur
     Griess — dieselbe Begruendung wie am Wall der Karte. */
  it('setzt Lichtpunkte auf das Gewebe', () => {
    const ops = webOps(maw())
    expect(count(ops, 'arc')).toBeGreaterThan(4)
  })

  /* Das Gewebe steht auf dem Schattenteich. Reichte es darueber hinaus, stuende
     sein aeusserer Saum ohne Unterlage auf dem Sternfeld. */
  it('bleibt mit der ganzen Fassung auf dem Schattenteich', () => {
    const spread =
      ((FIRMAMENT_PORTAL_WEB_OUT - 1) / Math.max(1, FIRMAMENT_PORTAL_WEB_SHELLS - 1)) *
      FIRMAMENT_PORTAL_WEB_JITTER
    expect(FIRMAMENT_PORTAL_WEB_OUT + spread).toBeLessThan(FIRMAMENT_PORTAL_POOL_SPAN)
    expect(FIRMAMENT_PORTAL_WEB_OUT).toBeLessThan(FIRMAMENT_PORTAL_SPRITE_SPAN)
    // Das Band liegt IM Gewebe, nicht daneben.
    expect(FIRMAMENT_PORTAL_BAND_R * (1 + FIRMAMENT_PORTAL_BAND_WOBBLE)).toBeLessThan(
      FIRMAMENT_PORTAL_WEB_OUT,
    )
    expect(FIRMAMENT_PORTAL_BAND_ALPHA).toBeGreaterThan(0.3)
  })

  /* `shadowBlur` ist erlaubt, WEIL er gebacken wird. Bliebe er stehen, truege
     ihn jeder folgende Zug mit — und irgendwann einer in einer Animation. */
  it('setzt shadowBlur und nimmt ihn wieder zurueck', () => {
    const ops = rim()
    const on = ops.findIndex((o) => o.startsWith('shadowBlur=') && o !== 'shadowBlur=0')
    const off = ops.indexOf('shadowBlur=0')
    expect(on).toBeGreaterThanOrEqual(0)
    expect(off).toBeGreaterThan(on)
  })

  /*
   * Die Fassung traegt den Saum — und KEINEN Punkt. Hier standen einmal ein
   * gefuellter Kernfunke auf der Mitte und zwei Kugeln auf den Ringscheiteln;
   * beide lasen sich als Aufkleber auf dem Durchgang, dieselbe Lektion wie beim
   * Firmament-Knoten. Die Tiefe traegt jetzt das Feld im Schlund, die Achse die
   * Ellipse samt Saum.
   */
  it('traegt den Schwellensaum und keinen Punkt', () => {
    const ops = rim()
    expect(at(ops, 'strokeStyle=rgba(168, 76, 224, 0.5)')).toBeGreaterThanOrEqual(0)
    // Nichts wird gefuellt: die Fassung besteht aus Zuegen.
    expect(count(ops, 'fill')).toBe(0)
    expect(ops.some((o) => o.startsWith('fillStyle='))).toBe(false)
  })

  /* Der Saum sitzt knapp INNEN am Ring. Bei einem halben Radius war er ein
     zweiter Ring in der Mitte und machte aus dem Durchgang eine Zielscheibe. */
  it('legt den Schwellensaum an die Kante, nicht in die Mitte', () => {
    expect(FIRMAMENT_PORTAL_PHOTON_R).toBeGreaterThan(0.8)
    expect(FIRMAMENT_PORTAL_PHOTON_R).toBeLessThan(1)
  })

  it('aendert mit dem Ton die FARBE, nicht die Form', () => {
    const a = maw('#a84ce0')
    const b = maw('#4fa85e')
    expect(a.filter((o) => !isInk(o))).toEqual(b.filter((o) => !isInk(o)))
    expect(a.filter(isInk)).not.toEqual(b.filter(isInk))
  })

  it('ist bei gleichen Argumenten byte-gleich — kein Math.random()', () => {
    expect(maw()).toEqual(maw())
    expect(swirl()).toEqual(swirl())
  })
})

describe('Portal — die drehende Ebene', () => {
  /*
   * DER Fehler, den diese Datei fangen soll: eine rotationssymmetrische Ebene im
   * drehenden Sprite dreht sichtbar NICHT und kostet trotzdem eine
   * Compositor-Ebene. Ein Vollkreis auf der Sprite-Mitte ist genau das.
   */
  it('traegt nichts Rotationssymmetrisches', () => {
    const ops = swirl()
    for (const op of ops) {
      if (!op.startsWith('arc(') && !op.startsWith('ellipse(')) continue
      const nums = op
        .slice(op.indexOf('(') + 1, -1)
        .split(',')
        .map(Number)
      const onCentre = Math.abs(nums[0]) < 0.01 && Math.abs(nums[1]) < 0.01
      const full =
        Math.abs((op.startsWith('arc(') ? nums[4] - nums[3] : nums[6] - nums[5]) - Math.PI * 2) <
        0.01
      expect(onCentre && full, op).toBe(false)
    }
  })

  it('malt jeden Arm als auslaufende Kurve, nicht als Speiche', () => {
    const ops = swirl()
    expect(count(ops, 'quadraticCurveTo')).toBe(FIRMAMENT_PORTAL_ARMS)
    expect(count(ops, 'createLinearGradient')).toBe(FIRMAMENT_PORTAL_ARMS)
    // Beide Enden transparent — sonst hat der Arm eine harte Kante.
    const stops = ops.filter((o) => o.startsWith('addColorStop('))
    expect(stops.filter((o) => o.includes(', 0)')).length).toBeGreaterThanOrEqual(
      FIRMAMENT_PORTAL_ARMS * 2,
    )
  })

  /* Die Motes machen die Drehung ablesbar — als KOERPER, nicht als Punkte:
     dieselben geneigten Ellipsen wie das Feld dahinter, nur naeher. */
  it('setzt die Motes als Koerper, die die Drehung ablesbar machen', () => {
    const ops = swirl()
    expect(count(ops, 'arc')).toBe(0)
    expect(count(ops, 'ellipse')).toBe(FIRMAMENT_PORTAL_MOTES)
  })

  it('aendert mit dem Seed die Arme, nicht den Ring', () => {
    expect(swirl(TINT, 1)).not.toEqual(swirl(TINT, 2))
    // Ring und Schwellensaum gehoeren dem stehenden Sprite und haengen nicht am
    // Seed — nur das Gewebe tut das.
    for (const fixed of [`strokeStyle=${TINT}`, 'strokeStyle=rgba(168, 76, 224, 0.5)']) {
      expect(maw(TINT, 1).filter((o) => o === fixed)).toEqual(
        maw(TINT, 2).filter((o) => o === fixed),
      )
    }
  })
})

describe('Portal — Halo', () => {
  it('legt den Gipfel des Halos auf den Ring, nicht in die Mitte', () => {
    const { ctx, ops } = recordingCtx()
    const outer = 200
    paintPortalHalo(ctx, outer, outer, outer, R, TINT)
    const stops = ops
      .filter((o) => o.startsWith('addColorStop('))
      .map((o) => Number(o.slice(13, o.indexOf(','))))
    const peak = R / outer
    expect(stops).toContain(0)
    expect(stops.some((s) => Math.abs(s - peak) < 0.001)).toBe(true)
    expect(stops[stops.length - 1]).toBe(1)
  })
})

describe('Portal — Schluessel und Kante', () => {
  it('trennt Ebene, Seed, Ton, Ziel, Groesse und Pixeldichte', () => {
    expect(portalSpriteKey('maw', 3, '#a84ce0', 7, 260, 2)).toBe('maw|3|#a84ce0|7|260|2')
    const keys = new Set([
      portalSpriteKey('maw', 3, '#a84ce0', 7, 260, 2),
      portalSpriteKey('swirl', 3, '#a84ce0', 7, 260, 2),
      portalSpriteKey('halo', 3, '#a84ce0', 7, 260, 2),
      portalSpriteKey('maw', 4, '#a84ce0', 7, 260, 2),
      portalSpriteKey('maw', 3, '#4fa85e', 7, 260, 2),
      // Ohne das Ziel im Schluessel zeigte das Portal nach einem Wechsel das
      // Feld des vorigen Ziels weiter.
      portalSpriteKey('maw', 3, '#a84ce0', 8, 260, 2),
      portalSpriteKey('maw', 3, '#a84ce0', 7, 300, 2),
      portalSpriteKey('maw', 3, '#a84ce0', 7, 260, 1),
    ])
    expect(keys.size).toBe(8)
  })

  it('nennt keine Zoomstufe im Schluessel', () => {
    // Sonst malte das Portal bei jedem Zoomschritt neu — es steht aber fest.
    expect(portalSpriteKey('maw', 3, '#a84ce0', 7, 260, 2)).not.toContain('1.6')
  })

  /* Drei Kanten, weil die drei Ebenen verschieden weit reichen: das stehende
     Sprite muss den Schattenteich fassen, das drehende nur die Arme — ein
     gemeinsamer Wert schnitte entweder den Teich ab oder draehte leere Flaeche
     mit. Der Halo reicht am weitesten. */
  it('gibt jeder Ebene die Kante, die sie braucht', () => {
    expect(portalSpriteSpan('halo', 260)).toBe(Math.round(260 * FIRMAMENT_PORTAL_AURA_SPAN))
    expect(portalSpriteSpan('maw', 260)).toBe(Math.round(260 * FIRMAMENT_PORTAL_SPRITE_SPAN))
    expect(portalSpriteSpan('swirl', 260)).toBe(Math.round(260 * FIRMAMENT_PORTAL_SWIRL_SPAN))

    expect(portalSpriteSpan('halo', 260)).toBeGreaterThan(portalSpriteSpan('maw', 260))
    expect(portalSpriteSpan('maw', 260)).toBeGreaterThan(portalSpriteSpan('swirl', 260))
    // Der Teich ist die bindende Zone des stehenden Sprites.
    expect(FIRMAMENT_PORTAL_SPRITE_SPAN).toBeGreaterThanOrEqual(FIRMAMENT_PORTAL_POOL_SPAN)
  })

  /* Was uebersteht, wandert als abgeschnittene Ecke durchs Bild — und man sieht
     es erst nach einer halben Umdrehung. Gemessen wird ab dem `translate`, denn
     danach ist (0,0) die Sprite-Mitte. */
  it('haelt jeden Zug innerhalb der Sprite-Kante', () => {
    for (const [ops, span] of [
      [maw(), portalSpriteSpan('maw', R * 2)],
      [swirl(), portalSpriteSpan('swirl', R * 2)],
    ] as const) {
      const half = span / 2
      for (const op of ops) {
        if (!op.startsWith('arc(') && !op.startsWith('ellipse(')) continue
        const n = op
          .slice(op.indexOf('(') + 1, -1)
          .split(',')
          .map(Number)
        const rr = op.startsWith('ellipse(') ? Math.max(n[2], n[3]) : n[2]
        expect(Math.hypot(n[0], n[1]) + rr, op).toBeLessThanOrEqual(half + 0.01)
      }
    }
  })
})
