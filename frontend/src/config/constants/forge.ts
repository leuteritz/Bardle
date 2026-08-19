// Star Forge (Sonnen-Baum aus Roots, Branches und Leaves samt Relikten,
// Konstellationen und Schnäppchen) und der Meep Skill Tree.

import type { ForgeBargainKind, ForgeRelicRarity, ForgeSectionDef, ForgeUpgradeTier } from '@/types'

// ── Meep Skill Tree: die Orbit-Bühne (SkillTreeComponent / MeepOrbitStage) ──
//
// Ein leuchtender Kern in der Mitte, fünf Spiralarme darum — eine Galaxie von
// oben, keine Ringscheibe. Die Bühne wird SELBST gezeichnet (kein Pan/Zoom,
// keine Fremdbibliothek) und lebt in einem Design-Koordinatensystem, das die
// Bühnenspalte des Tabs skaliert. Deshalb sind alle Zahlen hier Design-Pixel,
// keine Bildschirm-Pixel.
//
// Skaliert wird NUR die Bühne, nicht der ganze Reiter: das Detail-Blatt daneben
// ist eine unskalierte Schiene wie die Forge-Spalte im Shop (Breite in
// `BARD_PROFILE_RAIL_*`, `constants/ui.ts`). Im Skalierkasten mitgeführt liefen
// seine Schriftgrade von ~1,0 auf Full HD bis zum Deckel 1,9 auf 4K mit und
// trafen den Shop auf keiner Auflösung.
//
// **Die BREITE ist fest, die HÖHE nicht.** Ein Kasten mit fixem Seitenverhältnis
// kann nur EIN Container-Verhältnis ausfüllen; gemessen reicht das Profil-Modal
// von 2,00 (Full HD, 1319 × 658) bis unter 1,50 — mit 1240 × 632 blieben unten
// und oben zusammen bis zu 250 px schwarz stehen. Stattdessen: die Skalierung
// kommt aus der BREITE, und die Design-Höhe ist das, was der Container bei
// dieser Skalierung hergibt (`SkillTreeComponent`). Die Arme füllen sie über
// eine mitwachsende y-Stauchung.
//
// **Es gibt keine gezeichneten Rang-Bahnen mehr.** Fünf konzentrische Ellipsen
// ordneten die Ränge, lasen sich aber als Zifferblatt — was die Ränge ordnet,
// ist jetzt der Radius selbst, und was die ARME ordnet, sind die Nebelbänder
// (`SKILL_TREE_NEBULA_*`) samt Kernschein (`SKILL_TREE_CORE_*`).
//
// Die Radien und die Stauchung hängen ZUSAMMEN und tragen sich gegenseitig;
// einzeln verstellt kleben Knoten an Nachbarn oder am Startkreis. Die drei
// engsten Stellen, gegen die sie gerechnet sind:
//   1. Rang 0 gegen den Startkreis — am UNTEREN Ende der Stauchung. Bei ±90°
//      wirkt sie voll, der Abstand schrumpft auf `r₀ · Y_SQUASH`. Mit
//      118 · 0,7 = 82,6 bleiben über halbem Startkreis (28) plus halbem Knoten
//      (20) noch 34 px Luft.
//   2. Der äußerste Rang gegen die Bühnenkante — ebenfalls unten. Der
//      battle-Arm steht bei Rang 4 fast senkrecht (126° + 4·30° = 246°): bei
//      minimaler Stauchung 314 · 0,703 · |sin| = 201, plus halber Knoten und
//      Kostenpille bleiben 21 px Luft von 265. Deshalb liegt die Mindesthöhe
//      bei 530, nicht tiefer.
//   3. **Die Kostenpille gegen den FREMDEN Nachbararm** — die eigentliche
//      Bremse der Drift, siehe `SKILL_TREE_TIER_DRIFT_DEG`. Gemessen 29,8 px
//      bei Stauchung 0,703 (`battle` Rang 0 → `cosmos` Rang 2). Sie ist der
//      Grund, warum die Pille von 44 auf 36 zurückging: die innere
//      Radiuslücke der geometrischen Reihe ist nur 33 px, eine 44er-Pille an
//      Rang 0 reichte über den Rang-1-Radius hinaus.
//      (Die frühere Enge 3 — Gabel gegen ihren eigenen Rang 5 — stand hier mit
//      „93 px" und war schon damals falsch: gemessen waren es 48,5. Mit der
//      geometrischen Reihe sind es 77,6 px, sie trägt sich also von selbst.)
/** Grundwinkel der fünf Zweige, gleichmäßig über 360°. */
export const SKILL_TREE_BASE_ANGLES_DEG = [-90, -18, 54, 126, 198]
/** Breite der Orbit-Bühne. Sie ist fest — nur die Höhe atmet. Zugleich die
 *  Design-Breite des Skalierkastens, seit das Detail-Blatt daneben nicht mehr
 *  mitskaliert. */
export const SKILL_TREE_STAGE_WIDTH = 880
/**
 * Grenzen der elastischen Design-Höhe. Unten hält die Mindesthöhe die Enge Nr. 2
 * aus dem Blockkommentar oben frei; oben endet sie dort, wo die Ellipse kippt
 * und die Arme senkrecht statt kreisend gelesen werden.
 */
export const SKILL_TREE_STAGE_MIN_HEIGHT = 530
export const SKILL_TREE_STAGE_MAX_HEIGHT = 900
/**
 * Obergrenze der Fit-Skalierung. Das Modal hängt an `--hud-panel-size` und
 * wächst auf 4 K auf rund die doppelte Full-HD-Breite; ohne Deckel würde die
 * Schrift dort mitwachsen, bis sie plakativ wirkt.
 */
export const SKILL_TREE_MAX_SCALE = 1.9
/** x-Mitte der Bühne. Die y-Mitte ist immer die halbe (elastische) Höhe. */
export const SKILL_TREE_CENTER_X = 440
/**
 * Radius je Rang — eine GEOMETRISCHE Reihe (Faktor 1,2769), keine gleichmäßige.
 *
 * Zusammen mit dem konstanten Winkeldrift darunter ist das per Definition eine
 * **logarithmische Spirale**: konstantes Δln(r) bei konstantem Δθ ergibt einen
 * über den ganzen Arm gleichbleibenden Steigungswinkel, hier 25,0° — der
 * Bereich, in dem echte Spiralgalaxien liegen. Mit den früheren gleichmäßigen
 * Abständen (118/168/218/267/314) wurde der Arm nach außen immer flacher und
 * las sich als Speichenrad mit Knick.
 *
 * Innen dichter, außen weiter passt zudem zur Kostenkurve: die späten Ränge
 * kosten ein Vielfaches der frühen, und der Schritt dorthin ist jetzt auch
 * optisch der größere (33 / 41 / 54 / 68 px statt viermal 49).
 */
export const SKILL_TREE_TIER_RADIUS = [118, 151, 192, 246, 314]
/**
 * Grenzen der y-Stauchung. Der tatsächliche Wert kommt aus der Bühnenhöhe
 * (`skillTreeLayout`): unter 1 liegt ein Breitbild-Oval, über 1 ein
 * hochkant stehendes — beides bleibt eine lesbare Umlaufbahn.
 */
export const SKILL_TREE_Y_SQUASH_RANGE = { min: 0.7, max: 1.25 } as const
/**
 * Winkelversatz je Rang. Er ersetzt den früheren Zickzack: ein gleichmäßiger
 * Drift lässt jeden Arm als SPIRALE lesen statt als geknickte Kette.
 *
 * **Was ihn nach oben begrenzt, ist nicht die Lesbarkeit, sondern der
 * Nachbararm.** Die fünf Arme stehen 72° auseinander; kommt `k · DRIFT` einem
 * Vielfachen von 72° nahe, schiebt sich Rang *t* eines Arms neben Rang *t+k*
 * des Nachbarn — verschiedene Farben in wenigen Pixeln Abstand, und die
 * Kostenpille des inneren Knotens landet IM äußeren. Gemessen (Pille gegen
 * fremden Knoten, Stauchung 0,703):
 *
 *   26° → 52/78/104, Abstand zu 72/144  20/6/32   →  28,9 px
 *   30° → 60/90/120, Abstand            12/18/24  →  29,8 px  ← gewählt
 *   34° → 68/102/136, Abstand            4/30/8   →  13,7 px  ✗ Pille im Knoten
 *
 * 30° dreht jeden Arm über 120° und ist damit deutlich spiraliger als die
 * früheren 26° (104°), ohne den Seam bei 34° aufzureißen.
 */
export const SKILL_TREE_TIER_DRIFT_DEG = 30
/**
 * Wie weit die beiden Gabelknoten auf Rang 4 auseinanderstehen (∓ je Seite).
 * Groß genug, dass man die Wahl SIEHT, klein genug, dass beide erkennbar zum
 * selben Arm gehören: 32° belegen von den 72° je Zweig weniger als die Hälfte.
 * Sie sind damit etwa ein voller Rangschritt breit (30°) — die Gabel liest sich
 * als Verzweigung des Arms, nicht als zwei Knoten nebeneinander.
 */
export const SKILL_TREE_FORK_OFFSET_DEG = 16
/** Kantenlänge eines Knotens und seines Glyphs. */
export const SKILL_TREE_NODE_SIZE = 40
export const SKILL_TREE_NODE_ICON_SIZE = 27
/**
 * Durchmesser des Startkreises in der Mitte. Er ist ABSICHTLICH kleiner als ein
 * Rang-0-Knoten es vermuten ließe: er ist kein Ziel, sondern der Ursprung, von
 * dem fünf Arme ausgehen. Mit 88 lag das Meep-Bild darin größer als jedes
 * Zweig-Glyph und zog das Auge in die Mitte, wo es nichts zu wählen gibt.
 */
export const SKILL_TREE_START_SIZE = 56
/**
 * Abstand der Kostenpille vom Knotenmittelpunkt, radial nach AUSSEN. Sie hängt
 * nur an Knoten, die gerade zählen (kaufbar, gewählt, überfahren) — 30 Pillen
 * gleichzeitig überlappten einander und den nächsten Rang, und die Kosten
 * stehen ohnehin im Detail-Blatt.
 *
 * **44 ging nicht mehr.** Die geometrische Radienreihe lässt zwischen Rang 0
 * und Rang 1 nur 33 px; eine 44er-Pille reichte über den nächsten Rang hinaus
 * und traf im engsten Seam den Knoten des NACHBARARMS (Enge 3 im Blockkommentar
 * oben). Mit 36 bleiben dort 29,8 px — mehr als die 28,9 px davor.
 */
export const SKILL_TREE_COST_PILL_RADIUS = 36
/**
 * Wo die fünf Zweignamen stehen. Sie sitzen NICHT auf der Achse ihres
 * äußersten Knotens: gemessen lagen sie dort über vier von fünf Rang-5-Knoten,
 * weil 26 px radialer Abstand in y-Richtung noch weiter zusammenschrumpfen. Der
 * Name läuft dem Arm deshalb ein Stück in Driftrichtung VORAUS — er liest sich
 * dadurch als Fortsetzung der Spirale statt als Etikett daneben.
 *
 * Der Vorlauf ging mit der Drift von 16 auf 28: bei 16 blieben dem Namen im
 * flachsten Viewport nur 13,9 px zum nächsten Knoten, bei 28 sind es 17,9
 * (flach) und 25,0 (hoch).
 */
export const SKILL_TREE_ARM_TAG_RADIUS = 340
export const SKILL_TREE_ARM_TAG_LEAD_DEG = 28
/**
 * Luft über und unter dem äußersten Zweignamen. Sie ist der Puffer, aus dem die
 * y-Stauchung gerechnet wird: der Name ist das oberste und unterste Element der
 * Bühne, alles andere liegt innerhalb seiner Bahn.
 */
export const SKILL_TREE_ARM_TAG_MARGIN = 26
/** Umlaufdauer des gestrichelten Rings um den Startkreis. */
export const SKILL_TREE_RING_SPIN_MS = 46000
/**
 * Deckkraft der Kanten als Hex-Suffix an der Zweigfarbe (die Zweigfarben sind
 * durchweg sechsstellige Hex-Werte). Leerer String = voll deckend.
 */
export const SKILL_TREE_EDGE_ALPHA = {
  bought: '',
  path: 'b0',
  buyable: 'd0',
  idle: '3a',
  dimmed: '18',
  /**
   * Die Kette vom Zentrum zum hervorgehobenen Knoten — voll deckend, und ihre
   * Strichstärke ist die einer gekauften Kante. Die STRICHELUNG bleibt dabei am
   * Kaufzustand hängen: eine durchgezogene Kette sagt „bezahlt", und das wäre
   * gelogen, solange der Weg noch offen ist.
   */
  spot: '',
  /** Alles, was nicht auf dieser Kette liegt, solange sie leuchtet. */
  spotDimmed: '14',
} as const
/**
 * Deckkraft je Knotenzustand. `blocked` liegt UNTER `locked`: ein versiegelter
 * Knoten ist kein Ziel mehr, sondern die sichtbare Spur einer Entscheidung —
 * er soll da sein, aber nicht mehr ziehen.
 */
export const SKILL_TREE_NODE_OPACITY = {
  bought: 1,
  buyable: 1,
  reachable: 0.86,
  locked: 0.42,
  blocked: 0.28,
  dimmed: 0.2,
} as const
/** Strichstärke der Verbindungen, je nach Zustand des Zielknotens. */
export const SKILL_TREE_EDGE_WIDTH_BOUGHT = 3.5
export const SKILL_TREE_EDGE_WIDTH_BUYABLE = 2.75
export const SKILL_TREE_EDGE_WIDTH_LOCKED = 2.25
/**
 * Wo der Kontrollpunkt der Kante vom Zentrum zu Rang 0 liegt, als Anteil ihres
 * Radius. Der zugehörige Winkel läuft dem Ziel um einen halben Rangschritt
 * HINTERHER — der Arm entspringt dem Kern dadurch tangential statt als Speiche.
 * Alle übrigen Kanten brauchen keine solche Zahl: ihr Kontrollpunkt folgt aus
 * den beiden Endpunkten (`arcPath` in `skillTreeLayout`).
 */
export const SKILL_TREE_CENTER_EDGE_CTRL_FRACTION = 0.5

// ── Meep Skill Tree: Nebelbänder und Kern ─────────────────────────────────
//
// Was an die Stelle der fünf Rang-Ellipsen getreten ist. Die Ellipsen ordneten
// nach RANG, diese beiden ordnen nach ARM und nach MITTE — dieselbe Aufgabe,
// aber in der Sprache des Themas gestellt.
//
// Beide sind STATISCH: kein `filter`, kein `feGaussianBlur`, keine laufende
// Animation. Die Weichheit kommt aus den Gradient-Stops, der niedrigen
// Deckkraft und `stroke-linecap: round` — ein Filter über fünf 46 × 300-Bänder
// in demselben SVG, in dem 35 Kanten bei jedem Hover ihre Attribute wechseln,
// rasterte die Region bei jedem Zug neu (Performance-Regel 2).
/** Breite eines Armbandes. Bei 12° Seam berühren sich benachbarte Bänder — als
 *  Nebel gewollt; breiter zöge der Zweigfokus die halbe Nachbarzone mit hoch. */
export const SKILL_TREE_NEBULA_WIDTH = 46
/** Wo ein Band anfängt und endet, radial. Innen knapp vor Rang 0, außen hinter
 *  Rang 4 — der Arm soll aus dem Kern kommen und ins Nichts auslaufen, nicht an
 *  einem Knoten beginnen oder enden. */
export const SKILL_TREE_NEBULA_INNER_R = 88
export const SKILL_TREE_NEBULA_OUTER_R = 338
/** Quadratische Segmente je Band. Sechs halten die Abweichung von der echten
 *  logarithmischen Spirale unter 0,41 px (vier: 1,12 px, acht: 0,28 px). */
export const SKILL_TREE_NEBULA_SEGMENTS = 6
/**
 * Verlauf eines Bandes, als RADIEN statt als Prozentwerte — der Gradient ist
 * radial um das Bühnenzentrum, nicht linear entlang der Sehne. Ein linearer
 * Verlauf von Bandanfang zu Bandende liefe bei 120° Armdrehung quer durch die
 * Galaxie statt von innen nach außen.
 *
 * Innen gedämpft, damit das Band nicht am Kernschein klebt; außen auf null,
 * damit es ausläuft statt an der Bühnenkante abgeschnitten zu werden.
 */
export const SKILL_TREE_NEBULA_STOPS = [
  { r: 88, opacity: 0.3 },
  { r: 176, opacity: 1 },
  { r: 338, opacity: 0 },
] as const
/** Deckkraft im Ruhezustand und wenn der Arm gemeint ist (Zweigfokus oder ein
 *  Spotlight auf einem seiner Knoten). Umgeschaltet wird NUR die Deckkraft. */
export const SKILL_TREE_NEBULA_OPACITY = 0.055
export const SKILL_TREE_NEBULA_OPACITY_FOCUS = 0.15
export const SKILL_TREE_NEBULA_FADE_MS = 220
/**
 * Der Kernschein um den Startkreis, als x-Radius; der y-Radius folgt der
 * Stauchung. **150, nicht 200** — bei 200 läge der goldene Verlauf voll über
 * Rang 0 UND Rang 1, und die Zweigfarben der inneren zehn Knoten stünden auf
 * Goldwäsche.
 */
export const SKILL_TREE_CORE_RADIUS = 150
/** Stops des Kernscheins: innen sichtbar, ab der Mitte fast weg. Als Liste,
 *  damit Reihenfolge und Werte an EINER Stelle stehen. */
export const SKILL_TREE_CORE_STOPS = [
  { offset: 0, opacity: 0.18 },
  { offset: 0.45, opacity: 0.07 },
  { offset: 1, opacity: 0 },
] as const

// ── Star Forge: Baum-Darstellung (ForgeTreePanel) ─────────────────────────
/** Winkel der fünf Wurzeln auf dem Ring, im Uhrzeigersinn ab oben. */
export const FORGE_ROOT_ANGLES_DEG = {
  flightSpeed: 270,
  maxHp: 342,
  chimesPerClick: 54,
  chimesPerSecond: 126,
  dmgPerClick: 198,
} as const
/** Icon-Kantenlänge je Knotenstufe. */
export const FORGE_ICON_SIZE_ROOT = 28
export const FORGE_ICON_SIZE_BRANCH = 22
export const FORGE_ICON_SIZE_LEAF = 18
/**
 * Die zwei mittleren Ringe liegen mit 20 px eine Stufe ÜBER dem Blatt und
 * gleichauf mit dem Bough. 18 wäre die Untergrenze, ab der `game-icons` zu Grau
 * zerfallen — dort steht schon das Blatt, und zwei Ringe auf der Kante wären
 * einer zu viel. Ihre Knoten sind mit ⌀ 40 auch grösser als das Blatt (38).
 */
export const FORGE_ICON_SIZE_WARD = 20
export const FORGE_ICON_SIZE_PACT = 20
export const FORGE_ICON_SIZE_BOUGH = 20
/**
 * Ring 6 trägt das GRÖSSTE Glyph nach dem Kern — grösser als der Zweig darunter
 * und fast so gross wie ein Strahl.
 *
 * Das ist keine Zierde: es sind fünf Knoten weit aussen, jeder nur einmal zu
 * haben und jeder mit einer Regel dahinter. In Bough-Grösse (20) verschwänden
 * sie am Rand einer Bühne, die `useFitScale` auf Full HD ohnehin auf rund 60 %
 * herunterzieht — und ausgerechnet der seltenste Ring wäre der unscheinbarste.
 */
export const FORGE_ICON_SIZE_CROWN = 26
/**
 * Luft an JEDER Seite beim Einpassen des Baums.
 *
 * Vorher standen hier 96 px, aber nur oben — Kopfraum für das schwebende
 * Phasen-Dock, unter dem die Bühne zusätzlich um die halbe Höhe nach unten
 * gerückt war. Das Dock sitzt jetzt als Kopfleiste in der Forge-Sidebar, also
 * verteilt sich derselbe Betrag auf beide Seiten: die Bühne steht mittig und
 * bleibt exakt so groß wie zuvor (auf jedem Desktop-Format begrenzt die Höhe,
 * und 780 − 2·48 ist dasselbe wie 780 − 96). Der Baum wird durch den Umzug
 * also weder größer noch kleiner, nur zentriert.
 */
export const FORGE_TREE_FIT_PADDING_PX = 48
/**
 * Wo eine Wurzel-Verbindung ansetzt — am RAND des Körpers, der gerade in der
 * Mitte steht, nicht an einem festen Radius.
 *
 * Vorher stand hier ein fester `FORGE_SUN_EDGE_R = 110`. Der Körper wächst aber
 * mit der Sonnenphase (`SHOP_SUN_MIN_DIAMETER`…`SHOP_SUN_MAX_DIAMETER`, also
 * Radius 85…120), und im Kometenzustand ist der sichtbare Fels nochmals
 * kleiner: die Striche begannen dort rund 45 px NEBEN dem Gestein und schwebten
 * frei im Raum, während sie in der Endphase unter der Scheibe verschwanden.
 *
 * `FORGE_BODY_EDGE_FRACTION` sagt je Körper, welchen Anteil seines Kastens er
 * WIRKLICH ausfüllt — der Komet sitzt als `inset: 12%` in seinem (Anteil 0,76),
 * Plasmascheibe und Schwarzes Loch reichen bis zur Kastenkante.
 */
export const FORGE_BODY_EDGE_FRACTION = { star: 1, comet: 0.76, blackHole: 1 } as const
/**
 * Luft zwischen dem Rand des Körpers und dem Beginn der Wurzel-Äste.
 *
 * Muss den Atem der Scheibe überbieten, sonst leckt sie im Scheitel der
 * Pulsanimation an den Strichen: der stärkste ist `tree-sun-pulse` mit
 * `scale(1.05)`, bei Höchstradius 120 also 6 px. Nach oben begrenzt der
 * Wurzelring: 165 − 28 (halber Knoten) − 128 lässt bei größtem Körper noch
 * einen sichtbaren Stummel stehen.
 */
export const FORGE_SUN_EDGE_GAP = 8

