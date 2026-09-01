import { describe, it, expect } from 'vitest'
import {
  derelictBeaconAt,
  paintDarkCloud,
  paintDerelicts,
  paintForMotif,
  paintHulk,
  paintLens,
  paintPlanetoid,
  paintShoal,
  landfallSpriteKey,
} from '@/utils/fx/landfallSprite'
import { LANDFALLS } from '@/config/world/landfalls'
import {
  LANDFALL_BODY_LIT,
  LANDFALL_BODY_MOTIF,
  LANDFALL_BODY_PALETTE,
  LANDFALL_ORNAMENT_MIN_PX,
  LANDFALL_PRESENCE_STAGES,
  LANDFALL_SILHOUETTE_WOBBLE,
  LANDFALL_SPIN_TURN_DEG,
  LANDFALL_SPRITE_SPAN,
} from '@/config/constants'
import type { LandfallKindId, LandfallMotif } from '@/types'

import { recordingCtx } from '../../helpers/recordingCtx'

const MOTIFS: { motif: LandfallMotif; paint: ReturnType<typeof paintForMotif> }[] = [
  { motif: 'shoal', paint: paintShoal },
  { motif: 'darkcloud', paint: paintDarkCloud },
  { motif: 'derelicts', paint: paintDerelicts },
  { motif: 'hulk', paint: paintHulk },
  { motif: 'planetoid', paint: paintPlanetoid },
  { motif: 'lens', paint: paintLens },
]

const PAL = LANDFALL_BODY_PALETTE.chime_reef
const R = 58

