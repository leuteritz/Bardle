// Der dauerhafte Rahmen der Oberfläche: Header-Bogen, Bottom-Bar, Minimap,
// Pause- und Offline-Overlay, Tooltips, Ton und die Timings, mit denen das
// alles ein- und ausblendet.

import type { HeraldReceiptKind, HeraldReceiptKindDef } from '@/types'

// ── Idle-Layer hinter einem Overlay: Anhalten und Wiederanlaufen ───────────
/**
 * Wie viele Frames der Idle-Layer nach dem SCHLIESSEN eines deckenden Overlays
 * (Bard-Profil, Star-Fight-Modal) wartet, bevor er wieder zeichnet.
 *
 * Angehalten wird sofort — das kostet nichts und spart ab dem nächsten Frame.
 * Das Fortsetzen ist die teure Richtung: Sternenhintergrund, Minimap und
 * Kometen zeichnen ihren ersten Frame nach der Pause vollständig neu (gemessen:
 * `drawImage` 20 ms + 14 ms, `animateStars` 9 ms), und ohne diese Verzögerung
 * fällt das alles in genau den Frame, in dem auch das Overlay abgebaut wird.
 * Zwei Frames Abstand reichen, damit beides nacheinander statt übereinander
 * läuft; mehr würde man als Nachziehen des Hintergrunds sehen.
 */
export const IDLE_RESUME_DELAY_FRAMES = 2

// ── Offline-Minispiel: Ring treffen ───────────────────────────────────────
/** SVG-Einheiten im viewBox `0 0 280 280`. */
export const OFFLINE_MINIGAME_CENTER = 140
export const OFFLINE_MINIGAME_MAX_RADIUS = 126
/** Trefferband als Anteil des Maximalradius — hier zählt der Klick. */
export const OFFLINE_MINIGAME_BAND_MIN = 0.66
export const OFFLINE_MINIGAME_BAND_MAX = 0.86
/** Dauer eines Wellendurchlaufs und wie viele Versuche der Spieler hat. */
export const OFFLINE_MINIGAME_PULSE_MS = 1700
export const OFFLINE_MINIGAME_MAX_PULSES = 6
/** Aufblenden der Welle am Anfang und ihr Verlöschen zum Rand hin. */
export const OFFLINE_MINIGAME_FADE_IN_FRACTION = 0.08
export const OFFLINE_MINIGAME_FADE_OUT_STRENGTH = 0.55
/** Nachlauf, bevor das Ergebnis gemeldet wird — je nach Ausgang verschieden lang. */
export const OFFLINE_MINIGAME_WIN_DELAY_MS = 800
export const OFFLINE_MINIGAME_LOSE_DELAY_MS = 600
export const OFFLINE_MINIGAME_TIMEOUT_DELAY_MS = 400
export const OFFLINE_MINIGAME_SKIP_DELAY_MS = 300

/** Wie lange der Tier-Unlock in der Minimap aufblitzt. */
export const MINIMAP_TIER_FLASH_MS = 2400

// Header materials grid: fixed column count (2 rows × 5 columns = 10 materials).
export const HEADER_MATERIALS_GRID_COLUMNS = 5

/** Dauer, über die die Offline-Bilanz ihre Chime-Summe hochzählt. */
export const OFFLINE_COUNTER_ANIM_MS = 2000
/** Wartezeit, bis das Minispiel nach dem Öffnen der Bilanz erscheint. */
export const OFFLINE_MINIGAME_START_DELAY_MS = 2100

// ── Header-Bogen: Sitzplätze der Badges ───────────────────────────────────
/** Wie weit ein Badge über die Bogenlinie ragt, als Anteil seiner Höhe. */
export const HEADER_BADGE_OVERLAP_FRAC = 0.4
/**
 * Level-Badge-Durchmesser als Vielfaches seiner Überlappung — Umkehrung von
 * HEADER_BADGE_OVERLAP_FRAC, damit aus der gemessenen Überlappung wieder der
 * Radius wird.
 */
export const HEADER_LEVEL_BADGE_DIAMETER_FACTOR = 2.5
/** Rückfallhöhe, solange das Badge noch nicht gemessen werden konnte. */
export const HEADER_LEVEL_BADGE_FALLBACK_H_PX = 50
/** Startgröße des Benachrichtigungs-Badges, bis die Messung greift. */
export const HEADER_NOTIF_BADGE_START_PX = 28
/**
 * Numerische Suche der Badge-Plätze auf der Ellipse: Schrittweite und
 * Endwinkel. Analytisch ist der gleiche Kantenabstand auf einer Ellipse nicht
 * geschlossen lösbar — deshalb wird der Bogen in feinen Schritten abgetastet.
 */
export const HEADER_BADGE_ARC_STEP_RAD = 0.003
export const HEADER_BADGE_ARC_MIN_RAD = 0.02
export const HEADER_BADGE_MAX_COUNT = 3

export const BOTTOM_BAR_SEAM_TOP_OFFSET_PX = 10
export const BOTTOM_BAR_SEAM_BOTTOM_OFFSET_PX = 28

/**
 * Umfang der Cooldown-Kreislinie auf den Rollenkarten (2·π·r bei r = 47.5 im
 * viewBox 0 0 100 100). Der Ring läuft über `stroke-dashoffset`, das zwischen
 * diesem Wert (leer) und 0 (voll) fährt — dieselbe Zahl steht als
 * `stroke-dasharray` im CSS von `.champ-ability-ring__fill`.
 */
export const ABILITY_RING_CIRCUMFERENCE = 298.45

/** Einsammel-Burst: Streuung um den Sollwinkel, als Anteil des Winkelschritts. */
/** Aufblitz-Dauer einer geänderten Admin-Zahl. */
export const ADMIN_FIELD_FLASH_MS = 280
/** Wackeln des Galaxie-Sprung-Panels bei ungültiger Eingabe. */
export const ADMIN_JUMP_SHAKE_MS = 450
/** Schrittweite des Chimes-Reglers im Admin-Panel. */
export const ADMIN_CHIMES_STEP = 100_000
/** Menge je Material, die „alles auffüllen" setzt. */
export const ADMIN_FILL_MATERIAL_AMOUNT = 9999

/** Refresh rate of HUD countdown tickers (buff/respawn timers): the deadline
 *  timestamps are reactive, Date.now() is not — a ref ticks the comparison. */
export const HUD_COUNTDOWN_TICK_MS = 250

/**
 * Pause-Overlay, Sonnen-Hero — Durchmesserband (px), an der Viewporthöhe
 * skaliert.
 *
 * Bewusst kleiner als früher (160–300 bei 0,24 vh): die Sonne ist im Overlay
 * ein Standbild, das sich nicht ändert, während die Karten darunter etwas
 * zeigen, das gerade LÄUFT. Der gewonnene Platz geht an sie — und weil das
 * Panel dadurch insgesamt flacher wird, hebt useFitScale zusätzlich die
 * Skalierung des ganzen Overlays.
 *
 * Diese Werte sind die EINZIGE Quelle: `.sun-hero` liest sie über den inline
 * gesetzten Durchmesser, statt dieselbe Spanne ein zweites Mal als `clamp()`
 * im CSS zu führen.
 */
