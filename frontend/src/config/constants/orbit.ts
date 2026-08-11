// Die Umlaufbahnen im Idle-View: Bahn-Geometrie der Champions, Planeten und
// Sterne, ihr Verhalten hinter der Sonne, die Cooldown-Ringe und die Drifter,
// die durch das Bild fliegen.

import type { ChampionRole, RoleAbilityMetric, RoleKitAbility } from '@/types'
import { SUN_RADIUS } from '@/config/constants/sun'
import {
  ROLE_TOP_SHIELD_REBUILD_MS,
  ROLE_MID_CURSE_INTERVAL_MS,
  ROLE_MID_CURSE_TYPE_COUNT,
  ROLE_ADC_BURST_DAMAGE,
  ROLE_ADC_BURST_INTERVAL_MS,
  SUPPORT_PLANET_HEAL_AMOUNT,
  SUPPORT_PLANET_HEAL_INTERVAL_MS,
} from '@/config/constants/roles'
import { JUNGLE_BUFF_DEFS, JUNGLE_BUFF_COOLDOWN_MS } from '@/config/constants/planets'

export const STAR_FIGHT_TIMER_WARNING_S = 20 // star-fight timer turns amber below this
export const STAR_FIGHT_TIMER_CRITICAL_S = 10 // star-fight timer turns red + pulses below this

/**
 * Role ability metadata for the orbit/universe combat (roleBehaviorStore).
 *
 * `metrics` is the form the details page shows: [Wirkung, Takt] — siehe
 * RoleAbilityMetric. Die Zahlen stammen aus denselben Konstanten, die das
 * Verhalten steuern, damit eine Balance-Änderung die Anzeige mitnimmt. Aus
 * demselben Grund steht auch in `desc` keine getippte Zahl mehr: dort standen
 * einmal „every 5 seconds" neben einer Metrik, die dieselben 5 Sekunden aus der
 * Konstante ableitete — zwei Quellen für eine Zahl, und die Prosa hätte beim
 * ersten Nachjustieren gelogen.
 *
 * Was der Void dieser Rolle antut, steht NICHT hier, sondern als eigener
 * Bereich in `VOID_ROLE_ABILITIES`. Er stand kurzzeitig als Zusatzsatz in
 * `desc`, weil es dafür keine sichtbare Fläche gab — `desc` erscheint nur im
 * Tooltip. Jetzt gibt es eine, und derselbe Satz an zwei Orten wäre eine
 * Aussage zu viel.
 */
export const ORBIT_ROLE_ABILITIES = {
  top: {
    name: 'Aegis Wall',
    icon: 'game-icons:bordered-shield',
    line: 'Swallows the next enemy shot',
    desc: `Raises a shield that swallows the next enemy shot, reforged every ${ROLE_TOP_SHIELD_REBUILD_MS / 1000} seconds.`,
    metrics: [
      { value: '1', label: 'Shot' },
      { value: `${ROLE_TOP_SHIELD_REBUILD_MS / 1000}s`, label: 'Rebuild' },
    ] satisfies RoleAbilityMetric[],
  },
  jungle: {
    name: 'Wild Blessing',
    icon: 'game-icons:vine-whip',
    line: 'Blesses passing planets with a jungle buff',
    desc: 'Patrols the orbit and blesses nearby planets with potent jungle buffs.',
    metrics: [
      { value: `${Object.keys(JUNGLE_BUFF_DEFS).length}`, label: 'Buffs' },
      { value: `${JUNGLE_BUFF_COOLDOWN_MS / 1000}s`, label: 'Cooldown' },
    ] satisfies RoleAbilityMetric[],
  },
  mid: {
    name: 'Chaos Curse',
    icon: 'game-icons:spell-book',
    line: 'Hurls a random curse at the boss',
    desc: `Every ${ROLE_MID_CURSE_INTERVAL_MS / 1000} seconds hurls a random curse at the boss — rot, weakness or instant doom.`,
    metrics: [
      { value: `${ROLE_MID_CURSE_TYPE_COUNT}`, label: 'Curses' },
      { value: `${ROLE_MID_CURSE_INTERVAL_MS / 1000}s`, label: 'Cooldown' },
    ] satisfies RoleAbilityMetric[],
  },
  adc: {
    name: 'Piercing Volley',
    icon: 'game-icons:striking-arrows',
    line: 'A focused volley straight into the boss',
    desc: `Looses a focused volley every ${ROLE_ADC_BURST_INTERVAL_MS / 1000} seconds, striking the boss for heavy bonus damage.`,
    metrics: [
      { value: `${ROLE_ADC_BURST_DAMAGE}`, label: 'Damage' },
      { value: `${ROLE_ADC_BURST_INTERVAL_MS / 1000}s`, label: 'Cooldown' },
    ] satisfies RoleAbilityMetric[],
  },
  support: {
    name: 'Guardian Light',
    icon: 'game-icons:glowing-hands',
    line: 'Mends wounded planets, and Bard when calm',
    desc: 'Mends wounded planets nearby — and the Bard himself when all is calm.',
    metrics: [
      { value: `${SUPPORT_PLANET_HEAL_AMOUNT} HP`, label: 'Mend' },
      { value: `${SUPPORT_PLANET_HEAL_INTERVAL_MS / 1000}s`, label: 'Cooldown' },
    ] satisfies RoleAbilityMetric[],
  },
} as const satisfies Record<ChampionRole, RoleKitAbility>

