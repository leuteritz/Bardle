// Fortschritt über ein ganzes Spiel hinweg: Bard-Level und dessen Kostenkurve,
// Meeps, Fähigkeiten-Stufen, Universen (Prestige), Galaxien und die
// Abschnitts-Freischaltung.

// Leveling formula: 25000 * level^3.2
export const LEVEL_BASE = 25_000
export const LEVEL_EXPONENT = 3.2
// Above LEVEL_SCALING_THRESHOLD: cost *= LEVEL_SCALING_FACTOR^(level - threshold)
// Threshold at 30 (not 200) so exponential braking keeps up with multiplicative augment CPS stacking.
export const LEVEL_SCALING_THRESHOLD = 30
export const LEVEL_SCALING_FACTOR = 1.15

/**
 * Der Wert, gegen den die Exponentialbremse läuft — ausgedrückt als Level.
 *
 * Sie wächst nicht bis hierhin und hört dann auf, sie NÄHERT sich an: der
 * gebremste Anteil ist `span · (1 − e^(−over/span))` mit `span = cap −
 * threshold`. Ein harter Deckel wäre eine Klippe in den Stufenkosten (die
 * Stufe dahinter kostete ein Fünftel der davor); so gibt es keinen Sprung.
 *
 * Ohne diesen Deckel ist die Bremse der ganze Berg: die Schwelle wüchse mit
 * `LEVEL_SCALING_FACTOR^L`, während CPS bestenfalls ebenso schnell wächst (über
 * gestapelte Augments, denn Gebäude skalieren nur logarithmisch mit den
 * Ausgaben). Zwei gleich schnelle Kurven, von denen eine multiplikativ vorne
 * liegt, laufen auseinander: gemessen über 24 Spielstunden stand das Bard-Level
 * nach 40 Minuten und brauchte bei Level 217 rechnerisch 28 Spieljahre für die
 * nächste Stufe.
 *
 * Oberhalb des Deckels wächst die Schwelle nur noch polynomial. Damit kann die
 * Wirtschaft wieder aufschliessen und Level fallen spät erneut — statt gar
 * nicht mehr. 100 liegt bewusst hinter allem, was der Level FREISCHALTET
 * (Fähigkeitsränge sind bei 27 fertig, Skillpunkte verfallen ab 21): der
 * gebremste Bereich deckt die ganze Freischaltkurve ab, der freie dahinter ist
 * reiner Zahlenlauf.
 */
export const LEVEL_SCALING_CAP_LEVEL = 100

/**
 * Alle wie viel Level ein Skillpunkt fällt. Ein Universum darf ihn über
 * `ModifierEffects.skillPointInterval` überschreiben.
 *
 * Stand als nacktes `?? 2` an zwei Enden des gameStore. Seit die Levelkurve
 * jede Stufe um Grössenordnungen teurer macht, fällt der Punkt bei jedem
 * Level: die 20 Punkte für vier Fähigkeiten auf Höchststufe sind sonst später
 * beisammen als der ganze übrige Freischaltbaum.
 */
export const SKILL_POINT_LEVEL_INTERVAL = 1

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
/**
 * **0,0025 → 0,000625**, als The Wandering einen sechsten Rang je Ast bekam.
 *
 * Warum AUSGERECHNET dieser Knopf: `MEEP_RUN_FACTOR` und `MEEP_RUN_BASE_MIN`
 * sind aneinander gekettet — `(1/1,6)² × 256 = 100` macht den ersten Meep exakt
 * 100 Chimes teuer und Meep *k* exakt `k² × 100`. Wer den Faktor anfasst,
 * schreibt die ganze Frühspiel-Ablesung um (Passiv-Kachel, `chimesToNextMeep`,
 * Pause-Füllstand). Der ANTEIL ist dagegen genau die Dauerrhythmus-Schraube:
 * „welcher Bruchteil deines besten Laufs ist eine Meep-Einheit".
 *
 * Gerechnet: im Dauerrhythmus (2× Bestwert, weil `UNIVERSE_RESCUE_COST_MULTIPLIER`
 * 2 ist) gilt `floor(1,6 × √(2 / SHARE))` — vorher 45, jetzt **90**. Gegen
 * `MEEP_TREE_TOTAL_COST` 2468 sind das 27,4 Aufbrüche; vorher waren es 26,4 gegen
 * 1188. Der Rhythmus bleibt also stehen, während der Baum um die Hälfte wuchs.
 *
 * Nebenwirkung, und sie ist gewollt: der Kreuzungspunkt Mindestanker ↔ Ratsche
 * wandert von 102.400 auf 409.600 Chimes. Damit binden die ersten DREI Aufbrüche
 * noch am Anker und ergeben eine Rampe 31 → 44 → 63 → 90, die es vorher nicht
 * gab — der erste Aufbruch zahlt weiterhin exakt 31.
 */
export const MEEP_RUN_SHARE = 0.000625
export const MEEP_RUN_FACTOR = 1.6

