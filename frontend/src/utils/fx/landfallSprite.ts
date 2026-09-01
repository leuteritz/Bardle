/* ── Der Landfall-Körper als Offscreen-Sprite ─────────────────────────────────
   Ein Landfall ist ein KÖRPER IM LICHT DER SONNE, kein Zeichen am Himmel — der
   Satz, auf dem schon `DrifterBody.vue` gebaut ist. Hier wird er gerastert:
   sechs Motive, jedes etwas, das man so auch im echten Weltall fände.

   Warum ein Sprite und keine CSS-Ebenen wie beim Drifter: die sechs Motive
   leben von TEXTUR — Krater, Plattenfugen, Regolith, Trümmerkörner, gelinstes
   Licht. Das ist mit gestapelten Verläufen nicht zu machen. Und weil immer nur
   EIN Ort im Bild steht, kostet der Sprite nach dem Bau nichts mehr: die Grösse
   macht `scale()` am Compositor, nicht ein `drawImage` je Frame.

   Zwei Regeln, die den Bau tragen:

   - **Nie `Math.random()`.** Jede Lage, jede Grösse, jeder Winkel kommt aus dem
     INDEX. Ein gewürfelter Sprite sähe nach jedem Cache-Miss anders aus.
     Dieselbe Regel, aus der `voidSprite` seine Zacken und `paintFreedStar`
     seinen Trabanten aus dem Index nehmen.
   - **Der Terminator gehört HIERHER, nicht ins DOM.** Er war einmal eine eigene
     Ebene — der eingeschriebene Kreis der Silhouette, unabhängig zur Sonne
     gedreht, wie `DrifterBody` es macht. Gemessen war das falsch: drei der sechs
     Motive haben gar keine geschlossene Silhouette (Schwarm, Wolke, Linse), und
     über deren Lücken lag dann eine dunkle SCHEIBE im leeren Raum. Im Sprite
     liegt er per `source-atop` exakt auf dem, was gemalt wurde — und weil der
     Aufrufer den ganzen Sprite auf den Lichtwinkel dreht, stimmt die Richtung
     trotzdem.

   Aufrufer: `LandfallBodyLayer.vue`, und sonst niemand.                       */

import {
  LANDFALL_BODY_LIT,
  LANDFALL_BODY_MOTIF,
  LANDFALL_BODY_PALETTE,
  LANDFALL_CAIRN_STONES,
  LANDFALL_CLOUD_LOBES,
  LANDFALL_DERELICT_HULLS,
  LANDFALL_DISTRESS_HEX,
  LANDFALL_HULK_RIBS,
  LANDFALL_LENS_ARCS,
  LANDFALL_SHOAL_SHARDS,
  LANDFALL_SILHOUETTE_WOBBLE,
  LANDFALL_SPRITE_CACHE_MAX,
  LANDFALL_SPRITE_SPAN,
} from '@/config/constants'
import type { LandfallKindId, LandfallMotif } from '@/types'
import {
  bodyFill,
  clampSpriteDpr,
  crater,
  createSpriteCache,
  grain,
  jitter,
  lumpyPath,
  newSpriteCanvas,
  paintTerminator,
  sway,
  type BodyPaint,
} from '@/utils/fx/spaceBody'

/* ── Die sechs Motive ─────────────────────────────────────────────────────────
   Jedes einzeln exportiert, und zwar allein für die Spec: `getContext('2d')`
   gibt in jsdom `null` zurück, ein rasternder Vergleich prüfte dort also nichts
   und sähe trotzdem grün aus. Geprüft werden stattdessen die ZEICHENBEFEHLE —
   dieselbe Lösung, aus der `paintLandfallMark` exportiert ist.               */

type Paint = BodyPaint<(typeof LANDFALL_BODY_PALETTE)[LandfallKindId]>

/**
 * Chime Reef — ein Schwarm Eistrümmer.
 *
 * Kein einzelner Körper: sieben Brocken auf einer flachen Ellipse, wie ein
 * Ringtrümmerfeld von der Seite. Die vorderen sind grösser und heller, die
 * hinteren kleiner und kälter — das ist die ganze Tiefenwirkung, und sie kostet
 * keine zweite Ebene.
 *
 * WENIGE und GROSSE, nicht viele kleine. Der erste Entwurf hatte elf Splitter zu
 * je rund einem Zehntel des Radius; auf Full HD sind das fünf Pixel, und gemessen
 * las sich der Schwarm als diffuser Fleck mit ein paar weissen Punkten darin.
 * Ein Riff soll man als Ansammlung von KÖRPERN erkennen.
 */
