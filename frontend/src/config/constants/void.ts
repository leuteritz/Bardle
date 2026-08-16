// The Void — was aus der Leere auf die Sonne zukriecht.
//
// Das einzige System in Bardle, das NIMMT statt gibt. Alles andere (Forge,
// Codex, Vorzeichen, Drifter, Vorsehungen) zahlt aus; hier drängt zum ersten
// Mal etwas GEGEN den Spieler, und die einzige andere Uhr dieser Art im Spiel —
// die Enrage-Uhr eines Bosses — hängt an einem Kampf, den man selbst begonnen
// hat.
//
// Ein Void-Wesen reisst am Bildrand auf und wandert von dort zur Sonne. Es hat
// keine Frist, es hat einen WEG — und der ist die Uhr. Das ist der Unterschied
// zu jedem Countdown im Spiel: die Drohung steht die ganze Zeit sichtbar auf
// dem Schirm und wird mit jedem Meter grösser, statt in einer Zahl zu stecken.
// Erlegt wird es von dem, was ohnehin im Orbit steht (Kader und Turrets feuern
// von selbst), Klicks beschleunigen. Wer es durchlässt, zahlt mit Sonnen-HP.
//
// Die Datei zieht ausser ihren eigenen Typen nichts herein und steht damit
// ganz unten in der Themen-Hierarchie — sie kann von überall gelesen werden,
// ohne einen Zyklus zu riskieren.

import type {
  ChampionRole,
  PlanetRoleType,
  RoleKitAbility,
  VoidContactState,
  VoidPlanetRider,
} from '@/types'
import type { VoidRiftSeverity } from '@/types'

// ── Freischaltung ───────────────────────────────────────────────────────────

/**
 * Bard-Level, ab dem das erste Wesen aufreissen kann.
 *
 * Deutlich später als die Vorzeichen (`OMEN_UNLOCK_LEVEL` = 5), und das ist
 * der Punkt: ein Void-Wesen wird von Kader und Turrets erlegt, nicht vom guten
 * Willen. Wer noch keine drei Rollen besetzt hat, könnte es nur wegklicken —
 * dann wäre die Strafe keine Entscheidung, sondern Willkür.
 */
export const VOID_UNLOCK_LEVEL = 12

// ── Spawn ───────────────────────────────────────────────────────────────────

/**
 * Wie viele Wesen gleichzeitig unterwegs sein dürfen.
 *
 * Grosszügig, weil das System von der MENGE lebt: ein einzelner Wanderer ist
 * ein Klick, ein Dutzend gleichzeitig ist eine Lage, die man ordnen muss —
 * welches zuerst, was lässt man durch. Der Renderer trägt das (ein Canvas für
 * alle, siehe Performance-Regel 4); der Deckel steht hier, damit ein
 * gedrosselter Tab nach dem Aufwachen keine Flut nachholt.
 */
export const VOID_MAX_CONCURRENT = 24

/**
 * Eine Uhr JE SCHWERE — [min, max] Sekunden bis zum nächsten Aufreissen.
 * Dasselbe Muster wie bei den Driftern: ein einzelner gewichteter Wurf würde
 * das abyssale Wesen auf einen Erwartungswert schieben, den niemand mehr
 * einplanen kann.
 *
 * Deutlich dichter als bei den Driftern, denn hier soll sich etwas ANSAMMELN:
 * ein kleines Wesen alle halbe Minute heisst, dass zu jedem Zeitpunkt mehrere
 * unterwegs sind, ohne dass ein einzelnes je bedrohlich wäre.
 */
export const VOID_SPAWN_INTERVAL_SEC: Record<VoidRiftSeverity, [number, number]> = {
  lesser: [26, 44],
  greater: [95, 150],
  abyssal: [300, 430],
}

/** Vorlauf nach Spielstart bzw. nach dem Laden, je Schwere. Gestaffelt, sonst
 *  laufen alle drei Uhren gemeinsam an und die erste Minute ist ein Schwarm. */
export const VOID_FIRST_DELAY_SEC: Record<VoidRiftSeverity, [number, number]> = {
  lesser: [40, 70],
  greater: [140, 200],
  abyssal: [420, 560],
}

/** Ist das Feld voll, wenn eine Uhr abläuft, wartet diese Stufe nur so lange
 *  und versucht es erneut — das fällige Wesen geht nicht verloren. */
export const VOID_SPAWN_RETRY_SEC = 15

