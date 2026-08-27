import { describe, it, expect } from 'vitest'
import {
  HUD_CARD_COLUMN_MAX_H,
  HUD_CARD_COLUMN_MAX_STAGE_FRAC,
  HUD_CARD_FOCUS_MAX_H,
  HUD_CARD_FOLDED_H,
  HUD_CARD_GAP,
  HUD_CARD_TICK_MS,
  HUD_CARD_TIGHT_MIN_FOLDED,
  HUD_CARD_TOP,
  HUD_CARD_WAYFINDER_H,
} from '@/config/constants'

/*
 * Das Höhenbudget der Kartenspalte oben links.
 *
 * Warum es eines braucht: vorher gab es keines. Alle sechs Karten konnten
 * gleichzeitig aufgerissen stehen, und niemand rechnete nach, was das ergibt.
 * Gemessen (Full HD) waren es rund 774 px — auf einem 1000er Viewport über zwei
 * Drittel der Bühnenhöhe, genau dort, wo der Orbit läuft.
 *
 * Diese Spec bindet, was die Faltung einbringt. Wer eine Karte höher macht oder
 * eine siebte hinzufügt, bricht sie — und das ist ihr Zweck.
 */

/** Der flachste Referenz-Viewport (Full HD, ~1000 px nutzbar). */
const STAGE_H = 1000

/**
 * Die gemessenen Höhen der SECHS Karten, wie sie vor der Faltung nebeneinander
 * standen. Sie stehen hier und nicht in `config/`, weil es historische Messwerte
 * sind, keine Vorgaben — sie belegen, wogegen das Budget geschrieben ist.
 */
const BEFORE = {
  wayfinder: 101,
  autopick: 150,
  void: 130,
  omen: 58,
  landfallCairn: 165,
  drifter: 130,
}

describe('Die Kartenspalte passt in ihr Budget', () => {
  it('der schlimmste Fall bleibt unter dem Deckel', () => {
    // Wayfinder + ein aufgerissener Fokus + vier gefaltete Zeilen.
    const worst =
      HUD_CARD_TOP +
      HUD_CARD_WAYFINDER_H +
      HUD_CARD_FOCUS_MAX_H +
      4 * HUD_CARD_FOLDED_H +
      5 * HUD_CARD_GAP
    expect(worst).toBeLessThanOrEqual(HUD_CARD_COLUMN_MAX_H)
  })

  it('und der Deckel bleibt unter seinem Anteil der Bühne', () => {
    expect(HUD_CARD_COLUMN_MAX_H).toBeLessThanOrEqual(STAGE_H * HUD_CARD_COLUMN_MAX_STAGE_FRAC)
  })

  it('ohne Faltung ginge es NICHT auf — das ist der ganze Grund für sie', () => {
    /* Der Nachweis, dass das Budget die Faltung wirklich braucht: stünden alle
       sechs aufgerissen, riesse es. Fiele diese Zusage, wäre die Faltung
       Zierrat statt Notwendigkeit. */
    const all = Object.values(BEFORE).reduce((a, b) => a + b, 0) + 5 * HUD_CARD_GAP + HUD_CARD_TOP
    expect(all).toBeGreaterThan(HUD_CARD_COLUMN_MAX_H)
    expect(all).toBeGreaterThan(STAGE_H * 0.65)
  })

  it('die Faltung spart mehr als die Hälfte', () => {
    const worst =
      HUD_CARD_TOP +
      HUD_CARD_WAYFINDER_H +
      HUD_CARD_FOCUS_MAX_H +
      4 * HUD_CARD_FOLDED_H +
      5 * HUD_CARD_GAP
    const all = Object.values(BEFORE).reduce((a, b) => a + b, 0) + 5 * HUD_CARD_GAP + HUD_CARD_TOP
    expect(worst).toBeLessThan(all * 0.6)
  })

  it('eine gefaltete Zeile ist deutlich flacher als die flachste aufgerissene Karte', () => {
    // Sonst trüge sie ihren Namen nicht: die flachste Karte vor der Faltung war
    // das Omen mit 58 px.
    expect(HUD_CARD_FOLDED_H).toBeLessThan(BEFORE.omen * 0.6)
    // Und drei Zeilen bleiben unter einer aufgerissenen Karte.
    expect(3 * HUD_CARD_FOLDED_H).toBeLessThan(HUD_CARD_FOCUS_MAX_H)
  })

  it('der Wayfinder bleibt das flachste dauerhafte Element', () => {
    // Er steht IMMER. Wäre er der höchste Posten, zahlte der Spieler die Ecke
    // dauerhaft statt nur, solange etwas los ist.
    expect(HUD_CARD_WAYFINDER_H).toBeLessThan(HUD_CARD_FOCUS_MAX_H)
  })

  it('die enge Stufe greift erst ab mehreren Zeilen', () => {
    /* Bei 1 schaltete sie schon um, sobald überhaupt eine zweite Karte steht —
       dann gäbe es die mittlere Stufe gar nicht. */
    expect(HUD_CARD_TIGHT_MIN_FOLDED).toBeGreaterThanOrEqual(2)
    expect(HUD_CARD_TIGHT_MIN_FOLDED).toBeLessThanOrEqual(4)
  })

  it('die EINE Uhr tickt feiner als eine Sekunde, aber nicht pro Frame', () => {
    /* Sie löst zwei 100-ms-Ticker und einen 200-ms-Ticker ab. Feiner als ~60 ms
       wäre ein Rendern pro Frame für eine Zahl, die Sekunden zeigt. */
    expect(HUD_CARD_TICK_MS).toBeGreaterThanOrEqual(60)
    expect(HUD_CARD_TICK_MS).toBeLessThanOrEqual(250)
  })
})