export const PAUSE_SUN_MIN_DIAMETER = 118
export const PAUSE_SUN_MAX_DIAMETER = 200
export const PAUSE_SUN_VH_FACTOR = 0.16

/** Pause overlay panel — fixed design surface (px) that useFitScale shrinks on
 *  flat viewports (Full HD) and grows (up to max scale) on 2K/4K. */
export const PAUSE_PANEL_DESIGN_WIDTH = 960
export const PAUSE_PANEL_MAX_SCALE = 1.3

// HUD panel corner arc radius (shared by CommandPanel and MiniMap)
export const HUD_PANEL_ARC_R = 60
// Canonical border-radius for bardProfil cards, containers, and buttons
export const BARD_PROFILE_RADIUS = 4

/* ── Live-Cluster im Kopf des Bard-Profils ────────────────────────────────────
 * Das Profil pausiert das Spiel nicht, verdeckt aber alles, was den Weiterlauf
 * zeigt: die HP-Leiste liegt im Idle-Layer unter dem Modal, die
 * Fähigkeitenleiste hängt an `bardActiveTab === null`. Links im Kopf steht
 * deshalb der Zustand (HP), rechts die Handlungsfähigkeit (Q/W/E/R).
 */
/**
 * Radius des Resonanz-Rings im viewBox `0 0 24 24`. Der Ring läuft über
 * `stroke-dashoffset` einer SVG-Kreislinie, nie über `conic-gradient`
 * (Performance-Regel 11, Muster `ABILITY_RING_CIRCUMFERENCE`) — sein Umfang
 * steht als `stroke-dasharray` daneben.
 */
export const PROFILE_HUD_RING_R = 9
/** 2·π·PROFILE_HUD_RING_R — der volle Umfang, also der leere Ring. */
export const PROFILE_HUD_RING_CIRCUMFERENCE = 56.55

/* ── Detail-Schiene des Bard-Profils ──────────────────────────────────────────
 * Die rechte Spalte, in die ein Reiter seine Einzelheiten legt: im Shop die
 * Forge-Spalte (`ShopComponent.vue`), im Skill-Tree das Detail-Blatt
 * (`SkillTreeComponent.vue`). Beide lesen dieselben drei Zahlen — zwei eigene
 * Breiten liefen still auseinander, und die Reiter stehen nebeneinander in
 * derselben Leiste.
 *
 * Gewachsen aus `clamp(340px, 32vw, 470px)`. Der alte Deckel stammt aus der
 * Zeit, in der die Shop-Spalte fünf Filterchips UND vier Reiterbeschriftungen
 * in einer Zeile tragen musste; beides steht inzwischen woanders. Was dort
 * steht, ist ein Detailkopf mit 23px-Titel und zwei Kaufknöpfen nebeneinander —
 * der braucht die zusätzlichen 90px, und auf 4K sind sie umsonst zu haben.
 *
 * Der Boden greift auf dem flachsten Desktop-Viewport (Full HD), die Obergrenze
 * ab ~2155px Breite; dazwischen wächst die Schiene mit dem Schirm. */
export const BARD_PROFILE_RAIL_MIN_PX = 400
export const BARD_PROFILE_RAIL_VW = 26
export const BARD_PROFILE_RAIL_MAX_PX = 560

// ── Bottom Bar Frame strokes ──────────────────────────────────────────────
export const BOTTOM_FRAME_STROKE_SHADOW = 'rgba(30,12,0,0.95)' // dark outer shadow
export const BOTTOM_FRAME_STROKE_WOOD = '#7a4e20' // wood brown — matches --rpg-wood / header border
export const BOTTOM_FRAME_STROKE_GRAIN = 'rgba(160,95,38,0.75)' // lighter wood grain
export const BOTTOM_FRAME_STROKE_SHEEN = 'rgba(190,115,46,0.14)' // subtle warm surface sheen

// ── Bottom Bar v2 (unified silhouette shell) ──────────────────────────────
// Reference geometry at hud-scale 1 (design mock is a 1920×443 layout).
export const BOTTOM_BAR_HEIGHT = 443 // total bar height
export const BOTTOM_BAR_SIDE_W = 440 // raised side panel width (minimap / command)
export const BOTTOM_BAR_CENTER_TOP_Y = 364 // top edge of the low center strip
export const BOTTOM_BAR_NOTCH_R = 26 // inner notch radius where panels meet the strip
export const BOTTOM_BAR_EDGE_INSET = 2 // stroke inset from the viewport edges
// Frame stroke widths (drawn shadow → wood → gold, top edge only)
export const BOTTOM_FRAME_W_SHADOW = 7
export const BOTTOM_FRAME_W_WOOD = 3.5
export const BOTTOM_FRAME_W_GOLD = 1.2
export const BOTTOM_FRAME_STROKE_GOLD = '#c89040' // thin gold highlight line
// Unified background fill: flat header brown — must stay identical across
// all three bottom panels (minimap / scoreboard / command), no deviations
export const BOTTOM_BAR_SEAM_COLOR = 'rgba(122,78,32,0.35)'

/** Star ornament flanking the title in the crest. */
export const CREST_STAR_IMAGE = '/img/star-128.png'
/** Separator between a status and its clock / percentage in the crest. */
export const CREST_SEPARATOR = ' · '