/** Reihenfolge bei gleichzeitig fälligen Uhren: das Schwerste zuerst. Sonst
 *  verdrängt das häufige kleine Wesen regelmässig das, auf das es ankommt. */
export const VOID_SEVERITY_ORDER: Record<VoidRiftSeverity, number> = {
  lesser: 0,
  greater: 1,
  abyssal: 2,
}

/** Farbe der Schwere — Rahmen und Label der HUD-Karte. Der Akzent bleibt die
 *  Eigenfarbe des Typs. Violett bis Magenta, damit die Leere sich auf einen
 *  Blick von Gold (Chimes) und Grün (kaufbar) trennt. */
export const VOID_SEVERITY_COLOR: Record<VoidRiftSeverity, string> = {
  lesser: '#8a6fd0',
  greater: '#b04fd8',
  abyssal: '#e0409f',
}

/** Was auf der Karte über dem Namen steht. */
export const VOID_SEVERITY_LABEL: Record<VoidRiftSeverity, string> = {
  lesser: 'LESSER VOID',
  greater: 'GREATER VOID',
  abyssal: 'ABYSSAL VOID',
}

// ── Die Reise ───────────────────────────────────────────────────────────────

/**
 * Wie lange ein Wesen vom Bildrand bis zur Sonne braucht — je Schwere.
 *
 * Die schweren sind LANGSAMER, nicht schneller. Das ist bewusst gegen den
 * ersten Reflex: ein zähes Wesen, das auch noch rast, wäre schlicht unfair,
 * während ein langsames Ungetüm die ganze Zeit sichtbar näher kommt und damit
 * genau den Druck erzeugt, um den es hier geht. Tempo ist die Drohung, Zähigkeit
 * die Arbeit — beides zugleich hochzudrehen macht aus einer Entscheidung eine
 * Strafe.
 */
export const VOID_TRAVEL_MS: Record<VoidRiftSeverity, number> = {
  lesser: 46_000,
  greater: 68_000,
  abyssal: 96_000,
}

/**
 * Wie weit hinter der Bildkante ein Wesen aufreisst — als Anteil seines EIGENEN
 * Radius im Moment des Aufreissens, nicht seiner Endgrösse (es ist dann erst
 * `VOID_SPAWN_SCALE` gross). 0 setzte den Mittelpunkt genau auf die Kante,
 * 1 schöbe ihn um einen ganzen Radius dahinter; dazwischen ragt es angeschnitten
 * herein und kriecht ins Bild, statt darin zu erscheinen.
 *
 * Bezug ist die ECHTE Kante in Anflugrichtung. Vorher stand hier die halbe
 * Bilddiagonale, und die liegt bei einem Anflug von oben eine halbe Bildhöhe
 * über dem Rand: ein Wesen war dann gut die halbe Reise lang unsichtbar,
 * während die HUD-Karte oben links es längst meldete.
 */
export const VOID_SPAWN_EDGE_OFFSET = 0.35

/**
 * Wie fein der Strahl zur Feldkante abgetastet wird, bezogen auf die
 * Bilddiagonale. Grob genug, um billig zu bleiben, fein genug, um den
 * schmalsten Abschnitt der HUD-Kontur nicht zu überspringen — die engste
 * Stelle ist die Kehle zwischen Seitenpanel und Mittelstreifen.
 */
export const VOID_EDGE_MARCH_STEPS = 48
/** Halbierungsschritte danach: 48 Schritte auf 2200 px sind ~46 px, sechs
 *  Halbierungen bringen das auf unter einen Pixel. */
export const VOID_EDGE_REFINE_STEPS = 6
/**
 * Auflösung des Winkel-Schlüssels im Kanten-Zwischenspeicher. 512 Stufen je
 * Radiant sind rund 0,1° — feiner als jeder sichtbare Unterschied und grob
 * genug, dass zwei Wesen aus fast derselben Richtung sich den Eintrag teilen.
 */
export const VOID_EDGE_ANGLE_KEY_SCALE = 512

/**
 * Grösse beim Aufreissen, als Anteil der Endgrösse. Das Wesen wächst auf dem
 * Weg — das liest sich als Annäherung und macht die Bedrohung ablesbar, ohne
 * dass irgendwo eine Zahl stehen müsste.
 */
export const VOID_SPAWN_SCALE = 0.32

/**
 * Seitlicher Versatz der Bahn, als Anteil der halben Bildbreite. Ohne ihn
 * laufen alle Wesen exakt radial und der Bildschirm sieht aus wie ein
 * Sternexplosionsdiagramm; mit ihm bekommt jedes eine eigene Kurve.
 */
