// Synergien: Elementar-/Rollen-Synergien, Origins, Traits.

export type SynergyEffectType = 'cps' | 'power' | 'dps'
export type SynergyType = 'elemental' | 'role_echo' | 'lore_bond' | 'full_orbit' | 'rarity'
export type SynergyTier = 'bronze' | 'silver' | 'gold'

export interface SynergyEffect {
  type: SynergyEffectType
  multiplier: number
}

export interface SynergyDefinition {
  id: string
  name: string
  description: string
  type: SynergyType
  icon: string
  color: string
  tier: SynergyTier
  effects: SynergyEffect[]
}

export interface ActiveSynergy extends SynergyDefinition {
  involvedChampions: string[]
  roleIndex?: number
}

export type ChampionOrigin =
  | 'Bandle'
  | 'Bilgewater'
  | 'Demacia'
  | 'Ionia'
  | 'Ixtal'
  | 'Noxus'
  | 'Piltover'
  | 'Isles'
  | 'Shurima'
  | 'Targon'
  | 'Freljord'
  | 'Void'
  | 'Zaun'
  | 'Runeterra'

export interface OriginSynergyThreshold {
  count: number
  bonus: string
  effects: SynergyEffect[]
}

export interface OriginSynergyDef {
  origin: ChampionOrigin
  name: string
  color: string
  icon: string
  thresholds: OriginSynergyThreshold[]
}

export interface ActiveOriginSynergy {
  origin: ChampionOrigin
  def: OriginSynergyDef
  count: number
  activeThreshold: OriginSynergyThreshold | null
  nextThreshold: OriginSynergyThreshold | null
  involvedChampions: string[]
}

// Trait system (15 TFT-inspired traits)
export type TraitId =
  | 'celestial'
  | 'arcanist'
  | 'assassin'
  | 'enchanter'
  | 'duelist'
  | 'guardian'
  | 'challenger'
  | 'phantom'
  | 'moonlight'
  | 'dark_star'
  | 'elderwood'
  | 'reaper'
  | 'invoker'
  | 'jade'
  | 'astral'

export interface TraitThreshold {
  count: number
  bonus: string
  effects: SynergyEffect[]
}

export interface TraitDefinition {
  id: TraitId
  name: string
  icon: string
  color: string
  thresholds: TraitThreshold[]
}

export interface ActiveTrait {
  trait: TraitDefinition
  count: number
  activeThreshold: TraitThreshold | null
  nextThreshold: TraitThreshold | null
  involvedChampions: string[]
}
