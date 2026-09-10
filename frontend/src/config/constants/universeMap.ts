/**
 * Der Universe-Reiter — die eine Karte, auf der der ganze Weg steht.
 *
 * Drei Zonen teilen sich EIN Budget: die Universumsleiste RECHTS
 * (`UNIVERSE_MAP_RAIL_ZONE_W` — Liste plus Griff, wie im Voyages-Atlas), das
 * Kopfband oben (`UNIVERSE_MAP_CREST_BAND_H`) und der Rest ist Buehne. Wer eine der
 * beiden ersten anhebt, nimmt es der Karte —
 * `__tests__/config/universeLayout.spec.ts` bindet den Boden.
 */

import { GALAXY_STARS_MAX } from '@/config/constants/progression'

// ── Zonen ───────────────────────────────────────────────────────────────────
/**
 * Aussenhoehe des Kopfbands. Haengt per `v-bind` am Element, nicht nur im CSS.
 *
 * 112, und die Zahl gehoert nicht diesem Reiter allein: die Voyages-Kopfleiste
 * misst dieselbe (`VOYAGE_COMMAND_BAR_H` 109 + 3 Rahmen). Beide legen ein Band
 * ueber eine grosse Buehne, und bei 108 gegen 126 sprang deren Oberkante beim
 * Reiterwechsel um 18 px. 112 ist der einzige Treffpunkt, an dem beide ohne
 * Substanzverlust ankommen — tiefer traegt die Voyages-Leiste ihre Fleet-Karte
 * nicht, hoeher rollt hier die Universumsleiste.
 *
 * Denn Band, Leiste und Buehne teilen EIN Budget: auf Full HD misst der
 * Reiterinhalt 782,6 px, von denen die grosse Stufe der Leiste 665 braucht. Es
 * bleiben 5,6 px Luft — dieselben wie bei 108, weil `UNIVERSE_RAIL_LIST_PAD`
 * die vier Pixel bezahlt hat (24 -> 20). Wer weiter anhebt, laesst die zehn
 * Universumszeilen rollen.
 *
 * Und die Fit-Box der Bahn klemmt auf allen vier Zielaufloesungen an der HOEHE:
 * die 20 px, um die das Band seit seiner 92er Fassung gewachsen ist, kosten sie
 * 10 px Radius (315,3 -> 305,3), womit der Knotenabstand bei vierzig Knoten von
 * 29,2 auf 28,3 faellt — die Trefferflaeche misst 26.
 */
export const UNIVERSE_MAP_CREST_BAND_H = 112
/** Polsterung und Luecke der Wappenzone. Sie hat einen festen ANTEIL wie jede
 *  Ablesung und traegt ihren Inhalt ebenso mittig; darin stehen nur noch Scheibe
 *  und Kennzeile — die Vorsehung ist ausgezogen: sie sind ABLESUNGEN und stehen
 *  in der Reihe. */
export const UNIVERSE_MAP_CREST_ID_PAD_X = 10
export const UNIVERSE_MAP_CREST_ID_GAP = 10

/* ── Die EINE Ablesungsreihe ────────────────────────────────────────────────

   Jede Zelle hat einen festen prozentualen ANTEIL am Band (unten), nie eine
   Breite aus dem Inhalt — sonst schiebt jede wachsende Zahl ihre Nachbarn.

   Der alte feste Zuschnitt schnitt still ab: `_READ_W_CHIMES` (200) war gegen
   `5.74B / 51.2M` UND gegen einen clamp-Deckel von 34 gerechnet, waehrend der
   Code auf 38 stand — `285.31B / 51.3B` lief ueber die rechte Bandkante.
   Und die Wappenzone stapelte Kennzeile UEBER Vorsehung: bei 2560 summierte
   der Stapel auf 117 px in einer 109-px-Box, und `you are here` lag unter
   `+145%`.

   Was bleibt, ist das BUDGET: die gemessenen Breiten unten, gegen die
   `universeCrest.spec.ts` alle fuenf Zielbaender nachrechnet.               */

/** Seitliche Polsterung EINER Ablesung, beidseitig, und die Luecke zwischen
 *  Zahl und Beschriftung. */
/* Die Polsterung zaehlt zweimal je Zelle, also 12 px in der Reihe — und sie
   ist der billigste Hebel der Breitenbilanz: von 4 auf 3 hebt sie die kleinste
   Zellreserve auf dem schmalsten Zielband von 2,0 auf 3,7 px, ohne dass ein
   Text kuerzer oder eine Schrift kleiner wird. Die Marge ist noetig, seit die
   Zonen feste Anteile tragen: ein zu breiter Text laeuft dann nicht mehr
   sichtbar ueber die Bandkante, sondern still ueber die Haarlinie in die
   Nachbarzelle.                                                              */
export const UNIVERSE_MAP_CREST_READ_PAD_X = 3
export const UNIVERSE_MAP_CREST_READ_GAP_PX = 5
/** Die Haarlinie, die zwei Ablesungen scheidet — sie zaehlt zur Zellbreite. */
export const UNIVERSE_MAP_CREST_CELL_RULE = 1
/** Die Naht unter dem Band, dieselbe wie unter der Voyages-Kopfleiste. Sie
 *  geht der Innenhoehe ab: 112 - 3 = 109. */
export const UNIVERSE_MAP_CREST_BAND_BORDER_B = 3
/** Zeilenbox-Faktor der Beschriftung in der Hoehenbilanz. Sie traegt
 *  `line-height: 1` — bei `normal` waere MedievalSharps Box 1,5. Die
 *  Verwerfung von damals galt gegen eine FESTE 10,5-px-Beschriftung; mit der
 *  mitwachsenden faellt die Abweichung von der Bandmitte auf allen drei
 *  Zielbreiten (2,50/3,00/2,75 -> 1,25/1,50/1,25). */
export const UNIVERSE_MAP_CREST_LINE_BOX = 1

/* Die Schrift skaliert gegen das BAND (`container-type: inline-size` an
   `.un-crest`), nicht gegen den Viewport: `--hud-scale` entkoppelt beide —
   bei 1536 CSS-px misst das Band 988, bei 1920 aber 1240. Die alte
   1,9vw-Fassung gab dort 29,2 gegen 36,5 px, obwohl der Platz nur um ein
   Viertel waechst. Die Faktoren sind so gesetzt, dass der Boden auf dem
   schmalsten Zielband (988) greift und der Deckel auf 2K (1660).            */
export const UNIVERSE_MAP_CREST_VALUE_MIN_PX = 25
export const UNIVERSE_MAP_CREST_VALUE_MAX_PX = 38
export const UNIVERSE_MAP_CREST_VALUE_CQW = 2.5
export const UNIVERSE_MAP_CREST_LABEL_MIN_PX = 10
export const UNIVERSE_MAP_CREST_LABEL_MAX_PX = 12
export const UNIVERSE_MAP_CREST_LABEL_CQW = 1
/** Die Kennzeile ist der WERT der Identitaetszelle: eigener Grad, weil ein
 *  Wort breiter baut als eine Ziffer. */
export const UNIVERSE_MAP_CREST_KICKER_ID_MIN_PX = 17
export const UNIVERSE_MAP_CREST_KICKER_ID_MAX_PX = 26
export const UNIVERSE_MAP_CREST_KICKER_ID_CQW = 1.4

/** Ein Name ist kein Zaehler: fester Grad statt der Skala der Zahlen. */
export const UNIVERSE_MAP_CREST_PROV_NAME_PX = 24
/** Das echte Chime-Artwork neben der Chimes-Ablesung. Unter dem Schriftboden,
 *  und unter der 34-px-Schwelle der `-128`-Aufloesungsstufe. */
export const UNIVERSE_MAP_CREST_CHIME_ART_PX = 24

/* Die breitesten Inhalte des Bandes, in em IHRER Schrift — im Browser
   gemessen (MedievalSharp, exakt die Deklarationen der SFC), nicht aus einer
   Glyphenbreite geschaetzt. Genau diese Schaetzung war der Fehler: `+250 %`
   misst 0,64 em je Zeichen, `999.99No` aber 0,57 — eine Zahl fuer beide traf
   keine von beiden. Die Werte sind bei 24 und 38 px identisch gemessen.     */
export const UNIVERSE_MAP_CREST_EM = {
  /** `999.99No / 999.99No` — Wert samt Ziel, das Ziel bei 0,5 em. Acht
   *  Zeichen sind, was `formatNumber` unter 1e33 hoechstens liefert; darueber
   *  `toExponential(2)` („1.23e+45"), ebenfalls acht. */
  chimes: 7.428,
  /** `999 / 99` mit verkleinertem Trennstrich (0,55 em, 0,1 em Rand). Ohne
   *  ihn misst dieselbe Zeile 4,270 em — der Strich allein kostete 0,72 em. */
  stars: 3.548,
  /** `99d 23h` — die breiteste Form von `formatCompactDuration`. */
  elapsed: 3.936,
  /** `999` — die Galaxien-Ablesung. */
  count: 1.883,
  /** `▲+250%`, Pfeil bei 0,5 em plus 0,16 em Polsterung. +250 % ist der
   *  hoechste Buff. */
  prov: 3.778,
  /** `Universe VIII` versal, 0,12 em gesperrt. */
  kicker: 7.785,
  /** `Struck Resonance` — der laengste Vorsehungsname. */
  provName: 8.133,
} as const

/** Dieselbe Messung fuer die Beschriftungen, versal und 0,1 em gesperrt. Sie
 *  binden oefter als die Zahlen: `.un-crest-k` ist `nowrap` OHNE Ellipse und
 *  schnitte still ab. */
export const UNIVERSE_MAP_CREST_LABEL_EM = {
  /** `Expedition rewards` — die laengste der 19 Vorsehungsachsen. */
  prov: 11.966,
  /** `No providence recorded` — der laengste Fall der breiten Ablesung. */
  provWide: 14.891,
  galaxies: 5.144,
  stars: 3.53,
  /** `Chimes · ~59m 59s` — mit der Uhr bis zum Aufbruch. */
  chimes: 10.85,
  elapsed: 4.781,
  /** `Unrecorded` — steht in der Chimes- UND der Elapsed-Beschriftung, wenn
   *  das Archiv den Lauf nicht mehr hergibt. In beiden Zellen bindet die ZAHL,
   *  aber ungemessen war das eine Behauptung. */
  unrecorded: 7.273,
  /** `you are here · x123` unter der Kennzeile — der Besuchszaehler ist nach
   *  oben offen, also der dreistellige Fall. */
  state: 11.572,
} as const