/* ── Die STREUUNG: warum der Baum kein Zifferblatt mehr ist ───────────────────
 *
 * Bis hierher sass jeder Knoten auf einer von fünfzehn Speichen im 24°-Raster —
 * in `config/progression/starForge.ts` erbt jedes Kind den `angleDeg` seines
 * Elternteils, und die Winkelmenge war über alle sieben Ebenen dieselbe. Sieben
 * Ringe mal fünfzehn Speichen lasen sich als Zielscheibe, nicht als Baum.
 *
 * Gemessen war der Baum dabei RADIAL eng und TANGENTIAL verschwenderisch:
 *
 *   entlang einer Speiche (Ring → Ring)   12–13 px Luft zwischen zwei Rändern
 *   zum Nachbarn auf demselben Ring       46–164 px
 *
 * Die Ringradien sind am Anschlag (siehe die Tabelle an `FORGE_RING_BOUGH_R`:
 * der äusserste Knoten steht bei 517 gegen die Bühnenhälfte 520). Mehr Platz
 * kann also NICHT aus grösseren Radien kommen — er muss aus der tangentialen
 * Reserve kommen. Genau das leistet ein Winkelversatz: er löst das Raster auf
 * UND verlängert den Weg von einem Knoten zu seinem Kind, in einem Zug.
 *
 * Gerechnet wird das alles in `utils/ui/forgeTreeLayout.ts`, einmal beim ersten
 * Aufruf, geseedet aus Ebenennamen und Knoten-ID. Die Basiswinkel im Katalog
 * bleiben unverändert — sie sind der Ausgangspunkt, nicht das Ergebnis.
 *
 * Es sind ZWEI Schritte, und der erste trägt den Zugewinn:
 *
 *   1. jeder RING wird als Ganzes verdreht, gegen seinen Nachbarn
 *   2. jeder KNOTEN wird darin einzeln versetzt
 *
 * Nur Schritt 2 hätte den Abstand bloss erhalten, nicht vergrössert: wer sich
 * von einem Nachbarn entfernt, nähert sich dem nächsten. Erst Schritt 1 nimmt
 * das Kind aus der radialen Deckung seines Elternteils.
 */
/**
 * Wie weit ein ganzer Ring gegen die Katalogwinkel verdreht werden darf.
 * Ein halber Speichenabstand — mehr wäre dieselbe Stellung mit anderem Namen.
 */
export const FORGE_RING_ROTATE_MAX_DEG = 12
/**
 * Wie weit zwei BENACHBARTE Ringe mindestens gegeneinander stehen müssen.
 *
 * Das ist die Zahl, die den Platz schafft. Gemessen als Luft zwischen den
 * Rändern des engsten Paares (Wurzel ⌀ 56 auf 158, Zweig ⌀ 46 auf 221):
 *
 *   deckungsgleich (heute)   12,0 px      ← Wurzel/Zweig, Hut/Ast, Wacht/Pakt
 *   8° versetzt              17,2 px
 *   12° versetzt             23,1 px
 *
 * Bei 8 bleibt der Differenz noch ein Drittel des Speichenabstands als Spiel
 * (8…16 statt fest 12) — der Versatz ist gefordert, aber nicht vorgeschrieben,
 * und zwei Ringe stehen nie in derselben Beziehung wie zwei andere.
 */
export const FORGE_RING_DEALIGN_MIN_DEG = 8
/**
 * Wie weit ein Knoten von der Speiche seines Rings abweichen darf.
 *
 * Der halbe Speichenabstand ist 12°. Bei 9 behält der Ring seine REIHENFOLGE:
 * ein Knoten wandert nie an seinem Nachbarn vorbei, und die Zuordnung Kind →
 * Elternteil bleibt auch ohne die Linie erkennbar. Bei 12 wären zwei Nachbarn
 * deckungsgleich, bei mehr überholten sie sich.
 */
export const FORGE_SCATTER_ANGLE_DEG = 9
/**
 * Wie weit ein Knoten seinen Ring nach innen oder aussen verlassen darf.
 *
 * Obergrenze ist das Kammband des Tiefenfelds: `FORGE_DEPTH_CREST_SPREAD`
 * (0,045) mal Bühnenradius (520) sind ±23,4 px. Mit 12 bleibt jeder Knoten in
 * der Farbe seiner Ebene — verliesse er sie, stünde er auf dem Kamm der
 * Nachbarebene und der Ring-Filter-Chip zeigte auf die falsche Zone.
 */
export const FORGE_SCATTER_RADIUS_PX = 12
/**
 * Die Luft, die ein Kandidat zu ALLEN schon gesetzten Knoten halten soll.
 *
 * Angestrebt, nicht garantiert: genommen wird der ERSTE Kandidat, der sie
 * erreicht. Erreicht keiner sie, gewinnt der beste, der wenigstens
 * `FORGE_SCATTER_MIN_AIR_PX` hält.
 */
export const FORGE_SCATTER_TARGET_AIR_PX = 24
/**
 * Die HARTE Untergrenze — kein Kandidat, der sie verletzt, wird je genommen.
 *
 * Sie liegt unter der Luft, die die Ringverdrehung allein schon liefert (17,2
 * px im engsten Paar). Damit ist der ungestreute Platz IMMER ein gültiger
 * Kandidat, und der Baum kann durch die Streuung nicht enger werden, als er
 * ohne sie wäre — geprüft in `forgeTreeLayout.spec.ts`.
 */
export const FORGE_SCATTER_MIN_AIR_PX = 15
/**
 * Kandidaten je Knoten. Genommen wird der ERSTE brauchbare, nicht der beste:
 * eine Maximierung verteilte die Knoten wieder gleichmässig und schüfe damit
 * ein neues Muster — genau das, was hier verschwinden soll.
 */
export const FORGE_SCATTER_TRIES = 24
/**
 * Der Durchmesser eines Knotens je Ebene.
 *
 * Stand bis hierher zweimal: als Literal im scoped CSS von `ForgeTreePanel.vue`
 * und als abgeschriebene Tabelle in `__tests__/config/forgeGeometry.spec.ts`.
 * Die Doppelung war begründet, solange die Grösse reine Darstellung war — mit
 * der Streuung ist sie es nicht mehr: der Platzierer BRAUCHT sie, um zu
 * entscheiden, ob zwei Knoten sich berühren. Also steht sie hier, das CSS
 * bindet sie per `v-bind`, und die Spec importiert sie.
 */
export const FORGE_NODE_DIAMETER: Record<ForgeUpgradeTier, number> = {
  root: 56,
  branch: 46,
  leaf: 38,
  ward: 40,
  pact: 40,
  crown: 50,
  bough: 42,
}

/* ── Die ÄSTE: gekrümmt und nach aussen dünner ────────────────────────────────
 * Zwei gerade Striche zwischen zwei Knoten derselben Speiche waren nur die
 * zweite Hälfte desselben Problems. Jeder Ast ist jetzt eine quadratische
 * Bézier mit seitlichem Schwung — dasselbe Mittel, mit dem der Meep-Baum seine
 * Spiralarme verbindet (`utils/ui/skillTreeLayout.ts`, `arcPath`).
 */
/** Seitlicher Versatz des Kontrollpunkts, als Anteil der Sehnenlänge. */
export const FORGE_LIMB_BOW = 0.16
/** Mindestanteil davon. Ohne ihn würfelte der Seed gelegentlich fast null und
 *  ein einzelner Ast bliebe schnurgerade zwischen lauter geschwungenen. */
export const FORGE_LIMB_BOW_MIN = 0.35
/**
 * Strichstärke des Grundastes je Ebene — innen kräftig, aussen fein. Der Baum
 * verjüngt sich damit nach aussen, statt siebenmal denselben 4-px-Strich zu
 * zeigen.
 */
export const FORGE_LIMB_WIDTH: Record<ForgeUpgradeTier, number> = {
  root: 5,
  branch: 4.2,
  leaf: 3.4,
  ward: 3,
  pact: 2.7,
  crown: 2.7,
  bough: 2.4,
}
/** Der gefärbte Ast über dem Grundast. 2,5 zu 4 war das bisherige Verhältnis. */
export const FORGE_LIMB_LIT_FACTOR = 0.62

/* ── Der BEDINGUNGS-KRANZ am gesperrten Knoten ─────────────────────────
 *
 * Hier standen einmal die SPANNFÄDEN — gestrichelte Bögen von einem gesperrten
 * Knoten zu jedem seiner Vorgänger. Sie sind gestrichen, und der Grund ist nicht
 * Geschmack, sondern eine Zahl: bei Standardzoom (`FORGE_TREE_ZOOM_DEFAULT` 2,15)
 * ist das sichtbare Fenster `FORGE_STAGE_SIZE / 2,15 ≈ 484` Bühnen-px breit. Eine
 * Krone steht auf r = 438, ihre Zweig-Voraussetzung auf r = 221 — **die können
 * gar nicht gleichzeitig im Bild sein.** Der Faden zeigte auf etwas, das der
 * Spieler nicht sah.
 *
 * Dazu kamen drei Dinge, die er nie einlöste: er trug DIESELBE Farbe wie ein Ast
 * (`#4a3418`), seine Krümmungsrichtung war gewürfelt (`bowPath` zog das
 * Vorzeichen aus dem Seed), und beim Zeigen leuchtete er grün/rot auf einen
 * Knoten, den `.node-circle--dim` im selben Moment auf 0,3 setzte.
 *
 * **Eine Linie war das falsche Mittel.** Ein Ast ist eine Linie, weil er STRUKTUR
 * ist — er sagt, wo ein Knoten hängt, und das ändert sich nie. Eine Voraussetzung
 * ist kein Ort, sondern ein ZUSTAND: „hiervon fehlen dir noch zwei“. Zustand
 * gehört an das Objekt, nicht zwischen zwei davon.
 *
 * Der Kranz ist die Antwort: ein Punkt je Bedingung auf dem Rand des Kreises,
 * gefüllt für erfüllt, hohl für offen. Er steht immer da, wo die Frage gestellt
 * wird, und braucht weder Zeiger noch Klick.
 */
/**
 * Durchmesser eines Kranzpunktes, in Bühnen-px.
 *
 * Die Punktmitte liegt AUF dem Kreisradius, nicht davor — und das ist die eine
 * Zahl, die die Fassung entscheidet: `.node-circle--spot` skaliert den Kreis samt
 * Kindern auf `FORGE_SPOTLIGHT_NODE_SCALE` (1,22), der Tooltip bei
 * `calc(100% + 10px)` skaliert NICHT mit. Auf dem Rand bleibt die Krone (R 25)
 * damit bei 1,22 · 27,5 = 33,6 gegen die Tooltip-Kante bei 35. Weiter aussen
 * schlüge der Kranz beim Zeigen gegen seine eigene Karte.
 *
 * Bei Standardzoom sind das rund 6,5 Bildschirm-px — Parität mit dem Stufen-Chip
 * daneben. `forgeReqWreath.spec.ts` rechnet alle Abstände nach.
 */
export const FORGE_REQ_DOT_SIZE = 5
/**
 * Winkelabstand zweier Punkte, symmetrisch um 12 Uhr gefächert.
 *
 * Bei vier Punkten — dem Maximum, Elternteil plus drei `requires` — reicht der
 * Fächer bis ±39°, mit dem Punkthalbwinkel bis 44,7°. Der Schloss-Sektor
 * (`.fc-lock-badge`, unten rechts) beginnt bei 105°: **60° Luft**, und zwar bei
 * jeder Knotenrichtung, weil beide Marken am Kreis kleben und nicht an der Bühne.
 */
export const FORGE_REQ_DOT_PITCH_DEG = 26
/**
 * Die Füllung eines OFFENEN Punktes.
 *
 * Dunkel und nicht durchsichtig: ein transparenter Punkt verschwände auf dem
 * Rand eines gesperrten Knotens (`#4a3010`), und genau dort steht er immer.
 */
export const FORGE_REQ_DOT_OPEN_FILL = '#241708'
/**
 * Erfüllt in Grün, offen in Rot — dieselben zwei Töne, die im ganzen Projekt
 * „steht“ und „fehlt“ heissen.
 *
 * Hiessen `FORGE_TETHER_MET/OPEN_COLOR`, solange sie einen Faden färbten. Sie
 * tragen jetzt ZWEI Marken — die Punkte des Kranzes und den Ring, den ein
 * Voraussetzungsknoten im Fokus bekommt — und heissen deshalb nach der Sache
 * statt nach dem Strich.
 */
export const FORGE_REQ_MET_COLOR = '#52b830'
export const FORGE_REQ_OPEN_COLOR = '#cc6050'

/** Überschrift der Voraussetzungsliste in Zeile und Tooltip. */
export const FORGE_REQ_HEADING = 'REQUIRES'
/** Die zwei Zeichen davor. Dekorative Glyphen, ausdrücklich erlaubt (CLAUDE.md
 *  „Icons", Punkt 8) — ein Iconify-Motiv in 11 px zerfiele hier zu Grau. */
export const FORGE_REQ_MET_MARK = '✓'
export const FORGE_REQ_OPEN_MARK = '✕'

/**
 * Battle Power je gehaltenem Meep. Der Meep-Term dominiert `totalPower` —
 * `abilityPowerBonus` und `tree.powerBonus` sind daneben Beiwerk.
 *
 * Angehoben von 100, als die Meep-Ausbeute auf den Ratschen-Anker umgestellt
 * wurde (`MEEP_RUN_BASE_MIN`/`MEEP_RUN_SHARE`): der Lebenszufluss fiel dabei
 * von rund 7800 auf rund 1250 Meeps, also auf ein Sechstel. Geeicht ist der
 * Faktor am ZUFLUSS-Verhältnis und nicht am Endstand — der Spieler hält fast
 * durchweg Zwischenbestände zwischen zwei Baumkäufen, nicht den Rest am Ende.
 */
export const MEEP_POWER_MULTIPLIER = 600

/**
 * Wie die gefalteten Baum-Effekte im Meep-Panel des Headers gelesen werden.
 * Der Store liefert einen Beutel roher Zahlen (`meepTreeStore.fx`) — welcher
 * Schlüssel welche Beschriftung trägt und in welcher Einheit er steht, weiß
 * nur diese Tabelle. Sie gibt zugleich die Reihenfolge vor: erst was der
 * Spieler dauernd sieht (Produktion, Klick), dann Kampf, Überleben, und zuletzt
 * das, was nur zwischendurch greift (Offline, Expeditionen).
 *
 * `kind` entscheidet die Schreibweise:
 *   mult  — Faktor über 1, als „×1,25" gezeigt
 *   lower — Faktor unter 1, wo klein gut ist (Kosten, Dauer, Schaden) → „−20 %"
 *   pct   — Bruchteil, als Prozent gezeigt
 *   flat / rate / hours — additiv, mit der jeweiligen Einheit
 * Neutral (1 bzw. 0) bleibt ungezeigt — das Panel listet nur, was wirkt.
 */
export type MeepTreeEffectKind = 'mult' | 'lower' | 'pct' | 'flat' | 'rate' | 'hours'

export interface MeepTreeEffectRowDef {
  key: string
  label: string
  kind: MeepTreeEffectKind
  /**
   * Wo im Spiel dieser Effekt ankommt — als Chip im Detail-Blatt des
   * Skill-Tabs. Der Spieler soll vor dem Kauf sehen, welches System sich
   * ändert, nicht nur um wie viel. Mehrere Zeilen teilen sich einen Tag: der
   * Chip beschreibt das SYSTEM, nicht die Zeile.
   */
  tag: { label: string; icon: string }
  /**
   * Nur an Multiplikatoren, die einen bereits GECACHTEN Spielwert direkt
   * skalieren. Weil der Faktor in `shopStore.calculateTotalCPS/CPC()`
   * multiplikativ eingeht, ist `aktuellerWert × Faktor` das echte Ergebnis —
   * das Detail-Blatt kann damit „1.42M/s → 2.13M/s" schreiben, ohne die
   * Pipeline nachzusimulieren. Jeder andere Schlüssel zeigt stattdessen den
   * gefalteten Baum-Wert selbst; das ist der ehrliche Beitrag DES BAUMS.
   */
  liveStat?: 'chimesPerSecond' | 'chimesPerClick'
}

/** Die zehn Systeme, auf die der Baum wirkt — je ein Chip, je ein Glyph. */
const FX_TAG = {
  income: { label: 'Chime income', icon: 'ph:coins-fill' },
  clicking: { label: 'Clicking', icon: 'ph:hand-fist-fill' },
  prestige: { label: 'Prestige', icon: 'ph:sparkle-fill' },
  ranked: { label: 'Ranked battle', icon: 'ri:sword-fill' },
  orbit: { label: 'Orbit combat', icon: 'ph:users-three-fill' },
  bosses: { label: 'Planet bosses', icon: 'ph:planet-fill' },
  materials: { label: 'Materials', icon: 'ph:diamond-fill' },
  survival: { label: 'Survival', icon: 'ph:shield-fill' },
  offline: { label: 'Offline', icon: 'ph:moon-stars-fill' },
  expeditions: { label: 'Expeditions', icon: 'ph:compass-fill' },
} as const

export const MEEP_TREE_EFFECT_ROWS: readonly MeepTreeEffectRowDef[] = [
  {
    key: 'cpsMult',
    label: 'Chimes per second',
    kind: 'mult',
    tag: FX_TAG.income,
    liveStat: 'chimesPerSecond',
  },
  {
    key: 'cpcMult',
    label: 'Chimes per click',
    kind: 'mult',
    tag: FX_TAG.clicking,
    liveStat: 'chimesPerClick',
  },
  { key: 'doubleClickChance', label: 'Double-strike chance', kind: 'pct', tag: FX_TAG.clicking },
  { key: 'cpcFromCpsPct', label: 'Click gains of CpS', kind: 'pct', tag: FX_TAG.clicking },
  { key: 'meepCostMult', label: 'Chimes per meep', kind: 'lower', tag: FX_TAG.prestige },
  { key: 'meepPowerMult', label: 'Power per meep', kind: 'mult', tag: FX_TAG.prestige },
  { key: 'powerBonus', label: 'Flat battle power', kind: 'flat', tag: FX_TAG.ranked },
  { key: 'championDpsMult', label: 'Champion orbit DPS', kind: 'mult', tag: FX_TAG.orbit },
  { key: 'bossDamageMult', label: 'Damage to planet bosses', kind: 'mult', tag: FX_TAG.bosses },
  { key: 'materialDropMult', label: 'Material drop chance', kind: 'mult', tag: FX_TAG.materials },
  { key: 'hpRegenPerSec', label: 'Health regeneration', kind: 'rate', tag: FX_TAG.survival },
  { key: 'damageTakenMult', label: 'Damage taken', kind: 'lower', tag: FX_TAG.survival },
  { key: 'offlineEarningsMult', label: 'Offline earnings', kind: 'mult', tag: FX_TAG.offline },
  { key: 'offlineMaxHoursBonus', label: 'Offline cap', kind: 'hours', tag: FX_TAG.offline },
  {
    key: 'expeditionRewardMult',
    label: 'Expedition rewards',
    kind: 'mult',
    tag: FX_TAG.expeditions,
  },
  {
    key: 'expeditionSpeedMult',
    label: 'Expedition duration',
    kind: 'lower',
    tag: FX_TAG.expeditions,
  },
] as const

// ── Skill-Tab: die Kaufliste der Detailschiene (MeepSkillList) ───────────────
/**
 * Wonach die Skill-Liste gegliedert ist: nach dem, was der Spieler mit einem
 * Knoten ANFANGEN kann — nicht nach Zweig. Dieselbe Entscheidung wie
 * `forgeUpgradeBucket()` im Shop, aus demselben Grund: nach Zweig gegliedert stünde
 * das Kaufbare über fünf Überschriften verstreut, und der Spieler suchte es
 * unter dreißig Einträgen selbst.
 *
 * `fresh` steht VOR `ready`, obwohl beide kaufbar sind. Das ist die Umsetzung
 * von „die neusten oben": ein Knoten, der gerade erst aufgegangen ist, hat der
 * Spieler noch nie gesehen — er ist die Neuigkeit, während `ready` das ist, was
 * schon länger daliegt. Die Unterscheidung kostet kein neues Feld, sie liest
 * `meepTreeStore.acknowledged`, das die Notify-Abzeichen ohnehin schon führt.
 *
 * Grün für die kaufbaren Töpfe ist keine freie Wahl — im Projekt trägt Grün
 * durchgehend „kaufbar/aktiv" (die Knopf-Verläufe in CLAUDE.md). `fresh`
 * bekommt Gold daneben, weil es innerhalb des Kaufbaren die Auszeichnung ist.
 */
export const MEEP_SKILL_BUCKETS = [
  {
    id: 'fresh' as const,
    title: 'Newly unlocked',
    hint: 'Never seen before',
    icon: 'ph:sparkle-fill',
    accent: '#e8c040',
  },
  {
    id: 'ready' as const,
    title: 'Ready to learn',
    hint: 'Meeps are there',
    icon: 'ph:lightning-fill',
    accent: '#52b830',
  },
  {
    id: 'reach' as const,
    title: 'Saving up',
    hint: 'Open, but out of reach',
    icon: 'ph:hourglass-medium-fill',
    accent: '#c89040',
  },
  {
    id: 'locked' as const,
    title: 'Locked',
    hint: 'Learn the rank below first',
    icon: 'lucide:lock',
    accent: '#7a4e20',
  },
]

/**
 * Beschriftung der Archiv-Schaltzeile am Listenende: „▸ 12 learned · 2 sealed".
 * EINE Zeile für beide Zustände, nicht zwei — an beiden ist nichts mehr zu
 * entscheiden, und zwei gleich aussehende Schaltzeilen untereinander lesen sich
 * als eine.
 */
export const MEEP_SKILL_ARCHIVE_LABEL = 'learned'
export const MEEP_SKILL_ARCHIVE_SEALED_LABEL = 'sealed'
export const MEEP_SKILL_ARCHIVE_HINT = 'Nothing left to decide here'
export const MEEP_SKILL_ARCHIVE_ICON = 'ph:check-circle-fill'
/** Chevron der Schaltzeile. Schriftzeichen wie `✦` und `→`, kein Emoji. */
export const MEEP_SKILL_ARCHIVE_CHEVRON_CLOSED = '▸'
export const MEEP_SKILL_ARCHIVE_CHEVRON_OPEN = '▾'