/** Obergrenze des Hinweisring-Sprite-Caches, bevor er geleert wird. */
export const HINT_SPRITE_CACHE_LIMIT = 64

/** Schrittweite, mit der die Drifter-Bahn abgetastet wird, um ihre Tangente zu bestimmen. */
export const DRIFTER_TANGENT_PROBE_STEP = 0.01

export const DRIFTER_BURST_ANGLE_JITTER = 0.7
/** Flugweite der Burst-Funken, als Vielfaches der Drifter-Größe. */
export const DRIFTER_BURST_DIST_MIN_FACTOR = 1.1
export const DRIFTER_BURST_DIST_RANGE_FACTOR = 1.1

// Star system — fly-in spawn animation
export const STAR_SPAWN_DURATION_MS = 8_000 // fly-in animation duration
export const STAR_SPAWN_FLY_EASING = 5 // cubic ease-out exponent (higher = more aggressive deceleration)

// Star system — foreground orbiting stars & planets
export const STAR_ORBIT_SPEED_RESOURCE = 0.000084 // resource star around sun
export const STAR_ORBIT_SPEED_CHAMPION = 0.000044 // champion star around sun
export const STAR_ORBIT_SPEED_GALAXY_BOSS = 0.000024 // galaxy boss star around sun
export const STAR_ORBIT_SPEED_BOSS_ESCORT = 0.00006 // boss escort stars around sun
export const PLANET_ORBIT_SPEED_MIN = 0.0019 // resource/extra planet min speed
export const PLANET_ORBIT_SPEED_RANGE = 0.001 // resource/extra planet random range
export const PLANET_ORBIT_SPEED_CHAMP_MIN = 0.0018 // champion planet min speed
export const PLANET_ORBIT_SPEED_CHAMP_RANGE = 0.0008 // champion planet random range
export const PLANET_ORBIT_SPEED_EXTRA_MIN = 0.002 // extra planets in champion star min
export const PLANET_ORBIT_SPEED_EXTRA_RANGE = 0.001 // extra planets in champion star range
export const PLANET_ORBIT_SPEED_BOSS = 0.0016 // galaxy boss planet speed

export const CHAMPION_ORBIT_HIT_RANGE = 220 // px: champion orbit position must be within this of planet to deal damage

export const STAR_BURST_DELAY_BETWEEN_SHOTS = 200 // ms between individual shots within a burst
export const STAR_BURST_COOLDOWN = 10_000 // ms cooldown after a full burst completes

// Champion Orbit
export const BEHIND_SUN_SPEED_MULTIPLIER = 5
// Sterne (Star Fights) rasen hinter der Sonne noch schneller durch, damit die
// Eclipse-Phase (Boss unantastbar) möglichst kurz bleibt — gilt nur für Sterne
export const STAR_BEHIND_SUN_SPEED_MULTIPLIER = 10
export const HOVER_SPEED_MULTIPLIER = 0.3
export const ORBIT_RADIUS_SCALE = 1.8

// ── Geteilte Orbit-Phase der Spieler-Planeten (Idle-Orbit ↔ Planeten-Tab) ────
/**
 * Tiefen-Schwelle, ab der ein Orbit-Objekt als „im Vordergrund" gilt — also am
 * Kampf teilnimmt und kein Eclipse-Medaillon trägt. Einzige Quelle für diese
 * Grenze: PlanetOrbit leitet daraus `isForeground` ab, das Command Panel
 * schaltet daran sein Medaillon, und der Planeten-Tab richtet Verdeckung wie
 * Medaillon danach aus.
 *
 * `depth = (relY + 1) / 2`, die Schwelle entspricht also `relY > 0.3`.
 */
export const PLANET_ORBIT_FOREGROUND_DEPTH = 0.65
/**
 * Anteil des Umlaufs, den die Planeten-Tab-Keyframes (`ps-planet-orbit`) vor der
 * Sonne verbringen. Muss zum z-index-Wechsel bei 70 % / 71 % passen.
 */
export const PLANET_TAB_ORBIT_FOREGROUND_PROGRESS = 0.7
/** Dauer der `ps-planet-orbit`-Keyframes in Sekunden — Basis fürs Phasen-Scrubbing. */
export const PLANET_TAB_ORBIT_PERIOD_SEC = 26