/** Die feste Breite JEDER Zone, als Anteil an der Bandbreite in Prozent.
 *
 *  Sie ist der ganze Punkt dieser Reihe: eine Breite, die am INHALT haengt,
 *  laesst jede wachsende Zahl die Nachbarn schieben — und Chimes, Stars und
 *  Elapsed wachsen im laufenden Spiel dauernd. Hier haengt sie allein an der
 *  BANDBREITE.
 *
 *  ACHTUNG, der naheliegende Weg ist falsch: `flex-grow: N` mit
 *  `flex-basis: 0` ergibt NICHT `Band x Anteil`. Unter `box-sizing:
 *  border-box` (Tailwind-Preflight) floort die Basis auf Polsterung plus
 *  Kante — 7 px je Ablesung, 21 px fuer die Identitaet. Diese Summe wird VOR
 *  der Verteilung abgezogen und danach flach zurueckgegeben; grosse Zellen
 *  verlieren, kleine gewinnen. Durchgerechnet fehlten der Chimes-Zelle bei
 *  988 px 5,6 px. Es MUSS eine prozentuale `flex-basis` sein: sie loest gegen
 *  die Content-Box auf und ist unter `border-box` selbst ein Border-Box-Wert.
 *
 *  Hergeleitet aus dem Bedarf auf dem schmalsten Zielband (988, Full HD bei
 *  125 %) — dem EINZIGEN bindenden: darueber waechst jede Reserve monoton.
 *  Dort deckt der Bedarf 961,9 px; die uebrigen 26,1 px gehen zu gleichen
 *  PIXELN an alle sieben Zonen (je 3,73), nicht anteilig — eine grosse Zelle
 *  braucht keinen groesseren Puffer als eine kleine. Mehr als 26,1/7 kann die
 *  kleinste Reserve nicht werden.
 *
 *  `provWide` ist zwingend `2 x prov`: der Fall ohne Achsen ersetzt zwei
 *  Zellen durch eine, und beide Faelle muessen auf 100 kommen.
 *  `universeCrest.spec.ts` rechnet alles nach. */
export const UNIVERSE_MAP_CREST_SHARE = {
  id: 23.388,
  prov: 13.197,
  provWide: 26.394,
  galaxies: 6.292,
  stars: 10.064,
  chimes: 22.817,
  elapsed: 11.045,
} as const

/** Unter dieser Bandbreite gibt es KEINEN gueltigen Anteilssatz mehr: alle
 *  Schriften stehen dann auf ihrem clamp-Boden, der Bedarf ist konstant und
 *  uebersteigt das Band. Der Boden liegt bei 961,91 — nicht bei 988. */
export const UNIVERSE_MAP_CREST_ROW_FLOOR_W = 961.91

/* Die Universumsleiste steht RECHTS und traegt das Rezept der Forge-Detailspalte:
   Liste plus Griffleiste, und die ZONE ist beides zusammen. Dieselben Zahlen wie
   die Voyages-Zielliste — eine Seitenleiste ist in diesem Spiel EIN Ort. */
export const UNIVERSE_MAP_RAIL_PANEL_W = 244
export const UNIVERSE_MAP_RAIL_HANDLE_PX = 44
export const UNIVERSE_MAP_RAIL_ZONE_W = UNIVERSE_MAP_RAIL_PANEL_W + UNIVERSE_MAP_RAIL_HANDLE_PX
/** Unter dieser Reiterbreite klappt die Leiste selbst ein. Gemessen per
 *  ResizeObserver am Reiter, NICHT am Viewport. */
export const UNIVERSE_MAP_RAIL_AUTOFOLD_W = 1080
/** Nur das PANEL faehrt; die Zonenbreite wechselt hart in einem Frame — sie
 *  steht ueber den ResizeObserver in `paintKey` UND `groundKey` der Karte. */
export const UNIVERSE_MAP_RAIL_SLIDE_MS = 220
/** Polsterung des Rollkastens, beide Seiten. */
export const UNIVERSE_MAP_RAIL_PAD_X = 7
/** Luft, die `revealSelected` ueber der gewaehlten Zeile stehen laesst. */
export const UNIVERSE_MAP_RAIL_REVEAL_PAD = 8
export const UNIVERSE_MAP_RAIL_HANDLE_LABEL = 'UNIVERSES'
export const UNIVERSE_MAP_RAIL_OPEN_TITLE = 'Show universes'
export const UNIVERSE_MAP_RAIL_CLOSE_TITLE = 'Hide universes'
/** Boden der Buehne auf Full HD — die Spec rechnet dagegen. */
export const UNIVERSE_MAP_STAGE_MIN_W = 700
export const UNIVERSE_MAP_STAGE_MIN_H = 430

// ── Die Bahn ─────────────────────────────────────────────────────────────────
/** Unbeleuchtete Plaetze vor der laufenden Galaxie: die Bahn muss weitergehen,
 *  sonst endet das Universe dort, wo der Spieler gerade steht. */
export const UNIVERSE_MAP_UNLIT_AHEAD = 4
/** Boden des Bahn-Nenners. Alle Universen rechnen gegen DENSELBEN Nenner, damit
 *  der Knotenabstand ueberall gleich bleibt und man zwei Bahnen vergleichen
 *  kann. Ohne den Boden saesse eine Zwei-Galaxien-Bahn am Wall, und der Anfang
 *  eines Universums saehe aus wie sein Ende. */
export const UNIVERSE_MAP_PATH_MIN_SPAN = 8
/** Die vier Stufen des Wall-Verlaufs, als Abstand vom Universumston: negativ
 *  gegen Schwarz (die Glut hinter dem Gewebe), positiv gegen Weiss (die
 *  aeussersten Faeden). Was den Wall traegt, ist nicht die Farbe, sondern die
 *  HELLIGKEITSFOLGE — der Ton sagt nur, WELCHES Universum.
 *
 *  An der alten festen Glutrampe kalibriert: aus `#ff8a34` liegen sie nahe bei
 *  (206,82,28) … (255,238,208), nicht identisch — die alte hielt ihre
 *  Saettigung laenger, was sich mit einem Ton allein nicht nachbauen laesst. */
export const UNIVERSE_MAP_WEB_TINT_STOPS = [-0.2, 0, 0.38, 0.78] as const
/** Radius des innersten Knotens, normiert auf den Bahnradius. */
export const UNIVERSE_MAP_PATH_R0 = 0.12
/** Radius des aeussersten. UNTER 1, sonst saesse er auf dem Wall. */
export const UNIVERSE_MAP_PATH_R1 = 0.96
/** Unterlinear, aber nicht `sqrt`: bei 0,5 lag der Bestand aussen und der Kern
 *  stand leer. */
export const UNIVERSE_MAP_PATH_RADIUS_EXP = 0.58

/* Der Winkel ist GEWUERFELT, nicht gezaehlt. Ein fester Schritt legte die
   Knoten auf eine Spirale — jeder sass dort, wo man ihn nach dem vorigen
   erwartet, und der Reiter zeigte ein Diagramm statt einer Sternkarte. Der
   Radius waechst weiter monoton mit dem Index: der Fortschritt bleibt nach
   aussen ablesbar, und der Weg verknotet sich nicht.                          */

/** Auslenkung im PARAMETER der Radiuskurve, nicht im Radius. Unter 0,5, damit
 *  der Radius monoton bleibt; ohne sie liegen die Knoten auf Ringen. */
export const UNIVERSE_MAP_SCATTER_T_WOBBLE = 0.34
/** Weite eines Winkelschritts in Radiant. Der Boden haelt den Weg davor, auf
 *  der Stelle zu treten, der Deckel davor, quer ueber die Scheibe zu springen —
 *  das war die verworfene Zickzack-Fassung. 24,1 bis 131,8 Grad. */
export const UNIVERSE_MAP_SCATTER_STEP_MIN = 0.42
export const UNIVERSE_MAP_SCATTER_STEP_MAX = 2.3
/** Normierter Mindestabstand zweier Knoten. Gemessen gegen die ECHTE
 *  Trefferflaeche (`max(26, bodyR * k * 3.2)`, bei sieben Sternen 32,4 px), nicht
 *  gegen den Boden 26: bei 0,091 standen zwei Sieben-Sterne-Knoten 29 px
 *  auseinander und ihre Klickflaechen ueberlappten. Er ist ERZWUNGEN, nicht mehr
 *  eine Folge der Regelmaessigkeit. */
export const UNIVERSE_MAP_SCATTER_MIN_SEP = 0.115
/** Kandidaten je Knoten. Greift keiner, gewinnt der weiteste — und genau dort
 *  bricht der Boden ein: mit 12 Versuchen fiel er bei 120 Plaetzen auf 19,1 px.
 *
 *  Seit die Streuung je Universum wuerfelt, wird der Boden ueber ZEHN Bahnen
 *  genommen statt ueber eine, und 20 trugen ihn nicht mehr (21,0 px bei 120
 *  Plaetzen). Gemessen auf Full HD, Bahnradius 305,3: 24/28/32 halfen nicht
 *  (21,0), 40 brachte 27,2, ab 48 saettigt es bei 27,9 — 56 und 64 aendern
 *  nichts mehr. Der ganze Sweep (Spannen 8…120 x 10 Universen) kostet 2,7 s. */
export const UNIVERSE_MAP_SCATTER_TRIES = 48
/** Die Drehneigung eines Universums, als Abstand von der Muenze: 0,5 +- dies.
 *  Sie ist der Charakterzug einer Bahn — die eine umrundet die Mitte
 *  ueberwiegend in EINE Richtung und liest sich als weit geoeffneter Arm, die
 *  naechste kehrt staendig um. Bei 0 waere jede Bahn gleich launisch, bei 0,5
 *  liefe eine stur im Kreis und der Ablehnungspass truege sie allein. */
export const UNIVERSE_MAP_SCATTER_TURN_BIAS = 0.22
/** Das Feld, das dem START-Label gehoert: normiertes Rechteck unter der Mitte,
 *  samt halber Trefferflaeche als Saum. Weder ein Knoten noch eine Bahnsehne
 *  darf hinein. Ein groesserer Saum wurde gemessen und verworfen — er erzwang
 *  so viele Ausweichfaelle, dass der Mindestabstand auf 23,2 px fiel. */
export const UNIVERSE_MAP_START_CLEAR_X = 0.19
export const UNIVERSE_MAP_START_CLEAR_Y0 = 0.06
export const UNIVERSE_MAP_START_CLEAR_Y1 = 0.26
/** Radiale Auslenkung des Kontrollpunkts je Bahnabschnitt. Gerade Sehnen
 *  zwischen gewuerfelten Knoten lesen sich als Zickzack. Sie steht HIER und
 *  nicht beim Zeichnen: der Ablehnungspass haelt frei, was gemalt wird. */
export const UNIVERSE_MAP_ROAD_BOW = 0.1
/** Bezugsradius aller festen Pixelwerte der Platte: bei `box.r` == 300 ist der
 *  Massstab 1. Darueber wachsen Koerper, Linien und Schrift mit, statt
 *  Stecknadeln zu bleiben — dieselbe Mechanik wie `GALAXY_PLATE_REF_W`. */
export const UNIVERSE_MAP_PLATE_REF_R = 300
/** Zuschlag der Karten-Sprite-Kante ueber `box.r` hinaus.
 *
 *  Die Karte ist ein QUADRATISCHES Sprite um `box.cx/cy`, wie der Wall — sie
 *  dreht mit der Wolke, und buehnenfuellend schwenkte alles, was bei Zoom und
 *  Fahrt ausserhalb der Buehne liegt, als leere Flaeche ins Bild.
 *
 *  Der Teich unter dem groessten Knoten ist der weiteste Zug: 0,96 r plus
 *  `3,4 · 9,94 / 300` sind 1,073 r. `universePlate.spec.ts` bindet die Wand. */
export const UNIVERSE_MAP_PLATE_SPRITE_MARGIN = 1.1
/** Abstand der Bahn zur Buehnenkante. */
export const UNIVERSE_MAP_INSET_PX = 30

// ── Knoten ──────────────────────────────────────────────────────────────────
/** Gemalter Grundradius eines Knotens plus Zuschlag je Stern der Galaxie. */
export const UNIVERSE_MAP_NODE_R_BASE = 4.2
export const UNIVERSE_MAP_NODE_R_PER_STAR = 0.82
/** Kantenlaenge der Trefferflaeche — nie kleiner, egal wie klein der Koerper.
 *  Darueber waechst sie mit dem Koerper: `bodyR * k * _HIT_BODY_K`, bei sieben
 *  Sternen 32,4 px auf Full HD. DAS ist die Zahl, gegen die der Knotenabstand
 *  steht — nicht der Boden. */