// Minimap travel rendering (static galaxy map)
export const MINIMAP_FLIGHTPATH_BEND = 0.18 // quadratic ctrl-point offset (fraction of leg length)
export const MINIMAP_ROUTE_ARROW_SIZE = 5 // chevron wing length on flown-route segments (live map)
export const MINIMAP_ROUTE_ARROW_GAP = 14 // chevron tip distance before the segment endpoint (clears the star marker)
export const MINIMAP_ROUTE_ARROW_SPREAD = 0.48 // half-opening angle of the chevron in radians (~27°)
export const SNAPSHOT_ROUTE_ARROW_SIZE = 3.5 // chevron wing length in the archive snapshot (smaller canvas)
export const SNAPSHOT_ROUTE_ARROW_GAP = 12 // chevron tip distance before the endpoint in the snapshot
export const MINIMAP_COMET_HEAD_R = 4.5 // player comet head radius (× √zoom)
export const MINIMAP_COMET_TAIL_LEN = 46 // comet tail length in px along the flight curve
export const MINIMAP_COMET_TAIL_SEGMENTS = 14 // tail sample count
export const MINIMAP_IDLE_SUN_R = 11 // player-sun marker when not traveling
export const MINIMAP_TWINKLE_COUNT = 30 // seeded twinkling background stars
// Procedural spiral galaxy (canvas-drawn, replaces the old galaxy-far sprite)
export const MINIMAP_GALAXY_ARMS_MIN = 2 // min seeded spiral arm count
export const MINIMAP_GALAXY_ARMS_MAX = 3 // max seeded spiral arm count
export const MINIMAP_GALAXY_PARTICLES = 1200 // particles across bulge + arms + haze
export const MINIMAP_GALAXY_RADIUS = 0.5 // outer radius in world (0..1) coords
export const MINIMAP_GALAXY_INNER_RADIUS = 0.05 // arms start here (bulge edge)
export const MINIMAP_GALAXY_SWIRL_TURNS = 1.9 // base revolutions from core to rim
export const MINIMAP_GALAXY_SQUASH = 0.62 // base disk squash (inclination illusion)
export const MINIMAP_GALAXY_BULGE_R = 0.11 // gaussian bulge radius
export const MINIMAP_GALAXY_KNOTS = 18 // bright accent-colored knots on the arms
export const MINIMAP_GALAXY_BRIGHT_STARS = 70 // distinct single stars along the arms
export const MINIMAP_GALAXY_CORE_RADIUS = 0.15 // core glow radius in world coords
export const MINIMAP_ZOOM_TRIGGER_MS = 45_000 // zoom-in phase starts this long before arrival
export const MINIMAP_ZOOM_MAX = 5.4 // camera zoom at arrival (target star grows ≈ arrival sun)
export const MINIMAP_ZOOM_LERP = 0.06 // per-frame camera smoothing (zoom-in)
export const MINIMAP_ZOOM_OUT_LERP = 0.03 // slower zoom-out so the near field stays visible a while
export const MINIMAP_DEPARTURE_TRANSITION_MS = 900 // crossfade arrival view → galaxy map
// Zoom acts: galaxy overview → fly-through (arms spread, near field fades in) → arrival view
export const MINIMAP_GALAXY_FADE: readonly [number, number] = [3.4, 5.2] // zoom range: galaxy body fades out
export const MINIMAP_NEARFIELD_FADE: readonly [number, number] = [2.4, 4.2] // zoom range: local star field fades in
export const MINIMAP_NEARFIELD_STARS = 90 // seeded local stars around the destination
export const MINIMAP_NEARFIELD_SPREAD = 0.09 // near-field star spread in world coords
export const MINIMAP_TARGET_BASE_R = 6 // target star radius in the far overview (~1.7× comet head)
export const MINIMAP_TARGET_MAX_R = 12 // target star radius at full zoom (arrival crossfade bridges to the arrival sun)
export const MINIMAP_WAIT_SUN_R = 26 // centered player sun on the role-selection screen

// ── Minimap arrival view (camera docked at the reached star system) ─────────
// Geometry of the little star system drawn once the champion star is reached.
// The outermost orbit plus its planet must stay inside half the 440px panel —
// GAP + (slots-1) * STEP + PLANET_R * glow must not exceed ~215px.
export const MINIMAP_ARRIVAL_STAR_R = 46 // central star radius
// GAP × SQUASH must exceed STAR_R + a bit: the innermost lane belongs to the
// champion planet, and at the top/bottom of a squashed ellipse it would
// otherwise sit permanently behind the star body.
export const MINIMAP_ARRIVAL_ORBIT_GAP = 60 // star surface → first orbit
export const MINIMAP_ARRIVAL_ORBIT_STEP = 26 // radial distance between two orbits
export const MINIMAP_ARRIVAL_ORBIT_SQUASH = 0.62 // orbit ellipse ry / rx
export const MINIMAP_ARRIVAL_PLANET_R = 12 // radius of an active planet on the innermost extra orbit
export const MINIMAP_ARRIVAL_PLANET_STEP = 1.6 // radius growth per orbit further out
export const MINIMAP_ARRIVAL_CHAMP_PLANET_R = 22 // champion planet (always the innermost slot)
export const MINIMAP_ARRIVAL_CLEARED_SCALE = 0.58 // a freed planet shrinks to this fraction …
export const MINIMAP_ARRIVAL_CLEARED_ALPHA = 0.42 // … and dims to this alpha (slot keeps its orbit)
export const MINIMAP_ARRIVAL_PREVIEW_MIN = 3 // preview slot count before the star exists
export const MINIMAP_ARRIVAL_PREVIEW_RANGE = 2 // … plus 0..RANGE-1 extra preview slots
// Status colouring of the docked system — same crimson / violet as the status
// marks at the star (StarSystemComponent) and the header timer bars, so rage
// and curse read identically wherever the player looks.
export const MINIMAP_ARRIVAL_RAGE_RGB = '255, 46, 99' // boss rage crimson
export const MINIMAP_ARRIVAL_CURSE_RGB = '160, 40, 220' // curse violet
export const MINIMAP_ARRIVAL_RAGE_RING_MS = 900 // travel time of one expanding rage wave
export const MINIMAP_ARRIVAL_RAGE_RINGS = 2 // rage waves visible at the same time
export const MINIMAP_ARRIVAL_CURSE_PULSE_MS = 2600 // breathing period of the curse vignette

// ── FPS-Zähler (neben der Signatur unten links) ─────────────────────────────
/** Ab hier läuft es rund — der Zähler steht grün. */
export const FPS_GOOD_THRESHOLD = 55
/** Darunter wird es zäh: unter diesem Wert schlägt der Zähler auf Rot um. */
export const FPS_POOR_THRESHOLD = 30

// ── Pause-Overlay: Material-Raster in der Stat-Kachel ──────────────────────
// Die Kachel fasst 4 × 2 Karten; fällt ein neuntes Material, gibt die letzte
// Zelle den Rest als „+N" aus. Die Rasterhöhe ist fest reserviert: klappte die
// zweite Reihe erst beim fünften Material auf, änderte sich die Panelhöhe
// mitten in der Pause — und mit ihr der Fit-Scale des gesamten Overlays.
export const PAUSE_MATERIAL_COLUMNS = 5
export const PAUSE_MATERIAL_ROWS = 2

// ── HP-Stufen ──────────────────────────────────────────────────────────────
// Die EINE Skala der Spieler-Sonne. Sie hiess einmal PAUSE_HP_*, solange das
// Pause-Overlay die einzige Stelle war; heute lesen sie VIER Leisten — Orbit,
// Star-Fight-Arena, Pause-Overlay und der Vitals-Cluster im Kopf des Profils —
// dazu der Store-Getter `playerStore.isLow`. Anzeigen desselben Werts dürfen
// ihre Umschlagpunkte nicht getrennt führen, sonst ist die Sonne im Profil noch
// gelb und im Orbit schon rot.
//
// Gelesen wird sie ausschliesslich über `sunVitalStage()` in
// `utils/ui/format.ts` — die Funktion hält auch den Vergleichsoperator fest. Er
// stand einmal zweimal verschieden im Code (`< 25` im Store, `<= 25` im
// Overlay), und bei exakt 25,0 % pulste die Leiste rot, während die Vignette
// ausblieb.
/** Ab diesem Anteil gilt die Sonne als unversehrt (grün). */
export const HP_HEALTHY_PERCENT = 50
/** Darunter wird die Leiste rot und pulst — zugleich die Low-HP-Schwelle. */
export const HP_CRIT_PERCENT = 25
// Breitenreserve der HP-Zahl: Anteile des Maximums, die als unsichtbare
// Messmuster mitgerendert werden. Aus dem Maximum allein lässt sich die Breite
// nicht ableiten — formatNumber wechselt innerhalb einer Einheitenstufe die
// Länge („2.6K" gegen „2.34K") und unterhalb davon nochmals („999"). Die
// Stützstellen decken beide Fälle ab; die Spalte nimmt die breiteste.
//
// Ohne PAUSE_-Präfix: die Messmuster sind eine Eigenschaft der `VitalityBar`
// (Prop `widthProbes`), nicht des Overlays, das sie zuerst gebraucht hat.
export const HP_WIDTH_PROBES = [1, 0.99, 0.9, 0.75, 0.5, 0.25, 0.1]

