// Fortschritt über ein ganzes Spiel hinweg: Bard-Level und dessen Kostenkurve,
// Meeps, Fähigkeiten-Stufen, Universen (Prestige), Galaxien und die
// Abschnitts-Freischaltung.

// Leveling formula: 2500 * level^2.2
export const LEVEL_BASE = 2500
export const LEVEL_EXPONENT = 2.2
// Above LEVEL_SCALING_THRESHOLD: cost *= LEVEL_SCALING_FACTOR^(level - threshold)
// Threshold at 30 (not 200) so exponential braking keeps up with multiplicative augment CPS stacking.
export const LEVEL_SCALING_THRESHOLD = 30
export const LEVEL_SCALING_FACTOR = 1.1

/**
 * Der Wert, gegen den die Exponentialbremse läuft — ausgedrückt als Level.
 *
 * Sie wächst nicht bis hierhin und hört dann auf, sie NÄHERT sich an: der
 * gebremste Anteil ist `span · (1 − e^(−over/span))` mit `span = cap −
 * threshold`. Ein harter Deckel wäre eine Klippe in den Stufenkosten (die
 * Stufe dahinter kostete ein Fünftel der davor); so gibt es keinen Sprung.
 *
 * Ohne diesen Deckel ist die Bremse der ganze Berg: bei Level 200 steuert die
 * Potenz `L^2,2` eine Differenz von 3,2e6 bei, `1,1^170` dagegen 1,1e7 — die
 * Schwelle wächst also mit `1,1^L`, während CPS bestenfalls ebenso schnell
 * wächst (über gestapelte Augments, denn Gebäude skalieren nur logarithmisch
 * mit den Ausgaben). Zwei gleich schnelle Kurven, von denen eine multiplikativ
 * vorne liegt, laufen auseinander: gemessen über 24 Spielstunden stand das
 * Bard-Level nach 40 Minuten und brauchte bei Level 217 rechnerisch 28
 * Spieljahre für die nächste Stufe.
 *
 * Oberhalb des Deckels wächst die Schwelle nur noch polynomial. Damit kann die
 * Wirtschaft wieder aufschliessen und Level fallen spät erneut — statt gar
 * nicht mehr. 100 liegt bewusst hinter allem, was der Level FREISCHALTET
 * (Fähigkeitsränge sind bei 65 fertig, Skillpunkte verfallen ab 40): der
 * gebremste Bereich deckt die ganze Freischaltkurve ab, der freie dahinter ist
 * reiner Zahlenlauf.
 *
 * Der Preis dafür — häufigere Level und damit häufigere Augment-Wahl — wird
 * nicht in Kauf genommen, sondern getrennt bezahlt: `AUGMENT_LEVEL_INTERVAL`
 * entkoppelt die Auswahl vom einzelnen Level-Up. Ohne diese zweite Änderung
 * dreht der Deckel genau die Entscheidung um, die die Bremse begründet hat.
 */
export const LEVEL_SCALING_CAP_LEVEL = 100

