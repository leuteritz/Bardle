import { describe, it, expect } from 'vitest'
import {
  landmarkTier,
  landmarkPad,
  landmarkVariantFor,
  landmarkSpriteKey,
  roundLandmarkRadius,
  paintLandfallMark,
  paintFreedStarCore,
  LANDFALL_KINDS,
  isLandfallLandmark,
} from '@/utils/fx/galaxyLandmarks'
import { LANDFALL_LANDMARK_KIND } from '@/config/world/landfalls'

/**
 * Ein Canvas-Kontext, der nur mitschreibt.
 *
 * jsdom liefert für `getContext('2d')` `null` — ein rasternder Vergleich
 * prüfte dort nichts und sähe trotzdem grün aus. Aufgezeichnet werden Pfad- und
 * Füllbefehle samt ihrer gerundeten Koordinaten; das trennt zwei Marken
 * zuverlässig, ohne einen Pixel zu brauchen.
 */
function recordingCtx(): { ctx: CanvasRenderingContext2D; ops: string[] } {
  const ops: string[] = []
  const num = (v: number) => Math.round(v * 100) / 100
  const rec =
    (name: string) =>
    (...args: unknown[]) => {
      ops.push(`${name}(${args.map((a) => (typeof a === 'number' ? num(a) : String(a))).join(',')})`)
    }
  const ctx = {
    beginPath: rec('beginPath'),
    closePath: rec('closePath'),
    moveTo: rec('moveTo'),
    lineTo: rec('lineTo'),
    arc: rec('arc'),
    fill: rec('fill'),
    stroke: rec('stroke'),
    save: rec('save'),
    restore: rec('restore'),
    lineWidth: 1,
    lineCap: 'butt',
    fillStyle: '',
    strokeStyle: '',
  } as unknown as CanvasRenderingContext2D
  return { ctx, ops }
}
import {
  LANDMARK_FREED_CORE,
  LANDMARK_FREED_CORE_R_RATIO,
  LANDMARK_FREED_RING,
  LANDMARK_ROLE_CORE,
  ROLE_COLORS,
  LANDMARK_LANDFALL_RING,
  LANDMARK_LANDFALL_MISSED_ALPHA,
  LANDMARK_PAD_SPAN,
  LANDMARK_VARIANTS,
} from '@/config/constants'
import { minimapAccentForTheme } from '@/components/bottom/minimap/minimapGalaxyGeometry'
import { GALAXY_THEMES } from '@/config/world/galaxyThemes'

/**
 * Canvas ist unter jsdom nicht malbar (`getContext('2d')` liefert null) — prüfbar
 * ist deshalb nur die Rechnerei. Sie trägt aber genau die Zusicherungen, an denen
 * die Bildsprache hängt:
 *
 *  - Die Schwellen sind EINGEKLEMMT, nicht gewählt. Die Radien der echten
 *    Flächen sind 3.5 / 4.5 (Leistenminiatur), 7 / 8.5 (Archivstandbild und
 *    Karte auf Full HD) und 11+ (2K, 4K, Live-Minimap). Verrutscht eine Schwelle,
 *    trägt die Miniatur plötzlich Zierrat oder das Standbild keinen mehr.
 *  - Der Radius entscheidet über den Sprite-Schlüssel. Fielen befreit und
 *    verloren in der Miniatur auf denselben Wert, wären beide Marken gleich gross.
 */

/** Massstab der Leistenminiatur: box.w 168 / GALAXY_PLATE_REF_W 320. */
const THUMB_HK = 168 / 320

describe('landmarkTier — die Stufen liegen zwischen den echten Radien', () => {
  it('lässt die Leistenminiatur auf der blanken Silhouette', () => {
    expect(landmarkTier(3.5)).toBe(0)
    expect(landmarkTier(4.5)).toBe(0)
  })

  it('gibt Standbild und Full-HD-Karte die mittlere Stufe', () => {
    expect(landmarkTier(7)).toBe(1)
    expect(landmarkTier(8.5)).toBe(1)
  })

  it('gibt Live-Minimap, 2K und 4K die volle Stufe', () => {
    expect(landmarkTier(11)).toBe(2)
    expect(landmarkTier(13.5)).toBe(2)
    expect(landmarkTier(31.5)).toBe(2)
  })

  it('wächst monoton mit dem Radius', () => {
    let last = -1
    for (let r = 0; r <= 40; r += 0.5) {
      const t = landmarkTier(r)
      expect(t).toBeGreaterThanOrEqual(last)
      last = t
    }
  })
})

