import {
  BOTTOM_BAR_HEIGHT,
  BOTTOM_BAR_SIDE_W,
  BOTTOM_BAR_CENTER_TOP_Y,
  BOTTOM_BAR_NOTCH_R,
  BOTTOM_BAR_EDGE_INSET,
  HUD_PANEL_ARC_R,
} from '@/config/constants'
import type { HeaderCenterArc } from '@/utils/orbit/geometry'

/**
 * Wo das HUD an einer bestimmten Stelle des Bildes aufhört — die KONTUR, nicht
 * ein Rechteck.
 *
 * Beides, Header und Bottom-Bar, hat eine Form: die Bar steht an den Enden hoch
 * (Minimap, Command Panel) und fällt in der Mitte auf einen schmalen Streifen
 * ab, der Header hängt mittig als Oval herunter und endet seitlich früh — an
 * den äußersten Rändern gibt es ihn gar nicht. Mit einem Rechteck gerechnet
 * verliert die Bühne rund 250 px in der Bildmitte und ebenso viel an den
 * Header-Enden: Platz, auf dem nichts steht und trotzdem nichts erscheinen
 * darf.
 *
 * **Gerechnet, nicht gemessen.** Die Formen entstehen aus Konstanten
 * (`BOTTOM_BAR_*`) und aus einer Geometrie, die der Header ohnehin
 * veröffentlicht (`useHeaderCenterArc`) — dieselben Zahlen, aus denen der
 * SVG-Pfad in `BottomBarComponent` gebaut wird. Die Kontur ein zweites Mal aus
 * dem DOM abzutasten wäre eine zweite Quelle für dieselbe Form, und zwei
 * Quellen laufen auseinander, sobald jemand eine der Zahlen anfasst.
 *
 * Jede Funktion hier ist O(1) und darf pro Frame und Körper laufen.
 */

/** Was die Kontur über den aktuellen Bildschirm wissen muss. */
export interface HudFieldMetrics {
  viewportW: number
  viewportH: number
  /** `--hud-scale` — die Bar ist in ihren eigenen Einheiten definiert. */
  hudScale: number
  /** `--header-total-height`: Unterkante der Header-Leiste selbst. */
  headerBottom: number
  /** `--header-vp-left` / rechte Kante: außerhalb gibt es keinen Header. */
  headerLeft: number
  headerRight: number
  /** `--level-badge-bottom`: tiefster Punkt in der Mitte (Oval + Level-Medaille). */
  headerCenterBottom: number
  /** Bogen des herabhängenden Ovals, `null` solange ungemessen. */
  centerArc: HeaderCenterArc | null
  /**
   * `--kb-hud-h`: die Keycap-Leiste reitet auf dem rechten Panel und ist
   * genauso undurchsichtig. Sie zählt zur Panel-Zone, nicht zum Streifen.
   */
  keycapBar: number
  /**
   * Oberkante der Fähigkeitenleiste als Bildkoordinate — 0, wenn keine im Feld
   * steht (angedockt im Star Fight, oder abgebaut, weil ein Profil-Tab offen
   * ist). Die Leiste veröffentlicht sie selbst als `--ability-bar-top`.
   */
  abilityBarTop: number
  /** Halbe Breite derselben Leiste; sie steht mittig. 0 = keine Leiste. */
  abilityBarHalfW: number
  /**
   * `--wayfinder-bottom` / `--wayfinder-right`: die Missionskarte oben links.
   *
   * Von den fünf Karten dieser Spalte ist sie die einzige, die IMMER steht —
   * und nur deshalb steht sie überhaupt in der Kontur. Die vier flüchtigen
   * darunter aufzunehmen hiesse, das freie Feld im Sekundentakt zu verschieben:
   * ein Drifter, der eine Bahn geplant hat, müsste sie mitten im Flug
   * aufgeben, weil ein Vorzeichen erschienen ist. Konservativ ist hier das
   * Gegenteil von vollständig.
   *
   * Beides sind reine `px`-Werte aus JavaScript, also nicht vom
   * `calc()`-Fallstrick betroffen, an dem `--hud-panel-size` scheitert.
   */
  wayfinderBottom: number
  wayfinderRight: number
}

