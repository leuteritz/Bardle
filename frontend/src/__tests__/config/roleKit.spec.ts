import { describe, it, expect } from 'vitest'
import {
  ROLES,
  ORBIT_ROLE_ABILITIES,
  OBJECTIVE_ROLE_ABILITIES,
  VOID_ROLE_ABILITIES,
  ROLE_KIT_DESC_MAX_CHARS,
} from '@/config/constants'
import type { ChampionRole, RoleKitAbility } from '@/types'

/*
 * Das Rollen-Kit: drei Bereiche, in denen ein Sitz kämpft — draussen im
 * Universum, unten in der Grube, gegen den Void. Die Champion-Detailseite zeigt
 * sie als DREI ZEILEN GLEICHER FORM untereinander, und genau das bindet diese
 * Spec: sobald eine der Tabellen aus der Form fällt, hat eine Zeile dort ein
 * leeres Feld, und leere Felder fallen im Betrieb niemandem auf.
 *
 * Zwei Wächter tragen die Darstellung:
 *   `short` MUSS ein Wort sein — die Zeile hat neben Sigill und zwei grossen
 *   Zahlen keinen Platz für mehr, und ein zweites Wort schöbe entweder die
 *   Zahlen zusammen oder liefe in die Ellipse.
 *   `desc` MUSS kurz bleiben — es steht in der Hover-Karte, die über dem
 *   Portrait schwebt; drei Zeilen dort verdecken das Bild, das der Spieler
 *   gerade ansieht.
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
        expect(ab.short, `${role}: short`).toBeTruthy()
        expect(ab.icon, `${role}: icon`).toBeTruthy()
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

  describe('Das eine Wort in der Zeile', () => {
    // DER Wächter dieser Spec. Neben Sigill und zwei grossen Zahlen ist genau
    // ein Wort das, was ohne Ellipse hineinpasst.
    it.each(TABLES)('$scope nennt je Rolle GENAU ein Wort', ({ table }) => {
      for (const role of ROLE_KEYS) {
        const short = table[role].short
        expect(short.trim().split(/\s+/), `${role}: „${short}"`).toHaveLength(1)
        // Kein Bindestrich-Ersatz für zwei Wörter, das umgeht die Regel nur.
        expect(short, `${role}: „${short}"`).not.toMatch(/[-–—]/)
      }
    })

    it.each(TABLES)('$scope beginnt das Wort gross und ohne Punkt', ({ table }) => {
      for (const role of ROLE_KEYS) {
        const short = table[role].short
        expect(short[0], `${role}: „${short}"`).toBe(short[0].toUpperCase())
        expect(short.endsWith('.'), `${role}: „${short}"`).toBe(false)
      }
    })
  })

  describe('Die Hover-Karte', () => {
    it.each(TABLES)('$scope hält die Beschreibung unter dem Deckel', ({ table }) => {
      for (const role of ROLE_KEYS) {
        const desc = table[role].desc
        expect(desc.length, `${role}: „${desc}" (${desc.length})`).toBeLessThanOrEqual(
          ROLE_KIT_DESC_MAX_CHARS,
        )
      }
    })

    it.each(TABLES)('$scope schreibt einen ganzen Satz', ({ table }) => {
      for (const role of ROLE_KEYS) {
        const desc = table[role].desc
        // Anders als das eine Wort in der Zeile IST das hier ein Satz — die
        // Karte hat Platz dafür, und ein Fragment läse sich dort wie ein
        // abgeschnittener Text.
        expect(desc.endsWith('.'), `${role}: „${desc}"`).toBe(true)
        expect(desc[0], `${role}: „${desc}"`).toBe(desc[0].toUpperCase())
      }
    })

    it('trägt in der Karte den VOLLEN Namen, nicht das Wort aus der Zeile', () => {
      // Die Karte ist der Ort, an dem „Volley" wieder „Piercing Volley" heisst.
      // Wären beide Felder gleich, hätte die Zeile nichts verkürzt.
      for (const { table } of TABLES) {
        for (const role of ROLE_KEYS) {
          expect(table[role].name.length).toBeGreaterThanOrEqual(table[role].short.length)
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

    // Und dasselbe für das eine Wort — es ist das, was tatsächlich untereinander
    // steht. Drei verschiedene Namen nützen nichts, wenn sie auf dasselbe Wort
    // verkürzt werden.
    it('gibt jeder Rolle drei unterscheidbare Wörter', () => {
      for (const role of ROLE_KEYS) {
        const shorts = TABLES.map((t) => t.table[role].short)
        expect(new Set(shorts).size, `${role}: ${shorts.join(' · ')}`).toBe(3)
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
            ['short', ab.short],
            ['desc', ab.desc],
          ] as const) {
            expect(MUSICAL.test(text), `${scope}/${role}/${field}: „${text}"`).toBe(false)
          }
        }
      }
    })
  })
})
