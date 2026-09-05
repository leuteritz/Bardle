// Landfalls — die Orte, die AUF einer Reiseetappe liegen.
//
// Ein Landfall hat keine eigene Reisezeit, keine eigene Uhr und keine Geste zum
// Ansteuern. Er kommt, weil das Schiff ohnehin vorbeifliegt, und er geht vorbei,
// wenn niemand hinsieht. Das ist der Unterschied zu jedem anderen Ereignis im
// Orbit: Drifter und Void tragen ihre eigene Uhr und sind ORTLOS, der
// Champion-Stern ist ein eigenes Ziel mit eigener Reise.

import type {
  LandfallFxStage,
  LandfallGesture,
  LandfallKindId,
  LandfallMotif,
  LandfallPresence,
} from '@/types'

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
export const LANDFALL_BODY_ALPHA_MIN = 0.32
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

export const LANDFALL_THROUGH_SCALE_MAX = 1.15
export const LANDFALL_THROUGH_ABEAM_AT = 0.9
export const LANDFALL_THROUGH_CHANCE: Readonly<Partial<Record<LandfallKindId, number>>> = {
  chime_reef: 0.4,
  the_rupture: 0.4,
  adrift_convoy: 0.35,
}

/* ── Der Körper als OBJEKT ────────────────────────────────────────────────────
   Ein Landfall war auf der Bühne bis hierher dieselbe hohle Raute wie auf dem
   Galaxiebild, mit einem Iconify-Glyph in der Mitte — ein ZEICHEN am Himmel.

   Er ist jetzt ein KÖRPER IM LICHT DER SONNE. Das ist wörtlich der Satz, auf dem
   `DrifterBody.vue` gebaut ist, und er gilt hier aus demselben Grund: die Bühne
   hat genau eine Lichtquelle, sie steht in der Mitte, und ein Ding, das ihr eine
   helle Seite zuwendet, liest sich als Ding statt als Symbol.

   Die 4-px-Marke auf der Karte bleibt die Raute — dort trägt keine Textur, und
   die Begründung dafür (der Formvorrat ist bei 4,4 px ausgereizt) steht
   unverändert in `galaxyLandmarks.ts`.                                        */

/**
 * Was jeder der sechs Orte für ein Objekt IST.
 *
 * Als `Record` plus erschöpfender `switch` in `landfallSprite.ts`: ein siebter
 * Ort ohne Zeichenzweig COMPILIERT NICHT. Genau das fehlte `paintLandfallMark` —
 * dort fällt ein neuer Ort still durch die Verzweigung und malt eine leere Raute.
 */
export const LANDFALL_BODY_MOTIF: Record<LandfallKindId, LandfallMotif> = {
  chime_reef: 'shoal',
  the_gloaming: 'darkcloud',
  adrift_convoy: 'derelicts',
  sunken_ossuary: 'hulk',
  wayside_cairn: 'planetoid',
  the_rupture: 'lens',
}

/**
 * Wer eine Sonnenseite hat — und wer nicht.
 *
 * Dieselbe Unterscheidung, die `DrifterBody.vue` schon führt: Plasma, ein Pulsar
 * und eine Gravitationslinse werden nicht von aussen beleuchtet. Ein Nebel
 * STREUT das Licht, das durch ihn hindurchgeht, und eine Linse trägt fremdes
 * Licht statt einer Oberfläche. Beiden einen Terminator zu geben wäre eine
 * Ebene, die das Falsche behauptet — und sie kostet dann auch noch.
 */
export const LANDFALL_BODY_LIT: Record<LandfallKindId, boolean> = {
  chime_reef: true,
  the_gloaming: false,
  adrift_convoy: true,
  sunken_ossuary: true,
  wayside_cairn: true,
  the_rupture: false,
}

/**
 * Wie viel Zierrat eine Präsenzstufe trägt.
 *
 * Gebaut wie `DRIFTER_FX_STAGES`, und aus demselben Grund: jede Stufe legt GENAU
 * EINE Ebene dazu. Die Seltenheit zeigt sich darin, wie viel RAUM ein Objekt
 * einnimmt — Schleier, Begleitsplitter, eine Ankunftswelle — nicht in einer
 * Rahmenfarbe. Ein goldener Rand um einen Asteroiden wäre wieder ein Zeichen.
 */
export const LANDFALL_PRESENCE_STAGES: Record<LandfallPresence, LandfallFxStage> = {
  common: { presence: 'common', veilLayers: 0, veilAlpha: 0, motes: 0, detail: 0, herald: false },
  uncommon: {
    presence: 'uncommon',
    veilLayers: 1,
    veilAlpha: 0.5,
    motes: 0,
    detail: 1,
    herald: false,
  },
  rare: { presence: 'rare', veilLayers: 1, veilAlpha: 0.6, motes: 3, detail: 2, herald: false },
  singular: {
    presence: 'singular',
    veilLayers: 2,
    veilAlpha: 0.7,
    motes: 5,
    detail: 2,
    herald: true,
  },
}

/** Tiefpunkt der Schleier-Atmung als Anteil von `veilAlpha`. */
export const LANDFALL_VEIL_BREATHE_LOW = 0.5