/** Icon-Kantenlänge auf einer Listenkarte. Größer als die 26px der Forge-Zeile:
 *  hier stehen rund zehn offene Einträge statt fünfundvierzig. */
export const MEEP_SKILL_CARD_ICON_SIZE = 32
/** Der Knopf an der Karte trägt ein Wort, nicht das ＋ der Forge-Zeile — auf
 *  zehn Einträgen ist die Beschriftung bezahlbar und ohne Rätsel lesbar. */
export const MEEP_SKILL_LEARN_LABEL = 'Learn'
/** Marke am frisch aufgegangenen Knoten. */
export const MEEP_SKILL_FRESH_LABEL = 'NEW'
/** Der Chip an einem Gabel-Knoten — dieselbe Aussage wie der Gabelsatz im
 *  Kärtchen, nur so kurz, dass sie auf die Karte passt. */
export const MEEP_SKILL_FORK_LABEL = 'CHOICE'
export const MEEP_SKILL_FORK_ICON = 'game-icons:path-distance'
/** Was am Listenende steht, wenn der ganze Baum gelernt ist. */
export const MEEP_SKILL_ALL_DONE = 'Every skill learned.'
export const MEEP_SKILL_ALL_DONE_ICON = 'game-icons:laurels'
/*
 * Eine Bedienzeile über der Liste steht hier bewusst NICHT — und seit dem
 * Kachel-Umbau im Shop dort ebenso wenig. Eine Karte, die Icon, Namen, Wirkung,
 * Preis und einen BESCHRIFTETEN Knopf trägt, erklärt sich selbst; nötig war die
 * Zeile nur, solange der Eintrag ein nacktes `＋` zeigte und seine Auskunft
 * allein am Zeiger hing. In der 499px-Schiene stand sie ausserdem neben dem
 * Topf-Hinweis und schnitt ihn ab (gemessen auf Full HD): zwei Sätze um
 * denselben Platz, von denen der eine nichts sagt.
 */

// ── Skill-Tab: das Empfehlungs-Panel (MeepBestBuyPanel) ──────────────────────
/**
 * Was als Nächstes zu lernen lohnt — EIN Knoten groß, und zwar derselbe, den
 * die Orbit-Bühne links als BEST BUY umringt.
 *
 * „Günstigster" und nicht „stärkster", genau wie im Shop
 * (`FORGE_BEST_BUY_LABEL`): die Wirkungen des Baums stehen in Prozent, HP,
 * Stunden und Chimes nebeneinander — es gibt keine Einheit, in der `+6 %
 * Expeditionsertrag` und `+1 HP Regen/s` vergleichbar wären. Der Preis ist die
 * einzige Zahl, die alle dreißig Knoten teilen. Der Store sagt dasselbe schon
 * seit jeher an `suggestedNodeIds()`; die Regel ist also nicht neu, sie wird
 * nur sichtbar.
 */
export const MEEP_BEST_BUY_LABEL = 'BEST BUY'
export const MEEP_BEST_BUY_TITLE = 'Best buy'
export const MEEP_BEST_BUY_HINT = 'cheapest you can afford'
/**
 * Dieselben zwei Glyphen wie die Töpfe der Liste (`MEEP_SKILL_BUCKETS`):
 * „kaufbar" ist überall der Blitz, „noch nicht" überall die Sanduhr. Eine
 * Bedeutung, ein Zeichen — auch über Komponentengrenzen hinweg.
 */
export const MEEP_BEST_BUY_ICON = 'ph:lightning-fill'
export const MEEP_BEST_BUY_IDLE_ICON = 'ph:hourglass-medium-fill'
export const MEEP_BEST_BUY_IDLE = 'Nothing ready right now'
/** Beschriftung des großen Knopfs im Panel. */
export const MEEP_BEST_BUY_ACT_LABEL = 'Learn skill'
/** Icon-Kantenlänge in der Identitätszeile des Panels. */
export const MEEP_BEST_BUY_ICON_SIZE = 40

/**
 * Die Fläche, die das Panel IMMER belegt, solange es da ist.
 *
 * Dieselbe Klammer und derselbe Grund wie `FORGE_DETAIL_PANEL_*`: ein Kopf, der
 * mit seinem Inhalt wächst, schiebt die Liste darunter — und wenn er dabei
 * unter dem Zeiger wegrutscht, geht der Hover aus, der Kopf schrumpft, die
 * Liste kommt zurück, und das Flackern trägt sich selbst.
 *
 * Kleiner als die Shop-Werte (384/45 %/440), weil dieses Panel drei Dinge NICHT
 * hat: die Materialzeile, den Stapelknopf und dessen Hinweiszeile. Es trägt
 * Kopf, Identität, einzeilige Beschreibung, die Vorher/Nachher-Zeilen und den
 * Kaufblock — auf Full HD gemessen rund 300px mit der Kompakt-Media-Query.
 *
 * Der Anteil greift, weil `.msd-root` `height: 100%` trägt und der Elternteil
 * damit eine definite Höhe hat. Ohne den Anteil bliebe auf Full HD (~950px) von
 * der Liste zu wenig und auf 4K (~2030px) stünde der Kopf verloren.
 */
export const MEEP_BEST_BUY_PANEL_MIN_PX = 316
export const MEEP_BEST_BUY_PANEL_FRACTION = 0.36
export const MEEP_BEST_BUY_PANEL_MAX_PX = 380

// ── Skill-Tab: schwebendes Kärtchen an der Karte (MeepSkillTooltip) ──────────
/**
 * Was der Zeiger in der Liste streift, in voller Auskunft: alle
 * Vorher/Nachher-Zeilen, die berührten Systeme, der Gabelsatz und der noch
 * fehlende Weg.
 *
 * Es schwebt links NEBEN der Schiene statt in ihr — dieselbe Begründung wie
 * `FORGE_ROW_TIP_*`: alles, was im Fluss der Liste läge, verschöbe sie beim
 * Erscheinen unter dem Zeiger.
 */
export const MEEP_SKILL_TIP_WIDTH_PX = 268
export const MEEP_SKILL_TIP_GAP_PX = 26

/**
 * Wie lange die gelernte Karte aufleuchtet. Rein visuell, daher reale Zeit —
 * derselbe Wert wie im Shop, damit dieselbe Quittung nicht zweimal anders lang
 * dauert.
 */
export const MEEP_SKILL_FLASH_MS = 420

// ── Hover-Spotlight zwischen Orbit-Bühne und Skill-Liste ─────────────────────
/**
 * Bühne links und Liste rechts zeigen denselben Bestand in zwei Bildern. Zeigt
 * der Zeiger auf eines von beiden, tritt das andere mit hervor — sonst sucht
 * das Auge den Kreis zur Karte unter dreißig gleich hellen selbst.
 *
 * Die Verzögerung vor dem Scrollen ist dieselbe Vorsichtsmaßnahme wie im Shop:
 * wer mit dem Zeiger über die Bühne fährt, streift dabei Knoten, die er nicht
 * meint — ohne sie sprünge die Liste bei jeder Bewegung.
 */
export const MEEP_SPOTLIGHT_SCROLL_DELAY_MS = 120
/**
 * Der Maßstab des hervorgehobenen Knotens. Er liegt ÜBER dem Zeige-Sprung von
 * `.msn-circle:hover` (1,14), weil er beide Gesten bedienen muss: den Zeiger auf
 * dem Kreis UND den Zeiger auf seiner Karte drüben. Zwei Größen für dieselbe
 * Bedeutung wären ein Fehler.
 *
 * Dieselbe Zahl wie `FORGE_SPOTLIGHT_NODE_SCALE` weiter unten — die Geste ist
 * dieselbe. Trotzdem eine eigene Konstante: die beiden Reiter teilen keinen
 * Zustand (siehe `useMeepSpotlight` gegen `useForgeSpotlight`), und ein Name aus
 * dem Shop im Meep-Baum läse sich als Kopplung, die es nicht gibt.
 */
export const MEEP_SPOTLIGHT_NODE_SCALE = 1.22
/**
 * Wie weit die übrigen neunundzwanzig zurücktreten, solange ein Spotlight liegt.
 *
 * Steht bewusst NEBEN `SKILL_TREE_NODE_OPACITY.dimmed` (0,2) und bedeutet etwas
 * anderes:
 *
 *   • 0,3 hier — „ich zeige gerade woandershin". Der Zeiger wandert weiter, die
 *     anderen bleiben lesbar.
 *   • 0,2 dort — der ZWEIGFOKUS, eine Absicht des Spielers, die stehen bleibt,
 *     bis er sie zurücknimmt. Sie darf härter zugreifen.
 *
 * Liegen beide an, gewinnt der Fokus: er ist die dauerhafte Aussage.
 */
export const MEEP_SPOTLIGHT_DIM_OPACITY = 0.3
/** Dauer des einmaligen Rings, der beim Erscheinen der Marke aufgeht und vergeht. */
export const MEEP_SPOTLIGHT_PING_MS = 450

// ── Star Forge (Shop tab) ─────────────────────────────────────────────────────
// Tree geometry — the tree lives on a square stage, nodes placed on 7 polar rings.
/**
 * Gewachsen von 820, als der Bough-Ring dazukam. Bei 1040 GEBLIEBEN, als Ring 5
 * dazukam — und ein zweites Mal geblieben, als Ring 6 und 7 dazukamen. Das ist
 * der eigentliche Inhalt dieses Kommentars.
 *
 * ── Warum die Bühne für neue Ringe NICHT wächst ─────────────────────────────
 * Der erste Anlauf (Ring 5) setzte sie auf 1180 und den neuen Ring auf Radius
 * 570. Gemessen (Playwright, Full HD, voll ausgebauter Baum) war das Ergebnis
 * eindeutig schlechter: die Skalierung ist `(min(w,h) − 2·PAD) /
 * FORGE_STAGE_SIZE`, jeder Pixel Bühne verkleinert also JEDEN Knoten. Auf Full
 * HD fiel der Blattknoten von 35,4 auf 31,3 Bildschirmpixel und sein Glyph von
 * 16,8 auf 14,8 — unter die 18px-Grenze, ab der verschnörkelte `game-icons` zu
 * Grau zerfallen (CLAUDE.md, „Icons"). Ein neuer Ring, der die bestehenden
 * unleserlich macht, ist kein Zugewinn.
 *
 * Neue Ringe passen stattdessen in die BESTEHENDE Bühne, weil die Ringe darunter
 * zusammenrücken. Die Abstände waren grosszügiger als nötig; gemessen an den
 * Knotengrössen bleibt überall Luft (Rechnung an `FORGE_RING_BOUGH_R`).
 */
export const FORGE_STAGE_SIZE = 1040
/**
 * Die SIEBEN Ringe — einer je Sonnenphase, von innen nach aussen in der
 * Reihenfolge, in der die Sonne sie aufschliesst:
 *
 *   Komet → Rays · Spark → Branches · Dawn → Leaves · Zenith → Wards ·
 *   Swell → Covenants · Pyre → Crowns · Collapse → Boughs ∞
 *
 * **Von aussen nach innen zusammengerückt**, jedes Mal, wenn ein Ring dazukam —
 * die Bühne blieb, die Abstände gaben nach.
 *
 * Die Rechnung, die das absichert: kein Ringabstand darf kleiner sein als die
 * halben Knoten beider Ringe zusammen, sonst berühren sie sich.
 * `__tests__/config/forgeGeometry.spec.ts` rechnet sie bei jedem Lauf nach —
 * diese Tabelle ist die Herleitung, die Spec der Wächter.
 *
 *   Ring              Radius   Δ zum inneren   Knoten ⌀   nötig   Luft
 *   ───────────────────────────────────────────────────────────────────
 *   1 Rays              158          —            56        —      —
 *   2 Branches          221         63            46        51     12
 *   3 Leaves            276         55            38        42     13
 *   4 Wards             328         52            40        39     13
 *   5 Covenants         380         52            40        40     12
 *   6 Crowns            438         58            50        45     13
 *   7 Boughs            496         58            42        46     12
 *
 * Ring 1 sitzt bei 158 und nicht enger: die Sonne misst in der Endphase
 * `SHOP_SUN_MAX_DIAMETER` (240), ihr Rand liegt also bei 120, und die
 * Innenkante des Wurzelknotens bei 158 − 28 = 130. Zehn Pixel Luft zum Körper.
 *
 * Nach aussen ist 496 + halber Bough-Knoten (21) = 517 gegen die Bühnenhälfte
 * von 520 — drei Pixel, GENAU derselbe Randabstand wie zuvor mit fünf Ringen
 * (492 + 25). Zwei Ringe mehr haben den Baum also nicht an die Kante gedrückt;
 * sie haben nur die Luft aufgebraucht, die zwischen den alten Ringen stand.
 */
export const FORGE_RING_ROOT_R = 158
export const FORGE_RING_BRANCH_R = 221
export const FORGE_RING_LEAF_R = 276
export const FORGE_RING_WARD_R = 328
export const FORGE_RING_PACT_R = 380
export const FORGE_RING_CROWN_R = 438
export const FORGE_RING_BOUGH_R = 496

/**
 * Dieselben sieben Radien als Tabelle über der Ebene.
 *
 * Stand bis hierher als lokales `RING_RADIUS` in `ForgeTreePanel.vue`. Seit die
 * Streuung (`utils/ui/forgeTreeLayout.ts`) und ihre Spec dieselbe Zuordnung
 * brauchen, wäre das eine zweite Quelle gewesen — ein `Record` ohne `Partial`
 * erzwingt beim nächsten Ring ausserdem einen Typfehler statt eines stummen
 * Fehlverhaltens.
 */
export const FORGE_RING_RADIUS: Record<ForgeUpgradeTier, number> = {
  root: FORGE_RING_ROOT_R,
  branch: FORGE_RING_BRANCH_R,
  leaf: FORGE_RING_LEAF_R,
  ward: FORGE_RING_WARD_R,
  pact: FORGE_RING_PACT_R,
  crown: FORGE_RING_CROWN_R,
  bough: FORGE_RING_BOUGH_R,
}

/**
 * Der Speichenabstand des Katalogs: fünfzehn Winkel, alle 24° einer. Er ist die
 * Bezugsgrösse der Ringverdrehung — zwei Ringe liegen alle 24° wieder
 * deckungsgleich, gemessen wird deshalb modulo dieser Zahl.
 */
export const FORGE_SPOKE_PITCH_DEG = 24

/* ── Die Bühne trägt KEINE Ring-Beschriftungen ────────────────────────────────
 * Über jeder Ebene stand eine Pille mit ihrer Sonnenphase („Phase 1–2",
 * „Swell · open"). Sie sind ersatzlos entfallen, und zwar in zwei Schritten:
 * erst die Fassungen, die „→ locked" sagten, dann auch die der offenen Ebenen.
 *
 * Wer sie wieder einführen will, sollte zweierlei wissen. Erstens: sie stören im
 * Bild — der Baum hat achtzig Knoten, und sieben Textmarken dazwischen sind Lärm.
 * Zweitens: sie lagen hinter den Knoten. Bei 12 Uhr steht auf jedem Ring einer
 * (der Strahl `flightSpeed` zeigt mit 270° nach oben und zieht seine Kinder mit);
 * ein Versatz von 34 px in die Senke zwischen zwei Ringen hat das behoben, aber
 * die Marken blieben trotzdem Lärm.
 *
 * Die Auskunft steht seither dort, wo nach ihr gefragt wird: DASS ein Knoten zu
 * ist, sagt das Schloss an seinem Motiv (`FORGE_LOCK_ICON`); WELCHE Phase ihn
 * aufschliesst, sagen sein Tooltip und die Zeile in der Detailspalte.
 */

/* ── Das TIEFENFELD — die Ebenen ohne eine einzige Kreiskante ─────────────────
 *
 * Die Ringe waren bis hierher gezeichnete Linien, nach aussen immer
 * lückenhafter gestrichelt (5-5 · 4-7 · 3-9). Konzentrische Umrisse lasen
 * sich als Zielscheibe und behaupteten eine Grenze, die es nicht gibt: was eine
 * Ebene ausmacht, ist ihr ABSTAND zur Sonne, nicht ein Rand.
 *
 * Stattdessen liegt unter dem Baum EIN statischer `radial-gradient`, in dem
 * jeder Ringradius als weicher Kamm sitzt — ein Hauch der Leitfarbe der Ebene,
 * der nach beiden Seiten ausläuft. Die Ordnung bleibt lesbar, eine Kante
 * entsteht nirgends.
 *
 * Der Bühnenradius (`FORGE_STAGE_SIZE / 2` = 520) ist dabei die 100 %-Marke
 * eines `circle closest-side`; die Kämme liegen also bei 30,4 % (Rays), 42,5 %,
 * 53,1 %, 63,1 %, 73,1 %, 84,2 % und 95,4 % (Boughs). Gerechnet wird das in
 * `ForgeTreePanel` aus den Radien oben — hier steht keine dieser Prozentzahlen
 * ein zweites Mal.
 */
/**
 * Halbe Bandbreite, als Anteil des Bühnenradius.
 *
 * **Von 0,055 auf 0,045 gesenkt, als aus fünf Ringen sieben wurden.** Der
 * ENGSTE Kammabstand ist seither Leaves → Wards (und Wards → Covenants) mit
 * 10,0 Prozentpunkten statt der vorherigen 12,9. Bei 0,045 ist ein Band 9 pp
 * breit, zwischen zwei Bändern bleibt also 1 pp frei.
 *
 * Das ist die eigentliche Grenze dieser Zahl: überlappen zwei ausklingende
 * Kämme, addieren sich ihre Deckkräfte zu einem dritten, hellen Streifen
 * dazwischen — und der liest sich wieder als Linie, also als genau das, was hier
 * verschwinden sollte. Wer einen weiteren Ring einzieht, muss sie erneut senken;
 * `forgeGeometry.spec.ts` prüft die Bedingung.
 */
export const FORGE_DEPTH_CREST_SPREAD = 0.045
/** Deckkraft des Kamms einer OFFENEN Ebene, in ihrer Leitfarbe
 *  (`FORGE_UPGRADE_GROUPS[].accent` — eine Quelle für Chip, Liste und Feld). */
export const FORGE_DEPTH_CREST_ALPHA = 0.09
/**
 * Eine noch GESPERRTE Ebene: kalt und fast nichts. Trägt die Aussage der alten
 * gesperrten Ringfarbe (`#2a1a08`) weiter — sie ist da, aber sie gehört noch
 * nicht dem Spieler.
 */
export const FORGE_DEPTH_CREST_LOCKED = 'rgba(150, 165, 190, 0.03)'
/* ── Was hier NICHT steht: eine Vignette ──────────────────────────────────────
 * Der erste Anlauf legte über die Kämme einen zweiten Verlauf, der die Bühne
 * nach aussen abdunkelte (`transparent 46 % → rgba(4,3,0,0.42) 100 %`). Gemessen
 * (Playwright, 2560 × 1440, Zoom am unteren Anschlag) war das Ergebnis genau der
 * Fehler, der hier abgeschafft werden sollte: die Ebene ist QUADRATISCH und
 * trägt an ihrer Kante noch Farbe — das Feld stand als sichtbares Rechteck im
 * Sternenfeld. Aus der Kreiskante war eine Rechteckkante geworden.
 *
 * Ein `border-radius: 50 %` hätte daraus wieder einen Kreisumriss gemacht, ein
 * weiches Auslaufen vor dem Rand einen dunklen Ring genau dort, wo der
 * äusserste Kamm liegt (95,4 %). Die Tiefe tragen die Kämme allein.
 */
/**
 * Die Zone des GEWÄHLTEN Ringfilter-Chips ist breiter als der Ruhekamm — eine
 * Wahl soll als Fläche lesen und nicht als hellerer Kamm unter sechs gleich
 * geformten. Sie liegt allein auf ihrer Ebene, ein Überlappen wie oben kann
 * also nicht vorkommen.
 */
export const FORGE_DEPTH_ACCENT_SPREAD = 0.085
export const FORGE_DEPTH_ACCENT_ALPHA = 0.2
/** Ein- und Ausblenden der Akzentzone. Ausschliesslich `opacity` — der Verlauf
 *  selbst wird bei der Chipwahl einmal gesetzt, nie über Zeit gerechnet. */
export const FORGE_DEPTH_ACCENT_FADE_MS = 180

/* ── Die Ring-Leiter: EINE Sonnenphase, EIN Ring ──────────────────────────────
 *
 * Die Sonne hat sieben Anzeige-Phasen (Komet · Spark · Dawn · Zenith · Swell ·
 * Pyre · Collapse), der Baum hat sieben Ringe, und die Zuordnung ist eins zu
 * eins. Vorher war sie es nicht: Branches gingen in Zenith auf, der dritte
 * Zweig je Wurzel in Swell, die Blätter erst in Pyre — **Spark und Dawn
 * schalteten im ganzen Baum nichts frei**, und in der Endphase kamen zwei Ringe
 * auf einmal.
 *
 *   Komet    → Ring 1  Solar Rays        (immer offen, `solarUpgradeStore`)
 *   Spark  0 → Ring 2  Forge Branches
 *   Dawn   1 → Ring 3  Forge Leaves
 *   Zenith 2 → Ring 4  Astral Wards
 *   Swell  3 → Ring 5  Astral Covenants
 *   Pyre   4 → Ring 6  Astral Crowns     (+ `FORGE_CROWN_UNLOCK_PRESTIGES`)
 *   Collap.5 → Ring 7  Astral Boughs ∞
 *
 * Der endlose Ring bleibt der LETZTE: er ist das, was übrig ist, wenn die Sonne
 * fertig ist (Herleitung an `FORGE_BOUGH_COST_MULTIPLIER`).
 *
 * **Was die Freischaltung ersetzt, ist die Wirtschaft.** Ein Ring geht damit
 * deutlich früher auf als zuvor (Blätter ~18 min statt ~16,5 h). Getaktet wird
 * er trotzdem, nur nicht mehr von der Sonne: er gibt bei Freischaltung genau
 * EINE Stufe her (`FORGE_TIER_BASE_MAX_LEVEL`), und seine Rezeptur verlangt
 * Material, das es zu diesem Zeitpunkt kaum gibt. „Material ist der Taktgeber"
 * (docs/balance.md) gilt hier zum ersten Mal für den ganzen Baum.
 */
