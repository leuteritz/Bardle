/**
 * Wie ein gefalteter Meep-Baum-Effekt gelesen wird.
 *
 * Der Store liefert einen Beutel roher Zahlen (`meepTreeStore.fx`), und der
 * Beutel allein sagt nicht, ob `0.85` „−15 %" heisst oder „×0,85" — das weiss
 * nur `MEEP_TREE_EFFECT_ROWS` mit seinem `kind`. Diese Übersetzung stand
 * ursprünglich in `MeepProgressTooltip.vue`; das Detail-Blatt des Skill-Tabs
 * braucht sie ein zweites Mal, für die Vorher/Nachher-Zeilen. Zweimal
 * ausgeschrieben liefen die beiden Anzeigen auseinander, sobald jemand eine
 * Einheit ändert — und der Spieler läse dieselbe Zahl an zwei Stellen
 * verschieden.
 */
import { MEEP_TREE_EFFECT_ROWS, type MeepTreeEffectKind } from '@/config/constants'
import { formatNumberCompact } from '@/config/ui/numberFormat'
import type { MeepTreeEffects } from '@/config/progression/meepTree'

export interface MeepEffectReading {
  /** Fertig geschriebener Wert samt Einheit, z. B. `×1.25` oder `−15%`. */
  value: string
  /** Ob dieser Wert für den Spieler gut ist — bei `lower` ist klein gut. */
  good: boolean
}

export interface MeepEffectRow extends MeepEffectReading {
  key: string
  label: string
}

/** `2` statt `2.00`, `1.25` statt `1.2500` — zwei Stellen, ohne Nullschwanz. */
export function trimEffectNumber(value: number): string {
  return String(Math.round(value * 100) / 100)
}

/**
 * Ein einzelner Effektwert in seiner Schreibweise.
 *
 * `null` heisst NEUTRAL — der Wert steht auf seinem Ruhepunkt (1 bei Faktoren,
 * 0 bei Zuschlägen) und wird nicht gezeigt. Eine Liste, die „×1,00" führt, ist
 * eine Liste, in der der Spieler das Wirksame suchen muss.
 */
export function formatMeepEffect(kind: MeepTreeEffectKind, raw: number): MeepEffectReading | null {
  switch (kind) {
    case 'mult':
      return raw === 1 ? null : { value: `×${trimEffectNumber(raw)}`, good: raw > 1 }
    case 'lower':
      return raw === 1 ? null : { value: `−${Math.round((1 - raw) * 100)}%`, good: raw < 1 }
    case 'pct':
      return raw === 0 ? null : { value: `+${trimEffectNumber(raw * 100)}%`, good: true }
    case 'flat':
      return raw === 0 ? null : { value: `+${formatNumberCompact(raw)}`, good: true }
    case 'rate':
      return raw === 0 ? null : { value: `+${trimEffectNumber(raw)}/s`, good: true }
    case 'hours':
      return raw === 0 ? null : { value: `+${trimEffectNumber(raw)}h`, good: true }
  }
}

/**
 * Alle wirkenden Zeilen eines Effektbeutels, in der Reihenfolge der Tabelle:
 * erst was der Spieler dauernd sieht, zuletzt was nur zwischendurch greift.
 */
export function activeEffectRows(fx: MeepTreeEffects): MeepEffectRow[] {
  const bag = fx as unknown as Record<string, number>
  const out: MeepEffectRow[] = []
  for (const row of MEEP_TREE_EFFECT_ROWS) {
    const raw = bag[row.key]
    if (raw === undefined) continue
    const reading = formatMeepEffect(row.kind, raw)
    if (reading) out.push({ key: row.key, label: row.label, ...reading })
  }
  return out
}