export const UNIVERSE_MAP_NODE_HIT_MIN = 26
export const UNIVERSE_MAP_NODE_HIT_BODY_K = 3.2
/** Ab dieser Knotenzahl faellt die roemische Ziffer unter jedem Knoten weg und
 *  steht nur noch an Auswahl, Hover und den Toren. */
export const UNIVERSE_MAP_LABEL_MAX_NODES = 22
/* Ein Knoten ist ein KOERPER DESSELBEN FELDES, kein Zeichen darauf. Er wird
   deshalb gemalt wie die Galaxien der Wolke — eine geneigte Ellipse — nur
   groesser, heller und mit einem Kern. Der leuchtende Punkt mit 2,6-fachem
   runden Halo, der einmal hier stand, las sich daneben als Aufkleber. */

/** Grosse Halbachse als Vielfaches des Knotenradius. */
export const UNIVERSE_MAP_NODE_BODY_RX = 1.15
/** Achsverhaeltnis, je Galaxie aus `jitter()` gezogen. Nie rund und nie flach:
 *  eine Kreisscheibe waere wieder der Punkt, unter 0,4 ein Strich. */
export const UNIVERSE_MAP_NODE_BODY_RATIO_MIN = 0.42
export const UNIVERSE_MAP_NODE_BODY_RATIO_MAX = 0.78
/** Der Schein um den Koerper — ELLIPTISCH und in seiner Neigung, sonst ueberrundet
 *  er die Form, die er umgeben soll. Vielfaches des Knotenradius. */
export const UNIVERSE_MAP_NODE_HALO_SPAN = 2.4
export const UNIVERSE_MAP_NODE_HALO_ALPHA = 0.34
/** Der helle Kern, als Anteil des Knotenradius. Ohne ihn ist die Marke bei zwoelf
 *  Pixeln ein Fleck. */
export const UNIVERSE_MAP_NODE_CORE_R = 0.34

/** Der Sternstand ist EIN Bogen, kein Punktkranz: gold, was gerettet wurde, rot
 *  anschliessend, was verloren ging, der Rest bleibt LEER.
 *
 *  Sieben Pips je Knoten waren bei vierzig Knoten 280 Marken. Ein voll befreiter
 *  Knoten traegt so einen geschlossenen Goldring — und genau der ist die Marke,
 *  die ihn vom Feld abhebt. Eine blasse Restspur gaebe jedem Knoten wieder eine
 *  geschlossene Kontur, also genau das, was verschwinden soll. */
/** Eng am Koerper, fein und gedaempft — sonst ist die Marke eine MEDAILLE.
 *
 *  Gemessen bei 1,95 · 1,9 px · voller Deckkraft: ein satter Goldreif mit
 *  sichtbarer Luecke zum Koerper, sechsundzwanzigmal auf der Karte. Das las sich
 *  als Rahmen um eine Kachel — dieselbe Falle, in die schon der Glutring der
 *  Wolke lief. Dicht am Koerper und fein ist es ein Ring UM eine Galaxie. */
export const UNIVERSE_MAP_STAR_ARC_ORBIT = 1.6
export const UNIVERSE_MAP_STAR_ARC_W = 1.25
export const UNIVERSE_MAP_STAR_ARC_ALPHA = 0.62
/** Verlorenes steht hoeher: es ist selten, und man soll es sehen. */
export const UNIVERSE_MAP_STAR_ARC_LOST_ALPHA = 0.9
/** Landfall-Rauten auf diesem Vielfachen, im Bogen unter dem Koerper. */
export const UNIVERSE_MAP_LANDFALL_ORBIT = 2.5
export const UNIVERSE_MAP_LANDFALL_R = 2.1
/** Mehr Orte als das zeigt kein Knoten — darueber sagt die Hover-Karte die Zahl. */
export const UNIVERSE_MAP_LANDFALL_MAX_MARKS = 4

// ── Die Portraitreihe der Knotenkarte ───────────────────────────────────────
/** Eine volle Galaxie steht in EINER Zeile — mehr Sterne gibt es nicht. */
export const UNIVERSE_MAP_TIP_SEAT_COLS = GALAXY_STARS_MAX
/** Portraitkante in `em` gegen `--tip-u`: 28,5 px auf Full HD, 37,8 px ab 2K.
 *  Damit im Band 35-110 und auf derselben Kunststufe wie das Sternmanifest im
 *  Voyages-Atlas (`STAR_MANIFEST_ART_SIZE`) — ein Cache-Treffer statt eines
 *  zweiten Downloads derselben Gesichter. */
export const UNIVERSE_MAP_TIP_SEAT_EM = 2.36
export const UNIVERSE_MAP_TIP_SEAT_GAP_EM = 0.33
/** Zwei volle Zeilen; darueber sagt die Karte die Zahl, wie bei den Rauten. */
export const UNIVERSE_MAP_TIP_SEAT_MAX = 2 * UNIVERSE_MAP_TIP_SEAT_COLS

// ── Der Startpunkt ──────────────────────────────────────────────────────────
/* Die Bahn setzt in der Mitte an — `paintRoad` zieht ihre erste Linie von
   `box.cx/cy` zum ersten Knoten. Der Punkt trug bisher keine Benennung, und ein
   heller Fleck mit einer Linie daran sagt niemandem, dass dort die Strasse
   beginnt.

   Das Label haengt am DOM, nicht am Canvas: dieselbe Begruendung wie bei den
   roemischen Ziffern — ein Hover kostete sonst einen Repaint der ganzen Platte,
   und den Text gaebe es zweimal. Es liegt IN `.un-layer`, faehrt also mit und
   waechst mit dem Zoom; es beschriftet einen Ort auf der Karte, keine Stelle des
   Bildschirms.

   Unter der Mitte ist Platz, und zwar ERZWUNGEN: Platz 0 steht senkrecht nach
   oben, und `universeSpots` haelt das Feld darunter
   (`UNIVERSE_MAP_START_CLEAR_*`) von Knoten UND Sehnen frei.                     */

/** Abstand der Label-Oberkante unter der Mitte, als Anteil des Bahnradius.
 *  Der Halo des Kerns misst `2 · box.r · UNIVERSE_DISC_HERO_R_RATIO ·
 *  UNIVERSE_DISC_CLOUD_HALO_R` — auf Full HD 25 px; das Label steht bei 36 und
 *  laesst ihm Luft. */
export const UNIVERSE_MAP_START_LABEL_OFFSET = 0.115
/** Schriftgrad in Referenzpixeln, mit `k` skaliert, samt Boden und Deckel. Auf
 *  Zoomstufe 2,4 waeren es sonst 50 px — die Marke soll gross sein, nicht die
 *  Karte beherrschen. */
export const UNIVERSE_MAP_START_LABEL_PX = 20
export const UNIVERSE_MAP_START_LABEL_MIN_PX = 13
export const UNIVERSE_MAP_START_LABEL_MAX_PX = 34
/** Laenge der Haarlinie vom Kern zum Label, ebenfalls in Referenzpixeln. Sie
 *  bindet die Beschriftung an den Punkt, den sie meint. */
export const UNIVERSE_MAP_START_TICK_PX = 16

// ── Zoom und Fahrt ──────────────────────────────────────────────────────────
/** Drei Stufen statt stufenlosem Rad: jede Stufe ist EIN Repaint. */
export const UNIVERSE_MAP_ZOOM_STEPS = [1, 1.6, 2.4] as const
/** Deckel der Rasterflaeche, wie bei der Voyages-Karte. */
export const UNIVERSE_MAP_MAX_BACKING_PX = 2600
export const UNIVERSE_MAP_MAX_DPR = 2

// ── Der Sprung in die Galaxie — Kamerafahrt Universe ⇄ Voyages ─────────────
/** Hineinzoomen im Quellreiter, dann Setzen im Zielreiter. Zusammen 900 ms —
 *  dieselbe Spanne wie MINIMAP_DEPARTURE_TRANSITION_MS, gebunden in
 *  `universeDive.spec.ts`. */
export const UNIVERSE_MAP_DIVE_LEAVE_MS = 380
export const UNIVERSE_MAP_DIVE_ARRIVE_MS = 520
/** Endmassstab der fahrenden Universe-Ebene. Nicht hoeher: ab ~60 % Schleier
 *  ist die Platte unsichtbar, und 5x liesse Chrome die 2600-px-Platte fuer
 *  nichts neu rastern. */
export const UNIVERSE_MAP_DIVE_SCALE = 3.2
/** Massstab der Voyages-Platte: Start beim Ankommen, Ziel (1/x) beim Verlassen. */
export const UNIVERSE_MAP_DIVE_ARRIVE_SCALE = 1.28
/** Grundkante der Lichtscheibe; sie skaliert bis zur fernsten Ecke. */
export const UNIVERSE_MAP_DIVE_GLOW_PX = 240
export const UNIVERSE_MAP_DIVE_GLOW_ALPHA = 0.55
/** Startmassstab der Lichtscheibe — ein Funke am Knoten, kein Fleck. */
export const UNIVERSE_MAP_DIVE_GLOW_SEED = 0.15
/** Ueberschuss beim Weiterwachsen nach dem Durchgang. */
export const UNIVERSE_MAP_DIVE_GLOW_PAST = 1.3
export const UNIVERSE_MAP_DIVE_EASE_LEAVE = 'cubic-bezier(0.6, 0, 1, 0.5)'
export const UNIVERSE_MAP_DIVE_EASE_ARRIVE = 'cubic-bezier(0.16, 1, 0.3, 1)'

// ── Penumbra — der Raum jenseits der Scheibe ────────────────────────────────
/* Kein Sternfeld: ausserhalb des beobachteten Universums ist kein Universum.
   Der Grund sind STROEME in einer Richtung, hinter der Scheibe hindurch —
   `utils/fx/universePenumbra.ts`. Referenz-px skalieren mit
   `k = r / UNIVERSE_MAP_PLATE_REF_R`. */

/** FEST, nicht der `mapSeed`: dasselbe Universum zeigt immer denselben Raum. */
export const UNIVERSE_MAP_PENUMBRA_SEED = 7
/** Deckender Grund unter allem. */
export const UNIVERSE_MAP_PENUMBRA_GROUND = '#05050b'
/** Die Tinte ist der Ton der GEZEIGTEN Bahn, auf diese Luminanz normiert (die
 *  des frueheren Indigos). Roh hebt Eis `#a8e8f8` 219 je Alpha-Einheit statt 95
 *  — der Ton sagt WELCHES Universum, die Helligkeit bleibt die der Penumbra. */
export const UNIVERSE_MAP_PENUMBRA_INK_LUMA = 95
/** Zweite Stimme: der Ton um diesen Winkel gedreht, gleiche Luminanz. */
export const UNIVERSE_MAP_PENUMBRA_INK_HUE_SHIFT_DEG = 34
/** Anteil der Baender in der zweiten Stimme. */
export const UNIVERSE_MAP_PENUMBRA_WARM_SHARE = 0.3
/** BASIS der Richtung in Bildschirmgrad (y nach unten), Universum I; jedes
 *  weitere schreitet um den goldenen Winkel (`penumbraFlowDeg`). */