// ── Orbit-Rendering: geteilte Bahn-Geometrie ────────────────────────────────
// ChampionOrbit, PlanetOrbit, StarSystemComponent und useStarSystem zeichnen
// dieselben Bahnen aus verschiedenen Blickwinkeln. Weichen die Werte
// auseinander, sitzen Champion, Bahnlinie und Hinweisring nicht mehr
// übereinander — deshalb liegen sie hier und nicht in den Komponenten.
/** Untergrenze der Bahnhöhe als Vielfaches des Sonnenradius, je Rolle. */
export const ORBIT_MIN_RY_SUN_FACTOR_BY_ROLE: Record<ChampionRole, number> = {
  top: 1.35,
  jungle: 1.8,
  mid: 2.2,
  adc: 2.6,
  support: 2.6,
}
/** Untergrenze der Bahnhöhe als Anteil der kürzeren Viewport-Kante, je Rolle. */
export const ORBIT_MIN_RY_VIEWPORT_FACTOR_BY_ROLE: Record<ChampionRole, number> = {
  top: 0.07,
  jungle: 0.12,
  mid: 0.17,
  adc: 0.22,
  support: 0.22,
}
/** Dieselben Untergrenzen für Bahnen ohne Rollenzuordnung (Extra-Planeten). */
export const ORBIT_MIN_RY_SUN_FACTOR_ROLELESS = 1.6
export const ORBIT_MIN_RY_VIEWPORT_FACTOR_ROLELESS = 0.12
/** Anteil der halben Fensterbreite, den eine Bahn waagerecht höchstens einnimmt. */
export const ORBIT_MAX_RX_VIEWPORT_FRACTION = 0.85
/**
 * Anteil der halben kürzeren Viewport-Kante, den das GESAMTE Bahnsystem füllen
 * darf. Daraus leitet useOrbitScale den globalen Dämpfungsfaktor ab, damit auch
 * auf der letzten Sonnenstufe noch alle Bahnen ins Bild passen.
 */
export const ORBIT_MAX_RX_VIEWPORT_FILL = 0.9
/** Exponent, mit dem Sprite-Größen der Sonnenskalierung folgen (<1 = gedämpft). */
export const ORBIT_SIZE_SUN_SCALE_EXPONENT = 0.65
/**
 * Zusätzliche Dämpfung des Größenwachstums OBERHALB des Kometen-Ankers
 * (`ORBIT_SUN_SCALE_ANCHOR_RADIUS`) — derselbe Knick, den `getOrbitSunRadius`
 * dem Bahnradius gibt, nur eine Ebene weiter. Multipliziert dort den Exponenten
 * jeder Körperkurve, also `0.65 → 0.48` für Champions/Planeten und `1 → 0.74`
 * für Sterne; unterhalb des Ankers (Kometen-Stufen) ändert sich nichts.
 *
 * Ohne ihn verdoppelte sich jeder Körper von Spark bis Collapse und die späten
 * Phasen wurden zugestellt. Mit ihm wächst er noch um Faktor 1,7 — je Phase
 * spürbare +11 bis +12 %, aber Collapse fällt 21 % kleiner aus (Fläche −37 %).
 * Niedriger setzen macht die Schritte irgendwann unmerklich: bei 0.55 bleiben
 * nur noch +8 % je Phase.
 */
export const ORBIT_SIZE_LATE_GROWTH_DAMPING = 0.74
/** relY-Schwelle, unterhalb derer ein Objekt hinter der Sonne steht. */
export const ORBIT_BEHIND_REL_Y = -0.05
/** relY-Band unterhalb der Schwelle, über das der Hinweisring aufblendet. */
export const ORBIT_BEHIND_FADE_BAND = 0.12
/** Lerp, mit dem der Tempo-Multiplikator hinter der Sonne nachzieht (kein Sprung). */
export const ORBIT_BEHIND_SPEED_LERP = 0.04
/** Lerp, mit dem die gezeichnete Position der Sollbahn folgt. */
export const CHAMPION_ORBIT_POSITION_LERP = 0.15
export const PLANET_ORBIT_POSITION_LERP = 0.12
/** Kepler-Effekt: Zuschlag auf die Winkelgeschwindigkeit an den Bahnscheiteln. */
export const CHAMPION_ORBIT_KEPLER_BOOST = 0.55
export const PLANET_ORBIT_KEPLER_BOOST = 0.5
/**
 * Parallax-Skalierung der Sprites: hinterste Bahnhälfte = BASE, vorderste
 * = BASE + SPAN. Champions und Sterne teilen sich eine Kurve, damit ein
 * Champion beim Wechsel auf einen Stern nicht in der Größe springt.
 */
export const ORBIT_PARALLAX_SCALE_BASE = 0.72
export const ORBIT_PARALLAX_SCALE_SPAN = 0.56
export const PLANET_ORBIT_PARALLAX_SCALE_BASE = 0.75
export const PLANET_ORBIT_PARALLAX_SCALE_SPAN = 0.5
/** Untergrenzen der Planeten-Bahnhöhe, abwechselnd je Slot-Index. */
export const PLANET_ORBIT_MIN_RY_SUN_FACTORS = [1.5, 2.0]
export const PLANET_ORBIT_MIN_RY_VIEWPORT_FACTORS = [0.1, 0.15]
/**
 * Untergrenze der Sonnenskalierung für Stern-Bahnen. Eine geschrumpfte Sonne
 * zieht sonst auch die Sternbahnen mit ein, bis die Sterne im Kern kleben.
 */
export const STAR_ORBIT_MIN_SUN_SCALE = 0.9