export const VOID_PATH_DRIFT_MAX = 0.22

/**
 * Ankunft: Anteil des Sonnenradius, ab dem der Einschlag zählt. Etwas INNERHALB
 * der Scheibe, damit das Wesen die Sonne sichtbar berührt und nicht davor
 * verpufft.
 */
export const VOID_ARRIVAL_SUN_FRAC = 0.72

/** Trefferfläche für den Klick, als Vielfaches der halben Körpergrösse. Grosszügig:
 *  die Wesen bewegen sich, und Präzisionsarbeit auf ein wanderndes Ziel ist
 *  keine Spielmechanik, sondern eine Geduldsprobe. */
export const VOID_HIT_RADIUS_SCALE = 0.62

/** Untergrenze der Trefferfläche in px — ein frisch aufgerissenes Wesen ist
 *  klein, anklickbar muss es trotzdem sein. */
export const VOID_HIT_RADIUS_MIN_PX = 26

// ── Zähigkeit ───────────────────────────────────────────────────────────────

/**
 * Grund-Trefferpunkte eines kleinen Wesens, in derselben Einheit wie
 * Champion-DPS und Turret-Salve (beide zahlen einmal je Sekunde ein).
 *
 * Deutlich niedriger als bei einem stehenden Riss, denn der Orbit-Beschuss
 * verteilt sich jetzt auf ALLE Wesen im Feld: bei einem Dutzend gleichzeitig
 * bekommt jedes nur einen Bruchteil ab, und was einzeln trivial wäre, wird in
 * der Menge zur Arbeit.
 */
export const VOID_HP_BASE = 320

/** Zuwachs je Galaxie über der ersten. Multiplikativ auf die Grund-HP. */
export const VOID_HP_PER_GALAXY = 0.55

/** Wie viel zäher die schwereren Wesen sind. */
export const VOID_HP_SEVERITY_MULT: Record<VoidRiftSeverity, number> = {
  lesser: 1,
  greater: 2.6,
  abyssal: 6,
}

/**
 * Schaden eines Klicks, als Anteil der EIGENEN maximalen Trefferpunkte.
 *
 * Als Anteil und nicht als fester Betrag, damit der Klick in Galaxie 12 nicht
 * zur Geste verkommt. 12 % heisst: rund neun Klicks erlegen ein kleines Wesen
 * im Alleingang — schnell genug, dass Eingreifen sich lohnt, langsam genug,
 * dass man bei einem Dutzend gleichzeitig wählen muss.
 */
export const VOID_CLICK_DAMAGE_PCT = 0.12

// ── Berührung ───────────────────────────────────────────────────────────────
// Der Orbit steht dem Void nicht nur statistisch im Weg, sondern körperlich.
//
// Die Dramaturgie liegt in den Bahnradien und musste nicht erfunden werden.
// GEMESSEN (grösster Abstand zur Bildmitte über 200 Frames, in px):
//
//   Viewport    Phase  Sonne   top  jungle   mid   adc  support
//   1920×1000     0      34    143     188   395   509      401
//   1920×1000     2      53    137     277   396   436      513
//   1920×1000     5     106    326     434   518   351      564
//   2560×1310     0      34    207     254   518   672      605
//   2560×1310     5     106    326     430   515   473      652
//
// **Top ist die innerste Bahn — auf jeder Auflösung und in jeder Sonnenphase.**
// Genau deshalb ist die Toplane hier wirklich die letzte Barriere und nicht nur
// erzählt: was an ihr vorbeikommt, trifft die Sonne. Jungle liegt durchweg als
// zweitinnerste dahinter; Mid, ADC und Support stehen aussen und tauschen dort
// untereinander die Plätze, je nach Sonnenphase.
//
// Auf `ROLES[].orbit.rx` allein darf man dabei NICHT schliessen (Top 2.58 ·
// Jungle 7.8 · Mid 10.75 · ADC/Support 12.67 × SUN_RADIUS): die Mindestradien
// je Rolle (`ORBIT_MIN_RY_*_BY_ROLE`) und die Viewport-Deckelung schreiben die
// Reihenfolge im laufenden Spiel um — der Tier-Wert sagt am Ende nur, wer
// innen und wer aussen liegt, nicht die genaue Staffelung.
//
// Die Regel, die das System trägt: NUR Jungle und die Planeten machen bei
// Berührung Schaden. `combatStore.fullOrbitDps()` zählt bereits JEDEN Champion
// ohne Reichweitenprüfung — würde jede Rolle zusätzlich HP abziehen, zählte
// derselbe Champion doppelt und `VOID_HP_BASE` müsste neu geeicht werden. Die
// anderen vier ändern deshalb nicht die Schadensmenge, sondern WOHIN sie fällt
// und WIE WEIT sie trägt: Mids Verstärkung und ADCs Marke wirken multiplikativ
// auf den Pool, der ohnehin schon feuert.

