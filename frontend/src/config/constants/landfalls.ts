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
 * The Gloaming — der EINE Ort ohne Geste.
 *
 * Er zahlt beim Vorbeifliegen und gilt immer als geschafft. Das ist kein
 * Notnagel: Abwechslung im TEMPO wiegt so schwer wie Abwechslung im Lohn, und
 * sechs Orte, die alle eine Geste verlangen, wären sechs Aufgaben statt einer
 * Reise. Sein Sockel liegt deshalb unter dem des Riffs — er kostet ja nichts.
 */
export const LANDFALL_GLOAMING_BASE_SECONDS = 28

/**
 * Sunken Ossuary — EIN Griff, und er ist auf.
 *
 * Kein Sockel: ein Sarkophag, den niemand geöffnet hat, gibt nichts her. Das ist
 * die Gegenprobe zum Riff, dessen Sockel auch dem zufällt, der wegsieht — die
 * Orte dürfen sich darin unterscheiden, sonst ist die Geste Zierrat.
 *
 * Dafür wiegt der eine Griff schwer: 110 CpS-Sekunden sind mehr als das Riff mit
 * allen acht (45 + 8 × 12 = 141) nicht ganz erreicht, bei einem Achtel Aufwand —
 * und er ist erst ab Galaxie 8 zu finden.
 */
export const LANDFALL_OSSUARY_TAP_SECONDS = 110
export const LANDFALL_OSSUARY_MATERIALS = 2

/**
 * Adrift Convoy — Schwelle statt Verlauf.
 *
 * Sechs Griffe im Fenster, sonst nichts. Das ist der einzige Ort, der bei
 * Misserfolg LEER ausgeht, und er ist damit die Gegenprobe zum Riff: dort legt
 * jeder Griff zu, hier zählt nur, ob man fertig wird.
 *
 * Er zahlt MATERIAL und keine Chimes — bewusst nicht Meeps, obwohl ein
 * geretteter Pilgerzug danach klänge. `lostMeep` ist im Drifter-Katalog
 * ausdrücklich als „der einzige Weg an einen Meep ausserhalb des Prestige"
 * begründet, und `meepEconomy.spec.ts` klammert den Meep-Baum auf 20 bis 32
 * Aufbrüche bei rund 90 Meeps je Lauf. Eine zweite Quelle machte die Prämisse
 * dieser Rechnung still ungültig.
 *
 * Sechs Griffe gegen die acht des Riffs: erreichbar, aber nur mit Absicht.
 */
export const LANDFALL_CONVOY_TAP_GOAL = 6
export const LANDFALL_CONVOY_MATERIALS = 3

/**
 * Wie weit eine Ortsmarke dem Kern ausweicht, in Anteilen der Karte.
 *
 * Der Kern gehört dem Tor — dieselbe Regel, nach der `generateGalaxyDots` seine
 * Sterne auf `t` 0,25–0,87 hält und der Bossstern allein in der Mitte steht.
 *
 * Ohne sie landen Orte der LETZTEN Etappe unter dem Tor: die Route läuft dort
 * auf den Kern zu, und `LANDFALL_T_MAX` (0,68) reicht nicht, wenn die letzte
 * Etappe kurz ist. Gemessen verschwanden zwei von sechs Marken vollständig
 * darunter — samt ihrer Fangfläche, also auch ohne Tooltip.
 *
 * 0,10 deckt den gemalten Radius des Tores (`CORE_GATE_MOUTH_R` 13 ×
 * `CORE_GATE_CROWN_SPAN` 1,5 gegen `GALAXY_PLATE_REF_W` 320 ≈ 0,061) samt
 * seinem Schein ab.
 */
export const LANDFALL_CORE_CLEARANCE = 0.1

/** Radius der gemalten Ortsmarke, in Referenzeinheiten gegen
 *  `GALAXY_PLATE_REF_W`. Die Zeichenschicht und die Sperrzone müssen dieselbe
 *  Zahl benutzen, sonst rutscht die Marke halb unter das Tor. */
export const LANDFALL_MARK_R = 6

/** Luft zwischen Ortsmarke und Torkante, in Pixeln der Karte. */
export const LANDFALL_CORE_GAP_PX = 4

/**
 * The Rupture — der einzige Ort mit echten Kosten.
 *
 * Versiegelt zahlt sie wie ein erlegter Riss. Versäumt lässt sie
 * `LANDFALL_RUPTURE_BURST` Wesen in den `voidStore` — SEINE eigenen Wesen, kein
 * neuer Gegnertyp, kein eigener Schaden und keine zweite Ablaufuhr. Der Void
 * bleibt das einzige System, das gegen den Spieler drängt; die Rupture ist nur
 * seine Vokabel auf der Reiseetappe.
 *
 * Vier Griffe gegen die sechs des Konvois: sie will Eile, nicht Ausdauer, und
 * das Fenster ist dasselbe.
 *
 * Der Ausbruch schickt ausdrücklich `lesser`. `spawnMonster()` ohne ID zöge
 * `SEVERITIES[0]` — und die Liste ist absteigend sortiert, das wäre ABYSSAL.
 * Drei davon auf einmal wären kein Ort, sondern ein Hinterhalt.
 */