// ── Stern-Rendering im Idle-Orbit (useStarSystem) ──────────────────────────
/** Restdeckkraft eines Sterns hinter der Sonne. */
export const STAR_BEHIND_OPACITY = 0.2
/** Deckkraft über die Bahntiefe: hinten = BASE, vorn = BASE + SPAN. */
export const STAR_OPACITY_BASE = 0.78
export const STAR_OPACITY_DEPTH_SPAN = 0.22
/**
 * Weichzeichnung hinter der Sonne. Auf STEP-Stufen quantisiert, damit nicht
 * jeder Frame einen neuen Filterwert und damit eine Neurasterung auslöst.
 */
export const STAR_BEHIND_BLUR_MAX_PX = 2.5
export const STAR_BEHIND_BLUR_STEP_PX = 0.5
/** Abstand, den eine Sternbahn mindestens hinter der äußersten Champion-Bahn hält. */
export const STAR_TIER_GAP_RESOURCE_PX = 140
export const STAR_TIER_GAP_CHAMPION_PX = 60
/** Sicherheitsabstand der äußersten Sternbahn zum Fensterrand. */
export const STAR_VIEWPORT_MARGIN_PX = 20
/**
 * KEIN vertikales Gegenstück zu `STAR_VIEWPORT_MARGIN_PX` — bewusst.
 *
 * Ein Cap gegen die Bottom-Bar wurde gebaut und wieder zurückgenommen: der
 * Platz dafür existiert nicht. Die ADC-Bahn reicht je nach Sonnenphase bis
 * rx 513–816, der Mindestabstand einer Sternbahn liegt damit bei 653–956
 * (`STAR_TIER_GAP_RESOURCE_PX`), zwischen Minimap und Command Panel sind aber
 * nur rund 600 px frei. Was man an HUD-Freiheit gewinnt, verliert man an
 * Abstand zur Champion-Bahn — und zwei Spielobjekte auf derselben Bahn wiegen
 * schwerer als eines, das kurz hinter einem Panel durchläuft. Gemessen brachte
 * das Cap 26,8 % → 28,7 % Verdeckung, also nichts.
 *
 * Was stattdessen wirkt: die ANHÄNGSEL weichen aus (siehe `summaryTransform`
 * in `StarSystemComponent.vue`) — dort sitzt die Klickfläche, und die ist bei
 * 0 %.
 */

// ── Anhängsel am Stern: Belohnungskarte unten, Planetenzahl oben ────────────
// Beide wandern mit dem Körper und weichen dem HUD aus, statt darunter zu
// verschwinden (siehe „HUD-Freiraum"). Die Karte ist anklickbar — sie unter der
// Bottom-Bar liegen zu lassen nimmt dem Spieler eine Schaltfläche, nicht nur
// eine Ansicht.

/** Abstand der Belohnungskarte unter der Unterkante des Sternkörpers. */
export const STAR_SUMMARY_GAP_PX = 58
/**
 * Womit gerechnet wird, wenn gefragt ist, ob die Karte unten noch passt.
 * Bewusst der GRÖSSTE gemessene Wert (107–138 px je nach Beute und
 * Statusmarken): dann klappt sie im schlanken Fall etwas zu früh nach oben,
 * was niemand bemerkt — umgekehrt stünde sie halb in der Bar. Für die
 * Platzierung selbst wird sie nicht gebraucht, die erledigt
 * `translateY(-100%)` ohne einen einzigen Layout-Read.
 */
export const STAR_SUMMARY_MAX_HEIGHT_PX = 140
/**
 * Halbe Breite der Karte, für die Frage „passt sie an dieser Stelle?". Die
 * HUD-Kontur springt in der Kehle zwischen Seitenpanel und Mittelstreifen auf
 * wenigen Pixeln um mehrere hundert — nur ihren Mittelpunkt zu prüfen hängt die
 * Karte dort mit einer Ecke ins Panel.
 */
export const STAR_SUMMARY_HALF_WIDTH_PX = 42
/**
 * Wie viel Luft nach dem Umklappen wieder da sein muss, bevor die Karte
 * zurückfällt. Ohne diese Schwelle sitzt ein Stern, der genau auf der Grenze
 * wandert, in einer Kippschwingung und die Karte springt jeden Frame.
 */
export const STAR_SUMMARY_FLIP_HYSTERESIS_PX = 16
/**
 * Luft zwischen der umgeklappten Karte und der Planetenzahl, über der sie dann
 * sitzt. Die Karte wird an DEREN Position gehängt statt an eine eigene Zahl:
 * beide weichen dem HUD aus, und zwei getrennt gerechnete Ausweichwege legen
 * sich früher oder später übereinander.
 */