export const FORGE_BRANCH_UNLOCK_PHASE = 0
export const FORGE_LEAF_UNLOCK_PHASE = 1
export const FORGE_WARD_UNLOCK_PHASE = 2
export const FORGE_PACT_UNLOCK_PHASE = 3
export const FORGE_CROWN_UNLOCK_PHASE = 4
export const FORGE_BOUGH_UNLOCK_PHASE = 5

/**
 * ── Höchststufen: eine Regel für alle gedeckelten Ringe ──────────────────────
 *
 * `nodeMaxLevel` staffelte bisher nur die Zweige („3 + Phasen über der eigenen
 * Freischaltung"), die Blätter standen mit fest 4 daneben. Seit jede Phase einen
 * Ring öffnet, gilt für alle dasselbe:
 *
 *     maxLevel = min(cap[tier], BASE + (starPhase − def.phase))
 *
 * mit BASE = 1. Die Deckel sind so gewählt, dass **jeder Ring seinen Deckel
 * GENAU in der Endphase erreicht** — keiner steht vorher still, keiner ist
 * danach unfertig:
 *
 *   Ring        phase   Deckel   bei Freischaltung   in Collapse
 *   ──────────────────────────────────────────────────────────────
 *   Branches      0        6            1                6
 *   Leaves        1        5            1                5
 *   Wards         2        4            1                4
 *   Covenants     3        3            1                3
 *
 * Der Bezug ist `def.phase` und NICHT die globale Konstante — ein Knoten, der
 * ausnahmsweise später aufgeht, stünde sonst am Tag seiner Freischaltung schon
 * auf halber Höhe.
 *
 * **Warum BASE 1 und nicht 3 wie zuvor.** Mit 3 stünde ein Zweig schon in Spark
 * auf drei von sechs Stufen und wäre in Zenith fertig — die drei Phasen danach
 * hätten ihm nichts mehr zu geben. Mit 1 ist jede Sonnenevolution ZWEI
 * Ereignisse zugleich: ein neuer Ring **und** eine neue Stufe auf jedem Ring,
 * der schon offen ist.
 */
export const FORGE_TIER_BASE_MAX_LEVEL = 1
/**
 * Von 5 auf 6 gehoben, als die Codex-Bahn „Sunsmith" unerreichbar war (ihr
 * Maximum lag bei 10 Branches × 5 + 10 Leaves × 3 + 6 Relikte × 3 = 98). Seither
 * unverändert — und jetzt zugleich die Zahl, die die Leiter oben schliesst:
 * Freischaltung in Phase 0, Deckel in Phase 5.
 *
 * Die Materialkosten skalieren mit der Stufe (`qty × nextLevel`) und ziehen
 * damit am selben Strang wie die Tier-Tore — eine Quelle, mehrere Verbraucher,
 * sechs Slots, eine Entscheidung.
 */
export const FORGE_BRANCH_MAX_LEVEL_CAP = 6
export const FORGE_LEAF_MAX_LEVEL = 5
export const FORGE_WARD_MAX_LEVEL = 4
export const FORGE_PACT_MAX_LEVEL = 3
/** Parent level required before a child node can be bought. */
export const FORGE_BRANCH_PARENT_MIN_LEVEL = 1
export const FORGE_LEAF_PARENT_MIN_LEVEL = 2
/**
 * Ward und Covenant verlangen je zwei Stufen des Rings direkt innen.
 *
 * Nicht mehr: in der Phase, in der ein Ring aufgeht, steht sein Elternring auf
 * genau zwei (`FORGE_TIER_BASE_MAX_LEVEL` + 1). Eine Hürde von 3 wäre also nicht
 * streng, sondern schlicht unerfüllbar, und der Ring ginge eine Phase zu spät
 * auf — die Leiter wäre kaputt, ohne dass es an ihrer Tabelle zu sehen wäre.
 */
export const FORGE_WARD_PARENT_MIN_LEVEL = 2
export const FORGE_PACT_PARENT_MIN_LEVEL = 2
/**
 * Der Bough hängt am COVENANT darunter, nicht an der Krone daneben.
 *
 * Die Krone kostet 2,5e10 Chimes und einen Aufbruch; der endlose Ring ist die
 * einzige Chime-Senke, die dem Spätspiel bleibt. Läge er hinter einem
 * Einmalkauf, hätte ein Spieler ohne Prestige in der Endphase gar nichts mehr
 * zu kaufen — genau das Loch, das der Ring stopfen sollte.
 *
 * Zwei Stufen, wie bei Ward und Covenant: der Covenant-Ring steht in der
 * Endphase auf drei, die Hürde ist also spürbar und trotzdem erreichbar.
 */
export const FORGE_BOUGH_PARENT_MIN_LEVEL = 2

/**
 * ── Ring 6: Astral Crowns ────────────────────────────────────────────────────
 *
 * Fünfzehn Knoten, drei je Wurzelachse, und jeder nur EINMAL zu haben. Sie sind
 * die Antwort auf ein Loch, das die Boughs offengelassen haben: der endlose
 * Ring gibt dem Spätspiel eine Senke, aber keine ÜBERRASCHUNG mehr — Stufe 24
 * fühlt sich an wie Stufe 23, nur teurer. Was ab hier fehlte, war nicht mehr
 * Zahl, sondern eine neue Regel.
 *
 * **Warum das Prestige-Tor NEBEN dem Phasen-Tor stehen bleibt.** Seit die Ringe
 * eine Leiter bilden, hat der Kronen-Ring eine eigene Sonnenphase (Pyre,
 * `FORGE_CROWN_UNLOCK_PHASE`) — die Bedingung hier ersetzt sie nicht, sie kommt
 * dazu. Das Prestige war für den Shop sonst gar kein Ereignis: es räumt Chimes,
 * Level, Augments und Gebäude ab, den Sternbaum aber ausdrücklich NICHT
 * (`gameStore.executePrestigeReset`, „Der Meep-Baum bleibt STEHEN" — für Forge
 * und Sonne gilt dasselbe, sie werden dort schlicht nicht angefasst). Die Krone
 * ist damit genau das, was den Aufbruch überdauert hat, und der einzige Grund,
 * aus dem der Shop einen Prestige-Zähler überhaupt liest.
 *
 * **Warum EINE Stufe.** Ein Crown verschiebt eine Regel („der Boss-Zoll kippt",
 * „die Sonne kommt einmal je Phase zurück"). Eine Regel, die man ein zweites
 * Mal kaufen kann, ist keine Regel mehr, sondern ein Prozentwert mit
 * Zwischenschritten. Der endlose Ring daneben deckt die andere Hälfte ab —
 * beides am selben Knoten ginge nicht.
 */
export const FORGE_CROWN_UNLOCK_PRESTIGES = 1
export const FORGE_CROWN_MAX_LEVEL = 1
/**
 * Der Covenant darunter muss auf dieser Stufe stehen — dem Deckel, den Ring 5 in
 * Pyre erreicht (`FORGE_TIER_BASE_MAX_LEVEL` + (4 − 3) = 2). Mehr zu verlangen
 * hiesse, den Kronen-Ring eine Phase später aufgehen zu lassen, als seine Zeile
 * in der Leiter behauptet.
 */
export const FORGE_CROWN_PARENT_MIN_LEVEL = 2
/**
 * Einheitlicher Chime-Preis einer Krone.
 *
 * Eine Zehnerpotenz über dem Einstieg der Boughs (2e9), und für alle fünf
 * gleich: der Ring stellt keine Preisfrage, sondern eine Reihenfolgefrage. Wer
 * hier steht, hat ein Universum hinter sich — die Entscheidung soll lauten
 * „welche Regel zuerst", nicht „welche ist billig". Die Materialrezepturen
 * unterscheiden sich dagegen sehr wohl; sie sind der echte Taktgeber (dieselbe
 * Rolle wie bei den späten Blättern).
 */
export const FORGE_CROWN_BASE_COST = 2.5e10
/* Der Kronen-Ring trug als einziger ein Etikett aus eigener Bedingung statt aus
 * einer Sonnenphase („Beyond the sun · open"). Das ist mit den übrigen
 * Ring-Pillen entfallen — und seit die Ringe eine Leiter bilden, hätte es auch
 * keinen Sonderfall mehr zu beschreiben: der Ring hat seine Phase wie jeder
 * andere. Ob sein zweites Tor offen ist, beantwortet
 * `starForgeStore.crownsUnlocked`. */
/**
 * Was in der Upgrade-Liste dort steht, wo jeder andere Ring seinen Wert zeigt.
 *
 * Eine Krone hat keinen Wert je Stufe — sie verschiebt eine Regel. Ein
 * Zahlenpaar „jetzt → danach" wäre hier „0 → 0"; der Zustand ist die Auskunft.
 */
export const FORGE_CROWN_STATE_OPEN = 'Not yet'
export const FORGE_CROWN_STATE_FORGED = 'Forged'
/**
 * Warum eine Krone zu ist, wenn die Sonne schon weit genug steht.
 *
 * Vorher gab es diesen Satz nicht, und der Ring nannte in diesem Fall die
 * Elternstufe — also eine Bedingung, die längst erfüllt war. Das fiel kaum auf,
 * solange das Phasen-Tor in der ENDPHASE lag: wer dort steht, hat meist längst
 * ein Universum hinter sich. Seit der Ring in Pyre aufgeht, ist der Zustand
 * „Phase reicht, Aufbruch fehlt" der Normalfall und braucht seinen eigenen Satz.
 */
export const FORGE_CROWN_LOCK_REASON = 'Leave a universe behind first'

/**
 * Ring 7 kennt keine Obergrenze. Das ist der Punkt: die Sonnenrampe endet nach
 * rund 44 Spielstunden, danach steht im ganzen Baum nur noch „✦ MAX" — und
 * Chimes haben im Spätspiel ausser den Planeten-Leveln keine Senke.
 *
 * Sicher ist das NUR in dieser Kombination, und sie ist keine Geschmacksfrage:
 *
 *   Wirkung je Stufe ADDITIV  (+5 % CpS, nicht ×1,05)
 *   Kosten je Stufe GEOMETRISCH (`FORGE_BOUGH_COST_MULTIPLIER`)
 *
 * Der Ertrag wächst dann linear (`1 + 0,03·n`), der Preis exponentiell
 * (`1,35ⁿ`). Die Amortisationszeit einer Stufe ist `P(n) = P(1)·1,35ⁿ⁻¹` — das
 * Verhältnis `P(n+1)/P(n)` ist 1,35, UNABHÄNGIG von der CpS des Spielers. Ein
 * höheres Einkommen verschiebt die Kette nur nach rechts, es ändert ihre
 * Steigung nicht. Ein Knoten, der die CpS erhöht, mit der er bezahlt wird, kann
 * sich damit NIE selbst tragen. Multiplikativ gestapelt — zehn Boughs zu je
 * ×1,03 — stünde `1,03^(10n)` gegen `1,35ⁿ`, und der Kreis wäre offen:
 * dieselbe Fehlerklasse wie der Overclock-Stapel (docs/balance.md).
 *
 * **Warum 1,35 und nicht flacher.** Der Multiplikator ist der einzige
 * Parameter, der die LÄNGE des endlosen Rings bestimmt; `baseCost` verschiebt
 * nur den Anfang. Weil Boughs kein Material verlangen, bremst sie nichts als
 * die Geometrie: bei 1,22 kaufte ein gesparter Chime-Berg von 1e13 auf einen
 * Schlag 33 Stufen, bei 1,35 sind es 24. Wirkt der Einstieg zu zäh, senke
 * `baseCost` — NIE den Multiplikator.
 *
 * Zweite Bedingung: nur UNGEDECKELTE Achsen. Ausgeschlossen sind nicht nur die
 * harten Kappen (`FORGE_MIN_DAMAGE_TAKEN_MULT`, `FORGE_MIN_DWELL_MULT`,
 * `FORGE_MIN_EXPEDITION_MULT`, `FORGE_MAX_DOUBLE_CLICK_CHANCE`), sondern auch
 * drei Achsen, die STILL sättigen und deshalb genauso ein bezahltes Nichts
 * wären:
 *   • `materialDropMult` — `inventoryStore.tryDropMaterial` vergleicht
 *     `Math.random() > chance`. Seit dem Überlauf dort (siehe
 *     `MATERIAL_DROP_OVERFLOW_MAX_EXTRA`) verfällt der Teil über 1 nicht mehr,
 *     aber er ist auf drei Extrastücke gedeckelt — die Achse sättigt damit
 *     weiterhin, nur später und sichtbar statt lautlos.
 *   • `championDpsMult` — steckt über `combatStore.fullOrbitDps()` in
 *     `otherDps` und hebt damit die Boss-HP gleich mit (docs/balance.md). Für
 *     KLICKschaden gilt das seit der Zwei-Kanal-Rechnung nicht mehr — er steht
 *     nicht im Schätzer und sättigt daher nicht.
 *   • `extraDropCount` — `addMaterial(id, source, qty)` bucht `qty` roh in den
 *     Bestand; eine Bruchzahl je Stufe hinterliesse Materialien mit
 *     Nachkommastellen.
 */
export const FORGE_BOUGH_COST_MULTIPLIER = 1.35
/** Each leaf level amplifies its parent branch's effect by this fraction. */
export const FORGE_LEAF_AMPLIFY_PER_LEVEL = 0.25

/**
 * Die Stufe, auf der ein Vorgaenger stehen muss, damit ein VAULT-Eintrag
 * ausliegt — Relikte und Konstellationen gemeinsam.
 *
 * Hiess einmal `FORGE_CONSTELLATION_REQUIRED_LEVEL` und wurde nur von einem
 * Getter gelesen; die Relikte trugen dieselbe Drei stattdessen neun Mal von
 * Hand im Katalog (`requiresLevel: 3`). Zwei Fassungen derselben Zahl, und
 * eine davon unsichtbar — seit beide Vault-Arten dieselbe `requires`-Liste
 * fuehren, steht sie einmal hier und einmal sichtbar im Katalog (`vaultReq`).
 *
 * **Sie ist eine VORGABE, keine Regel.** Ein Eintrag darf eine andere Stufe
 * nennen, und die neuen tun es auch: ein Blatt oder Ward auf 2 ist zum selben
 * Zeitpunkt erreichbar wie ein Zweig auf 3 (`min(cap, 1 + Phase − Ringphase)`),
 * und genau deshalb kostet die zweite Bedingung dort keinen einzigen Tag.
 */
export const FORGE_VAULT_REQUIRED_LEVEL = 3
/** Dieselbe Verstärkung in Prozent — für die Beschreibungstexte im Baum. */
export const FORGE_LEAF_AMPLIFY_PER_LEVEL_PCT = FORGE_LEAF_AMPLIFY_PER_LEVEL * 100

/**
 * Wirkung der geschmiedeten Konstellationen. Die Zahlen stehen zusätzlich als
 * Prozentangabe im `desc`-Text der jeweiligen Definition in config/progression/starForge.ts
 * — ändert sich eine, muss der Text mitgeführt werden.
 */
export const FORGE_CONSTELLATION_BULWARK_DAMAGE_MULT = 0.9
export const FORGE_CONSTELLATION_STELLAR_WIND_CPS_MULT = 1.18
export const FORGE_CONSTELLATION_GOLDEN_TEMPEST_CPC_MULT = 1.12
/**
 * Chance, dass ein VERDOPPELTER Klick zusätzlich Material lockert
 * (Caretaker's Ledger).
 *
 * Der Wurf hängt am Treffer des Doppelklicks und nicht am Klick selbst: sonst
 * hinge die Ausbeute an der Klickrate des Spielers statt am Ausbau seines
 * Baums, und ein Autoclicker wäre die beste Materialquelle im Spiel. So steht
 * eine Obergrenze darüber, die er nicht überschreiten kann — die
 * Doppelklick-Chance selbst.
 *
 * 8 % auf einen Treffer, der bei Vollausbau in 80 % der Klicks fällt: rund
 * jeder fünfzehnte Klick. Neben einem Ressourcenstern, der ein Vielfaches auf
 * einmal abwirft, ist das ein stetiger Bodensatz und keine zweite Ernte.
 */
export const FORGE_LEDGER_CLICK_DROP_CHANCE = 0.08
/**
 * Wie viel des Void-Zolls das Riftwarden's Seal höchstens abkauft.
 *
 * Der Void ist das einzige System, das GEGEN den Spieler drängt (CLAUDE.md);
 * ein Zoll, den man vollständig abkaufen kann, ist keiner mehr. Bei 60 % bleibt
 * von einer Drossel auf ×0,5 immer noch ×0,8 stehen — spürbar genug, dass das
 * Schliessen des Risses die Handlung bleibt, und mild genug, dass fünf
 * Relikt-Stufen sich lohnen.
 *
 * Das Siegel erreicht die Kappe bei Vollausbau (5 × 12 = 60 %) exakt. Das ist
 * Absicht und keine tote Stufe: die fünfte ist die, die sie erreicht.
 */
export const FORGE_VOID_RELIEF_CAP = 0.6
/**
 * Untergrenze des Meep-Anforderungsfaktors (Meep Shrine).
 *
 * Die Ausbeute steht als WURZEL auf der Anforderung — halbiert man sie, steigt
 * die Ernte um √2. Der Boden hält das Relikt in einem Bereich, in dem es
 * spürbar ist (5 × 4 % → ×0,8 → +12 % Meeps), ohne die Prestige-Achse zu
 * verschieben, an der die ganze Meep-Wirtschaft hängt (docs/balance.md).
 */
export const FORGE_MEEP_COST_FLOOR = 0.7
/** Stunden, die „Echo of the Void" an die Offline-Obergrenze hängt. */
export const FORGE_RELIC_OFFLINE_HOURS = 4
/** Stunden, die „Starfarer's Compact" zusätzlich anhängt. */
export const FORGE_COMPACT_OFFLINE_HOURS = 8

/**
 * Die Handelsarten, bei denen `materials` der PREIS ist und nicht die Ware.
 *
 * Das Feld trägt zwei Bedeutungen: bei `materials` und `gold` steht dort, was
 * der Spieler BEKOMMT bzw. HERGIBT. Solange nur der Gold-Handel bezahlte, stand
 * die Unterscheidung als `def.kind === 'gold'` an zwei Stellen im Store
 * (`canBuyBargain` und `buyBargain`) — mit `voidPurge` als drittem Fall wäre
 * daraus an beiden Stellen eine wachsende Oder-Kette geworden, und ein
 * vergessenes Glied hiesse: der Handel prüft die Kosten, zieht sie aber nie ab.
 *
 * Als Satz an EINER Stelle ist die Frage „zahlt dieser Handel mit Material?"
 * einmal beantwortet.
 */
export const FORGE_BARGAIN_KINDS_PAYING_MATERIALS: readonly ForgeBargainKind[] = [
  'gold',
  'voidPurge',
]

/**
 * ── Was die fünf Kronen tun ──────────────────────────────────────────────────
 * Keine davon ist ein Multiplikator. Jede beantwortet eine Frage, auf die der
 * Spieler bis dahin keine Antwort kaufen konnte.
 */
/**
 * Tideless Watch: der Void-Zoll wirkt nur noch zu diesem Anteil.
 *
 * Multipliziert sich MIT dem Riftwarden's Seal, statt sich zu addieren — und
 * bleibt zusammen mit ihm unter `FORGE_VOID_RELIEF_CAP`. Zwei Quellen, die sich
 * zu 100 % Milderung summieren könnten, hätten den Void abgeschafft; so
 * schieben sie ihn gemeinsam an denselben Boden.
 */
export const FORGE_CROWN_VOID_RELIEF = 0.5
/**
 * Tideless Watch, zweite Hälfte: Faktor auf die Chime-Ausschüttung eines
 * erlegten Void-Wesens. Der Riss nimmt weniger UND was man ihm abnimmt, zahlt
 * mehr — dieselbe Aussage von beiden Seiten.
 */
export const FORGE_CROWN_VOID_SLAY_REWARD_MULT = 2
/**
 * Warden's Reprieve: auf diesen Anteil der Höchst-HP kehrt die Sonne zurück,
 * wenn sie fällt — einmal je Sonnenphase.
 *
 * Die Hälfte und nicht voll: der Aufschub soll den Einschlag überstehen lassen,
 * nicht ihn löschen. Zurück auf 100 % hiesse, dass die zweite Welle denselben
 * Weg noch einmal von vorn gehen müsste.
 */
export const FORGE_CROWN_REPRIEVE_FRACTION = 0.5
/**
 * Sunderer's Mark: unterhalb dieses Anteils seiner HP kippt der Zoll eines
 * Bosses — aus `1 − BOSS_CPS_PENALTY_FRACTION` wird `1 + …`.
 *
 * Die Hälfte ist der Punkt, an dem ein Boss-Kampf entschieden aussieht, aber
 * noch dauert. Höher angesetzt wäre der Zoll faktisch abgeschafft (er zündete
 * fast sofort), tiefer wäre er ein Trostpreis für die letzten Sekunden.
 */
export const FORGE_CROWN_BOSS_FLIP_HP_FRACTION = 0.5
/**
 * Midas Overflow: Anteil des Chime-Bestands, der je Sekunde in Stardust
 * umschlägt — und die harte Obergrenze dafür.
 *
 * Der Handel greift erst über `FORGE_CROWN_OVERFLOW_MIN_CHIMES`. Das ist keine
 * Bequemlichkeit, sondern die Bedingung, unter der er nicht die Wirtschaft
 * ersetzt: unterhalb dieser Marke sind Chimes noch die knappe Grösse, und ein
 * Abfluss dorthin nähme dem Baum sein Wachstum. Darüber sind sie im Spätspiel
 * das, was sie sind — ein Berg ohne Senke.
 *
 * Der Stück-Deckel je Sekunde ist Pflicht: Material ist der Taktgeber der
 * späten Forge, und ein Zufluss, der mit dem Bestand skaliert, wäre die
 * exponentielle Kurve der Chimes auf einer linearen Achse.
 */