export const LANDFALL_RUPTURE_TAP_GOAL = 4
export const LANDFALL_RUPTURE_BURST = 3
export const LANDFALL_RUPTURE_SEAL_SECONDS = 70
export const LANDFALL_RUPTURE_BURST_DEF = 'sunlessBreach'

/**
 * Wayside Cairn — wie viele Angebote am Stein stehen, und was einer wiegt.
 *
 * DREI aus vier: bei vieren wäre es keine Wahl, sondern eine Liste, und bei
 * zweien fiele die Entscheidung zu oft von selbst.
 *
 * EIN Betrag für alle vier Achsen. Die Wahl geht darum, welche Achse gerade
 * zählt — nicht darum, welche Zahl grösser ist; sonst wäre es keine Abwägung,
 * sondern Rechnen.
 *
 * 18 % über eine ganze Galaxie liegt bewusst zwischen den beiden vorhandenen
 * Reichweiten: ein Drifter-Buff gibt ×2 bis ×3 für 20 bis 90 Sekunden, eine
 * Vorsehung ±10 bis 30 % für einen ganzen Lauf. Eine späte Galaxie dauert im
 * Modell 57 Minuten.
 */
export const LANDFALL_CAIRN_OFFERS = 3
export const LANDFALL_CAIRN_BOON_MULT = 1.18

/** Eigener rng-Strom für die drei Angebote — er darf die Ziehreihenfolge der
 *  Orte nicht berühren, sonst verschöbe sich das ganze Archiv. */
export const LANDFALL_CAIRN_SEED_SALT = 6113

/**
 * Der Ton der Landfalls — Logzeile, Kartenrand, Marke auf dem Galaxiebild.
 *
 * Blasses Seegrün, und bewusst weit weg von den vier Tönen, die im Log ohnehin
 * schon Nachrichten tragen: Gold (Chronicle), Violett (Vorzeichen), Mint
 * (Wayfinder), Magenta (Void). Die vier melden alle, dass etwas ERREICHT oder
 * VERLOREN ist. Ein Ort ist keins von beidem — er ist vorbeigekommen.
 */
export const LANDFALL_ACCENT_HEX = '#8fbfae'

/**
 * Admin-Panel: Kantenlänge der Vorschau-Sonde je Ort-Kachel.
 *
 * Vorbild ist `ADMIN_DRIFTER_PREVIEW_PX` (34) — dort zeigt die Kachel die echte
 * Silhouette, weil man beim Prüfen nach der Form greift und nicht nach dem
 * Namen. Für Landfalls gilt das doppelt: sie teilen sich EINE Raute und trennen
 * sich nur durch die Binnenmarke.
 */
export const ADMIN_LANDFALL_PREVIEW_PX = 40

/**
 * Radius, mit dem `drawLandmark` in die Sonde malt.
 *
 * Muss über `LANDMARK_R_DETAIL` (9) liegen, sonst fällt die Binnenmarke weg und
 * alle Kacheln zeigen dieselbe leere Raute — also genau die Verwechslung, gegen
 * die die Vorschau überhaupt da ist.
 */
export const ADMIN_LANDFALL_PREVIEW_R = 13

/* ── Der Körper auf der Bühne ─────────────────────────────────────────────────
   Ein Landfall ist ein ORT, kein Wesen. Drifter und Void-Monster bewegen sich
   aus eigenem Antrieb quer durchs Bild; ein Ort steht still, und das Schiff
   fliegt an ihm vorbei. Genau das trägt die Bewegung hier: keine Bahnkurve,
   sondern die Parallaxe eines Vorbeiflugs — langsam und klein an den Enden,
   schnell und gross in der Mitte.                                            */

/**
 * Halber Öffnungswinkel des Vorbeiflugs.
 *
 * Die zurückgelegte Strecke läuft linear mit dem Fenster, gezeigt wird der
 * WINKEL dazu; die Grösse ist `cos(theta)`. Bei 1,1 rad (rund 63°) steht der
 * Ort an den Enden auf 45 % seiner Grösse und zieht dort fünfmal langsamer als
 * querab — träge genug, dass er auftaucht statt aufzupoppen.
 *
 * Höher ist NICHT besser: 1,25 rad stauchte die Enden so stark, dass der Körper
 * knapp ein Drittel des Fensters ganz ausserhalb des Bildes stand (gemessen auf
 * Full HD, x bis −383). Die HUD-Karte meldet den Ort ab Sekunde null, und eine
 * Meldung über etwas, das man nicht sehen kann, ist genau der Fehler, gegen den
 * der HUD-Freiraum geschrieben ist.
 */
export const LANDFALL_FLYBY_THETA_MAX = 1.1

/** Deckkraft an den Enden der Sehne, und die Kurve dorthin. Der Ort verschwindet
 *  nicht ganz — er ist weit weg, nicht abwesend. */
