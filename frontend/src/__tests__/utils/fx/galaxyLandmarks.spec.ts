import { describe, it, expect } from 'vitest'
import {
  landmarkTier,
  landmarkPad,
  landmarkVariantFor,
  landmarkSpriteKey,
  roundLandmarkRadius,
} from '@/utils/fx/galaxyLandmarks'
import {
  LANDMARK_FREED_CORE,
  LANDMARK_FREED_RING,
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