export const paintShoal: Paint = (ctx, x, y, r, pal, detail) => {
  const count = LANDFALL_SHOAL_SHARDS + detail * 2
  for (let i = 0; i < count; i++) {
    // Auf einer flachen Ellipse verteilt, nicht auf einem Kreis: ein Riff hat
    // eine Ebene, und von der Seite gesehen ist sie ein Band.
    const a = (i / count) * Math.PI * 2 + sway(i, 3) * 0.28
    const dist = 0.22 + jitter(i, 7) * 0.58
    const sx = x + Math.cos(a) * r * dist
    const sy = y + Math.sin(a) * r * dist * 0.42
    // Vorn heisst weiter unten im Bild — das gibt dem Band eine Leserichtung.
    const front = (sy - y) / (r * 0.42)
    const sr = r * (0.15 + jitter(i, 11) * 0.14) * (1 + front * 0.3)

    ctx.save()
    ctx.translate(sx, sy)
    ctx.rotate(sway(i, 13) * Math.PI)
    // Sechs Ecken mit ungleichen Radien, nicht vier: mit vieren waren es
    // gemessen flache Karten, die wie Papier im Raum standen. Ein gebrochener
    // Eisbrocken hat mehr Bruchflächen als ein Blatt.
    const ecken = 6
    ctx.beginPath()
    for (let k = 0; k < ecken; k++) {
      const ka = (k / ecken) * Math.PI * 2 + sway(i * 7 + k, 19) * 0.24
      const kr = sr * (0.62 + jitter(i * ecken + k, 17) * 0.72)
      if (k === 0) ctx.moveTo(Math.cos(ka) * kr, Math.sin(ka) * kr)
      else ctx.lineTo(Math.cos(ka) * kr, Math.sin(ka) * kr)
    }
    ctx.closePath()
    const g = ctx.createLinearGradient(-sr, -sr, sr, sr)
    g.addColorStop(0, front > 0 ? pal.edge : pal.hi)
    g.addColorStop(0.55, pal.mid)
    g.addColorStop(1, pal.low)
    ctx.fillStyle = g
    ctx.fill()
    ctx.strokeStyle = 'rgba(10, 12, 14, 0.55)'
    ctx.lineWidth = Math.max(0.5, sr * 0.16)
    ctx.stroke()
    ctx.restore()
  }
}

/**
 * The Gloaming — eine Dunkelwolke.
 *
 * Kein Körper, nur Dichte: vier überlagerte Lappen verschiedener Exzentrizität
 * und ein Kern, der DUNKLER ist als der Grund. Das ist der Punkt an einer
 * Bok-Globule — sie leuchtet nicht, sie verdeckt.
 *
 * Sie bekommt keinen Terminator (`LANDFALL_BODY_LIT`): ein Nebel streut das
 * Licht, das durch ihn hindurchgeht, er hat keine Sonnenseite.
 */
