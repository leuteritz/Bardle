// ═════════════════════════════════════════════════════════════════════════════
// PROVIDENCES OF THE WANDERER — Rahmen der Vorsehung, die beim Prestige gewählt
// wird
//
// Die Vorsehung ist die langsamste Wahl im Spiel: sie gilt einen ganzen
// Universums-Durchlauf und wird erst beim nächsten Prestige wieder gestellt.
// Deshalb steht hier auffällig wenig Timing — es gibt keinen Takt, keine Frist
// und keinen Cooldown, den man einstellen könnte. Was bleibt, ist die Breite der
// Wahl und die Maße ihrer Anzeige.
//
// Die Vorsehungen selbst stehen als Daten in `config/progression/providences.ts`.
// ═════════════════════════════════════════════════════════════════════════════

/** Karten im Angebot. Dieselbe Breite wie Omen-Angebot und Augment-Wahl, damit
 *  sich alle drei Entscheidungen des Spiels gleich anfühlen. */
export const PROVIDENCE_OFFER_SIZE = 3

/**
 * Wie viele verschiedene Domänen mindestens im Angebot stehen sollen.
 *
 * Gleich der Angebotsgröße: jede Karte aus einer anderen Domäne. Drei Karten aus
 * `cosmos` wären drei Varianten derselben Frage — der Spieler entschiede dann
 * über eine Zahl, nicht über die Ausrichtung seines Laufs.
 */
export const PROVIDENCE_MIN_DOMAINS = 3

/**
 * Der Wert, bei dem eine Effektachse nichts tut. Steht als Konstante, weil die
 * Anzeige daran entscheidet, ob eine Zeile grün oder rot ist — ein hartes `1`
 * an dieser Stelle wäre eine unbeschriftete Annahme mitten in der Farblogik.
 */
export const PROVIDENCE_NEUTRAL_MULTIPLIER = 1

// ── Anzeige ──────────────────────────────────────────────────────────────────
//
// Bewusst OHNE Herald-Banner, anders als bei Omen und Chronicle: die beiden
// melden etwas, das der Spieler sich verdient hat, während er woanders hinsah.
// Die Vorsehung hat er eine Sekunde zuvor selbst angeklickt — ein Banner sagte
// ihm nur, was er gerade getan hat. Ihre Anzeige ist der Chip im Header, und der
// steht dort den ganzen Lauf.

/** Mindestbreite einer Wahlkarte im Prestige-Modal. Drei davon nebeneinander
 *  passen damit auch auf Full HD in den Rahmen, ohne dass die längste
 *  Effektzeile umbricht. */
export const PROVIDENCE_CARD_MIN_WIDTH_PX = 200

/** Größe des Glyphs auf der Wahlkarte — dieselbe wie die Modifier-Ikone der
 *  Universumskarte im selben Modal, damit beide Schritte gleich schwer wirken. */
export const PROVIDENCE_CARD_ICON_PX = 30

/** Größe des Glyphs im Header-Chip. Klein, aber über der 18-px-Grenze, ab der
 *  `game-icons`-Motive zu Grau zerfallen. */
export const PROVIDENCE_CHIP_ICON_PX = 20