// Geisterspur der Vitalitätsleisten: der helle Streifen, den die
// zurückschnellende Füllung freigibt, ist genau der Schaden dieses Treffers.
// Sie läuft NUR beim Sinken nach — steigt der Wert, springt sie ohne Übergang
// mit, sonst liefe wegen der Regeneration jede Spielsekunde eine Transition auf
// einer Ebene, die in dieser Richtung ohnehin von der Füllung verdeckt ist.
/** Wie lange die Geisterspur der Füllung hinterherzieht. */
export const VITALITY_GHOST_FALL_MS = 900
/** Wie lange sie vorher stehen bleibt, damit der Verlust ablesbar wird. */
export const VITALITY_GHOST_FALL_DELAY_MS = 380

// ── Pause-Overlay: Bilanz neben der Sonnenscheibe ──────────────────────────
// Rechts der Schaden, links die Regeneration der laufenden Pause. Die Treffer
// laufen als aufsteigende Zahlen über der Summe — mehr als eine Handvoll
// gleichzeitig wäre unlesbar UND eine wachsende Liste unsichtbarer Elemente:
// mehrere Void-Einschläge fallen in derselben Sekunde.
export const PAUSE_LEDGER_MAX_POPS = 4
// Wie weit ein Treffer beim Aufsteigen NACH AUSSEN driftet (px, weg von der
// Scheibe). Zwei Zwecke: gleichzeitige Treffer liegen nicht deckungsgleich
// übereinander, und die Zahlen laufen in den freien Panelrand statt quer über
// die Beschriftung. Nach Index gegriffen, nicht gewürfelt — dieselbe Zahl darf
// beim Neurendern nicht springen.
export const PAUSE_LEDGER_POP_OFFSETS = [12, 52, 30, 74]

// ── Pause-Overlay: Karten der laufenden Vorgänge ───────────────────────────
// Alle Karten der Reihe sind gleich breit: ein Stern je Karte (höchstens drei),
// dazu die Void-Karte (PAUSE_VOID_CARD_WIDTH) und die Champion-Karte
// (PAUSE_CHAMPION_CARD_WIDTH) — in der Spitze also FÜNF.
//
// Die Rechnung, an der diese Werte hängen (Panelinnenraum 960 − 2 × 44 = 872):
//
//   4 Karten → 4 × 208 + 3 × 6 =  850  ≤ 872   → eine Zeile
//   5 Karten → 5 × 208 + 4 × 6 = 1064  > 872   → zwei Zeilen
//
// Die Reihe bricht ab der fünften Karte also um, und genau dafür reserviert
// `.callout-row` fest ZWEI Kartenzeilen. Die Reservierung ist der Punkt: eine
// Höhe, die mit der Zahl der Karten wächst, ließe den Fit-Scale des ganzen
// Overlays mitten in der Pause springen. Wer eine Karte breiter macht, muss
// entweder das Panel mitziehen oder in Kauf nehmen, dass schon vier Karten
// umbrechen — dann steht die zweite Zeile fast immer besetzt.
//
// Der Platz dafür kam aus zwei Quellen: das Panel ist breiter (was laut
// `.pause-panel` nichts kostet, weil der Fit-Scale auf jeder Referenzauflösung
// höhenlimitiert ist) und der Sonnen-Hero kleiner. Beides ging an die Karten —
// sie zeigen etwas, das gerade LÄUFT, die Sonne ein Standbild.
export const PAUSE_STAR_CARD_WIDTH = 208
export const PAUSE_STAR_CARD_HEIGHT = 96
/** Waagerechter Innenabstand der Karte. Er steht hier und nicht nur im CSS,
 *  weil die Breite der Planetenreihe daraus abgeleitet wird — liefen beide
 *  auseinander, ragte die Reihe aus der Karte. */
export const PAUSE_STAR_CARD_PAD_X = 8
/** Abstand zwischen Zifferblatt und Planetenreihe. */
export const PAUSE_STAR_DIAL_GAP_PX = 10
/** Lücke zwischen zwei Karten in der Callout-Reihe — waagerecht wie senkrecht.
 *  Sie steht in beiden Rechnungen oben: in der Breite zwischen den Karten und
 *  in der reservierten Höhe zwischen den zwei Zeilen. */
export const PAUSE_STAR_CARD_GAP_PX = 6
/** Kantenlänge des Zifferblatts. Sie ist am Textinhalt bemessen, nicht am
 *  freien Platz: die Restzeit steht IM Ring, und der nutzbare Raum ist der
 *  Innenkreis, nicht dessen Kasten. Gemessen bei 52 px stand „28s" (34 px
 *  Advance, 18 px Tinte hoch) in einem Innenkreis von 38,5 px — auf Höhe der
 *  Tintenkante bleiben davon nur 2 · 3,5 px, und die Zahl klebte am Bogen.
 *  60 px heben den Innenkreis auf 47 px. */
export const PAUSE_STAR_DIAL_PX = 70
/** Zifferblatt der Restzeit: Radius, Strichstärke und Umfang der SVG-Kreislinie
 *  (viewBox 56 — der Radius ist also keine Pixelangabe, sondern wird mit
 *  PAUSE_STAR_DIAL_PX / 56 skaliert).
 *  Der Fortschritt läuft über stroke-dashoffset — dieselbe Technik wie beim
 *  Ability-Ring, siehe „Performance" Regel 11.
 *  Track und Bogen teilen sich Radius UND Stärke: liefen sie auseinander, säße
 *  der abbrennende Bogen neben seiner eigenen Spur. */
export const PAUSE_STAR_RING_RADIUS = 27
export const PAUSE_STAR_RING_STROKE = 4
export const PAUSE_STAR_RING_CIRCUMFERENCE = 2 * Math.PI * PAUSE_STAR_RING_RADIUS
/** Ab dieser Restzeit (Sekunden) schlägt das Zifferblatt auf Alarm um. */
export const PAUSE_STAR_URGENT_SECS = 10
// Planeten-Glyphen in der Karte (echte Planetenkunst statt abstrakter Punkte).
// Der Viewport von PlanetGlyph ist absichtlich breiter als der Planet — die
// Ringe eines Ringed-Planeten reichen bis fast an den Rand. Für eine Reihe aus
// drei Welten ist dieser Leerraum zu teuer: die Zelle ist deshalb schmaler als
// der Glyph und lässt ihn seitlich überstehen. Die leeren Ränder benachbarter
// Glyphen überlappen sich, die Planetenkörper (0,62 × Glyphhöhe) nicht.
//
// Die Karte trug früher darüber noch eine Zeile „Flyby" samt Sternsymbol. Beide
// sagten nichts, was die Karte nicht selbst zeigt — der Platz gehört jetzt den
// Welten: Körper 21 → 26 px bei drei Slots, dazu je ein eigener HP-Balken.
//
// Beide Werte sind OBERGRENZEN, keine festen Maße: die Zelle ergibt sich aus
// der Reihenbreite geteilt durch die Zahl der Slots. Ein Stern mit nur einer
// Welt ließ die halbe Karte leer — er zeigt sie jetzt größer (Körper 31 px),
// bis die Kartenhöhe die Grenze setzt.
export const PAUSE_STAR_PLANET_GLYPH_MAX_PX = 62
export const PAUSE_STAR_PLANET_CELL_MAX_PX = 44
export const PAUSE_STAR_PLANET_GAP_PX = 2
/** Luft zwischen zwei Planetenkörpern. Ohne sie füllte der Körper die Zelle
 *  exakt aus und zwei Welten berührten sich bis auf die Flex-Lücke. */