export const UNIVERSE_MAP_PENUMBRA_FLOW_DEG = -28
/** Wellen des Feldes: [Wellenlaenge als Anteil von min(w,h), Amplitude relativ
 *  zur Hauptgeschwindigkeit, Normalenwinkel zur Stroemung in Grad].
 *  Die Summe der Amplituden muss unter 1 bleiben — sonst kann ein Band kehrt
 *  machen, und die Richtungs-Spec faellt. */
export const UNIVERSE_MAP_PENUMBRA_WAVES = [
  [0.9, 0.38, 62],
  [0.55, 0.22, -47],
  [0.33, 0.12, 101],
] as const
/** Saatabstand quer zur Stroemung, Referenz-px; die Zahl der Baender folgt
 *  daraus und bleibt ueber alle Aufloesungen bei 9–10. Bei 190 standen auf
 *  Full HD nur drei, vier Baender im Bild. */
export const UNIVERSE_MAP_PENUMBRA_BAND_GAP = 150
export const UNIVERSE_MAP_PENUMBRA_BANDS_MIN = 5
export const UNIVERSE_MAP_PENUMBRA_BANDS_MAX = 10
/** Streuung der Saat als Anteil eines Abstands. Nicht hoeher: zwei Baender
 *  uebereinander verdoppeln die Tinte. */
export const UNIVERSE_MAP_PENUMBRA_SEED_JITTER = 0.6
/** Kernbreite eines Bands, Referenz-px. */
export const UNIVERSE_MAP_PENUMBRA_BAND_W_MIN = 28
export const UNIVERSE_MAP_PENUMBRA_BAND_W_MAX = 70
/** Kern-Deckkraft. `_MAX` ist die harte Decke JEDES Strichs: die Portalschrift
 *  steht auf dem Grund. Tinte mit Luminanz 95 hebt 0,10 mal Zugstapel 1,65
 *  = +15 im Kern, ~+6 am Saum. */
export const UNIVERSE_MAP_PENUMBRA_ALPHA_MIN = 0.05
export const UNIVERSE_MAP_PENUMBRA_ALPHA_MAX = 0.1
/** Drei Zuege je Band [Breite×, Alpha×], AUSSEN zuerst — Weichheit ohne
 *  `ctx.filter`. */
export const UNIVERSE_MAP_PENUMBRA_BLUR_PASSES = [
  [2.8, 0.2],
  [1.8, 0.45],
  [1, 1],
] as const
/** Euler-Schritt der Stromlinie, Referenz-px. */
export const UNIVERSE_MAP_PENUMBRA_STEP = 18
/** Ueberstand je Kante als Anteil von min(w,h): Baender beginnen und enden
 *  ausserhalb der Buehne. */
export const UNIVERSE_MAP_PENUMBRA_OVERSCAN = 0.25
/** Schritte je Richtung — Kostendeckel. */
export const UNIVERSE_MAP_PENUMBRA_MAX_STEPS = 400
/** Auslauf zur Platte: von `_DAMP_IN` (dieselbe Kante wie
 *  `UNIVERSE_MAP_PORTAL_DISC_CLEAR`) bis `_DAMP_OUT` laeuft ein Schatten mit
 *  `_DISC_DAMP` auf null aus. MILD: die Portalringe stehen am Buehnenrand,
 *  ein starker Teich leerte die Lobe, ohne die Schrift zu schuetzen. */
export const UNIVERSE_MAP_PENUMBRA_DAMP_IN = UNIVERSE_MAP_PLATE_SPRITE_MARGIN
export const UNIVERSE_MAP_PENUMBRA_DAMP_OUT = 1.35
export const UNIVERSE_MAP_PENUMBRA_DISC_DAMP = 0.45
/** Motes: Koerper auf den Baendern, nie rund, nur jenseits `_DAMP_OUT`. */
export const UNIVERSE_MAP_PENUMBRA_MOTES_PER_BAND = 2
export const UNIVERSE_MAP_PENUMBRA_MOTES_MAX = 20
export const UNIVERSE_MAP_PENUMBRA_MOTE_RX = 3.4
export const UNIVERSE_MAP_PENUMBRA_MOTE_RATIO_MIN = 0.28
export const UNIVERSE_MAP_PENUMBRA_MOTE_RATIO_MAX = 0.5
export const UNIVERSE_MAP_PENUMBRA_MOTE_ALPHA = 0.22
/** Motes im Ton, aber heller als die Baender. */
export const UNIVERSE_MAP_PENUMBRA_MOTE_LUMA = 190
// ── Farben ──────────────────────────────────────────────────────────────────
/** Befreit — dieselbe Goldkante, die die Reise im ganzen Spiel traegt. */
export const UNIVERSE_MAP_FREED_COLOR = '#e8c040'
/** Hier steht der Bard. */
export const UNIVERSE_MAP_HERE_COLOR = '#9fe062'
/** Noch nicht betreten. */
export const UNIVERSE_MAP_UNLIT_COLOR = '#8a7a52'
/** Ein Ort auf einer Reiseetappe. */
export const UNIVERSE_MAP_LANDFALL_COLOR = '#68c0a8'
/** Ein Universumstor auf der Bahn. */
export const UNIVERSE_MAP_GATE_COLOR = '#7ab8f0'
/** Ein verlorener Stern. */
export const UNIVERSE_MAP_LOST_COLOR = '#cc6050'

// ── Universumsscheibe ───────────────────────────────────────────────────────
/* Ein Universum ist im Universe eine SCHEIBE, kein Glyph: Kern in der Mitte,
   Galaxienfeld darum, gluehender Wall am Rand. Gerastert wird sie einmal je
   (Universum, Zustand, Groesse, dpr) — `utils/fx/universeDisc.ts`. */

/** Die BASIS der Wurzelregel — 34 px, 60 s, 1,78 px/s am Rand. GEMESSEN, nicht
 *  gewaehlt: jede andere Scheibengroesse leitet daraus ab (`universeDiscSpinSec`,
 *  `universeDiscDetail`). Sie ist deshalb von der Anzeigegroesse der Leiste
 *  GETRENNT — waechst die Leiste, duerfen die Drehdauern aller Scheiben im Spiel
 *  nicht mitwandern. */
export const UNIVERSE_DISC_SPIN_BASE_PX = 34
/** Kachel in der Universumsleiste. Sie treibt die Kartenhoehe, und die bindet
 *  `universeLayout.spec.ts` nicht mehr an „alle zehn passen", sondern an
 *  `UNIVERSE_RAIL_MIN_VISIBLE` — die Leiste rollt. */
export const UNIVERSE_DISC_RAIL_PX = 56
/** Dieselbe Kachel im FLACHEN Fenster. Das Canvas wird per CSS herunterskaliert
 *  — es traegt seine volle Aufloesung und bleibt scharf. */
export const UNIVERSE_DISC_RAIL_COMPACT_PX = 44
/** Wappen im Kopfband — dieselbe Scheibe, nur gross. */
export const UNIVERSE_DISC_CREST_PX = 64
export const UNIVERSE_DISC_MAX_DPR = 2
export const UNIVERSE_DISC_CACHE_MAX = 48
/** Galaxien im Feld. Bei 34 px ist darueber kein Fleck mehr zu trennen. */
export const UNIVERSE_DISC_GALAXIES = 18
/** Boegen des Walls. Die grosse Platte webt statt zu streichen
 *  (`UNIVERSE_MAP_WEB_NODES`); hier waere ein Geflecht bei 34 px ein grauer Ring. */
export const UNIVERSE_DISC_RIM_ARCS = 64
/** Anteile des Radius: wo der Wall beginnt und endet. Eng am Rand — mit 0,80
 *  lag ein drei Pixel breites Band aus Boegen um die Scheibe und las sich als
 *  Zackenkranz, nicht als Geflecht. */
export const UNIVERSE_DISC_RIM_INNER = 0.87
export const UNIVERSE_DISC_RIM_OUTER = 0.99
/** Strichstaerke der Boegen als Anteil des Radius. Bewusst unter einem Pixel:
 *  ein Netz ist fein, und was darueber liegt, wird zur Umrandung. */
export const UNIVERSE_DISC_RIM_W_MIN = 0.018
export const UNIVERSE_DISC_RIM_W_MAX = 0.042
/** Reichweite des Staubschleiers und Radius des Kerns. */
export const UNIVERSE_DISC_DUST_R = 0.72
export const UNIVERSE_DISC_CORE_R = 0.09
/** Der goldene Winkel — die Vogel-Spirale, nach der Sonnenblumenkerne sitzen.
 *
 *  Er ist die EINZIGE Anordnung, die auf einer Scheibe weder Luecken noch
 *  Speichen erzeugt. Davor kam der Winkel aus einer Hash-Folge und klumpte
 *  sichtbar, und der Radius aus `t^0,6` — der zog 32 % der Koerper in den halben
 *  Radius statt der 25 %, die flaechengleich waeren. Beides zusammen war die
 *  gemeldete Ballung. Als ABLEITUNG, nicht als Dezimalzahl. */
export const UNIVERSE_DISC_GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5))

// ── Die Wolke: die grosse Scheibe in der Mitte der Buehne ───────────────────
/* Sie hat KEINEN Glutring und KEINE Kante. Der Ring ist braun-orange wie der
   aeussere Karten-Wall — zwei konzentrische Ringe derselben Farbe lasen sich als
   Rahmen um eine Kachel statt als Blick in den Raum. Die Parallaxe, die er trug,
   wandert dafuer in die TIEFE des Feldes: nahe Koerper ueber fernen. */

/** Wie weit die Koerper reichen. UNTER 1: sie muessen im Inkreis des
 *  quadratischen Sprites liegen, sonst wanderte beim Drehen eine Ecke ins Bild. */
export const UNIVERSE_DISC_CLOUD_REACH = 0.92
/** Ab hier loesen sie sich auf. Das ist es, was „randlos" herstellt — nicht das
 *  Fehlen einer Kante, sondern eine Dichte, die vorher endet.
 *
 *  NICHT frueher: bei 0,55 war die aeussere Haelfte der Wolke aufgezehrt und sie
 *  las sich wieder als Fleck in der Mitte — gemessen fiel die Helligkeit schon
 *  auf halbem Radius unter ein Drittel. Der Auslauf soll den RAND nehmen, nicht
 *  das Feld. */
export const UNIVERSE_DISC_CLOUD_FADE_FROM = 0.7
/** Anteil der NAHEN Schicht. Wenige grosse vor vielen kleinen. */
export const UNIVERSE_DISC_CLOUD_NEAR_SHARE = 0.35
/** Nah ist groesser, fern kleiner — beide ueber den vollen Radius. Nah/fern ist
 *  eine Tiefen-, keine Radiusfrage. */
export const UNIVERSE_DISC_CLOUD_NEAR_SCALE = 1.35
export const UNIVERSE_DISC_CLOUD_FAR_SCALE = 0.7
/** Deckkraft der fernen Schicht gegen die nahe. */
export const UNIVERSE_DISC_CLOUD_FAR_ALPHA = 0.62

/** Kern und Halo der Wolke — ABSOLUT, nicht als Anteil des Radius.
 *
 *  Er markiert „du bist hier" und ist der Nachfolger des entfallenen
 *  `paintOrigin`. Mit `UNIVERSE_DISC_CORE_R` (0,09) mitgewachsen waere er auf
 *  Full HD ein 28-px-Punkt mit 93-px-Halo und auf 4K 71 und 237 — eine Sonne,
 *  die ein Sechstel der Buehne deckt. Die Zahlen reproduzieren den alten
 *  Ursprung: er malte `26 k` Halo und `4,2 k` Punkt bei `k = box.r / 300`, und
 *  die Wolke misst rund `2 box.r`. */
