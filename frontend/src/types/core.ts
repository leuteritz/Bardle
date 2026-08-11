// Querschnittstypen — von allen anderen Themen genutzt.

// Champion role types
export type ChampionRole = 'top' | 'jungle' | 'mid' | 'adc' | 'support'

export interface RoleStat {
  key: string
  icon: string
  label: string
  value: string
}

export interface RoleAbilityDetail {
  name: string
  desc: string
  value?: string
}

/**
 * Eine Kennzahl einer Rollen-Fähigkeit — die Kurzform, in der die Fähigkeit auf
 * dem Champion-Splash steht: eine Zahl und das Substantiv, das sie zählt. Nie
 * ein Satz; der Fließtext bleibt in `desc` und erscheint nur im Tooltip.
 *
 * Alle drei Fähigkeitstabellen (ORBIT_ROLE_ABILITIES, OBJECTIVE_ROLE_ABILITIES,
 * VOID_ROLE_ABILITIES) führen genau zwei davon, immer in derselben Reihenfolge:
 * erst die Wirkung (Schaden, Heilung, Anzahl, Faktor), dann der Takt. Dadurch
 * liest sich die zweite Spalte überall als Zeit.
 */
export interface RoleAbilityMetric {
  value: string
  label: string
}

/**
 * Was ein Rollen-Sitz an EINEM Ort tut — die Form, in der die Detailseite des
 * Team-Tabs alle drei Bereiche als gleiche Zeile zeigt (Universe · Objective ·
 * Void).
 *
 * Dieselbe Gestalt für alle drei Tabellen, damit die Vorlage EINE Schleife
 * bleibt; jede trägt `satisfies Record<ChampionRole, RoleKitAbility>`, womit ein
 * fehlendes Feld ein Compile-Fehler wird statt einer leeren Zelle.
 *
 * `line` und `desc` sind zwei UNABHÄNGIGE Felder, keine lange und kurze Fassung
 * derselben Sache: `line` ist der eine Satz, den der Spieler ohne Zutun sieht,
 * `desc` der volle Wortlaut, der nur im Tooltip erscheint. Ein späterer
 * „Abgleich" der beiden nähme der Zeile genau das, wofür sie da ist.
 */
export interface RoleKitAbility {
  /** Der volle Name — Eventlog, Hover-Karte, Tooltips ausserhalb der Leiste. */
  name: string
  /**
   * EIN Wort, und immer das treffendste. Das ist, was in der Leiste steht:
   * neben einem Sigill und zwei grossen Zahlen bleibt für „Piercing Volley"
   * kein Platz, ohne dass die Zahlen kleiner werden — und die Zahlen sind das,
   * was der Spieler vergleicht. Eine Spec bindet die Ein-Wort-Regel.
   */
  short: string
  icon: string
  /**
   * Was die Fähigkeit tut, in EINEM kurzen Satz. Erscheint beim Überfahren der
   * Zeile als Karte darüber — nicht als Dauertext, weil in der Leiste sonst
   * dreimal ein Satz stünde, den man nach dem zweiten Blick nicht mehr liest.
   * Länge auf `ROLE_KIT_DESC_MAX_CHARS` gedeckelt.
   */
  desc: string
  metrics: readonly RoleAbilityMetric[]
}

/**
 * Die Achsen, an denen ein befristeter Buff angreifen kann — die vollständige
 * Liste der Einbaustellen, an denen ein Multiplikator in eine laufende Rechnung
 * eingereiht wird.
 *
 * Steht hier und nicht bei einer der Quellen, weil inzwischen mehrere davon
 * dieselben fünf Achsen bedienen (Drifter, Omen). Eine zweite, gleichlautende
 * Liste würde beim nächsten Zusatz auseinanderlaufen — und die Einbaustelle
 * bemerkt es nicht, sie sieht ja nur eine Zahl.
 *
 * Eine NEUE Achse hier heißt immer auch: ein Getter je Quelle und eine
 * Multiplikation an der Zielstelle. Ohne die beiden ist der Eintrag wirkungslos.
 */
export interface TimedBuffEffects {
  /** Multiplier on total chimes per second. */
  cpsMult?: number
  /** Multiplier on total chimes per click. */
  cpcMult?: number
  /** Multiplier on orbiting champion DPS and turret volleys. */
  combatDpsMult?: number
  /** Multiplier on the material drop chance. */
  materialDropMult?: number
  /** Multiplier on champion XP gains. */
  xpMult?: number
}
