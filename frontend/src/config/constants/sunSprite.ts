// Der Spielerkörper als Sprite-Ebenen (utils/fx/sunBodySprite.ts): Spans,
// Detailstufen, Backing-Deckel, Cache, Animationstakte und Motivzahlen.
// Liest nur aus `sun.ts` — die Import-Richtung bleibt `sun ← sunSprite`.

import type { SunBandLayer, SunSpriteLayer } from '@/types'
import { SOLAR_SIGNATURE_MIN_DIAMETER } from '@/config/constants/sun'

/** Radius des sichtbaren Plasmakörpers als Anteil der halben Box. Entspricht
 *  der alten Gradientenkante (86 % mit weichem Auslauf) und damit
 *  `BLACK_HOLE_BODY_TO_BOX_FACTOR` (2 / 0,74 = 2,7): Klickfläche, Orbits und
 *  der Forge-Astansatz rechnen weiter gegen dieselbe Kante. */
export const SUN_SPRITE_BODY_FRACTION = 0.74

/** Kante je Ebene als Vielfaches der Box. Der Halo ersetzt die drei
 *  `box-shadow`-Ringe (bis 1,6 · 180 px bei 560 px Box), der Wake wird per
 *  `scale(SUN_WAKE_GROW)` noch weiter hinausgetragen. Bänder: der SLOT ist die
 *  Box, das Bild darin ein Streifen (SUN_BANDS). */
export const SUN_SPRITE_SPAN: Record<SunSpriteLayer, number> = {
  halo: 2.6,
  core: 1.0,
  bandN: 1.0,
  bandE: 1.0,
  bandS: 1.0,
  shade: 1.0,
  corona: 2.4,
  flare: 2.4,
  wake: 2.0,
  coma: 1.6,
  jets: 1.8,
  bhJets: 1.2,
  bhHalo: 1.0,
  bhDisc: 1.0,
  bhDiscIn: 1.0,
  bhShadow: 0.8,
  bhRing: 0.5,
  bhGlaze: 1.0,
}

/* ── Achsdrehung: die Oberfläche ROLLT als Streifen unter einer Kreismaske ──
   Einheit ist der Körperradius br. Eine Periode ist 4 br — die sichtbare
   Scheibe (2 br) ist die halbe Periode, wie bei einer echten Halbkugel; das
   Bild trägt ZWEI Perioden, `translateX(50 %)` ist dann nahtlos. Drei
   Breitenbänder rollen ∝ cos(Breite): Differentialrotation ist der stärkste
   3D-Hinweis, den eine Scheibe ohne Projektion hergibt. N ≠ S, sonst tickt es
   symmetrisch. */
export const SUN_BAND_PERIOD_BR = 4
export const SUN_BAND_STRIP_PERIODS = 2
export interface SunBandRow {
  y: number
  h: number
  /** Dauerteiler: Umlaufzeit = --sun-turn / speed. */
  speed: number
  /** Anteil der Periode — die STRECKE, die das Band je Umlauf zurücklegt. */
  periodK: number
}
export const SUN_BANDS: Record<SunBandLayer, SunBandRow> = {
  bandN: { y: -0.62, h: 0.8, speed: 0.74, periodK: 1 },
  bandE: { y: 0, h: 1.12, speed: 1, periodK: 1 },
  bandS: { y: 0.62, h: 0.8, speed: 0.68, periodK: 1 },
}

/* Der Komet ist ein FELS, keine Plasmakugel. Differentialrotation wie oben wäre
   hier falsch — sie liest sich als Flüssigkeit. Ein starrer Körper braucht
   überall dieselbe Umlaufzeit (speed 1); die Polbänder legen dafür die KÜRZERE
   Strecke zurück, weil ihr Breitenkreis kleiner ist: periodK ist cos der
   Breite (die Bänder sitzen bei sin φ = 0,62, also φ ≈ 38,3° → cos ≈ 0,78). */
export const COMET_BANDS: Record<SunBandLayer, SunBandRow> = {
  bandN: { y: -0.62, h: 0.8, speed: 1, periodK: 0.78 },
  bandE: { y: 0, h: 1.12, speed: 1, periodK: 1 },
  bandS: { y: 0.62, h: 0.8, speed: 1, periodK: 0.78 },
}
/** Wobble der Kometensilhouette (lumpyPath): der Fels ist eine Kartoffel, sein
 *  kleinster Radius liegt damit bei 1 - Wobble. COMET_BAND_MASK_EDGE rechnet
 *  dagegen — sonst schweben Bandmotive in den Dellen über der Silhouette. */