/**
 * Oberkante der Bottom-Bar an der Stelle `x`.
 *
 * Bildet den Pfad aus `BottomBarComponent.framePath` nach: Panel-Oberkante mit
 * abgerundeter Außenecke, senkrechte Innenkante, Notch-Bogen, Mittelstreifen.
 * An der senkrechten Innenkante gibt es keine Höhe, sondern einen Sprung —
 * dort gilt der HÖHERE Wert, sonst reichte ein Körper in die Kante hinein.
 */
export function hudBarTopAt(x: number, m: HudFieldMetrics): number {
  const s = m.hudScale
  const barTop = m.viewportH - BOTTOM_BAR_HEIGHT * s
  const arc = HUD_PANEL_ARC_R * s
  const notch = BOTTOM_BAR_NOTCH_R * s
  const side = BOTTOM_BAR_SIDE_W * s
  const center = BOTTOM_BAR_CENTER_TOP_Y * s
  const inset = BOTTOM_BAR_EDGE_INSET

  // Die Bar ist spiegelsymmetrisch — gerechnet wird auf dem Abstand zur
  // näheren Seitenkante.
  const dx = Math.min(x, m.viewportW - x)
  // Über dem Panel sitzt noch die Keycap-Leiste. Sie steht nur rechts, wird
  // aber auf beiden Seiten gerechnet: die Symmetrie ist billiger als eine
  // Sonderbehandlung, und links kostet sie 30 px in einer Ecke, in der die
  // Minimap ohnehin steht.
  const panelTop = barTop + inset - m.keycapBar

  if (dx <= side - arc) return panelTop
  if (dx <= side) {
    // Außenecke des Panels: Viertelkreis um (side − arc, arc + inset).
    const t = dx - (side - arc)
    return panelTop + arc - Math.sqrt(Math.max(0, arc * arc - t * t))
  }
  if (dx <= side + notch) {
    // Innere Kehle, wo das Panel auf den Streifen trifft.
    const t = side + notch - dx
    return barTop + center - Math.sqrt(Math.max(0, notch * notch - t * t))
  }
  return barTop + center
}

/**
 * Unterkante des Headers an der Stelle `x`.
 *
 * Drei Zonen: außerhalb der Header-Leiste gar kein Chrome, darunter die
 * Leistenkante, und in der Mitte das Oval, das tiefer hängt. Die Ovalkurve wird
 * so gestreckt, dass ihr Scheitel `--level-badge-bottom` trifft — dort hängt
 * die Level-Medaille unter dem Oval, und die misst niemand einzeln. So ist die
 * Kurve in der Mitte exakt und daneben eine Spur zu vorsichtig, was die
 * richtige Richtung ist.
 */
export function hudHeaderBottomAt(x: number, m: HudFieldMetrics): number {
  if (x < m.headerLeft || x > m.headerRight) return 0
  const arc = m.centerArc
  if (!arc || arc.rx <= 0 || arc.ry <= 0) {
    // Ungemessen: die konservative Kante, also das bisherige Verhalten.
    return m.headerCenterBottom
  }

  const cx = m.headerLeft + arc.cx
  const dx = Math.abs(x - cx)
  if (dx >= arc.rx) return m.headerBottom

  // Tiefe des Ovals unter der Leistenkante an dieser Stelle.
  const depth = arc.ry * Math.sqrt(1 - (dx / arc.rx) ** 2) - arc.topOffset
  if (depth <= 0) return m.headerBottom

  const apex = arc.ry - arc.topOffset
  const target = Math.max(0, m.headerCenterBottom - m.headerBottom)
  const stretch = apex > 0 ? target / apex : 1
  return m.headerBottom + depth * stretch
}