/**
 * Was ein Universums-Durchlauf an Meeps einbringt:
 * `floor(MEEP_RUN_FACTOR × √(Chimes dieses Laufs / meepChimeRequirement))`.
 *
 * Meeps waren einmal eine laufende Währung — alle paar Sekunden fiel einer,
 * sobald genug Chimes zusammen waren, und das Prestige löschte anschliessend
 * Bestand UND den gesamten Skill-Tree. Der Baum wurde also je Universum neu
 * gekauft, und ein Aufbruch war ein reiner Rückschritt.
 *
 * Jetzt sind sie der Lohn des Aufbruchs: gesammelt wird über den ganzen
 * Durchlauf, ausgezahlt beim Prestige, und der Baum bleibt stehen. Damit hat
 * das Prestige zum ersten Mal etwas, das über den Durchlauf hinaus wächst.
 *
 * **Warum die Wurzel.** Ein linearer Anteil an den Chimes würde bedeuten:
 * doppelt so lange spielen, doppelt so viele Meeps — dann gäbe es nie einen
 * Grund aufzubrechen. Mit der Wurzel bringt ein längerer Lauf zwar mehr, aber
 * mit abnehmendem Ertrag, und „wann prestige ich?" wird zu einer Entscheidung.
 *
 * **Die Bezugsgröße ist NICHT mehr eine feste Zahl, sondern der BESTE
 * abgeschlossene Lauf des Spielers:**
 *
 *     meepChimeRequirement = max(MEEP_RUN_BASE_MIN, bestUniverseRunChimes × MEEP_RUN_SHARE)
 *                            × abilityMeepCostMultiplier × modifierMult × treeMult
 *
 * **Warum eine Ratsche statt einer Konstante.** Eine feste Basis ist genau
 * einmal richtig geeicht — davor zahlt sie nichts, danach alles. Die alte Basis
 * (1e9) liess den ersten Meep 390 Mio. Chimes kosten: im frischen Spielstand
 * mit `chimesPerClick = 1` zeigte die Passiv-Kachel „390.6M" und rührte sich
 * über Millionen Klicks nicht, während das Prestige-Tor schon bei 100 000 stand
 * — vier Größenordnungen Abstand, und die ersten zwölf Universen zahlten
 * schlicht null. Gegen den eigenen besten Lauf gemessen gibt dieselbe Formel in
 * JEDER Spielphase dieselbe Antwort: „so viel wie beim letzten Mal" zahlt immer
 * gleich viel. Die Ausbeute hängt danach nur noch am VERHÄLTNIS
 * `Laufchimes / Bestlauf` und nie mehr an der absoluten Größe der Zahlen — eine
 * Inflation der Wirtschaft kann sie deshalb nicht mehr verschieben.
 *
 * **Warum die Ratsche nur beim Aufbruch steigt** (`finishUniverseRun()`): so
 * steht die Anforderung innerhalb eines Laufs STILL, und `pendingMeeps` kann
 * aus dieser Quelle nie sinken. Monoton ist sie ausserdem, ein absichtlich
 * winziger Lauf senkt den Anker also nicht.
 *
 * **Die beiden Zahlen sind aufeinander abgestimmt, nicht frei gewählt.**
 * `MEEP_RUN_BASE_MIN` macht den ERSTEN Meep exakt 100 Chimes teuer
 * ((1/1,6)² × 256 = 100); Meep k kostet im ersten Lauf damit exakt k² × 100
 * (100 · 400 · 900 · 1600 · 2500 …), die Lücken wachsen in Hunderterschritten
 * und sind ab dem ersten Klick sichtbar. `MEEP_RUN_SHARE` zahlt für einen Lauf,
 * der den eigenen Bestwert TRIFFT, 1,6/√0,0025 = 32 Meeps; 2× Best → 45,
 * 4× → 64, 10× → 101, 100× → 320. Und beide greifen ineinander: der
 * Mindestwert bindet, bis der beste Lauf 256/0,0025 = 102 400 Chimes
 * übersteigt — das ist `UNIVERSE_RESCUE_INITIAL_COST` (100 000). Die Ratsche
 * übernimmt exakt dort, wo das erste Universum endet. (Der erste Aufbruch zahlt
 * deshalb 31 statt 32: bei 100 000 Laufchimes bindet noch der Mindestwert 256
 * statt der 250 aus dem Anteil.)
 *
 * **Was das für den Rhythmus heisst.** `UNIVERSE_RESCUE_COST_MULTIPLIER` ist 2,
 * wer also jeweils an der Rettungsschwelle aufbricht, liegt dauerhaft bei 2×
 * Bestwert und bekommt 45 Meeps je Aufbruch — über das ganze Spiel. 24
 * Aufbrüche ergeben rund 1080, mit dem Rabatt des eigenen Baums
 * (`meepCostMult` 0,6885 voll gekauft ⇒ ×1,21) rund 1250. Dagegen steht
 * `MEEP_TREE_TOTAL_COST`; `__tests__/config/meepEconomy.spec.ts` hält beide
 * zusammen.
 *
 * Gegenkraft dazu ist der Void: ein Einschlag frisst einen Teil der ANSTEHENDEN
 * Meeps (`gameStore.devourMeeps`, `VOID_IMPACT_MEEP_LOSS_PCT`). Wer den Aufbruch
 * hinauszögert, hat mehr im Feuer — genau die Entscheidung, die die Wurzel
 * ohnehin stellt, bekommt dadurch eine zweite Seite.
 */
export const MEEP_RUN_BASE_MIN = 256
export const MEEP_RUN_SHARE = 0.0025
export const MEEP_RUN_FACTOR = 1.6