export const paintDarkCloud: Paint = (ctx, x, y, r, pal, detail) => {
  // Der HELLE Saum zuerst: eine Dunkelwolke ist nicht einfach dunkel, sie hat
  // einen gestreuten Rand, wo Licht sie von der Seite anschneidet. Der erste
  // Entwurf hatte nur die dunklen Lappen und war auf der Bühne über dem
  // Sternenfeld gemessen kaum zu sehen — ein Fleck, den man für einen
  // Rendering-Fehler hält.
  const saum = ctx.createRadialGradient(x, y, r * 0.2, x, y, r)
  saum.addColorStop(0, 'rgba(18, 15, 22, 0)')
  saum.addColorStop(0.62, pal.edge)
  saum.addColorStop(1, 'rgba(18, 15, 22, 0)')
  ctx.globalAlpha = 0.5
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.fillStyle = saum
  ctx.fill()
  ctx.globalAlpha = 1

  const lobes = LANDFALL_CLOUD_LOBES + detail
  for (let i = 0; i < lobes; i++) {
    const a = (i / lobes) * Math.PI * 2
    const off = r * (0.12 + jitter(i, 23) * 0.32)
    const lx = x + Math.cos(a) * off
    const ly = y + Math.sin(a) * off * 0.7
    const lr = r * (0.5 + jitter(i, 29) * 0.42)
    const g = ctx.createRadialGradient(lx, ly, 0, lx, ly, lr)
    g.addColorStop(0, pal.hi)
    g.addColorStop(0.44, pal.mid)
    g.addColorStop(1, 'rgba(18, 15, 22, 0)')
    ctx.globalAlpha = 0.72
    ctx.beginPath()
    ctx.arc(lx, ly, lr, 0, Math.PI * 2)
    ctx.fillStyle = g
    ctx.fill()
  }
  ctx.globalAlpha = 1

  // Staubbahnen: die Struktur, an der man eine Wolke von einem Weichzeichner
  // unterscheidet. BREIT und an den Enden auslaufend — schmal und volltonig
  // gezogen lasen sie sich gemessen als Stäbe, die in der Wolke stecken.
  if (detail >= 1) {
    ctx.lineCap = 'round'
    for (let i = 0; i < 3 + detail; i++) {
      const a = sway(i, 71) * 1.2
      const len = r * (0.5 + jitter(i, 73) * 0.5)
      const off = sway(i, 79) * r * 0.4
      const x1 = x - Math.cos(a) * len
      const y1 = y - Math.sin(a) * len + off
      const x2 = x + Math.cos(a) * len
      const y2 = y + Math.sin(a) * len + off
      const bahn = ctx.createLinearGradient(x1, y1, x2, y2)
      const ton = i % 2 === 0 ? pal.edge : pal.low
      bahn.addColorStop(0, 'rgba(18, 15, 22, 0)')
      bahn.addColorStop(0.45, ton)
      bahn.addColorStop(1, 'rgba(18, 15, 22, 0)')
      ctx.globalAlpha = 0.26
      ctx.beginPath()
      ctx.moveTo(x1, y1)
      ctx.quadraticCurveTo(x + off * 0.4, y + off * 1.2, x2, y2)
      ctx.strokeStyle = bahn
      ctx.lineWidth = Math.max(2, r * (0.13 + jitter(i, 83) * 0.12))
      ctx.stroke()
    }
    ctx.globalAlpha = 1
  }

  // Der dichte Kern. Er verdeckt, also ist er das Dunkelste im Bild — auch
  // dunkler als der Raum dahinter.
  const core = ctx.createRadialGradient(x, y, 0, x, y, r * 0.5)
  core.addColorStop(0, 'rgba(9, 7, 12, 0.92)')
  core.addColorStop(0.55, 'rgba(12, 10, 16, 0.66)')
  core.addColorStop(1, 'rgba(18, 15, 22, 0)')
  ctx.beginPath()
  ctx.arc(x, y, r * 0.5, 0, Math.PI * 2)
  ctx.fillStyle = core
  ctx.fill()

  if (detail >= 1) grain(ctx, x, y, r, 0.12)
}

/**
 * Adrift Convoy — eine Kette Havaristen.
 *
 * Drei Rümpfe entlang einer Achse, gestaffelt und ungleich gekippt: ein Zug, der
 * die Formation verloren hat. Plattenfugen quer, keine Fenster — auf 116 px
 * wären Fenster drei Pixel und läsen sich als Rauschen.
 *
 * Das Notsignal ist die EINZIGE eigene Lichtquelle unter allen sechs Körpern,
 * und es blinkt nicht hier: ein Blinken gehört zur Zeit, und Zeit gehört nicht
 * in ein einmal gerastertes Bild. Der Sprite malt nur seine Fassung.
 */
/**
 * Wo ein Rumpf der Kette steht und wie er liegt — die EINE Quelle.
 *
 * Zwei Stellen brauchen sie: der Zeichenzweig und `derelictBeaconAt`, das die
 * Lampe an die Nase des vordersten setzt. Zweimal von Hand geschrieben liefen
 * sie beim ersten Umbau auseinander, und eine Lampe neben ihrem Schiff sieht
 * niemand als Fehler — sie sieht nur falsch aus. Beim Verschlanken der Rümpfe
 * ist genau das schon einmal passiert.
 */
function derelictHullAt(
  i: number,
  r: number,
): { x: number; y: number; len: number; halfW: number; tilt: number } {
  const t = i / (LANDFALL_DERELICT_HULLS - 1) - 0.5
  const len = r * (0.46 - Math.abs(t) * 0.14)
  return {
    x: t * r * 1.22,
    y: sway(i, 31) * r * 0.26,
    len,
    // Schlank, nicht gedrungen: bei 0,34 der Länge waren die Rümpfe gemessen
    // Brotlaibe. Ein Schiff ist lang, und die Länge ist das Einzige, was auf
    // 106 px Kante von einem Schiff übrig bleibt.
    halfW: len * 0.2,
    tilt: sway(i, 37) * 0.5,
  }
}