/**
 * Berührungsradius eines Wesens, als Vielfaches seiner halben DARGESTELLTEN
 * Grösse.
 *
 * Bewusst NICHT `VOID_HIT_RADIUS_SCALE`: der ist ein grosszügiger Zielradius
 * für die Maus samt Boden von 26 px, und ein frisch aufgerissenes Wesen bei
 * `VOID_SPAWN_SCALE` (0,32) würde damit einen Champion blocken, den es sichtbar
 * nicht berührt. Hier zählt der Körper, also kein Boden.
 */
export const VOID_CONTACT_RADIUS_SCALE = 0.42

/**
 * Sperrzeit je Paar aus Wesen und Rolle. Ohne sie zündete dieselbe Berührung
 * sechzigmal je Sekunde, solange sich die beiden überlappen.
 *
 * Je Rolle eigen, und immer LÄNGER als die Wirkung, die sie auslöst — sonst
 * frischte ein Champion, der eine Weile mitläuft, seinen eigenen Effekt
 * dauernd auf, und aus einem Moment würde ein Dauerzustand.
 */
export const VOID_CONTACT_REARM_MS: Record<ChampionRole, number> = {
  top: 9_000,
  jungle: 8_000,
  mid: 12_000,
  adc: 9_000,
  support: 15_000,
}

/** Sperrzeit je Paar aus Wesen und Planet. Deutlich länger als bei den
 *  Champions: ein Wesen, das langsam an einem Planeten vorbeikriecht, darf ihn
 *  nicht kleinmahlen. */
export const VOID_PLANET_CONTACT_REARM_MS = 14_000

/** Wie lange der Kontaktfunke am Körper nachleuchtet. */
export const VOID_CONTACT_FLASH_MS = 340

/** Deckel auf Schadenszahlen je Auflösungslauf. `combatStore.damageFloats`
 *  wird nur mit 1 Hz gefegt — ein Schwarm, der gleichzeitig berührt, dürfte
 *  die Liste sonst mit zwei Dutzend Zahlen fluten. */
export const VOID_CONTACT_FLOAT_MAX_PER_TICK = 4

/**
 * Farbe des Zustandsrings — die Farbe der ROLLE, die den Zustand gesetzt hat.
 * Damit liest der Ring nicht nur „hier läuft etwas", sondern „wer hält das
 * Ding gerade". Reihenfolge der Prüfung: blocked > warded > cursed > focused.
 */
export const VOID_CONTACT_STATE_COLOR: Record<VoidContactState, string> = {
  blocked: '#e05050',
  warded: '#b8c8d8',
  cursed: '#5090e8',
  focused: '#e89840',
}

/** Akzent des Void-Bereichs auf der Detailseite. Dieselbe Farbe, in der der
 *  Void überall sonst spricht — nicht als Hex in die Komponente getippt. */
export const VOID_KIT_ACCENT = VOID_SEVERITY_COLOR.abyssal

// ── top · Aegis Wall ──
/**
 * Wie lange Top ein Wesen körperlich anhält.
 *
 * Selbstbegrenzend durch das Schild: der Block verbraucht es
 * (`triggerIntercept`), und erst nach `ROLE_TOP_SHIELD_REBUILD_MS` kann Top
 * wieder blocken. EIN Wesen je Schild-Zyklus, egal wie viele kommen — genau
 * das ist „letzte Barriere" und nicht „Mauer, die alles hält".
 */
export const VOID_TOP_BLOCK_MS = 3_500

/** Was der Aufprall am Wesen kostet, als Anteil seiner eigenen maxHp. Anteilig
 *  aus demselben Grund wie beim Klick: ein fester Betrag verkäme in Galaxie 12
 *  zur Geste. */
export const VOID_TOP_BLOCK_DAMAGE_PCT = 0.1

// ── jungle · Cull ──
/** Unter diesem Anteil seiner maxHp richtet der Jungler ein Wesen auf der
 *  Stelle hin — voller Boon. Smite, nur gegen die Leere. */
export const VOID_JUNGLE_EXECUTE_PCT = 0.22