/**
 * Was der ganze Meep-Baum kostet — die Summe seiner 25 Knoten.
 *
 * Steht hier und nicht nur im Katalog, weil sie eine BALANCE-Größe ist: sie
 * gehört neben die Ausbeute, gegen die sie geeicht wurde, nicht zwischen die
 * Icons und Beschreibungen der Knoten. Eine Spec prüft, dass der Katalog
 * dieselbe Summe ergibt.
 *
 * Bei 45 Meeps je Aufbruch im Dauerrhythmus sind das rund 26 Aufbrüche, mit dem
 * eigenen `meepCostMult`-Rabatt des Baums rund 22 — er ist also ein Ziel über
 * das ganze Spiel und kein Mitnahmekauf.
 */
export const MEEP_TREE_TOTAL_COST = 1188

// Abilities
export const MAX_ABILITY_LEVEL = 5

export const RESCUE_ROTATION_DURATION_MS = 2_000 // camera spin after role selection

export const GALAXY_TRANS_WARP_MS = 8_400
export const GALAXY_TRANS_DECEL_MS = 3_600
export const GALAXY_SPAWN_INTERVAL_MIN = 5_000
export const GALAXY_SPAWN_INTERVAL_MAX = 12_000
export const GALAXY_MAX_COUNT = 4

export const UNIVERSE_RESCUE_INITIAL_COST = 100_000
export const UNIVERSE_RESCUE_COST_MULTIPLIER = 2

// Ability defaults (??-operator fallbacks)
// Die früheren UNIVERSE_NEUTRAL_* standen hier, solange das Auswahl-Modal die
// festen Universums-Modifier gegen ihren Nullpunkt verglich. Seit Universum und
// Vorsehung zusammen gezogen werden, trägt jede Effektachse ihren Neutralwert
// selbst (`PROVIDENCE_EFFECT_META.neutral`) — dort, wo auch ihr Label steht.

export const ABILITY_CPS_PER_LEVEL_DEFAULT = 0.15
export const ABILITY_POWER_PER_LEVEL_DEFAULT = 300
export const ABILITY_MEEP_COST_PER_LEVEL_DEFAULT = 0.1
export const ABILITY_MEEP_COST_MIN_MULTIPLIER = 0.5
export const ABILITY_CPC_PER_LEVEL_DEFAULT = 0.25

// Galaxy boss search
export const GALAXY_STARS_BASE_REQUIRED = 3

/**
 * Ab welcher Galaxie die Sternzahl schneller wächst — und um wie viel.
 *
 * Bis einschliesslich `GALAXY_STARS_LATE_FROM` gilt die alte Reihe `3 + (g−1)`,
 * also 3/4/5/6/7/8. Das ist die erste Spielstunde, und die soll unverändert
 * schnell bleiben. Danach kommen `GALAXY_STARS_LATE_BONUS` Sterne je Galaxie
 * obendrauf.
 *
 * Der Grund steht in der Struktur des Spiels: Galaxien, Ladder und Sonnenphasen
 * sind drei parallel laufende Uhren, die Gesamtdauer ist also das MAXIMUM der
 * drei, nicht ihre Summe. Gemessen war die Galaxie-Achse mit ~22 h die längste;
 * sie muss mitwachsen, wenn das Spiel länger werden soll — sonst entsteht nur
 * Leerlauf auf den anderen beiden.
 */
export const GALAXY_STARS_LATE_FROM = 6
export const GALAXY_STARS_LATE_BONUS = 2

/**
 * Höchstzahl Sterne je Galaxie.
 *
 * Ohne Deckel verlangte Galaxie 40 achtzig Sterne — dieselbe Schleife achtzig
 * Mal, das ist kein Fortschritt mehr, sondern eine Strafe. Mit 36 bleibt eine
 * späte Galaxie bei rund zwei Stunden.
 */
export const GALAXY_STARS_MAX = 36
export const GALAXY_CHAMPION_ARRIVAL_SIGNAL_MS = 4000
export const GALAXY_STAR_FAILED_SIGNAL_MS = 2600 // "Star Lost" flash on the minimap
export const GALAXY_BOSS_SPAWN_ANIM_MS = 5_000

export const GALAXY_BOSS_PLANET_ORBIT_RX = 38
export const GALAXY_BOSS_PLANET_ORBIT_RY = 22
export const GALAXY_BOSS_PLANET_ORBIT_TILT = 0.1

