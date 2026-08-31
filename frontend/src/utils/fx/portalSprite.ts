/* ── Das Abflugportal ─────────────────────────────────────────────────────────
   Der Ausgang eines Universums, im schwarzen Raum jenseits der Galaxienscheibe.

   DREI Sprites, und der Schnitt folgt einer Regel: was sich unter Drehung nicht
   aendert, gehoert nicht ins drehende Sprite, und was pulst, gehoert in ein
   eigenes Canvas mit derselben Geometrie (Muster `buildLandfallBeacon`).

   - `maw` — Teich, Filamentgewebe, Schlund (ein DURCHGANG: innen leuchtet das
     Ziel) und das GALAXIENFELD des Ziels darin. Steht, liegt HINTER dem Wirbel.
   - `rim` — Ring und Schwellensaum, sonst nichts. Steht, liegt DAVOR.
   - `swirl` — Wirbelarme und Motes. Dreht per CSS. Nichts Rotationssymmetrisches
     hier hinein: das draehte sichtbar nicht und kostete trotzdem eine Ebene.
   - `halo` — EIN Verlauf, dessen Gipfel auf dem Ring liegt. Pulst per `opacity`.

   KEIN runder Punkt im ganzen Portal — nicht in der Mitte, nicht auf den
   Ringscheiteln, nicht im Schlund. Man sieht HINDURCH, und was man sieht, ist
   ein Universum; ein Punkt darauf ist ein Aufkleber auf dem Durchgang. Dieselbe
   Lektion, die der Firmament-Knoten schon gelernt hat.

   Kein Frame, keine Uhr, kein `Math.random()` — alles aus `seed` und Index,
   sonst saehe das Portal nach jedem Cache-Verwurf anders aus.

   Vorlage der Anatomie ist `paintCoreGate` in `galaxyLandmarks.ts`; ihre
   Begruendungen gelten hier unveraendert und stehen an den Ebenen. */

import {
  FIRMAMENT_PORTAL_ARMS,
  FIRMAMENT_PORTAL_ARM_IN,
  FIRMAMENT_PORTAL_ARM_OUT,
  FIRMAMENT_PORTAL_AURA_SPAN,
  FIRMAMENT_PORTAL_CACHE_MAX,
  FIRMAMENT_PORTAL_BAND_ALPHA,
  FIRMAMENT_PORTAL_BAND_R,
  FIRMAMENT_PORTAL_BAND_SEGMENTS,
  FIRMAMENT_PORTAL_BAND_WOBBLE,
  FIRMAMENT_PORTAL_WEB_ALPHA,
  FIRMAMENT_PORTAL_WEB_IN,
  FIRMAMENT_PORTAL_WEB_JITTER,
  FIRMAMENT_PORTAL_WEB_LINK_SHARE,
  FIRMAMENT_PORTAL_WEB_NODES,
  FIRMAMENT_PORTAL_WEB_OUT,
  FIRMAMENT_PORTAL_WEB_SHELLS,
  FIRMAMENT_PORTAL_WEB_SPARK_R,
  FIRMAMENT_PORTAL_WEB_SPARK_SHARE,
  FIRMAMENT_PORTAL_WEB_TENDRIL_FORKS,
  FIRMAMENT_PORTAL_WEB_TENDRIL_SHARE,
  FIRMAMENT_PORTAL_WEB_W_MAX,
  FIRMAMENT_PORTAL_WEB_W_MIN,
  FIRMAMENT_PORTAL_FIELD_R,
  FIRMAMENT_PORTAL_FIELD_ZOOM,
  FIRMAMENT_PORTAL_HALO_ALPHA,
  FIRMAMENT_PORTAL_MAX_BACKING_PX,
  FIRMAMENT_PORTAL_MOTES,
  FIRMAMENT_PORTAL_MOTE_R,
  FIRMAMENT_PORTAL_PHOTON_R,
  FIRMAMENT_PORTAL_POOL_SPAN,
  FIRMAMENT_PORTAL_RY,
  FIRMAMENT_PORTAL_RIM_SPAN,
  FIRMAMENT_PORTAL_SPRITE_SPAN,
  FIRMAMENT_PORTAL_SWIRL_SPAN,
  FIRMAMENT_MAX_DPR,
  UNIVERSE_DISC_CLOUD_DUST_ALPHA,
  UNIVERSE_DISC_CLOUD_REACH,
} from '@/config/constants'
import { seededRng } from '@/components/bottom/minimap/minimapGalaxyGeometry'
import { GALAXY_WHITE, jitter, paintDustVeil, paintGalaxyField } from '@/utils/fx/universeDisc'