export const STAR_SUMMARY_FLIP_STACK_PX = 8
/** Abstand der Planetenzahl über der Oberkante des Sternkörpers. */
export const STAR_COUNT_GAP_PX = 25
/** Höhe der Planetenzahl — sie hält sich damit unter der Header-Kante. */
export const STAR_COUNT_HEIGHT_PX = 30
/** Untergrenze der Einflug-Skalierung, damit ein Stern nie auf 0 kollabiert. */
export const STAR_SPAWN_MIN_SCALE = 0.05
/** Größe der Planeten-Marker auf einer Sternbahn. */
export const STAR_PLANET_SIZE_CHAMPION = 12
export const STAR_PLANET_SIZE_GALAXY_BOSS = 14
export const STAR_PLANET_SIZE_NORMAL = 10
/** Einflug: Startradius als Vielfaches des Zielradius, plus Nachzieh-Lerp. */
export const STAR_PLANET_FLY_IN_FACTOR = 2.5
export const STAR_PLANET_RADIUS_LERP = 0.018
/** Wie lange ein geretteter Planet noch stehen bleibt, bevor er ausgeblendet wird. */
export const STAR_PLANET_SAVED_LINGER_MS = 600
/** Undurchsichtigkeit hinter bzw. vor der Sonne, ebenfalls über die Tiefe interpoliert. */
export const CHAMPION_ORBIT_OPACITY_BEHIND_BASE = 0.82
export const CHAMPION_ORBIT_OPACITY_BEHIND_SPAN = 0.18
export const CHAMPION_ORBIT_OPACITY_FRONT_BASE = 0.9
export const CHAMPION_ORBIT_OPACITY_FRONT_SPAN = 0.1
export const PLANET_ORBIT_OPACITY_BEHIND_BASE = 0.15
export const PLANET_ORBIT_OPACITY_BEHIND_SPAN = 0.28
export const PLANET_ORBIT_OPACITY_FRONT_BASE = 0.82
export const PLANET_ORBIT_OPACITY_FRONT_SPAN = 0.18
/** Unterhalb dieser Deckkraft lohnt sich kein Ring mehr — Zeichnung wird übersprungen. */
export const ORBIT_RING_MIN_OPACITY = 0.02

/** Mindestabstand zwischen zwei Geschossen desselben Champions. */
export const CHAMPION_ORBIT_PROJECTILE_COOLDOWN_MS = 700
/** Tank-Intercept (Top-Main): Ausschlag aus der Bahn und Dauer des Ausfallschritts. */
export const CHAMPION_ORBIT_INTERCEPT_MAX_OFFSET_PX = 25
export const CHAMPION_ORBIT_INTERCEPT_DURATION_MS = 500
/** Anteil der Dauer für den Hinweg; der Rest ist der Rückweg auf die Bahn. */
export const CHAMPION_ORBIT_INTERCEPT_OUT_FRACTION = 0.3

// ── Per-Frame-DOM-Updates ──────────────────────────────────────────────────
// Sterne, Champions und Planeten schreiben ihre Bewegung direkt auf die
// registrierten Elemente (utils/orbit/frameEls.ts) statt über einen
// Vue-Re-Render pro Frame.
/** Nach so vielen Frames werden verwaiste Element-Einträge aufgeräumt. */
export const FRAME_EL_SWEEP_INTERVAL = 300
/**
 * Stufung des Parallax-Scale. Translation ist für den Compositor gratis, jede
 * Scale-ÄNDERUNG kann dagegen eine Neurasterung des Layers auslösen (samt
 * Rahmen, Schatten und Blur). Auf 1 %-Stufen quantisiert bleibt der Effekt
 * optisch stufenlos, die Zahl der Neurasterungen fällt aber um ein Vielfaches.
 */
export const ORBIT_SCALE_QUANTIZE_STEPS = 100

// ── Cooldown-Ringe ─────────────────────────────────────────────────────────
// Ein Muster, drei Zeichenstellen: Turret-Salve (PlanetOrbit), Stern-Angriff
// (StarSystemComponent) und Planeten-Batterie (PlanetBatteryHUD).
/** Unterhalb dieses Fortschritts bleibt nur die leise Spur stehen. */
export const COOLDOWN_RING_MIN_PROGRESS = 0.004
/** Ab hier gilt der Ring als „heiß" und wechselt auf die helle Farbe. */
export const COOLDOWN_RING_HOT_PROGRESS = 0.92
/** Radius der Glüh-Spitze am Bogenende, kalt und heiß. */
export const COOLDOWN_RING_TIP_RADIUS = 2.2
export const COOLDOWN_RING_TIP_RADIUS_HOT = 3

// Canonical orbit tiers — 2 distinct orbit paths per category
export const ORBIT_TIERS = {
  planet: [
    {
      rx: SUN_RADIUS * 6.33,
      ry: SUN_RADIUS * 1.77,
      tiltDeg: 18,
      tiltRad: 0.3142,
      color: '#A346FF',
      size: SUN_RADIUS * 1.33,
    },
    {
      rx: SUN_RADIUS * 9.33,
      ry: SUN_RADIUS * 2.27,
      tiltDeg: -12,
      tiltRad: -0.2094,
      color: '#A346FF',
      size: SUN_RADIUS * 1.33,
    },
  ],
  star: [
    {
      rx: SUN_RADIUS * 14.0,
      ry: SUN_RADIUS * 5.5,
      tiltDeg: 16,
      tiltRad: 0.2793,
      color: '#FFD600',
      size: SUN_RADIUS * 0.85,
    },
    {
      rx: SUN_RADIUS * 16.5,
      ry: SUN_RADIUS * 6.2,
      tiltDeg: -14,
      tiltRad: -0.2443,
      color: '#FFD600',
      size: SUN_RADIUS * 0.85,
    },
  ],
} as const