export const UNIVERSE_DISC_CLOUD_CORE_R = 0.0071
export const UNIVERSE_DISC_CLOUD_HALO_R = 0.044
/** Die Wolke traegt DREIMAL so viele Koerper wie die Kachel — und entsprechend
 *  kleinere, die Bedeckung bleibt bei 3,3 %.
 *
 *  Die Grunddichte gilt fuer eine 34-px-Kachel. Ueber die ganze Kartenscheibe
 *  gezogen ergab sie 328 Marken zu 2,3 bis 5,4 px: das las sich als Konfetti,
 *  nicht als Galaxienfeld. Mit dem Faktor sind es 985 zu 1,3 bis 3,1 px. */
export const UNIVERSE_DISC_CLOUD_DENSITY = 3
/** Deckel der Koerperzahl. Auf 4K waeren es sonst 2500 Ellipsen in EINEM
 *  Sprite-Bau — im teuersten Frame des Reiters. */
export const UNIVERSE_DISC_CLOUD_MAX_BODIES = 2000
/** Der Staub der Wolke liegt ueber der ganzen Buehne. Mit den 0,34 der Kachel
 *  toente er alles gruen und schluckte die Knotenfarben — er soll Tiefe geben,
 *  nicht faerben. */
export const UNIVERSE_DISC_CLOUD_DUST_ALPHA = 0.16

/**
 * Die KARTE der Leiste: Kopf (Scheibe, Name, Zustand), Ablesungszeile, Balken.
 *
 * Die SCHEIBE treibt den Kopf, nicht der Text — dafuer tragen Namenszeile,
 * Notiz und Ablesung feste Zeilenkaesten. Die Hoehe ist deshalb GERECHNET:
 * `universeLayout.spec.ts` zaehlt mit genau dieser Summe, wie viele Karten ohne
 * Rollen dastehen. Vorher hing sie an der Schriftmetrik von MedievalSharp, war
 * gemessen 53,5 statt der gerechneten 48, und die Liste rollte, waehrend die
 * Konstante das Gegenteil behauptete.
 */
export const UNIVERSE_RAIL_CARD_BORDER = 1
export const UNIVERSE_RAIL_CARD_PAD_T = 5
/** Traegt den Fortschrittsbalken: der liegt absolut auf der Unterkante und
 *  kostet keine Layout-Hoehe. Im Fluss laege die Karte bei 102. */
export const UNIVERSE_RAIL_CARD_PAD_B = 6
/** 3 px Zustandskanal der Sprache plus 6 px Luft. */
export const UNIVERSE_RAIL_CARD_PAD_L = 9
/** 4 px Toenungsstreifen plus 4 px Luft. */
export const UNIVERSE_RAIL_CARD_PAD_R = 8
export const UNIVERSE_RAIL_CARD_GAP_Y = 3
/** Fester Kasten der Ablesungszeile: `0.87em` bei `--sr-u` 17 sind 14,8 px. */
export const UNIVERSE_RAIL_READ_H = 20
export const UNIVERSE_RAIL_BAR_H = 4
export const UNIVERSE_RAIL_TINT_BAR_W = 4

export const UNIVERSE_RAIL_ROW_H =
  2 * UNIVERSE_RAIL_CARD_BORDER +
  UNIVERSE_RAIL_CARD_PAD_T +
  UNIVERSE_DISC_RAIL_PX +
  UNIVERSE_RAIL_CARD_GAP_Y +
  UNIVERSE_RAIL_READ_H +
  UNIVERSE_RAIL_CARD_PAD_B

/** Wie hoch eine Karte auf einem hohen Schirm werden darf. Sie waechst per
 *  `flex-grow` in den freien Rest; darueber ist der Zuwachs nur noch Luft — die
 *  Scheibe waechst nicht mit. */
export const UNIVERSE_RAIL_CARD_MAX_H = 132

/** Der BODEN: so viele Karten stehen auf Full HD im Vollbild ohne Rollen da.
 *  Zehn passen dort nicht mehr, seit die Zeile eine Karte ist — das ist die
 *  Entscheidung, nicht ein Versehen. */
export const UNIVERSE_RAIL_MIN_VISIBLE = 6

/** Nenner des Fortschrittsbalkens: die tiefste Bahn, nie unter zehn Galaxien —
 *  sonst malte ein frischer Spielstand seine erste Bahn voll aus. Ein
 *  universumseigenes Maximum gibt es nicht: ein Lauf endet an einer
 *  Chimes-Schwelle, nicht bei einer Galaxienzahl. */
export const UNIVERSE_RAIL_PROGRESS_FLOOR = 10

/** Die laufende Bahn hat keine abgeschlossene Dauer, ein aus dem Archiv
 *  geschobener Lauf keine ueberlieferte — und das ist nicht dasselbe wie null. */
export const UNIVERSE_RAIL_ELAPSED_NOW = 'now'
export const UNIVERSE_RAIL_UNKNOWN = '—'

/** Listenpolsterung der Leiste (8 oben, 12 unten) — sie ist alles, was neben
 *  den Karten noch Hoehe kostet: Kopfzeile und Carry-over-Fuss sind gefallen. */
export const UNIVERSE_RAIL_LIST_PAD = 20
export const UNIVERSE_RAIL_ROW_GAP = 5

/**
 * Die KOMPAKTE Stufe — Hoehen-Media-Query, kein vh-Rechnen.
 *
 * Die Layout-Specs rechnen mit „Viewport == Bildschirmhoehe"; real nimmt der
 * Browser rund 130 px. GEMESSEN bleiben dem Reiter auf Full HD im Vollbild
 * 670,6 px, im Fenster nur 549,1.
 *
 * Ihr alter Grund ist gefallen: sie sorgte dafuer, dass zehn ZEILEN ins flachste
 * Fenster passten, und zehn KARTEN passen nirgends mehr. Was bleibt, ist der
 * bessere Grund — sie kauft dort Karten zurueck (6 statt 5) und haelt damit
 * genau den Boden, den die grosse Stufe dort verliert.
 *
 * Die Schwelle ist keine runde Zahl, sondern der Punkt, an dem der BODEN faellt:
 * gerechnet 1002, siehe `universeLayout.spec.ts`.
 */
export const UNIVERSE_RAIL_COMPACT_MAX_VH = 1076
export const UNIVERSE_RAIL_CARD_PAD_T_COMPACT = 4
export const UNIVERSE_RAIL_CARD_PAD_B_COMPACT = 5
export const UNIVERSE_RAIL_CARD_GAP_Y_COMPACT = 3
/** `0.87em` bei `--sr-u` 13 sind 11,3 px. */
export const UNIVERSE_RAIL_READ_H_COMPACT = 16
export const UNIVERSE_RAIL_ROW_H_COMPACT =
  2 * UNIVERSE_RAIL_CARD_BORDER +
  UNIVERSE_RAIL_CARD_PAD_T_COMPACT +
  UNIVERSE_DISC_RAIL_COMPACT_PX +
  UNIVERSE_RAIL_CARD_GAP_Y_COMPACT +
  UNIVERSE_RAIL_READ_H_COMPACT +
  UNIVERSE_RAIL_CARD_PAD_B_COMPACT
export const UNIVERSE_RAIL_LIST_PAD_COMPACT = 16
export const UNIVERSE_RAIL_ROW_GAP_COMPACT = 3
/** Was dem Reiter im flachsten Referenzfall bleibt — GEMESSEN (Full HD, 950 px
 *  Viewport), wie `CONTENT_HEIGHT` in der Spec.
 *
 *  Es waren 569,1, solange das Kopfband 92 px mass; jede Bandhoehe darueber geht
 *  hier eins zu eins ab. Die kompakte Stufe brauchte davor 556 und passte damit
 *  nicht mehr — Polsterung und Zeilenabstand haben die Differenz bezahlt (auf
 *  543), nicht die Scheibe: sie traegt die Zeile. Bei 112 bleiben 6,1 px Luft,
 *  die kompakte Stufe musste dafuer nichts weiter abgeben. */
export const UNIVERSE_RAIL_COMPACT_STAGE_H = 549.1

// ── Drehung der Scheibe ─────────────────────────────────────────────────────
/* Feld und Wall drehen GLEICHSINNIG, der Wall mit halbem Tempo. Das Verhaeltnis
   ist die ganze Wirkung: gleich schnell liest sich die Scheibe als Rad, das sich
   dreht — verschieden schnell als Raum mit Tiefe.

   Gedreht wird das FERTIGE Sprite per CSS `rotate()` am Compositor, nicht neu
   gemalt: `paintCount` bleibt bei null, es gibt keine Frame-Schleife. Der
   ❌-Eintrag gegen die driftende Drehung gilt der KARTE und ihrem Neuzeichnen. */

/** Ein Umlauf des Galaxienfeldes.
 *
 *  NICHT die Rate des Entwurfs (0,012 rad/s, also 524 s): der dreht eine Karte
 *  mit Radius 286, hier eine Scheibe mit Radius 17 — dieselbe Winkelrate ergaebe
 *  am Rand 0,17 px/s.
 *
 *  Und NICHT die 210 s, die einmal hier standen. Sie kamen aus einer geschaetzten
 *  Wahrnehmungsschwelle von 0,5 px/s; die war zu niedrig, und der Nutzer meldete
 *  die Scheibe als stillstehend. GEMESSEN gilt: 0,5 px/s sieht niemand, 1,8 px/s
 *  schon — 60 s ergeben 18° in drei Sekunden Hinsehen. Wer die Dauer wieder
 *  hochzieht, macht denselben Fehler; `universeLayout.spec.ts` haelt dagegen. */
export const UNIVERSE_DISC_SPIN_SEC = 60
/** Der Wall braucht das Doppelte. Aus dem Entwurf uebernommen (`drift * 0.5`).
 *
 *  Das Verhaeltnis erzeugt PARALLAXE zwischen zwei bewegten Ebenen. Steht das
 *  Feld still (unbetretene Scheibe), gibt es keine zu wahren — dann traegt der
 *  Wall die volle Rate, sonst waere die einzige sichtbare Bewegung halbiert. */
export const UNIVERSE_DISC_RIM_SPIN_RATIO = 2

/** Die Basis der Wurzelregel: `UNIVERSE_DISC_SPIN_SEC` gilt bei
 *  `UNIVERSE_DISC_SPIN_BASE_PX`, jede andere Groesse leitet daraus ab
 *  (`universeDiscSpinSec`). Eine feste Dauer fuer alle machte die grosse Scheibe
 *  zum Kreisel (9,4 px/s bei 180 px) und eine feste Randrate die kleine zum
 *  Stillstand (3,4 Grad in drei Sekunden). */

// ── Die Heldenscheibe in der Mitte der Buehne ───────────────────────────────
/* Das beobachtete Universum, gross. Sie ist dieselbe `UniverseDisc` wie in der
   Leiste — kein zweites Zeichenrezept, nur eine andere Kantenlaenge. */

/** Anteil des Bahnradius.
 *
 *  0,98 — die Wolke IST die Kartenscheibe, nicht ein Koerper darauf. Zusammen
 *  mit `_CLOUD_REACH` enden die Galaxien bei 0,90 r, also genau dort, wo der
 *  Wall beginnt.
 *
 *  Sie stand einmal auf 0,286 (180 px auf Full HD). Das war als Herzstueck
 *  gedacht und las sich als handtellergrosser Fleck in der Mitte, waehrend die
 *  Flaeche, auf der die Bahn liegt, leer blieb. Die Bahn soll IM Universum
 *  liegen, nicht daneben. */