describe('landmarkPad — die Randzone deckt den weitesten Zierrat', () => {
  it('umschliesst immer mindestens die Zierspanne', () => {
    for (const r of [2, 3.5, 4.5, 7, 8.5, 11, 31.5, 67]) {
      expect(landmarkPad(r)).toBeGreaterThanOrEqual(r * LANDMARK_PAD_SPAN)
    }
  })

  it('bleibt beim grössten Live-Radius in der inView-Randzone der Minimap', () => {
    // MiniMapCanvas verwirft Marken ausserhalb von ±40 px — ein Sprite, das
    // weiter hereinragte, verschwände beim Scrollen der Kamera abrupt.
    expect(landmarkPad(11)).toBeLessThanOrEqual(40)
  })
})

describe('roundLandmarkRadius — halbe Pixel, nicht ganze', () => {
  it('trennt befreiten und verlorenen Stern noch in der Leistenminiatur', () => {
    // Ganzzahlig gerundet fielen 4.46 und 3.67 beide auf 4.
    expect(roundLandmarkRadius(8.5 * THUMB_HK)).not.toBe(roundLandmarkRadius(7 * THUMB_HK))
  })

  it('hält einen Boden, damit nichts zum Punkt zerfällt', () => {
    expect(roundLandmarkRadius(0)).toBe(2)
    expect(roundLandmarkRadius(0.4)).toBe(2)
  })

  it('rastet auf halbe Schritte und bleibt monoton', () => {
    let last = 0
    for (let r = 2; r <= 40; r += 0.1) {
      const v = roundLandmarkRadius(r)
      expect(v * 2).toBe(Math.round(v * 2))
      expect(v).toBeGreaterThanOrEqual(last)
      last = v
    }
  })
})

describe('Sprite-Schlüssel und Varianten', () => {
  it('hält die Variante im gültigen Bereich, auch bei negativem Index', () => {
    for (const i of [-4, -1, 0, 1, 7, 41]) {
      const v = landmarkVariantFor(i)
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(LANDMARK_VARIANTS)
    }
  })

  it('unterscheidet in jedem Feld', () => {
    const base = landmarkSpriteKey('star-freed', 9, 2, 0)
    expect(landmarkSpriteKey('star-lost', 9, 2, 0)).not.toBe(base)
    expect(landmarkSpriteKey('star-freed', 8.5, 2, 0)).not.toBe(base)
    expect(landmarkSpriteKey('star-freed', 9, 3.1, 0)).not.toBe(base)
    expect(landmarkSpriteKey('star-freed', 9, 2, 1)).not.toBe(base)
  })

  it('ist für dieselbe Marke stabil', () => {
    expect(landmarkSpriteKey('star-freed', 9, 2, 1)).toBe(landmarkSpriteKey('star-freed', 9, 2, 1))
  })
})


/* ── Die Palette der Karte ────────────────────────────────────────────────────
   Gebunden wird das ARGUMENT hinter der Farbwahl, nicht der Geschmack. Es lautet:
   die zwanzig Galaxie-Themen decken den Farbkreis fast lückenlos ab, also kämpft
   jeder gesättigte Ton in vier bis fünf Galaxien mit den Armpartikeln um denselben
   Farbton — nur ein UNBUNTER Ring trägt auf allen zwanzig. Die Bedeutung steckt
   deshalb im Kern, wo sie zwei Pixel misst. Und Gold gehört der REISE: Route,
   Chevrons, Ankunftsportal, Hafen-Marken. */

/** `#rrggbb` → [r, g, b]. */
function rgbOf(hex: string): [number, number, number] {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ]
}

/**
 * Chroma, 0 = unbunt: der blanke Abstand zwischen hellstem und dunkelstem Kanal.
 *
 * Und ausdrücklich NICHT die HSL-Sättigung — die teilt durch `1 - |2L - 1|` und
 * explodiert damit nahe Weiss: #eef2f8 liegt bei 0,42, obwohl seine Kanäle nur
 * zehn von 255 auseinanderliegen und niemand dem Ring eine Farbe ansieht.
 */
function chroma(hex: string): number {
  const [r, g, b] = rgbOf(hex)
  return (Math.max(r, g, b) - Math.min(r, g, b)) / 255
}

function distance(a: [number, number, number], b: [number, number, number]): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])
}