// Combat / Damage floats — orbit radii for visual damage effects, not sun-relative
export const COMBAT_ORBIT_RADIUS_X_MIN = 130
export const COMBAT_ORBIT_RADIUS_X_RANGE = 65
export const COMBAT_ORBIT_Y_SCALE_MIN = 0.28
export const COMBAT_ORBIT_Y_SCALE_RANGE = 0.62
export const COMBAT_ORBIT_TILT_MAX_DEG = 180
export const COMBAT_ORBIT_SPEED_MIN = 0.00015
export const COMBAT_ORBIT_SPEED_RANGE = 0.00038
export const COMBAT_ORBIT_SAFE_Y = 90

// Star group / orbit randomization
export const STAR_PLANET_ORBIT_RX_MIN = 60
export const STAR_PLANET_ORBIT_RX_RANGE = 80
export const STAR_PLANET_ORBIT_RY_MIN = 25
export const STAR_PLANET_ORBIT_RY_RANGE = 45
export const STAR_PLANET_ORBIT_TILT_MAX = 0.35
export const STAR_SPAWN_ANGLE_MIN_PI = 0.15
export const STAR_SPAWN_ANGLE_RANGE_PI = 0.7
export const STAR_FORCED_PLANET_MIN = 1
export const STAR_FORCED_PLANET_RANGE = 4
export const STAR_REMOVAL_DELAY_MS = 1500
export const STAR_DESPAWN_DELAY_MS = 600 // delay from timer expiry to simultaneous star+planet removal
export const STAR_EXTRA_PLANET_MIN = 2
export const STAR_EXTRA_PLANET_RANGE = 2

export const EXTRA_PLANET_ORBIT_RX_MIN = 55
export const EXTRA_PLANET_ORBIT_RX_RANGE = 85
export const EXTRA_PLANET_ORBIT_RY_MIN = 24
export const EXTRA_PLANET_ORBIT_RY_RANGE = 45
export const EXTRA_PLANET_ORBIT_TILT_MAX = 0.35

// ── Sternkugel-Größen im Idle-Orbit (geometry.ts → starBodySize) ─────────────
// Champion- und Resource-Sterne kommen aus ORBIT_TIERS.star; die Endkampf-Sterne
// haben eigene Werte samt Mindestgröße.
export const STAR_BODY_SIZE_BOSS_ESCORT = 30
export const STAR_BODY_SIZE_BOSS_ESCORT_MIN = 20
export const STAR_BODY_SIZE_GALAXY_BOSS = 58
export const STAR_BODY_SIZE_GALAXY_BOSS_MIN = 46

export const ORBIT_SUN_GROWTH_FACTOR = 0.7

// ── Hover-Focus dim ──────────────────────────────────────────────────────────
// Opacity applied to non-relevant champions / planets / orbit rings while a
// champion slot or planet tile is hovered in the Command Panel, so the focused
// element/role stands out. 0 = fully hidden. Single source for both TS logic
// and the --hover-dim-opacity CSS variable in the orbit components.
export const HOVER_DIM_OPACITY = 0

/** Dauer der Ein-/Ausblende der Hover-Fokus-Dimmung in ms.
 *  Die Blende läuft NICHT als CSS-Transition, sondern wird in der jeweiligen
 *  Frame-Schleife in die ohnehin pro Frame gesetzte Inline-Opacity gerechnet:
 *  Orbit-Objekte bewegen und skalieren sich jeden Frame, eine gleichzeitig
 *  laufende CSS-Transition zwingt den Browser dann für jedes Objekt zu einem
 *  eigenen Transparenz-Layer samt Neurasterung pro Frame. */
export const HOVER_DIM_FADE_MS = 150

/** Ab diesem Blenden-Wert gilt ein Orbit-Objekt als ausgeblendet: erst dann
 *  werden Rahmen, Badges und laufende Effekt-Animationen abgeschaltet, damit
 *  während der Blende nichts wegspringt. */
export const HOVER_DIM_HIDDEN_THRESHOLD = 0.02

// ── Drifters (klickbare Objekte im Idle-Orbit) ──────────────────────────────
// Ein Drifter zieht in ~10-18 s über den Bildschirm, wird beim Klick
// eingesammelt und zahlt sofort und/oder als zeitlich begrenzter Buff aus.
// Spawn/Flug leben im drifterStore; die Bahn kommt aus DRIFTER_ROUTES.
/** Jede Seltenheitsstufe hat ihre EIGENE Uhr — [min, max] Sekunden bis zum
 *  nächsten Erscheinen. Ein einzelner gewichteter Wurf würde den Leviathan mit
 *  2 % Chance auf ~75 Minuten Erwartungswert schieben; mit eigener Uhr ist er
 *  selten, aber planbar, und die häufigen Typen halten den Himmel lebendig. */
export const DRIFTER_SPAWN_INTERVAL_SEC: Record<string, [number, number]> = {
  common: [20, 30],
  uncommon: [70, 110],
  rare: [150, 240],
  legendary: [600, 900],
}

/** Vorlauf nach Spielstart bzw. nach dem Laden, je Stufe. Bewusst gestaffelt:
 *  sonst starten alle vier Uhren gemeinsam und die erste Minute ist ein Schwarm. */
