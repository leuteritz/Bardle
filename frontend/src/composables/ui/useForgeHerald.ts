import { useHerald } from '@/composables/ui/useHerald'
import { hexToRgbTriple } from '@/utils/ui/format'
import {
  FORGE_PANEL_SECTIONS,
  FORGE_BUY_ALL_HERALD,
  FORGE_BUY_ALL_HERALD_NAME_CAP,
  FORGE_COUNT_TOKEN,
} from '@/config/constants'
import type {
  ForgeSectionId,
  ForgeUpgradeEntry,
  ForgeRelicDef,
  ForgeConstellationDef,
  ForgeBargainDef,
} from '@/types'

/**
 * Der Wortlaut jeder Kaufquittung im Shop-Tab, an EINEM Ort.
 *
 * Gekauft wird an vier Stellen — Solar Rays und Baumknoten über
 * `useForgeUpgrades.buyUpgrade`, Relikte, Konstellationen und der Handel je in
 * einem Handler von `StarForgePanel.vue`. Stünde der Text dort, spräche jede
 * Abteilung anders, und die Farbe des Banners wäre viermal von Hand gesetzt.
 *
 * Diese Quittung hat den Toast im Shop-Tab ABGELÖST (er stand 43 px darüber und
 * sagte dasselbe). Die Karte kann mehr: das Zeichen des gekauften Dings, seine
 * eigene Farbe und die Wirkungszeile auf der neuen Stufe.
 *
 * Alle sechs laufen unter demselben Verdichtungsschlüssel (`forged`, die
 * Vorgabe): wer acht Stufen am Stück durchklickt, bekommt EINE Karte mit `×8`
 * statt acht Bannern nacheinander.
 */

/** `BRANCH · LV 3` — Art des Dings und die Stufe, die es gerade erreicht hat. */
function tierLine(label: string, level?: number): string {
  return level === undefined ? label : `${label} · LV ${level}`
}

/** Der Akzent einer Abteilung, für die Dinge ohne eigene Farbe. */
function sectionAccent(id: ForgeSectionId): string {
  const section = FORGE_PANEL_SECTIONS.find((s) => s.id === id)
  return hexToRgbTriple(section?.accent ?? '#e8c040')
}

export function useForgeHerald() {
  const { announceReceipt } = useHerald()

  /** Eine Stufe eines Solar Rays oder eines Baumknotens. */
  function heraldUpgrade(entry: ForgeUpgradeEntry, level: number): void {
    announceReceipt({
      kind: 'forged',
      eyebrow: tierLine(entry.tierLabel, level),
      headline: entry.name,
      // Der Wirkungssatz der NEUEN Stufe — der Eintrag wird nach dem Kauf frisch
      // gelesen, `desc` trägt dann bereits den neuen Wert.
      subline: entry.desc,
      icon: entry.icon,
      accent: hexToRgbTriple(entry.color),
    })
  }

  /** Mehrere Stufen am Stück: EIN Banner, das die Spanne zeigt. */
  function heraldUpgradeBulk(entry: ForgeUpgradeEntry, from: number, to: number): void {
    announceReceipt({
      kind: 'forged',
      eyebrow: `${entry.tierLabel} · LV ${from} → ${to}`,
      headline: entry.name,
      subline: entry.desc,
      icon: entry.icon,
      accent: hexToRgbTriple(entry.color),
    })
  }

  /** Ein geschmiedetes Relikt. `effectLine` kommt aus der Ansicht, die den
   *  Platzhalter im `desc` ohnehin schon füllt — hier wird er nicht erneut
   *  ersetzt. */
  function heraldRelic(def: ForgeRelicDef, level: number, effectLine: string): void {
    announceReceipt({
      kind: 'forged',
      eyebrow: tierLine('RELIC', level),
      headline: def.name,
      subline: effectLine,
      icon: def.icon,
      accent: hexToRgbTriple(def.color),
    })
  }

  /** Eine Konstellation — einmalig, deshalb ohne Stufe. */
  function heraldConstellation(def: ForgeConstellationDef): void {
    announceReceipt({
      kind: 'forged',
      eyebrow: tierLine('CONSTELLATION'),
      headline: def.name,
      // Konstellations-Beschreibungen tragen keinen Platzhalter, sie sind schon
      // fertige Sätze („+18% Chimes/Sec.").
      subline: def.desc,
      icon: def.icon,
      accent: hexToRgbTriple(def.color),
    })
  }

  /** Der kosmische Handel. Er trägt als einziger weder Zeichen noch Farbe im
   *  Katalog: das Zeichen würfelt der Store (`activeDealIcon`) und muss VOR dem
   *  Kauf gelesen werden, die Farbe ist die der Abteilung. */
  function heraldBargain(def: ForgeBargainDef, icon: string): void {
    announceReceipt({
      kind: 'forged',
      eyebrow: tierLine('COSMIC BARGAIN'),
      headline: def.name,
      subline: def.desc,
      icon,
      accent: sectionAccent('bargain'),
    })
  }

  /** Der Sammelkauf über die Kopfleiste. */
  function heraldBuyAll(count: number, names: string[]): void {
    const shown = names.slice(0, FORGE_BUY_ALL_HERALD_NAME_CAP)
    const rest = names.length - shown.length
    announceReceipt({
      kind: 'forged',
      eyebrow: 'STAR FORGE',
      headline: FORGE_BUY_ALL_HERALD.replace(FORGE_COUNT_TOKEN, String(count)),
      subline: rest > 0 ? `${shown.join(' · ')} · +${rest} more` : shown.join(' · '),
      icon: FORGE_PANEL_SECTIONS[0].icon,
      accent: sectionAccent('upgrades'),
    })
  }

  return {
    heraldUpgrade,
    heraldUpgradeBulk,
    heraldRelic,
    heraldConstellation,
    heraldBargain,
    heraldBuyAll,
  }
}