export const FORGE_CROWN_OVERFLOW_FRACTION_PER_SEC = 2e-9
export const FORGE_CROWN_OVERFLOW_MIN_CHIMES = 1e9
export const FORGE_CROWN_OVERFLOW_MAX_PER_SEC = 2
/** Welches Material der Überlauf ausschüttet — das gewöhnlichste, mit Absicht. */
export const FORGE_CROWN_OVERFLOW_MATERIAL = 'stardust'

/* ── Der ZUSAMMENLAUF: Kronen, die mehrere Vorgänger verlangen ────────────────
 *
 * Bis hierher hatte jeder Knoten des Baums GENAU einen Vorgänger, und die
 * Freischaltung war eine einzige Zahl. Der Baum war damit eine reine Kette:
 * Strahl → Zweig → Blatt → Ward → Covenant → Krone. Es gab keine Stelle, an der
 * zwei Entwicklungslinien zusammenkommen mussten.
 *
 * Der Kronen-Ring ist der Ort dafür, und das ist keine Geschmacksfrage:
 *
 *   • Er kauft als einziger keine ZAHL, sondern eine REGEL. Ein Zusammenlauf
 *     mehrerer Bedingungen ist eine Regel, kein Prozentwert mit Zwischenschritten.
 *   • Er hat als einziger Platz: fünf von fünfzehn Speichen waren belegt. Die
 *     Ringe 2–5 stehen auf 15/15, und `forgeRingLadder.spec.ts` verbietet einen
 *     zweiten Knoten je Ring und Speiche.
 *   • Kronen zählen NICHT in die Codex-Bahn „Sunsmith" (`achievementStore`
 *     überspringt `crownLevels`). Neue Kronen verschieben deshalb weder das
 *     erreichbare Maximum noch die Endstufe — die Bahn bleibt unberührt. Ein
 *     neuer Zweig oder Ward hätte sie still verschenkt.
 *
 * Die zehn Kronen tragen jetzt ZWEI Fassungen derselben Idee, und der Kontrast
 * ist der Inhalt: die fünf alten verlangen ihre EIGENE Achse bis nach unten
 * (`FORGE_CROWN_OWN_WARD_LEVEL`), die fünf neuen den Zusammenlauf zweier
 * FREMDER Achsen.
 */
/**
 * Was ein Zusammenlauf von einem fremden Zweig, Blatt oder Ward verlangt.
 *
 * Die Zahlen sind an der Erreichbarkeit geeicht, nicht am Gefühl. In Pyre — der
 * Phase, in der der Kronen-Ring aufgeht — gilt `min(cap, 1 + 4 − phase)`:
 *
 *   Zweig 5 · Blatt 4 · Ward 3 · Covenant 2
 *
 * Jede Forderung unten liegt genau EINE Stufe darunter: spürbar, aber nie
 * unerfüllbar. Eine Krone, die man nicht aufschliessen kann, wäre dieselbe
 * Fehlerklasse wie eine Codex-Bahn, die man nicht abschliessen kann —
 * `forgeRequirements.spec.ts` rechnet es bei jedem Lauf nach, statt es zu
 * glauben.
 */
export const FORGE_CONJUNCTION_BRANCH_LEVEL = 4
export const FORGE_CONJUNCTION_LEAF_LEVEL = 3
export const FORGE_CONJUNCTION_WARD_LEVEL = 2
/**
 * Was eine der fünf ALTEN Kronen zusätzlich von dem Ward ihrer eigenen Speiche
 * verlangt.
 *
 * Drei und nicht zwei: der Covenant darüber verlangt bereits Ward Lv 2
 * (`FORGE_PACT_PARENT_MIN_LEVEL`), und wer die Krone erreicht, hat den Covenant.
 * Eine Zwei wäre also beim Kauf automatisch erfüllt und damit reine Zierde. Drei
 * ist der Pyre-Deckel des Ward-Rings — die Forderung lautet „diese Achse ganz
 * nach unten", und mehr gibt es dort nicht.
 */
export const FORGE_CROWN_OWN_WARD_LEVEL = 3

/* ── Was die fünf neuen Kronen bewirken ───────────────────────────────────────
 * Wie bei den fünf alten: die Regel steht als Konstante hier und wird von genau
 * EINEM Getter im Store gelesen; `desc` sagt sie im Klartext, ohne `{v}`.
 *
 * Geprüft gegen `docs/balance.md`: keine hebt `otherDps` (das kürzt sich gegen
 * die Boss-HP weg), keine sättigt still (keine Chance-Achse), keine
 * multipliziert die CpS, mit der sie bezahlt wird. Jede ist durch ein EREIGNIS
 * begrenzt — ein Fehlschlag, ein Planet, ein Angebot, eine Stunde, ein Match.
 */
/** Pilgrim's Accord: Anteil der Rezeptur, den eine GESCHEITERTE Expedition
 *  trotzdem heimbringt. Eins — der Fehlschlag kostet weiterhin die Zeit und den
 *  Chime-Lohn, nur das Material bleibt. */
export const FORGE_CROWN_FAILED_EXPEDITION_MATERIAL_SHARE = 1
/* Stillpoint braucht keine Zahl — die Regel ist ein Ja/Nein, wie bei Warden's
 * Reprieve. Sie hält die Despawn-Frist eines Ressourcensterns an, SOLANGE auf
 * ihm gekämpft wird.
 *
 * Warum diese Fassung und nicht „der letzte Planet bleibt stehen": ein Planet,
 * der ohne Kampf gutgeschrieben wird, müsste die Boss-Beute ohne Boss-Kill
 * buchen — eine zweite Auszahlungsstelle neben `planetBossStore`, und damit
 * genau die Art zweiter Wahrheit, die der Baum sonst überall vermeidet. Diese
 * Fassung fügt keine Auszahlung hinzu; sie nimmt nur die Uhr aus dem Spiel,
 * solange der Spieler wirklich davorsteht. Begrenzt ist sie durch die
 * Enrage-Uhr der Bosse, die weiterläuft — der Stern wartet, der Boss nicht. */
/** Reclaimed Bargain: Preisanteil, zu dem ein verfallenes Angebot ein zweites
 *  Mal ausliegt. Halb, und nur EINMAL je Angebot — danach rotiert es normal. */
export const FORGE_CROWN_RECLAIMED_PRICE_MULT = 0.5
/** Tireless Quarry: wie lange die Harvester nach dem Schliessen des Tabs
 *  weiterarbeiten. Eine Stunde ist ein FENSTER und keine Rate — die Achse kann
 *  damit nicht davonlaufen, egal wie lange jemand fortbleibt. */
export const FORGE_CROWN_OFFLINE_HARVEST_HOURS = 1
/* Steadfast Tribute ist ebenfalls ein Ja/Nein: es nimmt dem Honor-Tribut den
 * Niederlagen-Abschlag (`HONOR_LOSS_TRIBUTE_MULT`, 0,5). Die Zahl steht dort und
 * nicht hier — eine zweite Konstante daneben wäre eine zweite Wahrheit über
 * denselben Abschlag, und der LP-Verlust einer Niederlage bleibt ohnehin. */

/* ── Was die fünf DRITTEN Kronen bewirken ───────────────────────────────
 * Der Ring trägt jetzt DREI Fassungen desselben Gedankens, und die Reihe ist
 * der Inhalt: die eigene Achse bis nach unten (ein Vorgaenger), der
 * Zusammenlauf zweier fremder Achsen (zwei), das Zusammentreffen dreier
 * (`FORGE_CONJUNCTION_*` unveraendert — ein Zweig, ein Blatt, ein Ward, jeder
 * von einer anderen Wurzel).
 *
 * Geprüft gegen `docs/balance.md` wie die zehn davor: keine hebt `otherDps`,
 * keine sättigt still, keine multipliziert die CpS, mit der sie bezahlt wird.
 * Jede ist durch ein EREIGNIS begrenzt — eine Rueckkehr, ein zweiter Riss, ein
 * Faehigkeitsfenster, ein laufendes Vorzeichen, ein entkommener Boss.
 */
/** Homeward Sky: wie viele Drifter auf die Rueckkehr warten. EINER — ein
 *  FENSTER wie bei Tireless Quarry und keine Rate. Wer drei Tage fortbleibt,
 *  findet denselben einen vor wie nach zwei Stunden; die Achse kann damit
 *  nicht davonlaufen. */
export const FORGE_CROWN_OFFLINE_DRIFTER_COUNT = 1
/** Sealed Threshold: welchen Anteil seines Zolls ein Riss noch nimmt, der
 *  einschlaegt, während die Nachwirkung eines anderen noch laeuft. NULL —
 *  dieselbe Form wie `FORGE_CROWN_FAILED_EXPEDITION_MATERIAL_SHARE`.
 *
 *  Es ist der erste Kauf gegen die eigentliche Todesspirale des Void: nicht
 *  gegen den einzelnen Riss, sondern gegen Risse, die sich STAPELN. Die
 *  Nachwirkung selbst wird trotzdem gebucht — der Riss bleibt sichtbar, nur
 *  seine Rechnung ist bezahlt. */
export const FORGE_CROWN_STACKED_RIFT_TOLL_SHARE = 0
/* Sanctum Veil braucht keine Zahl — die Regel ist das Fenster selbst: solange
 * eine Bard-Faehigkeit noch wirkt, reisst der Void keinen Riss auf. Kein
 * Dauerzustand: Q wirkt augenblicklich, W/E/R haengen an Abklingzeiten, deren
 * Boden `FORGE_MIN_BARD_COOLDOWN_MULT` (0,8) sichert. Der faellige Spawn wird
 * nicht verschluckt, sondern auf den Wiederholungstakt gestellt — dasselbe
 * Idiom, das der Store schon nutzt, wenn keine Definition gezogen werden
 * konnte. */
/** Unfailing Sign: unter diesen Anteil ihrer Höchst-HP kann die Sonne nicht
 *  fallen, solange ein Vorzeichen-Lohn laeuft. Das Vorzeichen wird damit zum
 *  Schutzschirm — wer liest, was der Kosmos ankündigt, überlebt es.
 *
 *  Die Klemme sitzt in `playerStore.takeDamage()` und nicht beim Void: VIER
 *  Quellen buchen Schaden (Void-Einschlag, Boss-Enrage, Rift-Nachwirkung,
 *  Kampf), und eine Klemme je Quelle waeren vier Wahrheiten über denselben
 *  Boden. */
export const FORGE_CROWN_OMEN_HP_FLOOR_FRACTION = 0.5
/** Remembered Wound: mit höchstens diesem Anteil seiner HP steht ein
 *  entkommener Planeten-Boss wieder auf.
 *
 *  Ein BODEN und keine Zusage: ohne ihn erschiene ein Boss, den man bis auf
 *  einen Splitter heruntergeprügelt hat, praktisch tot — und ein Gegner mit
 *  null HP ist kein Kampf mehr, sondern ein Klick.
 *
 *  **`maxHP` bleibt unangetastet.** Verschoben wird nur der STARTWERT; die
 *  Boss-HP-Formel mit `otherDps` wird nicht angefasst — dieselbe Trennung wie
 *  bei `hollowCore`, das am Ergebnis dreht und nicht am Schaden. */
export const FORGE_CROWN_BOSS_WOUND_FLOOR = 0.15

/** Twinned Sky (Konstellation): wie viele Drifter ZUSÄTZLICH am Himmel stehen
 *  dürfen. Einer — aus zwei auf einmal wird eine Wahl, aus fünf ein Teppich,
 *  auf dem kein einzelner mehr etwas bedeutet. */
export const FORGE_TWINNED_SKY_EXTRA_DRIFTERS = 1

/** Obergrenzen, damit gestapelte Forge-Effekte den Spielablauf nicht brechen. */
export const FORGE_MIN_DAMAGE_TAKEN_MULT = 0.25
export const FORGE_MIN_DWELL_MULT = 0.5
export const FORGE_MIN_EXPEDITION_MULT = 0.4
export const FORGE_MAX_DOUBLE_CLICK_CHANCE = 0.8

/* ── Ring 4 & 5: die Böden der neuen Achsen ───────────────────────────────────
 *
 * Jede Achse, die eine DAUER oder einen PREIS kürzt, bekommt einen Boden — aus
 * demselben Grund wie die vier Kappen darüber: eine Zeit, die gegen null läuft,
 * ist kein Ausbau mehr, sondern das Abschalten eines Systems.
 *
 * Alle Böden unten sind so gewählt, dass der VOLLAUSBAU des jeweiligen Knotens
 * sie **erreicht, aber nicht überschreitet** — ein Ward hat vier Stufen, ein
 * Covenant drei, und die letzte davon ist die, die den Boden berührt. Anders als
 * bei Solar Sails oder Golden Echo gibt es hier also nichts zu schlucken und
 * damit auch keinen Überlauf: der Bodensatz ist der Entwurf, nicht ein Rest.
 */
/** Bard-Abklingzeiten (Chime Conduit, 4 × 5 % = 20 %). */
export const FORGE_MIN_BARD_COOLDOWN_MULT = 0.8
/** Gebäudepreise (Kiln Subsidy, 4 × 4 % = 16 %). Bewusst klein: die Gebäude sind
 *  eine der wenigen Chime-Senken, und ihre Kurve ist geometrisch — ein tiefer
 *  Rabatt verschöbe sie nur um wenige Stufen, ein flacher tut dasselbe billiger. */
export const FORGE_MIN_BUILDING_COST_MULT = 0.84
/** Item-Preise (Merchant's Favor, 4 × 6 % = 24 %). */
export const FORGE_MIN_ITEM_COST_MULT = 0.76
/** Champion-Levelkosten (Alms of the Keeper, 4 × 5 % = 20 %). */
export const FORGE_MIN_CHAMPION_LEVEL_COST_MULT = 0.8
/**
 * ── Die vier Void-Achsen ─────────────────────────────────────────────────────
 *
 * Der Void ist das EINZIGE System, das gegen den Spieler drängt (CLAUDE.md).
 * Alle vier mildern ihn, keine schaltet ihn ab: ein Riss reisst weiterhin auf,
 * kriecht weiterhin zur Sonne, kostet weiterhin Meeps und hinterlässt weiterhin
 * seine Drossel — er lässt nur jeweils mehr Luft.
 *
 * Zwei davon sind Multiplikatoren NACH OBEN (längerer Abstand, längerer Anflug),
 * zwei nach unten. Die Grenzen liegen jeweils dort, wo der Vollausbau des
 * Knotens ankommt — keine tote Stufe, aber auch keine Reserve für einen
 * späteren Verstärker.
 */
/** Spawnabstand (Rift Anchor, 4 × 8 % = 32 %; Reserve bis 40 %). */
export const FORGE_MAX_VOID_SPAWN_INTERVAL_MULT = 1.4
/** Anflugdauer (Gravity Well, 4 × 10 % = 40 %; Reserve bis 60 %). */
export const FORGE_MAX_VOID_TRAVEL_MULT = 1.6
/** Meep-Verlust beim Einschlag (Hollow Pact, 3 × 12 % = 36 %). Ein Einschlag
 *  muss WEHTUN — der Zoll wird verhandelt, nicht erlassen. */
export const FORGE_MIN_VOID_MEEP_LOSS_MULT = 0.64
/** Laufzeit der Nachwirkung (Unbroken Pact, 3 × 10 % = 30 %). */
export const FORGE_MIN_VOID_AFTERMATH_MULT = 0.7
/** Drifter-Abstand (Wanderer's Beacon, 4 × 6 % = 24 %) und Vorzeichen-Abstand
 *  (Omen-Reader, 4 × 6 % = 24 %). Beides sind Angebote, die der Spieler ANNEHMEN
 *  muss; häufiger heisst mehr Entscheidungen, nicht automatisch mehr Ertrag. */
export const FORGE_MIN_DRIFTER_INTERVAL_MULT = 0.76
export const FORGE_MIN_OMEN_INTERVAL_MULT = 0.76
/** Vorzeichen-Zielgrösse (Augur's Pact, 3 × 7 % = 21 %). */
export const FORGE_MIN_OMEN_TARGET_MULT = 0.79
/** Abstand zweier Ressourcensterne (Starwarden's Lantern, 4 × 7 % = 28 %). */
export const FORGE_MIN_RESOURCE_STAR_INTERVAL_MULT = 0.72
/** Erntetakt der Planeten-Harvester (Quarrymaster's Eye, 4 × 6 % = 24 %). */
export const FORGE_MIN_HARVEST_INTERVAL_MULT = 0.76
/** Reisedauer eines Champions (Starroad Pact, 3 × 8 % = 24 %). Greift NACH
 *  `CHAMPION_TRAVEL_MAX_MS` — der Deckel bleibt der Deckel, dies kürzt darunter. */
export const FORGE_MIN_CHAMPION_TRAVEL_MULT = 0.76
/** Boss-HP beim Erscheinen (Hollow Core, 4 × 5 % = 20 %). Die Boss-HP folgt
 *  dem SCHADEN (docs/balance.md); dieser Faktor liegt als letzter darauf und
 *  verschiebt die entworfene Klickzahl um denselben Anteil — mehr wäre kein
 *  leichterer Kampf mehr, sondern gar keiner. */
export const FORGE_MIN_BOSS_HP_MULT = 0.8
/** Abstand zweier Expeditions-Angebote (Cartographer's Pact, 3 × 8 % = 24 %). */
export const FORGE_MIN_EXPEDITION_SPAWN_MULT = 0.76
/** Preis (Haggler's Pact, 3 × 10 % = 30 %) und Restock-Abstand (Merchant's Pact,
 *  3 × 8 % = 24 %) des Cosmic Bargain. */
export const FORGE_MIN_BARGAIN_PRICE_MULT = 0.7
export const FORGE_MIN_BARGAIN_RESTOCK_MULT = 0.76
/** LP-Verlust bei einer Niederlage (Arbiter's Pact, 3 × 10 % = 30 %). Eine
 *  Niederlage muss LP kosten, sonst ist die Ladder keine Leiter mehr. */
export const FORGE_MIN_LP_LOSS_MULT = 0.7
/**
 * Wie viele Stufen früher ein Gebäude-Meilenstein fällt (Founder's Pact, 3 × 2).
 *
 * `BUILDING_MILESTONE_INTERVAL` steht auf 25 und ist gewählt, weil der erste
 * Meilenstein damit in den ersten 20 Minuten liegt (docs/balance.md). Sechs
 * Stufen früher heisst 19 — derselbe Gedanke, nur enger. Der Boden ist keine
 * Kosmetik: unter etwa 15 kippt die Achse, weil die Verdopplung dann schneller
 * kommt als die geometrischen Kosten steigen.
 */
export const FORGE_MIN_BUILDING_MILESTONE_INTERVAL = 15
/**
 * Wie stark ein Ward das GEWICHT der seltenen Augmente hebt (Dreamer's Draw).
 *
 * `RARITY_WEIGHTS` steht bei common 60 gegen rare+epic+legendary zusammen 40.
 * Bei Vollausbau (4 × 8 %) wiegt die obere Hälfte ×1,32, also 52,8 gegen 60 —
 * die Wahl wird spürbar besser, ohne dass Common verschwindet. Weiter zu gehen
 * wäre riskant: bessere Augmente heissen mehr CpS heissen schnellere Level
 * heissen mehr Augmente. Zu bleibt der Kreis nur, weil `AUGMENT_ACTIVE_CAP` (10)
 * den Stapel deckelt (docs/balance.md) — dieser Faktor darf ihn nicht anspannen.
 */
export const FORGE_MAX_AUGMENT_LUCK_MULT = 1.32

/**
 * ── Der ÜBERLAUF: was eine Kappe schluckt, fließt woandershin ────────────────
 *
 * Die vier Kappen darüber sind richtig — ohne sie brechen Expeditionsdauer,
 * Sonnenrampe und Klickwert. Falsch war, was DAHINTER geschah: nichts. Wer eine
 * gekappte Achse weiter hochzog, zahlte für ein Nichts, und im Endzustand
 * gemessen ist das keine Randerscheinung:
 *
 *   Achse            Rohwert bei Vollausbau      Kappe lässt durch    geschluckt
 *   ───────────────────────────────────────────────────────────────────────────
 *   Solar Sails      97 % (Zweig 72 + Relikt 25)   60 %                 37 Pkt
 *   Golden Echo      96 %                          80 %                 16 Pkt
 *   Quickening       60 %                          50 %                 10 Pkt
 *   Aegis            60 %                          75 %                  0 Pkt
 *
 * (Gerechnet wird jeweils der Rohwert, der in den Kappen-Getter EINGEHT — bei
 * Aegis also der Zweig allein; die Bulwark-Konstellation multipliziert danach
 * und steht nicht in Prozentpunkten.)
 *
 * Aegis erreicht seine Kappe heute NICHT — sein Überlauf steht trotzdem, und
 * zwar aus demselben Grund, aus dem die Boughs vor Phase 5 leer sind: er ist
 * nicht tot, er ist noch leer. Ein späterer Aegis-Verstärker verpufft damit
 * nicht still, sondern taucht als Regeneration wieder auf.
 *
 * **Die Kappen-Getter selbst bleiben unverändert.** Der Überlauf ist je ein
 * ZWEITER Getter neben dem bestehenden, der denselben Rohwert liest — so ändert
 * keine vorhandene Rechnung ihr Verhalten, und die Herleitungen an den
 * `FORGE_MIN_*` oben behalten ihre Gültigkeit.
 *
 * **Die Sätze unten sind Umrechnungen zwischen VERSCHIEDENEN Größen und darum
 * nicht 1:1.** Ein Prozentpunkt Expeditionstempo ist nicht ein Prozentpunkt
 * Beute; wo die Zielachse dieselbe Größe misst wie die Quelle, steht 1.
 */
/**
 * Expeditionstempo → Beute. Auf die Hälfte gesetzt: 37 geschluckte Punkte
 * ergeben +18,5 % Beute, gegen die 144 %, die `wayfindersCache` bei Vollausbau
 * ohnehin liefert. Der Überlauf soll den eigenen Zweig retten, nicht den
 * fremden überholen.
 */
