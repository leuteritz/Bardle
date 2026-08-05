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