export const paintDerelicts: Paint = (ctx, x, y, r, pal, detail) => {
  const hulls = LANDFALL_DERELICT_HULLS
  for (let i = 0; i < hulls; i++) {
    const hull = derelictHullAt(i, r)
    const hl = hull.len
    const hw = hull.halfW

    ctx.save()
    ctx.translate(x + hull.x, y + hull.y)
    ctx.rotate(hull.tilt)

    // Rumpf: SPITZE Nase rechts, gekapptes Heck links. Eine runde Nase gibt
    // keine Fahrtrichtung her, und ohne Fahrtrichtung ist ein Wrack ein Stein.
    const nase = () => {
      ctx.beginPath()
      ctx.moveTo(-hl, -hw * 0.72)
      ctx.lineTo(hl * 0.55, -hw)
      ctx.lineTo(hl, 0)
      ctx.lineTo(hl * 0.55, hw)
      ctx.lineTo(-hl, hw * 0.72)
      ctx.closePath()
    }
    nase()
    const g = ctx.createLinearGradient(0, -hw, 0, hw)
    g.addColorStop(0, pal.hi)
    g.addColorStop(0.5, pal.mid)
    g.addColorStop(1, pal.low)
    ctx.fillStyle = g
    ctx.fill()
    grain(ctx, 0, 0, hl, 0.07)

    // Plattenfugen quer zur Achse.
    const seams = 3 + detail
    ctx.strokeStyle = 'rgba(12, 10, 8, 0.5)'
    ctx.lineWidth = Math.max(0.5, hw * 0.14)
    for (let s = 1; s <= seams; s++) {
      const sx = -hl + ((hl * 1.5) / (seams + 1)) * s
      ctx.beginPath()
      ctx.moveTo(sx, -hw * 0.84)
      ctx.lineTo(sx, hw * 0.84)
      ctx.stroke()
    }

    // Die Triebwerksglocke am Heck — kalt. Sie liegt tot da, das ist der Punkt.
    ctx.beginPath()
    ctx.ellipse(-hl, 0, hw * 0.34, hw * 0.82, 0, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(10, 8, 6, 0.78)'
    ctx.fill()

    ctx.strokeStyle = 'rgba(10, 8, 6, 0.7)'
    ctx.lineWidth = Math.max(0.6, hw * 0.2)
    nase()
    ctx.stroke()

    // Albedo-Kante: ohne sie sind drei Rümpfe auf 106 px drei graue Striche.
    ctx.beginPath()
    ctx.moveTo(-hl * 0.9, -hw * 0.62)
    ctx.lineTo(hl * 0.5, -hw * 0.86)
    ctx.strokeStyle = pal.edge
    ctx.globalAlpha = 0.55
    ctx.lineWidth = Math.max(0.6, hw * 0.16)
    ctx.stroke()
    ctx.globalAlpha = 1

    ctx.restore()
  }
}

/**
 * Wo das Notsignal des vordersten Rumpfes sitzt, relativ zur Körpermitte.
 *
 * Eine eigene Funktion, weil ZWEI Ebenen dieselbe Stelle treffen müssen: der
 * Rumpf im Albedo-Sprite und die blinkende Lampe darüber. Ein zweiter, von Hand
 * abgeschriebener Ausdruck liefe beim ersten Umbau der Kette auseinander, und
 * ein Signal neben seinem Schiff sieht niemand als Fehler — es sieht nur falsch
 * aus.
 */
export function derelictBeaconAt(r: number): { x: number; y: number; rad: number } {
  const hull = derelictHullAt(LANDFALL_DERELICT_HULLS - 1, r)
  // Die Lampe sitzt auf der Nase, und die Nase ist mitgekippt.
  return {
    x: hull.x + Math.cos(hull.tilt) * hull.len * 0.78,
    y: hull.y + Math.sin(hull.tilt) * hull.len * 0.78,
    rad: Math.max(1.2, hull.halfW * 0.55),
  }
}

/**
 * Das Notsignal — eine EIGENE Ebene, kein Teil des Albedo-Sprites.
 *
 * Ein Blinken gehört zur Zeit, und Zeit gehört nicht in ein einmal gerastertes
 * Bild. Die Lampe liegt deshalb als zweites Canvas mit derselben Geometrie über
 * dem Körper und pulst per CSS-Deckkraft — dieselbe Ebene, derselbe Container,
 * also passt sie in jeder Drehlage.
 *
 * Sie ist die EINZIGE eigene Lichtquelle unter allen sechs Körpern. Alles
 * andere hier reflektiert.
 */
export function buildLandfallBeacon(
  kind: LandfallKindId,
  px: number,
  dpr: number,
): HTMLCanvasElement | null {
  if (LANDFALL_BODY_MOTIF[kind] !== 'derelicts') return null
  const d = clampSpriteDpr(dpr)
  const key = `beacon|${kind}|${px}|${d}`
  const hit = cache.get(key)
  if (hit) return hit

  const span = Math.round(px * LANDFALL_SPRITE_SPAN)
  const made = newSpriteCanvas(span, d)
  if (!made) return null
  const { cv, ctx } = made

  const at = derelictBeaconAt(px / 2)
  const cx = span / 2 + at.x
  const cy = span / 2 + at.y

  // Schein zuerst, Lampe darüber: ohne den Hof ist der Punkt bei 53 px Kante
  // ein einzelnes Pixel.
  const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, at.rad * 5)
  glow.addColorStop(0, 'rgba(232, 162, 74, 0.55)')
  glow.addColorStop(0.4, 'rgba(232, 162, 74, 0.18)')
  glow.addColorStop(1, 'rgba(232, 162, 74, 0)')
  ctx.beginPath()
  ctx.arc(cx, cy, at.rad * 5, 0, Math.PI * 2)
  ctx.fillStyle = glow
  ctx.fill()

  ctx.beginPath()
  ctx.arc(cx, cy, at.rad, 0, Math.PI * 2)
  ctx.fillStyle = LANDFALL_DISTRESS_HEX
  ctx.fill()

  cache.set(key, cv)
  return cv
}