export const PAUSE_STAR_PLANET_BODY_CLEARANCE_PX = 3
/** Höhe des HP-Balkens unter jeder Welt und sein Abstand zum Glyph. Ein Balken
 *  UNTER dem Körper ist dasselbe Bild, das der Spieler draußen im Orbit sieht —
 *  und er hält Zeit (Ring) und Leben (Leiste) sauber auseinander. */
export const PAUSE_STAR_PLANET_HP_H = 5
export const PAUSE_STAR_PLANET_HP_GAP = 5
/** Stufen, auf die der HP-Anteil einer Welt gerundet wird. Bei 29 px Balken
 *  ist ein Prozentpunkt ein Drittel Pixel — feiner abzutasten hieße nur, den
 *  Schnappschuss der Kartenreihe bei jedem Takt neu zu schreiben. */
export const PAUSE_STAR_HP_STEPS = 100
/** Platz, den die Planetenreihe in der Karte hat: Kartenbreite abzüglich
 *  Innenabstand, Zifferblatt und dessen Lücke.
 *  Trägt ein Stern mehr Slots als die Regel-Anzahl, rücken Zelle und Glyph
 *  zusammen, statt aus der Karte zu laufen. */
export const PAUSE_STAR_PLANET_ROW_WIDTH =
  PAUSE_STAR_CARD_WIDTH - 2 * PAUSE_STAR_CARD_PAD_X - PAUSE_STAR_DIAL_PX - PAUSE_STAR_DIAL_GAP_PX

// ── Star-Timer-Bars (Header) — Planeten-Kugeln mit Boss-HP-Füllstand ──────
// Die Bars lesen die Boss-Daten NICHT reaktiv, sondern über einen Snapshot,
// der im Takt von STAR_TIMER_TICK_MS neu gebaut wird. Damit invalidiert das
// Bar-Computed höchstens 5×/s statt bei jedem einzelnen Schadensereignis —
// entscheidend, wenn viele Sterne gleichzeitig unter dem Header hängen.
export const STAR_TIMER_TICK_MS = 200
// HP-Ratio wird auf Stufen gerundet, damit sich der gebundene Style-Wert
// (und damit der DOM-Write) nur bei sichtbarer Änderung überhaupt ändert.
export const STAR_TIMER_HP_STEPS = 20
// Schwellen für den Farbwechsel der Kugelfüllung
export const STAR_TIMER_HP_LOW_RATIO = 0.35
export const STAR_TIMER_HP_CRITICAL_RATIO = 0.15
// Solange der Boss lebt, bleibt mindestens dieser Anteil der Kugel gefüllt —
// bei 2 % HP wäre der Farbstreifen in einer ~11 px großen Kugel sonst unsichtbar.
export const STAR_TIMER_HP_MIN_FILL = 0.2
// Die Prozentzahl neben der Kugel läuft feiner als die Füllung (100 statt 20
// Stufen): sie ist der exakte Wert, die Kugel nur die grobe Silhouette.
export const STAR_TIMER_HP_PCT_STEPS = 100
// Ein lebender Boss zeigt nie "0" — sonst liest sich die Zahl wie "besiegt",
// während der Stern noch steht.
export const STAR_TIMER_HP_MIN_PCT = 1
// Nur der aktiv bekämpfte Planet zeigt seine HP dauerhaft. Jeder andere blendet
// sie ein, sobald er getroffen wird, und nach dieser Zeit ohne weiteren Treffer
// wieder aus — die Bar bleibt ruhig, statt permanent Zahlen zu zeigen.
export const STAR_TIMER_HP_REVEAL_MS = 2000
// Jede Bar endet an der Bogenkante des Header-Ovals auf Höhe ihrer eigenen
// UNTERkante — dort ist das Oval am schmalsten, sodass die senkrechte
// Balkenkante über die restliche Zeilenhöhe hinter dem Oval verschwindet. Diese
// Überlappung schließt zusätzlich den Subpixel-Spalt, den das Antialiasing der
// Rundung genau an der Berührungslinie sonst aufblitzen lässt.
export const STAR_TIMER_CENTER_OVERLAP_PX = 1
// Balkenbreiten werden auf halbe Pixel gerundet: Ohne das schriebe schon das
// Subpixel-Rauschen einer Messung bei jedem Tick neue Grid-Spalten in 30 Zeilen.
export const STAR_TIMER_WIDTH_SNAP_PX = 0.5

// Event log
/** Maximum number of events kept in the live event log before trimming */
export const EVENT_LOG_MAX_SIZE = 12
/** Milliseconds before an event auto-dismisses from the log */
export const EVENT_LOG_DISMISS_MS = 7_000

// Herald — large centered milestone announcements (HeraldOverlay / useHerald)
/** How long a single herald banner stays on screen (ms) */
export const HERALD_DISPLAY_MS = 2_000
/** Max queued heralds; oldest is dropped past this */
export const HERALD_QUEUE_MAX = 3
/** Grace period after mount before heralds arm — swallows the state jumps that
 *  loadGame() causes so a loaded save never fires a spurious warp/rank banner. */
export const HERALD_ARM_DELAY_MS = 1_500
/** Accent color (r,g,b) per herald kind; rank-ups pull from RANK_TIER_COLORS. */
export const HERALD_ACCENT_WARP = '150, 120, 255'
export const HERALD_ACCENT_CHAMPION = '232, 192, 64'

// ── Herold-Quittungen: die Nebenspur ──────────────────────────────────────────
// Alles, was der Spieler AUSGELÖST hat, statt es erreicht zu haben. Kompakte
// Karten unter der Zeremonie, gestapelt statt einander verdrängend.
//
// Es gibt bewusst nur EINE Standzeit für den ganzen Stapel. Früher standen hier
// drei (1400 ambient · 1600 Quittung · 2600 Toast) — der Vergleich, der sie
// rechtfertigte, war der GEGEN die Zeremonie, und den gibt es in der Nebenspur
// nicht mehr. Drei Karten nebeneinander, jede zu einem anderen Zeitpunkt
// ausblendend, liest sich als Fehler.

/**
 * Standzeit einer Quittung, gemessen ab ihrer LETZTEN Aktualisierung.
 *
 * Bewusst lang genug, um eine ganze Zeile zu lesen — die Karte trägt Kopfzeile,
 * Schlagzeile und oft eine Nebenzeile. Solange verdichtet wird, steht sie.
 */