export const DRIFTER_FIRST_DELAY_SEC: Record<string, [number, number]> = {
  common: [12, 25],
  uncommon: [50, 80],
  rare: [110, 170],
  legendary: [300, 520],
}

/** Ist das Feld belegt, wenn eine Uhr abläuft, wartet diese Stufe nur so lange
 *  und versucht es erneut — der fällige Drifter geht nicht verloren. */
export const DRIFTER_SPAWN_RETRY_SEC = 6

/** Reihenfolge bei gleichzeitig fälligen Stufen: das Seltenste zuerst. Sonst
 *  verdrängt ein Errant Chime regelmäßig den Leviathan, auf den man wartet. */
export const DRIFTER_RARITY_ORDER: Record<string, number> = {
  common: 0,
  uncommon: 1,
  rare: 2,
  legendary: 3,
}

/** Farbe der Seltenheitsstufe — nur für Text-Label und Rahmen der Infokarte.
 *  Der Akzent der Karte bleibt die Eigenfarbe des Drifters. */
export const DRIFTER_RARITY_COLOR: Record<string, string> = {
  common: '#9d9d9d',
  uncommon: '#52b830',
  rare: '#4a90e2',
  legendary: '#e8c040',
}

/** Höchstens so viele Drifter fliegen gleichzeitig — bewusst knapp: jedes
 *  Objekt ist ein eigener DOM-Knoten mit eigener Frame-Schleife, und zwei
 *  gleichzeitige Klickziele im vollen Orbit-Bild lesen sich als Unruhe. */
export const DRIFTER_MAX_CONCURRENT = 1

/** Deckel auf der Sofort-Auszahlung: so viele Sekunden Produktion maximal,
 *  unabhängig davon, was der Drifter-Typ verspricht. Verhindert, dass ein
 *  einzelner Klick bei extremer CPS die gesamte Progression überspringt. */
export const DRIFTER_CHIME_REWARD_CAP_SEC = 300

/** Mindest-Auszahlung eines Chime-Drifters, damit er in der Frühphase (CPS≈0)
 *  nicht als leerer Klick endet — Vielfaches des aktuellen Klickwerts. */
export const DRIFTER_CHIME_REWARD_MIN_CLICKS = 25

/** Randmarkierung: so viele ms vor dem Erscheinen pingt der Bildschirmrand in
 *  Flugrichtung, damit ein Drifter nicht unbemerkt durchrutscht. */
export const DRIFTER_EDGE_PING_LEAD_MS = 1400

/** Anteil der Flugzeit, über den der Drifter ein- bzw. ausblendet. */
export const DRIFTER_FADE_IN_FRAC = 0.08
export const DRIFTER_FADE_OUT_FRAC = 0.14

/** Nachlaufzeit der Einsammel-Animation, bevor der Knoten entfernt wird. */
export const DRIFTER_COLLECT_FX_MS = 620

/** Anzahl der Funken beim Einsammeln (Stern-Explosion am Klickpunkt). */
export const DRIFTER_BURST_PARTICLES = 10

/** Flugbahnen in normierten Feldkoordinaten (0..1 der Spielfläche zwischen
 *  Header und Bottom-Bar). Start- und Endpunkt liegen absichtlich außerhalb
 *  [0,1], damit der Drifter herein- und herausfliegt statt aufzupoppen.
 *  ALLE Bahnen halten Abstand zur Bildmitte — dort sitzt die Sonne samt
 *  Klickfläche, und ein Drifter darüber würde zwei Klickziele stapeln. */
export const DRIFTER_ROUTES: ReadonlyArray<ReadonlyArray<{ x: number; y: number }>> = [
  // Oberer Bogen, links → rechts
  [
    { x: -0.12, y: 0.3 },
    { x: 0.28, y: 0.11 },
    { x: 0.7, y: 0.15 },
    { x: 1.12, y: 0.34 },
  ],
  // Unterer Bogen, rechts → links
  [
    { x: 1.12, y: 0.68 },
    { x: 0.7, y: 0.88 },
    { x: 0.3, y: 0.84 },
    { x: -0.12, y: 0.66 },
  ],
  // Linker Flankenbogen: herein und hinaus jeweils über die linke Kante.
  // Die Flanken treten NIE oben oder unten aus — unten stehen die erhobenen
  // HUD-Panels (Minimap links, Command rechts), oben der Header. Ein senkrechter
  // Ein- oder Austritt schöbe den größten Körper (Leviathan, 128px) zwangsläufig
  // dahinter, wo er weder sichtbar noch klickbar ist.
  [
    { x: -0.14, y: 0.2 },
    { x: 0.1, y: 0.36 },
    { x: 0.12, y: 0.6 },
    { x: -0.14, y: 0.74 },
  ],
  // Rechter Flankenbogen — Spiegelbild des linken
  [
    { x: 1.14, y: 0.74 },
    { x: 0.9, y: 0.6 },
    { x: 0.88, y: 0.34 },
    { x: 1.14, y: 0.18 },
  ],
  // Weiter Bogen links herum, oben → unten
  [
    { x: -0.12, y: 0.14 },
    { x: 0.2, y: 0.32 },
    { x: 0.26, y: 0.74 },
    { x: 0.58, y: 1.12 },
  ],
  // Flacher Durchzug ganz oben
  [
    { x: -0.12, y: 0.18 },
    { x: 0.34, y: 0.06 },
    { x: 0.66, y: 0.06 },
    { x: 1.12, y: 0.18 },
  ],
]

