// Geteilte Geometrie-Helfer: Prozent-Clamping, Orbit-Bahnen der Sonne und
// Guide-Ellipsen der Striker-Arena. Rein funktional — kein Zustand, keine
// Store-Zugriffe.

import {
  ARC_GUIDE_MAX_EXTEND_DEG,
  ARC_GUIDE_PLANET_RADIUS_FRAC,
  ARC_GUIDE_STEP_DEG,
  ORBIT_SUN_GROWTH_FACTOR,
  ORBIT_SUN_SCALE_ANCHOR_RADIUS,
  ORBIT_TIERS,
  STAR_BODY_SIZE_BOSS_ESCORT,
  STAR_BODY_SIZE_BOSS_ESCORT_MIN,
  STAR_BODY_SIZE_GALAXY_BOSS,
  STAR_BODY_SIZE_GALAXY_BOSS_MIN,
  SUN_RADIUS,
} from '@/config/constants'
import type { StarType } from '@/types'

// ── Allgemein ──────────────────────────────────────────────────────────────
/** Clamps a percentage value to the 0–100 range. */
export function clampPercent(value: number): number {
  return Math.min(100, Math.max(0, value))
}

/**
 * `clip-path` eines regelmäßigen n-Ecks mit einer Ecke auf 12 Uhr, in Prozent
 * der eigenen Box. Trägt die geschliffene Metallplatte hinter den Level-Medaillen
 * und hinter dem Champion-Portrait auf dem Sigil-Board — beide lesen dieselbe
 * Eckenzahl aus `CHAMPION_REGALIA_STAGES`, also muss die Form aus einer Quelle
 * kommen. `corners < 3` liefert `none`, also wieder die runde Grundform.
 */
export function facetClipPath(corners: number): string {
  if (corners < 3) return 'none'
  const points: string[] = []
  for (let i = 0; i < corners; i++) {
    const angle = (i / corners) * Math.PI * 2 - Math.PI / 2
    const x = (50 + 50 * Math.cos(angle)).toFixed(2)
    const y = (50 + 50 * Math.sin(angle)).toFixed(2)
    points.push(`${x}% ${y}%`)
  }
  return `polygon(${points.join(', ')})`
}

// ── Sonnen-Orbit ───────────────────────────────────────────────────────────
/** Dampened sun radius driving all orbit visuals: identical to the real sun
 *  radius up to the comet anchor, compressed growth above it. */
export function getOrbitSunRadius(sunRadius: number): number {
  if (sunRadius <= ORBIT_SUN_SCALE_ANCHOR_RADIUS) return sunRadius
  return (
    ORBIT_SUN_SCALE_ANCHOR_RADIUS +
    (sunRadius - ORBIT_SUN_SCALE_ANCHOR_RADIUS) * ORBIT_SUN_GROWTH_FACTOR
  )
}

/** Orbit scale factor relative to the reference SUN_RADIUS, using the dampened radius. */
export function getOrbitSunScale(sunRadius: number): number {
  return getOrbitSunRadius(sunRadius) / SUN_RADIUS
}

/**
 * Durchmesser der Sternkugel im Idle-Orbit (px). Endkampf-Sterne skalieren zwar
 * mit der Sonne, haben aber eine Mindestgröße — der Galaxieboss soll auch bei
 * kleiner Sonne episch wirken. Geteilt von der Darstellung (StarSystemComponent)
 * und den Abgangs-Effekten (useStarSystem → starVanishFx), damit der Effekt
 * exakt so groß startet wie der Stern, den er ersetzt.
 */
export function starBodySize(type: StarType, sunScale: number): number {
  if (type === 'champion') return ORBIT_TIERS.star[0].size * sunScale
  if (type === 'resource') return ORBIT_TIERS.star[1].size * sunScale
  if (type === 'boss_escort') {
    return Math.max(STAR_BODY_SIZE_BOSS_ESCORT * sunScale, STAR_BODY_SIZE_BOSS_ESCORT_MIN)
  }
  return Math.max(STAR_BODY_SIZE_GALAXY_BOSS * sunScale, STAR_BODY_SIZE_GALAXY_BOSS_MIN)
}

/**
 * 3D elliptical orbit position — shared by usePlanetOrbit and usePlanetBackground.
 * Identical to the calculation used in ChampionOrbit.
 */
export function getOrbitPos(
  angle: number,
  rx: number,
  ry: number,
  tilt: number,
  cx: number,
  cy: number,
): { x: number; y: number } {
  const cosT = Math.cos(tilt)
  const sinT = Math.sin(tilt)
  const cosA = Math.cos(angle)
  const sinA = Math.sin(angle)
  return {
    x: cx + rx * cosA * cosT - ry * sinA * sinT,
    y: cy + rx * cosA * sinT + ry * sinA * cosT,
  }
}

