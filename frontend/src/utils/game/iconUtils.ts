import allIconsRaw from '@/config/gameicons.txt?raw'

/**
 * The complete game-icons set, read from the local list — no network access.
 * Icons may be reused freely across the project; the only rule is that a name
 * actually exists in this list, which `isValidIcon` checks.
 */
const ALL_ICONS: string[] = allIconsRaw.split(',').map((s) => s.trim()).filter(Boolean)

export function loadAllGameIcons(): string[] {
  return [...ALL_ICONS]
}

/** All icons whose name contains `keyword` — for browsing the set while picking one. */
export function searchIcons(keyword: string): string[] {
  const kw = keyword.trim().toLowerCase()
  if (!kw) return []
  return ALL_ICONS.filter((icon) => icon.slice('game-icons:'.length).includes(kw))
}

export function isValidIcon(icon: string): boolean {
  return ALL_ICONS.includes(icon)
}