/**
 * Sunken Ossuary — ein totes Habitat.
 *
 * Ein gekippter Zylinder mit zwei Endkappen, unter Regolith verschwunden. Die
 * versiegelte Luke ist das einzige, was ihn von einem Felsbrocken trennt: eine
 * helle Fuge in einer dunklen Platte. Genau dort setzt der EINE Griff an, den
 * der Ort nimmt.
 */
export const paintHulk: Paint = (ctx, x, y, r, pal, detail) => {
  const len = r * 0.92
  const rad = r * 0.44

  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(-0.42)

  // Mantel.
  ctx.beginPath()
  ctx.moveTo(-len, -rad)
  ctx.lineTo(len, -rad)
  ctx.lineTo(len, rad)
  ctx.lineTo(-len, rad)
  ctx.closePath()
  const g = ctx.createLinearGradient(0, -rad, 0, rad)
  g.addColorStop(0, pal.hi)
  g.addColorStop(0.44, pal.mid)
  g.addColorStop(1, pal.low)
  ctx.fillStyle = g
  ctx.fill()
  grain(ctx, 0, 0, len, 0.11)

  // Endkappen — ohne sie ist es ein Balken, kein Zylinder.
  for (const s of [-1, 1]) {
    ctx.beginPath()
    ctx.ellipse(len * s, 0, rad * 0.3, rad, 0, 0, Math.PI * 2)
    ctx.fillStyle = s > 0 ? pal.mid : pal.low
    ctx.fill()
    ctx.strokeStyle = 'rgba(10, 8, 6, 0.62)'
    ctx.lineWidth = Math.max(0.6, rad * 0.1)
    ctx.stroke()
  }

  // Spanten.
  const ribs = LANDFALL_HULK_RIBS + detail * 2
  ctx.strokeStyle = 'rgba(12, 9, 7, 0.44)'
  ctx.lineWidth = Math.max(0.5, rad * 0.09)
  for (let i = 1; i <= ribs; i++) {
    const rx = -len + ((len * 2) / (ribs + 1)) * i
    ctx.beginPath()
    ctx.ellipse(rx, 0, rad * 0.16, rad * 0.94, 0, 0, Math.PI * 2)
    ctx.stroke()
  }

  // Die Luke: dunkle Platte, helle Fuge. Sie ist versiegelt, nicht verschlossen.
  ctx.beginPath()
  ctx.rect(-len * 0.18, -rad * 0.5, len * 0.36, rad)
  ctx.fillStyle = 'rgba(9, 7, 6, 0.82)'
  ctx.fill()
  ctx.beginPath()
  ctx.moveTo(0, -rad * 0.5)
  ctx.lineTo(0, rad * 0.5)
  ctx.strokeStyle = pal.edge
  ctx.globalAlpha = 0.62
  ctx.lineWidth = Math.max(0.7, rad * 0.09)
  ctx.stroke()
  ctx.globalAlpha = 1

  ctx.restore()
}

