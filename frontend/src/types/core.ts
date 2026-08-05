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