/** Sicherheitsradius um die Bildmitte in Anteilen der kleineren Feldkante.
 *  Wird nach dem Auswerten der Bahn angewandt: liegt ein Punkt trotz Routen-
 *  Wahl zu nah an der Sonne, wird er radial nach außen geschoben. Fängt
 *  extreme Seitenverhältnisse ab, bei denen 1 % Feldbreite ≠ 1 % Feldhöhe. */
export const DRIFTER_CENTER_CLEARANCE = 0.3

/** Feld-Ränder in px: oben unter dem Header, unten über der Bottom-Bar.
 *  Der Drifter fliegt nur dazwischen, sonst verschwände er unter dem HUD. */
export const DRIFTER_FIELD_TOP_PX = 120
export const DRIFTER_FIELD_BOTTOM_PX = 150

/** Klickfläche um den Drifter herum (px, allseitig) — der sichtbare Körper ist
 *  klein und fliegt, ohne Puffer wäre das Treffen reine Präzisionsarbeit. */
export const DRIFTER_HIT_PADDING_PX = 14

/** Buff-Chips: ab so vielen verbleibenden Sekunden blinkt der Chip warnend. */
export const DRIFTER_BUFF_EXPIRY_WARN_SEC = 5

/** Formfaktoren des Drifter-Körpers, alle relativ zu `DrifterDef.sizePx` —
 *  so bleibt ein 44px-Splitter proportional zum 128px-Leviathan. */
export const DRIFTER_AURA_SCALE = 2.1
export const DRIFTER_TRAIL_LENGTH_SCALE = 2.8
export const DRIFTER_TRAIL_WIDTH_SCALE = 0.14
/** Obergrenze der Schweifbreite: ohne sie zieht der Leviathan einen Balken
 *  statt einer Spur hinter sich her. */
export const DRIFTER_TRAIL_WIDTH_MAX_PX = 13
export const DRIFTER_TRAIL_WIDTH_MIN_PX = 3

/** Sicherheitsabstand zur Oberkante der erhobenen HUD-Panels (Minimap links,
 *  Command rechts). Ein Drifter dahinter wäre unsichtbar UND unklickbar. */
export const DRIFTER_HUD_PANEL_MARGIN_PX = 24

/** Infokarte oben links: wie lange die Meldung nach dem Einsammeln bzw. nach
 *  einem verpassten Drifter noch stehen bleibt, bevor sie ausblendet. */
export const DRIFTER_CARD_RESULT_MS = 3200

/** Taktrate des Countdowns auf der Infokarte. Bewusst gröber als ein Frame —
 *  die Karte zeigt Sekunden, ein 60-Hz-Update wäre reine Verschwendung. */
export const DRIFTER_CARD_TICK_MS = 100

/** Ab dieser Restflugzeit schlägt die Uhr der Infokarte auf Warnrot um. */
export const DRIFTER_CARD_URGENT_MS = 4000

/** Kopfzeilen-Icon der Infokarte (Peilung eines Signals). */
export const DRIFTER_CARD_ICON = 'game-icons:radar-sweep'

// ── Orbit-Strike (Sundering Pulse) ──────────────────────────────────────────
// Ein eingesammelter Schadens-Drifter schlägt alle Planeten gleichzeitig. Die
// Welle geht vom Bildmittelpunkt aus — dort steht die Sonne, um die alle
// getroffenen Planeten kreisen; vom Klickpunkt aus liefe sie an ihnen vorbei.

/** Gesamtlaufzeit der Schockwelle, danach wird der Knoten entfernt. Muss über
 *  der längsten Einzelanimation samt Versatz liegen (Front 1,1 s + 0,24 s
 *  Versatz der dritten Welle), sonst wird mitten im Auslaufen abgeschnitten. */
export const DRIFTER_STRIKE_FX_MS = 1500

/** Radiale Risse, die mit der Welle nach außen schießen. Ungerade Zahl: ein
 *  gerades Speichenkreuz liest sich als Fadenkreuz, nicht als Bruch. */
export const DRIFTER_STRIKE_RIFT_COUNT = 7

/** Drehung des Rissbündels je Auslösung (Grad × Sequenznummer). Deterministisch
 *  statt gewürfelt — ein Math.random im Style-Getter zöge bei jedem Re-Render
 *  neu und ließe die Risse mitten in der Animation springen. */
export const DRIFTER_STRIKE_RIFT_SEQ_TURN_DEG = 37

/** Reichweite der Ringe als Vielfaches der Bildschirmdiagonale — etwas über 1,
 *  damit die Front auch in den Ecken noch außerhalb des Bildes ankommt. */
export const DRIFTER_STRIKE_REACH_FACTOR = 1.08

/** Höhe der Trefferbilanz über der Bildmitte (in % der Viewport-Höhe). Über der
 *  Sonne, unter dem Header — auf jeder Referenz-Auflösung freier Raum. */
export const DRIFTER_STRIKE_REPORT_TOP_PCT = 26