/**
 * Oberkante der FÄHIGKEITENLEISTE an der Stelle `x`, oder die Bildunterkante,
 * wo keine steht.
 *
 * Sie liegt als eigene Kante neben `hudBarTopAt` und nicht darin: jene Funktion
 * bildet `BottomBarComponent.framePath` nach — einen Bogen mit Panel, Kehle und
 * Mittelstreifen — und wird in `voidPath.spec.ts` als genau dieser Pfad geprüft.
 * Die Leiste ist dagegen ein schlichtes Rechteck, mittig über dem
 * Mittelstreifen und um 14 px davon abgesetzt. Zwei Formen in einer Funktion
 * nähmen der Spec ihre Aussage.
 *
 * Beide Zahlen kommen aus der Leiste selbst (`--ability-bar-top`,
 * `--ability-bar-w`), nicht aus einer nachgebauten Rechnung: ihre Kachelgröße
 * springt an zwei Breiten-Breakpoints (84/104/128 px), und sie verschwindet
 * ganz, sobald sie ins Star-Fight-Modal andockt oder ein Profil-Tab sie abbaut.
 * Eine Konstante hier wäre auf Full HD richtig und auf 4K falsch.
 */
export function hudAbilityBarTopAt(x: number, m: HudFieldMetrics): number {
  if (m.abilityBarHalfW <= 0 || m.abilityBarTop <= 0) return m.viewportH
  return Math.abs(x - m.viewportW / 2) <= m.abilityBarHalfW ? m.abilityBarTop : m.viewportH
}

/**
 * Unterkante der Missionskarte an der Stelle `x` — 0 rechts von ihr.
 *
 * Sie ist ein Rechteck und kein Bogen, also reicht der Vergleich mit ihrer
 * rechten Kante. Getrennt von `hudHeaderBottomAt` gehalten, weil die beiden
 * verschiedene Formen sind: der Header EXISTIERT links der Spalte gar nicht
 * (`x < headerLeft` liefert dort 0), und genau in diese Lücke hängt die Karte.
 */
export function hudLeftColumnBottomAt(x: number, m: HudFieldMetrics): number {
  return x <= m.wayfinderRight ? m.wayfinderBottom : 0
}

/** Die freie senkrechte Spanne an der Stelle `x`. */
export function hudFreeBandAt(x: number, m: HudFieldMetrics): { top: number; bottom: number } {
  return {
    // Die tiefere der beiden Oberkanten gewinnt: unter dem Header ist es der
    // Header, links davon die Missionskarte, und in der Überlappung beides.
    top: Math.max(hudHeaderBottomAt(x, m), hudLeftColumnBottomAt(x, m)),
    // Die tiefere der beiden Unterkanten gewinnt. Über dem Mittelstreifen ist
    // das die Leiste, an den Seiten die Bar — und zwischen beiden liegt kein
    // Übergang, sondern eine Stufe: die Leiste hört seitlich einfach auf.
    bottom: Math.min(hudBarTopAt(x, m), hudAbilityBarTopAt(x, m)),
  }
}

/**
 * Die ENGSTE Spanne über die Breite eines Körpers.
 *
 * Ein Punkt hat keine Breite, ein Plättchen schon: die Belohnungskarte eines
 * Sterns misst rund 80 px, und in der Kehle zwischen Seitenpanel und
 * Mittelstreifen springt die Kontur auf dieser Strecke um mehrere hundert
 * Pixel. Wer nur den Mittelpunkt fragt, hängt dort mit einer Ecke im Panel —
 * gemessen an genau der Karte, die vorher bei 0 % lag und danach wieder bei
 * 2,4 %.
 */
export function hudFreeBandOver(
  x: number,
  halfWidth: number,
  m: HudFieldMetrics,
): { top: number; bottom: number } {
  const mid = hudFreeBandAt(x, m)
  if (halfWidth <= 0) return mid
  const left = hudFreeBandAt(x - halfWidth, m)
  const right = hudFreeBandAt(x + halfWidth, m)
  return {
    top: Math.max(left.top, mid.top, right.top),
    bottom: Math.min(left.bottom, mid.bottom, right.bottom),
  }
}

