import { describe, it, expect } from 'vitest'
import {
  ROLES,
  ORBIT_ROLE_ABILITIES,
  OBJECTIVE_ROLE_ABILITIES,
  VOID_ROLE_ABILITIES,
  ROLE_KIT_LINE_MAX_CHARS,
} from '@/config/constants'
import type { ChampionRole, RoleKitAbility } from '@/types'

/*
 * Das Rollen-Kit: drei Bereiche, in denen ein Sitz kämpft — draussen im
 * Universum, unten in der Grube, gegen den Void. Die Champion-Detailseite zeigt
 * sie als DREI ZEILEN GLEICHER FORM untereinander, und genau das bindet diese
 * Spec: sobald eine der Tabellen aus der Form fällt, hat eine Zeile dort ein
 * leeres Feld, und leere Felder fallen im Betrieb niemandem auf.
 *
 * Der Längen-Deckel ist der wichtigste Wächter hier. Die Klartext-Zeile wird
 * NICHT umbrochen — ein Umbruch änderte die gemessene Höhe der Hero-Fusszeile,
 * und die speist den leeren Sitz und die Swap-Pille. Sie trägt deshalb eine
 * CSS-Ellipse, und diese Spec ist es, die aus der Ellipse ein Netz macht, das
 * nie auslöst.
 */

const TABLES: { scope: string; table: Record<ChampionRole, RoleKitAbility> }[] = [
  { scope: 'Universe', table: ORBIT_ROLE_ABILITIES },
  { scope: 'Objective', table: OBJECTIVE_ROLE_ABILITIES },
  { scope: 'Void', table: VOID_ROLE_ABILITIES },
]

const ROLE_KEYS = ROLES.map((r) => r.key)

const ICON_SHAPE = /^[a-z][a-z0-9-]*:[a-z0-9-]+$/
/** Dieselben Sets wie in icons.spec.ts — ein Tippfehler im Präfix rendert stumm. */
const KNOWN_PREFIXES = new Set([
  'game-icons',
  'ph',
  'lucide',
  'ri',
  'material-symbols',
  'mdi',
  'tabler',
])

/**
 * Die Sperrliste aus dem Thema-Abschnitt: Bard ist der Wandering Caretaker,
 * kein Musiker. Fünfzehn Namen und fünfzehn Zeilen sind genug Fläche, dass ein
 * „Refrain" beim Schreiben durchrutscht.
 *
 * Die Wortgrenze davor ist Pflicht und kein Feinschliff: ohne sie schlug der
 * Wächter bei „Sharpens" an, weil darin „harp" steckt. Ein Wächter, der
 * harmlose Zeilen ablehnt, wird beim dritten Mal abgeschaltet.
 */
const MUSICAL =
  /\b(melod|songs?\b|chord|harmon|refrain|ballad|sonata|symphon|orchestr|choir|lyres?\b|harps?\b|flutes?\b|drums?\b|encore|concert|applaus|composit)/i

describe('Rollen-Kit', () => {
  describe('Form', () => {
    it.each(TABLES)('$scope deckt genau die fünf Rollen ab', ({ table }) => {
      expect(Object.keys(table).sort()).toEqual([...ROLE_KEYS].sort())
    })

    it.each(TABLES)('$scope trägt je Rolle alle vier Felder und ZWEI Kennzahlen', ({ table }) => {
      for (const role of ROLE_KEYS) {
        const ab = table[role]
        expect(ab.name, `${role}: name`).toBeTruthy()
        expect(ab.icon, `${role}: icon`).toBeTruthy()
        expect(ab.line, `${role}: line`).toBeTruthy()
        expect(ab.desc, `${role}: desc`).toBeTruthy()
        // Genau zwei, immer in derselben Reihenfolge — erst die Wirkung, dann
        // der Takt. Nur dadurch liest sich die zweite Spalte über alle drei
        // Zeilen hinweg als Zeit.
        expect(ab.metrics, `${role}: metrics`).toHaveLength(2)
        for (const m of ab.metrics) {
          expect(m.value, `${role}: metric value`).toBeTruthy()
          expect(m.label, `${role}: metric label`).toBeTruthy()
        }
      }
    })
  })

  describe('Die sichtbare Zeile', () => {
    // DER Wächter dieser Spec. Ohne ihn wäre die CSS-Ellipse kein Netz,
    // sondern eine abgeschnittene Aussage.
    it.each(TABLES)('$scope bleibt unter dem Längen-Deckel', ({ table }) => {
      for (const role of ROLE_KEYS) {
        const line = table[role].line
        expect(line.length, `${role}: „${line}" (${line.length})`).toBeLessThanOrEqual(
          ROLE_KIT_LINE_MAX_CHARS,
        )
      }
    })

    it.each(TABLES)('$scope schreibt eine Aussage, keinen Satz mit Punkt', ({ table }) => {
      for (const role of ROLE_KEYS) {
        const line = table[role].line
        // Kein Schlusspunkt: die Zeile steht ohne Nachbarn auf dem Portrait,
        // und ein Punkt sähe neben der Ellipse aus wie ein Fehler.
        expect(line.endsWith('.'), `${role}: „${line}"`).toBe(false)
        expect(line[0], `${role}: „${line}"`).toBe(line[0].toUpperCase())
      }
    })

    it('ist nicht die Kurzfassung von desc, sondern ein eigenes Feld', () => {
      // Wäre `line` nur ein abgeschnittenes `desc`, könnte man sie generieren.
      // Sie ist es nicht, und das soll auch so bleiben.
      for (const { table } of TABLES) {
        for (const role of ROLE_KEYS) {
          expect(table[role].line).not.toBe(table[role].desc)
        }
      }
    })
  })

  describe('Nebeneinander lesbar', () => {
    // Alle drei Zeilen stehen GLEICHZEITIG auf dem Schirm — sie sind damit eine
    // Liste im Sinne der Icon-Regel 3.
    it('gibt jeder Rolle drei unterscheidbare Sigille', () => {
      for (const role of ROLE_KEYS) {
        const icons = TABLES.map((t) => t.table[role].icon)
        expect(new Set(icons).size, `${role}: ${icons.join(' · ')}`).toBe(3)
      }
    })

    // Genau die Regression, für die Tops Void-Verb „Last Barrier" heisst statt
    // wie im Orbit „Aegis Wall": zweimal derselbe Name untereinander, und im
    // v-for zusätzlich ein doppelter Schlüssel.
    it('gibt jeder Rolle drei unterscheidbare Namen', () => {
      for (const role of ROLE_KEYS) {
        const names = TABLES.map((t) => t.table[role].name)
        expect(new Set(names).size, `${role}: ${names.join(' · ')}`).toBe(3)
      }
    })
  })

  describe('Sigille', () => {
    it.each(TABLES)('$scope nennt Präfix und Form korrekt', ({ table }) => {
      for (const role of ROLE_KEYS) {
        const icon = table[role].icon
        expect(icon, `${role}: ${icon}`).toMatch(ICON_SHAPE)
        expect(KNOWN_PREFIXES.has(icon.split(':')[0]), `${role}: ${icon}`).toBe(true)
      }
    })
  })

  describe('Thema', () => {
    it('zeichnet Bard nirgends als Musiker', () => {
      for (const { scope, table } of TABLES) {
        for (const role of ROLE_KEYS) {
          const ab = table[role]
          for (const [field, text] of [
            ['name', ab.name],
            ['line', ab.line],
            ['desc', ab.desc],
          ] as const) {
            expect(MUSICAL.test(text), `${scope}/${role}/${field}: „${text}"`).toBe(false)
          }
        }
      }
    })
  })
})