describe('Landfall-Körper — die sechs Motive', () => {
  it('jedes Motiv malt überhaupt etwas', () => {
    // Der Fehler, gegen den dieser Test geschrieben ist: `paintLandfallMark` hat
    // keinen Compile-Zwang, ein Ort ohne Zweig fällt still durch und malt eine
    // leere Fläche. Hier trägt `paintForMotif` einen `never`-Rest — aber ein
    // Zweig, der nur `return` sagt, compiliert trotzdem.
    for (const { motif, paint } of MOTIFS) {
      const { ctx, ops } = recordingCtx()
      paint(ctx, 100, 100, R, PAL, 0)
      expect(ops.length, `${motif} malt nichts`).toBeGreaterThan(4)
      expect(
        ops.some((o) => o.startsWith('fill(') || o.startsWith('stroke(')),
        motif,
      ).toBe(true)
    }
  })

  it('keine zwei Motive malen dasselbe', () => {
    // Riff und Konvoi haben sich beim Bau der KARTEN-Marken genau hier
    // verwechselt — drei Körner waagerecht gegen drei Körner schräg.
    const signatures = MOTIFS.map(({ motif, paint }) => {
      const { ctx, ops } = recordingCtx()
      paint(ctx, 100, 100, R, PAL, 2)
      return { motif, sig: ops.join('|') }
    })
    for (let i = 0; i < signatures.length; i++) {
      for (let k = i + 1; k < signatures.length; k++) {
        expect(
          signatures[i].sig,
          `${signatures[i].motif} und ${signatures[k].motif} malen dasselbe`,
        ).not.toBe(signatures[k].sig)
      }
    }
  })

  it('ist deterministisch — zweimal gebaut ist zweimal dasselbe', () => {
    // Ein `Math.random()` im Sprite-Bau liesse den Körper nach jedem Cache-Miss
    // anders aussehen, und der Cache verwirft bei jedem Fensterziehen.
    for (const { motif, paint } of MOTIFS) {
      const a = recordingCtx()
      const b = recordingCtx()
      paint(a.ctx, 100, 100, R, PAL, 1)
      paint(b.ctx, 100, 100, R, PAL, 1)
      expect(a.ops.join('|'), motif).toBe(b.ops.join('|'))
    }
  })

  it('mehr Detailstufe malt mehr, nie weniger', () => {
    for (const { motif, paint } of MOTIFS) {
      const counts = ([0, 1, 2] as const).map((detail) => {
        const { ctx, ops } = recordingCtx()
        paint(ctx, 100, 100, R, PAL, detail)
        return ops.length
      })
      expect(counts[1], motif).toBeGreaterThanOrEqual(counts[0])
      expect(counts[2], motif).toBeGreaterThanOrEqual(counts[1])
      // Der ganze Sinn von `detail`: die höchste Stufe muss sichtbar mehr tragen.
      expect(counts[2], `${motif} ignoriert detail`).toBeGreaterThan(counts[0])
    }
  })

  it('bleibt innerhalb des Sprite-Feldes', () => {
    // Das Canvas misst `px × LANDFALL_SPRITE_SPAN`; was darüber hinausreicht,
    // wird abgeschnitten, und zwar ohne Warnung. Genau dafür steht die Konstante
    // — und sie ist eine gemessene Zahl, keine gewählte.
    const halfSpan = (R * 2 * LANDFALL_SPRITE_SPAN) / 2
    // Nur GEOMETRIE-Befehle: `addColorStop` und die Verlaufsfabriken tragen
    // Farbkanäle, und 201 aus einem `rgba(201, …)` ist keine Koordinate.
    const geo = /^(moveTo|lineTo|rect|fillRect)\((-?[\d.]+),(-?[\d.]+)/
    const rund = /^(arc|ellipse)\((-?[\d.]+),(-?[\d.]+),(-?[\d.]+)/

    for (const { motif, paint } of MOTIFS) {
      const { ctx, ops } = recordingCtx()
      paint(ctx, halfSpan, halfSpan, R, PAL, 2)
      // Nur die absolut gesetzten Befehle prüfen: was nach `translate` kommt,
      // ist relativ und liegt per Konstruktion beim Rumpf.
      const bis = ops.findIndex((o) => o.startsWith('translate('))
      const absolut = bis === -1 ? ops : ops.slice(0, bis)

      for (const op of absolut) {
        const r = rund.exec(op)
        if (r) {
          const reach = Number(r[4])
          expect(Math.abs(Number(r[2]) - halfSpan) + reach, `${motif}: ${op}`).toBeLessThanOrEqual(
            halfSpan,
          )
          expect(Math.abs(Number(r[3]) - halfSpan) + reach, `${motif}: ${op}`).toBeLessThanOrEqual(
            halfSpan,
          )
          continue
        }
        const g = geo.exec(op)
        if (!g) continue
        expect(Math.abs(Number(g[2]) - halfSpan), `${motif}: ${op}`).toBeLessThanOrEqual(halfSpan)
        expect(Math.abs(Number(g[3]) - halfSpan), `${motif}: ${op}`).toBeLessThanOrEqual(halfSpan)
      }
    }
  })

  it('das Notsignal sitzt am Rumpf, nicht daneben', () => {
    // Zwei Ebenen müssen dieselbe Stelle treffen — Rumpf im Albedo-Sprite und
    // blinkende Lampe darüber. Eine abgeschriebene zweite Rechnung liefe beim
    // ersten Umbau der Kette auseinander.
    const at = derelictBeaconAt(R)
    expect(Math.hypot(at.x, at.y)).toBeLessThan(R * LANDFALL_SPRITE_SPAN)
    expect(at.rad).toBeGreaterThan(0)
  })
})

describe('Landfall-Körper — Katalog und Zeichenschicht', () => {
  it('jeder Ort hat ein Motiv, und jedes Motiv wird benutzt', () => {
    const benutzt = new Set<LandfallMotif>()
    for (const d of LANDFALLS) {
      const motif = LANDFALL_BODY_MOTIF[d.id]
      expect(motif, d.id).toBeTruthy()
      benutzt.add(motif)
    }
    // Sechs Orte, sechs Motive: teilte sich einer, wäre er auf der Bühne nicht
    // mehr zu erkennen — dort ist der KÖRPER die Identifikation, seit das Glyph
    // in die HUD-Karte gewandert ist.
    expect(benutzt.size).toBe(LANDFALLS.length)
    expect(benutzt.size).toBe(MOTIFS.length)
  })

  it('nur wer eine Oberfläche hat, trägt einen Terminator', () => {
    // Ein Nebel streut das Licht, das durch ihn geht; eine Gravitationslinse
    // trägt fremdes Licht statt einer Oberfläche. Dieselbe Ausnahme, die der
    // Drifter für Plasma, Pulsar und Linse führt.
    for (const d of LANDFALLS) {
      const motif = LANDFALL_BODY_MOTIF[d.id]
      const erwartet = motif !== 'darkcloud' && motif !== 'lens'
      expect(LANDFALL_BODY_LIT[d.id], d.id).toBe(erwartet)
    }
  })

  it('jeder Ort hat eine Palette, und keine ist gesättigt', () => {
    // Die zwanzig Galaxie-Themen decken den Farbkreis fast lückenlos ab. Ein
    // bunter Körper kämpfte in vier bis fünf Galaxien mit dem Grund — derselbe
    // Grund, aus dem der Ring der Kartenmarke unbunt ist.
    //
    // Gemessen wird die CHROMA, nicht die HSL-Sättigung: die teilt nahe Weiss
    // durch fast null und meldet für `#eef2f8` 0,42.
    for (const d of LANDFALLS) {
      const pal = LANDFALL_BODY_PALETTE[d.id]
      expect(pal, d.id).toBeTruthy()
      for (const hex of [pal.hi, pal.mid, pal.low, pal.edge]) {
        expect(hex).toMatch(/^#[0-9a-f]{6}$/)
        const r = parseInt(hex.slice(1, 3), 16)
        const g = parseInt(hex.slice(3, 5), 16)
        const b = parseInt(hex.slice(5, 7), 16)
        const chroma = (Math.max(r, g, b) - Math.min(r, g, b)) / 255
        expect(chroma, `${d.id} ${hex} ist zu bunt`).toBeLessThan(0.3)
      }
    }
  })

  it('der Sprite-Schlüssel trennt Ort, Grösse, Dichte und Detailstufe', () => {
    const basis = landfallSpriteKey('chime_reef' as LandfallKindId, 116, 2, 1)
    expect(basis).not.toBe(landfallSpriteKey('the_rupture' as LandfallKindId, 116, 2, 1))
    expect(basis).not.toBe(landfallSpriteKey('chime_reef' as LandfallKindId, 197, 2, 1))
    expect(basis).not.toBe(landfallSpriteKey('chime_reef' as LandfallKindId, 116, 1, 1))
    expect(basis).not.toBe(landfallSpriteKey('chime_reef' as LandfallKindId, 116, 2, 2))
  })
})

describe('Landfall-Körper — die Präsenzleiter', () => {
  it('jede Stufe legt zu, keine nimmt weg', () => {
    // Gebaut wie `DRIFTER_FX_STAGES`: jede Stufe fügt GENAU EINE Ebene hinzu,
    // statt die vorige neu zu formulieren.
    const leiter = (['common', 'uncommon', 'rare', 'singular'] as const).map(
      (p) => LANDFALL_PRESENCE_STAGES[p],
    )
    for (let i = 1; i < leiter.length; i++) {
      expect(leiter[i].veilLayers).toBeGreaterThanOrEqual(leiter[i - 1].veilLayers)
      expect(leiter[i].veilAlpha).toBeGreaterThanOrEqual(leiter[i - 1].veilAlpha)
      expect(leiter[i].motes).toBeGreaterThanOrEqual(leiter[i - 1].motes)
      expect(leiter[i].detail).toBeGreaterThanOrEqual(leiter[i - 1].detail)
    }
    // Der Herold gehört dem seltensten Ort allein — sonst meldet sich jeder an.
    expect(leiter.filter((s) => s.herald)).toHaveLength(1)
    expect(LANDFALL_PRESENCE_STAGES.singular.herald).toBe(true)
    // Die unterste Stufe trägt nichts. Ein Riff ist der häufigste Anblick des
    // Systems; was es mitbringt, sieht man in jeder Galaxie mehrfach.
    expect(LANDFALL_PRESENCE_STAGES.common.veilLayers).toBe(0)
    expect(LANDFALL_PRESENCE_STAGES.common.motes).toBe(0)
  })

  it('die Präsenz folgt dem Gewicht — seltener heisst nie weniger Auftritt', () => {
    // DAS ist der Grund, warum `presence` ein Feld ist und keine Rechnung: ein
    // Gewicht, das jemand um zwei Punkte verschiebt, soll den Look nicht still
    // umstellen. Läuft beides auseinander, bricht dieser Test — und das ist sein
    // Zweck.
    const rang = { common: 0, uncommon: 1, rare: 2, singular: 3 }
    const nachGewicht = [...LANDFALLS].sort((a, b) => b.weight - a.weight)
    for (let i = 1; i < nachGewicht.length; i++) {
      const vor = nachGewicht[i - 1]
      const jetzt = nachGewicht[i]
      expect(
        rang[jetzt.presence],
        `${jetzt.id} (w ${jetzt.weight}) steht unter ${vor.id} (w ${vor.weight})`,
      ).toBeGreaterThanOrEqual(rang[vor.presence])
    }
    // Alle vier Stufen sind belegt: eine leere Stufe ist eine Zeile Tabelle,
    // die nichts tut.
    expect(new Set(LANDFALLS.map((d) => d.presence)).size).toBe(4)
  })

  it('der Zierrat hat eine Mindestgrösse', () => {
    // Performance-Regel 7. An den Enden der Sehne steht der Körper auf `cos(1,1)`
    // — rund 45 %, auf Full HD also 53 px. Drei Begleitsplitter messen dort je
    // zwei Pixel: unsichtbar und voll bezahlt.
    expect(LANDFALL_ORNAMENT_MIN_PX).toBeGreaterThan(116 * Math.cos(1.1))
    // Querab muss er auf der kleinsten unterstützten Breite trotzdem greifen,
    // sonst sähe niemand je einen Schleier.
    expect(LANDFALL_ORNAMENT_MIN_PX).toBeLessThan(116 * 0.85)
  })

  it('die Unrundheit bleibt innerhalb der Trefferfläche', () => {
    // Ein Asteroid ist eine Kartoffel, kein Kreis — aber die Trefferfläche ist
    // rund, und was weiter aussteht, nimmt keinen Griff mehr an.
    expect(LANDFALL_SILHOUETTE_WOBBLE).toBeGreaterThan(0)
    expect(LANDFALL_SILHOUETTE_WOBBLE).toBeLessThanOrEqual(0.18)
  })

  it('die Eigendrehung verdreht das eingebackene Licht nicht sichtbar', () => {
    // Die Sonnenseite liegt IM Sprite; der Aufrufer dreht ihn auf den
    // Lichtwinkel. Eine Eigendrehung obendrauf verdreht das Licht um genau
    // ihren Betrag — bis etwa 40 Grad verschluckt das der weiche Terminator,
    // darüber wandert die Sonne sichtbar aus der Bildmitte.
    expect(LANDFALL_SPIN_TURN_DEG).toBeGreaterThan(0)
    expect(LANDFALL_SPIN_TURN_DEG).toBeLessThanOrEqual(40)
  })

})