export const HERALD_RECEIPT_HOLD_MS = 2_600

/**
 * Wie viele UNGLEICHARTIGE Quittungen nebeneinander stehen.
 *
 * Die vierte verdrängt die älteste. Drei sind die Grenze des Erfassbaren, und
 * der Vorgang selbst steht ohnehin im Eventlog — der Stapel ist der Blitz, nicht
 * die Aufzeichnung.
 */
export const HERALD_RECEIPT_STACK_MAX = 3

/**
 * Ab der GEBURT einer Karte: so lange saugt sie Gleichartiges auf.
 *
 * Das zweite Zeitfenster neben `HERALD_RECEIPT_HOLD_MS`, und es hat einen
 * anderen Job. Die Standzeit misst ab der letzten Fütterung — ohne diesen
 * Deckel würde ein Dauerklick dieselbe Karte auf ×200 treiben und sie nie
 * verschwinden lassen. Danach übernimmt eine frische bei ×1.
 */
export const HERALD_RECEIPT_MERGE_WINDOW_MS = 8_000

/** Vorsatz des Zähler-Chips. Dekoratives Zeichen, kein Icon. */
export const HERALD_RECEIPT_COUNT_PREFIX = '×'

/** Farben des Zahlenfelds — Kosten und Ertrag, beide aus der Hauspalette. */
export const HERALD_DELTA_COLOR_COST = '#cc6050'
export const HERALD_DELTA_COLOR_GAIN = '#7ddc4a'

/**
 * Ein Eintrag je Quittungsart — Kopfzeile, Sigil und Akzent.
 *
 * Die Akzente sind paarweise unterscheidbar gewählt: zwei Meldungen kurz
 * hintereinander (Champion gekauft → Champion zugewiesen) sollen sich schon an
 * der Farbe auseinanderhalten lassen, ohne dass man den Text vergleicht.
 *
 * Als "r, g, b" hinterlegt, nicht als Hex: die Karte setzt den Wert in `--ac`
 * und bildet daraus `rgba()` für Schein und Randleiste. Eine Umrechnung zur
 * Laufzeit wäre vierzehnmal dieselbe. Der Hexwert steht als Kommentar daneben,
 * damit die Farbe im Editor auffindbar bleibt.
 *
 * `forged` und `ready` bringen Glyph und Farbe fast immer selbst mit — ihre
 * Einträge sind der Rückfall, nicht die Regel.
 */
export const HERALD_RECEIPT_KINDS: Record<HeraldReceiptKind, HeraldReceiptKindDef> = {
  levelup: { label: 'Level Up', icon: 'game-icons:progression', accent: '125, 220, 74' }, // #7ddc4a
  recruit: { label: 'Recruited', icon: 'game-icons:contract', accent: '201, 160, 255' }, // #c9a0ff
  assign: { label: 'Assigned', icon: 'game-icons:rank-3', accent: '216, 112, 154' }, // #d8709a
  purchase: { label: 'Purchased', icon: 'game-icons:two-coins', accent: '232, 192, 64' }, // #e8c040
  unlock: { label: 'Unlocked', icon: 'game-icons:unlocking', accent: '95, 212, 200' }, // #5fd4c8
  equip: { label: 'Equipped', icon: 'game-icons:shirt', accent: '224, 138, 74' }, // #e08a4a
  perk: { label: 'Learned', icon: 'game-icons:brain', accent: '143, 184, 255' }, // #8fb8ff
  forge: { label: 'Forged', icon: 'game-icons:anvil-impact', accent: '255, 138, 61' }, // #ff8a3d
  expedition: { label: 'Expedition', icon: 'game-icons:caravel', accent: '79, 184, 232' }, // #4fb8e8
  event: { label: 'Cosmic Event', icon: 'game-icons:star-formation', accent: '168, 180, 255' }, // #a8b4ff
  warning: { label: 'Heads Up', icon: 'game-icons:hazard-sign', accent: '204, 96, 80' }, // #cc6050
  info: { label: 'Notice', icon: 'game-icons:sparkles', accent: '200, 184, 154' }, // #c8b89a
  forged: { label: 'Star Forge', icon: 'game-icons:anvil-impact', accent: '232, 192, 64' }, // #e8c040
  ready: { label: 'Ready', icon: 'game-icons:sparkles', accent: '232, 192, 64' }, // #e8c040
}

/**
 * Sperrfrist je Badge-Quelle zwischen zwei `ready`-Herolden, in ECHTEN
 * Millisekunden.
 *
 * Bewusst Wanduhr und nicht `gameNow()`: die Frist schützt die Aufmerksamkeit
 * des Spielers, und die vergeht real. Unter Zeitraffer pendeln genau die Zähler
 * am schnellsten um die Null, deren Marke sich gerade meldet — ein
 * spielzeit-skaliertes Fenster würde dort mitschrumpfen und die Bremse genau
 * dann lösen, wenn sie gebraucht wird. Dieselbe Begründung wie beim Aufblitzen
 * in `composables/ui/useBadgeFlare.ts`.
 */
export const BADGE_HERALD_COOLDOWN_MS = 90_000

/**
 * Akzent (r,g,b) je Badge-Quelle für den `ready`-Herold.
 *
 * Dieselben Farben, die die Marken selbst tragen — violett/gold/pink/grün aus
 * den `.header-notif-badge--*`-Verläufen in `AppHeaderComponent.vue`, azurn aus
 * `.bt--shop` bzw. `ShopReadyBadge.vue`. Der Herold erscheint in der Farbe der
 * Marke, die ihn ausgelöst hat, damit der Blick vom Banner zur Marke findet.
 */
export const BADGE_HERALD_ACCENT_EXPEDITION = '168, 85, 247'
export const BADGE_HERALD_ACCENT_SUN = '240, 208, 96'
export const BADGE_HERALD_ACCENT_SKILL = '236, 72, 153'
export const BADGE_HERALD_ACCENT_PLANET = '52, 211, 153'
export const BADGE_HERALD_ACCENT_SHOP = '96, 165, 250'

/**
 * Die Überschrift je Notify-Marke.
 *
 * Zwei Stellen zeigen denselben Wortlaut: der Kopf des Hover-Tooltips
 * (`RpgBadgeTooltipBody.vue`) und die Schlagzeile des `ready`-Herolds
 * (`composables/ui/useBadgeHeralds.ts`). Stünde er zweimal im Code, hieße
 * dieselbe Marke nach der nächsten Umbenennung an einer Stelle anders.
 *
 * `level` und `champions` tragen keinen Herold — sie stehen hier trotzdem,
 * weil eine halbe Tabelle schlechter ist als eine ganze: der Tooltip hat sie.
 */
export const NOTIFY_BADGE_TITLE = {
  level: 'Next Level',
  expedition: 'Expeditions Ready',
  forge: 'Sun Evolution Ready',
  champions: 'New Champions',
  skill: 'Skill Ready',
  planet: 'Orbit Upgrades',
  shop: 'Ready to Forge',
} as const

/** Die Marken-Art, die `RpgBadgeTooltipBody` und der Herold gemeinsam kennen. */
export type NotifyBadgeKind = keyof typeof NOTIFY_BADGE_TITLE

