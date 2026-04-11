export interface EncyclopediaEntry {
  id: string
  name: string
  icon: string
  description: string
  lore: string
  formula?: string
}

export interface EncyclopediaCategory {
  id: string
  title: string
  icon: string
  entries: EncyclopediaEntry[]
}