/** Darüber bleibt es beim Schlag: Anteil der maxHp. */
export const VOID_JUNGLE_STRIKE_PCT = 0.08

/** Rollen-eigene Abklingzeit ZUSÄTZLICH zur Paar-Sperre — ohne sie räumte ein
 *  einziger Durchlauf durch einen Schwarm alles Angeschlagene ab. */
export const VOID_JUNGLE_CULL_COOLDOWN_MS = 12_000

// ── mid · Unravelling ──
/** Wie lange der Fluch am Wesen hängt. */
export const VOID_MID_CURSE_MS = 9_000

/** Faktor auf JEDEN Schaden am verfluchten Wesen — Klick, Orbit-Pool und
 *  Berührung gleichermassen, weil er in `damageMonster` sitzt. */
export const VOID_MID_CURSE_AMP = 1.6

/** Anteil, mit dem ein verfluchtes Wesen noch vorrückt. */
export const VOID_MID_CURSE_SLOW = 0.45

// ── adc · Focus Mark ──
/** Wie lange die Marke steht. Solange sie hält, bündelt `applyOrbitPressure`
 *  auf DIESES Wesen statt auf das vorderste. */
export const VOID_ADC_FOCUS_MS = 7_000

// ── support · Warding Light ──
/**
 * Wie lange ein Ward die Drossel eines Wesens stilllegt.
 *
 * Bewusst lang. Bei vollem Feld beisst `VOID_DRAIN_FLOOR` (0,25), und ein
 * einzelner Ward von 24 wiegt dort kaum noch etwas — die sichtbare Auszahlung
 * ist dann die Heilung, nicht die Wirtschaft. Support ist die einzige Rolle,
 * die bei Berührung gar keinen Schaden macht.
 */
export const VOID_SUPPORT_WARD_MS = 12_000

// ── Planeten ──
/**
 * Was eine Berührung den Planeten kostet, als Anteil seiner maxHp — je Schwere.
 *
 * Anteilig, damit das Planeten-Level zählt und ein kleines Wesen ein Kratzer
 * bleibt. Ein Planet kann daran NIE sterben (`takeVoidChip` hält bei 1 HP): ein
 * zerstörter Planet fiele aus `riftAutoAttackDPS`, also stürbe weniger Void,
 * also kämen mehr durch — eine Todesspirale, aus der man nicht mehr
 * herausspielt. Der Boden bricht sie, und Supports Planetenheilung bekommt
 * dafür eine Daueraufgabe.
 */
export const VOID_PLANET_CONTACT_HP_FRAC: Record<VoidRiftSeverity, number> = {
  lesser: 0.03,
  greater: 0.07,
  abyssal: 0.14,
}

/** Grundschaden eines Planeten am Wesen, Anteil dessen maxHp. Der Rider
 *  darunter skaliert ihn je Rolle. */
export const VOID_PLANET_STRIKE_PCT = 0.06

/**
 * Ein Verb je Planetenrolle. Als `Record<PlanetRoleType, …>` getippt, damit
 * eine siebte Rolle ein Compile-Fehler wird statt eines stillen Leerlaufs.
 *
 * `shield_barrier` ist die Bau-Antwort des Spielers: eine reine Wand, die
 * nichts austeilt und nichts einsteckt. `expedition_relay` ist ein Kurier — er
 * kämpft nicht, er öffnet einen Korridor und schickt das Ding zurück.
 */
export const VOID_PLANET_RIDER: Record<PlanetRoleType, VoidPlanetRider> = {
  turret_planet: { verb: 'volley', damageMult: 2.2, takesChip: true },
  shield_barrier: { verb: 'absorb', damageMult: 0, takesChip: false },
  time_capsule: { verb: 'slow', damageMult: 0.6, takesChip: true },
  harvest_node: { verb: 'scavenge', damageMult: 0.5, takesChip: true },
  resonance_tower: { verb: 'splash', damageMult: 1, takesChip: true },
  expedition_relay: { verb: 'banish', damageMult: 0, takesChip: true },
}

/** Reichweite des Resonator-Splashes in px, um den getroffenen Körper herum. */
export const VOID_PLANET_SPLASH_RADIUS_PX = 180

/** Anteil des Kontaktschadens, den der Splash an die Nachbarn weiterreicht. */
export const VOID_PLANET_SPLASH_FRAC = 0.4