// Offline progress
export const OFFLINE_CPS_RATE = 0.6
export const OFFLINE_MAX_HOURS = 10
export const OFFLINE_MIN_SECONDS = 60

/** Bard Stats "Solar Evolution" — the control desk of the middle column.
 *  The sun used to sit at the centre of an orbit dial carrying all seven
 *  phases; on Full HD that column is only 391px wide, so the ring's markers,
 *  their tags and the console below all fought over the same pixels and every
 *  one of them ended up small. The panel is stacked slabs now — body, journey
 *  rail, dwell, rays, act — each with the full width to itself.
 *  Only what the SCRIPT needs lives here; the slabs size themselves in CSS
 *  off the panel's own container width. */
export const SOLAR_EVOLUTION_PANEL = {
  /** Disc diameter as a share (%) of the sun stage's SHORT side, at the
   *  smallest and the largest star phase. Near-full, because the stage is now
   *  a band that holds nothing but the body. */
  SUN_PCT_MIN: 66,
  SUN_PCT_MAX: 98,
  /** The comet is the smallest body of the journey and keeps its own share —
   *  interpolating it with the stars would make the origin a full-width rock. */
  COMET_SUN_PCT: 64,
  /** Ceiling (px) for the disc. On 4K the column offers over 600px of stage
   *  height, and a sun that large would dwarf the deck it belongs to. */
  SUN_MAX_PX: 300,
} as const

/** Bard Stats panel deck — user-resizable column widths (px). The two side
 *  columns (Journey / Galaxy Archive) are drag-resized; the middle (Solar
 *  Evolution) flexes to fill the rest and is protected by MIN_MIDDLE. It also
 *  carries the sun dial, so the sides are kept just wide enough for their own
 *  content — on Full HD every pixel they give back widens the dial. */
export const STATS_TAB_DECK_RESIZE = {
  /** initial width of the left (Journey) column — starts fully expanded (= MAX_LEFT) */
  DEFAULT_LEFT: 360,
  /** initial width of the right (Galaxy Archive) column — starts fully expanded (= MAX_RIGHT) */
  DEFAULT_RIGHT: 440,
  /** smallest either side column may shrink to */
  MIN_SIDE: 200,
  /** largest the left column may grow to — measured: the Play-Time odometer
   *  needs ~344px, so this is the tightest the column can be without cutting it */
  MAX_LEFT: 360,
  /** largest the right column may grow to — the archive title needs the width
   *  at the 4K type scale, so this one does NOT give ground to the dial */
  MAX_RIGHT: 440,
  /** the middle (Augments) column never shrinks below this */
  MIN_MIDDLE: 260,
} as const

/** Bard Stats "Journey" progress gauges (Level / Galaxy / Universe). The ring is
 *  drawn as SVG in a square viewBox, so every value below is in user units and
 *  scales automatically with whatever width the resizable column gives it. */
export const STATS_TAB_GAUGE = {
  /** side of the square viewBox — reference frame for all values below */
  VIEW: 100,
  /** ring radius; leaves room for the stroke plus its glow inside the box */
  RADIUS: 41,
  /** ring thickness */
  STROKE: 7,
  /** value font size per length bucket: 1–2 chars, 3, 4, 5+ — longer readouts
   *  (three-digit levels, roman "VIII") shrink so they never touch the ring */
  VALUE_FONT: [40, 32, 26, 21],
  /** largest rendered ring diameter (px); below this the ring scales with the column */
  MAX_PX: 96,
  /** compact ring diameter (px) on Full-HD-height viewports */
  MAX_PX_COMPACT: 78,
} as const

// ── Admin ─────────────────────────────────────────────────────────────────────
/** Max augment selections queued by a single admin level grant (keeps a "+500 levels" from queueing 500 modals) */
export const ADMIN_LEVEL_AUGMENT_QUEUE_MAX = 10

// ── Music ─────────────────────────────────────────────────────────────────────
export const MUSIC_DEFAULT_VOLUME = 0.1
export const MUSIC_FADE_DURATION_MS = 1500
export const MUSIC_STORAGE_KEY = 'bard-music-settings'

// ── SFX ───────────────────────────────────────────────────────────────────────
export const SFX_CHIME_GAIN = 0.1
export const SFX_CHIME_MAIN_FREQ = 130
export const SFX_CHIME_OVERTONE_FREQ = 261
export const SFX_CHIME_MOD_FREQ = 4
export const SFX_CHIME_MOD_DEPTH = 8
export const SFX_CHIME_ATTACK_S = 0.003
export const SFX_CHIME_DECAY_S = 0.4
export const SFX_CHIME_OVERTONE_DELAY_S = 0.01
export const SFX_CHIME_OVERTONE_DECAY_S = 0.32
export const SFX_CHIME_SUB_FREQ = 55
export const SFX_CHIME_SUB_GAIN = 0.18
export const SFX_CHIME_SUB_DECAY_S = 0.22

// ── Admin / Debug ─────────────────────────────────────────────────────────────
export const ADMIN_QUICK_RESOURCE_AMOUNT = 100_000_000_000

// ── Admin: "Max Everything" (utils/game/maxEverything.ts) ─────────────────────
// Endzustand-Knopf im Admin-Tab. Die Beträge sind bewusst gross genug, dass
// jeder Kauf im Spiel gedeckt ist, aber klein genug, dass die Kostenformeln
// (Multiplikatoren über dutzende Stufen) nicht gegen Infinity laufen.
export const ADMIN_MAX_CHIMES = 1e15
export const ADMIN_MAX_MATERIAL_AMOUNT = 999_999
export const ADMIN_MAX_SKILL_POINTS = 999
/** Bard-Level. Über 65, weil R erst dort seinen fünften Rang erreicht
 *  (ABILITY_UNLOCK_LEVEL_R + 4 × ABILITY_LEVELS_PER_RANK). */
export const ADMIN_MAX_BARD_LEVEL = 100
/** Letztes Universum im Katalog (config/progression/universes.ts). */
export const ADMIN_MAX_UNIVERSE = 10
export const ADMIN_MAX_GALAXY = 50
/** Gebäudestufen kennen kein Cap — dieser Wert ist die gewählte Testhöhe. */
export const ADMIN_MAX_BUILDING_LEVEL = 500
/**
 * Dasselbe für die Boughs des Sternbaums (Ring 4). `nodeMaxLevel` gibt dort
 * `Infinity` zurück — eine Schleife bis zum Maximum liefe endlos, `adminMaxAll`
 * braucht also eine gewählte Testhöhe. 25 ist bewusst nicht höher: bei
 * `FORGE_BOUGH_COST_MULTIPLIER` 1,35 ist das rund die Stufe, ab der ein Kauf im
 * ausgebauten Endspiel mehrere Stunden kostet — der Zustand, den ein Test
 * abbilden soll, nicht einer, den es im Spiel nie gibt.
 */
export const ADMIN_MAX_BOUGH_LEVEL = 25
/** Planeten-Level. Ab Sonnenphase 5 greift kein Phasen-Gate mehr, die Zahl ist
 *  also frei wählbar; PLANET_MAX_BULK_LEVELS deckelt den Aufruf intern. */