export const COMET_WOBBLE = 0.09
/** Vertikale Stauchung der Motive eines Polbands — dieselbe cos-Breite. */
export const COMET_BAND_LAT_SQUASH = 0.78
/** Sprenkel je Streifen, die das Felskorn tragen (Detail 1 / 2). Sie ERSETZEN
 *  das Rauschmuster, das der Kern bis Detail 0 trägt: als Pattern liesse es
 *  sich nicht nahtlos rollen, jedes Korn steht deshalb doppelt (bei lon und
 *  lon + Periode). Die Zahl liegt in derselben Grössenordnung wie die
 *  Granulation des Sterns (360 / 640 je Band). */
export const COMET_BAND_GRAIN = [280, 520]
/** Randverdunkelung des Felsens auf der Schattenebene: innerer Rand als Anteil
 *  des Körperradius, Deckkraft an der Kante. Sie steht STILL — das Motiv soll
 *  am Limbus verlöschen, nicht das Licht mitdrehen. */
export const COMET_LIMB_INNER = 0.52
export const COMET_LIMB_ALPHA = 0.5
/** Vertikaler Auslauf oben/unten je Band (in br) — die Bänder überlappen. */
export const SUN_BAND_EDGE_FADE_BR = 0.14
/** Deckel auf die STREIFENBREITE in Gerätepixeln; darüber sinkt der dpr. */
export const SUN_BAND_MAX_BACKING_PX = 2048
/** Kreismaske am Band-Slot, Anteile von br: voll bis _FULL, aus bei _EDGE.
 *  Der weiche Rand ersetzt die Perspektivstauchung am Limbus. */
export const SUN_BAND_MASK_FULL = 0.7
export const SUN_BAND_MASK_EDGE = 0.96
/** Der Komet braucht eine engere Maske: seine Silhouette ist eine Kartoffel
 *  (Wobble 0,09), ihr kleinster Radius liegt bei 0,91 br. Mit der Sternmaske
 *  (0,96) schwebten Motive in den Dellen über dem Fels — sichtbar erst, seit
 *  die Bänder die ganze Scheibe decken statt nur den Äquator. */
export const COMET_BAND_MASK_FULL = 0.62
export const COMET_BAND_MASK_EDGE = 0.9

/** Umlaufzeit am Äquator je Phase (Spark … Pyre) — Riesen drehen langsamer;
 *  ein Fleck quert die Scheibe in der halben Zeit. */
export const SUN_TURN_SEC_BY_PHASE = [42, 50, 56, 74, 96]
/** Umlaufzeit je Kometenstufe — dieselbe Lesart: der Fels wächst über sechs
 *  Stufen (COMET_STAGE_RADII 16 → 26) und dreht dabei träger. Bleibt unter der
 *  schnellsten Sternphase, er ist der kleinste Körper der Reise. */
export const COMET_TURN_SEC_BY_STAGE = [18, 20, 22, 25, 28, 32]

/** Unter _PX_1 nur Halo und Kern (Header-Orb, Tooltip-Kugeln, Minimap); ab
 *  _PX_1 Band, Schatten, Korona, Coma und der Wake (der Orbit-Komet ist
 *  64–104 px und braucht seinen Schweif); ab _PX_2 Eruptionen und Jets —
 *  dieselbe Schwelle wie die Zierebenen (Performance-Regel 7).
 *
 *  Bei den BÄNDERN staffelt nur der Stern (ab _PX_2 alle drei). Der Komet
 *  trägt alle drei schon ab _PX_1: er kommt im Orbit nie über Stufe 1, und mit
 *  einem einzelnen Äquatorband wanderten dort Punkte über eine stehende
 *  Kartoffel, statt dass sich der Fels dreht. */
export const SUN_SPRITE_DETAIL_PX_1 = 60
export const SUN_SPRITE_DETAIL_PX_2 = SOLAR_SIGNATURE_MIN_DIAMETER

/** Gerätepixel-Kante, über die kein Sprite gerastert wird; darüber skaliert
 *  CSS hoch. Weiche Ebenen vertragen mehr Hochskalierung als der Kern. */
export const SUN_SPRITE_MAX_BACKING_PX = 1024
export const SUN_SPRITE_CORE_MAX_BACKING_PX = 1400
/** Kante der Arena-Kugel, bis zu der die Kalotte ein Kern-Sprite trägt. */
export const SUN_SPRITE_DOME_MAX_PX = 2400
/** Die Kalotte quantisiert ihren Schlüssel, sonst rastert jeder Resize neu. */
export const SUN_SPRITE_DOME_STEP_PX = 64

/** Roh-Canvas bleiben erhalten — die Minimap zeichnet sie synchron per
 *  drawImage. URLs: mindestens das Doppelte der gleichzeitig gemounteten
 *  Schlüssel (Orbit 11 + Header 1 + Tooltip 8 + Profil-Tab 9 + Pause 9). */
export const SUN_SPRITE_CANVAS_MAX = 48
export const SUN_SPRITE_URL_MAX = 80

/** Überblendung beim Schlüsselwechsel und beim Körpertausch Komet → Spark. */
export const SUN_SPRITE_CROSSFADE_MS = 600
export const SUN_BODY_SWAP_MS = 600