/**
 * Was das ganze Wandering kostet — die Summe seiner 30 Pfadknoten.
 *
 * Steht hier und nicht nur im Katalog, weil sie eine BALANCE-Größe ist: sie
 * gehört neben die Ausbeute, gegen die sie geeicht wurde, nicht zwischen die
 * Icons und Beschreibungen der Knoten. Eine Spec prüft, dass der Katalog
 * dieselbe Summe ergibt.
 *
 * Bei 90 Meeps je Aufbruch im Dauerrhythmus sind das rund 27 Aufbrüche, mit dem
 * eigenen `meepCostMult`-Rabatt der Strasse rund 23 — sie ist also ein Ziel über
 * das ganze Spiel und kein Mitnahmekauf.
 *
 * **1188 → 2468**, als jeder Ast einen sechsten Rang bekam: 220 für vigil und
 * resonance, 280 für cosmos, battle und warden — dieselbe Verdopplung, die die
 * beiden letzten Sprünge schon tragen (55→10, 70→140). Der Zufluss ist mit
 * `MEEP_RUN_SHARE` mitgegangen, nicht die Preise nach unten.
 */
export const MEEP_TREE_TOTAL_COST = 2468

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

/**
 * Wie viel „Tiefe" eine Galaxie hinzufügt — die EINE Skala, gegen die jede
 * mitwachsende Formel rechnet (`utils/game/galaxyDepth.ts`).
 *
 * Bei 1 ist die Tiefe identisch zu `galaxy − 1`, also exakt der Stand vor der
 * Einführung. Sinkt der Wert, kommen Galaxien schneller und alles, was an ihrer
 * Nummer hängt — Boss-HP, Void-HP, Reisedauer, Eskortenzahl, XP, Klick-Rampe —
 * wächst entsprechend langsamer je Galaxie. Das ist der Ausgleich dafür, dass
 * eine Galaxie mit gedeckelter Sternzahl weniger Inhalt trägt als früher.
 */
export const GALAXY_DEPTH_PER_GALAXY = 0.53

// Galaxy boss search
export const GALAXY_STARS_BASE_REQUIRED = 3

/**
 * Höchstzahl Sterne je Galaxie.
 *
 * War 36, mit einer zweiten Rampe darüber (`GALAXY_STARS_LATE_BONUS` ab
 * Galaxie 6). Beides ist gefallen: die Reihe lautet jetzt schlicht `3 + (g−1)`,
 * gedeckelt bei 7 — also 3/4/5/6/7/7/7…, und die ersten fünf Galaxien sind
 * Zeichen für Zeichen dieselben wie vorher.
 *
 * Zwei Gründe, und der zweite wiegt schwerer:
 *
 * 1. Die KARTE trug es nicht mehr. `generateGalaxyDots` strebt 0,085 Abstand an
 *    und gibt nach acht Versuchen auf; bei 36 Sternen plus Fehlversuchen lagen
 *    zwei Marken gemessen 25,5 px auseinander, bei 36 px Klickfläche
 *    (`__tests__/utils/game/voyageSites.spec.ts`).
 * 2. Länge aus Wiederholung ist keine Länge. Der Deckel bei 36 stand schon
 *    einmal gegen 80 mit genau dieser Begründung — „dieselbe Schleife achtzig
 *    Mal ist kein Fortschritt, sondern eine Strafe". 36 war davon nur der
 *    Faktor 2,2 entfernt.
 *
 * Was die Achse stattdessen trägt, in dieser Reihenfolge: Landfalls auf der
 * Reiseetappe · ein doppelt so grosses Kern-Finale (`GALAXY_BOSS_ESCORT_MAX` —
 * Eskorten falten sich auf der Karte in die EINE `core-gate`-Marke und kosten
 * damit keine) · und erst als Rest mehr Galaxien über
 * `GALAXY_DEPTH_PER_GALAXY`.
 */
export const GALAXY_STARS_MAX = 7

/**
 * Galaxien je Tier. Tier 1 spannt G1–G2, jedes weitere diese Zahl.
 *
 * War fest 3 im Rumpf von `tierOf()`. Mit dem Sterndeckel bei 7 kommen Galaxien
 * rund dreimal so schnell — bliebe die Spanne bei 3, verdreifachte sich auch die
 * Zahl der Tier-Tore je Stunde, und `computeTierUnlockCost` wüchse geometrisch
 * mit. Die Spanne trägt den Ausgleich, nicht die Kostenformel: dieselbe Wand in
 * einer anderen Farbe war hier schon einmal die falsche Antwort.
 *
 * Die 9 ist gegen die Tier-ZAHL gewählt, nicht gegen die Galaxienzahl. Vorher
 * lag das letzte Champion-Tor bei Galaxie 48, also `tierOf(48) = 17` — drei
 * Tiers ÜBER `TIER_UNLOCK_COST_CAP_TIER` (14), und diese drei liefen zu
 * gedeckelten Kosten, obwohl dahinter noch Tier-6-Champions standen. Genau das
 * nennt der Kommentar beim Kostendeckel als bekannten Schönheitsfehler.
 *
 * Mit Spanne 9 und dem neuen letzten Tor bei Galaxie 126 gilt
 * `tierOf(126) = 15`: nur noch EIN gedeckeltes Tor am Ende statt drei. Der
 * Kostendeckel muss deshalb nicht angefasst werden — der Fehler ist kleiner
 * geworden, nicht grösser.
 */
