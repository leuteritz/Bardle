import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  FORGE_EDGE_LEGEND_ROWS,
  FORGE_EDGE_LEGEND_SWATCH_W,
  FORGE_LIMB_VEIN_FACTOR,
  FORGE_LIMB_LIT_FACTOR,
  FORGE_LIMB_READY_FACTOR,
  FORGE_LIMB_FULL_FACTOR,
  FORGE_LIMB_HALO_FACTOR,
} from '@/config/constants'

/**
 * Die LEGENDE zur Kantensprache — und die eine Naht, die still reissen kann.
 *
 * Die Legende zeigt keine Ersatzsymbole, sondern die Striche selbst: jede ihrer
 * Proben hängt sich DIESELBE CSS-Klasse an wie die Kante auf der Bühne, die sie
 * erklärt. Genau deshalb liegt die Kantensprache global in `rpg-theme.css` und
 * nicht im scoped Block des Panels — eine eigene Komponente erbt fremde
 * scoped-Regeln nicht.
 *
 * Die Verbindung zwischen beiden ist aber nur ein STRING (`row.cls`), und den
 * prüft kein Compiler. Benennt jemand `.limb-vein--blocked` um oder verschiebt
 * die Regel zurück in eine Komponente, rendert die Legende stumm graue Striche:
 * kein Fehler, kein roter Test, nur ein falsches Bild. Diese Datei ist die
 * Gegenmassnahme — dieselbe Gattung wie `chronicleReachable` oder
 * `saveIdMigration`, und ihr Zweck ist es, bei genau dieser Änderung zu brechen.
 *
 * Component-Tests gibt es im Projekt nicht (kein `@vue/test-utils`, kein
 * `mount`), also ist die CSS-Datei selbst die einzige Quelle, gegen die sich
 * prüfen lässt.
 */

// Aus dem Projektwurzelverzeichnis heraus, nicht relativ zu dieser Datei:
// unter jsdom ist `import.meta.url` kein `file:`-URL, und Vitest läuft ohnehin
// mit `frontend/` als Arbeitsverzeichnis.
const THEME = readFileSync(resolve(process.cwd(), 'src/assets/rpg-theme.css'), 'utf-8')

/**
 * Jede Klasse, die im Blatt als Selektor auftaucht — `.foo--bar` inbegriffen.
 *
 * OHNE Kommentare, und das ist der Unterschied zwischen einem Wächter und einer
 * Behauptung: die Kommentare dieses Blattes nennen Klassennamen im Fliesstext
 * („Was NICHT hier steht: `.limb-field` …"). Zählte man sie mit, genügte eine
 * blosse Erwähnung, um als definiert zu gelten.
 */
const RULES = THEME.replace(/\/\*[\s\S]*?\*\//g, '')
const DEFINED = new Set([...RULES.matchAll(/\.([a-z][a-z0-9-]*)/gi)].map((m) => m[1]))

describe('Kanten-Legende', () => {
  it('nennt nur Klassen, die es im globalen Blatt wirklich gibt', () => {
    const missing: string[] = []
    for (const row of FORGE_EDGE_LEGEND_ROWS) {
      for (const cls of row.cls.split(/\s+/).filter(Boolean)) {
        if (!DEFINED.has(cls)) missing.push(`${row.id} → .${cls}`)
      }
    }
    expect(missing).toEqual([])
  })

  it('führt die Kantensprache im globalen Blatt und nicht im Panel', () => {
    // Der Kern der Aufteilung: was die Legende braucht, steht global. Was allein
    // die Bühne betrifft, darf hier NICHT auftauchen — `.limb-field` trägt ein
    // `v-bind()` und kann deshalb gar nicht global stehen.
    expect(DEFINED.has('limb-bed')).toBe(true)
    expect(DEFINED.has('limb-vein--blocked')).toBe(true)
    expect(DEFINED.has('limb-bridge--open')).toBe(true)
    expect(DEFINED.has('limb-field')).toBe(false)
    expect(RULES).not.toContain('v-bind(')
  })

  it('gibt jeder Zeile eine eigene Kennung und ein eigenes Wort', () => {
    const ids = FORGE_EDGE_LEGEND_ROWS.map((r) => r.id)
    const labels = FORGE_EDGE_LEGEND_ROWS.map((r) => r.label)
    expect(new Set(ids).size).toBe(ids.length)
    expect(new Set(labels).size).toBe(labels.length)
  })

  it('hält die Proben schmaler als ihre Länge', () => {
    // Eine Probe, die dicker als lang ist, zeigt kein Strichbild mehr, sondern
    // einen Klecks — und die Brücke braucht ihre Länge ohnehin für zwei Striche
    // ihrer 18/14-Strichelung.
    for (const row of FORGE_EDGE_LEGEND_ROWS) {
      expect(row.width).toBeGreaterThan(0)
      expect(row.width).toBeLessThan(FORGE_EDGE_LEGEND_SWATCH_W / 4)
    }
  })

  /**
   * Die Breiten-LEITER der Bühne — dieselbe Ordnung, die die Legende abbildet.
   *
   * „Je weiter ein Weg gegangen ist, desto mehr der Rinne füllt er aus", und
   * dazwischen steht seit der Kaufbar-Ader eine vierte Sprosse: ein Weg, an
   * dessen Ende man HANDELN kann, wiegt mehr als ein begonnener und weniger als
   * ein vollendeter.
   *
   * Geprüft wird sie hier, weil die Reihenfolge sonst still kippt: die vier
   * Faktoren stehen als einzelne Zahlen nebeneinander, und wer einen davon
   * nachjustiert, sieht die drei anderen nicht. Eine kaufbare Ader, die breiter
   * als eine ausgewachsene ist, kehrt die Aussage um — und nichts fiele auf.
   */
  it('hält die Breiten-Leiter der Adern in ihrer Reihenfolge', () => {
    expect(FORGE_LIMB_VEIN_FACTOR).toBeLessThan(FORGE_LIMB_LIT_FACTOR)
    expect(FORGE_LIMB_LIT_FACTOR).toBeLessThan(FORGE_LIMB_READY_FACTOR)
    expect(FORGE_LIMB_READY_FACTOR).toBeLessThan(FORGE_LIMB_FULL_FACTOR)
    // Und der Schein bleibt breiter als jede Ader, sonst schaute er nicht mehr
    // unter ihr hervor.
    expect(FORGE_LIMB_FULL_FACTOR).toBeLessThan(FORGE_LIMB_HALO_FACTOR)
  })
})