/**
 * Wayside Cairn — ein Planetoid mit Landmarke.
 *
 * Der Fels ist beliebig, der STEINTURM ist es nicht: vier abnehmende Quader,
 * von jemandem gestapelt, der vor Bard hier vorbeikam. Er wirft einen Schatten
 * über die Oberfläche — das ist die einzige Stelle, an der der Sprite selbst
 * eine Lichtrichtung behauptet, und sie steht bewusst kurz.
 */
export const paintPlanetoid: Paint = (ctx, x, y, r, pal, detail) => {
  const br = r * 0.72

  lumpyPath(ctx, x, y, br, 5, LANDFALL_SILHOUETTE_WOBBLE)
  ctx.fillStyle = bodyFill(ctx, x, y, br, pal.hi, pal.mid, pal.low)
  ctx.fill()
  grain(ctx, x, y, br, 0.13)

  const craters = 3 + detail * 2
  for (let i = 0; i < craters; i++) {
    const a = jitter(i, 41) * Math.PI * 2
    const d = br * (0.16 + jitter(i, 43) * 0.56)
    crater(
      ctx,
      x + Math.cos(a) * d,
      y + Math.sin(a) * d,
      br * (0.08 + jitter(i, 47) * 0.1),
      pal.edge,
    )
  }

  // Der Turm sitzt oben auf der Kuppe, nicht in der Mitte: ein Steinmal steht
  // dort, wo man es von weitem sieht.
  const baseY = y - br * 0.78
  let w = br * 0.3
  let h = br * 0.15
  let ty = baseY
  for (let i = 0; i < LANDFALL_CAIRN_STONES; i++) {
    ctx.beginPath()
    ctx.rect(x - w / 2 + sway(i, 53) * w * 0.16, ty - h, w, h)
    ctx.fillStyle = i % 2 === 0 ? pal.mid : pal.hi
    ctx.fill()
    ctx.strokeStyle = 'rgba(10, 8, 6, 0.6)'
    ctx.lineWidth = Math.max(0.5, h * 0.16)
    ctx.stroke()
    ty -= h
    w *= 0.78
    h *= 0.86
  }

  // Der geworfene Schatten, gegen die Oberfläche geclippt.
  ctx.save()
  lumpyPath(ctx, x, y, br, 5, LANDFALL_SILHOUETTE_WOBBLE)
  ctx.clip()
  ctx.beginPath()
  ctx.moveTo(x - br * 0.14, baseY)
  ctx.lineTo(x + br * 0.5, baseY + br * 0.4)
  ctx.lineTo(x + br * 0.34, baseY + br * 0.5)
  ctx.lineTo(x - br * 0.2, baseY + br * 0.06)
  ctx.closePath()
  ctx.fillStyle = 'rgba(8, 6, 4, 0.4)'
  ctx.fill()
  ctx.restore()
}

/**
 * The Rupture — eine Gravitationslinse.
 *
 * Kein Körper: drei Sichelbögen gedehnten Sternlichts um ein absolut schwarzes
 * Zentrum, mit einem hauchdünnen hellen Ring an der Kante. Das Bild ist das
 * einer echten Linse — was man sieht, ist Licht von DAHINTER, um das Loch
 * herumgezogen.
 *
 * Kein Terminator (`LANDFALL_BODY_LIT`): sie hat keine Oberfläche, auf die
 * etwas scheinen könnte. Dieselbe Ausnahme, die `DrifterBody` für seine Linse
 * schon führt.
 */