// ── Galaxy-Boss Eskorten-Wellen ───────────────────────────────────────────
// Gesamtzahl der Eskorten-Sterne pro Galaxie: BASE + (galaxy-1) * PER_GALAXY,
// gedeckelt bei MAX. Sie erscheinen in Wellen à WAVE_SIZE — es sind also nie
// mehr als WAVE_SIZE Eskorten + Boss gleichzeitig im DOM (FPS-Schutz).
export const GALAXY_BOSS_ESCORT_BASE = 2
export const GALAXY_BOSS_ESCORT_PER_GALAXY = 1
export const GALAXY_BOSS_ESCORT_MAX = 12
export const GALAXY_BOSS_WAVE_SIZE = 3
/** Fächerung der Eskorten-Planetenbahnen: der äußerste liegt um diesen Anteil weiter außen. */
export const GALAXY_BOSS_ESCORT_ORBIT_SPREAD = 0.6
export const GALAXY_BOSS_ESCORT_PLANET_ORBIT_RX = 30
export const GALAXY_BOSS_ESCORT_PLANET_ORBIT_RY = 17
export const GALAXY_BOSS_ESCORT_PLANET_ORBIT_TILT = 0.12

// Planeten-Anzahl im Endkampf — wie bei normalen Sternen zufällig:
// Bossstern: 1 Boss-Planet + MIN..MIN+RANGE-1 Zusatzplaneten (3-4 Fights),
// Eskorten: MIN..MIN+RANGE-1 Planeten (1-3 Fights).
export const GALAXY_BOSS_EXTRA_PLANET_MIN = 2
export const GALAXY_BOSS_EXTRA_PLANET_RANGE = 2
export const GALAXY_BOSS_ESCORT_PLANET_MIN = 1
export const GALAXY_BOSS_ESCORT_PLANET_RANGE = 3

// Der Bossstern zieht aus einer eigenen, epischen Palette statt der normalen
// Spektralfarben — tiefes Magenta/Violett hebt ihn von allen anderen ab.
export const GALAXY_BOSS_STAR_COLORS: [number, number, number][] = [
  [255, 72, 190],
  [186, 85, 255],
  [255, 96, 96],
]
// Eskorten: bedrohliche Rot-/Glut-Töne
export const GALAXY_BOSS_ESCORT_COLORS: [number, number, number][] = [
  [255, 74, 58],
  [255, 122, 40],
  [214, 52, 132],
]

// Augments — Quantum Luck
/** 50/50 probability split for the Quantum Luck double-or-nullify branch */
export const QUANTUM_LUCK_THRESHOLD = 0.5

/**
 * Restzeit, unterhalb derer die Universums-Animation gar nicht mehr anläuft —
 * ein Aufblitzen von einem Sekundenbruchteil wirkt wie ein Darstellungsfehler.
 */
export const UNIVERSE_ANIM_MIN_REMAINING_MS = 150

// Admin Galaxy Jump — warp-flash duration (ms) after teleporting to a galaxy
export const GALAXY_JUMP_WARP_MS = 420

// Segment marks on the universe rescue bar (percent positions, every 10%).
export const UNIVERSE_BAR_TICK_PERCENTS = [10, 20, 30, 40, 50, 60, 70, 80, 90] as const
// Inset the dark text layer of the universe bar is clipped by, so it ends
// exactly on the fill edge: the fill itself starts 2px inside the track.
export const UNIVERSE_BAR_FILL_INSET_PX = 2
// Milestone rail below the universe rescue bar: one pip per 10% chunk.
export const UNIVERSE_MILESTONE_COUNT = 10
export const UNIVERSE_MILESTONE_STEP_PERCENT = 100 / UNIVERSE_MILESTONE_COUNT
// How long a freshly reached pip keeps its burst highlight.
export const UNIVERSE_MILESTONE_FLASH_MS = 1600

// ── Header universe tooltip ────────────────────────────────────────────────
// Wider than the material panel: this one carries two stat blocks side by side,
// and a narrower panel would break them back into one very tall column.
export const UNIVERSE_TOOLTIP_WIDTH = 'clamp(380px, 23vw, 540px)'
/**
 * Zeilen-Icons des Universums-Tooltips. Jedes Glyph steht im Panel genau
 * einmal — die beiden Blöcke liegen nebeneinander, ein zweimal verwendetes
 * Motiv wäre dort nicht mehr unterscheidbar. Bewusst dieselben Icons wie im
 * Bard-Stats-Katalog, wo die Kategorie dieselbe Sache zählt.
 */