/**
 * Ab welcher ECHTEN Kantenlänge eine Zierebene überhaupt gezeigt wird.
 *
 * Performance-Regel 7, und hier besonders nötig: an den Enden der Sehne steht
 * der Körper auf `cos(1,1)` — rund 45 %, auf Full HD also 53 px. Drei
 * Begleitsplitter messen dort je zwei Pixel: unsichtbar und voll bezahlt.
 * Vorbild ist `DRIFTER_ORNAMENT_MIN_SIZE`.
 */
export const LANDFALL_ORNAMENT_MIN_PX = 72

/**
 * Wie weit der Sprite über die Körperkante hinausreicht.
 *
 * Nicht jedes Motiv endet an seiner Kernkontur: der Trümmerschwarm streut nach
 * aussen, die Dunkelwolke hat gar keine Kante, die Linse trägt ihre Bögen im
 * Aussenfeld. 1,42 fängt den weitesten davon — den Schwarm, dessen äusserster
 * Brocken samt eigenem Radius bei rund 0,7 der halben Kante endet.
 */
export const LANDFALL_SPRITE_SPAN = 1.42

/**
 * Wie viele Sprites gleichzeitig im Speicher liegen.
 *
 * Es steht immer nur EIN Ort im Bild, aber ein Fensterziehen ändert `--lfb-px`
 * und damit den Schlüssel. Vier reichen für den laufenden plus eine
 * Vorgängergrösse — und der Konvoi belegt ZWEI: Körper und Notsignal liegen als
 * getrennte Ebenen im selben Cache. Einer misst bei 197 px Körperkante, Span
 * 1,42 und dpr 2 rund 560 px im Quadrat.
 */
export const LANDFALL_SPRITE_CACHE_MAX = 4

/**
 * Wie weit sich der Körper über sein ganzes Fenster ZUSÄTZLICH dreht.
 *
 * Zusätzlich, weil die Hauptdrehung geschenkt kommt: die Sonnenseite ist im
 * Sprite eingebacken, der Aufrufer dreht ihn auf `drifterLightAngleDeg`, und
 * dieser Winkel wandert über einen Vorbeiflug um bis zu 150 Grad. Der Körper
 * dreht sich davon schon sichtbar.
 *
 * Deshalb ist die Zahl KLEIN, und das ist keine Zurückhaltung, sondern eine
 * Grenze: die Eigendrehung verdreht das eingebackene Licht um genau ihren
 * Betrag. Bis etwa 40 Grad verschluckt das der weiche Terminator; darüber
 * wandert die Sonne sichtbar von der Bildmitte weg. Der erste Entwurf stand auf
 * 210 und hatte den Terminator noch als eigene DOM-Ebene — die lag bei den drei
 * offenen Motiven als dunkle Scheibe im leeren Raum.
 *
 * An den FENSTERFORTSCHRITT gehängt, nicht an eine eigene Uhr: dann dreht sich
 * jeder Ort über seinen Auftritt gleich weit, ob sein Fenster 8 oder 30 Sekunden
 * misst — und bei `gameSpeed` 20 dreht er mit, wie alles andere auch.
 */
export const LANDFALL_SPIN_TURN_DEG = 40

/**
 * Startwinkel je Spur, damit nicht jeder Ort in derselben Lage auftaucht.
 *
 * Aus der SPUR abgeleitet, nicht gewürfelt: ein eigener rng-Strom wäre ein
 * zusätzlicher Zug in einer Ziehreihenfolge, die für jede archivierte Galaxie
 * nachgespielt wird.
 */
export const LANDFALL_SPIN_PHASE_DEG = 47

/** Drehung auf ganze Grad. Der Compositor bewegt gratis, ein GEÄNDERTER
 *  `transform` kann rastern — dieselbe Überlegung wie
 *  `ORBIT_SCALE_QUANTIZE_STEPS` und `DRIFTER_LIGHT_QUANTIZE_DEG`. */
export const LANDFALL_SPIN_QUANTIZE_DEG = 1

/**
 * Wie viele Teile jedes Motiv trägt — Grundzahl, `detail` legt zu.
 *
 * Alle Lagen und Grössen werden aus dem INDEX abgeleitet, nie gewürfelt: ein
 * `Math.random()` im Sprite-Bau liesse den Körper bei jedem Cache-Miss anders
 * aussehen. Dieselbe Regel, aus der `voidSprite` seine Zacken und
 * `paintFreedStar` seinen Trabanten aus dem Index nehmen.
 */
export const LANDFALL_SHOAL_SHARDS = 7
export const LANDFALL_CLOUD_LOBES = 4
export const LANDFALL_DERELICT_HULLS = 3
export const LANDFALL_CAIRN_STONES = 4
export const LANDFALL_LENS_ARCS = 3
export const LANDFALL_HULK_RIBS = 5