export const FORGE_OVERFLOW_EXPEDITION_REWARD_RATE = 0.5
/**
 * Verweildauer → Sternlebensdauer. 1:1, weil beides eine ZEIT in Prozent misst
 * und die 10 geschluckten Punkte neben den 72 % aus `wardensVigil` klein sind.
 * Thematisch dieselbe Aussage von der anderen Seite: die Sonne kann nicht
 * schneller reifen, also stehen ihre Sterne länger.
 */
export const FORGE_OVERFLOW_STAR_LIFETIME_RATE = 1
/**
 * Schadensminderung → HP-Regeneration, in HP pro Sekunde je geschlucktem
 * Prozentpunkt. Angesetzt an `regeneration`: dessen Zweig liefert bei
 * Vollausbau 6 HP/s, ein Punkt Überlauf ist damit rund ein Hundertstel davon.
 */
export const FORGE_OVERFLOW_HP_REGEN_PER_PCT = 0.05

// ── Die vier Abteilungen der Star Forge ──────────────────────────────────────
/**
 * Sie waren einmal die Reiter der rechten Spalte. Seit dem Streifen-Umbau gibt
 * es diese Reiter nicht mehr — der Spieler sieht alle vier Abteilungen
 * gleichzeitig, den Baum als Liste und den Rest als Zeilen darüber.
 *
 * Die Gliederung selbst bleibt trotzdem, und zwar dort, wo sie ohnehin schon
 * lag: im Store (`shopReadyIds`, `shopFreshBySection` — die Marken zählen je
 * Abteilung) und im Herold (`useForgeHerald` nimmt den `accent` für die Dinge
 * ohne eigene Farbe). Der einzige Leser, der sie noch ZEIGT, ist die
 * Aufschlüsselung im Tooltip der Shop-Ecktaste (`RpgBadgeTooltipBody`).
 *
 * Das Glyph von `upgrades` ist absichtlich dasselbe wie
 * `STAR_EVOLUTION_ICONS.gateRays`: dort steht es für die Bedingung „alle
 * Strahlen auf Stufe n", hier für die Strahlen selbst — eine Bedeutung, ein
 * Zeichen. Grün, weil Grün im Projekt „kaufbar" heißt; die drei anderen tragen
 * Bernstein, Eisblau und Gold.
 */
export const FORGE_PANEL_SECTIONS: ForgeSectionDef[] = [
  { id: 'upgrades', label: 'Upgrades', icon: 'game-icons:sun-radiations', accent: '#7fd048' },
  { id: 'relics', label: 'Relics', icon: 'game-icons:anvil-impact', accent: '#e8a020' },
  {
    id: 'constellations',
    label: 'Constellations',
    icon: 'game-icons:barbed-star',
    accent: '#86d0ff',
  },
  { id: 'bargain', label: 'Bargain', icon: 'ph:handshake-fill', accent: '#e8c040' },
]

/**
 * Die sieben Ringe als Abschnitte der Upgrade-Liste — Lesereihenfolge von innen
 * nach außen, dieselbe, in der die Sonne sie freischaltet.
 *
 * Namen und Glyphen sind KEINE freie Wahl: „Solar Rays", „Forge Branches",
 * „Forge Leaves" und „Astral Boughs" stehen samt ihren Zeichen auch im Lexikon
 * (config/encyclopedia/sunAndForge.ts). Derselbe Baum darf nicht an zwei
 * Stellen anders heißen.
 *
 * **Die Reihenfolge dieses Feldes IST die Ring-Reihenfolge von innen nach
 * aussen** — Chipleiste, Tiefenfeld und Filter lesen sie alle hier ab.
 *
 * Die Farben sind nicht die der Knoten (die tragen ihre eigene aus dem
 * Katalog), sondern die des Abschnittsstrichs. Der Verlauf läuft von warm nach
 * kalt und kippt am Ende zurück: Gold (Kern) → Grün (Zweige) → Eisblau
 * (Blätter) → Türkis (Wards) → Blauviolett (Covenants) → Gold (Crowns) →
 * Violett (Boughs).
 *
 * Zwei Stellen daran sind Absicht. **Gold auf den Crowns** schliesst den Kreis
 * zum innersten Ring: die Krone ist das, was aus einem Strahl geworden ist.
 * **Violett ganz aussen** ist die Farbe, die im Projekt „episch/selten" trägt
 * (`FORGE_RELIC_RARITY_COLOR.epic`) — und der endlose Ring ist das Seltenste,
 * was der Baum hergibt.
 *
 * Seit die Liste nach Kaufbarkeit ordnet (`forgeUpgradeBucket()`), sind die
 * Ringe dort kein Abschnitt mehr — sie stehen als Chip an der einzelnen Zeile,
 * daher `shortTitle`. Der lange Name bleibt trotzdem: eine Kopfzeile mit „Rays"
 * stünde im Widerspruch zum Lexikon, ein Chip mit „Solar Rays" sprengt die
 * Zeile.
 *
 * Eine Ringfilter-Leiste über dem Baum las diese Tabelle einmal mit; sie ist
 * gestrichen (Herleitung an `FORGE_BUY_ALL_LABEL`). `accent` und `icon` bleiben
 * in Gebrauch — das Tiefenfeld des Baums und die Zeilen-Chips lesen sie.
 */
export const FORGE_UPGRADE_GROUPS = [
  {
    tier: 'root' as const,
    title: 'Solar Rays',
    shortTitle: 'Rays',
    icon: 'game-icons:beam-wake',
    hint: 'The five rays the star grows on',
    accent: '#e8c040',
  },
  {
    tier: 'branch' as const,
    title: 'Forge Branches',
    shortTitle: 'Branches',
    icon: 'game-icons:tree-branch',
    hint: 'Each ray forks in three',
    accent: '#7fd048',
  },
  {
    tier: 'leaf' as const,
    title: 'Forge Leaves',
    shortTitle: 'Leaves',
    icon: 'game-icons:falling-leaf',
    hint: 'Amplify the branch they hang on',
    accent: '#86d0ff',
  },
  {
    tier: 'ward' as const,
    title: 'Astral Wards',
    shortTitle: 'Wards',
    icon: 'game-icons:star-swirl',
    hint: 'Where the tree reaches past itself',
    accent: '#40c8b0',
  },
  {
    tier: 'pact' as const,
    title: 'Astral Covenants',
    shortTitle: 'Pacts',
    icon: 'game-icons:linked-rings',
    hint: 'What the company gives back',
    accent: '#8fa8ff',
  },
  {
    tier: 'crown' as const,
    title: 'Astral Crowns',
    shortTitle: 'Crowns',
    icon: 'game-icons:crown',
    hint: 'One each, and every one changes a rule',
    accent: '#ffd76a',
  },
  {
    tier: 'bough' as const,
    title: 'Astral Boughs',
    shortTitle: 'Boughs',
    icon: 'game-icons:infinity',
    hint: 'No final level — the tree keeps growing',
    accent: '#c9a0ff',
  },
]

/**
 * Leitfarbe des Seltenheits-Chips auf einer Relikt-Karte. Steht hier und nicht
 * in `economy.ts`: `MATERIAL_RARITY_COLOR` und `AUGMENT_RARITY_COLOR` decken
 * andere Skalen ab (vier bzw. vier Stufen) — Relikte kennen nur diese zwei, und
 * die Werte sind die des bisherigen `.rarity-chip`.
 */
export const FORGE_RELIC_RARITY_COLOR: Record<ForgeRelicRarity, string> = {
  rare: '#7bb8ff',
  epic: '#c9a0ff',
}

/** Beschriftung des Tier-Chips — gekürzte Einzahl der Abschnittsnamen oben. */
export const FORGE_UPGRADE_TIER_LABELS = {
  root: 'SOLAR RAY',
  branch: 'BRANCH',
  leaf: 'LEAF',
  ward: 'WARD',
  pact: 'COVENANT',
  bough: 'BOUGH',
  crown: 'CROWN',
} as const

/**
 * Steht überall dort, wo sonst die Höchststufe stünde. Ein gerendertes
 * „Infinity" wäre der rohe JavaScript-Wert; dies ist ein Schriftzeichen wie
 * `✦` oder `→` und damit von der Emoji-Regel nicht erfasst.
 */
export const FORGE_ENDLESS_SYMBOL = '∞'

/* Eine Liste der Topf-Ids stand hier („ready, reach, next") und ist gestrichen:
   die Reihenfolge der Abschnitte steht jetzt in `ForgeUpgradesSection`, weil
   „Next up" dort in ZWEI Abschnitte zerfällt (Eltern- und Phasensperre) und
   eine Id-Liste das nicht mehr abbildet. Wonach die Liste überhaupt gliedert
   und warum nicht nach Ring, steht bei `forgeUpgradeBucket()` in
   `useForgeUpgrades.ts`. */

/** Beschriftung der Archiv-Schaltzeile: „▸ 21 grown". */
export const FORGE_UPGRADE_ARCHIVE_LABEL = 'grown'
export const FORGE_UPGRADE_ARCHIVE_ICON = 'ph:check-circle-fill'
/** Die Marke an einer ausgewachsenen Zeile. `✦` ist ein Schriftzeichen, kein Emoji. */
export const FORGE_GROWN_BADGE = '✦ MAX'
/**
 * Das Knoten-Glyph der Archivzeile. Nackt wie in der Upgrade-Zeile darüber —
 * zwei Formensprachen in EINER Liste wären der Fehler. Nur halb so gross: das
 * Archiv bleibt die kompakte Form (53px Zeilenhöhe), weil es bei Vollausbau den
 * Löwenanteil der Liste stellt und dort nichts mehr zu entscheiden ist.
 */
export const FORGE_GROWN_ICON_SIZE = 32
/** Chevron der Schaltzeile. Schriftzeichen wie `✦` und `→`, kein Emoji. */
export const FORGE_UPGRADE_ARCHIVE_CHEVRON_CLOSED = '▸'
export const FORGE_UPGRADE_ARCHIVE_CHEVRON_OPEN = '▾'

// ── Trenner über den Töpfen (ForgeUpgradesSection) ───────────────────────────
/**
 * Jeder der vier Töpfe trägt einen Trenner — eine Linie mit Etikett, kein Balken
 * und keine Fläche.
 *
 * EINE Runde lief ohne Kopf über dem Kaufbaren: „was ein Eintrag kann, sagt sein
 * Knopf in Farbe" war die Begründung, und sie hat nicht getragen. Eine kaufbare
 * Zeile unterschied sich dauerhaft allein durch eine 1px-Rahmenfarbe
 * (`#4a8a28` gegen `#32210c`) von einer nicht kaufbaren, und der rote
 * „reicht nicht"-Knopf zog den Blick sogar zuerst an — die Warnfarbe schlug die
 * Zusagefarbe. Die Zeile ist inzwischen umgebaut (siehe `ForgeUpgradeTile`), und
 * die Köpfe sind mit zurückgekommen.
 *
 * Der Trenner über `reach` ist dabei KEINE Zugabe, sondern Bedingung: stünde nur
 * über `ready` einer, läsen sich die Zeilen darunter als Teil derselben Gruppe.
 * Ein Kopf, der die falsche Grenze zieht, ist schlimmer als keiner.
 *
 * Das GESPERRTE trägt derer ZWEI, weil es zwei Sperrgründe gibt und die für den
 * Spieler nicht dasselbe sind: gegen die Sonnenphase kann er nichts tun ausser
 * warten, den Elternknoten kann er sofort wachsen lassen. Ein gemeinsamer
 * Trenner müsste generisch bleiben und sagte nichts — bei Sonnenphase 5 waren
 * gemessen ALLE dreissig gesperrten Zeilen Elternsperren, kein einziger
 * Phasenlock.
 */
export const FORGE_DIVIDER_PARENT_LABEL = 'Needs a deeper tree'
/**
 * Das Etikett der Phasensperre nennt die Phase NUR, wenn darunter wirklich nur
 * eine wartet. Die Knoten öffnen bei vier verschiedenen Phasen (2, 3, 4, 5) —
 * „Waiting on Dawn · 18" wäre für zwölf der achtzehn schlicht falsch.
 */
export const FORGE_PHASE_TOKEN = '{phase}'
export const FORGE_DIVIDER_PHASE_LABEL = `Waiting on ${FORGE_PHASE_TOKEN}`
export const FORGE_DIVIDER_PHASE_MANY_LABEL = 'Waiting on the sun'
/**
 * Die beiden Glyphen. Keiner davon ist frei gewählt — beide tragen ihre
 * Bedeutung im Projekt schon:
 *   • `ph:sun-fill` heisst überall „Sonnenphase als Voraussetzung"
 *     (`PlanetLockedPanel`, `PlanetRailSlot`, `PlanetStagePanel`).
 *   • `material-symbols:account-tree` heisst „verzweigte Knoten" und trägt
 *     schon den Skill-Tree-Reiter; Phosphors `tree-structure` ist bei dieser
 *     Größe zu fein (Herleitung in `BardProfileMenu.vue`).
 * Das Schloss (`FORGE_LOCK_ICON`) heisst „zu", die Glyphen hier heissen „warum".
 * Beide stehen inzwischen zweimal: das Schloss am MOTIV — am Knoten im Baum wie
 * am Glyph der Zeile —, und das Warum-Glyph sowohl im Trenner als auch vor dem
 * Sperrsatz der Zeile. Die Zeile wiederholt damit, unter welchem Trenner sie
 * einsortiert ist, und die Weiche dafür ist beide Male `entry.lockKind`.
 */
export const FORGE_DIVIDER_PHASE_ICON = 'ph:sun-fill'
export const FORGE_DIVIDER_PARENT_ICON = 'material-symbols:account-tree-rounded'

/**
 * Die beiden Trenner über dem Kaufbaren.
 *
 * Wortlaut, Glyph und Farbe sind NICHT neu erfunden: der Meep-Baum gliedert
 * seine Liste nach genau derselben Frage („was kann ich damit anfangen") und hat
 * die Antwort schon benannt — `MEEP_SKILL_BUCKETS` trägt für `ready`
 * `ph:lightning-fill` auf `#52b830` und für `reach` `ph:hourglass-medium-fill`
 * auf `#c89040`, mit dem Etikett „Saving up". Dieselbe Bedeutung bekommt
 * dasselbe Glyph, über Feature-Grenzen hinweg; der Blitz heisst im Projekt
 * ausserdem schon „alles, was gerade geht" (`FORGE_BUY_ALL_ICON`).
 *
 * Eigene Konstanten und nicht `MEEP_SKILL_BUCKETS` importiert, weil die Namen
 * sonst lügen würden — der Forge-Trenner ist kein Meep-Topf. Die Werte sind die
 * Kopie, die Herleitung steht dort.
 *
 * „Ready to grow" statt bloss „Ready": das Verb der Spalte ist FORGE/grow
 * (`FORGE_GROW_LABEL`), und die Trenner daneben sind ebenfalls Sätze („Needs a
 * deeper tree", „Waiting on the sun") — ein nacktes Wort fiele aus der Reihe.
 */
export const FORGE_DIVIDER_READY_LABEL = 'Ready to grow'
export const FORGE_DIVIDER_READY_ICON = 'ph:lightning-fill'
export const FORGE_DIVIDER_READY_COLOR = '#52b830'
export const FORGE_DIVIDER_SAVING_LABEL = 'Saving up'
export const FORGE_DIVIDER_SAVING_ICON = 'ph:hourglass-medium-fill'
export const FORGE_DIVIDER_SAVING_COLOR = '#c89040'

/**
 * Der Leerzustand der Upgrade-Liste.
 *
 * Ein Trieb und keine Lupe: hier stand bis zum Umbau `FORGE_SEARCH_ICON`, weil
 * derselbe Kasten zwei Sätze tragen musste — „nichts gefunden" (Suchwort ohne
 * Treffer) und „nichts kaufbar". Mit der Kopfleiste ist der erste Fall weg, und
 * ein Suchglyph über „Nothing to grow yet." zeigte auf eine Bedienung, die es
 * nicht mehr gibt. Das Verb der Spalte ist FORGE/grow (`FORGE_GROW_LABEL`) —
 * das Motiv folgt ihm.
 */
export const FORGE_UPGRADE_EMPTY_ICON = 'game-icons:sprout'

// ── Sammelkauf (ForgeBuyAllBar) ──────────────────────────────────────────────
/**
 * Platzhalter je einer Zahl in einer Beschriftung — Sammelkauf-Quittung und
 * Stapelknopf setzen dieselbe Marke ein. Eine Konstante je Text hätte mehrere
 * Fassungen desselben Zeichens ergeben.
 */
export const FORGE_COUNT_TOKEN = '{n}'
/** Und derselbe Gedanke für den Preis, der in `FORGE_BUY_ALL_TITLE` danebensteht. */
export const FORGE_BUY_ALL_COST_TOKEN = '{c}'
/**
 * Der Sammelkauf sass bis zum Umbau in der Kopfleiste ÜBER DEM BAUM, zusammen
 * mit Suchfeld und Ringfiltern. Er steht jetzt am Kopf der DETAILSPALTE —
 * derselben Spalte, in der das Kaufbare als Liste steht und in der jede einzelne
 * Zeile ihren eigenen Kaufknopf trägt. Die Leiste ist damit die Sammelfassung
 * dessen, was direkt darunter liegt, statt einer Bedienung auf der anderen Seite
 * des Tabs.
 *
 * „Forge all ready" und nicht „Buy all ready": der Kaufknopf jeder Zeile trägt
 * `FORGE_GROW_LABEL` („FORGE"), und die Sammelaktion ist dieselbe Handlung en
 * bloc. Zwei Verben für einen Vorgang lasen sich wie zwei Vorgänge.
 *
 * Es gibt KEINEN Leerzustand und deshalb auch keinen Wortlaut dafür: die Leiste
 * verschwindet, solange nichts kaufbar ist, statt abgeschaltet dazustehen. Ein
 * toter Knopf mit „Nothing ready to grow" belegte 58px am teuersten Platz der
 * Spalte für die geringste Auskunft — und die steht ohnehin schon darunter, wo
 * dann kein `READY TO GROW`-Trenner ist. Beide hängen an derselben Frage:
 * `buyAllPlan.count === 0` gilt genau dann, wenn kein Eintrag `canBuy` ist
 * (gebunden in `forgeUpgrades.spec.ts`), Leiste und Listenblock kommen und gehen
 * also gemeinsam.
 *
 * Eine HÖHE steht hier bewusst nicht: die Leiste bemisst sich an ihrem Inhalt,
 * und das Scrollfeld darunter nimmt den Rest. Eine Konstante wäre eine zweite
 * Quelle für eine Zahl, die das Layout ohnehin kennt.
 */
export const FORGE_BUY_ALL_LABEL = 'Forge all ready'
export const FORGE_BUY_ALL_ICON = 'ph:lightning-fill'
/**
 * Der volle Satz im `title` des Knopfes. Er nennt beides — Anzahl UND Preis —,
 * weil die Leiste ihre Zahlen als Pille und Preisblock zeigt und ein Screenreader
 * (oder ein sehr schmaler Viewport) sonst nur die nackten Ziffern bekäme.
 */
export const FORGE_BUY_ALL_TITLE = `${FORGE_BUY_ALL_LABEL} · ${FORGE_COUNT_TOKEN} upgrades · ${FORGE_BUY_ALL_COST_TOKEN} chimes`
/**
 * Kantenlänge des Blitz-Glyphs auf der Leiste. 20 statt 18: die 18er-Grenze ist
 * die, ab der gefüllte Glyphen zu Grau zerfallen, und die eine Primäraktion der
 * Spalte soll nicht auf ihr stehen.
 */
export const FORGE_BUY_ALL_ICON_SIZE = 20
/**
 * Schlagzeile des Sammelkaufs im Herold-Banner — die Marke trägt die Zahl der
 * gewachsenen Knoten.
 *
 * Als Schlagzeile gesetzt und nicht als Satz („Grew {n} upgrades"): sie steht im
 * Banner an derselben Stelle wie der Name eines einzelnen Upgrades, und ein Name
 * fängt nicht mit einem Verb an.
 */
export const FORGE_BUY_ALL_HERALD = `${FORGE_COUNT_TOKEN} Upgrades Grown`
/**
 * Wie viele Namen die Zeile unter der Sammelmeldung aufzählt, bevor sie auf
 * „+k more" umschaltet. Drei, weil die Zeile im Banner einzeilig bleibt und ein
 * vierter Name sie schon bei mittleren Längen über die Bannerbreite trägt.
 */
export const FORGE_BUY_ALL_HERALD_NAME_CAP = 3

/**
 * Die Marke am günstigsten kaufbaren Knoten.
 *
 * „Günstigster" und nicht „stärkster": die Wirkungen des Baums stehen in
 * Prozent, HP, Sekunden und Chimes nebeneinander — es gibt keine gemeinsame
 * Einheit, in der man sie rangieren könnte. Der Preis ist die einzige Zahl, die
 * alle Knoten teilen, und „was kann ich als Nächstes mitnehmen" ist ohnehin die
 * Frage, die der Spieler vor dem Baum hat.
 */
export const FORGE_BEST_BUY_LABEL = 'BEST BUY'
/**
 * Dieselbe Marke, gekürzt — für die Upgrade-ZEILE bei Full HD.
 *
 * Gemessen: die volle Pille misst 68px und steht im engsten Platz der Zeile,
 * neben dem Namen. Bei 1920×1080 blieben dem Namen dadurch 61px und er wurde
 * abgeschnitten — ausgerechnet an der Zeile, auf die die Marke zeigen soll. Die
 * Kurzform misst rund 40px und gibt ihm 28 zurück.
 *
 * Gekürzt wird die MARKE und nicht der Wirkungssprung daneben: dessen Zahl ist
 * der Grund, überhaupt zu kaufen, während „BEST" dasselbe sagt wie „BEST BUY".
 * Der volle Wortlaut bleibt im `title` der Pille.
 */
export const FORGE_BEST_BUY_SHORT_LABEL = 'BEST'