export const UNIVERSE_TOOLTIP_ICONS = {
  timeHere: 'game-icons:sands-of-time',
  starsRescued: 'game-icons:star-satellites',
  galaxiesFreed: 'game-icons:galaxy',
  planetsCleared: 'game-icons:globe-ring',
  bossesFelled: 'game-icons:star-skull',
  starsLost: 'game-icons:falling-star',
  materials: 'game-icons:ore',
  clicks: 'game-icons:click',
  universesRescued: 'game-icons:portal',
  fastestRun: 'game-icons:stopwatch',
  lastRun: 'game-icons:backward-time',
  galaxyCores: 'game-icons:black-hole-bolas',
  playTime: 'game-icons:hourglass',
} as const

/**
 * Meeps und Chimes haben im Spiel ein eigenes Artwork — im Tooltip dasselbe
 * wie in der Kachelzeile darüber und in jeder Kostenangabe, statt eines
 * Iconify-Ersatzes, der dieselbe Sache anders aussehen ließe.
 *
 * Die 128er-Stufe, weil die Zeilen-Glyphen bei 1,3em auch auf 4K unter 34px
 * bleiben (siehe „Auflösungsvarianten" in CLAUDE.md).
 */
export const UNIVERSE_TOOLTIP_IMAGES = {
  meeps: '/img/BardAbilities/BardMeep-128.png',
  chimes: '/img/BardAbilities/BardChime-128.png',
} as const

/**
 * Das volle Meep-Artwork — für die beiden Stellen, an denen es GROSS steht:
 * die Header-Kachel und die Passive-Kachel der Fähigkeitenleiste (dort auf 4K
 * über 70px hoch). Für die 256er-Stufe gibt es keine Datei, und beide Stellen
 * greifen bewusst zur selben: eine zweite Stufe wäre ein zweiter Download und
 * ein zweiter Decode desselben Motivs statt eines Cache-Treffers.
 */
export const MEEP_ART_IMAGE = '/img/BardAbilities/BardMeep.png'

/**
 * Dieselbe Figur KLEIN — im Gewinn-Float über der Passiv-Kachel misst sie je
 * nach Auflösung 36–54px, das Original wäre dort ein 1024er-Bild auf ein
 * Zwanzigstel gequetscht. Die 128er-Stufe hält selbst auf der größten Stufe bei
 * DPR 2 noch echtes Downsampling ein (54 × 2 = 108 ≤ 128); eine 256er-Datei
 * gibt es für dieses Motiv ohnehin nicht. Sie ist bewusst dieselbe Datei, die
 * `UNIVERSE_TOOLTIP_IMAGES.meeps` und `MEEP_TREE_START_ICON` schon laden — ein
 * Cache-Treffer statt eines zweiten Decodes desselben Motivs.
 */
export const MEEP_ART_IMAGE_SM = '/img/BardAbilities/BardMeep-128.png'

/**
 * Das Meep-Sprite ist hochformatig und trägt oben wie unten einen breiten
 * Alpha-Rand — in derselben Box wie Chime und Glyph füllt es nur rund drei
 * Viertel der Höhe und wirkt daneben klein. Vergrößert wird per `scale`, nicht
 * über die Box: die Zeilenspalte ist Teil eines Rasters, das für alle Zeilen
 * gleich breit bleiben muss. Dieselbe Korrektur trägt die Meep-Kachel im
 * Header (`.meep-icon` in UniverseStatsRow.vue).
 */
export const UNIVERSE_TOOLTIP_MEEP_SCALE = 1.3
// Archived universe runs kept in the save. Only the fastest and the latest are
// read back, so the list exists as history, not as a growing ledger.
export const UNIVERSE_RUN_HISTORY_LIMIT = 12

// ── Header galaxy tooltip ──────────────────────────────────────────────────
/**
 * Schmaler als das Universums-Panel: die Galaxie zeigt eine Lage statt einer
 * Bilanz — ein Ziel, ein Balken, ein paar Kennzahlen. Auf 540px liefen die
 * Zeilenpaare auseinander, statt als Block gelesen zu werden.
 */
export const GALAXY_TOOLTIP_WIDTH = 'clamp(360px, 21vw, 500px)'
/** Dasselbe Artwork wie die Galaxy-Kachel darüber — der Kopf zitiert den Anker. */
export const GALAXY_TOOLTIP_IMAGE = '/img/galaxy-far-128.png'
/**
 * Zeilen- und Statusmarken des Galaxie-Panels. Wie im Universums-Panel steht
 * jedes Glyph im Panel genau einmal: Statuszeile und Zeilenblöcke sind
 * gleichzeitig sichtbar, ein zweimal verwendetes Motiv wäre dort nicht mehr
 * zuzuordnen. Das Schloss ist ein Bedienzustand und kommt deshalb als einziges
 * aus `lucide` (siehe „Icons" in CLAUDE.md).
 */