export const UNIVERSE_DISC_HERO_R_RATIO = 0.98
export const UNIVERSE_DISC_HERO_MIN_PX = 140
/** Deckel der Rasterflaeche — NICHT der Kantenlaenge.
 *
 *  Ein Deckel auf `px` machte die Wolke auf grossen Buehnen wieder zum Fleck.
 *  Gedeckelt gehoert der Speicher: auf 4K verlangt sie bei dpr 2 ein
 *  3160er Backing, also 76 MB fuer zwei Ebenen. Bei Full HD und 2K greift er
 *  nicht — dort steht dpr 2. Dieselbe Mechanik wie `UNIVERSE_MAP_WALL_MAX_BACKING_PX`. */
export const UNIVERSE_DISC_CLOUD_MAX_BACKING_PX = 2048
/** Stufung der Kantenlaenge. `px` steht im Cache-Schluessel — stufenlos an
 *  `box.r` gehaengt riebe jeder Resize-Frame ein neues Sprite. Dieselbe
 *  Ueberlegung wie `ORBIT_SCALE_QUANTIZE_STEPS`. */
export const UNIVERSE_DISC_HERO_QUANT_PX = 20
/** Deckkraft der Heldenscheibe. Die drei innersten Knoten liegen auf ihr, der
 *  dritte auf Anteil 0,94 — also im warmen Glutring. Gedaempft wird die ganze
 *  Ebene, NICHT per Vignette im Sprite: die muesste aussen daempfen und traefe
 *  den Wall, der die Drehung ueberhaupt sichtbar macht. */
export const UNIVERSE_DISC_HERO_OPACITY = 0.85

// ── Der Wall der Karte ──────────────────────────────────────────────────────
/** Er dreht GEGEN die Heldenscheibe. Er ist nicht der Wall einer Scheibe (dort
 *  gilt weiter gleichsinnig, halbes Tempo), sondern die Grenze des Bekannten um
 *  die ganze Bahn — gleichsinnig verschmolze er mit ihr optisch zu einem Rad. */
export const UNIVERSE_MAP_RIM_SPIN_REVERSE = true
/** Zuschlag der Sprite-Kante ueber `box.r` hinaus: der aeusserste Bogen reicht
 *  bis 1,02 r, dazu die halbe Strichstaerke. */
export const UNIVERSE_MAP_RIM_SPRITE_MARGIN = 1.06
/* -- Das Filamentgewebe ------------------------------------------------------
   Der Wall ist ein NETZ, kein Bogenkranz: Knoten, die Straenge tragen, und
   Ranken, die nach innen ausfransen. Vorher lagen 190 einzelne Boegen in einem
   Band von 0,90 bis 0,99 r — jeder fuer sich, keine Kreuzung, zwei harte
   Kanten. Das las sich als Zackenkranz um eine Kachel.                        */

/** Kreuzungen je Schale. Sie tragen ALLES weitere — Straenge, Ranken und
 *  Lichtpunkte haengen an ihnen, die Strichzahl ist ein Vielfaches davon.
 *  FEST, nicht mit dem Radius wachsend: die Strichstaerke skaliert mit `k`, die
 *  Zahl bleibt, sonst kostete ein Zoomschritt auf 4K das Dreifache. */
export const UNIVERSE_MAP_WEB_NODES = 120
/** SCHALEN, und das ist der Kern des Rezepts.
 *
 *  Eine einzige Knotenreihe ergibt keine Masche, sondern eine Zickzacklinie:
 *  jeder Knoten hat genau zwei Nachbarn, es gibt keine Zelle. Erst mehrere
 *  ineinandergreifende Schalen, tangential UND radial verbunden, schliessen
 *  Zellen — und Zellen sind das, was ein kosmisches Netz ausmacht. Drei sind
 *  das Minimum: bei zweien ist die Masche eine Leiter. */
export const UNIVERSE_MAP_WEB_RINGS = 3
/** Wo die Schalen im Band sitzen und wie weit ihr Radius streut. Die Streuung
 *  ist etwas kleiner als ihr Abstand — so greifen sie ineinander, ohne dass
 *  eine als Kreis lesbar wird. */
export const UNIVERSE_MAP_WEB_SHELL_LO = 0.88
export const UNIVERSE_MAP_WEB_SHELL_HI = 0.99
export const UNIVERSE_MAP_WEB_SHELL_JITTER = 0.4
/** Anteile des Radius: wo das Gewebe liegt.
 *
 *  Innen 0,84 — der Saum soll AUSFRANSEN, nicht an einer Kante enden. Die
 *  aeussersten Bahnknoten stehen bei 0,96 r und damit mitten darin; sie bleiben
 *  lesbar, weil die Karte darueber liegt und jeder Knoten seinen Schattenteich
 *  traegt.
 *
 *  Aussen 1,01 — HARTE Grenze: der aeusserste Strang plus halbe Strichstaerke
 *  muss innerhalb `UNIVERSE_MAP_RIM_SPRITE_MARGIN` liegen. Wer sie anhebt, muss die
 *  Margin mitziehen, sonst wandert beim Drehen eine abgeschnittene Kante durchs
 *  Bild — und das sieht man erst nach einer halben Umdrehung. */
export const UNIVERSE_MAP_WEB_INNER = 0.84
export const UNIVERSE_MAP_WEB_OUTER = 1.01
/** Anteil der Knoten, der eine ZWEITE radiale Verbindung zur naechsten Schale
 *  bekommt. Genau diese zweite Strebe schliesst aus einer Leiter ein Netz: sie
 *  macht aus je zwei Vierecken drei Zellen. */
export const UNIVERSE_MAP_WEB_LINK_SHARE = 0.7
/** Anteil der Knoten mit Ranke nach innen, ihre Gabelung und ihre Reichweite
 *  als Anteil des PLATZES bis zum Innenrand — nicht der Bandbreite: eine feste
 *  Laenge liefe bei der Haelfte in die Klemmung, und deren Spitzen laegen dann
 *  alle auf demselben Kreis. Die Ranken haengen an der INNERSTEN Schale und
 *  tragen den Saum: ohne sie endet das Gewebe an einer Linie. */
export const UNIVERSE_MAP_WEB_TENDRIL_SHARE = 0.42
export const UNIVERSE_MAP_WEB_TENDRIL_FORKS = 2
export const UNIVERSE_MAP_WEB_TENDRIL_REACH = 0.9
/** Strichstaerke in Referenzpixeln, mit `k` skaliert. Fein und nahezu gleich —
 *  die Tiefe traegt die HELLIGKEIT, nicht die Staerke; ein Netz aus dickeren
 *  Linien wird zur Umrandung. */
export const UNIVERSE_MAP_WEB_W_MIN = 0.4
export const UNIVERSE_MAP_WEB_W_MAX = 0.95
/** Deckkraft am Innen- und am Aussenrand. Das Gefaelle macht den Auslauf; eine
 *  Vignette darueber waere eine zweite Quelle fuer dieselbe Aussage. */
export const UNIVERSE_MAP_WEB_ALPHA_IN = 0.1
export const UNIVERSE_MAP_WEB_ALPHA_OUT = 0.55
/** Lichtpunkte an den Kreuzungen: Anteil der Knoten und ihr Radius in
 *  Referenzpixeln. Ohne sie ist ein Netz aus Haarlinien nur Griess. */
export const UNIVERSE_MAP_WEB_SPARK_SHARE = 0.22
export const UNIVERSE_MAP_WEB_SPARK_R = 1.1
/** Die Glut UNTER dem Gewebe. Sie steht im STANDBILD, nicht im drehenden
 *  Sprite: ein rotationssymmetrischer Verlauf traegt keine Drehung, und im
 *  Sprite muesste er bis an dessen Kante decken.
 *
 *  KLEIN, und das ist der Punkt: bei 0,14 fuellte sie das ganze Band und der
 *  Wall las sich als brauner Reifen, auf dem das Gewebe kaum noch auffiel. Die
 *  Vorlage ist dunkel — das LICHT kommt aus den Filamenten, nicht aus der
 *  Flaeche hinter ihnen. */
export const UNIVERSE_MAP_WEB_GLOW_ALPHA = 0.05
/** Deckel der Wall-Rasterflaeche. EIGEN, nicht `UNIVERSE_MAP_MAX_BACKING_PX`: die
 *  Ebene ist quadratisch und waechst mit dem Zoom, bei 2,4 auf 2K waeren es
 *  sonst 27 MB fuer ein Band aus Haarlinien. Bei Zoom 1 greift er auf keiner
 *  Zielaufloesung — dort steht dpr 2 und das Bild ist das von vorher. */
export const UNIVERSE_MAP_WALL_MAX_BACKING_PX = 2048
/** Dunkle Kontur unter der Bahn, in Referenzpixeln. Sie kreuzt jetzt das
 *  Galaxienfeld der Heldenscheibe; Gold bei Alpha 0,45 verschwand darauf. */
export const UNIVERSE_MAP_ROAD_CASING_W = 2.6
/** Schattenteich unter jedem Knoten, als Vielfaches seines Koerperradius. Ohne
 *  ihn schwimmt der Knoten im Galaxienfeld der Heldenscheibe — dieselbe Lehre
 *  wie `CORE_GATE_POOL_SPAN`: ein Loch in einem Leuchten ist kein Loch. */
export const UNIVERSE_MAP_NODE_POOL_SPAN = 3.4

// ── Das Abflugportal ────────────────────────────────────────────────────────
/* Der Ausgang eines Universums steht im SCHWARZEN Raum ausserhalb der
   Galaxienscheibe — an einer je Universum anderen Stelle, gross und
   angeschnitten. Er war einmal ein 22x18-px-Chip am Ende der Bahn, mitten in
   der Wolke: der groesste Uebergang, den ein Spielstand kennt, erzaehlt von
   einer Marke, die kleiner ist als eine Galaxie. */

/** Ringradius, am BUEHNENBILD gerechnet statt am schwarzen Seitenband. Das Band
 *  schwankt ueber die vier Zielaufloesungen um Faktor 4 (135 bis 542 px), die
 *  Hoehe nur um 2,4 — ein Portal, das dem Band folgt, waere auf WUXGA halb so
 *  gross wie auf Full HD bei derselben Bildschirmbreite. */
export const UNIVERSE_MAP_PORTAL_RING_H_RATIO = 0.19
export const UNIVERSE_MAP_PORTAL_RING_MIN_PX = 88
export const UNIVERSE_MAP_PORTAL_RING_MAX_PX = 260

/** Wie weit draussen der Ring fruehestens beginnt — an der SPRITE-KANTE der
 *  Platte gemessen, nicht an den Galaxienkoerpern.
 *
 *  Die Wolke endet zwar bei 0,907 r, aber darueber liegen noch das
 *  Filamentgewebe (1,0148), der DECKENDE dunkle Reifen (1,02 + 4/300 = 1,0333,
 *  Alpha 0,88) und der auslaufende Schattenteich (1,0727). Bei 0,9016 sass das
 *  Portal mitten darin und wurde zur Haelfte verdeckt.
 *
 *  Und es ist die einzige dieser Kanten, die schon eine Spec verriegelt:
 *  `universePlate.spec.ts` bindet, dass kein Zug sie verlaesst. */
export const UNIVERSE_MAP_PORTAL_DISC_CLEAR = UNIVERSE_MAP_PLATE_SPRITE_MARGIN