/**
 * Die Marke an einem gerade erst bezahlbar gewordenen Eintrag.
 *
 * Sie beantwortet eine ANDERE Frage als BEST BUY und steht deshalb daneben statt
 * an ihrer Stelle: BEST BUY sagt „das Billigste", NEW sagt „das, was seit deinem
 * letzten Blick dazugekommen ist". Beide können auf denselben Eintrag zeigen.
 *
 * Azur ist die Farbe dazu, und zwar dieselbe, die den Spieler hergeführt hat —
 * `ShopReadyBadge` am Header, am Profil-Reiter und an der Abteilungs-Schiene,
 * sowie der `ready`-Herold (`BADGE_HERALD_ACCENT_SHOP`). Grün und Gold sind im
 * Shop bereits mit „kaufbar" belegt (`.fq-row--ready`, `.fc-card--ready`).
 */
export const FORGE_FRESH_LABEL = 'NEW'

/** Klartext derselben Marke — `title` an der Zeile, `aria-label` am Chip. */
export const FORGE_FRESH_TITLE = 'Newly affordable'

/**
 * Glyph vor der Tooltip-Fußzeile „N affordable in total".
 *
 * Dasselbe Blitzzeichen, das im Spiel überall „kaufbar" heisst. Eigener Name
 * statt eines Verweises auf einen anderen Eintrag, weil ein Index in eine Liste
 * beim nächsten Umbau still kippt — was auch genau so passiert ist: die
 * Abschnittsköpfe der Liste, die dieses Glyph trugen, gibt es nicht mehr.
 */
export const FORGE_AFFORDABLE_TOTAL_ICON = 'ph:lightning-fill'

// ── Stapelkauf ───────────────────────────────────────────────────────────────
/**
 * Wie viele Stufen ein einzelner „Buy ×N" höchstens auf einmal nimmt.
 *
 * Nötig ist der Deckel nur wegen Ring 7: ein Bough hat keine Höchststufe, die
 * Vorschau-Schleife liefe also bei genug Chimes ohne Ende weiter. Für alle
 * anderen Ringe greift ihre eigene Obergrenze längst vorher.
 *
 * 25 ist kein Geschmack, sondern die Kurve: bei `FORGE_BOUGH_COST_MULTIPLIER`
 * (1,35) kostet die 25. Stufe das rund 1000-Fache der ersten — ein Vorrat, der
 * fünfundzwanzig Stufen am Stück deckt, deckt praktisch auch die nächsten
 * hundert, und ein Knopf, der ohne Deckel den ganzen Bestand verschluckt, ist
 * kein Knopf mehr, sondern eine Falle.
 */
export const FORGE_BULK_BUY_CAP = 25

/* Ein Empfehlungs-Panel („Next to grow") stand einmal über dieser Liste: EIN
   Knoten gross, immer der billigste bezahlbare, mit Beschreibungssatz,
   Now/After-Kasten, Preisblock und zwei Kaufknöpfen — auf 384px reservierter
   Höhe. Es ist gestrichen, und mit ihm ein Dutzend Konstanten
   (`FORGE_NEXT_UP_*`, `FORGE_DETAIL_PANEL_*`, `FORGE_BUY_MANY_LABEL`).
   Grund: jede seiner Angaben stand zugleich in der Zeile darunter oder im
   schwebenden Kärtchen, und die Liste zeigte dafür drei Einträge weniger. Was
   nur dort lebte, war der Stapelkauf — der sitzt jetzt als schmaler `×N` IM
   Kaufknopf jeder Zeile (`FORGE_ROW_BULK_WIDTH_PX`). */

// ── Schwebendes Kärtchen an der Zeile (ForgeRowTooltip) ──────────────────────
/**
 * Was der Zeiger in der Liste streift, GROSS — seit der Kopf darüber nicht mehr
 * dem Zeiger folgt, sondern die Empfehlung zeigt.
 *
 * Es schwebt links NEBEN der Spalte statt in ihr: alles, was im Fluss der Liste
 * läge, verschöbe sie beim Erscheinen unter dem Zeiger, und genau daraus wurde
 * schon einmal ein selbsttragendes Flackern. `position: fixed` kann das nicht.
 */
export const FORGE_ROW_TIP_WIDTH_PX = 250
/**
 * Gemessen von der ZEILE aus, nicht von der Spaltenkante — und größer als der
 * Abstand, den man sehen will: die Zeile sitzt selbst schon 18px innerhalb der
 * Spalte, und ein kleinerer Wert ließe das Kärtchen ihre Kante überlappen.
 */
export const FORGE_ROW_TIP_GAP_PX = 26
/**
 * Nur zu sehen, solange der Zeiger die Liste hält und die letzte kaufbare Sache
 * dabei wegfällt — das Panel wartet dann mit dem Verschwinden, bis er loslässt,
 * statt ihm die Liste unter den Füßen wegzuziehen.
 */
export const FORGE_NEXT_UP_IDLE = 'Nothing ready right now'
/** „Lv 25 · no final level" bzw. „Lv 3 / 6" — der Rest der Metazeile. */
export const FORGE_DETAIL_ENDLESS_META = 'no final level'
export const FORGE_DETAIL_PARENT_PREFIX = 'hangs on '

// ── Der Angebots-Streifen über der Liste (ForgeOfferStrip) ───────────────────
/**
 * Relikte, Konstellationen und der Handel — was der Baum NICHT hergibt.
 *
 * Sie lagen bis zum Umbau hinter je einem Reiter einer 78px breiten
 * Abteilungs-Rail ganz rechts (`ForgeSectionRail`, gestrichen). Das kostete
 * nicht die Breite, sondern die Aufmerksamkeit: drei der vier Abteilungen waren
 * die meiste Zeit leer, und ob eine davon gerade etwas hergab, stand allein an
 * einer 18px-Marke an einem Reiter, den der Spieler nicht offen hatte. Vier
 * Klicks, um dreimal nichts zu finden.
 *
 * Jetzt steht alles Erreichbare als Zeile ganz oben in derselben Spalte wie die
 * Upgrades. Die Sichtbarkeit hängt an der FREISCHALTUNG, nie am Chime-Bestand —
 * sonst verschwände eine Zeile unter dem Zeiger, während die Chimes ticken.
 * Kaufbar oder nicht trägt allein die Optik.
 *
 * Der Wortlaut ist nicht neu: „within reach" steht seit jeher in den
 * Badge-Labels der Forge (Header-Ecktaste, Profil-Reiter). Der Streifen greift
 * damit genau den Satz auf, dem der Spieler hierher gefolgt ist.
 */
export const FORGE_OFFER_TITLE = 'Within reach'
export const FORGE_OFFER_ICON = 'game-icons:anvil-impact'
export const FORGE_OFFER_COLOR = '#e8a020'
/** Die Verben der drei Arten — je Art eines, nie zwei Wörter für dieselbe Tat. */
export const FORGE_OFFER_VERB_RELIC = 'Forge'
export const FORGE_OFFER_VERB_UPGRADE = 'Upgrade'
export const FORGE_OFFER_VERB_CONSTELLATION = 'Fuse'
export const FORGE_OFFER_VERB_BARGAIN = 'Buy'
/** Der Chip neben dem Namen einer Konstellation — Relikte tragen dort ihre Rarität. */
export const FORGE_OFFER_TAG_CONSTELLATION = 'FUSION'
/**
 * Das Aufpoppen. Nur `opacity` und `transform` (Performance-Regel 1); der Wert
 * steht hier, weil ihn die Komponente per `v-bind` in ihre Transition schreibt
 * und `FORGE_CARD_FLASH_MS` daneben eine andere Frage beantwortet.
 */
export const FORGE_OFFER_POP_MS = 180
/**
 * Das Zeichen einer Zeile. Kleiner als das der Upgrade-Zeile (36) — der
 * Streifen steht über der Liste und darf sie nicht überstimmen.
 */
export const FORGE_OFFER_GLYPH_SIZE = 30
/**
 * Das Materialbild IN einer Angebotszeile. Kleiner als die geteilten 26px
 * (`.fc-cost-img`): gemessen trug das Kostenband damit allein 38 der 78 Pixel
 * Zeilenhöhe, und bei acht offenen Angeboten belegte der Streifen 89 % der
 * Spalte — die Upgrade-Liste darunter war auf Full HD nicht mehr im Bild.
 */
export const FORGE_OFFER_COST_IMAGE_PX = 17
/**
 * Der Deckel über dem Streifen.
 *
 * Er WÄCHST mit dem Spielstand: fünf Relikte, sieben Konstellationen und der
 * Handel sind im Spätspiel dreizehn Zeilen, und jede davon ist eine, die der
 * Spieler kaufen KANN — keine darf verschwinden. Ungedeckelt schöbe er aber
 * genau das aus dem Bild, wofür die Spalte da ist.
 *
 * Gemessen passen bei 252px gut dreieinhalb Zeilen: die angeschnittene vierte
 * sagt von selbst, dass es weitergeht. Darunter bleiben auf dem flachsten
 * Viewport (Full HD) fünf Upgrade-Zeilen im Bild.
 */
export const FORGE_OFFER_LIST_MAX_PX = 300
export const FORGE_OFFER_LIST_MAX_COMPACT_PX = 252
/** Der Lauf des Händlerbands — derselbe Takt wie auf seiner alten Karte. */
export const FORGE_OFFER_SHINE_MS = 5000
export const FORGE_OFFER_CLOCK_ICON = 'ph:hourglass-medium-fill'
export const FORGE_OFFER_FREE_LABEL = 'Free'
/** Warum der Knopf nicht geht — die rote Zahl daneben sagt, WAS fehlt. */
export const FORGE_OFFER_SHORT_TITLE = 'Not enough yet'
/** Ein Handel, der noch nicht wieder ausliegt. */
export const FORGE_OFFER_SOLD_LABEL = '✦ SOLD'
export const FORGE_OFFER_RESTOCK_LABEL = 'restock'
export const FORGE_OFFER_REROLL_ICON = 'ph:arrows-clockwise-bold'
export const FORGE_OFFER_REROLL_TITLE = 'Draw a different bargain'
/** Die Zeile des Handels nennt sein Sortiment im Kärtchen. */
export const FORGE_OFFER_WARES_LABEL = 'Also in his cart'
export const FORGE_OFFER_GET_LABEL = 'You get'
export const FORGE_OFFER_PAY_LABEL = 'You pay'
export const FORGE_OFFER_NOTE =
  'One bargain lies out at a time. It is gone once bought and the merchant returns with another; a Dark Matter shard sends him back to his cart right away.'
/** Der Wirkungssprung im Kärtchen — dieselben zwei Wörter wie in der Upgrade-Zeile. */
export const FORGE_OFFER_NOW_LABEL = 'Now'
export const FORGE_OFFER_NEXT_LABEL = 'After forging'
/**
 * Die Ueberschrift ueber den Toren eines Vault-Angebots.
 *
 * Hiess 'Both branches', solange eine Konstellation genau zwei Zweige
 * verschmolz. Seit der Vault dieselbe `requires`-Liste fuehrt wie der Baum,
 * koennen es drei sein und muessen keine Zweige sein — der alte Text haette
 * dann zweimal gelogen. Dasselbe Wort wie im Baum (`FORGE_REQ_HEADING`), damit
 * dieselbe Auskunft ueberall gleich heisst.
 */
export const FORGE_OFFER_REQS_LABEL = 'Requires'
/**
 * Was die Bedingungen in der EINEN Zeile des `title` trennt.
 *
 * Ein Mittelpunkt und kein Komma: die Zeile besteht aus Paaren „Name Zahl/Zahl“,
 * und ein Komma sieht darin wie ein Teil der Zahl aus.
 */
export const FORGE_VAULT_REQ_SEPARATOR = ' · '
/**
 * Wie weit das Kärtchen von der Zeile absteht und wie breit es ist.
 *
 * Breiter als das der Upgrade-Zeile (250): der Handel zeigt darin sein halbes
 * Sortiment, und eine Konstellation zwei Fortschrittsbalken mit Namen davor.
 */
export const FORGE_OFFER_TIP_WIDTH_PX = 288
export const FORGE_OFFER_TIP_GAP_PX = 26

// ── Das Archiv darunter (ForgeVaultSection) ──────────────────────────────────
/**
 * Gesperrte Relikte, ausgebaute (`✦ MAX`) und fusionierte Konstellationen.
 *
 * Sie standen bis zum Umbau als Kompaktzeilen mit in ihrer Abteilung. Ganz
 * wegzulassen ging nicht: ein Relikt, das aus dem Nichts auftaucht, sobald sein
 * Knoten hoch genug ist, nimmt dem Spieler die Möglichkeit, darauf HINZUARBEITEN
 * — und der Fortschrittsbalken „Moon Orbit 2/3" ist genau diese Auskunft.
 *
 * Zugeklappt als Vorgabe, dieselbe Schaltzeile wie das Upgrade-Archiv darüber:
 * zwei verschiedene Archivknöpfe in einer Spalte wären zwei Bedienmuster für
 * dieselbe Geste.
 */
export const FORGE_VAULT_LABEL = 'locked & finished'
export const FORGE_VAULT_ICON = 'game-icons:locked-chest'
/**
 * Bernstein statt des Grüns der Upgrade-Schublade: dort liegt Erledigtes, hier
 * liegt überwiegend das, worauf der Spieler noch hinarbeitet.
 */
export const FORGE_VAULT_COLOR = '#c89040'
export const FORGE_VAULT_MAX_BADGE = '✦ MAX'
export const FORGE_VAULT_FUSED_BADGE = '✦ FUSED'
/** „Grow Moon Orbit to Lv 3" — der Weg zur Freischaltung eines Relikts. */
export const FORGE_VAULT_LOCK_PREFIX = 'Grow'
export const FORGE_VAULT_LOCK_INFIX = 'to Lv'

// ── Upgrade-Zeile der Liste (ForgeUpgradeTile) ───────────────────────────────
/**
 * Ein Eintrag der Liste ist EINE waagerechte Zeile: Knoten-Glyph groß vorn ·
 * Stufe groß mit dem Namen klein darunter · Wirkungssprung rechts · Kaufknopf
 * ganz rechts, und unter Stufe und Name ein schmales Band mit dem
 * Materialbedarf.
 *
 * Drei Fassungen davor:
 *
 *   • Die 44px-Zeile trug ihre beiden wichtigsten Zahlen — Preis und
 *     Wirkungssprung — als die KLEINSTEN Elemente der ganzen Spalte
 *     (Chime-Bild 18px, Zahl 13.5px, der Sprung als 11.5px-Graustreifen bei 42%
 *     Deckkraft), die Stufe fehlte ganz, gekauft wurde über ein
 *     unbeschriftetes `＋`.
 *   • Die zweistöckige Kachel danach löste das, kostete aber ~150px je Eintrag.
 *     Bei Vollausbau sind das fünfundvierzig Stück, und die Liste zeigte drei
 *     davon gleichzeitig.
 *   • Die erste Zeilenfassung hatte gerahmte Chips um jede Kostenposition. Die
 *     sind gestrichen; die Kosten stehen nackt.
 *
 * EINE Runde ohne Glyph gab es dazwischen: es stand die Vermutung im Raum, die
 * 3px-Kante in der Knotenfarbe am linken Rand könne es ersetzen — sie
 * unterscheidet einen Eintrag ja auch und kostet ein Zwölftel der Breite. Im
 * fertigen Bild war die Liste damit eine Wand aus Text. Das Glyph ist zurück
 * und GRÖSSER als vorher; die Kante bleibt als leisere Zweitstimme daneben,
 * denn sie trägt die gesperrten Zeilen, deren Glyph gedimmt ist.
 *
 * Die Höhe ist für JEDEN Zustand dieselbe (`min-height` in der Komponente),
 * auch für eine gesperrte Zeile ohne Knopf und Materialband. Eine Zeile, die
 * aus der Liste ragt, weil sie teurer ist, sagt mit ihrer Höhe etwas aus, das
 * nicht gemeint ist — die Fassung mit ALLEM im Knopf maß gemessen 136px gegen
 * 98px bei den Nachbarn und kürzte obendrein Name und Wirkungswert.
 *
 * Was sie bewusst NICHT ist: eine volle `.fc-card` mit Beschreibungssatz und
 * beschriftetem Now/After-Kasten. Genau die stand hier schon einmal und wurde
 * zurückgenommen (Herleitung in `ForgeUpgradesSection.vue`). Der
 * Beschreibungssatz bleibt im schwebenden Kärtchen.
 *
 * Das Knoten-Glyph vorn steht NACKT, ohne den gerahmten Sockel (Radialverlauf
 * plus Border), den die Kachel-Fassung hatte. Die Knotenfarbe trägt es selbst;
 * ein Kasten drumherum kostete Breite, die die Zeile für Stufe, Wirkung und
 * Knopf braucht.
 *
 * 56px sind rund drei Viertel der Zeilenhöhe und machen es zum grössten
 * Element links. Das Budget trägt es: bei Full HD (Spalte 499px) bleiben dem
 * Namen daneben ~166px, und der längste Knotenname („Host of Champions") misst
 * gemessen 117px.
 *
 * Die KOMPAKTGRÖSSE für Full HD (48px) steht nicht als zweite Konstante
 * daneben, sondern als CSS-Regel im `@media (max-height: 1100px)`-Block der
 * Komponente: bei Iconify schlägt CSS das `width`-Attribut, und zwei Zahlen für
 * dieselbe Sache liefen still auseinander.
 */
export const FORGE_ROW_ICON_SIZE = 56
/**
 * Die Breite der Kauffläche — FEST, nicht inhaltsabhängig: damit fluchten die
 * Kanten über die ganze Liste hinweg und der Preis steht immer an derselben
 * Stelle. Der Knopf trägt deshalb nur den Chime-Preis, nicht das Material —
 * zwei Materialpositionen messen auch rahmenlos ~150px und machten ihn breiter
 * als den Namen daneben.
 */
export const FORGE_ROW_BUY_WIDTH_PX = 150
/** Full HD ist zugleich der schmalste Desktop — dort sind 61 Pixel weniger da. */
export const FORGE_ROW_BUY_WIDTH_COMPACT_PX = 140
/**
 * Der Anteil des Stapelknopfes an dieser Breite.
 *
 * Er nimmt sie dem `FORGE`-Knopf ab und NICHT der Zeile: der Block ist immer
 * gleich breit, gleich ob eine Stufe bezahlbar ist oder acht. Sonst rückte die
 * Kante jedes Mal, wenn die tickenden Chimes eine Schwelle überschreiten —
 * genau der Sprung, gegen den in `ForgeUpgradesSection` schon die eingefrorene
 * Reihenfolge steht.
 */
export const FORGE_ROW_BULK_WIDTH_PX = 42
/** Was darauf steht. Nur die Zahl — „Buy ×8" passt in 42px nicht und stünde
 *  neben einem Knopf, der das Verb schon nennt. */
export const FORGE_ROW_BULK_LABEL = `×${FORGE_COUNT_TOKEN}`
/**
 * Der Knopf eines gedeckelten Kernstrahls. Er nennt den ZUSTAND; warum der
 * Deckel liegt, steht als Grund in derselben Zeile
 * (`FORGE_UPGRADE_CAPPED_REASON`) — auf dem Knopf stünde derselbe Satz ein
 * zweites Mal. Ein gedeckelter Knopf trägt als einziger KEINEN Preis: es ist
 * nichts zu bezahlen, solange der Deckel liegt.
 */
export const FORGE_TILE_CAPPED_LABEL = 'CAPPED'
/**
 * Das Schloss an einem gesperrten Upgrade. Eine Bedeutung, ein Glyph: dasselbe
 * Icon trägt die gesperrte Relikt-Zeile in `StarForgePanel`.
 *
 * Es sitzt als Abzeichen an der Ecke des MOTIVS — am Knotenkreis im Forge-Baum
 * und am Glyph der Upgrade-Zeile, beide Male über die geteilte Klasse
 * `.fc-lock-badge` (`assets/rpg-theme.css`). Dieselbe Sperre trägt damit in
 * beiden Spalten dasselbe Zeichen an derselben Stelle; vorher stand sie im Baum
 * gar nicht und in der Liste nur als 15px-Glyph vor dem Sperrsatz, wo jetzt das
 * WARUM steht.
 */
export const FORGE_LOCK_ICON = 'lucide:lock'
/**
 * Die ANHEFTUNGS-Marke am festgehaltenen Knoten.
 *
 * `lucide` wie das Schloss daneben, und das ist keine Bequemlichkeit: beide
 * stehen gleichzeitig an DEMSELBEN Kreis — ein angehefteter Knoten ist immer
 * auch ein gesperrter. Zwei Sets nebeneinander hiesse zwei Strichstärken auf
 * 44 % eines 50-px-Kreises, und dort trägt der Unterschied nicht mehr.
 */
export const FORGE_PIN_ICON = 'lucide:pin'

/** Wie lange die gekaufte Karte aufleuchtet. Rein visuell, daher reale Zeit. */
export const FORGE_CARD_FLASH_MS = 420
/** Dasselbe für den Sonnenblitz im Baum — er quittiert denselben Kauf. */
export const FORGE_SUN_FLASH_MS = 500

// ── Hover-Spotlight zwischen Sternbaum und Upgrade-Liste ─────────────────────
/**
 * Baum links und Liste rechts zeigen denselben Bestand (`useForgeUpgrades`) in
 * zwei Bildern. Der Zeiger auf EINEM von ihnen hebt deshalb beide Fassungen
 * desselben Knotens hervor — dieselbe Mechanik wie `SIGIL_ALLY_HOVER_*` im
 * Team-Tab, und bewusst in denselben Größenordnungen.
 *
 * Der Maßstab liegt über dem bestehenden Zeige-Sprung des Knotens (1,12), weil
 * er beide Gesten bedienen muss: den Zeiger auf dem Kreis UND den Zeiger auf
 * seiner Karte drüben. Zwei Größen für dieselbe Bedeutung wären ein Fehler.
 */
export const FORGE_SPOTLIGHT_NODE_SCALE = 1.22
export const FORGE_SPOTLIGHT_DIM_OPACITY = 0.3
export const FORGE_SPOTLIGHT_PING_MS = 450
/**
 * Sonne → Strahl → Zweig → Blatt → Ward → Covenant → Krone/Bough: **sieben**
 * Glieder trennen den äussersten Knoten vom Sternenrand, seit die Ringe eine
 * Leiter bilden und die Elternkette keinen Ring mehr überspringt. Zugleich die
 * Abbruchbremse beim Hochlaufen der `parentId`-Kette.
 *
 * Die Zahl MUSS mit der Ringzahl mitwachsen: stünde sie zu tief, bräche die
 * hervorgehobene Kette mitten im Baum ab und die Sonne wäre nicht mehr ihr Ende.
 */