/**
 * Die Kennzahlen, wie das HUD sie gerade meldet — UNGECACHT.
 *
 * Für den laufenden Betrieb `hudFieldMetrics()` nehmen: das hier liest sechs
 * berechnete Stile, und ein `getComputedStyle` je Frame erzwingt eine
 * Stil-Neuberechnung. Am Drifter wurde genau das einmal gemessen, mit rund
 * −17 fps bei laufendem Orbit.
 *
 * Der Bogen kommt aus dem geteilten Ref des Headers und ist bis zur ersten
 * Messung `null`, was die Kontur als „ganze Header-Breite auf voller Tiefe"
 * liest — konservativ, also unschädlich.
 */
export function readHudFieldMetrics(centerArc: HeaderCenterArc | null): HudFieldMetrics {
  const viewportW = typeof window === 'undefined' ? 0 : window.innerWidth
  const viewportH = typeof window === 'undefined' ? 0 : window.innerHeight
  if (typeof document === 'undefined') {
    return {
      viewportW,
      viewportH,
      hudScale: 1,
      headerBottom: 0,
      headerLeft: 0,
      headerRight: viewportW,
      headerCenterBottom: 0,
      centerArc: null,
      keycapBar: 0,
      abilityBarTop: 0,
      abilityBarHalfW: 0,
      wayfinderBottom: 0,
      wayfinderRight: 0,
    }
  }
  const style = getComputedStyle(document.documentElement)
  const read = (name: string, fallback: number): number => {
    const parsed = parseFloat(style.getPropertyValue(name))
    return Number.isFinite(parsed) ? parsed : fallback
  }
  const headerBottom = read('--header-total-height', 0)
  const headerLeft = read('--header-vp-left', 0)
  return {
    viewportW,
    viewportH,
    hudScale: read('--hud-scale', 1),
    headerBottom,
    headerLeft,
    // Der Header steht mittig; seine rechte Kante ist die gespiegelte linke.
    headerRight: viewportW - headerLeft,
    headerCenterBottom: Math.max(headerBottom, read('--level-badge-bottom', headerBottom)),
    centerArc,
    keycapBar: Math.max(0, read('--kb-hud-h', 0)),
    abilityBarTop: Math.max(0, read('--ability-bar-top', 0)),
    abilityBarHalfW: Math.max(0, read('--ability-bar-w', 0)) / 2,
    wayfinderBottom: Math.max(0, read('--wayfinder-bottom', 0)),
    wayfinderRight: Math.max(0, read('--wayfinder-right', 0)),
  }
}

// ── Zwischenspeicher ────────────────────────────────────────────────────────

let cached: HudFieldMetrics | null = null
let cachedKey = ''

function metricsKey(centerArc: HeaderCenterArc | null): string {
  const w = typeof window === 'undefined' ? 0 : window.innerWidth
  const h = typeof window === 'undefined' ? 0 : window.innerHeight
  const a = centerArc
    ? `${centerArc.cx}|${centerArc.rx}|${centerArc.ry}|${centerArc.topOffset}`
    : '-'
  return `${w}x${h}|${a}`
}

/**
 * Die Kontur-Kennzahlen, gültig für diesen Bildschirm — DAS hier gehört in
 * Frame-Schleifen.
 *
 * Das HUD bewegt sich nur, wenn das Fenster sich bewegt; der Schlüssel aus
 * Fenstermaß und Header-Bogen deckt jede Änderung ab, die die Kontur wirklich
 * verschiebt (`--hud-scale`, `--level-badge-bottom` und `--kb-hud-h` hängen
 * alle am Viewport). Blendet ausnahmsweise ein Element aus, ohne dass sich das
 * Fenster ändert, steht der Wert bis zum nächsten Resize — konservativ in die
 * sichere Richtung, und `invalidateHudField()` löst es sofort auf.
 */
export function hudFieldMetrics(centerArc: HeaderCenterArc | null): HudFieldMetrics {
  const key = metricsKey(centerArc)
  if (cached && cachedKey === key) return cached
  cached = readHudFieldMetrics(centerArc)
  cachedKey = key
  return cached
}

/** Verwirft den Zwischenspeicher — für Fälle, die der Schlüssel nicht sieht. */
export function invalidateHudField(): void {
  cached = null
  cachedKey = ''
}