export const ADMIN_MAX_PLANET_LEVEL = 60
/** Schleifen-Abbruch: adminPromoteRank() steigt nur EINE Stufe pro Aufruf. */
export const ADMIN_RANK_PROMOTE_GUARD = 60
/** Schleifen-Abbruch beim Auflösen offener Perk-Wahlen — choosePerk() gibt bei
 *  ungültiger Wahl `false` zurück, ohne den Eintrag zu entfernen. */
export const ADMIN_PERK_RESOLVE_GUARD = 2000
/**
 * Schleifen-Abbruch bei der Suche nach einer Vorsehung mit CpS-Buff.
 *
 * `rollProvidence('economy')` wählt die Buff-Achse zufällig aus den Achsen
 * dieser Domäne; die gesuchte kann beliebig oft ausbleiben. 200 Versuche sind
 * weit jenseits jeder realistischen Pechsträhne (die Domäne führt eine
 * einstellige Zahl von Achsen) und laufen in Mikrosekunden durch — bleibt die
 * Karte trotzdem aus, steht der Endzustand ohne Vorsehung da statt gar nicht.
 */
export const ADMIN_PROVIDENCE_ROLL_GUARD = 200

/** Kantenlänge der Drifter-Silhouette auf den Spawn-Kacheln des Admin-Panels.
 *  Groß genug, dass Splitter, Sonde und Leviathan auseinanderzuhalten sind,
 *  klein genug für zwei Reihen à vier Kacheln neben den anderen Panels. */
export const ADMIN_DRIFTER_PREVIEW_PX = 34

// ── Notify-badge hover tooltips (RpgBadgeTooltip) ────────────────────────────
// Shared behaviour of every badge tooltip: gap between anchor and panel,
// minimum distance kept to the viewport edges (clamping), and the grace
// period before hiding so the pointer can travel into the panel.
export const BADGE_TOOLTIP_GAP_PX = 8
export const BADGE_TOOLTIP_VIEWPORT_MARGIN_PX = 8
// Short grace period so the pointer can travel from badge into the panel —
// kept tight so leaving a badge closes its tooltip without feeling laggy.
export const BADGE_TOOLTIP_HIDE_DELAY_MS = 80
// Caret is kept at least this far away from the panel's rounded corners.
export const BADGE_TOOLTIP_CARET_INSET_PX = 12
// Ancestor whose lower edge a header tooltip clears instead of its own anchor:
// the header packs its blocks tightly (the material grid alone stacks two rows),
// so a panel hugging its anchor would land on top of a neighbouring block.
export const HEADER_TOOLTIP_CLEAR_SELECTOR = '.header-bar'
// Anchor→panel gap of the four header stat panels (universe bar, universe tile,
// galaxy tile, meep tile). One value for all of them: they clear the SAME edge
// (the header bar), so a differing gap would let neighbouring panels open at
// different heights while the pointer travels along the tile row.
export const HEADER_STAT_TOOLTIP_GAP_PX = 12
// Larger gap for the center-chimes level tooltip: the arc-level badge hangs
// below the chimes box and would otherwise be covered by the panel.
export const CENTER_CHIMES_TOOLTIP_GAP_PX = 40

// The new-champions tooltip colors names + role tags via ROLE_BY_KEY — the
// game-wide role palette (orbit, shop, roster).
// Header notification badges — placed along the center-arc ellipse with a
// UNIFORM edge-to-edge pixel gap between neighbours (level badge at the arc
// apex → forge → champion on the right, expedition mirrored left). Positions
// are solved numerically in AppHeaderComponent from the measured arc size, so
// the visible gap is identical between every pair at every desktop resolution.
// Badge diameter mirror of the .header-notif-badge CSS clamp(20px,1.8vw,36px):
export const HEADER_NOTIF_BADGE_MIN_PX = 20
export const HEADER_NOTIF_BADGE_VW = 0.018
export const HEADER_NOTIF_BADGE_MAX_PX = 36
// Edge gap between neighbouring badges as a fraction of the badge diameter.
export const HEADER_BADGE_EDGE_GAP_FRAC = 0.5

/**
 * Standzeit des einmaligen Aufblitzens am Shop-Abzeichen, in Millisekunden.
 *
 * Das Shop-Abzeichen pulst NICHT dauerhaft, es meldet sich nur, wenn die Zahl
 * STEIGT — also genau dann, wenn etwas Neues erreichbar geworden ist. Ein
 * Dauertakt neben den echten Ereignis-Abzeichen wäre Rauschen statt Nachricht.
 *
 * Die Zahl dahinter zählt inzwischen das UNGESEHENE (`shopFreshTotal`) und
 * nicht mehr das Kaufbare — an letzterem hing das Aufblitzen faktisch tot, weil
 * die fünf Solar-Kernstrahlen fast durchgehend bezahlbar sind und die Zahl
 * damit nie wieder auf null fiel. Muss zur Dauer der
 * `sbadge-flare`-Keyframes passen — beide stehen in `components/ui/
 * ShopReadyBadge.vue`, gesetzt wird die Klasse von `composables/ui/
 * useBadgeFlare.ts`. Der Wert räumt sie wieder ab, damit das nächste Anwachsen
 * erneut zünden kann.
 */
export const BADGE_FLARE_MS = 550

// Header universe block — icon of the "Universe" stat tile (left of Galaxy).
export const HEADER_UNIVERSE_ICON = 'game-icons:over-infinity'

/**
 * Die beiden Header-Ecktasten (Shop links, Skill Tree rechts) und die
 * gleichnamigen Tabs im Bard-Profil zeigen auf dieselben zwei Ziele — sie
 * tragen deshalb dasselbe Zeichen und lesen es von hier. Stünde es zweimal im
 * Code, liefen Header und Tab-Leiste beim nächsten Icon-Wechsel auseinander,
 * und der Spieler läse zwei Dinge, wo eines gemeint ist.
 *
 * Die optische Angleichung (`boost`) bleibt bewusst beim jeweiligen Ort: sie
 * gleicht das Glyph an SEINE Nachbarn an, nicht an das Motiv.
 */
export const HEADER_GEM_ICONS = {
  shop: 'ph:storefront-fill',
  tree: 'material-symbols:account-tree',
} as const

/** Step sizes offered by the team-tab admin level button — plus a MAX press
 *  that asks for CHAMPION_LEVEL_MAX_CAP steps and lands on the cap from any level. */
export const ADMIN_TEAM_LEVEL_STEPS = [1, 5, 10] as const

// ── Encyclopedia (EncyclopediaPanel.vue) ────────────────────────────────────
/** localStorage key for bookmarked codex entries (UI preference, not game state). */
export const ENCYCLOPEDIA_BOOKMARKS_STORAGE_KEY = 'bardle-codex-bookmarks'
/** How long the "Copied ✓" feedback stays on a formula copy button. */
export const ENCYCLOPEDIA_COPY_FEEDBACK_MS = 1200
/** Flash-highlight duration after jumping to a related entry. */
export const ENCYCLOPEDIA_FLASH_MS = 1600
