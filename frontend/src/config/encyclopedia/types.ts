export interface EncyclopediaEntry {
  id: string
  name: string
  icon: string
  description: string
  lore: string
  /** Only set for entries where the underlying math matters — most entries have none. */
  formula?: string
  /** Ids of related entries, rendered as jump chips. */
  related?: string[]
}

export interface EncyclopediaCategory {
  id: string
  title: string
  icon: string
  entries: EncyclopediaEntry[]
}