/**
 * Länge des verdeckten Bahnabschnitts in Radiant — `0`, wenn die Bahn nie oder
 * immer verdeckt ist.
 *
 * Zusammen mit der Winkelgeschwindigkeit ergibt sich daraus die Restdauer einer
 * Verdeckung: `(1 − progress) · arc / speed`. Herleitung siehe
 * `orbitBehindProgress` — beide zerlegen dieselbe Schwingung.
 */
export function orbitBehindArc(ratio: number, tilt: number, thresholdRelY: number): number {
  const amplitude = Math.hypot(ratio * Math.sin(tilt), Math.cos(tilt))
  if (amplitude < 1e-6) return 0

  const skew = Math.asin(Math.max(-1, Math.min(1, thresholdRelY / amplitude)))
  const arc = Math.PI + 2 * skew
  return arc > 0 && arc < Math.PI * 2 ? arc : 0
}

/**
 * Fortschritt durch den verdeckten Abschnitt einer `getOrbitPos`-Bahn.
 *
 * `0` beim Eintauchen hinter die Sonne, `1` beim Wiederauftauchen. Negative
 * Werte heißen „im Vordergrund"; ihr Betrag sagt, welcher Anteil des
 * verdeckten Bogens noch bevorsteht, sobald er beginnt.
 *
 * Warum aus dem Winkel statt aus einer Restzeit: Sterne beschleunigen hinter
 * der Sonne auf das Zehnfache (`STAR_BEHIND_SUN_SPEED_MULTIPLIER`), und dieser
 * Faktor wird pro Frame weich herangelerpt. Eine Zeitschätzung müsste diesen
 * Verlauf nachbilden und liefe bei jedem ausgelassenen Frame weiter aus dem
 * Tritt. Der Bahnwinkel dagegen IST der Fortschritt: Er trifft den Austritt
 * exakt, unabhängig von Tempo, Framerate und Tab-Pausen.
 *
 * Herleitung: `getOrbitPos` liefert
 *   `relY(A) = (y − cy) / ry = ratio·sin(tilt)·cos(A) + cos(tilt)·sin(A)`,
 * also eine reine Sinusschwingung `amplitude · sin(A + phaseShift)`. Der
 * verdeckte Bogen ist damit das Winkelintervall, in dem diese Schwingung unter
 * `thresholdRelY` liegt — ein geschlossener Ausdruck statt einer Suche.
 *
 * Gemessen wird ab dem AUSTRITT, nicht ab dem Eintritt: So liegt die
 * Sprungstelle der Winkel-Normalisierung im Vordergrund und nicht auf der
 * Eintrittskante, wo sie den Fortschritt für einen Frame auf 1 reißen würde.
 *
 * Verwandt mit `orbitEclipsePhase` in `planetOrbitPhase.ts`, das dieselbe
 * Zerlegung für die Keyframe-Phase der Spieler-Planeten benutzt — dort mit der
 * Vordergrund-Schwelle statt der Sonnenkante und mit anderem Zielintervall.
 *
 * @param angle      Fortlaufender Bahnwinkel in Radiant (nicht normalisiert).
 * @param direction  Laufrichtung der Bahn (`1` oder `-1`).
 * @param ratio      `rx / ry` der Bahn — bei gleichmäßiger Skalierung invariant.
 * @param tilt       Bahnneigung in Radiant.
 * @param thresholdRelY  `relY`-Schwelle, ab der die Bahn als verdeckt gilt.
 */
export function orbitBehindProgress(
  angle: number,
  direction: 1 | -1,
  ratio: number,
  tilt: number,
  thresholdRelY: number,
): number {
  const TWO_PI = Math.PI * 2
  const normalize = (a: number) => {
    const wrapped = a % TWO_PI
    return wrapped < 0 ? wrapped + TWO_PI : wrapped
  }

  const ampX = ratio * Math.sin(tilt)
  const ampY = Math.cos(tilt)
  const amplitude = Math.hypot(ampX, ampY)
  // Entartete Bahn (keine Höhenauslenkung) — sie taucht nie ab.
  if (amplitude < 1e-6) return -1

  const skew = Math.asin(Math.max(-1, Math.min(1, thresholdRelY / amplitude)))
  const behindArc = Math.PI + 2 * skew
  // Schwelle über dem Bahnscheitel: die Bahn ist entweder immer oder nie verdeckt.
  if (behindArc <= 0 || behindArc >= TWO_PI) return -1
  const foregroundArc = TWO_PI - behindArc

  // ψ mit relY = amplitude · sin(ψ). Bei rückwärts laufender Bahn an π/2
  // gespiegelt: sin bleibt gleich, ψ wächst wieder monoton — dadurch gelten
  // Ein- und Austrittswinkel unverändert für beide Laufrichtungen.
  const psiRaw = angle + Math.atan2(ampX, ampY)
  const psi = normalize(direction === 1 ? psiRaw : Math.PI - psiRaw)
  const psiExit = TWO_PI + skew

  return (normalize(psi - psiExit) - foregroundArc) / behindArc
}

