// Der Spielerkörper als Sprite-Ebenen (utils/fx/sunBodySprite.ts): Spans,
// Detailstufen, Backing-Deckel, Cache, Animationstakte und Motivzahlen.
// Liest nur aus `sun.ts` — die Import-Richtung bleibt `sun ← sunSprite`.

import type { SunSpriteLayer } from '@/types'
import { SOLAR_SIGNATURE_MIN_DIAMETER } from '@/config/constants/sun'

/** Radius des sichtbaren Plasmakörpers als Anteil der halben Box. Entspricht
 *  der alten Gradientenkante (86 % mit weichem Auslauf) und damit
 *  `BLACK_HOLE_BODY_TO_BOX_FACTOR` (2 / 0,74 = 2,7): Klickfläche, Orbits und
 *  der Forge-Astansatz rechnen weiter gegen dieselbe Kante. */
export const SUN_SPRITE_BODY_FRACTION = 0.74

/** Kante je Ebene als Vielfaches der Box. Der Halo ersetzt die drei
 *  `box-shadow`-Ringe (bis 1,6 · 180 px bei 560 px Box), der Wake wird per
 *  `scale(SUN_WAKE_GROW)` noch weiter hinausgetragen. */
export const SUN_SPRITE_SPAN: Record<SunSpriteLayer, number> = {
  halo: 2.6,
  core: 1.0,
  surfaceA: 1.0,
  surfaceB: 1.0,
  corona: 2.4,
  flare: 2.4,
  wake: 2.0,
  coma: 1.6,
  jets: 1.8,
  bhJets: 1.2,
  bhHalo: 1.0,
  bhDisc: 1.0,
  bhShadow: 0.8,
  bhRing: 0.5,
  bhGlaze: 1.0,
}

/** Unter _PX_1 nur Halo und Kern (Header-Orb, Tooltip-Kugeln, Minimap); ab
 *  _PX_1 Korona, Coma und der Wake (der Orbit-Komet ist 64–104 px und braucht
 *  seinen Schweif); ab _PX_2 Konvektionsschichten, Eruptionen und Jets —
 *  dieselbe Schwelle wie die Zierebenen (Performance-Regel 7). */
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
 *  Schlüssel (Orbit 8 + Header 1 + Tooltip 7 + Profil-Tab 8 + Pause 8). */
export const SUN_SPRITE_CANVAS_MAX = 32
export const SUN_SPRITE_URL_MAX = 48

/** Überblendung beim Schlüsselwechsel und beim Körpertausch Komet → Spark. */
export const SUN_SPRITE_CROSSFADE_MS = 600
export const SUN_BODY_SWAP_MS = 600

/** Ruhig-realistisch: Konvektion und Korona laufen in Minuten um, unter 1°/s
 *  liest sich nichts als Drehung, nur als Leben. */
export const SUN_SURFACE_TURN_SEC_A = 420
export const SUN_SURFACE_TURN_SEC_B = 560
export const SUN_CORONA_TURN_SEC = 180
export const SUN_FLARE_CYCLE_SEC = 20
export const SUN_FLARE_VISIBLE_FRACTION = 0.12

/** Der Wake: drei versetzte Kopien EINES Kranzes fahren nach aussen. */
export const SUN_WAKE_SEC = 2.4
export const SUN_COMET_WAKE_SEC = 2.0
export const SUN_WAKE_COPIES = 3
export const SUN_WAKE_GROW = 1.6
/** Streifenzahl im Kranz: Boden plus Signatur- und Phasenzuschlag. */
export const SUN_WAKE_STREAKS_MIN = 36
export const SUN_WAKE_STREAKS_RANGE = 36
/** Zuschlag auf die Wake-Dichte je Phasen- bzw. Kometenstufe (0..1 gesamt). */
export const SUN_WAKE_PHASE_GAIN = 0.12

/** Sonnenfleckengruppen je Phase (Spark … Pyre). Riesen haben wenige, grosse. */
export const SUN_SPOT_GROUPS_BY_PHASE = [1, 2, 4, 3, 2]
/** Granulationszellen relativ zum Körperradius je Phase — Riesen haben
 *  wenige, riesige Zellen (Betelgeuse), Hauptreihensterne feine. */
export const SUN_GRANULE_SIZE_BY_PHASE = [0.11, 0.07, 0.06, 0.13, 0.22]
/** Korona-Streamer je Phase. */
export const SUN_CORONA_STREAMERS_BY_PHASE = [6, 12, 14, 10, 8]
export const SUN_FLARE_PLUMES = 2

/** Komet: Ausgasung erst, wenn drei Strahlen gezündet sind; Goldadern je Stufe. */
export const COMET_JET_MIN_STAGE = 3
export const COMET_GOLD_VEINS_BY_STAGE = [0, 2, 4, 6, 8, 10]
/** Ionenschweif — bläulich, dünn, gerade; der Staubschweif trägt das Gold. */
export const SUN_COMET_ION_RGB: readonly [number, number, number] = [150, 200, 255]

/** Autorisierte Kante des Header-Orbs und der Tooltip-Kugeln — unter _PX_1. */
export const SUN_ORB_SPRITE_PX = 48