export const GALAXY_TOOLTIP_ICONS = {
  starsRescued: 'game-icons:star-satellites',
  starsLost: 'game-icons:falling-star',
  successRate: 'game-icons:archery-target',
  tier: 'game-icons:stairs-goal',
  starLevel: 'game-icons:star-formation',
  travel: 'game-icons:space-shuttle',
  roleChoice: 'game-icons:choice',
  championReady: 'game-icons:star-pupil',
  boss: 'game-icons:star-skull',
  escorts: 'game-icons:starfighter',
  cores: 'game-icons:black-hole-bolas',
  timeHere: 'game-icons:sands-of-time',
  bestGalaxy: 'game-icons:stopwatch',
  lastGalaxy: 'game-icons:backward-time',
  galaxiesCharted: 'game-icons:galaxy',
  warpReady: 'game-icons:portal',
  locked: 'lucide:lock',
} as const
/**
 * Wie viele Versuchsmarken die Kette unter dem Sternenbalken höchstens zeigt.
 * Darüber wird von links gekürzt (die jüngsten Versuche bleiben stehen): bei
 * einem Wert pro Versuch reißt die Kette sonst auf Full HD in eine zweite
 * Zeile, sobald eine Galaxie mit vielen Fehlschlägen läuft.
 */
export const GALAXY_ATTEMPT_STRIP_MAX = 24

// ── Header meep tooltip ────────────────────────────────────────────────────
/** Wie das Galaxie-Panel: eine Spalte Zweige, keine zwei Bilanzblöcke. */
export const MEEP_TOOLTIP_WIDTH = 'clamp(360px, 21vw, 500px)'
/**
 * Marken des Meep-Panels — jede genau einmal. Die Meeps und Chimes selbst
 * bringen ihr Artwork mit (`UNIVERSE_TOOLTIP_IMAGES`), hier stehen nur die
 * Dinge, für die es keins gibt.
 */
export const MEEP_TOOLTIP_ICONS = {
  power: 'game-icons:muscle-up',
  tree: 'game-icons:tree-growth',
  learnable: 'game-icons:light-bulb',
  spent: 'game-icons:pay-money',
  costPerMeep: 'game-icons:price-tag',
  eta: 'game-icons:hourglass',
  locked: 'lucide:lock',
  // Derselbe Glyph, den `VOID_CARD_ICON` und die Material-Quelle `void`
  // tragen — der Spieler soll die Zeile ohne Umweg dem Void zuordnen.
  devoured: 'game-icons:vortex',
} as const

// ── Chronicle (Meilensteine) ───────────────────────────────────────────────
/**
 * Stufen je Bahn. Die Zahl steht hier und nicht nur implizit in der Länge von
 * `stages`, weil zwei Stellen sie ohne die Definition brauchen: der Prüflauf
 * (Obergrenze der Schleife) und die Kopfzeile des Tabs (Gesamtzahl aus Bahnen
 * × Stufen). Eine Bahn mit abweichender Länge ist ein Fehler in der Config, den
 * der Spec zu `CHRONICLE_TRACKS` abfängt — zur Laufzeit prüft das niemand,
 * statische Daten brauchen keinen Wächter im Produktionsbuild.
 */
export const CHRONICLE_STAGES_PER_TRACK = 5
/**
 * Akzent des Herald-Banners beim Freischalten, als „r, g, b"-Tripel wie alle
 * Herald-Payloads. Gold statt der Bahnfarbe: das Banner meldet den Meilenstein
 * als solchen, die Bahnfarbe erzählt die Karte im Tab.
 */
export const CHRONICLE_HERALD_ACCENT = '232, 192, 64'
/**
 * Glyph des Rang-Banners. Die Stufen-Banner tragen das Zeichen ihrer Bahn — ein
 * Rang gehört keiner Bahn, sondern allen, und braucht deshalb ein eigenes. Der
 * Lorbeer ist die Auszeichnung selbst und steht ebenso am Lexikon-Eintrag.
 */
export const CHRONICLE_RANK_ICON = 'game-icons:laurels'
