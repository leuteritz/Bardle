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
 * Wie lange die eingelöste Stufe auf der Karte stehenbleibt: Füllung voll, Grün,
 * dann zieht die nächste ein. Kürzer als ein Takt, damit zwei Einlösungen
 * hintereinander zwei Blitze sind und nicht einer.
 */
export const MISSION_CLAIM_FLASH_MS = 700

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

/**
 * Farbe des Betrags je Belohnungsart. Material bringt seine eigene aus
 * `MATERIAL_COLOR` mit — die Art ist dort die Information, nicht der Schmuck.
 *
 * `#9fe062` ist die Meep-Marke aus dem Skillbaum, `#e8c040` das Projektgold.
 */
export const MISSION_REWARD_COLOR = { chimes: '#e8c040', meeps: '#9fe062' } as const

/** Überschrift, sobald die Leiter durch ist. Zwei Verbraucher mit
 *  verschiedener Lebensdauer: draußen stünde sie einmal und ginge wieder — ein
 *  dauerhaftes „fertig" im freien Bild wäre totes Chrome. Im Pause-Overlay
 *  bleibt sie stehen, weil die Zeile dort ohnehin eine reservierte Höhe hat und
 *  ein Verschwinden den Fit-Scale des Panels springen ließe. */
export const MISSION_LADDER_DONE_TITLE = 'Every Road Walked'
export const MISSION_LADDER_DONE_LINE = 'The Caretaker sets his own course now'

/** Wie lange die Abschlusskarte steht, bevor sie geht. */
export const MISSION_LADDER_DONE_HOLD_MS = 12_000
