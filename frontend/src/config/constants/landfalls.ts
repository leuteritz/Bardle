// Landfalls — die Orte, die AUF einer Reiseetappe liegen.
//
// Ein Landfall hat keine eigene Reisezeit, keine eigene Uhr und keine Geste zum
// Ansteuern. Er kommt, weil das Schiff ohnehin vorbeifliegt, und er geht vorbei,
// wenn niemand hinsieht. Das ist der Unterschied zu jedem anderen Ereignis im
// Orbit: Drifter und Void tragen ihre eigene Uhr und sind ORTLOS, der
// Champion-Stern ist ein eigenes Ziel mit eigener Reise.

/** Ab welcher Galaxie es überhaupt Landfalls gibt. */
export const LANDFALL_UNLOCK_GALAXY = 2

/**
 * Wie viele Orte eine Galaxie trägt:
 * `min(BASE + floor((g − UNLOCK) / EVERY), MAX)`.
 *
 * → G1 = 0 · G2–G3 = 1 · G4–G5 = 2 · G6–G7 = 3 · … · G16+ = 8
 *
 * Galaxie 1 bleibt leer. Dieselbe Entscheidung wie beim Tier-Tor und beim
 * Archiv-Nachtrag (`backfillFailCount` gibt G1 null Verluste): der erste Lauf
 * soll sich wie ein sauberer Anfang lesen.
 *
 * Der Deckel bei 8 ist eine KARTEN-Zahl, keine Balance-Zahl. Eine späte Galaxie
 * trägt 7 befreite plus bis zu 4 verlorene Sterne, Portal und Tor; acht Landfalls
 * bringen die Historie auf 21 Marken. Bei 47 deckten sich zwei Marken gemessen
 * um 10 px (`__tests__/utils/game/voyageSites.spec.ts`).
 */
export const LANDFALL_BASE = 1
export const LANDFALL_EVERY = 2
export const LANDFALL_MAX = 8

/**
 * Der Ausschnitt der Etappe, in dem ein Landfall liegen darf.
 *
 * Nicht bei 0 und nicht bei 1: am Anfang steht der Abflug vom eben geräumten
 * Stern, am Ende die Ankunft am nächsten. Beides sind Momente, die schon etwas
 * zeigen — ein Ort, der genau dort fällig wird, verschwindet dahinter.
 */
export const LANDFALL_T_MIN = 0.18
export const LANDFALL_T_MAX = 0.68

/**
 * Wie lange ein Landfall offen steht, nachdem er fällig geworden ist — als
 * ANTEIL der Etappe, nicht als feste Dauer.
 *
 * Eine feste Dauer war der erste Entwurf und scheiterte an der Rechnung: hinter
 * `LANDFALL_T_MAX` bleiben auf der kürzesten Etappe, die überhaupt einen Ort
 * tragen kann (Galaxie 2, rund 76 s), nur 24 s — und die schrumpfen weiter,
 * sobald `flightSpeedMultiplier` (bis ×1,6) und der Forge-Faktor (bis ×0,76)
 * daran ziehen. Ein Fenster, das über die Ankunft hinausreicht, stellt den Ort
 * neben den Stern, und der Stern gewinnt immer.
 *
 * In SPIELZEIT gemessen (`gameNow()`), nicht an der Wanduhr — sonst wäre das
 * Fenster bei `gameSpeed` 20 ein Wimpernschlag und jede Balance-Messung wertlos.
 *
 * Der Boden hält es fair, wenn Buffs die Reise zusammenstauchen; der Deckel
 * hält es davon ab, auf der 200-s-Etappe zur zweiten Idle-Uhr zu werden.
 */
export const LANDFALL_WINDOW_FRACTION = 0.16
export const LANDFALL_WINDOW_MIN_MS = 8_000
export const LANDFALL_WINDOW_MAX_MS = 30_000

/** Eigener rng-Strom. `generateGalaxyDots` bleibt unangetastet — seine
 *  Aufrufreihenfolge ist byte-identisch zu halten, archivierte Galaxien spielen
 *  sie nach. Dasselbe Muster wie `voyageBerthsOf` mit 7717/101. */
export const LANDFALL_SEED_SALT = 9931
export const LANDFALL_SEED_OFFSET = 401

/**
 * Seitlicher Versatz der Marke von der Routenlinie, in Weltanteil.
 *
 * Ohne ihn läge jeder Landfall exakt auf der gezogenen Route und die Linie
 * deckte ihn zu — dieselbe Überlegung, aus der `voyageGateExit` den
 * Routenanfang neben das Tor legt statt hinein.
 */
export const LANDFALL_BOW_MIN = 0.018
export const LANDFALL_BOW_MAX = 0.052

/** Ertrag des Chime Reef, in Sekunden aktueller CpS. Der Sockel fällt auch dem
 *  zu, der nicht hinsieht; geklickt wird daraus das Vielfache. */
export const LANDFALL_REEF_BASE_SECONDS = 45
export const LANDFALL_REEF_CLICK_SECONDS = 12
export const LANDFALL_REEF_MAX_CLICKS = 8

/**
 * Boden unter der Sekunde: ein Riff zahlt nie weniger als diesen Anteil eines
 * Klickwerts je Sekunde.
 *
 * Ohne ihn ist der erste Ort ein Nichts. Ein frischer Spielstand in Galaxie 2
 * hat CpS nahe null — 45 Sekunden davon sind null, und der Ort, der gerade als
 * neue Mechanik eingeführt wird, zahlt beim ersten Mal gar nichts.
 *
 * Der Boden greift an der SEKUNDE, nicht an der Auszahlung. Das ist der
 * Unterschied zum Drifter (`max(fromCps, cpc × MIN_CLICKS)`), und er ist
 * beabsichtigt: läge er auf der Summe, verschwänden früh alle Griffe darunter —
 * man klickte acht Mal und sähe dieselbe Zahl. So trägt jeder Griff, vom ersten
 * Ort an.
 *
 * 0,25 gegen die Basis von 45 s heisst früh rund elf Klickwerte für einen Ort,
 * plus drei je Griff.
 */
export const LANDFALL_REEF_CPS_FLOOR_CLICKS = 0.25

/**
 * Der Ton der Landfalls — Logzeile, Kartenrand, Marke auf dem Galaxiebild.
 *
 * Blasses Seegrün, und bewusst weit weg von den vier Tönen, die im Log ohnehin
 * schon Nachrichten tragen: Gold (Chronicle), Violett (Vorzeichen), Mint
 * (Wayfinder), Magenta (Void). Die vier melden alle, dass etwas ERREICHT oder
 * VERLOREN ist. Ein Ort ist keins von beidem — er ist vorbeigekommen.
 */
export const LANDFALL_ACCENT_HEX = '#8fbfae'
