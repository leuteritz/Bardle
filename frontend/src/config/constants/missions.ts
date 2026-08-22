// ═════════════════════════════════════════════════════════════════════════════
// THE WAYFINDER — Maße der Leiter
//
// Das System besetzt die einzige Zeitskala, die dem Spiel noch fehlte: die
// REIHENFOLGE. Omens legen eine Wahl vor, der Codex zählt acht Bahnen
// nebeneinander — der Wayfinder zeigt immer genau ein Ziel, und zwar das
// nächste. Deshalb steht hier auch keine einzige Frist: eine Uhr auf einer
// Anleitung wäre eine Strafe fürs Anfangen.
//
// Die Missionen selbst stehen als Daten in `config/progression/missions.ts`;
// hier steht nur der Rahmen, den alle teilen.
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Wie viele der kommenden Missionen die Karte unter der aktiven andeutet.
 *
 * Zwei, nicht drei: die Vorschau beantwortet „wohin führt das", nicht „was
 * kann ich alles". Eine dritte Zeile kostete Höhe an einer Karte, die dauerhaft
 * im Bild steht, und die Spalte darunter trägt bis zu vier weitere Karten.
 */
export const MISSION_PREVIEW_COUNT = 2

/**
 * Obergrenze der Chime-Belohnung, ausgedrückt in Sekunden laufender Produktion.
 *
 * Ohne sie machte ein aktiver Overclock-Stapel oder ein Omen-Buff aus einer
 * Belohnung von zehn Minuten stillschweigend eine Stunde — dieselbe Schraube
 * wie `DRIFTER_CHIME_REWARD_CAP_SEC`, und aus demselben Grund: der Lohn soll am
 * Meilenstein hängen, nicht daran, wann genau der Spieler ihn abholt.
 */
export const MISSION_CHIME_REWARD_CAP_SEC = 900

/**
 * Akzent der Herald-Banner und der Log-Zeilen, als `r, g, b`.
 *
 * Mint-Teal, bewusst zwischen dem Chronicle-Gold und dem Omen-Lavendel: die
 * drei Systeme melden ähnlich klingende Zeilen („ein Ziel steht", „ein Bonus
 * gilt"), und im Vorbeischauen unterscheidet sie nur die Farbe.
 */
export const MISSION_HERALD_ACCENT = '122, 208, 190'

/** Dieselbe Farbe als Hex — Rahmenakzente und die Log-Farbtabelle. */
export const MISSION_ACCENT_HEX = '#7ad0be'

/** Glyph des Systems selbst: im Kartenkopf, im Stats-Panel und als Quelle der
 *  Materialgutschrift. */
export const MISSION_SYSTEM_ICON = 'game-icons:direction-signs'

/** Überschrift der Karte, sobald die Leiter durch ist. Sie steht einmal und
 *  verschwindet dann — ein dauerhaftes „fertig" wäre totes Chrome. */
export const MISSION_LADDER_DONE_TITLE = 'Every Road Walked'
export const MISSION_LADDER_DONE_LINE = 'The Caretaker sets his own course now'

/** Wie lange die Abschlusskarte steht, bevor sie geht. */
export const MISSION_LADDER_DONE_HOLD_MS = 12_000