/** Die Korona dreht NICHT (ein Windrad las sich als flache Drehung) — sie
 *  atmet nur in der Deckkraft. Eruption alle 20 s. */
export const SUN_CORONA_BREATHE_SEC = 9
export const SUN_FLARE_CYCLE_SEC = 20

/** Der Wake sind Böen: drei Kränze mit ungleichen Zyklen (Schwebung), jeder
 *  bis _IDLE_FRACTION unsichtbar, dann schiesst er auf _GROW hinaus und zieht
 *  sich zurück. Ein dauerhaft laufender Kranz war „immer Wind", keine Böe. */
export const SUN_WAKE_GUST_SEC = 12
export const SUN_COMET_WAKE_GUST_SEC = 10
export const SUN_WAKE_GUST_STAGGER = [1, 1.31, 1.73]
export const SUN_WAKE_GUST_IDLE_FRACTION = 0.62
export const SUN_WAKE_COPIES = SUN_WAKE_GUST_STAGGER.length
export const SUN_WAKE_GROW = 1.6
/** Streifenzahl im Kranz: Boden plus Signatur- und Phasenzuschlag. */
export const SUN_WAKE_STREAKS_MIN = 36
export const SUN_WAKE_STREAKS_RANGE = 36
/** Zuschlag auf die Wake-Dichte je Phasen- bzw. Kometenstufe (0..1 gesamt). */
export const SUN_WAKE_PHASE_GAIN = 0.12

/* ── Nachlaufachse des Kranzes ─────────────────────────────────────────────
   Die Richtung steckt im BILD, nicht im Sprite-Schlüssel: der Kranz wird
   kanonisch nach +x gebacken, den Winkel legt der Frame-Transform
   (`wakeFollowerTransform`). Ein rotationssymmetrischer Kranz — 36…72 Streifen
   auf `i · GOLDEN` — sah in jeder Kurve gleich aus; eine Drehung an ihm ist
   per Konstruktion unsichtbar. Die Fläche wird nur UMVERTEILT: der Slot bleibt
   `SUN_SPRITE_SPAN.wake` (2,0), der Deckel bei 1,96 r die Slotkante. */
export const SUN_WAKE_TAIL_LEN_K = 1.3
export const SUN_WAKE_NOSE_LEN_K = 0.4
export const SUN_WAKE_TAIL_ALPHA_K = 1.25
export const SUN_WAKE_NOSE_ALPHA_K = 0.34
/** Härtet den Übergang: linear las sich die Keule als schiefer Kranz. */
export const SUN_WAKE_TAIL_BIAS_POW = 1.6
/** Neigung jedes Streifens zur Nachlaufachse in rad — Haare im Fahrtwind. */
export const SUN_WAKE_SWEEP = 0.34

/** Sonnenfleckengruppen je Phase (Spark … Pyre). Riesen haben wenige, grosse. */
export const SUN_SPOT_GROUPS_BY_PHASE = [1, 2, 4, 3, 2]
/** Granulationszellen relativ zum Körperradius je Phase — Riesen haben
 *  wenige, riesige Zellen (Betelgeuse), Hauptreihensterne feine. */
export const SUN_GRANULE_SIZE_BY_PHASE = [0.11, 0.07, 0.06, 0.13, 0.22]
/** Korona-Streamer je Phase — leiser als die erste Fassung (6/12/14/10/8). */
export const SUN_CORONA_STREAMERS_BY_PHASE = [5, 9, 10, 7, 6]
/** Deckkraft, Breite [Boden, Streuung] und Länge [Boden, Streuung, Signatur]
 *  der Streamer in br — die dreieckigen Zacken sollen tragen, nicht führen. */
export const SUN_CORONA_STREAMER_ALPHA = 0.12
export const SUN_CORONA_STREAMER_ALPHA_GIANT = 0.085
export const SUN_CORONA_STREAMER_ALPHA_SIG_GAIN = 0.32
export const SUN_CORONA_STREAMER_W = [0.06, 0.09]
export const SUN_CORONA_STREAMER_LEN = [1.55, 0.7, 0.9]
export const SUN_FLARE_PLUMES = 2

/** Komet: Ausgasung erst, wenn drei Strahlen gezündet sind; Goldadern je Stufe. */
export const COMET_JET_MIN_STAGE = 3
export const COMET_GOLD_VEINS_BY_STAGE = [0, 2, 4, 6, 8, 10]
/** Ionenschweif — bläulich, dünn, gerade; der Staubschweif trägt das Gold. */
export const SUN_COMET_ION_RGB: readonly [number, number, number] = [150, 200, 255]

/** Autorisierte Kante des Header-Orbs und der Tooltip-Kugeln — unter _PX_1. */
export const SUN_ORB_SPRITE_PX = 48
