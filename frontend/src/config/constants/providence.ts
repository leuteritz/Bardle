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
 * Der Wert, bei dem eine Effektachse nichts tut — der Rückfall jedes
 * Effekt-Getters, solange keine Vorsehung läuft.
 */
export const PROVIDENCE_NEUTRAL_MULTIPLIER = 1

// ── Ziehung ──────────────────────────────────────────────────────────────────

/**
 * Raster der gewürfelten Prozentwerte.
 *
 * Ohne es käme „+143 %" heraus und läse sich wie Rauschen — als hätte niemand
 * die Zahl gewählt. Auf Fünfern gerastert klingt dieselbe Ziehung nach einer
 * Ansage, ohne dass die Spannweite darunter leidet.
 */
export const PROVIDENCE_PCT_STEP = 5

/**
 * Nachkommastellen, auf die ein gewürfelter Multiplikator festgeklopft wird.
 *
 * `1 - 0.55` ergibt in Gleitkomma 0.44999999999999996; die daraus
 * zurückgerechnete Prozentzahl stünde als „−45.000000000000004" auf der Karte
 * und im Spielstand. Vier Stellen sind mehr, als jede Spanne hier braucht.
 */
export const PROVIDENCE_MULT_PRECISION = 4

// ── Anzeige ──────────────────────────────────────────────────────────────────
//
// Bewusst OHNE Herald-Banner, anders als bei Omen und Chronicle: die beiden
// melden etwas, das der Spieler sich verdient hat, während er woanders hinsah.
// Die Vorsehung hat er eine Sekunde zuvor selbst angeklickt — ein Banner sagte
// ihm nur, was er gerade getan hat. Ihre Anzeige ist der Chip im Header, und der
// steht dort den ganzen Lauf.

/**
 * Wappen des Universums auf der Prestige-Karte.
 *
 * Deutlich grösser als ein gewöhnliches Feature-Icon: die Karte trägt seit der
 * Straffung nur noch Wappen, Namen und zwei Zahlen, und das Wappen ist das
 * Erste, was das Auge findet. Bei den drei Karten nebeneinander ist es die
 * einzige Fläche, die den Ort überhaupt zeigt.
 */
export const PRESTIGE_CARD_UNIVERSE_ICON_PX = 44