/** Wie weit der Relay ein Wesen zurückwirft. Als Zeit, nicht als Strecke — die
 *  Bahn kennt nur `spawnedAt`, und eine Verschiebung darauf ist überall
 *  gleichzeitig wirksam (Position, Grösse, Drossel). */
export const VOID_PLANET_RELAY_BANISH_MS = 4_000

/** Wie lange die Zeitkapsel ein Wesen bremst — dasselbe `slowedUntil` wie der
 *  Mid-Fluch, das spätere Ablaufdatum gewinnt. */
export const VOID_PLANET_SLOW_MS = 6_000

/**
 * Was jede Rolle tut, wenn ein Void-Wesen sie streift — in der Form, in der die
 * Champion-Detailseite sie neben Orbit- und Objective-Fähigkeit zeigt.
 *
 * Dieselbe Gestalt wie `ORBIT_ROLE_ABILITIES` und `OBJECTIVE_ROLE_ABILITIES`
 * (`RoleKitAbility`), damit die drei Bereiche dort EINE Schleife sind statt
 * dreier Sonderfälle. Auch der Eventlog liest den Namen von hier — dafür stand
 * einmal eine zweite Liste daneben, und zwei Listen für denselben Namen laufen
 * auseinander.
 *
 * Steht am ENDE des Abschnitts, nicht an seinem Anfang: jede Zahl darin ist
 * eine der Konstanten darüber, und ein `const` ist vor seiner Deklaration nicht
 * lesbar — weiter oben wäre die Datei beim Laden gestorben.
 *
 * Jede dieser Zahlen steht bereits in DIESER Datei, und das ist Bedingung, nicht
 * Zufall: der Kopf oben erklärt, dass hier nichts hereingezogen wird ausser den
 * eigenen Typen. Tops Schild-Wiederaufbau (`roles.ts`) wäre deshalb tabu — und
 * stünde ohnehin doppelt, weil ihn die Orbit-Zeile daneben schon zeigt.
 *
 * Tops Verb heisst „Last Barrier" und nicht wie im Orbit „Aegis Wall", obwohl
 * es technisch dasselbe Schild ist (`triggerIntercept`): beide Namen stünden
 * sonst untereinander in derselben Spalte. Gemessen hält Top ohnehin die
 * innerste Bahn — der Name sagt also, was die Geometrie tut.
 */
export const VOID_ROLE_ABILITIES = {
  top: {
    name: 'Last Barrier',
    short: 'Barrier',
    icon: 'game-icons:stone-wall',
    desc: 'Halts a void creature where it stands; the shield breaks doing it.',
    metrics: [
      { value: `${VOID_TOP_BLOCK_MS / 1000}s`, label: 'Halt' },
      { value: `${VOID_CONTACT_REARM_MS.top / 1000}s`, label: 'Rearm' },
    ],
  },
  jungle: {
    name: 'Cull',
    short: 'Cull',
    icon: 'game-icons:sword-slice',
    desc: 'Instantly kills a void creature that is already near death.',
    metrics: [
      { value: `${Math.round(VOID_JUNGLE_EXECUTE_PCT * 100)}%`, label: 'Execute' },
      { value: `${VOID_JUNGLE_CULL_COOLDOWN_MS / 1000}s`, label: 'Cooldown' },
    ],
  },
  mid: {
    name: 'Unravelling',
    short: 'Unravel',
    icon: 'game-icons:shattered-glass',
    desc: 'The creature takes more damage from everything and slows down.',
    metrics: [
      { value: `×${VOID_MID_CURSE_AMP}`, label: 'Damage' },
      { value: `${VOID_MID_CURSE_MS / 1000}s`, label: 'Curse' },
    ],
  },
  adc: {
    name: 'Focus Mark',
    short: 'Mark',
    icon: 'game-icons:bullseye',
    desc: 'The whole orbit fires at that creature instead of the nearest.',
    metrics: [
      { value: '1', label: 'Target' },
      { value: `${VOID_ADC_FOCUS_MS / 1000}s`, label: 'Mark' },
    ],
  },
  support: {
    name: 'Warding Light',
    short: 'Ward',
    icon: 'game-icons:eye-shield',
    desc: 'Stops a creature draining the economy, without harming it.',
    metrics: [
      { value: '100%', label: 'Pull' },
      { value: `${VOID_SUPPORT_WARD_MS / 1000}s`, label: 'Silence' },
    ],
  },
} as const satisfies Record<ChampionRole, RoleKitAbility>

// ── Ziehen ──────────────────────────────────────────────────────────────────