export type PortalLayer = 'maw' | 'swirl' | 'rim' | 'halo'

/** `rgb(...)`-Zerlegung eines Hex-Tons, damit die Verlaeufe eigene Deckkraft
 *  bekommen. Dieselbe Rechnung wie `fade()` in `firmamentPlate.ts`. */
function ink(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`
}

interface WebNode {
  /** Winkel und Radius (als Anteil von `r`) — der Radius traegt die Deckkraft. */
  a: number
  k: number
  x: number
  y: number
}

/**
 * Die FASSUNG: ein Filamentgewebe im Idiom des aeusseren Walls
 * (`paintFirmamentWeb` in `firmamentPlate.ts`).
 *
 * Zwei Fassungen lagen hier vorher, und beide sind an derselben Sache
 * gescheitert. Eine „zersprungene Krone" sollte kein Planetenring sein und war
 * einer. Danach ein Astrolabium — 24 gleiche Zaehne, 8 Speichen, vier Rauten auf
 * den Achsen: das ging ganz herum, las sich aber als KOMPASS. Was den Kompass
 * macht, ist die GLEICHVERTEILUNG; jedes Element mit N gleichen Teilungen ist
 * ein Zifferblatt, egal wie man es einfaerbt.
 *
 * Das Gewebe ist unregelmaessig by construction — und es ist die Materie, aus
 * der in diesem Reiter der Rand des Bekannten besteht. Vier Zuege aus DEMSELBEN
 * Knotensatz: Straenge, Ranken, Lichtpunkte, darueber das Band.
 *
 * Die Bandrechnung ist eine eigene, nicht die des Walls: dessen `bandT`/
 * `webAlpha` haengen an `FIRMAMENT_WEB_INNER/OUTER`, und zwei verschiedene
 * Baender an einem Konstantensatz waeren eine Kopplung, die niemand sucht.
 * Uebernommen ist das Idiom, nicht der Code.
 */
function paintPortalWeb(
  ctx: CanvasRenderingContext2D,
  r: number,
  ry: number,
  tint: string,
  seed: number,
): void {
  // EIN Strom fuer den ganzen Kranz: `seededRng` ist ein LCG, ein Seed je Knoten
  // kollabiert. Dieselbe Regel wie beim Wall.
  const rng = seededRng(seed + 1)
  ctx.lineCap = 'round'

  const lo = FIRMAMENT_PORTAL_WEB_IN
  const hi = FIRMAMENT_PORTAL_WEB_OUT
  const shellGap = hi - lo
  const spread =
    (shellGap / Math.max(1, FIRMAMENT_PORTAL_WEB_SHELLS - 1)) * FIRMAMENT_PORTAL_WEB_JITTER
  const at = (a: number, k: number) => ({ x: Math.cos(a) * r * k, y: Math.sin(a) * ry * k })

  /** Deckkraft nach der Lage IM Band: Gipfel in der Mitte, an beiden Raendern
   *  auf null. So hat das Gewebe weder zum Ring hin noch nach aussen eine Kante,
   *  und es steht nicht im `shadowBlur` des Rings. Gemessen wird gegen die um
   *  den Wurf GEWEITETE Spanne, sonst waeren die aeussersten Knoten unsichtbar. */
  const half = shellGap / 2 + spread
  const mid = (lo + hi) / 2
  const share = (k: number) => {
    const t = 1 - Math.abs(k - mid) / half
    return t <= 0 ? 0 : t * t * (3 - 2 * t)
  }

  // Die Schalen. Aussen stehen mehr Knoten als innen — sonst waeren die Zellen
  // am Rand so breit wie das Band selbst.
  const shells: WebNode[][] = []
  for (let s = 0; s < FIRMAMENT_PORTAL_WEB_SHELLS; s++) {
    const u = FIRMAMENT_PORTAL_WEB_SHELLS > 1 ? s / (FIRMAMENT_PORTAL_WEB_SHELLS - 1) : 1
    const n = Math.round(FIRMAMENT_PORTAL_WEB_NODES * (0.7 + 0.5 * u))
    const step = (Math.PI * 2) / n
    const shell: WebNode[] = []
    for (let i = 0; i < n; i++) {
      const a = i * step + (rng() - 0.5) * step * 0.9 + s * 0.37
      const k = lo + shellGap * u + (rng() - 0.5) * 2 * spread
      shell.push({ a, k, ...at(a, k) })
    }
    shells.push(shell)
  }

  /** Ein Strang. Der Kontrollpunkt liegt nach aussen versetzt — daraus wird die
   *  Kruemmung, die einen Faden von einer Sehne unterscheidet. */
  const strand = (p: WebNode, q: WebNode, dim = 1) => {
    const bow = 1 + (rng() < 0.5 ? -1 : 1) * (0.01 + rng() * 0.05)
    const jitterAlpha = 0.55 + rng() * 0.7
    const t = share((p.k + q.k) / 2)
    ctx.beginPath()
    ctx.moveTo(p.x, p.y)
    ctx.quadraticCurveTo(((p.x + q.x) / 2) * bow, ((p.y + q.y) / 2) * bow, q.x, q.y)
    ctx.strokeStyle = ink(tint, Math.min(0.9, FIRMAMENT_PORTAL_WEB_ALPHA * t * jitterAlpha * dim))
    ctx.lineWidth =
      r *
      (FIRMAMENT_PORTAL_WEB_W_MIN + (FIRMAMENT_PORTAL_WEB_W_MAX - FIRMAMENT_PORTAL_WEB_W_MIN) * t)
    ctx.stroke()
  }

  // Tangential: der Ring jeder Schale.
  for (const shell of shells) {
    for (let i = 0; i < shell.length; i++) strand(shell[i], shell[(i + 1) % shell.length])
  }

  // Radial: jede Schale an die naechste. Die zweite Strebe macht aus je zwei
  // Vierecken drei Zellen — ohne sie bliebe eine Leiter.
  for (let s = 0; s < shells.length - 1; s++) {
    const from = shells[s]
    const to = shells[s + 1]
    for (let i = 0; i < from.length; i++) {
      const j = Math.round((i / from.length) * to.length) % to.length
      strand(from[i], to[j])
      if (rng() < FIRMAMENT_PORTAL_WEB_LINK_SHARE) strand(from[i], to[(j + 1) % to.length], 0.8)
    }
  }

  // Die Ranken haengen an der INNERSTEN Schale: ein Stamm zum Ring hin, der sich
  // einmal gabelt. Sie loesen die Innenkante auf — ohne sie endete das Gewebe an
  // einer Linie, und eine Linie ist wieder ein Reif.
  for (const node of shells[0]) {
    const roll = rng()
    const len = 0.03 + rng() * 0.05
    const swingBase = (rng() - 0.5) * 0.5
    if (roll >= FIRMAMENT_PORTAL_WEB_TENDRIL_SHARE) continue
    const stemK = node.k - len
    const stemA = node.a + swingBase * 0.4
    const stem = { a: stemA, k: stemK, ...at(stemA, stemK) }
    strand(node, stem, 0.9)
    for (let f = 0; f < FIRMAMENT_PORTAL_WEB_TENDRIL_FORKS; f++) {
      const swing = (f - (FIRMAMENT_PORTAL_WEB_TENDRIL_FORKS - 1) / 2) * 0.24 + swingBase * 0.3
      const tipK = stemK - len * (0.35 + rng() * 0.4)
      const tipA = stemA + swing
      strand(stem, { a: tipA, k: tipK, ...at(tipA, tipK) }, 0.7)
    }
  }

  // Die Lichtpunkte auf den Kreuzungen. Ohne sie ist ein Netz aus Haarlinien nur
  // Griess — sie sind es, die es als Gewebe lesbar machen.
  for (const shell of shells) {
    for (const node of shell) {
      const roll = rng()
      const size = 0.5 + rng() * 0.8
      if (roll >= FIRMAMENT_PORTAL_WEB_SPARK_SHARE) continue
      ctx.beginPath()
      ctx.arc(node.x, node.y, r * FIRMAMENT_PORTAL_WEB_SPARK_R * size, 0, Math.PI * 2)
      ctx.fillStyle = ink(tint, Math.min(0.9, FIRMAMENT_PORTAL_WEB_ALPHA * share(node.k) * 1.7))
      ctx.fill()
    }
  }

  // Das BAND — das eine durchgehende Element, das ganz um das Portal herumgeht.
  // Es liegt zuletzt und damit oben: es ist das, was gelesen werden MUSS.
  //
  // Kein sauberer Kreis: ein perfekter duenner Reif um einen dicken Ring ist
  // wieder ein Instrument. Der Radius schwankt ueber zwei Harmonische, die
  // Deckkraft ueber den Umlauf — gezeichnet in Segmenten, damit sie das kann.
  const p1 = rng() * Math.PI * 2
  const p2 = rng() * Math.PI * 2
  const segs = FIRMAMENT_PORTAL_BAND_SEGMENTS
  const bandK = (a: number) =>
    FIRMAMENT_PORTAL_BAND_R *
    (1 + FIRMAMENT_PORTAL_BAND_WOBBLE * (Math.sin(a * 2 + p1) * 0.6 + Math.sin(a * 3 + p2) * 0.4))

  // Zwei Durchgaenge, erst dunkel und breiter: ohne die Unterlage verschwindet
  // die duenne Linie ueber dem Sternfeld.
  for (const pass of [0, 1]) {
    const dark = pass === 0
    // Deutlich staerker als ein Gewebefaden: das Band ist das eine Element, das
    // gelesen werden MUSS, und im Geflecht verschwindet sonst genau das.
    ctx.lineWidth = Math.max(dark ? 1.6 : 0.9, r * (dark ? 0.03 : 0.016))
    for (let i = 0; i < segs; i++) {
      const a0 = (i * Math.PI * 2) / segs
      const a1 = ((i + 1) * Math.PI * 2) / segs
      const p = at(a0, bandK(a0))
      const q = at(a1, bandK(a1))
      const breath = 0.55 + 0.45 * (0.5 + 0.5 * Math.sin(a0 * 3 + p2))
      ctx.beginPath()
      ctx.moveTo(p.x, p.y)
      ctx.lineTo(q.x, q.y)
      ctx.strokeStyle = dark
        ? 'rgba(6, 5, 4, 0.7)'
        : ink(tint, FIRMAMENT_PORTAL_BAND_ALPHA * breath)
      ctx.stroke()
    }
  }
}

/**
 * Der Durchgang: alles, was HINTER dem Wirbel liegt.
 *
 * Die Reihenfolge traegt die Aussage: der Schlund kommt VOR dem Ring, sonst
 * liest sich der Ring als Scheibe statt als Durchgang.
 *
 * `seed` ist die BAHN, `target` das Ziel: der Ort haengt an der einen, Farbe
 * und Feld am anderen. Ein Argument fuer beides waere die Falle.
 */
export function paintPortalMaw(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  tint: string,
  seed: number,
  target: number,
): void {
  ctx.save()
  ctx.translate(cx, cy)

  // Schattenteich. Das Portal steht auf dem Sternfeld des Grundes — ein Loch in
  // einem Leuchten ist kein Loch. Er kommt VOR dem Gewebe, damit der Kranz auf
  // gedaempftem Grund steht statt darin zu verschwinden.
  const span = r * FIRMAMENT_PORTAL_POOL_SPAN
  const pool = ctx.createRadialGradient(0, 0, r * 0.2, 0, 0, span)
  pool.addColorStop(0, 'rgba(6, 5, 4, 0.62)')
  pool.addColorStop(0.55, 'rgba(6, 5, 4, 0.4)')
  pool.addColorStop(1, 'rgba(6, 5, 4, 0)')
  ctx.beginPath()
  ctx.arc(0, 0, span, 0, Math.PI * 2)
  ctx.fillStyle = pool
  ctx.fill()

  // `_RY` ist nicht die flache 0,42 der Landmarke auf der Galaxiekarte: dort
  // fliegt man hindurch, hier sieht man hinein. Die Fassung teilt sie sich mit
  // dem Schlund — dieselbe Ellipse macht aus beiden EIN Objekt.
  const ry = r * FIRMAMENT_PORTAL_RY

  paintPortalWeb(ctx, r, ry, tint, seed)

  // Der Schlund ist ein DURCHGANG, kein Loch: innen leuchtet das Zieluniversum,
  // zum Rand hin wird die Schwelle dunkel. Ein schwarzer Schlund funktioniert
  // im Galaxiekern, wo Glut dahinterliegt — hier steht er auf dem schwarzen
  // Sternfeld, und Schwarz auf Schwarz ist keine Tiefe, sondern nichts.
  const maw = ctx.createRadialGradient(0, 0, 0, 0, 0, r)
  maw.addColorStop(0, ink(tint, 0.32))
  maw.addColorStop(0.4, ink(tint, 0.14))
  maw.addColorStop(0.72, 'rgba(3, 2, 6, 0.8)')
  maw.addColorStop(1, 'rgba(3, 2, 6, 0.94)')
  ctx.beginPath()
  ctx.ellipse(0, 0, r, ry, 0, 0, Math.PI * 2)
  ctx.fillStyle = maw
  ctx.fill()

  // Das andere Universum. Es ist der Beleg, dass man HINDURCH sieht — ohne es
  // ist der Verlauf nur ein Farbfleck.
  //
  // Gemalt wird DASSELBE Feld wie auf der Kartenscheibe (`paintGalaxyField`,
  // Variante `cloud`), nicht ein eigenes Punktfeld: vierzehn weisse Kreise
  // lasen sich als Sternenhimmel, und das ist eine andere Groessenordnung. Die
  // Wolke duennt nach aussen aus, also braucht sie an der Schwelle keine Kante.
  //
  // Beide Ebenen, FERN zuerst: im Schlund gibt es keine Ebenen-Parallaxe, ein
  // Sprite hat eine Drehung. Zusammen ergeben sie die ganze Wolke, und die
  // nahen, groesseren Koerper liegen oben.
  ctx.save()
  ctx.beginPath()
  ctx.ellipse(0, 0, r, ry, 0, 0, Math.PI * 2)
  ctx.clip()
  // Zoom und Stauchung in EINEM Zug: das Achsverhaeltnis bleibt `_RY`, also die
  // Ellipse des Schlunds.
  const z = FIRMAMENT_PORTAL_FIELD_ZOOM
  ctx.scale(z, z * FIRMAMENT_PORTAL_RY)
  const fieldR = (r * FIRMAMENT_PORTAL_FIELD_R) / z
  // Der Nebel zwischen den Galaxien, mit denselben Zahlen wie die Wolke der
  // Karte: ohne ihn zerfaellt das Feld in lose Marken. Er kommt VOR den
  // Koerpern und ist der einzige Kreis hinter der Schwelle.
  paintDustVeil(ctx, 0, 0, fieldR, tint, UNIVERSE_DISC_CLOUD_REACH, UNIVERSE_DISC_CLOUD_DUST_ALPHA)
  paintGalaxyField(ctx, 0, 0, fieldR, tint, target, 'cloud', 'rim')
  paintGalaxyField(ctx, 0, 0, fieldR, tint, target, 'cloud', 'field')
  ctx.restore()

  ctx.restore()
}

/**
 * Die Fassung: was VOR dem Wirbel liegt.
 *
 * Sie ist vom Schlund getrennt, weil die drehenden Arme dazwischen gehoeren —
 * in einem Sprite mit ihm deckte der fast undurchsichtige Schlund sie zu, und
 * der Wirbel eines Portals, den man nicht sieht, ist kein Wirbel.
 */
export function paintPortalRim(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  tint: string,
): void {
  const ry = r * FIRMAMENT_PORTAL_RY
  ctx.save()
  ctx.translate(cx, cy)

  // Der Ring. `shadowBlur` ist hier erlaubt — EINMAL gebacken, nie in einer
  // laufenden Animation.
  ctx.beginPath()
  ctx.ellipse(0, 0, r, ry, 0, 0, Math.PI * 2)
  ctx.strokeStyle = tint
  ctx.lineWidth = r * 0.075
  ctx.shadowColor = ink(tint, 0.7)
  ctx.shadowBlur = r * 0.3
  ctx.stroke()
  ctx.shadowBlur = 0

  // Die Schwelle: ein feiner Saum knapp INNEN am Ring, wo das Licht des Ziels
  // die Kante trifft. Er sitzt dort und nicht bei einem halben Radius — ein
  // zweiter Ring in der Mitte machte aus dem Durchgang eine Zielscheibe.
  ctx.beginPath()
  ctx.ellipse(
    0,
    0,
    r * FIRMAMENT_PORTAL_PHOTON_R,
    ry * FIRMAMENT_PORTAL_PHOTON_R,
    0,
    0,
    Math.PI * 2,
  )
  ctx.strokeStyle = ink(tint, 0.5)
  ctx.lineWidth = Math.max(0.8, r * 0.016)
  ctx.stroke()

  // Hier standen ein Kernfunke und zwei Ankerfunken auf den Scheiteln. Beide
  // sind gefallen, und zwar aus DEMSELBEN Grund: die Tiefe traegt jetzt das
  // Galaxienfeld im Schlund, die Achse die Ellipse samt Saum — ein gefuellter
  // Kreis darauf war ein Aufkleber auf dem Durchgang. Die Mittelglut bleibt,
  // sie steckt im Verlauf des Schlunds (`ink(tint, 0.32)` innen).

  ctx.restore()
}

/**
 * Die drehende Ebene: NUR was seine Drehung zeigt.
 *
 * Ein Arm mit hartem Ende waere eine Speiche, deshalb laufen beide Enden aus
 * (Bauart `paintLens`). Die Motes machen die Drehung ueberhaupt erst ablesbar —
 * dieselbe Rolle wie die Lichtpunkte im Filamentgewebe.
 */
export function paintPortalSwirl(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  tint: string,
  seed: number,
): void {
  ctx.save()
  ctx.translate(cx, cy)
  ctx.lineCap = 'round'

  const start = jitter(seed, 149) * Math.PI * 2
  const rIn = r * FIRMAMENT_PORTAL_ARM_IN
  const rOut = r * FIRMAMENT_PORTAL_ARM_OUT

  for (let i = 0; i < FIRMAMENT_PORTAL_ARMS; i++) {
    const a0 = start + (i * Math.PI * 2) / FIRMAMENT_PORTAL_ARMS
    const sweep = 1.1 + jitter(i + seed, 151) * 0.6
    const a1 = a0 + sweep
    const ax = Math.cos(a0) * rIn
    const ay = Math.sin(a0) * rIn
    const bx = Math.cos(a1) * rOut
    const by = Math.sin(a1) * rOut
    // Der Kontrollpunkt liegt nach aussen versetzt — daraus wird die Kruemmung,
    // die einen Arm von einer Sehne unterscheidet.
    const mid = (a0 + a1) / 2
    const bow = (rIn + rOut) / 2 + r * (0.12 + jitter(i + seed, 157) * 0.14)

    const g = ctx.createLinearGradient(ax, ay, bx, by)
    g.addColorStop(0, ink(tint, 0))
    g.addColorStop(0.45, ink(tint, 0.28 + jitter(i + seed, 163) * 0.22))
    g.addColorStop(1, ink(tint, 0))
    ctx.beginPath()
    ctx.moveTo(ax, ay)
    ctx.quadraticCurveTo(Math.cos(mid) * bow, Math.sin(mid) * bow, bx, by)
    ctx.strokeStyle = g
    ctx.lineWidth = r * (0.05 + jitter(i + seed, 151) * 0.06)
    ctx.stroke()
  }

  // Die Motes sind KOERPER, keine Punkte: dieselben geneigten Ellipsen wie das
  // Feld im Schlund, nur naeher. Damit tragen die beiden Sprites zusammen die
  // Parallaxe der Wolke — nahe Galaxien wandern vor einem stehenden fernen
  // Feld, wo vorher zwei Punktsorten uebereinander lagen.
  for (let i = 0; i < FIRMAMENT_PORTAL_MOTES; i++) {
    const a = start + jitter(i + seed, 167) * Math.PI * 2
    const rr = r * (0.5 + jitter(i + seed, 173) * 0.45)
    const rx = r * FIRMAMENT_PORTAL_MOTE_R * (0.7 + jitter(i + seed, 179) * 0.7)
    ctx.beginPath()
    ctx.ellipse(
      Math.cos(a) * rr,
      Math.sin(a) * rr,
      rx,
      rx * (0.34 + jitter(i + seed, 181) * 0.58),
      jitter(i + seed, 187) * Math.PI,
      0,
      Math.PI * 2,
    )
    ctx.fillStyle = ink(i % 3 === 0 ? tint : GALAXY_WHITE, 0.85)
    ctx.fill()
  }

  ctx.restore()
}

/** Der Halo — EIN Verlauf, dessen Gipfel auf dem Ringradius liegt: das Leuchten
 *  atmet AM Ring, nicht als Nebelball darum. Rotationssymmetrisch, deshalb ein
 *  eigenes Canvas statt einer Ebene im drehenden Sprite. */
export function paintPortalHalo(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  outer: number,
  r: number,
  tint: string,
): void {
  const peak = Math.min(0.95, r / outer)
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, outer)
  g.addColorStop(0, ink(tint, 0))
  g.addColorStop(Math.max(0, peak - 0.19), ink(tint, 0.1))
  g.addColorStop(peak, ink(tint, FIRMAMENT_PORTAL_HALO_ALPHA))
  g.addColorStop(Math.min(1, peak + 0.19), ink(tint, 0.12))
  g.addColorStop(1, ink(tint, 0))
  ctx.beginPath()
  ctx.arc(cx, cy, outer, 0, Math.PI * 2)
  ctx.fillStyle = g
  ctx.fill()
}

const cache = new Map<string, HTMLCanvasElement>()

/** `seed` und das ZIEL sind GETRENNT: der Ort haengt an der Bahn, Farbe und
 *  Galaxienfeld am Ziel. Ein `universe`-Argument allein waere die Falle.
 *
 *  `target` gehoert in den Schluessel — ohne ihn zeigte das Portal nach einem
 *  Universumswechsel das Feld des vorigen Ziels weiter, und nichts daran saehe
 *  im Code falsch aus. Dieselbe Falle, wegen der `variant` im
 *  `universeDiscKey` steht. */
export function portalSpriteKey(
  layer: PortalLayer,
  seed: number,
  tint: string,
  target: number,
  px: number,
  dpr: number,
): string {
  return `${layer}|${seed}|${tint}|${target}|${px}|${dpr}`
}

/** Kantenlaenge des Sprites zu einem Ringdurchmesser `px`. Je Ebene eigen: das
 *  stehende Sprite muss den Schattenteich fassen, das drehende nur die Arme. */
export function portalSpriteSpan(layer: PortalLayer, px: number): number {
  const factor =
    layer === 'halo'
      ? FIRMAMENT_PORTAL_AURA_SPAN
      : layer === 'swirl'
        ? FIRMAMENT_PORTAL_SWIRL_SPAN
        : layer === 'rim'
          ? FIRMAMENT_PORTAL_RIM_SPAN
          : FIRMAMENT_PORTAL_SPRITE_SPAN
  return Math.round(px * factor)
}

function backingDpr(span: number, dpr: number): number {
  return Math.max(1, Math.min(dpr, FIRMAMENT_MAX_DPR, FIRMAMENT_PORTAL_MAX_BACKING_PX / span))
}

function touch(key: string): HTMLCanvasElement | undefined {
  const hit = cache.get(key)
  if (!hit) return undefined
  cache.delete(key)
  cache.set(key, hit)
  return hit
}

function keep(key: string, cv: HTMLCanvasElement): HTMLCanvasElement {
  cache.set(key, cv)
  if (cache.size > FIRMAMENT_PORTAL_CACHE_MAX) {
    const oldest = cache.keys().next().value
    if (oldest !== undefined) cache.delete(oldest)
  }
  return cv
}

export function buildPortalSprite(
  layer: PortalLayer,
  seed: number,
  tint: string,
  target: number,
  px: number,
  dpr: number,
): HTMLCanvasElement | null {
  const span = portalSpriteSpan(layer, px)
  const d = backingDpr(span, dpr)
  const key = portalSpriteKey(layer, seed, tint, target, px, d)
  const hit = touch(key)
  if (hit) return hit

  const cv = document.createElement('canvas')
  cv.width = Math.max(1, Math.round(span * d))
  cv.height = Math.max(1, Math.round(span * d))
  const ctx = cv.getContext('2d')
  if (!ctx) return null
  ctx.setTransform(d, 0, 0, d, 0, 0)

  const mid = span / 2
  const r = px / 2
  if (layer === 'maw') paintPortalMaw(ctx, mid, mid, r, tint, seed, target)
  else if (layer === 'swirl') paintPortalSwirl(ctx, mid, mid, r, tint, seed)
  else if (layer === 'rim') paintPortalRim(ctx, mid, mid, r, tint)
  else paintPortalHalo(ctx, mid, mid, mid, r, tint)

  return keep(key, cv)
}

export function clearPortalSpriteCache(): void {
  cache.clear()
}