/** Gold der Reise — Route, Chevrons, Portal, Hafen-Marken. */
const JOURNEY_GOLD: [number, number, number] = [232, 192, 64]
/** Ember des verlorenen Sterns. */
const LOST_EMBER: [number, number, number] = [204, 96, 80]

describe('Die Marke des befreiten Sterns — unbunt im Ring, Bedeutung im Kern', () => {
  it('hält den Ring unbunt, denn nur so trägt er auf allen zwanzig Themen', () => {
    expect(chroma(LANDMARK_FREED_RING)).toBeLessThan(0.06)
  })

  it('lässt den Ring hell genug bleiben, um über den Armpartikeln zu stehen', () => {
    const [r, g, b] = rgbOf(LANDMARK_FREED_RING)
    expect(Math.min(r, g, b)).toBeGreaterThan(210)
  })

  it('trennt Ring und Kern vom Gold der Reise', () => {
    expect(distance(rgbOf(LANDMARK_FREED_RING), JOURNEY_GOLD)).toBeGreaterThan(120)
    expect(distance(rgbOf(LANDMARK_FREED_CORE), JOURNEY_GOLD)).toBeGreaterThan(120)
  })

  it('trennt sie ebenso vom Ember des verlorenen Sterns', () => {
    expect(distance(rgbOf(LANDMARK_FREED_RING), LOST_EMBER)).toBeGreaterThan(120)
    expect(distance(rgbOf(LANDMARK_FREED_CORE), LOST_EMBER)).toBeGreaterThan(120)
  })

  it('hält den Ring von JEDEM Themenakzent fern — die Prüfung, die eine bunte Ringfarbe kippt', () => {
    const ring = rgbOf(LANDMARK_FREED_RING)
    for (let i = 0; i < GALAXY_THEMES.length; i++) {
      const accent = minimapAccentForTheme(i).split(', ').map(Number) as [number, number, number]
      expect(distance(ring, accent)).toBeGreaterThan(60)
    }
  })
})

/* ── Der Kern nennt die Rolle ─────────────────────────────────────────────────
   Seit ein Stern ein Manifest hat, trägt sein Kern die ROLLE des Champions, den
   er hergab. Der Ring bleibt unbunt — die fünf Tests darüber gelten unverändert
   weiter, `LANDMARK_FREED_CORE` ist unangetastet und bleibt der Fallback.

   Was hier gebunden wird, ist das, was diese Palette überhaupt tragfähig macht:
   sie muss sich vom Ring absetzen, in sich trennbar sein und ihren Rollenfarben
   nahe genug bleiben. Was sie NICHT halten kann, sind die 120er-Abstände zu Gold
   und Ember von oben — die galten einem einzigen mint Ton. Systematisch
   abgesucht: jeder Ton, der beide hält und dabei rot oder orange bleibt, landet
   bei #fa0000 bzw. #fa3600; dann sind Top und ADC nicht mehr zu trennen und ADC
   hat kein Orange mehr. Die Trennung leistet dort die FORM — Gold ist auf der
   Karte eine Linie und eine Hafenmarke, der verlorene Stern eine dunkle massive
   Hülle ohne Ring. */

/** Farbton in Grad, für den Abstand zur echten Rollenfarbe. */
function hueOf(hex: string): number {
  const [r, g, b] = rgbOf(hex).map((v) => v / 255)
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  if (max === min) return 0
  const d = max - min
  const h =
    max === r ? ((g - b) / d + (g < b ? 6 : 0)) : max === g ? (b - r) / d + 2 : (r - g) / d + 4
  return h * 60
}

function hueDistance(a: string, b: string): number {
  const d = Math.abs(hueOf(a) - hueOf(b))
  return Math.min(d, 360 - d)
}