export const LANDFALL_BODY_ALPHA_MIN = 0.2
export const LANDFALL_BODY_ALPHA_EASE = 2.2

/**
 * Kantenlänge der Raute, wenn der Ort querab steht — bezogen auf 1920 px
 * Viewportbreite und von dort mitwachsend.
 *
 * Nicht `--hud-scale`: die deckelt bei 1 und liesse den Ort auf 4K
 * verschwinden. Der Deckel liegt hier bei 1,7, weil die Raute sonst auf 3840
 * die Sonne erreicht.
 */
export const LANDFALL_BODY_BASE_PX = 116
export const LANDFALL_BODY_VP_REF_W = 1920
export const LANDFALL_BODY_SCALE_MIN = 0.85
export const LANDFALL_BODY_SCALE_MAX = 1.7

/**
 * Abstand zur Bildmitte, als Anteil der kürzeren Feldkante.
 *
 * Grösser als beim Drifter (0,3): der Ort wird zur Fenstermitte hin am
 * grössten, also gerade dann, wenn er der Sonne am nächsten kommt. Dort steht
 * die Chime-Klickfläche, bei Sonnenphase 5 volle 560 px.
 */
export const LANDFALL_CENTER_CLEARANCE = 0.38

/** Reichweite des Scheins als Vielfaches der Rautenkante, und der Takt, in dem
 *  er atmet. Animiert wird ausschliesslich seine Deckkraft — der Verlauf selbst
 *  steht still (Performance-Regel 2). */
export const LANDFALL_BODY_HALO_SPAN = 1.75
export const LANDFALL_BODY_BREATHE_MS = 3400

/** Trefferfläche über die Rautenkante hinaus. Dieselbe Zahl wie beim Drifter —
 *  eine Raute hat spitze Ecken und trifft sich schlechter als eine Scheibe. */
export const LANDFALL_BODY_HIT_PADDING_PX = 14

/** Ringwelle auf einen Griff, und der einmalige Ring im Querab-Moment. */
export const LANDFALL_BODY_TAP_PULSE_MS = 520
export const LANDFALL_BODY_ABEAM_MS = 1100

/**
 * Nachlauf, wenn der Store den Ort schliesst.
 *
 * Ohne ihn verschwindet der Körper mitten im Bild von einem Frame auf den
 * nächsten — und ausgerechnet der letzte Anblick ist der, den die Chronik
 * später wiederholt: hell, wenn er angefasst wurde, sonst auf
 * `LANDMARK_LANDFALL_MISSED_ALPHA` gedimmt.
 */
export const LANDFALL_BODY_EXIT_MS = 560
export const LANDFALL_BODY_EXIT_SHRINK = 0.32

/** Eigener rng-Strom für die Spur. Der Strom in `landfallOnLeg` hat eine feste
 *  Ziehreihenfolge und wird für archivierte Galaxien nachgespielt — ein
 *  zusätzlicher Zug dort schriebe jede Chronik um. Muster: `cairnOffer`. */
export const LANDFALL_LANE_SEED_SALT = 4441

/**
 * Die vier Sehnen, auf denen ein Ort vorbeizieht — normierte Feldkoordinaten
 * (0..1 zwischen Header und Bottom-Bar), gespiegelt ergibt acht Varianten.
 *
 * Anders als `DRIFTER_ROUTES` sind das GERADEN mit einem seitlichen Bogen, kein
 * Spline: ein Ort weicht nicht aus, er zieht vorbei. Keine Sehne kreuzt das
 * mittlere Drittel — dort steht die Sonne samt Klickfläche.
 *
 * Der Überhang über [0,1] ist mit 0,09 klein: die Winkelstauchung an den Enden
 * dehnt ihn ohnehin auf rund ein Siebtel des Fensters. Bei 0,2 stand der Körper
 * fast ein Drittel der Zeit ausserhalb des Bildes.
 */
export const LANDFALL_LANES: ReadonlyArray<{
  from: { x: number; y: number }
  to: { x: number; y: number }
  /** Seitlicher Bogen quer zur Sehne, im Scheitel bei halber Strecke. */
  bow: number
}> = [
  // Oberer Streifen, links nach rechts
  { from: { x: -0.09, y: 0.34 }, to: { x: 1.09, y: 0.2 }, bow: -0.09 },
  // Unterer Streifen, rechts nach links
  { from: { x: 1.09, y: 0.68 }, to: { x: -0.09, y: 0.8 }, bow: 0.08 },
  // Flache Schräge oben, steigend
  { from: { x: -0.09, y: 0.4 }, to: { x: 1.09, y: 0.1 }, bow: 0.07 },
  // Flache Schräge unten, fallend
  { from: { x: 1.09, y: 0.56 }, to: { x: -0.09, y: 0.88 }, bow: -0.07 },
]

/** Der Querab-Moment — dort steht `theta` auf null, der Ort ist am nächsten und
 *  das Erntefenster halb um. */
export const LANDFALL_BODY_ABEAM_AT = 0.5