/**
 * Wie stark ein frisch aufgerissenes Wesen zieht, als Anteil seiner vollen
 * Wirkung. Von hier läuft es über den Weg linear auf 1 hoch.
 *
 * Warum mit der Nähe ansteigend: ein Wesen am Bildrand ist eine Ankündigung,
 * eines kurz vor der Sonne ein Notfall. Dieselbe Kurve macht aus der Drohung
 * eine Aufforderung — und sie erklärt ohne ein Wort, warum man das vorderste
 * zuerst nimmt.
 */
export const VOID_DRAIN_RAMP_MIN = 0.2

/**
 * Deckel auf der Gesamtdrossel je Achse. Bei einem Dutzend Wesen multiplizieren
 * sich die Faktoren sonst gegen null, und der Spieler steht vor einer
 * Wirtschaft, die nichts mehr produziert — das ist kein Druck mehr, das ist
 * ein Abbruch.
 */
export const VOID_DRAIN_FLOOR = 0.25

// ── Einschlag ───────────────────────────────────────────────────────────────

/**
 * Sonnen-HP, die ein Einschlag kostet — je Schwere.
 *
 * Zum Vergleich: ein Boss-Enrage kostet `PLAYER_HP_LOSS_ON_ENRAGE` (25) von
 * 100. Das kleine Wesen bleibt weit darunter, denn es kommen viele; das
 * abyssale liegt darüber, weil es eines ist, das man wirklich aufhalten muss.
 */
export const VOID_IMPACT_HP_LOSS: Record<VoidRiftSeverity, number> = {
  lesser: 6,
  greater: 15,
  abyssal: 32,
}

/**
 * Was der Voidbound Pact (Star-Forge-Konstellation) an einem erlegten Wesen
 * hinterlässt.
 *
 * Fest und nicht gewürfelt: der Pakt verspricht wörtlich einen Void Shard, und
 * das Material ist der Taktgeber der späten Forge — die Blätter an den späten
 * Zweigen und drei Relikte hängen daran. Der Riss war bis zu dieser Fusion
 * reiner Verlust; mit ihr wird das Aufräumen zur Quelle genau des Stoffs, den
 * man braucht, um sich gegen ihn zu wappnen.
 *
 * Steht als ID hier und nicht als Zeichenkette im Store: `material.id` ist ein
 * Vertrag mit dem Spielstand (`SAVE_ID_RENAMES`), und ein zweites Vorkommen
 * liefe beim nächsten Umbenennen still auseinander.
 */
export const VOID_PACT_SHARD_MATERIAL = 'void_shard'

/** Wie lange das Nachbeben eines Einschlags nachzieht — je Schwere. Der
 *  eigentliche Preis des abyssalen Wesens steht hier, nicht in den HP. */
export const VOID_IMPACT_AFTERMATH_MS: Record<VoidRiftSeverity, number> = {
  lesser: 25_000,
  greater: 50_000,
  abyssal: 110_000,
}

/**
 * Anteil der ANSTEHENDEN Meeps, den ein Einschlag frisst — je Schwere.
 *
 * Sonnen-HP allein war kein Einsatz: sie regenerieren mit 1/s von selbst, und
 * 0 HP hat im ganzen Spiel keine Folge. Meeps dagegen sind der Lohn des
 * Aufbruchs, also genau das, worauf ein Lauf hinarbeitet.
 *
 * Prozentual und nicht pauschal, damit dieselbe Zahl früh wie spät dasselbe
 * bedeutet — „ein Stück deiner Ernte" statt „drei Meeps, die im Spätspiel
 * niemand merkt". `VOID_IMPACT_MEEP_LOSS_MIN` darunter hält den Einschlag auch
 * bei kleiner Ernte spürbar; bei den typischen 32 anstehenden Meeps ergibt
 * beides zusammen 2 / 3 / 5.
 *
 * Gefressen wird nur, was der Lauf schon GESAMMELT hat (`gameStore.devourMeeps`
 * klemmt auf `pendingMeeps`): wer gerade aufgebrochen ist, verliert nichts. Der
 * Void trifft damit am härtesten den, der den nächsten Aufbruch hinauszögert —
 * dieselbe Entscheidung, die die Wurzelformel der Ausbeute ohnehin stellt, nur
 * von der anderen Seite.
 */
export const VOID_IMPACT_MEEP_LOSS_PCT: Record<VoidRiftSeverity, number> = {
  lesser: 0.04,
  greater: 0.08,
  abyssal: 0.15,
}