describe('Der Kern eines befreiten Sterns nennt die Rolle', () => {
  const roles = Object.keys(LANDMARK_ROLE_CORE) as (keyof typeof LANDMARK_ROLE_CORE)[]

  it('trägt jede Rolle — und `LANDMARK_FREED_CORE` bleibt der Fallback', () => {
    expect(roles).toHaveLength(5)
    for (const r of roles) expect(LANDMARK_ROLE_CORE[r]).toMatch(/^#[0-9a-f]{6}$/)
    // Der Fallback ist keine Rollenfarbe: ein Stern ohne Champion ist etwas
    // anderes als einer, dessen Champion zufällig mint wäre.
    expect(Object.values(LANDMARK_ROLE_CORE)).not.toContain(LANDMARK_FREED_CORE)
  })

  it('setzt jede Rollenfarbe vom weissen Ring ab — sonst sieht man den Kern nicht', () => {
    const ring = rgbOf(LANDMARK_FREED_RING)
    for (const r of roles) {
      expect(distance(rgbOf(LANDMARK_ROLE_CORE[r]), ring)).toBeGreaterThan(60)
    }
  })

  it('hält die fünf untereinander auseinander', () => {
    for (let i = 0; i < roles.length; i++) {
      for (let j = i + 1; j < roles.length; j++) {
        const d = distance(rgbOf(LANDMARK_ROLE_CORE[roles[i]]), rgbOf(LANDMARK_ROLE_CORE[roles[j]]))
        expect(d, `${roles[i]} vs ${roles[j]}`).toBeGreaterThan(70)
      }
    }
  })

  it('bleibt jeder echten Rollenfarbe nahe — sonst ist die Wiedererkennung weg', () => {
    // Die Zusicherung gegen ein „Aufräumen" der Palette: verschoben werden darf
    // sie, aber nicht so weit, dass ein Jungle-Stern nicht mehr grün ist.
    for (const r of roles) {
      expect(hueDistance(LANDMARK_ROLE_CORE[r], ROLE_COLORS[r]), r).toBeLessThanOrEqual(25)
    }
  })

  it('lässt den Kern kleiner als den halben Innenraum — sonst ist die Marke wieder eine Scheibe', () => {
    // Innere Ringkante: Ring `r*0.86` minus halbe Ringstärke (`r*0.17`/2).
    const innerEdge = 0.86 - 0.17 / 2
    expect(LANDMARK_FREED_CORE_R_RATIO).toBeLessThan(innerEdge / 2)
    // Und gross genug, um auf der Live-Minimap (r = 11) über drei Pixel zu kommen.
    expect(11 * LANDMARK_FREED_CORE_R_RATIO).toBeGreaterThan(3)
  })

  it('malt den Kern in der ÜBERGEBENEN Farbe, nicht im Fallback', () => {
    // Der Kern liegt bewusst NICHT im Sprite — sonst trügen alle Sterne die
    // Farbe des zuerst gerasterten, und der Cache-Schlüssel sähe das nicht.
    const fills: string[] = []
    const ctx = {
      save() {},
      restore() {},
      beginPath() {},
      arc() {},
      fill() {
        fills.push(String(this.fillStyle))
      },
      createRadialGradient: () => ({ addColorStop() {} }),
      fillStyle: '' as string | CanvasGradient,
    } as unknown as CanvasRenderingContext2D

    paintFreedStarCore(ctx, 20, 20, 11, LANDMARK_ROLE_CORE.jungle, 2)
    expect(fills).toContain(LANDMARK_ROLE_CORE.jungle)
    expect(fills).not.toContain(LANDMARK_FREED_CORE)

    fills.length = 0
    paintFreedStarCore(ctx, 20, 20, 11, LANDMARK_FREED_CORE, 0)
    expect(fills).toEqual([LANDMARK_FREED_CORE])
  })
})

/**
 * Die Landfall-Marke. Sie ist die fünfte Form auf einer Karte, deren Vorrat an
 * unterscheidbaren Formen bei 4,4 px praktisch ausgereizt ist — deshalb hängt an
 * ihr mehr als an den vier davor.
 */
describe('Die Marke des Landfalls — eine Familie, eine Silhouette', () => {
  it('hält den Ring unbunt, wie der befreite Stern und aus demselben Grund', () => {
    // Zwanzig Themen decken den Farbkreis fast lückenlos ab; jeder gesättigte
    // Ton kämpft in vier bis fünf Galaxien mit den Armpartikeln.
    expect(chroma(LANDMARK_LANDFALL_RING)).toBeLessThan(0.06)
  })

  it('bleibt DUNKLER als der befreite Stern — ein Ort ist nicht das Ergebnis', () => {
    // Der befreite Stern muss die hellste unbunte Marke bleiben. Ein Ort ist
    // Beiwerk der Reise; stünde er gleich hell, zöge das Häufige die Betonung
    // wieder an sich — genau der Fehler, den die Umkehrung befreit/verloren
    // schon einmal behoben hat.
    const [lr, lg, lb] = rgbOf(LANDMARK_LANDFALL_RING)
    const [fr, fg, fb] = rgbOf(LANDMARK_FREED_RING)
    expect(Math.max(lr, lg, lb)).toBeLessThan(Math.min(fr, fg, fb))
  })

  it('steht trotzdem hell genug über den Armpartikeln', () => {
    const [r, g, b] = rgbOf(LANDMARK_LANDFALL_RING)
    expect(Math.min(r, g, b)).toBeGreaterThan(140)
  })

  it('trennt sich vom Gold der Reise und vom Ember des verlorenen Sterns', () => {
    expect(distance(rgbOf(LANDMARK_LANDFALL_RING), JOURNEY_GOLD)).toBeGreaterThan(120)
    expect(distance(rgbOf(LANDMARK_LANDFALL_RING), LOST_EMBER)).toBeGreaterThan(60)
  })

  it('hält Abstand zu JEDEM Themenakzent', () => {
    const ring = rgbOf(LANDMARK_LANDFALL_RING)
    for (let i = 0; i < GALAXY_THEMES.length; i++) {
      const accent = minimapAccentForTheme(i).split(', ').map(Number) as [number, number, number]
      expect(distance(ring, accent)).toBeGreaterThan(60)
    }
  })

  it('macht den verpassten Ort leiser, aber nicht unsichtbar', () => {
    // Verpasst ist KEINE zweite Silhouette — der Formvorrat ist ausgereizt.
    // Aber ganz verschwinden darf er auch nicht: eine Marke, die nur bei
    // Erfolg erscheint, verschweigt die halbe Geschichte.
    expect(LANDMARK_LANDFALL_MISSED_ALPHA).toBeGreaterThan(0.25)
    expect(LANDMARK_LANDFALL_MISSED_ALPHA).toBeLessThan(0.7)
  })

  it('gibt jedem Ort einen eigenen Sprite-Schlüssel — auch verpasst', () => {
    // Die Binnenmarke über `variant` zu führen kollidierte mit
    // `landmarkVariantFor`; deshalb je Ort ein eigener Kind-String, und `faded`
    // gehört in den Schlüssel, sonst zeigt der Cache die helle Fassung.
    const a = landmarkSpriteKey('landfall-reef', 6, 2, 0, false)
    const b = landmarkSpriteKey('landfall-reef', 6, 2, 0, true)
    const c = landmarkSpriteKey('star-freed', 6, 2, 0, false)
    expect(new Set([a, b, c]).size).toBe(3)
  })

  it('die Familienliste und die Erkennung laufen nicht auseinander', () => {
    for (const kind of LANDFALL_KINDS) expect(isLandfallLandmark(kind)).toBe(true)
    for (const kind of ['star-freed', 'star-lost', 'core-gate', 'departure-portal'] as const) {
      expect(isLandfallLandmark(kind)).toBe(false)
    }
  })

  it('jeder Ort im Katalog hat eine Marke, und jede Marke gehört zur Familie', () => {
    // `LANDFALL_LANDMARK_KIND` ist ein `Record` und damit der EINE Compile-Zwang
    // der Kette. Diese Zusicherung schliesst den Kreis von der anderen Seite:
    // eine Marke, die niemand zieht, wäre ebenso ein toter Datensatz.
    const gezeichnet = new Set(Object.values(LANDFALL_LANDMARK_KIND))
    for (const kind of LANDFALL_KINDS) expect(gezeichnet.has(kind)).toBe(true)
    expect(gezeichnet.size).toBe(LANDFALL_KINDS.length)
  })

  /**
   * Der Wächter gegen die STILLE RAUTE.
   *
   * `paintLandfall` schaltet über den Kind-String, und ein Ort ohne Zweig fällt
   * einfach durch — kein Compile-Fehler, keine Ausnahme, nur eine leere Raute
   * auf der Karte, die von jeder anderen leeren Raute ununterscheidbar ist.
   * Hier wird jede Binnenmarke gegen jede andere gerastert und verglichen.
   */
  it('jede Binnenmarke zeichnet etwas, und jede etwas anderes', () => {
    const R = 14
    const spuren = new Map<string, string>()

    for (const kind of LANDFALL_KINDS) {
      const { ctx, ops } = recordingCtx()
      paintLandfallMark(ctx, R, R, R, kind)
      // Ein Ort ohne Zweig fällt durch die Verzweigung und malt NICHTS — genau
      // das ist die stille Raute, gegen die dieser Test steht.
      expect(ops.length, `${kind} zeichnet gar nichts`).toBeGreaterThan(0)
      spuren.set(kind, ops.join('|'))
    }

    const eindeutig = new Set(spuren.values())
    expect(eindeutig.size, `gleiche Marke bei: ${[...spuren.keys()].join(', ')}`).toBe(spuren.size)
  })
})