/**
 * Wie unrund eine Silhouette höchstens wird, als Anteil des Radius.
 *
 * Ein Asteroid ist eine Kartoffel, kein Kreis — das ist der halbe Unterschied
 * zwischen einem Körper und einem Symbol. Der Deckel steht trotzdem: die
 * Trefferfläche ist rund (`border-radius: 50%`), und was weiter aussteht als
 * `WOBBLE`, ragt aus ihr heraus und nimmt keinen Griff mehr an.
 */
export const LANDFALL_SILHOUETTE_WOBBLE = 0.16

/**
 * Die Farben der sechs Körper — Fels, Eis, Metall, Nebel.
 *
 * `LANDFALL_ACCENT_HEX` steht hier ausdrücklich NICHT: das blasse Seegrün bleibt
 * ZUSTANDSFARBE (Griff-Marken, Ringwellen, Kartenkante, Logzeile) und ist keine
 * Körperfarbe. Ein Fels, der mint leuchtet, ist genau das, was hier weg sollte.
 *
 * Jedes Motiv nennt vier Töne: Lichtseite, Mitte, Schattenseite, Kante. Alle
 * sind gedämpft — die zwanzig Galaxie-Themen decken den Farbkreis fast lückenlos
 * ab, und ein gesättigter Körper kämpfte in vier bis fünf Galaxien mit dem Grund.
 */
export const LANDFALL_BODY_PALETTE: Record<
  LandfallKindId,
  { hi: string; mid: string; low: string; edge: string }
> = {
  // Eis mit Chime-Einschlüssen: bläulich-weiss, kalt.
  chime_reef: { hi: '#d3dee4', mid: '#8b9aa4', low: '#2f3941', edge: '#eef4f7' },
  // Eine Dunkelwolke ist kein Körper — sie hat nur Dichte.
  the_gloaming: { hi: '#4a3f52', mid: '#2e2733', low: '#120f16', edge: '#6b5c74' },
  // Gebrauchtes Hüllenmetall, seit langem ohne Wartung.
  adrift_convoy: { hi: '#9a9184', mid: '#5f5850', low: '#241f1a', edge: '#c3b7a4' },
  // Kalter Fels über Metall, vereist an den Kanten.
  sunken_ossuary: { hi: '#7d7264', mid: '#4b4238', low: '#1c1712', edge: '#a9b6bb' },
  // Ein Planetoid: Regolith, nichts weiter.
  wayside_cairn: { hi: '#8a7a66', mid: '#564a3c', low: '#201a14', edge: '#a6957c' },
  // Gelinstes Sternlicht um ein Loch — die einzige Farbe ist fremde.
  the_rupture: { hi: '#e6e2f2', mid: '#8f86ad', low: '#07060c', edge: '#c9bff0' },
}

/** Das Notsignal des Konvois — die EINZIGE eigene Lichtquelle unter den sechs
 *  Körpern. Es blinkt als DOM-Ebene, nicht im Sprite: ein Blinken gehört zur
 *  Zeit, und Zeit gehört nicht in ein einmal gerastertes Bild. */
export const LANDFALL_DISTRESS_HEX = '#e8a24a'
export const LANDFALL_DISTRESS_MS = 1600

/** Takt der Staubschleier. Zwei Ebenen atmen auf VERSETZTEN Takten, sonst liest
 *  sich der Schleier als ein flacher Ring. Muster: `pulse` beim Drifter. */
export const LANDFALL_VEIL_BREATHE_MS = 5200
export const LANDFALL_VEIL_OFFSET_MS = 1700

/** Wie weit die Begleitsplitter um den Körper stehen und wie lange sie für eine
 *  Runde brauchen. Reine CSS-Rotation an einer eigenen Ebene — kein Frame-Wert. */
export const LANDFALL_MOTE_ORBIT_SPAN = 1.24
export const LANDFALL_MOTE_ORBIT_MS = 14_000

/* ── Was die Kartenmarke im Hover sagt ────────────────────────────────────────

   Seltenheit und Geste standen bisher NUR im Katalog: die Praesenz zeigt sich
   am Koerper als RAUM (`LANDFALL_PRESENCE_STAGES`), die Geste als Stand in der
   HUD-Karte. Im Archiv ist beides vorbei — dort ist das Wort der einzige Weg,
   und der Tooltip ist Auskunft, kein Bild. Der Koerper bleibt unberuehrt.    */

export const LANDFALL_PRESENCE_LABEL: Record<LandfallPresence, string> = {
  common: 'Common',
  uncommon: 'Uncommon',
  rare: 'Rare',
  singular: 'Singular',
}

/**
 * Was der Ort vom Spieler VERLANGT hat, in einem Wort.
 *
 * Keine reine Tabelle: `threshold` traegt ZWEI Bedeutungen. Der Adrift Convoy
 * ist der Endspurt, die Rupture die Eile — sie unterscheiden sich allein am
 * `burst`, und ein Record ueber die Geste allein wuerde beide gleich nennen.
 */
export function landfallGestureLabel(gesture: LandfallGesture, burst?: number): string {
  switch (gesture) {
    case 'gradient':
      return 'Endurance'
    case 'threshold':
      return burst ? 'Haste' : 'A last push'
    case 'single':
      return 'One decision'
    case 'choice':
      return 'Deliberation'
    default:
      return 'Nothing'
  }
}
