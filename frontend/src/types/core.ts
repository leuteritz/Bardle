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
 * Beide Fähigkeitstabellen (ORBIT_ROLE_ABILITIES, OBJECTIVE_ROLE_ABILITIES)
 * führen genau zwei davon, immer in derselben Reihenfolge: erst die Wirkung
 * (Schaden, Heilung, Anzahl, Faktor), dann der Takt (Cooldown). Dadurch liest
 * sich die zweite Spalte überall als Zeit.
 */
export interface RoleAbilityMetric {
  value: string
  label: string
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