/** Findet sich fuer die volle Groesse keine Stelle, wird der Ring KLEINER statt
 *  das Portal zu verschwinden — ohne die Leiter faende die Winkelsuche in sieben
 *  von fuenfzig Faellen nichts mehr, und mit dem Portal waere die Weiterreise
 *  weg. Nachgemessen greift sie nur auf WUXGA (dem engen Fall): Full HD, 2K, 4K
 *  und der Buehnenboden behalten ueberall die volle Groesse. */
export const UNIVERSE_MAP_PORTAL_SHRINK_STEPS = [1, 0.86, 0.72, 0.58] as const

/** Kantenlaenge der Sprites als Vielfaches des Ringdurchmessers — DREI Werte,
 *  weil die drei Ebenen verschieden weit reichen. Das stehende Sprite muss den
 *  Schattenteich fassen (`_POOL_SPAN`), die drehende endet kurz hinter den
 *  Armen, und der Halo reicht am weitesten. Ein gemeinsamer Wert schnitte
 *  entweder den Teich ab oder draehte leere Flaeche mit. */
export const UNIVERSE_MAP_PORTAL_SPRITE_SPAN = 1.6
export const UNIVERSE_MAP_PORTAL_SWIRL_SPAN = 1.15
/** Die Fassung traegt den  des Rings: r + halbe Strichbreite +
 *  0,3 r Streuung sind 1,34 r. */
export const UNIVERSE_MAP_PORTAL_RIM_SPAN = 1.45
export const UNIVERSE_MAP_PORTAL_AURA_SPAN = 1.9

/** Die Ebenen des stehenden Sprites, als Anteil des Ringradius. Die Reihenfolge
 *  IST die Bedeutung — Schattenteich, Filamentgewebe, Schlund, das Feld des
 *  ZIELS darin, Ring, Photonenkante (siehe `portalSprite.ts`). */
export const UNIVERSE_MAP_PORTAL_POOL_SPAN = 1.5

/** Die FASSUNG des Portals: ein Filamentgewebe, wie es der aeussere Wall der
 *  Karte traegt (`paintUniverseWeb`). Sie liegt in DERSELBEN Ellipse wie der
 *  Schlund (`_RY`) — dieselbe Neigung macht aus Kranz und Portal EIN Objekt.
 *
 *  Zwei Fassungen davor, und beide Gruende gelten weiter:
 *
 *  Eine „zersprungene Krone" (zwei Bogensegmente bei 1,18 r, auf 0,55
 *  plattgedrueckt und gekippt) sollte kein Planetenring sein und war einer —
 *  angeschnitten am Bildrand blieb ein LOSES Stueck davon neben dem Portal
 *  stehen statt eines Rahmens darum.
 *
 *  Danach ein Astrolabium: 24 gleiche Zaehne, 8 Speichen, vier Rautenknoten auf
 *  den Achsen. Das ging ganz herum, las sich aber als KOMPASS — und was den
 *  Kompass macht, ist die GLEICHVERTEILUNG. Jedes Element mit N gleichen
 *  Teilungen und Marken auf den Achsen ist ein Zifferblatt, egal wie man es
 *  einfaerbt. Das Gewebe ist unregelmaessig by construction, und es ist die
 *  Materie, aus der in diesem Reiter der Rand des Bekannten besteht. */
export const UNIVERSE_MAP_PORTAL_WEB_IN = 1.08
export const UNIVERSE_MAP_PORTAL_WEB_OUT = 1.26
/** Drei Schalen wie am Wall. Zwei ergaeben eine Leiter statt Zellen. */
export const UNIVERSE_MAP_PORTAL_WEB_SHELLS = 3
/** Basiszahl der Knoten je Schale; aussen stehen mehr (`0,7 + 0,5 u`), sonst
 *  waeren die Zellen am Rand so breit wie das Band selbst. */
export const UNIVERSE_MAP_PORTAL_WEB_NODES = 34
/** Wie weit ein Knoten aus seiner Schale wandern darf, als Anteil des
 *  Schalenabstands. Ohne den Wurf laegen alle Knoten einer Schale auf einem
 *  Kreis — und der Kreis ist genau der Kompass. */
export const UNIVERSE_MAP_PORTAL_WEB_JITTER = 0.45
/** Anteil der Knoten, die eine zweite, schraege Strebe zur naechsten Schale
 *  bekommen. Sie macht aus je zwei Vierecken drei Zellen. */
export const UNIVERSE_MAP_PORTAL_WEB_LINK_SHARE = 0.7
/** Die Ranken an der innersten Schale, ein Stamm mit einer Gabelung: sie loesen
 *  die Innenkante auf, damit das Gewebe nicht an einer Linie endet. */
export const UNIVERSE_MAP_PORTAL_WEB_TENDRIL_SHARE = 0.34
export const UNIVERSE_MAP_PORTAL_WEB_TENDRIL_FORKS = 2
/** Lichtpunkte auf den Kreuzungen. Ohne sie ist ein Netz aus Haarlinien nur
 *  Griess — dieselbe Begruendung wie am Wall. */
export const UNIVERSE_MAP_PORTAL_WEB_SPARK_SHARE = 0.26
export const UNIVERSE_MAP_PORTAL_WEB_SPARK_R = 0.012
/** Deckkraft mit Gipfel in der BANDMITTE, an beiden Raendern auf null: so hat
 *  das Gewebe weder zum Ring hin noch nach aussen eine Kante. */
export const UNIVERSE_MAP_PORTAL_WEB_ALPHA = 0.42
export const UNIVERSE_MAP_PORTAL_WEB_W_MIN = 0.006
export const UNIVERSE_MAP_PORTAL_WEB_W_MAX = 0.014

/** Das BAND — das eine durchgehende Element, das ganz um das Portal herumgeht.
 *
 *  Es bleibt, weil das die Zusage war; es ist aber kein sauberer Kreis mehr.
 *  Ein perfekter duenner Kreis um einen dicken Ring ist wieder ein Instrument,
 *  also schwankt der Radius ueber zwei Harmonische und die Deckkraft ueber den
 *  Umlauf. Gezeichnet wird in Segmenten, damit die Deckkraft ueberhaupt wandern
 *  kann.
 *
 *  Es ist das KRAEFTIGSTE der feinen Elemente: bei 0,34 lag es im `shadowBlur`
 *  des Rings (0,3 r, reicht bis 1,3 r) und war im Bild nicht mehr da. */
export const UNIVERSE_MAP_PORTAL_BAND_R = 1.15
export const UNIVERSE_MAP_PORTAL_BAND_SEGMENTS = 72
export const UNIVERSE_MAP_PORTAL_BAND_WOBBLE = 0.022
export const UNIVERSE_MAP_PORTAL_BAND_ALPHA = 0.62
/** Halbachsenverhaeltnis des Schlunds. NICHT die 0,42 der kleinen Landmarke auf
 *  der Galaxiekarte: dort fliegt man hindurch, hier sieht man hinein. */
export const UNIVERSE_MAP_PORTAL_RY = 0.86
/** Der Schwellensaum, knapp INNEN am Ring — dort, wo das Licht des Ziels die
 *  Kante trifft. Bei einem halben Radius war er ein zweiter Ring in der Mitte
 *  und machte aus dem Durchgang eine Zielscheibe. */
export const UNIVERSE_MAP_PORTAL_PHOTON_R = 0.9
/** Das andere Universum IM Schlund — der Beleg, dass man hindurchsieht.
 *
 *  Es waren einmal vierzehn weisse Kreise; ein Punktfeld liest sich als
 *  Sternenhimmel, und das ist eine andere Groessenordnung als ein Universum.
 *  Gemalt wird jetzt `paintGalaxyField` in der `cloud`-Variante — dieselben
 *  Koerper wie auf der Kartenscheibe, nur klein und in die Schlund-Ellipse
 *  gestaucht. Die Wolke laeuft nach aussen auf null aus und braucht deshalb an
 *  der Schwelle keine Kante.
 *
 *  `_ZOOM` holt das Feld naeher heran: er staucht und vergroessert in EINEM
 *  Zug, denn `paintGalaxyField` leitet Zahl UND Groesse der Koerper aus der
 *  Kantenlaenge ab — ein kleineres Argument bei groesserem Canvas-Massstab
 *  ergibt weniger und groessere Marken bei gleicher Bedeckung.
 *
 *  Er stand einmal auf 1,25: gemessen waren das 304 Koerper zu 0,7 bis 3,0 px,
 *  und unter zwei Pixeln traegt keine Ellipse mehr ihre Neigung — im Bild war
 *  das wieder ein Punktfeld, nur mit kleineren Punkten. Bei 3 sind es 126 zu
 *  1,0 bis 4,6 px, und man sieht Galaxien. */
export const UNIVERSE_MAP_PORTAL_FIELD_R = 0.92
export const UNIVERSE_MAP_PORTAL_FIELD_ZOOM = 3
export const UNIVERSE_MAP_PORTAL_HALO_ALPHA = 0.42

/** Die drehende Ebene. Nur was seine Drehung ZEIGT gehoert hinein — die Motes
 *  machen sie ueberhaupt erst ablesbar.
 *
 *  Sie sind KOERPER, keine Punkte: dieselben geneigten Ellipsen wie im Feld
 *  dahinter, nur naeher. Damit tragen Schlund und Wirbel zusammen die Parallaxe
 *  der Wolke — nahe Galaxien wandern vor einem stehenden fernen Feld. */
export const UNIVERSE_MAP_PORTAL_ARMS = 5
export const UNIVERSE_MAP_PORTAL_ARM_IN = 0.3
export const UNIVERSE_MAP_PORTAL_ARM_OUT = 0.98
export const UNIVERSE_MAP_PORTAL_MOTES = 7
export const UNIVERSE_MAP_PORTAL_MOTE_R = 0.016

/** Teiler auf die Wurzelregel `universeDiscSpinSec`. Roh waeren es 166 s und
 *  4,9 px/s an der Armspitze — die Rate eines Galaxienfeldes. Ein Portal ist
 *  eine offene Maschine, kein Feld. Mit dem Teiler: 33 s und 25 px/s. */
export const UNIVERSE_MAP_PORTAL_SPIN_RATIO = 5
/** Der Halo atmet langsamer als eine Knotenmarke (2,4 s) — er ist zehnmal so
 *  gross. `_HALO_REST` ist die Ruhedeckkraft, damit `animation: none` unter
 *  Reduced Motion nicht auf einem Extremwert stehenbleibt. */
export const UNIVERSE_MAP_PORTAL_PULSE_SEC = 3.6
export const UNIVERSE_MAP_PORTAL_PULSE_MIN = 0.45
export const UNIVERSE_MAP_PORTAL_HALO_REST = 0.72

/* ── Der Hover: die Schwelle wacht auf ──────────────────────────────────
   Ruhend hielt beim Ueberfahren auch das Portal an — es war damit im Moment
   der Absicht toter als davor. Es haelt jetzt NUR bei Knoten-Hover mit an:
   die Pause gibt es, damit ein wandernder Knoten dem Zeiger nicht davonlaeuft,
   und das Portal steht fest. Bahn, Wolke und Wall halten weiter an. */