export const paintLens: Paint = (ctx, x, y, r, pal, detail) => {
  const arcs = LANDFALL_LENS_ARCS + detail
  for (let i = 0; i < arcs; i++) {
    const rr = r * (0.56 + (i / arcs) * 0.42)
    const mid = jitter(i, 59) * Math.PI * 2
    const half = 0.5 + jitter(i, 61) * 0.7
    ctx.beginPath()
    ctx.arc(x, y, rr, mid - half, mid + half)
    const g = ctx.createLinearGradient(
      x + Math.cos(mid - half) * rr,
      y + Math.sin(mid - half) * rr,
      x + Math.cos(mid + half) * rr,
      y + Math.sin(mid + half) * rr,
    )
    g.addColorStop(0, 'rgba(201, 191, 240, 0)')
    g.addColorStop(0.5, pal.hi)
    g.addColorStop(1, 'rgba(201, 191, 240, 0)')
    ctx.strokeStyle = g
    ctx.lineWidth = Math.max(0.8, r * (0.03 + jitter(i, 67) * 0.04))
    ctx.lineCap = 'round'
    ctx.stroke()
  }

  // Der Schlund. Absolut schwarz — das Einzige im ganzen Spiel, das kein Licht
  // zurückgibt.
  const maw = ctx.createRadialGradient(x, y, 0, x, y, r * 0.5)
  maw.addColorStop(0, pal.low)
  maw.addColorStop(0.72, pal.low)
  maw.addColorStop(1, 'rgba(7, 6, 12, 0)')
  ctx.beginPath()
  ctx.arc(x, y, r * 0.5, 0, Math.PI * 2)
  ctx.fillStyle = maw
  ctx.fill()

  // Der Photonenring: die Kante, an der das Licht gerade noch entkommt.
  ctx.beginPath()
  ctx.arc(x, y, r * 0.36, 0, Math.PI * 2)
  ctx.strokeStyle = pal.edge
  ctx.globalAlpha = 0.72
  ctx.lineWidth = Math.max(0.7, r * 0.022)
  ctx.stroke()
  ctx.globalAlpha = 1
}

/**
 * Motiv → Zeichenzweig, mit Erschöpfungsprüfung.
 *
 * Der `never`-Rest ist der Compile-Zwang, den `paintLandfallMark` NICHT hat:
 * dort fällt ein neuer Ort still durch die Verzweigung und malt eine leere
 * Raute. Hier compiliert er nicht.
 */
export function paintForMotif(motif: LandfallMotif): Paint {
  switch (motif) {
    case 'shoal':
      return paintShoal
    case 'darkcloud':
      return paintDarkCloud
    case 'derelicts':
      return paintDerelicts
    case 'hulk':
      return paintHulk
    case 'planetoid':
      return paintPlanetoid
    case 'lens':
      return paintLens
    default: {
      const rest: never = motif
      return rest
    }
  }
}

/* ── Bau und Cache ────────────────────────────────────────────────────────────
   LRU wie in `galaxyLandmarks.ts`. Es steht immer nur EIN Ort im Bild, aber ein
   Fensterziehen ändert `--lfb-px` und damit den Schlüssel.                    */

const cache = createSpriteCache(LANDFALL_SPRITE_CACHE_MAX)

export function landfallSpriteKey(
  kind: LandfallKindId,
  px: number,
  dpr: number,
  detail: number,
): string {
  return `${kind}|${px}|${dpr}|${detail}`
}

/**
 * Der Sprite zu einem Ort, in der Kantenlänge, in der er querab steht.
 *
 * `px` ist die KÖRPERkante; das Canvas misst `px × LANDFALL_SPRITE_SPAN`, weil
 * nicht jedes Motiv an seiner Kernkontur endet. Die Mitte des Canvas ist die
 * Mitte des Körpers — der Aufrufer zentriert es und dreht es als Ganzes.
 */
export function buildLandfallSprite(
  kind: LandfallKindId,
  px: number,
  dpr: number,
  detail: 0 | 1 | 2,
): HTMLCanvasElement | null {
  const d = clampSpriteDpr(dpr)
  const key = landfallSpriteKey(kind, px, d, detail)
  const hit = cache.get(key)
  if (hit) return hit

  const span = Math.round(px * LANDFALL_SPRITE_SPAN)
  const made = newSpriteCanvas(span, d)
  if (!made) return null
  const { cv, ctx } = made

  paintForMotif(LANDFALL_BODY_MOTIF[kind])(
    ctx,
    span / 2,
    span / 2,
    px / 2,
    LANDFALL_BODY_PALETTE[kind],
    detail,
  )
  if (LANDFALL_BODY_LIT[kind]) paintTerminator(ctx, span, px / 2)

  cache.set(key, cv)
  return cv
}