export const GALAXIES_PER_TIER = 9

/**
 * Mindest-Farbton-Abstand zur Vorgänger-Galaxie: verhindert, dass zwei
 * ähnliche Farbwelten (z. B. zwei Grüntöne) direkt aufeinander folgen.
 */
export const MIN_THEME_HUE_DISTANCE = 60

// ── Archiv-Nachtrag beim Admin-Galaxiesprung ──────────────────────────────
// Ein Sprung auf Galaxie N trägt die übersprungenen Läufe 1…N−1 nach, sonst
// bleiben Galaxy-Archiv und Voyages leer (completedGalaxies ist ihre einzige
// Quelle). Deterministisch je Galaxienummer — derselbe Sprung liefert immer
// dasselbe Archiv.
export const ADMIN_ARCHIVE_SEED_SALT = 7919
/** Galaxie 1 verliert keinen Stern; der Anteil steigt bis zur Rampe und sättigt. */
export const ADMIN_ARCHIVE_FAIL_RATE_MAX = 0.3
export const ADMIN_ARCHIVE_FAIL_RAMP_GALAXIES = 21
/** 3 Sterne ≈ 10 min, 7 Sterne ≈ 25 min — die Zeitrechnung aus docs/balance.md. */
export const ADMIN_ARCHIVE_SECONDS_PER_STAR = 210
export const ADMIN_ARCHIVE_DURATION_JITTER = 0.25
/**
 * Chimes, die ein nachgetragener Stern je geräumter Welt gezahlt haben soll.
 *
 * Aus der echten Rechnung zurückgerechnet: ein Boss trägt drei Belohnungsfächer,
 * das erste immer Chimes, die beiden anderen je zur Hälfte
 * (`BOSS_REWARD_MATERIAL_CHANCE`), jedes 1…`BOSS_REWARD_CHIMES_MAX`+1 — also
 * zwei Chime-Fächer à 3,5 im Mittel.
 */
export const ADMIN_ARCHIVE_CHIMES_PER_WORLD = 7
/**
 * Wachstum je Galaxietiefe. Gegen `galaxyDepth()` gerechnet, nie gegen
 * `galaxy - 1`: die Providence- und Forge-Multiplikatoren, die im echten Spiel
 * auf die Bossbelohnung gehen, wachsen mit dem Fortschritt, nicht mit der Nummer.
 */
export const ADMIN_ARCHIVE_CHIMES_PER_DEPTH = 0.55
/** Rückdatierung: der jüngste Eintrag liegt so weit zurück, dann je Lauf ein Sprung. */
export const ADMIN_ARCHIVE_RECENT_GAP_MS = 5 * 60_000
export const ADMIN_ARCHIVE_GAP_MS = 12 * 60_000

// ── Aufbruch-Nachtrag beim Sprung ins letzte Universum ────────────────────
// Ein Sprung setzt `currentUniverse`, lässt `universeRuns` aber leer — dann
// steht das Firmament ohne Tore da. Der Nachtrag rechnet die Rettungskosten
// nach (Anfangskosten mal Multiplikator hoch Aufbruch), plus diesen Überschuss:
// exakt auf der Schwelle bricht kein Spieler auf.
export const ADMIN_UNIVERSE_OVERSHOOT = 0.35
/** Eigene rng-Ströme, damit Reihenfolge, Kosten und Vorsehung nicht im
 *  Gleichschritt laufen — dieselbe Trennung wie bei den Archiv-Salzen. */
export const ADMIN_UNIVERSE_ORDER_SALT = 3617
export const ADMIN_UNIVERSE_CHIMES_SALT = 4133
export const ADMIN_UNIVERSE_PROVIDENCE_SALT = 4649

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
/**
 * Eskorten am Galaxiekern. War 12, ist 24.
 *
 * Sie sind die EINZIGE Inhaltsquelle, die der Galaxie-Achse Länge gibt, ohne
 * eine Marke auf die Karte zu legen — auf jeder Galaxiefläche falten sie sich
 * in die eine `core-gate`-Marke. Genau deshalb tragen sie den Ausgleich für den
 * Sterndeckel mit: aus vier Wellen zu dreien werden acht, und der Kern liest
 * sich als Finale statt als Nachklapp.
 */
export const GALAXY_BOSS_ESCORT_MAX = 24
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
/** Dasselbe Artwork wie die Galaxy-Kachel in UniverseStatsRow — eine Quelle. */
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

// ── Header level tooltip ──────────────────────────────────────
/** Schmaler als das Meep-Panel: eine Bilanz, ein Balken, eine kurze Liste. */
export const LEVEL_TOOLTIP_WIDTH = 'clamp(345px, 20vw, 495px)'

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
