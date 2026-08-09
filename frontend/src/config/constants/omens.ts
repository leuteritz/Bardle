// ═════════════════════════════════════════════════════════════════════════════
// OMENS OF THE CARETAKER — Takt, Fristen und Maße der Vorzeichen
//
// Das System füllt die Zeitskala zwischen dem Sofortigen (Klick, Fähigkeit) und
// dem Sehr-Langsamen (Chronicle, Forge, Prestige): ein Ziel, das der Spieler
// WÄHLT und das über Minuten läuft. Deshalb hängt hier fast alles an einer
// Frage — wie lange darf ein Vorzeichen offen stehen, ohne dass es entweder
// hetzt oder vergessen wird.
//
// Die Definitionen der Vorzeichen selbst stehen als Daten in
// `config/progression/omens.ts`; hier steht nur der Rahmen, den alle teilen.
// ═════════════════════════════════════════════════════════════════════════════

/** Karten im Angebot. Drei ist die kleinste Zahl, bei der eine Wahl nach Wahl
 *  aussieht und nicht nach Entweder-oder — dieselbe Breite wie die
 *  Augment-Auswahl beim Level-Up, damit beide sich gleich anfühlen. */
export const OMEN_OFFER_SIZE = 3

/**
 * Wie lange nach einem erfüllten Vorzeichen der Himmel leer bleibt, bevor das
 * nächste Trio erscheint.
 *
 * Nicht null, weil sonst der Belohnungsbuff und die nächste Wahl im selben
 * Moment aufschlagen: das Overlay deckte dann genau die Meldung zu, für die der
 * Spieler gerade gearbeitet hat.
 */
export const OMEN_OFFER_DELAY_SEC = 12

/** Wartezeit bis zum allerersten Angebot einer Sitzung — Zeit genug, das Spiel
 *  aufzubauen, bevor ein Overlay etwas will. */
export const OMEN_FIRST_OFFER_DELAY_SEC = 45

/**
 * Bard-Level, ab dem der Kosmos überhaupt Vorzeichen sendet. Davor hat der
 * Spieler weder die Systeme offen, auf die die Ziele zeigen, noch einen Grund,
 * zwischen ihnen zu wählen.
 */
export const OMEN_UNLOCK_LEVEL = 5

/**
 * Faktor auf die Buff-DAUER, wenn das Vorzeichen innerhalb seiner Frist erfüllt
 * wird — der einzige Unterschied zwischen pünktlich und spät.
 *
 * Bewusst die Dauer und nicht die Stärke: der Effektwert steht auf der Karte
 * ("+40 % XP"). Hinge er am Timing, müsste die Karte zwei Zahlen zeigen oder
 * eine davon wäre gelogen. Die Dauer ist eine eigene, klar getrennte Zeile.
 */
export const OMEN_SWIFT_DURATION_MULT = 2

/**
 * Sekunden vor Fristende, ab denen die Karte den Eilbonus als gefährdet meldet.
 * Gleiche Größenordnung wie die Ablaufwarnung der Drifter-Buffs, damit beide
 * Warnungen dasselbe Tempo haben.
 */
export const OMEN_DEADLINE_WARN_SEC = 30

/**
 * Grenze, ab der ein Vorzeichen nicht mehr angeboten wird, weil sein Ziel im
 * aktuellen Spielstand gar nicht erreichbar ist: Der Store schätzt aus dem
 * Fortschritt der letzten Runden nichts — er prüft nur, ob das Zielsystem
 * überhaupt offen ist. Diese Zahl ist der Rückfall, wenn keine drei Vorzeichen
 * die Prüfung bestehen: dann wird aus dem gesamten Katalog gezogen, statt dem
 * Spieler ein leeres Angebot zu zeigen.
 */
export const OMEN_MIN_ELIGIBLE_FOR_FILTER = 3

// ── HUD-Karte ────────────────────────────────────────────────────────────────

/** Abstand der Karte zur linken Kante und unter den Header. Die Drifter-Karte
 *  sitzt an derselben Kante, deshalb dieselben Werte — die beiden stapeln
 *  untereinander und dürfen nicht um zwei Pixel versetzt stehen. */
export const OMEN_HUD_LEFT_PX = 16
export const OMEN_HUD_TOP_PX = 96

/** Breite der HUD-Karte. Schmal genug, dass sie auf Full HD nichts vom Orbit
 *  verdeckt, breit genug für die längste Zielzeile im Katalog. */
export const OMEN_HUD_WIDTH_PX = 232

// ── Wahl-Overlay ─────────────────────────────────────────────────────────────

/** Sekunden, die das Overlay mindestens steht, bevor ein Klick daneben es
 *  schließen darf — verhindert, dass ein Klick aus dem Spiel heraus (der
 *  Spieler klickt ohnehin dauernd) das Angebot ungesehen wegwischt. */
export const OMEN_CHOICE_ARM_DELAY_MS = 600

/**
 * Akzent der Herald-Banner. Violett statt des Chronicle-Golds: die beiden
 * melden ähnlich klingende Zeilen (ein Ziel steht, ein Bonus gilt ab jetzt) und
 * müssen sich im Vorbeischauen unterscheiden — dieselbe Farbe trüge sonst zwei
 * Bedeutungen.
 */
export const OMEN_HERALD_ACCENT = '168, 176, 240'