export const FORGE_SPOTLIGHT_MAX_LIMBS = 7
/**
 * Wartezeit, bevor ein Hover am Baum die zugehörige Karte ins Bild rollt. Ein
 * Schwenk über den Baum soll EINEN Rollbefehl absetzen, nicht fünfundzwanzig.
 * Rein visuell, daher reale Zeit.
 */
export const FORGE_SPOTLIGHT_SCROLL_DELAY_MS = 160

/**
 * Grund, warum ein Kernstrahl gerade nicht weitergeht: `maxAllowedLevel` lässt
 * ihn nur eine Stufe über den niedrigsten der fünf steigen. Der Zustand hat
 * nichts mit Kosten zu tun, deshalb braucht er einen eigenen Satz statt eines
 * ausgegrauten Knopfes.
 */
export const FORGE_UPGRADE_CAPPED_REASON = 'Raise the other rays to match'

// ── Ertrags-Sockel unter der Sonne (ForgeYieldPlinth) ─────────────────────────
/**
 * Der Sockel steht IM FLUSS unter der Baumbühne, nicht als schwebende Karte
 * darauf. Zwei Gründe, beide zwingend:
 *
 * 1. Die Bühne trägt `transform: scale()` mit Zoom 0,55–2,2. Alles darin
 *    skaliert mit, und eine Ertragszeile in halber Größe ist keine Anzeige mehr.
 * 2. Bei Standardzoom (1,7) ragt die Bühne weit über das Panel hinaus — der
 *    Zweigring liegt dann bei rund 500px vom Zentrum, also genau dort, wo eine
 *    unten zentrierte Karte läge. Ein Knoten hinter dem Sockel liefe weiter,
 *    wäre aber nicht mehr anklickbar.
 *
 * Der Preis ist, dass die Bühne diese Höhe verliert und bei Einpasszoom kleiner
 * rendert. Das ist der ehrliche Preis für eine Anzeige, die nie etwas verdeckt.
 *
 * **Von 72 auf 48 gefallen** (kompakt 60 → 40), als der Sockel aufhörte, vier
 * Zahlen zu zeigen. Drei davon — Chime-Bestand, Chimes/Sek, Chimes/Klick —
 * standen wörtlich in der Kopfzeile des Spiels, und die ist sichtbar, während
 * das Profil offen steht: das Modal beginnt UNTER ihr (`BardProfileMenu`,
 * `top: calc(var(--level-badge-bottom, …) + 8px)`). Der alte Kopfkommentar
 * begründete den Sockel mit „die Kopfzeile steht außerhalb des Profil-Fensters"
 * — außerhalb heißt aber nicht verdeckt.
 *
 * Was blieb, ist die einzige Zahl, die es sonst nirgends gab: WOHER der Ertrag
 * kommt. `FORGE_YIELD_SOURCES` unten trägt die Herkünfte, `shopStore
 * .cpsFactorBreakdown` die Werte. Die niedrigere Höhe fällt von selbst an den
 * Baum-Viewport (`flex: 1`), und `fitScale` nimmt `min(width, height)` — auf
 * flachen Viewports ist die Höhe das Knappe, der Zugewinn also echt.
 *
 * **Von 48 auf 64 gewachsen** (kompakt 40 → 56), als das Band aufhörte, nur aus
 * Farbflächen zu bestehen. Es trägt seitdem drei Zeilen statt einer: die
 * Kopfzeile mit dem Ergebnis, den Balken mit dem Faktor JE Herkunft, und die
 * Namen darunter. Die Rechnung für 64: Polster 6 · Kopfzeile 10 · Lücke 5 ·
 * Balken 20 · Lücke 3 · Namen 10 · Polster 6 = 60, der Rest ist Luft.
 *
 * Die sechzehn Pixel sind der Preis dafür, dass man nicht mehr hovern MUSS, um
 * überhaupt eine Zahl zu sehen — vorher stand im Sockel keine einzige.
 */
export const FORGE_YIELD_PLINTH_HEIGHT_PX = 64
/**
 * 60 und nicht 56: bei 56 blieben der Namenszeile gemessen 2px bis zur
 * Sockelkante. Abgeschnitten war nichts, aber die Reihe stand gedrängt, und
 * die Namen sind das, was die Farben überhaupt erst zuordenbar macht.
 */
export const FORGE_YIELD_PLINTH_HEIGHT_COMPACT_PX = 60

/**
 * Die Herkünfte des Chime-Ertrags — eine Zeile je Segment des Bandes,
 * Reihenfolge = Lesereihenfolge von links.
 *
 * Zusammen decken sie JEDEN Faktor aus `shopStore.calculateTotalCPS()` ab, und
 * eine Spec bindet das (`__tests__/stores/cpsFactorBreakdown.spec.ts`): das
 * Produkt aller Faktoren muss dem Multiplikator-Anteil der Kette entsprechen.
 * Wer der Kette einen Faktor hinzufügt, ohne ihn hier einzuordnen, bricht sie —
 * und das ist ihr Zweck.
 *
 * **Gruppiert nach dem System, das der SPIELER kennt, nicht nach Store-Grenze.**
 * Die Trennlinie ist dabei nicht die Herkunft, sondern die Dauer:
 *
 *   • Dauerhaft Erworbenes steht EINZELN — jedes ist eine Kaufentscheidung, und
 *     „dein Meep-Baum trägt nichts bei" ist eine Auskunft, auf die man handeln
 *     kann.
 *   • Befristetes steht ZUSAMMEN als `boons`. Vier Quellen, die im Sekundentakt
 *     kommen und gehen, wären vier zappelnde Mini-Segmente; als eine Aussage
 *     („gerade läuft etwas") ist es lesbar. Dass Augments hier stehen und nicht
 *     bei den gekauften Systemen, liegt am Getter: `temporaryCPSMultiplier`
 *     zählt ausschließlich laufende Zeit-Buffs.
 *
 * **Kein Glyph je Zeile.** Bei 48px Sockelhöhe bleiben einem Segment rund 14px
 * für seine Beschriftung; ein Icon davor halbiert die Textbreite und ist in
 * dieser Größe ohnehin nur noch ein grauer Fleck (Icon-Regel: unter 18px tragen
 * nur gefüllte, geometrische Formen). Farbe und Wort tragen die Aussage. Einzig
 * der Void-Abzug führt im Kärtchen sein kanonisches `VOID_CARD_ICON`.
 *
 * **Die Farben.** Wo das Projekt eine Systemfarbe kennt, steht sie hier und wird
 * nicht neu erfunden: Gold und Grün sind die Ringfarben aus
 * `FORGE_UPGRADE_GROUPS`, Eisblau die der Konstellationen, Violett das „episch"
 * der Boughs, Magenta `VOID_SEVERITY_COLOR.abyssal`, Rot das Projekt-Rot für
 * Fehlendes. Für Meeps, Items, Traits und Universum gibt es keine — sie sind
 * hier festgelegt, mit Abstand zu ihren Nachbarn im Band. `boons` trägt als
 * einziges einen entsättigten, kühlen Ton — es ist das einzige Segment, das
 * von selbst wieder verschwindet, und soll sich von den warmen Kauffarben
 * abheben, ohne sie zu übertönen.
 *
 * **Nicht heller als seine Nachbarn.** Im ersten Anlauf stand hier ein fast
 * weißes `#f2f0e0`, mit der Begründung „hell heißt flüchtig". Im Bild gemessen
 * war es der lauteste Punkt des ganzen Sockels: das Auge landete auf dem
 * Segment, das in dreißig Sekunden weg ist, während Strahlen und Baum daneben
 * verblassten. Was bleibt, darf nicht leiser sein als was vergeht.
 */
/**
 * Was für eine Art Herkunft das ist — und damit die Antwort auf die einzige
 * Frage, die der Sockel sonst falsch beantwortet: **ist „Faktor 1" hier ein
 * Mangel?**
 *
 * Vor diesem Feld prüfte `unusedYieldSources()` allein `factor === 1` und warf
 * drei grundverschiedene Zustände in eine Zone. Gemessen im Endzustand (Admin →
 * Max Everything) stand dort „3 unused", und alle drei waren richtig so:
 *
 *   • `earned`    — dauerhaft erworben. Neutral heißt: hier ist noch Luft. Das
 *                   ist die EINZIGE Natur, für die „ungenutzt" etwas aussagt.
 *   • `transient` — läuft von selbst ab (Drifter, Omen, Zeit-Augments, Bard-W).
 *                   Neutral heißt: gerade läuft nichts. Kein Versäumnis, ein
 *                   Zeitpunkt.
 *   • `toll`      — ein ABZUG (Void, Planetenboss). Neutral heißt: du zahlst
 *                   gerade nichts. Das ist der BESTFALL und stand als Mangel im
 *                   Bild — der Sockel forderte den Spieler auf, sich eine Strafe
 *                   zu besorgen.
 */
export type ForgeYieldNature = 'earned' | 'transient' | 'toll'

export interface ForgeYieldSourceDef {
  id: string
  /** Was unter dem Segment steht. Kurz — mehr als ein Wort passt nicht. */
  label: string
  /** Der ausgeschriebene Name im Kärtchen. */
  title: string
  color: string
  /** Ob „neutral" hier ein Mangel ist — siehe `ForgeYieldNature`. */
  nature: ForgeYieldNature
  /**
   * WO man dieses System größer macht — ein Satz, der im Kärtchen unter dem
   * Faktor steht.
   *
   * Er ist der Grund, warum das Band überhaupt jemandem hilft: eine Zahl sagt
   * „hier stehst du", ein Ort sagt „hier kannst du etwas tun". Derselbe Satz
   * beantwortet für ein ungenutztes System die Frage „wie fange ich an" — die
   * Antwort ist beide Male dieselbe Stelle im Spiel.
   *
   * Kurz halten: die Zeile steht in einem Kärtchen fester Breite und darf
   * höchstens zweizeilig umbrechen.
   */
  hint: string
}

export const FORGE_YIELD_SOURCES: readonly ForgeYieldSourceDef[] = [
  {
    id: 'solar',
    label: 'Solar',
    title: 'Solar rays',
    color: '#e8c040',
    nature: 'earned',
    hint: 'Raise the five rays at the heart of the tree.',
  },
  {
    id: 'forge',
    label: 'Forge',
    title: 'Star Forge',
    color: '#7fd048',
    nature: 'earned',
    hint: 'Grow branches, leaves and boughs in the tree.',
  },
  {
    id: 'meeps',
    label: 'Meeps',
    title: 'Meep skill tree',
    color: '#40c8b0',
    nature: 'earned',
    hint: 'Spend meeps in the Skill tab. It survives prestige.',
  },
  {
    id: 'codex',
    label: 'Codex',
    title: 'Astral Codex',
    color: '#86d0ff',
    nature: 'earned',
    hint: 'Reach the Chime Keeper stages in the Stats tab.',
  },
  {
    id: 'items',
    label: 'Items',
    title: 'Equipped items',
    color: '#d07a30',
    nature: 'earned',
    hint: 'Equip items on your champions in the Team tab.',
  },
  {
    id: 'traits',
    label: 'Traits',
    title: 'Origin traits',
    color: '#c9a0ff',
    nature: 'earned',
    hint: 'Field champions that share an origin.',
  },
  {
    id: 'universe',
    label: 'Cosmos',
    title: 'Providences',
    color: '#6a80d8',
    nature: 'earned',
    hint: 'Rolled when you leave a universe behind.',
  },
  {
    // Steht als EIGENE Zeile und nicht mehr in `universe` mit drin. Der Getter
    // `gameStore.activeModifier` ist das Produkt aus Vorsehung UND allen
    // dauerhaften Augment-Effekten; im Endzustand gemessen kamen daraus rund
    // ×50, die vollständig unter „Universe and providences" liefen — obwohl gar
    // kein Aufbruch stattgefunden hatte. Zehn Augments tragen einen
    // `cpsMultiplier`, und keiner davon war im Band als solcher zu sehen.
    //
    // NICHT zu verwechseln mit `boons`: dort stehen die BEFRISTETEN
    // Augment-Buffs (`augmentStore.temporaryCPSMultiplier`). Hier steht, was ein
    // angenommenes Augment dauerhaft trägt — bis zum nächsten Aufbruch.
    //
    // Die Farbe ist die des Projekts für Augments (`AUGMENT_RARITY_COLOR.epic`)
    // und nicht neu erfunden. Sie steht zwei Segmente von `traits` (#c9a0ff)
    // entfernt, dem einzigen anderen Violett — direkt daneben wären die beiden
    // in Bandbreite nicht auseinanderzuhalten.
    id: 'augments',
    label: 'Augments',
    title: 'Active augments',
    color: '#a855f7',
    nature: 'earned',
    hint: 'Picked on level-up. They reset when you prestige.',
  },
  {
    id: 'boons',
    label: 'Boons',
    title: 'Running boons',
    color: '#a9b6c4',
    nature: 'transient',
    hint: 'Temporary — drifters, omens, augments and abilities.',
  },
  {
    id: 'void',
    label: 'Void',
    title: 'The Void',
    color: '#e0409f',
    nature: 'toll',
    hint: 'Close the rift. It grows the longer it stands.',
  },
  {
    id: 'bosses',
    label: 'Bosses',
    title: 'Planet bosses',
    color: '#cc6050',
    nature: 'toll',
    hint: 'Defeat the planet boss to lift its toll.',
  },
]

/**
 * Die Kopfzeile über dem Band und der Leerzustand.
 *
 * Der Titel SAGT, was das Band ist, statt es zu benennen. „Chime yield" stand
 * hier zuerst und war der Kern der Rückmeldung „verstehe ich nicht": ein Name
 * über drei Farbflächen erklärt nichts, ein Satz schon. Zusammen mit dem `=`
 * vor der Leitzahl liest sich die Reihe als das, was sie ist — eine Rechnung.
 */
export const FORGE_YIELD_TITLE = 'What multiplies your chimes'
export const FORGE_YIELD_EMPTY = 'Nothing multiplies your chimes yet — grow the tree.'
/** Die Zone am Bandende für alles, was noch nichts beiträgt: „4 unused". */
export const FORGE_YIELD_UNUSED_LABEL = 'unused'
export const FORGE_YIELD_UNUSED_TITLE = 'Not contributing yet'
/**
 * Breite der Geister-Zone in Prozent der Bandbreite — FEST, nicht anteilig.
 *
 * Im frischen Spielstand sind sieben von zehn Herkünften neutral; anteilig
 * gezeichnet wäre das Ungenutzte das größte Element des Bandes und drängte
 * genau das an den Rand, was der Spieler bereits erreicht hat. Als schmaler
 * Anhang sagt sie dasselbe, ohne die Aussage zu kippen.
 */
export const FORGE_YIELD_UNUSED_WIDTH_PCT = 14
/**
 * Mindestbreite eines Segments in Prozent der Bandbreite. Ein Faktor von ×1,002
 * ergäbe sonst einen Strich von unter einem Pixel: unsichtbar, aber mit
 * Kärtchen — man kann ihn nicht treffen und weiß nicht, dass er da ist. Die
 * fehlende Breite nehmen die übrigen Segmente anteilig auf.
 */
export const FORGE_YIELD_MIN_SEGMENT_PCT = 2.5
/**
 * Ab welcher Breite ein Segment sein Wort trägt. Darunter bleibt es stumm und
 * spricht nur im Kärtchen: „Universe" braucht bei 10px Schrift rund 55px, und
 * ein auf drei Buchstaben abgeschnittenes Wort sagt weniger als keins. Der Wert
 * ist ein Anteil der BAUMSPALTE, die je nach Auflösung 700 bis 3200px misst —
 * auf 4K trägt damit fast jedes Segment sein Wort, auf Full HD nur die breiten.
 */
export const FORGE_YIELD_LABEL_MIN_PCT = 9
/**
 * Ab welcher Breite der FAKTOR im Balken selbst steht. Deutlich niedriger als
 * die Schwelle für das Wort darunter: `2.8×` sind vier Zeichen, `Cosmos` sechs
 * bis acht — und der Faktor ist die Zahl, um derentwillen das Band da ist. Wo
 * er nicht passt, bleibt der Balken leer und die Zahl steht im Kärtchen.
 */
export const FORGE_YIELD_VALUE_MIN_PCT = 5.5
/**
 * Feste Breite des Kärtchens.
 *
 * Fest, weil die Klemmung sie braucht: das Kärtchen steht über dem Segment, auf
 * das der Zeiger zeigt, und `.tree-panel` schneidet ab (`overflow: hidden`). Mit
 * `clamp(halbeBreite, mitte, 100% − halbeBreite)` bleibt es ohne jede Messung im
 * Bild — ein `ResizeObserver` für ein Hover-Element wäre der teurere Weg.
 */
export const FORGE_YIELD_TIP_WIDTH_PX = 250
/**
 * Chime-Bild der Kostenzeilen — dasselbe Artwork, das Header, Command Panel,
 * Sigil-Panel und Champion-Shop zeigen. Die Forge trug hier lange die
 * Goldmünze (`BardGold`) und war damit der einzige Ort im Spiel, an dem die
 * Währung anders aussah als überall sonst; die gemeinsame Datei ist obendrein
 * ein Cache-Treffer. Größte Anzeige ist 32px, `-128` bleibt die richtige Stufe.
 */
export const FORGE_CHIME_IMAGE = '/img/BardAbilities/BardChime-128.png'

/**
 * Was auf dem Kaufknopf steht, wenn er nicht geht. Ein bloßes `disabled` lässt
 * den Spieler raten, ob die Kasse oder das Lager leer ist — beides steht direkt
 * darüber, aber der Knopf ist die Stelle, auf die er schaut.
 */
export const FORGE_COST_LABEL = 'Cost'
export const FORGE_SHORT_CHIMES_LABEL = 'Not enough Chimes'
export const FORGE_SHORT_MATERIAL_PREFIX = 'Need '
/**
 * Das Wort auf dem Kaufknopf.
 *
 * „✦ Grow" stand hier lange. Das Glyph ist weg, weil der Knopf jetzt Wort UND
 * Preis trägt und ein Zierstern zwischen beiden nur Höhe kostete; das Wort ist
 * FORGE, weil der Reiter Star Forge heisst, die Kaufquittung sich als `forged`
 * meldet und der Admin-Knopf „Max Forge". Eine Handlung, ein Wort.
 *
 * Die ZIELSTUFE („→ Lv 13") stand einmal dahinter und ist gestrichen: die
 * grosse `Lv 12` links in derselben Zeile und der Wirkungssprung daneben sagen
 * sie zweimal. Im `title` des Knopfes steht sie weiter.
 */
export const FORGE_GROW_LABEL = 'FORGE'
/**
 * Wie eine erreichte Stufe anfängt. Steht hier, weil sie seit dem
 * Zeilen-Umbau die dominante Angabe eines Eintrags ist und an zwei Stellen
 * gleichzeitig erscheint (Zeile und Archiv-Chip); gesetzt wird sie
 * ausschließlich über `forgeLevelParts()`.
 */
export const FORGE_LEVEL_PREFIX = 'Lv '

/** Platzhalter im `desc` einer Forge-Definition, den der Stufenwert ersetzt. */
export const FORGE_DESC_VALUE_TOKEN = '{v}'
/** Derselbe Platzhalter mit Prozentzeichen — daran hängt die Einheit der Werte. */
export const FORGE_DESC_PERCENT_TOKEN = `${FORGE_DESC_VALUE_TOKEN}%`

// Cosmic Bargain
export const FORGE_BARGAIN_RESTOCK_MS = 8 * 3_600_000
/** Steht auf der Karte, solange kein Handel ausliegt — der Händler ist unterwegs. */
export const FORGE_BARGAIN_EMPTY_ICON = 'game-icons:night-sky'
export const FORGE_BARGAIN_REROLL_MATERIAL = 'dark_matter'
export const FORGE_BARGAIN_REROLL_COST = 1

// Tree zoom (wheel + buttons). The default starts zoomed-in on the sun and
// its five core rays; zooming out reveals the branch, leaf and bough rings.
/**
 * Alle vier Werte sind mit der Bühne mitgewachsen (820 → 1040, Faktor 1,268).
 *
 * Die Rechnung dahinter ist nicht die naheliegende. Dargestellt wird
 * `FORGE_STAGE_SIZE × fitScale × zoom`, und weil `fitScale` selbst durch
 * `FORGE_STAGE_SIZE` teilt, kürzt sich die Bühnengröße heraus: die gezeigte
 * Fläche ist schlicht `(Viewport − 2 × Padding) × zoom`. Was durch den vierten
 * Ring KLEINER wird, sind die inneren Ringe im Verhältnis zur Bühne — der
 * Blätterring fällt von 385/820 auf 385/1040. Genau um dieses Verhältnis
 * (Faktor 1,268) muss jeder Zoomwert steigen, das Minimum eingeschlossen.
 *
 * Erst falsch gemacht und im Bild gesehen: das Minimum war stattdessen auf 0,45
 * gesenkt worden, in der Annahme, der grössere Baum brauche mehr Luft. Er stand
 * dann als Briefmarke in der Mitte einer leeren Fläche. Bei 0,70 ist die
 * gezeigte Bühne kleiner als der Viewport, es passt also weiterhin alles ins
 * Bild — nur eben lesbar.
 */
export const FORGE_TREE_ZOOM_MIN = 0.7
export const FORGE_TREE_ZOOM_MAX = 2.8
export const FORGE_TREE_ZOOM_STEP = 0.19
export const FORGE_TREE_ZOOM_DEFAULT = 2.15

// Header universe block — meep counter count-up tween (steps × interval ≈ 320ms)
export const MEEP_COUNTUP_STEPS = 20
export const MEEP_COUNTUP_INTERVAL_MS = 16
// How long the meep counter keeps its "rising" highlight after the tween ends.
export const MEEP_RISING_HOLD_MS = 300
// How long the departure yield next to the stock keeps its acknowledgement
// pulse. Long enough to catch the eye, short enough that it is over before the
// next whole meep can accrue.
export const MEEP_GAIN_PULSE_MS = 520