/** Untergrenze des Meep-Zolls — ein Einschlag bleibt nie folgenlos, sobald
 *  überhaupt etwas ansteht. */
export const VOID_IMPACT_MEEP_LOSS_MIN: Record<VoidRiftSeverity, number> = {
  lesser: 1,
  greater: 2,
  abyssal: 3,
}

// ── Beute ───────────────────────────────────────────────────────────────────

/** Deckel auf der Chime-Auszahlung: so viele Sekunden Produktion maximal,
 *  unabhängig davon, was der Typ verspricht. Gleiche Begründung wie beim
 *  Drifter — ein einzelner Abschluss darf keine Progression überspringen. */
export const VOID_BOON_CHIME_CAP_SEC = 300

/** Mindest-Auszahlung, damit ein erlegtes Wesen in der Frühphase (CPS ≈ 0)
 *  nicht als leere Mühe endet — Vielfaches des aktuellen Klickwerts. */
export const VOID_BOON_CHIME_MIN_CLICKS = 40

// ── Darstellung ─────────────────────────────────────────────────────────────

/** Feld-Ränder in px: unter dem Header, über der Bottom-Bar. Nur für die
 *  HUD-Karte und den Spawn-Ring — die Bahn selbst zielt auf die Bildmitte und
 *  läuft damit ohnehin von den Rändern weg. */
export const VOID_FIELD_TOP_PX = 130
export const VOID_FIELD_BOTTOM_PX = 165

/** Zacken des Körpers. Ungerade, damit die Silhouette nicht spiegelsymmetrisch
 *  wird und sich als Bruch statt als Ornament liest. */
export const VOID_TENDRIL_COUNT = 7

/** Nachlaufzeiten der beiden Ausgänge, bevor der Effekt endet. */
export const VOID_SEAL_FX_MS = 900
export const VOID_IMPACT_FX_MS = 1600

/** Funken, die beim Erlegen auseinanderfliegen. */
export const VOID_SEAL_BURST_PARTICLES = 12

/** Ab diesem Anteil des Weges gilt ein Wesen als „nah" — die HUD-Karte schlägt
 *  dann auf Warnrot um und der Körper pulst schneller. */
export const VOID_URGENT_FRAC = 0.72

/** Taktrate des Countdowns auf der HUD-Karte. Bewusst gröber als ein Frame —
 *  die Karte zeigt Sekunden, ein 60-Hz-Update wäre reine Verschwendung. */
export const VOID_CARD_TICK_MS = 100

/** Wie lange die Karte nach dem Ausgang noch stehen bleibt. */
export const VOID_CARD_RESULT_MS = 3200

/** Kopfzeilen-Icon der HUD-Karte. */
export const VOID_CARD_ICON = 'game-icons:vortex'

/** Der Stresstest-Knopf im Admin-Panel füllt das Feld bis zum Deckel — mehr
 *  lässt `spawnMonster` ohnehin nicht zu, und ein Knopf, der „×30" verspricht
 *  und 24 liefert, wäre eine Lüge im Werkzeug. */
export const ADMIN_VOID_SWARM_SIZE = VOID_MAX_CONCURRENT

// ── Pause-Overlay ───────────────────────────────────────────────────────────
// Der Void läuft während der Pause WEITER — genau wie Sterne und Bosse, und aus
// demselben Grund: was passiv bekämpft wird (Kader und Turrets feuern auch
// pausiert), darf auch passiv verloren gehen. Nur SPAWNEN tut nichts Neues,
// sonst legte ein Wesen den halben Weg ungesehen zurück.
// Deshalb steht die Lage im Overlay: der Spieler soll entscheiden können, ob er
// zurückkommt — und das kann er nur, wenn er sie sieht.

/** Breite der Void-Karte in der „Awaiting your return"-Reihe. Etwas schmaler
 *  als eine Stern-Karte: sie trägt eine Zeile weniger. */
export const PAUSE_VOID_CARD_WIDTH = 208

/** Ab so vielen Restsekunden bis zum Einschlag schlägt die Karte auf Warnrot
 *  um. Grosszügiger als bei den Sternen (dort 10 s), weil hier nicht ein
 *  Zeitfenster verstreicht, sondern die Sonne getroffen wird. */
export const PAUSE_VOID_URGENT_SECS = 15

/** So viele Wesen zeigt die Karte einzeln als Punktreihe; der Rest steht als
 *  Zahl. Mehr Punkte wären bei zwei Dutzend eine Textur, kein Zählwerk. */
export const PAUSE_VOID_PIPS_MAX = 6