// ── Mittel-Oval des Headers ────────────────────────────────────────────────
/**
 * Das Chimes-Panel hängt als Tropfen unter der Header-Kante hervor. Seine
 * Seiten sind elliptische Bögen (`border-radius: 0 0 50% 50% / 0 0 100% 100%`):
 * horizontale Halbachse = halbe Breite, vertikale = volle Höhe, Mittelpunkt
 * damit auf der Oberkante des Panels.
 *
 * Alle Maße relativ zur Header-Box, weil die Star-Timer-Bars genau deren
 * Breite einnehmen.
 */
export interface HeaderCenterArc {
  /** Header-Linkskante → Achse des Ovals. */
  cx: number
  /** Horizontale Halbachse. */
  rx: number
  /** Vertikale Halbachse. */
  ry: number
  /** Ovaloberkante → Header-Unterkante, also bis zum Beginn der Timer-Bars. */
  topOffset: number
}

/**
 * Breite einer Balkenseite, die auf Tiefe `y` (unter der Header-Unterkante)
 * exakt an der sichtbaren Ovalkante endet.
 *
 * Unterhalb des Ovals gibt es keine Kante mehr — dort läuft die Seite bis zur
 * Ovalachse, also bis zur Mitte des Headers. Der Übergang ist stetig: Am
 * unteren Scheitel fällt die Bogenkante mit der Achse zusammen.
 */
export function centerArcSideWidth(arc: HeaderCenterArc, y: number): number {
  if (arc.rx <= 0 || arc.ry <= 0) return arc.cx
  const t = (arc.topOffset + y) / arc.ry
  if (t >= 1) return arc.cx
  if (t <= 0) return arc.cx - arc.rx
  return arc.cx - arc.rx * Math.sqrt(1 - t * t)
}

// ── Guide-Ellipsen (Striker-Arena) ─────────────────────────────────────────
/** Ellipse einer Guide-Linie in Arena-Prozent (Zentrum X ist immer 50 %). */
export interface ArcGuideEllipse {
  rxPct: number
  ryPct: number
  centerYPct: number
}

/**
 * Verlängert eine Guide-Ellipse vom äußersten Slot-Winkel schrittweise in
 * Richtung `dirSign`, bis der Punkt die zentrale Planeten-Silhouette erreicht.
 * Die Linie endet dort und wirkt, als liefe sie hinter dem Planeten weiter.
 * Winkel in Striker-Konvention: 0° = rechts, 90° = unten (Screen-Y nach unten).
 */
export function guideEndAngleDeg(
  startDeg: number,
  dirSign: 1 | -1,
  ellipse: ArcGuideEllipse,
  w: number,
  h: number,
): number {
  if (w <= 0 || h <= 0) return startDeg
  const planetR = ARC_GUIDE_PLANET_RADIUS_FRAC * Math.min(w, h)
  let deg = startDeg
  for (let i = 0; i <= ARC_GUIDE_MAX_EXTEND_DEG; i += ARC_GUIDE_STEP_DEG) {
    const cand = startDeg + dirSign * i
    const rad = (cand * Math.PI) / 180
    const dxPx = ((Math.cos(rad) * ellipse.rxPct) / 100) * w
    const dyPx = ((ellipse.centerYPct + Math.sin(rad) * ellipse.ryPct - 50) / 100) * h
    deg = cand
    if (Math.hypot(dxPx, dyPx) <= planetR) break
  }
  return deg
}

/** Punkt auf der Guide-Ellipse in Arena-Prozent (für SVG-Pfade im 100er-viewBox). */
export function ellipsePointPct(deg: number, ellipse: ArcGuideEllipse): { x: number; y: number } {
  const rad = (deg * Math.PI) / 180
  return {
    x: Math.round((50 + Math.cos(rad) * ellipse.rxPct) * 10) / 10,
    y: Math.round((ellipse.centerYPct + Math.sin(rad) * ellipse.ryPct) * 10) / 10,
  }
}