/** Teiler der ZWEITEN, additiven Drehung (`.un-portal-boost`) auf dieselbe
 *  Wurzelregel. Gemeinsam mit der Grunddrehung: 33 / (1 + 1,4) = 13,8 s.
 *
 *  Additiv, weil ein blosses Umstellen von `animation-duration` SPRINGT: Chrome
 *  rechnet den Fortschritt auf die neue Dauer um (bei 20 s Laufzeit 60 % → 43 %,
 *  rund 61 Grad), und die sieben Motes sind Landmarken, die das zeigen. Der Wall
 *  darf springen — ein Haarlinienfeld hat keine. Eine pausierte Animation friert
 *  ein und laeuft weiter, wo sie stand: in keiner Richtung ein Sprung. */
export const UNIVERSE_MAP_PORTAL_HOVER_BOOST_RATIO = 1.4

/** Die Tiefenstaffelung. Die BEDEUTUNG steckt in der Ordnung, nicht in den
 *  Betraegen: Fassung vor, Schlund zurueck, Wirbel hinein — man sieht tiefer in
 *  den Durchgang, statt dass er nur groesser wird. Der Versatz zwischen Ring und
 *  Schlundkante bleibt unter dem `shadowBlur` des Rings (0,3 r), sonst risse
 *  zwischen beiden eine Fuge auf. */
export const UNIVERSE_MAP_PORTAL_HOVER_HALO_K = 1.12
export const UNIVERSE_MAP_PORTAL_HOVER_RIM_K = 1.025
export const UNIVERSE_MAP_PORTAL_HOVER_MAW_K = 0.985
export const UNIVERSE_MAP_PORTAL_HOVER_SWIRL_K = 0.94
export const UNIVERSE_MAP_PORTAL_HOVER_MS = 260

/** Das SCHWELLENLICHT — ein hohler Verlauf im Ton des Ziels, Gipfel dicht am
 *  Ring, in derselben Ellipse wie der Schlund (`_RY`). Hohl ist keine
 *  Geschmacksfrage: eine gefuellte Mitte ist der Aufkleber auf dem Durchgang,
 *  gegen den schon der Punkt und die Ringscheitel gefallen sind.
 *
 *  Kein fuenftes Sprite — `portalSprite.spec.ts` verriegelt die Zugzahlen der
 *  vier Malfunktionen, und ein Verlauf braucht kein Canvas. Die Kante liegt
 *  zwischen Fassung (1,45) und Aura (1,9). */
export const UNIVERSE_MAP_PORTAL_BLOOM_SPAN = 1.72
export const UNIVERSE_MAP_PORTAL_BLOOM_ALPHA = 0.58
export const UNIVERSE_MAP_PORTAL_BLOOM_REST_K = 0.92

/** Die EINE Ringwelle als Quittung. Sie beginnt INNEN am Ring und laeuft nach
 *  aussen aus — eine Welle, die die Schwelle verlaesst, statt ein zweiter Ring
 *  zu sein (der bei halbem Radius machte aus dem Durchgang eine Zielscheibe).
 *
 *  Sie ist ein DOM-Element und hat deshalb KEINE Sprite-Kante: ihr Durchmesser
 *  IST der Ringdurchmesser, also lesen sich `_FROM` und `_TO` direkt als
 *  Ringradien. `_TO` bleibt unter `_AURA_SPAN` (1,9 — Spannen sind zugleich die
 *  Reichweite in r), damit die Welle innerhalb des Halos stirbt, statt als
 *  wachsender Reif ueber die Karte zu laufen. */
export const UNIVERSE_MAP_PORTAL_RIPPLE_FROM = 0.92
export const UNIVERSE_MAP_PORTAL_RIPPLE_TO = 1.55
export const UNIVERSE_MAP_PORTAL_RIPPLE_ALPHA = 0.65
export const UNIVERSE_MAP_PORTAL_RIPPLE_MS = 900

/** Die Suche nach der Stelle: 24 Winkel im 15-Grad-Raster. */
export const UNIVERSE_MAP_PORTAL_ANGLE_TRIES = 24
/** Angeschnitten ja, verschwunden nein. ZWEI Riegel, weil einer nicht traegt:
 *  die Ringmitte bleibt im Bild (an EINER Kante hoechstens ~46 % weg), UND der
 *  Flaechenanteil haelt — der zweite faengt die Ecklagen, wo zwei Kanten
 *  schneiden. */
export const UNIVERSE_MAP_PORTAL_EDGE_KEEP = 0.06
export const UNIVERSE_MAP_PORTAL_MIN_VISIBLE = 0.55
export const UNIVERSE_MAP_PORTAL_VIS_SAMPLES = 64

// ── Die DREI Angebotsportale ────────────────────────────────────────────────
/* Auf der LAUFENDEN Bahn steht kein Abflugportal (`buildDeparture` gibt dort
   `null`), sondern das Angebot des Aufbruchs: ein Portal je gezogener Karte,
   alle im schwarzen Raum jenseits der Kartenscheibe. Sie teilen sich denselben
   Raum, den sonst eines allein hat — und der ist schmaler, als er aussieht. */

/** Ringgroesse als Anteil der Einzelgroesse. GEMESSEN, nicht geschaetzt: der
 *  Algorithmus wurde ueber alle zehn Universen und sieben Buehnenmasse gefahren
 *  (die vier Zielaufloesungen, beide mit eingeklappter Leiste, und der
 *  Buehnenboden) und gezaehlt, in wie vielen Faellen die VOLLE Stufe traegt —
 *  die Schrumpfleiter also gar nicht erst greift:
 *
 *    0,86 → 10/10 ueberall   ·   0,92 → 10/10   ·   1,00 → WUXGA nur 4/10
 *
 *  Genommen ist 0,86 und nicht 0,92: die Kippstelle liegt zwischen 0,92 und
 *  1,00, und ein Wert unmittelbar davor haette keine Reserve fuer den Tag, an
 *  dem jemand das Kopfband oder die Rail-Zone anfasst. Bei 0,86 bleiben auf der
 *  engsten Buehne 2,46 Radiensummen zwischen zwei Portalen.
 *
 *  Der enge Fall ist WUXGA und nicht Full HD: gleiche Breite, 100 px mehr
 *  Hoehe, dadurch waechst die Scheibe und das schwarze Band schrumpft. Bei
 *  voller Groesse tragen dort nur 68 von 360 Grad — vier Eckkeile zu je 17,
 *  schmaler als ein Portal breit ist. */
export const UNIVERSE_MAP_OFFER_PORTAL_RING_K = 0.86

/** Mittelpunktabstand als Vielfaches der Radiensumme. Reine ZUSICHERUNG: durch
 *  die gespreizten Startwinkel liegt der engste gemessene Fall bei 2,87, der
 *  Test greift auf keiner Zielaufloesung. Er steht fuer den Tag, an dem jemand
 *  `_RING_K` anhebt oder `PROVIDENCE_OFFER_SIZE` auf vier stellt. */
export const UNIVERSE_MAP_OFFER_PORTAL_GAP = 1.12

/** 36 Winkel im 10-Grad-Raster statt der 24 der Einzelfassung: drei Portale
 *  muessen einander ausweichen und brauchen dafuer ein feineres Raster. */
export const UNIVERSE_MAP_OFFER_PORTAL_ANGLE_TRIES = 36

/** Die radiale Leiter je Speiche, NACH dem gewuerfelten Anteil: ganz aussen,
 *  Mitte, ganz innen. Der zweite Freiheitsgrad, den ein einzelnes Portal nicht
 *  braucht — eine Speiche, die beim gewuerfelten Anteil im Abstandskreis des
 *  Nachbarn liegt, ist weiter draussen oder weiter drinnen oft frei. */
export const UNIVERSE_MAP_OFFER_PORTAL_RADIAL_STEPS = [1, 0.5, 0] as const

/* Sperrzonen fuer Bedienflaechen gibt es hier KEINE: die Buehne traegt kein HUD
   mehr — Werkzeugleiste, Legende und Auswahlkarte sind gefallen, gezoomt wird
   mit dem Rad. Das Portal weicht nur noch Bildkante und Kartenscheibe aus. */

/** Die Beschriftung am Portal: ein FESTES Kaestchen. Die Platzsuche braucht eine
 *  Zahl statt einer gemessenen Textbreite — sonst waere sie unrein und ihr
 *  Waechter blind. Das CSS baut genau dieses Kaestchen, also misst die Spec, was
 *  wirklich im Bild steht. Kanten in `em`, damit die Box auf 4K mitwaechst.
 *
 *  Die Breite ist IM BROWSER gemessen, nicht geschaetzt: der laengste Fall ist
 *  „Universe VIII" mit 5,10 em (Wort 1 em, Ziffer 0,78 em), die Hoehe der EINEN
 *  Zeile 1,05 em. Sie stand einmal bei 9,4 — da trugen die Universen noch
 *  Namen, und „Runeterra Prime VIII" mass 8,79 em. Genau diese Breite
 *  entscheidet, ob das Kaestchen noch in die schwarze Gasse zwischen Scheibe
 *  und Bildkante passt (auf Full HD sind das 154 px). */
export const UNIVERSE_MAP_PORTAL_LABEL_R_RATIO = 0.11
export const UNIVERSE_MAP_PORTAL_LABEL_MIN_PX = 13
export const UNIVERSE_MAP_PORTAL_LABEL_MAX_PX = 19
export const UNIVERSE_MAP_PORTAL_LABEL_W_EM = 5.5
export const UNIVERSE_MAP_PORTAL_LABEL_H_EM = 1.2
export const UNIVERSE_MAP_PORTAL_LABEL_GAP_EM = 0.95
export const UNIVERSE_MAP_PORTAL_LABEL_EDGE_PAD = 10

/** Wie nah die Beschriftung an die Karte darf — eine LEITER, keine Zahl.
 *
 *  Zuerst gilt dieselbe Kante wie fuer den Ring (die Sprite-Kante). Findet sich
 *  dort keine Seite, rueckt sie naeher: hinter das Filamentgewebe (1,0148 — die
 *  letzte Ebene der Karte, die Struktur traegt) und notfalls knapp hinter die
 *  Galaxienkoerper (0,907). Schrift ist kein leuchtender Koerper: sie traegt
 *  eine Schattenkante, und was zwischen Gewebe und Sprite-Kante liegt, ist der
 *  deckende dunkle Reifen samt auslaufendem Schattenteich — die ruhigste
 *  Flaeche des ganzen Reiters. Darauf steht sie BESSER als auf dem Sternfeld.
 *
 *  Was NICHT nachgibt, sind Bildkante und Bedienflaechen: eine Beschriftung
 *  unter der Legende ist keine. Ohne die Leiter blieb auf Full HD fuer zwei der
 *  zehn Universen keine Seite uebrig — das Kaestchen ist breiter als der Ring
 *  hoch ist, und in der Gasse zwischen Bildkante und Scheibe zaehlt das. */
export const UNIVERSE_MAP_PORTAL_LABEL_CLEAR_STEPS = [
  UNIVERSE_MAP_PLATE_SPRITE_MARGIN,
  1.015,
  0.93,
] as const

/** Deckel der Portal-Rasterflaeche je Ebene. Er greift ab 2K am Halo und ab 4K
 *  an allen — ohne ihn baute 4K ein 988er-Quadrat fuer ein Leuchten. */
export const UNIVERSE_MAP_PORTAL_MAX_BACKING_PX = 1024
/* DREI Portale mal VIER Ebenen sind exakt zwoelf — bei 12 stuende der LRU
   randvoll und wuerfe bei jedem Resize- oder DPR-Wechsel alles weg, um es im
   selben Frame neu zu backen. 24 laesst eine vollstaendige zweite Garnitur
   stehen. */
export const UNIVERSE_MAP_PORTAL_CACHE_MAX = 24
